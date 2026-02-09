/**
 * DashboardPage — Landing page with overview cards.
 *
 * Shows active tasks count, recent conversations count, and project health grade.
 * Fetches real data from engine status and sessions hooks.
 */

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { useEngineStatus, useSessions } from "@/hooks/useEngine"
import { api } from "@/lib/api"
import { useQuery } from "@tanstack/react-query"

export function DashboardPage() {
  const { data: engine } = useEngineStatus()
  const { data: sessions } = useSessions()
  const { data: tasks } = useQuery({
    queryKey: ["governance", "tasks"],
    queryFn: api.getTasks,
    retry: 1,
    meta: { silent: true },
  })

  const sessionCount = sessions?.length ?? 0
  const taskCount = tasks?.length ?? 0
  const engineUp = engine?.running ?? false

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of your knowledge work platform
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Active Tasks */}
        <Card>
          <CardHeader>
            <CardTitle>Active Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{taskCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {taskCount === 0 ? "No active tasks" : `${taskCount} task${taskCount !== 1 ? "s" : ""} tracked`}
            </p>
          </CardContent>
        </Card>

        {/* Recent Conversations */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{sessionCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {sessionCount === 0 ? "No sessions yet" : `${sessionCount} session${sessionCount !== 1 ? "s" : ""}`}
            </p>
          </CardContent>
        </Card>

        {/* Project Health */}
        <Card>
          <CardHeader>
            <CardTitle>Project Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {engineUp ? (
                <span className="text-governance-allow">Online</span>
              ) : (
                <span className="text-governance-block">Offline</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Engine {engineUp ? "connected" : "not reachable"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
