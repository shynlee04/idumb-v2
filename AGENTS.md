# AGENTS.md — iDumb v2 (Ground Truth)

**Version:** 8.0.0
**Last Updated:** 2026-02-10
**Status:** Phase 1A COMPLETE. Plugin archived, SDK-direct architecture. Schemas, CLI, dashboard, and 3-agent system intact. Phase 1B (dashboard features) next.

---

# NON-NEGOTIABLE RULES

## Core Integrity

1. **NO HALLUCINATION**: This file describes ONLY what exists. No features, files, or schemas that aren't implemented and tested.
2. **TUI SAFETY**: NO `console.log` anywhere. File-based logging via `lib/logging.ts`.
3. **CONTEXT-FIRST**: Gather context before executing. Read existing files before creating new ones.
4. **ANTI-REPETITION**: Check before creating. Prefer editing over creating.

## Development Cycle Discipline

5. **MULTI-CYCLE, NEVER ONE-SHOT**: No single cycle completes a phase. Every change follows: **Cycle 1** = implement → **Cycle 2** = iterate + integrate. Only after integration validation is a phase considered done.
6. **LOC DISCIPLINE**: Source files target 300-500 LOC. Files above 500 LOC are flagged for splitting. `templates.ts` (1463 LOC) is a known violation requiring future split.
7. **ALL CODE LIVES IN `src/`**: If a source file exists outside `src/`, move it in. Restructure, don't scatter.
8. **ATOMIC MEANINGFUL COMMITS**: One commit per task completion. Distinguish between: code changes, schema changes, test changes, documentation changes, and artifact updates.
9. **INCREMENTAL TESTING ONLY**: Tests must pass incrementally. Every new file gets a companion test. No logic goes unchecked. Schema-driven, type-strict, zero-debt.
10. **FILE TREE UPDATES MANDATORY**: Every commit that adds/removes/moves files MUST update the directory structure in this document.

## Plan Tracking & Conflict Protocol

11. **PLAN CHAIN IS SACRED**: Turn-based plans live in `planning/implamentation-plan-turn-based/`. Each has an `n`-suffix (n3, n4, n5, n6). The highest `n` is closest to current reality.
12. **CONFLICT = ALERT**: Any conflict between plans, code, or AGENTS.md must be surfaced immediately. Do NOT silently resolve.
13. **ITERATIVE PLAN UPDATES**: Plans are updated ONLY after Cycle 2 (integration cycle) of a phase implementation. Never update plans during Cycle 1 (initial implementation).

## Hand-Off Quality

14. **ALL OUTPUT = HAND-OFF READY**: Every artifact, walkthrough, and commit message must be instructive enough for a fresh agent to continue the work in a new context window. Hierarchical, structured, no ambiguity.

---

## What iDumb Is

**A standalone multi-agent workplace platform** that uses OpenCode as its AI engine via SDK-direct calls from the dashboard backend.

- **Level 1 (SDK-Direct Governance)**: Dashboard backend will control OpenCode SDK for governance — blocking writes without active tasks, preserving context, pruning stale outputs. **Currently: plugin hooks are archived in `src/_archived-plugin/`. SDK-direct reimplementation is planned for future phases.**
- **Level 2 (Agents)**: **3 innate agents** (supreme-coordinator, investigator, executor) — deployed via CLI, enforcing delegation workflows
- **Level 3 (Task Graph)**: v3 task graph system (WorkPlan→TaskNode→Checkpoint) with governed plan lifecycle and legacy Smart TODO (Epic→Task→Subtask) for backward compatibility. **Schemas intact, lifecycle verb tool implementations archived.**
- **Level 4 (Code Intelligence)**: Real-time code quality scanner with grading (A-F), smell detection, and roast commentary
- **Level 5 (Planning Registry)**: Schema-validated planning artifacts with tier hierarchy, chain versioning, section-level staleness tracking, and outlier detection

---

## Actual Directory Structure (What Exists)

```
v2/
├── bin/
│   └── cli.mjs                     # Shebang wrapper for npx idumb-v2
├── src/
│   ├── cli.ts                      # CLI entry point — npx idumb-v2 init (425 LOC)
│   ├── cli/
│   │   ├── deploy.ts               # Deploys 3 agents + 3 profiles + commands + modules (273 LOC)
│   │   └── dashboard.ts            # Dashboard server launcher (271 LOC)
│   ├── templates.ts                # All deployable templates — coordinator + investigator + executor (1463 LOC)
│   ├── _archived-plugin/           # ARCHIVED Phase 1A — plugin source code preserved
│   │   ├── index.ts                # Former plugin entry point (7 hooks + 7 tools)
│   │   ├── hooks/
│   │   │   ├── index.ts            # Barrel exports
│   │   │   ├── compaction.ts       # Anchor injection via output.context.push()
│   │   │   ├── message-transform.ts # DCP-pattern context pruning
│   │   │   └── system.ts           # Config-aware governance context
│   │   ├── tools/
│   │   │   ├── index.ts            # Barrel exports
│   │   │   ├── anchor.ts           # Context anchors surviving compaction
│   │   │   ├── init.ts             # Project initialization + code quality report
│   │   │   └── tasks.ts            # 5 lifecycle verbs
│   │   └── lib/
│   │       └── sdk-client.ts       # OpenCode SDK client singleton
│   ├── lib/
│   │   ├── index.ts                # Barrel exports
│   │   ├── logging.ts              # TUI-safe file-based logger
│   │   ├── framework-detector.ts   # Read-only brownfield scanner + code quality integration (445 LOC)
│   │   ├── code-quality.ts         # Code quality scanner — smell detection, grading (719 LOC)
│   │   ├── scaffolder.ts           # Creates .idumb/ directory tree + config.json
│   │   ├── persistence.ts          # StateManager — disk persistence (1082 LOC)
│   │   ├── paths.ts                # Shared BRAIN_PATHS constant (single source of truth)
│   │   ├── _archived-2026-02-08/   # Archived dead code: entity-resolver.ts (545), chain-validator.ts (300)
│   │   ├── state-reader.ts         # State reading utilities
│   │   ├── brain-indexer.ts        # Code map + project map population (382 LOC)
│   │   ├── sqlite-adapter.ts       # SQLite storage adapter for persistence (323 LOC)
│   │   └── storage-adapter.ts      # Storage adapter interface
│   ├── schemas/
│   │   ├── index.ts                # Barrel exports
│   │   ├── anchor.ts               # Anchor types, scoring, staleness, budget selection
│   │   ├── classification.ts       # Task complexity classification — Type A/B/C routing (168 LOC)
│   │   ├── config.ts               # IdumbConfig schema, Language, GovernanceMode
│   │   ├── coherent-knowledge.ts   # Cross-session knowledge linking — action records (235 LOC)
│   │   ├── task.ts                 # Smart TODO schema — Epic/Task/Subtask + WorkStream (517 LOC)
│   │   ├── task-graph.ts           # v3 task graph schema — TaskNode, Checkpoint, TaskGraph (605 LOC)
│   │   ├── wiki.ts                 # Wiki entry schema — code change documentation (153 LOC)
│   │   ├── work-plan.ts            # v3 work plan schema — WorkPlan lifecycle (291 LOC)
│   │   ├── delegation.ts           # Delegation schema — 3-agent hierarchy + category routing (363 LOC)
│   │   ├── planning-registry.ts    # Planning artifact registry — tiers, chains, sections (729 LOC)
│   │   ├── plan-state.ts           # Plan phase tracking — machine-readable MASTER-PLAN projection (138 LOC)
│   │   ├── brain.ts                # Brain entry schema — knowledge persistence
│   │   ├── project-map.ts          # Project map schema — directory/file mapping
│   │   └── codemap.ts              # Code map schema — symbol extraction (241 LOC)
│   └── dashboard/
│       ├── backend/
│       │   ├── server.ts           # Dashboard backend — Express + WebSocket + SSE (1427 LOC)
│       │   └── engine.ts           # OpenCode SDK engine bridge (235 LOC)
│       ├── frontend/
│       │   └── src/                # React + Vite dashboard app (34 .ts/.tsx files)
│       └── shared/
│           └── engine-types.ts     # Shared types between backend/frontend
├── tests/
│   ├── init.test.ts                # 65 assertions — all pass
│   ├── persistence.test.ts         # 43 core assertions (+SQLite when native binding available)
│   ├── task.test.ts                # 54 assertions — all pass
│   ├── delegation.test.ts          # 44 assertions — all pass
│   ├── planning-registry.test.ts   # 52 assertions — all pass
│   ├── work-plan.test.ts           # 56 assertions — all pass
│   ├── task-graph.test.ts          # 112 assertions — all pass
│   ├── plan-state.test.ts          # 40 assertions — all pass
│   ├── smoke-code-quality.ts       # Smoke test — runs scanner against own codebase
│   ├── sqlite-adapter.test.ts      # SQLite adapter tests (conditional on native binding)
│   └── _archived-plugin/           # ARCHIVED — 6 plugin-dependent test files
│       ├── anchor-tool.test.ts
│       ├── compaction.test.ts
│       ├── init-tool.test.ts
│       ├── message-transform.test.ts
│       ├── system.test.ts
│       └── tasks.test.ts
├── planning/
│   ├── implamentation-plan-turn-based/   # Turn-based plan chain (n3→n4→n5→n6)
│   ├── diagrams/                         # System architecture mind maps
│   ├── _archived-2026-02-08/             # Archived old plans
│   └── legacy-repo/                      # Legacy repo artifacts
├── docs/
│   ├── plans/                            # Design documents
│   ├── user-stories/                     # User story JSON artifacts
│   └── sdk-client-api.md                 # SDK client API reference
├── AGENTS.md                       # THIS FILE
├── CLAUDE.md                       # Claude-specific context
├── MASTER-PLAN.md                  # Planning SOT (Phases 1-10)
├── CHANGELOG.md
├── README.md
├── package.json
└── tsconfig.json
```

**Source LOC:** ~12,000 (backend + schemas + CLI, excluding dashboard frontend and node_modules)
**Test baseline:** `npm test` → **466 assertions** across **10** test suites (SQLite-dependent assertions run when native binding is available)
**TypeScript:** `tsc --noEmit` clean, zero errors
**Files above 500 LOC:** `templates.ts` (1463), `dashboard/backend/server.ts` (1427), `lib/persistence.ts` (1082), `schemas/planning-registry.ts` (729), `lib/code-quality.ts` (719), `schemas/task-graph.ts` (605), `schemas/task.ts` (517)

---

## What Works (Verified)

> **CAUTION:** "Verified" in this table means **unit tests pass**, not **verified in production**. Features marked as unit-tested may behave differently at runtime.

### Level 2: Agent System (3 Agents — CLI-deployed)

| Component | File | Evidence |
|---|---|---|
| **Coordinator agent** (L0) | `templates.ts` → `getCoordinatorAgent()` | Pure orchestrator, delegates everything, no direct writes |
| **Investigator agent** (L1) | `templates.ts` → `getInvestigatorAgent()` | Research, analysis, planning, brain entries |
| **Executor agent** (L1) | `templates.ts` → `getExecutorAgent()` | Code implementation, builds, tests, validation |
| **3 agent profiles** | `templates.ts` | `COORDINATOR_PROFILE`, `INVESTIGATOR_PROFILE`, `EXECUTOR_PROFILE` |
| **4 commands** | `templates.ts` | `/idumb-init`, `/idumb-settings`, `/idumb-status`, `/idumb-delegate` |
| **Agent contract schema** | `templates.ts` | OpenCode YAML frontmatter with permissions |
| **CLI deployment** | `cli/deploy.ts` | Deploys 3 agents + 4 commands + 3 profiles + 2 skills + modules |
| **Delegation schema** | `schemas/delegation.ts` | 3-agent hierarchy, category routing. 44/44 tests |

### Level 3: Task Graph + Smart TODO System

| Component | File | Evidence |
|---|---|---|
| **Task graph schema** | `schemas/task-graph.ts` | TaskNode, Checkpoint, TaskGraph. 112/112 tests |
| **Work plan schema** | `schemas/work-plan.ts` | WorkPlan lifecycle. 56/56 tests |
| **Legacy task schema** | `schemas/task.ts` | Epic/Task/Subtask, WorkStream categories, v1→v2 migration. 54/54 tests |
| **Wiki schema** | `schemas/wiki.ts` | Code change documentation — WikiEntry, WikiStore, query helpers |
| **Knowledge schema** | `schemas/coherent-knowledge.ts` | Cross-session action linking — CoherentKnowledgeEntry, stats |
| **Classification schema** | `schemas/classification.ts` | Task complexity routing — Type A/B/C |
| **Persistence** | `lib/persistence.ts` | StateManager — separate `tasks.json`, auto-migration. 43/43 tests |

### Level 4: Code Intelligence

| Component | File | Evidence |
|---|---|---|
| **Code quality scanner** | `lib/code-quality.ts` | 9 smell types, A-F grading, 42 roasts |
| **CLI integration** | `cli.ts` | Health grade box, stats, roasts |
| **Init test suite** | `tests/init.test.ts` | 65/65 tests |

### Level 5: Planning Registry

| Component | File | Evidence |
|---|---|---|
| **Planning Registry schema** | `schemas/planning-registry.ts` | 729 LOC. Tiers (T1-T3), artifact chains, section-level tracking, outlier detection |
| **Factory functions** | `schemas/planning-registry.ts` | `createPlanningArtifact`, `createArtifactSection`, `createArtifactChain`, `createPlanningRegistry`, `addOutlier` |
| **Helpers** | `schemas/planning-registry.ts` | `resolveChainHead`, `getChainHistory`, `findStaleSections`, `computeSectionHash`, `linkTaskToArtifact`, `findOutliers` |
| **Test file** | `tests/planning-registry.test.ts` | **52/52** assertions |

> **CAUTION:** Planning Registry is **schema + factory functions + outlier scan only**. Chain lifecycle and section-level staleness tracking are implemented as pure functions but are NOT wired into runtime hooks or tools. No chain updates happen automatically.

### Archived (Level 1: Plugin Hooks & Tools)

> **ARCHIVED Phase 1A (2026-02-10):** All plugin hooks and tool implementations have been moved to `src/_archived-plugin/` and `tests/_archived-plugin/`. The `@opencode-ai/plugin` dependency has been removed. These components will be reimplemented via SDK-direct calls from the dashboard backend in future phases.

| Component | Archived Location | Previous Evidence |
|---|---|---|
| Tool gate (write/edit blocking + shell safety) | _Deleted in Phase 9 R4 — was never archived_ | Previously 147/147 assertions |
| Compaction anchor injection | `_archived-plugin/hooks/compaction.ts` | 16/16 unit tests (archived) |
| Message transform (stale output pruning) | `_archived-plugin/hooks/message-transform.ts` | 13/13 unit tests (archived) |
| System governance context | `_archived-plugin/hooks/system.ts` | 43/43 unit tests (archived) |
| Lifecycle verb tools (tasks_start/done/check/add/fail) | `_archived-plugin/tools/tasks.ts` | 61/61 tests (archived) |
| Anchor tool (idumb_anchor) | `_archived-plugin/tools/anchor.ts` | 32/32 tests (archived) |
| Init tool (idumb_init) | `_archived-plugin/tools/init.ts` | 32/32 tests (archived) |
| Plugin entry point | `_archived-plugin/index.ts` | Wired 7 hooks + 7 tools |
| SDK client singleton | `_archived-plugin/lib/sdk-client.ts` | OpenCode SDK client |

---

## Agent Team (3 Agents — CLI-deployed on `idumb-v2 init`)

All agents are deployed to `.opencode/agents/` by `idumb-v2 init` via `cli/deploy.ts`. They do NOT exist until the user runs the init command in their target project.

| Agent | Level | Role |
|---|---|---|
| `idumb-supreme-coordinator` | 0 | Pure orchestrator — delegates, never writes |
| `idumb-investigator` | 1 | Research, analysis, planning, brain entries |
| `idumb-executor` | 1 | Code implementation, builds, tests |

**Delegation routing (from `delegation.ts`):**

| Category | Routes To |
|---|---|
| `development` | executor |
| `governance` | coordinator |
| `research` | investigator |
| `maintenance` | executor, investigator |
| `spec-kit` | investigator |
| `ad-hoc` | executor, investigator |

Reference profiles deployed to `.idumb/modules/agents/` as documentation.

---

## What Does NOT Work / Does NOT Exist Yet

| Item | Reality |
|---|---|
| SDK-direct governance | **Not implemented.** Plugin hooks archived. Write-blocking, compaction survival, and context pruning will be reimplemented via SDK-direct calls from the dashboard backend. |
| Runtime tool enforcement | **Archived.** The 7 custom tools (5 lifecycle verbs + anchor + init) existed as `@opencode-ai/plugin/tool()` implementations. They are in `_archived-plugin/tools/`. SDK-direct equivalents not yet built. |
| Dashboard integration with governance | **Frontend built.** Backend exists. Governance engine bridge (`engine.ts`) exists. Not connected to live governance enforcement. |
| Delegation runtime | **Schema done.** Full runtime delegation enforcement not wired. |
| Brain / wiki auto-population | **Schema done.** wiki.ts, coherent-knowledge.ts, classification.ts schemas created. Auto-population hooks NOT wired yet. |
| Multi-agent workspace | **Planned for Phase 1C.** Agent spawning from UI, multi-session management, workspace controls. |
| Settings persistence | **Read-only.** Settings page exists in dashboard but cannot save changes. Planned for Phase 1B. |

---

## Governance Modes

| Mode | Description |
|---|---|
| `strict` | Full enforcement — task required before every write |
| `standard` | Balanced — task required, warnings for minor violations |
| `relaxed` | Light governance — task tracking, no write-blocking |
| `retard` | Expert-only — maximum autonomy + savage roasts |

---

## Existing Pipeline: Init → Config → Deploy → Coordinator

```
npx idumb-v2 init
    │
    ├── Interactive CLI prompts (language, governance, experience, scope)
    │
    ├── Brownfield Scan (framework-detector.ts + code-quality.ts)
    │   ├── Framework detection + code quality scan (A-F grading)
    │   └── CLI output: health grade box, stats, issue breakdown, roasts
    │
    ├── deploy.ts (ALL agents + commands + modules pre-deployed)
    │   ├── .opencode/agents/ (3 agents: coordinator, investigator, executor)
    │   ├── .opencode/commands/ (4 commands: init, settings, status, delegate)
    │   ├── .idumb/modules/agents/ (3 agent reference profiles)
    │   ├── .idumb/modules/schemas/agent-contract.md
    │   ├── .idumb/modules/skills/ (delegation + governance protocols)
    │   ├── .idumb/modules/templates/command-template.md
    │   └── .idumb/modules/templates/workflow-template.md
    │
    └── Supreme Coordinator runs in OpenCode
        ├── Delegates research → @idumb-investigator
        ├── Delegates execution → @idumb-executor
        └── Validates completion before accepting
```

**This pipeline is COMPLETE and WORKING in CLI.** Agents deploy on `idumb-v2 init`.

---

## Plan Chain (Current)

Turn-based plans live in `planning/implamentation-plan-turn-based/`. Highest `n` = closest to reality.

| File | Type | Status |
|---|---|---|
| `implementation_plan-n3.md` | Implementation plan | Superseded |
| `implementation_plan-n4.md` | Implementation plan | Superseded |
| `implementation_plan-n5.md` | Implementation plan | Superseded |
| `implementation_plan-n6.md` | Implementation plan | **ACTIVE** — Schema-first governance redesign (3 iterations) |
| `intelligence-gap-analysis-implementation_plan-n5.md` | Gap analysis | Reference |
| `walkthrough-fe1.md` | Walkthrough | Dashboard frontend |
| `walkthrough-n2.md` | Walkthrough | Phase 0 |
| `walkthrough-n3.md` | Walkthrough | Phase 1b |
| `walkthrough-n3-2.md` | Walkthrough | Phase alpha2 |
| `walkthrough-n6.md` | Walkthrough | **LATEST** — 3-agent refactor |

---

## Roadmap

> **See `MASTER-PLAN.md` for the historical implementation plan (Phases 1-10).**
> **See `.planning/ROADMAP.md` for the current active roadmap (post-pivot).**

### Architecture Pivot (2026-02-10)

The project pivoted from an OpenCode plugin to a standalone multi-agent workplace platform. Plugin architecture is archived. New phases focus on SDK-direct governance via dashboard backend.

### Current Roadmap (Post-Pivot)

| # | Phase | Status |
|---|---|---|
| 1 | Engine + Task Bus (dashboard Phase 1) | DONE |
| 1A | Plugin Demotion + Architecture Cleanup | DONE |
| 1B | Dashboard Feature Completion | Pending |
| 1C | Multi-Agent Workspace Engine | Pending |
| 2 | Planning Registry + Commit Governance | Pending |
| 3 | Knowledge Engine | Pending |
| 4 | UI Views + Source Synthesis | Pending |

### Historical Phases (Completed — Pre-Pivot)

| Phase | Goal | Status |
|---|---|---|
| **Phase 0** | Smart TODO rewrite — 12 actions, 3-level hierarchy | **DONE** |
| **Phase 1b-beta** | Entity schemas + scan/codemap tools | **DONE** |
| **Phase alpha2** | Foundation fixes — WorkStream, chat.params, docs | **DONE** |
| **Phase delta2** | Delegation schema + validation | **DONE** |
| **Phase n6-Iter1** | 3-agent model refactor + planning registry schema | **DONE** |
| **Phase 9** | Lifecycle Verbs — 5 lifecycle verb tools + template rewrite | **DONE** |

---

## Known LOC Violations (> 500 LOC)

These files need future splitting. Listed in severity order:

| File | LOC | Recommended Split |
|---|---|---|
| `templates.ts` | 1463 | Split into `templates/coordinator.ts`, `templates/investigator.ts`, `templates/executor.ts`, `templates/modules.ts` |
| `dashboard/backend/server.ts` | 1427 | Extract route handlers into separate modules |
| `lib/persistence.ts` | 1082 | Extract TaskStore and SQLite concerns into separate modules |
| `schemas/planning-registry.ts` | 729 | Split schema types from helper functions |
| `lib/code-quality.ts` | 719 | Extract smell detectors into separate modules |
| `schemas/task-graph.ts` | 605 | Split schema definitions from factory/helper functions |
| `schemas/task.ts` | 517 | Split types from helpers |

---

## Code Style

- **TypeScript** with strict mode, ESM (`"type": "module"`)
- **NO console.log** — use `createLogger(directory, service)`
- **Graceful degradation** — critical paths wrapped in try/catch
- **Plain interfaces** — no Zod for internal state
- Functions: `camelCase` | Types: `PascalCase` | Constants: `SCREAMING_SNAKE` | Files: `kebab-case.ts`

---

## Development Commands

```bash
npm run build        # tsc
npm run dev          # tsc --watch
npm run typecheck    # tsc --noEmit
npm test             # 10 test suites via tsx (466 core assertions; SQLite-dependent assertions are conditional)
```

---

## Session Handoff

When resuming work:

1. Read `AGENTS.md` (this file) — it reflects what exists in the codebase
2. Read `.planning/ROADMAP.md` — the active roadmap (post-pivot)
3. Run `npm run typecheck` — must be zero errors
4. Run `npm test` — must pass baseline suites (10 suites, 466 assertions)
5. Check `.planning/STATE.md` for current phase and position
