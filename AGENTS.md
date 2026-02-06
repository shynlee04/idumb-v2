# AGENTS.md — iDumb v2 (Ground Truth)

**Version:** 2.2.0  
**Last Updated:** 2026-02-06  
**Status:** Phase 1b complete. Disk persistence + hook verification harness implemented and tested.

---

# NON-NEGOTIABLE RULES

1. **NO HALLUCINATION**: This file describes ONLY what exists. No features, files, or schemas that aren't implemented and tested.
2. **TUI SAFETY**: NO `console.log` anywhere. File-based logging via `lib/logging.ts`.
3. **CONTEXT-FIRST**: Gather context before executing. Read existing files before creating new ones.
4. **ANTI-REPETITION**: Check before creating. Prefer editing over creating.

---

## What iDumb Is

An OpenCode plugin that enforces governance on AI agents by:
- **Blocking** file writes without an active task (tool gate)
- **Preserving** critical context across compaction (anchor injection)
- **Pruning** stale tool outputs to delay compaction (message transform)

All "intelligence" is manufactured from deterministic hooks — not LLM reasoning.

---

## Actual Directory Structure (What Exists)

```
v2/
├── src/
│   ├── index.ts                    # Plugin entry — wires 5 hooks + 4 tools
│   ├── hooks/
│   │   ├── index.ts                # Barrel exports
│   │   ├── tool-gate.ts            # VALIDATED — blocks write/edit without active task
│   │   ├── compaction.ts           # Unit-tested — anchor injection via output.context.push()
│   │   ├── message-transform.ts    # Unit-tested — DCP-pattern context pruning
│   │   └── system.ts               # UNVERIFIED — hook may not exist in OpenCode
│   ├── lib/
│   │   ├── index.ts                # Barrel exports
│   │   ├── logging.ts              # TUI-safe file-based logger
│   │   ├── framework-detector.ts   # Read-only brownfield scanner (governance + tech + gaps)
│   │   ├── scaffolder.ts           # Creates .idumb/ directory tree + config.json
│   │   └── persistence.ts          # NEW: StateManager — disk persistence for hook state
│   ├── schemas/
│   │   ├── index.ts                # Barrel exports
│   │   ├── anchor.ts               # Anchor types, scoring, staleness, budget selection
│   │   └── config.ts               # NEW: IdumbConfig schema, Language, GovernanceMode, etc.
│   ├── tools/
│   │   ├── index.ts                # Barrel exports
│   │   ├── task.ts                 # create/complete/status for active task
│   │   ├── anchor.ts               # add/list context anchors
│   │   ├── status.ts               # Read-only governance state display
│   │   └── init.ts                 # NEW: Init tool — scan → scaffold → greeting
│   └── modules/
│       ├── agents/
│       │   └── meta-builder.md     # NEW: Meta builder agent profile template
│       └── schemas/
│           └── agent-profile.ts    # NEW: Agent profile contract (roles, permissions, tools)
├── tests/
│   ├── tool-gate.test.ts           # 16 assertions — all pass
│   ├── compaction.test.ts          # 16 assertions — all pass
│   ├── message-transform.test.ts   # 13 assertions — all pass
│   ├── init.test.ts                # 60 assertions — all pass
│   └── persistence.test.ts         # NEW: 45 assertions — all pass
├── .archive/                       # Archived planning docs from previous iterations
├── STRATEGIC-PLANNING-PROMPT.md    # SOT for planning (952 lines, 13 parts)
├── AGENTS.md                       # THIS FILE
├── package.json
└── tsconfig.json
```

**Total:** 22 source files, ~2400 LOC. `tsc --noEmit` clean. 150/150 test assertions pass.

---

## What Works (Verified)

| Component | File | Evidence |
|---|---|---|
| Tool gate — blocks write/edit without active task | `hooks/tool-gate.ts` | Unit tests pass (16/16). Delegates state to StateManager. |
| Compaction anchor injection | `hooks/compaction.ts` | Unit tests pass (16/16). Delegates anchors to StateManager. |
| Message transform — prunes old tool outputs | `hooks/message-transform.ts` | Unit tests pass (13/13). Keeps last 10, truncates older. |
| Anchor scoring + staleness | `schemas/anchor.ts` | Priority scoring, 48h staleness, budget-aware selection. |
| TUI-safe file logging | `lib/logging.ts` | Zero console.log. Writes to `.opencode/idumb/logs/`. |
| Task tool | `tools/task.ts` | create/complete/status. Sets active task for tool-gate. |
| Anchor tool | `tools/anchor.ts` | add/list. Stores via StateManager (persisted to disk). |
| Status tool | `tools/status.ts` | Read-only. Shows active task + anchor summary. |
| **Init tool** | `tools/init.ts` | **NEW.** 60/60 test assertions. Scans brownfield, scaffolds .idumb/, creates config. |
| **Config schema** | `schemas/config.ts` | **NEW.** Language, ExperienceLevel, GovernanceMode, InstallScope, FrameworkDetection. |
| **Framework detector** | `lib/framework-detector.ts` | **NEW.** Detects BMAD/GSD/Spec-kit, tech stack, pkg manager, gaps, conflicts. |
| **Scaffolder** | `lib/scaffolder.ts` | **NEW.** Creates .idumb/ tree, writes config.json, non-destructive. |
| **Agent profile schema** | `modules/schemas/agent-profile.ts` | **NEW.** Roles, permissions, tool categories. |
| **Meta builder template** | `modules/agents/meta-builder.md` | **NEW.** Agent profile with granular bash allow/blocklist. |
| **StateManager** | `lib/persistence.ts` | **NEW.** 45/45 test assertions. Singleton, debounced save, graceful degradation. |
| **Hook verification harness** | `index.ts` | **NEW.** Every hook logs to `hook-verification.log` with debug-level structured entries. |

## What Does NOT Work / Does NOT Exist Yet

| Item | Reality |
|---|---|
| Live hook verification | **Not yet tested.** Verification harness built, but plugin never installed on real project. |
| `experimental.chat.system.transform` | **Unverified.** Hook name NOT in official OpenCode docs. Harness will detect if it fires. |
| `experimental.chat.messages.transform` | **Unverified.** Hook name NOT in official OpenCode docs. Harness will detect if it fires. |
| Cross-session anchor migration | **Not implemented.** Anchors persist to disk but keyed by sessionID. New session = new ID. |
| Role detection | **Not implemented.** No `chat.message` hook. No role-based permissions at runtime. |
| Delegation tracking | **Not implemented.** Subagent hooks don't fire anyway (PP-01). |
| Meta builder agent (runtime) | Template exists (`modules/agents/meta-builder.md`). Not yet deployed as `.opencode/agents/` file. |
| idumb-settings command | **Not implemented.** Config editing is manual for now. |

---

## Critical Known Issues

1. **Experimental hooks unverified** — `system.transform` and `messages.transform` are NOT in official OpenCode docs. Verification harness ready but needs live test.
2. **No live testing done** — all validation is unit tests with mocks. Never installed on a real project. TC-11 to TC-18 ready in TEST-CASES.md.
3. **SessionID mismatch on restart** — StateManager persists state, but OpenCode assigns new sessionID per session. Task/anchor state survives on disk but may not auto-attach to new session.

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

## Custom Tools (4 of max 5)

| Tool | Description |
|---|---|
| `idumb_init` | **NEW.** Initialize iDumb — scans brownfield, detects frameworks, creates .idumb/ + config.json. The entry point. |
| `idumb_task` | Create/complete/check active task. Required before write/edit. |
| `idumb_anchor` | Add/list context anchors that survive compaction. |
| `idumb_status` | Read-only governance state overview. |

---

## Code Style

- **TypeScript** with strict mode, ESM (`"type": "module"`)
- **NO console.log** — use `createLogger(directory, service)`
- **Hook factory pattern** — every hook = function returning async hook. Captured logger.
- **Graceful degradation** — every hook wrapped in try/catch. Only intentional blocks throw.
- **Plain interfaces** — no Zod for internal state (anchor.ts uses plain TS types)
- Functions: `camelCase` | Types: `PascalCase` | Constants: `SCREAMING_SNAKE` | Files: `kebab-case.ts`

---

## Development Commands

```bash
npm run build        # tsc
npm run dev          # tsc --watch
npm run typecheck    # tsc --noEmit
npm test             # runs all 5 test files via tsx (150 assertions)
```

---

## Roadmap (Sequential — Each Must Pass Before Next)

See `STRATEGIC-PLANNING-PROMPT.md` for full details.

| Phase | Goal | Status |
|---|---|---|
| **Phase 0** | Clean slate — docs match reality | **DONE** |
| **Phase 1** | Init + framework detection + scaffolding + config schema | **DONE** (MVP) |
| **Phase 1b** | Disk persistence for hooks + hook verification harness | **DONE** (code complete, needs live test) |
| **Phase 2** | Meta builder agent deployment + deep scan on brownfield | Blocked by Phase 1b |
| **Phase 3** | Compaction anchor survival — live test | Blocked by Phase 2 |
| **Phase 4** | TODO enforcement — real feature development | Blocked by Phase 3 |
| **Phase 5** | Integration stress test — chaotic session | Blocked by Phase 4 |

---

## Session Handoff

When resuming work:

1. Read this file (AGENTS.md) — it reflects reality
2. Read `STRATEGIC-PLANNING-PROMPT.md` — planning SOT with pitfalls, principles, milestones
3. Check which Phase is current (see Roadmap above)
4. Run `npm run typecheck` before starting
5. Run `npm test` to verify baseline
