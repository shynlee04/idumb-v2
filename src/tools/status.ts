/**
 * idumb_status — Read-only governance state overview.
 * 
 * Responsibility: Show current task, anchor summary, governance state.
 * Useful for agent introspection ("What am I working on?").
 * 
 * P7: Single-purpose read-only tool
 * DON'T #11: Tool must be selected NATURALLY based on description alone
 */

import { tool } from "@opencode-ai/plugin/tool"
import { getActiveTask } from "../hooks/index.js"
import { getAnchors } from "../hooks/compaction.js"
import { isStale, stalenessHours } from "../schemas/index.js"

export const idumb_status = tool({
  description: "Show current iDumb governance state: active task, anchor summary, and governance rules. Use this to check what you're working on and what decisions are active.",
  args: {},
  async execute(_args, context) {
    const { sessionID } = context
    const task = getActiveTask(sessionID)
    const anchors = getAnchors(sessionID)
    const critical = anchors.filter(a => a.priority === "critical")
    const stale = anchors.filter(a => isStale(a))
    const fresh = anchors.filter(a => !isStale(a))

    const lines: string[] = []
    lines.push("=== iDumb Governance Status ===")
    lines.push("")

    // Active task
    if (task) {
      lines.push(`ACTIVE TASK: ${task.name} (ID: ${task.id})`)
    } else {
      lines.push("ACTIVE TASK: None — create one with idumb_task before writing files")
    }
    lines.push("")

    // Anchor summary
    lines.push(`ANCHORS: ${anchors.length} total (${fresh.length} fresh, ${stale.length} stale)`)
    if (critical.length > 0) {
      lines.push(`CRITICAL DECISIONS (${critical.length}):`)
      for (const a of critical) {
        const staleTag = isStale(a) ? ` [STALE: ${stalenessHours(a).toFixed(1)}h]` : ""
        lines.push(`  - [${a.type}] ${a.content}${staleTag}`)
      }
    }
    lines.push("")

    // Governance rules reminder
    lines.push("RULES:")
    lines.push("  - File writes/edits blocked without active task")
    lines.push("  - Critical decisions must be updated via idumb_anchor before overriding")
    lines.push("  - Stale anchors (>48h) are deprioritized in compaction")

    return lines.join("\n")
  },
})
