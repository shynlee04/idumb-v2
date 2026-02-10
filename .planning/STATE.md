# Project State

**Project:** iDumb — AI Knowledge Work Platform
**Current Phase:** Phase 1A - Plugin Demotion + Architecture Cleanup
**Status:** Phase 1A in progress (1/2 plans). Plan 01 (plugin archival) complete.
**Last Updated:** 2026-02-10

## Recent Activity

| Date | Phase | Activity |
|-------|-------|----------|
| 2026-02-10 | 01-01 | Backend engine + session proxy + SSE relay completed |
| 2026-02-10 | 01-03 / 01-04 | Chat streaming and task bus surfaces completed (wave 2) |
| 2026-02-10 | 01-05 | Governance bar + event stream + delegation threading completed (wave 3) |
| 2026-02-10 | 01-06 | Dashboard cards + sidebar polish completed |
| 2026-02-10 | 01 | Frontend type regressions fixed (`useEventStream`, `useSessionStatus`) |
| 2026-02-10 | 01-07 | Gap closure: 16 audit flaws fixed across backend, frontend, and docs |
| 2026-02-10 | 01-08 | UAT gap closure: chat viewport flex layout + agent normalization + 92-field data migration |
| 2026-02-10 | 01 | Viewport drift-up fix: scroll isolation + overflow containment (5 changes) |
| 2026-02-10 | 01 | UAT R2 complete: 10/10 tests passed. Phase 1 verified. |
| 2026-02-10 | 01-09 | Config proxy routes + ModelSelector dropdown (providers, agents, config, app) |
| 2026-02-10 | 01-10 | Settings page (4 tabs) + enhanced sidebar engine indicator |
| 2026-02-10 | PIVOT | **Architecture pivot: plugin demoted, SDK-direct, multi-agent workspace** |
| 2026-02-10 | AUDIT | Milestone audit: 7 active gaps, 4 deprecated by pivot. 3 gap closure phases created. |
| 2026-02-10 | 1A-01 | Plugin archival: 16 files archived, @opencode-ai/plugin removed, build + tests clean |

## Next Steps

1. **Execute Phase 1A Plan 02:** Doc drift fix — update AGENTS.md, CLAUDE.md, README.md, MASTER-PLAN.md
2. **Plan Phase 1B:** Dashboard feature completion — settings save, code quality, interactive inputs
3. **Plan Phase 1C:** Multi-agent workspace engine — agent spawning, multi-session, workspace controls
4. Then Phase 2: Planning Registry + Commit Governance

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-09)

**Core value:** OpenCode powers a multi-persona knowledge work UI where planning, research, delegation, and implementation flow through one governed system with full traceability
**Architecture:** OpenCode as Engine via SDK-direct calls from dashboard backend. Plugin system deprecated.
**Current focus:** Gap closure phases 1A → 1B → 1C → Phase 2

## Phase Status

| # | Phase | Status | Progress | Requirements |
|---|-------|--------|----------|--------------|
| 1 | Engine + Task Bus | ✓ Done | 100% (10/10 plans) | ENG-01*, ENG-02, ENG-03, DEL-01, DEL-04 |
| 1A | Plugin Demotion + Cleanup | ◐ In Progress | 50% (1/2 plans) | — (architecture) |
| 1B | Dashboard Feature Completion | ○ Pending | 0% | — (quality) |
| 1C | Multi-Agent Workspace Engine | ○ Pending | 0% | ENG-02 (full) |
| 2 | Planning Registry + Commit Governance | ○ Pending | 0% | REG-01, REG-02, DEL-02, DEL-03, WIKI-01, WIKI-02, WIKI-03 |
| 3 | Knowledge Engine | ○ Pending | 0% | REG-03, REG-04, KB-01, KB-02, KB-03, ENG-04 |
| 4 | UI Views + Source Synthesis | ○ Pending | 0% | UI-01, UI-02, UI-03, ENG-05 |

*ENG-01 re-scoped: governance via SDK-direct, not plugin hooks

## Active Work

Phase 1A Plan 01 complete (plugin archival). Plan 02 (doc drift fix) is next.

## Blockers

None.

## Structural Gaps (from Milestone Audit)

See `.planning/v1-MILESTONE-AUDIT.md` for full details.

| Gap | Phase | Severity |
|-----|-------|----------|
| ENG-01 plugin governance | 1A (archive) | Deprecated by pivot |
| Doc drift (AGENTS.md, test counts) | 1A | Major |
| Settings read-only | 1B | Major |
| Code quality stub | 1B | Major |
| Chat stubs (file attach, slash cmd) | 1B | Major |
| Agent spawning from UI | 1C | Major |
| Provider CRUD | Deferred | Minor |

## Recent Decisions

| Decision | When | Phase |
|----------|------|-------|
| Project pivoted from graph visualization to full knowledge-work platform | 2026-02-09 | Pre-Phase 1 |
| Start fresh — branch and aggressively clean existing codebase | 2026-02-09 | Pre-Phase 1 |
| OpenCode as engine (SDK + Server), not custom LLM backend | 2026-02-09 | Pre-Phase 1 |
| JSON files for state, not graph database — sufficient at ~1000 node scale | 2026-02-09 | Pre-Phase 1 |
| 4-phase roadmap: Engine -> Governance -> Knowledge -> UI | 2026-02-09 | Pre-Phase 1 |
| SC-4 scoped to passive delegation display; active orchestration deferred to Phase 2 | 2026-02-10 | Phase 1 |
| 01-07 gap closure: 16 audit flaws fixed (5 critical, 9 important, 2 discrepancy) | 2026-02-10 | Phase 1 |
| 01-08 agent normalization at source with defensive fallbacks in consumers | 2026-02-10 | Phase 1 |
| Runtime data files gitignored correctly; migration applied in-place, no git commit for data | 2026-02-10 | Phase 1 |
| Viewport drift-up: 5 scroll isolation fixes — scrollIntoView→scrollTop, overflow containment | 2026-02-10 | Phase 1 |
| Model override is per-prompt (SDK SessionPromptData), not per-session | 2026-02-10 | 01-09 |
| App info composed from path.get() + vcs.get() — SDK has no unified app.get() | 2026-02-10 | 01-09 |
| Custom dropdown for ModelSelector (no shadcn Select dependency) | 2026-02-10 | 01-09 |
| **ARCHITECTURE PIVOT: Plugin system demoted. SDK-direct. Multi-agent workspace.** | 2026-02-10 | Post-Phase 1 |
| 3 gap closure phases (1A, 1B, 1C) created from milestone audit | 2026-02-10 | Post-Phase 1 |
| git mv for plugin archival — preserves full file history | 2026-02-10 | 1A-01 |
| SDK client logging removed from logging.ts — file-only logging is sole mechanism | 2026-02-10 | 1A-01 |
| opencode.json plugin registration removed entirely from deploy.ts | 2026-02-10 | 1A-01 |

---
*State initialized: 2026-02-09*
