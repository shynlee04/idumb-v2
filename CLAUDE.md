# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## NON-NEGOTIABLE RULES

- Never make changes to the core plugin without first reading `AGENTS.md` (ground truth for what exists)
- Zero TypeScript errors (`npm run typecheck`) and zero test failures (`npm test`) at all times
- All source code lives in `src/`. Files outside `src/` indicate structure debt
- NO `console.log` anywhere — it breaks TUI rendering. Use `createLogger()` from `lib/logging.ts`
- Zod schemas define ALL data structures. Define schema first, derive types with `z.infer<>`

## Project Overview

iDumb v2 is an OpenCode plugin that enforces governance on AI agents — blocking file writes without an active task, preserving context across compaction, and pruning stale tool outputs. It's distributed as an npm package with a CLI (`idumb-v2 init`) that deploys 3 agents + hooks + tools into any project.

**Ground truth for features, file tree, roadmap, and what does/doesn't work:** `AGENTS.md`

## Commands

```bash
# Build
npm run build          # tsc → dist/

# Watch mode
npm run dev            # tsc --watch

# Type check (no emit)
npm run typecheck      # tsc --noEmit — must be zero errors

# Run ALL tests (11 suites, 613 assertions, sequential chain)
npm test

# Run a single test file
npx tsx tests/tool-gate.test.ts
npx tsx tests/compaction.test.ts
npx tsx tests/message-transform.test.ts
npx tsx tests/system.test.ts
npx tsx tests/init.test.ts
npx tsx tests/persistence.test.ts
npx tsx tests/task.test.ts
npx tsx tests/delegation.test.ts
npx tsx tests/planning-registry.test.ts
npx tsx tests/work-plan.test.ts
npx tsx tests/task-graph.test.ts

# Link for local development
npm link

# CLI (after linking)
idumb-v2 init          # Interactive setup
idumb-v2 init -y       # Non-interactive defaults
```

**Important:** `npm test` chains 11 `tsx` commands with `&&`. If an early suite fails, later suites don't run. When debugging, run the failing suite individually.

## Architecture

### Plugin Entry Point

Single entry point for all hooks and tools:

- **`src/index.ts`** — Main plugin export. Wires 7 event hooks + 6 tools into OpenCode's plugin system. This is the `"main"` entry in package.json.

### Hook Factory Pattern

Every hook follows the same pattern: a factory function that captures a logger and returns an async handler. All hooks are wrapped in try/catch for graceful degradation — a crashing hook must never take down the host.

```
createToolGateBefore(log) → async (input, output) => { ... }
```

Hooks are created in `src/index.ts` and wired to OpenCode event names. The factory pattern ensures each hook has isolated state and logging.

### Data Flow

```
Tool invocation → tool.execute.before (gate: has active task?)
                    ↓ blocked? → throw Error with governance message
                    ↓ allowed? → tool runs
                → tool.execute.after (defense-in-depth fallback)

Session compacting → experimental.session.compacting
                    → injects anchors + active task into post-compaction context
                    → budget-capped ≤500 tokens

Chat turn → chat.params (captures agent name, auto-assigns to active task + TaskNode)
          → experimental.chat.system.transform (config-aware governance context injection)
          → experimental.chat.messages.transform (DCP-pattern: prunes stale tool outputs)
```

### Source Layout

```
src/
├── index.ts              # Plugin entry: hooks + 6 tools wiring (196 LOC)
├── cli.ts                # CLI entry point for `npx idumb-v2` (431 LOC)
├── cli/deploy.ts         # Deploys 3 agents + commands + modules to target project
├── templates.ts          # Agent markdown templates (1482 LOC — splitting planned)
├── hooks/                # 4 event handler modules (+ barrel index.ts)
│   ├── tool-gate.ts      # VALIDATED — blocks write/edit without active task
│   ├── compaction.ts     # Unit-tested — anchor injection via output.context.push()
│   ├── message-transform.ts  # Unit-tested — DCP-pattern context pruning
│   └── system.ts         # Unit-tested — config-aware governance context (UNVERIFIED in live OpenCode)
├── tools/                # 6 tool implementations (+ barrel index.ts)
│   ├── govern-plan.ts    # Work plan management: create, plan_tasks, status, archive, abandon
│   ├── govern-task.ts    # Task lifecycle: start, complete, fail, status, review
│   ├── govern-delegate.ts # Structured delegation: assign, recall, status
│   ├── govern-shell.ts   # Governed shell execution with classification
│   ├── anchor.ts         # Context anchors surviving compaction
│   └── init.ts           # Project initialization + code quality report
├── lib/                  # Shared utilities
│   ├── logging.ts        # TUI-safe file-based logger
│   ├── persistence.ts    # StateManager singleton — all disk I/O, debounced writes
│   ├── state-reader.ts   # Read-only state reading utilities
│   ├── sdk-client.ts     # OpenCode SDK client singleton for shared hook/tool access
│   ├── framework-detector.ts  # Brownfield scanner + code quality integration
│   ├── code-quality.ts   # Code quality scanner — smell detection, A-F grading (701 LOC)
│   ├── scaffolder.ts     # Creates .idumb/ directory tree + config.json
│   ├── sqlite-adapter.ts # SQLite storage adapter for persistence
│   └── storage-adapter.ts # Storage adapter interface
├── schemas/              # Zod schemas — source of truth for all data structures
│   ├── task.ts           # Smart TODO schema — Epic/Task/Subtask hierarchy
│   ├── task-graph.ts     # v3 task graph — TaskNode, Checkpoint, TaskGraph
│   ├── work-plan.ts      # v3 work plan lifecycle
│   ├── delegation.ts     # 3-agent hierarchy + category routing
│   ├── planning-registry.ts  # Artifact tracking — tiers, chains, staleness
│   ├── anchor.ts         # Anchor types, scoring, staleness, budget selection
│   ├── config.ts         # IdumbConfig, Language, GovernanceMode
│   ├── brain.ts          # Brain entry schema — knowledge persistence
│   ├── project-map.ts    # Project map schema — directory/file mapping
│   └── codemap.ts        # Code map schema — symbol extraction
├── modules/              # Deployable module templates (agents, commands, schemas)
└── dashboard/            # React + Express dashboard (not integrated into CLI)
```

Key architectural boundaries:
- **hooks/** only import from **lib/** and **schemas/** — never from tools
- **tools/** import from **lib/** and **schemas/** — never from hooks
- **schemas/** are pure data definitions with helper functions — no side effects
- **lib/persistence.ts** owns all disk I/O via `StateManager` singleton

### Schema-Driven Development

All data structures are defined as Zod schemas in `src/schemas/`. Types are derived, not hand-written:

```typescript
// Schema definition (schemas/task.ts)
export const SmartTaskSchema = z.object({ ... })

// Type derivation
export type SmartTask = z.infer<typeof SmartTaskSchema>
```

Key schemas: `task.ts` (Epic→Task→Subtask), `task-graph.ts` + `work-plan.ts` (v3 WorkPlan→TaskNode→Checkpoint), `delegation.ts` (3-agent permissions), `planning-registry.ts` (artifact tracking), `anchor.ts` (compaction-surviving context), `config.ts` (user settings).

### 3-Agent System

The plugin deploys exactly 3 agents (markdown files to `.opencode/agents/`):

| Agent | Role | Write Permission |
|-------|------|-----------------|
| `supreme-coordinator` | Orchestrator — delegates, never writes code | No |
| `investigator` | Research, analysis, planning | Brain entries only |
| `executor` | Code implementation, builds, tests | Full write access |

Agent templates live in `src/templates.ts`. Delegation routing is defined in `schemas/delegation.ts`. Tool-gate enforcement is in `hooks/tool-gate.ts` via `AGENT_TOOL_RULES`.

### Persistence

Runtime state lives in `.idumb/brain/` (created by `idumb-v2 init`):
- `state.json` — governance state (phase, anchors, validation count)
- `config.json` — user settings (language, governance mode, experience level)
- `tasks.json` — legacy hierarchical task store (Epic→Task→Subtask)
- `task-graph.json` — v3 task graph (WorkPlan→TaskNode)

`StateManager` in `lib/persistence.ts` is a singleton that handles all disk I/O with debounced writes. SQLite adapter (`lib/sqlite-adapter.ts`) exists as a migration path but is lazy-imported to avoid native module crashes.

### Init Guard

The plugin factory in `src/index.ts` returns `{}` (empty hooks) if `.idumb/` doesn't exist. This prevents zombie directory creation and TUI breakage on uninitialized projects. Users must run `idumb-v2 init` first.

## Testing

Tests use a minimal hand-rolled test harness (no framework). Each test file exports nothing — it runs assertions on import via `tsx`.

Pattern for every test file:
```typescript
// tests/example.test.ts
import { ... } from "../src/schemas/example.js"

let passed = 0, failed = 0
function assert(condition: boolean, name: string) { ... }

// Tests
assert(someFunction() === expected, "description")

// Summary
console.log(`Results: ${passed}/${passed + failed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
```

**Current baseline:** 613/613 assertions across 11 suites.

**Standalone tests** (not in `npm test`): `sqlite-adapter.test.ts`, `smoke-code-quality.ts`.

## Code Style

- ESM only (`"type": "module"` in package.json)
- All imports use `.js` extension (NodeNext module resolution)
- Functions: `camelCase` | Types: `PascalCase` | Constants: `SCREAMING_SNAKE` | Files: `kebab-case.ts`
- Barrel exports via `index.ts` in each directory
- Zod for external data validation, plain interfaces for internal state
- Target 300-500 LOC per file. Files >500 LOC are flagged (see AGENTS.md for current violations)

## Key Dependencies

- `@opencode-ai/plugin` — OpenCode plugin SDK (provides `Plugin` type, `tool()` wrapper). Also re-exports `zod` — do NOT install zod separately.
- `better-sqlite3` — SQLite adapter (lazy-imported; needs `npm rebuild` after Node version changes)
- `chokidar` — File watching for dashboard
- `express` + `ws` — Dashboard backend (dev dependency territory, but listed as deps)
- `tsx` — Test runner (dev dependency)

## Known Issues

- `src/index.ts` has `VERSION = "2.2.0"` which should track package.json — verify on version bumps
- `system.ts` hook is unit-tested but **unverified** in live OpenCode — may not fire
- `experimental.chat.messages.transform` is registered but **unverified** in live OpenCode
- Dashboard exists but is not integrated into the main CLI workflow
- `templates.ts` at 1482 LOC is the largest file and needs splitting into per-agent modules
- `entity-resolver.ts` and `chain-validator.ts` are archived in `src/lib/_archived-2026-02-08/` — 845 LOC of dead code, restore when entity-level governance is wired
- `bash.ts` (tool-gate) ROLE_PERMISSIONS has 10 legacy agents, missing investigator/executor entries

## Session Handoff

When resuming work on this codebase:
1. Read `MASTER-PLAN.md` — it is the active implementation plan and planning SOT
2. Read `AGENTS.md` — it's the ground truth for what exists
3. Run `npm run typecheck` — must be zero errors
4. Run `npm test` — must be 657+ baseline (12 suites)
5. Check `.idumb/brain/plan-state.json` for current phase state
