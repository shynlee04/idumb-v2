import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { api } from "@/lib/api"

type EventCallback = (payload: unknown) => void

interface EventStreamContextValue {
  connected: boolean
  state: "connected" | "reconnecting" | "disconnected"
  subscribe: (type: string, callback: EventCallback) => () => void
}

const EventStreamContext = createContext<EventStreamContextValue | null>(null)

export function EventStreamProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false)
  const [state, setState] = useState<EventStreamContextValue["state"]>("disconnected")

  const sourceRef = useRef<EventSource | null>(null)
  const subscribersRef = useRef<Map<string, Set<EventCallback>>>(new Map())

  const emit = useCallback((type: string, payload: unknown) => {
    const direct = subscribersRef.current.get(type)
    direct?.forEach((callback) => callback(payload))

    const wildcard = subscribersRef.current.get("*")
    wildcard?.forEach((callback) => callback(payload))
  }, [])

  useEffect(() => {
    const source = new EventSource(api.eventsUrl)
    sourceRef.current = source
    setState("reconnecting")

    source.onopen = () => {
      setConnected(true)
      setState("connected")
    }

    source.onerror = () => {
      setConnected(false)
      setState("reconnecting")
    }

    source.onmessage = (message) => {
      try {
        const payload = JSON.parse(message.data) as { type?: string }
        const type = payload.type ?? "event"
        emit(type, payload)
      } catch {
        emit("raw", message.data)
      }
    }

    return () => {
      source.close()
      sourceRef.current = null
      setConnected(false)
      setState("disconnected")
    }
  }, [emit])

  const subscribe = useCallback((type: string, callback: EventCallback) => {
    const existing = subscribersRef.current.get(type) ?? new Set<EventCallback>()
    existing.add(callback)
    subscribersRef.current.set(type, existing)

    return () => {
      const current = subscribersRef.current.get(type)
      if (!current) return
      current.delete(callback)
      if (current.size === 0) {
        subscribersRef.current.delete(type)
      }
    }
  }, [])

  const value = useMemo<EventStreamContextValue>(() => ({
    connected,
    state,
    subscribe,
  }), [connected, state, subscribe])

  return <EventStreamContext.Provider value={value}>{children}</EventStreamContext.Provider>
}

export function useEventStream() {
  const context = useContext(EventStreamContext)
  if (!context) {
    throw new Error("useEventStream must be used inside EventStreamProvider")
  }
  return context
}
