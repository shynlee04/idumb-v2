# AGENTS.md — iDumb v2 (Ground Truth)

**Version:** 2.0.0-clean.4  
**Last Updated:** 2026-02-06  
**Status:** Phase 0 complete. Ready for Phase 1 (disk persistence + live verification).

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
│   ├── index.ts                  # Plugin entry (106 LOC) — wires 5 hooks + 3 tools
│   ├── hooks/
│   │   ├── index.ts              # Barrel exports
│   │   ├── tool-gate.ts          # (148 LOC) VALIDATED — blocks write/edit without active task
│   │   ├── compaction.ts         # (108 LOC) Unit-tested — anchor injection via output.context.push()
│   │   ├── message-transform.ts  # (123 LOC) Unit-tested — DCP-pattern context pruning
│   │   └── system.ts             # (69 LOC) UNVERIFIED — hook may not exist in OpenCode
│   ├── lib/
│   │   ├── index.ts              # Barrel exports
│   │   └── logging.ts            # (68 LOC) TUI-safe file-based logger
│   ├── schemas/
│   │   ├── index.ts              # Barrel exports
│   │   └── anchor.ts             # (103 LOC) Anchor types, scoring, staleness, budget selection
│   └── tools/
│       ├── index.ts              # Barrel exports
│       ├── task.ts               # (67 LOC) create/complete/status for active task
│       ├── anchor.ts             # (87 LOC) add/list context anchors
│       └── status.ts             # (59 LOC) Read-only governance state display
├── tests/
│   ├── tool-gate.test.ts         # 10 assertions — all pass
│   ├── compaction.test.ts        # 12 assertions — all pass
│   └── message-transform.test.ts # 12 assertions — all pass
├── .archive/                     # Archived planning docs from previous iterations
├── STRATEGIC-PLANNING-PROMPT.md  # SOT for planning (952 lines, 13 parts)
├── AGENTS.md                     # THIS FILE
├── package.json
└── tsconfig.json
```

**Total:** 14 source files, ~860 LOC. `tsc --noEmit` clean.

---

## What Works (Verified)

| Component | File | Evidence |
|---|---|---|
| Tool gate — blocks write/edit without active task | `hooks/tool-gate.ts` | Unit tests pass (10/10). Throws Error with BLOCK+REDIRECT+EVIDENCE. |
| Compaction anchor injection | `hooks/compaction.ts` | Unit tests pass (12/12). Uses `output.context.push()`. Budget-capped. |
| Message transform — prunes old tool outputs | `hooks/message-transform.ts` | Unit tests pass (12/12). Keeps last 10, truncates older. |
| Anchor scoring + staleness | `schemas/anchor.ts` | Priority scoring, 48h staleness, budget-aware selection. |
| TUI-safe file logging | `lib/logging.ts` | Zero console.log. Writes to `.opencode/idumb/logs/`. |
| Task tool | `tools/task.ts` | create/complete/status. Sets active task for tool-gate. |
| Anchor tool | `tools/anchor.ts` | add/list. Stores in compaction hook's in-memory Map. |
| Status tool | `tools/status.ts` | Read-only. Shows active task + anchor summary. |

## What Does NOT Work / Does NOT Exist

| Item | Reality |
|---|---|
| `tools/init.ts` | **Does not exist.** No init tool. No codebase scanner. No framework detector. |
| `lib/persistence.ts` | **Does not exist.** ALL state is in-memory Maps. Lost on restart. |
| `schemas/permission.ts`, `config.ts`, `state.ts`, `scan.ts` | **Do not exist.** |
| `engines/scanner.ts`, `framework-detector.ts` | **Do not exist.** |
| Disk persistence | **None.** Session state and anchors are in-memory only. |
| Role detection | **Not implemented.** No `chat.message` hook. No role-based permissions. |
| Delegation tracking | **Not implemented.** Subagent hooks don't fire anyway (PP-01). |
| `experimental.chat.system.transform` | **Unverified.** Hook name NOT in official OpenCode docs. |
| `experimental.chat.messages.transform` | **Unverified.** Hook name NOT in official OpenCode docs. |

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

## Custom Tools (3 of max 5)

| Tool | Description |
|---|---|
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
npm test             # runs all 3 test files via tsx
```

---

## Roadmap (Sequential — Each Must Pass Before Next)

See `STRATEGIC-PLANNING-PROMPT.md` for full details.

| Phase | Goal | Status |
|---|---|---|
| **Phase 0** | Clean slate — docs match reality | **DONE** |
| **Phase 1** | Disk persistence + live hook verification on brownfield project | NEXT |
| **Phase 2** | Compaction anchor survival — live test | Blocked by Phase 1 |
| **Phase 3** | TODO enforcement — real feature development | Blocked by Phase 2 |
| **Phase 4** | Integration stress test — chaotic session | Blocked by Phase 3 |
| **Phase 5** | Init/meta-builder — ONLY after core proven | Blocked by Phase 4 |

---

## Session Handoff

When resuming work:

1. Read this file (AGENTS.md) — it reflects reality
2. Read `STRATEGIC-PLANNING-PROMPT.md` — planning SOT with pitfalls, principles, milestones
3. Check which Phase is current (see Roadmap above)
4. Run `npm run typecheck` before starting
5. Run `npm test` to verify baseline
