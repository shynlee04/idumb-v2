import type { TaskNode } from "@/lib/api"

interface TaskDetailPanelProps {
  task: TaskNode | null
}

function formatTimestamp(ts?: number): string {
  if (!ts) return "—"
  return new Date(ts).toLocaleString()
}

export function TaskDetailPanel({ task }: TaskDetailPanelProps) {
  if (!task) {
    return (
      <div className="flex h-full items-center justify-center text-center">
        <div>
          <p className="text-sm text-zinc-300">Select a task from the sidebar</p>
          <p className="mt-1 text-xs text-zinc-500">Task details, dependencies, and evidence appear here.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-zinc-100">{task.name}</h2>
        <p className="text-sm text-zinc-400">Expected output: {task.expectedOutput}</p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded border border-border bg-zinc-950/30 p-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Status</p>
          <p className="mt-1 text-sm text-zinc-200">{task.status}</p>
        </div>
        <div className="rounded border border-border bg-zinc-950/30 p-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Assigned</p>
          <p className="mt-1 text-sm text-zinc-200">{task.assignedTo}</p>
        </div>
      </div>

      <div className="mt-4 rounded border border-border bg-zinc-950/30 p-3">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Dependencies</p>
        {task.dependsOn.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-400">No dependencies</p>
        ) : (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-300">
            {task.dependsOn.map((dependency) => (
              <li key={dependency}>{dependency}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 rounded border border-border bg-zinc-950/30 p-3">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Checkpoints</p>
        {task.checkpoints.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-400">No checkpoints yet</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {task.checkpoints.map((checkpoint) => (
              <li key={checkpoint.id} className="rounded border border-border/70 bg-zinc-900/40 p-2">
                <p className="text-xs uppercase tracking-wide text-zinc-500">{checkpoint.tool}</p>
                <p className="mt-1 text-sm text-zinc-200">{checkpoint.summary}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 rounded border border-border bg-zinc-950/30 p-3">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Timeline</p>
        <div className="mt-2 grid gap-1 text-sm text-zinc-300">
          <p>Created: {formatTimestamp(task.createdAt)}</p>
          <p>Started: {formatTimestamp(task.startedAt)}</p>
          <p>Completed: {formatTimestamp(task.completedAt)}</p>
        </div>
      </div>

      {task.result ? (
        <div className="mt-4 rounded border border-emerald-500/30 bg-emerald-500/10 p-3">
          <p className="text-xs uppercase tracking-wide text-emerald-200">Evidence</p>
          <p className="mt-1 text-sm text-emerald-100">{task.result.evidence}</p>
        </div>
      ) : null}
    </div>
  )
}
