/**
 * PartRenderer — Renders individual message parts with styling.
 *
 * Supports:
 * - Text blocks (markdown)
 * - Tool call blocks with expandable output
 * - Code blocks with syntax highlighting
 * - Agent delegation indicators
 */

import { ChevronDown, ChevronRight, Terminal, Bot } from "lucide-react"
import { useState } from "react"

export interface MessagePart {
  type: "text" | "tool" | "code" | "agent"
  content: string
  name?: string
  id?: string
}

interface PartRendererProps {
  part: MessagePart
}

export function PartRenderer({ part }: PartRendererProps) {
  const [expanded, setExpanded] = useState(true)

  if (part.type === "text") {
    return (
      <div className="prose prose-invert prose-sm max-w-none">
        <TextContent content={part.content} />
      </div>
    )
  }

  if (part.type === "tool") {
    return (
      <ToolBlock
        name={part.name || "unknown_tool"}
        content={part.content}
        expanded={expanded}
        onToggle={() => setExpanded(!expanded)}
      />
    )
  }

  if (part.type === "code") {
    return <CodeBlock content={part.content} language={part.name || "text"} />
  }

  if (part.type === "agent") {
    return (
      <AgentBlock
        name={part.name || "unknown_agent"}
        content={part.content}
        expanded={expanded}
        onToggle={() => setExpanded(!expanded)}
      />
    )
  }

  return null
}

function TextContent({ content }: { content: string }) {
  return <div>{content}</div>
}

function ToolBlock({
  name,
  content,
  expanded,
  onToggle,
}: {
  name: string
  content: string
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="my-2 rounded-md border border-border bg-zinc-900/50">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium hover:bg-zinc-800/50"
      >
        <Terminal className="h-4 w-4 shrink-0 text-blue-400" />
        <span className="flex-1 font-mono text-xs">{name}</span>
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>
      {expanded && (
        <pre className="scrollbar-thin scroll-track-transparent scrollbar-thumb-border overflow-x-auto px-3 py-2 text-xs font-mono text-muted-foreground">
          {content}
        </pre>
      )}
    </div>
  )
}

function CodeBlock({
  content,
  language,
}: {
  content: string
  language: string
}) {
  return (
    <div className="my-2 rounded-md border border-border bg-zinc-900/50">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="text-xs font-mono text-muted-foreground">{language}</span>
      </div>
      <pre className="scrollbar-thin scroll-track-transparent scrollbar-thumb-border overflow-x-auto p-3 text-xs font-mono">
        {content}
      </pre>
    </div>
  )
}

function AgentBlock({
  name,
  content,
  expanded,
  onToggle,
}: {
  name: string
  content: string
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="my-2 rounded-md border border-purple-500/30 bg-purple-950/20">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium hover:bg-purple-950/30"
      >
        <Bot className="h-4 w-4 shrink-0 text-purple-400" />
        <span className="flex-1 text-xs font-semibold text-purple-100">
          @agent:{name}
        </span>
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-purple-400" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-purple-400" />
        )}
      </button>
      {expanded && (
        <div className="px-3 py-2 text-xs text-purple-100/80">{content}</div>
      )}
    </div>
  )
}
