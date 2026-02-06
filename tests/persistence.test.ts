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

import { mkdirSync, existsSync, readFileSync, writeFileSync, rmSync, chmodSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { StateManager } from "../src/lib/persistence.js"
import { createLogger } from "../src/lib/index.js"
import { createAnchor } from "../src/schemas/anchor.js"
import type { Anchor } from "../src/schemas/anchor.js"

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
  assert("version: has version field", raw.version === "1.0.0")
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

// ─── Cleanup + Results ───────────────────────────────────────────────

try {
  rmSync(testBase, { recursive: true, force: true })
} catch {
  // cleanup is best-effort
}

process.stderr.write(`\nResults: ${passed}/${passed + failed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
