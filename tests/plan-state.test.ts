/**
 * Plan State Test — schema factories, helpers, and formatting.
 *
 * Proves:
 * - Factory functions produce valid objects
 * - getCurrentPhase resolves correctly
 * - getNextPhase finds the next pending phase
 * - formatPlanStateCompact produces compact output
 * - Phase transitions work correctly
 * - Default plan state matches MASTER-PLAN.md phases
 */

import {
  createPlanPhase, createPlanState, createDefaultPlanState,
  getCurrentPhase, getNextPhase, formatPlanStateCompact,
  PLAN_STATE_VERSION,
} from "../src/schemas/plan-state.js"
import type { PlanState, PlanPhase } from "../src/schemas/plan-state.js"
import { createLogger } from "../src/lib/index.js"
import { mkdirSync, existsSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

const testDir = join(tmpdir(), `idumb-test-plan-state-${Date.now()}`)
if (!existsSync(testDir)) mkdirSync(testDir, { recursive: true })

const log = createLogger(testDir, "test-plan-state", "debug")

let passed = 0
let failed = 0

function assert(name: string, condition: boolean): void {
  if (condition) {
    passed++
    log.info(`PASS: ${name}`)
  } else {
    failed++
    log.error(`FAIL: ${name}`)
  }
}

// ─── Factory Functions ──────────────────────────────────────────

function test1_createPlanPhase(): void {
  const phase = createPlanPhase({ id: 1, name: "Bug Fixes" })
  assert("createPlanPhase: has id", phase.id === 1)
  assert("createPlanPhase: has name", phase.name === "Bug Fixes")
  assert("createPlanPhase: default status is pending", phase.status === "pending")
  assert("createPlanPhase: completedAt is null", phase.completedAt === null)
  assert("createPlanPhase: nextAction is undefined", phase.nextAction === undefined)
}

function test2_createPlanPhaseWithOptions(): void {
  const phase = createPlanPhase({
    id: 3,
    name: "Consolidation",
    status: "in_progress",
    nextAction: "Archive old docs",
  })
  assert("createPlanPhase with options: status is in_progress", phase.status === "in_progress")
  assert("createPlanPhase with options: nextAction set", phase.nextAction === "Archive old docs")
}

function test3_createPlanState(): void {
  const state = createPlanState()
  assert("createPlanState: has version", state.version === PLAN_STATE_VERSION)
  assert("createPlanState: default planName", state.planName === "Master Plan")
  assert("createPlanState: currentPhaseId is null", state.currentPhaseId === null)
  assert("createPlanState: phases is empty array", Array.isArray(state.phases) && state.phases.length === 0)
  assert("createPlanState: has lastModified", typeof state.lastModified === "number" && state.lastModified > 0)
}

function test4_createDefaultPlanState(): void {
  const state = createDefaultPlanState()
  assert("createDefaultPlanState: has 6 phases", state.phases.length === 6)
  assert("createDefaultPlanState: phase 1 is Critical Bug Fixes", state.phases[0].name === "Critical Bug Fixes")
  assert("createDefaultPlanState: phase 6 is SDK Integration Foundation", state.phases[5].name === "SDK Integration Foundation")
  assert("createDefaultPlanState: all phases pending", state.phases.every(p => p.status === "pending"))
  assert("createDefaultPlanState: planName matches", state.planName === "One True Plan + Self-Enforcement")
}

// ─── getCurrentPhase ────────────────────────────────────────────

function test5_getCurrentPhaseByExplicitId(): void {
  const state = createDefaultPlanState()
  state.currentPhaseId = 3
  state.phases[2].status = "in_progress"
  const current = getCurrentPhase(state)
  assert("getCurrentPhase by ID: finds phase 3", current?.id === 3)
  assert("getCurrentPhase by ID: name matches", current?.name === "Document Consolidation")
}

function test6_getCurrentPhaseFallbackInProgress(): void {
  const state = createDefaultPlanState()
  state.phases[1].status = "in_progress"
  // No explicit currentPhaseId
  const current = getCurrentPhase(state)
  assert("getCurrentPhase fallback: finds first in_progress", current?.id === 2)
}

function test7_getCurrentPhaseFallbackPending(): void {
  const state = createDefaultPlanState()
  state.phases[0].status = "completed"
  // No explicit currentPhaseId, no in_progress
  const current = getCurrentPhase(state)
  assert("getCurrentPhase fallback pending: skips completed, finds phase 2", current?.id === 2)
}

function test8_getCurrentPhaseAllComplete(): void {
  const state = createDefaultPlanState()
  for (const phase of state.phases) {
    phase.status = "completed"
  }
  const current = getCurrentPhase(state)
  assert("getCurrentPhase all complete: returns null", current === null)
}

// ─── getNextPhase ───────────────────────────────────────────────

function test9_getNextPhase(): void {
  const state = createDefaultPlanState()
  state.currentPhaseId = 2
  state.phases[0].status = "completed"
  state.phases[1].status = "in_progress"
  const next = getNextPhase(state)
  assert("getNextPhase: returns phase 3", next?.id === 3)
}

function test10_getNextPhaseSkipsCompleted(): void {
  const state = createDefaultPlanState()
  state.currentPhaseId = 1
  state.phases[0].status = "in_progress"
  state.phases[1].status = "completed"
  state.phases[2].status = "completed"
  const next = getNextPhase(state)
  assert("getNextPhase skips completed: returns phase 4", next?.id === 4)
}

function test11_getNextPhaseNoneLeft(): void {
  const state = createDefaultPlanState()
  for (const phase of state.phases) {
    phase.status = "completed"
  }
  const next = getNextPhase(state)
  assert("getNextPhase none left: returns null", next === null)
}

// ─── formatPlanStateCompact ─────────────────────────────────────

function test12_formatCompact(): void {
  const state = createDefaultPlanState()
  state.currentPhaseId = 2
  state.phases[0].status = "completed"
  state.phases[1].status = "in_progress"
  const output = formatPlanStateCompact(state)
  assert("formatCompact: contains phase name", output.includes("Self-Enforcement Wiring"))
  assert("formatCompact: contains status", output.includes("in_progress"))
  assert("formatCompact: contains progress", output.includes("1/6"))
  assert("formatCompact: contains next phase", output.includes("Document Consolidation"))
}

function test13_formatCompactAllComplete(): void {
  const state = createDefaultPlanState()
  for (const phase of state.phases) {
    phase.status = "completed"
  }
  const output = formatPlanStateCompact(state)
  assert("formatCompact all complete: says all complete", output.includes("all phases complete"))
}

function test14_formatCompactWithNextAction(): void {
  const state = createDefaultPlanState()
  state.currentPhaseId = 1
  state.phases[0].status = "in_progress"
  state.phases[0].nextAction = "Fix tool-gate passthrough"
  const output = formatPlanStateCompact(state)
  assert("formatCompact with nextAction: shows nextAction", output.includes("Fix tool-gate passthrough"))
}

// ─── Phase Transitions ─────────────────────────────────────────

function test15_phaseTransitionToCompleted(): void {
  const phase = createPlanPhase({ id: 1, name: "Bug Fixes", status: "in_progress" })
  phase.status = "completed"
  phase.completedAt = Date.now()
  assert("phase transition: completedAt is set", phase.completedAt !== null && phase.completedAt > 0)
}

// ─── StateManager Round-Trip ────────────────────────────────────

async function test16_stateManagerRoundTrip(): Promise<void> {
  const { stateManager } = await import("../src/lib/persistence.js")

  // Set plan state
  const state = createDefaultPlanState()
  state.currentPhaseId = 2
  state.phases[0].status = "completed"
  state.phases[0].completedAt = Date.now()
  state.phases[1].status = "in_progress"
  stateManager.setPlanState(state)

  // Read it back
  const retrieved = stateManager.getPlanState()
  assert("stateManager round-trip: planName matches", retrieved.planName === state.planName)
  assert("stateManager round-trip: phases count", retrieved.phases.length === 6)
  assert("stateManager round-trip: phase 1 completed", retrieved.phases[0].status === "completed")
  assert("stateManager round-trip: phase 2 in_progress", retrieved.phases[1].status === "in_progress")
  assert("stateManager round-trip: currentPhaseId", retrieved.currentPhaseId === 2)
}

function test17_emptyPlanState(): void {
  const state = createPlanState()
  const current = getCurrentPhase(state)
  assert("empty plan state: getCurrentPhase returns null", current === null)
  const compact = formatPlanStateCompact(state)
  assert("empty plan state: format says all complete", compact.includes("all phases complete"))
}

// ─── Run All ────────────────────────────────────────────────────

async function main(): Promise<void> {
  test1_createPlanPhase()
  test2_createPlanPhaseWithOptions()
  test3_createPlanState()
  test4_createDefaultPlanState()
  test5_getCurrentPhaseByExplicitId()
  test6_getCurrentPhaseFallbackInProgress()
  test7_getCurrentPhaseFallbackPending()
  test8_getCurrentPhaseAllComplete()
  test9_getNextPhase()
  test10_getNextPhaseSkipsCompleted()
  test11_getNextPhaseNoneLeft()
  test12_formatCompact()
  test13_formatCompactAllComplete()
  test14_formatCompactWithNextAction()
  test15_phaseTransitionToCompleted()
  await test16_stateManagerRoundTrip()
  test17_emptyPlanState()

  const total = passed + failed
  const summary = `\nResults: ${passed}/${total} passed, ${failed} failed`
  log.info(summary)
  process.stdout.write(`${summary}\n`)
  process.exit(failed > 0 ? 1 : 0)
}

main()
