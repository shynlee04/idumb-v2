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
import { createEmptyStore, getActiveChain } from "../schemas/task.js"
import type { Logger } from "./logging.js"

// ─── State Shape ─────────────────────────────────────────────────────

interface SessionState {
  activeTask: { id: string; name: string } | null
  lastBlock: { tool: string; timestamp: number } | null
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

// ─── StateManager ────────────────────────────────────────────────────

export class StateManager {
  private sessions = new Map<string, SessionState>()
  private anchors = new Map<string, Anchor[]>()
  private taskStore: TaskStore = createEmptyStore()
  private directory: string = ""
  private log: Logger | null = null
  private saveTimer: ReturnType<typeof setTimeout> | null = null
  private taskSaveTimer: ReturnType<typeof setTimeout> | null = null
  private initialized = false
  private degraded = false  // true if disk I/O failed

  /**
   * Initialize with project directory. Loads state from disk if available.
   * Must be called once before any state operations.
   */
  async init(directory: string, log: Logger): Promise<void> {
    this.directory = directory
    this.log = log

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
        this.taskStore = loaded
        log.info("Task store loaded from disk", {
          epics: loaded.epics.length,
          activeEpicId: loaded.activeEpicId,
        })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.includes("ENOENT")) {
        log.warn("Could not load task store — starting fresh", { error: msg })
      }
    }

    this.initialized = true
  }

  // ─── Session State (tool-gate) ───────────────────────────────────

  getSession(sessionID: string): SessionState {
    let s = this.sessions.get(sessionID)
    if (!s) {
      s = { activeTask: null, lastBlock: null }
      this.sessions.set(sessionID, s)
    }
    return s
  }

  setActiveTask(sessionID: string, task: { id: string; name: string } | null): void {
    const s = this.getSession(sessionID)
    s.activeTask = task
    this.scheduleSave()
  }

  getActiveTask(sessionID: string): { id: string; name: string } | null {
    return this.getSession(sessionID).activeTask
  }

  setLastBlock(sessionID: string, block: { tool: string; timestamp: number } | null): void {
    const s = this.getSession(sessionID)
    s.lastBlock = block
    // lastBlock is ephemeral — don't trigger save for it
  }

  getLastBlock(sessionID: string): { tool: string; timestamp: number } | null {
    return this.getSession(sessionID).lastBlock
  }

  // ─── Task Store (global, not per-session) ──────────────────────────

  getTaskStore(): TaskStore {
    return this.taskStore
  }

  setTaskStore(store: TaskStore): void {
    this.taskStore = store
    this.scheduleTaskSave()
  }

  /** Convenience: get active epic from task store */
  getActiveEpic(): TaskEpic | null {
    if (!this.taskStore.activeEpicId) return null
    return this.taskStore.epics.find(e => e.id === this.taskStore.activeEpicId) ?? null
  }

  /** Convenience: get the active task within the active epic */
  getSmartActiveTask(): Task | null {
    const chain = getActiveChain(this.taskStore)
    return chain.task
  }

  /** Set active epic ID */
  setActiveEpicId(epicId: string | null): void {
    this.taskStore.activeEpicId = epicId
    this.scheduleTaskSave()
  }

  // ─── Anchor State (compaction) ───────────────────────────────────

  addAnchor(sessionID: string, anchor: Anchor): void {
    const list = this.anchors.get(sessionID) ?? []
    list.push(anchor)
    this.anchors.set(sessionID, list)
    this.scheduleSave()
  }

  getAnchors(sessionID: string): Anchor[] {
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

  /** Force immediate save — use on shutdown/cleanup. */
  async forceSave(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
    }
    if (this.taskSaveTimer) {
      clearTimeout(this.taskSaveTimer)
      this.taskSaveTimer = null
    }
    await this.saveToDisk()
    await this.saveTasksToDisk()
  }

  /** Check if persistence is degraded (disk I/O failed). */
  isDegraded(): boolean {
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
    this.sessions.clear()
    this.anchors.clear()
    this.taskStore = createEmptyStore()
  }
}

// ─── Singleton ───────────────────────────────────────────────────────

/** The global StateManager instance. Initialized once in index.ts. */
export const stateManager = new StateManager()
