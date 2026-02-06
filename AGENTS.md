# AGENTS.md — iDumb v2 (Ground Truth)

**Version:** 3.0.0  
**Last Updated:** 2026-02-07  
**Status:** Phase 0 COMPLETE (Smart TODO rewrite). Phase 1b planning in progress.

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
- **Level 2 (Agents)**: Meta-builder agent + 4 sub-agents (coordinator, builder, validator, skills-creator) that initialize governance, create agent hierarchy, and enforce delegation workflows
- **Level 3 (Smart TODO)**: 3-level hierarchical task system (Epic→Task→Subtask) with 12 actions, 6 edge-case mechanisms, prerequisite enforcement, completion chain validation, and backward-compatible bridge to tool-gate

All "intelligence" is manufactured from deterministic hooks (Level 1), structured agent prompts (Level 2), and hierarchical task governance (Level 3) — not LLM reasoning.

---

## Actual Directory Structure (What Exists)

```
v2/
├── bin/
│   └── cli.mjs                     # Shebang wrapper for npx idumb-v2
├── src/
│   ├── cli.ts                      # CLI entry point — npx idumb-v2 init
│   ├── cli/
│   │   └── deploy.ts               # Deploys agents, commands, modules + sub-agent profiles
│   ├── templates.ts                # All deployable templates — meta-builder + 4 sub-agents
│   ├── index.ts                    # Plugin entry — wires 5 hooks + 4 tools
│   ├── hooks/
│   │   ├── index.ts                # Barrel exports
│   │   ├── tool-gate.ts            # VALIDATED — blocks write/edit without active task
│   │   ├── compaction.ts           # Unit-tested — anchor injection via output.context.push()
│   │   ├── message-transform.ts    # Unit-tested — DCP-pattern context pruning
│   │   └── system.ts               # UNVERIFIED — hook may not fire in OpenCode
│   ├── lib/
│   │   ├── index.ts                # Barrel exports
│   │   ├── logging.ts              # TUI-safe file-based logger
│   │   ├── framework-detector.ts   # Read-only brownfield scanner
│   │   ├── scaffolder.ts           # Creates .idumb/ directory tree + config.json
│   │   └── persistence.ts          # StateManager — disk persistence for hook state + TaskStore
│   ├── schemas/
│   │   ├── index.ts                # Barrel exports (15 functions + 7 types from task.ts)
│   │   ├── anchor.ts               # Anchor types, scoring, staleness, budget selection
│   │   ├── config.ts               # IdumbConfig schema, Language, GovernanceMode, etc.
│   │   └── task.ts                 # Smart TODO schema — Epic/Task/Subtask types, CRUD helpers
│   ├── tools/
│   │   ├── index.ts                # Barrel exports
│   │   ├── task.ts                 # 12 actions + 6 edge-case mechanisms (Smart TODO)
│   │   ├── anchor.ts               # add/list context anchors
│   │   ├── status.ts               # Read-only governance state with hierarchy tree
│   │   └── init.ts                 # Init tool — scan → scaffold → greeting
│   └── modules/
│       ├── agents/
│       │   └── meta-builder.md     # Meta builder agent profile template
│       └── schemas/
│           └── agent-profile.ts    # Agent profile contract
├── tests/
│   ├── tool-gate.test.ts           # 16 assertions — all pass
│   ├── compaction.test.ts          # 16 assertions — all pass
│   ├── message-transform.test.ts   # 13 assertions — all pass
│   ├── init.test.ts                # 60 assertions — all pass
│   ├── persistence.test.ts         # 45 assertions — all pass
│   └── task.test.ts                # 54 assertions — all pass
├── .archive/                       # Archived planning docs
├── STRATEGIC-PLANNING-PROMPT.md    # SOT for planning (952 lines, 13 parts)
├── GAP-ANALYSIS.md                 # Known gaps and remediation
├── TEST-CASES.md                   # 18 real-life test cases (TC-1 → TC-18)
├── AGENTS.md                       # THIS FILE
├── package.json
└── tsconfig.json
```

**Total:** ~30 source files, ~7500 LOC. `tsc --noEmit` clean. **204/204** test assertions pass across **6** test files.

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
| **Meta builder agent** | `templates.ts` | 3-phase design: greeting → deep scan → intelligence. 867 LOC. |
| **4 sub-agent profiles** | `templates.ts` | Supreme-coordinator, builder, validator, skills-creator. |
| **3 commands** | `templates.ts` | `/idumb-init`, `/idumb-settings`, `/idumb-status`. |
| **Agent contract schema** | `templates.ts` | OpenCode YAML frontmatter with permissions, tools, bash patterns. |
| **CLI deployment** | `cli/deploy.ts` | Deploys to `.opencode/` (project) or `~/.config/opencode/` (global). |
| **opencode.json auto-config** | `cli/deploy.ts` | Adds plugin path automatically. |
| **Init tool** | `tools/init.ts` | 60/60 tests. Scans brownfield, scaffolds .idumb/, creates config. |
| **Config schema** | `schemas/config.ts` | Language, ExperienceLevel, GovernanceMode, InstallScope. |
| **Framework detector** | `lib/framework-detector.ts` | Detects BMAD/GSD/Spec-kit, tech stack, pkg manager, gaps. |
| **Scaffolder** | `lib/scaffolder.ts` | Creates .idumb/ tree, writes config.json, non-destructive. |

### Level 3: Smart TODO System (Phase 0 Complete)

| Component | File | Evidence |
|---|---|---|
| **Task schema** | `schemas/task.ts` | 418 LOC. Epic/Task/Subtask types, CRUD helpers, chain detection. |
| **Task tool** | `tools/task.ts` | 624 LOC. 12 actions, 6 edge-case mechanisms, backward compat bridge. |
| **Task tests** | `tests/task.test.ts` | 54 assertions across 10 groups. |
| **Status tool (enhanced)** | `tools/status.ts` | Shows hierarchy tree, chain warnings, session vs smart task state. |
| **Persistence (TaskStore)** | `lib/persistence.ts` | Separate `tasks.json` file. Load/save/debounce. |
| **Barrel exports** | `schemas/index.ts` | 15 functions + 7 types re-exported. |

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

## What Does NOT Work / Does NOT Exist Yet

| Item | Reality |
|---|---|
| Live hook verification | **Not yet tested.** Verification harness built, never installed in real OpenCode. |
| `experimental.chat.system.transform` | **Unverified.** Registered but not confirmed firing. |
| `experimental.chat.messages.transform` | **Unverified.** Registered but SDK input is `{}` (empty!). |
| `chat.params` hook | **NOT REGISTERED.** Available in SDK with mandatory `agent` field. Needed for α-1. |
| `chat.message` hook | **NOT REGISTERED.** Available with optional `agent` field. |
| Cross-session anchor migration | **Not implemented.** Anchors keyed by sessionID. |
| Role detection | **Race condition.** Defaults to `meta` (allow-all) before first chat.message. |
| Delegation tracking | **Not implemented.** PP-01: subagent hooks don't fire. |
| TODO interception | **Not implemented.** Coordinator still uses `todowrite`/`todoread` directly. |
| Validation loop | **Not implemented.** No `validate` action on idumb_task yet. |
| Brain / wiki | **Not implemented.** No knowledge persistence beyond anchors. |
| Dashboard | **Not implemented.** Stretch goal. |

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

### Hooks Available but NOT Registered (from SDK)

| Hook | Why It Matters |
|---|---|
| `chat.params` | **Mandatory `agent` field.** Fires BEFORE `tool.execute.before`. Solves role detection race. |
| `chat.message` | Optional `agent?` field. Session lifecycle awareness. |
| `command.execute.before` | Could intercept `/idumb-*` commands programmatically. |
| `experimental.text.complete` | Inject governance into text completions. |
| `permission.ask` | Auto-allow/deny permissions programmatically. |
| `config` | React to config changes. |
| `shell.env` | Set environment variables for bash commands. |

## Custom Tools (4 of max 5)

| Tool | Description |
|---|---|
| `idumb_init` | Initialize iDumb — scans brownfield, detects frameworks, creates .idumb/ + config.json. |
| `idumb_task` | 12 actions across 3-level hierarchy (Epic→Task→Subtask). Required before write/edit. |
| `idumb_anchor` | Add/list context anchors that survive compaction. |
| `idumb_status` | Read-only governance state with hierarchy tree + chain warnings. |

**Slot 5 reserved for:** `idumb_brain` (Phase 1b-ε). If a 6th is needed, merge `idumb_status` into `idumb_task action=status`.

---

## Existing Pipeline: Init → Config → Meta-Builder → Agents

```
npx idumb-v2 init
    │
    ├─→ Interactive CLI prompts (language, governance, experience, scope)
    │
    ├─→ idumb_init tool (scan → scaffold → greeting)
    │   ├── framework-detector.ts (BMAD/GSD/Spec-kit, tech stack, gaps)
    │   ├── scaffolder.ts (.idumb/ tree + config.json)
    │   └── greeting (context-aware, language-specific)
    │
    ├─→ deploy.ts (agents + commands + modules)
    │   ├── .opencode/agents/idumb-meta-builder.md (3-phase orchestrator)
    │   ├── .opencode/commands/idumb-init.md, idumb-settings.md, idumb-status.md
    │   ├── .idumb/idumb-modules/agents/ (4 sub-agent reference profiles)
    │   ├── .idumb/idumb-modules/schemas/agent-contract.md
    │   ├── .idumb/idumb-modules/commands/command-template.md
    │   ├── .idumb/idumb-modules/workflows/workflow-template.md
    │   └── opencode.json (plugin path auto-added)
    │
    └─→ Meta-builder runs in OpenCode (3 phases):
        Phase 1: Greeting (read-only scan → findings → menu)
        Phase 2: Deep scan + agent creation (4 agents in .opencode/agents/)
        Phase 3: Full intelligence + skill discovery + handoff to coordinator
```

**This pipeline is COMPLETE and WORKING.** Phase 1b builds on top of it.

---

## Phase 1b Integration Points

| Phase 1b Task | Integrates With | How |
|---|---|---|
| α-1: Register `chat.params` | `index.ts` | New hook, captures agent name for role detection |
| β-1/β-2: Intercept todowrite/todoread | `tool-gate.ts` → coordinator | Coordinator already uses todowrite — transparently redirected to Smart TODO |
| β-3: Auto-assign agent | `persistence.ts` + `task.ts` | Agent name from `chat.params` → task.assignee |
| γ-4: Validator profile enhancement | `templates.ts` VALIDATOR_PROFILE | Already exists — enhance with validation loop protocol |
| δ-6: Delegation skill | `templates.ts` + deploy | New skill deployed alongside existing agent profiles |
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
npm test             # runs all 6 test files via tsx (204 assertions)
```

---

## Roadmap (Sequential — Each Must Pass Before Next)

See `STRATEGIC-PLANNING-PROMPT.md` for full details.

| Phase | Goal | Status |
|---|---|---|
| **Phase 0** | Smart TODO rewrite — 12 actions, 6 mechanisms, 3-level hierarchy | **DONE** ✅ |
| **Phase 1b-α** | Foundation hardening — hook verification, role detection fix | **NEXT** |
| **Phase 1b-β** | Smart Task integration — TODO interception, agent auto-assign | Blocked by α |
| **Phase 1b-γ** | Validation loop — self-check, evidence quality, max 3 loops | Blocked by α |
| **Phase 1b-δ** | Delegation intelligence — disk tracking, hierarchy enforcement | Blocked by β+γ |
| **Phase 1b-ε** | Brain / wiki — knowledge persistence, auto-populate | Blocked by β+δ |
| **Phase 1b-ζ** | Interactive dashboard — Vite-powered visualization | Stretch goal |

---

## Session Handoff

When resuming work:

1. Read this file (AGENTS.md) — it reflects reality
2. Read `STRATEGIC-PLANNING-PROMPT.md` — planning SOT with pitfalls, principles, milestones
3. Check which Phase is current (see Roadmap above)
4. Run `npm run typecheck` before starting
5. Run `npm test` to verify 204/204 baseline
6. Read the current `implementation_plan.md` in the Antigravity brain
