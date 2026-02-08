/**
 * State Reader — cross-plugin state access for tools.
 *
 * Tools need to read governance state (tasks, anchors, brain) but don't
 * share the in-memory StateManager.
 *
 * This module reads the persisted JSON files directly from disk.
 * It's READ-ONLY — tools never modify governance state files.
 * (The govern_task tool handles all task mutations.)
 *
 * Files read:
 * - .idumb/brain/tasks.json     → TaskStore (active task, epics, hierarchy)
 * - .idumb/brain/state.json     → SessionState (captured agent, blocks)
 * - .idumb/brain/graph.json     → TaskGraph (v3 WorkPlan/TaskNode model)
 * - .idumb/brain/plan.json      → PlanState (phase tracking)
 * - .idumb/brain/delegations.json → DelegationStore (active delegations)
 * - .idumb/brain/knowledge.json  → BrainStore (knowledge entries)
 * - .idumb/brain/codemap.json    → CodeMapStore (codebase map)
 * - .idumb/brain/project-map.json → ProjectMap (framework detection)
 * - .idumb/brain/registry.json   → PlanningRegistry (artifact tracking)
 * - .idumb/config.json           → IdumbConfig (language, governance settings)
 */

import { readFileSync, existsSync } from "fs"
import { join } from "path"
import type { TaskStore, TaskEpic, Task } from "../schemas/task.js"
import type { BrainStore } from "../schemas/brain.js"
import type { DelegationStore } from "../schemas/delegation.js"
import type { CodeMapStore } from "../schemas/codemap.js"
import type { ProjectMap } from "../schemas/project-map.js"
import { BRAIN_PATHS } from "./paths.js"

// ─── File Locations (from shared BRAIN_PATHS) ───────────────────────

// Legacy filenames for backward compatibility
const LEGACY_STATE_FILES = {
    hookState: BRAIN_PATHS.legacy.state,
} as const

// ─── Safe JSON Reader ────────────────────────────────────────────────

function safeReadJSON<T>(absPath: string): T | null {
    try {
        if (!existsSync(absPath)) return null
        const raw = readFileSync(absPath, "utf-8")
        return JSON.parse(raw) as T
    } catch {
        return null
    }
}

// ─── State Reader ────────────────────────────────────────────────────

/**
 * Read-only snapshot of iDumb's governance state.
 *
 * Usage:
 *   const state = readGovernanceState(projectDir)
 *   state.taskStore     // TaskStore | null
 *   state.activeTask    // Task | null (convenience)
 *   state.activeEpic    // TaskEpic | null (convenience)
 *   state.capturedAgent // string | null (from chat.params)
 */
export interface GovernanceSnapshot {
    taskStore: TaskStore | null
    activeTask: Task | null
    activeEpic: TaskEpic | null
    capturedAgent: string | null
    brainStore: BrainStore | null
    delegationStore: DelegationStore | null
    codeMapStore: CodeMapStore | null
    projectMap: ProjectMap | null
    taskGraph: Record<string, unknown> | null
    planState: Record<string, unknown> | null
    planningRegistry: Record<string, unknown> | null
    config: Record<string, unknown> | null
}

/**
 * Read iDumb's persisted governance state from disk.
 *
 * Returns a read-only snapshot — no mutations, no writes.
 * Each field is null if the corresponding file doesn't exist or is invalid.
 */
export function readGovernanceState(projectDir: string): GovernanceSnapshot {
    // Read task store + compute active task/epic
    const taskStore = safeReadJSON<TaskStore>(join(projectDir, BRAIN_PATHS.tasks))

    let activeTask: Task | null = null
    let activeEpic: TaskEpic | null = null
    if (taskStore?.activeEpicId) {
        activeEpic = taskStore.epics.find(e => e.id === taskStore.activeEpicId) ?? null
        if (activeEpic) {
            // Find the active (in-progress) task within the active epic
            activeTask = activeEpic.tasks.find(t => t.status === "active") ?? null
        }
    }

    // Read hook state for captured agent (try new path, then legacy)
    let capturedAgent: string | null = null
    const hookState = safeReadJSON<{
        sessions?: Record<string, { capturedAgent?: string | null }>
    }>(join(projectDir, BRAIN_PATHS.state))
        ?? safeReadJSON<{
            sessions?: Record<string, { capturedAgent?: string | null }>
        }>(join(projectDir, LEGACY_STATE_FILES.hookState))
    if (hookState?.sessions) {
        // Get the most recent session's captured agent
        const sessions = Object.values(hookState.sessions)
        for (const session of sessions) {
            if (session.capturedAgent) {
                capturedAgent = session.capturedAgent
            }
        }
    }

    return {
        taskStore,
        activeTask,
        activeEpic,
        capturedAgent,
        brainStore: safeReadJSON<BrainStore>(join(projectDir, BRAIN_PATHS.knowledge)),
        delegationStore: safeReadJSON<DelegationStore>(join(projectDir, BRAIN_PATHS.delegations)),
        codeMapStore: safeReadJSON<CodeMapStore>(join(projectDir, BRAIN_PATHS.codemap)),
        projectMap: safeReadJSON<ProjectMap>(join(projectDir, BRAIN_PATHS.projectMap)),
        taskGraph: safeReadJSON<Record<string, unknown>>(join(projectDir, BRAIN_PATHS.taskGraph)),
        planState: safeReadJSON<Record<string, unknown>>(join(projectDir, BRAIN_PATHS.planState)),
        planningRegistry: safeReadJSON<Record<string, unknown>>(join(projectDir, BRAIN_PATHS.planningRegistry)),
        config: safeReadJSON<Record<string, unknown>>(join(projectDir, BRAIN_PATHS.config)),
    }
}

/**
 * Read ONLY the task store — lightweight for tools that just need task info.
 */
export function readTaskStore(projectDir: string): TaskStore | null {
    return safeReadJSON<TaskStore>(join(projectDir, BRAIN_PATHS.tasks))
}

/**
 * Read ONLY the brain store — for tools that need knowledge context.
 */
export function readBrainStore(projectDir: string): BrainStore | null {
    return safeReadJSON<BrainStore>(join(projectDir, BRAIN_PATHS.knowledge))
}

/**
 * Read ONLY the captured agent name — for agent role checks.
 *
 * Also accepts context.agent from ToolContext as a primary source.
 * Falls back to hook state on disk if context.agent is not available.
 */
export function readCapturedAgent(
    projectDir: string,
    contextAgent?: string,
): string | null {
    // Primary: use context.agent from ToolContext
    if (contextAgent) return contextAgent

    // Fallback: read from hook state on disk (try new path, then legacy)
    const hookState = safeReadJSON<{
        sessions?: Record<string, { capturedAgent?: string | null }>
    }>(join(projectDir, BRAIN_PATHS.state))
        ?? safeReadJSON<{
            sessions?: Record<string, { capturedAgent?: string | null }>
        }>(join(projectDir, LEGACY_STATE_FILES.hookState))

    if (hookState?.sessions) {
        const sessions = Object.values(hookState.sessions)
        for (const session of sessions) {
            if (session.capturedAgent) return session.capturedAgent
        }
    }

    return null
}

/**
 * Format governance state as a brief summary for tool output.
 */
export function formatGovernanceSummary(snapshot: GovernanceSnapshot): string {
    const lines: string[] = []

    if (snapshot.capturedAgent) {
        lines.push(`│ Agent: ${snapshot.capturedAgent}`)
    }

    if (snapshot.activeEpic) {
        lines.push(`│ Active epic: "${snapshot.activeEpic.name}" [${snapshot.activeEpic.category}]`)
    }

    if (snapshot.activeTask) {
        lines.push(`│ Active task: "${snapshot.activeTask.name}" (${snapshot.activeTask.status})`)
    } else {
        lines.push(`│ Active task: none`)
    }

    return lines.join("\n")
}
