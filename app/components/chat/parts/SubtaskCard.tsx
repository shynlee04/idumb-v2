/**
 * SubtaskCard — renders a delegation event (SubtaskPart).
 *
 * Shows which agent was delegated to, why (description), and what
 * they were asked to do (prompt). Expandable to show the full prompt.
 */

import { useState } from "react"
import { ArrowRight, ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { AgentBadge } from "./AgentBadge"

interface SubtaskCardProps {
  agent: string
  description: string
  prompt: string
}

export function SubtaskCard({ agent, description, prompt }: SubtaskCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="my-2 rounded-lg border border-border bg-muted/30 overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 text-sm text-left",
          "hover:bg-accent/30 transition-colors"
        )}
      >
        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <span className="text-muted-foreground">Delegated to</span>
        <AgentBadge agentName={agent} />
        <span className="flex-1 truncate text-muted-foreground">
          &mdash; {description}
        </span>
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="px-3 pb-2 border-t border-border">
          <div className="mt-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Prompt
            </span>
            <pre className="mt-1 text-xs text-foreground/80 whitespace-pre-wrap font-mono bg-background/50 p-2 rounded">
              {prompt}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
