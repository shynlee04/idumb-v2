/**
 * useEventStream — Global SSE event relay from /api/events.
 *
 * Migrated from src/dashboard/frontend/src/hooks/useEventStream.tsx
 * Provides real-time OpenCode events via React context.
 *
 * Usage:
 *   <EventStreamProvider>
 *     <App />
 *   </EventStreamProvider>
 *
 *   const { events, connected } = useEventStream()
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { parseSSEEvent } from "../server/sdk-validators"

/** A global event from the OpenCode engine. */
export interface EngineEvent {
  type: string
  data: Record<string, unknown>
  timestamp: number
}

interface EventStreamContextValue {
  events: EngineEvent[]
  connected: boolean
  error: string | null
  clearEvents: () => void
}

const EventStreamContext = createContext<EventStreamContextValue>({
  events: [],
  connected: false,
  error: null,
  clearEvents: () => {},
})

const MAX_EVENTS = 500

export function EventStreamProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<EngineEvent[]>([])
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearEvents = useCallback(() => {
    setEvents([])
    setError(null)
  }, [])

  useEffect(() => {
    let destroyed = false

    const connect = () => {
      if (destroyed) return

      const es = new EventSource("/api/events")
      eventSourceRef.current = es

      es.addEventListener("connected", () => {
        setConnected(true)
        setError(null)
      })

      es.addEventListener("message", (e) => {
        const data = parseSSEEvent(e.data)
        if (data) {
          setEvents((prev) => {
            const next = [...prev, { type: data.type || "message", data, timestamp: Date.now() }]
            return next.length > MAX_EVENTS ? next.slice(-MAX_EVENTS) : next
          })
        }
      })

      es.addEventListener("error", (e) => {
        if (destroyed) return
        setConnected(false)

        // Attempt auto-reconnect
        es.close()
        if (!destroyed) {
          reconnectTimerRef.current = setTimeout(connect, 3000)
        }
      })

      // For typed events forwarded from the server
      es.onmessage = (e) => {
        const data = parseSSEEvent(e.data)
        if (data) {
          setEvents((prev) => {
            const next = [...prev, { type: data.type || "event", data, timestamp: Date.now() }]
            return next.length > MAX_EVENTS ? next.slice(-MAX_EVENTS) : next
          })
        }
      }
    }

    connect()

    return () => {
      destroyed = true
      eventSourceRef.current?.close()
      eventSourceRef.current = null
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
    }
  }, [])

  const value = useMemo(
    () => ({ events, connected, error, clearEvents }),
    [events, connected, error, clearEvents],
  )

  return <EventStreamContext.Provider value={value}>{children}</EventStreamContext.Provider>
}

export function useEventStream() {
  return useContext(EventStreamContext)
}
