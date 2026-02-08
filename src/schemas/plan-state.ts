/**
 * Plan State Schema — machine-readable projection of MASTER-PLAN.md.
 *
 * Plain TypeScript interfaces (DON'T #9: no Zod for internal state).
 *
 * Consumed by:
 * - system.ts hook (every turn — phase + next action in system prompt)
 * - compaction.ts hook (survives compaction — phase awareness preserved)
 * - govern_plan tool (phase transitions via `action=phase`)
 *
 * The plan state is a simplified projection: which phase, what status,
 * what's the next action. It does NOT duplicate the full plan — MASTER-PLAN.md
 * remains the authoritative source. This is the runtime awareness layer.
 */

// ─── Phase Status ──────────────────────────────────────────────────────

export type PlanPhaseStatus =
  | "pending"      // Not started
  | "in_progress"  // Currently active
  | "completed"    // Done, verified
  | "blocked"      // Waiting on external factor
  | "skipped"      // Deliberately skipped

// ─── Plan Phase ────────────────────────────────────────────────────────

export interface PlanPhase {
  id: number
  name: string
  status: PlanPhaseStatus
  nextAction?: string
  completedAt: number | null
}

// ─── Plan State ────────────────────────────────────────────────────────

export interface PlanState {
  version: string
  planName: string
  currentPhaseId: number | null
  phases: PlanPhase[]
  lastModified: number
}

// ─── Version ───────────────────────────────────────────────────────────

export const PLAN_STATE_VERSION = "1.0.0"

// ─── Factory Functions ─────────────────────────────────────────────────

export function createPlanPhase(options: {
  id: number
  name: string
  status?: PlanPhaseStatus
  nextAction?: string
}): PlanPhase {
  return {
    id: options.id,
    name: options.name,
    status: options.status ?? "pending",
    nextAction: options.nextAction,
    completedAt: null,
  }
}

export function createPlanState(options?: {
  planName?: string
  phases?: PlanPhase[]
}): PlanState {
  return {
    version: PLAN_STATE_VERSION,
    planName: options?.planName ?? "Master Plan",
    currentPhaseId: null,
    phases: options?.phases ?? [],
    lastModified: Date.now(),
  }
}

/**
 * Create the default plan state matching MASTER-PLAN.md phases.
 */
export function createDefaultPlanState(): PlanState {
  return createPlanState({
    planName: "One True Plan + Self-Enforcement",
    phases: [
      createPlanPhase({ id: 1, name: "Critical Bug Fixes" }),
      createPlanPhase({ id: 2, name: "Self-Enforcement Wiring" }),
      createPlanPhase({ id: 3, name: "Document Consolidation" }),
      createPlanPhase({ id: 4, name: "Hook Intelligence Enhancement" }),
      createPlanPhase({ id: 5, name: "Dead Code Cleanup" }),
      createPlanPhase({ id: 6, name: "SDK Integration Foundation" }),
      createPlanPhase({ id: 7, name: "Documentation Hygiene" }),
      createPlanPhase({ id: 8, name: ".idumb/ Structure Redesign" }),
      createPlanPhase({ id: 9, name: "Fullscan — Brain Index Population" }),
      createPlanPhase({ id: 10, name: "Init Experience — Showcase Foundation" }),
    ],
  })
}

// ─── Helpers ───────────────────────────────────────────────────────────

/**
 * Get the current phase from plan state.
 * Returns the phase matching currentPhaseId, or the first in_progress phase,
 * or the first pending phase.
 */
export function getCurrentPhase(state: PlanState): PlanPhase | null {
  if (state.currentPhaseId !== null) {
    return state.phases.find((p: PlanPhase) => p.id === state.currentPhaseId) ?? null
  }
  // Fallback: first in_progress, then first pending
  return (
    state.phases.find((p: PlanPhase) => p.status === "in_progress") ??
    state.phases.find((p: PlanPhase) => p.status === "pending") ??
    null
  )
}

/**
 * Get the next pending phase after the current one.
 */
export function getNextPhase(state: PlanState): PlanPhase | null {
  const current = getCurrentPhase(state)
  if (!current) return state.phases.find((p: PlanPhase) => p.status === "pending") ?? null
  return state.phases.find((p: PlanPhase) => p.id > current.id && p.status === "pending") ?? null
}

/**
 * Format plan state for injection into system prompt or compaction context.
 * Kept compact for budget constraints.
 */
export function formatPlanStateCompact(state: PlanState): string {
  const current = getCurrentPhase(state)
  if (!current) return "Plan: all phases complete"

  const completed = state.phases.filter((p: PlanPhase) => p.status === "completed").length
  const total = state.phases.length
  const next = current.nextAction ?? getNextPhase(state)?.name ?? "none"

  return `Phase: "${current.name}" [${current.status}] (${completed}/${total} done) | Next: ${next}`
}
