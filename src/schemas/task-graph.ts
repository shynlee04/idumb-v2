/**
 * Task Graph Helpers — lookup, validation, display, and purge logic.
 *
 * Operates on TaskGraph from work-plan.ts.
 * Pure functions — no side effects, no disk I/O.
 *
 * Consumers: lifecycle verb tools (tasks_start, tasks_done, tasks_add),
 *            dashboard server functions, persistence
 */

import type {
    TaskGraph, WorkPlan, TaskNode, Checkpoint,
    WorkPlanStatus, TaskNodeStatus,
} from "./work-plan.js"
import { SESSION_STALE_MS } from "./work-plan.js"

// ─── Lookup Helpers ─────────────────────────────────────────────────

export function findWorkPlan(graph: TaskGraph, wpId: string): WorkPlan | undefined {
    return graph.workPlans.find(wp => wp.id === wpId)
}

export function findTaskNode(graph: TaskGraph, tnId: string): TaskNode | undefined {
    for (const wp of graph.workPlans) {
        const node = wp.tasks.find(t => t.id === tnId)
            ?? wp.planAhead.find(t => t.id === tnId)
        if (node) return node
    }
    return undefined
}

export function findTaskNodeInPlan(wp: WorkPlan, tnId: string): TaskNode | undefined {
    return wp.tasks.find(t => t.id === tnId)
        ?? wp.planAhead.find(t => t.id === tnId)
}

export function findParentPlan(graph: TaskGraph, tnId: string): WorkPlan | undefined {
    return graph.workPlans.find(wp =>
        wp.tasks.some(t => t.id === tnId)
        || wp.planAhead.some(t => t.id === tnId)
    )
}

export function findCheckpoint(graph: TaskGraph, cpId: string): Checkpoint | undefined {
    for (const wp of graph.workPlans) {
        for (const tn of [...wp.tasks, ...wp.planAhead]) {
            const cp = tn.checkpoints.find(c => c.id === cpId)
            if (cp) return cp
        }
    }
    return undefined
}

// ─── Active Chain ───────────────────────────────────────────────────

export interface ActiveWorkChain {
    workPlan: WorkPlan | null
    taskNode: TaskNode | null
    recentCheckpoints: Checkpoint[]
    nextPlanned: TaskNode | null
}

/** Returns the active chain: active WorkPlan → active TaskNode → recent checkpoints */
export function getActiveWorkChain(graph: TaskGraph): ActiveWorkChain {
    const wp = graph.activeWorkPlanId
        ? graph.workPlans.find(w => w.id === graph.activeWorkPlanId) ?? null
        : null

    if (!wp) return { workPlan: null, taskNode: null, recentCheckpoints: [], nextPlanned: null }

    const tn = wp.tasks.find(t => t.status === "active") ?? null
    const recentCheckpoints = tn
        ? tn.checkpoints.slice(-5)  // last 5 checkpoints
        : []

    // Next planned task (for plan-ahead visibility)
    const nextPlanned = wp.tasks.find(t => t.status === "planned")
        ?? wp.planAhead.find(t => t.status === "planned")
        ?? null

    return { workPlan: wp, taskNode: tn, recentCheckpoints, nextPlanned }
}

// ─── Temporal Gate Validation ───────────────────────────────────────

export interface GateCheckResult {
    allowed: boolean
    reason: string
    blockedBy?: TaskNode
}

/** Check if a TaskNode's temporal gate allows it to start */
export function checkTemporalGate(graph: TaskGraph, node: TaskNode): GateCheckResult {
    if (!node.temporalGate) return { allowed: true, reason: "No temporal gate." }

    const depNode = findTaskNode(graph, node.temporalGate.afterTaskId)
    if (!depNode) {
        return {
            allowed: false,
            reason: `Temporal gate references unknown task "${node.temporalGate.afterTaskId}". Gate reason: ${node.temporalGate.reason}`,
        }
    }

    if (depNode.status !== "completed") {
        return {
            allowed: false,
            reason: `Blocked by temporal gate: "${depNode.name}" has status "${depNode.status}" (must be "completed"). Reason: ${node.temporalGate.reason}`,
            blockedBy: depNode,
        }
    }

    return { allowed: true, reason: `Gate satisfied: "${depNode.name}" is completed.` }
}

/** Check all dependsOn entries for a TaskNode */
export function checkDependencies(graph: TaskGraph, node: TaskNode): GateCheckResult {
    for (const depId of node.dependsOn) {
        const depNode = findTaskNode(graph, depId)
        if (!depNode) {
            return {
                allowed: false,
                reason: `Dependency "${depId}" not found in task graph. This is a broken chain.`,
            }
        }
        if (depNode.status !== "completed") {
            return {
                allowed: false,
                reason: `Dependency "${depNode.name}" has status "${depNode.status}" (must be "completed").`,
                blockedBy: depNode,
            }
        }
    }
    return { allowed: true, reason: "All dependencies satisfied." }
}

/** Full start validation: temporal gate + dependencies + status */
export function validateTaskStart(graph: TaskGraph, node: TaskNode): GateCheckResult {
    // Check dependencies first
    const depCheck = checkDependencies(graph, node)
    if (!depCheck.allowed) return depCheck

    // Then temporal gate
    const gateCheck = checkTemporalGate(graph, node)
    if (!gateCheck.allowed) return gateCheck

    // Check status
    if (node.status === "active") {
        return { allowed: false, reason: `Task "${node.name}" is already active.` }
    }
    if (node.status === "completed") {
        return { allowed: false, reason: `Task "${node.name}" is already completed.` }
    }
    if (node.status === "failed") {
        return { allowed: false, reason: `Task "${node.name}" has failed. Create a new task or reset.` }
    }

    return { allowed: true, reason: "Task can be started." }
}

// ─── Completion Validation ──────────────────────────────────────────

export interface CompletionCheckResult {
    valid: boolean
    reason: string
}

/** Validate that a task can be completed */
export function validateTaskCompletion(
    node: TaskNode,
    evidence?: string,
): CompletionCheckResult {
    if (node.status !== "active" && node.status !== "review") {
        return {
            valid: false,
            reason: `Task "${node.name}" has status "${node.status}" — only "active" or "review" tasks can be completed.`,
        }
    }

    if (!evidence || evidence.trim().length === 0) {
        return {
            valid: false,
            reason: [
                `BLOCKED: Cannot complete without evidence.`,
                `Expected output: ${node.expectedOutput}`,
                `Checkpoints recorded: ${node.checkpoints.length}`,
                `Provide evidence: tasks_done with evidence="..."`,
            ].join("\n"),
        }
    }

    return { valid: true, reason: "" }
}

// ─── Chain Break Detection ──────────────────────────────────────────

export interface GraphWarning {
    type: "no_active_tasks" | "stale_task" | "broken_dependency" | "orphan_node"
    workPlanId: string
    taskNodeId?: string
    message: string
}

export function detectGraphBreaks(graph: TaskGraph): GraphWarning[] {
    const warnings: GraphWarning[] = []

    for (const wp of graph.workPlans) {
        if (wp.status !== "active") continue

        // Active plan but no active tasks
        const activeTasks = wp.tasks.filter(t => t.status === "active")
        if (activeTasks.length === 0 && wp.tasks.length > 0) {
            const planned = wp.tasks.filter(t => t.status === "planned")
            const startable = planned.filter(t => {
                const check = validateTaskStart(graph, t)
                return check.allowed
            })
            warnings.push({
                type: "no_active_tasks",
                workPlanId: wp.id,
                message: `WorkPlan "${wp.name}" is active but has no active tasks. ${
                    startable.length > 0
                        ? `${startable.length} task(s) ready to start. Next: tasks_start`
                        : planned.length > 0
                            ? `${planned.length} planned task(s) but all blocked by dependencies.`
                            : "No planned tasks remaining."
                }`,
            })
        }

        // Stale tasks (active with no checkpoints beyond threshold)
        const now = Date.now()
        for (const tn of wp.tasks) {
            if (tn.status === "active") {
                const elapsed = now - tn.modifiedAt
                if (elapsed > SESSION_STALE_MS && tn.checkpoints.length === 0) {
                    warnings.push({
                        type: "stale_task",
                        workPlanId: wp.id,
                        taskNodeId: tn.id,
                        message: `Task "${tn.name}" active for ${Math.round(elapsed / 60000)}min with no checkpoints.`,
                    })
                }
            }
        }

        // Broken dependencies (reference non-existent nodes)
        for (const tn of [...wp.tasks, ...wp.planAhead]) {
            for (const depId of tn.dependsOn) {
                if (!findTaskNode(graph, depId)) {
                    warnings.push({
                        type: "broken_dependency",
                        workPlanId: wp.id,
                        taskNodeId: tn.id,
                        message: `Task "${tn.name}" depends on "${depId}" which does not exist. Broken chain.`,
                    })
                }
            }
        }
    }

    return warnings
}

// ─── Purge Logic ────────────────────────────────────────────────────

/** Default purge threshold: 48 hours after abandonment */
const PURGE_THRESHOLD_MS = 48 * 60 * 60 * 1000

/**
 * Scan-based purge: mark old abandoned plans as purged.
 * Context injection skips purged plans. Data stays on disk for audit.
 * Returns count of newly purged plans.
 */
export function purgeAbandonedPlans(
    graph: TaskGraph,
    thresholdMs: number = PURGE_THRESHOLD_MS,
): number {
    const now = Date.now()
    let count = 0

    for (const wp of graph.workPlans) {
        if (wp.status === "abandoned" && !wp.purgedAt) {
            const abandonedDuration = now - wp.modifiedAt
            if (abandonedDuration > thresholdMs) {
                wp.purgedAt = now
                count++
            }
        }
    }

    return count
}

/**
 * Immediate archive for chain-breakers: if a failed TaskNode has
 * dependents that are planned/blocked, mark them blocked.
 * Returns the IDs of the failed nodes that triggered blocking.
 */
export function archiveChainBreakers(graph: TaskGraph): string[] {
    const triggers: string[] = []

    for (const wp of graph.workPlans) {
        if (wp.status !== "active") continue

        for (const tn of wp.tasks) {
            if (tn.status !== "failed") continue

            // Check if any other tasks depend on this failed task
            const dependents = wp.tasks.filter(t =>
                t.dependsOn.includes(tn.id)
                && t.status !== "failed"
                && t.status !== "completed"
            )

            if (dependents.length > 0) {
                for (const dep of dependents) {
                    if (dep.status === "planned" || dep.status === "blocked") {
                        dep.status = "blocked"
                        dep.modifiedAt = Date.now()
                    }
                }
                triggers.push(tn.id)
            }
        }
    }

    return triggers
}

// ─── Display Formatters ─────────────────────────────────────────────

const STATUS_ICONS: Record<string, string> = {
    draft: "📋",
    active: "🔄",
    completed: "✅",
    archived: "📦",
    abandoned: "❌",
    planned: "⬜",
    blocked: "🚫",
    review: "👀",
    failed: "💥",
}

export function formatTaskGraph(graph: TaskGraph): string {
    if (graph.workPlans.length === 0) {
        return [
            "=== Task Graph ===",
            "",
            "No work plans created yet.",
            "Start with: tasks_add name='Your plan name' acceptance='criteria1,criteria2'",
        ].join("\n")
    }

    const lines: string[] = ["=== Task Graph ===", ""]

    for (const wp of graph.workPlans) {
        // Skip purged plans
        if (wp.purgedAt) continue

        const isActive = wp.id === graph.activeWorkPlanId
        const completedTasks = wp.tasks.filter(t => t.status === "completed").length
        const totalTasks = wp.tasks.length
        const icon = STATUS_ICONS[wp.status] || "?"
        const activeMarker = isActive ? " << ACTIVE" : ""
        const catTag = ` [${wp.category}/${wp.governanceLevel}]`

        lines.push(`${icon} PLAN: "${wp.name}"${catTag} (${completedTasks}/${totalTasks} tasks)${activeMarker}`)

        if (wp.acceptance.length > 0) {
            lines.push(`  Acceptance: ${wp.acceptance.join("; ")}`)
        }

        for (const tn of wp.tasks) {
            const tnIcon = STATUS_ICONS[tn.status] || "?"
            const assignee = tn.assignedTo ? ` -> ${tn.assignedTo}` : ""
            const cpCount = tn.checkpoints.length > 0 ? ` (${tn.checkpoints.length} checkpoints)` : ""
            lines.push(`  ${tnIcon} ${tn.name}${assignee}${cpCount}`)

            // Show temporal gate if blocked
            if (tn.status === "blocked" && tn.temporalGate) {
                const depNode = findTaskNode(graph, tn.temporalGate.afterTaskId)
                const depName = depNode ? depNode.name : tn.temporalGate.afterTaskId
                lines.push(`     Waiting for: "${depName}"`)
            }
        }

        // Show plan-ahead if any
        if (wp.planAhead.length > 0) {
            lines.push(`  --- Plan Ahead (${wp.planAhead.length}) ---`)
            for (const tn of wp.planAhead) {
                lines.push(`  ⬜ ${tn.name} -> ${tn.assignedTo}`)
            }
        }

        lines.push("")
    }

    return lines.join("\n")
}

export function formatWorkPlanDetail(_graph: TaskGraph, wp: WorkPlan): string {
    const lines: string[] = [
        `=== WorkPlan: "${wp.name}" ===`,
        `ID: ${wp.id}`,
        `Status: ${wp.status}`,
        `Category: ${wp.category} / ${wp.governanceLevel}`,
        `Owner: ${wp.ownedBy}`,
        `Created: ${new Date(wp.createdAt).toISOString()}`,
        "",
    ]

    if (wp.acceptance.length > 0) {
        lines.push("Acceptance Criteria:")
        for (const a of wp.acceptance) {
            lines.push(`  - ${a}`)
        }
        lines.push("")
    }

    if (wp.dependsOn.length > 0) {
        lines.push(`Dependencies: ${wp.dependsOn.join(", ")}`)
        lines.push("")
    }

    lines.push(`Tasks (${wp.tasks.length}):`)
    for (const tn of wp.tasks) {
        const icon = STATUS_ICONS[tn.status] || "?"
        lines.push(`  ${icon} ${tn.name} [${tn.status}]`)
        lines.push(`     Assigned: ${tn.assignedTo} (by ${tn.delegatedBy})`)
        lines.push(`     Expected: ${tn.expectedOutput}`)
        if (tn.checkpoints.length > 0) {
            lines.push(`     Checkpoints: ${tn.checkpoints.length}`)
            for (const cp of tn.checkpoints.slice(-3)) {
                lines.push(`       - [${new Date(cp.timestamp).toLocaleTimeString()}] ${cp.tool}: ${cp.summary}`)
            }
        }
        if (tn.artifacts.length > 0) {
            lines.push(`     Artifacts: ${tn.artifacts.join(", ")}`)
        }
    }

    if (wp.planAhead.length > 0) {
        lines.push("")
        lines.push(`Plan Ahead (${wp.planAhead.length}):`)
        for (const tn of wp.planAhead) {
            lines.push(`  ⬜ ${tn.name} -> ${tn.assignedTo}`)
            lines.push(`     Expected: ${tn.expectedOutput}`)
        }
    }

    return lines.join("\n")
}

/** Build the governance reminder shown in system prompt and tool responses */
export function buildGraphReminder(graph: TaskGraph): string {
    const chain = getActiveWorkChain(graph)
    if (!chain.workPlan) {
        return "--- Governance Reminder ---\nNo active work plan. Create one with: tasks_add name='...'"
    }

    const completedTasks = chain.workPlan.tasks.filter(t => t.status === "completed").length
    const totalTasks = chain.workPlan.tasks.length
    const lines: string[] = [
        "--- Governance Reminder ---",
        `Active Plan: "${chain.workPlan.name}" (${completedTasks}/${totalTasks} tasks)`,
    ]

    if (chain.taskNode) {
        const cpCount = chain.taskNode.checkpoints.length
        lines.push(`Current Task: "${chain.taskNode.name}" (${cpCount} checkpoints, assigned: ${chain.taskNode.assignedTo})`)

        if (chain.nextPlanned) {
            lines.push(`Next: "${chain.nextPlanned.name}" (${chain.nextPlanned.status})`)
        }
    } else {
        const planned = chain.workPlan.tasks.filter(t => t.status === "planned")
        if (planned.length > 0) {
            lines.push(`Next: Start task "${planned[0].name}" with: tasks_start`)
        } else {
            lines.push("Next: Create a task with: tasks_add")
        }
    }

    return lines.join("\n")
}

// ─── Migration (v2 TaskStore → v3 TaskGraph) ────────────────────────

import type { TaskStore } from "./task.js"

/**
 * Migrate v2 TaskStore (Epic→Task→Subtask) to v3 TaskGraph (WorkPlan→TaskNode→Checkpoint).
 *
 * Mapping:
 * - Epic → WorkPlan
 * - Task → TaskNode (subtasks with status=done become checkpoints, others dropped)
 * - Subtask(done) → Checkpoint (evidence preservation)
 * - Subtask(pending/skipped) → dropped (no value)
 */
export function migrateV2ToV3(oldStore: TaskStore): TaskGraph {
    const graph: TaskGraph = {
        version: "3.0.0",
        activeWorkPlanId: null,
        workPlans: [],
    }

    for (const epic of oldStore.epics) {
        const wpId = epic.id.replace("epic-", "wp-")
        const wp: WorkPlan = {
            id: wpId,
            name: epic.name,
            acceptance: [],
            category: epic.category,
            governanceLevel: epic.governanceLevel,
            status: mapEpicStatus(epic.status),
            dependsOn: [],
            ownedBy: "idumb-supreme-coordinator",
            tasks: [],
            planAhead: [],
            createdAt: epic.createdAt,
            modifiedAt: epic.modifiedAt,
        }

        for (const task of epic.tasks) {
            const tnId = task.id.replace("task-", "tn-")
            const tn: TaskNode = {
                id: tnId,
                workPlanId: wpId,
                name: task.name,
                expectedOutput: task.evidence ?? "Migrated from v2 — no expected output defined",
                status: mapTaskStatus(task.status),
                delegatedBy: "idumb-supreme-coordinator",
                assignedTo: task.assignee ?? "idumb-executor",
                allowedTools: [],
                dependsOn: [],
                temporalGate: null,
                checkpoints: [],
                artifacts: [],
                createdAt: task.createdAt,
                modifiedAt: task.modifiedAt,
                startedAt: task.status === "active" || task.status === "completed"
                    ? task.createdAt : undefined,
                completedAt: task.status === "completed"
                    ? task.modifiedAt : undefined,
            }

            // Convert done subtasks to checkpoints
            for (const sub of task.subtasks) {
                if (sub.status === "done") {
                    tn.checkpoints.push({
                        id: sub.id.replace("sub-", "cp-"),
                        taskNodeId: tnId,
                        tool: sub.toolUsed ?? "unknown",
                        timestamp: sub.timestamp ?? task.modifiedAt,
                        summary: sub.name,
                        filesModified: [],
                    })
                }
            }

            // Preserve evidence as result
            if (task.evidence) {
                tn.result = {
                    evidence: task.evidence,
                    filesModified: [],
                    testsRun: "",
                    anchorsCreated: [],
                }
            }

            wp.tasks.push(tn)
        }

        graph.workPlans.push(wp)

        // Map active epic
        if (epic.id === oldStore.activeEpicId) {
            graph.activeWorkPlanId = wpId
        }
    }

    return graph
}

function mapEpicStatus(s: string): WorkPlanStatus {
    const map: Record<string, WorkPlanStatus> = {
        planned: "draft",
        active: "active",
        completed: "completed",
        deferred: "archived",
        abandoned: "abandoned",
    }
    return map[s] ?? "draft"
}

function mapTaskStatus(s: string): TaskNodeStatus {
    const map: Record<string, TaskNodeStatus> = {
        planned: "planned",
        active: "active",
        completed: "completed",
        blocked: "blocked",
        deferred: "planned",
    }
    return map[s] ?? "planned"
}
