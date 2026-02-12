/**
 * ChatMessage — renders a single chat message with role indicator and rich
 * Part-specific components.
 *
 * Uses SDK Part discriminated union narrowing for type-safe rendering.
 * Handles both `content` (string, for streaming) and `parts` (SDK Part[], for
 * server messages) formats. Falls back gracefully for unknown part types.
 *
 * Part rendering is delegated to dedicated components:
 * - CodeBlock: syntax-highlighted code with copy/line-numbers/language-badge
 * - ToolCallAccordion: collapsed accordion with status + input/output
 * - ReasoningCollapse: collapsed-by-default thinking section
 * - FilePartRenderer: image preview or download card
 */

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"
import type { Part, TextPart } from "@/shared/engine-types"
import { CodeBlock } from "./parts/CodeBlock"
import { ToolCallAccordion } from "./parts/ToolCallAccordion"
import { ReasoningCollapse } from "./parts/ReasoningCollapse"
import { FilePartRenderer } from "./parts/FilePartRenderer"

export interface ChatMessageData {
  role: "user" | "assistant"
  content?: string
  parts?: Part[]
  messageId?: string    // SDK Message.id — used for revert point matching
}

interface ChatMessageProps {
  message: ChatMessageData
}

/** Shared ReactMarkdown components config — CodeBlock handles syntax highlighting */
const markdownComponents = { code: CodeBlock } as const

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user"

  return (
    <div className={cn("py-3 border-b border-border last:border-0 flex gap-3")}>
      {/* Small role indicator: colored dot + role text */}
      <div className="flex-shrink-0 flex items-center gap-1.5 mt-1 min-w-[2.5rem]">
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full flex-shrink-0",
            isUser ? "bg-muted-foreground" : "bg-primary"
          )}
        />
        <span className="text-xs font-medium text-muted-foreground">
          {isUser ? "You" : "AI"}
        </span>
      </div>

      {/* Message content */}
      <div className="flex-1 min-w-0">
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
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {message.content}
      </ReactMarkdown>
    )
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
 * - text: Render as markdown with CodeBlock for syntax highlighting
 * - tool: Render as ToolCallAccordion (collapsed, expandable)
 * - reasoning: Render as ReasoningCollapse (collapsed by default)
 * - file: Render as FilePartRenderer (image preview or download card)
 * - step-start/step-finish, snapshot, patch, agent, retry, compaction, subtask: Skip (internal)
 * - unknown: Render nothing (SDK may add new Part types)
 */
export function PartRenderer({ part }: { part: Part }) {
  switch (part.type) {
    case "text":
      // TypeScript narrows to TextPart — access .text directly
      return part.text ? (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={markdownComponents}
        >
          {part.text}
        </ReactMarkdown>
      ) : null

    case "tool":
      // TypeScript narrows to ToolPart — renders as collapsed accordion
      return <ToolCallAccordion part={part} />

    case "reasoning":
      // TypeScript narrows to ReasoningPart — collapsed by default
      return <ReasoningCollapse part={part} />

    case "file":
      // TypeScript narrows to FilePart — image preview or download card
      return <FilePartRenderer part={part} />

    // Meta/internal SDK parts — not user-facing content
    // (step-start/step-finish handled by StepCluster in Plan 02)
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
