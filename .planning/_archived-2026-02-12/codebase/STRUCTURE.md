# Codebase Structure

**Analysis Date:** 2026-02-09

## Directory Layout

```
v2/
├── src/                          # All source code (TypeScript)
│   ├── index.ts                  # Plugin entry point (176 LOC)
│   ├── cli.ts                    # CLI entry point for `npx idumb-v2` (453 LOC)
│   ├── templates.ts              # Agent/command markdown templates (1466 LOC)
│   ├── hooks/                    # Event handler modules
│   │   ├── index.ts              # Barrel export
│   │   ├── compaction.ts         # Compaction hook — anchor injection (130 LOC)
│   │   ├── system.ts             # System prompt transform (247 LOC)
│   │   └── message-transform.ts  # DCP context pruning (126 LOC)
│   ├── tools/                    # Tool implementations
│   │   ├── index.ts              # Barrel export
│   │   ├── tasks.ts              # 5 lifecycle verbs (299 LOC)
│   │   ├── anchor.ts             # Context anchor management (133 LOC)
│   │   └── init.ts               # Project initialization (526 LOC)
│   ├── lib/                      # Shared utilities
│   │   ├── index.ts              # Barrel export
│   │   ├── persistence.ts        # StateManager singleton (1082 LOC)
│   │   ├── logging.ts            # TUI-safe file logger (97 LOC)
│   │   ├── sdk-client.ts         # OpenCode SDK client holder (37 LOC)
│   │   ├── paths.ts              # Brain path constants (39 LOC)
│   │   ├── state-reader.ts       # Read-only state access (199 LOC)
│   │   ├── framework-detector.ts # Brownfield project scanner (445 LOC)
│   │   ├── code-quality.ts       # Code smell detector, A-F grading (719 LOC)
│   │   ├── scaffolder.ts         # .idumb/ directory creator (180 LOC)
│   │   ├── brain-indexer.ts      # Code/project map population (383 LOC)
│   │   ├── storage-adapter.ts    # StorageAdapter interface (57 LOC)
│   │   ├── sqlite-adapter.ts     # SQLite backend (feature-flagged) (323 LOC)
│   │   └── _archived-2026-02-08/ # Archived dead code
│   │       ├── entity-resolver.ts    # (545 LOC, excluded from build)
│   │       └── chain-validator.ts    # (300 LOC, excluded from build)
│   ├── schemas/                  # Data structure definitions
│   │   ├── index.ts              # Barrel export (155 LOC)
│   │   ├── anchor.ts             # Anchor types, scoring, selection
│   │   ├── brain.ts              # Brain knowledge entries (189 LOC)
│   │   ├── classification.ts     # Task A/B/C routing
│   │   ├── codemap.ts            # Symbol extraction (241 LOC)
│   │   ├── coherent-knowledge.ts # Cross-session knowledge (235 LOC)
│   │   ├── config.ts             # IdumbConfig, Language, GovernanceMode (250 LOC)
│   │   ├── delegation.ts         # 3-agent delegation records (363 LOC)
│   │   ├── plan-state.ts         # MASTER-PLAN phase tracking
│   │   ├── planning-registry.ts  # Artifact tracking, chains, outliers (729 LOC)
│   │   ├── project-map.ts        # Directory/framework mapping (193 LOC)
│   │   ├── task-graph.ts         # v3 WorkPlan graph operations (605 LOC)
│   │   ├── task.ts               # Legacy Epic→Task→Subtask (517 LOC)
│   │   ├── wiki.ts               # Code change documentation
│   │   └── work-plan.ts          # v3 WorkPlan/TaskNode interfaces (291 LOC)
│   ├── cli/                      # CLI subcommands
│   │   ├── deploy.ts             # Agent/command deployment (440 LOC)
│   │   └── dashboard.ts          # Dashboard launcher (271 LOC)
│   └── dashboard/                # Dashboard application
│       ├── backend/
│       │   └── server.ts         # Express + WebSocket server (793 LOC)
│       ├── frontend/
│       │   ├── src/
│       │   │   ├── App.tsx           # Root component
│       │   │   ├── main.tsx          # React entry
│       │   │   ├── lib/utils.ts      # Utility functions
│       │   │   ├── components/
│       │   │   │   ├── layout/       # DashboardLayout.tsx, Panel.tsx
│       │   │   │   ├── panels/       # TaskHierarchyPanel, TaskGraphPanel,
│       │   │   │   │                 # BrainKnowledgePanel, DelegationChainPanel,
│       │   │   │   │                 # PlanningArtifactsPanel
│       │   │   │   ├── artifacts/    # ArtifactViewer, ArtifactComments,
│       │   │   │   │                 # ArtifactMetadata, InlineEditor
│       │   │   │   └── ui/           # badge, button, card, scroll-area, separator
│       │   │   └── styles/
│       │   ├── vite.config.ts
│       │   └── dist/             # Pre-built frontend assets
│       └── shared/
│           ├── schema-types.ts   # Shared type definitions
│           └── comments-types.ts # Comment system types
├── tests/                        # Test suites (16 files)
│   ├── compaction.test.ts
│   ├── message-transform.test.ts
│   ├── system.test.ts
│   ├── init.test.ts
│   ├── persistence.test.ts
│   ├── task.test.ts
│   ├── delegation.test.ts
│   ├── planning-registry.test.ts
│   ├── work-plan.test.ts
│   ├── task-graph.test.ts
│   ├── plan-state.test.ts
│   ├── anchor-tool.test.ts
│   ├── init-tool.test.ts
│   ├── tasks.test.ts             # Lifecycle verb tests
│   ├── smoke-code-quality.ts
│   └── sqlite-adapter.test.ts
├── bin/
│   └── cli.mjs                   # CLI shebang wrapper
├── dist/                         # Compiled output (tsc → dist/)
├── docs/
│   └── plans/                    # Design documents and archives
├── planning/                     # Project planning artifacts
├── .idumb/                       # Runtime governance state (created by init)
│   ├── config.json               # User settings
│   ├── brain/                    # Persisted state files
│   │   ├── state.json            # Session/anchor state
│   │   ├── tasks.json            # Legacy task store
│   │   ├── graph.json            # v3 task graph
│   │   ├── plan.json             # Plan phase state
│   │   ├── delegations.json      # Delegation records
│   │   ├── knowledge.json        # Brain knowledge entries
│   │   ├── codemap.json          # Code symbol map
│   │   ├── project-map.json      # Project structure map
│   │   └── registry.json         # Planning artifact registry
│   ├── modules/                  # User-extensible module templates
│   ├── backups/                  # Config backups (from --force reinstall)
│   └── logs/                     # File-based logs
├── .opencode/                    # Deployed agent profiles and commands (created by init)
├── package.json                  # NPM package config
├── tsconfig.json                 # TypeScript config
├── opencode.json                 # OpenCode plugin registration
├── CLAUDE.md                     # Claude Code instructions
├── AGENTS.md                     # Feature ground truth
├── MASTER-PLAN.md                # Implementation roadmap
├── ARCHITECTURE.md               # Architecture documentation
└── README.md                     # Project documentation
```

## Directory Purposes

**`src/hooks/`:**
- Purpose: OpenCode event handlers that intercept session lifecycle
- Contains: 3 hook factory modules — compaction, system prompt, message transform
- Key files: `compaction.ts` (anchor injection), `system.ts` (governance context), `message-transform.ts` (token pruning)
- Naming: `{concern}.ts` — named after what they do, not the event name

**`src/tools/`:**
- Purpose: Agent-facing tools registered with OpenCode's tool system
- Contains: 3 tool modules — tasks (5 lifecycle verbs), anchor, init
- Key files: `tasks.ts` (core lifecycle verbs), `init.ts` (project bootstrap)
- Naming: `{domain}.ts` — named after what they manage

**`src/lib/`:**
- Purpose: Shared utilities consumed by hooks, tools, and CLI
- Contains: Persistence, logging, SDK client, framework detection, code quality, scaffolding
- Key files: `persistence.ts` (StateManager singleton), `logging.ts` (TUI-safe logger), `paths.ts` (brain file paths)
- Naming: `{capability}.ts` — named after what capability they provide

**`src/schemas/`:**
- Purpose: Canonical data structure definitions (Zod + plain TS interfaces)
- Contains: 14 schema modules covering all domain entities
- Key files: `work-plan.ts` (core v3 interfaces), `task-graph.ts` (graph operations), `config.ts` (IdumbConfig)
- Naming: `{entity}.ts` — named after the domain entity they define

**`src/cli/`:**
- Purpose: CLI subcommands beyond the main init flow
- Contains: Agent deployment logic, dashboard launcher
- Key files: `deploy.ts` (writes agents/commands to `.opencode/`), `dashboard.ts` (spawns dashboard server)

**`src/dashboard/`:**
- Purpose: Visual governance dashboard (not integrated into main plugin workflow)
- Contains: Express backend API, React frontend with 5 panels
- Key files: `backend/server.ts` (API + WebSocket), `frontend/src/App.tsx` (root component)
- Excluded from main TypeScript build

**`tests/`:**
- Purpose: Unit and integration test suites
- Contains: 16 test files using hand-rolled test harness (no framework)
- Key files: `tasks.test.ts` (lifecycle verbs), `compaction.test.ts`, `persistence.test.ts`
- Naming: `{module}.test.ts` — mirrors the source module being tested

**`.idumb/`:**
- Purpose: Runtime governance state directory (created by `idumb-v2 init`)
- Contains: config.json, brain/*.json state files, modules/, backups/, logs/
- Generated: Yes (by CLI and init tool)
- Committed: No (gitignored)

**`.opencode/`:**
- Purpose: Deployed agent profiles and commands (consumed by OpenCode host)
- Contains: Agent markdown files, command definitions
- Generated: Yes (by `cli/deploy.ts`)
- Committed: Partially (some files are gitignored)

## Key File Locations

**Entry Points:**
- `src/index.ts`: Plugin factory — hook + tool wiring (loaded by OpenCode)
- `src/cli.ts`: CLI entry — interactive init and dashboard subcommand
- `bin/cli.mjs`: Shebang wrapper for `npx idumb-v2`
- `src/dashboard/backend/server.ts`: Dashboard API server

**Configuration:**
- `tsconfig.json`: TypeScript compiler config (ES2022, NodeNext, strict)
- `package.json`: NPM package definition, test scripts, dependencies
- `opencode.json`: OpenCode plugin registration
- `src/lib/paths.ts`: All `.idumb/brain/` file path constants (single source of truth)

**Core Logic:**
- `src/tools/tasks.ts`: 5 lifecycle verb tools — the primary agent API
- `src/lib/persistence.ts`: StateManager singleton — all state management
- `src/hooks/compaction.ts`: Context preservation across session compaction
- `src/hooks/system.ts`: Governance context injection into system prompt
- `src/schemas/work-plan.ts`: WorkPlan/TaskNode/Checkpoint interfaces
- `src/schemas/task-graph.ts`: Graph operations (find, validate, migrate, format)

**Templates:**
- `src/templates.ts`: All agent/command markdown templates (1466 LOC — largest file)

**Testing:**
- `tests/tasks.test.ts`: Lifecycle verb tool tests
- `tests/compaction.test.ts`: Compaction hook tests
- `tests/persistence.test.ts`: StateManager tests

## Naming Conventions

**Files:**
- Source modules: `kebab-case.ts` (e.g., `task-graph.ts`, `message-transform.ts`, `code-quality.ts`)
- Test files: `{module}.test.ts` (e.g., `task-graph.test.ts`, `compaction.test.ts`)
- Barrel exports: `index.ts` in each directory
- Archived files: `_archived-{date}/` directory with original filenames

**Directories:**
- Lowercase, hyphenated when needed (e.g., `src/hooks/`, `src/lib/`, `src/cli/`)
- Layer-based organization: hooks, tools, lib, schemas, cli, dashboard

**Functions:**
- `camelCase` (e.g., `createWorkPlan`, `getActiveWorkChain`, `formatTaskGraph`)
- Factory functions: `create{Thing}Hook(log)` or `create{Thing}(options)`
- Validators: `validate{Thing}()` (e.g., `validateTaskCompletion`, `validateConfig`)

**Types/Interfaces:**
- `PascalCase` (e.g., `TaskNode`, `WorkPlan`, `GovernanceStatus`, `Anchor`)

**Constants:**
- `SCREAMING_SNAKE` (e.g., `BRAIN_PATHS`, `INJECTION_BUDGET_CHARS`, `KEEP_RECENT`)
- Version constants: `{DOMAIN}_VERSION` (e.g., `TASK_GRAPH_VERSION`, `BRAIN_STORE_VERSION`)

**Schemas:**
- Zod schemas: `{Name}Schema` (e.g., `PersistedStateSchema`, `TaskStoreSchema`)
- Type derivation: `type Foo = z.infer<typeof FooSchema>`

## Import Organization

**Order:**
1. Node.js built-ins (`node:fs`, `node:path`, `node:crypto`)
2. External packages (`@opencode-ai/plugin`, `zod`, `express`)
3. Internal schemas (`../schemas/index.js`, `../schemas/config.js`)
4. Internal lib (`../lib/persistence.js`, `../lib/logging.js`)
5. Internal hooks (only when cross-referencing, e.g., anchor.ts → compaction.ts)

**Path Aliases:**
- None used — all imports are relative paths with `.js` extension (NodeNext resolution)
- Barrel exports in each directory (`index.ts`) allow short imports like `"../schemas/index.js"`

## Where to Add New Code

**New Hook:**
1. Create `src/hooks/{name}.ts` following the factory pattern: `export function create{Name}Hook(log: Logger) { return async (input, output) => { ... } }`
2. Export from `src/hooks/index.ts`
3. Import and wire in `src/index.ts`
4. Add test at `tests/{name}.test.ts`

**New Tool:**
1. Create `src/tools/{name}.ts` using `tool()` from `@opencode-ai/plugin/tool`
2. Export from `src/tools/index.ts`
3. Import and register in `src/index.ts` under the `tool: { }` object
4. Add test at `tests/{name}.test.ts`
5. Follow lifecycle verb design: 1 arg max, 1-line output, context inference

**New Schema:**
1. Create `src/schemas/{entity}.ts` with Zod schemas and/or plain TypeScript interfaces
2. Include factory functions (`create{Entity}`), validators, formatters
3. Export from `src/schemas/index.ts`
4. Add test at `tests/{entity}.test.ts`

**New Library Module:**
1. Create `src/lib/{capability}.ts`
2. Export from `src/lib/index.ts`
3. Follow P3 pattern: wrap all external I/O in try/catch with graceful fallbacks

**New State Store:**
1. Define schema in `src/schemas/{entity}.ts`
2. Add path constant to `src/lib/paths.ts` under `BRAIN_PATHS`
3. Add private field + getter/setter + scheduled save to `src/lib/persistence.ts` (StateManager)
4. Add load logic in `StateManager.init()`
5. Add Zod validation schema for disk reads

**New Dashboard Panel:**
1. Create React component at `src/dashboard/frontend/src/components/panels/{Name}Panel.tsx`
2. Add API endpoint in `src/dashboard/backend/server.ts`
3. Import and render in `src/dashboard/frontend/src/App.tsx`

**New CLI Subcommand:**
1. Create `src/cli/{command}.ts` with exported async function
2. Add dynamic import + dispatch in `src/cli.ts` main() function

## Special Directories

**`.idumb/brain/`:**
- Purpose: Persisted governance state (8+ JSON files)
- Generated: Yes (by init and StateManager at runtime)
- Committed: No (gitignored)
- Contains: state.json, tasks.json, graph.json, plan.json, delegations.json, knowledge.json, codemap.json, project-map.json, registry.json

**`.idumb/logs/`:**
- Purpose: File-based logs (append-only)
- Generated: Yes (by createLogger at runtime)
- Committed: No (gitignored)

**`src/lib/_archived-2026-02-08/`:**
- Purpose: Archived dead code (entity-resolver.ts, chain-validator.ts — 845 LOC total)
- Generated: No
- Committed: Yes (but excluded from TypeScript build via tsconfig.json)
- Note: To be restored when entity-level governance is wired

**`dist/`:**
- Purpose: Compiled JavaScript output from `tsc`
- Generated: Yes (`npm run build`)
- Committed: Yes (needed for npm distribution)

**`src/dashboard/frontend/dist/`:**
- Purpose: Pre-built React frontend assets
- Generated: Yes (Vite build)
- Committed: Yes (served by dashboard backend)

---

*Structure analysis: 2026-02-09*
