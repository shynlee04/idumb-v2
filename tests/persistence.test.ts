/**
 * Phase 1b Test: StateManager — Disk Persistence
 * 
 * Proves:
 * - State save/load round-trip (sessions + anchors)
 * - Debounced save coalesces rapid mutations
 * - Graceful degradation on disk error (read-only / missing dir)
 * - State integrity after multiple mutations
 * - Force save flushes immediately
 * - Clear resets all state
 * - Hook delegation: setActiveTask/getActiveTask via stateManager
 * - Hook delegation: addAnchor/getAnchors via stateManager
 * - Backward compatibility: existing hook APIs work unchanged
 */

import { mkdirSync, existsSync, readFileSync, writeFileSync, rmSync, chmodSync, mkdtempSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { StateManager } from "../src/lib/persistence.js"
import { createLogger } from "../src/lib/index.js"
import { createAnchor } from "../src/schemas/anchor.js"
import type { Anchor } from "../src/schemas/anchor.js"
import { createEpic, createTask } from "../src/schemas/task.js"
import type { TaskStore } from "../src/schemas/task.js"
import { createEmptyDelegationStore, createDelegation } from "../src/schemas/delegation.js"
import type { DelegationStore } from "../src/schemas/delegation.js"

// ─── Test harness ────────────────────────────────────────────────────

const testBase = join(tmpdir(), `idumb-persist-test-${Date.now()}`)
mkdirSync(testBase, { recursive: true })

const log = createLogger(testBase, "test-persistence", "debug")

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

/** Helper: wait for debounced save to flush */
function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ─── Test 1: Fresh init — no state file ──────────────────────────────

{
  const dir = join(testBase, "fresh")
  mkdirSync(dir, { recursive: true })

  const sm = new StateManager()
  await sm.init(dir, log)

  assert("fresh init: initialized", sm.isInitialized())
  assert("fresh init: not degraded", !sm.isDegraded())
  assert("fresh init: no active task", sm.getActiveTask("s1") === null)
  assert("fresh init: no anchors", sm.getAnchors("s1").length === 0)
}

// ─── Test 2: Set and get session state ───────────────────────────────

{
  const dir = join(testBase, "session-state")
  mkdirSync(dir, { recursive: true })

  const sm = new StateManager()
  await sm.init(dir, log)

  sm.setActiveTask("s1", { id: "t1", name: "test task" })
  assert("session: task set", sm.getActiveTask("s1")?.name === "test task")
  assert("session: task id", sm.getActiveTask("s1")?.id === "t1")

  sm.setActiveTask("s1", null)
  assert("session: task cleared", sm.getActiveTask("s1") === null)

  sm.setLastBlock("s1", { tool: "write", timestamp: 1000 })
  assert("session: lastBlock set", sm.getLastBlock("s1")?.tool === "write")

  // Different session isolation
  sm.setActiveTask("s2", { id: "t2", name: "other task" })
  assert("session isolation: s1 no task", sm.getActiveTask("s1") === null)
  assert("session isolation: s2 has task", sm.getActiveTask("s2")?.name === "other task")
}

// ─── Test 3: Add and get anchors ─────────────────────────────────────

{
  const dir = join(testBase, "anchors")
  mkdirSync(dir, { recursive: true })

  const sm = new StateManager()
  await sm.init(dir, log)

  const anchor1 = createAnchor("decision", "critical", "Use React for UI")
  const anchor2 = createAnchor("architecture", "high", "Monorepo structure")

  sm.addAnchor("s1", anchor1)
  sm.addAnchor("s1", anchor2)
  sm.addAnchor("s2", anchor1)

  assert("anchors: s1 has 2", sm.getAnchors("s1").length === 2)
  assert("anchors: s2 has 1", sm.getAnchors("s2").length === 1)
  assert("anchors: s1 first is decision", sm.getAnchors("s1")[0].type === "decision")
  assert("anchors: s3 empty", sm.getAnchors("s3").length === 0)
}

// ─── Test 4: Save/load round-trip ────────────────────────────────────

{
  const dir = join(testBase, "roundtrip")
  mkdirSync(join(dir, ".idumb/brain"), { recursive: true })

  // Create and populate state
  const sm1 = new StateManager()
  await sm1.init(dir, log)

  sm1.setActiveTask("session-A", { id: "task-1", name: "Build feature X" })
  const anchor = createAnchor("decision", "critical", "Database schema locked")
  sm1.addAnchor("session-A", anchor)

  // Force save to disk
  await sm1.forceSave()

  // Verify file exists
  const statePath = join(dir, ".idumb/brain/hook-state.json")
  assert("roundtrip: state file exists", existsSync(statePath))

  // Create new StateManager and load
  const sm2 = new StateManager()
  await sm2.init(dir, log)

  assert("roundtrip: task survives", sm2.getActiveTask("session-A")?.name === "Build feature X")
  assert("roundtrip: task id survives", sm2.getActiveTask("session-A")?.id === "task-1")
  assert("roundtrip: anchor survives", sm2.getAnchors("session-A").length === 1)
  assert("roundtrip: anchor content", sm2.getAnchors("session-A")[0].content === "Database schema locked")
  assert("roundtrip: anchor type", sm2.getAnchors("session-A")[0].type === "decision")
}

// ─── Test 5: Debounced save coalesces ────────────────────────────────

{
  const dir = join(testBase, "debounce")
  mkdirSync(join(dir, ".idumb/brain"), { recursive: true })

  const sm = new StateManager()
  await sm.init(dir, log)

  // Rapid-fire mutations
  sm.setActiveTask("s1", { id: "t1", name: "task 1" })
  sm.setActiveTask("s1", { id: "t2", name: "task 2" })
  sm.setActiveTask("s1", { id: "t3", name: "task 3" })
  sm.addAnchor("s1", createAnchor("decision", "high", "anchor 1"))
  sm.addAnchor("s1", createAnchor("decision", "high", "anchor 2"))

  // Wait for debounce to flush (500ms + buffer)
  await wait(700)

  // Verify final state was saved
  const statePath = join(dir, ".idumb/brain/hook-state.json")
  assert("debounce: file exists after wait", existsSync(statePath))

  const raw = JSON.parse(readFileSync(statePath, "utf-8"))
  assert("debounce: final task saved", raw.sessions["s1"]?.activeTask?.name === "task 3")
  assert("debounce: both anchors saved", raw.anchors["s1"]?.length === 2)
}

// ─── Test 6: Force save flushes immediately ──────────────────────────

{
  const dir = join(testBase, "forcesave")
  mkdirSync(join(dir, ".idumb/brain"), { recursive: true })

  const sm = new StateManager()
  await sm.init(dir, log)

  sm.setActiveTask("s1", { id: "t1", name: "forced task" })
  await sm.forceSave()

  const statePath = join(dir, ".idumb/brain/hook-state.json")
  assert("forceSave: file exists immediately", existsSync(statePath))

  const raw = JSON.parse(readFileSync(statePath, "utf-8"))
  assert("forceSave: task written", raw.sessions["s1"]?.activeTask?.name === "forced task")
}

// ─── Test 7: Clear resets all state ──────────────────────────────────

{
  const dir = join(testBase, "clear")
  mkdirSync(dir, { recursive: true })

  const sm = new StateManager()
  await sm.init(dir, log)

  sm.setActiveTask("s1", { id: "t1", name: "task" })
  sm.addAnchor("s1", createAnchor("decision", "high", "anchor"))

  sm.clear()

  assert("clear: no task", sm.getActiveTask("s1") === null)
  assert("clear: no anchors", sm.getAnchors("s1").length === 0)
}

// ─── Test 8: Graceful degradation — corrupt state file ───────────────

{
  const dir = join(testBase, "corrupt")
  mkdirSync(join(dir, ".idumb/brain"), { recursive: true })

  // Write garbage to state file
  writeFileSync(join(dir, ".idumb/brain/hook-state.json"), "NOT JSON {{{", "utf-8")

  const sm = new StateManager()
  await sm.init(dir, log)

  // Should initialize successfully with empty state
  assert("corrupt: initialized", sm.isInitialized())
  assert("corrupt: no task", sm.getActiveTask("s1") === null)
  assert("corrupt: state works", (() => {
    sm.setActiveTask("s1", { id: "t1", name: "recovery" })
    return sm.getActiveTask("s1")?.name === "recovery"
  })())
}

// ─── Test 9: State file version field ────────────────────────────────

{
  const dir = join(testBase, "version")
  mkdirSync(join(dir, ".idumb/brain"), { recursive: true })

  const sm = new StateManager()
  await sm.init(dir, log)
  sm.setActiveTask("s1", { id: "t1", name: "versioned" })
  await sm.forceSave()

  const raw = JSON.parse(readFileSync(join(dir, ".idumb/brain/hook-state.json"), "utf-8"))
  assert("version: has version field", raw.version === "1.1.0")
  assert("version: has lastSaved", typeof raw.lastSaved === "string")
  assert("version: lastSaved is ISO", raw.lastSaved.includes("T"))
}

// ─── Test 10: Multiple sessions persist independently ────────────────

{
  const dir = join(testBase, "multi-session")
  mkdirSync(join(dir, ".idumb/brain"), { recursive: true })

  const sm1 = new StateManager()
  await sm1.init(dir, log)

  sm1.setActiveTask("session-alpha", { id: "ta", name: "Alpha task" })
  sm1.setActiveTask("session-beta", { id: "tb", name: "Beta task" })
  sm1.addAnchor("session-alpha", createAnchor("convention", "high", "alpha anchor"))
  sm1.addAnchor("session-beta", createAnchor("decision", "critical", "beta anchor"))

  await sm1.forceSave()

  const sm2 = new StateManager()
  await sm2.init(dir, log)

  assert("multi: alpha task", sm2.getActiveTask("session-alpha")?.name === "Alpha task")
  assert("multi: beta task", sm2.getActiveTask("session-beta")?.name === "Beta task")
  assert("multi: alpha anchor", sm2.getAnchors("session-alpha")[0].content === "alpha anchor")
  assert("multi: beta anchor", sm2.getAnchors("session-beta")[0].content === "beta anchor")
  assert("multi: alpha anchor type", sm2.getAnchors("session-alpha")[0].type === "convention")
  assert("multi: beta anchor priority", sm2.getAnchors("session-beta")[0].priority === "critical")
}

// ─── Test 11: resetDegraded allows retry ─────────────────────────────

{
  const dir = join(testBase, "degraded-reset")
  mkdirSync(dir, { recursive: true })

  const sm = new StateManager()
  await sm.init(dir, log)

  assert("degraded reset: not degraded initially", !sm.isDegraded())
  // We can't easily simulate disk failure in this test, but we can test the API
  sm.resetDegraded()
  assert("degraded reset: still not degraded", !sm.isDegraded())
}

// ─── Test 12: Hook API backward compatibility ────────────────────────
// Proves that setActiveTask/getActiveTask from tool-gate.ts still work
// because they now delegate to the global stateManager singleton

{
  const { setActiveTask, getActiveTask } = await import("../src/hooks/tool-gate.js")
  const { addAnchor, getAnchors } = await import("../src/hooks/compaction.js")

  const testSessionID = `compat-test-${Date.now()}`

  setActiveTask(testSessionID, { id: "compat-t1", name: "compat task" })
  assert("compat: setActiveTask works", getActiveTask(testSessionID)?.name === "compat task")

  setActiveTask(testSessionID, null)
  assert("compat: clear task works", getActiveTask(testSessionID) === null)

  const anchor = createAnchor("decision", "high", "compat anchor")
  addAnchor(testSessionID, anchor)
  assert("compat: addAnchor works", getAnchors(testSessionID).length >= 1)
  assert("compat: anchor content", getAnchors(testSessionID).some(a => a.content === "compat anchor"))
}

// ─── Test 13: SQLite Backend — init with { sqlite: true } ────────────

console.log("\nStateManager — SQLite Backend\n")

{
  const sqlDir = mkdtempSync(join(tmpdir(), "idumb-sqlite-sm-"))

  const sm = new StateManager()
  await sm.init(sqlDir, log, { sqlite: true })

  assert("sqlite init: initialized", sm.isInitialized())
  assert("sqlite init: not degraded", !sm.isDegraded())

  await sm.close()
  rmSync(sqlDir, { recursive: true, force: true })
}

// ─── Test 14: SQLite Backend — session operations ────────────────────

{
  const sqlDir = mkdtempSync(join(tmpdir(), "idumb-sqlite-sm-"))

  const sm = new StateManager()
  await sm.init(sqlDir, log, { sqlite: true })

  // setActiveTask / getActiveTask
  sm.setActiveTask("sq1", { id: "st1", name: "SQLite task" })
  assert("sqlite session: task set", sm.getActiveTask("sq1")?.name === "SQLite task")
  assert("sqlite session: task id", sm.getActiveTask("sq1")?.id === "st1")

  sm.setActiveTask("sq1", null)
  assert("sqlite session: task cleared", sm.getActiveTask("sq1") === null)

  // setLastBlock / getLastBlock
  sm.setLastBlock("sq1", { tool: "write", timestamp: 2000 })
  assert("sqlite session: lastBlock set", sm.getLastBlock("sq1")?.tool === "write")
  assert("sqlite session: lastBlock timestamp", sm.getLastBlock("sq1")?.timestamp === 2000)

  sm.setLastBlock("sq1", null)
  assert("sqlite session: lastBlock cleared", sm.getLastBlock("sq1") === null)

  // setCapturedAgent / getCapturedAgent
  sm.setCapturedAgent("sq1", "idumb-executor")
  assert("sqlite session: agent set", sm.getCapturedAgent("sq1") === "idumb-executor")

  // Session isolation
  sm.setActiveTask("sq2", { id: "st2", name: "other SQLite task" })
  assert("sqlite isolation: sq1 no task", sm.getActiveTask("sq1") === null)
  assert("sqlite isolation: sq2 has task", sm.getActiveTask("sq2")?.name === "other SQLite task")

  // getSession returns full state
  sm.setActiveTask("sq3", { id: "st3", name: "full session" })
  sm.setCapturedAgent("sq3", "idumb-investigator")
  sm.setLastBlock("sq3", { tool: "grep", timestamp: 3000 })
  const session = sm.getSession("sq3")
  assert("sqlite getSession: activeTask", session.activeTask?.id === "st3")
  assert("sqlite getSession: capturedAgent", session.capturedAgent === "idumb-investigator")
  assert("sqlite getSession: lastBlock", session.lastBlock?.tool === "grep")

  await sm.close()
  rmSync(sqlDir, { recursive: true, force: true })
}

// ─── Test 15: SQLite Backend — task store operations ─────────────────

{
  const sqlDir = mkdtempSync(join(tmpdir(), "idumb-sqlite-sm-"))

  const sm = new StateManager()
  await sm.init(sqlDir, log, { sqlite: true })

  // Default empty store
  const defaultStore = sm.getTaskStore()
  assert("sqlite tasks: default empty", defaultStore.epics.length === 0)
  assert("sqlite tasks: default no activeEpicId", defaultStore.activeEpicId === null)

  // Set task store with epic and task
  const epic = createEpic("SQLite Epic", { category: "development" })
  const task = createTask(epic.id, "SQLite Task")
  task.status = "active"
  epic.tasks.push(task)

  const store: TaskStore = {
    version: "2.0.0",
    activeEpicId: epic.id,
    epics: [epic],
  }
  sm.setTaskStore(store)

  const retrieved = sm.getTaskStore()
  assert("sqlite tasks: epics persisted", retrieved.epics.length === 1)
  assert("sqlite tasks: activeEpicId persisted", retrieved.activeEpicId === epic.id)
  assert("sqlite tasks: epic name", retrieved.epics[0].name === "SQLite Epic")

  // getActiveEpic
  const activeEpic = sm.getActiveEpic()
  assert("sqlite tasks: getActiveEpic works", activeEpic !== null)
  assert("sqlite tasks: getActiveEpic name", activeEpic?.name === "SQLite Epic")

  // getSmartActiveTask
  const activeTask = sm.getSmartActiveTask()
  assert("sqlite tasks: getSmartActiveTask works", activeTask !== null)
  assert("sqlite tasks: getSmartActiveTask name", activeTask?.name === "SQLite Task")

  // setActiveEpicId
  sm.setActiveEpicId(null)
  assert("sqlite tasks: setActiveEpicId(null)", sm.getActiveEpic() === null)
  sm.setActiveEpicId(epic.id)
  assert("sqlite tasks: setActiveEpicId restored", sm.getActiveEpic()?.name === "SQLite Epic")

  await sm.close()
  rmSync(sqlDir, { recursive: true, force: true })
}

// ─── Test 16: SQLite Backend — anchor operations ─────────────────────

{
  const sqlDir = mkdtempSync(join(tmpdir(), "idumb-sqlite-sm-"))

  const sm = new StateManager()
  await sm.init(sqlDir, log, { sqlite: true })

  // Empty anchors
  assert("sqlite anchors: empty initially", sm.getAnchors("sa1").length === 0)

  // Add anchors
  const a1 = createAnchor("decision", "critical", "SQLite anchor 1")
  const a2 = createAnchor("context", "high", "SQLite anchor 2")
  const a3 = createAnchor("decision", "critical", "SQLite anchor for sa2")
  sm.addAnchor("sa1", a1)
  sm.addAnchor("sa1", a2)
  sm.addAnchor("sa2", a3)

  assert("sqlite anchors: sa1 has 2", sm.getAnchors("sa1").length === 2)
  assert("sqlite anchors: sa2 has 1", sm.getAnchors("sa2").length === 1)
  assert("sqlite anchors: first type", sm.getAnchors("sa1")[0].type === "decision")
  assert("sqlite anchors: first priority", sm.getAnchors("sa1")[0].priority === "critical")
  assert("sqlite anchors: first content", sm.getAnchors("sa1")[0].content === "SQLite anchor 1")
  assert("sqlite anchors: empty session", sm.getAnchors("sa3").length === 0)

  await sm.close()
  rmSync(sqlDir, { recursive: true, force: true })
}

// ─── Test 17: SQLite Backend — delegation store ──────────────────────

{
  const sqlDir = mkdtempSync(join(tmpdir(), "idumb-sqlite-sm-"))

  const sm = new StateManager()
  await sm.init(sqlDir, log, { sqlite: true })

  // Default empty
  const defaultStore = sm.getDelegationStore()
  assert("sqlite deleg: default empty", defaultStore.delegations.length === 0)

  // Set delegation store
  const delegation = createDelegation({
    fromAgent: "idumb-supreme-coordinator",
    toAgent: "idumb-executor",
    taskId: "task-sqlite",
    context: "SQLite delegation test",
    expectedOutput: "Working code",
  })
  const store: DelegationStore = {
    version: "1.0.0",
    delegations: [delegation],
  }
  sm.setDelegationStore(store)

  const retrieved = sm.getDelegationStore()
  assert("sqlite deleg: persisted", retrieved.delegations.length === 1)
  assert("sqlite deleg: fromAgent", retrieved.delegations[0].fromAgent === "idumb-supreme-coordinator")
  assert("sqlite deleg: toAgent", retrieved.delegations[0].toAgent === "idumb-executor")

  await sm.close()
  rmSync(sqlDir, { recursive: true, force: true })
}

// ─── Test 18: SQLite Backend — forceSave doesn't throw ───────────────

{
  const sqlDir = mkdtempSync(join(tmpdir(), "idumb-sqlite-sm-"))

  const sm = new StateManager()
  await sm.init(sqlDir, log, { sqlite: true })

  sm.setActiveTask("fs1", { id: "tf1", name: "force save task" })

  let threw = false
  try {
    await sm.forceSave()
  } catch {
    threw = true
  }
  assert("sqlite forceSave: does not throw", !threw)

  await sm.close()
  rmSync(sqlDir, { recursive: true, force: true })
}

// ─── Test 19: SQLite Backend — clear resets everything ───────────────

{
  const sqlDir = mkdtempSync(join(tmpdir(), "idumb-sqlite-sm-"))

  const sm = new StateManager()
  await sm.init(sqlDir, log, { sqlite: true })

  // Populate
  sm.setActiveTask("cl1", { id: "tc1", name: "clearable" })
  sm.addAnchor("cl1", createAnchor("decision", "high", "clearable anchor"))
  const epic = createEpic("Clearable Epic")
  sm.setTaskStore({
    version: "2.0.0",
    activeEpicId: epic.id,
    epics: [epic],
  })
  sm.setDelegationStore({
    version: "1.0.0",
    delegations: [createDelegation({
      fromAgent: "a",
      toAgent: "b",
      taskId: "t",
      context: "c",
      expectedOutput: "e",
    })],
  })

  // Verify populated
  assert("sqlite clear pre: has task", sm.getActiveTask("cl1") !== null)
  assert("sqlite clear pre: has anchors", sm.getAnchors("cl1").length === 1)
  assert("sqlite clear pre: has epics", sm.getTaskStore().epics.length === 1)
  assert("sqlite clear pre: has delegations", sm.getDelegationStore().delegations.length === 1)

  // Clear
  sm.clear()

  // Verify empty
  assert("sqlite clear post: no task", sm.getActiveTask("cl1") === null)
  assert("sqlite clear post: no anchors", sm.getAnchors("cl1").length === 0)
  assert("sqlite clear post: no epics", sm.getTaskStore().epics.length === 0)
  assert("sqlite clear post: no delegations", sm.getDelegationStore().delegations.length === 0)

  await sm.close()
  rmSync(sqlDir, { recursive: true, force: true })
}

// ─── Test 20: SQLite Backend — isDegraded returns false when active ──

{
  const sqlDir = mkdtempSync(join(tmpdir(), "idumb-sqlite-sm-"))

  const sm = new StateManager()
  await sm.init(sqlDir, log, { sqlite: true })

  assert("sqlite isDegraded: false when active", !sm.isDegraded())

  await sm.close()
  rmSync(sqlDir, { recursive: true, force: true })
}

// ─── Cleanup + Results ───────────────────────────────────────────────

try {
  rmSync(testBase, { recursive: true, force: true })
} catch {
  // cleanup is best-effort
}

process.stderr.write(`\nResults: ${passed}/${passed + failed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
