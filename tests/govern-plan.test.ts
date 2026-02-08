/**
 * Story 11-01: govern_plan tool tests
 *
 * Tests all 6 actions: create, plan_tasks, status, archive, abandon, phase
 *
 * Approach:
 * - Uses the stateManager singleton directly (in-memory, no disk init needed)
 * - Calls govern_plan.execute() with mock context
 * - Resets TaskGraph between test groups to avoid state leaks
 */

import { govern_plan } from "../src/tools/govern-plan.js"
import { stateManager } from "../src/lib/persistence.js"
import {
    createEmptyTaskGraph,
    createWorkPlan,
    createTaskNode,
} from "../src/schemas/work-plan.js"
import { createPlanState, createPlanPhase } from "../src/schemas/plan-state.js"

// ─── Test Harness ─────────────────────────────────────────────────────

let passed = 0
let failed = 0

function assert(condition: boolean, name: string): void {
    if (condition) {
        passed++
        process.stderr.write(`  PASS: ${name}\n`)
    } else {
        failed++
        process.stderr.write(`  FAIL: ${name}\n`)
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────

const SESSION_ID = "test-govern-plan"

function ctx(): { sessionID: string } {
    return { sessionID: SESSION_ID }
}

function resetGraph(): void {
    stateManager.saveTaskGraph(createEmptyTaskGraph())
}

// ─── Tests ────────────────────────────────────────────────────────────

async function test_create_success(): Promise<void> {
    process.stderr.write("\n--- create: success ---\n")
    resetGraph()

    const result = await govern_plan.execute(
        { action: "create", name: "Auth Module" } as any,
        ctx() as any,
    )
    const output = result as string

    assert(output.includes("WorkPlan created"), "create returns success message")
    assert(output.includes("Auth Module"), "create returns plan name")
    assert(output.includes("Status: active"), "first plan is auto-activated")

    // Verify graph state
    const graph = stateManager.getTaskGraph()
    assert(graph.workPlans.length === 1, "graph has 1 plan")
    assert(graph.activeWorkPlanId === graph.workPlans[0].id, "active plan ID set")
}

async function test_create_with_acceptance(): Promise<void> {
    process.stderr.write("\n--- create: with acceptance criteria ---\n")
    resetGraph()

    const result = await govern_plan.execute(
        { action: "create", name: "Login Feature", acceptance: "Tests pass,UI renders" } as any,
        ctx() as any,
    )
    const output = result as string

    assert(output.includes("Tests pass"), "acceptance criteria in output")
    assert(output.includes("UI renders"), "second criterion in output")

    const graph = stateManager.getTaskGraph()
    const wp = graph.workPlans[0]
    assert(wp.acceptance.length === 2, "plan has 2 acceptance criteria")
}

async function test_create_missing_name(): Promise<void> {
    process.stderr.write("\n--- create: missing name ---\n")
    resetGraph()

    const result = await govern_plan.execute(
        { action: "create" } as any,
        ctx() as any,
    )
    const output = result as string

    assert(output.includes("ERROR"), "missing name returns ERROR")
    assert(output.includes("name"), "error mentions 'name'")
}

async function test_create_invalid_category(): Promise<void> {
    process.stderr.write("\n--- create: invalid category ---\n")
    resetGraph()

    const result = await govern_plan.execute(
        { action: "create", name: "Test", category: "invalid-cat" } as any,
        ctx() as any,
    )
    const output = result as string

    assert(output.includes("ERROR"), "invalid category returns ERROR")
    assert(output.includes("invalid-cat"), "error mentions the invalid category")
}

async function test_plan_tasks_success(): Promise<void> {
    process.stderr.write("\n--- plan_tasks: success ---\n")
    resetGraph()

    // Create a plan first
    await govern_plan.execute(
        { action: "create", name: "Test Plan" } as any,
        ctx() as any,
    )

    const result = await govern_plan.execute(
        {
            action: "plan_tasks",
            name: "Build login form",
            expected_output: "Login page renders",
            assigned_to: "idumb-executor",
        } as any,
        ctx() as any,
    )
    const output = result as string

    assert(output.includes("TaskNode added"), "plan_tasks returns success")
    assert(output.includes("Build login form"), "task name in output")
    assert(output.includes("Login page renders"), "expected output in output")

    const graph = stateManager.getTaskGraph()
    const wp = graph.workPlans[0]
    assert(wp.tasks.length === 1, "plan has 1 task")
    assert(wp.tasks[0].name === "Build login form", "task name stored correctly")
    assert(wp.tasks[0].assignedTo === "idumb-executor", "task assigned to executor")
}

async function test_plan_tasks_missing_name(): Promise<void> {
    process.stderr.write("\n--- plan_tasks: missing name ---\n")
    resetGraph()

    await govern_plan.execute(
        { action: "create", name: "Test Plan" } as any,
        ctx() as any,
    )

    const result = await govern_plan.execute(
        { action: "plan_tasks", expected_output: "Something" } as any,
        ctx() as any,
    )
    const output = result as string

    assert(output.includes("ERROR"), "missing name returns ERROR")
}

async function test_plan_tasks_missing_expected_output(): Promise<void> {
    process.stderr.write("\n--- plan_tasks: missing expected_output ---\n")
    resetGraph()

    await govern_plan.execute(
        { action: "create", name: "Test Plan" } as any,
        ctx() as any,
    )

    const result = await govern_plan.execute(
        { action: "plan_tasks", name: "Task A" } as any,
        ctx() as any,
    )
    const output = result as string

    assert(output.includes("ERROR"), "missing expected_output returns ERROR")
    assert(output.includes("expected_output"), "error mentions expected_output")
}

async function test_plan_tasks_invalid_dependency(): Promise<void> {
    process.stderr.write("\n--- plan_tasks: invalid dependency ---\n")
    resetGraph()

    await govern_plan.execute(
        { action: "create", name: "Test Plan" } as any,
        ctx() as any,
    )

    const result = await govern_plan.execute(
        {
            action: "plan_tasks",
            name: "Task B",
            expected_output: "output B",
            depends_on: "tn-nonexistent-id",
        } as any,
        ctx() as any,
    )
    const output = result as string

    assert(output.includes("ERROR"), "invalid dependency returns ERROR")
    assert(output.includes("tn-nonexistent-id"), "error mentions the bad ID")
}

async function test_plan_tasks_plan_ahead(): Promise<void> {
    process.stderr.write("\n--- plan_tasks: plan_ahead flag ---\n")
    resetGraph()

    await govern_plan.execute(
        { action: "create", name: "Test Plan" } as any,
        ctx() as any,
    )

    await govern_plan.execute(
        {
            action: "plan_tasks",
            name: "Future Task",
            expected_output: "future output",
            plan_ahead: true,
        } as any,
        ctx() as any,
    )

    const graph = stateManager.getTaskGraph()
    const wp = graph.workPlans[0]
    assert(wp.tasks.length === 0, "no tasks in main list")
    assert(wp.planAhead.length === 1, "task added to planAhead")
    assert(wp.planAhead[0].name === "Future Task", "planAhead task name correct")
}

async function test_plan_tasks_auto_blocks_unmet_deps(): Promise<void> {
    process.stderr.write("\n--- plan_tasks: auto-blocks when deps not met ---\n")
    resetGraph()

    await govern_plan.execute(
        { action: "create", name: "Test Plan" } as any,
        ctx() as any,
    )

    // Add Task A
    await govern_plan.execute(
        {
            action: "plan_tasks",
            name: "Task A",
            expected_output: "output A",
        } as any,
        ctx() as any,
    )

    const graph = stateManager.getTaskGraph()
    const taskA = graph.workPlans[0].tasks[0]

    // Add Task B depending on Task A (which is not completed)
    await govern_plan.execute(
        {
            action: "plan_tasks",
            name: "Task B",
            expected_output: "output B",
            depends_on: taskA.id,
        } as any,
        ctx() as any,
    )

    const updatedGraph = stateManager.getTaskGraph()
    const taskB = updatedGraph.workPlans[0].tasks[1]
    assert(taskB.status === "blocked", "task with unmet deps is auto-blocked")
}

async function test_status_empty_graph(): Promise<void> {
    process.stderr.write("\n--- status: empty graph ---\n")
    resetGraph()

    const result = await govern_plan.execute(
        { action: "status" } as any,
        ctx() as any,
    )
    const output = result as string

    assert(output.includes("No work plans"), "empty graph shows no plans message")
}

async function test_status_with_target_id(): Promise<void> {
    process.stderr.write("\n--- status: with target_id ---\n")
    resetGraph()

    await govern_plan.execute(
        { action: "create", name: "Detail Plan", acceptance: "tests pass" } as any,
        ctx() as any,
    )

    const graph = stateManager.getTaskGraph()
    const wpId = graph.workPlans[0].id

    const result = await govern_plan.execute(
        { action: "status", target_id: wpId } as any,
        ctx() as any,
    )
    const output = result as string

    assert(output.includes("Detail Plan"), "status with target_id shows plan name")
    assert(output.includes(wpId), "status shows plan ID")
}

async function test_status_invalid_target_id(): Promise<void> {
    process.stderr.write("\n--- status: invalid target_id ---\n")
    resetGraph()

    const result = await govern_plan.execute(
        { action: "status", target_id: "wp-nonexistent" } as any,
        ctx() as any,
    )
    const output = result as string

    assert(output.includes("ERROR"), "invalid target_id returns ERROR")
}

async function test_archive_success(): Promise<void> {
    process.stderr.write("\n--- archive: success ---\n")
    resetGraph()

    // Create and complete a plan
    await govern_plan.execute(
        { action: "create", name: "Archivable Plan" } as any,
        ctx() as any,
    )

    const graph = stateManager.getTaskGraph()
    const wp = graph.workPlans[0]
    wp.status = "completed"
    wp.completedAt = Date.now()
    stateManager.saveTaskGraph(graph)

    const result = await govern_plan.execute(
        { action: "archive", target_id: wp.id } as any,
        ctx() as any,
    )
    const output = result as string

    assert(output.includes("archived"), "archive returns archived message")

    const updatedGraph = stateManager.getTaskGraph()
    assert(updatedGraph.workPlans[0].status === "archived", "plan status is archived")
    assert(updatedGraph.activeWorkPlanId === null, "active plan ID cleared")
}

async function test_archive_non_completed(): Promise<void> {
    process.stderr.write("\n--- archive: non-completed plan ---\n")
    resetGraph()

    await govern_plan.execute(
        { action: "create", name: "Active Plan" } as any,
        ctx() as any,
    )

    const graph = stateManager.getTaskGraph()
    const wp = graph.workPlans[0]

    const result = await govern_plan.execute(
        { action: "archive", target_id: wp.id } as any,
        ctx() as any,
    )
    const output = result as string

    assert(output.includes("ERROR"), "archiving non-completed plan returns ERROR")
    assert(output.includes("active"), "error mentions current status")
}

async function test_abandon_success(): Promise<void> {
    process.stderr.write("\n--- abandon: success ---\n")
    resetGraph()

    await govern_plan.execute(
        { action: "create", name: "Doomed Plan" } as any,
        ctx() as any,
    )

    const graph = stateManager.getTaskGraph()
    const wp = graph.workPlans[0]

    const result = await govern_plan.execute(
        { action: "abandon", target_id: wp.id } as any,
        ctx() as any,
    )
    const output = result as string

    assert(output.includes("abandoned"), "abandon returns abandoned message")
    assert(output.includes("purged"), "abandon mentions purge schedule")

    const updatedGraph = stateManager.getTaskGraph()
    assert(updatedGraph.workPlans[0].status === "abandoned", "plan status is abandoned")
    assert(updatedGraph.activeWorkPlanId === null, "active plan ID cleared")
}

async function test_abandon_no_target(): Promise<void> {
    process.stderr.write("\n--- abandon: no target and no active plan ---\n")
    resetGraph()

    const result = await govern_plan.execute(
        { action: "abandon" } as any,
        ctx() as any,
    )
    const output = result as string

    assert(output.includes("ERROR"), "abandon with no target returns ERROR")
}

async function test_phase_success(): Promise<void> {
    process.stderr.write("\n--- phase: success ---\n")

    // Set up plan state with phases
    const planState = createPlanState({
        planName: "Test Plan",
        phases: [
            createPlanPhase({ id: 1, name: "Phase One" }),
            createPlanPhase({ id: 2, name: "Phase Two" }),
        ],
    })
    stateManager.setPlanState(planState)

    const result = await govern_plan.execute(
        { action: "phase", phase_id: 1, phase_status: "in_progress" } as any,
        ctx() as any,
    )
    const output = result as string

    assert(output.includes("Phase One"), "phase update shows phase name")
    assert(output.includes("in_progress"), "phase update shows new status")

    const updated = stateManager.getPlanState()
    assert(updated.currentPhaseId === 1, "currentPhaseId updated to 1")
}

async function test_phase_completion_auto_advances(): Promise<void> {
    process.stderr.write("\n--- phase: completion auto-advances ---\n")

    const planState = createPlanState({
        planName: "Test Plan",
        phases: [
            createPlanPhase({ id: 1, name: "Phase One", status: "in_progress" }),
            createPlanPhase({ id: 2, name: "Phase Two" }),
        ],
    })
    planState.currentPhaseId = 1
    stateManager.setPlanState(planState)

    const result = await govern_plan.execute(
        { action: "phase", phase_id: 1, phase_status: "completed" } as any,
        ctx() as any,
    )
    const output = result as string

    assert(output.includes("completed"), "phase completion confirmed")

    const updated = stateManager.getPlanState()
    const phase1 = updated.phases.find(p => p.id === 1)!
    assert(phase1.completedAt !== null, "completedAt timestamp set")
    assert(updated.currentPhaseId === 2, "auto-advanced to next pending phase")
}

async function test_phase_missing_phase_id(): Promise<void> {
    process.stderr.write("\n--- phase: missing phase_id ---\n")

    const result = await govern_plan.execute(
        { action: "phase", phase_status: "in_progress" } as any,
        ctx() as any,
    )
    const output = result as string

    assert(output.includes("ERROR"), "missing phase_id returns ERROR")
    assert(output.includes("phase_id"), "error mentions phase_id")
}

async function test_phase_invalid_status(): Promise<void> {
    process.stderr.write("\n--- phase: invalid status ---\n")

    const planState = createPlanState({
        planName: "Test Plan",
        phases: [createPlanPhase({ id: 1, name: "Phase One" })],
    })
    stateManager.setPlanState(planState)

    const result = await govern_plan.execute(
        { action: "phase", phase_id: 1, phase_status: "bogus" } as any,
        ctx() as any,
    )
    const output = result as string

    assert(output.includes("ERROR"), "invalid status returns ERROR")
    assert(output.includes("bogus"), "error mentions the bad status")
}

async function test_unknown_action(): Promise<void> {
    process.stderr.write("\n--- unknown action ---\n")

    const result = await govern_plan.execute(
        { action: "explode" } as any,
        ctx() as any,
    )
    const output = result as string

    assert(output.includes("Unknown action"), "unknown action returns error")
}

// ─── Runner ───────────────────────────────────────────────────────────

async function main(): Promise<void> {
    process.stderr.write("=== govern_plan tool tests ===\n")

    await test_create_success()
    await test_create_with_acceptance()
    await test_create_missing_name()
    await test_create_invalid_category()
    await test_plan_tasks_success()
    await test_plan_tasks_missing_name()
    await test_plan_tasks_missing_expected_output()
    await test_plan_tasks_invalid_dependency()
    await test_plan_tasks_plan_ahead()
    await test_plan_tasks_auto_blocks_unmet_deps()
    await test_status_empty_graph()
    await test_status_with_target_id()
    await test_status_invalid_target_id()
    await test_archive_success()
    await test_archive_non_completed()
    await test_abandon_success()
    await test_abandon_no_target()
    await test_phase_success()
    await test_phase_completion_auto_advances()
    await test_phase_missing_phase_id()
    await test_phase_invalid_status()
    await test_unknown_action()

    const total = passed + failed
    const summary = `\nResults: ${passed}/${total} passed, ${failed} failed`
    process.stderr.write(summary + "\n")
    process.exit(failed > 0 ? 1 : 0)
}

main()
