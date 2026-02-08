/**
 * Test: Work Plan Schema — TaskGraph / WorkPlan / TaskNode / Checkpoint
 *
 * 45+ assertions covering:
 * - createWorkPlan: defaults, custom values, governanceLevel derivation
 * - createTaskNode: defaults, custom dependencies, temporalGate, allowedTools
 * - createCheckpoint: id prefix, fields, default filesModified
 * - createEmptyTaskGraph: version, null active, empty plans
 * - createBootstrapTaskGraph: active plan, active task, agent assignment, custom coordinator
 * - shouldCreateCheckpoint: write/edit yes, read/grep no, bash with test/build yes, bash with ls no
 * - isBashCheckpointWorthy: npx tsc yes, npx vite yes, npx cowsay no, git commit yes, tsc yes, ls no
 * - Constants: TASK_GRAPH_VERSION, SESSION_STALE_MS, CHECKPOINT_TOOLS
 */

import {
    createWorkPlan,
    createTaskNode,
    createCheckpoint,
    createEmptyTaskGraph,
    createBootstrapTaskGraph,
    shouldCreateCheckpoint,
    isBashCheckpointWorthy,
    TASK_GRAPH_VERSION,
    SESSION_STALE_MS,
    CHECKPOINT_TOOLS,
} from "../src/schemas/work-plan.js"

// ─── Test Harness ────────────────────────────────────────────────────

let passed = 0
let failed = 0

function assert(name: string, condition: boolean): void {
    if (condition) {
        passed++
    } else {
        failed++
        process.stderr.write(`  FAIL: ${name}\n`)
    }
}

// ══════════════════════════════════════════════════════════════════════
// GROUP 1: Constants (3 tests)
// ══════════════════════════════════════════════════════════════════════

{
    assert("const: TASK_GRAPH_VERSION is 3.0.0", TASK_GRAPH_VERSION === "3.0.0")
    assert("const: SESSION_STALE_MS is 30 minutes", SESSION_STALE_MS === 30 * 60 * 1000)
    assert("const: CHECKPOINT_TOOLS has write and edit", CHECKPOINT_TOOLS.has("write") && CHECKPOINT_TOOLS.has("edit"))
}

// ══════════════════════════════════════════════════════════════════════
// GROUP 2: createWorkPlan defaults (7 tests)
// ══════════════════════════════════════════════════════════════════════

{
    const wp = createWorkPlan({ name: "Test Plan" })

    assert("wp-default: id starts with wp-", wp.id.startsWith("wp-"))
    assert("wp-default: name is set", wp.name === "Test Plan")
    assert("wp-default: status is draft", wp.status === "draft")
    assert("wp-default: category is development", wp.category === "development")
    assert("wp-default: owner is idumb-supreme-coordinator", wp.ownedBy === "idumb-supreme-coordinator")
    assert("wp-default: acceptance is empty array", Array.isArray(wp.acceptance) && wp.acceptance.length === 0)
    assert("wp-default: dependsOn is empty array", Array.isArray(wp.dependsOn) && wp.dependsOn.length === 0)
}

// ══════════════════════════════════════════════════════════════════════
// GROUP 3: createWorkPlan custom values + governance derivation (5 tests)
// ══════════════════════════════════════════════════════════════════════

{
    const wp = createWorkPlan({
        name: "Research Plan",
        acceptance: ["Findings documented", "Evidence collected"],
        category: "research",
        ownedBy: "idumb-investigator",
    })

    assert("wp-custom: acceptance has 2 items", wp.acceptance.length === 2)
    assert("wp-custom: category is research", wp.category === "research")
    assert("wp-custom: owner is idumb-investigator", wp.ownedBy === "idumb-investigator")
    // research category → balanced governance (from CATEGORY_DEFAULTS)
    assert("wp-custom: governanceLevel derived as balanced for research", wp.governanceLevel === "balanced")

    // ad-hoc → minimal
    const wpAdhoc = createWorkPlan({ name: "Quick Fix", category: "ad-hoc" })
    assert("wp-custom: governanceLevel derived as minimal for ad-hoc", wpAdhoc.governanceLevel === "minimal")
}

// ══════════════════════════════════════════════════════════════════════
// GROUP 4: createTaskNode defaults (7 tests)
// ══════════════════════════════════════════════════════════════════════

{
    const tn = createTaskNode({
        workPlanId: "wp-123",
        name: "Build login form",
        expectedOutput: "Login component renders",
        delegatedBy: "idumb-supreme-coordinator",
        assignedTo: "idumb-executor",
    })

    assert("tn-default: id starts with tn-", tn.id.startsWith("tn-"))
    assert("tn-default: status is planned", tn.status === "planned")
    assert("tn-default: allowedTools is empty array", Array.isArray(tn.allowedTools) && tn.allowedTools.length === 0)
    assert("tn-default: dependsOn is empty array", Array.isArray(tn.dependsOn) && tn.dependsOn.length === 0)
    assert("tn-default: temporalGate is null", tn.temporalGate === null)
    assert("tn-default: checkpoints is empty array", Array.isArray(tn.checkpoints) && tn.checkpoints.length === 0)
    assert("tn-default: artifacts is empty array", Array.isArray(tn.artifacts) && tn.artifacts.length === 0)
}

// ══════════════════════════════════════════════════════════════════════
// GROUP 5: createTaskNode custom values (4 tests)
// ══════════════════════════════════════════════════════════════════════

{
    const gate = { afterTaskId: "tn-prev", reason: "Database must be ready first" }
    const tn = createTaskNode({
        workPlanId: "wp-456",
        name: "Run migrations",
        expectedOutput: "Migration complete",
        delegatedBy: "idumb-supreme-coordinator",
        assignedTo: "idumb-executor",
        allowedTools: ["write", "bash"],
        dependsOn: ["tn-prev"],
        temporalGate: gate,
    })

    assert("tn-custom: dependsOn has 1 entry", tn.dependsOn.length === 1 && tn.dependsOn[0] === "tn-prev")
    assert("tn-custom: temporalGate set", tn.temporalGate !== null && tn.temporalGate.afterTaskId === "tn-prev")
    assert("tn-custom: temporalGate reason set", tn.temporalGate!.reason === "Database must be ready first")
    assert("tn-custom: allowedTools has write and bash", tn.allowedTools.length === 2 && tn.allowedTools.includes("write") && tn.allowedTools.includes("bash"))
}

// ══════════════════════════════════════════════════════════════════════
// GROUP 6: createCheckpoint (4 tests)
// ══════════════════════════════════════════════════════════════════════

{
    const cp = createCheckpoint("tn-abc", "write", "Created auth module")

    assert("cp: id starts with cp-", cp.id.startsWith("cp-"))
    assert("cp: taskNodeId matches", cp.taskNodeId === "tn-abc")
    assert("cp: tool matches", cp.tool === "write")
    assert("cp: default filesModified is empty", Array.isArray(cp.filesModified) && cp.filesModified.length === 0)
}

// ══════════════════════════════════════════════════════════════════════
// GROUP 7: createCheckpoint with filesModified (1 test)
// ══════════════════════════════════════════════════════════════════════

{
    const cp = createCheckpoint("tn-xyz", "edit", "Updated config", ["src/config.ts", "package.json"])
    assert("cp-files: filesModified passed through", cp.filesModified.length === 2 && cp.filesModified[0] === "src/config.ts")
}

// ══════════════════════════════════════════════════════════════════════
// GROUP 8: createEmptyTaskGraph (3 tests)
// ══════════════════════════════════════════════════════════════════════

{
    const tg = createEmptyTaskGraph()

    assert("empty-tg: version matches TASK_GRAPH_VERSION", tg.version === TASK_GRAPH_VERSION)
    assert("empty-tg: activeWorkPlanId is null", tg.activeWorkPlanId === null)
    assert("empty-tg: workPlans is empty", Array.isArray(tg.workPlans) && tg.workPlans.length === 0)
}

// ══════════════════════════════════════════════════════════════════════
// GROUP 9: createBootstrapTaskGraph (7 tests)
// ══════════════════════════════════════════════════════════════════════

{
    const tg = createBootstrapTaskGraph()

    assert("bootstrap: version matches TASK_GRAPH_VERSION", tg.version === TASK_GRAPH_VERSION)
    assert("bootstrap: has 1 work plan", tg.workPlans.length === 1)
    assert("bootstrap: activeWorkPlanId is set", tg.activeWorkPlanId !== null && tg.activeWorkPlanId === tg.workPlans[0].id)

    const wp = tg.workPlans[0]
    assert("bootstrap: plan status is active", wp.status === "active")
    assert("bootstrap: plan owned by supreme-coordinator", wp.ownedBy === "idumb-supreme-coordinator")

    const task = wp.tasks[0]
    assert("bootstrap: task status is active", task.status === "active")
    assert("bootstrap: task assigned to executor", task.assignedTo === "idumb-executor")
}

// ══════════════════════════════════════════════════════════════════════
// GROUP 10: createBootstrapTaskGraph with custom coordinator (1 test)
// ══════════════════════════════════════════════════════════════════════

{
    const tg = createBootstrapTaskGraph("custom-coordinator")
    const wp = tg.workPlans[0]
    assert("bootstrap-custom: plan owned by custom coordinator", wp.ownedBy === "custom-coordinator")
}

// ══════════════════════════════════════════════════════════════════════
// GROUP 11: shouldCreateCheckpoint (6 tests)
// ══════════════════════════════════════════════════════════════════════

{
    // write and edit always checkpoint-worthy
    assert("scc: write → true", shouldCreateCheckpoint("write") === true)
    assert("scc: edit → true", shouldCreateCheckpoint("edit") === true)

    // read, grep → not checkpoint-worthy
    assert("scc: read → false", shouldCreateCheckpoint("read") === false)
    assert("scc: grep → false", shouldCreateCheckpoint("grep") === false)

    // bash with npm test → true
    assert("scc: bash + npm test → true", shouldCreateCheckpoint("bash", { command: "npm test" }) === true)

    // bash with ls → false
    assert("scc: bash + ls → false", shouldCreateCheckpoint("bash", { command: "ls -la" }) === false)
}

// ══════════════════════════════════════════════════════════════════════
// GROUP 12: isBashCheckpointWorthy (8 tests)
// ══════════════════════════════════════════════════════════════════════

{
    // Positive cases
    assert("bash-cp: npx tsc → true", isBashCheckpointWorthy("npx tsc") === true)
    assert("bash-cp: npx vitest → true", isBashCheckpointWorthy("npx vitest") === true)
    assert("bash-cp: npx vite build → true", isBashCheckpointWorthy("npx vite build") === true)
    assert("bash-cp: git commit -m 'msg' → true", isBashCheckpointWorthy("git commit -m 'msg'") === true)
    assert("bash-cp: tsc → true", isBashCheckpointWorthy("tsc") === true)
    assert("bash-cp: npm run build → true", isBashCheckpointWorthy("npm run build") === true)

    // Negative cases
    assert("bash-cp: npx cowsay → false", isBashCheckpointWorthy("npx cowsay") === false)
    assert("bash-cp: ls -la → false", isBashCheckpointWorthy("ls -la") === false)
}

// ─── Results ─────────────────────────────────────────────────────────

process.stderr.write(`\nResults: ${passed}/${passed + failed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
