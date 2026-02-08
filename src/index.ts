/**
 * iDumb v2 — Intelligent Delegation Using Managed Boundaries
 * 
 * Governance substrate for agentic CLIs.
 * 
 * CRITICAL: NO console.log anywhere — breaks TUI rendering.
 * 
 * μ1: Stop hook + task tool — blocks writes without active task.
 */

import type { Plugin } from "@opencode-ai/plugin"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { createLogger } from "./lib/index.js"
import { stateManager } from "./lib/persistence.js"
import { createToolGateBefore, createToolGateAfter, createCompactionHook, createSystemHook, createMessageTransformHook } from "./hooks/index.js"
import {
  // v3 governance tools
  govern_plan, govern_task, govern_delegate, govern_shell,
  // Retained tools
  idumb_anchor, idumb_init,
  // Legacy tools (backward compat — removal pending)
  idumb_task, idumb_scan, idumb_codemap,
  idumb_read, idumb_write, idumb_bash, idumb_webfetch,
} from "./tools/index.js"

const VERSION = "2.2.0"

/**
 * Plugin factory following hook factory pattern (P5: captured state).
 *
 * P2: Platform native — uses directory from PluginInput
 * P3: Graceful degradation — try/catch on init
 * P7: Composable — hooks and tools are isolated modules
 *
 * GUARD: If .idumb/ doesn't exist, the plugin was not initialized.
 * Return empty hooks to avoid zombie directory creation, logger
 * pollution, and TUI breakage. The user must run `idumb-v2 init` first.
 */
const idumb: Plugin = async ({ directory }) => {
  // ─── Init guard: skip governance if not initialized ────────────────
  const idumbDir = join(directory, ".idumb")
  if (!existsSync(idumbDir)) {
    // Not initialized — return empty hooks object.
    // This prevents: zombie .opencode/ creation via logger,
    // hooks firing on an uninitialized project, and TUI breakage
    // when agents are missing from .opencode/agents/.
    return {}
  }

  const log = createLogger(directory, "idumb-core")
  const verifyLog = createLogger(directory, "hook-verification", "debug")

  log.info(`iDumb v${VERSION} loaded`, { directory })

  // Initialize StateManager — loads persisted state from disk
  try {
    await stateManager.init(directory, log)
    log.info("StateManager initialized", {
      degraded: stateManager.isDegraded(),
    })
  } catch (err) {
    log.error(`StateManager init failed: ${err}`, { directory })
    // P3: Continue with in-memory state
  }

  // Create hook instances with captured logger (DO #5: hook factory pattern)
  const toolGateBefore = createToolGateBefore(log)
  const toolGateAfter = createToolGateAfter(log)
  const compactionHook = createCompactionHook(log)
  const systemHook = createSystemHook(log, directory)
  const messageTransformHook = createMessageTransformHook(log)

  return {
    /**
     * Session lifecycle events.
     */
    event: async ({ event }) => {
      try {
        log.info(`event: ${event.type}`)
      } catch {
        // P3: Never crash on event handling
      }
    },

    /**
     * μ1: Stop hook — blocks write/edit tools without active task.
     * Throws Error with BLOCK+REDIRECT+EVIDENCE message.
     */
    "tool.execute.before": async (input, output) => {
      verifyLog.debug("HOOK FIRED: tool.execute.before", { tool: input.tool, sessionID: input.sessionID })
      await toolGateBefore(input, output)
    },

    /**
     * μ1: Defense-in-depth fallback.
     * If before-hook throw didn't block, replace output with governance message.
     */
    "tool.execute.after": async (input, output) => {
      verifyLog.debug("HOOK FIRED: tool.execute.after", { tool: input.tool, sessionID: input.sessionID })
      await toolGateAfter(input, output)
    },

    /**
     * μ2: Compaction hook — injects top anchors + active task into
     * post-compaction context via output.context.push().
     * Budget-capped ≤500 tokens (Pitfall 7).
     */
    "experimental.session.compacting": async (input, output) => {
      verifyLog.info("HOOK FIRED: experimental.session.compacting", { sessionID: input.sessionID })
      await compactionHook(input, output)
    },

    /**
     * μ3: System prompt — always-on governance directive.
     * Injects active task + critical anchors + rules.
     * Budget: ≤200 tokens. ADD, not REPLACE.
     */
    "experimental.chat.system.transform": async (input, output) => {
      verifyLog.info("HOOK FIRED: experimental.chat.system.transform", { inputKeys: Object.keys(input) })
      await systemHook(input, output)
    },

    /**
     * M2: Message transform — DCP-pattern context pruning.
     * Truncates stale tool outputs to save tokens and delay compaction.
     * Keeps last 10 tool results intact, truncates older ones.
     */
    "experimental.chat.messages.transform": async (input, output) => {
      verifyLog.info("HOOK FIRED: experimental.chat.messages.transform", { inputKeys: Object.keys(input) })
      await messageTransformHook(input, output)
    },

    /**
     * n3 α2-1: Agent identity capture.
     * Fires on every chat turn — captures the agent name from input.agent.
     * Used for: auto-assignee on tasks, delegation chain tracking.
     */
    "chat.params": async (input, _output) => {
      try {
        const { sessionID, agent } = input
        verifyLog.info("HOOK FIRED: chat.params", { sessionID, agent })

        if (agent) {
          stateManager.setCapturedAgent(sessionID, agent)
          log.info(`Agent captured: ${agent}`, { sessionID })

          // Auto-assign agent to active task if not already assigned
          const activeTask = stateManager.getSmartActiveTask()
          if (activeTask && !activeTask.assignee) {
            activeTask.assignee = agent
            const store = stateManager.getTaskStore()
            stateManager.setTaskStore(store) // trigger save
            log.info(`Auto-assigned ${agent} to task "${activeTask.name}"`, { sessionID })
          }

          // Auto-assign agent to active TaskNode in TaskGraph
          const graph = stateManager.getTaskGraph()
          const activeWP = graph.workPlans.find(wp => wp.status === "active")
          if (activeWP) {
            const activeNode = activeWP.tasks.find(t => t.status === "active")
            if (activeNode && !activeNode.assignedTo) {
              activeNode.assignedTo = agent
              stateManager.saveTaskGraph(graph)
              log.info(`Auto-assigned ${agent} to TaskNode "${activeNode.name}"`, { sessionID })
            }
          }
        }
      } catch (err) {
        // P3: Never crash on hook
        log.error(`chat.params hook error: ${err}`)
      }
    },

    /**
     * v3 governance tools + retained + legacy.
     * v3: govern_plan, govern_task, govern_delegate, govern_shell
     * Retained: idumb_anchor, idumb_init
     * Legacy (removal pending): idumb_task, idumb_scan, idumb_codemap, idumb_read, idumb_write, idumb_bash, idumb_webfetch
     * Agent-scoped access enforced via AGENT_TOOL_RULES in tool-gate.ts.
     */
    tool: {
      // v3 governance tools
      govern_plan,
      govern_task,
      govern_delegate,
      govern_shell,
      // Retained tools
      idumb_anchor,
      idumb_init,
      // Legacy tools (backward compat — removal pending)
      idumb_task,
      idumb_scan,
      idumb_codemap,
      idumb_read,
      idumb_write,
      idumb_bash,
      idumb_webfetch,
    },
  }
}

export default idumb
