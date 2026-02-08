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
import { createBrainEntry } from "../schemas/brain.js"
import type { BrainEntryType, BrainSource } from "../schemas/brain.js"
import { addAnchor, getAnchors } from "../hooks/compaction.js"
import { stateManager } from "../lib/persistence.js"

const VALID_TYPES = ["decision", "context", "checkpoint", "error", "attention"] as const
const VALID_PRIORITIES = ["critical", "high", "medium", "low"] as const
const VALID_BRAIN_TYPES = ["architecture", "decision", "pattern", "tech-stack", "research", "codebase-fact", "convention", "gotcha"] as const

export const idumb_anchor = tool({
  description: "Manage context anchors and brain knowledge. Use 'add' to record decisions/context that survive compaction. Use 'list' to see anchors. Use 'learn' to add a knowledge entry to the brain index (persisted to knowledge.json). Anchors are scored by priority and freshness — stale ones (>48h) are deprioritized.",
  args: {
    action: tool.schema.enum(["add", "list", "learn"]).describe(
      "Action: 'add' for anchor, 'list' for anchors, 'learn' to add brain knowledge entry"
    ),
    type: tool.schema.enum(VALID_TYPES).optional().describe(
      "Anchor type (for 'add'): decision, context, checkpoint, error, or attention"
    ),
    priority: tool.schema.enum(VALID_PRIORITIES).optional().describe(
      "Priority (for 'add'): critical, high, medium, or low"
    ),
    content: tool.schema.string().optional().describe(
      "Content (for 'add' and 'learn'): the information to preserve"
    ),
    entry_type: tool.schema.enum(VALID_BRAIN_TYPES).optional().describe(
      "Brain entry type (for 'learn'): architecture, decision, pattern, tech-stack, research, codebase-fact, convention, gotcha"
    ),
    title: tool.schema.string().optional().describe(
      "Brain entry title (for 'learn'): short descriptive title"
    ),
    evidence: tool.schema.string().optional().describe(
      "Comma-separated evidence references (for 'learn'): file paths, git hashes, URLs"
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

      case "learn": {
        const entryType = args.entry_type as BrainEntryType | undefined
        const title = args.title
        const content = args.content

        if (!entryType || !title || !content) {
          return "ERROR: 'learn' requires entry_type, title, and content. Example: action='learn', entry_type='decision', title='Database choice', content='Using PostgreSQL for vector storage'."
        }

        const evidenceList = args.evidence ? args.evidence.split(",").map(s => s.trim()) : []
        const entry = createBrainEntry({
          type: entryType,
          title,
          content,
          source: "manual" as BrainSource,
          evidence: evidenceList,
        })

        const brainStore = stateManager.getBrainStore()
        brainStore.entries.push(entry)
        stateManager.saveBrainStore(brainStore)

        return [
          `Brain entry created.`,
          `  ID: ${entry.id}`,
          `  Type: ${entryType}`,
          `  Title: ${title}`,
          `  Confidence: ${entry.confidence}/100`,
          ``,
          `Entry persisted to knowledge.json.`,
        ].join("\n")
      }

      default:
        return `Unknown action: ${action}. Valid actions: add, list, learn.`
    }
  },
})
