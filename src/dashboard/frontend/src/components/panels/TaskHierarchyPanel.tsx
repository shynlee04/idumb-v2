/**
 * Task Hierarchy Panel — Displays Epic/Task/Subtask tree
 */

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Panel } from "../layout/Panel"
import { ChevronDown, ChevronRight, Circle, CheckCircle2, Clock, AlertTriangle, XCircle } from "lucide-react"
import type { TaskStore, TaskEpic, Task, Subtask, EpicStatus, TaskStatus, SubtaskStatus } from "@shared/schema-types"

// Combined status type for icon rendering
type StatusForIcon = EpicStatus | TaskStatus | SubtaskStatus

// Status icons mapping
function getStatusIcon(status: StatusForIcon) {
  switch (status) {
    case "completed":
    case "done":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />
    case "active":
      return <Clock className="h-4 w-4 text-blue-500" />
    case "blocked":
      return <AlertTriangle className="h-4 w-4 text-red-500" />
    case "deferred":
      return <Circle className="h-4 w-4 text-yellow-500" />
    case "abandoned":
      return <XCircle className="h-4 w-4 text-gray-500" />
    case "skipped":
      return <XCircle className="h-4 w-4 text-gray-400" />
    default:
      return <Circle className="h-4 w-4 text-gray-300" />
  }
}

// Category colors
function getCategoryColor(category: string) {
  switch (category) {
    case "development":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20"
    case "research":
      return "bg-purple-500/10 text-purple-500 border-purple-500/20"
    case "governance":
      return "bg-green-500/10 text-green-500 border-green-500/20"
    case "maintenance":
      return "bg-orange-500/10 text-orange-500 border-orange-500/20"
    case "spec-kit":
      return "bg-cyan-500/10 text-cyan-500 border-cyan-500/20"
    case "ad-hoc":
      return "bg-gray-500/10 text-gray-500 border-gray-500/20"
    default:
      return "bg-gray-500/10 text-gray-500 border-gray-500/20"
  }
}

// Subtask Item Component
function SubtaskItem({ subtask }: { subtask: Subtask }) {
  return (
    <div className="flex items-center gap-2 py-1 pl-6 text-sm">
      {getStatusIcon(subtask.status)}
      <span className="flex-1">{subtask.name}</span>
      {subtask.toolUsed && (
        <span className="text-xs text-muted-foreground">via {subtask.toolUsed}</span>
      )}
    </div>
  )
}

// Task Item Component
function TaskItem({ task, expanded, onToggle }: { task: Task; expanded: boolean; onToggle: () => void }) {
  const completedSubtasks = task.subtasks?.filter(s => s.status === "done").length ?? 0
  const totalSubtasks = task.subtasks?.length ?? 0

  // Safely extract assignee name — can be string or object
  const assigneeName = task.assignee
    ? typeof task.assignee === "string"
      ? task.assignee
      : (task.assignee as { name?: string }).name ?? "assigned"
    : null

  return (
    <div className="border-l-2 border-muted pl-2">
      <div
        className="flex cursor-pointer items-center gap-2 py-1 rounded"
        onClick={onToggle}
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {getStatusIcon(task.status)}
        <span className="flex-1 text-sm font-medium">{task.name}</span>
        {assigneeName && (
          <span className="text-xs rounded bg-primary px-2 py-1 text-primary-foreground">
            {assigneeName}
          </span>
        )}
        {totalSubtasks > 0 && (
          <span className="text-xs text-muted-foreground">
            {completedSubtasks}/{totalSubtasks}
          </span>
        )}
      </div>

      {expanded && (
        <div className="mt-1">
          {(task.subtasks ?? []).map((subtask) => (
            <SubtaskItem key={subtask.id} subtask={subtask} />
          ))}
          {totalSubtasks === 0 && (
            <p className="py-1 pl-6 text-xs text-muted-foreground">No subtasks</p>
          )}
        </div>
      )}
    </div>
  )
}

// Epic Item Component
function EpicItem({ epic }: { epic: TaskEpic }) {
  const [expanded, setExpanded] = useState(true)
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())

  const completedTasks = epic.tasks.filter(t => t.status === "completed").length
  const totalTasks = epic.tasks.length

  const toggleTask = (taskId: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }

  return (
    <div className="mb-4">
      <div
        className="flex cursor-pointer items-center gap-2 rounded-lg bg-muted/30 p-2 hover:bg-muted/50"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {getStatusIcon(epic.status)}
        <span className="flex-1 font-semibold">{epic.name}</span>
        <span className={`text-xs rounded border px-1.5 py-0.5 ${getCategoryColor(epic.category)}`}>
          {epic.category}
        </span>
        <span className="text-xs text-muted-foreground">
          {completedTasks}/{totalTasks}
        </span>
      </div>

      {expanded && (
        <div className="mt-2 pl-2">
          {epic.tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              expanded={expandedTasks.has(task.id)}
              onToggle={() => toggleTask(task.id)}
            />
          ))}
          {totalTasks === 0 && (
            <p className="py-2 pl-4 text-sm text-muted-foreground">No tasks yet</p>
          )}
        </div>
      )}
    </div>
  )
}

export function TaskHierarchyPanel() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["tasks"],
    queryFn: async (): Promise<TaskStore | null> => {
      const res = await fetch("/api/tasks")
      if (!res.ok) throw new Error("Failed to fetch tasks")
      const json = await res.json()
      return json.tasks
    },
  })

  return (
    <Panel title="Task Hierarchy" badge={data ? `${data.epics.length} epics` : undefined}>
      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading tasks...</p>
      )}

      {error && (
        <p className="text-sm text-destructive">Failed to load tasks</p>
      )}

      {!isLoading && !error && (!data || data.epics.length === 0) && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">No epics found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Create one with: govern_plan action=create
          </p>
        </div>
      )}

      {!isLoading && !error && data && (
        <div className="space-y-1">
          {data.epics.map((epic) => (
            <EpicItem key={epic.id} epic={epic} />
          ))}
        </div>
      )}
    </Panel>
  )
}
