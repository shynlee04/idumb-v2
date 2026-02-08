/**
 * Tool Gate — Stop Hook (tool.execute.before + after)
 * 
 * Intercepts tool calls, enforces governance conditions, and BLOCKS
 * with redirect messages when conditions fail.
 * 
 * BLOCK pattern: STOP + REDIRECT + EVIDENCE (§7)
 * - WHAT: what was denied and why
 * - USE INSTEAD: specific alternative tool/action
 * - EVIDENCE: governance state that triggered the block
 * 
 * P3: Every path wrapped in try/catch — never break TUI
 * P5: In-memory Maps for session state — no file I/O in hot path
 * P6: SDK format defensive — type-check all inputs
 */

import type { Logger } from "../lib/index.js"
import { stateManager } from "../lib/persistence.js"
import { tryGetClient } from "../lib/sdk-client.js"
import {
  shouldCreateCheckpoint, createCheckpoint,
  findTaskNode, validateTaskStart,
  isBashCheckpointWorthy,
} from "../schemas/index.js"

/** Write tools that require an active task */
const WRITE_TOOLS = new Set(["write", "edit"])

/**
 * Fire a toast notification via the SDK client (if available).
 * P3: Graceful degradation — silently no-ops if TUI unavailable.
 */
function fireToast(
  variant: "info" | "success" | "warning" | "error",
  message: string,
  title?: string,
): void {
  try {
    const client = tryGetClient()
    if (!client) return
    // Fire-and-forget — don't await to avoid blocking the hook
    client.tui.showToast({ body: { message, variant, title } }).catch(() => {})
  } catch {
    // P3: Never crash for toast failure
  }
}

/** Plugin tools that need agent-scoped access control */
const PLUGIN_TOOLS = new Set([
  // v3 governance tools
  "govern_plan", "govern_task", "govern_delegate", "govern_shell",
  // Context & bootstrap tools
  "idumb_anchor", "idumb_init",
])

/**
 * Agent → Plugin tool access matrix.
 * 
 * Only agents with RESTRICTIONS are listed. Unlisted agents get full access.
 * This is the PP-01 workaround: since OpenCode frontmatter can't scope plugin
 * tools, we enforce access here using chat.params-captured agent identity.
 */
interface AgentToolRule {
  /** Plugin tools this agent cannot call at all */
  blockedTools: Set<string>
  /** Per-tool action blocks. Key = tool name, value = set of blocked action names */
  blockedActions: Record<string, Set<string>>
}

export const AGENT_TOOL_RULES: Record<string, AgentToolRule> = {
  // Supreme Coordinator: orchestrator — plans, delegates, monitors status
  // CAN: govern_plan (all), govern_delegate (all), govern_task (status only),
  //      govern_shell (inspection only — internal gating), idumb_anchor,
  //      idumb_init (status, scan — but NOT install)
  // CANNOT: govern_task (start/quick_start/complete/fail/review), idumb_init install
  "idumb-supreme-coordinator": {
    blockedTools: new Set<string>(),
    blockedActions: {
      "idumb_init": new Set(["install"]),
      "govern_task": new Set(["start", "quick_start", "complete", "fail", "review"]),
    },
  },

  // Investigator: research, analysis, brain entries
  // CAN: govern_task (all), govern_shell (validation+inspection — internal gating),
  //      idumb_anchor
  // CANNOT: govern_plan (except status), govern_delegate, idumb_init
  "idumb-investigator": {
    blockedTools: new Set(["idumb_init", "govern_delegate"]),
    blockedActions: {
      "govern_plan": new Set(["create", "plan_tasks", "archive", "abandon"]),
    },
  },

  // Executor: precision writes, builds, tests, git
  // CAN: govern_task (all), govern_shell (all categories — internal gating),
  //      idumb_anchor
  // CANNOT: govern_plan (except status), govern_delegate, idumb_init
  "idumb-executor": {
    blockedTools: new Set(["idumb_init", "govern_delegate"]),
    blockedActions: {
      "govern_plan": new Set(["create", "plan_tasks", "archive", "abandon"]),
    },
  },
}

/**
 * Look up agent-scoped tool rules by agent name.
 *
 * Returns the AgentToolRule for the given agent, or null if no rules are
 * defined (meaning the agent has unrestricted access to plugin tools).
 *
 * Extracted as a testable helper for Story 14-02.
 * In the future, this could consult the SDK for dynamic rule definitions
 * (e.g. via client.app.agents()) — for now it's a pure static lookup.
 */
export function getAgentRules(agentName: string): AgentToolRule | null {
  return AGENT_TOOL_RULES[agentName] ?? null
}

/** Build block message for agent-scoped tool denial */
function buildAgentScopeBlock(agent: string, tool: string, action?: string): string {
  const target = action ? `${tool} action=${action}` : tool
  return [
    `GOVERNANCE BLOCK: ${target} denied for agent "${agent}"`,
    "",
    `WHAT: Your agent role "${agent}" does not have permission to use "${target}".`,
    `WHY: Plugin tool access is scoped per agent to enforce hierarchy.`,
    action
      ? `USE INSTEAD: Ask your delegator to perform this action, or delegate to an agent with permission.`
      : `USE INSTEAD: This tool should be called by the supreme-coordinator or the appropriate agent.`,
    `EVIDENCE: Agent-scoped tool gate blocked this call.`,
  ].join("\n")
}

/** Exported for task tool to update session state — delegates to StateManager */
export function setActiveTask(sessionID: string, task: { id: string; name: string } | null): void {
  stateManager.setActiveTask(sessionID, task)
  // Notify via TUI toast when task is activated (P3: graceful degradation)
  if (task) {
    fireToast("info", `Task "${task.name}" activated`, "Task Started")
  }
}

/** Exported for status/debug — delegates to StateManager */
export function getActiveTask(sessionID: string): { id: string; name: string } | null {
  return stateManager.getActiveTask(sessionID)
}

/** Build the BLOCK message with REDIRECT + EVIDENCE */
function buildBlockMessage(tool: string, isRetry: boolean): string {
  const retryNote = isRetry
    ? " (ALREADY BLOCKED — do NOT retry the same tool)"
    : ""

  const stateLines: string[] = []

  // Check new TaskGraph first (v3)
  const graph = stateManager.getTaskGraph()
  const activeWP = graph.workPlans.find(wp => wp.status === "active")
  if (activeWP) {
    const activeNode = activeWP.tasks.find(t => t.status === "active")
    if (activeNode) {
      stateLines.push(`CURRENT STATE: WorkPlan "${activeWP.name}" has active task "${activeNode.name}" but it hasn't been started in this session.`)
      stateLines.push(`USE INSTEAD: Call "govern_task" with action "start" and task_id="${activeNode.id}" to activate it, then retry your ${tool}.`)
    } else {
      const plannedNode = activeWP.tasks.find(t => t.status === "planned")
      stateLines.push(`CURRENT STATE: WorkPlan "${activeWP.name}" is active but no task is started.`)
      if (plannedNode) {
        stateLines.push(`USE INSTEAD: Call "govern_task" with action "start" and task_id="${plannedNode.id}" to start "${plannedNode.name}", then retry your ${tool}.`)
      } else {
        stateLines.push(`USE INSTEAD: Call "govern_plan" with action "plan_tasks" to add tasks to the plan.`)
      }
    }
  } else {
    // Fall back to old TaskStore check
    const store = stateManager.getTaskStore()
    const activeEpic = store.activeEpicId
      ? store.epics.find(e => e.id === store.activeEpicId)
      : null

    if (activeEpic) {
      const activeTask = activeEpic.tasks.find(t => t.status === "active")
      if (activeTask) {
        stateLines.push(`CURRENT STATE: Epic "${activeEpic.name}" is active with task "${activeTask.name}" but it hasn't been started in this session.`)
        stateLines.push(`USE INSTEAD: Call "govern_task" with action "start" and task_id="${activeTask.id}" to activate it, then retry your ${tool}.`)
      } else {
        stateLines.push(`CURRENT STATE: Epic "${activeEpic.name}" is active, but no task is marked active.`)
        stateLines.push(`USE INSTEAD: Call "govern_task" with action "start" and a task_id, OR call "govern_plan" to create a new plan.`)
      }
    } else {
      stateLines.push(`CURRENT STATE: No active plan or task.`)
      stateLines.push(`USE INSTEAD: Call "govern_task" with action "quick_start" and name="your task" to create a plan+task and start immediately. Or use the full ceremony: govern_plan create → plan_tasks → govern_task start.`)
    }
  }

  return [
    `GOVERNANCE BLOCK: ${tool} denied${retryNote}`,
    "",
    `WHAT: You tried to use "${tool}" but no active task exists in this session.`,
    ...stateLines,
    `EVIDENCE: Session has no active task. All file modifications require an active task for governance tracking.`,
  ].join("\n")
}

/**
 * Creates the tool.execute.before hook.
 * 
 * Hook factory pattern (DO #5): captured logger, returns async hook function.
 */
export function createToolGateBefore(log: Logger) {
  return async (
    input: { tool: string; sessionID: string; callID: string },
    _output: { args: unknown },
  ): Promise<void> => {
    try {
      const { tool, sessionID } = input

      // ─── Agent-scoped plugin tool gating ─────────────────────
      if (PLUGIN_TOOLS.has(tool)) {
        const agent = stateManager.getCapturedAgent(sessionID)
        if (agent) {
          const rules = getAgentRules(agent)
          if (rules) {
            // Check tool-level block
            if (rules.blockedTools.has(tool)) {
              const message = buildAgentScopeBlock(agent, tool)
              log.warn(`AGENT SCOPE BLOCK: ${tool} denied for ${agent}`, { sessionID })
              throw new Error(message)
            }

            // Check action-level block (any tool with action parameter)
            const toolBlockedActions = rules.blockedActions[tool]
            if (toolBlockedActions && toolBlockedActions.size > 0) {
              const args = _output.args as Record<string, unknown> | undefined
              const action = args?.action as string | undefined
              if (action && toolBlockedActions.has(action)) {
                const message = buildAgentScopeBlock(agent, tool, action)
                log.warn(`AGENT SCOPE BLOCK: ${tool} action=${action} denied for ${agent}`, { sessionID })
                throw new Error(message)
              }
            }
          }
        }
      }

      // ─── Temporal gate enforcement (defense-in-depth) ──────
      // govern_task action=start is validated here BEFORE the tool runs.
      // The govern_task tool itself also validates, but hook enforcement
      // catches the call earlier and provides consistent GOVERNANCE BLOCK format.
      if (tool === "govern_task") {
        const args = _output.args as Record<string, unknown> | undefined
        if (args?.action === "start" && typeof args?.target_id === "string") {
          const graph = stateManager.getTaskGraph()
          const node = findTaskNode(graph, args.target_id)
          if (node) {
            const check = validateTaskStart(graph, node)
            if (!check.allowed) {
              const message = [
                `GOVERNANCE BLOCK: govern_task action=start denied`,
                "",
                `WHAT: Cannot start task "${node.name}" — ${check.reason}`,
                `WHY: Temporal gates and dependencies are enforced at the hook level.`,
                check.blockedBy
                  ? `BLOCKED BY: "${check.blockedBy.name}" [${check.blockedBy.status}] (${check.blockedBy.id})`
                  : "",
                `USE INSTEAD: Complete the blocking dependency first, or ask the coordinator to adjust the plan.`,
                `EVIDENCE: TaskNode ${node.id} dependsOn=${JSON.stringify(node.dependsOn)}`,
              ].filter(Boolean).join("\n")
              log.warn(`TEMPORAL GATE BLOCK: ${node.name}`, { sessionID })
              throw new Error(message)
            }
          }
        }
      }

      // ─── Per-TaskNode allowedTools enforcement ─────────────
      // When the active TaskNode has a non-empty allowedTools list,
      // only those tools are permitted during this task.
      // Empty allowedTools = no restriction (backward compatible).
      {
        const activeTask = stateManager.getActiveTask(sessionID)
        if (activeTask) {
          const graph = stateManager.getTaskGraph()
          const activeWP = graph.workPlans.find(wp => wp.status === "active")
          if (activeWP) {
            const activeNode = activeWP.tasks.find(t => t.id === activeTask.id)
            if (activeNode && activeNode.allowedTools.length > 0) {
              if (!activeNode.allowedTools.includes(tool)) {
                const message = [
                  `GOVERNANCE BLOCK: ${tool} denied for current task`,
                  "",
                  `WHAT: Tool "${tool}" is not in the allowedTools for task "${activeNode.name}".`,
                  `WHY: This task scopes your tool access to: [${activeNode.allowedTools.join(", ")}].`,
                  `USE INSTEAD: Use one of the allowed tools, or ask the coordinator to update the task's tool scope.`,
                  `EVIDENCE: TaskNode ${activeNode.id}.allowedTools = [${activeNode.allowedTools.join(", ")}]`,
                ].join("\n")
                log.warn(`ALLOWED TOOLS BLOCK: ${tool} not in [${activeNode.allowedTools.join(",")}]`, { sessionID })
                throw new Error(message)
              }
            }
          }
        }
      }

      // ─── Non-iDumb agent passthrough ──────────────────────────
      // If the captured agent is null (no agent context, e.g. direct user)
      // or is NOT an iDumb-managed agent (e.g. OpenCode's built-in "build"),
      // skip ALL write-gating. iDumb governance only governs iDumb agents.
      {
        const capturedAgent = stateManager.getCapturedAgent(sessionID)
        if (!capturedAgent || !capturedAgent.startsWith("idumb-")) {
          log.debug(`PASSTHROUGH: ${tool} allowed — agent "${capturedAgent ?? "none"}" is not iDumb-managed`, { sessionID })
          return
        }
      }

      // ─── Write tool gate (existing) ──────────────────────────
      // Only gate write tools (breadth: don't over-block, start minimal)
      if (!WRITE_TOOLS.has(tool)) return

      const activeTask = stateManager.getActiveTask(sessionID)

      // If there's an active task, allow the write
      if (activeTask) {
        log.debug(`ALLOW: ${tool} (task: ${activeTask.name})`, { sessionID })
        return
      }

      // ─── Auto-inherit from TaskGraph (v3) ───────────────────
      // If no session-level task but TaskGraph has an active WorkPlan+TaskNode,
      // auto-set it. Takes priority over old TaskStore.
      const graph = stateManager.getTaskGraph()
      const activeWP = graph.workPlans.find(wp => wp.status === "active")
      if (activeWP) {
        const activeNode = activeWP.tasks.find(t => t.status === "active")
        if (activeNode) {
          stateManager.setActiveTask(sessionID, {
            id: activeNode.id,
            name: activeNode.name,
          })
          log.info(`AUTO-INHERIT (graph): ${tool} allowed — inherited TaskNode "${activeNode.name}"`, { sessionID })
          return
        }
      }

      // ─── Auto-inherit from task store (legacy fallback) ─────
      // If no session-level task but the task store has an active
      // epic+task (e.g. bootstrap from init), auto-set it.
      // This is the "smarter task" fix: system handles it, not LLM.
      const store = stateManager.getTaskStore()
      if (store.activeEpicId) {
        const activeEpic = store.epics.find(e => e.id === store.activeEpicId)
        if (activeEpic) {
          const activeStoreTask = activeEpic.tasks.find(t => t.status === "active")
          if (activeStoreTask) {
            // Auto-set session task from store
            stateManager.setActiveTask(sessionID, {
              id: activeStoreTask.id,
              name: activeStoreTask.name,
            })
            log.info(`AUTO-INHERIT: ${tool} allowed — inherited task "${activeStoreTask.name}" from store`, { sessionID })
            return
          }
        }
      }

      // ─── Executor grace mode ─────────────────────────────────────
      // If the executor is addressed directly (not via delegation) and
      // there's no governance context at all (no active WorkPlans),
      // allow the write with a log warning. This prevents the executor
      // from being less capable than an ungoverned agent.
      // BUT: if governance context EXISTS (active plan, just no active
      // task), still block — they should start a task first.
      {
        const capturedAgent = stateManager.getCapturedAgent(sessionID)
        if (capturedAgent === "idumb-executor") {
          const graph = stateManager.getTaskGraph()
          const hasActiveWorkPlan = graph.workPlans.some(wp => wp.status === "active")
          if (!hasActiveWorkPlan) {
            log.info(`GRACE MODE: ${tool} allowed for executor — no governance context`, { sessionID })
            return
          }
          // Has active plan but no active task → fall through to BLOCK
        }
      }

      // Check if this is a retry of a recently blocked tool
      const lastBlock = stateManager.getLastBlock(sessionID)
      const isRetry = lastBlock !== null
        && lastBlock.tool === tool
        && (Date.now() - lastBlock.timestamp) < 30_000

      // Record this block for retry detection
      stateManager.setLastBlock(sessionID, { tool, timestamp: Date.now() })

      const message = buildBlockMessage(tool, isRetry)
      log.warn(`BLOCK: ${tool} (no active task)`, { sessionID, isRetry })

      // Notify via TUI toast (P3: graceful degradation)
      fireToast("warning", `${tool} blocked — no active task`, "Governance Block")

      // Throw to block tool execution — error message appears in chat
      throw new Error(message)
    } catch (error) {
      // Re-throw governance blocks (they're intentional)
      if (error instanceof Error && error.message.startsWith("GOVERNANCE BLOCK:")) {
        throw error
      }
      // P3: Log unexpected errors, don't block tool execution
      log.error(`tool-gate unexpected error: ${error}`)
    }
  }
}

/**
 * Creates the tool.execute.after hook (defense-in-depth fallback + checkpoint recording).
 *
 * Two responsibilities:
 * 1. If tool.execute.before throw didn't block a write tool (edge case),
 *    replaces the output with the governance message.
 * 2. Auto-records checkpoints in the TaskGraph for checkpoint-worthy tools
 *    (write, edit) when there's an active task.
 */
export function createToolGateAfter(log: Logger) {
  return async (
    input: { tool: string; sessionID: string; callID: string },
    output: { title: string; output: string; metadata: unknown },
  ): Promise<void> => {
    const { tool, sessionID } = input

    // ─── Defense-in-depth for write tools ────────────────────────────
    if (WRITE_TOOLS.has(tool)) {
      try {
        // Non-iDumb agent passthrough (must mirror before-hook logic)
        const capturedAgent = stateManager.getCapturedAgent(sessionID)
        if (!capturedAgent || !capturedAgent.startsWith("idumb-")) {
          // Not an iDumb-managed agent — skip defense-in-depth replacement
          // (The before-hook already allowed this write via passthrough)
        } else if (!stateManager.getActiveTask(sessionID)) {
          // ─── Auto-inherit from TaskGraph (v3) ──────────────────────
          const graph = stateManager.getTaskGraph()
          const activeWP = graph.workPlans.find(wp => wp.status === "active")
          if (activeWP) {
            const activeNode = activeWP.tasks.find(t => t.status === "active")
            if (activeNode) {
              stateManager.setActiveTask(sessionID, {
                id: activeNode.id,
                name: activeNode.name,
              })
              log.info(`AUTO-INHERIT (after/graph): inherited TaskNode "${activeNode.name}"`, { sessionID })
              // Fall through to checkpoint recording below
            }
          }

          // ─── Auto-inherit from task store (mirror before-hook logic) ──
          if (!stateManager.getActiveTask(sessionID)) {
            const store = stateManager.getTaskStore()
            if (store.activeEpicId) {
              const activeEpic = store.epics.find(e => e.id === store.activeEpicId)
              if (activeEpic) {
                const activeStoreTask = activeEpic.tasks.find(t => t.status === "active")
                if (activeStoreTask) {
                  stateManager.setActiveTask(sessionID, {
                    id: activeStoreTask.id,
                    name: activeStoreTask.name,
                  })
                  log.info(`AUTO-INHERIT (after): inherited task "${activeStoreTask.name}" from store`, { sessionID })
                  // Fall through to checkpoint recording below
                }
              }
            }
          }

          // If still no active task after auto-inherit attempts,
          // defense in depth: replace output with governance message.
          if (!stateManager.getActiveTask(sessionID)) {
            const message = buildBlockMessage(tool, true)
            output.output = message
            output.title = `GOVERNANCE BLOCK: ${tool} denied`
            log.warn(`FALLBACK BLOCK: ${tool} after-hook replacing output`, { sessionID })
            return // Don't record checkpoint for blocked tools
          }
        }
      } catch (error) {
        // P3: Never crash in after-hook
        log.error(`tool-gate after unexpected error: ${error}`)
      }
    }

    // ─── Checkpoint auto-recording ──────────────────────────────────
    // When a tool call succeeds AND there's an active task AND the tool
    // is checkpoint-worthy, auto-record a Checkpoint in the TaskGraph.
    try {
      const activeTaskForCheckpoint = stateManager.getActiveTask(sessionID)
      if (activeTaskForCheckpoint) {
        // After-hook output shape: { title, output, metadata }
        // For write/edit: always checkpoint (args not needed for filtering).
        // For govern_shell: parse command from output and check worthiness.
        // For bash: we'd need the command string from args, which isn't
        // available in the after-hook output. Skip bash checkpointing
        // until we can validate the runtime metadata shape (Phase 1b).
        const toolArgs: Record<string, unknown> | undefined = undefined
        let isCheckpointWorthy = shouldCreateCheckpoint(tool, toolArgs)

        // govern_shell: extract command from first line "[category] command"
        if (tool === "govern_shell" && !isCheckpointWorthy) {
          const firstLine = output.output?.split("\n")[0] ?? ""
          const commandMatch = firstLine.match(/^\[.+?\]\s+(.+)$/)
          if (commandMatch && isBashCheckpointWorthy(commandMatch[1])) {
            isCheckpointWorthy = true
          }
        }

        if (isCheckpointWorthy) {
          const graph = stateManager.getTaskGraph()
          const activeWP = graph.workPlans.find(wp => wp.status === "active")
          if (activeWP) {
            const activeNode = activeWP.tasks.find(t => t.status === "active")
            if (activeNode) {
              const summary = output.title || `${tool} operation`
              const filesModified: string[] = []
              // Extract file paths from metadata if available
              const meta = output.metadata as Record<string, unknown> | undefined
              if (meta) {
                if (typeof meta.file_path === "string") filesModified.push(meta.file_path)
                if (typeof meta.path === "string") filesModified.push(meta.path)
              }

              const cp = createCheckpoint(activeNode.id, tool, summary, filesModified)
              activeNode.checkpoints.push(cp)
              activeNode.artifacts = [...new Set([...activeNode.artifacts, ...filesModified])]
              activeNode.modifiedAt = Date.now()
              stateManager.saveTaskGraph(graph)
              log.debug(`CHECKPOINT: ${tool} → "${summary}" (${activeNode.checkpoints.length} total)`, { sessionID })
            }
          }
        }
      }
    } catch (cpError) {
      // P3: Never crash for checkpoint recording failure
      log.error(`tool-gate checkpoint recording error: ${cpError}`)
    }
  }
}
