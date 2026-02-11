/**
 * useStreaming — SSE streaming hook for chat prompts.
 *
 * Migrated from src/dashboard/frontend/src/hooks/useStreaming.ts
 * Connects to /api/sessions/$id/prompt server route via EventSource-like fetch.
 *
 * Usage:
 *   const { sendPrompt, isStreaming, events, error, abort } = useStreaming()
 */

import { useCallback, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { sessionKeys } from "./useSession"
import { parseSSEEvent } from "../server/sdk-validators"

/** A single SSE event from the prompt stream. */
export interface StreamEvent {
  type: string
  data: Record<string, unknown>
  timestamp: number
}

export interface StreamingState {
  isStreaming: boolean
  events: StreamEvent[]
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

export function useStreaming(): UseStreamingReturn {
  const [state, setState] = useState<StreamingState>({
    isStreaming: false,
    events: [],
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
    setState((prev) => ({ ...prev, events: [], error: null }))
  }, [])

  const sendPrompt = useCallback(
    (sessionId: string, text: string, options?: PromptOptions) => {
      // Abort any existing stream
      abort()

      const controller = new AbortController()
      abortRef.current = controller

      setState({ isStreaming: true, events: [], error: null })

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
                  const streamEvent: StreamEvent = {
                    type: currentEvent || data.type || "message",
                    data,
                    timestamp: Date.now(),
                  }

                  setState((prev) => ({
                    ...prev,
                    events: [...prev.events, streamEvent],
                  }))

                  // Check for terminal event
                  if (data.error) {
                    setState((prev) => ({ ...prev, error: String(data.error), isStreaming: false }))
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
