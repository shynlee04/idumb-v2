/**
 * Chat layout route — wraps all /chat/* routes with SessionSidebar.
 *
 * URL: /chat
 * Provides the sidebar + content layout shell.
 */

import { createFileRoute, Outlet } from "@tanstack/react-router"
import { SessionSidebar } from "../components/layout/SessionSidebar"
import { EngineStatus } from "../components/layout/EngineStatus"

export const Route = createFileRoute("/chat")({
  component: ChatLayout,
})

function ChatLayout() {
  return (
    <div className="flex h-screen bg-background text-foreground">
      <SessionSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header bar */}
        <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-background/80 backdrop-blur-sm">
          <h1 className="text-sm font-semibold">iDumb Chat</h1>
          <EngineStatus />
        </header>
        {/* Child route content */}
        <Outlet />
      </div>
    </div>
  )
}
