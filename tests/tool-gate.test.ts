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
  assert("error mentions idumb_task", errorMsg.includes("idumb_task"))
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
  assert("supreme-coordinator blocks idumb_init", rules.blockedTools.has("idumb_init"))
  assert("supreme-coordinator blocks idumb_write", rules.blockedTools.has("idumb_write"))
  assert("supreme-coordinator blocks idumb_bash", rules.blockedTools.has("idumb_bash"))
  assert("supreme-coordinator blocks idumb_webfetch", rules.blockedTools.has("idumb_webfetch"))
  assert("supreme-coordinator has 4 blocked tools", rules.blockedTools.size === 4)
  assert("supreme-coordinator blocks create_epic action", rules.blockedActions.has("create_epic"))
  assert("supreme-coordinator has 1 blocked action", rules.blockedActions.size === 1)
}

function test9_investigatorRules(): void {
  const rules = AGENT_TOOL_RULES["idumb-investigator"]
  assert("investigator blocks idumb_init", rules.blockedTools.has("idumb_init"))
  assert("investigator blocks idumb_write", rules.blockedTools.has("idumb_write"))
  assert("investigator blocks idumb_bash", rules.blockedTools.has("idumb_bash"))
  assert("investigator does NOT block idumb_webfetch", !rules.blockedTools.has("idumb_webfetch"))
  assert("investigator has 3 blocked tools", rules.blockedTools.size === 3)
  assert("investigator blocks delegate action", rules.blockedActions.has("delegate"))
  assert("investigator blocks create_epic action", rules.blockedActions.has("create_epic"))
  assert("investigator has 2 blocked actions", rules.blockedActions.size === 2)
}

function test10_executorRules(): void {
  const rules = AGENT_TOOL_RULES["idumb-executor"]
  assert("executor blocks idumb_init", rules.blockedTools.has("idumb_init"))
  assert("executor blocks idumb_webfetch", rules.blockedTools.has("idumb_webfetch"))
  assert("executor does NOT block idumb_write", !rules.blockedTools.has("idumb_write"))
  assert("executor does NOT block idumb_bash", !rules.blockedTools.has("idumb_bash"))
  assert("executor has 2 blocked tools", rules.blockedTools.size === 2)
  assert("executor blocks delegate action", rules.blockedActions.has("delegate"))
  assert("executor blocks create_epic action", rules.blockedActions.has("create_epic"))
  assert("executor has 2 blocked actions", rules.blockedActions.size === 2)
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

  const total = passed + failed
  const summary = `\nResults: ${passed}/${total} passed, ${failed} failed`
  log.info(summary)

  // Also print to verify (test runner only, not plugin code)
  process.stdout.write(`${summary}\n`)
  process.exit(failed > 0 ? 1 : 0)
}

main()
