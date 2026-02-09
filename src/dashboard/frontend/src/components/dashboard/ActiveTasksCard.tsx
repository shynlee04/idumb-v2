import { Link } from "react-router-dom"
import { CheckSquare } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTasks } from "@/hooks/useTasks"

export function ActiveTasksCard() {
  const { data } = useTasks()

  const all = Array.isArray(data?.tasks) ? data.tasks : []
  const active = all.filter((task) => ["active", "blocked", "review", "planned"].includes(task.status))
  const preview = active.slice(0, 3)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="inline-flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Active Tasks
          </span>
          <span className="rounded bg-sky-500/20 px-2 py-0.5 text-xs text-sky-200">{active.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {preview.length === 0 ? (
          <p className="text-xs text-muted-foreground">No active tasks.</p>
        ) : (
          preview.map((task) => (
            <div key={task.id} className="rounded bg-zinc-900/70 px-2 py-1 text-xs">
              <p className="truncate font-medium">{task.name}</p>
              <p className="text-muted-foreground">{task.status}</p>
            </div>
          ))
        )}

        <Link to="/tasks" className="inline-block text-xs text-sky-300 hover:text-sky-200">
          View all →
        </Link>
      </CardContent>
    </Card>
  )
}
