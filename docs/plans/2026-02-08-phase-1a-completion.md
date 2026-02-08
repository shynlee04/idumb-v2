# Phase 1a Completion — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the remaining ~21% of Phase 1a (Task Graph + Hook Intelligence Engine) to reach the verification gate: `npm run typecheck` clean, `npm test` passes at new baseline, AGENTS.md reflects reality.

**Architecture:** The core schema and tool implementations are done. This plan covers: test coverage for 2 new schemas + 4 new tools, 2 missing tool-gate enhancements, 3 drift fixes, deploy bootstrap, and ground truth update.

**Tech Stack:** TypeScript (ESM), hand-rolled test harness (`assert()` pattern), `@opencode-ai/plugin` tool() wrapper, Zod-free internal schemas (plain interfaces).

**Baseline:** TypeScript clean, 386/386 tests across 8 suites.

---

## Task 1: Work-Plan Schema Tests

**Files:**
- Create: `tests/work-plan.test.ts`
- Read: `src/schemas/work-plan.ts`

**Step 1: Write the test file**

```typescript
// tests/work-plan.test.ts
import {
    createWorkPlan, createTaskNode, createCheckpoint,
    createEmptyTaskGraph, createBootstrapTaskGraph,
    shouldCreateCheckpoint, isBashCheckpointWorthy,
    TASK_GRAPH_VERSION, SESSION_STALE_MS,
} from "../src/schemas/work-plan.js"

let passed = 0
let failed = 0

function assert(condition: boolean, name: string) {
    if (condition) {
        passed++
    } else {
        failed++
        console.error(`  FAIL: ${name}`)
    }
}

// ─── Factory: createWorkPlan ─────────────────────────────────────────
const wp = createWorkPlan({ name: "Test Plan" })
assert(wp.id.startsWith("wp-"), "createWorkPlan: id prefix")
assert(wp.name === "Test Plan", "createWorkPlan: name")
assert(wp.status === "draft", "createWorkPlan: default status is draft")
assert(wp.category === "development", "createWorkPlan: default category")
assert(wp.ownedBy === "idumb-supreme-coordinator", "createWorkPlan: default owner")
assert(wp.tasks.length === 0, "createWorkPlan: empty tasks")
assert(wp.planAhead.length === 0, "createWorkPlan: empty planAhead")
assert(wp.acceptance.length === 0, "createWorkPlan: empty acceptance")
assert(wp.dependsOn.length === 0, "createWorkPlan: empty dependsOn")
assert(typeof wp.createdAt === "number", "createWorkPlan: createdAt is number")

const wpCustom = createWorkPlan({
    name: "Custom",
    acceptance: ["Tests pass", "No lint errors"],
    category: "governance",
    ownedBy: "custom-agent",
})
assert(wpCustom.category === "governance", "createWorkPlan: custom category")
assert(wpCustom.acceptance.length === 2, "createWorkPlan: custom acceptance")
assert(wpCustom.ownedBy === "custom-agent", "createWorkPlan: custom owner")
assert(wpCustom.governanceLevel === "strict", "createWorkPlan: governance category defaults to strict")

// ─── Factory: createTaskNode ─────────────────────────────────────────
const tn = createTaskNode({
    workPlanId: wp.id,
    name: "Build login",
    expectedOutput: "Login component renders",
    delegatedBy: "coordinator",
    assignedTo: "executor",
})
assert(tn.id.startsWith("tn-"), "createTaskNode: id prefix")
assert(tn.workPlanId === wp.id, "createTaskNode: workPlanId")
assert(tn.status === "planned", "createTaskNode: default status")
assert(tn.allowedTools.length === 0, "createTaskNode: default empty allowedTools")
assert(tn.dependsOn.length === 0, "createTaskNode: default empty dependsOn")
assert(tn.temporalGate === null, "createTaskNode: default null temporalGate")
assert(tn.checkpoints.length === 0, "createTaskNode: empty checkpoints")

const tnWithDeps = createTaskNode({
    workPlanId: wp.id,
    name: "With deps",
    expectedOutput: "Depends on login",
    delegatedBy: "coordinator",
    assignedTo: "executor",
    dependsOn: [tn.id],
    temporalGate: { afterTaskId: tn.id, reason: "Schema first" },
    allowedTools: ["write", "edit"],
})
assert(tnWithDeps.dependsOn[0] === tn.id, "createTaskNode: custom dependsOn")
assert(tnWithDeps.temporalGate?.afterTaskId === tn.id, "createTaskNode: custom temporalGate")
assert(tnWithDeps.allowedTools.length === 2, "createTaskNode: custom allowedTools")

// ─── Factory: createCheckpoint ───────────────────────────────────────
const cp = createCheckpoint(tn.id, "write", "Created login.tsx", ["src/login.tsx"])
assert(cp.id.startsWith("cp-"), "createCheckpoint: id prefix")
assert(cp.taskNodeId === tn.id, "createCheckpoint: taskNodeId")
assert(cp.tool === "write", "createCheckpoint: tool")
assert(cp.filesModified.length === 1, "createCheckpoint: filesModified")

// ─── Factory: createEmptyTaskGraph ───────────────────────────────────
const empty = createEmptyTaskGraph()
assert(empty.version === TASK_GRAPH_VERSION, "createEmptyTaskGraph: version")
assert(empty.activeWorkPlanId === null, "createEmptyTaskGraph: null active")
assert(empty.workPlans.length === 0, "createEmptyTaskGraph: empty plans")

// ─── Factory: createBootstrapTaskGraph ───────────────────────────────
const boot = createBootstrapTaskGraph()
assert(boot.activeWorkPlanId !== null, "bootstrap: has active plan")
assert(boot.workPlans.length === 1, "bootstrap: one plan")
assert(boot.workPlans[0].status === "active", "bootstrap: plan is active")
assert(boot.workPlans[0].tasks.length === 1, "bootstrap: one task")
assert(boot.workPlans[0].tasks[0].status === "active", "bootstrap: task is active")
assert(boot.workPlans[0].tasks[0].assignedTo === "idumb-executor", "bootstrap: assigned to executor")

const bootCustom = createBootstrapTaskGraph("custom-coord")
assert(bootCustom.workPlans[0].ownedBy === "custom-coord", "bootstrap: custom coordinator")

// ─── Checkpoint filtering ────────────────────────────────────────────
assert(shouldCreateCheckpoint("write") === true, "shouldCheckpoint: write yes")
assert(shouldCreateCheckpoint("edit") === true, "shouldCheckpoint: edit yes")
assert(shouldCreateCheckpoint("read") === false, "shouldCheckpoint: read no")
assert(shouldCreateCheckpoint("grep") === false, "shouldCheckpoint: grep no")
assert(shouldCreateCheckpoint("bash", { command: "npm test" }) === true, "shouldCheckpoint: npm test yes")
assert(shouldCreateCheckpoint("bash", { command: "npm run build" }) === true, "shouldCheckpoint: npm run build yes")
assert(shouldCreateCheckpoint("bash", { command: "git commit -m 'fix'" }) === true, "shouldCheckpoint: git commit yes")
assert(shouldCreateCheckpoint("bash", { command: "ls -la" }) === false, "shouldCheckpoint: ls no")
assert(shouldCreateCheckpoint("bash", { command: "cat file.txt" }) === false, "shouldCheckpoint: cat no")

assert(isBashCheckpointWorthy("npx tsc") === true, "isBashCheckpoint: npx tsc yes")
assert(isBashCheckpointWorthy("npx vite build") === true, "isBashCheckpoint: npx vite yes")
assert(isBashCheckpointWorthy("npx cowsay hello") === false, "isBashCheckpoint: npx cowsay no")
assert(isBashCheckpointWorthy("tsc") === true, "isBashCheckpoint: bare tsc yes")

// ─── Constants ───────────────────────────────────────────────────────
assert(TASK_GRAPH_VERSION === "3.0.0", "version constant")
assert(SESSION_STALE_MS === 30 * 60 * 1000, "stale threshold constant")

// ─── Summary ─────────────────────────────────────────────────────────
console.log(`\nResults: ${passed}/${passed + failed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
```

**Step 2: Run test to verify it passes**

Run: `npx tsx tests/work-plan.test.ts`
Expected: PASS — all assertions green (these test factory functions that already exist)

---

## Task 2: Task-Graph Helpers Tests

**Files:**
- Create: `tests/task-graph.test.ts`
- Read: `src/schemas/task-graph.ts`, `src/schemas/work-plan.ts`

**Step 1: Write the test file**

```typescript
// tests/task-graph.test.ts
import {
    createWorkPlan, createTaskNode, createCheckpoint,
    createEmptyTaskGraph, createBootstrapTaskGraph,
} from "../src/schemas/work-plan.js"
import {
    findWorkPlan, findTaskNode, findTaskNodeInPlan, findParentPlan, findCheckpoint,
    getActiveWorkChain,
    checkTemporalGate, checkDependencies, validateTaskStart, validateTaskCompletion,
    detectGraphBreaks,
    purgeAbandonedPlans, archiveChainBreakers,
    formatTaskGraph, buildGraphReminder,
    migrateV2ToV3,
} from "../src/schemas/task-graph.js"
import type { TaskStore, TaskEpic, SmartTask } from "../src/schemas/task.js"

let passed = 0
let failed = 0

function assert(condition: boolean, name: string) {
    if (condition) {
        passed++
    } else {
        failed++
        console.error(`  FAIL: ${name}`)
    }
}

// ─── Test Fixtures ───────────────────────────────────────────────────
function buildTestGraph() {
    const graph = createEmptyTaskGraph()
    const wp = createWorkPlan({ name: "Auth System", acceptance: ["Login works"] })
    wp.status = "active"
    graph.activeWorkPlanId = wp.id

    const tn1 = createTaskNode({
        workPlanId: wp.id, name: "Schema migration",
        expectedOutput: "Tables created", delegatedBy: "coordinator", assignedTo: "executor",
    })
    const tn2 = createTaskNode({
        workPlanId: wp.id, name: "Build login",
        expectedOutput: "Login renders", delegatedBy: "coordinator", assignedTo: "executor",
        dependsOn: [tn1.id],
        temporalGate: { afterTaskId: tn1.id, reason: "Schema first" },
    })
    tn2.status = "blocked"

    wp.tasks.push(tn1, tn2)
    graph.workPlans.push(wp)
    return { graph, wp, tn1, tn2 }
}

// ─── Lookup Helpers ──────────────────────────────────────────────────
const { graph, wp, tn1, tn2 } = buildTestGraph()

assert(findWorkPlan(graph, wp.id)?.name === "Auth System", "findWorkPlan: finds by id")
assert(findWorkPlan(graph, "nonexistent") === undefined, "findWorkPlan: undefined for missing")

assert(findTaskNode(graph, tn1.id)?.name === "Schema migration", "findTaskNode: finds in tasks")
assert(findTaskNode(graph, "nonexistent") === undefined, "findTaskNode: undefined for missing")

assert(findTaskNodeInPlan(wp, tn1.id)?.name === "Schema migration", "findTaskNodeInPlan: finds")
assert(findTaskNodeInPlan(wp, "nonexistent") === undefined, "findTaskNodeInPlan: undefined for missing")

assert(findParentPlan(graph, tn1.id)?.name === "Auth System", "findParentPlan: finds parent")
assert(findParentPlan(graph, "nonexistent") === undefined, "findParentPlan: undefined for missing")

// Checkpoint lookup
const cp = createCheckpoint(tn1.id, "write", "Created migration.sql")
tn1.checkpoints.push(cp)
assert(findCheckpoint(graph, cp.id)?.summary === "Created migration.sql", "findCheckpoint: finds")
assert(findCheckpoint(graph, "nonexistent") === undefined, "findCheckpoint: undefined for missing")

// planAhead lookup
const tn3 = createTaskNode({
    workPlanId: wp.id, name: "Future task",
    expectedOutput: "TBD", delegatedBy: "coordinator", assignedTo: "executor",
})
wp.planAhead.push(tn3)
assert(findTaskNode(graph, tn3.id)?.name === "Future task", "findTaskNode: finds in planAhead")
assert(findParentPlan(graph, tn3.id)?.id === wp.id, "findParentPlan: finds for planAhead node")

// ─── Active Chain ────────────────────────────────────────────────────
tn1.status = "active"
const chain = getActiveWorkChain(graph)
assert(chain.workPlan?.id === wp.id, "activeChain: correct plan")
assert(chain.taskNode?.id === tn1.id, "activeChain: correct task")
assert(chain.recentCheckpoints.length === 1, "activeChain: has checkpoints")
assert(chain.nextPlanned !== null, "activeChain: has next planned")

const emptyChain = getActiveWorkChain(createEmptyTaskGraph())
assert(emptyChain.workPlan === null, "activeChain: null for empty")
assert(emptyChain.taskNode === null, "activeChain: null task for empty")

// ─── Temporal Gate Validation ────────────────────────────────────────
// tn1 is active (not completed), tn2 depends on tn1
const gateCheck = checkTemporalGate(graph, tn2)
assert(!gateCheck.allowed, "temporalGate: blocked when dep not completed")
assert(gateCheck.blockedBy?.id === tn1.id, "temporalGate: identifies blocker")

// Complete tn1 and re-check
tn1.status = "completed"
const gateCheck2 = checkTemporalGate(graph, tn2)
assert(gateCheck2.allowed, "temporalGate: allowed when dep completed")

// No temporal gate
const noGateCheck = checkTemporalGate(graph, tn1)
assert(noGateCheck.allowed, "temporalGate: allowed when no gate")

// ─── Dependency Validation ───────────────────────────────────────────
const depCheck = checkDependencies(graph, tn2)
assert(depCheck.allowed, "dependencies: allowed when all deps completed")

tn1.status = "active" // Reset
const depCheck2 = checkDependencies(graph, tn2)
assert(!depCheck2.allowed, "dependencies: blocked when dep not completed")

// ─── Full Start Validation ───────────────────────────────────────────
tn1.status = "completed"
tn2.status = "planned" // Reset to planned
const startCheck = validateTaskStart(graph, tn2)
assert(startCheck.allowed, "validateStart: allowed when deps met")

tn2.status = "active"
const startCheck2 = validateTaskStart(graph, tn2)
assert(!startCheck2.allowed, "validateStart: blocked when already active")

tn2.status = "completed"
const startCheck3 = validateTaskStart(graph, tn2)
assert(!startCheck3.allowed, "validateStart: blocked when already completed")

// ─── Completion Validation ───────────────────────────────────────────
tn1.status = "active" // Make it active for completion test
const compCheck = validateTaskCompletion(tn1, "Tests pass")
assert(compCheck.valid, "completion: valid with evidence")

const compCheck2 = validateTaskCompletion(tn1, "")
assert(!compCheck2.valid, "completion: invalid without evidence")

const compCheck3 = validateTaskCompletion(tn1, undefined)
assert(!compCheck3.valid, "completion: invalid with undefined evidence")

tn1.status = "planned"
const compCheck4 = validateTaskCompletion(tn1, "Evidence")
assert(!compCheck4.valid, "completion: invalid for non-active task")

// ─── Chain Break Detection ──────────────────────────────────────────
tn1.status = "completed"
tn2.status = "planned"
// Create a graph where active plan has no active tasks
const breakWarnings = detectGraphBreaks(graph)
assert(breakWarnings.some(w => w.type === "no_active_tasks"), "breaks: detects no active tasks")

// ─── Purge Logic ─────────────────────────────────────────────────────
const purgeGraph = createEmptyTaskGraph()
const abandoned = createWorkPlan({ name: "Old plan" })
abandoned.status = "abandoned"
abandoned.modifiedAt = Date.now() - (49 * 60 * 60 * 1000) // 49h ago
purgeGraph.workPlans.push(abandoned)

const purgeCount = purgeAbandonedPlans(purgeGraph)
assert(purgeCount === 1, "purge: purges old abandoned plan")
assert(abandoned.purgedAt !== undefined, "purge: sets purgedAt")

const purgeCount2 = purgeAbandonedPlans(purgeGraph)
assert(purgeCount2 === 0, "purge: no double-purge")

// Not old enough
const newAbandoned = createWorkPlan({ name: "New abandoned" })
newAbandoned.status = "abandoned"
newAbandoned.modifiedAt = Date.now() - (1 * 60 * 60 * 1000) // 1h ago
purgeGraph.workPlans.push(newAbandoned)
const purgeCount3 = purgeAbandonedPlans(purgeGraph)
assert(purgeCount3 === 0, "purge: does not purge recent abandoned")

// ─── Chain Breaker Archive ──────────────────────────────────────────
const breakerGraph = createEmptyTaskGraph()
const breakerWp = createWorkPlan({ name: "Breaker plan" })
breakerWp.status = "active"
const failedTask = createTaskNode({
    workPlanId: breakerWp.id, name: "Failed task",
    expectedOutput: "N/A", delegatedBy: "coord", assignedTo: "exec",
})
failedTask.status = "failed"
const dependentTask = createTaskNode({
    workPlanId: breakerWp.id, name: "Dependent",
    expectedOutput: "N/A", delegatedBy: "coord", assignedTo: "exec",
    dependsOn: [failedTask.id],
})
dependentTask.status = "planned"
breakerWp.tasks.push(failedTask, dependentTask)
breakerGraph.workPlans.push(breakerWp)

const triggers = archiveChainBreakers(breakerGraph)
assert(triggers.length === 1, "chainBreakers: detects trigger")
assert(dependentTask.status === "blocked", "chainBreakers: blocks dependent")

// ─── Display Formatters ─────────────────────────────────────────────
const emptyDisplay = formatTaskGraph(createEmptyTaskGraph())
assert(emptyDisplay.includes("No work plans"), "format: empty graph message")

const fullDisplay = formatTaskGraph(graph)
assert(fullDisplay.includes("Auth System"), "format: shows plan name")

const reminder = buildGraphReminder(graph)
assert(reminder.includes("Governance Reminder"), "reminder: has header")

const emptyReminder = buildGraphReminder(createEmptyTaskGraph())
assert(emptyReminder.includes("No active work plan"), "reminder: empty message")

// ─── V2 → V3 Migration ──────────────────────────────────────────────
const oldStore: TaskStore = {
    version: "2.0.0",
    activeEpicId: "epic-1",
    epics: [{
        id: "epic-1",
        name: "Old Epic",
        category: "development",
        governanceLevel: "balanced",
        status: "active",
        tags: [],
        createdBy: "coordinator",
        createdAt: Date.now() - 100000,
        modifiedAt: Date.now(),
        tasks: [{
            id: "task-1",
            epicId: "epic-1",
            name: "Old Task",
            status: "active",
            assignee: "executor",
            evidence: "Some evidence",
            createdBy: "coordinator",
            createdAt: Date.now() - 50000,
            modifiedAt: Date.now(),
            subtasks: [
                { id: "sub-1", name: "Done subtask", status: "done", createdAt: Date.now(), toolUsed: "write", timestamp: Date.now() },
                { id: "sub-2", name: "Pending subtask", status: "pending", createdAt: Date.now() },
            ],
        }],
    }],
}

const migrated = migrateV2ToV3(oldStore as unknown as TaskStore)
assert(migrated.version === "3.0.0", "migration: version 3.0.0")
assert(migrated.activeWorkPlanId === "wp-1", "migration: maps active epic")
assert(migrated.workPlans.length === 1, "migration: one plan")
assert(migrated.workPlans[0].tasks.length === 1, "migration: one task")
assert(migrated.workPlans[0].tasks[0].checkpoints.length === 1, "migration: done subtask → checkpoint")
assert(migrated.workPlans[0].tasks[0].result?.evidence === "Some evidence", "migration: preserves evidence")

// ─── Summary ─────────────────────────────────────────────────────────
console.log(`\nResults: ${passed}/${passed + failed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
```

**Step 2: Run test to verify it passes**

Run: `npx tsx tests/task-graph.test.ts`
Expected: PASS

**Note:** The migration test fixture uses `TaskStore` type. The `subtasks` shape must match the schema — read `src/schemas/task.ts` to verify `Subtask` type fields (id, name, status, createdAt, toolUsed?, timestamp?). Adjust fixture if needed.

---

## Task 3: Tool-Gate Enhancement — Checkpoint Auto-Recording

**Files:**
- Modify: `src/hooks/tool-gate.ts:289-344` (createToolGateAfter function)
- Read: `src/schemas/work-plan.ts` (shouldCreateCheckpoint, createCheckpoint)
- Modify: `tests/tool-gate.test.ts`

**Step 1: Write the failing test (add to end of tool-gate.test.ts)**

```typescript
// Test: checkpoint auto-recording in after-hook
// After a write/edit/bash(build) completes with an active task,
// a checkpoint should be recorded in the TaskGraph.
```

The after-hook needs to:
1. Check if tool is checkpoint-worthy (`shouldCreateCheckpoint`)
2. If yes, and there's an active task in the TaskGraph, auto-create a checkpoint
3. Append checkpoint to the active TaskNode's checkpoints array
4. Save the TaskGraph

**Step 2: Implement in tool-gate.ts after-hook**

In `createToolGateAfter`, after the existing defense-in-depth block, add:

```typescript
// ─── Checkpoint auto-recording ──────────────────────────────────────
import { shouldCreateCheckpoint, createCheckpoint } from "../schemas/index.js"

// Inside the after-hook, after the defense-in-depth section:
if (stateManager.getActiveTask(sessionID)) {
    const args = output.metadata as Record<string, unknown> | undefined
    if (shouldCreateCheckpoint(tool, args)) {
        const graph = stateManager.getTaskGraph()
        const activeWP = graph.workPlans.find(wp => wp.status === "active")
        if (activeWP) {
            const activeNode = activeWP.tasks.find(t => t.status === "active")
            if (activeNode) {
                const summary = output.title || `${tool} operation`
                const filesModified: string[] = []
                // Extract file path from args if available
                if (typeof args?.file_path === "string") filesModified.push(args.file_path)
                if (typeof args?.path === "string") filesModified.push(args.path)

                const cp = createCheckpoint(activeNode.id, tool, summary, filesModified)
                activeNode.checkpoints.push(cp)
                activeNode.artifacts = [...new Set([...activeNode.artifacts, ...filesModified])]
                activeNode.modifiedAt = Date.now()
                stateManager.saveTaskGraph(graph)
                log.debug(`CHECKPOINT: ${tool} → "${summary}" (${activeNode.checkpoints.length} total)`, { sessionID })
            }
        }
    }
}
```

**Step 3: Run tests**

Run: `npx tsx tests/tool-gate.test.ts`
Expected: PASS (existing + new assertions)

**Step 4: Run full suite**

Run: `npm test`
Expected: PASS

---

## Task 4: Fix DRIFT-02 — Templates Legacy Agent References

**Files:**
- Modify: `src/templates.ts:1099-1262` (DELEGATION_SKILL_TEMPLATE)
- Modify: `src/templates.ts:1268-end` (GOVERNANCE_SKILL_TEMPLATE)

**Step 1: Replace legacy agent references in DELEGATION_SKILL_TEMPLATE**

Replace the "When to Delegate" table (lines ~1120-1125):
```
| Your Role | Delegate To | When |
|-----------|------------|------|
| `supreme-coordinator` | `investigator`, `executor` | Research, analysis, implementation |
| `investigator` | (cannot delegate) | N/A |
| `executor` | (cannot delegate) | N/A |
```

Replace "Chain Rules" hierarchy (lines ~1223-1227):
```
Level 0: idumb-supreme-coordinator (pure orchestrator — creates plans, delegates, tracks status)
Level 1: idumb-investigator, idumb-executor (research + implementation)
```

Replace depth limits (~1229-1234):
```
- Depth 0 → 1: coordinator delegates to investigator/executor ✅
- Depth 1 → ❌: BLOCKED (no sub-delegation in 3-agent model)
```

Replace category routing table (~1208-1215):
```
| Category | Allowed Agents | Reason |
|----------|---------------|--------|
| `development` | executor | Write + bash permissions needed |
| `research` | investigator | Read access and synthesis |
| `governance` | coordinator | Governance authority |
| `planning` | investigator | Read + brain write |
| `documentation` | investigator | Analysis and brain entries |
| `ad-hoc` | executor, investigator | Minimal routing constraints |
```

Replace all `idumb-builder` → `idumb-executor`, `idumb-validator` → remove, `idumb-planner` → `idumb-investigator`, `meta-builder` → `idumb-supreme-coordinator`, `idumb-skills-creator` → remove, `idumb-research-synthesizer` → remove.

Replace `idumb_task action=delegate` → `govern_delegate action=assign`.
Replace `idumb_task action=complete` → `govern_task action=complete`.
Replace `idumb_task action=status` → `govern_task action=status`.

**Step 2: Replace legacy references in GOVERNANCE_SKILL_TEMPLATE**

Same substitutions: all legacy agent names → 3-agent model. All old tool names → govern_* tools.

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

---

## Task 5: Fix DRIFT-03 — Document Edit vs Write Design

**Files:**
- Modify: `src/templates.ts` (executor agent template, near line 63-84)

**Step 1: Add doc comment to executor frontmatter area**

In `getExecutorAgent()`, add a comment explaining the two-track permission model before/after the frontmatter section:

```typescript
/**
 * Two-track permission model:
 * - Innate `edit: true` gives the executor direct file editing (bypasses governance).
 *   This is intentional for implementation velocity — the executor needs edit for fast iteration.
 * - Plugin `govern_shell` provides governed bash execution with purpose-based gating.
 * - Plugin `govern_task` provides the task lifecycle bridge that unlocks write/edit via tool-gate.
 * - The tool-gate hook still blocks write/edit without an active task regardless of frontmatter.
 *
 * Net effect: executor CAN use innate edit, but ONLY when a task is active (hook-enforced).
 */
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

---

## Task 6: Fix DRIFT-04 — Unblock idumb_init for Coordinator

**Files:**
- Modify: `src/hooks/tool-gate.ts:53-54` (AGENT_TOOL_RULES, coordinator entry)
- Modify: `tests/tool-gate.test.ts`

**Step 1: Write the failing test**

Add to tool-gate.test.ts:
```typescript
// Test: coordinator can call idumb_init (for status/scan, not install)
assert(!rules.blockedTools.has("idumb_init"), "coordinator: idumb_init NOT blocked")
```

**Step 2: Unblock idumb_init for coordinator**

In `AGENT_TOOL_RULES`, coordinator's `blockedTools`, remove `"idumb_init"`. Add action-level block for the `install` action only:

```typescript
"idumb-supreme-coordinator": {
    blockedTools: new Set(["idumb_write", "idumb_bash", "idumb_webfetch"]),
    blockedActions: {
        "idumb_task": new Set(["create_epic"]),
        "idumb_init": new Set(["install"]),  // coordinator can status/scan but not install
        "govern_task": new Set(["start", "complete", "fail", "review"]),
    },
},
```

**Step 3: Run tests**

Run: `npx tsx tests/tool-gate.test.ts`
Expected: PASS

---

## Task 7: Deploy Bootstrap — TaskGraph

**Files:**
- Modify: `src/cli/deploy.ts:328-348`
- Read: `src/schemas/work-plan.ts` (createBootstrapTaskGraph)

**Step 1: Add TaskGraph bootstrap alongside existing TaskStore bootstrap**

After the existing `tasks.json` bootstrap (line 339), add:

```typescript
import { createBootstrapTaskGraph } from "../schemas/work-plan.js"

// After tasksPath write:
const taskGraphPath = join(projectDir, ".idumb", "brain", "task-graph.json")
const bootstrapGraph = createBootstrapTaskGraph()
await writeIfNew(
    taskGraphPath,
    JSON.stringify(bootstrapGraph, null, 2) + "\n",
    force,
    result,
)
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

---

## Task 8: Update npm test Script

**Files:**
- Modify: `package.json` (scripts.test)

**Step 1: Add new test files to the test chain**

Add `work-plan.test.ts` and `task-graph.test.ts` to the `&&` chain in `scripts.test`:

```json
"test": "tsx tests/tool-gate.test.ts && tsx tests/compaction.test.ts && tsx tests/message-transform.test.ts && tsx tests/init.test.ts && tsx tests/persistence.test.ts && tsx tests/task.test.ts && tsx tests/delegation.test.ts && tsx tests/planning-registry.test.ts && tsx tests/work-plan.test.ts && tsx tests/task-graph.test.ts"
```

**Step 2: Run full suite**

Run: `npm test`
Expected: All 10 suites pass. New baseline: ~486+ assertions.

---

## Task 9: Update AGENTS.md Ground Truth

**Files:**
- Modify: `AGENTS.md`

**Step 1: Update these sections**

1. **Directory structure**: Add new files:
   - `src/schemas/work-plan.ts` (291 LOC)
   - `src/schemas/task-graph.ts` (605 LOC)
   - `src/tools/govern-plan.ts` (279 LOC)
   - `src/tools/govern-task.ts` (328 LOC)
   - `src/tools/govern-delegate.ts` (179 LOC)
   - `src/tools/govern-shell.ts` (231 LOC)

2. **Test baseline**: Update from 294 to new count (10 suites)

3. **Custom Tools section**: Update to show 13 tools (4 v3 + 2 retained + 7 legacy)

4. **Plugin Hooks section**: Note v3 auto-inherit + checkpoint recording

5. **Roadmap**: Mark Phase 1a as complete, add Phase 1b/1c

6. **What Works**: Add Level 6 (Task Graph Protocol)

7. **What Doesn't Work**: Update to reflect current state

8. **Known LOC Violations**: Add `task-graph.ts` (605 LOC)

9. **Session Handoff**: Update NEXT WORK section

**Step 2: Run typecheck to verify nothing broken**

Run: `npm run typecheck`
Expected: PASS

---

## Task 10: Commit

**Step 1: Stage and commit**

```bash
git add tests/work-plan.test.ts tests/task-graph.test.ts
git add src/hooks/tool-gate.ts src/templates.ts src/cli/deploy.ts
git add package.json AGENTS.md
git commit -m "feat: complete Phase 1a — tests, drift fixes, checkpoint auto-recording, deploy bootstrap"
```

---

## Execution Order & Dependencies

```
Task 1 (work-plan tests) ──┐
Task 2 (task-graph tests) ─┤── independent, can run in parallel
Task 3 (checkpoint hook) ──┘

Task 4 (DRIFT-02 templates) ──┐
Task 5 (DRIFT-03 doc comment) ┤── independent, can run in parallel
Task 6 (DRIFT-04 init unblock) ┘

Task 7 (deploy bootstrap) ─── independent

Task 8 (npm test update) ─── depends on Tasks 1, 2
Task 9 (AGENTS.md) ─── depends on Tasks 1-8 (final counts)
Task 10 (commit) ─── depends on all above
```

**Parallelization wave plan:**
- **Wave 1**: Tasks 1, 2, 3, 4, 5, 6, 7 (all independent)
- **Wave 2**: Task 8 (wire tests into npm test)
- **Wave 3**: Task 9 (AGENTS.md with final counts)
- **Wave 4**: Task 10 (commit)
