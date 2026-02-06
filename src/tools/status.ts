/**
 * idumb_status — Read-only governance state overview with task hierarchy.
 *
 * Responsibility: Show epic→task→subtask hierarchy, anchor summary, governance state.
 * Useful for agent introspection ("What am I working on?").
 *
 * P7: Single-purpose read-only tool
 * DON'T #11: Tool must be selected NATURALLY based on description alone
 */

import { tool } from "@opencode-ai/plugin/tool"
import { getActiveTask } from "../hooks/index.js"
import { getAnchors } from "../hooks/compaction.js"
import { isStale, stalenessHours } from "../schemas/anchor.js"
import { stateManager } from "../lib/persistence.js"
import {
  formatTaskTree, getActiveChain, detectChainBreaks,
} from "../schemas/task.js"

export const idumb_status = tool({
  description: "Show current iDumb governance state: epic/task hierarchy, active task, anchor summary, chain warnings, and governance rules. Use this to check what you're working on and what decisions are active.",
  args: {},
  async execute(_args, context) {
    const { sessionID } = context
    const store = stateManager.getTaskStore()
    const chain = getActiveChain(store)
    const sessionTask = getActiveTask(sessionID)
    const anchors = getAnchors(sessionID)
    const critical = anchors.filter(a => a.priority === "critical")
    const stale = anchors.filter(a => isStale(a))
    const fresh = anchors.filter(a => !isStale(a))

    const lines: string[] = []
    lines.push("=== iDumb Governance Status ===")
    lines.push("")

    // ── Task Hierarchy ──
    lines.push(formatTaskTree(store))
    lines.push("")

    // ── Active Session Task (bridged from old API) ──
    if (sessionTask) {
      lines.push(`SESSION TASK: ${sessionTask.name} (ID: ${sessionTask.id})`)
    } else if (chain.task) {
      lines.push(`⚠️ Smart task "${chain.task.name}" is active but NOT started in this session.`)
      lines.push(`   Start it: idumb_task action=start task_id=${chain.task.id}`)
    } else {
      lines.push("SESSION TASK: None — create an epic and start a task before writing files")
    }
    lines.push("")

    // ── Chain Warnings ──
    const warnings = detectChainBreaks(store)
    if (warnings.length > 0) {
      lines.push(`⛓ CHAIN WARNINGS (${warnings.length}):`)
      for (const w of warnings) {
        lines.push(`  - ${w.message}`)
      }
      lines.push("")
    }

    // ── Anchor summary ──
    lines.push(`ANCHORS: ${anchors.length} total (${fresh.length} fresh, ${stale.length} stale)`)
    if (critical.length > 0) {
      lines.push(`CRITICAL DECISIONS (${critical.length}):`)
      for (const a of critical) {
        const staleTag = isStale(a) ? ` [STALE: ${stalenessHours(a).toFixed(1)}h]` : ""
        lines.push(`  - [${a.type}] ${a.content}${staleTag}`)
      }
    }
    lines.push("")

    // ── Governance rules reminder ──
    lines.push("RULES:")
    lines.push("  - File writes/edits blocked without active task (must use idumb_task action=start)")
    lines.push("  - Task completion requires evidence (proof of work)")
    lines.push("  - Epic completion requires all tasks complete/deferred")
    lines.push("  - Critical decisions must be updated via idumb_anchor before overriding")
    lines.push("  - Stale anchors (>48h) are deprioritized in compaction")

    return lines.join("\n")
  },
})
