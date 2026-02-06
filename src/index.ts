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
import { createLogger } from "./lib/index.js"
import { createToolGateBefore, createToolGateAfter, createCompactionHook, createSystemHook, createMessageTransformHook } from "./hooks/index.js"
import { idumb_task, idumb_anchor, idumb_status } from "./tools/index.js"

const VERSION = "2.0.0-clean.4"

/**
 * Plugin factory following hook factory pattern (P5: captured state).
 * 
 * P2: Platform native — uses directory from PluginInput
 * P3: Graceful degradation — try/catch on init
 * P7: Composable — hooks and tools are isolated modules
 */
const idumb: Plugin = async ({ directory }) => {
  const log = createLogger(directory, "idumb-core")

  log.info(`iDumb v${VERSION} loaded`, { directory })

  // Create hook instances with captured logger (DO #5: hook factory pattern)
  const toolGateBefore = createToolGateBefore(log)
  const toolGateAfter = createToolGateAfter(log)
  const compactionHook = createCompactionHook(log)
  const systemHook = createSystemHook(log)
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
      await toolGateBefore(input, output)
    },

    /**
     * μ1: Defense-in-depth fallback.
     * If before-hook throw didn't block, replace output with governance message.
     */
    "tool.execute.after": async (input, output) => {
      await toolGateAfter(input, output)
    },

    /**
     * μ2: Compaction hook — injects top anchors + active task into
     * post-compaction context via output.context.push().
     * Budget-capped ≤500 tokens (Pitfall 7).
     */
    "experimental.session.compacting": async (input, output) => {
      await compactionHook(input, output)
    },

    /**
     * μ3: System prompt — always-on governance directive.
     * Injects active task + critical anchors + rules.
     * Budget: ≤200 tokens. ADD, not REPLACE.
     */
    "experimental.chat.system.transform": async (input, output) => {
      await systemHook(input, output)
    },

    /**
     * M2: Message transform — DCP-pattern context pruning.
     * Truncates stale tool outputs to save tokens and delay compaction.
     * Keeps last 10 tool results intact, truncates older ones.
     */
    "experimental.chat.messages.transform": async (input, output) => {
      await messageTransformHook(input, output)
    },

    /**
     * Custom tools — max 5 for Phase 0 (Pitfall 5: tool menu explosion).
     * μ1: idumb_task — create/complete/status for active task
     * μ2: idumb_anchor — add/list context anchors that survive compaction
     */
    tool: {
      idumb_task,
      idumb_anchor,
      idumb_status,
    },
  }
}

export default idumb
