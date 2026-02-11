/**
 * ReasoningCollapse — collapsed-by-default reasoning section.
 *
 * Uses native HTML <details> for accessible collapse behavior (no JS state).
 * Shows "Thinking..." label with optional duration from ReasoningPart.time.
 *
 * Per user decision: reasoning collapsed by default.
 */

import type { ReasoningPart } from "@/shared/engine-types"

interface ReasoningCollapseProps {
  part: ReasoningPart
}

function formatThinkingDuration(time: { start: number; end?: number }): string {
  const elapsed = ((time.end ?? Date.now()) - time.start) / 1000
  if (elapsed < 0.1) return ""
  if (elapsed < 60) return ` (${elapsed.toFixed(1)}s)`
  return ` (${Math.floor(elapsed / 60)}m ${Math.round(elapsed % 60)}s)`
}

export function ReasoningCollapse({ part }: ReasoningCollapseProps) {
  const duration = part.time ? formatThinkingDuration(part.time) : ""

  return (
    <details className="my-2 group">
      <summary className="text-xs text-muted-foreground cursor-pointer select-none flex items-center gap-1 hover:text-foreground transition-colors">
        <span className="text-muted-foreground/60 group-open:rotate-90 transition-transform inline-block">
          &#9654;
        </span>
        <span>Thinking...{duration}</span>
      </summary>
      <div className="mt-1.5 pl-4 text-sm text-muted-foreground italic whitespace-pre-wrap border-l-2 border-border ml-1">
        {part.text}
      </div>
    </details>
  )
}
