# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-10)

**Core value:** Prove OpenCode SDK can power a full-featured self-hosted Code IDE with governed multi-agent workspace
**Current focus:** Phase 5 COMPLETE — ready for Phase 6

## Current Position

Phase: 5 of 10 (Framework Foundation)
Plan: 6 of 6 in current phase (05-01 ✓, 05-02 ✓, 05-03 ✓, 05-04 ✓, 05-05 ✓ bonus, 05-06 ✓)
Status: Phase 5 COMPLETE — all 4 success criteria runtime-verified
Last activity: 2026-02-11 — 05-06 complete, Express purged, SSE verified at runtime

Progress: [████░░░░░░] 8%

## Performance Metrics

**Velocity:**
- Total plans completed: 12 (Phases 1 + 1A from previous milestone)
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 (Engine + Task Bus) | 10 | — | — |
| 1A (Plugin Demotion) | 2 | — | — |
| 5.01 (TanStack Scaffold) | 8 tasks | 25 min | 3 min |
| 5.02 (Server Functions) | 3 tasks | ~26 min | ~9 min |
| 5.03 (Drizzle Data Layer) | 2 tasks | ~15 min | ~7 min |
| 5.04 (SPA Hydration Fix) | 3 tasks | ~20 min | ~7 min |
| 5.05 (Chat UI - Phase 7 bonus) | 6 tasks | ~15 min | ~3 min |
**Recent Trend:**
- New milestone starting. No trend data for v2.0 yet.

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v2.0]: 2-stage validation — Code IDE (Stage 1, Phases 5-8) then governance differentiators (Phase 9) + i18n (Phase 10)
- [v2.0]: TanStack Start (SPA mode) replaces Express + React Router — highest risk, validated first in Phase 5
- [05-01]: TanStack Start SPA: spa.enabled=true + getRouter export name (not createRouter) — validated against source types
- [05-06]: Express fully purged — server.ts (1427 LOC), engine.ts (235 LOC), frontend/ (34 files), shared/, deps (express, cors, @types/*) all deleted
- [05-06]: CLI dashboard.ts rewritten — launches Vite dev server instead of Express
- [05-06]: SSE routes require ensureEngine() before getClient() — engine is lazy-initialized on first request
- [05-06]: app/server/*.ts imports from app/shared/ (not src/dashboard/shared/ which is deleted)
- [05-03]: Standalone SDK types — @opencode-ai/sdk not installed, created app/shared/engine-types.ts
- [05-03]: .server.ts suffix for database client — prevents Vite/client bundling of native modules
- [05-03]: .inputValidator() not .validator() for TanStack Start v1.159.5 server functions
- [05-03]: WAL journal mode for better-sqlite3 concurrent read performance
- [05-02]: Installed @opencode-ai/sdk (was missing from deps) — needed for server function layer
- [05-02]: SSE via server route handlers (as any spread) — server functions use NDJSON breaking SSE
- [05-02]: EventStreamProvider wraps app at __root.tsx level for global SSE access
- [v2.0]: Drizzle ORM replaces Payload CMS — schema-first SQLite
- [v2.0]: WebSocket only for terminal PTY, everything else via server functions or SSE
- [v2.0]: Schema budget: max 50 LOC per feature, must have consumer in same phase

### Pending Todos

1. **Support OpenCode ecosystem plugins and custom tools in SDK migration** (planning) — Ensure SDK-direct reimplementation composes with third-party OpenCode plugins and custom tools rather than creating a closed system. [2026-02-10]

### Blockers/Concerns

- TanStack Start is RC — SSE streaming via server routes must be validated in Phase 5 before features build on it
- Monaco DiffEditor memory leak (#4659) — disposal patterns required from Phase 6 onward
- Vietnamese Telex IME Monaco bug (#4805) — must be tested in Phase 10
- 3-week timebox for Stage 1 (Phases 5-8) — monitor velocity after Phase 5

## Phase Status (v2.0 Milestone)

| # | Phase | Status | Progress |
|---|-------|--------|----------|
| 5 | Framework Foundation | COMPLETE | 6/6 plans ✓ |
| 6 | IDE Shell | Pending | 0/3 plans |
| 7 | Chat + Terminal | Pending | 0/4 plans |
| 8 | Sessions + Diffs + Agents | Pending | 0/3 plans |
| 9 | Governance + Quick Wins | Pending | 0/3 plans |
| 10 | i18n Validation | Pending | 0/3 plans |

## Session Continuity

Last session: 2026-02-11
Stopped at: Phase 5 COMPLETE. All 6 plans done, 4 success criteria runtime-verified. Ready for Phase 6: IDE Shell.
Resume file: .planning/ROADMAP.md

---
*State initialized: 2026-02-09*
*Updated: 2026-02-11 — Phase 5 COMPLETE. 6/6 plans, runtime verified. Express fully purged.*
