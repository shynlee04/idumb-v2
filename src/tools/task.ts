/**
 * idumb_task — Smart governance-aware TODO tool.
 *
 * 3-level hierarchy: Epic → Task → Subtask
 * 12 actions with 6 edge-case mechanisms per MASTER-PLAN-2026-02-07.
 *
 * P7: Single-purpose tool — task hierarchy CRUD + governance enforcement
 * DON'T #11: Tool must be selected NATURALLY based on description alone
 *
 * Edge-Case Mechanisms:
 * 1. Argument validation with helpful errors + examples
 * 2. Prerequisite enforcement (no task without epic, no complete without evidence)
 * 3. State reminders footer on every response
 * 4. Wrong-argument hints with exact corrected commands
 * 5. Stale task warnings for inactive tasks
 * 6. Completion chain validation blocking completion with pending subtasks
 */

import { tool } from "@opencode-ai/plugin/tool"
import { stateManager } from "../lib/persistence.js"
import {
  createEpic, createTask, createSubtask,
  findEpic, findTask, findSubtask, findParentTask, findParentEpic,
  getActiveChain, validateCompletion, findStaleTasks,
  detectChainBreaks, formatTaskTree, buildGovernanceReminder,
  SESSION_STALE_MS,
} from "../schemas/task.js"
import type { TaskStore } from "../schemas/task.js"

// ─── Helpers ─────────────────────────────────────────────────────────

/** Mutate the store in-place and persist */
function commitStore(store: TaskStore): void {
  stateManager.setTaskStore(store)
}

/** Detect if a target_id refers to an epic, task, or subtask */
function identifyTarget(store: TaskStore, targetId: string): "epic" | "task" | "subtask" | null {
  if (findEpic(store, targetId)) return "epic"
  if (findTask(store, targetId)) return "task"
  if (findSubtask(store, targetId)) return "subtask"
  return null
}

/** Build stale warnings if applicable */
function staleWarnings(store: TaskStore): string {
  const stale = findStaleTasks(store, SESSION_STALE_MS)
  if (stale.length === 0) return ""
  return "\n" + stale.map(t => {
    const elapsed = Math.round((Date.now() - t.modifiedAt) / (60 * 1000))
    return [
      `⚠️ STALE WARNING: Task "${t.name}" active for ${elapsed} min with no subtask progress.`,
      `  - Add subtask: idumb_task action=add_subtask task_id=${t.id} name="..."`,
      `  - Complete: idumb_task action=complete target_id=${t.id} evidence="..."`,
      `  - Defer: idumb_task action=defer target_id=${t.id} reason="..."`,
    ].join("\n")
  }).join("\n")
}

/** Every response includes governance footer + stale warnings + chain breaks */
function responseFooter(store: TaskStore): string {
  const parts: string[] = []

  const stale = staleWarnings(store)
  if (stale) parts.push(stale)

  const breaks = detectChainBreaks(store)
  if (breaks.length > 0) {
    parts.push("\n⛓ Chain Warnings:\n" + breaks.map(b => `  - ${b.message}`).join("\n"))
  }

  parts.push("\n" + buildGovernanceReminder(store))
  return parts.join("")
}

// ─── Tool Definition ─────────────────────────────────────────────────

export const idumb_task = tool({
  description: "Manage governance tasks (Epic→Task→Subtask hierarchy). Create epics and tasks before writing files — writes blocked without active task. Actions: create_epic, create_task, add_subtask, assign, start, complete, defer, abandon, status, list, update, branch.",
  args: {
    action: tool.schema.enum([
      "create_epic", "create_task", "add_subtask",
      "assign", "start", "complete",
      "defer", "abandon",
      "status", "list", "update", "branch",
    ]).describe("Action to perform on the task hierarchy"),
    name: tool.schema.string().optional().describe(
      "Name (required for: create_epic, create_task, add_subtask)"
    ),
    task_id: tool.schema.string().optional().describe(
      "Task ID (required for: add_subtask, assign, start, branch)"
    ),
    target_id: tool.schema.string().optional().describe(
      "Target ID — epic, task, or subtask (required for: complete, defer, abandon, update)"
    ),
    evidence: tool.schema.string().optional().describe(
      "Proof of completion (required for: complete on tasks)"
    ),
    assignee: tool.schema.string().optional().describe(
      "Agent name to assign (required for: assign)"
    ),
    reason: tool.schema.string().optional().describe(
      "Reason for deferring/abandoning (required for: defer, abandon)"
    ),
    branch_name: tool.schema.string().optional().describe(
      "Git branch name (for: branch — future use)"
    ),
  },
  async execute(args, context) {
    const { action } = args
    const store = stateManager.getTaskStore()

    switch (action) {
      // ─── CREATE EPIC ─────────────────────────────────────────────
      case "create_epic": {
        if (!args.name) {
          return "ERROR: 'name' is required for create_epic.\nExample: idumb_task action=create_epic name='Build authentication feature'"
        }

        // Warn if there's already an active epic
        const existingActive = store.activeEpicId
          ? findEpic(store, store.activeEpicId)
          : null

        const epic = createEpic(args.name)
        store.epics.push(epic)
        store.activeEpicId = epic.id
        commitStore(store)

        const warning = existingActive
          ? `\n⚠️ Previous active epic "${existingActive.name}" is no longer the active epic. It still exists and can be resumed.\n`
          : ""

        return [
          `Epic created and set as active.`,
          `  ID: ${epic.id}`,
          `  Name: ${epic.name}`,
          warning,
          `Next: Create tasks within this epic:`,
          `  idumb_task action=create_task name='Task description'`,
          responseFooter(store),
        ].join("\n")
      }

      // ─── CREATE TASK ─────────────────────────────────────────────
      case "create_task": {
        if (!args.name) {
          return "ERROR: 'name' is required for create_task.\nExample: idumb_task action=create_task name='Implement login form'"
        }

        const activeEpic = store.activeEpicId
          ? findEpic(store, store.activeEpicId)
          : null

        if (!activeEpic) {
          return [
            "ERROR: No active epic. You must create an epic first.",
            "  USE: idumb_task action=create_epic name='Build auth feature'",
            "  THEN: idumb_task action=create_task name='" + args.name + "'",
          ].join("\n")
        }

        const task = createTask(activeEpic.id, args.name)
        activeEpic.tasks.push(task)
        activeEpic.modifiedAt = Date.now()
        commitStore(store)

        return [
          `Task created in epic "${activeEpic.name}".`,
          `  ID: ${task.id}`,
          `  Name: ${task.name}`,
          `  Status: planned`,
          ``,
          `To start working on it: idumb_task action=start task_id=${task.id}`,
          responseFooter(store),
        ].join("\n")
      }

      // ─── ADD SUBTASK ─────────────────────────────────────────────
      case "add_subtask": {
        if (!args.name) {
          return "ERROR: 'name' is required for add_subtask.\nExample: idumb_task action=add_subtask task_id=task-123 name='Add email validation'"
        }
        if (!args.task_id) {
          // Try to use active task
          const chain = getActiveChain(store)
          if (!chain.task) {
            const allTasks = store.epics.flatMap(e => e.tasks)
            return [
              "ERROR: 'task_id' is required for add_subtask (no active task to default to).",
              allTasks.length > 0
                ? `Available tasks:\n${allTasks.map(t => `  - ${t.id}: "${t.name}" (${t.status})`).join("\n")}`
                : "No tasks exist. Create one first.",
              `Example: idumb_task action=add_subtask task_id=task-123 name='${args.name}'`,
            ].join("\n")
          }
          args.task_id = chain.task.id
        }

        const parentTask = findTask(store, args.task_id!)
        if (!parentTask) {
          const allTasks = store.epics.flatMap(e => e.tasks)
          return [
            `ERROR: Task "${args.task_id}" not found.`,
            allTasks.length > 0
              ? `Available tasks:\n${allTasks.map(t => `  - ${t.id}: "${t.name}" (${t.status})`).join("\n")}`
              : "No tasks exist.",
          ].join("\n")
        }

        const subtask = createSubtask(parentTask.id, args.name)
        parentTask.subtasks.push(subtask)
        parentTask.modifiedAt = Date.now()
        commitStore(store)

        return [
          `Subtask added to task "${parentTask.name}".`,
          `  ID: ${subtask.id}`,
          `  Name: ${subtask.name}`,
          responseFooter(store),
        ].join("\n")
      }

      // ─── ASSIGN ──────────────────────────────────────────────────
      case "assign": {
        if (!args.task_id) {
          return "ERROR: 'task_id' is required for assign.\nExample: idumb_task action=assign task_id=task-123 assignee='idumb-builder'"
        }
        if (!args.assignee) {
          return "ERROR: 'assignee' is required for assign.\nExample: idumb_task action=assign task_id=" + args.task_id + " assignee='idumb-builder'"
        }

        const task = findTask(store, args.task_id)
        if (!task) {
          const allTasks = store.epics.flatMap(e => e.tasks)
          return [
            `ERROR: Task "${args.task_id}" not found.`,
            allTasks.length > 0
              ? `Available tasks:\n${allTasks.map(t => `  - ${t.id}: "${t.name}"`).join("\n")}`
              : "No tasks exist.",
          ].join("\n")
        }

        task.assignee = args.assignee
        task.modifiedAt = Date.now()
        commitStore(store)

        return [
          `Task "${task.name}" assigned to ${args.assignee}.`,
          responseFooter(store),
        ].join("\n")
      }

      // ─── START ───────────────────────────────────────────────────
      case "start": {
        if (!args.task_id) {
          return "ERROR: 'task_id' is required for start.\nExample: idumb_task action=start task_id=task-123"
        }

        const task = findTask(store, args.task_id)
        if (!task) {
          const allTasks = store.epics.flatMap(e => e.tasks)
          return [
            `ERROR: Task "${args.task_id}" not found.`,
            allTasks.length > 0
              ? `Available tasks:\n${allTasks.map(t => `  - ${t.id}: "${t.name}" (${t.status})`).join("\n")}`
              : "No tasks exist.",
          ].join("\n")
        }

        // Warn if another task is already active in the same epic
        const parentEpic = findParentEpic(store, task.id)
        if (parentEpic) {
          const otherActive = parentEpic.tasks.find(
            t => t.status === "active" && t.id !== task.id
          )
          if (otherActive) {
            // Auto-revert the other to planned (or just warn)
            return [
              `⚠️ WARNING: Task "${otherActive.name}" is already active in this epic.`,
              `Starting "${task.name}" will set "${otherActive.name}" back to planned.`,
              `Proceeding...`,
              "",
            ].join("\n") + (() => {
              otherActive.status = "planned"
              otherActive.modifiedAt = Date.now()
              task.status = "active"
              task.modifiedAt = Date.now()

              // Bridge to old API: set active task in session state too
              stateManager.setActiveTask(context.sessionID, { id: task.id, name: task.name })
              commitStore(store)

              return [
                `Task "${task.name}" is now ACTIVE. File writes are enabled.`,
                responseFooter(store),
              ].join("\n")
            })()
          }
        }

        task.status = "active"
        task.modifiedAt = Date.now()

        // Bridge to old API: set active task in session state so tool-gate allows writes
        stateManager.setActiveTask(context.sessionID, { id: task.id, name: task.name })
        commitStore(store)

        return [
          `Task "${task.name}" is now ACTIVE. File writes are enabled.`,
          `  ID: ${task.id}`,
          `  Epic: ${parentEpic?.name ?? "unknown"}`,
          responseFooter(store),
        ].join("\n")
      }

      // ─── COMPLETE ────────────────────────────────────────────────
      case "complete": {
        if (!args.target_id) {
          return "ERROR: 'target_id' is required for complete.\nExample: idumb_task action=complete target_id=task-123 evidence='All tests passing'"
        }

        const targetType = identifyTarget(store, args.target_id)

        if (!targetType) {
          return `ERROR: Target "${args.target_id}" not found. Use 'idumb_task action=list' to see all items.`
        }

        // ── Complete a Subtask ──
        if (targetType === "subtask") {
          const subtask = findSubtask(store, args.target_id)!
          subtask.status = "done"
          subtask.timestamp = Date.now()
          if (args.evidence) {
            subtask.toolUsed = args.evidence
          }

          const parentTask = findParentTask(store, args.target_id)
          if (parentTask) {
            parentTask.modifiedAt = Date.now()
          }
          commitStore(store)

          return [
            `Subtask "${subtask.name}" marked as DONE.`,
            responseFooter(store),
          ].join("\n")
        }

        // ── Complete a Task ──
        if (targetType === "task") {
          const task = findTask(store, args.target_id)!

          // Mechanism 6: Chain validation — block if subtasks pending
          const validation = validateCompletion(task, args.evidence)
          if (!validation.valid) {
            return validation.reason
          }

          task.status = "completed"
          task.evidence = args.evidence!
          task.modifiedAt = Date.now()

          // Clear the session active task (writes re-blocked until next start)
          stateManager.setActiveTask(context.sessionID, null)
          commitStore(store)

          return [
            `Task "${task.name}" COMPLETED.`,
            `  Evidence: ${args.evidence}`,
            ``,
            `File writes are now blocked until a new task is started.`,
            responseFooter(store),
          ].join("\n")
        }

        // ── Complete an Epic ──
        if (targetType === "epic") {
          const epic = findEpic(store, args.target_id)!
          const pendingTasks = epic.tasks.filter(
            t => t.status !== "completed" && t.status !== "deferred"
          )
          if (pendingTasks.length > 0) {
            return [
              `BLOCKED: Epic has ${pendingTasks.length} incomplete task(s):`,
              ...pendingTasks.map(t => `  - ${t.id}: "${t.name}" (${t.status})`),
              `Complete or defer these tasks first.`,
            ].join("\n")
          }

          epic.status = "completed"
          epic.modifiedAt = Date.now()
          if (store.activeEpicId === epic.id) {
            store.activeEpicId = null
            stateManager.setActiveTask(context.sessionID, null)
          }
          commitStore(store)

          return [
            `Epic "${epic.name}" COMPLETED! 🎉`,
            `All tasks resolved. Active epic cleared.`,
            responseFooter(store),
          ].join("\n")
        }

        return `ERROR: Unexpected target type for "${args.target_id}".`
      }

      // ─── DEFER ───────────────────────────────────────────────────
      case "defer": {
        if (!args.target_id) {
          return "ERROR: 'target_id' is required for defer.\nExample: idumb_task action=defer target_id=task-123 reason='Blocked by API dependency'"
        }
        if (!args.reason) {
          return "ERROR: 'reason' is required for defer.\nExample: idumb_task action=defer target_id=" + args.target_id + " reason='Blocked by API dependency'"
        }

        const targetType = identifyTarget(store, args.target_id)
        if (!targetType) {
          return `ERROR: Target "${args.target_id}" not found.`
        }

        if (targetType === "task") {
          const task = findTask(store, args.target_id)!
          task.status = "deferred"
          task.evidence = `Deferred: ${args.reason}`
          task.modifiedAt = Date.now()

          if (stateManager.getActiveTask(context.sessionID)?.id === task.id) {
            stateManager.setActiveTask(context.sessionID, null)
          }
          commitStore(store)

          return [
            `Task "${task.name}" DEFERRED.`,
            `  Reason: ${args.reason}`,
            responseFooter(store),
          ].join("\n")
        }

        if (targetType === "epic") {
          const epic = findEpic(store, args.target_id)!
          epic.status = "deferred"
          epic.modifiedAt = Date.now()

          // Warn about active tasks in this epic
          const activeTasks = epic.tasks.filter(t => t.status === "active")
          if (activeTasks.length > 0) {
            for (const t of activeTasks) {
              t.status = "deferred"
              t.evidence = `Deferred with epic: ${args.reason}`
              t.modifiedAt = Date.now()
            }
          }

          if (store.activeEpicId === epic.id) {
            store.activeEpicId = null
            stateManager.setActiveTask(context.sessionID, null)
          }
          commitStore(store)

          return [
            `Epic "${epic.name}" DEFERRED.`,
            `  Reason: ${args.reason}`,
            activeTasks.length > 0
              ? `  ${activeTasks.length} active task(s) also deferred.`
              : "",
            responseFooter(store),
          ].filter(Boolean).join("\n")
        }

        if (targetType === "subtask") {
          const subtask = findSubtask(store, args.target_id)!
          subtask.status = "skipped"
          subtask.timestamp = Date.now()
          const parentTask = findParentTask(store, args.target_id)
          if (parentTask) parentTask.modifiedAt = Date.now()
          commitStore(store)

          return [
            `Subtask "${subtask.name}" SKIPPED.`,
            `  Reason: ${args.reason}`,
            responseFooter(store),
          ].join("\n")
        }

        return `ERROR: Cannot defer target type "${targetType}".`
      }

      // ─── ABANDON ─────────────────────────────────────────────────
      case "abandon": {
        if (!args.target_id) {
          return "ERROR: 'target_id' is required for abandon.\nExample: idumb_task action=abandon target_id=epic-123 reason='Pivoting to different approach'"
        }
        if (!args.reason) {
          return "ERROR: 'reason' is required for abandon.\nExample: idumb_task action=abandon target_id=" + args.target_id + " reason='No longer needed'"
        }

        const targetType = identifyTarget(store, args.target_id)
        if (targetType !== "epic") {
          return targetType
            ? `ERROR: 'abandon' only works on epics. Use 'defer' for tasks/subtasks.`
            : `ERROR: Target "${args.target_id}" not found.`
        }

        const epic = findEpic(store, args.target_id)!
        const activeTasks = epic.tasks.filter(t => t.status === "active")

        epic.status = "abandoned"
        epic.modifiedAt = Date.now()

        if (store.activeEpicId === epic.id) {
          store.activeEpicId = null
          stateManager.setActiveTask(context.sessionID, null)
        }
        commitStore(store)

        return [
          `Epic "${epic.name}" ABANDONED.`,
          `  Reason: ${args.reason}`,
          activeTasks.length > 0
            ? `  ⚠️ ${activeTasks.length} active task(s) were in progress.`
            : "",
          responseFooter(store),
        ].filter(Boolean).join("\n")
      }

      // ─── STATUS ──────────────────────────────────────────────────
      case "status": {
        return formatTaskTree(store) + "\n" + responseFooter(store)
      }

      // ─── LIST ────────────────────────────────────────────────────
      case "list": {
        if (store.epics.length === 0) {
          return [
            "No epics exist yet. Start organizing your work:",
            "  idumb_task action=create_epic name='Your epic name'",
          ].join("\n")
        }

        const lines: string[] = ["=== All Epics ===", ""]
        for (const epic of store.epics) {
          const completed = epic.tasks.filter(t => t.status === "completed").length
          const total = epic.tasks.length
          const isActive = epic.id === store.activeEpicId ? " ◀ ACTIVE" : ""
          lines.push(`  ${epic.id}: "${epic.name}" [${epic.status}] (${completed}/${total} tasks)${isActive}`)
        }
        lines.push("")
        lines.push(responseFooter(store))
        return lines.join("\n")
      }

      // ─── UPDATE ──────────────────────────────────────────────────
      case "update": {
        if (!args.target_id) {
          return "ERROR: 'target_id' is required for update.\nExample: idumb_task action=update target_id=task-123 name='Updated name'"
        }

        const targetType = identifyTarget(store, args.target_id)
        if (!targetType) {
          return `ERROR: Target "${args.target_id}" not found.`
        }

        if (targetType === "epic") {
          const epic = findEpic(store, args.target_id)!
          if (args.name) epic.name = args.name
          epic.modifiedAt = Date.now()
          commitStore(store)
          return `Epic updated: "${epic.name}"\n${responseFooter(store)}`
        }

        if (targetType === "task") {
          const task = findTask(store, args.target_id)!
          if (args.name) task.name = args.name
          if (args.assignee) task.assignee = args.assignee
          task.modifiedAt = Date.now()
          commitStore(store)
          return `Task updated: "${task.name}"\n${responseFooter(store)}`
        }

        if (targetType === "subtask") {
          const subtask = findSubtask(store, args.target_id)!
          if (args.name) subtask.name = args.name
          subtask.timestamp = Date.now()
          commitStore(store)
          return `Subtask updated: "${subtask.name}"\n${responseFooter(store)}`
        }

        return `ERROR: Unexpected target type.`
      }

      // ─── BRANCH ──────────────────────────────────────────────────
      case "branch": {
        if (!args.task_id) {
          return "ERROR: 'task_id' is required for branch.\nExample: idumb_task action=branch task_id=task-123 branch_name='feat/login-form'"
        }

        const task = findTask(store, args.task_id)
        if (!task) {
          return `ERROR: Task "${args.task_id}" not found.`
        }

        const branchName = args.branch_name || `feat/${task.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`

        return [
          `🔀 Branch suggestion for task "${task.name}":`,
          `  git checkout -b ${branchName}`,
          ``,
          `Note: Git integration is planned for a future release.`,
          `For now, create the branch manually and track your work with subtasks.`,
          responseFooter(store),
        ].join("\n")
      }

      default:
        return [
          `Unknown action: "${action}".`,
          `Valid actions: create_epic, create_task, add_subtask, assign, start, complete, defer, abandon, status, list, update, branch`,
        ].join("\n")
    }
  },
})
