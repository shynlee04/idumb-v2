/**
 * Main App component — Dashboard layout with panels and WebSocket
 */

import { useEffect, useRef } from "react"
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
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

function useWebSocket() {
  const qc = useQueryClient()
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === "file-changed" || msg.type === "state-update") {
          qc.invalidateQueries()
        }
      } catch {
        /* ignore malformed messages */
      }
    }

    ws.onclose = () => {
      setTimeout(() => {
        wsRef.current = null
      }, 3000)
    }

    return () => ws.close()
  }, [qc])
}

function Dashboard() {
  useWebSocket()

  return (
    <DashboardLayout>
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
