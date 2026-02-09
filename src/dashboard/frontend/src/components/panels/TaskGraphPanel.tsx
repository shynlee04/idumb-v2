/**
 * Task Graph Panel — Displays WorkPlan→TaskNode tree (v3 schema)
 *
 * Fetches from /api/graph and renders the live task graph.
 * Updates in real-time via WebSocket-triggered query invalidation.
 */

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Panel } from "../layout/Panel"
import {
  ChevronDown,
  ChevronRight,
  Circle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  PlayCircle,
  Pause,
  GitBranch,
} from "lucide-react"

// ─── Inline types (mirrors work-plan.ts shapes) ──────────────────────

interface TaskNodeData {
  id: string
  name: string
  status: "planned" | "blocked" | "active" | "review" | "completed" | "failed"
  assignedTo?: string
  delegatedBy?: string
  dependsOn?: string[]
  startedAt?: number
  completedAt?: number
  result?: { evidence?: string }
  checkpoints?: Array<{ id: string; tool: string; summary: string }>
  artifacts?: string[]
}

interface WorkPlanData {
  id: string
  name: string
  status: "draft" | "active" | "completed" | "archived" | "abandoned"
  createdAt: number
  completedAt?: number
  tasks: TaskNodeData[]
}

interface TaskGraphData {
  version: string
  activeWorkPlanId: string | null
  workPlans: WorkPlanData[]
}

// ─── Status rendering ────────────────────────────────────────────────

function getStatusIcon(status: string) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />
    case "active":
      return <PlayCircle className="h-4 w-4 text-blue-500 animate-pulse" />
    case "blocked":
      return <AlertTriangle className="h-4 w-4 text-red-500" />
    case "planned":
      return <Clock className="h-4 w-4 text-gray-400" />
    case "review":
      return <Pause className="h-4 w-4 text-yellow-500" />
    case "failed":
      return <XCircle className="h-4 w-4 text-red-600" />
    case "draft":
      return <Circle className="h-4 w-4 text-gray-300" />
    case "archived":
      return <Circle className="h-4 w-4 text-gray-400" />
    case "abandoned":
      return <XCircle className="h-4 w-4 text-gray-500" />
    default:
      return <Circle className="h-4 w-4 text-gray-300" />
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "completed": return "text-green-500"
    case "active": return "text-blue-500"
    case "blocked": return "text-red-500"
    case "planned": return "text-gray-400"
    case "review": return "text-yellow-500"
    case "failed": return "text-red-600"
    default: return "text-gray-400"
  }
}

function formatTime(ts?: number) {
  if (!ts) return ""
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

// ─── TaskNode Item ───────────────────────────────────────────────────

function TaskNodeItem({
  task,
  allTasks,
}: {
  task: TaskNodeData
  allTasks: TaskNodeData[]
}) {
  const deps = (task.dependsOn ?? [])
    .map(id => allTasks.find(t => t.id === id)?.name ?? id.slice(0, 8))

  return (
    <div className="flex items-start gap-2 py-1.5 pl-4 border-l-2 border-muted">
      {getStatusIcon(task.status)}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{task.name}</span>
          <span className={`text-xs ${getStatusColor(task.status)}`}>
            {task.status}
          </span>
        </div>

        {/* Metadata row */}
        <div className="flex flex-wrap gap-2 mt-0.5">
          {task.assignedTo && (
            <span className="text-xs text-muted-foreground">
              → {task.assignedTo}
            </span>
          )}
          {deps.length > 0 && (
            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
              <GitBranch className="h-3 w-3" />
              {deps.join(", ")}
            </span>
          )}
          {task.startedAt && (
            <span className="text-xs text-muted-foreground">
              started {formatTime(task.startedAt)}
            </span>
          )}
          {task.completedAt && (
            <span className="text-xs text-muted-foreground">
              done {formatTime(task.completedAt)}
            </span>
          )}
        </div>

        {/* Evidence */}
        {task.result?.evidence && (
          <p className="text-xs text-green-600 mt-1 truncate">
            ✓ {task.result.evidence}
          </p>
        )}

        {/* Checkpoints */}
        {(task.checkpoints ?? []).length > 0 && (
          <div className="text-xs text-muted-foreground mt-1">
            {task.checkpoints!.length} checkpoint{task.checkpoints!.length > 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── WorkPlan Item ───────────────────────────────────────────────────

function WorkPlanItem({
  plan,
  isActive,
}: {
  plan: WorkPlanData
  isActive: boolean
}) {
  const [expanded, setExpanded] = useState(true)
  const completedTasks = plan.tasks.filter(t => t.status === "completed").length
  const totalTasks = plan.tasks.length
  const activeTasks = plan.tasks.filter(t => t.status === "active").length

  return (
    <div className={`mb-3 rounded-lg ${isActive ? "ring-1 ring-blue-500/40" : ""}`}>
      <div
        className="flex cursor-pointer items-center gap-2 rounded-lg bg-muted/30 p-2 hover:bg-muted/50"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded
          ? <ChevronDown className="h-4 w-4" />
          : <ChevronRight className="h-4 w-4" />
        }
        {getStatusIcon(plan.status)}
        <span className="flex-1 font-semibold text-sm">{plan.name}</span>
        {isActive && (
          <span className="text-xs rounded bg-blue-500/10 text-blue-500 border border-blue-500/20 px-1.5 py-0.5">
            active
          </span>
        )}
        {activeTasks > 0 && (
          <span className="text-xs text-blue-500 animate-pulse">
            {activeTasks} running
          </span>
        )}
        <span className="text-xs text-muted-foreground">
          {completedTasks}/{totalTasks}
        </span>
      </div>

      {expanded && (
        <div className="mt-1 pl-2">
          {plan.tasks.map(task => (
            <TaskNodeItem
              key={task.id}
              task={task}
              allTasks={plan.tasks}
            />
          ))}
          {totalTasks === 0 && (
            <p className="py-2 pl-4 text-xs text-muted-foreground">No tasks yet</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Panel ──────────────────────────────────────────────────────

export function TaskGraphPanel() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["graph"],
    queryFn: async (): Promise<TaskGraphData | null> => {
      const res = await fetch("/api/graph")
      if (!res.ok) throw new Error("Failed to fetch graph")
      const json = await res.json()
      return json.graph
    },
  })

  const totalPlans = data?.workPlans?.length ?? 0
  const totalTasks = data?.workPlans?.reduce((sum, p) => sum + p.tasks.length, 0) ?? 0

  return (
    <Panel
      title="Task Graph"
      badge={totalPlans > 0 ? `${totalPlans} plan${totalPlans > 1 ? "s" : ""} · ${totalTasks} task${totalTasks > 1 ? "s" : ""}` : undefined}
    >
      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading task graph...</p>
      )}

      {error && (
        <p className="text-sm text-destructive">Failed to load task graph</p>
      )}

      {!isLoading && !error && (!data || totalPlans === 0) && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">No work plans found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Use tasks_start to create one
          </p>
        </div>
      )}

      {!isLoading && !error && data && totalPlans > 0 && (
        <div className="space-y-1">
          {data.workPlans.map(plan => (
            <WorkPlanItem
              key={plan.id}
              plan={plan}
              isActive={plan.id === data.activeWorkPlanId}
            />
          ))}
        </div>
      )}
    </Panel>
  )
}
