/**
 * M2: Context Pruning via message transform (DCP pattern).
 * 
 * Truncates stale tool outputs to reduce token usage and delay compaction.
 * ONLY modifies existing part content — never adds parts or messages.
 * 
 * SDK types (defensive):
 *   ToolPart: { type: "tool", state: { status, output, time: { start } } }
 *   Messages: { info: Message, parts: Part[] }[]
 * 
 * ⚠️ input is {} (no sessionID) — works purely from message content.
 * 
 * P3: Graceful degradation — never break message delivery
 * P6: SDK format defensive — check every field before access
 */

import type { Logger } from "../lib/index.js"

/** Number of most recent tool outputs to keep intact. */
const KEEP_RECENT = 10

/** Max chars for truncated tool outputs. */
const TRUNCATE_TO = 150

/** Tools whose output should never be pruned (governance tools). */
const EXEMPT_TOOLS = new Set([
  "govern_plan",
  "govern_task",
  "govern_delegate",
  "govern_shell",
  "idumb_anchor",
  "idumb_init",
])

interface ToolRef {
  msgIdx: number
  partIdx: number
  tool: string
  outputLen: number
  timestamp: number
}

/**
 * Creates the message transform hook.
 * Hook factory pattern (DO #5).
 */
export function createMessageTransformHook(log: Logger) {
  let totalCharsSaved = 0

  return async (
    _input: Record<string, unknown>,
    output: { messages: Array<{ info: unknown; parts: Array<Record<string, unknown>> }> },
  ): Promise<void> => {
    try {
      const messages = output.messages
      if (!Array.isArray(messages)) return

      // Collect all completed tool parts with output
      const toolRefs: ToolRef[] = []

      for (let m = 0; m < messages.length; m++) {
        const msg = messages[m]
        if (!msg?.parts || !Array.isArray(msg.parts)) continue

        for (let p = 0; p < msg.parts.length; p++) {
          const part = msg.parts[p] as Record<string, unknown>
          if (part?.type !== "tool") continue

          const state = part.state as Record<string, unknown> | undefined
          if (!state || state.status !== "completed") continue

          const output = state.output
          if (typeof output !== "string" || output.length === 0) continue

          const tool = (part.tool as string) || "unknown"
          if (EXEMPT_TOOLS.has(tool)) continue

          const time = state.time as Record<string, unknown> | undefined
          const timestamp = typeof time?.start === "number" ? time.start : 0

          toolRefs.push({
            msgIdx: m,
            partIdx: p,
            tool,
            outputLen: output.length,
            timestamp,
          })
        }
      }

      if (toolRefs.length <= KEEP_RECENT) return // Nothing to prune

      // Sort by timestamp ascending (oldest first)
      toolRefs.sort((a, b) => a.timestamp - b.timestamp)

      // Truncate older tool outputs (keep last KEEP_RECENT)
      const toPrune = toolRefs.slice(0, -KEEP_RECENT)
      let charsSaved = 0

      for (const ref of toPrune) {
        const part = messages[ref.msgIdx].parts[ref.partIdx] as Record<string, unknown>
        const state = part.state as Record<string, unknown>
        const original = state.output as string

        if (original.length <= TRUNCATE_TO) continue

        state.output = original.slice(0, TRUNCATE_TO) + `\n[...${ref.tool} output truncated — ${original.length} chars → ${TRUNCATE_TO}]`
        charsSaved += original.length - (state.output as string).length
      }

      if (charsSaved > 0) {
        totalCharsSaved += charsSaved
        log.debug("Context pruned", {
          total: toolRefs.length,
          pruned: toPrune.length,
          charsSaved,
          totalSaved: totalCharsSaved,
        })
      }
    } catch (error) {
      // P3: Never break message delivery
      log.error(`Message transform error: ${error}`)
    }
  }
}
