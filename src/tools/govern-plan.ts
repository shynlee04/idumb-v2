/**
 * govern_plan — WorkPlan lifecycle management (Coordinator only).
 *
 * 5 actions: create, plan_tasks, status, archive, abandon
 *
 * This tool manages the top-level WorkPlan — creating plans with acceptance
 * criteria, adding TaskNodes (current or plan-ahead), and lifecycle transitions.
 *
 * Shadow: "Unlike the innate todo tool, this enforces acceptance criteria,
 * links to delegation protocol, and bridges to the write gate."
 */

import { tool } from "@opencode-ai/plugin/tool"
import type {
    WorkStreamCategory,
} from "../schemas/index.js"
import {
    createWorkPlan, createTaskNode,
    findWorkPlan, findTaskNode,
    formatTaskGraph, formatWorkPlanDetail,
    buildGraphReminder,
} from "../schemas/index.js"
import { stateManager } from "../lib/persistence.js"

const VALID_CATEGORIES: WorkStreamCategory[] = [
    "development", "research", "governance", "maintenance", "spec-kit", "ad-hoc",
]

export const govern_plan = tool({
    description: "Manage work plans — the top-level governance unit. Create plans with acceptance criteria, add tasks with dependencies and temporal gates, and track plan lifecycle. Unlike innate todo, this enforces temporal gates (tasks can't start before dependencies complete), scopes tool permissions per task, and bridges to the write gate — without an active task from a plan, all writes are blocked.",
    args: {
        action: tool.schema.enum(["create", "plan_tasks", "status", "archive", "abandon"]).describe(
            "Action: 'create' new plan, 'plan_tasks' add tasks to a plan, 'status' show graph, 'archive' completed plan, 'abandon' failed plan"
        ),
        name: tool.schema.string().optional().describe(
            "Plan name (for 'create') or task name (for 'plan_tasks')"
        ),
        acceptance: tool.schema.string().optional().describe(
            "Comma-separated acceptance criteria (for 'create'). Example: 'Tests pass,UI renders correctly'"
        ),
        category: tool.schema.string().optional().describe(
            "Work category (for 'create'): development, research, governance, maintenance, spec-kit, ad-hoc"
        ),
        target_id: tool.schema.string().optional().describe(
            "WorkPlan ID to operate on (for 'plan_tasks', 'archive', 'abandon'). Omit to use active plan."
        ),
        // plan_tasks specific
        expected_output: tool.schema.string().optional().describe(
            "What the task must produce (for 'plan_tasks'). Required."
        ),
        assigned_to: tool.schema.string().optional().describe(
            "Agent to assign task to (for 'plan_tasks'): idumb-investigator or idumb-executor"
        ),
        depends_on: tool.schema.string().optional().describe(
            "Comma-separated TaskNode IDs this task depends on (for 'plan_tasks')"
        ),
        temporal_gate_after: tool.schema.string().optional().describe(
            "TaskNode ID that must complete before this task starts (for 'plan_tasks')"
        ),
        temporal_gate_reason: tool.schema.string().optional().describe(
            "Why the temporal gate exists (for 'plan_tasks')"
        ),
        plan_ahead: tool.schema.boolean().optional().describe(
            "If true, add to planAhead array instead of tasks (for 'plan_tasks'). Default: false"
        ),
    },
    async execute(args, context) {
        const { action } = args

        switch (action) {
            case "create": {
                const name = args.name
                if (!name || name.trim().length === 0) {
                    return "ERROR: 'create' requires name. Example: govern_plan action=create name='User Authentication' acceptance='Login works,Tests pass'"
                }

                const acceptance = args.acceptance
                    ? args.acceptance.split(",").map(s => s.trim()).filter(Boolean)
                    : []

                const category = args.category as WorkStreamCategory | undefined
                if (category && !VALID_CATEGORIES.includes(category)) {
                    return `ERROR: Invalid category "${category}". Valid: ${VALID_CATEGORIES.join(", ")}`
                }

                const graph = stateManager.getTaskGraph()
                const wp = createWorkPlan({
                    name: name.trim(),
                    acceptance,
                    category,
                    ownedBy: stateManager.getCapturedAgent(context.sessionID) ?? "idumb-supreme-coordinator",
                })

                // Auto-activate if no active plan
                if (!graph.activeWorkPlanId) {
                    wp.status = "active"
                    graph.activeWorkPlanId = wp.id
                }

                graph.workPlans.push(wp)
                stateManager.saveTaskGraph(graph)

                return [
                    `WorkPlan created.`,
                    `  ID: ${wp.id}`,
                    `  Name: ${wp.name}`,
                    `  Status: ${wp.status}`,
                    `  Category: ${wp.category}/${wp.governanceLevel}`,
                    acceptance.length > 0 ? `  Acceptance: ${acceptance.join("; ")}` : "",
                    "",
                    `Next: Add tasks with govern_plan action=plan_tasks name='Task name' expected_output='What to produce' assigned_to='idumb-executor'`,
                    "",
                    buildGraphReminder(graph),
                ].filter(Boolean).join("\n")
            }

            case "plan_tasks": {
                const graph = stateManager.getTaskGraph()

                // Resolve target plan
                const wpId = args.target_id ?? graph.activeWorkPlanId
                if (!wpId) {
                    return "ERROR: No active plan and no target_id specified. Create one first: govern_plan action=create name='...'"
                }
                const wp = findWorkPlan(graph, wpId)
                if (!wp) {
                    return `ERROR: WorkPlan "${wpId}" not found.`
                }

                const name = args.name
                if (!name || name.trim().length === 0) {
                    return "ERROR: 'plan_tasks' requires name. Example: govern_plan action=plan_tasks name='Build login form' expected_output='Login page renders and submits'"
                }
                const expectedOutput = args.expected_output
                if (!expectedOutput || expectedOutput.trim().length === 0) {
                    return "ERROR: 'plan_tasks' requires expected_output. What must this task produce?"
                }

                const assignedTo = args.assigned_to ?? "idumb-executor"
                const delegatedBy = stateManager.getCapturedAgent(context.sessionID) ?? "idumb-supreme-coordinator"

                const dependsOn = args.depends_on
                    ? args.depends_on.split(",").map(s => s.trim()).filter(Boolean)
                    : []

                // Validate dependencies exist
                for (const depId of dependsOn) {
                    if (!findTaskNode(graph, depId)) {
                        return `ERROR: Dependency "${depId}" not found in task graph. Check the ID and try again.`
                    }
                }

                const temporalGate = args.temporal_gate_after
                    ? {
                        afterTaskId: args.temporal_gate_after,
                        reason: args.temporal_gate_reason ?? "Must complete before this task starts",
                    }
                    : null

                // Validate temporal gate target exists
                if (temporalGate && !findTaskNode(graph, temporalGate.afterTaskId)) {
                    return `ERROR: Temporal gate target "${temporalGate.afterTaskId}" not found in task graph.`
                }

                const tn = createTaskNode({
                    workPlanId: wp.id,
                    name: name.trim(),
                    expectedOutput: expectedOutput.trim(),
                    delegatedBy,
                    assignedTo,
                    dependsOn,
                    temporalGate,
                })

                // Auto-set blocked status if dependencies aren't all completed
                if (dependsOn.length > 0 || temporalGate) {
                    const allDepsMet = dependsOn.every(depId => {
                        const dep = findTaskNode(graph, depId)
                        return dep && dep.status === "completed"
                    })
                    const gateMet = !temporalGate || (() => {
                        const gateNode = findTaskNode(graph, temporalGate.afterTaskId)
                        return gateNode && gateNode.status === "completed"
                    })()

                    if (!allDepsMet || !gateMet) {
                        tn.status = "blocked"
                    }
                }

                if (args.plan_ahead) {
                    wp.planAhead.push(tn)
                } else {
                    wp.tasks.push(tn)
                }

                wp.modifiedAt = Date.now()
                stateManager.saveTaskGraph(graph)

                return [
                    `TaskNode added to ${args.plan_ahead ? "planAhead" : "tasks"}.`,
                    `  ID: ${tn.id}`,
                    `  Name: ${tn.name}`,
                    `  Status: ${tn.status}`,
                    `  Assigned: ${tn.assignedTo} (by ${tn.delegatedBy})`,
                    `  Expected: ${tn.expectedOutput}`,
                    dependsOn.length > 0 ? `  Depends on: ${dependsOn.join(", ")}` : "",
                    temporalGate ? `  Temporal gate: after ${temporalGate.afterTaskId} (${temporalGate.reason})` : "",
                    "",
                    buildGraphReminder(graph),
                ].filter(Boolean).join("\n")
            }

            case "status": {
                const graph = stateManager.getTaskGraph()

                if (args.target_id) {
                    const wp = findWorkPlan(graph, args.target_id)
                    if (!wp) {
                        return `ERROR: WorkPlan "${args.target_id}" not found.`
                    }
                    return formatWorkPlanDetail(graph, wp)
                }

                return formatTaskGraph(graph)
            }

            case "archive": {
                const graph = stateManager.getTaskGraph()
                const wpId = args.target_id ?? graph.activeWorkPlanId
                if (!wpId) return "ERROR: No target_id and no active plan."

                const wp = findWorkPlan(graph, wpId)
                if (!wp) return `ERROR: WorkPlan "${wpId}" not found.`

                if (wp.status !== "completed") {
                    return `ERROR: Cannot archive a plan with status "${wp.status}". Complete it first.`
                }

                wp.status = "archived"
                wp.modifiedAt = Date.now()

                if (graph.activeWorkPlanId === wpId) {
                    graph.activeWorkPlanId = null
                }

                stateManager.saveTaskGraph(graph)
                return `WorkPlan "${wp.name}" archived.\n\n${buildGraphReminder(graph)}`
            }

            case "abandon": {
                const graph = stateManager.getTaskGraph()
                const wpId = args.target_id ?? graph.activeWorkPlanId
                if (!wpId) return "ERROR: No target_id and no active plan."

                const wp = findWorkPlan(graph, wpId)
                if (!wp) return `ERROR: WorkPlan "${wpId}" not found.`

                wp.status = "abandoned"
                wp.modifiedAt = Date.now()

                if (graph.activeWorkPlanId === wpId) {
                    graph.activeWorkPlanId = null
                }

                stateManager.saveTaskGraph(graph)
                return [
                    `WorkPlan "${wp.name}" abandoned.`,
                    `It will be purged from context injection after 48h (data stays on disk for audit).`,
                    "",
                    buildGraphReminder(graph),
                ].join("\n")
            }

            default:
                return `Unknown action: ${action}. Valid: create, plan_tasks, status, archive, abandon.`
        }
    },
})
