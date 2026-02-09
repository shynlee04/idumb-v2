import { CheckCircle2, Clock3, Lock, XCircle } from "lucide-react"
import type { TaskNode } from "@/lib/api"
import { cn } from "@/lib/utils"

interface TaskCardProps {
  task: TaskNode
  isActive: boolean
  onClick: () => void
}

function statusMeta(status: TaskNode["status"]) {
  switch (status) {
    case "active":
      return { label: "in progress", className: "text-blue-300 bg-blue-500/10", icon: Clock3 }
    case "completed":
      return { label: "completed", className: "text-emerald-300 bg-emerald-500/10", icon: CheckCircle2 }
    case "failed":
      return { label: "failed", className: "text-red-300 bg-red-500/10", icon: XCircle }
    case "blocked":
      return { label: "blocked", className: "text-amber-300 bg-amber-500/10", icon: Lock }
    case "review":
      return { label: "review", className: "text-indigo-300 bg-indigo-500/10", icon: Clock3 }
    default:
      return { label: "planned", className: "text-zinc-300 bg-zinc-500/10", icon: Clock3 }
  }
}

function relative(ts?: number): string {
  if (!ts) return "pending"
  const minutes = Math.floor((Date.now() - ts) / 60_000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function TaskCard({ task, isActive, onClick }: TaskCardProps) {
  const meta = statusMeta(task.status)
  const Icon = meta.icon

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-md border border-border px-3 py-2 text-left transition",
        "hover:bg-zinc-900/60",
        isActive ? "border-blue-500/60 bg-blue-500/10" : "bg-zinc-950/40",
      )}
    >
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-100">{task.name}</p>
          <p className="mt-1 text-xs text-zinc-500">Expected: {task.expectedOutput}</p>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className={cn("rounded px-2 py-0.5 text-[10px] uppercase tracking-wide", meta.className)}>
          {meta.label}
        </span>
        <span className="text-[10px] uppercase tracking-wide text-zinc-500">
          {task.completedAt ? `done ${relative(task.completedAt)}` : `updated ${relative(task.modifiedAt)}`}
        </span>
      </div>
    </button>
  )
}
