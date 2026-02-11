/**
 * StepCluster — groups SDK Parts by step-start/step-finish boundaries
 * into collapsible clusters with count badges, status indicators, and
 * duration timers.
 *
 * Reduces visual noise by grouping related tool operations per AI step.
 * Latest/running step is expanded; completed steps collapse automatically.
 *
 * Uses SDK Part discriminated union narrowing for step-start/step-finish
 * boundary detection. Duration computed from tool time data or Date.now()
 * for running steps.
 */

import { useState } from "react"
import {
  Loader2,
  CheckCircle,
  XCircle,
  ChevronRight,
  ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Part, StepFinishPart, ToolPart } from "@/shared/engine-types"
import { PartRenderer } from "./ChatMessage"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClusteredGroup {
  /** Unique key for React rendering */
  key: string
  /** 'step' for step-bounded groups, 'content' for ungrouped text/file parts */
  type: "step" | "content"
  /** Parts inside this group (excluding step-start/step-finish themselves) */
  parts: Part[]
  /** Step status: running (no step-finish), completed, failed */
  status: "running" | "completed" | "failed"
  /** Number of tool calls in this group */
  toolCount: number
  /** Duration in milliseconds (from tool time data or Date.now()) */
  durationMs: number
  /** StepFinishPart data if completed */
  finish?: {
    reason: string
    cost: number
    tokens: { input: number; output: number }
  }
}

// ---------------------------------------------------------------------------
// Grouping algorithm
// ---------------------------------------------------------------------------

/**
 * Walk through a flat Part[] and produce ClusteredGroup[] by detecting
 * step-start / step-finish boundaries.
 *
 * Parts outside any step are grouped as type="content".
 * Parts between step-start and step-finish are grouped as type="step".
 * An unclosed step (no step-finish yet) has status="running".
 */
export function groupPartsIntoClusters(parts: Part[]): ClusteredGroup[] {
  const groups: ClusteredGroup[] = []
  let contentBuffer: Part[] = []
  let stepParts: Part[] = []
  let inStep = false
  let stepIndex = 0

  function flushContent() {
    if (contentBuffer.length === 0) return
    groups.push({
      key: `content-${groups.length}`,
      type: "content",
      parts: [...contentBuffer],
      status: "completed",
      toolCount: 0,
      durationMs: 0,
    })
    contentBuffer = []
  }

  function finishStep(finishPart?: StepFinishPart) {
    const toolParts = stepParts.filter(
      (p): p is ToolPart => p.type === "tool"
    )
    const toolCount = toolParts.length
    const durationMs = computeDurationFromTools(toolParts, !finishPart)
    const failed =
      finishPart?.reason != null &&
      finishPart.reason.toLowerCase().includes("error")

    const group: ClusteredGroup = {
      key: `step-${stepIndex++}`,
      type: "step",
      parts: [...stepParts],
      status: finishPart ? (failed ? "failed" : "completed") : "running",
      toolCount,
      durationMs,
    }

    if (finishPart) {
      group.finish = {
        reason: finishPart.reason,
        cost: finishPart.cost,
        tokens: {
          input: finishPart.tokens.input,
          output: finishPart.tokens.output,
        },
      }
    }

    groups.push(group)
    stepParts = []
  }

  for (const part of parts) {
    if (part.type === "step-start") {
      // If already in a step without a finish, close it as running
      if (inStep && stepParts.length > 0) {
        finishStep()
      }
      flushContent()
      inStep = true
      continue
    }

    if (part.type === "step-finish") {
      if (inStep) {
        finishStep(part)
        inStep = false
      }
      continue
    }

    // Regular part — route to current context
    if (inStep) {
      stepParts.push(part)
    } else {
      contentBuffer.push(part)
    }
  }

  // Flush remaining
  if (inStep && stepParts.length > 0) {
    finishStep() // unclosed step → running
  }
  flushContent()

  return groups
}

// ---------------------------------------------------------------------------
// Duration helpers
// ---------------------------------------------------------------------------

/**
 * Compute duration from tool time data within a step.
 * - Completed/error tools have time.start and time.end
 * - Running tools have time.start only
 * - Pending tools have no time data
 *
 * For completed steps: earliest start to latest end.
 * For running steps: earliest start to Date.now().
 */
function computeDurationFromTools(
  tools: ToolPart[],
  isRunning: boolean
): number {
  let earliest = Infinity
  let latest = 0

  for (const tool of tools) {
    const s = tool.state
    if (s.status === "pending") continue

    const start = s.time.start
    if (start < earliest) earliest = start

    if (s.status === "completed" || s.status === "error") {
      const end = s.time.end
      if (end > latest) latest = end
    } else if (s.status === "running") {
      const now = Date.now()
      if (now > latest) latest = now
    }
  }

  if (earliest === Infinity) return 0
  if (isRunning) return Date.now() - earliest
  return latest > earliest ? latest - earliest : 0
}

function formatDuration(ms: number): string {
  const seconds = ms / 1000
  if (seconds < 0.1) return "<0.1s"
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const minutes = Math.floor(seconds / 60)
  const remainder = Math.round(seconds % 60)
  return `${minutes}m ${remainder}s`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface StepClusterProps {
  group: ClusteredGroup
  /** Latest/running step starts expanded; older collapsed */
  isLatest: boolean
}

const STATUS_CONFIG = {
  running: {
    icon: Loader2,
    iconClass: "w-4 h-4 animate-spin text-blue-500",
    textClass: "text-blue-500",
    label: (count: number) => `Running ${count} tool${count !== 1 ? "s" : ""}...`,
  },
  completed: {
    icon: CheckCircle,
    iconClass: "w-4 h-4 text-muted-foreground",
    textClass: "text-muted-foreground",
    label: (count: number) => `Completed ${count} tool${count !== 1 ? "s" : ""}`,
  },
  failed: {
    icon: XCircle,
    iconClass: "w-4 h-4 text-destructive",
    textClass: "text-destructive",
    label: (_count: number) => "Failed",
  },
} as const

export function StepCluster({ group, isLatest }: StepClusterProps) {
  const [open, setOpen] = useState(isLatest)
  const config = STATUS_CONFIG[group.status]
  const Icon = config.icon

  return (
    <div className="my-2 rounded-md border border-border bg-muted/10 overflow-hidden">
      {/* Header — always visible, clickable */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/20 transition-colors text-left text-xs"
      >
        {/* Status icon */}
        <Icon className={config.iconClass} />

        {/* Status text */}
        <span className={cn("font-medium", config.textClass)}>
          {config.label(group.toolCount)}
        </span>

        {/* Duration */}
        {group.durationMs > 0 && (
          <span className="text-muted-foreground">
            {formatDuration(group.durationMs)}
          </span>
        )}

        {/* Count badge */}
        {group.toolCount > 0 && (
          <span className="bg-muted rounded-full px-1.5 text-[10px] text-muted-foreground font-mono">
            {group.toolCount}
          </span>
        )}

        {/* Spacer */}
        <span className="flex-1" />

        {/* Chevron */}
        <span className="flex-shrink-0 text-muted-foreground">
          {open ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </span>
      </button>

      {/* Expanded body */}
      <div
        className={cn(
          "transition-all duration-200 overflow-hidden",
          open ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="border-t border-border px-3 py-2 space-y-1">
          {group.parts.map((part, i) => (
            <PartRenderer key={part.id ?? `part-${i}`} part={part} />
          ))}
        </div>
      </div>
    </div>
  )
}
