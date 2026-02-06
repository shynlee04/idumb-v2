/**
 * μ2 Test: Compaction Hook — Anchor Survival
 * 
 * P8: Test with mocks first, live second.
 * 
 * Proves:
 * - Anchors injected into compaction context
 * - Budget cap enforced
 * - Stale non-critical anchors excluded
 * - Active task included in context
 * - Empty state doesn't break
 */

import { createCompactionHook, addAnchor, getAnchors } from "../src/hooks/compaction.js"
import { createAnchor, isStale } from "../src/schemas/index.js"
import { setActiveTask } from "../src/hooks/index.js"
import { createLogger } from "../src/lib/index.js"
import { mkdirSync, existsSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

const testDir = join(tmpdir(), `idumb-test-compact-${Date.now()}`)
if (!existsSync(testDir)) mkdirSync(testDir, { recursive: true })

const log = createLogger(testDir, "test-compaction", "debug")
const hook = createCompactionHook(log)

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

async function test1_emptyAnchorsNoBreak(): Promise<void> {
  const output = { context: [] as string[], prompt: undefined }
  await hook({ sessionID: "compact-test-1" }, output)

  assert("empty anchors → context pushed (not empty)", output.context.length === 1)
  assert("context contains 'No active anchors'", output.context[0].includes("No active anchors"))
  assert("context contains 'NO ACTIVE TASK'", output.context[0].includes("NO ACTIVE TASK"))
}

async function test2_anchorInjected(): Promise<void> {
  const anchor = createAnchor("decision", "high", "Use PostgreSQL for vector storage")
  addAnchor("compact-test-2", anchor)

  const output = { context: [] as string[], prompt: undefined }
  await hook({ sessionID: "compact-test-2" }, output)

  assert("anchor injected → context pushed", output.context.length === 1)
  assert("context contains PostgreSQL", output.context[0].includes("PostgreSQL"))
  assert("context contains HIGH/decision", output.context[0].includes("HIGH/decision"))
}

async function test3_activeTaskInContext(): Promise<void> {
  setActiveTask("compact-test-3", { id: "t-1", name: "Build auth module" })
  const anchor = createAnchor("decision", "critical", "Auth strategy: SAML")
  addAnchor("compact-test-3", anchor)

  const output = { context: [] as string[], prompt: undefined }
  await hook({ sessionID: "compact-test-3" }, output)

  assert("context contains task name", output.context[0].includes("Build auth module"))
  assert("context contains SAML anchor", output.context[0].includes("SAML"))
  assert("task appears BEFORE anchors (primacy effect)",
    output.context[0].indexOf("Build auth module") < output.context[0].indexOf("SAML"))
}

async function test4_budgetEnforced(): Promise<void> {
  // Add many large anchors to exceed budget
  for (let i = 0; i < 20; i++) {
    const content = `Decision ${i}: ${"x".repeat(200)}` // ~210 chars each
    addAnchor("compact-test-4", createAnchor("context", "medium", content))
  }

  const output = { context: [] as string[], prompt: undefined }
  await hook({ sessionID: "compact-test-4" }, output)

  // 20 anchors × ~240 chars = ~4800 chars. Budget is 2000. Should get ~8 anchors.
  const contextStr = output.context[0]
  assert("context under budget (≤2500 chars)", contextStr.length <= 2500)
  assert("not all 20 anchors included", !contextStr.includes("Decision 19"))
}

async function test5_staleAnchorsExcluded(): Promise<void> {
  // Create a fresh critical anchor
  const fresh = createAnchor("decision", "critical", "Fresh critical decision")
  addAnchor("compact-test-5", fresh)

  // Create a "stale" anchor by manually setting old timestamp
  const stale = createAnchor("context", "medium", "Old stale context")
  stale.modifiedAt = Date.now() - (49 * 60 * 60 * 1000) // 49 hours ago
  addAnchor("compact-test-5", stale)

  assert("stale anchor detected as stale", isStale(stale))
  assert("fresh anchor not stale", !isStale(fresh))

  const output = { context: [] as string[], prompt: undefined }
  await hook({ sessionID: "compact-test-5" }, output)

  assert("fresh anchor included", output.context[0].includes("Fresh critical decision"))
  assert("stale medium anchor excluded", !output.context[0].includes("Old stale context"))
}

async function test6_staleCriticalStillIncluded(): Promise<void> {
  // Stale but critical anchor should still be included (with penalty)
  const staleCritical = createAnchor("decision", "critical", "Stale but critical: use SAML")
  staleCritical.modifiedAt = Date.now() - (50 * 60 * 60 * 1000) // 50 hours ago
  addAnchor("compact-test-6", staleCritical)

  const output = { context: [] as string[], prompt: undefined }
  await hook({ sessionID: "compact-test-6" }, output)

  assert("stale critical anchor still included", output.context[0].includes("Stale but critical"))
}

async function main(): Promise<void> {
  await test1_emptyAnchorsNoBreak()
  await test2_anchorInjected()
  await test3_activeTaskInContext()
  await test4_budgetEnforced()
  await test5_staleAnchorsExcluded()
  await test6_staleCriticalStillIncluded()

  const total = passed + failed
  const summary = `\nResults: ${passed}/${total} passed, ${failed} failed`
  log.info(summary)
  process.stdout.write(`${summary}\n`)
  process.exit(failed > 0 ? 1 : 0)
}

main()
