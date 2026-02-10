---
phase: 05-framework-foundation
plan: 06
status: complete
started: 2026-02-11
completed: 2026-02-11
gap_closure: true
provides: ["SSE route fix", "Express purge", "CLI Vite migration", "Runtime-verified Phase 5"]
---

# Phase 05 Plan 06: SSE Architecture Fix + Express Purge

## What Was Built

Closed the final Phase 5 blocker: SSE server routes were in `app/_server-routes/` (underscore prefix excluded them from TanStack Router's route tree). Moved to `app/routes/api/`. Additionally purged ALL Express dead code — the old backend was never cleaned up after migration.

## Key Changes

| Change | Detail |
|--------|--------|
| SSE route move | `_server-routes/` → `routes/api/` (events.ts, sessions.$id.prompt.ts) |
| Engine init fix | Added `ensureEngine()` before `getClient()` in both SSE handlers |
| Import fix | `app/server/*.ts` now imports from `app/shared/` (not deleted `src/dashboard/shared/`) |
| Express purge | Deleted `src/dashboard/backend/server.ts` (1427 LOC), `engine.ts` (235 LOC) |
| Frontend purge | Deleted `src/dashboard/frontend/` (153MB, 34 files) |
| Shared types purge | Deleted `src/dashboard/shared/` (types ported to `app/shared/`) |
| CLI rewrite | `dashboard.ts` launches Vite dev server (not Express) — 272 → 146 LOC |
| Deps removed | `express`, `cors`, `@types/express`, `@types/cors` from package.json |

## Commits

| Hash | Message |
|------|---------|
| 4a80901 | feat(05-06): move SSE routes into TanStack route tree + fix build |
| 29f8eaa | fix(05-06): purge Express — delete old backend/frontend, fix SSE engine init, update CLI to Vite |
| 5af3ed0 | docs(05-06): update AGENTS.md + STATE.md |

## Verification

- `npm test` — 512/512 assertions across 10 suites ✓
- `tsc --noEmit` — zero errors ✓
- `npm run build:app` — clean build ✓
- Runtime: SSE endpoints return `text/event-stream` ✓ (human-verified)
- Runtime: SPA loads with routing ✓ (human-verified)

## Self-Check: PASSED

All 4 Phase 5 success criteria verified:
1. ✓ SPA loads with file-based routing
2. ✓ Server functions return typed data (no Express)
3. ✓ SSE streaming works through server routes
4. ✓ Drizzle ORM reads/writes SQLite

## Deviations

- **Scope expansion**: Original plan was just SSE route move. Expanded to full Express purge because the old code was dead weight that no later phase planned to clean up. FND-02 requirement ("migrate Express routes") was incomplete without deleting the originals.
- **Net deletion**: 50 files changed, +62 / -9,069 lines. Phase 5's biggest cleanup.

## Key Files

### Created
- `app/routes/api/events.ts` (moved from `_server-routes/`)
- `app/routes/api/sessions.$id.prompt.ts` (moved from `_server-routes/`)

### Modified
- `app/server/sdk-client.server.ts` — import path fix
- `app/server/config.ts` — import path fix
- `src/cli/dashboard.ts` — full rewrite (Express → Vite)
- `package.json` — removed 4 dead dependencies

### Deleted
- `src/dashboard/backend/server.ts` (1427 LOC)
- `src/dashboard/backend/engine.ts` (235 LOC)
- `src/dashboard/frontend/` (34 files, 153MB)
- `src/dashboard/shared/engine-types.ts`
