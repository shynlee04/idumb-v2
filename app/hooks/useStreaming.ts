/**
 * useStreaming — SSE streaming hook for chat prompts.
 *
 * Connects to /api/sessions/$id/prompt server route via fetch-based SSE.
 * Accumulates both raw events and typed Part objects from the stream.
 *
 * Part accumulation enables step clustering during streaming:
 * - step-start/step-finish Parts create step boundaries
 * - Tool Parts render inside step clusters
 * - Text Parts render as markdown
 *
 * Parts are matched by id for updates (e.g. tool status transitions).
 *
 * Usage:
 *   const { sendPrompt, isStreaming, events, streamingParts, error, abort } = useStreaming()
 */

import { useCallback, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { sessionKeys } from "./useSession"
import { parseSSEEvent } from "../server/sdk-validators"
import type { Part } from "../shared/engine-types"

/** A single SSE event from the prompt stream. */
export interface StreamEvent {
  type: string
  data: Record<string, unknown>
  timestamp: number
}

export interface StreamingState {
  isStreaming: boolean
  events: StreamEvent[]
  /** Accumulated Part objects from streaming — enables step clustering */
  streamingParts: Part[]
  error: string | null
}

export interface UseStreamingReturn extends StreamingState {
  sendPrompt: (sessionId: string, text: string, options?: PromptOptions) => void
  abort: () => void
  clearEvents: () => void
}

interface PromptOptions {
  modelID?: string
  providerID?: string
}

/**
 * Validate that a raw object looks like a valid SDK Part.
 * Checks for required fields: id, type (string).
 */
function isValidPart(obj: unknown): obj is Part {
  if (typeof obj !== "object" || obj === null) return false
  const p = obj as Record<string, unknown>
  return typeof p.id === "string" && typeof p.type === "string"
}

/**
 * Update the streamingParts array: replace if same id exists, append otherwise.
 * Uses functional update to avoid stale closure issues.
 */
function upsertPart(parts: Part[], newPart: Part): Part[] {
  const idx = parts.findIndex((p) => p.id === newPart.id)
  if (idx >= 0) {
    // Replace existing part (e.g. tool status transition)
    const updated = [...parts]
    updated[idx] = newPart
    return updated
  }
  return [...parts, newPart]
}

export function useStreaming(): UseStreamingReturn {
  const [state, setState] = useState<StreamingState>({
    isStreaming: false,
    events: [],
    streamingParts: [],
    error: null,
  })

  const abortRef = useRef<AbortController | null>(null)
  const queryClient = useQueryClient()

  const abort = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
      setState((prev) => ({ ...prev, isStreaming: false }))
    }
  }, [])

  const clearEvents = useCallback(() => {
    setState((prev) => ({ ...prev, events: [], streamingParts: [], error: null }))
  }, [])

  const sendPrompt = useCallback(
    (sessionId: string, text: string, options?: PromptOptions) => {
      // Abort any existing stream
      abort()

      const controller = new AbortController()
      abortRef.current = controller

      setState({ isStreaming: true, events: [], streamingParts: [], error: null })

      // POST to SSE server route
      fetch(`/api/sessions/${sessionId}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          ...(options?.modelID ? { modelID: options.modelID } : {}),
          ...(options?.providerID ? { providerID: options.providerID } : {}),
        }),
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`Prompt failed: ${response.status}`)
          }

          const reader = response.body?.getReader()
          if (!reader) throw new Error("No response body")

          const decoder = new TextDecoder()
          let buffer = ""

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })

            // Parse SSE lines
            const lines = buffer.split("\n")
            buffer = lines.pop() ?? "" // Keep incomplete last line

            let currentEvent = ""
            for (const line of lines) {
              if (line.startsWith("event: ")) {
                currentEvent = line.slice(7)
              } else if (line.startsWith("data: ")) {
                const data = parseSSEEvent(line.slice(6))
                if (data) {
                  const eventType = currentEvent || data.type || "message"
                  const streamEvent: StreamEvent = {
                    type: eventType,
                    data,
                    timestamp: Date.now(),
                  }

                  setState((prev) => {
                    let nextParts = prev.streamingParts

                    // Accumulate Part objects from message.part.updated events
                    if (
                      eventType === "message.part.updated" &&
                      typeof data.properties === "object" &&
                      data.properties !== null
                    ) {
                      const props = data.properties as Record<string, unknown>
                      if (isValidPart(props.part)) {
                        nextParts = upsertPart(prev.streamingParts, props.part)
                      }
                    }

                    return {
                      ...prev,
                      events: [...prev.events, streamEvent],
                      streamingParts: nextParts,
                    }
                  })

                  // Detect terminal events client-side for robustness
                  // (server closes stream, but client should also stop if it sees these events)
                  if (
                    eventType === "session.idle" ||
                    eventType === "session.error" ||
                    (eventType === "error" && data.error)
                  ) {
                    setState((prev) => ({
                      ...prev,
                      isStreaming: false,
                      ...(data.error
                        ? { error: String((data.properties as Record<string, unknown>)?.error ?? data.error) }
                        : {}),
                    }))
                    // Invalidate messages to load final state from server
                    queryClient.invalidateQueries({ queryKey: sessionKeys.messages(sessionId) })
                    reader.cancel()
                    return
                  }
                }
              }
            }
          }

          // Stream ended normally
          setState((prev) => ({ ...prev, isStreaming: false }))

          // Invalidate session messages to refresh
          queryClient.invalidateQueries({ queryKey: sessionKeys.messages(sessionId) })
        })
        .catch((err) => {
          if (err instanceof Error && err.name === "AbortError") {
            // User aborted — not an error
            return
          }
          setState((prev) => ({
            ...prev,
            isStreaming: false,
            error: err instanceof Error ? err.message : String(err),
          }))
        })
    },
    [abort, queryClient],
  )

  return {
    ...state,
    sendPrompt,
    abort,
    clearEvents,
  }
}
