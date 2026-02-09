/**
 * Lifecycle Verbs — 5 agent-native task tools.
 *
 * Exports: tasks_start, tasks_done, tasks_check, tasks_add, tasks_fail
 *
 * Design principles (NON-NEGOTIABLE):
 *   1. Iceberg — hide bureaucracy behind simple interfaces
 *   2. Native Parallelism — tasks_add called N times, no JSON batch
 *   3. Signal-to-Noise — 1-line output, pull-not-push
 *   4. Context Inference — never ask for what the system knows
 *   5. No-Shadowing — describe rewards, not rules
 *
 * These are opt-in tools agents WANT to use. No blocking, no enforcement.
 */

import { tool } from "@opencode-ai/plugin/tool"
import {
  findTaskNode, findParentPlan, validateTaskCompletion,
  createWorkPlan, createTaskNode,
} from "../schemas/index.js"
import type { TaskGraph } from "../schemas/work-plan.js"
import { stateManager } from "../lib/persistence.js"

// ─── Helpers ─────────────────────────────────────────────────────────

function getAgent(sessionID: string): string {
  return stateManager.getCapturedAgent(sessionID) ?? "idumb-executor"
}

function getActiveWP(graph: TaskGraph) {
  return graph.activeWorkPlanId
    ? graph.workPlans.find(w => w.id === graph.activeWorkPlanId)
    : undefined
}

// ─── tasks_start ─────────────────────────────────────────────────────

export const start = tool({
  description:
    "Start working on a task. " +
    "Creates a plan + task automatically. Tracks what you're doing.",
  args: {
    objective: tool.schema.string().describe(
      "What you're about to work on. Example: 'Fix auth login flow'"
    ),
    acceptance: tool.schema.string().optional().describe(
      "Comma-separated acceptance criteria. Example: 'Tests pass,UI renders correctly'"
    ),
  },
  async execute(args, context) {
    const { sessionID } = context
    const agent = getAgent(sessionID)
    const graph = stateManager.getTaskGraph()

    // Parse acceptance criteria from comma-separated string
    const acceptance = args.acceptance
      ? args.acceptance.split(",").map(s => s.trim()).filter(Boolean)
      : []

    // Get or create active WorkPlan
    let wp = getActiveWP(graph)
    if (!wp) {
      wp = createWorkPlan({ name: args.objective, category: "ad-hoc", ownedBy: agent, acceptance })
      wp.status = "active"
      graph.workPlans.push(wp)
      graph.activeWorkPlanId = wp.id
    }

    // Create and auto-start TaskNode
    const node = createTaskNode({
      workPlanId: wp.id,
      name: args.objective,
      expectedOutput: args.objective,
      delegatedBy: agent,
      assignedTo: agent,
    })
    node.status = "active"
    node.startedAt = Date.now()
    wp.tasks.push(node)
    wp.modifiedAt = Date.now()

    // Track active task in session
    stateManager.setActiveTask(sessionID, { id: node.id, name: node.name })
    stateManager.saveTaskGraph(graph)

    return `Active: "${node.name}".`
  },
})

// ─── tasks_done ──────────────────────────────────────────────────────

export const done = tool({
  description:
    "Complete your active task with evidence. Readies dependents for work.",
  args: {
    evidence: tool.schema.string().describe(
      "Proof of completion. Examples: 'All tests passing', 'Feature renders correctly'"
    ),
  },
  async execute(args, context) {
    const { sessionID } = context
    const graph = stateManager.getTaskGraph()

    // Context Inference — resolve active task, no target_id needed
    const activeTask = stateManager.getActiveTask(sessionID)
    if (!activeTask) {
      return "ERROR: No active task. Start one with tasks_start."
    }

    const node = findTaskNode(graph, activeTask.id)
    if (!node) {
      return `ERROR: TaskNode "${activeTask.id}" not found.`
    }

    // Validate
    const check = validateTaskCompletion(node, args.evidence)
    if (!check.valid) {
      return check.reason
    }

    // Complete
    node.status = "completed"
    node.completedAt = Date.now()
    node.modifiedAt = Date.now()
    node.result = {
      evidence: args.evidence,
      filesModified: node.artifacts,
      testsRun: "",
      anchorsCreated: [],
    }

    // Clear active task from session
    stateManager.setActiveTask(sessionID, null)

    // Unblock dependents
    const wp = findParentPlan(graph, node.id)
    if (wp) {
      for (const tn of wp.tasks) {
        if (tn.status === "blocked") {
          const allDepsMet = tn.dependsOn.every(depId => {
            const dep = findTaskNode(graph, depId)
            return dep && dep.status === "completed"
          })
          const gateMet = !tn.temporalGate || (() => {
            const gateNode = findTaskNode(graph, tn.temporalGate!.afterTaskId)
            return gateNode && gateNode.status === "completed"
          })()
          if (allDepsMet && gateMet) {
            tn.status = "planned"
            tn.modifiedAt = Date.now()
          }
        }
      }
    }

    stateManager.saveTaskGraph(graph)

    return `Done: "${node.name}".`
  },
})

// ─── tasks_check ─────────────────────────────────────────────────────

export const check = tool({
  description:
    "Check governance status — returns JSON with task, progress, and next steps. " +
    "Call this when you're confused about what's happening, not every turn.",
  args: {},
  async execute(_args, context) {
    const { sessionID } = context
    const status = stateManager.getGovernanceStatus(sessionID)

    return JSON.stringify(status)
  },
})

// ─── tasks_add ───────────────────────────────────────────────────────

export const add = tool({
  description:
    "Add a task to the active plan. Call N times in parallel to add N tasks. " +
    "Use 'after' to set dependency ordering.",
  args: {
    title: tool.schema.string().describe(
      "Task name. Example: 'Write unit tests for auth'"
    ),
    after: tool.schema.string().optional().describe(
      "Name of task this depends on. Example: 'Implement auth module'"
    ),
    expected_output: tool.schema.string().optional().describe(
      "What this task must produce. Example: 'Login page renders and submits'. Defaults to title."
    ),
  },
  async execute(args, context) {
    const { sessionID } = context
    const agent = getAgent(sessionID)
    const graph = stateManager.getTaskGraph()

    // Get or create active WorkPlan
    let wp = getActiveWP(graph)
    if (!wp) {
      wp = createWorkPlan({ name: "Work Plan", category: "ad-hoc", ownedBy: agent })
      wp.status = "active"
      graph.workPlans.push(wp)
      graph.activeWorkPlanId = wp.id
    }

    // Create TaskNode — use expected_output if provided, otherwise default to title
    const node = createTaskNode({
      workPlanId: wp.id,
      name: args.title,
      expectedOutput: args.expected_output ?? args.title,
      delegatedBy: agent,
      assignedTo: agent,
    })

    // Wire dependency if specified
    if (args.after) {
      const depNode = wp.tasks.find(t => t.name === args.after)
      if (depNode) {
        node.dependsOn.push(depNode.id)
        node.status = "blocked"
        node.temporalGate = {
          afterTaskId: depNode.id,
          reason: `Must complete "${depNode.name}" first`,
        }
      }
    }

    wp.tasks.push(node)
    wp.modifiedAt = Date.now()
    stateManager.saveTaskGraph(graph)

    const depNote = args.after ? ` (depends on: "${args.after}")` : ""
    return `Added: "${args.title}"${depNote}.`
  },
})

// ─── tasks_fail ──────────────────────────────────────────────────────

export const fail = tool({
  description:
    "Mark your active task as failed. Dependents remain waiting.",
  args: {
    reason: tool.schema.string().describe(
      "Why this task failed. Example: 'Tests broken after refactor'"
    ),
  },
  async execute(args, context) {
    const { sessionID } = context
    const graph = stateManager.getTaskGraph()

    // Context Inference — resolve active task
    const activeTask = stateManager.getActiveTask(sessionID)
    if (!activeTask) {
      return "ERROR: No active task to fail."
    }

    const node = findTaskNode(graph, activeTask.id)
    if (!node) {
      return `ERROR: TaskNode "${activeTask.id}" not found.`
    }

    if (node.status !== "active" && node.status !== "review") {
      return `ERROR: Can only fail active/review tasks. "${node.name}" is "${node.status}".`
    }

    // Fail the task
    node.status = "failed"
    node.modifiedAt = Date.now()
    node.result = {
      evidence: `FAILED: ${args.reason}`,
      filesModified: node.artifacts,
      testsRun: "",
      anchorsCreated: [],
    }

    // Clear active task from session
    stateManager.setActiveTask(sessionID, null)

    // Block dependents
    const wp = findParentPlan(graph, node.id)
    if (wp) {
      for (const tn of wp.tasks) {
        if (
          tn.dependsOn.includes(node.id) &&
          (tn.status === "planned" || tn.status === "blocked")
        ) {
          tn.status = "blocked"
          tn.modifiedAt = Date.now()
        }
      }
    }

    stateManager.saveTaskGraph(graph)

    return `Failed: "${node.name}".`
  },
})
