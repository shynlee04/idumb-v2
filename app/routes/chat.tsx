/**
 * Chat layout route — wraps all /chat/* routes with SessionSidebar.
 *
 * URL: /chat
 * Provides the sidebar + content layout shell.
 * Includes Chat/Changes view toggle for switching between messages and diff view.
 */

import { useState, useEffect } from "react"
import { createFileRoute, Outlet, useParams } from "@tanstack/react-router"
import { SessionSidebar } from "../components/layout/SessionSidebar"
import { EngineStatus } from "../components/layout/EngineStatus"
import { ModelPicker } from "../components/chat/ModelPicker"
import { LazyDiffViewer } from "../components/diff/DiffEditor.lazy"
import { cn } from "../lib/utils"

export const Route = createFileRoute("/chat")({
  component: ChatLayout,
})

function ChatLayout() {
  const [view, setView] = useState<'chat' | 'changes'>('chat')
  const params = useParams({ strict: false }) as { sessionId?: string }

  // Reset to chat view when session changes
  useEffect(() => {
    setView('chat')
  }, [params.sessionId])

  return (
    <div className="flex h-screen bg-background text-foreground">
      <SessionSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header bar */}
        <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold">iDumb Chat</h1>
            {/* Chat / Changes view toggle */}
            <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
              <button
                onClick={() => setView('chat')}
                className={cn("px-2 py-0.5 text-xs rounded", view === 'chat' ? "bg-background shadow-sm" : "text-muted-foreground")}
              >
                Chat
              </button>
              <button
                onClick={() => setView('changes')}
                disabled={!params.sessionId}
                className={cn("px-2 py-0.5 text-xs rounded", view === 'changes' ? "bg-background shadow-sm" : "text-muted-foreground", !params.sessionId && "opacity-50 cursor-not-allowed")}
              >
                Changes
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ModelPicker />
            <EngineStatus />
          </div>
        </header>
        {/* Child route content or diff viewer */}
        {view === 'chat' ? <Outlet /> : <LazyDiffViewer sessionId={params.sessionId} />}
      </div>
    </div>
  )
}
