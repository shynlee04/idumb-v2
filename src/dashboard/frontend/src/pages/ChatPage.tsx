import { useMemo } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { MessageSquare, Plus, Trash2 } from "lucide-react"
import { useCreateSession, useDeleteSession, useSessions } from "@/hooks/useEngine"
import { useMessages } from "@/hooks/useSession"
import { useStreaming } from "@/hooks/useStreaming"
import { MessageList } from "@/components/chat/MessageList"
import { InputBar } from "@/components/chat/InputBar"
import { DelegationThread } from "@/components/chat/DelegationThread"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return "just now"
  if (diffMin < 60) return `${diffMin}m`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h`
  return `${Math.floor(diffHr / 24)}d`
}

export function ChatPage() {
  const navigate = useNavigate()
  const { sessionId } = useParams<{ sessionId: string }>()

  const { data: sessions = [], isLoading: sessionsLoading } = useSessions()
  const { data: messages = [], refetch: refetchMessages, isLoading: messagesLoading, isError: messagesError } = useMessages(sessionId)
  const createSession = useCreateSession()
  const deleteSession = useDeleteSession()
  const streaming = useStreaming(sessionId)

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => b.time.updated - a.time.updated),
    [sessions],
  )

  const onSend = async (text: string) => {
    await streaming.sendPrompt(text)
    await refetchMessages()
  }

  const onNewChat = () => {
    createSession.mutate(undefined, {
      onSuccess: (session) => navigate(`/chat/${session.id}`),
    })
  }

  const onDelete = (event: React.MouseEvent, id: string) => {
    event.stopPropagation()
    deleteSession.mutate(id, {
      onSuccess: () => {
        if (sessionId === id) navigate("/chat")
      },
    })
  }

  return (
    <div className="flex h-full">
      <aside className="flex h-full w-72 flex-col border-r border-border bg-zinc-950/50">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-3">
          <div>
            <h2 className="text-sm font-semibold">Conversations</h2>
            <p className="text-xs text-muted-foreground">{sortedSessions.length} sessions</p>
          </div>
          <Button size="icon" variant="ghost" onClick={onNewChat} title="New chat">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-1 p-2">
            {sessionsLoading ? (
              <p className="px-2 py-3 text-xs text-muted-foreground">Loading sessions...</p>
            ) : null}

            {!sessionsLoading && sortedSessions.length === 0 ? (
              <p className="px-2 py-3 text-xs text-muted-foreground">
                No sessions yet. Create one to start chatting.
              </p>
            ) : null}

            {sortedSessions.map((session) => (
              <button
                key={session.id}
                type="button"
                className={cn(
                  "group flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors",
                  sessionId === session.id
                    ? "bg-blue-500/15 text-zinc-100"
                    : "text-zinc-300 hover:bg-zinc-800/60",
                )}
                onClick={() => navigate(`/chat/${session.id}`)}
              >
                <MessageSquare className="h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{session.title || session.id}</p>
                  <p className="text-xs text-zinc-500">{formatRelativeTime(session.time.updated)}</p>
                </div>
                <span
                  role="button"
                  tabIndex={-1}
                  className="rounded p-1 text-zinc-500 opacity-0 transition group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-300"
                  onClick={(event) => onDelete(event, session.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        {sessionId ? (
          <>
            <div className="border-b border-border px-4 py-2">
              <h1 className="text-sm font-semibold">Session {sessionId.slice(0, 8)}</h1>
              {streaming.error ? (
                <p className="mt-1 text-xs text-red-300">{streaming.error}</p>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 flex flex-col">
              {messagesError ? (
                <div className="flex flex-1 items-center justify-center">
                  <p className="text-sm text-red-300">Failed to load messages. Check engine connection.</p>
                </div>
              ) : messagesLoading ? (
                <div className="flex flex-1 items-center justify-center">
                  <p className="text-sm text-muted-foreground">Loading messages...</p>
                </div>
              ) : (
                <MessageList
                  messages={messages}
                  streamingParts={streaming.parts}
                  isStreaming={streaming.isStreaming}
                />
              )}
              <div className="shrink-0 border-t border-border px-4 py-2 max-h-40 overflow-y-auto">
                <p className="mb-2 text-[11px] uppercase tracking-wide text-zinc-500">Delegation thread</p>
                <DelegationThread sessionId={sessionId} />
              </div>
            </div>
            <InputBar
              onSend={onSend}
              onAbort={() => {
                void streaming.abort()
              }}
              isStreaming={streaming.isStreaming}
            />
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <MessageSquare className="mx-auto h-10 w-10 text-zinc-600" />
              <p className="mt-3 text-sm text-zinc-300">Start a new conversation</p>
              <p className="mt-1 text-xs text-zinc-500">
                Create a chat session and stream structured agent output.
              </p>
              <Button className="mt-4" onClick={onNewChat}>
                <Plus className="mr-2 h-4 w-4" />
                New Chat
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
