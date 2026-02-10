/**
 * ChatMessage — renders a single chat message with role badge and markdown content.
 *
 * Handles both `content` (string) and `parts` (array) message formats from
 * the OpenCode SDK event bus. Falls back to JSON for unknown part types.
 */

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Bot, User } from "lucide-react"
import { cn } from "@/lib/utils"

export interface MessagePart {
  type: string
  text?: string
  toolName?: string
  args?: Record<string, unknown>
  result?: unknown
  [key: string]: unknown
}

export interface ChatMessageData {
  role: string
  content?: string
  parts?: MessagePart[]
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
          <PartRenderer key={i} part={part} />
        ))}
      </>
    )
  }

  // If message has content string, render as markdown
  if (message.content) {
    return <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
  }

  return <span className="text-muted-foreground italic">Empty message</span>
}

function PartRenderer({ part }: { part: MessagePart }) {
  switch (part.type) {
    case "text":
      return part.text ? (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>
      ) : null

    case "tool-call":
      return (
        <div className="my-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs font-mono">
          <span className="text-muted-foreground">Tool: </span>
          <span className="font-semibold">{part.toolName || "unknown"}</span>
          {part.args && (
            <pre className="mt-1 text-muted-foreground overflow-x-auto">
              {JSON.stringify(part.args, null, 2)}
            </pre>
          )}
        </div>
      )

    case "tool-result":
      return (
        <div className="my-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs font-mono text-muted-foreground overflow-x-auto">
          {typeof part.result === "string" ? part.result : JSON.stringify(part.result, null, 2)}
        </div>
      )

    default:
      return (
        <pre className="my-2 text-xs text-muted-foreground overflow-x-auto">
          {JSON.stringify(part, null, 2)}
        </pre>
      )
  }
}
