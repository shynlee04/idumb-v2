import { Link, useNavigate } from "react-router-dom"
import { MessageSquare, Plus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useCreateSession, useSessions } from "@/hooks/useEngine"

function relativeTime(timestamp?: number): string {
  if (!timestamp) return ""
  const diffMins = Math.round((Date.now() - timestamp) / 60000)
  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffMins < 60 * 24) return `${Math.round(diffMins / 60)}h ago`
  return `${Math.round(diffMins / (60 * 24))}d ago`
}

export function RecentSessionsCard() {
  const navigate = useNavigate()
  const { data: sessions = [] } = useSessions()
  const createSession = useCreateSession()

  const sorted = [...sessions].sort((left, right) => (right.time?.updated ?? 0) - (left.time?.updated ?? 0))
  const preview = sorted.slice(0, 5)

  const onQuickStart = () => {
    createSession.mutate(undefined, {
      onSuccess: (session) => navigate(`/chat/${session.id}`),
    })
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="inline-flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Recent Conversations
          </span>
          <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-200">{sessions.length}</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-2">
        {preview.length === 0 ? (
          <p className="text-xs text-muted-foreground">No sessions yet.</p>
        ) : (
          preview.map((session) => (
            <Link
              key={session.id}
              to={`/chat/${session.id}`}
              className="block rounded bg-zinc-900/70 px-2 py-1 text-xs hover:bg-zinc-800"
            >
              <p className="truncate font-medium">{session.title || session.id.slice(0, 8)}</p>
              <p className="text-muted-foreground">{relativeTime(session.time?.updated ?? session.time?.created)}</p>
            </Link>
          ))
        )}

        <Button size="sm" variant="outline" className="w-full" onClick={onQuickStart}>
          <Plus className="mr-2 h-4 w-4" />
          New Chat
        </Button>
      </CardContent>
    </Card>
  )
}
