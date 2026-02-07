/**
 * Main App component — Dashboard layout with panels
 */

import { useState, useEffect } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import DashboardLayout from "./components/layout/DashboardLayout"
import TaskHierarchyPanel from "./components/panels/TaskHierarchyPanel"
import PlanningArtifactsPanel from "./components/panels/PlanningArtifactsPanel"
import BrainKnowledgePanel from "./components/panels/BrainKnowledgePanel"
import DelegationChainPanel from "./components/panels/DelegationChainPanel"

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: 2000, // Poll every 2s for updates
      staleTime: 1000,
    },
  },
})

function App() {
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    // Test connection to backend
    fetch("/api/health")
      .then((res) => res.json())
      .then(() => setConnected(true))
      .catch(() => setConnected(false))
  }, [])

  if (!connected) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold">🧠 iDumb Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Connecting to backend...
          </p>
        </div>
      </div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <DashboardLayout>
        {/* Left Panel — Task Hierarchy */}
        <TaskHierarchyPanel />

        {/* Center Panel — Planning Artifacts */}
        <PlanningArtifactsPanel />

        {/* Right Panel — Brain & Delegations */}
        <div className="flex flex-col gap-4">
          <BrainKnowledgePanel />
          <DelegationChainPanel />
        </div>
      </DashboardLayout>
    </QueryClientProvider>
  )
}

export default App
