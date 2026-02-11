# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-10)

**Core value:** Prove OpenCode SDK can power a full-featured self-hosted Code IDE with governed multi-agent workspace
**Current focus:** Phase 6 COMPLETE — IDE Shell (layout + file tree + Monaco editor + gap closure)

## Current Position

Phase: 6 of 10 (IDE Shell)
Plan: 4 of 4 in current phase (06-01 ✓, 06-02 ✓, 06-03 ✓, 06-04 ✓)
Status: Phase 6 fully complete — layout persistence, collapse sync, IDE nav link
Last activity: 2026-02-11 — 06-04 gap closure complete

Progress: [██████░░░░] 20%

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
| 6.01 (IDE Shell Foundation) | 3 tasks | 19 min | ~6 min |
| 6.02 (File Tree Explorer) | 2 tasks | ~15 min | ~7 min |
| 6.03 (Monaco Editor) | 2 tasks | 11 min | ~6 min |
| 6.04 (Gap Closure) | 2 tasks | 7 min | ~4 min |
**Recent Trend:**
- New milestone starting. No trend data for v2.0 yet.

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [06-04]: Zustand persist onFinishHydration + hasHydrated dual-path for reliable panel restore
- [06-04]: PanelSize.asPercentage <= 0.1 threshold for drag-based collapse detection
- [06-04]: Code2 lucide icon for IDE Shell navigation link
- [06-03]: Used readFileFn/writeFileFn (actual exports) instead of readFile/writeFile — plan had wrong names
- [06-03]: 20-model LRU cap for Monaco memory management
- [06-03]: SSR-safe lazy wrapper for Monaco (typeof window guard + React.lazy)
- [06-02]: Separate ide-store.ts for tab/file management, layout-store.ts for panel layout — separation of concerns
- [06-02]: window.prompt() for file name input in context menu (MVP — inline editing deferred)
- [06-02]: Broad query invalidation on delete/rename (fileKeys.all) since parent dir unknown
- [06-01]: Zustand v5 persist+immer for panel state — flat interface (no extends) for WritableDraft compat
- [06-01]: Nested Group pattern — horizontal (sidebar|editor-area) wraps vertical (editor|terminal)
- [06-01]: manualChunks for monaco-editor — isolate 4MB bundle into separate chunk
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
| 6 | IDE Shell | COMPLETE | 4/4 plans ✓ |
| 7 | Chat + Terminal | Pending | 0/4 plans |
| 8 | Sessions + Diffs + Agents | Pending | 0/3 plans |
| 9 | Governance + Quick Wins | Pending | 0/3 plans |
| 10 | i18n Validation | Pending | 0/3 plans |

## Session Continuity

Last session: 2026-02-11
Stopped at: Completed 06-04-PLAN.md — Gap Closure (layout persistence + IDE nav link). Phase 6 fully complete.
Resume file: .planning/phases/06-ide-shell/06-04-SUMMARY.md

---
*State initialized: 2026-02-09*
*Updated: 2026-02-11 — Phase 6 complete. IDE Shell with 3-panel layout, file tree, Monaco editor, layout persistence, IDE nav link.*
