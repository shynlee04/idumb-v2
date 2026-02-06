# AGENTS.md — iDumb v2 (Ground Truth)

**Version:** 2.1.0  
**Last Updated:** 2026-02-06  
**Status:** Phase 1 MVP complete. Init tool + framework detection + scaffolding implemented and tested.

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
│   │   ├── framework-detector.ts   # NEW: Read-only brownfield scanner (governance + tech + gaps)
│   │   └── scaffolder.ts           # NEW: Creates .idumb/ directory tree + config.json
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
│   └── init.test.ts               # NEW: 60 assertions — all pass
├── .archive/                       # Archived planning docs from previous iterations
├── STRATEGIC-PLANNING-PROMPT.md    # SOT for planning (952 lines, 13 parts)
├── AGENTS.md                       # THIS FILE
├── package.json
└── tsconfig.json
```

**Total:** 20 source files, ~2000 LOC. `tsc --noEmit` clean. 105/105 test assertions pass.

---

## What Works (Verified)

| Component | File | Evidence |
|---|---|---|
| Tool gate — blocks write/edit without active task | `hooks/tool-gate.ts` | Unit tests pass (16/16). Throws Error with BLOCK+REDIRECT+EVIDENCE. |
| Compaction anchor injection | `hooks/compaction.ts` | Unit tests pass (16/16). Uses `output.context.push()`. Budget-capped. |
| Message transform — prunes old tool outputs | `hooks/message-transform.ts` | Unit tests pass (13/13). Keeps last 10, truncates older. |
| Anchor scoring + staleness | `schemas/anchor.ts` | Priority scoring, 48h staleness, budget-aware selection. |
| TUI-safe file logging | `lib/logging.ts` | Zero console.log. Writes to `.opencode/idumb/logs/`. |
| Task tool | `tools/task.ts` | create/complete/status. Sets active task for tool-gate. |
| Anchor tool | `tools/anchor.ts` | add/list. Stores in compaction hook's in-memory Map. |
| Status tool | `tools/status.ts` | Read-only. Shows active task + anchor summary. |
| **Init tool** | `tools/init.ts` | **NEW.** 60/60 test assertions. Scans brownfield, scaffolds .idumb/, creates config. |
| **Config schema** | `schemas/config.ts` | **NEW.** Language, ExperienceLevel, GovernanceMode, InstallScope, FrameworkDetection. |
| **Framework detector** | `lib/framework-detector.ts` | **NEW.** Detects BMAD/GSD/Spec-kit, tech stack, pkg manager, gaps, conflicts. |
| **Scaffolder** | `lib/scaffolder.ts` | **NEW.** Creates .idumb/ tree, writes config.json, non-destructive. |
| **Agent profile schema** | `modules/schemas/agent-profile.ts` | **NEW.** Roles, permissions, tool categories. |
| **Meta builder template** | `modules/agents/meta-builder.md` | **NEW.** Agent profile with granular bash allow/blocklist. |

## What Does NOT Work / Does NOT Exist Yet

| Item | Reality |
|---|---|
| `lib/persistence.ts` | **Does not exist.** Hook state (tool-gate sessions, compaction anchors) is still in-memory Maps. Lost on restart. |
| Disk persistence for hooks | **None.** Config.json is persisted by init, but hook runtime state is ephemeral. |
| Role detection | **Not implemented.** No `chat.message` hook. No role-based permissions at runtime. |
| Delegation tracking | **Not implemented.** Subagent hooks don't fire anyway (PP-01). |
| `experimental.chat.system.transform` | **Unverified.** Hook name NOT in official OpenCode docs. |
| `experimental.chat.messages.transform` | **Unverified.** Hook name NOT in official OpenCode docs. |
| Meta builder agent (runtime) | Template exists (`modules/agents/meta-builder.md`). Not yet deployed as `.opencode/agents/` file. |
| idumb-settings command | **Not implemented.** Config editing is manual for now. |

---

## Critical Known Issues

1. **ALL state is in-memory** — session state (tool-gate.ts Map), anchors (compaction.ts Map) are lost on restart/reload.
2. **Experimental hooks unverified** — `system.transform` and `messages.transform` are NOT in official OpenCode docs. Only `session.compacting` is documented.
3. **No live testing done** — all validation is unit tests with mocks. Never installed on a real project.

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
npm test             # runs all 4 test files via tsx (105 assertions)
```

---

## Roadmap (Sequential — Each Must Pass Before Next)

See `STRATEGIC-PLANNING-PROMPT.md` for full details.

| Phase | Goal | Status |
|---|---|---|
| **Phase 0** | Clean slate — docs match reality | **DONE** |
| **Phase 1** | Init + framework detection + scaffolding + config schema | **DONE** (MVP) |
| **Phase 1b** | Disk persistence for hooks + live hook verification | NEXT |
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
