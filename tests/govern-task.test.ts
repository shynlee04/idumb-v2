/**
 * Story 11-02: govern_task tool tests
 *
 * Tests all 6 actions: quick_start, start, complete, fail, review, status
 *
 * Approach:
 * - Uses the stateManager singleton directly (in-memory, no disk init needed)
 * - Calls govern_task.execute() with mock context
 * - Resets TaskGraph between test groups to avoid state leaks
 */

import { govern_task } from "../src/tools/govern-task.js"
import { stateManager } from "../src/lib/persistence.js"
import {
    createEmptyTaskGraph,
    createWorkPlan,
    createTaskNode,
} from "../src/schemas/work-plan.js"
import type { TaskGraph } from "../src/schemas/work-plan.js"

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

let sessionCounter = 0
function freshSessionId(): string {
    return `test-govern-task-${++sessionCounter}`
}

function ctx(sessionID?: string): { sessionID: string } {
    return { sessionID: sessionID ?? freshSessionId() }
}

function resetGraph(): void {
    stateManager.saveTaskGraph(createEmptyTaskGraph())
}

/** Create a graph with an active plan and a planned task, return { graph, wpId, tnId, sessionID } */
function setupActivePlanWithTask(opts?: {
    taskStatus?: "planned" | "active" | "completed" | "blocked" | "review" | "failed"
    dependsOn?: string[]
}): { graph: TaskGraph; wpId: string; tnId: string; sessionID: string } {
    const graph = createEmptyTaskGraph()
    const wp = createWorkPlan({ name: "Test Plan" })
    wp.status = "active"
    graph.activeWorkPlanId = wp.id

    const tn = createTaskNode({
        workPlanId: wp.id,
        name: "Test Task",
        expectedOutput: "test output",
        delegatedBy: "idumb-supreme-coordinator",
        assignedTo: "idumb-executor",
        dependsOn: opts?.dependsOn,
    })
    tn.status = opts?.taskStatus ?? "planned"

    if (tn.status === "active") {
        tn.startedAt = Date.now()
    }

    wp.tasks.push(tn)
    graph.workPlans.push(wp)
    stateManager.saveTaskGraph(graph)

    const sessionID = freshSessionId()

    // If task is active, register it as the active task in the session
    if (tn.status === "active") {
        stateManager.setActiveTask(sessionID, { id: tn.id, name: tn.name })
    }

    return { graph, wpId: wp.id, tnId: tn.id, sessionID }
}

// ─── Tests: quick_start ───────────────────────────────────────────────

async function test_quick_start_success(): Promise<void> {
    process.stderr.write("\n--- quick_start: success ---\n")
    resetGraph()

    const sessionID = freshSessionId()
    const result = await govern_task.execute(
        { action: "quick_start", name: "Fix auth bug" } as any,
        ctx(sessionID) as any,
    )
    const output = result as string

    assert(output.includes("Quick start"), "quick_start returns success message")
    assert(output.includes("Fix auth bug"), "output includes task name")
    assert(output.includes("UNLOCKED"), "output says writes unlocked")

    // Verify graph state
    const graph = stateManager.getTaskGraph()
    assert(graph.workPlans.length === 1, "plan created")
    assert(graph.workPlans[0].status === "active", "plan is active")
    assert(graph.workPlans[0].tasks.length === 1, "plan has 1 task")
    assert(graph.workPlans[0].tasks[0].status === "active", "task is active")

    // Verify session active task (write gate bridge)
    const activeTask = stateManager.getActiveTask(sessionID)
    assert(activeTask !== null, "session active task set")
    assert(activeTask?.name === "Fix auth bug", "active task name matches")
}

async function test_quick_start_uses_existing_plan(): Promise<void> {
    process.stderr.write("\n--- quick_start: uses existing active plan ---\n")
    resetGraph()

    // Pre-create an active plan
    const graph = createEmptyTaskGraph()
    const wp = createWorkPlan({ name: "Existing Plan" })
    wp.status = "active"
    graph.activeWorkPlanId = wp.id
    graph.workPlans.push(wp)
    stateManager.saveTaskGraph(graph)

    const sessionID = freshSessionId()
    await govern_task.execute(
        { action: "quick_start", name: "New Task" } as any,
        ctx(sessionID) as any,
    )

    const updated = stateManager.getTaskGraph()
    assert(updated.workPlans.length === 1, "no new plan created")
    assert(updated.workPlans[0].name === "Existing Plan", "existing plan reused")
    assert(updated.workPlans[0].tasks.length === 1, "task added to existing plan")
}

async function test_quick_start_missing_name(): Promise<void> {
    process.stderr.write("\n--- quick_start: missing name ---\n")
    resetGraph()

    const result = await govern_task.execute(
        { action: "quick_start" } as any,
        ctx() as any,
    )
    const output = result as string

    assert(output.includes("ERROR"), "missing name returns ERROR")
    assert(output.includes("name"), "error mentions name")
}

// ─── Tests: start ─────────────────────────────────────────────────────

async function test_start_success(): Promise<void> {
    process.stderr.write("\n--- start: success ---\n")
    const { tnId, sessionID } = setupActivePlanWithTask({ taskStatus: "planned" })

    const result = await govern_task.execute(
        { action: "start", target_id: tnId } as any,
        ctx(sessionID) as any,
    )
    const output = result as string

    assert(output.includes("Task started"), "start returns success message")
    assert(output.includes("UNLOCKED"), "output says writes unlocked")

    // Verify task status
    const graph = stateManager.getTaskGraph()
    const wp = graph.workPlans[0]
    assert(wp.tasks[0].status === "active", "task status is active")
    assert(wp.tasks[0].startedAt !== undefined, "startedAt is set")

    // Verify session bridge
    const activeTask = stateManager.getActiveTask(sessionID)
    assert(activeTask?.id === tnId, "session active task set to started task")
}

async function test_start_missing_target_id(): Promise<void> {
    process.stderr.write("\n--- start: missing target_id ---\n")
    resetGraph()

    const result = await govern_task.execute(
        { action: "start" } as any,
        ctx() as any,
    )
    const output = result as string

    assert(output.includes("ERROR"), "missing target_id returns ERROR")
    assert(output.includes("target_id"), "error mentions target_id")
}

async function test_start_invalid_target_id(): Promise<void> {
    process.stderr.write("\n--- start: invalid target_id ---\n")
    resetGraph()

    const result = await govern_task.execute(
        { action: "start", target_id: "tn-nonexistent" } as any,
        ctx() as any,
    )
    const output = result as string

    assert(output.includes("ERROR"), "invalid target_id returns ERROR")
    assert(output.includes("tn-nonexistent"), "error mentions the bad ID")
}

async function test_start_blocked_by_dependency(): Promise<void> {
    process.stderr.write("\n--- start: blocked by dependency ---\n")

    // Build a graph with Task A (planned) and Task B (depends on A)
    const graph = createEmptyTaskGraph()
    const wp = createWorkPlan({ name: "Dep Plan" })
    wp.status = "active"
    graph.activeWorkPlanId = wp.id

    const tnA = createTaskNode({
        workPlanId: wp.id,
        name: "Task A",
        expectedOutput: "A output",
        delegatedBy: "coordinator",
        assignedTo: "executor",
    })
    tnA.status = "planned" // NOT completed

    const tnB = createTaskNode({
        workPlanId: wp.id,
        name: "Task B",
        expectedOutput: "B output",
        delegatedBy: "coordinator",
        assignedTo: "executor",
        dependsOn: [tnA.id],
    })
    tnB.status = "planned"

    wp.tasks = [tnA, tnB]
    graph.workPlans.push(wp)
    stateManager.saveTaskGraph(graph)

    const result = await govern_task.execute(
        { action: "start", target_id: tnB.id } as any,
        ctx() as any,
    )
    const output = result as string

    assert(output.includes("GOVERNANCE BLOCK"), "blocked task shows governance block")
    assert(output.includes("Task A") || output.includes(tnA.id), "block mentions the dependency")
}

async function test_start_already_active(): Promise<void> {
    process.stderr.write("\n--- start: already active ---\n")
    const { tnId } = setupActivePlanWithTask({ taskStatus: "active" })

    const result = await govern_task.execute(
        { action: "start", target_id: tnId } as any,
        ctx() as any,
    )
    const output = result as string

    assert(output.includes("already active") || output.includes("GOVERNANCE BLOCK"), "starting active task returns block/error")
}

// ─── Tests: complete ──────────────────────────────────────────────────

async function test_complete_success(): Promise<void> {
    process.stderr.write("\n--- complete: success ---\n")
    const { tnId, sessionID } = setupActivePlanWithTask({ taskStatus: "active" })

    const result = await govern_task.execute(
        { action: "complete", target_id: tnId, evidence: "All tests passing" } as any,
        ctx(sessionID) as any,
    )
    const output = result as string

    assert(output.includes("Task completed"), "complete returns success message")
    assert(output.includes("All tests passing"), "evidence in output")
    assert(output.includes("RE-LOCKED"), "output says writes re-locked")

    // Verify task status
    const graph = stateManager.getTaskGraph()
    const tn = graph.workPlans[0].tasks[0]
    assert(tn.status === "completed", "task status is completed")
    assert(tn.completedAt !== undefined, "completedAt is set")
    assert(tn.result?.evidence === "All tests passing", "evidence stored in result")

    // Verify session bridge cleared
    const activeTask = stateManager.getActiveTask(sessionID)
    assert(activeTask === null, "session active task cleared")
}

async function test_complete_missing_evidence(): Promise<void> {
    process.stderr.write("\n--- complete: missing evidence ---\n")
    const { tnId, sessionID } = setupActivePlanWithTask({ taskStatus: "active" })

    const result = await govern_task.execute(
        { action: "complete", target_id: tnId } as any,
        ctx(sessionID) as any,
    )
    const output = result as string

    assert(output.includes("BLOCKED") || output.includes("evidence"), "missing evidence blocks completion")
}

async function test_complete_wrong_status(): Promise<void> {
    process.stderr.write("\n--- complete: wrong status (planned) ---\n")
    const { tnId, sessionID } = setupActivePlanWithTask({ taskStatus: "planned" })

    const result = await govern_task.execute(
        { action: "complete", target_id: tnId, evidence: "done" } as any,
        ctx(sessionID) as any,
    )
    const output = result as string

    assert(output.includes("planned") || output.includes("only"), "completing planned task returns status error")
}

async function test_complete_unblocks_dependents(): Promise<void> {
    process.stderr.write("\n--- complete: unblocks dependent tasks ---\n")

    const graph = createEmptyTaskGraph()
    const wp = createWorkPlan({ name: "Chain Plan" })
    wp.status = "active"
    graph.activeWorkPlanId = wp.id

    const tnA = createTaskNode({
        workPlanId: wp.id,
        name: "Task A",
        expectedOutput: "A output",
        delegatedBy: "coordinator",
        assignedTo: "executor",
    })
    tnA.status = "active"
    tnA.startedAt = Date.now()

    const tnB = createTaskNode({
        workPlanId: wp.id,
        name: "Task B",
        expectedOutput: "B output",
        delegatedBy: "coordinator",
        assignedTo: "executor",
        dependsOn: [tnA.id],
    })
    tnB.status = "blocked"

    wp.tasks = [tnA, tnB]
    graph.workPlans.push(wp)
    stateManager.saveTaskGraph(graph)

    const sessionID = freshSessionId()
    stateManager.setActiveTask(sessionID, { id: tnA.id, name: tnA.name })

    await govern_task.execute(
        { action: "complete", target_id: tnA.id, evidence: "A done" } as any,
        ctx(sessionID) as any,
    )

    const updated = stateManager.getTaskGraph()
    const updatedB = updated.workPlans[0].tasks[1]
    assert(updatedB.status === "planned", "dependent task unblocked from 'blocked' to 'planned'")
}

// ─── Tests: fail ──────────────────────────────────────────────────────

async function test_fail_success(): Promise<void> {
    process.stderr.write("\n--- fail: success ---\n")
    const { tnId, sessionID } = setupActivePlanWithTask({ taskStatus: "active" })

    const result = await govern_task.execute(
        { action: "fail", target_id: tnId, reason: "Tests broken" } as any,
        ctx(sessionID) as any,
    )
    const output = result as string

    assert(output.includes("FAILED"), "fail returns failed message")
    assert(output.includes("Tests broken"), "reason in output")
    assert(output.includes("RE-LOCKED"), "output says writes re-locked")

    // Verify task status
    const graph = stateManager.getTaskGraph()
    assert(graph.workPlans[0].tasks[0].status === "failed", "task status is failed")

    // Verify session bridge cleared
    const activeTask = stateManager.getActiveTask(sessionID)
    assert(activeTask === null, "session active task cleared after fail")
}

async function test_fail_missing_target_id(): Promise<void> {
    process.stderr.write("\n--- fail: missing target_id ---\n")
    resetGraph()

    const result = await govern_task.execute(
        { action: "fail", reason: "broken" } as any,
        ctx() as any,
    )
    const output = result as string

    assert(output.includes("ERROR"), "missing target_id returns ERROR")
}

async function test_fail_missing_reason(): Promise<void> {
    process.stderr.write("\n--- fail: missing reason ---\n")
    const { tnId } = setupActivePlanWithTask({ taskStatus: "active" })

    const result = await govern_task.execute(
        { action: "fail", target_id: tnId } as any,
        ctx() as any,
    )
    const output = result as string

    assert(output.includes("ERROR"), "missing reason returns ERROR")
    assert(output.includes("reason"), "error mentions reason")
}

async function test_fail_wrong_status(): Promise<void> {
    process.stderr.write("\n--- fail: wrong status (planned) ---\n")
    const { tnId } = setupActivePlanWithTask({ taskStatus: "planned" })

    const result = await govern_task.execute(
        { action: "fail", target_id: tnId, reason: "nope" } as any,
        ctx() as any,
    )
    const output = result as string

    assert(output.includes("ERROR"), "failing planned task returns ERROR")
    assert(output.includes("planned"), "error mentions current status")
}

async function test_fail_blocks_dependents(): Promise<void> {
    process.stderr.write("\n--- fail: blocks dependent tasks ---\n")

    const graph = createEmptyTaskGraph()
    const wp = createWorkPlan({ name: "Fail Chain" })
    wp.status = "active"
    graph.activeWorkPlanId = wp.id

    const tnA = createTaskNode({
        workPlanId: wp.id,
        name: "Task A",
        expectedOutput: "A output",
        delegatedBy: "coordinator",
        assignedTo: "executor",
    })
    tnA.status = "active"
    tnA.startedAt = Date.now()

    const tnB = createTaskNode({
        workPlanId: wp.id,
        name: "Task B",
        expectedOutput: "B output",
        delegatedBy: "coordinator",
        assignedTo: "executor",
        dependsOn: [tnA.id],
    })
    tnB.status = "planned"

    wp.tasks = [tnA, tnB]
    graph.workPlans.push(wp)
    stateManager.saveTaskGraph(graph)

    const sessionID = freshSessionId()
    stateManager.setActiveTask(sessionID, { id: tnA.id, name: tnA.name })

    await govern_task.execute(
        { action: "fail", target_id: tnA.id, reason: "broken" } as any,
        ctx(sessionID) as any,
    )

    const updated = stateManager.getTaskGraph()
    const updatedB = updated.workPlans[0].tasks[1]
    assert(updatedB.status === "blocked", "dependent task blocked after parent fails")
}

// ─── Tests: review ────────────────────────────────────────────────────

async function test_review_success(): Promise<void> {
    process.stderr.write("\n--- review: success ---\n")
    const { tnId, sessionID } = setupActivePlanWithTask({ taskStatus: "active" })

    const result = await govern_task.execute(
        { action: "review", target_id: tnId } as any,
        ctx(sessionID) as any,
    )
    const output = result as string

    assert(output.includes("Review"), "review returns review message")
    assert(output.includes(tnId), "review output includes task ID")

    const graph = stateManager.getTaskGraph()
    assert(graph.workPlans[0].tasks[0].status === "review", "task status is review")
}

async function test_review_wrong_status(): Promise<void> {
    process.stderr.write("\n--- review: wrong status (planned) ---\n")
    const { tnId } = setupActivePlanWithTask({ taskStatus: "planned" })

    const result = await govern_task.execute(
        { action: "review", target_id: tnId } as any,
        ctx() as any,
    )
    const output = result as string

    assert(output.includes("ERROR"), "reviewing planned task returns ERROR")
    assert(output.includes("planned"), "error mentions current status")
}

// ─── Tests: status ────────────────────────────────────────────────────

async function test_status_with_active_task(): Promise<void> {
    process.stderr.write("\n--- status: with active task ---\n")
    setupActivePlanWithTask({ taskStatus: "active" })

    const result = await govern_task.execute(
        { action: "status" } as any,
        ctx() as any,
    )
    const output = result as string

    assert(output.includes("ACTIVE TASK"), "status shows active task")
    assert(output.includes("Test Task"), "status shows task name")
    assert(output.includes("Test Plan"), "status shows plan name")
}

async function test_status_no_active_task(): Promise<void> {
    process.stderr.write("\n--- status: no active task ---\n")
    resetGraph()

    const result = await govern_task.execute(
        { action: "status" } as any,
        ctx() as any,
    )
    const output = result as string

    assert(output.includes("NO ACTIVE TASK"), "status shows no active task message")
    assert(output.includes("blocked"), "status mentions writes are blocked")
}

async function test_unknown_action(): Promise<void> {
    process.stderr.write("\n--- unknown action ---\n")

    const result = await govern_task.execute(
        { action: "explode" } as any,
        ctx() as any,
    )
    const output = result as string

    assert(output.includes("Unknown action"), "unknown action returns error")
}

// ─── Runner ───────────────────────────────────────────────────────────

async function main(): Promise<void> {
    process.stderr.write("=== govern_task tool tests ===\n")

    // quick_start
    await test_quick_start_success()
    await test_quick_start_uses_existing_plan()
    await test_quick_start_missing_name()

    // start
    await test_start_success()
    await test_start_missing_target_id()
    await test_start_invalid_target_id()
    await test_start_blocked_by_dependency()
    await test_start_already_active()

    // complete
    await test_complete_success()
    await test_complete_missing_evidence()
    await test_complete_wrong_status()
    await test_complete_unblocks_dependents()

    // fail
    await test_fail_success()
    await test_fail_missing_target_id()
    await test_fail_missing_reason()
    await test_fail_wrong_status()
    await test_fail_blocks_dependents()

    // review
    await test_review_success()
    await test_review_wrong_status()

    // status
    await test_status_with_active_task()
    await test_status_no_active_task()

    // edge
    await test_unknown_action()

    const total = passed + failed
    const summary = `\nResults: ${passed}/${total} passed, ${failed} failed`
    process.stderr.write(summary + "\n")
    process.exit(failed > 0 ? 1 : 0)
}

main()
