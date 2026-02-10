/**
 * ChatMessages — scrollable message list with auto-scroll on new messages.
 *
 * Shows "Send a message to start" when the list is empty.
 * Auto-scrolls to bottom when messages.length or streaming state changes.
 */

import { useEffect, useRef } from "react"
import { ChatMessage, type ChatMessageData } from "./ChatMessage"
import { Loader2 } from "lucide-react"

interface ChatMessagesProps {
  messages: ChatMessageData[]
  streaming?: boolean
}

export function ChatMessages({ messages, streaming }: ChatMessagesProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages or streaming change
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [messages.length, streaming])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p className="text-sm">Send a message to start</p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-4">
      <div className="max-w-3xl mx-auto py-4">
        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}
        {streaming && (
          <div className="flex items-center gap-2 py-3 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Generating...</span>
          </div>
        )}
      </div>
    </div>
  )
}
