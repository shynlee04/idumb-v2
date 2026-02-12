/**
 * AgentBadge — displays agent name with colored icon.
 *
 * Used in two contexts:
 * 1. As an inline badge within chat messages (agent field on UserMessage)
 * 2. As an agent switch divider (AgentPart type in Part union)
 *
 * Agent identification strategy:
 * - Known agents: mapped to specific icons and colors
 * - Unknown agents: generic icon with raw name displayed
 * - Agents fetched dynamically via agent.list() can be added to AGENT_DISPLAY
 */

import { Crown, Code2, Search, Bot, Zap } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface AgentConfig {
  label: string
  icon: LucideIcon
  color: string   // Tailwind text color class
  bgColor: string // Tailwind bg color class (for badge background)
}

export const AGENT_DISPLAY: Record<string, AgentConfig> = {
  default: {
    label: "AI",
    icon: Bot,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  "supreme-coordinator": {
    label: "Coordinator",
    icon: Crown,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  coordinator: {
    label: "Coordinator",
    icon: Crown,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  investigator: {
    label: "Investigator",
    icon: Search,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  executor: {
    label: "Executor",
    icon: Code2,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  "coding-agent": {
    label: "Coder",
    icon: Code2,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
}

function getAgentConfig(agentName: string): AgentConfig {
  return (
    AGENT_DISPLAY[agentName] ?? {
      label: agentName,
      icon: Zap,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
    }
  )
}

interface AgentBadgeProps {
  agentName: string
  variant?: "inline" | "divider"
}

export function AgentBadge({ agentName, variant = "inline" }: AgentBadgeProps) {
  const config = getAgentConfig(agentName)
  const Icon = config.icon

  if (variant === "divider") {
    // Full-width divider with agent name — used for AgentPart
    return (
      <div className="flex items-center gap-2 py-1.5 my-1">
        <div className="h-px flex-1 bg-border" />
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
            config.color,
            config.bgColor
          )}
        >
          <Icon className="w-3 h-3" />
          {config.label}
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>
    )
  }

  // Inline badge — small pill next to role indicator
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        config.color
      )}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  )
}
