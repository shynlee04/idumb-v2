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

# Run ALL tests (8 suites, 294 assertions, sequential chain)
npm test

# Run a single test file
npx tsx tests/tool-gate.test.ts
npx tsx tests/compaction.test.ts
npx tsx tests/message-transform.test.ts
npx tsx tests/init.test.ts
npx tsx tests/persistence.test.ts
npx tsx tests/task.test.ts
npx tsx tests/delegation.test.ts
npx tsx tests/planning-registry.test.ts

# Link for local development
npm link

# CLI (after linking)
idumb-v2 init          # Interactive setup
idumb-v2 init -y       # Non-interactive defaults
```

**Important:** `npm test` chains 8 `tsx` commands with `&&`. If an early suite fails, later suites don't run. When debugging, run the failing suite individually.

## Architecture

### Plugin Entry Points

Two exports serve different integration paths:

- **`src/index.ts`** — Main plugin export. Wires 6 event hooks + 5 custom tools into OpenCode's plugin system. This is the `"main"` entry in package.json.
- **`src/tools-plugin.ts`** — Separate tool registration export (`"./tools-plugin"` in package.json exports). Used when tools need to be registered independently of hooks.

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

Chat turn → chat.params (captures agent name, auto-assigns to active task)
          → experimental.chat.messages.transform (DCP-pattern: prunes stale tool outputs)
```

### Source Layout

```
src/
├── index.ts              # Plugin entry: hooks + tools wiring
├── tools-plugin.ts       # Separate tool registration export
├── cli.ts                # CLI entry for `npx idumb-v2`
├── cli/deploy.ts         # Deploys agents/commands/modules to target project
├── templates.ts          # Agent markdown templates (1510 LOC — splitting planned)
├── hooks/                # 4 event handlers (tool-gate, compaction, message-transform, system)
├── tools/                # 11 tool implementations (~5000 LOC)
├── lib/                  # Shared utilities (logging, persistence, code-quality, etc.)
└── schemas/              # Zod schemas — source of truth for all data structures
```

Key architectural boundaries:
- **hooks/** only import from **lib/** and **schemas/** — never from tools
- **tools/** import from **lib/** and **schemas/** — never from hooks
- **schemas/** are pure data definitions with helper functions — no side effects
- **lib/persistence.ts** owns all disk I/O: `StateManager` (singleton) + `TaskStore`

### Schema-Driven Development

All data structures are defined as Zod schemas in `src/schemas/`. Types are derived, not hand-written:

```typescript
// Schema definition (schemas/task.ts)
export const SmartTaskSchema = z.object({ ... })

// Type derivation
export type SmartTask = z.infer<typeof SmartTaskSchema>
```

Key schemas: `task.ts` (Epic→Task→Subtask hierarchy), `delegation.ts` (3-agent permissions), `planning-registry.ts` (artifact tracking), `anchor.ts` (compaction-surviving context), `config.ts` (user settings).

### 3-Agent System

The plugin deploys exactly 3 agents (markdown files to `.opencode/agents/`):

| Agent | Role | Write Permission |
|-------|------|-----------------|
| `supreme-coordinator` | Orchestrator — delegates, never writes code | No |
| `investigator` | Research, analysis, planning | Brain entries only |
| `executor` | Code implementation, builds, tests | Full write access |

Agent templates live in `src/templates.ts`. Delegation routing is defined in `schemas/delegation.ts`. Write permissions are enforced by `lib/entity-resolver.ts`.

### Persistence

Runtime state lives in `.idumb/brain/` (created by `idumb-v2 init`):
- `state.json` — governance state (phase, anchors, validation count)
- `config.json` — user settings (language, governance mode, experience level)
- `tasks.json` — hierarchical task store (Epic→Task→Subtask)

`StateManager` in `lib/persistence.ts` is a singleton that handles all disk I/O with debounced writes.

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

**Smoke test:** `tests/smoke-code-quality.ts` runs the code quality scanner against the project's own source — not included in `npm test`.

## Code Style

- ESM only (`"type": "module"` in package.json)
- All imports use `.js` extension (NodeNext module resolution)
- Functions: `camelCase` | Types: `PascalCase` | Constants: `SCREAMING_SNAKE` | Files: `kebab-case.ts`
- Barrel exports via `index.ts` in each directory
- Zod for external data validation, plain interfaces for internal state
- Target 300-500 LOC per file. Files >500 LOC are flagged (see AGENTS.md for current violations)

## Key Dependencies

- `@opencode-ai/plugin` — OpenCode plugin SDK (provides `Plugin` type, `tool()` wrapper). Also re-exports `zod` — do NOT install zod separately.
- `chokidar` — File watching for dashboard
- `express` + `ws` — Dashboard backend (dev dependency territory, but listed as deps)
- `tsx` — Test runner (dev dependency)

## Known Issues

- `src/index.ts` has `VERSION = "2.1.0"` hardcoded while `package.json` is at `2.2.0` — version string drift
- `system.ts` hook is registered but **unverified** in live OpenCode — may not fire
- `experimental.chat.system.transform` and `experimental.chat.messages.transform` are registered but **unverified** in live OpenCode
- Dashboard exists but is not integrated into the main CLI workflow
- `templates.ts` at 1510 LOC is the largest file and needs splitting into per-agent modules

## Session Handoff

When resuming work on this codebase:
1. Read `AGENTS.md` — it's the ground truth for what exists
2. Run `npm run typecheck` — must be zero errors
3. Run `npm test` — must be 294/294 baseline
4. Check `planning/implamentation-plan-turn-based/` for the highest `n`-suffix plan (currently n6)
