/**
 * TasksPage — Task management placeholder.
 *
 * Shows task count from governance API. Full task management
 * will be implemented in a later plan.
 */

import { CheckSquare } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export function TasksPage() {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["governance", "tasks"],
    queryFn: api.getTasks,
    retry: 1,
    meta: { silent: true },
  })

  const taskCount = tasks?.length ?? 0

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Governance task tracking and management
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Task Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading tasks...</p>
          ) : (
            <div className="flex items-center gap-3">
              <CheckSquare className="h-8 w-8 text-muted-foreground/50" />
              <div>
                <div className="text-2xl font-bold">{taskCount}</div>
                <p className="text-xs text-muted-foreground">
                  {taskCount === 0
                    ? "No tasks tracked yet"
                    : `${taskCount} task${taskCount !== 1 ? "s" : ""} in governance`}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-center rounded-lg border border-dashed border-border p-12">
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Task management coming soon
          </p>
          <p className="text-xs text-muted-foreground/70">
            Full task graph visualization and lifecycle management will be added in a future plan.
          </p>
        </div>
      </div>
    </div>
  )
}
