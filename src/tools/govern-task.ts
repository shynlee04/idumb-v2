/**
 * govern_task — TaskNode lifecycle management (All agents, scoped).
 *
 * 6 actions: quick_start, start, complete, fail, review, status
 *
 * This tool manages individual TaskNode lifecycle. The `quick_start` action
 * creates a plan + task + activates it in ONE call (no ceremony).
 * The `start` action activates an existing planned task.
 * Both bridge to the tool-gate — without an active task, write/edit are blocked.
 *
 * Shadow: "Unlike the innate todo tool, this enforces temporal gates,
 * auto-records checkpoints from your tool usage, and bridges to the write
 * gate — without an active task from this tool, all write/edit calls are blocked."
 */

import { tool } from "@opencode-ai/plugin/tool"
import {
    findTaskNode, findParentPlan,
    validateTaskStart, validateTaskCompletion,
    getActiveWorkChain,
    detectGraphBreaks,
    createWorkPlan, createTaskNode,
} from "../schemas/index.js"
import type { WorkPlan } from "../schemas/work-plan.js"
import { stateManager } from "../lib/persistence.js"

export const govern_task = tool({
    description: "Start or manage tasks that unlock write/edit permissions. Use 'quick_start' to create a plan+task and start working immediately (ONE call instead of three). Use 'start' to activate an existing planned task. Use 'complete'/'fail' to finish. Use 'status' to check state. Without an active task, all write/edit calls are blocked.",
    args: {
        action: tool.schema.enum(["quick_start", "start", "complete", "fail", "review", "status"]).describe(
            "Action: 'quick_start' creates plan+task+starts in one call (fastest path to writing), 'start' activates a planned task, 'complete' closes with evidence, 'fail' marks failed, 'review' requests review, 'status' shows current state"
        ),
        target_id: tool.schema.string().optional().describe(
            "TaskNode ID to operate on. Required for start/fail. Optional for complete/review (falls back to active). Not needed for quick_start/status."
        ),
        name: tool.schema.string().optional().describe(
            "Task name (for 'quick_start'). What you're about to work on. Example: 'Fix auth login flow'"
        ),
        expected_output: tool.schema.string().optional().describe(
            "What the task must produce (for 'quick_start'). Optional — defaults to the task name. Example: 'Login page works with SSO'"
        ),
        evidence: tool.schema.string().optional().describe(
            "Proof of completion (for 'complete'). Examples: 'All tests passing', 'Feature renders correctly', file paths."
        ),
        reason: tool.schema.string().optional().describe(
            "Reason for failure (for 'fail'). Required."
        ),
    },
    async execute(args, context) {
        const { action } = args
        const { sessionID } = context

        switch (action) {
            case "quick_start": {
                // ── One-call ceremony killer ──────────────────────────────
                // Creates plan + task + starts it in a single call.
                // Replaces: govern_plan create → govern_plan plan_tasks → govern_task start
                if (!args.name) {
                    return "ERROR: 'quick_start' requires name. Example: govern_task action=quick_start name=\"Fix auth login flow\""
                }

                const graph = stateManager.getTaskGraph()
                const agent = stateManager.getCapturedAgent(sessionID) ?? "idumb-executor"

                // Find or create active WorkPlan
                let wp: WorkPlan | undefined
                if (graph.activeWorkPlanId) {
                    wp = graph.workPlans.find(w => w.id === graph.activeWorkPlanId)
                }
                if (!wp) {
                    wp = createWorkPlan({
                        name: `Quick: ${args.name}`,
                        category: "ad-hoc",
                        ownedBy: agent,
                    })
                    wp.status = "active"
                    graph.workPlans.push(wp)
                    graph.activeWorkPlanId = wp.id
                }

                // Create TaskNode — no dependencies, no temporal gates
                const node = createTaskNode({
                    workPlanId: wp.id,
                    name: args.name,
                    expectedOutput: args.expected_output ?? args.name,
                    delegatedBy: agent,
                    assignedTo: agent,
                })

                // Auto-start immediately
                node.status = "active"
                node.startedAt = Date.now()
                wp.tasks.push(node)
                wp.modifiedAt = Date.now()

                // Bridge to tool-gate: unlock writes
                stateManager.setActiveTask(sessionID, {
                    id: node.id,
                    name: node.name,
                })

                stateManager.saveTaskGraph(graph)

                return [
                    `Quick start: "${node.name}" [${node.id}]`,
                    `Plan: "${wp.name}" [${wp.id}]`,
                    `Write/edit UNLOCKED.`,
                ].join("\n")
            }

            case "start": {
                if (!args.target_id) {
                    return "ERROR: 'start' requires target_id. Use govern_plan action=status to see available tasks."
                }

                const graph = stateManager.getTaskGraph()
                const node = findTaskNode(graph, args.target_id)
                if (!node) {
                    return `ERROR: TaskNode "${args.target_id}" not found.`
                }

                // Validate: temporal gates, dependencies, status
                const check = validateTaskStart(graph, node)
                if (!check.allowed) {
                    const lines = [
                        `GOVERNANCE BLOCK: Cannot start task "${node.name}"`,
                        "",
                        `WHAT: ${check.reason}`,
                        `WHY: Temporal gates and dependencies are enforced — tasks cannot start until prerequisites complete.`,
                    ]
                    if (check.blockedBy) {
                        lines.push(`BLOCKED BY: "${check.blockedBy.name}" [${check.blockedBy.status}] (${check.blockedBy.id})`)
                        lines.push(`USE INSTEAD: Complete the blocking task first, or ask the coordinator to adjust dependencies.`)
                    }
                    lines.push(`EVIDENCE: TaskNode ${node.id}.status = "${node.status}"`)
                    return lines.join("\n")
                }

                // Activate the task
                node.status = "active"
                node.startedAt = Date.now()
                node.modifiedAt = Date.now()

                // Bridge to tool-gate: set session active task
                stateManager.setActiveTask(sessionID, {
                    id: node.id,
                    name: node.name,
                })

                stateManager.saveTaskGraph(graph)

                return [
                    `Task started: "${node.name}" [${node.id}]`,
                    `Write/edit UNLOCKED.`,
                ].join("\n")
            }

            case "complete": {
                if (!args.target_id) {
                    // Try to use active task
                    const chain = getActiveWorkChain(stateManager.getTaskGraph())
                    if (chain.taskNode) {
                        args.target_id = chain.taskNode.id
                    } else {
                        return "ERROR: 'complete' requires target_id (or an active task)."
                    }
                }

                const graph = stateManager.getTaskGraph()
                const node = findTaskNode(graph, args.target_id)
                if (!node) {
                    return `ERROR: TaskNode "${args.target_id}" not found.`
                }

                const check = validateTaskCompletion(node, args.evidence)
                if (!check.valid) {
                    return check.reason
                }

                // Complete the task
                node.status = "completed"
                node.completedAt = Date.now()
                node.modifiedAt = Date.now()
                node.result = {
                    evidence: args.evidence!,
                    filesModified: node.artifacts,
                    testsRun: "",
                    anchorsCreated: [],
                }

                // Clear session active task (re-blocks writes)
                stateManager.setActiveTask(sessionID, null)

                // Unblock dependent tasks
                const wp = findParentPlan(graph, node.id)
                if (wp) {
                    for (const tn of wp.tasks) {
                        if (tn.status === "blocked") {
                            // Check if all deps are now met
                            const allDepsMet = tn.dependsOn.every(depId => {
                                const dep = findTaskNode(graph, depId)
                                return dep && dep.status === "completed"
                            })
                            const gateMet = !tn.temporalGate || (() => {
                                const gateNode = findTaskNode(graph, tn.temporalGate!.afterTaskId)
                                return gateNode && gateNode.status === "completed"
                            })()

                            if (allDepsMet && gateMet) {
                                tn.status = "planned"
                                tn.modifiedAt = Date.now()
                            }
                        }
                    }

                    // Check if all tasks in plan are completed
                    const allDone = wp.tasks.every(t =>
                        t.status === "completed" || t.status === "failed"
                    )
                    if (allDone && wp.tasks.some(t => t.status === "completed")) {
                        wp.status = "completed"
                        wp.completedAt = Date.now()
                        wp.modifiedAt = Date.now()
                    }
                }

                stateManager.saveTaskGraph(graph)

                const warnings = detectGraphBreaks(graph)
                const warningLines = warnings.length > 0
                    ? ["\n--- Warnings ---", ...warnings.map(w => `  ${w.message}`)]
                    : []

                return [
                    `Task completed: "${node.name}" (${node.checkpoints.length} checkpoints, ${node.artifacts.length} artifacts)`,
                    `Evidence: ${args.evidence}`,
                    `Write/edit RE-LOCKED.`,
                    ...warningLines,
                ].join("\n")
            }

            case "fail": {
                if (!args.target_id) {
                    return "ERROR: 'fail' requires target_id."
                }
                if (!args.reason) {
                    return "ERROR: 'fail' requires reason. Why did this task fail?"
                }

                const graph = stateManager.getTaskGraph()
                const node = findTaskNode(graph, args.target_id)
                if (!node) {
                    return `ERROR: TaskNode "${args.target_id}" not found.`
                }

                if (node.status !== "active" && node.status !== "review") {
                    return `ERROR: Can only fail active/review tasks. "${node.name}" has status "${node.status}".`
                }

                node.status = "failed"
                node.modifiedAt = Date.now()
                node.result = {
                    evidence: `FAILED: ${args.reason}`,
                    filesModified: node.artifacts,
                    testsRun: "",
                    anchorsCreated: [],
                }

                // Clear session active task
                stateManager.setActiveTask(sessionID, null)

                // Block dependent tasks (chain-breaker)
                const wp = findParentPlan(graph, node.id)
                if (wp) {
                    for (const tn of wp.tasks) {
                        if (tn.dependsOn.includes(node.id)
                            && (tn.status === "planned" || tn.status === "blocked")) {
                            tn.status = "blocked"
                            tn.modifiedAt = Date.now()
                        }
                    }
                }

                stateManager.saveTaskGraph(graph)

                return [
                    `Task FAILED: "${node.name}" — ${args.reason}`,
                    `Dependents blocked. Write/edit RE-LOCKED.`,
                ].join("\n")
            }

            case "review": {
                if (!args.target_id) {
                    const chain = getActiveWorkChain(stateManager.getTaskGraph())
                    if (chain.taskNode) {
                        args.target_id = chain.taskNode.id
                    } else {
                        return "ERROR: 'review' requires target_id (or an active task)."
                    }
                }

                const graph = stateManager.getTaskGraph()
                const node = findTaskNode(graph, args.target_id)
                if (!node) {
                    return `ERROR: TaskNode "${args.target_id}" not found.`
                }

                if (node.status !== "active") {
                    return `ERROR: Can only review active tasks. "${node.name}" has status "${node.status}".`
                }

                node.status = "review"
                node.modifiedAt = Date.now()
                stateManager.saveTaskGraph(graph)

                return `Review: "${node.name}" [${node.id}] — ${node.checkpoints.length} checkpoints, ${node.artifacts.length} artifacts`
            }

            case "status": {
                const graph = stateManager.getTaskGraph()
                const chain = getActiveWorkChain(graph)
                const warnings = detectGraphBreaks(graph)

                const lines: string[] = ["=== Governance Status ===", ""]

                // Active task
                if (chain.taskNode) {
                    lines.push(`ACTIVE TASK: "${chain.taskNode.name}"`)
                    lines.push(`  ID: ${chain.taskNode.id}`)
                    lines.push(`  Assigned: ${chain.taskNode.assignedTo}`)
                    lines.push(`  Expected: ${chain.taskNode.expectedOutput}`)
                    lines.push(`  Checkpoints: ${chain.taskNode.checkpoints.length}`)
                    if (chain.recentCheckpoints.length > 0) {
                        lines.push(`  Recent:`)
                        for (const cp of chain.recentCheckpoints) {
                            lines.push(`    - [${new Date(cp.timestamp).toLocaleTimeString()}] ${cp.tool}: ${cp.summary}`)
                        }
                    }
                } else {
                    lines.push("NO ACTIVE TASK — writes are blocked.")
                    lines.push("Start a task: govern_task action=start target_id=...")
                }

                lines.push("")

                // Active plan
                if (chain.workPlan) {
                    const completed = chain.workPlan.tasks.filter(t => t.status === "completed").length
                    const total = chain.workPlan.tasks.length
                    lines.push(`ACTIVE PLAN: "${chain.workPlan.name}" (${completed}/${total} tasks)`)
                }

                // Next planned
                if (chain.nextPlanned) {
                    lines.push(`NEXT TASK: "${chain.nextPlanned.name}" (${chain.nextPlanned.status})`)
                }

                // Warnings
                if (warnings.length > 0) {
                    lines.push("")
                    lines.push(`--- Warnings (${warnings.length}) ---`)
                    for (const w of warnings) {
                        lines.push(`  [${w.type}] ${w.message}`)
                    }
                }

                return lines.join("\n")
            }

            default:
                return `Unknown action: ${action}. Valid: quick_start, start, complete, fail, review, status.`
        }
    },
})
