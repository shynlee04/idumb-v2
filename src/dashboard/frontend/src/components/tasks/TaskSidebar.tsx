import { useMemo, useState } from "react"
import type { TaskNode, TasksSnapshot } from "@/lib/api"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TaskCard } from "@/components/tasks/TaskCard"

interface TaskSidebarProps {
  snapshot: TasksSnapshot | undefined
  selectedTaskId?: string
  onSelectTask: (taskId: string) => void
}

type TaskFilter = "active" | "completed" | "all"

function applyFilter(tasks: TaskNode[], filter: TaskFilter): TaskNode[] {
  if (filter === "all") return tasks
  if (filter === "completed") return tasks.filter((task) => task.status === "completed")
  return tasks.filter((task) => task.status === "active" || task.status === "planned" || task.status === "blocked" || task.status === "review")
}

export function TaskSidebar({ snapshot, selectedTaskId, onSelectTask }: TaskSidebarProps) {
  const [filter, setFilter] = useState<TaskFilter>("active")
  const tasks = Array.isArray(snapshot?.tasks) ? snapshot.tasks : []

  const visibleTasks = useMemo(() => applyFilter(tasks, filter), [tasks, filter])

  return (
    <div className="flex h-full flex-col border-r border-border bg-zinc-950/30">
      <div className="border-b border-border px-3 py-3">
        <h2 className="text-sm font-semibold text-zinc-100">
          {snapshot?.workPlan ? snapshot.workPlan.name : "Tasks"}
        </h2>
        <p className="text-xs text-zinc-500">{visibleTasks.length} visible</p>

        <div className="mt-3 flex gap-1">
          {(["active", "completed", "all"] as const).map((option) => (
            <button
              key={option}
              type="button"
              className={`rounded px-2 py-1 text-[11px] uppercase tracking-wide ${
                filter === option
                  ? "bg-blue-500/20 text-blue-200"
                  : "bg-zinc-800/60 text-zinc-400 hover:bg-zinc-700/60"
              }`}
              onClick={() => setFilter(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1 p-2">
        {visibleTasks.length === 0 ? (
          <div className="rounded border border-dashed border-border p-3 text-xs text-zinc-500">
            No tasks for this filter. Start one in chat.
          </div>
        ) : (
          <div className="space-y-2">
            {visibleTasks.map((task) => (
              <div key={task.id} style={{ marginLeft: `${Math.min(task.dependsOn.length, 2) * 8}px` }}>
                <TaskCard
                  task={task}
                  isActive={task.id === selectedTaskId}
                  onClick={() => onSelectTask(task.id)}
                />
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
