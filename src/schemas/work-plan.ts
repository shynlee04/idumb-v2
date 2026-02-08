/**
 * Work Plan Schema — 3-level delegation-aware task graph.
 *
 * WorkPlan → TaskNode → Checkpoint
 *
 * Plain TypeScript interfaces (DON'T #9: no Zod for internal state).
 *
 * Replaces Epic→Task→Subtask with:
 * - Temporal gates (tasks blocked until dependencies complete)
 * - Scoped tool permissions per TaskNode (allowedTools)
 * - Auto-populated checkpoints (hooks write, not agents)
 * - Plan-ahead visibility (future tasks shown before they start)
 * - Two-tier purge (scan-based + immediate for chain-breakers)
 *
 * Consumers: govern_plan tool, govern_task tool, govern_delegate tool,
 *            tool-gate hook (enforcement), system hook (injection),
 *            compaction hook (context preservation)
 */

import type { WorkStreamCategory, GovernanceLevel } from "./task.js"
import { CATEGORY_DEFAULTS } from "./task.js"

// Re-export for consumers that only need work-plan
export type { WorkStreamCategory, GovernanceLevel }

// ─── Status Types ───────────────────────────────────────────────────

export type WorkPlanStatus = "draft" | "active" | "completed" | "archived" | "abandoned"
export type TaskNodeStatus = "planned" | "blocked" | "active" | "review" | "completed" | "failed"

// ─── Core Interfaces ────────────────────────────────────────────────

export interface TemporalGate {
    afterTaskId: string     // must complete first
    reason: string          // why this ordering matters
    enforcedAt?: number     // timestamp when gate was last checked
}

export interface Checkpoint {
    id: string
    taskNodeId: string
    tool: string            // which tool fired (write, edit, bash)
    timestamp: number
    summary: string         // auto-generated from tool output
    filesModified: string[] // captured from write/edit
}

export interface TaskResult {
    evidence: string
    filesModified: string[]
    testsRun: string
    anchorsCreated: string[]
}

export interface TaskNode {
    id: string
    workPlanId: string
    name: string
    expectedOutput: string          // required — what must be returned

    status: TaskNodeStatus

    // Delegation protocol
    delegatedBy: string             // agent who assigned this
    assignedTo: string              // agent who executes this
    allowedTools: string[]          // scoped tool permissions

    // Dependencies
    dependsOn: string[]             // other TaskNode IDs
    temporalGate: TemporalGate | null

    // Evidence (auto-populated by hooks)
    checkpoints: Checkpoint[]
    artifacts: string[]             // file paths produced

    // Lifecycle
    createdAt: number
    modifiedAt: number
    startedAt?: number
    completedAt?: number

    // Result (filled on completion)
    result?: TaskResult
}

export interface WorkPlan {
    id: string
    name: string
    acceptance: string[]            // success criteria
    category: WorkStreamCategory
    governanceLevel: GovernanceLevel
    status: WorkPlanStatus
    dependsOn: string[]             // other WorkPlan IDs
    ownedBy: string                 // agent name (coordinator)

    tasks: TaskNode[]               // current work
    planAhead: TaskNode[]           // visible future work

    createdAt: number
    modifiedAt: number
    completedAt?: number
    purgedAt?: number               // when abandoned + purged from context
}

/** Top-level store — persisted to .idumb/brain/task-graph.json */
export interface TaskGraph {
    version: string
    activeWorkPlanId: string | null
    workPlans: WorkPlan[]
}

// ─── Constants ──────────────────────────────────────────────────────

export const TASK_GRAPH_VERSION = "3.0.0"

/** Tools that create meaningful checkpoints (not reads/greps/status) */
export const CHECKPOINT_TOOLS = new Set(["write", "edit"])

/** Bash commands that create checkpoints (build/test/git only) */
export const CHECKPOINT_BASH_PATTERNS: RegExp[] = [
    /^npm\s+(run\s+)?(build|test|dev)/,
    /^npx\s+(tsc|vitest|jest|vite|esbuild|rollup|webpack|turbo|tsup)\b/,
    /^tsc$/,
    /^git\s+(commit|push|merge|rebase|checkout\s+-b)/,
]

/** Stale threshold — TaskNode active >30 min with no checkpoint in-session */
export const SESSION_STALE_MS = 30 * 60 * 1000

// ─── ID Generation ──────────────────────────────────────────────────

let _counter = 0
function uniqueId(prefix: string): string {
    return `${prefix}-${Date.now()}-${(++_counter).toString(36)}`
}

// ─── Factory Functions ──────────────────────────────────────────────

export interface CreateWorkPlanOptions {
    name: string
    acceptance?: string[]
    category?: WorkStreamCategory
    governanceLevel?: GovernanceLevel
    ownedBy?: string
}

export function createWorkPlan(opts: CreateWorkPlanOptions): WorkPlan {
    const now = Date.now()
    const category = opts.category ?? "development"
    return {
        id: uniqueId("wp"),
        name: opts.name,
        acceptance: opts.acceptance ?? [],
        category,
        governanceLevel: opts.governanceLevel ?? CATEGORY_DEFAULTS[category],
        status: "draft",
        dependsOn: [],
        ownedBy: opts.ownedBy ?? "idumb-supreme-coordinator",
        tasks: [],
        planAhead: [],
        createdAt: now,
        modifiedAt: now,
    }
}

export interface CreateTaskNodeOptions {
    workPlanId: string
    name: string
    expectedOutput: string
    delegatedBy: string
    assignedTo: string
    allowedTools?: string[]
    dependsOn?: string[]
    temporalGate?: TemporalGate | null
}

export function createTaskNode(opts: CreateTaskNodeOptions): TaskNode {
    const now = Date.now()
    return {
        id: uniqueId("tn"),
        workPlanId: opts.workPlanId,
        name: opts.name,
        expectedOutput: opts.expectedOutput,
        status: "planned",
        delegatedBy: opts.delegatedBy,
        assignedTo: opts.assignedTo,
        allowedTools: opts.allowedTools ?? [],
        dependsOn: opts.dependsOn ?? [],
        temporalGate: opts.temporalGate ?? null,
        checkpoints: [],
        artifacts: [],
        createdAt: now,
        modifiedAt: now,
    }
}

export function createCheckpoint(
    taskNodeId: string,
    tool: string,
    summary: string,
    filesModified: string[] = [],
): Checkpoint {
    return {
        id: uniqueId("cp"),
        taskNodeId,
        tool,
        timestamp: Date.now(),
        summary,
        filesModified,
    }
}

export function createEmptyTaskGraph(): TaskGraph {
    return {
        version: TASK_GRAPH_VERSION,
        activeWorkPlanId: null,
        workPlans: [],
    }
}

/**
 * Bootstrap task graph for first-time init.
 * Creates an active WorkPlan + TaskNode so the executor can write
 * immediately without hitting the tool-gate block.
 */
export function createBootstrapTaskGraph(
    coordinatorAgent: string = "idumb-supreme-coordinator",
): TaskGraph {
    const now = Date.now()
    const wpId = `wp-bootstrap-${now}`
    const tnId = `tn-bootstrap-${now}`
    return {
        version: TASK_GRAPH_VERSION,
        activeWorkPlanId: wpId,
        workPlans: [{
            id: wpId,
            name: "Project Initialization",
            acceptance: ["iDumb governance initialized", "Agent profiles deployed"],
            category: "governance" as WorkStreamCategory,
            governanceLevel: "strict" as GovernanceLevel,
            status: "active",
            dependsOn: [],
            ownedBy: coordinatorAgent,
            tasks: [{
                id: tnId,
                workPlanId: wpId,
                name: "Initial System Setup",
                expectedOutput: "Governance files created and verified",
                status: "active",
                delegatedBy: coordinatorAgent,
                assignedTo: "idumb-executor",
                allowedTools: ["write", "edit", "bash", "govern_task", "anchor"],
                dependsOn: [],
                temporalGate: null,
                checkpoints: [],
                artifacts: [],
                createdAt: now,
                modifiedAt: now,
                startedAt: now,
            }],
            planAhead: [],
            createdAt: now,
            modifiedAt: now,
        }],
    }
}

// ─── Checkpoint Filtering ───────────────────────────────────────────

/**
 * Check if a bash command should create a checkpoint.
 * Only build/test/git commands are meaningful — not ls, cat, grep, etc.
 */
export function isBashCheckpointWorthy(command: string): boolean {
    return CHECKPOINT_BASH_PATTERNS.some(p => p.test(command.trim()))
}

/**
 * Check if a tool invocation should create a checkpoint.
 * Only write, edit, and significant bash/govern_shell commands.
 */
export function shouldCreateCheckpoint(
    tool: string,
    args?: Record<string, unknown>,
): boolean {
    if (CHECKPOINT_TOOLS.has(tool)) return true
    if ((tool === "bash" || tool === "govern_shell") && typeof args?.command === "string") {
        return isBashCheckpointWorthy(args.command)
    }
    return false
}
