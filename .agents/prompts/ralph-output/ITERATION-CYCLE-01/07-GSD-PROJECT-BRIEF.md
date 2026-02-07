# GSD Project Brief — Everything a Fresh Agent Needs

**Generated:** 2026-02-08
**Purpose:** Self-contained brief for a new AI agent to start a GSD-New-Project using iDumb
**Rule:** This document must be sufficient WITHOUT any clarification questions

---

## 1. What You're Working With

### 1.1 Project Identity
- **Name:** iDumb v2 (Intelligence Plugin for OpenCode)
- **Package:** `idumb-v2` (npm)
- **Type:** OpenCode plugin — hooks, tools, and schemas that govern AI agent behavior
- **Language:** TypeScript (strict mode, pure ESM)
- **Runtime:** Node.js 18+ with OpenCode SDK v1.1.52+
- **Schema library:** Zod v3 (with local tool() wrapper for SDK's zod v4)
- **Version:** package.json v2.2.0 (NOTE: src/index.ts hardcodes VERSION="2.1.0" — mismatch)

### 1.2 What This Plugin Does (One Sentence)
Intercepts AI agent tool calls at the hook level to inject governance context, enforce task hierarchy, validate chain integrity, and persist critical decisions across compaction events.

### 1.3 What This Plugin Does NOT Do
- Does NOT replace the LLM's reasoning
- Does NOT build GUIs (CLI + file-based only)
- Does NOT work outside OpenCode
- Does NOT use vitest — tests are standalone `tsx` scripts with custom assert + `process.exit()` (may pass via `tsx` but no CI evidence)
- Does NOT have deployed agents (templates exist but `.opencode/agents/` is empty)

---

## 2. Architecture At-a-Glance

```
┌────────────────────────────────────────────────────────────────────┐
│ OpenCode Runtime                                                    │
│                                                                    │
│  PLUGIN A (src/index.ts)              PLUGIN B (src/tools-plugin.ts)│
│  opencode.json: "idumb-v2"            opencode.json: "idumb-v2/     │
│                                         dist/tools-plugin.js"      │
│  ┌─────────────────────┐  ┌──────────────────────────────────┐  │
│  │ 7 Hooks             │  │ 0 Hooks                            │  │
│  │ event               │  │ (self-governed via entity-resolver, │  │
│  │ tool.execute.before  │  │  chain-validator, state-reader)     │  │
│  │ tool.execute.after   │  │                                    │  │
│  │ exp.session.compact  │  │ 4 Tools:                           │  │
│  │ exp.chat.system.xfm  │  │  idumb_read                       │  │
│  │ exp.chat.msgs.xfm    │  │  idumb_write                      │  │
│  │ chat.params          │  │  idumb_bash                       │  │
│  │                     │  │  idumb_webfetch                   │  │
│  │ 5 Tools:            │  └──────────────────────────────────┘  │
│  │  idumb_task          │                                        │
│  │  idumb_anchor        │  ┌──────────────────────────────────┐  │
│  │  idumb_init          │  │ Schemas (shared by both plugins)   │  │
│  │  idumb_scan          │  │ task, delegation, planning-registry │  │
│  │  idumb_codemap       │  │ brain ⚠️ ORPHANED, codemap, config  │  │
│  └─────────────────────┘  │ anchor, project-map                │  │
│                           └──────────────────────────────────┘  │
│              ┌──────────────┐                                    │
│              │ StateManager │  (singleton, shared by both)        │
│              │ persistence  │                                    │
│              └──────┬───────┘                                    │
│                     │                                           │
│              ┌──────▼──────┐                                    │
│              │ .idumb/     │ ← All state lives here              │
│              │ brain/      │   hook-state.json, tasks.json,      │
│              │ governance/ │   delegations.json, planning-reg..   │
│              └─────────────┘                                    │
└────────────────────────────────────────────────────────────────────┘

NOTE: `idumb_status` exists in src/tools/status.ts (83 LOC) but is NOT registered
in either plugin entry point. Status functionality is absorbed into `idumb_task action=status`.
```

---

## 3. Directory Structure (Current, Verified)

```
idumb-v2/
├── package.json          # idumb-v2 v2.2.0, @opencode-ai/plugin + zod deps
├── tsconfig.json         # Strict TS, ESM, NodeNext resolution
├── AGENTS.md             # v6.0.0 — project rules + status (PARTIALLY STALE)
├── src/
│   ├── index.ts          # Plugin A entry — 7 hooks + 5 tools (155 LOC)
│   ├── tools-plugin.ts   # Plugin B entry — 0 hooks + 4 tools: read, write, bash, webfetch (66 LOC)
│   ├── templates.ts      # Agent/command/skill templates (1510 LOC ⚠️)
│   ├── cli.ts            # CLI entry point
│   ├── cli/
│   │   ├── deploy.ts     # Deploys agents, commands to .opencode/
│   │   └── dashboard.ts  # Dashboard CLI scaffold
│   ├── schemas/          # Zod schemas (source of truth)
│   │   ├── index.ts      # Barrel export (87 LOC)
│   │   ├── anchor.ts     # Context anchors for compaction survival
│   │   ├── brain.ts      # Brain knowledge store ⚠️ ORPHANED
│   │   ├── codemap.ts    # Code intelligence mapping
│   │   ├── config.ts     # Plugin configuration
│   │   ├── delegation.ts # Agent delegation protocol
│   │   ├── planning-registry.ts  # Artifact lifecycle governance (729 LOC ⚠️)
│   │   ├── project-map.ts # Project structure mapping
│   │   └── task.ts       # Smart TODO 3-level hierarchy (530 LOC ⚠️)
│   ├── hooks/
│   │   ├── index.ts      # Barrel export
│   │   ├── tool-gate.ts  # tool.execute.before/after — agent-scoped blocking + write gate (282 LOC)
│   │   ├── compaction.ts # experimental.session.compacting — anchor injection (103 LOC)
│   │   ├── system.ts     # experimental.chat.system.transform — governance prefix (68 LOC)
│   │   └── message-transform.ts  # experimental.chat.messages.transform (123 LOC)
│   ├── tools/
│   │   ├── index.ts      # Barrel export
│   │   ├── anchor.ts     # idumb_anchor — add/list anchors
│   │   ├── bash.ts       # idumb_bash — TUI-safe shell
│   │   ├── codemap.ts    # idumb_codemap — code intelligence
│   │   ├── init.ts       # idumb_init — project scaffolding
│   │   ├── read.ts       # idumb_read — governed file reader
│   │   ├── scan.ts       # idumb_scan — codebase scanner
│   │   ├── status.ts     # idumb_status — ⚠️ DEAD CODE (not registered, absorbed into idumb_task)
│   │   ├── task.ts       # idumb_task — 3-level TODO (826 LOC ⚠️)
│   │   ├── webfetch.ts   # idumb_webfetch — web content fetcher
│   │   └── write.ts      # idumb_write — schema-regulated writer (1174 LOC ⚠️)
│   ├── lib/
│   │   ├── index.ts      # Barrel export
│   │   ├── chain-validator.ts    # Chain integrity checker
│   │   ├── code-quality.ts       # Code quality scanner (701 LOC ⚠️)
│   │   ├── entity-resolver.ts    # Entity type classifier (545 LOC ⚠️)
│   │   ├── framework-detector.ts # GSD/BMAD/SpecKit/Open-spec detector
│   │   ├── logging.ts            # TUI-safe file logging
│   │   ├── persistence.ts        # StateManager singleton
│   │   ├── scaffolder.ts         # .idumb/ directory creator
│   │   └── state-reader.ts       # Governance state snapshot reader
│   ├── dashboard/        # Dashboard scaffold (not integrated)
│   └── modules/schemas/  # Module schema (agent-profile.ts)
├── tests/                # 9 standalone tsx scripts (NOT vitest). Run via: npm test
├── planning/             # Planning docs (MOSTLY STALE)
├── dist/                 # Compiled JS output
└── .idumb/               # Runtime state (gitignored)
```

---

## 4. How to Build

```bash
# Install dependencies
npm install

# Type check (should pass with 0 errors)
npx tsc --noEmit

# Build to dist/
npx tsc

# Run tests (standalone tsx scripts — NOT vitest)
npm test
# Equivalent to: tsx tests/tool-gate.test.ts && tsx tests/compaction.test.ts && ...
# NOTE: vitest is NOT in project deps. Do NOT run `npx vitest run`.

# Deploy agents to a target project
npx idumb-v2 init  # Interactive setup

# Configure opencode.json (BOTH plugins must be registered):
# {
#   "plugin": ["idumb-v2", "idumb-v2/dist/tools-plugin.js"]
# }
```

---

## 5. The 9 Registered Tools (Two-Plugin Architecture)

### Plugin A (src/index.ts) — Governance + Intelligence

| Tool | Purpose | Key Args | Notes |
|------|---------|----------|-------|
| `idumb_task` | Epic→Task→Subtask management | action, name, target_id, epic_id, to_agent | 13 actions including delegate. Also includes `action=status` (absorbed from idumb_status) |
| `idumb_anchor` | Context anchors | action (add/list), type, content, priority | Survives compaction |
| `idumb_init` | Project scaffolding + scan | deploy_agents, force | Creates .idumb/ tree |
| `idumb_scan` | Codebase analysis | scope, path, focus | Deterministic (no LLM) |
| `idumb_codemap` | Code intelligence | action (scan/list/todos) | Maps files, functions, TODOs |

### Plugin B (src/tools-plugin.ts) — Entity-Aware Operations (Self-Governed, 0 Hooks)

| Tool | Purpose | Key Args | Notes |
|------|---------|----------|-------|
| `idumb_write` | Schema-regulated file writing | path, content, mode, lifecycle, section | Entity resolution + chain validation |
| `idumb_read` | Governed file read | path, format | Token-budget aware |
| `idumb_bash` | TUI-safe shell | command, timeout | No console.log pollution |
| `idumb_webfetch` | Web content fetch | url, mode | TUI-safe output |

### ⚠️ NOT Registered (Dead Code)
| `idumb_status` | Defined in tools/status.ts (83 LOC) | NOT imported in either plugin entry | Functionality absorbed into `idumb_task action=status` |

---

## 6. The 7 Hook Registrations (Plugin A Only)

| Hook | SDK Type | Purpose |
|------|----------|---------|
| Event | `event` | Session lifecycle events — logs event type |
| Tool Gate (before) | `tool.execute.before` | Agent-scoped permission blocking (AGENT_TOOL_RULES for 7 old agents) + write/edit tool blocking without active task |
| Tool Gate (after) | `tool.execute.after` | Defense-in-depth: replaces output with governance block if before-hook missed |
| Compaction | `experimental.session.compacting` | Injects top-N anchors + active task into post-compaction context (≤2000 chars) |
| System Prompt | `experimental.chat.system.transform` | Injects `<idumb-governance>` block: active task + critical anchors + rules |
| Message Transform | `experimental.chat.messages.transform` | DCP-pattern context pruning: truncates stale tool outputs, keeps last 10 |
| Chat Params | `chat.params` | Captures `input.agent` name from SDK, auto-assigns to active task |

**⚠️ CRITICAL:** `tool-gate.ts` has AGENT_TOOL_RULES for 7 OLD agent names (validator, builder, skills-creator, research-synthesizer, planner, roadmapper). The current 3-agent model names (investigator, executor) are NOT in these rules → new agents bypass hook-level permission enforcement.

---

## 7. The 3 Agents (Templates — NOT DEPLOYED)

| Agent | Level | Role | Key Restriction |
|-------|-------|------|-----------------|
| `idumb-supreme-coordinator` | L0 | Orchestrator — creates tasks, delegates, tracks | Never writes files, never researches |
| `idumb-investigator` | L1 | Researcher — reads, analyzes, writes brain entries | Never writes code, never builds |
| `idumb-executor` | L1 | Builder — writes code, runs tests, implements | Cannot delegate, cannot research |

---

## 8. Known Critical Issues

1. **Test runner non-standard:** Tests are standalone `tsx` scripts with custom `assert()` + `process.exit()`. Run via `npm test` (tsx). NOT vitest. No CI, no coverage.
2. **Agents not deployed:** Templates exist but `.opencode/agents/` is empty
3. **Brain schema is dead code:** No tool creates/reads brain entries
4. **6 files exceed 500 LOC limit:** write.ts (1174), templates.ts (1510), task.ts (826), planning-registry.ts (729), code-quality.ts (701), entity-resolver.ts (545)
5. **Integration at ~39-43%:** Most schemas/tools work in isolation but aren't wired together
6. **No live testing:** Plugin has never been loaded in OpenCode
7. **No baseline measurement:** "60% improvement" claim has no baseline
8. **Stale agent model in tool-gate:** AGENT_TOOL_RULES has 7 old agent names; 3-agent model names not in rules
9. **idumb_status dead code:** Defined but not registered in any plugin entry point
10. **Version mismatch:** package.json says 2.2.0, src/index.ts says 2.1.0
11. **Delegation expiry:** Code says 30 minutes (`DELEGATION_EXPIRY_MS = 30 * 60 * 1000`), not 4 hours

---

## 9. Non-Negotiable Rules

From AGENTS.md:
1. **NO console.log** — all output to files via `lib/logging.ts`
2. **NO `any` types** — strict TypeScript
3. **Context-first** — read before write, scan before plan
4. **Files < 500 LOC** — currently violated by 6 files
5. **ALL state in Zod schemas** — if no schema, it doesn't exist
6. **Graceful degradation** — try/catch on every hook, fail silently
7. **Atomic writes** — JSON persistence via atomicWrite()
8. **Pure ESM** — no require(), no CommonJS

---

## 10. How to Start Working

### If fixing existing issues:
1. Read this brief + `04-GAP-MATRIX.md` for prioritized gaps
2. Start with: update AGENT_TOOL_RULES in tool-gate.ts to use 3-agent names (investigator, executor)
3. Then deploy agents (run CLI: `npx idumb-v2 init --deploy-agents`)
4. Then wire broken chains (tool-gate ↔ entity-resolver, registry → system prompt)
5. Optionally migrate tests to vitest for CI/coverage support

### If starting a new GSD project WITH iDumb:
1. Run `npx idumb-v2 init` in target project
2. Verify `.idumb/` directory created
3. Verify `.opencode/agents/` populated with 3 agent files
4. Start with `idumb_task create_epic` for first work stream
5. Use `idumb_task create_task` for individual tasks
6. Use `idumb_write` for all file creation (triggers governance)
7. Use `idumb_scan` for codebase awareness
8. Use `idumb_task` with `action=status` to check governance state (NOTE: `idumb_status` is dead code)

### What this brief does NOT tell you:
- How the LLM actually responds to injected context (untested)
- Whether compaction anchor injection actually helps (untested)
- How well the 3-agent model coordinates (agents never deployed)
- Performance impact of hook execution (unmeasured)
- Whether tests actually pass via `npm test` (unverified in this audit — AGENTS.md claims 294/294)
- How `tool-gate.ts` agent-scoped rules interact with the new 3-agent model (STALE RULES)
- Whether the two-plugin architecture works correctly when both plugins are loaded

---

*This document is designed to be self-sufficient for a fresh agent to begin work.*
*Generated by Ralph Loop Validation — 2026-02-08*
