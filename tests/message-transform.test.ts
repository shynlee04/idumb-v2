/**
 * M2 Test: Message Transform — Context Pruning
 * 
 * Proves:
 * - Old tool outputs get truncated
 * - Recent tool outputs stay intact
 * - Exempt tools (govern_*) never pruned
 * - Empty/invalid messages don't break
 * - Non-tool parts untouched
 */

import { createMessageTransformHook } from "../src/hooks/index.js"
import { createLogger } from "../src/lib/index.js"
import { mkdirSync, existsSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

const testDir = join(tmpdir(), `idumb-test-transform-${Date.now()}`)
if (!existsSync(testDir)) mkdirSync(testDir, { recursive: true })

const log = createLogger(testDir, "test-transform", "debug")
const hook = createMessageTransformHook(log)

let passed = 0
let failed = 0

function assert(name: string, condition: boolean): void {
  if (condition) {
    passed++
  } else {
    failed++
    log.error(`FAIL: ${name}`)
  }
}

/** Helper: create a mock tool part with completed state */
function mockToolPart(tool: string, output: string, startTime: number): Record<string, unknown> {
  return {
    id: `part-${Math.random().toString(36).slice(2)}`,
    sessionID: "ses-test",
    messageID: "msg-test",
    type: "tool",
    callID: `call-${Math.random().toString(36).slice(2)}`,
    tool,
    state: {
      status: "completed",
      input: {},
      output,
      title: `${tool} result`,
      metadata: {},
      time: { start: startTime, end: startTime + 100 },
    },
  }
}

/** Helper: create a mock text part */
function mockTextPart(text: string): Record<string, unknown> {
  return {
    id: `part-text-${Math.random().toString(36).slice(2)}`,
    sessionID: "ses-test",
    messageID: "msg-test",
    type: "text",
    content: text,
  }
}

async function test1_noPruningWhenFewTools(): Promise<void> {
  const messages = [
    {
      info: { role: "assistant" },
      parts: [
        mockToolPart("read", "file contents here", 1000),
        mockToolPart("grep", "search results", 2000),
      ],
    },
  ]
  const output = { messages }
  await hook({}, output)

  const state0 = (output.messages[0].parts[0] as any).state
  const state1 = (output.messages[0].parts[1] as any).state

  assert("few tools: first output untouched", state0.output === "file contents here")
  assert("few tools: second output untouched", state1.output === "search results")
}

async function test2_oldToolsTruncated(): Promise<void> {
  const parts: Record<string, unknown>[] = []
  // Create 15 tool parts — older ones should get truncated
  for (let i = 0; i < 15; i++) {
    const bigOutput = `Tool output #${i}: ${"x".repeat(500)}`
    parts.push(mockToolPart("bash", bigOutput, i * 1000))
  }

  const messages = [{ info: { role: "assistant" }, parts }]
  const output = { messages }
  await hook({}, output)

  // First 5 (oldest) should be truncated (15 - 10 KEEP_RECENT = 5)
  const state0 = (output.messages[0].parts[0] as any).state
  assert("oldest tool truncated", state0.output.includes("[...bash output truncated"))
  assert("oldest tool output shorter", state0.output.length < 300)

  // Last one (newest, index 14) should be intact
  const state14 = (output.messages[0].parts[14] as any).state
  assert("newest tool intact", state14.output.startsWith("Tool output #14"))
  assert("newest tool full length", state14.output.length > 500)
}

async function test3_exemptToolsNotPruned(): Promise<void> {
  const parts: Record<string, unknown>[] = []
  // Fill with 12 regular tools
  for (let i = 0; i < 12; i++) {
    parts.push(mockToolPart("bash", "x".repeat(500), i * 1000))
  }
  // Add governance tools early (should NOT be pruned even though old)
  parts.splice(0, 0, mockToolPart("govern_task", "Task created: Build auth", 0))
  parts.splice(1, 0, mockToolPart("idumb_anchor", "Anchor added: Use PostgreSQL", 100))
  parts.splice(2, 0, mockToolPart("govern_plan", "Status: active plan", 200))

  const messages = [{ info: { role: "assistant" }, parts }]
  const output = { messages }
  await hook({}, output)

  const taskState = (output.messages[0].parts[0] as any).state
  const anchorState = (output.messages[0].parts[1] as any).state
  const statusState = (output.messages[0].parts[2] as any).state

  assert("govern_task not pruned", taskState.output === "Task created: Build auth")
  assert("idumb_anchor not pruned", anchorState.output === "Anchor added: Use PostgreSQL")
  assert("govern_plan not pruned", statusState.output === "Status: active plan")
}

async function test4_emptyMessagesNoBreak(): Promise<void> {
  const output = { messages: [] as any[] }
  let threw = false
  try {
    await hook({}, output)
  } catch {
    threw = true
  }
  assert("empty messages: no throw", !threw)
}

async function test5_invalidPartsNoBreak(): Promise<void> {
  const messages = [
    { info: { role: "user" }, parts: [{ type: "text", content: "hello" }] },
    { info: { role: "assistant" }, parts: null as any },
    { info: { role: "assistant" }, parts: [{ type: "tool", state: null }] },
    { info: { role: "assistant" }, parts: [{ type: "tool", state: { status: "pending" } }] },
  ]
  const output = { messages }
  let threw = false
  try {
    await hook({}, output)
  } catch {
    threw = true
  }
  assert("invalid parts: no throw", !threw)
}

async function test6_textPartsUntouched(): Promise<void> {
  const parts: Record<string, unknown>[] = []
  // 15 tool parts to trigger pruning
  for (let i = 0; i < 15; i++) {
    parts.push(mockToolPart("bash", "x".repeat(500), i * 1000))
  }
  // Add text parts
  parts.splice(0, 0, mockTextPart("Important analysis"))
  parts.push(mockTextPart("Summary of work"))

  const messages = [{ info: { role: "assistant" }, parts }]
  const output = { messages }
  await hook({}, output)

  const firstPart = output.messages[0].parts[0] as any
  const lastPart = output.messages[0].parts[output.messages[0].parts.length - 1] as any

  assert("text part at start untouched", firstPart.content === "Important analysis")
  assert("text part at end untouched", lastPart.content === "Summary of work")
}

async function main(): Promise<void> {
  await test1_noPruningWhenFewTools()
  await test2_oldToolsTruncated()
  await test3_exemptToolsNotPruned()
  await test4_emptyMessagesNoBreak()
  await test5_invalidPartsNoBreak()
  await test6_textPartsUntouched()

  const total = passed + failed
  const summary = `\nResults: ${passed}/${total} passed, ${failed} failed`
  log.info(summary)
  process.stdout.write(`${summary}\n`)
  process.exit(failed > 0 ? 1 : 0)
}

main()
