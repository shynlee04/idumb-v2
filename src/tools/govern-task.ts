/**
 * govern_task — TaskNode lifecycle management (All agents, scoped).
 *
 * 5 actions: start, complete, fail, review, status
 *
 * This tool manages individual TaskNode lifecycle. The `start` action is
 * the critical bridge to the tool-gate — without it, write/edit are blocked.
 *
 * Shadow: "Unlike the innate todo tool, this enforces temporal gates,
 * auto-records checkpoints from your tool usage, and bridges to the write
 * gate — without an active task from this tool, all write/edit calls are blocked."
 */

import { tool } from "@opencode-ai/plugin/tool"
import {
    findTaskNode, findParentPlan,
    validateTaskStart, validateTaskCompletion,
    getActiveWorkChain, buildGraphReminder,
    detectGraphBreaks,
} from "../schemas/index.js"
import { stateManager } from "../lib/persistence.js"

export const govern_task = tool({
    description: "Check or advance your current task. Unlike the innate todo tool, this enforces temporal gates (tasks can't start before dependencies complete), auto-records checkpoints from your tool usage, and bridges to the write gate — without an active task from this tool, all write/edit calls are blocked.",
    args: {
        action: tool.schema.enum(["start", "complete", "fail", "review", "status"]).describe(
            "Action: 'start' activates a planned task, 'complete' closes with evidence, 'fail' marks failed, 'review' requests review, 'status' shows current state"
        ),
        target_id: tool.schema.string().optional().describe(
            "TaskNode ID to operate on. Required for start/complete/fail/review. Omit for status (shows active)."
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
                    `Task started: "${node.name}"`,
                    `  ID: ${node.id}`,
                    `  Assigned: ${node.assignedTo}`,
                    `  Expected output: ${node.expectedOutput}`,
                    `  Write/edit tools are now UNLOCKED for this session.`,
                    "",
                    buildGraphReminder(graph),
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
                    `Task completed: "${node.name}"`,
                    `  Evidence: ${args.evidence}`,
                    `  Checkpoints: ${node.checkpoints.length}`,
                    `  Artifacts: ${node.artifacts.length > 0 ? node.artifacts.join(", ") : "none"}`,
                    `  Write/edit tools are now RE-LOCKED. Start another task to continue.`,
                    "",
                    buildGraphReminder(graph),
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
                    `Task FAILED: "${node.name}"`,
                    `  Reason: ${args.reason}`,
                    `  Dependent tasks have been blocked.`,
                    `  Write/edit tools are now RE-LOCKED.`,
                    "",
                    buildGraphReminder(graph),
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

                return [
                    `Task submitted for review: "${node.name}"`,
                    `  Checkpoints: ${node.checkpoints.length}`,
                    `  Artifacts: ${node.artifacts.join(", ") || "none"}`,
                    `  Expected output: ${node.expectedOutput}`,
                    "",
                    `To complete: govern_task action=complete target_id=${node.id} evidence="..."`,
                    `To fail: govern_task action=fail target_id=${node.id} reason="..."`,
                ].join("\n")
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
                return `Unknown action: ${action}. Valid: start, complete, fail, review, status.`
        }
    },
})
