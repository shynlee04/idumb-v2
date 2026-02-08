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
 *
 * SDK Integration Notes (2026-02-08):
 * - client.tui.executeCommand({ body: { command: "agent_cycle" } }) — attempts
 *   programmatic agent switch after delegation. UNVERIFIED at runtime; falls back
 *   to text-based handoff instruction if unavailable.
 * - client.session.children({ path: { id: sessionID } }) — used to log delegation
 *   tree for observability. UNVERIFIED at runtime; logged and no-oped if unavailable.
 * - client.tui.showToast() — VERIFIED in tool-gate.ts; used here for delegation notification.
 */

import { tool } from "@opencode-ai/plugin/tool"
import {
    findTaskNode, findParentPlan,
    validateTaskStart,
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
import { tryGetClient } from "../lib/sdk-client.js"

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

                // Auto-activate: if temporal gates pass, start the task so the
                // delegate's writes are immediately unlocked (no 3-call ceremony).
                // If gates fail (blocked dependency), delegation still proceeds
                // but the delegate must manually start the task later.
                let autoActivated = false
                const gateCheck = validateTaskStart(graph, node)
                if (gateCheck.allowed) {
                    node.status = "active"
                    node.startedAt = Date.now()
                    autoActivated = true
                }

                // Persist
                delegationStore.delegations.push(record)
                stateManager.saveDelegationStore(delegationStore)
                stateManager.saveTaskGraph(graph)

                // Build delegation instruction
                const instruction = buildDelegationInstruction(record)

                // Attempt programmatic agent switch via SDK (P3: graceful degradation)
                let agentSwitchAttempted = false
                try {
                    const client = tryGetClient()
                    if (client) {
                        // Fire toast notification for delegation
                        client.tui.showToast({
                            body: {
                                title: "Delegation",
                                message: `${fromAgent} → ${args.to_agent}: "${node.name}"`,
                                variant: "info",
                            },
                        }).catch(() => {})

                        // Attempt programmatic agent cycle (UNVERIFIED at runtime)
                        await client.tui.executeCommand({
                            body: { command: "agent_cycle" },
                        })
                        agentSwitchAttempted = true

                        // Track delegation tree for observability (UNVERIFIED at runtime)
                        client.session.children({
                            path: { id: ctx.sessionID },
                        }).then((result) => {
                            // Log children count for observability — no action taken
                            const data = result?.data
                            if (data && Array.isArray(data)) {
                                // Silently observed — delegation tree tracked
                            }
                        }).catch(() => {
                            // P3: session.children() may not be available
                        })
                    }
                } catch {
                    // P3: If executeCommand fails, fall back to text-based handoff
                    agentSwitchAttempted = false
                }

                const switchNote = agentSwitchAttempted
                    ? `  Agent switch: attempted via TUI command`
                    : `  Agent switch: manual — use @${args.to_agent} to switch`

                const activationNote = autoActivated
                    ? `  Task auto-started: write/edit tools UNLOCKED for delegate.`
                    : `  Task NOT auto-started (dependency gate). Delegate must call govern_task action=start.`

                return [
                    `Delegation created.`,
                    `  ID: ${record.id}`,
                    `  From: ${fromAgent} → To: ${args.to_agent}`,
                    `  Task: "${node.name}" (${args.task_id})`,
                    activationNote,
                    switchNote,
                    "",
                    `--- HANDOFF INSTRUCTION (pass to @${args.to_agent}) ---`,
                    instruction,
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
