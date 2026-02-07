/**
 * SqliteAdapter Test Suite
 *
 * Validates the SQLite-backed StorageAdapter implementation.
 *
 * Test groups:
 * 1. Basic session operations — set/get active task, captured agent, last block
 * 2. Unknown session defaults — returns nulls for non-existent sessions
 * 3. Anchor operations — add and retrieve anchors, verify ordering
 * 4. Task store — empty by default, set and get
 * 5. Delegation store — empty by default, set and get
 * 6. Persistence across close+reopen — verify data survives restart
 * 7. clear() resets everything — verify all tables emptied
 *
 * NOT included in npm test — standalone test (native module dependency).
 */

import { mkdirSync, rmSync, existsSync } from "node:fs"
import { mkdtempSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { SqliteAdapter } from "../src/lib/sqlite-adapter.js"
import { createAnchor } from "../src/schemas/anchor.js"
import type { Anchor } from "../src/schemas/anchor.js"
import { createEmptyStore, createEpic, createTask } from "../src/schemas/task.js"
import type { TaskStore } from "../src/schemas/task.js"
import { createEmptyDelegationStore, createDelegation } from "../src/schemas/delegation.js"
import type { DelegationStore } from "../src/schemas/delegation.js"

// ─── Test Harness ────────────────────────────────────────────────────

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

// ─── Setup ───────────────────────────────────────────────────────────

const testDir = mkdtempSync(join(tmpdir(), "idumb-sqlite-test-"))

// ══════════════════════════════════════════════════════════════════════
// Group 1: Basic Session Operations
// ══════════════════════════════════════════════════════════════════════

console.log("\n--- Group 1: Basic Session Operations ---")

{
  const adapter = new SqliteAdapter()
  await adapter.init(testDir)

  // setActiveTask + getActiveTask
  adapter.setActiveTask("s1", { id: "task-1", name: "Build widget" })
  const task = adapter.getActiveTask("s1")
  assert("setActiveTask stores task", task !== null)
  assert("getActiveTask returns correct id", task?.id === "task-1")
  assert("getActiveTask returns correct name", task?.name === "Build widget")

  // setCapturedAgent + getCapturedAgent
  adapter.setCapturedAgent("s1", "idumb-executor")
  const agent = adapter.getCapturedAgent("s1")
  assert("setCapturedAgent stores agent", agent === "idumb-executor")

  // setLastBlock + getLastBlock
  const blockTs = Date.now()
  adapter.setLastBlock("s1", { tool: "file_write", timestamp: blockTs })
  const block = adapter.getLastBlock("s1")
  assert("setLastBlock stores block", block !== null)
  assert("getLastBlock returns correct tool", block?.tool === "file_write")
  assert("getLastBlock returns correct timestamp", block?.timestamp === blockTs)

  // getSession returns full state
  const session = adapter.getSession("s1")
  assert("getSession activeTask present", session.activeTask?.id === "task-1")
  assert("getSession lastBlock present", session.lastBlock?.tool === "file_write")
  assert("getSession capturedAgent present", session.capturedAgent === "idumb-executor")

  // Clear activeTask (set to null)
  adapter.setActiveTask("s1", null)
  const cleared = adapter.getActiveTask("s1")
  assert("setActiveTask(null) clears task", cleared === null)

  // Clear lastBlock (set to null)
  adapter.setLastBlock("s1", null)
  const clearedBlock = adapter.getLastBlock("s1")
  assert("setLastBlock(null) clears block", clearedBlock === null)

  await adapter.close()
}

// ══════════════════════════════════════════════════════════════════════
// Group 2: Unknown Session Defaults
// ══════════════════════════════════════════════════════════════════════

console.log("\n--- Group 2: Unknown Session Defaults ---")

{
  const adapter = new SqliteAdapter()
  await adapter.init(testDir)

  const session = adapter.getSession("nonexistent-session")
  assert("unknown session activeTask is null", session.activeTask === null)
  assert("unknown session lastBlock is null", session.lastBlock === null)
  assert("unknown session capturedAgent is null", session.capturedAgent === null)

  const task = adapter.getActiveTask("nonexistent-session")
  assert("getActiveTask for unknown session is null", task === null)

  const agent = adapter.getCapturedAgent("nonexistent-session")
  assert("getCapturedAgent for unknown session is null", agent === null)

  const block = adapter.getLastBlock("nonexistent-session")
  assert("getLastBlock for unknown session is null", block === null)

  await adapter.close()
}

// ══════════════════════════════════════════════════════════════════════
// Group 3: Anchor Operations
// ══════════════════════════════════════════════════════════════════════

console.log("\n--- Group 3: Anchor Operations ---")

{
  const adapter = new SqliteAdapter()
  await adapter.init(testDir)

  // Start with empty anchors
  const empty = adapter.getAnchors("s-anchor")
  assert("getAnchors returns empty array for new session", empty.length === 0)

  // Add anchors
  const a1 = createAnchor("decision", "critical", "Use SQLite for persistence")
  // Slight delay to ensure ordering by createdAt
  const a2 = createAnchor("context", "high", "Project is ESM-only")
  const a3 = createAnchor("checkpoint", "medium", "Phase 1 complete")

  adapter.addAnchor("s-anchor", a1)
  adapter.addAnchor("s-anchor", a2)
  adapter.addAnchor("s-anchor", a3)

  const anchors = adapter.getAnchors("s-anchor")
  assert("getAnchors returns 3 anchors", anchors.length === 3)
  assert("anchor 1 type is decision", anchors[0].type === "decision")
  assert("anchor 1 priority is critical", anchors[0].priority === "critical")
  assert("anchor 1 content matches", anchors[0].content === "Use SQLite for persistence")
  assert("anchor 1 has createdAt", typeof anchors[0].createdAt === "number")
  assert("anchor 1 has modifiedAt", typeof anchors[0].modifiedAt === "number")
  assert("anchor 2 type is context", anchors[1].type === "context")
  assert("anchor 3 type is checkpoint", anchors[2].type === "checkpoint")

  // Anchors are ordered by created_at ASC
  assert("anchors ordered by createdAt", anchors[0].createdAt <= anchors[1].createdAt)
  assert("anchors ordered by createdAt (2-3)", anchors[1].createdAt <= anchors[2].createdAt)

  // Anchors are session-scoped
  const otherAnchors = adapter.getAnchors("s-other")
  assert("anchors are session-scoped (other session empty)", otherAnchors.length === 0)

  // Add anchor to different session
  const a4 = createAnchor("error", "low", "Test error anchor")
  adapter.addAnchor("s-other", a4)
  assert("other session has 1 anchor", adapter.getAnchors("s-other").length === 1)
  assert("original session still has 3 anchors", adapter.getAnchors("s-anchor").length === 3)

  // Replace anchor (same ID)
  const updated: Anchor = { ...a1, content: "Updated content", modifiedAt: Date.now() }
  adapter.addAnchor("s-anchor", updated)
  const afterUpdate = adapter.getAnchors("s-anchor")
  assert("replace anchor keeps count at 3", afterUpdate.length === 3)
  const replaced = afterUpdate.find(a => a.id === a1.id)
  assert("replaced anchor has updated content", replaced?.content === "Updated content")

  await adapter.close()
}

// ══════════════════════════════════════════════════════════════════════
// Group 4: Task Store
// ══════════════════════════════════════════════════════════════════════

console.log("\n--- Group 4: Task Store ---")

{
  const adapter = new SqliteAdapter()
  await adapter.init(testDir)

  // Default empty store
  const defaultStore = adapter.getTaskStore()
  assert("default task store has no epics", defaultStore.epics.length === 0)
  assert("default task store activeEpicId is null", defaultStore.activeEpicId === null)

  // getActiveEpic with no active epic
  assert("getActiveEpic returns null with no epics", adapter.getActiveEpic() === null)

  // getSmartActiveTask with no active task
  assert("getSmartActiveTask returns null with no tasks", adapter.getSmartActiveTask() === null)

  // Set a task store with an active epic and task
  const epic = createEpic("Test Epic", { category: "development" })
  const task = createTask(epic.id, "Test Task")
  task.status = "active"
  epic.tasks.push(task)

  const store: TaskStore = {
    version: "2.0.0",
    activeEpicId: epic.id,
    epics: [epic],
  }
  adapter.setTaskStore(store)

  const retrieved = adapter.getTaskStore()
  assert("setTaskStore persists epics", retrieved.epics.length === 1)
  assert("setTaskStore persists activeEpicId", retrieved.activeEpicId === epic.id)
  assert("setTaskStore persists epic name", retrieved.epics[0].name === "Test Epic")
  assert("setTaskStore persists tasks", retrieved.epics[0].tasks.length === 1)

  // getActiveEpic
  const activeEpic = adapter.getActiveEpic()
  assert("getActiveEpic returns the active epic", activeEpic !== null)
  assert("getActiveEpic returns correct name", activeEpic?.name === "Test Epic")

  // getSmartActiveTask
  const activeTask = adapter.getSmartActiveTask()
  assert("getSmartActiveTask returns the active task", activeTask !== null)
  assert("getSmartActiveTask returns correct name", activeTask?.name === "Test Task")

  await adapter.close()
}

// ══════════════════════════════════════════════════════════════════════
// Group 5: Delegation Store
// ══════════════════════════════════════════════════════════════════════

console.log("\n--- Group 5: Delegation Store ---")

{
  const adapter = new SqliteAdapter()
  await adapter.init(testDir)

  // Default empty store
  const defaultStore = adapter.getDelegationStore()
  assert("default delegation store has no delegations", defaultStore.delegations.length === 0)

  // Set delegation store with a record
  const delegation = createDelegation({
    fromAgent: "idumb-supreme-coordinator",
    toAgent: "idumb-executor",
    taskId: "task-123",
    context: "Build the feature",
    expectedOutput: "Working code with tests",
  })

  const store: DelegationStore = {
    version: "1.0.0",
    delegations: [delegation],
  }
  adapter.setDelegationStore(store)

  const retrieved = adapter.getDelegationStore()
  assert("setDelegationStore persists delegations", retrieved.delegations.length === 1)
  assert(
    "setDelegationStore persists fromAgent",
    retrieved.delegations[0].fromAgent === "idumb-supreme-coordinator"
  )
  assert(
    "setDelegationStore persists toAgent",
    retrieved.delegations[0].toAgent === "idumb-executor"
  )
  assert(
    "setDelegationStore persists context",
    retrieved.delegations[0].context === "Build the feature"
  )

  await adapter.close()
}

// ══════════════════════════════════════════════════════════════════════
// Group 6: Persistence Across Close + Reopen
// ══════════════════════════════════════════════════════════════════════

console.log("\n--- Group 6: Persistence Across Close + Reopen ---")

{
  // Use a fresh temp dir for this group to avoid interference from previous groups
  const persistDir = mkdtempSync(join(tmpdir(), "idumb-sqlite-persist-"))

  // Write data
  const adapter1 = new SqliteAdapter()
  await adapter1.init(persistDir)

  adapter1.setActiveTask("persist-s1", { id: "t-persist", name: "Persistent task" })
  adapter1.setCapturedAgent("persist-s1", "idumb-investigator")
  adapter1.setLastBlock("persist-s1", { tool: "grep", timestamp: 999999 })

  const anchor = createAnchor("decision", "high", "Persist this anchor")
  adapter1.addAnchor("persist-s1", anchor)

  const epic = createEpic("Persistent Epic")
  const task = createTask(epic.id, "Persistent Task")
  task.status = "active"
  epic.tasks.push(task)
  adapter1.setTaskStore({
    version: "2.0.0",
    activeEpicId: epic.id,
    epics: [epic],
  })

  const delegation = createDelegation({
    fromAgent: "idumb-supreme-coordinator",
    toAgent: "idumb-investigator",
    taskId: "task-persist",
    context: "Persistent delegation",
    expectedOutput: "Persistent result",
  })
  adapter1.setDelegationStore({
    version: "1.0.0",
    delegations: [delegation],
  })

  await adapter1.forceSave()
  await adapter1.close()

  // Reopen with new adapter instance
  const adapter2 = new SqliteAdapter()
  await adapter2.init(persistDir)

  // Verify session data persisted
  const session = adapter2.getSession("persist-s1")
  assert("persisted activeTask survives restart", session.activeTask?.id === "t-persist")
  assert("persisted activeTask name survives restart", session.activeTask?.name === "Persistent task")
  assert("persisted capturedAgent survives restart", session.capturedAgent === "idumb-investigator")
  assert("persisted lastBlock survives restart", session.lastBlock?.tool === "grep")
  assert("persisted lastBlock timestamp survives restart", session.lastBlock?.timestamp === 999999)

  // Verify anchors persisted
  const anchors = adapter2.getAnchors("persist-s1")
  assert("persisted anchors survive restart", anchors.length === 1)
  assert("persisted anchor content matches", anchors[0].content === "Persist this anchor")
  assert("persisted anchor type matches", anchors[0].type === "decision")

  // Verify task store persisted (loaded in init via loadStores)
  const taskStore = adapter2.getTaskStore()
  assert("persisted task store survives restart", taskStore.epics.length === 1)
  assert("persisted task store epic name matches", taskStore.epics[0].name === "Persistent Epic")
  assert("persisted activeEpicId survives restart", taskStore.activeEpicId === epic.id)

  // Verify delegation store persisted (loaded in init via loadStores)
  const delegStore = adapter2.getDelegationStore()
  assert("persisted delegation store survives restart", delegStore.delegations.length === 1)
  assert(
    "persisted delegation context matches",
    delegStore.delegations[0].context === "Persistent delegation"
  )

  await adapter2.close()

  // Cleanup
  rmSync(persistDir, { recursive: true, force: true })
}

// ══════════════════════════════════════════════════════════════════════
// Group 7: clear() Resets Everything
// ══════════════════════════════════════════════════════════════════════

console.log("\n--- Group 7: clear() Resets Everything ---")

{
  const clearDir = mkdtempSync(join(tmpdir(), "idumb-sqlite-clear-"))
  const adapter = new SqliteAdapter()
  await adapter.init(clearDir)

  // Populate data
  adapter.setActiveTask("clear-s1", { id: "t-clear", name: "Clearable" })
  adapter.setCapturedAgent("clear-s1", "idumb-executor")
  adapter.addAnchor("clear-s1", createAnchor("context", "medium", "Will be cleared"))

  const epic = createEpic("Clear Epic")
  adapter.setTaskStore({
    version: "2.0.0",
    activeEpicId: epic.id,
    epics: [epic],
  })
  adapter.setDelegationStore({
    version: "1.0.0",
    delegations: [
      createDelegation({
        fromAgent: "idumb-supreme-coordinator",
        toAgent: "idumb-executor",
        taskId: "t-clear",
        context: "Will be cleared",
        expectedOutput: "N/A",
      }),
    ],
  })

  // Verify data exists
  assert("pre-clear session has task", adapter.getActiveTask("clear-s1") !== null)
  assert("pre-clear anchors exist", adapter.getAnchors("clear-s1").length === 1)
  assert("pre-clear task store has epics", adapter.getTaskStore().epics.length === 1)
  assert("pre-clear delegation store has records", adapter.getDelegationStore().delegations.length === 1)

  // Clear
  adapter.clear()

  // Verify everything is gone
  assert("post-clear session is null", adapter.getActiveTask("clear-s1") === null)
  assert("post-clear anchors empty", adapter.getAnchors("clear-s1").length === 0)
  assert("post-clear task store empty", adapter.getTaskStore().epics.length === 0)
  assert("post-clear delegation store empty", adapter.getDelegationStore().delegations.length === 0)

  // isDegraded should be false (still connected)
  assert("isDegraded is false while connected", adapter.isDegraded() === false)

  await adapter.close()

  // isDegraded should be true after close
  assert("isDegraded is true after close", adapter.isDegraded() === true)

  // Cleanup
  rmSync(clearDir, { recursive: true, force: true })
}

// ══════════════════════════════════════════════════════════════════════
// Group 8: Multiple Sessions Isolation
// ══════════════════════════════════════════════════════════════════════

console.log("\n--- Group 8: Multiple Sessions Isolation ---")

{
  const isoDir = mkdtempSync(join(tmpdir(), "idumb-sqlite-iso-"))
  const adapter = new SqliteAdapter()
  await adapter.init(isoDir)

  // Set data for two different sessions
  adapter.setActiveTask("iso-s1", { id: "t-s1", name: "Session 1 task" })
  adapter.setActiveTask("iso-s2", { id: "t-s2", name: "Session 2 task" })
  adapter.setCapturedAgent("iso-s1", "idumb-executor")
  adapter.setCapturedAgent("iso-s2", "idumb-investigator")

  // Verify isolation
  const s1Task = adapter.getActiveTask("iso-s1")
  const s2Task = adapter.getActiveTask("iso-s2")
  assert("session 1 task is correct", s1Task?.id === "t-s1")
  assert("session 2 task is correct", s2Task?.id === "t-s2")
  assert("session 1 agent is correct", adapter.getCapturedAgent("iso-s1") === "idumb-executor")
  assert("session 2 agent is correct", adapter.getCapturedAgent("iso-s2") === "idumb-investigator")

  // Modifying session 1 does not affect session 2
  adapter.setActiveTask("iso-s1", null)
  assert("clearing s1 task does not affect s2", adapter.getActiveTask("iso-s2")?.id === "t-s2")

  await adapter.close()
  rmSync(isoDir, { recursive: true, force: true })
}

// ─── Cleanup & Summary ──────────────────────────────────────────────

// Clean up main test dir
rmSync(testDir, { recursive: true, force: true })

console.log(`\n=== SqliteAdapter Tests ===`)
console.log(`Results: ${passed}/${passed + failed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
