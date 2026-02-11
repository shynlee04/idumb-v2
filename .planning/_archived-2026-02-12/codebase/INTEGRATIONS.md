# External Integrations

**Analysis Date:** 2026-02-09

## APIs & External Services

**OpenCode Plugin SDK (`@opencode-ai/plugin`):**
- The sole external integration point. iDumb v2 is a plugin that runs inside the OpenCode CLI host.
- SDK/Client: `@opencode-ai/plugin` ^1.1.52
- Auth: None required (plugin is loaded by host process)
- Integration point: `src/index.ts` exports a `Plugin` factory that receives `{ directory, client }` from the host
- Client type: `PluginInput["client"]` (aliased as `SdkClient` in `src/lib/sdk-client.ts`)
- Client capabilities used:
  - `client.app.log()` - Server-side logging (used in `src/lib/logging.ts`)
  - `client.find.files()` - File listing (experimental, used in `src/tools/init.ts` with graceful fallback)
- Client capabilities referenced but UNVERIFIED in live OpenCode:
  - `client.tui.showToast()` - TUI toast notifications
  - `client.tui.executeCommand()` - Execute TUI commands
  - `client.session.children` - Session tree access

**Plugin-Host Contract:**
- 5 event hooks registered with the host:
  - `event` - Session lifecycle events (`src/index.ts` line 75)
  - `experimental.session.compacting` - Context injection post-compaction (`src/hooks/compaction.ts`)
  - `experimental.chat.system.transform` - System prompt injection (`src/hooks/system.ts`)
  - `experimental.chat.messages.transform` - Message pruning/DCP (`src/hooks/message-transform.ts`)
  - `chat.params` - Agent identity capture on every chat turn (`src/index.ts` line 118)
- 7 tools registered with the host:
  - `tasks_start`, `tasks_done`, `tasks_check`, `tasks_add`, `tasks_fail` (`src/tools/tasks.ts`)
  - `idumb_anchor` (`src/tools/anchor.ts`)
  - `idumb_init` (`src/tools/init.ts`)
- Tool builder import: `import { tool } from "@opencode-ai/plugin/tool"`

**SDK Client Module (`src/lib/sdk-client.ts`):**
- Singleton pattern: `setClient()` called once at plugin init, `tryGetClient()` used everywhere else
- P3 graceful degradation: all SDK calls are wrapped in try/catch, returning null when unavailable
- Used by: `src/lib/logging.ts` (dual logging: file + SDK), `src/tools/init.ts` (file listing)

## Data Storage

**Primary: JSON Files (default backend)**
- Location: `.idumb/brain/` directory (paths defined in `src/lib/paths.ts`)
- Managed by: `StateManager` singleton in `src/lib/persistence.ts` (1083 LOC)
- Write strategy: Debounced (500ms), async fire-and-forget, in-memory authoritative
- Graceful degradation: If disk I/O fails, `degraded` flag is set, state remains in-memory

| File | Schema | Purpose |
|------|--------|---------|
| `.idumb/brain/state.json` | `PersistedStateSchema` | Session state + anchors |
| `.idumb/brain/tasks.json` | `TaskStoreSchema` | Legacy hierarchical tasks (Epic->Task->Subtask) |
| `.idumb/brain/graph.json` | `TaskGraphSchema` | v3 task graph (WorkPlan->TaskNode) |
| `.idumb/brain/delegations.json` | `DelegationStoreSchema` | Agent delegation records |
| `.idumb/brain/plan.json` | `PlanStateSchema` | MASTER-PLAN phase tracking |
| `.idumb/brain/knowledge.json` | `BrainStoreSchema` | Brain knowledge entries |
| `.idumb/brain/codemap.json` | `CodeMapStoreSchema` | Code symbol extraction |
| `.idumb/brain/project-map.json` | `ProjectMapSchema` | Directory/framework mapping |
| `.idumb/brain/registry.json` | - | Planning artifact registry |
| `.idumb/config.json` | `IdumbConfig` (Zod) | User settings + detection results |

**Legacy path migration:** `readWithLegacyFallback()` in `src/lib/persistence.ts` checks new paths first, falls back to legacy names (`hook-state.json`, `task-graph.json`, `plan-state.json`), auto-migrates on next write.

**Secondary: SQLite (feature-flagged)**
- Adapter: `src/lib/sqlite-adapter.ts` (323 LOC)
- Package: `better-sqlite3` ^11.10.0 (native C++ addon)
- Database file: `.idumb/brain/governance.db`
- Activation: `stateManager.init(directory, log, { sqlite: true })` — not active by default
- WAL mode for concurrent reads (dashboard) + writes (hooks)
- Synchronous reads on hot path (tool-gate)
- Tables: `sessions`, `anchors`, `task_store` (JSON blob), `delegation_store` (JSON blob), `schema_version`
- Schema version: 1
- Known issue: Requires `npm rebuild` after Node version changes

**Storage Adapter Interface (`src/lib/storage-adapter.ts`):**
- Abstract interface enabling JSON-to-SQLite migration without consumer changes
- Methods: session CRUD, anchor CRUD, task store CRUD, delegation CRUD, persistence lifecycle

**Dashboard Storage:**
- Comments stored in `.idumb/brain/comments.json` (managed by `src/dashboard/backend/server.ts`)
- Dashboard port discovery file: `.idumb/brain/dashboard-port.json`

**File Storage:**
- Log files: `.idumb/logs/{service}.log` (append-only, `writeFileSync` with `{ flag: "a" }`)
- Backup files: `.idumb/backups/` (created on dashboard artifact saves)

**Caching:**
- In-memory Maps in `StateManager` singleton (authoritative state)
- SQLite adapter caches `TaskStore` and `DelegationStore` in memory (`taskStoreCache`, `delegationStoreCache`)
- No external cache service (Redis, etc.)

## Authentication & Identity

**Auth Provider:**
- None. The plugin runs inside the OpenCode CLI process, which handles its own auth.
- Agent identity is captured via the `chat.params` hook (captures `input.agent` string per session)
- Stored in: `SessionState.capturedAgent` (per-session in `StateManager`)

## Monitoring & Observability

**Error Tracking:**
- No external service (Sentry, etc.)
- All errors logged to `.idumb/logs/` files via `createLogger()` in `src/lib/logging.ts`
- SDK-based logging (optional): `client.app.log()` sends structured logs to OpenCode host

**Logs:**
- File-based logging: `src/lib/logging.ts` (97 LOC)
- Log levels: `debug`, `info`, `warn`, `error` (numeric ordering 0-3)
- Log format: `[ISO-8601] [LEVEL] [service] message {meta}`
- Log location: `.idumb/logs/{service}.log` (inside `.idumb/`, NOT `.opencode/`)
- Dual output: file (always) + SDK `client.app.log()` (when available)
- CRITICAL: NO `console.log` anywhere — it breaks TUI rendering
- Graceful degradation: All log writes wrapped in try/catch

**Dashboard Observability:**
- Express backend at `src/dashboard/backend/server.ts` (794 LOC) serves REST API for governance state
- WebSocket (`ws`) broadcasts file change events to connected dashboard clients
- File watcher (`chokidar`) monitors `.idumb/brain/*.json` and `planning/**/*.md`

## CI/CD & Deployment

**Hosting:**
- Distributed as npm package (`idumb-v2`)
- `npm publish` with `"publishConfig": { "access": "public" }`

**CI Pipeline:**
- No CI/CD configuration detected in the v2 directory
- No `.github/workflows/`, `.gitlab-ci.yml`, or similar

**Deployment flow:**
1. User installs: `npm install idumb-v2` or uses `npx idumb-v2 init`
2. CLI scaffolds `.idumb/` directory + deploys agent files to `.opencode/agents/`
3. CLI updates `opencode.json` with plugin path
4. Plugin auto-loads when OpenCode starts (if `.idumb/` exists)

## Environment Configuration

**Required env vars:**
- None for core plugin operation

**Optional env vars:**
- `VITE_BACKEND_PORT` - Set by dashboard launcher (`src/cli/dashboard.ts`) for Vite proxy configuration

**Secrets location:**
- No secrets managed by the plugin
- No `.env` files present or referenced

## Webhooks & Callbacks

**Incoming:**
- No HTTP endpoints in the plugin itself (the plugin runs in-process)
- Dashboard backend (`src/dashboard/backend/server.ts`) exposes REST API endpoints:
  - `GET /api/health` - Health check
  - `GET /api/tasks` - TaskStore snapshot
  - `GET /api/graph` - TaskGraph snapshot
  - `GET /api/brain` - BrainStore snapshot
  - `GET /api/delegations` - DelegationStore snapshot
  - `GET /api/scan` - Project scan results
  - `GET /api/codemap` - CodeMapStore snapshot
  - `GET /api/artifacts` - List planning artifacts
  - `GET /api/artifacts/content` - Get artifact content
  - `PUT /api/artifacts/content` - Save artifact content (with backup)
  - `GET /api/artifacts/metadata` - File metadata
  - `GET/POST/PUT/DELETE /api/comments` - Comment CRUD
  - `WS /ws` - WebSocket for live updates

**Outgoing:**
- None. The plugin does not make outbound HTTP requests.

## Plugin-Host Hook Contract

The plugin communicates with the OpenCode host exclusively through the hook system:

| Hook Name | Module | Direction | Status |
|-----------|--------|-----------|--------|
| `event` | `src/index.ts` | Host -> Plugin | Verified |
| `chat.params` | `src/index.ts` | Host -> Plugin | Verified |
| `experimental.session.compacting` | `src/hooks/compaction.ts` | Bidirectional | Unit-tested only |
| `experimental.chat.system.transform` | `src/hooks/system.ts` | Bidirectional | Unit-tested only |
| `experimental.chat.messages.transform` | `src/hooks/message-transform.ts` | Bidirectional | Unit-tested only |

**Hook factory pattern:** Each hook module exports a factory function `createXxxHook(log)` that returns an async handler. All hooks are wrapped in try/catch for graceful degradation.

**Init guard:** `src/index.ts` checks for `.idumb/` directory existence before registering hooks. Returns `{}` (empty plugin) if uninitialized, preventing zombie directory creation.

## Brownfield Scanner

The `src/lib/framework-detector.ts` (446 LOC) is a read-only scanner that detects:
- Governance frameworks: BMAD, GSD, Spec-kit, Open-spec
- Tech stack: Next.js, Nuxt, SvelteKit, Astro, Remix, Angular, Vue, Express, NestJS, Django, Flask, Rails, Laravel, React, TypeScript, Python, Rust, Go
- Package managers: bun, pnpm, yarn, npm, pip, cargo, go
- Agent directories: `.opencode/agents`, `.claude/agents`, `.gemini/agents`, `.cursor/agents`, `.windsurf/skills`
- Monorepo markers: lerna, pnpm workspaces, turbo, nx, rush
- Code quality via `src/lib/code-quality.ts` (701 LOC): smell detection, A-F grading

This scanner runs during `idumb-v2 init` and the `idumb_init` tool. It never writes to the target project.

---

*Integration audit: 2026-02-09*
