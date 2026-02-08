# AGENTS.md — iDumb v2 (Ground Truth)

**Version:** 6.0.0  
**Last Updated:** 2026-02-07  
**Status:** Phase 0 COMPLETE. Phase 1b-β tools DONE. Phase α2 foundation DONE. Phase δ2 delegation DONE. Phase n6 3-agent refactor DONE. Planning Registry schema + integration DONE.

---

# NON-NEGOTIABLE RULES

## Core Integrity

1. **NO HALLUCINATION**: This file describes ONLY what exists. No features, files, or schemas that aren't implemented and tested.
2. **TUI SAFETY**: NO `console.log` anywhere. File-based logging via `lib/logging.ts`.
3. **CONTEXT-FIRST**: Gather context before executing. Read existing files before creating new ones.
4. **ANTI-REPETITION**: Check before creating. Prefer editing over creating.

## Development Cycle Discipline

5. **MULTI-CYCLE, NEVER ONE-SHOT**: No single cycle completes a phase. Every change follows: **Cycle 1** = implement → **Cycle 2** = iterate + integrate. Only after integration validation is a phase considered done.
6. **LOC DISCIPLINE**: Source files target 300–500 LOC. Files above 500 LOC are flagged for splitting. Tools can nest tools — group related functionality. `templates.ts` (1510 LOC) is a known violation requiring future split.
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
- **Level 3 (Smart TODO)**: 3-level hierarchical task system (Epic→Task→Subtask) with 12 actions, 6 edge-case mechanisms, prerequisite enforcement, completion chain validation
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
│   │   ├── deploy.ts               # Deploys 3 agents + 3 profiles + commands + modules + planning registry bootstrap (411 LOC)
│   │   └── dashboard.ts            # Dashboard server launcher
│   ├── templates.ts                # All deployable templates — coordinator + investigator + executor (1510 LOC ⚠️)
│   ├── index.ts                    # Plugin entry — wires 7 hooks + 9 tools (single plugin)
│   ├── hooks/
│   │   ├── index.ts                # Barrel exports
│   │   ├── tool-gate.ts            # VALIDATED — blocks write/edit without active task
│   │   ├── compaction.ts           # Unit-tested — anchor injection via output.context.push()
│   │   ├── message-transform.ts    # Unit-tested — DCP-pattern context pruning
│   │   └── system.ts               # UNVERIFIED — hook may not fire in OpenCode
│   ├── lib/
│   │   ├── index.ts                # Barrel exports
│   │   ├── logging.ts              # TUI-safe file-based logger
│   │   ├── framework-detector.ts   # Read-only brownfield scanner + code quality integration (445 LOC)
│   │   ├── code-quality.ts         # Code quality scanner — smell detection, grading (701 LOC ⚠️)
│   │   ├── scaffolder.ts           # Creates .idumb/ directory tree + config.json
│   │   ├── persistence.ts          # StateManager — disk persistence for hook state + TaskStore (407 LOC)
│   │   ├── chain-validator.ts      # Delegation chain validation (300 LOC)
│   │   ├── entity-resolver.ts      # Entity resolution logic — 3-agent write permissions (545 LOC ⚠️)
│   │   └── state-reader.ts         # State reading utilities
│   ├── schemas/
│   │   ├── index.ts                # Barrel exports (15 functions + 7 types from task.ts)
│   │   ├── anchor.ts               # Anchor types, scoring, staleness, budget selection
│   │   ├── config.ts               # IdumbConfig schema, Language, GovernanceMode, etc.
│   │   ├── task.ts                 # Smart TODO schema — Epic/Task/Subtask + WorkStream categories (530 LOC ⚠️)
│   │   ├── delegation.ts           # Delegation schema — 3-agent hierarchy + category routing (363 LOC)
│   │   ├── planning-registry.ts    # Planning artifact registry — tiers, chains, sections, outliers (729 LOC ⚠️)
│   │   ├── brain.ts                # Brain entry schema — knowledge persistence
│   │   ├── project-map.ts          # Project map schema — directory/file mapping
│   │   └── codemap.ts              # Code map schema — symbol extraction
│   ├── tools/
│   │   ├── index.ts                # Barrel exports
│   │   ├── task.ts                 # 12 actions + 6 edge-case mechanisms (826 LOC ⚠️)
│   │   ├── anchor.ts               # add/list context anchors
│   │   ├── init.ts                 # Init tool — scan → scaffold → greeting + code quality report + planning outlier detection (441 LOC)
│   │   ├── read.ts                 # Read tool — file and entity reading (568 LOC ⚠️)
│   │   ├── write.ts                # Write tool — file and entity writing + planning registry integration (1174 LOC ⚠️⚠️)
│   │   ├── scan.ts                 # Project scanner — framework detection (445 LOC)
│   │   ├── codemap.ts              # Code mapper — symbol extraction (521 LOC ⚠️)
│   │   ├── bash.ts                 # Bash command execution (438 LOC)
│   │   ├── webfetch.ts             # Web fetching tool (365 LOC)
│   │   └── status.ts               # Status reporting
│   ├── modules/
│   │   ├── agents/                 # Module agent templates
│   │   ├── commands/               # Module command templates
│   │   └── schemas/                # Module schema templates
│   └── dashboard/
│       ├── backend/
│       │   └── server.ts           # Dashboard backend — Express server (563 LOC ⚠️)
│       ├── frontend/
│       │   └── src/                # React + Vite dashboard app
│       └── shared/
│           └── types.ts            # Shared types between frontend and backend
├── tests/
│   ├── tool-gate.test.ts           # 16 assertions — all pass ✅
│   ├── compaction.test.ts          # 16 assertions — all pass ✅
│   ├── message-transform.test.ts   # 13 assertions — all pass ✅
│   ├── init.test.ts                # 60 assertions — all pass ✅
│   ├── persistence.test.ts         # 45 assertions — all pass ✅
│   ├── task.test.ts                # 54 assertions — all pass ✅
│   ├── delegation.test.ts          # 38 assertions — all pass ✅
│   ├── planning-registry.test.ts   # 52 assertions — all pass ✅
│   └── smoke-code-quality.ts       # Smoke test — runs scanner against own codebase
├── planning/
│   └── implamentation-plan-turn-based/   # Turn-based plan chain (n3→n4→n5→n6)
├── AGENTS.md                       # THIS FILE
├── CLAUDE.md                       # Claude-specific context
├── STRATEGIC-PLANNING-PROMPT.md    # Planning SOT
├── CHANGELOG.md
├── README.md
├── package.json
└── tsconfig.json
```

**Source LOC:** ~14,717 (excluding dashboard frontend, node_modules)  
**Test baseline:** `npm test` → **294/294** assertions across **8** test files  
**TypeScript:** `tsc --noEmit` clean, zero errors  
**Files above 500 LOC (⚠️):** `templates.ts` (1510), `tools/write.ts` (1174 ⚠️⚠️), `tools/task.ts` (826), `schemas/planning-registry.ts` (729), `lib/code-quality.ts` (701), `tools/read.ts` (568), `dashboard/backend/server.ts` (563), `lib/entity-resolver.ts` (545), `schemas/task.ts` (530), `tools/codemap.ts` (521)

---

## What Works (Verified)

### Level 1: Plugin Hooks & Tools

| Component | File | Evidence |
|---|---|---|
| Tool gate — blocks write/edit without active task | `hooks/tool-gate.ts` | 16/16 unit tests |
| Compaction anchor injection | `hooks/compaction.ts` | 16/16 unit tests |
| Message transform — prunes old tool outputs | `hooks/message-transform.ts` | 13/13 unit tests |
| Anchor scoring + staleness | `schemas/anchor.ts` | Priority scoring, 48h staleness |
| TUI-safe file logging | `lib/logging.ts` | Zero console.log |
| **StateManager** | `lib/persistence.ts` | **45/45** tests |
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
| **Delegation schema** | `schemas/delegation.ts` | 3-agent hierarchy, category routing. 38/38 tests |
| **Entity resolver** | `lib/entity-resolver.ts` | `canWrite` permissions mapped to 3 agents |

### Level 3: Smart TODO System

| Component | File | Evidence |
|---|---|---|
| **Task schema** | `schemas/task.ts` | Epic/Task/Subtask, WorkStream categories, v1→v2 migration |
| **Task tool** | `tools/task.ts` | 12 actions, 6 edge-case mechanisms. 54/54 tests |
| **Persistence** | `lib/persistence.ts` | Separate `tasks.json`. Auto-migration. Agent identity capture |

### Level 4: Code Intelligence

| Component | File | Evidence |
|---|---|---|
| **Code quality scanner** | `lib/code-quality.ts` | 7 smell types, A-F grading, 50+ roasts |
| **CLI integration** | `cli.ts` | Health grade box, stats, roasts |
| **Init output** | `tools/init.ts` | 60/60 tests |

### Level 5: Planning Registry

| Component | File | Evidence |
|---|---|---|
| **Planning Registry schema** | `schemas/planning-registry.ts` | 729 LOC. Tiers (T1-T3), artifact chains, section-level tracking, outlier detection |
| **Factory functions** | `schemas/planning-registry.ts` | `createPlanningArtifact`, `createArtifactSection`, `createArtifactChain`, `createPlanningRegistry`, `addOutlier` |
| **Helpers** | `schemas/planning-registry.ts` | `resolveChainHead`, `getChainHistory`, `findStaleSections`, `computeSectionHash`, `linkTaskToArtifact`, `findOutliers` |
| **Test file** | `tests/planning-registry.test.ts` | **52/52** assertions in `npm test` ✅ |
| **Write integration** | `tools/write.ts` | Pre-write guard, sync-after-write, lifecycle sync to registry |
| **Init integration** | `tools/init.ts` | Outlier scan on install, pending outlier reporting |
| **Deploy bootstrap** | `cli/deploy.ts` | Empty `planning-registry.json` created on `idumb-v2 init` |

---

## Agent Team (3 Agents — All Auto-Deployed)

All agents are pre-deployed to `.opencode/agents/` by `idumb-v2 init` via `cli/deploy.ts`.

| Agent | Level | Role | Key Tools |
|---|---|---|---|
| `idumb-supreme-coordinator` | 0 | Pure orchestrator — delegates, never writes | `idumb_task`, `idumb_init`, `idumb_read` (limited) |
| `idumb-investigator` | 1 | Research, analysis, planning, brain entries | `idumb_read`, `idumb_write` (brain only), `idumb_webfetch`, `idumb_bash` (read-only) |
| `idumb-executor` | 1 | Code implementation, builds, tests | `idumb_write` (all), `idumb_bash` (builds/tests), `idumb_read`, edit |

**Delegation routing (from `delegation.ts`):**

| Category | Routes To |
|---|---|
| `development` | executor |
| `governance` | coordinator |
| `research` | investigator |
| `planning` | investigator |
| `documentation` | investigator |
| `ad-hoc` | executor, investigator |

Reference profiles deployed to `.idumb/idumb-modules/agents/` as documentation.

---

## What Does NOT Work / Does NOT Exist Yet

| Item | Reality |
|---|---|
| Live hook verification | **Not yet tested.** Never installed in real OpenCode. |
| `experimental.chat.system.transform` | **Unverified.** Registered but not confirmed firing. |
| `experimental.chat.messages.transform` | **Unverified.** SDK input is `{}` (empty!). |
| `chat.params` hook | **REGISTERED.** Captures `agent` field. Auto-assigns to active task. |
| `chat.message` hook | **NOT REGISTERED.** Available with optional `agent?` field. |
| Framework agent interception | **Not implemented.** BMAD/GSD/Agent-OS agents not intercepted yet. |
| Command splitting | **Not implemented.** Agent prompts still monolithic in `templates.ts`. |
| Dashboard integration | **Frontend built.** Backend exists. Not integrated into CLI. |
| Delegation runtime | **Schema done (δ2).** Runtime enforcement not wired. |
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
| `experimental.chat.system.transform` | **UNVERIFIED** | Governance directive injection |
| `experimental.chat.messages.transform` | **UNVERIFIED** | Prunes old tool outputs |
| `chat.params` | **REGISTERED** | Captures agent name, auto-assigns |

## Custom Tools (5 of max 5)

| Tool | Description |
|---|---|
| `idumb_task` | 12 actions, 3-level hierarchy, category-aware |
| `idumb_anchor` | Context anchors surviving compaction |
| `idumb_init` | Brownfield scan, scaffold, code quality analysis |
| `idumb_scan` | Framework detection, structure analysis |
| `idumb_codemap` | Symbol extraction, TODO scanning |

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

**This pipeline is COMPLETE and WORKING.** All 3 agents auto-deployed on install.

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

## Roadmap (Sequential)

| Phase | Goal | Status |
|---|---|---|
| **Phase 0** | Smart TODO rewrite — 12 actions, 3-level hierarchy | **DONE** ✅ |
| **Phase 1b-β** | Entity schemas + scan/codemap tools | **DONE** ✅ |
| **Phase α2** | Foundation fixes — WorkStream, chat.params, docs | **DONE** ✅ |
| **Phase δ2** | Delegation schema + validation | **DONE** ✅ |
| **Phase n6-Iter1** | 3-agent model refactor + planning registry schema | **Cycle 1 DONE** ✅ |
| **Phase n6-Iter1** | Integration cycle — wire planning registry into `npm test`, `write.ts`, `init.ts` | **Cycle 2 DONE** ✅ |
| **Phase n6-Iter2** | Framework interception + command splitting | Planned |
| **Phase n6-Iter3** | Dashboard data layer | Planned |

---

## Known LOC Violations (> 500 LOC)

These files need future splitting. Listed in severity order:

| File | LOC | Recommended Split |
|---|---|---|
| `templates.ts` | 1510 | Split into `templates/coordinator.ts`, `templates/investigator.ts`, `templates/executor.ts`, `templates/modules.ts` |
| `tools/task.ts` | 826 | Split actions into `task-actions/` directory |
| `tools/write.ts` | 1174 ⚠️⚠️ | Extract planning registry helpers to `lib/planning-registry-runtime.ts` (~290 LOC); extract entity-specific write handlers |
| `schemas/planning-registry.ts` | 729 | Split schema types from helper functions |
| `lib/code-quality.ts` | 701 | Extract smell detectors into separate modules |
| `tools/read.ts` | 568 | Extract entity-specific read handlers |
| `dashboard/backend/server.ts` | 563 | Extract route handlers |
| `lib/entity-resolver.ts` | 545 | Extract classification rules into data file |
| `schemas/task.ts` | 530 | Split types from helpers |
| `tools/codemap.ts` | 521 | Extract symbol extraction logic |

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
npm test             # 8 test files via tsx (294 assertions)
```

---

## Session Handoff

When resuming work:

1. Read this file (AGENTS.md) — it reflects reality
2. Read `planning/implamentation-plan-turn-based/implementation_plan-n6.md` — current active plan
3. Read `planning/implamentation-plan-turn-based/walkthrough-n6.md` — latest changes walkthrough
4. Check which Phase is current (see Roadmap above)
5. Run `npm run typecheck` — must be zero errors
6. Run `npm test` — must be 294/294 baseline
7. **NEXT WORK**: Extract planning registry runtime helpers from `write.ts` to `lib/planning-registry-runtime.ts` (LOC fix). Then Phase n6-Iter2: framework interception + command splitting.
