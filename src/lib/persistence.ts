/**
 * StateManager — disk persistence for hook state.
 * 
 * Wraps the in-memory Maps from tool-gate.ts and compaction.ts.
 * Adds load/save to `.idumb/brain/hook-state.json`.
 * 
 * Design:
 * - Singleton pattern — one instance per plugin lifecycle
 * - Write-through: in-memory is authoritative, disk is backup
 * - Debounced save (500ms) to avoid I/O storms on rapid mutations
 * - P3: Graceful degradation — if disk fails, in-memory still works
 * - Never blocks hot path — save is async fire-and-forget
 * 
 * Consumers: tool-gate.ts, compaction.ts, index.ts
 */

import { readFile, writeFile, mkdir } from "node:fs/promises"
import { join, dirname } from "node:path"
import type { Anchor } from "../schemas/anchor.js"
import type { TaskStore, TaskEpic, Task } from "../schemas/task.js"
import { createEmptyStore, getActiveChain, migrateTaskStore } from "../schemas/task.js"
import type { TaskGraph } from "../schemas/work-plan.js"
import { createEmptyTaskGraph } from "../schemas/work-plan.js"
import { purgeAbandonedPlans } from "../schemas/task-graph.js"
import type { DelegationStore } from "../schemas/delegation.js"
import { createEmptyDelegationStore, expireStaleDelegations } from "../schemas/delegation.js"
import type { Logger } from "./logging.js"
import type { SqliteAdapter } from "./sqlite-adapter.js"

// ─── State Shape ─────────────────────────────────────────────────────

interface SessionState {
  activeTask: { id: string; name: string } | null
  lastBlock: { tool: string; timestamp: number } | null
  capturedAgent: string | null  // n3: agent name from chat.params hook
}

interface PersistedState {
  version: string
  lastSaved: string
  sessions: Record<string, SessionState>
  anchors: Record<string, Anchor[]>
  tasks?: TaskStore  // NEW — global task hierarchy (optional for backward compat with old state files)
}

const STATE_VERSION = "1.1.0"
const DEBOUNCE_MS = 500
const STATE_FILE = ".idumb/brain/hook-state.json"
const TASKS_FILE = ".idumb/brain/tasks.json"
const TASK_GRAPH_FILE = ".idumb/brain/task-graph.json"
const DELEGATIONS_FILE = ".idumb/brain/delegations.json"

// ─── StateManager ────────────────────────────────────────────────────

export class StateManager {
  private sessions = new Map<string, SessionState>()
  private anchors = new Map<string, Anchor[]>()
  private taskStore: TaskStore = createEmptyStore()
  private taskGraph: TaskGraph = createEmptyTaskGraph()
  private delegationStore: DelegationStore = createEmptyDelegationStore()
  private directory: string = ""
  private log: Logger | null = null
  private saveTimer: ReturnType<typeof setTimeout> | null = null
  private taskSaveTimer: ReturnType<typeof setTimeout> | null = null
  private delegationSaveTimer: ReturnType<typeof setTimeout> | null = null
  private taskGraphSaveTimer: ReturnType<typeof setTimeout> | null = null
  private initialized = false
  private degraded = false  // true if disk I/O failed
  private sqliteAdapter: SqliteAdapter | null = null
  private useSqlite = false

  /**
   * Initialize with project directory. Loads state from disk if available.
   * Must be called once before any state operations.
   */
  async init(directory: string, log: Logger, options?: { sqlite?: boolean }): Promise<void> {
    this.directory = directory
    this.log = log

    // ─── SQLite backend (feature-flagged) ───────────────────────────
    if (options?.sqlite) {
      const { SqliteAdapter } = await import("./sqlite-adapter.js")
      this.sqliteAdapter = new SqliteAdapter()
      await this.sqliteAdapter.init(directory)
      this.useSqlite = true
      // Load caches from SQLite
      this.taskStore = this.sqliteAdapter.getTaskStore()
      this.delegationStore = this.sqliteAdapter.getDelegationStore()
      log.info("StateManager initialized with SQLite backend")
      this.initialized = true
      return  // Skip JSON loading
    }
    // ─── JSON backend (default) ─────────────────────────────────────

    try {
      const statePath = join(directory, STATE_FILE)
      const raw = await readFile(statePath, "utf-8")
      const persisted = JSON.parse(raw) as PersistedState

      if (persisted.version && persisted.sessions) {
        // Restore sessions
        for (const [id, state] of Object.entries(persisted.sessions)) {
          this.sessions.set(id, state)
        }

        // Restore anchors
        if (persisted.anchors) {
          for (const [id, anchorList] of Object.entries(persisted.anchors)) {
            this.anchors.set(id, anchorList)
          }
        }

        log.info("State loaded from disk", {
          sessions: Object.keys(persisted.sessions).length,
          anchors: Object.keys(persisted.anchors ?? {}).length,
          lastSaved: persisted.lastSaved,
        })
      }
    } catch (err) {
      // No state file or parse error — start fresh (not an error on first run)
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes("ENOENT")) {
        log.info("No existing state file — starting fresh")
      } else {
        log.warn("Could not load state from disk — starting fresh", { error: msg })
      }
    }

    // Load task store from separate file
    try {
      const tasksPath = join(directory, TASKS_FILE)
      const tasksRaw = await readFile(tasksPath, "utf-8")
      const loaded = JSON.parse(tasksRaw) as TaskStore
      if (loaded.version && Array.isArray(loaded.epics)) {
        this.taskStore = migrateTaskStore(loaded)
        log.info("Task store loaded from disk", {
          epics: loaded.epics.length,
          activeEpicId: loaded.activeEpicId,
          migrated: loaded.version !== this.taskStore.version,
        })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.includes("ENOENT")) {
        log.warn("Could not load task store — starting fresh", { error: msg })
      }
    }

    // Load delegation store from separate file
    try {
      const delegPath = join(directory, DELEGATIONS_FILE)
      const delegRaw = await readFile(delegPath, "utf-8")
      const loadedDeleg = JSON.parse(delegRaw) as DelegationStore
      if (loadedDeleg.version && Array.isArray(loadedDeleg.delegations)) {
        this.delegationStore = loadedDeleg
        // Expire stale delegations on load
        const expired = expireStaleDelegations(this.delegationStore)
        if (expired > 0) {
          log.info("Expired stale delegations on load", { expired })
        }
        log.info("Delegation store loaded from disk", {
          delegations: loadedDeleg.delegations.length,
        })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.includes("ENOENT")) {
        log.warn("Could not load delegation store — starting fresh", { error: msg })
      }
    }

    // Load task graph (v3) from separate file
    try {
      const graphPath = join(directory, TASK_GRAPH_FILE)
      const graphRaw = await readFile(graphPath, "utf-8")
      const loadedGraph = JSON.parse(graphRaw) as TaskGraph
      if (loadedGraph.version && Array.isArray(loadedGraph.workPlans)) {
        this.taskGraph = loadedGraph
        // Scan-based purge on session start
        const purged = purgeAbandonedPlans(this.taskGraph)
        if (purged > 0) {
          log.info("Purged abandoned work plans on load", { purged })
        }
        log.info("Task graph loaded from disk", {
          workPlans: loadedGraph.workPlans.length,
          activeWorkPlanId: loadedGraph.activeWorkPlanId,
        })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.includes("ENOENT")) {
        log.warn("Could not load task graph — starting fresh", { error: msg })
      }
    }

    this.initialized = true
  }

  // ─── Session State (tool-gate) ───────────────────────────────────

  getSession(sessionID: string): SessionState {
    if (this.useSqlite && this.sqliteAdapter) {
      return this.sqliteAdapter.getSession(sessionID)
    }
    let s = this.sessions.get(sessionID)
    if (!s) {
      s = { activeTask: null, lastBlock: null, capturedAgent: null }
      this.sessions.set(sessionID, s)
    }
    return s
  }

  setActiveTask(sessionID: string, task: { id: string; name: string } | null): void {
    if (this.useSqlite && this.sqliteAdapter) {
      this.sqliteAdapter.setActiveTask(sessionID, task)
      return
    }
    const s = this.getSession(sessionID)
    s.activeTask = task
    this.scheduleSave()
  }

  getActiveTask(sessionID: string): { id: string; name: string } | null {
    if (this.useSqlite && this.sqliteAdapter) {
      return this.sqliteAdapter.getActiveTask(sessionID)
    }
    return this.getSession(sessionID).activeTask
  }

  setLastBlock(sessionID: string, block: { tool: string; timestamp: number } | null): void {
    if (this.useSqlite && this.sqliteAdapter) {
      this.sqliteAdapter.setLastBlock(sessionID, block)
      return
    }
    const s = this.getSession(sessionID)
    s.lastBlock = block
    // lastBlock is ephemeral — don't trigger save for it
  }

  getLastBlock(sessionID: string): { tool: string; timestamp: number } | null {
    if (this.useSqlite && this.sqliteAdapter) {
      return this.sqliteAdapter.getLastBlock(sessionID)
    }
    return this.getSession(sessionID).lastBlock
  }

  // ─── Agent Identity (n3: chat.params hook) ─────────────────────────

  /** Store the agent name captured from chat.params hook */
  setCapturedAgent(sessionID: string, agent: string): void {
    if (this.useSqlite && this.sqliteAdapter) {
      this.sqliteAdapter.setCapturedAgent(sessionID, agent)
      return
    }
    const s = this.getSession(sessionID)
    s.capturedAgent = agent
    this.scheduleSave()
  }

  /** Get the captured agent name for this session */
  getCapturedAgent(sessionID: string): string | null {
    if (this.useSqlite && this.sqliteAdapter) {
      return this.sqliteAdapter.getCapturedAgent(sessionID)
    }
    return this.getSession(sessionID).capturedAgent
  }

  // ─── Task Store (global, not per-session) ──────────────────────────

  getTaskStore(): TaskStore {
    if (this.useSqlite && this.sqliteAdapter) {
      return this.sqliteAdapter.getTaskStore()
    }
    return this.taskStore
  }

  setTaskStore(store: TaskStore): void {
    if (this.useSqlite && this.sqliteAdapter) {
      this.sqliteAdapter.setTaskStore(store)
      return
    }
    this.taskStore = store
    this.scheduleTaskSave()
  }

  /** Convenience: get active epic from task store */
  getActiveEpic(): TaskEpic | null {
    if (this.useSqlite && this.sqliteAdapter) {
      return this.sqliteAdapter.getActiveEpic()
    }
    if (!this.taskStore.activeEpicId) return null
    return this.taskStore.epics.find(e => e.id === this.taskStore.activeEpicId) ?? null
  }

  /** Convenience: get the active task within the active epic */
  getSmartActiveTask(): Task | null {
    if (this.useSqlite && this.sqliteAdapter) {
      return this.sqliteAdapter.getSmartActiveTask()
    }
    const chain = getActiveChain(this.taskStore)
    return chain.task
  }

  /** Set active epic ID */
  setActiveEpicId(epicId: string | null): void {
    if (this.useSqlite && this.sqliteAdapter) {
      const store = this.sqliteAdapter.getTaskStore()
      store.activeEpicId = epicId
      this.sqliteAdapter.setTaskStore(store)
      return
    }
    this.taskStore.activeEpicId = epicId
    this.scheduleTaskSave()
  }

  // ─── Delegation Store (global, not per-session) ────────────────────

  getDelegationStore(): DelegationStore {
    if (this.useSqlite && this.sqliteAdapter) {
      return this.sqliteAdapter.getDelegationStore()
    }
    return this.delegationStore
  }

  setDelegationStore(store: DelegationStore): void {
    if (this.useSqlite && this.sqliteAdapter) {
      this.sqliteAdapter.setDelegationStore(store)
      return
    }
    this.delegationStore = store
    this.scheduleDelegationSave()
  }

  // Alias for tools that use "save" naming convention
  saveDelegationStore(store: DelegationStore): void {
    this.setDelegationStore(store)
  }

  // ─── Task Graph v3 (global, not per-session) ────────────────────────

  getTaskGraph(): TaskGraph {
    return this.taskGraph
  }

  saveTaskGraph(graph: TaskGraph): void {
    this.taskGraph = graph
    this.scheduleTaskGraphSave()
  }

  // ─── Anchor State (compaction) ───────────────────────────────────

  addAnchor(sessionID: string, anchor: Anchor): void {
    if (this.useSqlite && this.sqliteAdapter) {
      this.sqliteAdapter.addAnchor(sessionID, anchor)
      return
    }
    const list = this.anchors.get(sessionID) ?? []
    list.push(anchor)
    this.anchors.set(sessionID, list)
    this.scheduleSave()
  }

  getAnchors(sessionID: string): Anchor[] {
    if (this.useSqlite && this.sqliteAdapter) {
      return this.sqliteAdapter.getAnchors(sessionID)
    }
    return this.anchors.get(sessionID) ?? []
  }

  // ─── Persistence ─────────────────────────────────────────────────

  /** Schedule a debounced save. Multiple calls within DEBOUNCE_MS coalesce. */
  private scheduleSave(): void {
    if (this.degraded) return  // don't retry if we've already failed

    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
    }

    this.saveTimer = setTimeout(() => {
      this.saveTimer = null
      this.saveToDisk().catch(() => {
        // P3: fire-and-forget, errors logged inside saveToDisk
      })
    }, DEBOUNCE_MS)
  }

  /** Schedule a debounced task save. */
  private scheduleTaskSave(): void {
    if (this.degraded) return

    if (this.taskSaveTimer) {
      clearTimeout(this.taskSaveTimer)
    }

    this.taskSaveTimer = setTimeout(() => {
      this.taskSaveTimer = null
      this.saveTasksToDisk().catch(() => { })
    }, DEBOUNCE_MS)
  }

  /** Schedule a debounced delegation save. */
  private scheduleDelegationSave(): void {
    if (this.degraded) return

    if (this.delegationSaveTimer) {
      clearTimeout(this.delegationSaveTimer)
    }

    this.delegationSaveTimer = setTimeout(() => {
      this.delegationSaveTimer = null
      this.saveDelegationsToDisk().catch(() => { })
    }, DEBOUNCE_MS)
  }

  /** Schedule a debounced task graph save. */
  private scheduleTaskGraphSave(): void {
    if (this.degraded) return

    if (this.taskGraphSaveTimer) {
      clearTimeout(this.taskGraphSaveTimer)
    }

    this.taskGraphSaveTimer = setTimeout(() => {
      this.taskGraphSaveTimer = null
      this.saveTaskGraphToDisk().catch(() => { })
    }, DEBOUNCE_MS)
  }

  /** Write current state to disk. */
  private async saveToDisk(): Promise<void> {
    if (!this.directory) return

    const state: PersistedState = {
      version: STATE_VERSION,
      lastSaved: new Date().toISOString(),
      sessions: Object.fromEntries(this.sessions),
      anchors: Object.fromEntries(this.anchors),
    }

    const statePath = join(this.directory, STATE_FILE)

    try {
      // Ensure directory exists
      await mkdir(dirname(statePath), { recursive: true })
      await writeFile(statePath, JSON.stringify(state, null, 2) + "\n", "utf-8")
      this.log?.info("State saved to disk", {
        sessions: this.sessions.size,
        anchors: this.anchors.size,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.log?.error("Failed to save state to disk — degrading to in-memory only", { error: msg })
      this.degraded = true
    }
  }

  /** Write task store to separate disk file. */
  private async saveTasksToDisk(): Promise<void> {
    if (!this.directory) return

    const tasksPath = join(this.directory, TASKS_FILE)

    try {
      await mkdir(dirname(tasksPath), { recursive: true })
      await writeFile(tasksPath, JSON.stringify(this.taskStore, null, 2) + "\n", "utf-8")
      this.log?.info("Task store saved to disk", {
        epics: this.taskStore.epics.length,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.log?.error("Failed to save task store — degrading to in-memory only", { error: msg })
      this.degraded = true
    }
  }

  /** Write delegation store to separate disk file. */
  private async saveDelegationsToDisk(): Promise<void> {
    if (!this.directory) return

    const delegPath = join(this.directory, DELEGATIONS_FILE)

    try {
      await mkdir(dirname(delegPath), { recursive: true })
      await writeFile(delegPath, JSON.stringify(this.delegationStore, null, 2) + "\n", "utf-8")
      this.log?.info("Delegation store saved to disk", {
        delegations: this.delegationStore.delegations.length,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.log?.error("Failed to save delegation store — degrading to in-memory only", { error: msg })
      this.degraded = true
    }
  }

  /** Write task graph (v3) to separate disk file. */
  private async saveTaskGraphToDisk(): Promise<void> {
    if (!this.directory) return

    const graphPath = join(this.directory, TASK_GRAPH_FILE)

    try {
      await mkdir(dirname(graphPath), { recursive: true })
      await writeFile(graphPath, JSON.stringify(this.taskGraph, null, 2) + "\n", "utf-8")
      this.log?.info("Task graph saved to disk", {
        workPlans: this.taskGraph.workPlans.length,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.log?.error("Failed to save task graph — degrading to in-memory only", { error: msg })
      this.degraded = true
    }
  }

  /** Force immediate save — use on shutdown/cleanup. */
  async forceSave(): Promise<void> {
    if (this.useSqlite && this.sqliteAdapter) {
      await this.sqliteAdapter.forceSave()
      return
    }
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
    }
    if (this.taskSaveTimer) {
      clearTimeout(this.taskSaveTimer)
      this.taskSaveTimer = null
    }
    if (this.delegationSaveTimer) {
      clearTimeout(this.delegationSaveTimer)
      this.delegationSaveTimer = null
    }
    if (this.taskGraphSaveTimer) {
      clearTimeout(this.taskGraphSaveTimer)
      this.taskGraphSaveTimer = null
    }
    await this.saveToDisk()
    await this.saveTasksToDisk()
    await this.saveDelegationsToDisk()
    await this.saveTaskGraphToDisk()
  }

  /** Check if persistence is degraded (disk I/O failed). */
  isDegraded(): boolean {
    if (this.useSqlite && this.sqliteAdapter) {
      return this.sqliteAdapter.isDegraded()
    }
    return this.degraded
  }

  /** Check if initialized. */
  isInitialized(): boolean {
    return this.initialized
  }

  /** Reset degraded state — allows retrying disk I/O. */
  resetDegraded(): void {
    this.degraded = false
  }

  /** Clear all state — for testing. */
  clear(): void {
    if (this.useSqlite && this.sqliteAdapter) {
      this.sqliteAdapter.clear()
      return
    }
    this.sessions.clear()
    this.anchors.clear()
    this.taskStore = createEmptyStore()
    this.delegationStore = createEmptyDelegationStore()
  }

  /** Close underlying storage — for cleanup (e.g., SQLite connection). */
  async close(): Promise<void> {
    if (this.sqliteAdapter) {
      await this.sqliteAdapter.close()
    }
  }
}

// ─── Singleton ───────────────────────────────────────────────────────

/** The global StateManager instance. Initialized once in index.ts. */
export const stateManager = new StateManager()
