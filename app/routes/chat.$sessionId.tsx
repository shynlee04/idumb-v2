/**
 * Chat session route — the actual chat interface.
 *
 * URL: /chat/$sessionId
 *
 * When sessionId is "new", creates a session and redirects.
 * Otherwise, loads messages from the server and enables streaming chat.
 *
 * Wires together:
 * - useSessionMessages(id) → load history
 * - useStreaming() → SSE streaming for live responses
 * - useCreateSession() → create session on "new"
 * - ChatMessages + ChatInput components
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useMemo, useRef } from "react"
import { ChatMessages } from "../components/chat/ChatMessages"
import { ChatInput } from "../components/chat/ChatInput"
import { useSessionMessages, useCreateSession } from "../hooks/useSession"
import { useStreaming, type StreamEvent } from "../hooks/useStreaming"
import type { ChatMessageData } from "../components/chat/ChatMessage"

export const Route = createFileRoute("/chat/$sessionId")({
  component: ChatPage,
})

function ChatPage() {
  const { sessionId } = Route.useParams()
  const navigate = useNavigate()
  const createSession = useCreateSession()
  const creatingRef = useRef(false)

  // If sessionId is "new", create a session and redirect
  useEffect(() => {
    if (sessionId !== "new" || creatingRef.current) return
    creatingRef.current = true

    createSession
      .mutateAsync({})
      .then((session) => {
        if (session?.id) {
          navigate({
            to: "/chat/$sessionId",
            params: { sessionId: session.id },
            replace: true,
          })
        }
      })
      .catch(() => {
        creatingRef.current = false
      })
  }, [sessionId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Don't render chat UI for "new" — we're redirecting
  if (sessionId === "new") {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p className="text-sm">Creating session...</p>
      </div>
    )
  }

  return <ChatSession sessionId={sessionId} />
}

/** Actual chat session — only rendered for real session IDs */
function ChatSession({ sessionId }: { sessionId: string }) {
  const { data: serverMessages } = useSessionMessages(sessionId)
  const { isStreaming, events, sendPrompt, abort } = useStreaming()

  // Convert server messages to ChatMessageData format
  const historyMessages = useMemo<ChatMessageData[]>(() => {
    if (!serverMessages) return []
    // serverMessages can be an array of message objects
    const msgs = Array.isArray(serverMessages) ? serverMessages : []
    return msgs.map((msg: Record<string, unknown>) => ({
      role: (msg.role as string) || "assistant",
      content: msg.content as string | undefined,
      parts: msg.parts as ChatMessageData["parts"],
    }))
  }, [serverMessages])

  // Convert streaming events to a live assistant message
  const streamingMessage = useMemo<ChatMessageData | null>(() => {
    if (!isStreaming || events.length === 0) return null

    // Collect text from streaming events
    const textParts: string[] = []
    for (const event of events) {
      const text = extractTextFromEvent(event)
      if (text) textParts.push(text)
    }

    if (textParts.length === 0) return null

    return {
      role: "assistant",
      content: textParts.join(""),
    }
  }, [isStreaming, events])

  // Combine history + streaming
  const allMessages = useMemo<ChatMessageData[]>(() => {
    const msgs = [...historyMessages]
    if (streamingMessage) {
      msgs.push(streamingMessage)
    }
    return msgs
  }, [historyMessages, streamingMessage])

  const handleSend = (text: string) => {
    sendPrompt(sessionId, text)
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ChatMessages messages={allMessages} streaming={isStreaming} />
      <ChatInput
        onSend={handleSend}
        onAbort={abort}
        streaming={isStreaming}
      />
    </div>
  )
}

/**
 * Extract text content from a streaming SSE event.
 *
 * The SSE handler emits events with various shapes depending on the
 * OpenCode SDK response. Common patterns:
 * - { type: "message.delta", data: { content: "..." } }
 * - { type: "text", data: { text: "..." } }
 * - { type: "content", data: { content: "..." } }
 */
function extractTextFromEvent(event: StreamEvent): string | null {
  const { data } = event

  // Direct content field
  if (typeof data.content === "string") return data.content
  // Text field
  if (typeof data.text === "string") return data.text
  // Delta with content
  if (data.delta && typeof (data.delta as Record<string, unknown>).content === "string") {
    return (data.delta as Record<string, unknown>).content as string
  }
  // Parts array with text
  if (Array.isArray(data.parts)) {
    const texts = data.parts
      .filter((p: Record<string, unknown>) => p.type === "text" && typeof p.text === "string")
      .map((p: Record<string, unknown>) => p.text as string)
    if (texts.length > 0) return texts.join("")
  }

  return null
}
