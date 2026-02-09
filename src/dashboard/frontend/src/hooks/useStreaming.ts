/**
 * useStreaming — SSE stream handler with abort support.
 *
 * Opens EventSource to SSE endpoint, accumulates streamed chunks,
 * provides abort capability. Returns controller with:
 * - stream: ReadableStream of SSE messages
 * - abort: Function to cancel the request
 * - isStreaming: Boolean flag
 */

import { useState, useRef, useCallback } from "react"

export interface StreamingController {
  stream: ReadableStream<string> | null
  abort: () => void
  isStreaming: boolean
  start: (sseUrl: string, text: string) => void
}

export function useStreaming(): StreamingController {
  const [stream, setStream] = useState<ReadableStream<string> | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const startStream = useCallback((sseUrl: string, requestBody: string) => {
    abortControllerRef.current = new AbortController()
    setIsStreaming(true)

    const readable = new ReadableStream<string>({
      async start(controller) {
        const response = await fetch(sseUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: requestBody,
          signal: abortControllerRef.current!.signal,
        })

        if (!response.ok) {
          controller.error(new Error(`SSE failed: ${response.status}`))
          setIsStreaming(false)
          return
        }

        const reader = response.body?.getReader()
        if (!reader) {
          controller.error(new Error("No response body"))
          setIsStreaming(false)
          return
        }

        const decoder = new TextDecoder()
        let buffer = ""

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split("\n\n")
            buffer = lines.pop() ?? ""

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6)
                if (data === "[DONE]") {
                  controller.close()
                  setIsStreaming(false)
                  return
                }
                controller.enqueue(data)
              }
            }
          }
          controller.close()
          setIsStreaming(false)
        } catch (err) {
          if ((err as Error).name !== "AbortError") {
            controller.error(err)
          }
          setIsStreaming(false)
        }
      },
    })

    setStream(readable)
  }, [])

  const abort = useCallback(() => {
    abortControllerRef.current?.abort()
    setIsStreaming(false)
    setStream(null)
  }, [])

  const start = useCallback(
    (sseUrl: string, text: string) => {
      abort()
      startStream(sseUrl, JSON.stringify({ text }))
    },
    [abort, startStream],
  )

  return {
    stream,
    abort,
    isStreaming,
    start,
  }
}
