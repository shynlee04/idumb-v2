/**
 * idumb_task — Minimal task management tool
 * 
 * Responsibility: Create and list active tasks for governance tracking.
 * The stop hook (tool-gate) requires an active task before allowing writes.
 * 
 * P7: Single-purpose tool — just task CRUD, nothing else
 * DON'T #11: Tool must be selected NATURALLY based on description alone
 */

import { tool } from "@opencode-ai/plugin/tool"
import { setActiveTask, getActiveTask } from "../hooks/index.js"

export const idumb_task = tool({
  description: "Manage governance tasks. Create a task before writing files — file writes are blocked without an active task. Actions: 'create' (set active task), 'complete' (clear active task), 'status' (show current task).",
  args: {
    action: tool.schema.enum(["create", "complete", "status"]).describe(
      "Action to perform: 'create' to set active task, 'complete' to finish it, 'status' to check current"
    ),
    name: tool.schema.string().optional().describe(
      "Task name (required for 'create' action)"
    ),
  },
  async execute(args, context) {
    const { action, name } = args
    const { sessionID } = context

    switch (action) {
      case "create": {
        if (!name) {
          return "ERROR: Task name is required for 'create' action. Call again with a name."
        }
        const id = `task-${Date.now()}`
        setActiveTask(sessionID, { id, name })
        return [
          `Task created and active.`,
          `  ID: ${id}`,
          `  Name: ${name}`,
          ``,
          `You may now proceed with file writes. The task will track your changes.`,
        ].join("\n")
      }

      case "complete": {
        const current = getActiveTask(sessionID)
        if (!current) {
          return "No active task to complete."
        }
        const completedName = current.name
        setActiveTask(sessionID, null)
        return `Task "${completedName}" completed. File writes are now blocked until a new task is created.`
      }

      case "status": {
        const task = getActiveTask(sessionID)
        if (!task) {
          return "No active task. Create one with action 'create' before writing files."
        }
        return `Active task: "${task.name}" (ID: ${task.id})`
      }

      default:
        return `Unknown action: ${action}. Valid actions: create, complete, status.`
    }
  },
})
