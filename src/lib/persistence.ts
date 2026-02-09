/**
 * StateManager — disk persistence for hook state.
 *
 * Wraps the in-memory Maps from tool-gate.ts and compaction.ts.
 * Adds load/save to `.idumb/brain/state.json`.
 *
 * Design:
 * - Singleton pattern — one instance per plugin lifecycle
 * - Write-through: in-memory is authoritative, disk is backup
 * - Debounced save (500ms) to avoid I/O storms on rapid mutations
 * - P3: Graceful degradation — if disk fails, in-memory still works
 * - Never blocks hot path — save is async fire-and-forget
 * - Migration: reads old filenames (hook-state.json, task-graph.json, etc.) if new names don't exist
 *
 * Consumers: tool-gate.ts, compaction.ts, index.ts
 */

import { readFile, writeFile, mkdir } from "node:fs/promises"
import { join, dirname } from "node:path"
import { z } from "zod"
import type { Anchor } from "../schemas/anchor.js"
import type { TaskStore, TaskEpic, Task } from "../schemas/task.js"
import { createEmptyStore, getActiveChain, migrateTaskStore } from "../schemas/task.js"
import type { TaskGraph, TaskNode } from "../schemas/work-plan.js"
import { createEmptyTaskGraph } from "../schemas/work-plan.js"
import { purgeAbandonedPlans, migrateV2ToV3, findTaskNode } from "../schemas/task-graph.js"
import type { DelegationStore } from "../schemas/delegation.js"
import { createEmptyDelegationStore, expireStaleDelegations } from "../schemas/delegation.js"
import type { PlanState } from "../schemas/plan-state.js"
import { createPlanState } from "../schemas/plan-state.js"
import type { BrainStore } from "../schemas/brain.js"
import { createBrainStore } from "../schemas/brain.js"
import type { CodeMapStore } from "../schemas/codemap.js"
import { createCodeMapStore } from "../schemas/codemap.js"
import type { ProjectMap } from "../schemas/project-map.js"
import { createProjectMap } from "../schemas/project-map.js"
import { BRAIN_PATHS } from "./paths.js"
import type { Logger } from "./logging.js"
import type { SqliteAdapter } from "./sqlite-adapter.js"
import type { SessionState } from "./storage-adapter.js"

// ─── Zod Validation Schemas (structural guards for disk reads) ──────

/** Permissive schema — validates top-level shape, passes through nested data. */
const PersistedStateSchema = z.object({
  version: z.string(),
  lastSaved: z.string(),
  sessions: z.record(z.string(), z.any()),
  anchors: z.record(z.string(), z.array(z.any())).optional().default({}),
  tasks: z.any().optional(),
})

const TaskStoreSchema = z.object({
  version: z.string(),
  activeEpicId: z.string().nullable(),
  epics: z.array(z.any()),
})

const DelegationStoreSchema = z.object({
  version: z.string(),
  delegations: z.array(z.any()),
})

const TaskGraphSchema = z.object({
  version: z.string(),
  activeWorkPlanId: z.string().nullable(),
  workPlans: z.array(z.any()),
})

const PlanStateSchema = z.object({
  version: z.string(),
  planName: z.string(),
  currentPhaseId: z.number().nullable(),
  phases: z.array(z.any()),
  lastModified: z.number(),
})

const BrainStoreSchema = z.object({
  version: z.string(),
  entries: z.array(z.any()),
  lastSynthesisAt: z.number(),
  exportCount: z.number(),
})

const CodeMapStoreSchema = z.object({
  version: z.string(),
  scannedAt: z.number(),
  files: z.array(z.any()),
  comments: z.array(z.any()),
  inconsistencies: z.array(z.any()),
  stats: z.any(),
})

const ProjectMapSchema = z.object({
  version: z.string(),
  scannedAt: z.number(),
  frameworks: z.array(z.any()),
  directories: z.array(z.any()),
  stats: z.any(),
})

// ─── Safe Parse Helper ──────────────────────────────────────────────

/**
 * Parse JSON with Zod validation, falling back to a default on failure.
 * Logs a warning when validation fails so corrupted state is visible.
 */
function safeParse<T>(
  raw: string,
  schema: z.ZodType,
  fallback: T,
  log: Logger,
  label: string,
): T {
  try {
    const parsed: unknown = JSON.parse(raw)
    const result = schema.safeParse(parsed)
    if (result.success) {
      return result.data as T
    }
    log.warn(`Zod validation failed for ${label} — using fallback`, {
      errors: result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`),
    })
    return fallback
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    log.warn(`JSON parse failed for ${label} — using fallback`, { error: msg })
    return fallback
  }
}

// ─── State Shape ─────────────────────────────────────────────────────

interface PersistedState {
  version: string
  lastSaved: string
  sessions: Record<string, SessionState>
  anchors: Record<string, Anchor[]>
  tasks?: TaskStore  // NEW — global task hierarchy (optional for backward compat with old state files)
}

const STATE_VERSION = "1.1.0"
const DEBOUNCE_MS = 500

// ─── Migration Helper ─────────────────────────────────────────────────

/**
 * Try reading a file from the new path first, then fall back to legacy path.
 * If legacy path succeeds, the caller should save to the new path on next write.
 */
async function readWithLegacyFallback(
  directory: string,
  newPath: string,
  legacyPath: string | null,
): Promise<{ raw: string; migrated: boolean }> {
  try {
    const raw = await readFile(join(directory, newPath), "utf-8")
    return { raw, migrated: false }
  } catch {
    // New path not found — try legacy
    if (!legacyPath) throw new Error("ENOENT")
    const raw = await readFile(join(directory, legacyPath), "utf-8")
    return { raw, migrated: true }
  }
}

// ─── GovernanceStatus ────────────────────────────────────────────────

/**
 * Unified governance snapshot — eliminates 4x-duplicated call pattern.
 * Used by: tasks_check, system.ts hook, compaction.ts hook.
 */
export interface GovernanceStatus {
  activeTask: { id: string; name: string } | null
  taskNode: TaskNode | null
  workPlan: { name: string; status: string } | null
  agent: string | null
  progress: { completed: number; total: number; failed: number } | null
  nextPlanned: { name: string; blockedBy?: string } | null
  recentCheckpoints: number
}

// ─── StateManager ────────────────────────────────────────────────────

export class StateManager {
  private sessions = new Map<string, SessionState>()
  private anchors = new Map<string, Anchor[]>()
  private taskStore: TaskStore = createEmptyStore()
  private taskGraph: TaskGraph = createEmptyTaskGraph()
  private delegationStore: DelegationStore = createEmptyDelegationStore()
  private planState: PlanState = createPlanState()
  private brainStore: BrainStore = createBrainStore()
  private codeMap: CodeMapStore = createCodeMapStore("")
  private projectMap: ProjectMap = createProjectMap("")
  private directory: string = ""
  private log: Logger | null = null
  private saveTimer: ReturnType<typeof setTimeout> | null = null
  private taskSaveTimer: ReturnType<typeof setTimeout> | null = null
  private delegationSaveTimer: ReturnType<typeof setTimeout> | null = null
  private taskGraphSaveTimer: ReturnType<typeof setTimeout> | null = null
  private planStateSaveTimer: ReturnType<typeof setTimeout> | null = null
  private brainSaveTimer: ReturnType<typeof setTimeout> | null = null
  private codeMapSaveTimer: ReturnType<typeof setTimeout> | null = null
  private projectMapSaveTimer: ReturnType<typeof setTimeout> | null = null
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
      const { raw, migrated } = await readWithLegacyFallback(directory, BRAIN_PATHS.state, BRAIN_PATHS.legacy.state)
      const defaultState: PersistedState = {
        version: STATE_VERSION,
        lastSaved: new Date().toISOString(),
        sessions: {},
        anchors: {},
      }
      const persisted = safeParse(raw, PersistedStateSchema, defaultState, log, "PersistedState") as PersistedState

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
          migrated,
        })

        // Auto-migrate: save to new path if loaded from legacy
        if (migrated) {
          log.info("Migrating state from legacy path", { from: BRAIN_PATHS.legacy.state, to: BRAIN_PATHS.state })
          this.scheduleSave()
        }
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
      const tasksPath = join(directory, BRAIN_PATHS.tasks)
      const tasksRaw = await readFile(tasksPath, "utf-8")
      const loaded = safeParse(tasksRaw, TaskStoreSchema, createEmptyStore(), log, "TaskStore") as TaskStore
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
      const delegPath = join(directory, BRAIN_PATHS.delegations)
      const delegRaw = await readFile(delegPath, "utf-8")
      const loadedDeleg = safeParse(delegRaw, DelegationStoreSchema, createEmptyDelegationStore(), log, "DelegationStore") as DelegationStore
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
      const { raw: graphRaw, migrated } = await readWithLegacyFallback(directory, BRAIN_PATHS.taskGraph, BRAIN_PATHS.legacy.taskGraph)
      const loadedGraph = safeParse(graphRaw, TaskGraphSchema, createEmptyTaskGraph(), log, "TaskGraph") as TaskGraph
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
          migrated,
        })
        if (migrated) {
          log.info("Migrating task graph from legacy path", { from: BRAIN_PATHS.legacy.taskGraph, to: BRAIN_PATHS.taskGraph })
          this.scheduleTaskGraphSave()
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.includes("ENOENT")) {
        log.warn("Could not load task graph — starting fresh", { error: msg })
      }
    }

    // Auto-migrate v2 TaskStore → v3 TaskGraph if graph is empty but tasks exist
    if (
      this.taskGraph.workPlans.length === 0
      && this.taskStore.epics.length > 0
    ) {
      log.info("Auto-migrating v2 TaskStore to v3 TaskGraph", {
        epics: this.taskStore.epics.length,
      })
      this.taskGraph = migrateV2ToV3(this.taskStore)
      this.scheduleTaskGraphSave()
      log.info("v2→v3 migration complete", {
        workPlans: this.taskGraph.workPlans.length,
        activeWorkPlanId: this.taskGraph.activeWorkPlanId,
      })
    }

    // Load plan state from separate file
    try {
      const { raw: planStateRaw, migrated } = await readWithLegacyFallback(directory, BRAIN_PATHS.planState, BRAIN_PATHS.legacy.planState)
      const loadedPlanState = safeParse(planStateRaw, PlanStateSchema, createPlanState(), log, "PlanState") as PlanState
      if (loadedPlanState.version && Array.isArray(loadedPlanState.phases)) {
        this.planState = loadedPlanState
        log.info("Plan state loaded from disk", {
          planName: loadedPlanState.planName,
          phases: loadedPlanState.phases.length,
          currentPhaseId: loadedPlanState.currentPhaseId,
          migrated,
        })
        if (migrated) {
          log.info("Migrating plan state from legacy path", { from: BRAIN_PATHS.legacy.planState, to: BRAIN_PATHS.planState })
          this.schedulePlanStateSave()
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.includes("ENOENT")) {
        log.warn("Could not load plan state — starting fresh", { error: msg })
      }
    }

    // Load brain store (knowledge entries)
    try {
      const brainPath = join(directory, BRAIN_PATHS.knowledge)
      const brainRaw = await readFile(brainPath, "utf-8")
      const loadedBrain = safeParse(brainRaw, BrainStoreSchema, createBrainStore(), log, "BrainStore") as BrainStore
      if (loadedBrain.version && Array.isArray(loadedBrain.entries)) {
        this.brainStore = loadedBrain
        log.info("Brain store loaded from disk", {
          entries: loadedBrain.entries.length,
        })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.includes("ENOENT")) {
        log.warn("Could not load brain store — starting fresh", { error: msg })
      }
    }

    // Load code map
    try {
      const codeMapPath = join(directory, BRAIN_PATHS.codemap)
      const codeMapRaw = await readFile(codeMapPath, "utf-8")
      const loadedCodeMap = safeParse(codeMapRaw, CodeMapStoreSchema, createCodeMapStore(""), log, "CodeMapStore") as CodeMapStore
      if (loadedCodeMap.version && Array.isArray(loadedCodeMap.files)) {
        this.codeMap = loadedCodeMap
        log.info("Code map loaded from disk", {
          files: loadedCodeMap.files.length,
        })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.includes("ENOENT")) {
        log.warn("Could not load code map — starting fresh", { error: msg })
      }
    }

    // Load project map
    try {
      const projectMapPath = join(directory, BRAIN_PATHS.projectMap)
      const projectMapRaw = await readFile(projectMapPath, "utf-8")
      const loadedProjectMap = safeParse(projectMapRaw, ProjectMapSchema, createProjectMap(""), log, "ProjectMap") as ProjectMap
      if (loadedProjectMap.version && Array.isArray(loadedProjectMap.directories)) {
        this.projectMap = loadedProjectMap
        log.info("Project map loaded from disk", {
          directories: loadedProjectMap.directories.length,
        })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.includes("ENOENT")) {
        log.warn("Could not load project map — starting fresh", { error: msg })
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

  /**
   * Unified governance snapshot for a session.
   * Eliminates 4x-duplicated pattern: getTaskGraph() + getActiveWorkChain() + getCapturedAgent() + ...
   */
  getGovernanceStatus(sessionID: string): GovernanceStatus {
    const activeTask = this.getActiveTask(sessionID)
    const graph = this.taskGraph
    const agent = this.getCapturedAgent(sessionID)

    let taskNode: TaskNode | null = null
    let workPlan: { name: string; status: string } | null = null
    let progress: { completed: number; total: number; failed: number } | null = null
    let nextPlanned: { name: string; blockedBy?: string } | null = null
    let recentCheckpoints = 0

    if (activeTask) {
      taskNode = findTaskNode(graph, activeTask.id) ?? null
    }

    const activeWP = graph.activeWorkPlanId
      ? graph.workPlans.find(wp => wp.id === graph.activeWorkPlanId)
      : undefined

    if (activeWP) {
      workPlan = { name: activeWP.name, status: activeWP.status }

      const completed = activeWP.tasks.filter(t => t.status === "completed").length
      const total = activeWP.tasks.length
      const failed = activeWP.tasks.filter(t => t.status === "failed").length
      progress = { completed, total, failed }

      const next = activeWP.tasks.find(t => t.status === "planned" || t.status === "blocked")
      if (next) {
        let blockedBy: string | undefined
        if (next.dependsOn.length > 0) {
          const blocker = findTaskNode(graph, next.dependsOn[0])
          blockedBy = blocker?.name
        }
        nextPlanned = { name: next.name, blockedBy }
      }

      if (taskNode) {
        recentCheckpoints = taskNode.checkpoints.length
      }
    }

    return { activeTask, taskNode, workPlan, agent, progress, nextPlanned, recentCheckpoints }
  }

  // ─── Plan State (global, not per-session) ──────────────────────────

  getPlanState(): PlanState {
    return this.planState
  }

  setPlanState(state: PlanState): void {
    this.planState = state
    this.planState.lastModified = Date.now()
    this.schedulePlanStateSave()
  }

  // ─── Brain Store (knowledge entries) ────────────────────────────

  getBrainStore(): BrainStore {
    return this.brainStore
  }

  saveBrainStore(store: BrainStore): void {
    this.brainStore = store
    this.scheduleBrainSave()
  }

  // ─── Code Map (symbol extraction) ─────────────────────────────

  getCodeMap(): CodeMapStore {
    return this.codeMap
  }

  saveCodeMap(store: CodeMapStore): void {
    this.codeMap = store
    this.scheduleCodeMapSave()
  }

  // ─── Project Map (directory/framework mapping) ─────────────────

  getProjectMap(): ProjectMap {
    return this.projectMap
  }

  saveProjectMap(map: ProjectMap): void {
    this.projectMap = map
    this.scheduleProjectMapSave()
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

  /** Schedule a debounced plan state save. */
  private schedulePlanStateSave(): void {
    if (this.degraded) return

    if (this.planStateSaveTimer) {
      clearTimeout(this.planStateSaveTimer)
    }

    this.planStateSaveTimer = setTimeout(() => {
      this.planStateSaveTimer = null
      this.savePlanStateToDisk().catch(() => { })
    }, DEBOUNCE_MS)
  }

  /** Schedule a debounced brain store save. */
  private scheduleBrainSave(): void {
    if (this.degraded) return

    if (this.brainSaveTimer) {
      clearTimeout(this.brainSaveTimer)
    }

    this.brainSaveTimer = setTimeout(() => {
      this.brainSaveTimer = null
      this.saveBrainToDisk().catch(() => { })
    }, DEBOUNCE_MS)
  }

  /** Schedule a debounced code map save. */
  private scheduleCodeMapSave(): void {
    if (this.degraded) return

    if (this.codeMapSaveTimer) {
      clearTimeout(this.codeMapSaveTimer)
    }

    this.codeMapSaveTimer = setTimeout(() => {
      this.codeMapSaveTimer = null
      this.saveCodeMapToDisk().catch(() => { })
    }, DEBOUNCE_MS)
  }

  /** Schedule a debounced project map save. */
  private scheduleProjectMapSave(): void {
    if (this.degraded) return

    if (this.projectMapSaveTimer) {
      clearTimeout(this.projectMapSaveTimer)
    }

    this.projectMapSaveTimer = setTimeout(() => {
      this.projectMapSaveTimer = null
      this.saveProjectMapToDisk().catch(() => { })
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

    const statePath = join(this.directory, BRAIN_PATHS.state)

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

    const tasksPath = join(this.directory, BRAIN_PATHS.tasks)

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

    const delegPath = join(this.directory, BRAIN_PATHS.delegations)

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

    const graphPath = join(this.directory, BRAIN_PATHS.taskGraph)

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

  /** Write plan state to separate disk file. */
  private async savePlanStateToDisk(): Promise<void> {
    if (!this.directory) return

    const planStatePath = join(this.directory, BRAIN_PATHS.planState)

    try {
      await mkdir(dirname(planStatePath), { recursive: true })
      await writeFile(planStatePath, JSON.stringify(this.planState, null, 2) + "\n", "utf-8")
      this.log?.info("Plan state saved to disk", {
        planName: this.planState.planName,
        phases: this.planState.phases.length,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.log?.error("Failed to save plan state — degrading to in-memory only", { error: msg })
      this.degraded = true
    }
  }

  /** Write brain store (knowledge entries) to disk. */
  private async saveBrainToDisk(): Promise<void> {
    if (!this.directory) return

    const brainPath = join(this.directory, BRAIN_PATHS.knowledge)

    try {
      await mkdir(dirname(brainPath), { recursive: true })
      await writeFile(brainPath, JSON.stringify(this.brainStore, null, 2) + "\n", "utf-8")
      this.log?.info("Brain store saved to disk", {
        entries: this.brainStore.entries.length,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.log?.error("Failed to save brain store — degrading to in-memory only", { error: msg })
      this.degraded = true
    }
  }

  /** Write code map to disk. */
  private async saveCodeMapToDisk(): Promise<void> {
    if (!this.directory) return

    const codeMapPath = join(this.directory, BRAIN_PATHS.codemap)

    try {
      await mkdir(dirname(codeMapPath), { recursive: true })
      await writeFile(codeMapPath, JSON.stringify(this.codeMap, null, 2) + "\n", "utf-8")
      this.log?.info("Code map saved to disk", {
        files: this.codeMap.files.length,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.log?.error("Failed to save code map — degrading to in-memory only", { error: msg })
      this.degraded = true
    }
  }

  /** Write project map to disk. */
  private async saveProjectMapToDisk(): Promise<void> {
    if (!this.directory) return

    const projectMapPath = join(this.directory, BRAIN_PATHS.projectMap)

    try {
      await mkdir(dirname(projectMapPath), { recursive: true })
      await writeFile(projectMapPath, JSON.stringify(this.projectMap, null, 2) + "\n", "utf-8")
      this.log?.info("Project map saved to disk", {
        directories: this.projectMap.directories.length,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      this.log?.error("Failed to save project map — degrading to in-memory only", { error: msg })
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
    if (this.planStateSaveTimer) {
      clearTimeout(this.planStateSaveTimer)
      this.planStateSaveTimer = null
    }
    if (this.brainSaveTimer) {
      clearTimeout(this.brainSaveTimer)
      this.brainSaveTimer = null
    }
    if (this.codeMapSaveTimer) {
      clearTimeout(this.codeMapSaveTimer)
      this.codeMapSaveTimer = null
    }
    if (this.projectMapSaveTimer) {
      clearTimeout(this.projectMapSaveTimer)
      this.projectMapSaveTimer = null
    }
    await this.saveToDisk()
    await this.saveTasksToDisk()
    await this.saveDelegationsToDisk()
    await this.saveTaskGraphToDisk()
    await this.savePlanStateToDisk()
    await this.saveBrainToDisk()
    await this.saveCodeMapToDisk()
    await this.saveProjectMapToDisk()
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
    this.brainStore = createBrainStore()
    this.codeMap = createCodeMapStore("")
    this.projectMap = createProjectMap("")
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
