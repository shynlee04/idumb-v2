/**
 * Chat session route — the actual chat interface.
 *
 * URL: /chat/$sessionId
 *
 * When sessionId is "new", creates a session and redirects.
 * Otherwise, loads messages from the server and enables streaming chat.
 *
 * Wires together:
 * - useSessionMessages(id) -> load history (parts-based, enables step clustering)
 * - useStreaming() -> SSE streaming with Part accumulation
 * - useCreateSession() -> create session on "new"
 * - ChatMessages + ChatInput components
 *
 * Streaming messages use two paths:
 * - Primary: streamingParts (Part[]) -> enables step clustering during streaming
 * - Fallback: extractTextFromEvent -> plain text (backward compat for non-Part events)
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useMemo, useRef } from "react"
import { ChatMessages } from "../components/chat/ChatMessages"
import { ChatInput } from "../components/chat/ChatInput"
import {
  useSession,
  useSessionMessages,
  useSessionChildren,
  useCreateSession,
  useRevertSession,
  useUnrevertSession,
} from "../hooks/useSession"
import { useStreaming, type StreamEvent } from "../hooks/useStreaming"
import { useSetting } from "../hooks/useSettings"
import type { Message, Part } from "../shared/engine-types"
import type { ChatMessageData } from "../components/chat/ChatMessage"
import { AgentFlowView } from "../components/chat/AgentFlowView"

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
  const { data: sessionDetail } = useSession(sessionId)
  const { data: serverMessages } = useSessionMessages(sessionId)
  const { data: childSessions } = useSessionChildren(sessionId)
  const { isStreaming, events, streamingParts, sendPrompt, abort } = useStreaming()
  const { data: defaultModelSetting } = useSetting("default-model")

  // Revert/unrevert handlers
  const revertSession = useRevertSession()
  const unrevertSession = useUnrevertSession()

  const handleRevert = (messageID: string) => revertSession.mutate({ id: sessionId, messageID })
  const handleUnrevert = () => unrevertSession.mutate(sessionId)

  // Derive revert info from session detail
  const revertInfo = useMemo(() => {
    if (!sessionDetail?.revert) return null
    const revert = sessionDetail.revert as { messageID: string; partID?: string }
    return {
      messageID: revert.messageID,
      partID: revert.partID,
    }
  }, [sessionDetail])

  // Parse the default model selection
  const defaultModel = useMemo(() => {
    if (!defaultModelSetting?.value) return null
    try {
      const parsed = JSON.parse(defaultModelSetting.value)
      if (parsed && typeof parsed.providerID === "string" && typeof parsed.modelID === "string") {
        return parsed as { providerID: string; modelID: string }
      }
    } catch {
      // Invalid JSON
    }
    return null
  }, [defaultModelSetting])

  // Convert server messages to ChatMessageData format
  // SDK returns Array<{ info: Message; parts: Part[] }> — message and parts are separate
  const historyMessages = useMemo<ChatMessageData[]>(() => {
    if (!serverMessages) return []
    const items = Array.isArray(serverMessages) ? serverMessages : []
    return (items as Array<{ info: Message; parts: Part[] }>).map((item) => ({
      role: item.info.role,
      parts: item.parts,
      messageId: item.info.id,
      // Agent attribution: UserMessage has an optional 'agent' field at runtime
      agent: "agent" in item.info
        ? (item.info as Record<string, unknown>).agent as string | undefined
        : undefined,
    }))
  }, [serverMessages])

  // Convert streaming state to a live assistant message
  // Primary path: use accumulated Part objects (enables step clustering during streaming)
  // Fallback: use text extraction from events (backward compat for non-Part SSE events)
  const streamingMessage = useMemo<ChatMessageData | null>(() => {
    if (!isStreaming) return null

    // Primary: streaming parts available — use them for step-aware rendering
    if (streamingParts.length > 0) {
      return {
        role: "assistant",
        parts: streamingParts,
      }
    }

    // Fallback: extract text from raw events
    if (events.length > 0) {
      const textParts: string[] = []
      for (const event of events) {
        const text = extractTextFromEvent(event)
        if (text) textParts.push(text)
      }

      if (textParts.length > 0) {
        return {
          role: "assistant",
          content: textParts.join(""),
        }
      }
    }

    // Streaming started but no content yet — show placeholder
    return {
      role: "assistant",
      content: "",
    }
  }, [isStreaming, events, streamingParts])

  // Combine history + streaming
  const allMessages = useMemo<ChatMessageData[]>(() => {
    const msgs = [...historyMessages]
    if (streamingMessage) {
      msgs.push(streamingMessage)
    }
    return msgs
  }, [historyMessages, streamingMessage])

  const handleSend = (text: string) => {
    sendPrompt(sessionId, text, defaultModel ? {
      modelID: defaultModel.modelID,
      providerID: defaultModel.providerID,
    } : undefined)
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ChatMessages
        messages={allMessages}
        streaming={isStreaming}
        revertInfo={revertInfo}
        onRevert={handleRevert}
        onUnrevert={handleUnrevert}
      />
      {childSessions && childSessions.length > 0 && (
        <div className="px-4 pb-2">
          <AgentFlowView children={childSessions} parentSessionId={sessionId} />
        </div>
      )}
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
 * SSE events from the OpenCode SDK relay have various shapes. Key patterns:
 * - { type: "message.part.updated", properties: { part: Part, delta?: string } }
 * - { type: "text", data: { text: "..." } }
 * - { type: "content", data: { content: "..." } }
 *
 * All data fields are `unknown` (from parseSSEEvent) so runtime checks are used.
 *
 * NOTE: When streamingParts are available (primary path), this function serves as
 * backward compatibility for non-Part SSE events only.
 */
function extractTextFromEvent(event: StreamEvent): string | null {
  const { data } = event

  // Direct content field
  if (typeof data.content === "string") return data.content
  // Text field
  if (typeof data.text === "string") return data.text

  // SDK part delta: { properties: { delta: "..." } }
  if (typeof data.properties === "object" && data.properties !== null) {
    const props = data.properties as Record<string, unknown>
    if (typeof props.delta === "string") return props.delta
  }

  // Delta with content (non-SDK fallback)
  if (typeof data.delta === "object" && data.delta !== null) {
    const delta = data.delta as Record<string, unknown>
    if (typeof delta.content === "string") return delta.content
  }

  // Parts array with text parts
  if (Array.isArray(data.parts)) {
    const texts = (data.parts as Array<Record<string, unknown>>)
      .filter((p) => p.type === "text" && typeof p.text === "string")
      .map((p) => p.text as string)
    if (texts.length > 0) return texts.join("")
  }

  return null
}
