/**
 * ToolCallAccordion — collapsible accordion for SDK ToolPart.
 *
 * Collapsed (default): tool name + status badge + title + duration + chevron.
 * Expanded (click): input JSON, output/error sections.
 *
 * Uses ToolState discriminated union narrowing for type-safe field access.
 * Per user decision: "accordions, not heavy cards — minimal visual weight when collapsed."
 */

import { useState } from "react"
import { ChevronRight, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ToolPart } from "@/shared/engine-types"

interface ToolCallAccordionProps {
  part: ToolPart
}

const STATUS_STYLES: Record<string, { dot: string; text: string; label: string }> = {
  pending: { dot: "bg-yellow-500", text: "text-yellow-500", label: "Pending" },
  running: { dot: "bg-blue-500 animate-pulse", text: "text-blue-500", label: "Running" },
  completed: { dot: "bg-green-500", text: "text-green-500", label: "Done" },
  error: { dot: "bg-red-500", text: "text-red-500", label: "Error" },
}

function formatDuration(startMs: number, endMs?: number): string {
  const elapsed = ((endMs ?? Date.now()) - startMs) / 1000
  if (elapsed < 0.1) return "<0.1s"
  if (elapsed < 60) return `${elapsed.toFixed(1)}s`
  return `${Math.floor(elapsed / 60)}m ${Math.round(elapsed % 60)}s`
}

export function ToolCallAccordion({ part }: ToolCallAccordionProps) {
  const [expanded, setExpanded] = useState(false)
  const { state } = part
  const style = STATUS_STYLES[state.status] ?? STATUS_STYLES.pending

  // Time is available on running, completed, error — not pending
  const hasTime = state.status !== "pending"
  const timeStart = hasTime ? (state as { time: { start: number } }).time.start : undefined
  const timeEnd =
    state.status === "completed" || state.status === "error"
      ? (state as { time: { start: number; end: number } }).time.end
      : undefined

  // Title is available on running (optional) and completed (required)
  const title =
    state.status === "running" || state.status === "completed"
      ? (state as { title?: string }).title
      : undefined

  return (
    <div className="my-2 rounded-md border border-border bg-muted/20 text-xs font-mono overflow-hidden">
      {/* Header row — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors text-left"
      >
        {/* Status dot */}
        <span className={cn("w-2 h-2 rounded-full flex-shrink-0", style.dot)} />

        {/* Tool name */}
        <span className="font-semibold text-foreground">{part.tool}</span>

        {/* Status label */}
        <span className={cn("text-[10px] uppercase", style.text)}>{style.label}</span>

        {/* Title (truncated) */}
        {title && (
          <span className="text-muted-foreground truncate flex-1 ml-1">
            {title}
          </span>
        )}

        {/* Duration */}
        {hasTime && timeStart != null && (
          <span className="text-muted-foreground ml-auto flex-shrink-0">
            {state.status === "running" ? "Running..." : formatDuration(timeStart, timeEnd)}
          </span>
        )}

        {/* Chevron */}
        <span className="flex-shrink-0 text-muted-foreground ml-1">
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border px-3 py-2 space-y-2">
          {/* Input */}
          <div>
            <span className="text-muted-foreground text-[10px] uppercase block mb-1">Input</span>
            <pre className="text-xs bg-muted/30 rounded p-2 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap">
              {JSON.stringify(state.input, null, 2)}
            </pre>
          </div>

          {/* Output (completed only) */}
          {state.status === "completed" && state.output && (
            <div>
              <span className="text-muted-foreground text-[10px] uppercase block mb-1">Output</span>
              <pre className="text-xs bg-muted/30 rounded p-2 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap">
                {state.output}
              </pre>
            </div>
          )}

          {/* Error (error only) */}
          {state.status === "error" && (
            <div>
              <span className="text-red-400 text-[10px] uppercase block mb-1">Error</span>
              <pre className="text-xs text-red-400 bg-red-950/20 rounded p-2 overflow-x-auto whitespace-pre-wrap">
                {state.error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
