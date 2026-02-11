# Architecture

**Analysis Date:** 2026-02-09
**Status:** ⚠️ **DEPRECATED** — Describes old plugin architecture. Current architecture is **SDK-direct standalone platform** (see `ARCHITECTURE-DECISION-2026-02-10.md`)

> **NOTE:** This document describes the pre-pivot plugin architecture. Plugin system is **deprecated** as of 2026-02-10. The platform now uses OpenCode SDK directly from the dashboard backend.

## Pattern Overview

**Overall:** OpenCode Plugin Architecture (event-driven hooks + declarative tools)

**Key Characteristics:**
- Single plugin entry point (`src/index.ts`) that registers 5 event hooks + 7 tools with the OpenCode host
- Hook factory pattern: each hook is a factory function that captures a logger and returns an async handler
- Schema-driven data structures: Zod schemas define external data shapes, plain TypeScript interfaces for internal state
- Singleton persistence: `StateManager` is a global singleton managing all disk I/O with debounced writes
- Init guard: plugin returns `{}` (no-op) if `.idumb/` directory does not exist, preventing zombie state
- P3 (graceful degradation): every hook and tool wraps logic in try/catch — a crashing hook must never take down the host

## Layers

**Plugin Entry (`src/index.ts`):**
- Purpose: Wire hooks and tools into OpenCode's plugin system
- Location: `src/index.ts` (176 LOC)
- Contains: Plugin factory function, hook instantiation, tool registration
- Depends on: `src/hooks/`, `src/tools/`, `src/lib/persistence.ts`, `src/lib/sdk-client.ts`
- Used by: OpenCode host process (loaded as a plugin via `opencode.json`)

**Hooks Layer (`src/hooks/`):**
- Purpose: Intercept OpenCode lifecycle events — compaction, system prompt, message transform, chat params
- Location: `src/hooks/`
- Contains: 3 hook factory modules + barrel index
- Depends on: `src/lib/` (persistence, logging), `src/schemas/` (anchor, task-graph, plan-state)
- Used by: `src/index.ts` (hook registration)
- Key constraint: Hooks ONLY import from `lib/` and `schemas/` — never from `tools/`

**Tools Layer (`src/tools/`):**
- Purpose: Expose 7 tools to agents — 5 lifecycle verbs + anchor management + init
- Location: `src/tools/`
- Contains: 3 tool modules + barrel index
- Depends on: `src/lib/` (persistence, logging, framework-detector, scaffolder), `src/schemas/`
- Used by: `src/index.ts` (tool registration)
- Key constraint: Tools ONLY import from `lib/` and `schemas/` — never from `hooks/` (exception: `anchor.ts` imports `addAnchor`/`getAnchors` from `hooks/compaction.ts`)

**Schemas Layer (`src/schemas/`):**
- Purpose: Define all data structures, validation logic, and pure helper functions
- Location: `src/schemas/`
- Contains: 14 schema modules + barrel index
- Depends on: Nothing (pure data definitions, zero side effects)
- Used by: Every other layer
- Key constraint: Pure functions only — no I/O, no state mutation, no imports from `lib/` or `hooks/`

**Library Layer (`src/lib/`):**
- Purpose: Shared utilities — persistence, logging, SDK client, framework detection, scaffolding, code quality scanning
- Location: `src/lib/`
- Contains: 10 active modules + 2 archived + barrel index
- Depends on: `src/schemas/` (data types)
- Used by: `src/hooks/`, `src/tools/`, `src/index.ts`

**CLI Layer (`src/cli.ts`, `src/cli/`):**
- Purpose: Standalone CLI for `npx idumb-v2 init` and `npx idumb-v2 dashboard`
- Location: `src/cli.ts` (entry), `src/cli/deploy.ts`, `src/cli/dashboard.ts`
- Contains: Interactive setup prompts, agent/command deployment, dashboard launcher
- Depends on: `src/lib/`, `src/schemas/config.ts`, `src/templates.ts`
- Used by: End users via `npx idumb-v2` (NOT by the plugin at runtime)
- Key constraint: CLI is a separate entry point — `bin/cli.mjs` invokes `src/cli.ts`

**Dashboard Layer (`src/dashboard/`):**
- Purpose: Real-time visualization of governance state (React + Express + WebSocket)
- Location: `src/dashboard/backend/server.ts`, `src/dashboard/frontend/`
- Contains: Express API server, React frontend with panels for tasks, brain, delegations, artifacts
- Depends on: `src/lib/state-reader.ts`, `src/lib/sqlite-adapter.ts`
- Used by: `idumb-v2 dashboard` CLI command
- Key constraint: Excluded from main TypeScript build (`tsconfig.json` excludes `src/dashboard/frontend/**/*`)

## Data Flow

**Tool Invocation (Lifecycle Verb):**

1. Agent calls `tasks_start` with objective string
2. `src/tools/tasks.ts` → `start.execute()` receives args + `context.sessionID`
3. Reads current `TaskGraph` from `stateManager.getTaskGraph()`
4. Creates or finds active `WorkPlan`, creates `TaskNode`, sets status to "active"
5. Calls `stateManager.setActiveTask(sessionID, { id, name })` to track active task
6. Calls `stateManager.saveTaskGraph(graph)` which triggers debounced disk write
7. Returns 1-line confirmation: `Active: "Fix auth login flow".`

**Session Compaction (Context Preservation):**

1. OpenCode triggers `experimental.session.compacting` when context window fills
2. `src/hooks/compaction.ts` → `createCompactionHook(log)` returns the handler
3. Handler calls `getAnchors(sessionID)` → gets all anchors for this session
4. Calls `selectAnchors(allAnchors, 2000)` → priority+freshness-weighted selection within budget
5. Gets active task from `stateManager.getActiveTask(sessionID)`
6. Gets plan state from `stateManager.getPlanState()`
7. Formats context string with plan phase, active task, anchors, active delegations
8. Pushes to `output.context` array — this is the ONLY way to survive compaction
9. Budget-capped at 2000 chars (~500 tokens)

**System Prompt Injection:**

1. OpenCode triggers `experimental.chat.system.transform` at session start
2. `src/hooks/system.ts` → lazy-loads config from `.idumb/config.json` (cached after first load)
3. Reads active work chain (WorkPlan + TaskNode + checkpoints) from task graph
4. Reads plan state, critical anchors, graph warnings
5. Formats injection with active task, progress, framework overlay, governance mode
6. Pushes to `output.system` array — ADD, never REPLACE
7. Budget-capped at 1000 chars (~250 tokens)

**Message Transform (DCP Pattern):**

1. OpenCode triggers `experimental.chat.messages.transform` on every turn
2. `src/hooks/message-transform.ts` → scans all message parts for completed tool outputs
3. Collects tool output references, sorts by timestamp (oldest first)
4. Keeps last 10 tool outputs intact, truncates older ones to 150 chars
5. Governance tools (govern_plan, govern_task, idumb_anchor, idumb_init) are exempt from pruning
6. Mutates `output.messages` in-place — never adds/removes parts

**Agent Identity Capture:**

1. `chat.params` hook fires on every chat turn
2. Captures `input.agent` name and stores via `stateManager.setCapturedAgent(sessionID, agent)`
3. Auto-assigns captured agent to active task (if unassigned) in both legacy TaskStore and v3 TaskGraph

**State Management:**
- In-memory `StateManager` singleton is authoritative
- Debounced writes (500ms) to 8 separate JSON files in `.idumb/brain/`
- Write-through: memory is source of truth, disk is backup
- Graceful degradation: if disk I/O fails, `degraded` flag is set and in-memory continues
- SQLite adapter exists as feature-flagged migration path (lazy-imported to avoid native module crashes)

## Key Abstractions

**WorkPlan (v3 Task Graph):**
- Purpose: Top-level container for a group of related tasks
- Schema: `src/schemas/work-plan.ts` (WorkPlan interface)
- Functions: `src/schemas/task-graph.ts` (find, validate, migrate, format)
- Pattern: `WorkPlan` → `TaskNode[]` with temporal gates and dependency ordering
- States: draft → active → completed/archived/abandoned

**TaskNode:**
- Purpose: Individual unit of work within a WorkPlan
- Schema: `src/schemas/work-plan.ts` (TaskNode interface)
- Properties: id, name, expectedOutput, assignedTo, delegatedBy, dependsOn, temporalGate, checkpoints, artifacts, result
- States: planned → blocked → active → review → completed/failed

**Anchor:**
- Purpose: Context unit that survives session compaction
- Schema: `src/schemas/anchor.ts`
- Pattern: Priority-weighted, freshness-scored, budget-selected during compaction
- Types: decision, context, checkpoint, error, attention
- Staleness: >48h anchors get deprioritized

**StateManager (Singleton):**
- Purpose: Central state authority — all disk I/O goes through here
- Location: `src/lib/persistence.ts`
- Pattern: Singleton with debounced async writes, Zod-validated reads, legacy path migration
- Stores: sessions, anchors, taskStore, taskGraph, delegationStore, planState, brainStore, codeMap, projectMap
- Interface: `src/lib/storage-adapter.ts` (StorageAdapter) defines the contract

**GovernanceStatus:**
- Purpose: Unified snapshot eliminating 4x-duplicated call pattern
- Location: `src/lib/persistence.ts` (GovernanceStatus interface + `getGovernanceStatus()` method)
- Consumers: `tasks_check` tool, system.ts hook, compaction.ts hook

## Entry Points

**Plugin Entry (`src/index.ts`):**
- Location: `src/index.ts`
- Triggers: OpenCode loads plugin via `opencode.json` → `"plugin": ["idumb-v2"]`
- Responsibilities: Init guard, SDK client capture, StateManager init, hook+tool wiring
- Export: `export default idumb` (Plugin type from `@opencode-ai/plugin`)

**CLI Entry (`src/cli.ts`):**
- Location: `src/cli.ts` → invoked via `bin/cli.mjs`
- Triggers: User runs `npx idumb-v2 init` or `idumb-v2 dashboard`
- Responsibilities: Interactive prompts, brownfield scan, scaffold, deploy agents/commands

**Dashboard Backend (`src/dashboard/backend/server.ts`):**
- Location: `src/dashboard/backend/server.ts`
- Triggers: `idumb-v2 dashboard` CLI command
- Responsibilities: Express API for governance state, WebSocket for live updates

## Error Handling

**Strategy:** P3 (Graceful Degradation) — every hook and tool wraps its body in try/catch. Errors are logged but never propagated to the host.

**Patterns:**
- Hooks: `try { ... } catch (error) { log.error(...) }` — silent failure, never crash the host
- Tools: Return error strings to the agent (e.g., `"ERROR: No active task. Start one with tasks_start."`) — teach the agent what went wrong
- Persistence: `degraded` flag on StateManager — if disk I/O fails, switch to in-memory-only mode
- Config loading: `configLoadAttempted` flag ensures single attempt, ENOENT is not logged as error
- Zod validation: `safeParse()` with fallback defaults — corrupted state files degrade to empty stores, never crash

## Cross-Cutting Concerns

**Logging:**
- File-based logging to `.idumb/logs/{service}.log` via `createLogger()` from `src/lib/logging.ts`
- NO `console.log` anywhere — breaks TUI rendering
- Optional dual-logging to OpenCode SDK `client.app.log()` when SDK client is available
- 4 log levels: debug, info, warn, error (configurable minimum per logger)
- All writes use `writeFileSync` with `{ flag: "a" }` — append-only, never truncate

**Validation:**
- Zod schemas validate all data read from disk (permissive top-level, passes through nested)
- `safeParse()` helper in `src/lib/persistence.ts` — returns fallback default on parse failure
- Config validation via `validateConfig()` in `src/schemas/config.ts`
- Task completion validation via `validateTaskCompletion()` in `src/schemas/task-graph.ts`

**Authentication/Identity:**
- `chat.params` hook captures agent name from `input.agent` on every chat turn
- Agent name stored per-session via `stateManager.setCapturedAgent()`
- Agent name used for: task auto-assignment, delegation tracking, tool-gate scoping
- 3-agent system: `supreme-coordinator` (no writes), `investigator` (brain-only writes), `executor` (full writes)
- Agent permissions enforced via agent markdown templates (template-level tool access), NOT by plugin hooks (tool-gate was removed in Phase 9)

**Internationalization:**
- Two languages supported: English (`en`) and Vietnamese (`vi`)
- Translation map in `src/hooks/system.ts` for governance mode strings
- Config stores both communication and document language
- Init tool and CLI both support language selection
- Greeting builder in `src/tools/init.ts` has full bilingual output

---

*Architecture analysis: 2026-02-09*
