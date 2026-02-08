# AGENTS.md — iDumb v2 (Ground Truth)

**Version:** 7.0.0
**Last Updated:** 2026-02-08
**Status:** Phase 0 COMPLETE. Phase 1b-β tools DONE. Phase α2 foundation DONE. Phase δ2 delegation DONE. Phase n6 3-agent refactor DONE. Planning Registry schema + integration DONE. v3 governance tools (govern_plan, govern_task, govern_delegate, govern_shell) DONE.

---

# NON-NEGOTIABLE RULES

## Core Integrity

1. **NO HALLUCINATION**: This file describes ONLY what exists. No features, files, or schemas that aren't implemented and tested.
2. **TUI SAFETY**: NO `console.log` anywhere. File-based logging via `lib/logging.ts`.
3. **CONTEXT-FIRST**: Gather context before executing. Read existing files before creating new ones.
4. **ANTI-REPETITION**: Check before creating. Prefer editing over creating.

## Development Cycle Discipline

5. **MULTI-CYCLE, NEVER ONE-SHOT**: No single cycle completes a phase. Every change follows: **Cycle 1** = implement → **Cycle 2** = iterate + integrate. Only after integration validation is a phase considered done.
6. **LOC DISCIPLINE**: Source files target 300-500 LOC. Files above 500 LOC are flagged for splitting. Tools can nest tools -- group related functionality. `templates.ts` (1482 LOC) is a known violation requiring future split.
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

An OpenCode plugin + agent system that enforces governance on AI agents by:
- **Level 1 (Plugin)**: Blocking file writes without an active task, preserving context across compaction, pruning stale tool outputs
- **Level 2 (Agents)**: **3 innate agents** (supreme-coordinator, investigator, executor) — all auto-deployed on install, enforcing delegation workflows
- **Level 3 (Task Graph)**: v3 task graph system (WorkPlan→TaskNode→Checkpoint) with governed plan lifecycle (create, plan_tasks, status, archive, abandon), task lifecycle (start, complete, fail, status, review), and legacy Smart TODO (Epic→Task→Subtask) for backward compatibility
- **Level 4 (Code Intelligence)**: Real-time code quality scanner with grading (A-F), smell detection, and roast commentary
- **Level 5 (Planning Registry)**: Schema-validated planning artifacts with tier hierarchy, chain versioning, section-level staleness tracking, and outlier detection

All "intelligence" is manufactured from deterministic hooks (Level 1), structured agent prompts (Level 2), hierarchical task governance (Level 3), static code analysis (Level 4), and schema-regulated planning (Level 5) — not LLM reasoning.

---

## Actual Directory Structure (What Exists)

```
v2/
├── bin/
│   └── cli.mjs                     # Shebang wrapper for npx idumb-v2
├── src/
│   ├── cli.ts                      # CLI entry point — npx idumb-v2 init (431 LOC)
│   ├── cli/
│   │   ├── deploy.ts               # Deploys 3 agents + 3 profiles + commands + modules + planning registry bootstrap (408 LOC)
│   │   └── dashboard.ts            # Dashboard server launcher
│   ├── templates.ts                # All deployable templates — coordinator + investigator + executor (1482 LOC ⚠️)
│   ├── index.ts                    # Plugin entry — wires 7 hooks + 6 tools (single plugin, 196 LOC)
│   ├── hooks/
│   │   ├── index.ts                # Barrel exports
│   │   ├── tool-gate.ts            # VALIDATED — blocks write/edit without active task
│   │   ├── compaction.ts           # Unit-tested — anchor injection via output.context.push()
│   │   ├── message-transform.ts    # Unit-tested — DCP-pattern context pruning
│   │   └── system.ts               # Unit-tested — config-aware governance context (UNVERIFIED in live OpenCode)
│   ├── lib/
│   │   ├── index.ts                # Barrel exports
│   │   ├── logging.ts              # TUI-safe file-based logger
│   │   ├── framework-detector.ts   # Read-only brownfield scanner + code quality integration (445 LOC)
│   │   ├── code-quality.ts         # Code quality scanner — smell detection, grading (701 LOC ⚠️)
│   │   ├── scaffolder.ts           # Creates .idumb/ directory tree + config.json
│   │   ├── persistence.ts          # StateManager — disk persistence for hook state + TaskStore (584 LOC ⚠️)
│   │   ├── _archived-2026-02-08/   # Archived dead code: entity-resolver.ts (545), chain-validator.ts (300)
│   │   ├── state-reader.ts         # State reading utilities
│   │   ├── sdk-client.ts           # OpenCode SDK client singleton for shared hook/tool access (47 LOC)
│   │   ├── sqlite-adapter.ts       # SQLite storage adapter for persistence (318 LOC)
│   │   └── storage-adapter.ts      # Storage adapter interface (51 LOC)
│   ├── schemas/
│   │   ├── index.ts                # Barrel exports (15 functions + 7 types from task.ts)
│   │   ├── anchor.ts               # Anchor types, scoring, staleness, budget selection
│   │   ├── config.ts               # IdumbConfig schema, Language, GovernanceMode, etc.
│   │   ├── task.ts                 # Smart TODO schema — Epic/Task/Subtask + WorkStream categories (530 LOC ⚠️)
│   │   ├── task-graph.ts           # v3 task graph schema — TaskNode, Checkpoint, TaskGraph (605 LOC ⚠️)
│   │   ├── work-plan.ts            # v3 work plan schema — WorkPlan lifecycle (291 LOC)
│   │   ├── delegation.ts           # Delegation schema — 3-agent hierarchy + category routing (363 LOC)
│   │   ├── planning-registry.ts    # Planning artifact registry — tiers, chains, sections, outliers (729 LOC ⚠️)
│   │   ├── brain.ts                # Brain entry schema — knowledge persistence
│   │   ├── project-map.ts          # Project map schema — directory/file mapping
│   │   └── codemap.ts              # Code map schema — symbol extraction
│   ├── tools/
│   │   ├── index.ts                # Barrel exports
│   │   ├── anchor.ts               # idumb_anchor — context anchors surviving compaction (86 LOC)
│   │   ├── govern-plan.ts          # govern_plan — work plan management: create, plan_tasks, status, archive, abandon (279 LOC)
│   │   ├── govern-task.ts          # govern_task — task lifecycle: start, complete, fail, status, review (307 LOC)
│   │   ├── govern-delegate.ts      # govern_delegate — structured delegation: assign, recall, status (243 LOC)
│   │   ├── govern-shell.ts         # govern_shell — governed shell execution with classification (231 LOC)
│   │   └── init.ts                 # idumb_init — project initialization + code quality report + planning outlier detection (441 LOC)
│   ├── modules/
│   │   ├── agents/                 # Module agent templates
│   │   ├── commands/               # Module command templates
│   │   └── schemas/                # Module schema templates
│   └── dashboard/
│       ├── backend/
│       │   └── server.ts           # Dashboard backend — Express server (721 LOC ⚠️)
│       ├── frontend/
│       │   └── src/                # React + Vite dashboard app
│       └── shared/
│           └── types.ts            # Shared types between frontend and backend
├── tests/
│   ├── tool-gate.test.ts           # 93 assertions — all pass ✅
│   ├── compaction.test.ts          # 16 assertions — all pass ✅
│   ├── message-transform.test.ts   # 13 assertions — all pass ✅
│   ├── system.test.ts              # 43 assertions — all pass ✅
│   ├── init.test.ts                # 60 assertions — all pass ✅
│   ├── persistence.test.ts         # 91 assertions — all pass ✅
│   ├── task.test.ts                # 54 assertions — all pass ✅
│   ├── delegation.test.ts          # 44 assertions — all pass ✅
│   ├── planning-registry.test.ts   # 52 assertions — all pass ✅
│   ├── work-plan.test.ts           # 56 assertions — all pass ✅
│   ├── task-graph.test.ts          # 96 assertions — all pass ✅
│   ├── sqlite-adapter.test.ts      # SQLite adapter tests (standalone, not in npm test)
│   └── smoke-code-quality.ts       # Smoke test — runs scanner against own codebase
├── planning/
│   └── implamentation-plan-turn-based/   # Turn-based plan chain (n3→n4→n5→n6)
├── docs/
│   ├── plans/                            # Design documents (dated 2026-02-08)
│   └── user-stories/                     # User story JSON artifacts
├── AGENTS.md                       # THIS FILE
├── CLAUDE.md                       # Claude-specific context
├── STRATEGIC-PLANNING-PROMPT.md    # Planning SOT
├── CHANGELOG.md
├── README.md
├── package.json
└── tsconfig.json
```

**Source LOC:** ~14,717 (excluding dashboard frontend, node_modules)  
**Test baseline:** `npm test` → **657/657** assertions across **12** test files
**TypeScript:** `tsc --noEmit` clean, zero errors  
**Files above 500 LOC (⚠️):** `templates.ts` (1482), `schemas/planning-registry.ts` (729), `dashboard/backend/server.ts` (721), `lib/code-quality.ts` (701), `schemas/task-graph.ts` (605), `lib/persistence.ts` (584), `schemas/task.ts` (530)

---

## What Works (Verified)

> **⚠️ CAUTION:** "Verified" in this table means **unit tests pass**, not **verified in live OpenCode**. The plugin has never been installed in a real OpenCode instance. Hooks that say "unit-tested" may behave differently at runtime. See "What Does NOT Work" section for known gaps.

### Level 1: Plugin Hooks & Tools

| Component | File | Evidence |
|---|---|---|
| Tool gate — blocks write/edit without active task | `hooks/tool-gate.ts` | 93/93 assertions |
| Compaction anchor injection | `hooks/compaction.ts` | 16/16 unit tests |
| Message transform — prunes old tool outputs | `hooks/message-transform.ts` | 13/13 unit tests |
| Anchor scoring + staleness | `schemas/anchor.ts` | Priority scoring, 48h staleness |
| TUI-safe file logging | `lib/logging.ts` | Zero console.log |
| **StateManager** | `lib/persistence.ts` | **91/91** assertions |
| **Hook verification harness** | `index.ts` | Every hook logs to debug |

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
| **Entity resolver** | `lib/_archived-2026-02-08/entity-resolver.ts` | ARCHIVED — 545 LOC dead code. `canAgentWrite()` never called. Restore when entity-level governance is wired. |

### Level 3: Task Graph + Smart TODO System

| Component | File | Evidence |
|---|---|---|
| **Task graph schema** | `schemas/task-graph.ts` | TaskNode, Checkpoint, TaskGraph. 96/96 tests |
| **Work plan schema** | `schemas/work-plan.ts` | WorkPlan lifecycle. 56/56 tests |
| **govern_plan tool** | `tools/govern-plan.ts` | Work plan management: create, plan_tasks, status, archive, abandon |
| **govern_task tool** | `tools/govern-task.ts` | Task lifecycle: start, complete, fail, status, review |
| **Legacy task schema** | `schemas/task.ts` | Epic/Task/Subtask, WorkStream categories, v1→v2 migration |
| **Persistence** | `lib/persistence.ts` | Separate `tasks.json`. Auto-migration. Agent identity capture |

### Level 4: Code Intelligence

| Component | File | Evidence |
|---|---|---|
| **Code quality scanner** | `lib/code-quality.ts` | 9 smell types, A-F grading, 42 roasts |
| **CLI integration** | `cli.ts` | Health grade box, stats, roasts |
| **Init output** | `tools/init.ts` | 60/60 tests |

### Level 5: Planning Registry

| Component | File | Evidence |
|---|---|---|
| **Planning Registry schema** | `schemas/planning-registry.ts` | 729 LOC. Tiers (T1-T3), artifact chains, section-level tracking, outlier detection |
| **Factory functions** | `schemas/planning-registry.ts` | `createPlanningArtifact`, `createArtifactSection`, `createArtifactChain`, `createPlanningRegistry`, `addOutlier` |
| **Helpers** | `schemas/planning-registry.ts` | `resolveChainHead`, `getChainHistory`, `findStaleSections`, `computeSectionHash`, `linkTaskToArtifact`, `findOutliers` |
| **Test file** | `tests/planning-registry.test.ts` | **52/52** assertions in `npm test` ✅ |
| **Init integration** | `tools/init.ts` | Outlier scan on install, pending outlier reporting |
| **Deploy bootstrap** | `cli/deploy.ts` | Empty `planning-registry.json` created on `idumb-v2 init` |

> **⚠️ CAUTION:** Planning Registry is **schema + factory functions + outlier scan only**. Chain lifecycle and section-level staleness tracking are implemented as pure functions but are NOT wired into runtime hooks or tools. No chain updates happen automatically.

---

## Agent Team (3 Agents — CLI-deployed on `idumb-v2 init`)

All agents are deployed to `.opencode/agents/` by `idumb-v2 init` via `cli/deploy.ts`. They do NOT exist until the user runs the init command in their target project.

| Agent | Level | Role | Key Tools |
|---|---|---|---|
| `idumb-supreme-coordinator` | 0 | Pure orchestrator — delegates, never writes | `govern_plan`, `govern_delegate`, `govern_task (status only)`, `idumb_anchor`, `idumb_init` |
| `idumb-investigator` | 1 | Research, analysis, planning, brain entries | `govern_task`, `govern_shell (validation+inspection)`, `idumb_anchor` |
| `idumb-executor` | 1 | Code implementation, builds, tests | `govern_task`, `govern_shell (all categories)`, `idumb_anchor` |

**Delegation routing (from `delegation.ts`):**

| Category | Routes To |
|---|---|
| `development` | executor |
| `governance` | coordinator |
| `research` | investigator |
| `maintenance` | executor, investigator |
| `spec-kit` | investigator |
| `ad-hoc` | executor, investigator |

Reference profiles deployed to `.idumb/idumb-modules/agents/` as documentation.

---

## What Does NOT Work / Does NOT Exist Yet

| Item | Reality |
|---|---|
| Live hook verification | **Not yet tested.** Never installed in real OpenCode. |
| `experimental.chat.system.transform` | **Unit-tested.** Config-aware injection with framework overlay + mode context. Not yet confirmed firing in live OpenCode. |
| `experimental.chat.messages.transform` | **Unverified.** SDK input is `{}` (empty!). |
| `chat.params` hook | **IMPLEMENTED but UNVERIFIED in live OpenCode.** Captures `agent` field. Auto-assigns to active task and TaskNode. Code is complete in `index.ts:140-174`. |
| `chat.message` hook | **NOT REGISTERED.** Available with optional `agent?` field. |
| Framework agent interception | **Not implemented.** BMAD/GSD/Agent-OS agents not intercepted yet. |
| Command splitting | **Not implemented.** Agent prompts still monolithic in `templates.ts`. |
| Dashboard integration | **Frontend built.** Backend exists. Not integrated into CLI. |
| Delegation runtime | **Schema done (δ2).** `govern_delegate` tool exists. Full runtime enforcement not wired. |
| Brain / wiki | **Not implemented.** |

---

## Governance Modes

| Mode | Description |
|---|---|
| `strict` | Full enforcement — task required before every write |
| `standard` | Balanced — task required, warnings for minor violations |
| `relaxed` | Light governance — task tracking, no write-blocking |
| `retard` | 🔥 Expert-only — maximum autonomy + savage roasts |

---

## Plugin Hooks (Registered in index.ts)

| Hook | Status | What It Does |
|---|---|---|
| `event` | Works | Logs session lifecycle events |
| `tool.execute.before` | **VALIDATED** | Blocks write/edit without active task |
| `tool.execute.after` | **VALIDATED** | Defense-in-depth replacement |
| `experimental.session.compacting` | Unit-tested | Injects anchors + active task |
| `experimental.chat.system.transform` | **Unit-tested** | Config-aware governance context injection (framework overlay, mode context, budget-capped) |
| `experimental.chat.messages.transform` | **UNVERIFIED** | Prunes old tool outputs |
| `chat.params` | **REGISTERED** | Captures agent name, auto-assigns |

## Custom Tools (6 tools)

| Tool | Description |
|---|---|
| `govern_plan` | Work plan management — create, plan_tasks, status, archive, abandon |
| `govern_task` | Task lifecycle — start, complete, fail, status, review |
| `govern_delegate` | Structured delegation — assign, recall, status |
| `govern_shell` | Governed shell command execution with classification |
| `idumb_anchor` | Context anchors that survive compaction |
| `idumb_init` | Project initialization and configuration |

---

## Existing Pipeline: Init → Config → Deploy → Coordinator

```
npx idumb-v2 init
    │
    ├─→ Interactive CLI prompts (language, governance, experience, scope)
    │
    ├─→ Brownfield Scan (framework-detector.ts + code-quality.ts)
    │   ├── Framework detection + code quality scan (A-F grading)
    │   └── CLI output: health grade box, stats, issue breakdown, roasts
    │
    ├─→ deploy.ts (ALL agents + commands + modules pre-deployed)
    │   ├── .opencode/agents/ (3 agents: coordinator, investigator, executor)
    │   ├── .opencode/commands/ (4 commands: init, settings, status, delegate)
    │   ├── .idumb/idumb-modules/agents/ (3 agent reference profiles)
    │   ├── .idumb/idumb-modules/schemas/agent-contract.md
    │   ├── .idumb/idumb-modules/skills/ (delegation + governance protocols)
    │   ├── .idumb/idumb-modules/commands/command-template.md
    │   ├── .idumb/idumb-modules/workflows/workflow-template.md
    │   └── opencode.json (plugin path auto-added)
    │
    └─→ Supreme Coordinator runs in OpenCode
        ├── Delegates research → @idumb-investigator
        ├── Delegates execution → @idumb-executor
        └── Validates completion before accepting
```

**This pipeline is COMPLETE and WORKING in CLI.** Agents deploy on `idumb-v2 init`. Live OpenCode verification is pending.

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
| `walkthrough-n3-2.md` | Walkthrough | Phase α2 |
| `walkthrough-n6.md` | Walkthrough | **LATEST** — 3-agent refactor |

---

## Roadmap

> **See `MASTER-PLAN.md` for the active implementation plan.**
> The plan state is also available at runtime via `.idumb/brain/plan-state.json`.

### Historical Phases (Completed)

| Phase | Goal | Status |
|---|---|---|
| **Phase 0** | Smart TODO rewrite — 12 actions, 3-level hierarchy | **DONE** ✅ |
| **Phase 1b-β** | Entity schemas + scan/codemap tools | **DONE** ✅ |
| **Phase α2** | Foundation fixes — WorkStream, chat.params, docs | **DONE** ✅ |
| **Phase δ2** | Delegation schema + validation | **DONE** ✅ |
| **Phase n6-Iter1** | 3-agent model refactor + planning registry schema | **DONE** ✅ |
| **Phase n6-Iter1** | Integration cycle — wire planning registry into `npm test`, `write.ts`, `init.ts` | **DONE** ✅ |

### Current Plan

See `MASTER-PLAN.md` — Phases 1-6 of the "One True Plan + Self-Enforcement" plan.

---

## Known LOC Violations (> 500 LOC)

These files need future splitting. Listed in severity order:

| File | LOC | Recommended Split |
|---|---|---|
| `templates.ts` | 1482 | Split into `templates/coordinator.ts`, `templates/investigator.ts`, `templates/executor.ts`, `templates/modules.ts` |
| `schemas/planning-registry.ts` | 729 | Split schema types from helper functions |
| `dashboard/backend/server.ts` | 721 | Extract route handlers |
| `lib/code-quality.ts` | 701 | Extract smell detectors into separate modules |
| `schemas/task-graph.ts` | 605 | Split schema definitions from factory/helper functions |
| `lib/persistence.ts` | 584 | Extract TaskStore and SQLite concerns into separate modules |
| `schemas/task.ts` | 530 | Split types from helpers |

---

## Code Style

- **TypeScript** with strict mode, ESM (`"type": "module"`)
- **NO console.log** — use `createLogger(directory, service)`
- **Hook factory pattern** — every hook = function returning async hook
- **Graceful degradation** — every hook wrapped in try/catch
- **Plain interfaces** — no Zod for internal state
- Functions: `camelCase` | Types: `PascalCase` | Constants: `SCREAMING_SNAKE` | Files: `kebab-case.ts`

---

## Development Commands

```bash
npm run build        # tsc
npm run dev          # tsc --watch
npm run typecheck    # tsc --noEmit
npm test             # 12 test files via tsx (657+ assertions)
```

---

## Session Handoff

When resuming work:

1. Read `MASTER-PLAN.md` — it is the active implementation plan
2. Read this file (AGENTS.md) — it reflects what exists in the codebase
3. Run `npm run typecheck` — must be zero errors
4. Run `npm test` — must be 657+ baseline
5. Check `.idumb/brain/plan-state.json` for current phase
