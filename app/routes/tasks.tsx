/**
 * Tasks route — task management interface.
 *
 * URL: /tasks (and /tasks/$taskId)
 * Stub: will be fleshed out in Plan 05-02 (component migration).
 */

import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/tasks")({
  component: TasksPage,
})

function TasksPage() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Tasks</h1>
        <p className="text-muted-foreground">
          Task management interface
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Stub — will be replaced with full TasksPage in Plan 05-02
        </p>
      </div>
    </div>
  )
}
