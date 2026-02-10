---
phase: 05-framework-foundation
plan: 03
subsystem: database
tags: [drizzle-orm, sqlite, better-sqlite3, zod, server-functions, tanstack-start]

# Dependency graph
requires:
  - phase: 05-01
    provides: TanStack Start SPA scaffold with app/ directory structure and tsconfig.app.json
provides:
  - Drizzle ORM schema with settings + workspace_config tables
  - Database client singleton (better-sqlite3 + WAL mode)
  - Settings CRUD server functions (get/set/getAll/delete)
  - Shared type contracts (SettingsEntry, WorkspaceConfig, engine types)
  - Migration infrastructure (drizzle-kit + generated SQL)
affects: [05-04, 07-settings-ui, 06-workspace, dashboard-features]

# Tech tracking
tech-stack:
  added: [drizzle-orm@0.45.1, drizzle-kit@0.31.9, zod@4.3.6]
  patterns: [server-function-crud, drizzle-sqlite-singleton, zod-input-validation, server-file-suffix]

key-files:
  created:
    - app/db/schema.ts
    - app/db/index.server.ts
    - app/server/settings.ts
    - app/shared/engine-types.ts
    - app/shared/ide-types.ts
    - drizzle.config.ts
    - drizzle/0000_white_slyde.sql
  modified:
    - .gitignore

key-decisions:
  - "Standalone SDK types instead of @opencode-ai/sdk re-exports (SDK not installed)"
  - "WAL journal mode for better concurrent read performance"
  - "Used .inputValidator() not .validator() for TanStack Start v1.159.5 API"
  - ".server.ts suffix on database client to prevent client-side native module import"
  - "Zod v4 for input validation (Standard Schema compatible with TanStack validators)"

patterns-established:
  - "Server file suffix: database/native modules use .server.ts to prevent client bundling"
  - "Drizzle singleton: single db instance with WAL mode, auto-create data directory"
  - "CRUD server functions: createServerFn + .inputValidator(ZodSchema) + .handler()"
  - "Type contracts: shared interfaces in app/shared/ for server↔client boundary"

# Metrics
duration: ~15min
completed: 2026-02-10
---

# Phase 05 Plan 03: Shared Types + Drizzle Data Layer Summary

**Drizzle ORM SQLite data layer with settings CRUD server functions, shared type contracts, and migration infrastructure**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-02-10T14:16:39Z
- **Completed:** 2026-02-10T14:31:00Z
- **Tasks:** 2
- **Files created:** 7
- **Files modified:** 1

## Accomplishments

- Drizzle ORM schema with `settings` (key-value store) and `workspace_config` (multi-project) tables
- Database client singleton with WAL mode, auto-creating `.idumb/data/` directory
- 4 settings CRUD server functions with Zod validation and type-safe Drizzle queries
- Standalone engine types porting SDK interfaces without requiring `@opencode-ai/sdk` dependency
- Full migration infrastructure: drizzle-kit config + generated SQL + applied migration

## Task Commits

Each task was committed atomically:

1. **Task 1: Shared Types + Drizzle Schema + Database Client + Migrations** — `f6bedd6` (feat)
2. **Task 2: Settings Server Functions + Persistence Verification** — `817803b` (feat)

## Files Created/Modified

- `app/shared/engine-types.ts` — Standalone SDK-equivalent types (Session, Message, Part, Event, etc.)
- `app/shared/ide-types.ts` — Type contracts re-exporting engine types + SettingsEntry, WorkspaceConfig
- `app/db/schema.ts` — Drizzle schema: settings (key-value) + workspace_config (multi-project)
- `app/db/index.server.ts` — Database client singleton (better-sqlite3 + WAL + auto-mkdir)
- `drizzle.config.ts` — Drizzle Kit config (SQLite dialect, schema path, migration output)
- `drizzle/0000_white_slyde.sql` — Generated migration SQL
- `app/server/settings.ts` — 4 CRUD server functions: getSettingFn, setSettingFn, getAllSettingsFn, deleteSettingFn
- `.gitignore` — Added `.idumb/data/` exclusion

## Decisions Made

1. **Standalone SDK types** — `@opencode-ai/sdk` is not installed (empty `node_modules/@opencode-ai/` directory). Created standalone type definitions in `engine-types.ts` instead of re-exporting from SDK. This allows typecheck to pass and provides the same interfaces.
2. **WAL journal mode** — Enabled for better concurrent read performance when dashboard and CLI access the same database.
3. **`.inputValidator()` API** — TanStack Start v1.159.5 uses `.inputValidator()` method (not `.validator()` as some docs suggest). Confirmed from `@tanstack/start-client-core` type definitions.
4. **`.server.ts` suffix** — Database client file uses `.server.ts` suffix to prevent Vite/client bundling of `better-sqlite3` native module.
5. **Zod v4** — Installed Zod 4.3.6 which implements Standard Schema spec, compatible with TanStack's `.inputValidator()`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `@opencode-ai/sdk` not installed — standalone SDK types**
- **Found during:** Task 1 (shared types creation)
- **Issue:** Plan referenced porting types from `src/dashboard/shared/engine-types.ts` which used `import("@opencode-ai/sdk")` inline type imports. The SDK package is not installed.
- **Fix:** Created standalone type definitions mirroring SDK interfaces (Session, Message, Part, Event, SessionStatus, etc.)
- **Files modified:** `app/shared/engine-types.ts`
- **Verification:** `npx tsc --noEmit -p tsconfig.app.json` — no errors in this file
- **Committed in:** `f6bedd6` (Task 1 commit)

**2. [Rule 3 - Blocking] Missing dependencies not in package.json**
- **Found during:** Pre-task setup
- **Issue:** `drizzle-orm`, `drizzle-kit`, and `zod` were not in package.json
- **Fix:** Installed via `npm install drizzle-orm zod` and `npm install -D drizzle-kit`
- **Files modified:** `package.json`, `package-lock.json`
- **Verification:** All imports resolve, typecheck passes
- **Committed in:** `f6bedd6` (Task 1 commit)

**3. [Rule 3 - Blocking] better-sqlite3 native bindings not compiled**
- **Found during:** Task 1 (migration step)
- **Issue:** `npx drizzle-kit migrate` failed — native `.node` binding missing
- **Fix:** `npm rebuild better-sqlite3` to compile native bindings
- **Verification:** Migration succeeded, persistence test passed 6/6
- **Committed in:** N/A (build artifact, not tracked in git)

---

**Total deviations:** 3 auto-fixed (3 blocking issues)
**Impact on plan:** All auto-fixes necessary for task completion. No scope creep. All planned deliverables shipped.

## Issues Encountered

- Pre-existing typecheck errors in `app/server/config.ts`, `app/server/engine.ts`, `app/server/sessions.ts` (from parallel 05-02 plan) — these do NOT affect Plan 03 files
- LSP false-positive module resolution errors (LSP uses root tsconfig, not tsconfig.app.json) — confirmed clean via `npx tsc --noEmit -p tsconfig.app.json`

## User Setup Required

None — no external service configuration required. SQLite database auto-creates on first use.

## Next Phase Readiness

- Database layer complete — ready for settings UI (Phase 7) and workspace features (Phase 6+)
- Server functions ready to be called from TanStack Router loaders/actions
- Type contracts available for any `app/` consumer via `@/shared/ide-types`
- Schema is extensible — new Drizzle tables can be added to `app/db/schema.ts`

## Verification Results

All 9 plan-level checks passed:

| # | Check | Status |
|---|---|--------|
| 1 | app/shared/engine-types.ts exists | ✓ |
| 2 | app/shared/ide-types.ts exists | ✓ |
| 3 | app/db/schema.ts exists | ✓ |
| 4 | app/db/index.server.ts exists | ✓ |
| 5 | drizzle.config.ts exists | ✓ |
| 6 | app/server/settings.ts exists | ✓ |
| 7 | Migration files exist (drizzle/0000_white_slyde.sql) | ✓ |
| 8 | SQLite database exists (.idumb/data/idumb.db) | ✓ |
| 9 | Tables exist (settings, workspace_config, __drizzle_migrations) | ✓ |

---
*Phase: 05-framework-foundation*
*Completed: 2026-02-10*
