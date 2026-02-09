import { useEffect, useMemo, useRef } from "react"
import { Bot, User } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PartRenderer } from "@/components/chat/PartRenderer"
import type { SessionMessageEntry, StreamPart } from "@/lib/api"

interface MessageListProps {
  messages: SessionMessageEntry[]
  streamingParts: Map<string, StreamPart>
  isStreaming: boolean
}

function sortParts(parts: StreamPart[]): StreamPart[] {
  return [...parts].sort((a, b) => a.id.localeCompare(b.id))
}

export function MessageList({ messages, streamingParts, isStreaming }: MessageListProps) {
  const endRef = useRef<HTMLDivElement | null>(null)

  const streamingList = useMemo(
    () => sortParts(Array.from(streamingParts.values())),
    [streamingParts],
  )

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingList, isStreaming])

  if (messages.length === 0 && streamingList.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Start a new conversation</p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Ask about the codebase, governance, or next tasks.
          </p>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full px-4 py-4">
      <div className="space-y-4">
        {messages.map((entry) => {
          const isUser = entry.info.role === "user"
          const parts = sortParts(entry.parts ?? [])
          return (
            <div key={entry.info.id} className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
              {!isUser ? (
                <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500/10">
                  <Bot className="h-4 w-4 text-indigo-300" />
                </div>
              ) : null}

              <div className={`max-w-[88%] space-y-2 ${isUser ? "items-end" : "items-start"}`}>
                {parts.map((part) => (
                  <PartRenderer key={part.id} part={part} />
                ))}
              </div>

              {isUser ? (
                <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/10">
                  <User className="h-4 w-4 text-blue-300" />
                </div>
              ) : null}
            </div>
          )
        })}

        {streamingList.length > 0 ? (
          <div className="flex gap-3">
            <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500/10">
              <Bot className="h-4 w-4 text-indigo-300" />
            </div>
            <div className="max-w-[88%] space-y-2">
              {streamingList.map((part) => (
                <PartRenderer key={`stream-${part.id}`} part={part} isStreaming={isStreaming} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <div ref={endRef} />
    </ScrollArea>
  )
}
