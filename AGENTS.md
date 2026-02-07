# AGENTS.md — iDumb v2 (Ground Truth)

**Version:** 5.0.0  
**Last Updated:** 2026-02-07  
**Status:** Phase 0 COMPLETE. Phase 1b-β tools implemented. Phase α2 foundation fixes DONE. Phase δ2 delegation schema DONE.

---

# NON-NEGOTIABLE RULES

1. **NO HALLUCINATION**: This file describes ONLY what exists. No features, files, or schemas that aren't implemented and tested.
2. **TUI SAFETY**: NO `console.log` anywhere. File-based logging via `lib/logging.ts`.
3. **CONTEXT-FIRST**: Gather context before executing. Read existing files before creating new ones.
4. **ANTI-REPETITION**: Check before creating. Prefer editing over creating.

---

## What iDumb Is

An OpenCode plugin + agent system that enforces governance on AI agents by:
- **Level 1 (Plugin)**: Blocking file writes without an active task, preserving context across compaction, pruning stale tool outputs
- **Level 2 (Agents)**: Meta-builder agent + **6 sub-agents** (supreme-coordinator, builder, validator, skills-creator, research-synthesizer, planner) — all auto-deployed on install, enforcing delegation workflows
- **Level 3 (Smart TODO)**: 3-level hierarchical task system (Epic→Task→Subtask) with 12 actions, 6 edge-case mechanisms, prerequisite enforcement, completion chain validation, and backward-compatible bridge to tool-gate
- **Level 4 (Code Intelligence)**: Real-time code quality scanner with grading (A-F), smell detection, and roast commentary

All "intelligence" is manufactured from deterministic hooks (Level 1), structured agent prompts (Level 2), hierarchical task governance (Level 3), and static code analysis (Level 4) — not LLM reasoning.

---

## Actual Directory Structure (What Exists)

```
v2/
├── bin/
│   └── cli.mjs                     # Shebang wrapper for npx idumb-v2
├── src/
│   ├── cli.ts                      # CLI entry point — npx idumb-v2 init
│   ├── cli/
│   │   ├── deploy.ts               # Deploys agents, commands, modules + 6 sub-agent profiles
│   │   └── dashboard.ts            # Dashboard server launcher
│   ├── templates.ts                # All deployable templates — meta-builder + 6 sub-agents + profiles
│   ├── index.ts                    # Plugin entry — wires 6 hooks + 5 tools
│   ├── tools-plugin.ts             # Plugin tool registration
│   ├── hooks/
│   │   ├── index.ts                # Barrel exports
│   │   ├── tool-gate.ts            # VALIDATED — blocks write/edit without active task
│   │   ├── compaction.ts           # Unit-tested — anchor injection via output.context.push()
│   │   ├── message-transform.ts    # Unit-tested — DCP-pattern context pruning
│   │   └── system.ts               # UNVERIFIED — hook may not fire in OpenCode
│   ├── lib/
│   │   ├── index.ts                # Barrel exports
│   │   ├── logging.ts              # TUI-safe file-based logger
│   │   ├── framework-detector.ts   # Read-only brownfield scanner + code quality integration
│   │   ├── code-quality.ts         # Code quality scanner — smell detection, grading, roast commentary
│   │   ├── scaffolder.ts           # Creates .idumb/ directory tree + config.json
│   │   ├── persistence.ts          # StateManager — disk persistence for hook state + TaskStore
│   │   ├── chain-validator.ts      # Delegation chain validation
│   │   ├── entity-resolver.ts      # Entity resolution logic
│   │   └── state-reader.ts         # State reading utilities
│   ├── schemas/
│   │   ├── index.ts                # Barrel exports (15 functions + 7 types from task.ts)
│   │   ├── anchor.ts               # Anchor types, scoring, staleness, budget selection
│   │   ├── config.ts               # IdumbConfig schema, Language, GovernanceMode, CodeQualityReport, etc.
│   │   ├── task.ts                 # Smart TODO schema — Epic/Task/Subtask + WorkStream categories
│   │   ├── delegation.ts           # Delegation schema — agent delegation tracking + validation
│   │   ├── brain.ts                # Brain entry schema — knowledge persistence
│   │   ├── project-map.ts          # Project map schema — directory/file mapping
│   │   └── codemap.ts              # Code map schema — symbol extraction
│   ├── tools/
│   │   ├── index.ts                # Barrel exports
│   │   ├── task.ts                 # 12 actions + 6 edge-case mechanisms (Smart TODO)
│   │   ├── anchor.ts               # add/list context anchors
│   │   ├── init.ts                 # Init tool — scan → scaffold → greeting + code quality report
│   │   ├── read.ts                 # Read tool — file and entity reading
│   │   ├── write.ts                # Write tool — file and entity writing
│   │   ├── scan.ts                 # Project scanner — framework detection, structure analysis
│   │   ├── codemap.ts              # Code mapper — symbol extraction, TODO scanning
│   │   ├── bash.ts                 # Bash command execution
│   │   ├── webfetch.ts             # Web fetching tool
│   │   └── status.ts               # Status reporting
│   └── dashboard/
│       ├── backend/
│       │   └── server.ts           # Dashboard backend — Express server
│       ├── frontend/
│       │   └── src/                # React + Vite dashboard app
│       └── shared/
│           └── types.ts            # Shared types between frontend and backend
├── tests/
│   ├── tool-gate.test.ts           # 16 assertions — all pass
│   ├── compaction.test.ts          # 16 assertions — all pass
│   ├── message-transform.test.ts   # 13 assertions — all pass
│   ├── init.test.ts                # 60 assertions — all pass
│   ├── persistence.test.ts         # 45 assertions — all pass
│   ├── task.test.ts                # 54 assertions — all pass
│   ├── delegation.test.ts          # 38 assertions — all pass
│   └── smoke-code-quality.ts       # Smoke test — runs scanner against own codebase
├── AGENTS.md                       # THIS FILE
├── package.json
└── tsconfig.json
```

**Total:** ~65 source files, ~17,500 LOC. `tsc --noEmit` clean. **242/242** test assertions pass across **7** test files.

---

## What Works (Verified)

### Level 1: Plugin Hooks & Tools

| Component | File | Evidence |
|---|---|---|
| Tool gate — blocks write/edit without active task | `hooks/tool-gate.ts` | 16/16 unit tests. Delegates state to StateManager. |
| Compaction anchor injection | `hooks/compaction.ts` | 16/16 unit tests. `output.context.push()`. |
| Message transform — prunes old tool outputs | `hooks/message-transform.ts` | 13/13 unit tests. Keeps last 10, truncates older. |
| Anchor scoring + staleness | `schemas/anchor.ts` | Priority scoring, 48h staleness, budget-aware selection. |
| TUI-safe file logging | `lib/logging.ts` | Zero console.log. Writes to `.opencode/idumb/logs/`. |
| **StateManager** | `lib/persistence.ts` | **45/45** tests. Disk persistence for hook state + TaskStore. |
| **Hook verification harness** | `index.ts` | Every hook logs to `hook-verification.log` with debug entries. |

### Level 2: Agent System (CLI-deployed)

| Component | File | Evidence |
|---|---|---|
| **Meta builder agent** | `templates.ts` | 3-phase design: scan presentation → intelligence formation → governance activation. |
| **6 sub-agent profiles** | `templates.ts` | Supreme-coordinator, builder, validator, skills-creator, **research-synthesizer, planner**. |
| **6 sub-agent reference profiles** | `templates.ts` | `SUPREME_COORDINATOR_PROFILE`, `BUILDER_PROFILE`, `VALIDATOR_PROFILE`, `SKILLS_CREATOR_PROFILE`, `RESEARCH_SYNTHESIZER_PROFILE`, `PLANNER_PROFILE`. |
| **4 commands** | `templates.ts` | `/idumb-init`, `/idumb-settings`, `/idumb-status`, **`/idumb-delegate`**. |
| **Agent contract schema** | `templates.ts` | OpenCode YAML frontmatter with permissions, tools, bash patterns. |
| **CLI deployment** | `cli/deploy.ts` | Deploys 7 agents + 4 commands + 6 reference profiles + 2 skills + modules to `.opencode/`. |
| **opencode.json auto-config** | `cli/deploy.ts` | Adds plugin path automatically. |
| **Init tool** | `tools/init.ts` | 60/60 tests. Scans brownfield, scaffolds .idumb/, creates config, includes code quality report. |
| **Config schema** | `schemas/config.ts` | Language, ExperienceLevel, GovernanceMode (including `retard`), InstallScope, CodeQualityReport. |
| **Framework detector** | `lib/framework-detector.ts` | Detects BMAD/GSD/Spec-kit, tech stack, pkg manager, gaps, **code quality**. |
| **Code quality scanner** | `lib/code-quality.ts` | Scans up to 500 files. Detects god files, spaghetti functions, deep nesting, TODO debt, console.log leaks, high coupling, missing tests. Grades A-F with score 0-100. |
| **Scaffolder** | `lib/scaffolder.ts` | Creates .idumb/ tree, writes config.json, non-destructive. |
| **Delegation schema** | `schemas/delegation.ts` | Agent delegation tracking and validation. 38/38 tests. |

### Level 3: Smart TODO System (Phase 0 Complete)

| Component | File | Evidence |
|---|---|---|
| **Task schema** | `schemas/task.ts` | ~530 LOC. Epic/Task/Subtask types, WorkStream categories, governance levels, CRUD helpers, chain detection, v1→v2 migration. |
| **Task tool** | `tools/task.ts` | ~690 LOC. 12 actions, 6 edge-case mechanisms, category-aware epic creation. |
| **Task tests** | `tests/task.test.ts` | 54 assertions across 10 groups. |
| **Status (merged into task)** | `tools/task.ts` | `action=status` shows hierarchy tree, chain warnings, WorkStream category/governance. |
| **Persistence (TaskStore)** | `lib/persistence.ts` | Separate `tasks.json`. Auto-migration v1→v2. Agent identity capture. |
| **Barrel exports** | `schemas/index.ts` | 15 functions + 7 types re-exported. |

### Level 4: Code Intelligence (Code Quality Scanner)

| Component | File | Evidence |
|---|---|---|
| **Code quality scanner** | `lib/code-quality.ts` | ~700 LOC. Walks project tree, reads source files, detects 7 smell types. |
| **Smell detection** | `lib/code-quality.ts` | God files (>300/500L), spaghetti functions (>50/100L), deep nesting (5+), TODO debt, console.log leaks, high coupling (15+ imports), missing test companions. |
| **Grading system** | `lib/code-quality.ts` | A-F grade, 0-100 score, penalty-based calculation. |
| **Roast commentary** | `lib/code-quality.ts` | 50+ unique savage roasts. Severity-aware (info/warning/critical). |
| **CLI integration** | `cli.ts` | Health grade box, stats dashboard, issue breakdown, top 8 roasts. Savage mode in "retard" governance. |
| **Agent-facing output** | `tools/init.ts` | Grade, file counts, top issues included in greeting for Meta Builder. |
| **Smoke test** | `tests/smoke-code-quality.ts` | Runs scanner against own codebase — verified working. |

### Smart TODO: 12 Actions

`create_epic`, `create_task`, `create_subtask`, `start`, `complete`, `reopen`, `evidence`, `list`, `show`, `assign`, `priority`, `navigate`

### Smart TODO: 6 Edge-Case Mechanisms

1. Arg validation with helpful errors
2. Prerequisite enforcement (can't create task without epic)
3. State reminders in every tool response (governance footer)
4. Wrong-argument hints (shows exact corrected command)
5. Stale task warnings (tasks with no subtask progress)
6. Completion chain validation (blocks task completion when subtasks pending)

---

## Governance Modes

| Mode | Description |
|---|---|
| `strict` | Full enforcement — task required before every write, all delegation validated |
| `standard` | Balanced — task required, warnings instead of blocks for minor violations |
| `relaxed` | Light governance — task tracking but no write-blocking |
| `retard` | 🔥 **Expert-only easter egg** — maximum autonomy + expert guardrails + savage personality. Only visible when "expert" experience level selected. Includes roast commentary from code quality scanner. |

---

## Agent Team (7 Agents — All Auto-Deployed)

All agents are pre-deployed to `.opencode/agents/` by `idumb-v2 init` via `cli/deploy.ts`. The Meta Builder does NOT create agents — they exist from install.

| Agent | File | Role |
|---|---|---|
| `idumb-meta-builder` | `.opencode/agents/idumb-meta-builder.md` | 3-phase orchestrator: scan → intelligence → governance |
| `idumb-supreme-coordinator` | `.opencode/agents/idumb-supreme-coordinator.md` | Upstream validator, delegation gatekeeper |
| `idumb-builder` | `.opencode/agents/idumb-builder.md` | Code writer, file creator |
| `idumb-validator` | `.opencode/agents/idumb-validator.md` | Quality checker, test runner |
| `idumb-skills-creator` | `.opencode/agents/idumb-skills-creator.md` | Skill file creator, module installer |
| `idumb-research-synthesizer` | `.opencode/agents/idumb-research-synthesizer.md` | Knowledge engine, web researcher, brain entry writer |
| `idumb-planner` | `.opencode/agents/idumb-planner.md` | Strategy architect, implementation planner, ADR creator |

Reference profiles for all 6 sub-agents are also deployed to `.idumb/idumb-modules/agents/` as documentation.

---

## What Does NOT Work / Does NOT Exist Yet

| Item | Reality |
|---|---|
| Live hook verification | **Not yet tested.** Verification harness built, never installed in real OpenCode. |
| `experimental.chat.system.transform` | **Unverified.** Registered but not confirmed firing. |
| `experimental.chat.messages.transform` | **Unverified.** Registered but SDK input is `{}` (empty!). |
| `chat.params` hook | **REGISTERED (n3 α2-1).** Captures `agent` field. Auto-assigns to active task. |
| `chat.message` hook | **NOT REGISTERED.** Available with optional `agent?` field. |
| Cross-session anchor migration | **Not implemented.** Anchors keyed by sessionID. |
| Role detection | **Race condition.** Defaults to `meta` (allow-all) before first chat.message. |
| Delegation tracking | **Schema done (δ2).** Runtime enforcement not yet wired. |
| TODO interception | **Not implemented.** Coordinator still uses `todowrite`/`todoread` directly. |
| Validation loop | **Not implemented.** No `validate` action on idumb_task yet. |
| Brain / wiki | **Not implemented.** No knowledge persistence beyond anchors. |
| Dashboard | **Frontend built.** Backend server exists. Not yet integrated into CLI. |

---

## Critical Known Issues

1. **Experimental hooks unverified** — `system.transform` and `messages.transform` NOT confirmed in official OpenCode docs. Verification harness ready but needs live test.
2. **No live testing done** — all validation is unit tests with mocks. TC-11 to TC-18 ready in TEST-CASES.md.
3. **SessionID mismatch on restart** — OpenCode assigns new sessionID per session. Task/anchor state survives on disk but may not auto-attach.
4. **Role detection race** — defaults to `meta` (allow-all) before `chat.params` or `chat.message` fires. Must fix to default `builder` (block-all).
5. **PP-01: Subagent hooks don't fire** — ALL subagent governance must be via agent `.md` profiles + skills.

---

## Plugin Hooks (Registered in index.ts)

| Hook | Status | What It Does |
|---|---|---|
| `event` | Works | Logs session lifecycle events |
| `tool.execute.before` | **VALIDATED** | Blocks write/edit without active task (throws Error) |
| `tool.execute.after` | **VALIDATED** | Defense-in-depth: replaces output if before-hook didn't block |
| `experimental.session.compacting` | Unit-tested | Injects anchors + active task into compaction context |
| `experimental.chat.system.transform` | **UNVERIFIED** | Injects governance directive into system prompt |
| `experimental.chat.messages.transform` | **UNVERIFIED** | Prunes old tool outputs (DCP pattern) |
| `chat.params` | **REGISTERED** | Captures agent name, auto-assigns to active task |

### Hooks Available but NOT Registered (from SDK)

| Hook | Why It Matters |
|---|---|
| `chat.message` | Optional `agent?` field. Session lifecycle awareness. |
| `command.execute.before` | Could intercept `/idumb-*` commands programmatically. |
| `experimental.text.complete` | Inject governance into text completions. |
| `permission.ask` | Auto-allow/deny permissions programmatically. |
| `config` | React to config changes. |
| `shell.env` | Set environment variables for bash commands. |

## Custom Tools (5 of max 5)

| Tool | Description |
|---|---|
| `idumb_task` | 12 actions across 3-level hierarchy. Category-aware epic creation. Required before write/edit. |
| `idumb_anchor` | Add/list context anchors that survive compaction. |
| `idumb_init` | Initialize iDumb — scans brownfield, detects frameworks, runs code quality analysis, creates .idumb/ + config.json. |
| `idumb_scan` | Project scanner — deep framework detection, structure analysis, project map generation. |
| `idumb_codemap` | Code mapper — symbol extraction, TODO/FIXME scanning, inconsistency detection. |

**All 5 tool slots filled.** `idumb_brain` planned to replace `idumb_init` in Phase γ2.

---

## Existing Pipeline: Init → Config → Deploy → Meta-Builder

```
npx idumb-v2 init
    │
    ├─→ Interactive CLI prompts (language, governance, experience, scope)
    │   └── "retard" mode: hidden easter egg (only when experience=expert)
    │
    ├─→ Brownfield Scan (framework-detector.ts + code-quality.ts)
    │   ├── Framework detection (BMAD/GSD/Spec-kit, tech stack, gaps)
    │   ├── Code quality scan (up to 500 files, 7 smell types, A-F grading)
    │   └── Jaw-dropping CLI output: health grade box, stats, issue breakdown, roasts
    │
    ├─→ idumb_init tool (scan → scaffold → greeting)
    │   ├── scaffolder.ts (.idumb/ tree + config.json)
    │   └── greeting (context-aware, language-specific, includes code quality summary)
    │
    ├─→ deploy.ts (ALL agents + commands + modules pre-deployed)
    │   ├── .opencode/agents/ (7 agents: meta-builder + 6 sub-agents)
    │   ├── .opencode/commands/ (4 commands: init, settings, status, delegate)
    │   ├── .idumb/idumb-modules/agents/ (6 sub-agent reference profiles)
    │   ├── .idumb/idumb-modules/schemas/agent-contract.md
    │   ├── .idumb/idumb-modules/skills/ (delegation + governance protocols)
    │   ├── .idumb/idumb-modules/commands/command-template.md
    │   ├── .idumb/idumb-modules/workflows/workflow-template.md
    │   └── opencode.json (plugin path auto-added)
    │
    └─→ Meta-builder runs in OpenCode (3 phases):
        Phase 1: Jaw-Dropping Scan Presentation (silent recon → formatted output)
        Phase 2: Intelligence Formation (deep code analysis → agent intelligence)
        Phase 3: Governance Activation + Handoff (validate artifacts → hand off to coordinator)
```

**This pipeline is COMPLETE and WORKING.** All 7 agents auto-deployed on install.

---

## Phase 1b Integration Points

| Phase 1b Task | Integrates With | How |
|---|---|---|
| α2-1: Register `chat.params` | `index.ts` | **DONE.** Captures agent name, auto-assigns to active task. |
| α2-2/3: WorkStream categories | `schemas/task.ts` | **DONE.** 6 categories, governance levels, category defaults. |
| α2-4/5: Category-aware epic creation | `tools/task.ts` | **DONE.** `category` param on create_epic. |
| α2-7: TaskStore migration v1→v2 | `schemas/task.ts` + `persistence.ts` | **DONE.** Auto-migration on load. |
| β-1/β-2: Intercept todowrite/todoread | `tool-gate.ts` → coordinator | Coordinator already uses todowrite — transparently redirected to Smart TODO |
| β-3: Auto-assign agent | `persistence.ts` + `task.ts` | Agent name from `chat.params` → task.assignee |
| γ-4: Validator profile enhancement | `templates.ts` VALIDATOR_PROFILE | Already exists — enhance with validation loop protocol |
| δ-2: Delegation schema | `schemas/delegation.ts` | **DONE.** 38/38 tests passing. |
| δ-6: Delegation skill | `templates.ts` + deploy | Skill deployed alongside agent profiles |
| ε-5: idumb_brain tool | `index.ts` tool registration | Tool slot 5 of 5 (DO-08) |

---

## Code Style

- **TypeScript** with strict mode, ESM (`"type": "module"`)
- **NO console.log** — use `createLogger(directory, service)`
- **Hook factory pattern** — every hook = function returning async hook. Captured logger.
- **Graceful degradation** — every hook wrapped in try/catch. Only intentional blocks throw.
- **Plain interfaces** — no Zod for internal state (anchor.ts, task.ts use plain TS types)
- Functions: `camelCase` | Types: `PascalCase` | Constants: `SCREAMING_SNAKE` | Files: `kebab-case.ts`

---

## Development Commands

```bash
npm run build        # tsc
npm run dev          # tsc --watch
npm run typecheck    # tsc --noEmit
npm test             # runs all 7 test files via tsx (242 assertions)
```

---

## Roadmap (Sequential — Each Must Pass Before Next)

See `STRATEGIC-PLANNING-PROMPT.md` for full details.

| Phase | Goal | Status |
|---|---|---|
| **Phase 0** | Smart TODO rewrite — 12 actions, 6 mechanisms, 3-level hierarchy | **DONE** ✅ |
| **Phase 1b-β** | Entity schemas + scan/codemap tools | **DONE** ✅ |
| **Phase α2** | Foundation fixes — WorkStream categories, chat.params, AGENTS.md | **DONE** ✅ |
| **Phase δ2** | Delegation schema + action | **DONE** ✅ |
| **Phase γ2** | Brain tool (replace idumb_init) | **NEXT** |
| **Phase ζ2** | Interactive dashboard — Vite+React visualization | Stretch goal |

---

## Session Handoff

When resuming work:

1. Read this file (AGENTS.md) — it reflects reality
2. Read `STRATEGIC-PLANNING-PROMPT.md` — planning SOT with pitfalls, principles, milestones
3. Check which Phase is current (see Roadmap above)
4. Run `npm run typecheck` before starting
5. Run `npm test` to verify 242/242 baseline
6. Read the current `implementation_plan.md` in the Antigravity brain
