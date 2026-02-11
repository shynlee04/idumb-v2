# Testing Patterns

**Analysis Date:** 2026-02-09

## Test Framework

**Runner:**
- Hand-rolled assertion harness — no external test framework (no Jest, Vitest, Mocha)
- Each test file is a standalone TypeScript script executed via `tsx`
- Tests run as top-level scripts — assertions fire on import/execution
- Config: None (no test config file). Test behavior defined inline per file.

**Assertion Library:**
- Custom `assert()` function defined in every test file (no shared harness)
- All assertions are boolean condition checks with a descriptive name string

**Run Commands:**
```bash
npm test                              # Run all 16 suites sequentially (chained with &&)
npx tsx tests/compaction.test.ts      # Run single suite
npx tsx tests/tasks.test.ts           # Run single suite
npx tsx tests/persistence.test.ts     # Run single suite
npx tsx tests/sqlite-adapter.test.ts  # Run single suite (may skip if native binding unavailable)
npx tsx tests/smoke-code-quality.ts   # Smoke test (not assertion-based)
```

**CRITICAL:** `npm test` chains 16 `tsx` commands with `&&`. If an early suite fails, later suites do NOT run. When debugging, always run the failing suite individually first.

## Test File Organization

**Location:**
- All tests in top-level `tests/` directory (NOT co-located with source)
- Tests are excluded from TypeScript compilation via `tsconfig.json`: `"exclude": ["tests"]`
- Tests import directly from `src/` using `.js` extensions (same NodeNext resolution)

**Naming:**
- Test files: `{module-name}.test.ts` — e.g., `compaction.test.ts`, `tasks.test.ts`, `persistence.test.ts`
- Exception: `smoke-code-quality.ts` (no `.test.` suffix, not assertion-based)
- File names match the source module they test: `task.test.ts` tests `src/schemas/task.ts`

**Structure:**
```
tests/
├── anchor-tool.test.ts        # Tests src/tools/anchor.ts
├── compaction.test.ts          # Tests src/hooks/compaction.ts
├── delegation.test.ts          # Tests src/schemas/delegation.ts
├── init.test.ts                # Tests src/schemas/config.ts
├── init-tool.test.ts           # Tests src/tools/init.ts
├── message-transform.test.ts   # Tests src/hooks/message-transform.ts
├── persistence.test.ts         # Tests src/lib/persistence.ts (+ SQLite backend)
├── plan-state.test.ts          # Tests src/schemas/plan-state.ts
├── planning-registry.test.ts   # Tests src/schemas/planning-registry.ts
├── smoke-code-quality.ts       # Smoke test for code quality scanner
├── sqlite-adapter.test.ts      # Tests src/lib/sqlite-adapter.ts
├── system.test.ts              # Tests src/hooks/system.ts
├── task.test.ts                # Tests src/schemas/task.ts
├── task-graph.test.ts          # Tests src/schemas/task-graph.ts
├── tasks.test.ts               # Tests src/tools/tasks.ts (lifecycle verbs)
└── work-plan.test.ts           # Tests src/schemas/work-plan.ts
```

## Test Structure

**Assert Function Pattern (used in EVERY test file):**

There are two variants of the assert function used across the codebase.

Variant 1 — silent pass, log on fail (used in schema/persistence tests):
```typescript
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
```

Variant 2 — log both pass and fail (used in tool tests):
```typescript
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
```

Note: parameter order is `(name, condition)` in most files, but `(condition, name)` in `compaction.test.ts`. When adding tests, check the file you are editing.

**Suite Organization — Two Patterns:**

Pattern A: Named `async function` per test, called from `main()`:
```typescript
async function test1_emptyAnchorsNoBreak(): Promise<void> {
  // ... assertions
}

async function test2_anchorInjected(): Promise<void> {
  // ... assertions
}

async function main(): Promise<void> {
  await test1_emptyAnchorsNoBreak()
  await test2_anchorInjected()
  // ...

  const total = passed + failed
  process.stderr.write(`\nResults: ${passed}/${total} passed, ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

main()
```

Pattern B: Grouped in block scopes `{ }` (no async main needed):
```typescript
// ══════════════════════════════════════════════════════════════════════
// GROUP 1: Schema Validation (8 tests)
// ══════════════════════════════════════════════════════════════════════

{
  const store = createEmptyStore()
  assert("schema: empty store has version", store.version === TASK_STORE_VERSION)
  // ... more assertions
}

// ══════════════════════════════════════════════════════════════════════
// GROUP 2: CRUD Operations (8 tests)
// ══════════════════════════════════════════════════════════════════════

{
  const store = createEmptyStore()
  // ... more assertions
}

// Summary at bottom
process.stderr.write(`\nResults: ${passed}/${passed + failed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
```

**When to use which:**
- Pattern A: When tests need async operations (tool calls, StateManager init)
- Pattern B: When tests are synchronous (schema creation, validation, formatting)

**Test Naming Convention:**
- Named functions: `test{N}_{descriptiveName}` — e.g., `test1_emptyAnchorsNoBreak`, `test_start_basic`
- Assert names: `"category: specific behavior"` — e.g., `"schema: epic has id"`, `"roundtrip: task survives"`
- Section headers via `process.stderr.write`:
  ```typescript
  process.stderr.write("\n--- tasks_start: basic ---\n")
  ```

## Setup and Teardown

**Setup Pattern — Temp directory per test file:**
```typescript
import { mkdirSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

const testBase = join(tmpdir(), `idumb-test-${moduleName}-${Date.now()}`)
mkdirSync(testBase, { recursive: true })

const log = createLogger(testBase, "test-moduleName", "debug")
```

**Teardown Pattern — Best-effort cleanup at file end:**
```typescript
try {
  rmSync(testBase, { recursive: true, force: true })
} catch {
  // cleanup is best-effort
}
```

**Per-test isolation (in test files with multiple groups):**
```typescript
const dir = join(testBase, "test-group-name")
mkdirSync(join(dir, ".idumb/brain"), { recursive: true })
const sm = new StateManager()
await sm.init(dir, log)
```

**State Reset Pattern (lifecycle verb tests):**
```typescript
function reset() {
  stateManager.saveTaskGraph(createEmptyTaskGraph())
}

// Called before each test function
async function test_start_basic() {
  reset()
  // ... test logic
}
```

## Mocking

**Framework:** No mocking library. Manual mocks only.

**Mock ToolContext Pattern:**
```typescript
function mockContext(sessionID: string): ToolContext {
  return {
    sessionID,
    messageID: `msg-${Date.now()}`,
    agent: "test-agent",
    directory: "/tmp/idumb-test",
    worktree: "/tmp/idumb-test",
    abort: new AbortController().signal,
    metadata: () => {},
    ask: async () => {},
  }
}
```

For directory-specific tests:
```typescript
function mockContext(directory: string): ToolContext {
  return {
    sessionID: `test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    messageID: `msg-${Date.now()}`,
    agent: "test-agent",
    directory,
    worktree: directory,
    abort: new AbortController().signal,
    metadata: () => {},
    ask: async () => {},
  }
}
```

**Mock Logger Pattern (for smoke tests):**
```typescript
const log = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
}
```

**Type Casting for Partial Args:**
- Tool args cast with `as any` when only partial fields needed:
  ```typescript
  const out = await start.execute({ objective: "Fix auth bug" } as any, ctx(s) as any)
  ```

**What to Mock:**
- `ToolContext` — always mock (OpenCode runtime not available in tests)
- Logger — use real `createLogger()` with temp directory, or no-op logger for smoke tests
- File system — use real filesystem with `tmpdir()` temp directories

**What NOT to Mock:**
- `StateManager` — use real instance with temp directory
- Schema functions — test directly, no mocking
- Hook handlers — test the actual hook factory output

## Fixtures and Factories

**Test Data — created inline using schema factory functions:**
```typescript
import { createAnchor } from "../src/schemas/index.js"
import { createWorkPlan, createTaskNode, createEmptyTaskGraph } from "../src/schemas/work-plan.js"

// Anchors
const anchor = createAnchor("decision", "critical", "Use PostgreSQL for vector storage")

// Task graph setup
const g = createEmptyTaskGraph()
const wp = createWorkPlan({ name: "Test Plan" })
wp.status = "active"
g.activeWorkPlanId = wp.id
g.workPlans.push(wp)

const node = createTaskNode({
  workPlanId: wp.id,
  name: "Task A",
  expectedOutput: "output",
  delegatedBy: "coordinator",
  assignedTo: "executor",
})
node.status = "active"
node.startedAt = Date.now()
wp.tasks.push(node)
```

**Staleness simulation:**
```typescript
// Set old timestamp to simulate stale entity
const stale = createAnchor("context", "medium", "Old context")
stale.modifiedAt = Date.now() - (49 * 60 * 60 * 1000) // 49 hours ago
```

**Location:**
- No dedicated fixtures directory. Test data created inline per test function.
- Schema factory functions serve as the fixture system.

## Coverage

**Requirements:** None enforced. No coverage tool configured.

**Informal target:** Test every public schema function, every tool execute path, and every hook handler.

## Test Types

**Unit Tests:**
- Schema tests (`task.test.ts`, `work-plan.test.ts`, `task-graph.test.ts`, `delegation.test.ts`, `planning-registry.test.ts`, `plan-state.test.ts`): Test pure functions — create, find, validate, format, detect
- Hook tests (`compaction.test.ts`, `system.test.ts`, `message-transform.test.ts`): Test hook factory output with mock input/output objects
- Tool tests (`anchor-tool.test.ts`, `init-tool.test.ts`, `tasks.test.ts`): Test tool execute methods with mock ToolContext

**Integration Tests:**
- `persistence.test.ts`: Tests StateManager with real filesystem (temp dirs), including save/load round-trips, debounced writes, legacy migration, corrupt file recovery, and SQLite backend
- `sqlite-adapter.test.ts`: Tests SqliteAdapter with real SQLite database, session isolation, persistence across close/reopen

**E2E Tests:**
- Not present. Hooks are unit-tested but marked "UNVERIFIED in live OpenCode" in documentation.

**Smoke Tests:**
- `smoke-code-quality.ts`: Runs code quality scanner against the project itself. Uses `console.log` (exception to the rule since this is a diagnostic tool, not plugin code). No assertions — output is visual.

## Common Patterns

**Async Testing:**
```typescript
async function test_name(): Promise<void> {
  const result = await someAsyncOperation()
  assert("description", result === expected)
}
```

**Error Path Testing:**
```typescript
// Test that errors return ERROR prefix, not throw
const out = await done.execute({ evidence: "done" } as any, ctx() as any) as string
assert("error when no task", out.includes("ERROR"))
```

**Boundary Testing:**
```typescript
// Test exact boundary (2000 chars accepted, 2001 rejected)
const exactContent = "y".repeat(2000)
const result = await idumb_anchor.execute(
  { action: "add", type: "checkpoint", priority: "low", content: exactContent },
  ctx,
)
assert("add 2000 chars: accepted (not error)", !result.startsWith("ERROR:"))
```

**Round-Trip Persistence Testing:**
```typescript
// Write with StateManager 1
const sm1 = new StateManager()
await sm1.init(dir, log)
sm1.setActiveTask("s1", { id: "t1", name: "task" })
await sm1.forceSave()

// Read with StateManager 2
const sm2 = new StateManager()
await sm2.init(dir, log)
assert("task survives roundtrip", sm2.getActiveTask("s1")?.name === "task")
```

**Debounce Testing:**
```typescript
function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Rapid-fire mutations
sm.setActiveTask("s1", { id: "t1", name: "task 1" })
sm.setActiveTask("s1", { id: "t2", name: "task 2" })
sm.setActiveTask("s1", { id: "t3", name: "task 3" })

// Wait for debounce to flush (500ms + buffer)
await wait(700)

// Verify final state was saved
assert("debounce: final task saved", raw.sessions["s1"]?.activeTask?.name === "task 3")
```

**Conditional Skip (for native bindings):**
```typescript
// Probe for native binding availability before running tests
const probeDir = mkdtempSync(join(tmpdir(), "idumb-sqlite-probe-"))
try {
  const probe = new SqliteAdapter()
  await probe.init(probeDir)
  await probe.close()
} catch (err) {
  process.stderr.write(`\nSQLite backend unavailable — skipping tests.\n`)
  rmSync(probeDir, { recursive: true, force: true })
  process.exit(0) // Skip — not a failure
}
```

**Dependency Chain Testing:**
```typescript
// Set up A → B dependency, verify completion of A unblocks B
const a = createTaskNode({ workPlanId: wp.id, name: "A", ... })
a.status = "active"; a.startedAt = Date.now()
const b = createTaskNode({ workPlanId: wp.id, name: "B", ..., dependsOn: [a.id] })
b.status = "blocked"

await done.execute({ evidence: "done" } as any, ctx(s) as any)
assert("B unblocked to planned", graph.workPlans[0].tasks[1].status === "planned")
```

## Test Output

**Summary format (written to stderr):**
```
Results: 45/45 passed, 0 failed
```

**Exit codes:**
- `process.exit(0)` — all passed (or graceful skip)
- `process.exit(1)` — any failure

**Output channels:**
- Most test files write to `process.stderr` (test results, PASS/FAIL markers)
- `smoke-code-quality.ts` and `sqlite-adapter.test.ts` use `console.log` (exceptions)
- Test logging goes to temp directory via real `createLogger()`

## Test Execution Order in npm test

The test chain in `package.json` runs suites in this order:
1. `compaction.test.ts`
2. `message-transform.test.ts`
3. `system.test.ts`
4. `init.test.ts`
5. `persistence.test.ts`
6. `task.test.ts`
7. `delegation.test.ts`
8. `planning-registry.test.ts`
9. `work-plan.test.ts`
10. `task-graph.test.ts`
11. `plan-state.test.ts`
12. `anchor-tool.test.ts`
13. `init-tool.test.ts`
14. `tasks.test.ts`
15. `smoke-code-quality.ts`
16. `sqlite-adapter.test.ts`

Schema tests run before tool tests. Hook tests run first. SQLite runs last (may skip).

## Adding New Tests

When adding a new test file:

1. Create `tests/{module-name}.test.ts`
2. Copy the assert harness from an existing test (use Variant 2 with PASS/FAIL logging for tool tests)
3. Create temp directory with `mkdirSync(join(tmpdir(), \`idumb-test-${name}-${Date.now()}\`), { recursive: true })`
4. Add cleanup at bottom with `rmSync(testBase, { recursive: true, force: true })`
5. End with results summary and `process.exit(failed > 0 ? 1 : 0)`
6. Add `tsx tests/{module-name}.test.ts` to the `npm test` chain in `package.json` (append with `&&`)
7. Use `.js` extensions in all imports from `src/`

---

*Testing analysis: 2026-02-09*
