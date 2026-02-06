/**
 * System Prompt Transform — always-on governance reminder.
 * 
 * Fires on EVERY message (unlike compaction which fires on compact).
 * Injects minimal governance directive into system prompt.
 * 
 * §9 Compatibility: ≤200 tokens (~800 chars). ADD, not REPLACE.
 * Must NOT contradict GSD/BMAD/other plugin instructions.
 * 
 * P3: try/catch — never break message delivery
 * P5: Reads from in-memory state only
 */

import { getActiveTask } from "./tool-gate.js"
import { getAnchors } from "./compaction.js"
import type { Logger } from "../lib/index.js"

/**
 * Creates the system prompt transform hook.
 * Hook factory pattern (DO #5).
 */
export function createSystemHook(log: Logger) {
  return async (
    input: { sessionID?: string; model: unknown },
    output: { system: string[] },
  ): Promise<void> => {
    try {
      const sessionID = input.sessionID
      if (!sessionID) return

      const task = getActiveTask(sessionID)
      const anchors = getAnchors(sessionID)
      const criticalAnchors = anchors.filter(a => a.priority === "critical")

      const lines: string[] = []
      lines.push("<idumb-governance>")

      if (task) {
        lines.push(`CURRENT TASK: ${task.name}`)
      } else {
        lines.push("NO ACTIVE TASK. Create one with idumb_task before writing files.")
      }

      if (criticalAnchors.length > 0) {
        lines.push(`CRITICAL DECISIONS (${criticalAnchors.length}):`)
        for (const a of criticalAnchors.slice(0, 3)) {
          lines.push(`- ${a.content}`)
        }
      }

      lines.push("RULE: Do not write or edit files without an active task.")
      lines.push("RULE: Do not override critical decisions without updating anchors first.")
      lines.push("</idumb-governance>")

      output.system.push(lines.join("\n"))

      log.debug("System prompt injected", {
        sessionID,
        hasTask: !!task,
        criticalAnchors: criticalAnchors.length,
        chars: lines.join("\n").length,
      })
    } catch (error) {
      // P3: Never break message delivery
      log.error(`System hook error: ${error}`)
    }
  }
}
