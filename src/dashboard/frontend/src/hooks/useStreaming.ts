import { useCallback, useRef, useState } from "react"
import { api, type StreamPart } from "@/lib/api"

interface StreamingState {
  parts: Map<string, StreamPart>
  isStreaming: boolean
  error: string | null
  sendPrompt: (text: string, model?: { providerID: string; modelID: string }) => Promise<void>
  abort: () => Promise<void>
  clear: () => void
}

function mergePart(previous: StreamPart | undefined, next: StreamPart, delta?: string): StreamPart {
  if (!previous) {
    if (next.type === "text" && typeof delta === "string" && typeof next.text === "string") {
      return { ...next, text: `${next.text}${delta}` }
    }
    if (next.type === "text" && typeof delta === "string" && typeof next.text !== "string") {
      return { ...next, text: delta }
    }
    return next
  }

  const merged: StreamPart = { ...previous, ...next }

  if (merged.type === "text") {
    const prevText = typeof previous.text === "string" ? previous.text : ""
    const nextText = typeof next.text === "string" ? next.text : ""
    if (typeof delta === "string" && delta.length > 0) {
      merged.text = `${prevText}${delta}`
    } else if (nextText.length > 0 && nextText !== prevText) {
      merged.text = nextText
    } else {
      merged.text = prevText
    }
  }

  if (merged.type === "tool" && previous.state && next.state) {
    merged.state = { ...previous.state, ...next.state }
  }

  return merged
}

function parseSseChunk(chunk: string): Array<string> {
  const payloads: Array<string> = []
  const frames = chunk.split("\n\n")

  for (const frame of frames) {
    if (!frame.startsWith("data: ")) continue
    payloads.push(frame.slice(6))
  }

  return payloads
}

export function useStreaming(sessionId?: string): StreamingState {
  const [parts, setParts] = useState<Map<string, StreamPart>>(new Map())
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const clear = useCallback(() => {
    setParts(new Map())
    setError(null)
  }, [])

  const abort = useCallback(async () => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null

    if (sessionId) {
      try {
        await api.abortSession(sessionId)
      } catch {
        // Best effort abort.
      }
    }

    setIsStreaming(false)
  }, [sessionId])

  const sendPrompt = useCallback(async (text: string, model?: { providerID: string; modelID: string }) => {
    if (!sessionId || !text.trim()) return

    setError(null)
    setIsStreaming(true)
    setParts(new Map())

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const response = await api.sendPrompt(sessionId, text, controller.signal, model)
      if (!response.ok) {
        throw new Error(`Prompt failed with status ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("Prompt stream has no body")
      }

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const chunks = buffer.split("\n\n")
        buffer = chunks.pop() ?? ""

        for (const payload of parseSseChunk(chunks.join("\n\n"))) {
          if (payload === "[DONE]") {
            setIsStreaming(false)
            return
          }

          const parsed = JSON.parse(payload) as {
            type?: string
            event?: { type?: string; properties?: { part?: StreamPart; delta?: string; error?: unknown } }
            message?: string
          }

          if (parsed.type === "error") {
            setError(parsed.message ?? "Session error")
            continue
          }

          const event = parsed.event
          if (!event) continue

          if (event.type === "session.error") {
            const eventError = event.properties?.error
            setError(typeof eventError === "string" ? eventError : "Session error")
            continue
          }

          if (event.type === "message.part.updated") {
            const incomingPart = event.properties?.part
            if (!incomingPart || typeof incomingPart.id !== "string") continue
            const delta = typeof event.properties?.delta === "string" ? event.properties.delta : undefined

            setParts((prev) => {
              const nextMap = new Map(prev)
              const previous = nextMap.get(incomingPart.id)
              nextMap.set(incomingPart.id, mergePart(previous, incomingPart, delta))
              return nextMap
            })
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message)
      }
    } finally {
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }, [sessionId])

  return {
    parts,
    isStreaming,
    error,
    sendPrompt,
    abort,
    clear,
  }
}
