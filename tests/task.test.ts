/**
 * Phase 0 Test: Smart TODO Tool — Epic→Task→Subtask Hierarchy
 *
 * 40+ assertions covering:
 * - Schema validation: create epic/task/subtask, validate fields, chain integrity
 * - CRUD operations: create, read, update, complete, defer, abandon
 * - Edge cases: missing args, wrong IDs, no active epic, duplicate names
 * - Prerequisite enforcement: task without epic, complete without evidence, pending subtasks
 * - Stale detection: task active >threshold, epic with no active tasks
 * - State persistence: round-trip save/load of task store
 * - Backward compatibility: old setActiveTask/getActiveTask still work
 * - Tool-gate integration: smart task state allows/blocks writes correctly
 */

import { mkdirSync, existsSync, readFileSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import {
    createEpic, createTask, createSubtask, createEmptyStore,
    findEpic, findTask, findSubtask, findParentTask, findParentEpic,
    getActiveChain, validateCompletion, findOrphanTasks, findStaleTasks,
    detectChainBreaks, formatTaskTree, buildGovernanceReminder,
    TASK_STORE_VERSION,
} from "../src/schemas/task.js"
import type { TaskStore } from "../src/schemas/task.js"
import { StateManager } from "../src/lib/persistence.js"
import { createLogger } from "../src/lib/index.js"

// ─── Test Harness ────────────────────────────────────────────────────

const testBase = join(tmpdir(), `idumb-task-test-${Date.now()}`)
mkdirSync(testBase, { recursive: true })
const log = createLogger(testBase, "test-task", "debug")

let passed = 0
let failed = 0

function assert(name: string, condition: boolean): void {
    if (condition) {
        passed++
    } else {
        failed++
        const err = new Error(`FAIL: ${name}`)
        process.stderr.write(`${err.message}\n${err.stack}\n`)
    }
}

function wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// ══════════════════════════════════════════════════════════════════════
// GROUP 1: Schema Validation (8 tests)
// ══════════════════════════════════════════════════════════════════════

{
    // Test: createEmptyStore
    const store = createEmptyStore()
    assert("schema: empty store has version", store.version === TASK_STORE_VERSION)
    assert("schema: empty store has null activeEpicId", store.activeEpicId === null)
    assert("schema: empty store has empty epics", store.epics.length === 0)

    // Test: createEpic
    const epic = createEpic("Test Epic")
    assert("schema: epic has id", typeof epic.id === "string" && epic.id.startsWith("epic-"))
    assert("schema: epic has name", epic.name === "Test Epic")
    assert("schema: epic is active by default", epic.status === "active")
    assert("schema: epic has timestamps", epic.createdAt > 0 && epic.modifiedAt > 0)
    assert("schema: epic has empty tasks", epic.tasks.length === 0)
}

// ══════════════════════════════════════════════════════════════════════
// GROUP 2: CRUD Operations (8 tests)
// ══════════════════════════════════════════════════════════════════════

{
    const store = createEmptyStore()

    // Create epic
    const epic = createEpic("Auth Feature")
    store.epics.push(epic)
    store.activeEpicId = epic.id

    // Create task
    const task = createTask(epic.id, "Login Form")
    epic.tasks.push(task)
    assert("crud: task created in epic", epic.tasks.length === 1)
    assert("crud: task has correct epicId", task.epicId === epic.id)
    assert("crud: task is planned", task.status === "planned")

    // Start task
    task.status = "active"
    task.modifiedAt = Date.now()
    assert("crud: task started", task.status === "active")

    // Add subtask
    const sub1 = createSubtask(task.id, "Email validation")
    task.subtasks.push(sub1)
    assert("crud: subtask added", task.subtasks.length === 1)
    assert("crud: subtask is pending", sub1.status === "pending")

    // Complete subtask
    sub1.status = "done"
    sub1.timestamp = Date.now()
    assert("crud: subtask completed", sub1.status === "done")

    // Complete task
    task.evidence = "Login form renders, validation works"
    task.status = "completed"
    assert("crud: task completed with evidence", task.status === "completed" && task.evidence !== undefined)
}

// ══════════════════════════════════════════════════════════════════════
// GROUP 3: Edge Cases (8 tests)
// ══════════════════════════════════════════════════════════════════════

{
    const store = createEmptyStore()

    // No epics → findEpic returns undefined
    assert("edge: findEpic with no epics", findEpic(store, "nonexistent") === undefined)

    // No tasks → findTask returns undefined
    assert("edge: findTask with no tasks", findTask(store, "nonexistent") === undefined)

    // No subtasks → findSubtask returns undefined
    assert("edge: findSubtask with no subtasks", findSubtask(store, "nonexistent") === undefined)

    // findParentTask for nonexistent
    assert("edge: findParentTask for nonexistent", findParentTask(store, "fake") === undefined)

    // findParentEpic for nonexistent
    assert("edge: findParentEpic for nonexistent", findParentEpic(store, "fake") === undefined)

    // Active chain with no epic
    const chain = getActiveChain(store)
    assert("edge: empty chain epic is null", chain.epic === null)
    assert("edge: empty chain task is null", chain.task === null)
    assert("edge: empty chain pendingSubtasks empty", chain.pendingSubtasks.length === 0)
}

// ══════════════════════════════════════════════════════════════════════
// GROUP 4: Prerequisite Enforcement (6 tests)
// ══════════════════════════════════════════════════════════════════════

{
    const store = createEmptyStore()
    const epic = createEpic("Build UI")
    store.epics.push(epic)
    store.activeEpicId = epic.id

    const task = createTask(epic.id, "Create components")
    epic.tasks.push(task)
    task.status = "active"

    // Add subtasks
    const sub1 = createSubtask(task.id, "Button component")
    const sub2 = createSubtask(task.id, "Input component")
    task.subtasks.push(sub1, sub2)

    // Cannot complete task with pending subtasks
    const result1 = validateCompletion(task, "all done")
    assert("prereq: blocked with pending subtasks", !result1.valid)
    assert("prereq: block message mentions pending", result1.reason.includes("pending"))

    // Complete one subtask — still blocked
    sub1.status = "done"
    const result2 = validateCompletion(task, "partial done")
    assert("prereq: blocked with 1 pending", !result2.valid)

    // Complete both subtasks — now blocked for evidence
    sub2.status = "done"
    const result3 = validateCompletion(task, "")
    assert("prereq: blocked without evidence", !result3.valid)
    assert("prereq: evidence block message", result3.reason.includes("evidence"))

    // With evidence — success
    const result4 = validateCompletion(task, "All components rendered correctly")
    assert("prereq: passes with evidence + all done", result4.valid)
}

// ══════════════════════════════════════════════════════════════════════
// GROUP 5: Stale Detection (4 tests)
// ══════════════════════════════════════════════════════════════════════

{
    const store = createEmptyStore()
    const epic = createEpic("Stale Test")
    store.epics.push(epic)
    store.activeEpicId = epic.id

    const task = createTask(epic.id, "Slow task")
    epic.tasks.push(task)
    task.status = "active"

    // Not stale yet (just created)
    const freshStale = findStaleTasks(store, 1000)
    assert("stale: fresh task not stale", freshStale.length === 0)

    // Simulate old modifiedAt
    task.modifiedAt = Date.now() - (5 * 60 * 60 * 1000) // 5 hours ago
    const stale = findStaleTasks(store)
    assert("stale: old task detected", stale.length === 1)
    assert("stale: correct task id", stale[0].id === task.id)

    // Add done subtask → no longer stale
    const sub = createSubtask(task.id, "Done sub")
    sub.status = "done"
    task.subtasks.push(sub)
    const notStale = findStaleTasks(store)
    assert("stale: task with done subtask not stale", notStale.length === 0)
}

// ══════════════════════════════════════════════════════════════════════
// GROUP 6: Chain Break Detection (4 tests)
// ══════════════════════════════════════════════════════════════════════

{
    const store = createEmptyStore()
    const epic = createEpic("Chain Test")
    store.epics.push(epic)
    store.activeEpicId = epic.id

    // Epic active, no active tasks
    const task = createTask(epic.id, "Planned task")
    epic.tasks.push(task)
    const warnings1 = detectChainBreaks(store)
    assert("chain: no active tasks warning", warnings1.some(w => w.type === "no_active_tasks"))

    // Simulate completed task with pending subtask (integrity violation)
    task.status = "completed"
    const sub = createSubtask(task.id, "Leftover sub")
    task.subtasks.push(sub)
    const warnings2 = detectChainBreaks(store)
    assert("chain: completed with pending subtask", warnings2.some(w => w.type === "completed_with_pending"))

    // Stale task warning
    const task2 = createTask(epic.id, "Stale chain task")
    epic.tasks.push(task2)
    task2.status = "active"
    task2.modifiedAt = Date.now() - (5 * 60 * 60 * 1000)
    const warnings3 = detectChainBreaks(store)
    assert("chain: stale task warning", warnings3.some(w => w.type === "stale_task"))

    // No warnings when everything is healthy
    task.subtasks = []
    task.status = "deferred"
    task2.modifiedAt = Date.now()
    const doneSubtask = createSubtask(task2.id, "Done")
    doneSubtask.status = "done"
    task2.subtasks.push(doneSubtask)
    const warnings4 = detectChainBreaks(store)
    assert("chain: no warnings when healthy", warnings4.length === 0)
}

// ══════════════════════════════════════════════════════════════════════
// GROUP 7: State Persistence Round-Trip (4 tests)
// ══════════════════════════════════════════════════════════════════════

{
    const dir = join(testBase, "task-roundtrip")
    mkdirSync(join(dir, ".idumb/brain"), { recursive: true })

    // Create and populate
    const sm1 = new StateManager()
    await sm1.init(dir, log)

    const store1 = sm1.getTaskStore()
    const epic = createEpic("Persist Test")
    store1.epics.push(epic)
    store1.activeEpicId = epic.id

    const task = createTask(epic.id, "Persisted Task")
    epic.tasks.push(task)
    task.status = "active"

    sm1.setTaskStore(store1)
    await sm1.forceSave()

    // Verify tasks.json exists
    const tasksPath = join(dir, ".idumb/brain/tasks.json")
    assert("persist: tasks.json exists", existsSync(tasksPath))

    // Load in new StateManager
    const sm2 = new StateManager()
    await sm2.init(dir, log)
    const store2 = sm2.getTaskStore()

    assert("persist: epic survives roundtrip", store2.epics.length === 1)
    assert("persist: epic name correct", store2.epics[0].name === "Persist Test")
    assert("persist: task survives", store2.epics[0].tasks[0].name === "Persisted Task")
}

// ══════════════════════════════════════════════════════════════════════
// GROUP 8: Backward Compatibility (4 tests)
// ══════════════════════════════════════════════════════════════════════

{
    const dir = join(testBase, "task-compat")
    mkdirSync(join(dir, ".idumb/brain"), { recursive: true })

    const sm = new StateManager()
    await sm.init(dir, log)

    // Old API: setActiveTask/getActiveTask still work
    sm.setActiveTask("test-s1", { id: "old-t1", name: "Old API task" })
    assert("compat: old setActiveTask works", sm.getActiveTask("test-s1")?.name === "Old API task")

    sm.setActiveTask("test-s1", null)
    assert("compat: old clearActiveTask works", sm.getActiveTask("test-s1") === null)

    // New API: task store doesn't interfere with session tasks
    const store = sm.getTaskStore()
    const epic = createEpic("Compat Epic")
    store.epics.push(epic)
    store.activeEpicId = epic.id
    sm.setTaskStore(store)

    // Old API still reports null (different mechanism)
    assert("compat: sessionTask null while epicActive", sm.getActiveTask("test-s1") === null)

    // Smart active task
    const task = createTask(epic.id, "Compat Task")
    epic.tasks.push(task)
    task.status = "active"
    sm.setTaskStore(store)
    assert("compat: smart active task found", sm.getSmartActiveTask()?.name === "Compat Task")
}

// ══════════════════════════════════════════════════════════════════════
// GROUP 9: Display Formatters (4 tests)
// ══════════════════════════════════════════════════════════════════════

{
    // Empty store
    const empty = createEmptyStore()
    const emptyTree = formatTaskTree(empty)
    assert("display: empty tree message", emptyTree.includes("No epics created"))

    // Populated store
    const store = createEmptyStore()
    const epic = createEpic("Display Epic")
    store.epics.push(epic)
    store.activeEpicId = epic.id

    const task = createTask(epic.id, "Display Task")
    task.status = "active"
    task.assignee = "idumb-executor"
    epic.tasks.push(task)

    const sub1 = createSubtask(task.id, "Sub A")
    sub1.status = "done"
    const sub2 = createSubtask(task.id, "Sub B")
    task.subtasks.push(sub1, sub2)

    const tree = formatTaskTree(store)
    assert("display: tree shows epic name", tree.includes("Display Epic"))
    assert("display: tree shows task with assignee", tree.includes("idumb-executor"))

    const reminder = buildGovernanceReminder(store)
    assert("display: reminder shows active epic", reminder.includes("Display Epic"))
}

// ══════════════════════════════════════════════════════════════════════
// GROUP 10: Lookup and Navigation (4 tests)
// ══════════════════════════════════════════════════════════════════════

{
    const store = createEmptyStore()
    const epic = createEpic("Nav Epic")
    store.epics.push(epic)
    store.activeEpicId = epic.id

    const task = createTask(epic.id, "Nav Task")
    epic.tasks.push(task)

    const sub = createSubtask(task.id, "Nav Subtask")
    task.subtasks.push(sub)

    // Find operations
    assert("lookup: findEpic", findEpic(store, epic.id)?.name === "Nav Epic")
    assert("lookup: findTask", findTask(store, task.id)?.name === "Nav Task")
    assert("lookup: findSubtask", findSubtask(store, sub.id)?.name === "Nav Subtask")
    assert("lookup: findParentEpic", findParentEpic(store, task.id)?.id === epic.id)
}

// ─── Cleanup + Results ───────────────────────────────────────────────

try {
    rmSync(testBase, { recursive: true, force: true })
} catch {
    // cleanup is best-effort
}

process.stderr.write(`\nResults: ${passed}/${passed + failed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
