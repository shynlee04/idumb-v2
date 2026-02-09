/**
 * MessageList — Renders the conversation history with streaming support.
 *
 * - Messages rendered with user/assistant styling
 * - Streaming message shows live updates
 * - Each message may contain multiple parts
 */

import { User, Bot as BotIcon } from "lucide-react"
import { PartRenderer, MessagePart } from "./PartRenderer"

export interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: string
  parts?: MessagePart[]
  isStreaming?: boolean
}

interface MessageListProps {
  messages: Message[]
}

export type { MessagePart }
export function MessageList({ messages }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Start a conversation
          </p>
          <p className="text-xs text-muted-foreground/60">
            Ask a question or run a command
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
      {messages.map((msg) => (
        <MessageItem key={msg.id} message={msg} />
      ))}
    </div>
  )
}

function MessageItem({ message }: { message: Message }) {
  const isUser = message.role === "user"
  const isSystem = message.role === "system"

  if (isSystem) {
    return null
  }

  return (
    <div
      className={cn(
        "flex gap-3",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500/10">
          <BotIcon className="h-4 w-4 text-purple-400" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-4 py-3",
          isUser
            ? "bg-primary/10 text-primary-foreground"
            : "bg-zinc-900/50 text-foreground",
        )}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </p>
        ) : (
          <div className="space-y-2">
            {message.parts?.map((part, idx) => (
              <PartRenderer key={`${msgKey(message)}-${idx}`} part={part} />
            ))}
            {message.isStreaming && (
              <span className="inline-block h-4 w-2.5 animate-pulse rounded-full bg-foreground/50" />
            )}
          </div>
        )}
      </div>
      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/10">
          <User className="h-4 w-4 text-blue-400" />
        </div>
      )}
    </div>
  )
}

function msgKey(msg: Message): string {
  return `${msg.id}-${msg.timestamp}`
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ")
}
