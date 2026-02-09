/**
 * Lifecycle Verb tests — tasks_start, tasks_done, tasks_check, tasks_add, tasks_fail
 */

import { start, done, check, add, fail } from "../src/tools/tasks.js"
import { stateManager } from "../src/lib/persistence.js"
import {
  createEmptyTaskGraph,
  createWorkPlan,
  createTaskNode,
} from "../src/schemas/work-plan.js"

// ─── Harness ─────────────────────────────────────────────────────────

let passed = 0, failed_ = 0
function assert(cond: boolean, name: string) {
  if (cond) { passed++; process.stderr.write(`  PASS: ${name}\n`) }
  else { failed_++; process.stderr.write(`  FAIL: ${name}\n`) }
}

let sid = 0
function ctx(s?: string) { return { sessionID: s ?? `tasks-test-${++sid}` } }
function reset() { stateManager.saveTaskGraph(createEmptyTaskGraph()) }

// ─── tasks_start ─────────────────────────────────────────────────────

async function test_start_basic() {
  process.stderr.write("\n--- tasks_start: basic ---\n")
  reset()
  const s = `start-${++sid}`
  const out = await start.execute({ objective: "Fix auth bug" } as any, ctx(s) as any) as string

  assert(out.includes('Active: "Fix auth bug"'), "1-line output with task name")
  assert(!out.includes("Navigation"), "no navigation footer")
  assert(!out.includes("Classification"), "no classification output")

  const g = stateManager.getTaskGraph()
  assert(g.workPlans.length === 1, "plan created")
  assert(g.workPlans[0].tasks[0].status === "active", "task active")
  assert(stateManager.getActiveTask(s) !== null, "session bridge set")
}

async function test_start_reuses_plan() {
  process.stderr.write("\n--- tasks_start: reuses active plan ---\n")
  reset()
  const g = createEmptyTaskGraph()
  const wp = createWorkPlan({ name: "Existing" })
  wp.status = "active"; g.activeWorkPlanId = wp.id; g.workPlans.push(wp)
  stateManager.saveTaskGraph(g)

  await start.execute({ objective: "New task" } as any, ctx() as any)
  const u = stateManager.getTaskGraph()
  assert(u.workPlans.length === 1, "no extra plan")
  assert(u.workPlans[0].name === "Existing", "reused existing")
  assert(u.workPlans[0].tasks.length === 1, "task added")
}

// ─── tasks_done ──────────────────────────────────────────────────────

async function test_done_basic() {
  process.stderr.write("\n--- tasks_done: basic ---\n")
  reset()
  const s = `done-${++sid}`
  await start.execute({ objective: "Do thing" } as any, ctx(s) as any)

  const out = await done.execute({ evidence: "Tests pass" } as any, ctx(s) as any) as string
  assert(out.includes('Done: "Do thing"'), "1-line done output")
  assert(!out.includes("Navigation"), "no navigation footer")
  assert(stateManager.getActiveTask(s) === null, "session cleared")

  const g = stateManager.getTaskGraph()
  assert(g.workPlans[0].tasks[0].status === "completed", "task completed")
}

async function test_done_no_task() {
  process.stderr.write("\n--- tasks_done: no active task ---\n")
  reset()
  const out = await done.execute({ evidence: "done" } as any, ctx() as any) as string
  assert(out.includes("ERROR"), "error when no task")
}

async function test_done_unblocks() {
  process.stderr.write("\n--- tasks_done: unblocks dependents ---\n")
  reset()
  const g = createEmptyTaskGraph()
  const wp = createWorkPlan({ name: "Chain" })
  wp.status = "active"; g.activeWorkPlanId = wp.id

  const a = createTaskNode({ workPlanId: wp.id, name: "A", expectedOutput: "a", delegatedBy: "c", assignedTo: "e" })
  a.status = "active"; a.startedAt = Date.now()
  const b = createTaskNode({ workPlanId: wp.id, name: "B", expectedOutput: "b", delegatedBy: "c", assignedTo: "e", dependsOn: [a.id] })
  b.status = "blocked"
  wp.tasks = [a, b]; g.workPlans.push(wp)
  stateManager.saveTaskGraph(g)

  const s = `chain-${++sid}`
  stateManager.setActiveTask(s, { id: a.id, name: a.name })

  await done.execute({ evidence: "done" } as any, ctx(s) as any)
  assert(stateManager.getTaskGraph().workPlans[0].tasks[1].status === "planned", "B unblocked to planned")
}

// ─── tasks_check ─────────────────────────────────────────────────────

async function test_check_json() {
  process.stderr.write("\n--- tasks_check: returns JSON ---\n")
  reset()
  const s = `check-${++sid}`
  await start.execute({ objective: "My task" } as any, ctx(s) as any)

  const out = await check.execute({} as any, ctx(s) as any) as string
  let parsed: any
  try { parsed = JSON.parse(out) } catch { parsed = null }
  assert(parsed !== null, "output is valid JSON")
  assert(parsed?.activeTask?.name === "My task", "JSON contains active task name")
  assert(parsed?.workPlan !== null, "JSON contains work plan")
  assert(parsed?.progress !== null, "JSON contains progress")
}

async function test_check_empty() {
  process.stderr.write("\n--- tasks_check: empty state ---\n")
  reset()
  const out = await check.execute({} as any, ctx() as any) as string
  const parsed = JSON.parse(out)
  assert(parsed.activeTask === null, "no active task")
  assert(parsed.workPlan === null, "no work plan")
}

// ─── tasks_add ───────────────────────────────────────────────────────

async function test_add_basic() {
  process.stderr.write("\n--- tasks_add: basic ---\n")
  reset()
  const s = `add-${++sid}`
  // Create a plan first via start
  await start.execute({ objective: "First task" } as any, ctx(s) as any)

  const out = await add.execute({ title: "Second task" } as any, ctx(s) as any) as string
  assert(out.includes('Added: "Second task"'), "1-line added output")
  assert(!out.includes("depends on"), "no dependency note without after")

  const g = stateManager.getTaskGraph()
  assert(g.workPlans[0].tasks.length === 2, "two tasks in plan")
}

async function test_add_with_dep() {
  process.stderr.write("\n--- tasks_add: with dependency ---\n")
  reset()
  const s = `adddep-${++sid}`
  await start.execute({ objective: "Research" } as any, ctx(s) as any)
  const out = await add.execute({ title: "Build", after: "Research" } as any, ctx(s) as any) as string

  assert(out.includes('depends on: "Research"'), "dependency noted in output")
  const g = stateManager.getTaskGraph()
  const buildTask = g.workPlans[0].tasks.find(t => t.name === "Build")
  assert(buildTask?.status === "blocked", "dependent task is blocked")
  assert(buildTask?.dependsOn.length === 1, "has one dependency")
}

async function test_add_creates_plan() {
  process.stderr.write("\n--- tasks_add: auto-creates plan ---\n")
  reset()
  const out = await add.execute({ title: "Standalone task" } as any, ctx() as any) as string
  assert(out.includes('Added: "Standalone task"'), "task added")
  const g = stateManager.getTaskGraph()
  assert(g.workPlans.length === 1, "plan auto-created")
}

// ─── tasks_fail ──────────────────────────────────────────────────────

async function test_fail_basic() {
  process.stderr.write("\n--- tasks_fail: basic ---\n")
  reset()
  const s = `fail-${++sid}`
  await start.execute({ objective: "Risky task" } as any, ctx(s) as any)

  const out = await fail.execute({ reason: "Tests broken" } as any, ctx(s) as any) as string
  assert(out.includes('Failed: "Risky task"'), "1-line fail output")
  assert(!out.includes("Navigation"), "no navigation footer")
  assert(!out.includes("Recovery"), "no recovery guidance prose")
  assert(stateManager.getActiveTask(s) === null, "session cleared")
  assert(stateManager.getTaskGraph().workPlans[0].tasks[0].status === "failed", "task failed")
}

async function test_fail_no_task() {
  process.stderr.write("\n--- tasks_fail: no active task ---\n")
  reset()
  const out = await fail.execute({ reason: "x" } as any, ctx() as any) as string
  assert(out.includes("ERROR"), "error when no active task")
}

async function test_fail_blocks_deps() {
  process.stderr.write("\n--- tasks_fail: blocks dependents ---\n")
  reset()
  const g = createEmptyTaskGraph()
  const wp = createWorkPlan({ name: "Fail chain" })
  wp.status = "active"; g.activeWorkPlanId = wp.id

  const a = createTaskNode({ workPlanId: wp.id, name: "A", expectedOutput: "a", delegatedBy: "c", assignedTo: "e" })
  a.status = "active"; a.startedAt = Date.now()
  const b = createTaskNode({ workPlanId: wp.id, name: "B", expectedOutput: "b", delegatedBy: "c", assignedTo: "e", dependsOn: [a.id] })
  b.status = "planned"
  wp.tasks = [a, b]; g.workPlans.push(wp)
  stateManager.saveTaskGraph(g)

  const s = `fchain-${++sid}`
  stateManager.setActiveTask(s, { id: a.id, name: a.name })

  await fail.execute({ reason: "nope" } as any, ctx(s) as any)
  assert(stateManager.getTaskGraph().workPlans[0].tasks[1].status === "blocked", "B blocked")
}

// ─── getGovernanceStatus ─────────────────────────────────────────────

async function test_governance_status() {
  process.stderr.write("\n--- getGovernanceStatus: populated ---\n")
  reset()
  const s = `gov-${++sid}`
  await start.execute({ objective: "Gov test" } as any, ctx(s) as any)
  await add.execute({ title: "Next thing", after: "Gov test" } as any, ctx(s) as any)

  const status = stateManager.getGovernanceStatus(s)
  assert(status.activeTask?.name === "Gov test", "active task resolved")
  assert(status.workPlan !== null, "work plan present")
  assert(status.progress?.total === 2, "progress shows 2 tasks")
  assert(status.progress?.completed === 0, "0 completed")
  assert(status.nextPlanned?.name === "Next thing", "next planned resolved")
}

async function test_governance_status_empty() {
  process.stderr.write("\n--- getGovernanceStatus: empty ---\n")
  reset()
  const status = stateManager.getGovernanceStatus(`empty-${++sid}`)
  assert(status.activeTask === null, "no active task")
  assert(status.workPlan === null, "no work plan")
  assert(status.progress === null, "no progress")
  assert(status.agent === null, "no agent")
}

// ─── tasks_start: acceptance criteria (R3 absorb from govern_plan) ───

async function test_start_with_acceptance() {
  process.stderr.write("\n--- tasks_start: with acceptance criteria ---\n")
  reset()
  const s = `accept-${++sid}`
  const out = await start.execute(
    { objective: "Build auth system", acceptance: "Login works,Tests pass,No regressions" } as any,
    ctx(s) as any,
  ) as string

  assert(out.includes('Active: "Build auth system"'), "1-line output preserved")

  const g = stateManager.getTaskGraph()
  const wp = g.workPlans[0]
  assert(wp.acceptance.length === 3, "acceptance has 3 criteria")
  assert(wp.acceptance[0] === "Login works", "first criterion parsed")
  assert(wp.acceptance[1] === "Tests pass", "second criterion parsed")
  assert(wp.acceptance[2] === "No regressions", "third criterion parsed")
}

async function test_start_acceptance_empty_when_omitted() {
  process.stderr.write("\n--- tasks_start: acceptance empty when omitted ---\n")
  reset()
  const s = `noacc-${++sid}`
  await start.execute({ objective: "Quick fix" } as any, ctx(s) as any)

  const g = stateManager.getTaskGraph()
  assert(g.workPlans[0].acceptance.length === 0, "acceptance defaults to empty array")
}

// ─── tasks_add: expected_output (R3 absorb from govern_plan) ─────────

async function test_add_with_expected_output() {
  process.stderr.write("\n--- tasks_add: with expected_output ---\n")
  reset()
  const s = `eo-${++sid}`
  await start.execute({ objective: "Setup" } as any, ctx(s) as any)

  const out = await add.execute(
    { title: "Build login form", expected_output: "Login page renders and submits" } as any,
    ctx(s) as any,
  ) as string

  assert(out.includes('Added: "Build login form"'), "1-line output preserved")

  const g = stateManager.getTaskGraph()
  const task = g.workPlans[0].tasks.find(t => t.name === "Build login form")
  assert(task !== undefined, "task exists")
  assert(task!.expectedOutput === "Login page renders and submits", "expectedOutput uses provided value")
  assert(task!.expectedOutput !== task!.name, "expectedOutput differs from name")
}

async function test_add_without_expected_output() {
  process.stderr.write("\n--- tasks_add: expectedOutput defaults to title ---\n")
  reset()
  const s = `noeo-${++sid}`
  await start.execute({ objective: "Setup" } as any, ctx(s) as any)

  await add.execute({ title: "Write unit tests" } as any, ctx(s) as any)

  const g = stateManager.getTaskGraph()
  const task = g.workPlans[0].tasks.find(t => t.name === "Write unit tests")
  assert(task !== undefined, "task exists")
  assert(task!.expectedOutput === "Write unit tests", "expectedOutput defaults to title")
}

// ─── Runner ──────────────────────────────────────────────────────────

async function main() {
  process.stderr.write("=== Lifecycle Verb tests ===\n")

  await test_start_basic()
  await test_start_reuses_plan()

  await test_done_basic()
  await test_done_no_task()
  await test_done_unblocks()

  await test_check_json()
  await test_check_empty()

  await test_add_basic()
  await test_add_with_dep()
  await test_add_creates_plan()

  await test_fail_basic()
  await test_fail_no_task()
  await test_fail_blocks_deps()

  await test_governance_status()
  await test_governance_status_empty()

  // R3: govern_plan absorption tests
  await test_start_with_acceptance()
  await test_start_acceptance_empty_when_omitted()
  await test_add_with_expected_output()
  await test_add_without_expected_output()

  const total = passed + failed_
  process.stderr.write(`\nResults: ${passed}/${total} passed, ${failed_} failed\n`)
  process.exit(failed_ > 0 ? 1 : 0)
}

main()
