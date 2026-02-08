/**
 * Test: idumb_anchor tool — Context anchor CRUD via tool interface.
 *
 * Proves:
 * - 'add' action creates anchor with correct type, priority, content
 * - 'add' with missing required fields returns error
 * - 'add' with content exceeding 2000 chars returns error
 * - 'list' action returns formatted list
 * - 'list' with no anchors returns empty message
 * - 'list' shows stale marker for old anchors
 * - Invalid action returns error
 * - Roundtrip: add then list returns the added anchor
 */

import { idumb_anchor } from "../src/tools/anchor.js"
import { addAnchor, getAnchors } from "../src/hooks/compaction.js"
import { createAnchor } from "../src/schemas/index.js"
import type { ToolContext } from "@opencode-ai/plugin/tool"

// ─── Test harness ────────────────────────────────────────────────────

let passed = 0
let failed = 0

function assert(name: string, condition: boolean): void {
  if (condition) {
    passed++
    process.stderr.write(`  PASS: ${name}\n`)
  } else {
    failed++
    process.stderr.write(`  FAIL: ${name}\n`)
  }
}

/** Create a mock ToolContext with a given sessionID */
function mockContext(sessionID: string): ToolContext {
  return {
    sessionID,
    messageID: `msg-${Date.now()}`,
    agent: "test-agent",
    directory: "/tmp/idumb-anchor-test",
    worktree: "/tmp/idumb-anchor-test",
    abort: new AbortController().signal,
    metadata: () => {},
    ask: async () => {},
  }
}

// ─── Test 1: Add anchor with all required fields ─────────────────────

async function test1_addAnchor(): Promise<void> {
  const ctx = mockContext("anchor-test-1")
  const result = await idumb_anchor.execute(
    { action: "add", type: "decision", priority: "high", content: "Use PostgreSQL for vector storage" },
    ctx,
  )

  assert("add: returns success message", result.includes("Anchor created"))
  assert("add: contains anchor ID", result.includes("ID:"))
  assert("add: contains type", result.includes("Type: decision"))
  assert("add: contains priority", result.includes("Priority: high"))
  assert("add: contains content", result.includes("Use PostgreSQL for vector storage"))
  assert("add: mentions compaction survival", result.includes("preserved across compaction"))
}

// ─── Test 2: Add anchor with missing content ─────────────────────────

async function test2_addMissingContent(): Promise<void> {
  const ctx = mockContext("anchor-test-2")
  const result = await idumb_anchor.execute(
    { action: "add", type: "decision", priority: "high" },
    ctx,
  )

  assert("add missing content: returns ERROR", result.startsWith("ERROR:"))
  assert("add missing content: mentions required fields", result.includes("content"))
}

// ─── Test 3: Add anchor with missing type ────────────────────────────

async function test3_addMissingType(): Promise<void> {
  const ctx = mockContext("anchor-test-3")
  const result = await idumb_anchor.execute(
    { action: "add", priority: "medium", content: "some context" },
    ctx,
  )

  assert("add missing type: returns ERROR", result.startsWith("ERROR:"))
  assert("add missing type: mentions required fields", result.includes("type"))
}

// ─── Test 4: Add anchor with missing priority ────────────────────────

async function test4_addMissingPriority(): Promise<void> {
  const ctx = mockContext("anchor-test-4")
  const result = await idumb_anchor.execute(
    { action: "add", type: "context", content: "some context" },
    ctx,
  )

  assert("add missing priority: returns ERROR", result.startsWith("ERROR:"))
  assert("add missing priority: mentions required fields", result.includes("priority"))
}

// ─── Test 5: Add anchor with content too long ────────────────────────

async function test5_addContentTooLong(): Promise<void> {
  const ctx = mockContext("anchor-test-5")
  const longContent = "x".repeat(2001)
  const result = await idumb_anchor.execute(
    { action: "add", type: "decision", priority: "high", content: longContent },
    ctx,
  )

  assert("add too long: returns ERROR", result.startsWith("ERROR:"))
  assert("add too long: mentions 2000 characters", result.includes("2000"))
}

// ─── Test 6: List with no anchors ────────────────────────────────────

async function test6_listEmpty(): Promise<void> {
  const ctx = mockContext("anchor-test-6-empty")
  const result = await idumb_anchor.execute(
    { action: "list" },
    ctx,
  )

  assert("list empty: returns no anchors message", result.includes("No anchors"))
  assert("list empty: suggests add action", result.includes("add"))
}

// ─── Test 7: List after adding anchors ───────────────────────────────

async function test7_listAfterAdd(): Promise<void> {
  const sessionID = "anchor-test-7-list"
  const ctx = mockContext(sessionID)

  // Add two anchors via the tool
  await idumb_anchor.execute(
    { action: "add", type: "decision", priority: "critical", content: "Auth strategy: SAML" },
    ctx,
  )
  await idumb_anchor.execute(
    { action: "add", type: "context", priority: "medium", content: "Using Node 22 runtime" },
    ctx,
  )

  const result = await idumb_anchor.execute({ action: "list" }, ctx)

  assert("list: shows anchor count", result.includes("Active anchors (2)"))
  assert("list: contains SAML anchor", result.includes("Auth strategy: SAML"))
  assert("list: contains Node 22 anchor", result.includes("Using Node 22 runtime"))
  assert("list: shows CRITICAL tag", result.includes("CRITICAL/decision"))
  assert("list: shows MEDIUM tag", result.includes("MEDIUM/context"))
}

// ─── Test 8: List shows stale marker for old anchors ─────────────────

async function test8_listShowsStale(): Promise<void> {
  const sessionID = "anchor-test-8-stale"
  const ctx = mockContext(sessionID)

  // Manually add a stale anchor (49 hours old) via the lower-level API
  const staleAnchor = createAnchor("context", "critical", "Old critical decision")
  staleAnchor.modifiedAt = Date.now() - (49 * 60 * 60 * 1000) // 49 hours ago
  addAnchor(sessionID, staleAnchor)

  // Add a fresh anchor via the tool
  await idumb_anchor.execute(
    { action: "add", type: "decision", priority: "high", content: "Fresh decision" },
    ctx,
  )

  const result = await idumb_anchor.execute({ action: "list" }, ctx)

  assert("list stale: shows STALE marker", result.includes("[STALE:"))
  assert("list stale: shows fresh anchor", result.includes("Fresh decision"))
  assert("list stale: shows old anchor", result.includes("Old critical decision"))
}

// ─── Test 9: Invalid action ──────────────────────────────────────────

async function test9_invalidAction(): Promise<void> {
  const ctx = mockContext("anchor-test-9")

  // The Zod enum validation may throw before execute runs,
  // or the switch default handles it. Test both paths.
  let result: string
  try {
    result = await idumb_anchor.execute(
      { action: "delete" as "add" | "list" },
      ctx,
    )
  } catch {
    // If Zod validation rejects, that's also correct
    result = "Unknown action"
  }

  assert("invalid action: returns unknown action message", result.includes("Unknown action") || result.includes("Invalid"))
}

// ─── Test 10: Add anchor with exact 2000-char content (boundary) ─────

async function test10_addContentAtBoundary(): Promise<void> {
  const ctx = mockContext("anchor-test-10")
  const exactContent = "y".repeat(2000)
  const result = await idumb_anchor.execute(
    { action: "add", type: "checkpoint", priority: "low", content: exactContent },
    ctx,
  )

  assert("add 2000 chars: accepted (not error)", !result.startsWith("ERROR:"))
  assert("add 2000 chars: returns success", result.includes("Anchor created"))
}

// ─── Test 11: Anchor types — all valid types accepted ────────────────

async function test11_allValidTypes(): Promise<void> {
  const types = ["decision", "context", "checkpoint", "error", "attention"] as const
  for (const type of types) {
    const ctx = mockContext(`anchor-test-11-${type}`)
    const result = await idumb_anchor.execute(
      { action: "add", type, priority: "medium", content: `${type} anchor test` },
      ctx,
    )
    assert(`add type ${type}: accepted`, result.includes("Anchor created"))
  }
}

// ─── Run all tests ───────────────────────────────────────────────────

async function main(): Promise<void> {
  process.stderr.write("\nanchor-tool.test.ts\n")
  process.stderr.write("─".repeat(50) + "\n")

  await test1_addAnchor()
  await test2_addMissingContent()
  await test3_addMissingType()
  await test4_addMissingPriority()
  await test5_addContentTooLong()
  await test6_listEmpty()
  await test7_listAfterAdd()
  await test8_listShowsStale()
  await test9_invalidAction()
  await test10_addContentAtBoundary()
  await test11_allValidTypes()

  process.stderr.write(`\nResults: ${passed}/${passed + failed} passed, ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

main()
