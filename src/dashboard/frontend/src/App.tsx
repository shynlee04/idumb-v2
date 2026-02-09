/**
 * Main App component — Dashboard layout with panels and WebSocket
 */

import { useEffect, useRef, useCallback } from "react"
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { TaskGraphPanel } from "@/components/panels/TaskGraphPanel"
import { TaskHierarchyPanel } from "@/components/panels/TaskHierarchyPanel"
import { DelegationChainPanel } from "@/components/panels/DelegationChainPanel"
import { BrainKnowledgePanel } from "@/components/panels/BrainKnowledgePanel"
import { PlanningArtifactsPanel } from "@/components/panels/PlanningArtifactsPanel"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: 5000,
      staleTime: 2000,
    },
  },
})

const MAX_RECONNECT_DELAY_MS = 30_000
const BASE_RECONNECT_DELAY_MS = 1_000

function useWebSocket() {
  const qc = useQueryClient()
  const wsRef = useRef<WebSocket | null>(null)
  const retriesRef = useRef(0)
  const mountedRef = useRef(true)

  const connect = useCallback(() => {
    if (!mountedRef.current) return

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`)
    wsRef.current = ws

    ws.onopen = () => {
      retriesRef.current = 0 // reset backoff on successful connection
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === "file-changed" ||
            msg.type === "artifact-saved" || msg.type === "comment-added" ||
            msg.type === "comment-updated" || msg.type === "comment-deleted") {
          qc.invalidateQueries()
        }
      } catch {
        /* ignore malformed messages */
      }
    }

    ws.onclose = () => {
      wsRef.current = null
      if (!mountedRef.current) return
      // Exponential backoff: 1s, 2s, 4s, 8s, ... capped at 30s
      const delay = Math.min(
        BASE_RECONNECT_DELAY_MS * Math.pow(2, retriesRef.current),
        MAX_RECONNECT_DELAY_MS
      )
      retriesRef.current++
      setTimeout(connect, delay)
    }
  }, [qc])

  useEffect(() => {
    mountedRef.current = true
    connect()

    return () => {
      mountedRef.current = false
      wsRef.current?.close()
    }
  }, [connect])
}

function Dashboard() {
  useWebSocket()

  return (
    <DashboardLayout>
      <TaskGraphPanel />
      <TaskHierarchyPanel />
      <DelegationChainPanel />
      <BrainKnowledgePanel />
      <PlanningArtifactsPanel />
    </DashboardLayout>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  )
}
