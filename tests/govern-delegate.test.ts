/**
 * Story 11-03: govern_delegate tool tests
 *
 * Tests all 3 actions: assign, recall, status
 *
 * Approach: Initialize stateManager singleton with temp directory,
 * set up task graph with work plans and task nodes, then call the
 * tool's execute function directly (tool() returns { execute }).
 *
 * 18 assertions covering:
 * - assign: missing args, invalid agent, task not found, valid delegation, auto-activation
 * - recall: missing args, not found, already completed, valid recall
 * - status: empty store, with delegations
 */

import { mkdirSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { StateManager } from "../src/lib/persistence.js"
import { createLogger } from "../src/lib/index.js"
import { createWorkPlan, createTaskNode, createEmptyTaskGraph } from "../src/schemas/work-plan.js"
import {
    createDelegation, createEmptyDelegationStore,
    completeDelegation,
} from "../src/schemas/delegation.js"
import type { TaskGraph } from "../src/schemas/work-plan.js"
import { govern_delegate } from "../src/tools/govern-delegate.js"

// ─── Test Harness ────────────────────────────────────────────────────

const testBase = join(tmpdir(), `idumb-gov-delegate-test-${Date.now()}`)
mkdirSync(join(testBase, ".idumb/brain"), { recursive: true })
const log = createLogger(testBase, "test-govern-delegate", "debug")

let passed = 0
let failed = 0

function assert(condition: boolean, name: string): void {
    if (condition) {
        passed++
        process.stderr.write(`  OK: ${name}\n`)
    } else {
        failed++
        process.stderr.write(`  FAIL: ${name}\n`)
    }
}

// ─── Mock ToolContext ────────────────────────────────────────────────

const SESSION_ID = "test-session-delegate"

function makeCtx(dir: string) {
    return {
        sessionID: SESSION_ID,
        messageID: "msg-test-1",
        agent: "idumb-supreme-coordinator",
        directory: dir,
        worktree: dir,
        abort: new AbortController().signal,
        metadata: () => {},
        ask: async () => {},
    }
}

// ─── Setup StateManager ─────────────────────────────────────────────

// We need a fresh StateManager for each test run so tests are isolated
// from the module-level singleton. We'll create our own and swap references.
const sm = new StateManager()
await sm.init(testBase, log)

// Capture agent identity (coordinator)
sm.setCapturedAgent(SESSION_ID, "idumb-supreme-coordinator")

// Build a task graph with a work plan and task nodes for testing
const wp = createWorkPlan({
    name: "Test Delegation Plan",
    category: "development",
    createdBy: "idumb-supreme-coordinator",
})
wp.status = "active"

const tn1 = createTaskNode({
    workPlanId: wp.id,
    name: "Build login form",
    expectedOutput: "Working login form with tests",
    delegatedBy: "idumb-supreme-coordinator",
    assignedTo: "",
})
wp.tasks.push(tn1)

const tn2 = createTaskNode({
    workPlanId: wp.id,
    name: "Write integration tests",
    expectedOutput: "All integration tests passing",
    delegatedBy: "idumb-supreme-coordinator",
    assignedTo: "",
    dependsOn: [tn1.id],
})
wp.tasks.push(tn2)

const graph: TaskGraph = {
    version: "3.0.0",
    activeWorkPlanId: wp.id,
    workPlans: [wp],
}

sm.saveTaskGraph(graph)
await sm.forceSave()

// ─── IMPORTANT: We need to swap the singleton stateManager ──────────
// The govern_delegate tool imports the singleton stateManager.
// We must initialize IT (the module-level singleton) rather than our own.
// Let's re-init the singleton with the same directory.
import { stateManager } from "../src/lib/persistence.js"
await stateManager.init(testBase, log)
stateManager.setCapturedAgent(SESSION_ID, "idumb-supreme-coordinator")
stateManager.saveTaskGraph(graph)
await stateManager.forceSave()

const ctx = makeCtx(testBase)

// ══════════════════════════════════════════════════════════════════════
// GROUP 1: assign action — error cases (4 tests)
// ══════════════════════════════════════════════════════════════════════

process.stderr.write("\n--- assign: error cases ---\n")

{
    // Missing task_id
    const result = await govern_delegate.execute(
        { action: "assign" as const },
        ctx,
    )
    assert(result.includes("ERROR") && result.includes("task_id"), "assign: missing task_id returns error")
}

{
    // Missing to_agent
    const result = await govern_delegate.execute(
        { action: "assign" as const, task_id: tn1.id },
        ctx,
    )
    assert(result.includes("ERROR") && result.includes("to_agent"), "assign: missing to_agent returns error")
}

{
    // Task not found
    const result = await govern_delegate.execute(
        { action: "assign" as const, task_id: "nonexistent-task", to_agent: "idumb-executor" },
        ctx,
    )
    assert(result.includes("ERROR") && result.includes("not found"), "assign: task not found returns error")
}

{
    // Invalid target agent (not in hierarchy)
    const result = await govern_delegate.execute(
        { action: "assign" as const, task_id: tn1.id, to_agent: "nonexistent-agent" },
        ctx,
    )
    assert(result.includes("GOVERNANCE BLOCK") || result.includes("denied"), "assign: invalid agent returns governance block")
}

// ══════════════════════════════════════════════════════════════════════
// GROUP 2: assign action — success cases (4 tests)
// ══════════════════════════════════════════════════════════════════════

process.stderr.write("\n--- assign: success cases ---\n")

{
    // Valid delegation: coordinator -> executor
    const result = await govern_delegate.execute(
        {
            action: "assign" as const,
            task_id: tn1.id,
            to_agent: "idumb-executor",
            context: "Build the login form with React",
        },
        ctx,
    )
    assert(result.includes("Delegation created"), "assign: valid delegation returns success")
    assert(result.includes("idumb-executor"), "assign: result shows target agent")

    // Check delegation record was saved
    const store = stateManager.getDelegationStore()
    assert(store.delegations.length >= 1, "assign: delegation record saved to store")

    // Check task node was auto-activated (no dependencies on tn1)
    const savedGraph = stateManager.getTaskGraph()
    const savedNode = savedGraph.workPlans[0]?.tasks.find(t => t.id === tn1.id)
    assert(savedNode?.status === "active", "assign: task auto-activated when no dependencies")
}

// ══════════════════════════════════════════════════════════════════════
// GROUP 3: assign action — routing block (2 tests)
// ══════════════════════════════════════════════════════════════════════

process.stderr.write("\n--- assign: routing block ---\n")

{
    // Create a research work plan to test category routing
    const researchWp = createWorkPlan({
        name: "Research Plan",
        category: "research",
        createdBy: "idumb-supreme-coordinator",
    })
    researchWp.status = "active"

    const researchTn = createTaskNode({
        workPlanId: researchWp.id,
        name: "Research authentication patterns",
        expectedOutput: "Analysis report",
        delegatedBy: "idumb-supreme-coordinator",
        assignedTo: "",
    })
    researchWp.tasks.push(researchTn)

    const currentGraph = stateManager.getTaskGraph()
    currentGraph.workPlans.push(researchWp)
    stateManager.saveTaskGraph(currentGraph)

    // Research category -> executor should be blocked (research routes to investigator)
    const result = await govern_delegate.execute(
        { action: "assign" as const, task_id: researchTn.id, to_agent: "idumb-executor" },
        ctx,
    )
    assert(result.includes("GOVERNANCE BLOCK") || result.includes("denied"), "assign: research->executor blocked by category routing")

    // Research category -> investigator should be allowed
    const result2 = await govern_delegate.execute(
        { action: "assign" as const, task_id: researchTn.id, to_agent: "idumb-investigator" },
        ctx,
    )
    assert(result2.includes("Delegation created"), "assign: research->investigator allowed by category routing")
}

// ══════════════════════════════════════════════════════════════════════
// GROUP 4: recall action (4 tests)
// ══════════════════════════════════════════════════════════════════════

process.stderr.write("\n--- recall ---\n")

{
    // Missing delegation_id
    const result = await govern_delegate.execute(
        { action: "recall" as const },
        ctx,
    )
    assert(result.includes("ERROR") && result.includes("delegation_id"), "recall: missing delegation_id returns error")
}

{
    // Delegation not found
    const result = await govern_delegate.execute(
        { action: "recall" as const, delegation_id: "nonexistent-deleg" },
        ctx,
    )
    assert(result.includes("ERROR") && result.includes("not found"), "recall: delegation not found returns error")
}

{
    // Create a completed delegation and try to recall it
    const store = stateManager.getDelegationStore()
    const completedDeleg = createDelegation({
        fromAgent: "idumb-supreme-coordinator",
        toAgent: "idumb-executor",
        taskId: "task-completed-test",
        context: "Test completed delegation",
        expectedOutput: "Results",
    })
    completeDelegation(completedDeleg, {
        evidence: "Done",
        filesModified: [],
        testsRun: "0",
        brainEntriesCreated: [],
    })
    store.delegations.push(completedDeleg)
    stateManager.saveDelegationStore(store)

    const result = await govern_delegate.execute(
        { action: "recall" as const, delegation_id: completedDeleg.id },
        ctx,
    )
    assert(result.includes("ERROR") && result.includes("already completed"), "recall: completed delegation cannot be recalled")
}

{
    // Valid recall of a pending delegation
    const store = stateManager.getDelegationStore()
    const pendingDeleg = createDelegation({
        fromAgent: "idumb-supreme-coordinator",
        toAgent: "idumb-executor",
        taskId: "task-recall-test",
        context: "Test recall",
        expectedOutput: "Results",
    })
    store.delegations.push(pendingDeleg)
    stateManager.saveDelegationStore(store)

    const result = await govern_delegate.execute(
        { action: "recall" as const, delegation_id: pendingDeleg.id },
        ctx,
    )
    assert(result.includes("Delegation recalled"), "recall: valid recall returns success")
}

// ══════════════════════════════════════════════════════════════════════
// GROUP 5: status action (2 tests)
// ══════════════════════════════════════════════════════════════════════

process.stderr.write("\n--- status ---\n")

{
    // Status with existing delegations (we have several from above)
    const result = await govern_delegate.execute(
        { action: "status" as const },
        ctx,
    )
    assert(result.includes("Delegation Status") || result.includes("Active") || result.includes("Completed"), "status: returns formatted delegation info")
}

{
    // Clear all delegations and test empty status
    const emptyStore = createEmptyDelegationStore()
    stateManager.saveDelegationStore(emptyStore)

    const result = await govern_delegate.execute(
        { action: "status" as const },
        ctx,
    )
    assert(result.includes("No delegations"), "status: empty store returns no delegations message")
}

// ══════════════════════════════════════════════════════════════════════
// GROUP 6: unknown action (1 test)
// ══════════════════════════════════════════════════════════════════════

process.stderr.write("\n--- edge cases ---\n")

{
    // Unknown action — this should not happen with Zod validation in practice,
    // but the tool has a default case
    const result = await govern_delegate.execute(
        { action: "unknown_action" as any },
        ctx,
    )
    assert(result.includes("Unknown action"), "unknown action returns error message")
}

// ─── Cleanup + Results ───────────────────────────────────────────────

try {
    rmSync(testBase, { recursive: true, force: true })
} catch {
    // cleanup is best-effort
}

process.stderr.write(`\nResults: ${passed}/${passed + failed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
