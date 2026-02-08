/**
 * govern_delegate — Structured delegation protocol (Coordinator only).
 *
 * 3 actions: assign, recall, status
 *
 * Creates structured delegation handoffs with scoped permissions.
 * Unlike calling @agent directly, this creates a record with expected output,
 * allowed tools, and temporal gates. The delegate's tool access is enforced
 * by the tool-gate hook.
 *
 * Shadow: "Unlike calling @agent directly, this creates a structured handoff
 * with expected output, allowed tools, and temporal gates. The delegate's tool
 * access is enforced — they literally cannot call tools outside their allowedTools list."
 */

import { tool } from "@opencode-ai/plugin/tool"
import {
    findTaskNode, findParentPlan,
    buildGraphReminder,
} from "../schemas/index.js"
import {
    validateDelegation, getDelegationDepth,
    createDelegation, buildDelegationInstruction,
    findActiveDelegations, findDelegation,
    rejectDelegation,
    formatDelegationStore,
} from "../schemas/index.js"
import type { WorkStreamCategory } from "../schemas/index.js"
import { stateManager } from "../lib/persistence.js"

export const govern_delegate = tool({
    description: "Delegate a task to a sub-agent with scoped permissions. Unlike calling @agent directly, this creates a structured handoff with expected output, allowed tools, and temporal gates. The delegate's tool access is enforced — they literally cannot call tools outside their allowedTools list.",
    args: {
        action: tool.schema.enum(["assign", "recall", "status"]).describe(
            "Action: 'assign' delegates a task, 'recall' withdraws a delegation, 'status' shows delegation tree"
        ),
        task_id: tool.schema.string().optional().describe(
            "TaskNode ID to delegate (for 'assign'). Required."
        ),
        to_agent: tool.schema.string().optional().describe(
            "Target agent (for 'assign'): idumb-investigator or idumb-executor"
        ),
        context: tool.schema.string().optional().describe(
            "What the delegate needs to know (for 'assign'). Context for the handoff."
        ),
        delegation_id: tool.schema.string().optional().describe(
            "Delegation ID to recall (for 'recall')."
        ),
    },
    async execute(args, ctx) {
        const { action } = args
        const fromAgent = stateManager.getCapturedAgent(ctx.sessionID) ?? "idumb-supreme-coordinator"

        switch (action) {
            case "assign": {
                if (!args.task_id) {
                    return "ERROR: 'assign' requires task_id. Use govern_plan action=status to see available tasks."
                }
                if (!args.to_agent) {
                    return "ERROR: 'assign' requires to_agent. Valid: idumb-investigator, idumb-executor."
                }

                const graph = stateManager.getTaskGraph()
                const node = findTaskNode(graph, args.task_id)
                if (!node) {
                    return `ERROR: TaskNode "${args.task_id}" not found.`
                }

                // Get epic category for routing validation
                const wp = findParentPlan(graph, args.task_id)
                const epicCategory = wp?.category as WorkStreamCategory | undefined

                // Validate delegation hierarchy
                const delegationStore = stateManager.getDelegationStore()
                const currentDepth = getDelegationDepth(delegationStore, args.task_id)
                const validation = validateDelegation(
                    fromAgent,
                    args.to_agent,
                    currentDepth,
                    epicCategory,
                )

                if (!validation.valid) {
                    return [
                        `GOVERNANCE BLOCK: Delegation denied.`,
                        "",
                        `WHAT: ${validation.reason}`,
                        `WHY: Delegation hierarchy is enforced — agents cannot delegate upward or outside their routing matrix.`,
                        `USE INSTEAD: Check the agent hierarchy and category routing rules.`,
                        `EVIDENCE: from="${fromAgent}", to="${args.to_agent}", depth=${currentDepth}`,
                    ].join("\n")
                }

                // Create delegation record
                const delegationContext = args.context ?? `Delegated by ${fromAgent}: ${node.name}`
                const record = createDelegation({
                    fromAgent,
                    toAgent: args.to_agent,
                    taskId: args.task_id,
                    context: delegationContext,
                    expectedOutput: node.expectedOutput,
                    allowedTools: node.allowedTools.length > 0
                        ? node.allowedTools
                        : undefined,
                    currentDepth,
                })

                // Update task node with delegation info
                node.assignedTo = args.to_agent
                node.delegatedBy = fromAgent
                node.modifiedAt = Date.now()

                // Persist
                delegationStore.delegations.push(record)
                stateManager.saveDelegationStore(delegationStore)
                stateManager.saveTaskGraph(graph)

                // Build delegation instruction
                const instruction = buildDelegationInstruction(record)

                return [
                    `Delegation created.`,
                    `  ID: ${record.id}`,
                    `  From: ${fromAgent} → To: ${args.to_agent}`,
                    `  Task: "${node.name}" (${args.task_id})`,
                    `  Expected: ${node.expectedOutput}`,
                    `  Allowed tools: ${record.allowedTools.join(", ")}`,
                    `  Expires: ${new Date(record.expiresAt).toISOString()}`,
                    "",
                    `--- HANDOFF INSTRUCTION (pass to @${args.to_agent}) ---`,
                    instruction,
                    "",
                    buildGraphReminder(graph),
                ].join("\n")
            }

            case "recall": {
                if (!args.delegation_id) {
                    return "ERROR: 'recall' requires delegation_id."
                }

                const delegationStore = stateManager.getDelegationStore()
                const record = findDelegation(delegationStore, args.delegation_id)
                if (!record) {
                    return `ERROR: Delegation "${args.delegation_id}" not found.`
                }

                if (record.status === "completed") {
                    return `ERROR: Delegation "${args.delegation_id}" is already completed. Cannot recall.`
                }

                rejectDelegation(record)
                stateManager.saveDelegationStore(delegationStore)

                return [
                    `Delegation recalled.`,
                    `  ID: ${record.id}`,
                    `  Was: ${record.fromAgent} → ${record.toAgent}`,
                    `  Task: ${record.taskId}`,
                    `  Status: rejected (recalled by coordinator)`,
                ].join("\n")
            }

            case "status": {
                const delegationStore = stateManager.getDelegationStore()
                const active = findActiveDelegations(delegationStore)

                if (active.length === 0 && delegationStore.delegations.length === 0) {
                    return "No delegations recorded. Use govern_delegate action=assign to delegate a task."
                }

                return formatDelegationStore(delegationStore)
            }

            default:
                return `Unknown action: ${action}. Valid: assign, recall, status.`
        }
    },
})
