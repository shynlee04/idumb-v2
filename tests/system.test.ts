/**
 * System Hook Test — config-aware governance context injection.
 *
 * Proves:
 * - Config loaded from .idumb/config.json and cached
 * - Framework overlay injected based on detected governance
 * - Governance mode context injected
 * - Active task included in injection
 * - Critical anchors included (max 2)
 * - Budget cap enforced (≤800 chars)
 * - Graceful degradation when config missing
 * - No deny language ("RULE: Do not...")
 * - Instructive language used instead
 */

import { createSystemHook } from "../src/hooks/system.js"
import { setActiveTask } from "../src/hooks/index.js"
import { addAnchor } from "../src/hooks/compaction.js"
import { createAnchor } from "../src/schemas/index.js"
import { createConfig } from "../src/schemas/config.js"
import { createLogger } from "../src/lib/index.js"
import { mkdirSync, writeFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

// ─── Test harness ─────────────────────────────────────────────────────

let passed = 0
let failed = 0

function assert(name: string, condition: boolean): void {
  if (condition) {
    passed++
  } else {
    failed++
    process.stderr.write(`FAIL: ${name}\n`)
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────

function createTestDir(suffix: string): string {
  const dir = join(tmpdir(), `idumb-test-system-${suffix}-${Date.now()}`)
  mkdirSync(join(dir, ".idumb"), { recursive: true })
  return dir
}

function writeConfig(dir: string, overrides: Parameters<typeof createConfig>[0] = {}): void {
  const config = createConfig(overrides)
  writeFileSync(join(dir, ".idumb", "config.json"), JSON.stringify(config, null, 2))
}

async function runHook(dir: string, sessionID: string): Promise<string[]> {
  const log = createLogger(dir, "test-system", "debug")
  const hook = createSystemHook(log, dir)
  const output = { system: [] as string[] }
  await hook({ sessionID, model: "test" }, output)
  return output.system
}

// ─── Tests ────────────────────────────────────────────────────────────

async function test1_noConfigGracefulDegradation(): Promise<void> {
  process.stdout.write("\nSystem Hook — Graceful Degradation\n")

  const dir = createTestDir("no-config")
  // No config.json written — should degrade gracefully

  const system = await runHook(dir, "sys-test-1")

  assert("injection still produced without config", system.length === 1)
  assert("contains governance tag", system[0].includes("<idumb-governance>"))
  assert("contains closing tag", system[0].includes("</idumb-governance>"))
  assert("no crash without config", true) // if we got here, no crash
}

async function test2_configLoadedAndCached(): Promise<void> {
  process.stdout.write("\nSystem Hook — Config Loading\n")

  const dir = createTestDir("config-load")
  writeConfig(dir, { governanceMode: "strict" })

  const log = createLogger(dir, "test-system-2", "debug")
  const hook = createSystemHook(log, dir)

  // First call loads config
  const output1 = { system: [] as string[] }
  await hook({ sessionID: "sys-test-2a", model: "test" }, output1)
  assert("first call produces injection", output1.system.length === 1)
  assert("strict mode context injected", output1.system[0].includes("Strict governance"))

  // Second call uses cached config (no re-read)
  const output2 = { system: [] as string[] }
  await hook({ sessionID: "sys-test-2b", model: "test" }, output2)
  assert("second call still has strict mode", output2.system[0].includes("Strict governance"))
}

async function test3_frameworkOverlayGSD(): Promise<void> {
  process.stdout.write("\nSystem Hook — GSD Framework Overlay\n")

  const dir = createTestDir("gsd")
  writeConfig(dir, {
    detection: {
      governance: ["gsd"],
      tech: ["typescript"],
      packageManager: "npm",
      hasMonorepo: false,
      existingAgentDirs: [],
      existingCommandDirs: [],
      conflicts: [],
      gaps: [],
    },
  })

  const system = await runHook(dir, "sys-test-3")

  assert("GSD overlay injected", system[0].includes("This project uses GSD"))
  assert("GSD mentions WorkPlans", system[0].includes("WorkPlans"))
  assert("GSD mentions govern_plan", system[0].includes("govern_plan"))
}

async function test4_frameworkOverlaySpecKit(): Promise<void> {
  process.stdout.write("\nSystem Hook — Spec-kit Framework Overlay\n")

  const dir = createTestDir("spec-kit")
  writeConfig(dir, {
    detection: {
      governance: ["spec-kit"],
      tech: [],
      packageManager: "npm",
      hasMonorepo: false,
      existingAgentDirs: [],
      existingCommandDirs: [],
      conflicts: [],
      gaps: [],
    },
  })

  const system = await runHook(dir, "sys-test-4")

  assert("Spec-kit overlay injected", system[0].includes("This project uses Spec-kit"))
  assert("Spec-kit mentions govern_task", system[0].includes("govern_task"))
}

async function test5_frameworkOverlayNone(): Promise<void> {
  process.stdout.write("\nSystem Hook — No Framework Overlay\n")

  const dir = createTestDir("none")
  writeConfig(dir)

  const system = await runHook(dir, "sys-test-5")

  assert("fallback overlay injected", system[0].includes("govern_plan"))
  assert("fallback mentions innate tools", system[0].includes("innate tools"))
}

async function test6_governanceModes(): Promise<void> {
  process.stdout.write("\nSystem Hook — Governance Modes\n")

  // Balanced (default)
  const dirBalanced = createTestDir("balanced")
  writeConfig(dirBalanced, { governanceMode: "balanced" })
  const sysBalanced = await runHook(dirBalanced, "sys-test-6a")
  assert("balanced mode context", sysBalanced[0].includes("Balanced governance"))

  // Strict
  const dirStrict = createTestDir("strict")
  writeConfig(dirStrict, { governanceMode: "strict" })
  const sysStrict = await runHook(dirStrict, "sys-test-6b")
  assert("strict mode context", sysStrict[0].includes("Strict governance"))

  // Autonomous
  const dirAuto = createTestDir("auto")
  writeConfig(dirAuto, { governanceMode: "autonomous" })
  const sysAuto = await runHook(dirAuto, "sys-test-6c")
  assert("autonomous mode context", sysAuto[0].includes("Autonomous governance"))

  // Retard
  const dirRetard = createTestDir("retard")
  writeConfig(dirRetard, { governanceMode: "retard" })
  const sysRetard = await runHook(dirRetard, "sys-test-6d")
  assert("retard mode context", sysRetard[0].includes("Maximum autonomy"))
}

async function test7_activeTaskIncluded(): Promise<void> {
  process.stdout.write("\nSystem Hook — Active Task\n")

  const dir = createTestDir("task")
  writeConfig(dir)

  setActiveTask("sys-test-7", { id: "t-42", name: "Implement auth module" })
  const system = await runHook(dir, "sys-test-7")

  assert("active task in injection", system[0].includes("Implement auth module"))
  assert("uses instructive language", system[0].includes("Active task:"))
}

async function test8_noTaskInstructive(): Promise<void> {
  process.stdout.write("\nSystem Hook — No Task (Instructive)\n")

  const dir = createTestDir("no-task")
  writeConfig(dir)

  const system = await runHook(dir, "sys-test-8")

  assert("no-task message present", system[0].includes("No active task"))
  assert("instructs to use govern_task", system[0].includes("govern_task"))
}

async function test9_criticalAnchorsIncluded(): Promise<void> {
  process.stdout.write("\nSystem Hook — Critical Anchors\n")

  const dir = createTestDir("anchors")
  writeConfig(dir)

  addAnchor("sys-test-9", createAnchor("decision", "critical", "Use PostgreSQL for storage"))
  addAnchor("sys-test-9", createAnchor("decision", "critical", "Auth via SAML 2.0"))
  addAnchor("sys-test-9", createAnchor("decision", "critical", "Third critical should be trimmed"))

  const system = await runHook(dir, "sys-test-9")

  assert("first critical anchor included", system[0].includes("PostgreSQL"))
  assert("second critical anchor included", system[0].includes("SAML"))
  assert("third critical anchor trimmed (max 2)", !system[0].includes("Third critical"))
}

async function test10_noDenyLanguage(): Promise<void> {
  process.stdout.write("\nSystem Hook — No Deny Language\n")

  const dir = createTestDir("no-deny")
  writeConfig(dir)

  const system = await runHook(dir, "sys-test-10")
  const injection = system[0]

  assert("no 'RULE: Do not' language", !injection.includes("RULE: Do not"))
  assert("no 'you cannot' language", !injection.toLowerCase().includes("you cannot"))
  assert("no 'NOT allowed' language", !injection.includes("NOT allowed"))
  assert("no 'STAY AWAY' language", !injection.includes("STAY AWAY"))
}

async function test11_budgetEnforced(): Promise<void> {
  process.stdout.write("\nSystem Hook — Budget Enforcement\n")

  const dir = createTestDir("budget")
  writeConfig(dir)

  // Add many critical anchors with long content to try to exceed budget
  for (let i = 0; i < 20; i++) {
    const content = `Critical decision ${i}: ${"x".repeat(200)}`
    addAnchor("sys-test-11", createAnchor("decision", "critical", content))
  }

  const system = await runHook(dir, "sys-test-11")
  const injection = system[0]

  assert("injection under budget (≤800 chars)", injection.length <= 800)
  assert("closing tag preserved after truncation", injection.includes("</idumb-governance>"))
}

async function test12_noSessionIDSkips(): Promise<void> {
  process.stdout.write("\nSystem Hook — Missing Session ID\n")

  const dir = createTestDir("no-session")
  writeConfig(dir)

  const log = createLogger(dir, "test-system-12", "debug")
  const hook = createSystemHook(log, dir)
  const output = { system: [] as string[] }

  await hook({ model: "test" }, output)

  assert("no injection when sessionID missing", output.system.length === 0)
}

async function test13_bmadFrameworkOverlay(): Promise<void> {
  process.stdout.write("\nSystem Hook — BMAD Framework Overlay\n")

  const dir = createTestDir("bmad")
  writeConfig(dir, {
    detection: {
      governance: ["bmad"],
      tech: [],
      packageManager: "npm",
      hasMonorepo: false,
      existingAgentDirs: [],
      existingCommandDirs: [],
      conflicts: [],
      gaps: [],
    },
  })

  const system = await runHook(dir, "sys-test-13")

  assert("BMAD overlay injected", system[0].includes("This project uses BMAD"))
  assert("BMAD mentions govern_task", system[0].includes("govern_task"))
}

// ─── Story 02-4: Full Active Chain Context ───────────────────────────

async function test14_workPlanProgressInjected(): Promise<void> {
  process.stdout.write("\nSystem Hook — WorkPlan Progress\n")

  const dir = createTestDir("workplan")
  writeConfig(dir)

  const { stateManager } = await import("../src/lib/persistence.js")
  const { createWorkPlan, createTaskNode, createCheckpoint } = await import("../src/schemas/work-plan.js")

  const wp = createWorkPlan({ name: "Auth Feature" })
  wp.status = "active"
  const tn1 = createTaskNode({
    workPlanId: wp.id,
    name: "Design API schema",
    expectedOutput: "API schema document",
    delegatedBy: "idumb-supreme-coordinator",
    assignedTo: "idumb-investigator",
  })
  tn1.status = "completed"
  const tn2 = createTaskNode({
    workPlanId: wp.id,
    name: "Implement auth endpoints",
    expectedOutput: "Working auth endpoints with tests",
    delegatedBy: "idumb-supreme-coordinator",
    assignedTo: "idumb-executor",
  })
  tn2.status = "active"
  tn2.checkpoints.push(createCheckpoint(tn2.id, "write", "created auth.ts"))
  wp.tasks = [tn1, tn2]

  const graph = { version: "3.0.0", activeWorkPlanId: wp.id, workPlans: [wp] }
  stateManager.saveTaskGraph(graph)
  setActiveTask("sys-test-14", { id: tn2.id, name: tn2.name })

  const system = await runHook(dir, "sys-test-14")

  assert("workplan: includes plan name", system[0].includes("Auth Feature"))
  assert("workplan: includes progress", system[0].includes("1/2 tasks"))
  assert("workplan: includes active task name", system[0].includes("Implement auth endpoints"))
  assert("workplan: includes assigned agent", system[0].includes("idumb-executor"))
  assert("workplan: includes expected output", system[0].includes("Working auth endpoints"))
}

async function test15_delegationContextInjected(): Promise<void> {
  process.stdout.write("\nSystem Hook — Delegation Context\n")

  const dir = createTestDir("delegation")
  writeConfig(dir)

  const { stateManager } = await import("../src/lib/persistence.js")
  const { createWorkPlan, createTaskNode } = await import("../src/schemas/work-plan.js")

  const wp = createWorkPlan({ name: "Delegation Test" })
  wp.status = "active"
  const tn = createTaskNode({
    workPlanId: wp.id,
    name: "Research caching",
    expectedOutput: "Caching strategy doc",
    delegatedBy: "idumb-supreme-coordinator",
    assignedTo: "idumb-investigator",
  })
  tn.status = "active"
  wp.tasks = [tn]

  const graph = { version: "3.0.0", activeWorkPlanId: wp.id, workPlans: [wp] }
  stateManager.saveTaskGraph(graph)
  setActiveTask("sys-test-15", { id: tn.id, name: tn.name })

  const system = await runHook(dir, "sys-test-15")

  assert("delegation: includes delegatedBy", system[0].includes("idumb-supreme-coordinator"))
}

async function test16_planAheadVisibility(): Promise<void> {
  process.stdout.write("\nSystem Hook — Plan Ahead Visibility\n")

  const dir = createTestDir("plan-ahead")
  writeConfig(dir)

  const { stateManager } = await import("../src/lib/persistence.js")
  const { createWorkPlan, createTaskNode } = await import("../src/schemas/work-plan.js")

  const wp = createWorkPlan({ name: "Multi-task Plan" })
  wp.status = "active"
  const tn1 = createTaskNode({
    workPlanId: wp.id,
    name: "Current task",
    expectedOutput: "output 1",
    delegatedBy: "coordinator",
    assignedTo: "executor",
  })
  tn1.status = "active"
  const tn2 = createTaskNode({
    workPlanId: wp.id,
    name: "Next task in queue",
    expectedOutput: "output 2",
    delegatedBy: "coordinator",
    assignedTo: "executor",
  })
  tn2.status = "planned"
  wp.tasks = [tn1, tn2]

  const graph = { version: "3.0.0", activeWorkPlanId: wp.id, workPlans: [wp] }
  stateManager.saveTaskGraph(graph)
  setActiveTask("sys-test-16", { id: tn1.id, name: tn1.name })

  const system = await runHook(dir, "sys-test-16")

  assert("planAhead: includes next task", system[0].includes("Next task in queue"))
}

async function test17_budgetStillEnforcedWithChain(): Promise<void> {
  process.stdout.write("\nSystem Hook — Budget with Chain Context\n")

  const dir = createTestDir("budget-chain")
  writeConfig(dir)

  const { stateManager } = await import("../src/lib/persistence.js")
  const { createWorkPlan, createTaskNode, createCheckpoint } = await import("../src/schemas/work-plan.js")

  const wp = createWorkPlan({ name: "A".repeat(100) })
  wp.status = "active"
  const tn = createTaskNode({
    workPlanId: wp.id,
    name: "B".repeat(100),
    expectedOutput: "C".repeat(200),
    delegatedBy: "idumb-supreme-coordinator",
    assignedTo: "idumb-executor",
  })
  tn.status = "active"
  for (let i = 0; i < 20; i++) {
    tn.checkpoints.push(createCheckpoint(tn.id, "write", `checkpoint ${i} ${"x".repeat(50)}`))
  }
  wp.tasks = [tn]

  const graph = { version: "3.0.0", activeWorkPlanId: wp.id, workPlans: [wp] }
  stateManager.saveTaskGraph(graph)
  setActiveTask("sys-test-17", { id: tn.id, name: tn.name })

  for (let i = 0; i < 10; i++) {
    addAnchor("sys-test-17", createAnchor("decision", "critical", `Decision ${i}: ${"y".repeat(100)}`))
  }

  const system = await runHook(dir, "sys-test-17")

  assert("budget: injection under 800 chars with chain", system[0].length <= 800)
  assert("budget: closing tag preserved", system[0].includes("</idumb-governance>"))
}

// ─── Runner ───────────────────────────────────────────────────────────

async function main(): Promise<void> {
  await test1_noConfigGracefulDegradation()
  await test2_configLoadedAndCached()
  await test3_frameworkOverlayGSD()
  await test4_frameworkOverlaySpecKit()
  await test5_frameworkOverlayNone()
  await test6_governanceModes()
  await test7_activeTaskIncluded()
  await test8_noTaskInstructive()
  await test9_criticalAnchorsIncluded()
  await test10_noDenyLanguage()
  await test11_budgetEnforced()
  await test12_noSessionIDSkips()
  await test13_bmadFrameworkOverlay()
  await test14_workPlanProgressInjected()
  await test15_delegationContextInjected()
  await test16_planAheadVisibility()
  await test17_budgetStillEnforcedWithChain()

  const total = passed + failed
  const summary = `\nResults: ${passed}/${total} passed, ${failed} failed`
  process.stdout.write(`${summary}\n`)
  process.exit(failed > 0 ? 1 : 0)
}

main()
