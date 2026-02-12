/**
 * ChatMessages — scrollable message list with auto-scroll, step clustering,
 * and revert checkpoint indicators.
 *
 * Shows "Send a message to start" when the list is empty.
 * Auto-scrolls to bottom when messages.length or streaming state changes.
 *
 * Assistant messages with parts are grouped by step-start/step-finish into
 * collapsible StepCluster components. User messages and text-only streaming
 * messages render without clustering.
 *
 * Revert support:
 * - RevertCheckpoint renders at the revert point with an "Restore messages" button
 * - User messages show a "Revert to here" button on hover
 */

import { useEffect, useMemo, useRef } from "react"
import { ChatMessage, PartRenderer, type ChatMessageData } from "./ChatMessage"
import { groupPartsIntoClusters, StepCluster } from "./StepCluster"
import { Loader2, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatMessagesProps {
  messages: ChatMessageData[]
  streaming?: boolean
  revertInfo?: { messageID: string; partID?: string } | null
  onRevert?: (messageID: string) => void
  onUnrevert?: () => void
}

export function ChatMessages({ messages, streaming, revertInfo, onRevert, onUnrevert }: ChatMessagesProps) {
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
          <div key={i}>
            {msg.role === "assistant" && msg.parts && msg.parts.length > 0 ? (
              <ClusteredMessage message={msg} />
            ) : (
              <div className="relative group/msg">
                <ChatMessage message={msg} />
                {/* Revert-to-here button on user messages with a messageId */}
                {msg.role === "user" && msg.messageId && onRevert && (
                  <button
                    type="button"
                    onClick={() => onRevert(msg.messageId!)}
                    className={cn(
                      "absolute top-3 right-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-xs",
                      "text-muted-foreground hover:text-amber-500 transition-colors",
                      "opacity-0 group-hover/msg:opacity-100"
                    )}
                    title="Revert to this message"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Revert</span>
                  </button>
                )}
              </div>
            )}
            {/* Revert checkpoint indicator */}
            {revertInfo?.messageID === msg.messageId && (
              <RevertCheckpoint onUnrevert={onUnrevert} />
            )}
          </div>
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

/**
 * RevertCheckpoint — visual indicator at the revert point in the conversation.
 * Shows an amber banner with "Session reverted to this point" and an optional
 * "Restore messages" button to unrevert.
 */
function RevertCheckpoint({ onUnrevert }: { onUnrevert?: () => void }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 my-2 bg-amber-500/10 border border-amber-500/30 rounded-md">
      <RotateCcw className="w-4 h-4 text-amber-500" />
      <span className="text-xs text-amber-500 font-medium">
        Session reverted to this point
      </span>
      {onUnrevert && (
        <button
          onClick={onUnrevert}
          className="ml-auto text-xs text-amber-500 hover:text-amber-400 underline"
        >
          Restore messages
        </button>
      )}
    </div>
  )
}

/**
 * ClusteredMessage — renders an assistant message with step clustering.
 *
 * Groups parts into ClusteredGroup[] by step boundaries:
 * - "content" groups: rendered directly via PartRenderer
 * - "step" groups: rendered as collapsible StepCluster
 * - Latest step group is expanded, older ones collapsed
 *
 * Falls back to plain ChatMessage if no step boundaries are found.
 */
function ClusteredMessage({ message }: { message: ChatMessageData }) {
  const groups = useMemo(
    () => groupPartsIntoClusters(message.parts ?? []),
    [message.parts]
  )

  // If no step groups, render as plain message (no clustering overhead)
  const hasSteps = groups.some((g) => g.type === "step")
  if (!hasSteps) {
    return <ChatMessage message={message} />
  }

  // Find the last step group index for isLatest
  let lastStepIndex = -1
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i].type === "step") {
      lastStepIndex = i
      break
    }
  }

  const isUser = message.role === "user"

  return (
    <div className={cn("py-3 border-b border-border last:border-0 flex gap-3")}>
      {/* Small role indicator */}
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

      {/* Message content with clustering */}
      <div className="flex-1 min-w-0">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {groups.map((group, i) => {
            if (group.type === "step") {
              return (
                <StepCluster
                  key={group.key}
                  group={group}
                  isLatest={i === lastStepIndex}
                />
              )
            }

            // Content group — render parts directly
            return (
              <div key={group.key}>
                {group.parts.map((part, j) => (
                  <PartRenderer key={part.id ?? `${group.key}-${j}`} part={part} />
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
