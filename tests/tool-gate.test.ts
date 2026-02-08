/**
 * μ1 Test: Tool Gate — Stop Hook
 * 
 * P8: Test with mocks first, live second.
 * 
 * Proves:
 * - Write without active task → BLOCKED (thrown error with redirect)
 * - Write with active task → ALLOWED
 * - Retry detection works
 * - Non-write tools → always allowed
 */

import { createToolGateBefore, createToolGateAfter, setActiveTask, AGENT_TOOL_RULES } from "../src/hooks/index.js"
import { createLogger } from "../src/lib/index.js"
import { stateManager } from "../src/lib/persistence.js"
import { shouldCreateCheckpoint, createCheckpoint } from "../src/schemas/index.js"
import { mkdirSync, existsSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

const testDir = join(tmpdir(), `idumb-test-${Date.now()}`)
if (!existsSync(testDir)) mkdirSync(testDir, { recursive: true })

const log = createLogger(testDir, "test-tool-gate", "debug")
const hookBefore = createToolGateBefore(log)
const hookAfter = createToolGateAfter(log)

let passed = 0
let failed = 0

function assert(name: string, condition: boolean): void {
  if (condition) {
    passed++
    log.info(`PASS: ${name}`)
  } else {
    failed++
    log.error(`FAIL: ${name}`)
  }
}

async function test1_writeBlockedWithoutTask(): Promise<void> {
  const input = { tool: "write", sessionID: "test-session-1", callID: "call-1" }
  const output = { args: {} }
  // Set capturedAgent to an iDumb agent so write-gate engages
  // (Use investigator, not executor — executor has grace mode when no WorkPlans exist)
  stateManager.setCapturedAgent("test-session-1", "idumb-investigator")

  let threw = false
  let errorMsg = ""
  try {
    await hookBefore(input, output)
  } catch (e) {
    threw = true
    errorMsg = (e as Error).message
  }

  assert("write without task → throws", threw)
  assert("error starts with GOVERNANCE BLOCK", errorMsg.startsWith("GOVERNANCE BLOCK:"))
  assert("error contains REDIRECT (USE INSTEAD)", errorMsg.includes("USE INSTEAD"))
  assert("error mentions govern_plan or govern_task", errorMsg.includes("govern_plan") || errorMsg.includes("govern_task"))
}

async function test2_writeAllowedWithTask(): Promise<void> {
  setActiveTask("test-session-2", { id: "t-1", name: "Build auth module" })
  const input = { tool: "write", sessionID: "test-session-2", callID: "call-2" }
  const output = { args: {} }

  let threw = false
  try {
    await hookBefore(input, output)
  } catch {
    threw = true
  }

  assert("write with task → does not throw", !threw)
}

async function test3_editBlockedWithoutTask(): Promise<void> {
  const input = { tool: "edit", sessionID: "test-session-3", callID: "call-3" }
  const output = { args: {} }
  // Set capturedAgent to an iDumb agent so write-gate engages
  // (Use investigator, not executor — executor has grace mode when no WorkPlans exist)
  stateManager.setCapturedAgent("test-session-3", "idumb-investigator")

  let threw = false
  try {
    await hookBefore(input, output)
  } catch {
    threw = true
  }

  assert("edit without task → throws", threw)
}

async function test4_nonWriteToolAlwaysAllowed(): Promise<void> {
  const tools = ["read", "glob", "bash", "grep", "todoread", "list"]
  for (const t of tools) {
    const input = { tool: t, sessionID: "test-session-4", callID: `call-${t}` }
    let threw = false
    try {
      await hookBefore(input, { args: {} })
    } catch {
      threw = true
    }
    assert(`${t} without task → allowed`, !threw)
  }
}

async function test5_retryDetection(): Promise<void> {
  const input = { tool: "write", sessionID: "test-session-5", callID: "call-5a" }
  // Set capturedAgent to an iDumb agent so write-gate engages
  // (Use investigator, not executor — executor has grace mode when no WorkPlans exist)
  stateManager.setCapturedAgent("test-session-5", "idumb-investigator")

  // First block
  let msg1 = ""
  try { await hookBefore(input, { args: {} }) } catch (e) { msg1 = (e as Error).message }

  // Second block (retry) — should include ALREADY BLOCKED
  let msg2 = ""
  try { await hookBefore({ ...input, callID: "call-5b" }, { args: {} }) } catch (e) { msg2 = (e as Error).message }

  assert("first block does NOT say ALREADY BLOCKED", !msg1.includes("ALREADY BLOCKED"))
  assert("retry block says ALREADY BLOCKED", msg2.includes("ALREADY BLOCKED"))
}

async function test6_afterHookFallback(): Promise<void> {
  const input = { tool: "write", sessionID: "test-session-6", callID: "call-6" }
  const output = { title: "write", output: "file written", metadata: {} }
  // Set capturedAgent to an iDumb agent so after-hook defense-in-depth engages
  // (Use investigator, not executor — executor has grace mode when no WorkPlans exist)
  stateManager.setCapturedAgent("test-session-6", "idumb-investigator")

  await hookAfter(input, output)

  assert("after-hook replaces title with GOVERNANCE BLOCK", output.title.includes("GOVERNANCE BLOCK"))
  assert("after-hook replaces output with redirect message", output.output.includes("USE INSTEAD"))
}

// ─── 3-Agent Model: AGENT_TOOL_RULES tests ──────────────────────

function test7_agentToolRulesHas3Agents(): void {
  const agentNames = Object.keys(AGENT_TOOL_RULES)
  assert("AGENT_TOOL_RULES has exactly 3 entries", agentNames.length === 3)
  assert("AGENT_TOOL_RULES has supreme-coordinator", "idumb-supreme-coordinator" in AGENT_TOOL_RULES)
  assert("AGENT_TOOL_RULES has investigator", "idumb-investigator" in AGENT_TOOL_RULES)
  assert("AGENT_TOOL_RULES has executor", "idumb-executor" in AGENT_TOOL_RULES)
}

function test8_supremeCoordinatorRules(): void {
  const rules = AGENT_TOOL_RULES["idumb-supreme-coordinator"]
  // Coordinator: orchestrator — no tool-level blocks (legacy tools removed)
  assert("supreme-coordinator has 0 blocked tools", rules.blockedTools.size === 0)
  assert("supreme-coordinator does NOT block idumb_init at tool level", !rules.blockedTools.has("idumb_init"))
  // Action-level blocks: idumb_init (install), govern_task (start/complete/fail/review)
  assert("supreme-coordinator blocks install on idumb_init", rules.blockedActions["idumb_init"]?.has("install") === true)
  assert("supreme-coordinator blocks start on govern_task", rules.blockedActions["govern_task"]?.has("start") === true)
  assert("supreme-coordinator blocks complete on govern_task", rules.blockedActions["govern_task"]?.has("complete") === true)
  assert("supreme-coordinator blocks fail on govern_task", rules.blockedActions["govern_task"]?.has("fail") === true)
  assert("supreme-coordinator blocks review on govern_task", rules.blockedActions["govern_task"]?.has("review") === true)
  assert("supreme-coordinator has 2 tools with action blocks", Object.keys(rules.blockedActions).length === 2)
}

function test9_investigatorRules(): void {
  const rules = AGENT_TOOL_RULES["idumb-investigator"]
  // Investigator: research agent — blocked from init and delegation
  assert("investigator blocks idumb_init", rules.blockedTools.has("idumb_init"))
  assert("investigator blocks govern_delegate", rules.blockedTools.has("govern_delegate"))
  assert("investigator has 2 blocked tools", rules.blockedTools.size === 2)
  // Action-level blocks: govern_plan (create/plan_tasks/archive/abandon)
  assert("investigator blocks create on govern_plan", rules.blockedActions["govern_plan"]?.has("create") === true)
  assert("investigator blocks plan_tasks on govern_plan", rules.blockedActions["govern_plan"]?.has("plan_tasks") === true)
  assert("investigator blocks archive on govern_plan", rules.blockedActions["govern_plan"]?.has("archive") === true)
  assert("investigator blocks abandon on govern_plan", rules.blockedActions["govern_plan"]?.has("abandon") === true)
  assert("investigator has 1 tool with action blocks", Object.keys(rules.blockedActions).length === 1)
}

function test10_executorRules(): void {
  const rules = AGENT_TOOL_RULES["idumb-executor"]
  // Executor: code writer — blocked from init and delegation
  assert("executor blocks idumb_init", rules.blockedTools.has("idumb_init"))
  assert("executor blocks govern_delegate", rules.blockedTools.has("govern_delegate"))
  assert("executor has 2 blocked tools", rules.blockedTools.size === 2)
  // Action-level blocks: govern_plan (create/plan_tasks/archive/abandon)
  assert("executor blocks create on govern_plan", rules.blockedActions["govern_plan"]?.has("create") === true)
  assert("executor blocks plan_tasks on govern_plan", rules.blockedActions["govern_plan"]?.has("plan_tasks") === true)
  assert("executor blocks archive on govern_plan", rules.blockedActions["govern_plan"]?.has("archive") === true)
  assert("executor blocks abandon on govern_plan", rules.blockedActions["govern_plan"]?.has("abandon") === true)
  assert("executor has 1 tool with action blocks", Object.keys(rules.blockedActions).length === 1)
}

function test11_oldAgentsRemoved(): void {
  const oldAgents = [
    "idumb-validator",
    "idumb-builder",
    "idumb-skills-creator",
    "idumb-research-synthesizer",
    "idumb-planner",
    "idumb-roadmapper",
  ]
  for (const agent of oldAgents) {
    assert(`old agent "${agent}" is NOT in AGENT_TOOL_RULES`, !(agent in AGENT_TOOL_RULES))
  }
}

// ─── DRIFT-04: idumb_init unblocked for coordinator ─────────────

function test12_coordinatorCanCallIdumbInitStatus(): void {
  // Coordinator should be able to call idumb_init with action=status
  const rules = AGENT_TOOL_RULES["idumb-supreme-coordinator"]
  const blocked = rules.blockedTools.has("idumb_init")
  assert("coordinator idumb_init NOT in blockedTools", !blocked)
  // The install action should still be blocked
  const installBlocked = rules.blockedActions["idumb_init"]?.has("install") === true
  assert("coordinator idumb_init install IS action-blocked", installBlocked)
  // The status action should NOT be blocked
  const statusBlocked = rules.blockedActions["idumb_init"]?.has("status") === true
  assert("coordinator idumb_init status is NOT action-blocked", !statusBlocked)
}

// ─── Checkpoint schema imports ──────────────────────────────────

function test13_checkpointFunctionsImportable(): void {
  assert("shouldCreateCheckpoint is a function", typeof shouldCreateCheckpoint === "function")
  assert("createCheckpoint is a function", typeof createCheckpoint === "function")
  // Verify shouldCreateCheckpoint returns true for write/edit
  assert("shouldCreateCheckpoint('write') returns true", shouldCreateCheckpoint("write") === true)
  assert("shouldCreateCheckpoint('edit') returns true", shouldCreateCheckpoint("edit") === true)
  assert("shouldCreateCheckpoint('read') returns false", shouldCreateCheckpoint("read") === false)
  assert("shouldCreateCheckpoint('grep') returns false", shouldCreateCheckpoint("grep") === false)
  // Bash without args returns false (can't determine command)
  assert("shouldCreateCheckpoint('bash') without args returns false", shouldCreateCheckpoint("bash") === false)
  // Bash with build command returns true
  assert("shouldCreateCheckpoint('bash', {command:'npm run build'}) returns true",
    shouldCreateCheckpoint("bash", { command: "npm run build" }) === true)
  // Bash with grep command returns false
  assert("shouldCreateCheckpoint('bash', {command:'grep foo'}) returns false",
    shouldCreateCheckpoint("bash", { command: "grep foo" }) === false)
}

function test14_createCheckpointProducesValidObject(): void {
  const cp = createCheckpoint("tn-123", "write", "created auth.ts", ["/src/auth.ts"])
  assert("checkpoint has id", typeof cp.id === "string" && cp.id.startsWith("cp-"))
  assert("checkpoint has taskNodeId", cp.taskNodeId === "tn-123")
  assert("checkpoint has tool", cp.tool === "write")
  assert("checkpoint has summary", cp.summary === "created auth.ts")
  assert("checkpoint has filesModified", cp.filesModified.length === 1 && cp.filesModified[0] === "/src/auth.ts")
  assert("checkpoint has timestamp", typeof cp.timestamp === "number" && cp.timestamp > 0)
}

// ─── Story 02-1: Temporal Gate Enforcement in Hook ──────────

async function test15_temporalGateBlocksInHook(): Promise<void> {
  // Setup: create a TaskGraph with a task that has an unmet dependency
  const { stateManager } = await import("../src/lib/persistence.js")
  const { createWorkPlan, createTaskNode } = await import("../src/schemas/work-plan.js")

  const wp = createWorkPlan({ name: "Test Plan" })
  wp.status = "active"
  const tn1 = createTaskNode({
    workPlanId: wp.id,
    name: "Task A (dependency)",
    expectedOutput: "output A",
    delegatedBy: "coordinator",
    assignedTo: "executor",
  })
  tn1.status = "planned" // NOT completed
  const tn2 = createTaskNode({
    workPlanId: wp.id,
    name: "Task B (blocked)",
    expectedOutput: "output B",
    delegatedBy: "coordinator",
    assignedTo: "executor",
    dependsOn: [tn1.id],
  })
  tn2.status = "planned"
  wp.tasks = [tn1, tn2]

  const graph = { version: "3.0.0", activeWorkPlanId: wp.id, workPlans: [wp] }
  stateManager.saveTaskGraph(graph)

  // Try to start tn2 via hook (should block because tn1 not completed)
  const input = {
    tool: "govern_task",
    sessionID: "test-session-temporal",
    callID: "call-temporal",
  }
  const output = { args: { action: "start", target_id: tn2.id } }

  let threw = false
  let errorMsg = ""
  try {
    await hookBefore(input, output)
  } catch (e) {
    threw = true
    errorMsg = (e as Error).message
  }

  assert("temporal gate: blocks start when dep not completed", threw)
  assert("temporal gate: error says GOVERNANCE BLOCK", errorMsg.includes("GOVERNANCE BLOCK"))
  assert("temporal gate: mentions the dependency", errorMsg.includes("Task A") || errorMsg.includes(tn1.id))
  assert("temporal gate: has USE INSTEAD", errorMsg.includes("USE INSTEAD"))
}

async function test16_temporalGateAllowsWhenDepsMet(): Promise<void> {
  const { stateManager } = await import("../src/lib/persistence.js")
  const { createWorkPlan, createTaskNode } = await import("../src/schemas/work-plan.js")

  const wp = createWorkPlan({ name: "Test Plan Allowed" })
  wp.status = "active"
  const tn1 = createTaskNode({
    workPlanId: wp.id,
    name: "Task A (completed)",
    expectedOutput: "output A",
    delegatedBy: "coordinator",
    assignedTo: "executor",
  })
  tn1.status = "completed" // dependency is met
  const tn2 = createTaskNode({
    workPlanId: wp.id,
    name: "Task B (ready)",
    expectedOutput: "output B",
    delegatedBy: "coordinator",
    assignedTo: "executor",
    dependsOn: [tn1.id],
  })
  tn2.status = "planned"
  wp.tasks = [tn1, tn2]

  const graph = { version: "3.0.0", activeWorkPlanId: wp.id, workPlans: [wp] }
  stateManager.saveTaskGraph(graph)

  const input = {
    tool: "govern_task",
    sessionID: "test-session-temporal-ok",
    callID: "call-temporal-ok",
  }
  const output = { args: { action: "start", target_id: tn2.id } }

  let threw = false
  try {
    await hookBefore(input, output)
  } catch {
    threw = true
  }

  assert("temporal gate: allows start when deps completed", !threw)
}

// ─── Story 02-2: Per-TaskNode allowedTools Enforcement ──────

async function test17_allowedToolsBlocksUnauthorized(): Promise<void> {
  const { stateManager } = await import("../src/lib/persistence.js")
  const { createWorkPlan, createTaskNode } = await import("../src/schemas/work-plan.js")

  const wp = createWorkPlan({ name: "Scoped Tools Plan" })
  wp.status = "active"
  const tn = createTaskNode({
    workPlanId: wp.id,
    name: "Research only task",
    expectedOutput: "research doc",
    delegatedBy: "coordinator",
    assignedTo: "investigator",
    allowedTools: ["read", "grep", "glob"], // NO write/edit
  })
  tn.status = "active"
  wp.tasks = [tn]

  const graph = { version: "3.0.0", activeWorkPlanId: wp.id, workPlans: [wp] }
  stateManager.saveTaskGraph(graph)
  stateManager.setActiveTask("test-session-allowed", { id: tn.id, name: tn.name })

  // Try to use "write" — should be blocked
  const input = { tool: "write", sessionID: "test-session-allowed", callID: "call-at-1" }
  const output = { args: {} }

  let threw = false
  let errorMsg = ""
  try {
    await hookBefore(input, output)
  } catch (e) {
    threw = true
    errorMsg = (e as Error).message
  }

  assert("allowedTools: blocks write when not in list", threw)
  assert("allowedTools: error says GOVERNANCE BLOCK", errorMsg.includes("GOVERNANCE BLOCK"))
  assert("allowedTools: mentions allowed tools list", errorMsg.includes("read") && errorMsg.includes("grep"))
  assert("allowedTools: has USE INSTEAD", errorMsg.includes("USE INSTEAD"))
}

async function test18_allowedToolsAllowsAuthorized(): Promise<void> {
  const { stateManager } = await import("../src/lib/persistence.js")
  const { createWorkPlan, createTaskNode } = await import("../src/schemas/work-plan.js")

  const wp = createWorkPlan({ name: "Scoped Tools Plan 2" })
  wp.status = "active"
  const tn = createTaskNode({
    workPlanId: wp.id,
    name: "Research task 2",
    expectedOutput: "research doc",
    delegatedBy: "coordinator",
    assignedTo: "investigator",
    allowedTools: ["read", "grep", "glob"],
  })
  tn.status = "active"
  wp.tasks = [tn]

  const graph = { version: "3.0.0", activeWorkPlanId: wp.id, workPlans: [wp] }
  stateManager.saveTaskGraph(graph)
  stateManager.setActiveTask("test-session-allowed2", { id: tn.id, name: tn.name })

  // Try to use "read" — should be allowed
  const input = { tool: "read", sessionID: "test-session-allowed2", callID: "call-at-2" }
  let threw = false
  try {
    await hookBefore(input, { args: {} })
  } catch {
    threw = true
  }

  assert("allowedTools: allows read when in list", !threw)
}

async function test19_emptyAllowedToolsNoRestriction(): Promise<void> {
  const { stateManager } = await import("../src/lib/persistence.js")
  const { createWorkPlan, createTaskNode } = await import("../src/schemas/work-plan.js")

  const wp = createWorkPlan({ name: "No Restriction Plan" })
  wp.status = "active"
  const tn = createTaskNode({
    workPlanId: wp.id,
    name: "Unrestricted task",
    expectedOutput: "anything",
    delegatedBy: "coordinator",
    assignedTo: "executor",
    allowedTools: [], // empty = no restriction
  })
  tn.status = "active"
  wp.tasks = [tn]

  const graph = { version: "3.0.0", activeWorkPlanId: wp.id, workPlans: [wp] }
  stateManager.saveTaskGraph(graph)
  stateManager.setActiveTask("test-session-norestrict", { id: tn.id, name: tn.name })

  // Try any tool — should be allowed
  const input = { tool: "write", sessionID: "test-session-norestrict", callID: "call-nr-1" }
  let threw = false
  try {
    await hookBefore(input, { args: {} })
  } catch {
    threw = true
  }

  assert("allowedTools: empty list allows any tool", !threw)
}

// ─── Story 02-3: Checkpoint for govern_shell ────────────────

function test20_shouldCreateCheckpointForGovernShell(): void {
  // govern_shell with build command = checkpoint-worthy
  assert("shouldCreateCheckpoint('govern_shell', {command:'npm run build'}) returns true",
    shouldCreateCheckpoint("govern_shell", { command: "npm run build" }) === true)
  // govern_shell with test command = checkpoint-worthy
  assert("shouldCreateCheckpoint('govern_shell', {command:'npm test'}) returns true",
    shouldCreateCheckpoint("govern_shell", { command: "npm test" }) === true)
  // govern_shell with git commit = checkpoint-worthy
  assert("shouldCreateCheckpoint('govern_shell', {command:'git commit -m fix'}) returns true",
    shouldCreateCheckpoint("govern_shell", { command: "git commit -m fix" }) === true)
  // govern_shell with grep = NOT checkpoint-worthy
  assert("shouldCreateCheckpoint('govern_shell', {command:'grep foo bar'}) returns false",
    shouldCreateCheckpoint("govern_shell", { command: "grep foo bar" }) === false)
  // govern_shell with ls = NOT checkpoint-worthy
  assert("shouldCreateCheckpoint('govern_shell', {command:'ls -la'}) returns false",
    shouldCreateCheckpoint("govern_shell", { command: "ls -la" }) === false)
  // govern_shell without args = NOT checkpoint-worthy (can't determine command)
  assert("shouldCreateCheckpoint('govern_shell') without args returns false",
    shouldCreateCheckpoint("govern_shell") === false)
}

// ══════════════════════════════════════════════════════════════════════
// Tests 21-23: Executor Grace Mode
// ══════════════════════════════════════════════════════════════════════

/**
 * Test 21: Executor write ALLOWED when no governance context (no active WorkPlans)
 */
async function test21_executorGraceMode_noContext(): Promise<void> {
  const { stateManager } = await import("../src/lib/persistence.js")

  const sessionID = "test-grace-no-context"
  // Set captured agent to executor
  stateManager.setCapturedAgent(sessionID, "idumb-executor")
  // Ensure no active task
  stateManager.setActiveTask(sessionID, null)
  // Ensure graph has no active WorkPlans (default state)
  const graph = stateManager.getTaskGraph()
  for (const wp of graph.workPlans) {
    if (wp.status === "active") wp.status = "completed" as "active" | "draft" | "completed"
  }
  stateManager.saveTaskGraph(graph)

  const input = { tool: "write", sessionID, callID: "call-grace-1" }
  const output = { args: {} }

  let threw = false
  try {
    await hookBefore(input, output)
  } catch {
    threw = true
  }

  assert("test21: executor write allowed with no governance context", !threw)
}

/**
 * Test 22: Executor write BLOCKED when governance context exists (active plan, no active task)
 */
async function test22_executorGraceMode_withContext(): Promise<void> {
  const { stateManager } = await import("../src/lib/persistence.js")
  const { createWorkPlan } = await import("../src/schemas/work-plan.js")

  const sessionID = "test-grace-with-context"
  stateManager.setCapturedAgent(sessionID, "idumb-executor")
  stateManager.setActiveTask(sessionID, null)

  // Create an active WorkPlan (governance context exists)
  const graph = stateManager.getTaskGraph()
  const wp = createWorkPlan({ name: "Active Plan" })
  wp.status = "active"
  graph.workPlans.push(wp)
  stateManager.saveTaskGraph(graph)

  const input = { tool: "write", sessionID, callID: "call-grace-2" }
  const output = { args: {} }

  let threw = false
  try {
    await hookBefore(input, output)
  } catch {
    threw = true
  }

  assert("test22: executor write blocked with active plan but no active task", threw)

  // Cleanup: remove the added plan
  graph.workPlans.pop()
  stateManager.saveTaskGraph(graph)
}

/**
 * Test 23: Non-executor (investigator) write BLOCKED regardless of graph state
 */
async function test23_nonExecutorNoGraceMode(): Promise<void> {
  const { stateManager } = await import("../src/lib/persistence.js")

  const sessionID = "test-grace-investigator"
  stateManager.setCapturedAgent(sessionID, "idumb-investigator")
  stateManager.setActiveTask(sessionID, null)

  const input = { tool: "write", sessionID, callID: "call-grace-3" }
  const output = { args: {} }

  let threw = false
  try {
    await hookBefore(input, output)
  } catch {
    threw = true
  }

  assert("test23: investigator write blocked (no grace mode)", threw)
}

// ══════════════════════════════════════════════════════════════════════
// Tests 24-27: Non-iDumb Agent Passthrough
// ══════════════════════════════════════════════════════════════════════

/**
 * Test 24: Write ALLOWED when capturedAgent is null (no agent captured, e.g. direct user)
 */
async function test24_passthroughNullAgent(): Promise<void> {
  const sessionID = "test-passthrough-null"
  // Don't set any capturedAgent — it defaults to null
  stateManager.setActiveTask(sessionID, null)

  const input = { tool: "write", sessionID, callID: "call-pt-1" }
  let threw = false
  try {
    await hookBefore(input, { args: {} })
  } catch {
    threw = true
  }

  assert("test24: write allowed with null capturedAgent (passthrough)", !threw)
}

/**
 * Test 25: Write ALLOWED when capturedAgent is "build" (OpenCode built-in agent)
 */
async function test25_passthroughBuiltinAgent(): Promise<void> {
  const sessionID = "test-passthrough-build"
  stateManager.setCapturedAgent(sessionID, "build")
  stateManager.setActiveTask(sessionID, null)

  const input = { tool: "write", sessionID, callID: "call-pt-2" }
  let threw = false
  try {
    await hookBefore(input, { args: {} })
  } catch {
    threw = true
  }

  assert("test25: write allowed with 'build' agent (passthrough)", !threw)
}

/**
 * Test 26: Edit ALLOWED when capturedAgent is a non-iDumb agent
 */
async function test26_passthroughEditNonIdumb(): Promise<void> {
  const sessionID = "test-passthrough-edit"
  stateManager.setCapturedAgent(sessionID, "custom-agent")
  stateManager.setActiveTask(sessionID, null)

  const input = { tool: "edit", sessionID, callID: "call-pt-3" }
  let threw = false
  try {
    await hookBefore(input, { args: {} })
  } catch {
    threw = true
  }

  assert("test26: edit allowed with non-iDumb agent (passthrough)", !threw)
}

/**
 * Test 27: After-hook also passes through for non-iDumb agents
 */
async function test27_afterHookPassthrough(): Promise<void> {
  const sessionID = "test-passthrough-after"
  stateManager.setCapturedAgent(sessionID, "build")
  stateManager.setActiveTask(sessionID, null)

  const input = { tool: "write", sessionID, callID: "call-pt-4" }
  const output = { title: "write", output: "file written", metadata: {} }

  await hookAfter(input, output)

  assert("test27: after-hook does NOT replace output for non-iDumb agent", !output.title.includes("GOVERNANCE BLOCK"))
  assert("test27: after-hook preserves original output for non-iDumb agent", output.output === "file written")
}

// Run all tests
async function main(): Promise<void> {
  await test1_writeBlockedWithoutTask()
  await test2_writeAllowedWithTask()
  await test3_editBlockedWithoutTask()
  await test4_nonWriteToolAlwaysAllowed()
  await test5_retryDetection()
  await test6_afterHookFallback()
  test7_agentToolRulesHas3Agents()
  test8_supremeCoordinatorRules()
  test9_investigatorRules()
  test10_executorRules()
  test11_oldAgentsRemoved()
  test12_coordinatorCanCallIdumbInitStatus()
  test13_checkpointFunctionsImportable()
  test14_createCheckpointProducesValidObject()
  await test15_temporalGateBlocksInHook()
  await test16_temporalGateAllowsWhenDepsMet()
  await test17_allowedToolsBlocksUnauthorized()
  await test18_allowedToolsAllowsAuthorized()
  await test19_emptyAllowedToolsNoRestriction()
  test20_shouldCreateCheckpointForGovernShell()
  await test21_executorGraceMode_noContext()
  await test22_executorGraceMode_withContext()
  await test23_nonExecutorNoGraceMode()
  await test24_passthroughNullAgent()
  await test25_passthroughBuiltinAgent()
  await test26_passthroughEditNonIdumb()
  await test27_afterHookPassthrough()

  const total = passed + failed
  const summary = `\nResults: ${passed}/${total} passed, ${failed} failed`
  log.info(summary)

  // Also print to verify (test runner only, not plugin code)
  process.stdout.write(`${summary}\n`)
  process.exit(failed > 0 ? 1 : 0)
}

main()
