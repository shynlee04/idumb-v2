/**
 * Task Graph Helpers — comprehensive tests.
 *
 * Covers: lookup helpers, active chain, temporal gates, dependencies,
 * validation, chain-break detection, purge, archive, display, migration.
 */

import type { TaskGraph, WorkPlan, TaskNode, Checkpoint } from "../src/schemas/work-plan.js"
import type { TaskStore, TaskEpic, Task, Subtask } from "../src/schemas/task.js"
import {
    findWorkPlan,
    findTaskNode,
    findTaskNodeInPlan,
    findParentPlan,
    findCheckpoint,
    getActiveWorkChain,
    checkTemporalGate,
    checkDependencies,
    validateTaskStart,
    validateTaskCompletion,
    detectGraphBreaks,
    purgeAbandonedPlans,
    archiveChainBreakers,
    formatTaskGraph,
    buildGraphReminder,
    migrateV2ToV3,
} from "../src/schemas/task-graph.js"

// ─── Test Harness ──────────────────────────────────────────────────

let passed = 0
let failed = 0

function assert(condition: boolean, name: string): void {
    if (condition) {
        passed++
    } else {
        failed++
        console.error(`  FAIL: ${name}`)
    }
}

// ─── Helpers ───────────────────────────────────────────────────────

const NOW = Date.now()

function makeCheckpoint(id: string, taskNodeId: string): Checkpoint {
    return { id, taskNodeId, tool: "write", timestamp: NOW, summary: "test cp", filesModified: [] }
}

function makeTaskNode(overrides: Partial<TaskNode> & { id: string; workPlanId: string; name: string }): TaskNode {
    return {
        expectedOutput: "expected output",
        status: "planned",
        delegatedBy: "coordinator",
        assignedTo: "executor",
        allowedTools: [],
        dependsOn: [],
        temporalGate: null,
        checkpoints: [],
        artifacts: [],
        createdAt: NOW,
        modifiedAt: NOW,
        ...overrides,
    }
}

function makeWorkPlan(overrides: Partial<WorkPlan> & { id: string; name: string }): WorkPlan {
    return {
        acceptance: [],
        category: "development",
        governanceLevel: "strict",
        status: "draft",
        dependsOn: [],
        ownedBy: "coordinator",
        tasks: [],
        planAhead: [],
        createdAt: NOW,
        modifiedAt: NOW,
        ...overrides,
    }
}

function makeGraph(workPlans: WorkPlan[], activeWorkPlanId: string | null = null): TaskGraph {
    return { version: "3.0.0", activeWorkPlanId, workPlans }
}

// ─── 1. Lookup Helpers ─────────────────────────────────────────────

const tn1 = makeTaskNode({ id: "tn-1", workPlanId: "wp-1", name: "task-one" })
const tn2 = makeTaskNode({ id: "tn-2", workPlanId: "wp-1", name: "task-two" })
const tnAhead = makeTaskNode({ id: "tn-ahead", workPlanId: "wp-1", name: "ahead-task" })
const cp1 = makeCheckpoint("cp-1", "tn-1")
tn1.checkpoints.push(cp1)

const wp1 = makeWorkPlan({
    id: "wp-1",
    name: "Plan A",
    tasks: [tn1, tn2],
    planAhead: [tnAhead],
})
const graph1 = makeGraph([wp1])

// findWorkPlan
assert(findWorkPlan(graph1, "wp-1") === wp1, "findWorkPlan: found by id")
assert(findWorkPlan(graph1, "wp-none") === undefined, "findWorkPlan: not found returns undefined")

// findTaskNode — searches both tasks and planAhead
assert(findTaskNode(graph1, "tn-1") === tn1, "findTaskNode: found in tasks")
assert(findTaskNode(graph1, "tn-ahead") === tnAhead, "findTaskNode: found in planAhead")
assert(findTaskNode(graph1, "tn-xxx") === undefined, "findTaskNode: not found returns undefined")

// findTaskNodeInPlan
assert(findTaskNodeInPlan(wp1, "tn-2") === tn2, "findTaskNodeInPlan: found in tasks")
assert(findTaskNodeInPlan(wp1, "tn-ahead") === tnAhead, "findTaskNodeInPlan: found in planAhead")
assert(findTaskNodeInPlan(wp1, "tn-yyy") === undefined, "findTaskNodeInPlan: not found")

// findParentPlan
assert(findParentPlan(graph1, "tn-1") === wp1, "findParentPlan: found for tasks child")
assert(findParentPlan(graph1, "tn-ahead") === wp1, "findParentPlan: found for planAhead child")
assert(findParentPlan(graph1, "tn-zzz") === undefined, "findParentPlan: not found")

// findCheckpoint
assert(findCheckpoint(graph1, "cp-1") === cp1, "findCheckpoint: found")
assert(findCheckpoint(graph1, "cp-missing") === undefined, "findCheckpoint: not found")

// ─── 2. getActiveWorkChain ─────────────────────────────────────────

// Empty graph
const emptyGraph = makeGraph([])
const emptyChain = getActiveWorkChain(emptyGraph)
assert(emptyChain.workPlan === null, "getActiveWorkChain: empty graph — workPlan null")
assert(emptyChain.taskNode === null, "getActiveWorkChain: empty graph — taskNode null")
assert(emptyChain.nextPlanned === null, "getActiveWorkChain: empty graph — nextPlanned null")

// Active plan with active task
const tnActive = makeTaskNode({ id: "tn-act", workPlanId: "wp-act", name: "active-task", status: "active" })
const tnPlanned = makeTaskNode({ id: "tn-plan", workPlanId: "wp-act", name: "planned-task", status: "planned" })
const wpActive = makeWorkPlan({ id: "wp-act", name: "Active Plan", status: "active", tasks: [tnActive, tnPlanned] })
const graphActive = makeGraph([wpActive], "wp-act")

const activeChain = getActiveWorkChain(graphActive)
assert(activeChain.workPlan === wpActive, "getActiveWorkChain: active plan found")
assert(activeChain.taskNode === tnActive, "getActiveWorkChain: active task found")
assert(activeChain.nextPlanned === tnPlanned, "getActiveWorkChain: nextPlanned found")

// Active plan with NO active task
const tnAllPlanned1 = makeTaskNode({ id: "tn-p1", workPlanId: "wp-p", name: "p1", status: "planned" })
const wpNoActive = makeWorkPlan({ id: "wp-p", name: "Planned Only", status: "active", tasks: [tnAllPlanned1] })
const graphNoActive = makeGraph([wpNoActive], "wp-p")
const noActiveChain = getActiveWorkChain(graphNoActive)
assert(noActiveChain.workPlan === wpNoActive, "getActiveWorkChain: plan found even without active task")
assert(noActiveChain.taskNode === null, "getActiveWorkChain: taskNode null when no active task")
assert(noActiveChain.nextPlanned === tnAllPlanned1, "getActiveWorkChain: nextPlanned from tasks when no active task")

// ─── 3. checkTemporalGate ──────────────────────────────────────────

// No temporal gate
const noGateNode = makeTaskNode({ id: "tn-ng", workPlanId: "wp-1", name: "no-gate" })
const gateResult1 = checkTemporalGate(graph1, noGateNode)
assert(gateResult1.allowed === true, "checkTemporalGate: no gate — allowed")

// Gate referencing a completed dependency
const depCompleted = makeTaskNode({ id: "tn-dep-done", workPlanId: "wp-g", name: "done-dep", status: "completed" })
const gatedNode = makeTaskNode({
    id: "tn-gated",
    workPlanId: "wp-g",
    name: "gated-task",
    temporalGate: { afterTaskId: "tn-dep-done", reason: "needs the dep first" },
})
const wpGate = makeWorkPlan({ id: "wp-g", name: "Gate Plan", tasks: [depCompleted, gatedNode] })
const graphGate = makeGraph([wpGate])

const gateResult2 = checkTemporalGate(graphGate, gatedNode)
assert(gateResult2.allowed === true, "checkTemporalGate: dep completed — allowed")

// Gate referencing a non-completed dependency
const depActive = makeTaskNode({ id: "tn-dep-act", workPlanId: "wp-g2", name: "active-dep", status: "active" })
const gatedNode2 = makeTaskNode({
    id: "tn-gated2",
    workPlanId: "wp-g2",
    name: "gated-task2",
    temporalGate: { afterTaskId: "tn-dep-act", reason: "wait for it" },
})
const wpGate2 = makeWorkPlan({ id: "wp-g2", name: "Gate Plan 2", tasks: [depActive, gatedNode2] })
const graphGate2 = makeGraph([wpGate2])

const gateResult3 = checkTemporalGate(graphGate2, gatedNode2)
assert(gateResult3.allowed === false, "checkTemporalGate: dep not completed — blocked")
assert(gateResult3.blockedBy === depActive, "checkTemporalGate: blockedBy references the dep node")

// Gate referencing unknown task
const gatedUnknown = makeTaskNode({
    id: "tn-gated-unk",
    workPlanId: "wp-1",
    name: "gated-unknown",
    temporalGate: { afterTaskId: "tn-nonexistent", reason: "broken ref" },
})
const gateResult4 = checkTemporalGate(graph1, gatedUnknown)
assert(gateResult4.allowed === false, "checkTemporalGate: unknown dep — blocked")
assert(gateResult4.reason.includes("unknown task"), "checkTemporalGate: unknown dep — reason mentions unknown")

// ─── 4. checkDependencies ──────────────────────────────────────────

// All met
const depDone1 = makeTaskNode({ id: "tn-d1", workPlanId: "wp-d", name: "dep-1", status: "completed" })
const depDone2 = makeTaskNode({ id: "tn-d2", workPlanId: "wp-d", name: "dep-2", status: "completed" })
const nodeWithDeps = makeTaskNode({ id: "tn-wd", workPlanId: "wp-d", name: "with-deps", dependsOn: ["tn-d1", "tn-d2"] })
const wpDep = makeWorkPlan({ id: "wp-d", name: "Dep Plan", tasks: [depDone1, depDone2, nodeWithDeps] })
const graphDep = makeGraph([wpDep])

const depCheck1 = checkDependencies(graphDep, nodeWithDeps)
assert(depCheck1.allowed === true, "checkDependencies: all met — allowed")

// One unmet
const depPending = makeTaskNode({ id: "tn-dp", workPlanId: "wp-d2", name: "dep-pend", status: "planned" })
const nodeUnmet = makeTaskNode({ id: "tn-um", workPlanId: "wp-d2", name: "unmet-deps", dependsOn: ["tn-dp"] })
const wpDep2 = makeWorkPlan({ id: "wp-d2", name: "Dep Plan 2", tasks: [depPending, nodeUnmet] })
const graphDep2 = makeGraph([wpDep2])

const depCheck2 = checkDependencies(graphDep2, nodeUnmet)
assert(depCheck2.allowed === false, "checkDependencies: one unmet — blocked")
assert(depCheck2.blockedBy === depPending, "checkDependencies: blockedBy points to unmet dep")

// Missing dep node
const nodeMissing = makeTaskNode({ id: "tn-md", workPlanId: "wp-d", name: "missing-dep", dependsOn: ["tn-ghost"] })
const depCheck3 = checkDependencies(graphDep, nodeMissing)
assert(depCheck3.allowed === false, "checkDependencies: missing dep node — blocked")
assert(depCheck3.reason.includes("not found"), "checkDependencies: reason mentions not found")

// ─── 5. validateTaskStart ──────────────────────────────────────────

// Allowed — planned with deps met, no gate
const startableNode = makeTaskNode({ id: "tn-startable", workPlanId: "wp-d", name: "startable", status: "planned" })
const startResult1 = validateTaskStart(graphDep, startableNode)
assert(startResult1.allowed === true, "validateTaskStart: planned, no deps — allowed")

// Blocked — already active
const activeNode = makeTaskNode({ id: "tn-active-chk", workPlanId: "wp-d", name: "already-active", status: "active" })
const startResult2 = validateTaskStart(graphDep, activeNode)
assert(startResult2.allowed === false, "validateTaskStart: already active — blocked")
assert(startResult2.reason.includes("already active"), "validateTaskStart: reason says already active")

// Blocked — completed
const completedNode = makeTaskNode({ id: "tn-comp-chk", workPlanId: "wp-d", name: "completed-node", status: "completed" })
const startResult3 = validateTaskStart(graphDep, completedNode)
assert(startResult3.allowed === false, "validateTaskStart: already completed — blocked")

// Blocked — failed
const failedNode = makeTaskNode({ id: "tn-fail-chk", workPlanId: "wp-d", name: "failed-node", status: "failed" })
const startResult4 = validateTaskStart(graphDep, failedNode)
assert(startResult4.allowed === false, "validateTaskStart: failed — blocked")
assert(startResult4.reason.includes("failed"), "validateTaskStart: reason mentions failed")

// ─── 6. validateTaskCompletion ─────────────────────────────────────

// Valid — active with evidence
const activeForComplete = makeTaskNode({ id: "tn-afc", workPlanId: "wp-1", name: "complete-me", status: "active", expectedOutput: "some output" })
const compResult1 = validateTaskCompletion(activeForComplete, "tests pass, feature works")
assert(compResult1.valid === true, "validateTaskCompletion: active with evidence — valid")

// Valid — review status with evidence
const reviewNode = makeTaskNode({ id: "tn-rev", workPlanId: "wp-1", name: "in-review", status: "review", expectedOutput: "review output" })
const compResult2 = validateTaskCompletion(reviewNode, "reviewed and approved")
assert(compResult2.valid === true, "validateTaskCompletion: review with evidence — valid")

// Invalid — no evidence
const compResult3 = validateTaskCompletion(activeForComplete, "")
assert(compResult3.valid === false, "validateTaskCompletion: empty evidence — invalid")
assert(compResult3.reason.includes("without evidence"), "validateTaskCompletion: reason mentions evidence")

// Invalid — undefined evidence
const compResult4 = validateTaskCompletion(activeForComplete)
assert(compResult4.valid === false, "validateTaskCompletion: undefined evidence — invalid")

// Invalid — non-active task (planned)
const plannedForComplete = makeTaskNode({ id: "tn-pfc", workPlanId: "wp-1", name: "not-active", status: "planned", expectedOutput: "output" })
const compResult5 = validateTaskCompletion(plannedForComplete, "some evidence")
assert(compResult5.valid === false, "validateTaskCompletion: planned status — invalid")
assert(compResult5.reason.includes("planned"), "validateTaskCompletion: reason mentions planned status")

// ─── 7. detectGraphBreaks ──────────────────────────────────────────

// Detect no_active_tasks warning
const tnPlannedW = makeTaskNode({ id: "tn-pw", workPlanId: "wp-warn", name: "planned-w", status: "planned" })
const wpWarn = makeWorkPlan({ id: "wp-warn", name: "Warning Plan", status: "active", tasks: [tnPlannedW] })
const graphWarn = makeGraph([wpWarn])

const warnings1 = detectGraphBreaks(graphWarn)
assert(warnings1.length >= 1, "detectGraphBreaks: no_active_tasks detected")
assert(warnings1[0].type === "no_active_tasks", "detectGraphBreaks: warning type is no_active_tasks")
assert(warnings1[0].workPlanId === "wp-warn", "detectGraphBreaks: correct workPlanId")

// Detect stale_task (active with no checkpoints, old modifiedAt)
const staleMs = 35 * 60 * 1000 // 35 minutes ago
const tnStale = makeTaskNode({
    id: "tn-stale",
    workPlanId: "wp-stale",
    name: "stale-task",
    status: "active",
    modifiedAt: Date.now() - staleMs,
})
const wpStale = makeWorkPlan({ id: "wp-stale", name: "Stale Plan", status: "active", tasks: [tnStale] })
const graphStale = makeGraph([wpStale])

const warnings2 = detectGraphBreaks(graphStale)
const staleWarnings = warnings2.filter(w => w.type === "stale_task")
assert(staleWarnings.length === 1, "detectGraphBreaks: stale_task detected")
assert(staleWarnings[0].taskNodeId === "tn-stale", "detectGraphBreaks: stale warning has correct taskNodeId")

// No warnings for non-active plan
const wpDraft = makeWorkPlan({ id: "wp-draft", name: "Draft Plan", status: "draft", tasks: [makeTaskNode({ id: "tn-dx", workPlanId: "wp-draft", name: "x" })] })
const graphDraft = makeGraph([wpDraft])
const warnings3 = detectGraphBreaks(graphDraft)
assert(warnings3.length === 0, "detectGraphBreaks: no warnings for draft plan")

// broken_dependency detection
const tnBrokenDep = makeTaskNode({ id: "tn-bd", workPlanId: "wp-bd", name: "broken-dep-task", dependsOn: ["tn-nonexistent-dep"] })
const wpBrokenDep = makeWorkPlan({ id: "wp-bd", name: "Broken Dep Plan", status: "active", tasks: [tnBrokenDep] })
const graphBrokenDep = makeGraph([wpBrokenDep])
const warnings4 = detectGraphBreaks(graphBrokenDep)
const brokenDepWarnings = warnings4.filter(w => w.type === "broken_dependency")
assert(brokenDepWarnings.length === 1, "detectGraphBreaks: broken_dependency detected")

// ─── 8. purgeAbandonedPlans ────────────────────────────────────────

// Purges old abandoned plans (>threshold)
const oldAbandoned = makeWorkPlan({
    id: "wp-old",
    name: "Old Abandoned",
    status: "abandoned",
    modifiedAt: Date.now() - (50 * 60 * 60 * 1000), // 50 hours ago
})
const graphPurge = makeGraph([oldAbandoned])
const purgeCount1 = purgeAbandonedPlans(graphPurge, 48 * 60 * 60 * 1000)
assert(purgeCount1 === 1, "purgeAbandonedPlans: purges old abandoned plan")
assert(oldAbandoned.purgedAt !== undefined, "purgeAbandonedPlans: sets purgedAt")

// Skips recent abandoned plans
const recentAbandoned = makeWorkPlan({
    id: "wp-recent",
    name: "Recent Abandoned",
    status: "abandoned",
    modifiedAt: Date.now() - (1 * 60 * 60 * 1000), // 1 hour ago
})
const graphPurge2 = makeGraph([recentAbandoned])
const purgeCount2 = purgeAbandonedPlans(graphPurge2, 48 * 60 * 60 * 1000)
assert(purgeCount2 === 0, "purgeAbandonedPlans: skips recent abandoned plan")
assert(recentAbandoned.purgedAt === undefined, "purgeAbandonedPlans: no purgedAt on recent")

// No double-purge (already has purgedAt)
const alreadyPurged = makeWorkPlan({
    id: "wp-ap",
    name: "Already Purged",
    status: "abandoned",
    modifiedAt: Date.now() - (100 * 60 * 60 * 1000),
    purgedAt: Date.now() - (50 * 60 * 60 * 1000),
})
const graphPurge3 = makeGraph([alreadyPurged])
const purgeCount3 = purgeAbandonedPlans(graphPurge3)
assert(purgeCount3 === 0, "purgeAbandonedPlans: no double-purge")

// ─── 9. archiveChainBreakers ───────────────────────────────────────

// Failed task with dependent tasks — blocks planned dependents
const tnFailed = makeTaskNode({ id: "tn-fail", workPlanId: "wp-cb", name: "failed-task", status: "failed" })
const tnDependentPlanned = makeTaskNode({ id: "tn-dep-plan", workPlanId: "wp-cb", name: "dependent-planned", status: "planned", dependsOn: ["tn-fail"] })
const tnDependentBlocked = makeTaskNode({ id: "tn-dep-blk", workPlanId: "wp-cb", name: "dependent-blocked", status: "blocked", dependsOn: ["tn-fail"] })
const wpChainBreak = makeWorkPlan({ id: "wp-cb", name: "Chain Break", status: "active", tasks: [tnFailed, tnDependentPlanned, tnDependentBlocked] })
const graphCB = makeGraph([wpChainBreak])

const triggers = archiveChainBreakers(graphCB)
assert(triggers.length === 1, "archiveChainBreakers: one trigger returned")
assert(triggers[0] === "tn-fail", "archiveChainBreakers: trigger is the failed task")
assert(tnDependentPlanned.status === "blocked", "archiveChainBreakers: planned dependent becomes blocked")
assert(tnDependentBlocked.status === "blocked", "archiveChainBreakers: already blocked stays blocked")

// No triggers for non-active plan
const tnFail2 = makeTaskNode({ id: "tn-f2", workPlanId: "wp-draft2", name: "fail2", status: "failed" })
const tnDep2B = makeTaskNode({ id: "tn-d2b", workPlanId: "wp-draft2", name: "dep2b", status: "planned", dependsOn: ["tn-f2"] })
const wpDraft2 = makeWorkPlan({ id: "wp-draft2", name: "Draft2", status: "draft", tasks: [tnFail2, tnDep2B] })
const graphCB2 = makeGraph([wpDraft2])
const triggers2 = archiveChainBreakers(graphCB2)
assert(triggers2.length === 0, "archiveChainBreakers: no triggers for draft plan")

// ─── 10. formatTaskGraph ───────────────────────────────────────────

// Empty graph message
const emptyFormat = formatTaskGraph(makeGraph([]))
assert(emptyFormat.includes("No work plans"), "formatTaskGraph: empty graph has 'No work plans' message")
assert(emptyFormat.includes("tasks_add"), "formatTaskGraph: empty graph has create hint")

// Shows plan names
const tnF = makeTaskNode({ id: "tn-f1", workPlanId: "wp-fmt", name: "Format Task", status: "active", assignedTo: "executor" })
const wpFmt = makeWorkPlan({ id: "wp-fmt", name: "My Format Plan", status: "active", tasks: [tnF] })
const graphFmt = makeGraph([wpFmt], "wp-fmt")
const formatted = formatTaskGraph(graphFmt)
assert(formatted.includes("My Format Plan"), "formatTaskGraph: includes plan name")
assert(formatted.includes("Format Task"), "formatTaskGraph: includes task name")
assert(formatted.includes("ACTIVE"), "formatTaskGraph: shows ACTIVE marker for active plan")

// Skips purged plans
const wpPurgedFmt = makeWorkPlan({ id: "wp-pf", name: "Purged Plan", status: "abandoned", purgedAt: NOW })
const graphPurgedFmt = makeGraph([wpPurgedFmt])
const purgedFormatted = formatTaskGraph(graphPurgedFmt)
assert(!purgedFormatted.includes("Purged Plan"), "formatTaskGraph: skips purged plan")

// ─── 11. buildGraphReminder ────────────────────────────────────────

// No active plan — has header and create message
const reminderEmpty = buildGraphReminder(makeGraph([]))
assert(reminderEmpty.includes("Governance Reminder"), "buildGraphReminder: has header")
assert(reminderEmpty.includes("No active work plan"), "buildGraphReminder: empty graph message")

// With active plan and active task
const tnReminder = makeTaskNode({ id: "tn-rem", workPlanId: "wp-rem", name: "Reminder Task", status: "active", assignedTo: "executor" })
const wpReminder = makeWorkPlan({ id: "wp-rem", name: "Reminder Plan", status: "active", tasks: [tnReminder] })
const graphReminder = makeGraph([wpReminder], "wp-rem")
const reminderActive = buildGraphReminder(graphReminder)
assert(reminderActive.includes("Reminder Plan"), "buildGraphReminder: shows plan name")
assert(reminderActive.includes("Reminder Task"), "buildGraphReminder: shows task name")

// ─── 12. migrateV2ToV3 ────────────────────────────────────────────

const oldStore: TaskStore = {
    version: "2.0.0",
    activeEpicId: "epic-1",
    epics: [
        {
            id: "epic-1",
            name: "Migration Epic",
            status: "active",
            category: "development",
            governanceLevel: "strict",
            createdAt: NOW - 10000,
            modifiedAt: NOW - 5000,
            tasks: [
                {
                    id: "task-1",
                    epicId: "epic-1",
                    name: "Task One",
                    status: "completed",
                    assignee: "executor",
                    evidence: "all tests pass",
                    createdAt: NOW - 9000,
                    modifiedAt: NOW - 6000,
                    subtasks: [
                        {
                            id: "sub-1",
                            taskId: "task-1",
                            name: "Subtask Done",
                            status: "done",
                            toolUsed: "write",
                            timestamp: NOW - 7000,
                        },
                        {
                            id: "sub-2",
                            taskId: "task-1",
                            name: "Subtask Pending",
                            status: "pending",
                        },
                        {
                            id: "sub-3",
                            taskId: "task-1",
                            name: "Subtask Skipped",
                            status: "skipped",
                        },
                    ],
                },
                {
                    id: "task-2",
                    epicId: "epic-1",
                    name: "Task Two",
                    status: "active",
                    createdAt: NOW - 8000,
                    modifiedAt: NOW - 4000,
                    subtasks: [],
                },
            ],
        },
    ],
}

const migrated = migrateV2ToV3(oldStore)

// Structure checks
assert(migrated.version === "3.0.0", "migrateV2ToV3: version is 3.0.0")
assert(migrated.workPlans.length === 1, "migrateV2ToV3: one work plan from one epic")

// Epic → WorkPlan mapping
const mwp = migrated.workPlans[0]
assert(mwp.id === "wp-1", "migrateV2ToV3: epic id remapped (epic- → wp-)")
assert(mwp.name === "Migration Epic", "migrateV2ToV3: name preserved")
assert(mwp.category === "development", "migrateV2ToV3: category preserved")
assert(mwp.status === "active", "migrateV2ToV3: active status mapped correctly")

// Active epic → active work plan
assert(migrated.activeWorkPlanId === "wp-1", "migrateV2ToV3: activeEpicId mapped to activeWorkPlanId")

// Task → TaskNode mapping
assert(mwp.tasks.length === 2, "migrateV2ToV3: two tasks migrated")
const mtn1 = mwp.tasks[0]
assert(mtn1.id === "tn-1", "migrateV2ToV3: task id remapped (task- → tn-)")
assert(mtn1.name === "Task One", "migrateV2ToV3: task name preserved")
assert(mtn1.status === "completed", "migrateV2ToV3: completed status preserved")
assert(mtn1.assignedTo === "executor", "migrateV2ToV3: assignee mapped to assignedTo")

// Evidence preserved as result
assert(mtn1.result !== undefined, "migrateV2ToV3: evidence preserved as result")
assert(mtn1.result?.evidence === "all tests pass", "migrateV2ToV3: evidence text preserved")

// Done subtask → Checkpoint (only done subtasks become checkpoints)
assert(mtn1.checkpoints.length === 1, "migrateV2ToV3: only done subtask became checkpoint")
const mcp = mtn1.checkpoints[0]
assert(mcp.id === "cp-1", "migrateV2ToV3: subtask id remapped (sub- → cp-)")
assert(mcp.summary === "Subtask Done", "migrateV2ToV3: checkpoint summary from subtask name")
assert(mcp.tool === "write", "migrateV2ToV3: toolUsed preserved")
assert(mcp.timestamp === NOW - 7000, "migrateV2ToV3: timestamp preserved from subtask")

// Pending and skipped subtasks dropped
const mtn2 = mwp.tasks[1]
assert(mtn2.checkpoints.length === 0, "migrateV2ToV3: task with no done subtasks has no checkpoints")
assert(mtn2.status === "active", "migrateV2ToV3: active task remains active")

// Task without evidence — no result, uses fallback expectedOutput
assert(mtn2.result === undefined, "migrateV2ToV3: no evidence → no result")
assert(mtn2.expectedOutput.includes("Migrated from v2"), "migrateV2ToV3: fallback expectedOutput for missing evidence")

// ─── Quick Start Scenario Tests ───────────────────────────────────

// Simulate the quick_start workflow: create plan + task + activate in one go
const qsGraph = {
    version: "3.0.0",
    activeWorkPlanId: null,
    workPlans: [],
} as TaskGraph

// Step 1: Create plan when none exists
const qsPlan = {
    id: "wp-qs-1",
    name: "Quick: Fix auth bug",
    acceptance: [],
    category: "ad-hoc" as const,
    governanceLevel: "standard" as const,
    status: "active" as const,
    dependsOn: [],
    ownedBy: "idumb-executor",
    tasks: [],
    planAhead: [],
    createdAt: NOW,
    modifiedAt: NOW,
} satisfies WorkPlan
qsGraph.workPlans.push(qsPlan)
qsGraph.activeWorkPlanId = qsPlan.id

// Step 2: Create task node with no dependencies
const qsNode: TaskNode = {
    id: "tn-qs-1",
    workPlanId: qsPlan.id,
    name: "Fix auth bug",
    expectedOutput: "Fix auth bug",
    status: "active",
    delegatedBy: "idumb-executor",
    assignedTo: "idumb-executor",
    allowedTools: [],
    dependsOn: [],
    temporalGate: null,
    checkpoints: [],
    artifacts: [],
    createdAt: NOW,
    modifiedAt: NOW,
    startedAt: NOW,
}
qsPlan.tasks.push(qsNode)

// Verify quick_start scenario produces valid graph state
assert(qsGraph.activeWorkPlanId === "wp-qs-1", "quick_start: active work plan set")
assert(qsGraph.workPlans.length === 1, "quick_start: exactly one work plan")
assert(qsPlan.status === "active", "quick_start: plan is active")
assert(qsPlan.tasks.length === 1, "quick_start: exactly one task")
assert(qsNode.status === "active", "quick_start: task is active")
assert(qsNode.startedAt !== undefined, "quick_start: startedAt set")
assert(qsNode.dependsOn.length === 0, "quick_start: no dependencies")
assert(qsNode.temporalGate === null, "quick_start: no temporal gate")

// Verify graph helpers work on quick_start-created state
const qsChain = getActiveWorkChain(qsGraph)
assert(qsChain.workPlan !== null, "quick_start: getActiveWorkChain finds plan")
assert(qsChain.taskNode !== null, "quick_start: getActiveWorkChain finds active task")
assert(qsChain.taskNode?.id === "tn-qs-1", "quick_start: correct task node in chain")

// Verify findTaskNode works
assert(findTaskNode(qsGraph, "tn-qs-1") === qsNode, "quick_start: findTaskNode works")
assert(findParentPlan(qsGraph, "tn-qs-1") === qsPlan, "quick_start: findParentPlan works")

// Verify graph breaks detection on quick_start state (should be clean)
const qsWarnings = detectGraphBreaks(qsGraph)
assert(qsWarnings.length === 0, "quick_start: no graph breaks on clean quick_start state")

// Quick_start reuse: add second task to existing active plan
const qsNode2: TaskNode = {
    ...qsNode,
    id: "tn-qs-2",
    name: "Fix logout bug",
    expectedOutput: "Logout button works",
    status: "planned",
    startedAt: undefined,
}
qsPlan.tasks.push(qsNode2)
assert(qsPlan.tasks.length === 2, "quick_start reuse: second task added to existing plan")
assert(findTaskNode(qsGraph, "tn-qs-2")?.name === "Fix logout bug", "quick_start reuse: second task findable")

// ─── Summary ───────────────────────────────────────────────────────

console.log(`\nResults: ${passed}/${passed + failed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
