import { Outlet } from "react-router-dom"
import { Sidebar } from "@/components/layout/Sidebar"
import { GovernanceBar } from "@/components/governance/GovernanceBar"
import { EventStreamProvider } from "@/hooks/useEventStream"

export function AppShell() {
  return (
    <EventStreamProvider>
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col">
          <GovernanceBar />
          <div className="min-h-0 flex-1 overflow-hidden">
            <Outlet />
          </div>
        </main>
      </div>
    </EventStreamProvider>
  )
}
