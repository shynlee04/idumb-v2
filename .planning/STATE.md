# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-10)

**Core value:** Prove OpenCode SDK can power a full-featured self-hosted Code IDE with governed multi-agent workspace
**Current focus:** Phase 5 — Framework Foundation

## Current Position

Phase: 5 of 10 (Framework Foundation)
Plan: 1 of 3 in current phase
Status: In progress
Last activity: 2026-02-10 — Completed 05-01 TanStack Start SPA scaffold

Progress: [███░░░░░░░] 5%

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
- [05-01]: Retained express/cors in root deps until old backend fully replaced
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
| 5 | Framework Foundation | In Progress | 1/3 plans |
| 6 | IDE Shell | Pending | 0/3 plans |
| 7 | Chat + Terminal | Pending | 0/4 plans |
| 8 | Sessions + Diffs + Agents | Pending | 0/3 plans |
| 9 | Governance + Quick Wins | Pending | 0/3 plans |
| 10 | i18n Validation | Pending | 0/3 plans |

## Session Continuity

Last session: 2026-02-10
Stopped at: Completed 05-01-PLAN.md (TanStack Start SPA scaffold)
Resume file: None — next step is Plan 05-02 (component migration)

---
*State initialized: 2026-02-09*
*Updated: 2026-02-10 — Plan 05-01 complete (TanStack Start SPA scaffold)*
