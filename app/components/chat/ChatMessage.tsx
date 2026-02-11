/**
 * ChatMessage — renders a single chat message with role badge and markdown content.
 *
 * Uses SDK Part discriminated union narrowing for type-safe rendering.
 * Handles both `content` (string, for streaming) and `parts` (SDK Part[], for
 * server messages) formats. Falls back gracefully for unknown part types.
 */

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Bot, User } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Part, TextPart, ToolPart } from "../../shared/engine-types"

export interface ChatMessageData {
  role: "user" | "assistant"
  content?: string
  parts?: Part[]
}

interface ChatMessageProps {
  message: ChatMessageData
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user"

  return (
    <div className={cn("py-4 border-b border-border last:border-0 flex gap-3")}>
      {/* Role badge */}
      <div
        className={cn(
          "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5",
          isUser ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Message content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground mb-1">
          {isUser ? "You" : "AI"}
        </p>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <MessageBody message={message} />
        </div>
      </div>
    </div>
  )
}

function MessageBody({ message }: { message: ChatMessageData }) {
  // If message has parts array, render each part
  if (message.parts && message.parts.length > 0) {
    return (
      <>
        {message.parts.map((part, i) => (
          <PartRenderer key={part.id ?? i} part={part} />
        ))}
      </>
    )
  }

  // If message has content string (streaming fallback), render as markdown
  if (message.content) {
    return <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
  }

  return <span className="text-muted-foreground italic">Empty message</span>
}

/**
 * Extract text content from a message's parts array.
 * Used to get the plain text content from SDK Part[] for display purposes.
 */
export function getTextContent(parts: Part[]): string {
  return parts
    .filter((p): p is TextPart => p.type === "text")
    .map((p) => p.text)
    .join("\n")
}

/**
 * Renders a single SDK Part using discriminated union narrowing on `part.type`.
 *
 * Part types by rendering priority:
 * - text: Render as markdown
 * - tool: Render tool name + state (pending/running/completed/error)
 * - reasoning: Render in collapsible thinking section
 * - file: Render filename
 * - step-start/step-finish, snapshot, patch, agent, retry, compaction, subtask: Skip (internal)
 * - unknown: Render nothing (SDK may add new Part types)
 */
function PartRenderer({ part }: { part: Part }) {
  switch (part.type) {
    case "text":
      // TypeScript narrows to TextPart — access .text directly
      return part.text ? (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>
      ) : null

    case "tool":
      // TypeScript narrows to ToolPart — access .tool (name), .state, .callID
      return <ToolPartRenderer part={part} />

    case "reasoning":
      // TypeScript narrows to ReasoningPart — access .text
      return (
        <details className="my-2">
          <summary className="text-xs text-muted-foreground cursor-pointer">
            Thinking...
          </summary>
          <div className="mt-1 text-sm text-muted-foreground italic whitespace-pre-wrap">
            {part.text}
          </div>
        </details>
      )

    case "file":
      // TypeScript narrows to FilePart — access .filename, .url, .mime
      return (
        <div className="my-1 text-xs text-muted-foreground">
          <span>File: </span>
          <span className="font-mono">{part.filename || part.url}</span>
        </div>
      )

    // Meta/internal SDK parts — not user-facing content
    case "step-start":
    case "step-finish":
    case "snapshot":
    case "patch":
    case "agent":
    case "retry":
    case "compaction":
    case "subtask":
      return null

    default:
      // Unknown part type — don't crash on future SDK additions
      return null
  }
}

/**
 * Renders a ToolPart with state-aware display.
 * ToolState is a discriminated union on `status`: pending | running | completed | error
 */
function ToolPartRenderer({ part }: { part: ToolPart }) {
  const { state } = part

  return (
    <div className="my-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs font-mono">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Tool: </span>
        <span className="font-semibold">{part.tool}</span>
        <ToolStatusBadge status={state.status} />
      </div>

      {/* Show title for running/completed states */}
      {(state.status === "running" || state.status === "completed") && state.title && (
        <p className="mt-1 text-muted-foreground">{state.title}</p>
      )}

      {/* Show output for completed state */}
      {state.status === "completed" && state.output && (
        <pre className="mt-1 text-muted-foreground overflow-x-auto max-h-40 overflow-y-auto">
          {state.output}
        </pre>
      )}

      {/* Show error for error state */}
      {state.status === "error" && (
        <pre className="mt-1 text-red-500 overflow-x-auto">
          {state.error}
        </pre>
      )}
    </div>
  )
}

function ToolStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "text-yellow-500",
    running: "text-blue-500",
    completed: "text-green-500",
    error: "text-red-500",
  }

  return (
    <span className={cn("text-[10px] uppercase", styles[status] || "text-muted-foreground")}>
      {status}
    </span>
  )
}
