/**
 * SessionSidebar — lists all chat sessions with create/delete controls.
 *
 * Uses useSessions() for the list, useCreateSession() to create, useDeleteSession() to delete.
 * Active session is highlighted via the current route param.
 */

import { Link, useNavigate, useParams } from "@tanstack/react-router"
import { MessageCircle, Plus, Trash2, Loader2 } from "lucide-react"
import { useSessions, useCreateSession, useDeleteSession } from "@/hooks/useSession"
import { cn } from "@/lib/utils"

export function SessionSidebar() {
  // Read sessionId from child route params (strict: false since layout doesn't own $sessionId)
  const params = useParams({ strict: false }) as { sessionId?: string }
  const currentSessionId = params.sessionId
  const { data: sessions, isLoading } = useSessions()
  const createSession = useCreateSession()
  const deleteSession = useDeleteSession()
  const navigate = useNavigate()

  const handleCreate = async () => {
    try {
      const session = await createSession.mutateAsync({})
      if (session?.id) {
        navigate({ to: "/chat/$sessionId", params: { sessionId: session.id } })
      }
    } catch {
      // Error handled by React Query
    }
  }

  const handleDelete = (e: React.MouseEvent, sessionId: string) => {
    e.preventDefault()
    e.stopPropagation()
    deleteSession.mutate(sessionId)
    // If deleting current session, navigate away
    if (sessionId === currentSessionId) {
      navigate({ to: "/" })
    }
  }

  return (
    <aside className="w-64 flex-shrink-0 border-r border-border bg-muted/20 flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Sessions</h2>
        <button
          type="button"
          onClick={handleCreate}
          disabled={createSession.isPending}
          className={cn(
            "rounded-md p-1.5 text-muted-foreground",
            "hover:bg-accent hover:text-accent-foreground transition-colors",
            "disabled:opacity-50"
          )}
          title="New session"
        >
          {createSession.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Session list */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading && (
          <div className="flex items-center justify-center py-4 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        )}

        {!isLoading && (!sessions || sessions.length === 0) && (
          <p className="text-xs text-muted-foreground text-center py-4">
            No sessions yet
          </p>
        )}

        {sessions?.map((session) => {
          const isActive = session.id === currentSessionId
          return (
            <Link
              key={session.id}
              to="/chat/$sessionId"
              params={{ sessionId: session.id }}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors group",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
              )}
            >
              <MessageCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="flex-1 truncate">
                {session.title || `Session ${session.id.slice(0, 8)}`}
              </span>
              <button
                type="button"
                onClick={(e) => handleDelete(e, session.id)}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-foreground hover:text-destructive transition-all"
                title="Delete session"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
