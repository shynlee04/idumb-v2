# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## NON-NEGOTIABLE RULES

- Never make changes without first reading `AGENTS.md` (ground truth for what exists)
- Zero TypeScript errors (`npm run typecheck`) and zero test failures (`npm test`) at all times
- NO `console.log` anywhere — it breaks TUI rendering. Use `createLogger()` from `src/lib/logging.ts`
- Zod schemas in `src/schemas/` define ALL data structures. Define schema first, derive types with `z.infer<>`
- SDK types are LAW — never redefine, never `as any`, never hand-roll SDK shapes. See SDK Type Governance below

## Project Overview

iDumb v2 is a standalone multi-agent workplace platform that uses OpenCode as its AI engine via SDK-direct calls from the dashboard backend. It combines:

- **CLI** (`idumb-v2 init`) — deploys 3 agents + commands + modules into any project
- **Dashboard** (`app/`) — TanStack Start SPA with file tree, Monaco editor, AI chat, settings
- **Schemas** (`src/schemas/`) — Zod-driven data structures for tasks, governance, planning
- **Persistence** (`src/lib/persistence.ts`) — StateManager singleton for `.idumb/brain/` disk I/O

**Ground truth**: `AGENTS.md` (what exists), `.planning/ROADMAP.md` (what's next), `.planning/STATE.md` (current position)

## Commands

```bash
# Core plugin (src/)
npm run build              # tsc → dist/
npm run dev                # tsc --watch
npm run typecheck          # tsc --noEmit (NodeNext, src/ only)
npm test                   # 10 test suites, sequential chain via tsx

# Dashboard app (app/)
npm run dev:app            # Vite dev server on port 5180
npm run build:app          # Vite build → dist/app/
npm run preview:app        # Preview production build
npm run typecheck:app      # tsc --noEmit -p tsconfig.app.json (Bundler, app/ only)

# Run a single test
npx tsx tests/task-graph.test.ts

# CLI (after npm link)
idumb-v2 init              # Interactive setup
idumb-v2 init -y           # Non-interactive defaults
```

**Important:** `npm test` chains 10 `tsx` commands with `&&`. If an early suite fails, later suites don't run. Run the failing suite individually when debugging.

## Architecture

### Two Codebases, Two Build Chains

This repo has two separate TypeScript projects with different module strategies:

| Aspect | `src/` (plugin/CLI) | `app/` (dashboard) |
|--------|---------------------|---------------------|
| tsconfig | `tsconfig.json` | `tsconfig.app.json` |
| Module | NodeNext | Bundler (ESNext) |
| Build | `tsc` → `dist/` | Vite → `dist/app/` |
| Runtime | Node.js | Browser (SPA) |
| Imports | `.js` extensions required | No extensions (Vite resolves) |
| Path aliases | None | `@/` → `app/` |

### Source Layout

```
src/                          # Plugin/CLI — Node.js, NodeNext modules
├── cli.ts                    # CLI entry point (npx idumb-v2)
├── cli/
│   ├── deploy.ts             # Deploys 3 agents + commands + modules
│   └── dashboard.ts          # Launches Vite dev server for app/
├── templates.ts              # Agent markdown templates (1463 LOC — needs split)
├── lib/                      # Shared utilities
│   ├── persistence.ts        # StateManager singleton — ALL disk I/O (1082 LOC)
│   ├── paths.ts              # BRAIN_PATHS constant (single source of truth)
│   ├── logging.ts            # TUI-safe file-based logger
│   ├── code-quality.ts       # Smell detection, A-F grading (719 LOC)
│   ├── framework-detector.ts # Brownfield scanner
│   ├── brain-indexer.ts      # Code map + project map population
│   ├── scaffolder.ts         # Creates .idumb/ directory tree
│   ├── state-reader.ts       # Read-only state utilities
│   ├── sqlite-adapter.ts     # SQLite storage (lazy-imported)
│   └── storage-adapter.ts    # Storage interface
├── schemas/                  # Zod schemas — canonical data definitions
│   ├── task-graph.ts         # v3 TaskNode, Checkpoint, TaskGraph (605 LOC)
│   ├── task.ts               # Legacy Epic/Task/Subtask hierarchy (517 LOC)
│   ├── planning-registry.ts  # Artifact tracking, tiers, chains (729 LOC)
│   ├── work-plan.ts          # WorkPlan lifecycle
│   ├── delegation.ts         # 3-agent hierarchy + category routing
│   ├── classification.ts     # Task complexity A/B/C routing
│   ├── wiki.ts               # Code change documentation
│   ├── coherent-knowledge.ts # Cross-session knowledge linking
│   ├── config.ts             # IdumbConfig, Language, GovernanceMode
│   ├── plan-state.ts         # MASTER-PLAN phase tracking
│   ├── anchor.ts             # Compaction-surviving context
│   ├── brain.ts              # Knowledge persistence (schema-only, not wired)
│   ├── project-map.ts        # Directory/file mapping (schema-only, not wired)
│   └── codemap.ts            # Symbol extraction (schema-only, not wired)
└── _archived-plugin/         # ARCHIVED — former plugin hooks + tools (not compiled)

app/                          # TanStack Start SPA — Browser, Bundler modules
├── vite.config.ts            # TanStack Start + Vite + Tailwind CSS v4
├── router.tsx                # TanStack Router config
├── routeTree.gen.ts          # Auto-generated route tree (do not edit)
├── routes/                   # File-based routing
│   ├── __root.tsx            # Root layout, CSS, EventStreamProvider
│   ├── index.tsx             # Dashboard landing
│   ├── chat.tsx              # Chat layout
│   ├── chat.$sessionId.tsx   # Chat session page
│   ├── ide.tsx               # IDE workspace (file tree + Monaco editor)
│   ├── tasks.tsx             # Tasks page
│   ├── settings.tsx          # Settings page
│   └── api/                  # SSE server routes
│       ├── events.ts         # Global event relay
│       └── sessions.$id.prompt.ts  # Chat streaming
├── server/                   # TanStack Start server functions
│   ├── sdk-client.server.ts  # OpenCode SDK client singleton
│   ├── sdk-validators.ts     # Zod boundary validators for SDK data
│   ├── sessions.ts           # Session CRUD + prompt
│   ├── config.ts             # Providers, agents, health
│   ├── files.ts              # File tree + read/write
│   ├── settings.ts           # Drizzle ORM settings
│   ├── engine.ts             # Engine lifecycle
│   └── validators.ts         # Shared Zod schemas
├── hooks/                    # React hooks
│   ├── useEngine.ts          # Engine status + start/stop
│   ├── useSession.ts         # Session management
│   ├── useStreaming.ts        # SSE chat streaming
│   ├── useEventStream.tsx    # Global SSE event provider
│   └── useFiles.ts           # File tree + operations
├── stores/                   # Zustand state
│   ├── ide-store.ts          # Tab/file management
│   └── layout-store.ts       # Panel layout (persisted)
├── shared/                   # Shared types
│   ├── engine-types.ts       # SDK type re-exports (single import point)
│   └── ide-types.ts          # IDE-specific app types
├── components/               # React components
│   ├── chat/                 # Chat UI
│   ├── editor/               # Monaco editor
│   ├── file-tree/            # File explorer
│   ├── ide/                  # IDE workspace
│   └── layout/               # Sidebar, engine status
├── db/                       # Drizzle ORM
│   ├── index.server.ts       # better-sqlite3 client (.server.ts = no client bundle)
│   └── schema.ts             # Settings table
├── lib/                      # Client utilities
│   ├── monaco-workers.ts     # Monaco web worker config
│   └── utils.ts              # Shared helpers
└── styles/
    └── app.css               # Tailwind v4 + custom styles
```

### Key Architectural Boundaries

- **`src/schemas/`** are pure data definitions — no side effects, no imports from hooks/tools
- **`src/lib/persistence.ts`** owns ALL `.idumb/brain/` disk I/O via `StateManager` singleton
- **`app/shared/engine-types.ts`** is the single import point for SDK types — never import `@opencode-ai/sdk` directly in `app/`
- **`app/server/*.server.ts`** files use `.server.ts` suffix to prevent Vite bundling native modules into the client
- **Vite externals**: `@opencode-ai/sdk` and `node:*` are externalized in `vite.config.ts` — they only run server-side

### 3-Agent System

Deployed to `.opencode/agents/` by `idumb-v2 init`:

| Agent | Role | Write Permission |
|-------|------|-----------------|
| `supreme-coordinator` | Orchestrator — delegates, never writes | No |
| `investigator` | Research, analysis, planning | Brain entries only |
| `executor` | Code implementation, builds, tests | Full write access |

Agent templates: `src/templates.ts`. Delegation routing: `src/schemas/delegation.ts`.

### Persistence (.idumb/brain/)

Runtime state created by `idumb-v2 init`:

| File | Purpose |
|------|---------|
| `config.json` | User settings (language, governance mode, experience) |
| `brain/state.json` | Session/anchor state, captured agent |
| `brain/tasks.json` | Legacy task store (Epic/Task/Subtask) |
| `brain/graph.json` | v3 task graph (WorkPlan/TaskNode) |
| `brain/plan.json` | Phase tracking |
| `brain/delegations.json` | Delegation records |
| `brain/registry.json` | Planning artifact registry |
| `brain/index/` | Codebase intelligence (populated by scan) |

### Init Guard

The CLI creates `.idumb/` on `idumb-v2 init`. The dashboard (`app/`) uses SDK-direct calls and does not require `.idumb/` to function.

## SDK Type Governance

Two-tier type system — binding for all development:

| Tier | Source | Rule |
|------|--------|------|
| **SDK types** (`@opencode-ai/sdk`) | Session, Message, Part, all Part subtypes | LAW. Never redefine. |
| **App types** (`app/shared/*.ts`) | EngineStatus, ProviderInfo, IdeTypes | Internal. Freely modifiable. |

**Import rule**: All `app/` code imports SDK types from `app/shared/engine-types.ts`, never directly from `@opencode-ai/sdk`.

**Banned patterns**: `as any` on SDK types, hand-rolling interfaces that duplicate SDK shapes, untyped `JSON.parse` on SDK data, optional chaining to hide type uncertainty. Use discriminated union narrowing instead.

**Known false alarms** (not bugs — have documented workarounds): See the False Alarm Registry in `AGENTS.md`.

## Testing

Hand-rolled test harness (no framework). Each test runs assertions on import via `tsx`:

```typescript
let passed = 0, failed = 0
function assert(condition: boolean, name: string) { ... }
assert(someFunction() === expected, "description")
if (failed > 0) process.exit(1)
```

**Current baseline:** 10 suites, 591 assertions. SQLite-dependent assertions are conditional (require native binding).

## Code Style

- ESM only (`"type": "module"`)
- `src/` imports use `.js` extension (NodeNext). `app/` imports use no extension (Bundler)
- Functions: `camelCase` | Types: `PascalCase` | Constants: `SCREAMING_SNAKE` | Files: `kebab-case.ts`
- Target 300-500 LOC per file. Files >500 LOC are flagged in AGENTS.md
- Zod for external data validation, plain interfaces for internal state
- Tailwind CSS v4 in `app/` — uses `@tailwindcss/vite` plugin, `@theme` inline pattern

## Key Dependencies

- `@opencode-ai/sdk` — OpenCode SDK for session management, AI streaming, file operations
- `zod` — Schema validation (standalone, v4.x)
- `better-sqlite3` — SQLite for Drizzle ORM and storage adapter (needs `npm rebuild` after Node version changes)
- `drizzle-orm` + `drizzle-kit` — Type-safe ORM for settings persistence
- `@tanstack/react-start` + `@tanstack/react-router` + `@tanstack/react-query` — Full-stack React framework
- `zustand` — Client state management (IDE tabs, panel layout)
- `monaco-editor` + `@monaco-editor/react` — Code editor (4MB chunk, manually isolated)
- `react-arborist` — File tree component
- `tailwindcss` v4 + `@tailwindcss/vite` — CSS framework
- `tsx` — Test runner (dev dependency)

## Archived Code

Plugin architecture was archived on 2026-02-10 (Phase 1A):

- `src/_archived-plugin/` — Former plugin entry point, hooks (tool-gate, compaction, message-transform, system), tools (tasks lifecycle verbs, anchor, init), SDK client
- `tests/_archived-plugin/` — 6 test files for archived plugin components
- These components will be reimplemented as SDK-direct calls from the dashboard backend

## Known Issues

- Plugin hooks and tools are **archived**, not active — SDK-direct reimplementation pending
- `templates.ts` at 1463 LOC needs splitting into per-agent modules
- `persistence.ts` at 1082 LOC needs extraction of TaskStore concerns
- Dashboard is functional (file tree, editor, chat, settings) but governance features are not wired

## Session Handoff

When resuming work:
1. Read `AGENTS.md` — ground truth for what exists
2. Read `.planning/ROADMAP.md` — active roadmap (execution order: 5→6→11→7→8→9→10)
3. Read `.planning/STATE.md` — current phase and position
4. Run `npm run typecheck` — must be zero errors
5. Run `npm test` — must pass 10 suites
