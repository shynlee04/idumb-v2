/**
 * Task schema — 3-level governance-aware TODO hierarchy.
 *
 * Epic → Task → Subtask
 *
 * Plain TypeScript interfaces (DON'T #9: no Zod for internal state).
 *
 * Responsibility:
 * - Define Epic/Task/Subtask structure with status enums
 * - Validation helpers: completion guards, chain-break detection, stale warnings
 * - Display formatter for rich hierarchical output
 * - TaskStore interface for persistence
 *
 * Consumers: lifecycle verb tools (tasks_start, tasks_done, tasks_add), persistence, display
 */

// ─── Status Enums ────────────────────────────────────────────────────

export type EpicStatus = "planned" | "active" | "completed" | "deferred" | "abandoned"
export type TaskStatus = "planned" | "active" | "completed" | "blocked" | "deferred"
export type SubtaskStatus = "pending" | "done" | "skipped"

// ─── WorkStream Categories (n3) ─────────────────────────────────────

/** Category of work — determines governance rules, required artifacts, and agent permissions. */
export type WorkStreamCategory =
    | "development"    // feature/bugfix — needs impl plan + tests + code review
    | "research"       // investigation — needs research doc + synthesis + evidence
    | "governance"     // framework/rules — needs spec + validation + deployment
    | "maintenance"    // cleanup/refactor — needs before/after evidence
    | "spec-kit"       // specification work — needs API contract + schema defs
    | "ad-hoc"         // quick fix — minimal governance, just evidence

/** How strictly governance rules are enforced for this work stream. */
export type GovernanceLevel = "strict" | "balanced" | "minimal"

/** Maps category → default governance level */
export const CATEGORY_DEFAULTS: Record<WorkStreamCategory, GovernanceLevel> = {
    development: "strict",
    research: "balanced",
    governance: "strict",
    maintenance: "balanced",
    "spec-kit": "balanced",
    "ad-hoc": "minimal",
}

// ─── Core Interfaces ─────────────────────────────────────────────────

export interface Subtask {
    id: string
    taskId: string
    name: string
    status: SubtaskStatus
    toolUsed?: string      // which tool completed this
    timestamp?: number     // when status last changed
}

export interface Task {
    id: string
    epicId: string
    name: string
    status: TaskStatus
    assignee?: string      // agent name
    evidence?: string      // proof of completion (required for "completed")
    delegatedTo?: string   // δ2: agent this task is delegated to
    delegationId?: string  // δ2: links to DelegationRecord.id
    createdAt: number
    modifiedAt: number
    subtasks: Subtask[]
}

export interface TaskEpic {
    id: string
    name: string
    status: EpicStatus
    category: WorkStreamCategory   // n3: what kind of work (development, research, etc.)
    governanceLevel: GovernanceLevel // n3: how strict (strict, balanced, minimal)
    createdAt: number
    modifiedAt: number
    tasks: Task[]
}

/** Entire task store — persisted to .idumb/brain/tasks.json */
export interface TaskStore {
    version: string
    activeEpicId: string | null
    epics: TaskEpic[]
}

// ─── Constants ───────────────────────────────────────────────────────

export const TASK_STORE_VERSION = "2.0.0"

/** Stale threshold in ms — task active >4h with no subtask progress */
const STALE_THRESHOLD_MS = 4 * 60 * 60 * 1000

// ─── Factory Helpers ─────────────────────────────────────────────────

let _counter = 0
function uniqueId(prefix: string): string {
    return `${prefix}-${Date.now()}-${(++_counter).toString(36)}`
}

export interface CreateEpicOptions {
    category?: WorkStreamCategory
    governanceLevel?: GovernanceLevel
}

export function createEpic(name: string, opts: CreateEpicOptions = {}): TaskEpic {
    const now = Date.now()
    const category = opts.category ?? "development"
    return {
        id: uniqueId("epic"),
        name,
        status: "active",
        category,
        governanceLevel: opts.governanceLevel ?? CATEGORY_DEFAULTS[category],
        createdAt: now,
        modifiedAt: now,
        tasks: [],
    }
}

export function createTask(epicId: string, name: string): Task {
    const now = Date.now()
    return {
        id: uniqueId("task"),
        epicId,
        name,
        status: "planned",
        createdAt: now,
        modifiedAt: now,
        subtasks: [],
    }
}

export function createSubtask(taskId: string, name: string): Subtask {
    return {
        id: uniqueId("sub"),
        taskId,
        name,
        status: "pending",
        timestamp: Date.now(),
    }
}

export function createEmptyStore(): TaskStore {
    return {
        version: TASK_STORE_VERSION,
        activeEpicId: null,
        epics: [],
    }
}

/**
 * Creates a pre-provisioned task store for first-time init.
 * 
 * Agents need write access from their very first session,
 * but the governance system blocks writes without an active task. This creates
 * a bootstrap epic+task that's already active, so agents
 * can write immediately without needing to call tasks_start first.
 * 
 * Used by: deploy.ts (written to .idumb/brain/tasks.json during init)
 */
export function createBootstrapStore(): TaskStore {
    const now = Date.now()
    const epicId = `epic-bootstrap-${now}`
    const taskId = `task-bootstrap-${now}`
    return {
        version: TASK_STORE_VERSION,
        activeEpicId: epicId,
        epics: [{
            id: epicId,
            name: "Bootstrap Initialization",
            status: "active",
            category: "governance" as WorkStreamCategory,
            governanceLevel: "strict" as GovernanceLevel,
            createdAt: now,
            modifiedAt: now,
            tasks: [{
                id: taskId,
                epicId,
                name: "Initial System Setup",
                status: "active",
                assignee: "idumb-supreme-coordinator",
                createdAt: now,
                modifiedAt: now,
                subtasks: [],
            }],
        }],
    }
}

// ─── Lookup Helpers ──────────────────────────────────────────────────

export function findEpic(store: TaskStore, epicId: string): TaskEpic | undefined {
    return store.epics.find(e => e.id === epicId)
}

export function findTask(store: TaskStore, taskId: string): Task | undefined {
    for (const epic of store.epics) {
        const t = epic.tasks.find(t => t.id === taskId)
        if (t) return t
    }
    return undefined
}

export function findSubtask(store: TaskStore, subtaskId: string): Subtask | undefined {
    for (const epic of store.epics) {
        for (const task of epic.tasks) {
            const s = task.subtasks.find(s => s.id === subtaskId)
            if (s) return s
        }
    }
    return undefined
}

/** Find the parent task of a subtask */
export function findParentTask(store: TaskStore, subtaskId: string): Task | undefined {
    for (const epic of store.epics) {
        for (const task of epic.tasks) {
            if (task.subtasks.some(s => s.id === subtaskId)) return task
        }
    }
    return undefined
}

/** Find the parent epic of a task */
export function findParentEpic(store: TaskStore, taskId: string): TaskEpic | undefined {
    return store.epics.find(e => e.tasks.some(t => t.id === taskId))
}

// ─── Active Chain ────────────────────────────────────────────────────

export interface ActiveChain {
    epic: TaskEpic | null
    task: Task | null
    pendingSubtasks: Subtask[]
}

/** Returns the active chain: active epic → active task → pending subtasks */
export function getActiveChain(store: TaskStore): ActiveChain {
    const epic = store.activeEpicId
        ? store.epics.find(e => e.id === store.activeEpicId) ?? null
        : null

    if (!epic) return { epic: null, task: null, pendingSubtasks: [] }

    const task = epic.tasks.find(t => t.status === "active") ?? null
    const pendingSubtasks = task
        ? task.subtasks.filter(s => s.status === "pending")
        : []

    return { epic, task, pendingSubtasks }
}

// ─── Validation Helpers ──────────────────────────────────────────────

export interface ValidationResult {
    valid: boolean
    reason: string
}

/** Blocks completion if subtasks still pending or evidence missing */
export function validateCompletion(task: Task, evidence?: string): ValidationResult {
    const pending = task.subtasks.filter(s => s.status === "pending")
    if (pending.length > 0) {
        const list = pending.map(s => `  - [ ] ${s.name}`).join("\n")
        return {
            valid: false,
            reason: [
                `BLOCKED: Task has ${pending.length} pending subtask(s):`,
                list,
                `Complete or skip these first:`,
                ...pending.map(s => `  - tasks_done (completes subtask "${s.name}")`),
                `Or skip: tasks_done with evidence 'skipped: not needed'`,
            ].join("\n"),
        }
    }

    if (!evidence || evidence.trim().length === 0) {
        return {
            valid: false,
            reason: [
                `BLOCKED: Cannot complete without evidence.`,
                `Provide proof: tasks_done with evidence 'All tests passing, feature works correctly'`,
                `Evidence examples: test results, file paths created, behavior verified`,
            ].join("\n"),
        }
    }

    return { valid: true, reason: "" }
}

/** Find tasks referencing deleted/missing epics */
export function findOrphanTasks(store: TaskStore): Task[] {
    const epicIds = new Set(store.epics.map(e => e.id))
    const orphans: Task[] = []
    for (const epic of store.epics) {
        for (const task of epic.tasks) {
            if (!epicIds.has(task.epicId)) {
                orphans.push(task)
            }
        }
    }
    return orphans
}

/** Find tasks active >threshold with no subtask progress */
export function findStaleTasks(store: TaskStore, thresholdMs: number = STALE_THRESHOLD_MS): Task[] {
    const now = Date.now()
    const stale: Task[] = []
    for (const epic of store.epics) {
        for (const task of epic.tasks) {
            if (task.status === "active") {
                const elapsed = now - task.modifiedAt
                const hasProgress = task.subtasks.some(s => s.status === "done")
                if (elapsed > thresholdMs && !hasProgress) {
                    stale.push(task)
                }
            }
        }
    }
    return stale
}

// ─── Chain-Break Detection ───────────────────────────────────────────

export interface ChainWarning {
    type: "no_active_tasks" | "completed_with_pending" | "stale_task"
    epicId: string
    taskId?: string
    message: string
}

/** Detect chain breaks in the task hierarchy */
export function detectChainBreaks(store: TaskStore): ChainWarning[] {
    const warnings: ChainWarning[] = []

    for (const epic of store.epics) {
        if (epic.status !== "active") continue

        // Epic active but no active tasks
        const activeTasks = epic.tasks.filter(t => t.status === "active")
        if (activeTasks.length === 0 && epic.tasks.length > 0) {
            const planned = epic.tasks.filter(t => t.status === "planned")
            warnings.push({
                type: "no_active_tasks",
                epicId: epic.id,
                message: `Epic "${epic.name}" is active but has no active tasks.${planned.length > 0
                    ? ` ${planned.length} planned task(s) waiting. Start one with: tasks_start`
                    : " Create a task first."
                    }`,
            })
        }

        for (const task of epic.tasks) {
            // Task marked completed but has pending subtasks (should have been blocked)
            if (task.status === "completed") {
                const pending = task.subtasks.filter(s => s.status === "pending")
                if (pending.length > 0) {
                    warnings.push({
                        type: "completed_with_pending",
                        epicId: epic.id,
                        taskId: task.id,
                        message: `Task "${task.name}" is completed but has ${pending.length} pending subtask(s). This is a chain integrity violation.`,
                    })
                }
            }

            // Stale task detection
            if (task.status === "active") {
                const elapsed = Date.now() - task.modifiedAt
                const hasProgress = task.subtasks.some(s => s.status === "done")
                if (elapsed > STALE_THRESHOLD_MS && !hasProgress) {
                    const mins = Math.round(elapsed / (60 * 1000))
                    warnings.push({
                        type: "stale_task",
                        epicId: epic.id,
                        taskId: task.id,
                        message: [
                            `⚠️ STALE WARNING: Task "${task.name}" has been active for ${mins} min with no subtask progress.`,
                            `  Options:`,
                            `  - Add subtasks: tasks_add name="..."`,
                            `  - Complete it: tasks_done evidence="..."`,
                            `  - Defer it: tasks_fail reason="..."`,
                        ].join("\n"),
                    })
                }
            }
        }
    }

    return warnings
}

// ─── Display Formatter ───────────────────────────────────────────────

const STATUS_ICONS: Record<string, string> = {
    // Epic
    planned: "⬜",
    active: "🔄",
    completed: "✅",
    deferred: "⏸️",
    abandoned: "❌",
    // Task
    blocked: "🚫",
    // Subtask
    pending: "☐",
    done: "☑",
    skipped: "⊘",
}

/** Format the entire task store as a rich hierarchical tree */
export function formatTaskTree(store: TaskStore): string {
    if (store.epics.length === 0) {
        return [
            "=== Task Hierarchy ===",
            "",
            "No epics created yet.",
            "Start with: tasks_add name='Your plan name'",
        ].join("\n")
    }

    const lines: string[] = ["=== Task Hierarchy ===", ""]

    for (const epic of store.epics) {
        const isActive = epic.id === store.activeEpicId
        const completedTasks = epic.tasks.filter(t => t.status === "completed").length
        const totalTasks = epic.tasks.length
        const icon = STATUS_ICONS[epic.status] || "?"
        const activeMarker = isActive ? " ◀ ACTIVE" : ""
        const catTag = epic.category ? ` [${epic.category}/${epic.governanceLevel}]` : ""

        lines.push(`${icon} EPIC: "${epic.name}"${catTag} (${completedTasks}/${totalTasks} tasks)${activeMarker}`)

        for (const task of epic.tasks) {
            const taskIcon = STATUS_ICONS[task.status] || "?"
            const assigneeTag = task.assignee ? ` [${task.assignee}]` : ""
            const evidenceTag = task.evidence ? ` (evidence: ${task.evidence})` : ""
            lines.push(`  ${taskIcon} ${task.name}${assigneeTag}${evidenceTag}`)

            for (const sub of task.subtasks) {
                const subIcon = STATUS_ICONS[sub.status] || "?"
                const toolTag = sub.toolUsed ? ` (via: ${sub.toolUsed})` : ""
                lines.push(`     ${subIcon} ${sub.name}${toolTag}`)
            }
        }
        lines.push("")
    }

    return lines.join("\n")
}

/** Build the governance reminder footer included in every task response */
export function buildGovernanceReminder(store: TaskStore): string {
    const chain = getActiveChain(store)
    if (!chain.epic) {
        return "--- Governance Reminder ---\nNo active plan. Create one with: tasks_add name='...'"
    }

    const completedTasks = chain.epic.tasks.filter(t => t.status === "completed").length
    const totalTasks = chain.epic.tasks.length
    const lines: string[] = [
        "--- Governance Reminder ---",
        `Active Epic: "${chain.epic.name}" (${completedTasks}/${totalTasks} tasks)`,
    ]

    if (chain.task) {
        const completedSubs = chain.task.subtasks.filter(s => s.status === "done").length
        const totalSubs = chain.task.subtasks.length
        const assigneeTag = chain.task.assignee ? `, assigned: ${chain.task.assignee}` : ""
        lines.push(`Current Task: "${chain.task.name}" (${assigneeTag}${totalSubs > 0 ? `${completedSubs}/${totalSubs} subtasks done` : "no subtasks"})`)

        if (chain.pendingSubtasks.length > 0) {
            lines.push(`Next: Complete subtask "${chain.pendingSubtasks[0].name}" or add more subtasks`)
        } else if (chain.task.subtasks.length > 0) {
            lines.push(`Next: All subtasks done — complete task with evidence`)
        }
    } else {
        const planned = chain.epic.tasks.filter(t => t.status === "planned")
        if (planned.length > 0) {
            lines.push(`Next: Start task "${planned[0].name}" with: tasks_start`)
        } else {
            lines.push("Next: Create a task with: tasks_add name='...'")
        }
    }

    return lines.join("\n")
}

// ─── Migration (v1 → v2) ────────────────────────────────────────────

/**
 * Migrates a v1.0.0 TaskStore to v2.0.0.
 *
 * v1 epics lack `category` and `governanceLevel`.
 * Migration adds defaults: category="development", governanceLevel="strict".
 * Safe to call on already-migrated stores (idempotent).
 */
export function migrateTaskStore(store: TaskStore): TaskStore {
    // Already v2+ — no migration needed
    if (store.version === TASK_STORE_VERSION) return store

    // Migrate epics
    for (const epic of store.epics) {
        if (!epic.category) {
            (epic as TaskEpic).category = "development"
        }
        if (!epic.governanceLevel) {
            (epic as TaskEpic).governanceLevel = CATEGORY_DEFAULTS[epic.category]
        }
    }

    store.version = TASK_STORE_VERSION
    return store
}
