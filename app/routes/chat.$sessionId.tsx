/**
 * Chat route — main chat interface.
 *
 * URL: /chat/$sessionId
 * Displays chat with the given session. "new" creates a fresh session.
 * Stub: will be fleshed out in Plan 05-02 (component migration).
 */

import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/chat/$sessionId")({
  component: ChatPage,
})

function ChatPage() {
  const { sessionId } = Route.useParams()

  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Chat</h1>
        <p className="text-muted-foreground">
          Session: {sessionId === "new" ? "New Session" : sessionId}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Stub — will be replaced with full ChatPage in Plan 05-02
        </p>
      </div>
    </div>
  )
}
