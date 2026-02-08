# Slice 1: Enforcement Fix + SQLite Foundation + Dashboard Revival

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the broken 3-agent enforcement, replace JSON persistence with SQLite, and revive the dashboard frontend so the user can visually see governance behavior.

**Architecture:** Progressive vertical slice — enforcement layer (tool-gate) feeds data into SQLite (persistence), which the backend API queries, which the frontend renders. Every change is immediately visible.

**Tech Stack:** better-sqlite3@^11.10.0, Tailwind CSS v4, shadcn/ui, React 18, Vite 5, npm workspaces

**Baseline:** 294/294 tests pass, `tsc --noEmit` clean, package.json v2.2.0

---

## Task 1: Fix AGENT_TOOL_RULES for 3-Agent Model

**Files:**
- Modify: `src/hooks/tool-gate.ts:40-73`
- Modify: `tests/tool-gate.test.ts`

**Step 1: Write failing tests for new agent enforcement**

Add tests to `tests/tool-gate.test.ts` that verify:

```typescript
// idumb-investigator should be blocked from idumb_write, idumb_init, idumb_bash
assert(
  AGENT_TOOL_RULES["idumb-investigator"].blockedTools.has("idumb_write"),
  "investigator blocked from idumb_write"
)
assert(
  AGENT_TOOL_RULES["idumb-investigator"].blockedTools.has("idumb_bash"),
  "investigator blocked from idumb_bash"
)
assert(
  AGENT_TOOL_RULES["idumb-investigator"].blockedActions.has("create_epic"),
  "investigator blocked from create_epic"
)
assert(
  AGENT_TOOL_RULES["idumb-investigator"].blockedActions.has("delegate"),
  "investigator cannot delegate"
)

// idumb-executor should be blocked from idumb_init, idumb_webfetch
assert(
  AGENT_TOOL_RULES["idumb-executor"].blockedTools.has("idumb_init"),
  "executor blocked from idumb_init"
)
assert(
  AGENT_TOOL_RULES["idumb-executor"].blockedActions.has("create_epic"),
  "executor blocked from create_epic"
)
assert(
  AGENT_TOOL_RULES["idumb-executor"].blockedActions.has("delegate"),
  "executor cannot delegate — leaf node"
)

// Old agent names should NOT exist in AGENT_TOOL_RULES
for (const old of ["idumb-validator", "idumb-builder", "idumb-skills-creator", "idumb-research-synthesizer", "idumb-planner", "idumb-roadmapper"]) {
  assert(!(old in AGENT_TOOL_RULES), `old agent ${old} removed from rules`)
}
```

**Step 2: Run test to verify it fails**

Run: `npx tsx tests/tool-gate.test.ts`
Expected: FAIL — `idumb-investigator` and `idumb-executor` don't exist in AGENT_TOOL_RULES, old agents still present.

**Step 3: Update AGENT_TOOL_RULES**

Replace lines 40-73 in `src/hooks/tool-gate.ts`:

```typescript
const AGENT_TOOL_RULES: Record<string, AgentToolRule> = {
  // Supreme Coordinator: governance-only orchestrator
  // CAN: idumb_task (status, delegate), idumb_scan, idumb_codemap (high-level)
  // CANNOT: idumb_init (only on first run), idumb_write, idumb_bash, idumb_webfetch
  "idumb-supreme-coordinator": {
    blockedTools: new Set(["idumb_init", "idumb_write", "idumb_bash", "idumb_webfetch"]),
    blockedActions: new Set(["create_epic"]),
  },

  // Investigator: research, analysis, brain entries
  // CAN: idumb_read, idumb_scan, idumb_codemap, idumb_anchor, idumb_webfetch
  // CANNOT: idumb_write (except brain), idumb_init, idumb_bash
  // CANNOT: delegate or create epics — leaf node for research
  "idumb-investigator": {
    blockedTools: new Set(["idumb_init", "idumb_write", "idumb_bash"]),
    blockedActions: new Set(["delegate", "create_epic"]),
  },

  // Executor: precision writes, implementation
  // CAN: idumb_write, idumb_task (complete/evidence)
  // CANNOT: idumb_init, idumb_webfetch (delegate research to investigator)
  // CANNOT: delegate or create epics — leaf node for execution
  "idumb-executor": {
    blockedTools: new Set(["idumb_init", "idumb_webfetch"]),
    blockedActions: new Set(["delegate", "create_epic"]),
  },
}
```

Also update `buildAgentScopeBlock` message on line 85 — change `"meta-builder or a higher-level agent"` to `"the supreme-coordinator or the appropriate agent"`.

**Step 4: Export AGENT_TOOL_RULES for testing**

Add export: `export { AGENT_TOOL_RULES }` (or export the const directly) so tests can import it.

**Step 5: Run test to verify it passes**

Run: `npx tsx tests/tool-gate.test.ts`
Expected: ALL PASS including new assertions.

**Step 6: Run full suite**

Run: `npm test`
Expected: 294+ tests pass (new assertions added).

**Step 7: Commit**

```bash
git add src/hooks/tool-gate.ts tests/tool-gate.test.ts
git commit -m "fix: update AGENT_TOOL_RULES for 3-agent model (investigator, executor)"
```

---

## Task 2: Fix VERSION Drift + Remove Dead Code

**Files:**
- Modify: `src/index.ts:17`
- Delete: `src/tools/status.ts` (if exists — 83 LOC dead code, not registered in either plugin entry)
- Modify: `src/tools/index.ts` (remove status re-export if present)

**Step 1: Fix VERSION constant**

In `src/index.ts:17`, change:
```typescript
const VERSION = "2.1.0"
```
to:
```typescript
const VERSION = "2.2.0"
```

**Step 2: Verify status.ts is dead code**

Check: `src/tools/status.ts` is NOT imported by `src/index.ts` or `src/tools-plugin.ts`.
If confirmed dead, delete the file and remove any barrel export from `src/tools/index.ts`.

**Step 3: Run full suite**

Run: `npm run typecheck && npm test`
Expected: 0 TS errors, 294+ tests pass.

**Step 4: Commit**

```bash
git add src/index.ts
# If status.ts was deleted:
git add -u src/tools/status.ts src/tools/index.ts
git commit -m "fix: sync VERSION to 2.2.0, remove dead status tool"
```

---

## Task 3: Install better-sqlite3 + Create StorageAdapter Interface

**Files:**
- Create: `src/lib/storage-adapter.ts`
- Create: `src/lib/sqlite-adapter.ts`
- Modify: `src/lib/index.ts` (add re-exports)
- Create: `tests/sqlite-adapter.test.ts`

**Step 1: Install better-sqlite3**

```bash
cd /Users/apple/Documents/coding-projects/idumb/v2
npm install better-sqlite3@^11.10.0
npm install -D @types/better-sqlite3@^7
```

**Step 2: Write the StorageAdapter interface**

Create `src/lib/storage-adapter.ts`:

```typescript
/**
 * StorageAdapter — abstraction over persistence backends.
 *
 * Implementations: JsonAdapter (current), SqliteAdapter (new).
 * This interface allows gradual migration from JSON to SQLite
 * without changing any consumer code.
 */

import type { TaskStore, TaskEpic, Task } from "../schemas/task.js"
import type { DelegationStore, DelegationRecord } from "../schemas/delegation.js"
import type { Anchor } from "../schemas/anchor.js"

export interface SessionState {
  activeTask: { id: string; name: string } | null
  lastBlock: { tool: string; timestamp: number } | null
  capturedAgent: string | null
}

export interface StorageAdapter {
  // Lifecycle
  init(directory: string): Promise<void>
  close(): Promise<void>

  // Sessions
  getSession(sessionID: string): SessionState
  setActiveTask(sessionID: string, task: { id: string; name: string } | null): void
  getActiveTask(sessionID: string): { id: string; name: string } | null
  setCapturedAgent(sessionID: string, agent: string): void
  getCapturedAgent(sessionID: string): string | null
  setLastBlock(sessionID: string, block: { tool: string; timestamp: number } | null): void
  getLastBlock(sessionID: string): { tool: string; timestamp: number } | null

  // Anchors
  addAnchor(sessionID: string, anchor: Anchor): void
  getAnchors(sessionID: string): Anchor[]

  // Tasks
  getTaskStore(): TaskStore
  setTaskStore(store: TaskStore): void
  getActiveEpic(): TaskEpic | null
  getSmartActiveTask(): Task | null

  // Delegations
  getDelegationStore(): DelegationStore
  setDelegationStore(store: DelegationStore): void

  // Persistence
  forceSave(): Promise<void>
  isDegraded(): boolean
  clear(): void
}
```

**Step 3: Write failing test for SqliteAdapter**

Create `tests/sqlite-adapter.test.ts`:

```typescript
import { SqliteAdapter } from "../src/lib/sqlite-adapter.js"
import { mkdtempSync, rmSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"

let passed = 0, failed = 0
function assert(condition: boolean, name: string) {
  if (condition) { passed++; console.log(`  PASS: ${name}`) }
  else { failed++; console.error(`  FAIL: ${name}`) }
}

console.log("\nSQLite Adapter — Basic Operations\n")

// Setup temp dir for each test group
const tempDir = mkdtempSync(join(tmpdir(), "idumb-sqlite-"))

const adapter = new SqliteAdapter()
await adapter.init(tempDir)

// Session operations
adapter.setActiveTask("sess-1", { id: "t-1", name: "Test task" })
const task = adapter.getActiveTask("sess-1")
assert(task !== null, "getActiveTask returns set task")
assert(task?.id === "t-1", "task ID matches")
assert(task?.name === "Test task", "task name matches")

adapter.setCapturedAgent("sess-1", "idumb-investigator")
assert(adapter.getCapturedAgent("sess-1") === "idumb-investigator", "captured agent stored")

adapter.setLastBlock("sess-1", { tool: "write", timestamp: Date.now() })
const block = adapter.getLastBlock("sess-1")
assert(block !== null, "last block stored")
assert(block?.tool === "write", "block tool matches")

// Null session returns defaults
assert(adapter.getActiveTask("unknown") === null, "unknown session returns null task")
assert(adapter.getCapturedAgent("unknown") === null, "unknown session returns null agent")

// Anchor operations
adapter.addAnchor("sess-1", {
  id: "a-1",
  type: "decision",
  content: "Test anchor",
  priority: "normal",
  createdAt: Date.now(),
})
const anchors = adapter.getAnchors("sess-1")
assert(anchors.length === 1, "anchor stored")
assert(anchors[0].id === "a-1", "anchor ID matches")

// Task store
const store = adapter.getTaskStore()
assert(store.epics.length === 0, "empty task store")
assert(store.activeEpicId === null, "no active epic")

// Persistence survives close + reopen
await adapter.close()
const adapter2 = new SqliteAdapter()
await adapter2.init(tempDir)
const task2 = adapter2.getActiveTask("sess-1")
assert(task2?.id === "t-1", "task survives close+reopen")
const anchors2 = adapter2.getAnchors("sess-1")
assert(anchors2.length === 1, "anchors survive close+reopen")
await adapter2.close()

// Cleanup
rmSync(tempDir, { recursive: true, force: true })

console.log(`\nResults: ${passed}/${passed + failed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
```

**Step 4: Run test to verify it fails**

Run: `npx tsx tests/sqlite-adapter.test.ts`
Expected: FAIL — `SqliteAdapter` doesn't exist yet.

**Step 5: Implement SqliteAdapter**

Create `src/lib/sqlite-adapter.ts`:

```typescript
/**
 * SqliteAdapter — SQLite-backed StorageAdapter using better-sqlite3.
 *
 * Replaces 3 JSON files with 1 SQLite database (.idumb/brain/governance.db).
 * Synchronous reads (critical for tool-gate hot path), async init/close.
 * WAL mode for concurrent dashboard reads + hook writes.
 */

import Database from "better-sqlite3"
import { join } from "node:path"
import { mkdirSync } from "node:fs"
import type { StorageAdapter, SessionState } from "./storage-adapter.js"
import type { Anchor } from "../schemas/anchor.js"
import type { TaskStore, TaskEpic, Task } from "../schemas/task.js"
import type { DelegationStore } from "../schemas/delegation.js"
import { createEmptyStore, getActiveChain, migrateTaskStore } from "../schemas/task.js"
import { createEmptyDelegationStore, expireStaleDelegations } from "../schemas/delegation.js"

const DB_FILE = ".idumb/brain/governance.db"
const SCHEMA_VERSION = 1

export class SqliteAdapter implements StorageAdapter {
  private db: Database.Database | null = null
  private taskStoreCache: TaskStore = createEmptyStore()
  private delegationStoreCache: DelegationStore = createEmptyDelegationStore()

  async init(directory: string): Promise<void> {
    const dbDir = join(directory, ".idumb", "brain")
    mkdirSync(dbDir, { recursive: true })

    const dbPath = join(directory, DB_FILE)
    this.db = new Database(dbPath)

    // WAL mode for concurrent reads (dashboard) + writes (hooks)
    this.db.pragma("journal_mode = WAL")
    this.db.pragma("foreign_keys = ON")

    this.createTables()
    this.loadStores()
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }

  private createTables(): void {
    const db = this.requireDb()

    db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        active_task_id TEXT,
        active_task_name TEXT,
        last_block_tool TEXT,
        last_block_timestamp INTEGER,
        captured_agent TEXT,
        updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      );

      CREATE TABLE IF NOT EXISTS anchors (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'normal',
        created_at INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(session_id)
      );

      CREATE TABLE IF NOT EXISTS task_store (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        data TEXT NOT NULL DEFAULT '{}'
      );

      CREATE TABLE IF NOT EXISTS delegation_store (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        data TEXT NOT NULL DEFAULT '{}'
      );

      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY
      );
    `)

    // Insert schema version if not exists
    const existing = db.prepare("SELECT version FROM schema_version LIMIT 1").get() as { version: number } | undefined
    if (!existing) {
      db.prepare("INSERT INTO schema_version (version) VALUES (?)").run(SCHEMA_VERSION)
    }
  }

  private loadStores(): void {
    const db = this.requireDb()

    // Load task store
    const taskRow = db.prepare("SELECT data FROM task_store WHERE id = 1").get() as { data: string } | undefined
    if (taskRow) {
      try {
        const parsed = JSON.parse(taskRow.data) as TaskStore
        this.taskStoreCache = migrateTaskStore(parsed)
      } catch { /* start fresh */ }
    }

    // Load delegation store
    const delegRow = db.prepare("SELECT data FROM delegation_store WHERE id = 1").get() as { data: string } | undefined
    if (delegRow) {
      try {
        const parsed = JSON.parse(delegRow.data) as DelegationStore
        this.delegationStoreCache = parsed
        expireStaleDelegations(this.delegationStoreCache)
      } catch { /* start fresh */ }
    }
  }

  private requireDb(): Database.Database {
    if (!this.db) throw new Error("SqliteAdapter not initialized — call init() first")
    return this.db
  }

  // ─── Sessions ─────────────────────────────────────────

  getSession(sessionID: string): SessionState {
    const db = this.requireDb()
    const row = db.prepare("SELECT * FROM sessions WHERE session_id = ?").get(sessionID) as {
      active_task_id: string | null
      active_task_name: string | null
      last_block_tool: string | null
      last_block_timestamp: number | null
      captured_agent: string | null
    } | undefined

    if (!row) {
      return { activeTask: null, lastBlock: null, capturedAgent: null }
    }

    return {
      activeTask: row.active_task_id ? { id: row.active_task_id, name: row.active_task_name! } : null,
      lastBlock: row.last_block_tool ? { tool: row.last_block_tool, timestamp: row.last_block_timestamp! } : null,
      capturedAgent: row.captured_agent,
    }
  }

  private upsertSession(sessionID: string): void {
    const db = this.requireDb()
    db.prepare("INSERT OR IGNORE INTO sessions (session_id) VALUES (?)").run(sessionID)
  }

  setActiveTask(sessionID: string, task: { id: string; name: string } | null): void {
    const db = this.requireDb()
    this.upsertSession(sessionID)
    db.prepare(
      "UPDATE sessions SET active_task_id = ?, active_task_name = ?, updated_at = ? WHERE session_id = ?"
    ).run(task?.id ?? null, task?.name ?? null, Date.now(), sessionID)
  }

  getActiveTask(sessionID: string): { id: string; name: string } | null {
    return this.getSession(sessionID).activeTask
  }

  setCapturedAgent(sessionID: string, agent: string): void {
    const db = this.requireDb()
    this.upsertSession(sessionID)
    db.prepare(
      "UPDATE sessions SET captured_agent = ?, updated_at = ? WHERE session_id = ?"
    ).run(agent, Date.now(), sessionID)
  }

  getCapturedAgent(sessionID: string): string | null {
    return this.getSession(sessionID).capturedAgent
  }

  setLastBlock(sessionID: string, block: { tool: string; timestamp: number } | null): void {
    const db = this.requireDb()
    this.upsertSession(sessionID)
    db.prepare(
      "UPDATE sessions SET last_block_tool = ?, last_block_timestamp = ?, updated_at = ? WHERE session_id = ?"
    ).run(block?.tool ?? null, block?.timestamp ?? null, Date.now(), sessionID)
  }

  getLastBlock(sessionID: string): { tool: string; timestamp: number } | null {
    return this.getSession(sessionID).lastBlock
  }

  // ─── Anchors ──────────────────────────────────────────

  addAnchor(sessionID: string, anchor: Anchor): void {
    const db = this.requireDb()
    this.upsertSession(sessionID)
    db.prepare(
      "INSERT OR REPLACE INTO anchors (id, session_id, type, content, priority, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(anchor.id, sessionID, anchor.type, anchor.content, anchor.priority, anchor.createdAt)
  }

  getAnchors(sessionID: string): Anchor[] {
    const db = this.requireDb()
    const rows = db.prepare(
      "SELECT id, type, content, priority, created_at FROM anchors WHERE session_id = ? ORDER BY created_at ASC"
    ).all(sessionID) as Array<{
      id: string; type: string; content: string; priority: string; created_at: number
    }>

    return rows.map(r => ({
      id: r.id,
      type: r.type as Anchor["type"],
      content: r.content,
      priority: r.priority as Anchor["priority"],
      createdAt: r.created_at,
    }))
  }

  // ─── Task Store ───────────────────────────────────────

  getTaskStore(): TaskStore {
    return this.taskStoreCache
  }

  setTaskStore(store: TaskStore): void {
    this.taskStoreCache = store
    const db = this.requireDb()
    db.prepare(
      "INSERT OR REPLACE INTO task_store (id, data) VALUES (1, ?)"
    ).run(JSON.stringify(store))
  }

  getActiveEpic(): TaskEpic | null {
    if (!this.taskStoreCache.activeEpicId) return null
    return this.taskStoreCache.epics.find(e => e.id === this.taskStoreCache.activeEpicId) ?? null
  }

  getSmartActiveTask(): Task | null {
    return getActiveChain(this.taskStoreCache).task
  }

  // ─── Delegation Store ─────────────────────────────────

  getDelegationStore(): DelegationStore {
    return this.delegationStoreCache
  }

  setDelegationStore(store: DelegationStore): void {
    this.delegationStoreCache = store
    const db = this.requireDb()
    db.prepare(
      "INSERT OR REPLACE INTO delegation_store (id, data) VALUES (1, ?)"
    ).run(JSON.stringify(store))
  }

  // ─── Persistence ──────────────────────────────────────

  async forceSave(): Promise<void> {
    // SQLite writes are synchronous — nothing to flush
    // But ensure WAL is checkpointed
    this.db?.pragma("wal_checkpoint(TRUNCATE)")
  }

  isDegraded(): boolean {
    return this.db === null
  }

  clear(): void {
    if (!this.db) return
    this.db.exec("DELETE FROM sessions; DELETE FROM anchors; DELETE FROM task_store; DELETE FROM delegation_store;")
    this.taskStoreCache = createEmptyStore()
    this.delegationStoreCache = createEmptyDelegationStore()
  }
}
```

**Step 6: Run test to verify it passes**

Run: `npx tsx tests/sqlite-adapter.test.ts`
Expected: ALL PASS.

**Step 7: Run full suite to ensure no regressions**

Run: `npm run typecheck && npm test`
Expected: 0 TS errors, 294+ existing tests still pass.

**Step 8: Commit**

```bash
git add src/lib/storage-adapter.ts src/lib/sqlite-adapter.ts src/lib/index.ts tests/sqlite-adapter.test.ts package.json package-lock.json
git commit -m "feat: add SQLite storage adapter with better-sqlite3"
```

---

## Task 4: Wire SQLite into StateManager (Feature-Flagged)

**Files:**
- Modify: `src/lib/persistence.ts`
- Modify: `src/index.ts` (pass storage backend flag)
- Modify: `tests/persistence.test.ts`

**Step 1: Add SQLite mode to StateManager**

The goal is NOT to rewrite StateManager — it's to add a `backend` option that delegates to `SqliteAdapter` when enabled. The existing JSON logic stays as the default fallback.

Add to `StateManager`:

```typescript
import { SqliteAdapter } from "./sqlite-adapter.js"
import type { StorageAdapter } from "./storage-adapter.js"

// In StateManager class:
private sqliteAdapter: SqliteAdapter | null = null
private useSqlite = false

async init(directory: string, log: Logger, options?: { sqlite?: boolean }): Promise<void> {
  this.directory = directory
  this.log = log

  if (options?.sqlite) {
    this.sqliteAdapter = new SqliteAdapter()
    await this.sqliteAdapter.init(directory)
    this.useSqlite = true
    // Load caches from SQLite
    this.taskStore = this.sqliteAdapter.getTaskStore()
    this.delegationStore = this.sqliteAdapter.getDelegationStore()
    log.info("StateManager initialized with SQLite backend")
    this.initialized = true
    return
  }

  // ... existing JSON init logic unchanged ...
}
```

Then for each method, add the SQLite delegation:

```typescript
setActiveTask(sessionID: string, task: { id: string; name: string } | null): void {
  if (this.useSqlite && this.sqliteAdapter) {
    this.sqliteAdapter.setActiveTask(sessionID, task)
    return
  }
  // ... existing JSON logic ...
}
```

**Step 2: Write test for SQLite-backed StateManager**

Add to `tests/persistence.test.ts`:

```typescript
// SQLite backend tests
console.log("\nStateManager — SQLite Backend\n")

const sqliteManager = new StateManager()
const sqliteTempDir = mkdtempSync(join(tmpdir(), "idumb-sqlite-sm-"))
await sqliteManager.init(sqliteTempDir, mockLog, { sqlite: true })

sqliteManager.setActiveTask("sqlite-sess", { id: "st-1", name: "SQLite task" })
assert(sqliteManager.getActiveTask("sqlite-sess")?.id === "st-1", "sqlite: task stored")

sqliteManager.setCapturedAgent("sqlite-sess", "idumb-executor")
assert(sqliteManager.getCapturedAgent("sqlite-sess") === "idumb-executor", "sqlite: agent stored")

await sqliteManager.forceSave()
sqliteManager.clear()

// Cleanup
rmSync(sqliteTempDir, { recursive: true, force: true })
```

**Step 3: Run tests**

Run: `npx tsx tests/persistence.test.ts`
Expected: All existing + new SQLite tests pass.

**Step 4: Commit**

```bash
git add src/lib/persistence.ts src/index.ts tests/persistence.test.ts
git commit -m "feat: add SQLite backend to StateManager (feature-flagged)"
```

---

## Task 5: Set Up Monorepo Workspace for Dashboard Frontend

**Files:**
- Modify: root `package.json` (add workspaces)
- Modify: `src/dashboard/frontend/package.json` (add all dependencies)
- Modify: root `tsconfig.json` (ensure frontend exclusion stays)

**Step 1: Add workspace configuration to root package.json**

Add to root `package.json`:
```json
{
  "workspaces": [
    "src/dashboard/frontend"
  ]
}
```

**Step 2: Add all dependencies to frontend package.json**

Replace `src/dashboard/frontend/package.json`:

```json
{
  "name": "idumb-dashboard",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@tanstack/react-query": "^5.17.19",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.1",
    "lucide-react": "^0.344.0",
    "react-markdown": "^9.0.1",
    "rehype-highlight": "^7.0.0",
    "rehype-raw": "^7.0.0",
    "remark-gfm": "^4.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.48",
    "@types/react-dom": "^18.2.18",
    "@vitejs/plugin-react": "^4.2.1",
    "tailwindcss": "^4.1.18",
    "@tailwindcss/vite": "^4.1.18",
    "typescript": "^5.7.3",
    "vite": "^5.1.0"
  }
}
```

**Step 3: Install workspace dependencies**

```bash
cd /Users/apple/Documents/coding-projects/idumb/v2
npm install
```

This will install frontend deps inside the workspace and symlink them properly.

**Step 4: Verify frontend dev server starts**

```bash
cd /Users/apple/Documents/coding-projects/idumb/v2/src/dashboard/frontend
npx vite --host 2>&1 | head -5
```

Expected: Vite starts on port 3000 (it will have React errors from missing CSS, that's Task 6).

**Step 5: Verify root project still works**

```bash
cd /Users/apple/Documents/coding-projects/idumb/v2
npm run typecheck && npm test
```

Expected: 0 TS errors (frontend is excluded), 294+ tests pass.

**Step 6: Commit**

```bash
git add package.json src/dashboard/frontend/package.json package-lock.json
git commit -m "feat: set up npm workspace for dashboard frontend"
```

---

## Task 6: Set Up Tailwind v4 + shadcn/ui in Dashboard Frontend

**Files:**
- Create: `src/dashboard/frontend/src/styles/app.css` (replaces globals.css)
- Modify: `src/dashboard/frontend/vite.config.ts` (add Tailwind v4 plugin)
- Create: `src/dashboard/frontend/components.json` (shadcn config)
- Modify: `src/dashboard/frontend/tsconfig.json` (add @ path alias for shadcn)
- Delete: `src/dashboard/frontend/src/globals.css` (857 LOC hand-written CSS — replaced)

> **REQUIRED SUB-SKILL:** Use superpowers:tailwind-v4-shadcn for correct setup.
> Tailwind v4 uses `@import "tailwindcss"` (no PostCSS config needed), `@theme inline` for CSS variables,
> and `@tailwindcss/vite` plugin instead of PostCSS.

**Step 1: Update vite.config.ts for Tailwind v4**

```typescript
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://localhost:3001",
        ws: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@shared": resolve(__dirname, "../shared"),
    },
  },
})
```

**Step 2: Create app.css with Tailwind v4 + dark mode theme**

Create `src/dashboard/frontend/src/styles/app.css`:

```css
@import "tailwindcss";

@theme inline {
  /* iDumb Dashboard — dark-first governance color system */
  --color-background: oklch(0.15 0.01 260);
  --color-foreground: oklch(0.95 0.01 260);
  --color-card: oklch(0.18 0.01 260);
  --color-card-foreground: oklch(0.95 0.01 260);
  --color-popover: oklch(0.18 0.01 260);
  --color-popover-foreground: oklch(0.95 0.01 260);
  --color-primary: oklch(0.65 0.18 250);
  --color-primary-foreground: oklch(0.98 0.01 260);
  --color-secondary: oklch(0.25 0.02 260);
  --color-secondary-foreground: oklch(0.90 0.01 260);
  --color-muted: oklch(0.22 0.01 260);
  --color-muted-foreground: oklch(0.65 0.01 260);
  --color-accent: oklch(0.30 0.03 260);
  --color-accent-foreground: oklch(0.90 0.01 260);
  --color-destructive: oklch(0.55 0.20 25);
  --color-destructive-foreground: oklch(0.98 0.01 25);
  --color-border: oklch(0.28 0.02 260);
  --color-input: oklch(0.25 0.02 260);
  --color-ring: oklch(0.65 0.18 250);

  /* Governance-specific semantic colors */
  --color-governance-block: oklch(0.55 0.20 25);
  --color-governance-allow: oklch(0.55 0.18 145);
  --color-governance-warn: oklch(0.65 0.18 85);
  --color-governance-info: oklch(0.65 0.18 250);

  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;

  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
}

@layer base {
  body {
    @apply bg-background text-foreground font-sans antialiased;
  }
}
```

**Step 3: Update main.tsx to import new CSS**

Replace the CSS import in `src/dashboard/frontend/src/main.tsx`:
```typescript
import "./styles/app.css"  // was: import "./globals.css"
```

**Step 4: Initialize shadcn/ui**

```bash
cd /Users/apple/Documents/coding-projects/idumb/v2/src/dashboard/frontend
npx shadcn@latest init
```

When prompted:
- Style: New York
- Base color: Slate
- CSS variables: Yes
- Framework: Vite
- Tailwind version: v4

This creates `components.json` and `src/components/ui/` directory.

**Step 5: Install core shadcn components needed for dashboard**

```bash
npx shadcn@latest add card badge button tabs scroll-area separator collapsible tooltip
```

**Step 6: Delete old globals.css**

```bash
rm src/dashboard/frontend/src/globals.css
```

**Step 7: Verify frontend builds**

```bash
cd /Users/apple/Documents/coding-projects/idumb/v2/src/dashboard/frontend
npx vite build
```

Expected: Build succeeds (there will be component errors from old class references — those get fixed in Task 7).

**Step 8: Commit**

```bash
git add src/dashboard/frontend/
git commit -m "feat: set up Tailwind v4 + shadcn/ui in dashboard frontend"
```

---

## Task 7: Rebuild Dashboard Panels with shadcn Components

**Files:**
- Modify: `src/dashboard/frontend/src/components/panels/TaskHierarchyPanel.tsx`
- Modify: `src/dashboard/frontend/src/components/panels/DelegationChainPanel.tsx`
- Modify: `src/dashboard/frontend/src/components/panels/BrainKnowledgePanel.tsx`
- Modify: `src/dashboard/frontend/src/components/panels/PlanningArtifactsPanel.tsx`
- Modify: `src/dashboard/frontend/src/components/layout/DashboardLayout.tsx`
- Modify: `src/dashboard/frontend/src/components/layout/Panel.tsx`
- Modify: `src/dashboard/frontend/src/App.tsx`
- Delete: `src/dashboard/shared/types.ts` (222 LOC duplicated types)
- Create: `src/dashboard/shared/schema-types.ts` (thin re-exports from core schemas)

**Step 1: Replace duplicated types with schema re-exports**

Create `src/dashboard/shared/schema-types.ts`:

```typescript
/**
 * Dashboard types — derived from core schemas.
 * NO manual type duplication. If you need a type, re-export it from schemas.
 */

// Task types — from core schema
export type {
  TaskStore,
  TaskEpic,
  Task,
  Subtask,
  EpicStatus,
  TaskStatus,
  SubtaskStatus,
  WorkStreamCategory,
  GovernanceLevel,
} from "../../schemas/task.js"

// Delegation types — from core schema
export type {
  DelegationStore,
  DelegationRecord,
  DelegationStatus,
  DelegationResult,
} from "../../schemas/delegation.js"

// Brain types — from core schema
export type {
  BrainStore,
  BrainEntry,
  BrainEntryType,
  BrainSource,
} from "../../schemas/brain.js"

// Anchor types — from core schema
export type { Anchor } from "../../schemas/anchor.js"

// API response types (dashboard-specific, defined here)
export interface TasksResponse {
  tasks: import("../../schemas/task.js").TaskStore | null
  activeTask: import("../../schemas/task.js").Task | null
  activeEpic: import("../../schemas/task.js").TaskEpic | null
  capturedAgent: string | null
}

export interface BrainResponse {
  brain: import("../../schemas/brain.js").BrainStore | null
  query?: string
}

export interface DelegationsResponse {
  delegations: import("../../schemas/delegation.js").DelegationStore | null
}

export interface ArtifactsResponse {
  artifacts: Array<{
    path: string
    name: string
    modifiedAt: number
    status?: string
  }>
}

export interface ArtifactContentResponse {
  content: string
  path: string
}

// WebSocket message types
export interface WebSocketMessage {
  type: "connected" | "file-changed" | "state-update"
  data?: unknown
  timestamp: number
}
```

**Step 2: Update ALL frontend component imports**

In every panel and component, change:
```typescript
// OLD:
import type { Task, TaskEpic, ... } from "@shared/types"
// NEW:
import type { Task, TaskEpic, ... } from "@shared/schema-types"
```

**Step 3: Fix process.cwd() bug in PlanningArtifactsPanel**

Replace `process.cwd()` references (lines ~73, ~90) with the backend API path — the frontend should NEVER reference `process`:

```typescript
// OLD: const fullPath = `${process.cwd()}/${artifact.path}`
// NEW: use the API endpoint to fetch artifact content
const { data: content } = useQuery({
  queryKey: ["artifact-content", artifact.path],
  queryFn: () => fetch(`/api/artifacts/${encodeURIComponent(artifact.path)}`).then(r => r.json()),
})
```

**Step 4: Rebuild each panel using shadcn components**

This is the largest step. Each panel gets rebuilt using `Card`, `Badge`, `ScrollArea`, `Collapsible`, `Tabs` from shadcn/ui instead of hand-written divs with missing CSS classes.

Pattern for each panel:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
```

> The detailed component code for each panel should be implemented by the executor following shadcn/ui patterns. The key changes:
> - `<div className="panel-header">` → `<CardHeader><CardTitle>...</CardTitle></CardHeader>`
> - `<span className="badge badge-active">` → `<Badge variant="default">Active</Badge>`
> - `<div className="scroll-container">` → `<ScrollArea className="h-[400px]">`
> - Status colors: use `governance-block`, `governance-allow`, `governance-warn` CSS vars

**Step 5: Add WebSocket connection to App.tsx**

```typescript
import { useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"

function useWebSocket() {
  const queryClient = useQueryClient()
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`)
    wsRef.current = ws

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      if (msg.type === "file-changed" || msg.type === "state-update") {
        // Invalidate all queries to refresh data
        queryClient.invalidateQueries()
      }
    }

    ws.onclose = () => {
      // Reconnect after 3 seconds
      setTimeout(() => {
        wsRef.current = null
      }, 3000)
    }

    return () => ws.close()
  }, [queryClient])
}
```

**Step 6: Verify frontend builds and renders**

```bash
cd /Users/apple/Documents/coding-projects/idumb/v2/src/dashboard/frontend
npx vite build
```

Expected: Build succeeds with zero errors.

**Step 7: Manual test — start backend + frontend**

```bash
# Terminal 1: Start backend
cd /Users/apple/Documents/coding-projects/idumb/v2
npx tsx src/dashboard/backend/server.ts

# Terminal 2: Start frontend
cd src/dashboard/frontend
npx vite
```

Open http://localhost:3000 — verify TaskHierarchyPanel, DelegationChainPanel render (even if empty state).

**Step 8: Commit**

```bash
git add src/dashboard/
git commit -m "feat: rebuild dashboard panels with shadcn/ui, fix process.cwd bug, derive types from schemas"
```

---

## Task 8: Wire Backend to SQLite

**Files:**
- Modify: `src/dashboard/backend/server.ts`
- Modify: `src/dashboard/shared/comments-types.ts` (if needed)

**Step 1: Replace readFileSync JSON reads with SQLite queries**

The backend currently reads `.idumb/brain/*.json` files directly. Replace with SQLite reads.

In `server.ts`, add SQLite adapter initialization:

```typescript
import { SqliteAdapter } from "../../lib/sqlite-adapter.js"

let adapter: SqliteAdapter | null = null

async function initAdapter(projectDir: string) {
  adapter = new SqliteAdapter()
  await adapter.init(projectDir)
}
```

Replace JSON file reads in each endpoint:
```typescript
// OLD:
app.get("/api/tasks", (_req, res) => {
  const data = readFileSync(join(projectDir, ".idumb/brain/tasks.json"), "utf-8")
  res.json(JSON.parse(data))
})

// NEW:
app.get("/api/tasks", (_req, res) => {
  if (!adapter) return res.status(503).json({ error: "Not initialized" })
  const store = adapter.getTaskStore()
  const activeEpic = adapter.getActiveEpic()
  const activeTask = adapter.getSmartActiveTask()
  res.json({ tasks: store, activeEpic, activeTask, capturedAgent: null })
})
```

**Step 2: Replace console.log with file logger**

Replace ALL `console.log` in `server.ts` with the `createLogger` from `lib/logging.ts`:

```typescript
import { createLogger } from "../../lib/logging.js"
const log = createLogger(projectDir, "dashboard-server")
```

**Step 3: Fix hardcoded n4 reference**

Search for `n4` in `server.ts` and replace with dynamic detection or remove.

**Step 4: Test backend API**

```bash
# Start backend
npx tsx src/dashboard/backend/server.ts &

# Test endpoints
curl http://localhost:3001/api/health
curl http://localhost:3001/api/tasks
curl http://localhost:3001/api/delegations

# Kill backend
kill %1
```

Expected: All endpoints return valid JSON (possibly empty state).

**Step 5: Commit**

```bash
git add src/dashboard/backend/server.ts
git commit -m "feat: wire dashboard backend to SQLite adapter"
```

---

## Task 9: Integration Smoke Test

**Files:**
- No new files — this is a verification task

**Step 1: Run full test suite**

```bash
npm run typecheck && npm test && npx tsx tests/sqlite-adapter.test.ts
```

Expected: ALL pass.

**Step 2: End-to-end smoke test**

```bash
# 1. Initialize iDumb in a temp project
mkdir /tmp/idumb-smoke-test && cd /tmp/idumb-smoke-test
npx idumb-v2 init -y

# 2. Verify 3 agents deployed (not 7)
ls .opencode/agents/idumb-*.md
# Expected: idumb-supreme-coordinator.md, idumb-investigator.md, idumb-executor.md

# 3. Verify SQLite DB created
ls .idumb/brain/governance.db
# Expected: file exists

# 4. Start dashboard
cd /Users/apple/Documents/coding-projects/idumb/v2/src/dashboard/frontend
npx vite &

# 5. Open browser, verify panels render
open http://localhost:3000

# 6. Cleanup
rm -rf /tmp/idumb-smoke-test
```

**Step 3: Commit final integration**

```bash
git commit --allow-empty -m "chore: Slice 1 complete — enforcement + SQLite + dashboard revival"
```

---

## Verification Checklist

After all tasks complete, verify:

- [ ] `AGENT_TOOL_RULES` has exactly 3 entries: coordinator, investigator, executor
- [ ] No references to old agent names in tool-gate.ts
- [ ] `VERSION` in index.ts matches package.json
- [ ] `governance.db` created on init (not just JSON files)
- [ ] SQLite adapter passes isolated tests
- [ ] StateManager works with `{ sqlite: true }` flag
- [ ] Dashboard frontend installs via `npm install` at root (workspace)
- [ ] Dashboard renders with Tailwind v4 + shadcn/ui components
- [ ] No `process.cwd()` in frontend code
- [ ] No `console.log` in backend server.ts
- [ ] WebSocket connection established between frontend and backend
- [ ] Types derived from schemas (no duplicated shared/types.ts)
- [ ] `npm run typecheck` — 0 errors
- [ ] `npm test` — 294+ assertions pass
- [ ] `npx tsx tests/sqlite-adapter.test.ts` — all pass

---

## Dependencies Between Tasks

```
Task 1 (Tool Gate Fix) ──────────────────────────→ Independent
Task 2 (VERSION + Dead Code) ────────────────────→ Independent
Task 3 (SQLite Adapter) ─────────────────────────→ Independent
Task 4 (Wire SQLite into StateManager) ──────────→ Depends on Task 3
Task 5 (Monorepo Workspace) ─────────────────────→ Independent
Task 6 (Tailwind v4 + shadcn) ──────────────────→ Depends on Task 5
Task 7 (Rebuild Panels) ─────────────────────────→ Depends on Task 6
Task 8 (Backend → SQLite) ──────────────────────→ Depends on Task 3, Task 7
Task 9 (Integration Smoke) ─────────────────────→ Depends on ALL
```

Parallelizable groups:
- **Wave 1:** Tasks 1, 2, 3, 5 (all independent)
- **Wave 2:** Tasks 4, 6 (depend on Wave 1)
- **Wave 3:** Task 7 (depends on Task 6)
- **Wave 4:** Task 8 (depends on Tasks 3, 7)
- **Wave 5:** Task 9 (integration)
