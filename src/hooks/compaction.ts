/**
 * Compaction Hook — preserves critical context across session compaction.
 * 
 * Injects top anchors + active task into compaction context via
 * output.context.push() (DO #7: the ONLY way to persist across compaction).
 * 
 * P3: try/catch — never break compaction
 * P5: In-memory anchor store — no file I/O in hot path
 * Pitfall 7: Budget-capped injection ≤500 tokens (~2000 chars)
 */

import type { Anchor } from "../schemas/index.js"
import { selectAnchors } from "../schemas/index.js"
import { getActiveTask } from "./tool-gate.js"
import type { Logger } from "../lib/index.js"
import { stateManager } from "../lib/persistence.js"

/** Budget in characters (~500 tokens at ~4 chars/token) */
const INJECTION_BUDGET_CHARS = 2000

/** Add an anchor to a session's store — delegates to StateManager */
export function addAnchor(sessionID: string, anchor: Anchor): void {
  stateManager.addAnchor(sessionID, anchor)
}

/** Get all anchors for a session — delegates to StateManager */
export function getAnchors(sessionID: string): Anchor[] {
  return stateManager.getAnchors(sessionID)
}

/** Format selected anchors into a compaction context string */
function formatCompactionContext(
  anchors: Anchor[],
  activeTask: { id: string; name: string } | null,
): string {
  const lines: string[] = []

  lines.push("=== iDumb Governance Context (post-compaction) ===")
  lines.push("")

  // Active task first (primacy effect — LLM attends to first content)
  if (activeTask) {
    lines.push(`## CURRENT TASK: ${activeTask.name}`)
    lines.push(`Task ID: ${activeTask.id}`)
    lines.push("")
  } else {
    lines.push("## NO ACTIVE TASK — create one with idumb_task before writing files")
    lines.push("")
  }

  // Anchors by priority
  if (anchors.length > 0) {
    lines.push(`## ACTIVE ANCHORS (${anchors.length}):`)
    for (const a of anchors) {
      lines.push(`- [${a.priority.toUpperCase()}/${a.type}] ${a.content}`)
    }
  } else {
    lines.push("## No active anchors.")
  }

  lines.push("")
  lines.push("=== End iDumb Context ===")

  return lines.join("\n")
}

/**
 * Creates the compaction hook.
 * 
 * Hook factory pattern (DO #5): captured logger.
 */
export function createCompactionHook(log: Logger) {
  return async (
    input: { sessionID: string },
    output: { context: string[]; prompt?: string },
  ): Promise<void> => {
    try {
      const { sessionID } = input

      // Get anchors and select within budget
      const allAnchors = getAnchors(sessionID)
      const selected = selectAnchors(allAnchors, INJECTION_BUDGET_CHARS)

      // Get active task
      const activeTask = getActiveTask(sessionID)

      // Format and inject
      const context = formatCompactionContext(selected, activeTask)
      output.context.push(context)

      log.info(`Compaction: injected ${selected.length}/${allAnchors.length} anchors`, {
        sessionID,
        totalAnchors: allAnchors.length,
        selectedAnchors: selected.length,
        contextLength: context.length,
        hasActiveTask: !!activeTask,
      })
    } catch (error) {
      // P3: Never break compaction — this is critical
      log.error(`Compaction hook error: ${error}`)
    }
  }
}
