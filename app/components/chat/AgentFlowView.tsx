/**
 * AgentFlowView — displays child sessions as parallel agent operations.
 *
 * When a session has children (from session.children()), each child represents
 * a parallel agent run. This component renders them as a compact list with
 * agent attribution and status, allowing users to click into any child session.
 *
 * Detection logic:
 * - Sequential: AgentPart appears within a single session's parts -> handled by PartRenderer
 * - Parallel: session.children() returns Session[] -> handled by this component
 */

import { Link } from "@tanstack/react-router"
import { GitBranch, ExternalLink, Clock } from "lucide-react"
import { AgentBadge, AGENT_DISPLAY } from "./parts/AgentBadge"
import type { Session } from "@/shared/engine-types"

interface AgentFlowViewProps {
  children: Session[]
  parentSessionId: string
}

export function AgentFlowView({
  children,
  parentSessionId,
}: AgentFlowViewProps) {
  if (children.length === 0) return null

  return (
    <div className="my-3 rounded-lg border border-border bg-muted/20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
        <GitBranch className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Parallel Agent Runs ({children.length})
        </span>
      </div>

      {/* Child session list */}
      <div className="divide-y divide-border">
        {children.map((child) => {
          const agentName = inferAgentFromSession(child)
          const elapsed = child.time.updated - child.time.created
          const elapsedStr = elapsed > 0 ? formatDuration(elapsed) : null

          return (
            <Link
              key={child.id}
              to="/chat/$sessionId"
              params={{ sessionId: child.id }}
              className="flex items-center gap-3 px-3 py-2.5 hover:bg-accent/30 transition-colors group"
            >
              <AgentBadge agentName={agentName} />
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">
                  {child.title || `Agent run ${child.id.slice(0, 8)}`}
                </div>
                {child.summary && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {child.summary.files} file
                    {child.summary.files !== 1 ? "s" : ""} changed
                    {child.summary.additions > 0 && (
                      <span className="text-green-500 ml-1">
                        +{child.summary.additions}
                      </span>
                    )}
                    {child.summary.deletions > 0 && (
                      <span className="text-red-500 ml-1">
                        -{child.summary.deletions}
                      </span>
                    )}
                  </div>
                )}
              </div>
              {elapsedStr && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {elapsedStr}
                </span>
              )}
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Infer agent name from a child session.
 * Child sessions are created by agent delegation — the title or ID often contains
 * the agent name. Falls back to 'default'.
 */
function inferAgentFromSession(session: Session): string {
  const title = (session.title || "").toLowerCase()
  for (const agentKey of Object.keys(AGENT_DISPLAY)) {
    if (title.includes(agentKey)) return agentKey
  }
  return "default"
}

/** Format epoch millisecond duration to human-readable string. */
function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes}m ${secs}s`
}
