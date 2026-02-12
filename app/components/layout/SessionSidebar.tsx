/**
 * SessionSidebar — lists all chat sessions with create/delete/search/rename/auto-title controls.
 *
 * Uses useSessions() for the list, useCreateSession() to create, useDeleteSession() to delete.
 * Active session is highlighted via the current route param.
 *
 * Features:
 * - Search: filter sessions by title or ID
 * - Inline rename: double-click title to edit, Enter to save, Escape to cancel
 * - Auto-title: Sparkles button triggers SDK session.summarize()
 * - Revert indicator: amber RotateCcw icon when session has active revert
 */

import { useState, useMemo } from "react"
import { Link, useNavigate, useParams } from "@tanstack/react-router"
import {
  Code2,
  MessageCircle,
  Plus,
  Trash2,
  Loader2,
  Search,
  Sparkles,
  RotateCcw,
} from "lucide-react"
import {
  useSessions,
  useCreateSession,
  useDeleteSession,
  useRenameSession,
  useSummarizeSession,
} from "@/hooks/useSession"
import { cn } from "@/lib/utils"

export function SessionSidebar() {
  // Read sessionId from child route params (strict: false since layout doesn't own $sessionId)
  const params = useParams({ strict: false }) as { sessionId?: string }
  const currentSessionId = params.sessionId
  const { data: sessions, isLoading } = useSessions()
  const createSession = useCreateSession()
  const deleteSession = useDeleteSession()
  const renameSession = useRenameSession()
  const summarizeSession = useSummarizeSession()
  const navigate = useNavigate()

  // Search state
  const [searchQuery, setSearchQuery] = useState("")

  // Inline rename state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")

  // Filter sessions by search query
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions
    const q = searchQuery.toLowerCase()
    return sessions?.filter(s =>
      (s.title || "").toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q)
    )
  }, [sessions, searchQuery])

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

  const commitRename = (id: string) => {
    const trimmed = editTitle.trim()
    if (trimmed && trimmed.length > 0) {
      renameSession.mutate({ id, title: trimmed })
    }
    setEditingId(null)
  }

  const handleSummarize = (e: React.MouseEvent, sessionId: string) => {
    e.preventDefault()
    e.stopPropagation()
    summarizeSession.mutate({ id: sessionId })
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

      {/* Search input */}
      <div className="px-2 pt-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sessions..."
            className={cn(
              "w-full pl-7 pr-2 py-1.5 text-xs rounded-md",
              "bg-muted/50 border border-border",
              "text-foreground placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-1 focus:ring-primary/50"
            )}
          />
        </div>
      </div>

      {/* IDE Shell navigation link */}
      <div className="px-2 pt-2">
        <Link
          to="/ide"
          className={cn(
            "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
            "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
          )}
        >
          <Code2 className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="flex-1 truncate">IDE Shell</span>
        </Link>
      </div>

      {/* Session list */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading && (
          <div className="flex items-center justify-center py-4 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        )}

        {!isLoading && (!filteredSessions || filteredSessions.length === 0) && (
          <p className="text-xs text-muted-foreground text-center py-4">
            {searchQuery.trim() ? "No matching sessions" : "No sessions yet"}
          </p>
        )}

        {filteredSessions?.map((session) => {
          const isActive = session.id === currentSessionId
          const hasRevert = Boolean((session as Record<string, unknown>).revert)
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
              {/* Session icon + revert indicator */}
              <div className="relative flex-shrink-0">
                <MessageCircle className="w-3.5 h-3.5" />
                {hasRevert && (
                  <RotateCcw className="absolute -top-1 -right-1 w-2.5 h-2.5 text-amber-500/70" />
                )}
              </div>

              {/* Title — inline edit or display */}
              {editingId === session.id ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={() => commitRename(session.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename(session.id)
                    if (e.key === "Escape") setEditingId(null)
                  }}
                  onClick={(e) => e.preventDefault()}
                  autoFocus
                  className="flex-1 bg-transparent border-b border-primary text-sm outline-none min-w-0"
                />
              ) : (
                <span
                  onDoubleClick={(e) => {
                    e.preventDefault()
                    setEditingId(session.id)
                    setEditTitle(session.title || "")
                  }}
                  className="flex-1 truncate"
                >
                  {session.title || `Session ${session.id.slice(0, 8)}`}
                </span>
              )}

              {/* Action buttons — visible on hover */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                {/* Auto-title (summarize) */}
                <button
                  type="button"
                  onClick={(e) => handleSummarize(e, session.id)}
                  disabled={summarizeSession.isPending}
                  className="p-0.5 rounded text-muted-foreground hover:text-primary transition-colors"
                  title="Auto-generate title"
                >
                  {summarizeSession.isPending && summarizeSession.variables?.id === session.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                </button>

                {/* Delete */}
                <button
                  type="button"
                  onClick={(e) => handleDelete(e, session.id)}
                  className="p-0.5 rounded text-muted-foreground hover:text-destructive transition-colors"
                  title="Delete session"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
