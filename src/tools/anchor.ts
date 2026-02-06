/**
 * idumb_anchor — Create and list context anchors that survive compaction.
 * 
 * Responsibility: CRUD for anchors that the compaction hook preserves.
 * 
 * P7: Single-purpose tool — just anchor management
 * DON'T #11: Tool must be selected NATURALLY based on description alone
 */

import { tool } from "@opencode-ai/plugin/tool"
import { createAnchor, isStale, stalenessHours } from "../schemas/index.js"
import type { AnchorType, AnchorPriority } from "../schemas/index.js"
import { addAnchor, getAnchors } from "../hooks/compaction.js"

const VALID_TYPES = ["decision", "context", "checkpoint", "error", "attention"] as const
const VALID_PRIORITIES = ["critical", "high", "medium", "low"] as const

export const idumb_anchor = tool({
  description: "Manage context anchors that survive session compaction. Use 'add' to record important decisions or context that must persist across compaction. Use 'list' to see all active anchors. Anchors are automatically scored by priority and freshness — stale anchors (>48h) are deprioritized.",
  args: {
    action: tool.schema.enum(["add", "list"]).describe(
      "Action: 'add' to create an anchor, 'list' to show all anchors"
    ),
    type: tool.schema.enum(VALID_TYPES).optional().describe(
      "Anchor type (for 'add'): decision, context, checkpoint, error, or attention"
    ),
    priority: tool.schema.enum(VALID_PRIORITIES).optional().describe(
      "Priority (for 'add'): critical, high, medium, or low"
    ),
    content: tool.schema.string().optional().describe(
      "Anchor content (for 'add'): the decision, context, or information to preserve"
    ),
  },
  async execute(args, context) {
    const { action } = args
    const { sessionID } = context

    switch (action) {
      case "add": {
        const type = args.type as AnchorType | undefined
        const priority = args.priority as AnchorPriority | undefined
        const content = args.content

        if (!type || !priority || !content) {
          return "ERROR: 'add' requires type, priority, and content. Example: action='add', type='decision', priority='high', content='Use PostgreSQL for vector storage'."
        }

        if (content.length > 2000) {
          return "ERROR: Anchor content must be ≤2000 characters. Summarize the key information."
        }

        const anchor = createAnchor(type, priority, content)
        addAnchor(sessionID, anchor)

        return [
          `Anchor created.`,
          `  ID: ${anchor.id}`,
          `  Type: ${type}`,
          `  Priority: ${priority}`,
          `  Content: ${content}`,
          ``,
          `This anchor will be preserved across compaction events.`,
        ].join("\n")
      }

      case "list": {
        const anchors = getAnchors(sessionID)

        if (anchors.length === 0) {
          return "No anchors for this session. Use action='add' to create one."
        }

        const lines = [`Active anchors (${anchors.length}):\n`]
        for (const a of anchors) {
          const stale = isStale(a) ? ` [STALE: ${stalenessHours(a).toFixed(1)}h]` : ""
          lines.push(`- [${a.priority.toUpperCase()}/${a.type}] ${a.content}${stale}`)
          lines.push(`  ID: ${a.id}`)
        }
        return lines.join("\n")
      }

      default:
        return `Unknown action: ${action}. Valid actions: add, list.`
    }
  },
})
