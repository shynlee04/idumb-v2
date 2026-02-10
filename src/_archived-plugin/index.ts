/**
 * iDumb v2 — Intelligent Delegation Using Managed Boundaries
 *
 * Task tracking substrate for agentic CLIs.
 * Lifecycle verb tools agents WANT to use. No blocking.
 *
 * CRITICAL: NO console.log anywhere — breaks TUI rendering.
 */

import type { Plugin } from "@opencode-ai/plugin"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { createRequire } from "node:module"
import { createLogger } from "./lib/index.js"
import { setClient } from "./lib/sdk-client.js"
import { stateManager } from "./lib/persistence.js"
import { createCompactionHook, createSystemHook, createMessageTransformHook } from "./hooks/index.js"
import {
  // Phase 9: lifecycle verb tools
  tasks_start, tasks_done, tasks_check, tasks_add, tasks_fail,
  // Context & bootstrap tools
  idumb_anchor, idumb_init,
} from "./tools/index.js"

const _require = createRequire(import.meta.url)
const _pkg = _require("../package.json") as { version: string }
const VERSION = _pkg.version

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
const idumb: Plugin = async ({ directory, client }) => {
  // ─── Init guard: skip if not initialized ────────────────────────
  const idumbDir = join(directory, ".idumb")
  if (!existsSync(idumbDir)) {
    return {}
  }

  // Store SDK client for shared access by hooks and tools
  setClient(client)

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
     * Compaction hook — injects top anchors + active task into
     * post-compaction context via output.context.push().
     * Budget-capped ≤500 tokens (Pitfall 7).
     */
    "experimental.session.compacting": async (input, output) => {
      verifyLog.info("HOOK FIRED: experimental.session.compacting", { sessionID: input.sessionID })
      await compactionHook(input, output)
    },

    /**
     * System prompt — config-aware context injection.
     * Injects active task + critical anchors + project awareness.
     * Budget: ≤250 tokens. ADD, not REPLACE.
     */
    "experimental.chat.system.transform": async (input, output) => {
      verifyLog.info("HOOK FIRED: experimental.chat.system.transform", { inputKeys: Object.keys(input) })
      await systemHook(input, output)
    },

    /**
     * Message transform — DCP-pattern context pruning.
     * Truncates stale tool outputs to save tokens and delay compaction.
     * Keeps last 10 tool results intact, truncates older ones.
     */
    "experimental.chat.messages.transform": async (input, output) => {
      verifyLog.info("HOOK FIRED: experimental.chat.messages.transform", { inputKeys: Object.keys(input) })
      await messageTransformHook(input, output)
    },

    /**
     * Agent identity capture.
     * Fires on every chat turn — captures the agent name from input.agent.
     * Used for: auto-assignee on tasks, delegation chain tracking.
     */
    "chat.params": async (input, _output) => {
      try {
        const { sessionID, agent } = input
        verifyLog.info("HOOK FIRED: chat.params", { sessionID, agent })

        if (agent) {
          // OpenCode SDK passes agent as full object at runtime despite string type.
          // Normalize to string name to prevent object propagation into TaskNodes.
          const agentName: string =
            typeof agent === "object" && agent !== null
              ? ((agent as Record<string, unknown>).name as string) ?? String(agent)
              : String(agent)
          stateManager.setCapturedAgent(sessionID, agentName)
          log.info(`Agent captured: ${agentName}`, { sessionID })

          // Auto-assign agent to active task if not already assigned
          const activeTask = stateManager.getSmartActiveTask()
          if (activeTask && !activeTask.assignee) {
            activeTask.assignee = agentName
            const store = stateManager.getTaskStore()
            stateManager.setTaskStore(store) // trigger save
            log.info(`Auto-assigned ${agentName} to task "${activeTask.name}"`, { sessionID })
          }

          // Auto-assign agent to active TaskNode in TaskGraph
          const graph = stateManager.getTaskGraph()
          const activeWP = graph.workPlans.find(wp => wp.status === "active")
          if (activeWP) {
            const activeNode = activeWP.tasks.find(t => t.status === "active")
            if (activeNode && !activeNode.assignedTo) {
              activeNode.assignedTo = agentName
              stateManager.saveTaskGraph(graph)
              log.info(`Auto-assigned ${agentName} to TaskNode "${activeNode.name}"`, { sessionID })
            }
          }
        }
      } catch (err) {
        // P3: Never crash on hook
        log.error(`chat.params hook error: ${err}`)
      }
    },

    /**
     * Lifecycle verb tools + context/bootstrap tools.
     * Lifecycle: tasks_start, tasks_done, tasks_check, tasks_add, tasks_fail
     * Context: idumb_anchor (anchors survive compaction)
     * Bootstrap: idumb_init (project setup)
     * Agent access scoped via template-level permissions (agent markdown profiles).
     */
    tool: {
      // Phase 9: lifecycle verb tools
      tasks_start,
      tasks_done,
      tasks_check,
      tasks_add,
      tasks_fail,
      // Context & bootstrap tools
      idumb_anchor,
      idumb_init,
    },
  }
}

export default idumb
