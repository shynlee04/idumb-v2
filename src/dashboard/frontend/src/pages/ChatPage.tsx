/**
 * ChatPage — Session list + chat area placeholder.
 *
 * Left panel lists sessions with a "New Chat" button.
 * Main area shows placeholder or future message stream when session selected.
 */

import { useParams, useNavigate } from "react-router-dom"
import { MessageSquare, Plus, Trash2 } from "lucide-react"
import { useSessions, useCreateSession, useDeleteSession } from "@/hooks/useEngine"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function ChatPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { data: sessions, isLoading } = useSessions()
  const createSession = useCreateSession()
  const deleteSession = useDeleteSession()

  const handleNewChat = () => {
    createSession.mutate(undefined, {
      onSuccess: (session) => {
        navigate(`/chat/${session.id}`)
      },
    })
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    deleteSession.mutate(id, {
      onSuccess: () => {
        if (sessionId === id) navigate("/chat")
      },
    })
  }

  return (
    <div className="flex h-full">
      {/* Session list sidebar */}
      <div className="flex w-64 flex-col border-r border-border bg-zinc-950/50">
        <div className="flex items-center justify-between border-b border-border p-3">
          <span className="text-sm font-semibold">Sessions</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNewChat}
            disabled={createSession.isPending}
            title="New Chat"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading && (
            <p className="px-2 py-4 text-xs text-muted-foreground">Loading...</p>
          )}
          {sessions?.length === 0 && !isLoading && (
            <p className="px-2 py-4 text-xs text-muted-foreground">
              No sessions yet. Start a new chat.
            </p>
          )}
          {sessions?.map((s) => (
            <button
              key={s.id}
              onClick={() => navigate(`/chat/${s.id}`)}
              className={cn(
                "group flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                sessionId === s.id
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {s.title || s.id.slice(0, 8)}
                </span>
              </div>
              <button
                onClick={(e) => handleDelete(e, s.id)}
                className="hidden shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/20 hover:text-destructive group-hover:block"
                title="Delete session"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </button>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex flex-1 items-center justify-center">
        {sessionId ? (
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Session: <span className="font-mono text-foreground">{sessionId.slice(0, 12)}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Chat interface coming in a future plan.
            </p>
          </div>
        ) : (
          <div className="text-center space-y-3">
            <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Select a session or start a new one
            </p>
            <Button variant="outline" size="sm" onClick={handleNewChat}>
              <Plus className="mr-2 h-4 w-4" />
              New Chat
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
