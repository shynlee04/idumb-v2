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

### 1.2 What This Plugin Does (One Sentence)
Intercepts AI agent tool calls at the hook level to inject governance context, enforce task hierarchy, validate chain integrity, and persist critical decisions across compaction events.

### 1.3 What This Plugin Does NOT Do
- Does NOT replace the LLM's reasoning
- Does NOT build GUIs (CLI + file-based only)
- Does NOT work outside OpenCode
- Does NOT have working tests (all 8 test files fail)
- Does NOT have deployed agents (templates exist but `.opencode/agents/` is empty)

---

## 2. Architecture At-a-Glance

```
┌─────────────────────────────────────────────────────────────┐
│ OpenCode Runtime                                             │
│                                                              │
│   ┌─────────────┐    ┌──────────────┐    ┌──────────────┐  │
│   │ Hooks       │    │ Tools        │    │ Schemas      │  │
│   │             │    │              │    │              │  │
│   │ tool-gate   │───>│ idumb_task   │───>│ task.ts      │  │
│   │ compaction  │    │ idumb_write  │    │ delegation   │  │
│   │ system      │    │ idumb_init   │    │ planning-reg │  │
│   │ msg-xform   │    │ idumb_scan   │    │ brain.ts ⚠️  │  │
│   │ chat.params │    │ idumb_codemap│    │ codemap      │  │
│   │             │    │ +5 more      │    │ +4 more      │  │
│   └──────┬──────┘    └──────┬───────┘    └──────────────┘  │
│          │                  │                               │
│          └──────────┬───────┘                               │
│                     │                                       │
│              ┌──────▼──────┐                                │
│              │ StateManager │                                │
│              │ (singleton)  │                                │
│              │ persistence  │                                │
│              └──────┬──────┘                                │
│                     │                                       │
│              ┌──────▼──────┐                                │
│              │ .idumb/     │                                │
│              │ brain/      │ ← All state lives here        │
│              │ anchors/    │                                │
│              │ sessions/   │                                │
│              └─────────────┘                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Directory Structure (Current, Verified)

```
idumb-v2/
├── package.json          # idumb-v2 package, @opencode-ai/plugin + zod deps
├── tsconfig.json         # Strict TS, ESM, NodeNext resolution
├── AGENTS.md             # v6.0.0 — project rules + status (PARTIALLY STALE)
├── src/
│   ├── index.ts          # Plugin entry — registers 5 hooks + 5 tools
│   ├── tools-plugin.ts   # Additional tools (bash, read, webfetch)
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
│   │   ├── tool-gate.ts  # tool.execute.before/after — main governance hook
│   │   ├── compaction.ts # experimental.session.compacting — anchor injection
│   │   ├── system.ts     # system.prompt.transform — governance prefix
│   │   └── message-transform.ts  # Message format transform
│   ├── tools/
│   │   ├── index.ts      # Barrel export
│   │   ├── anchor.ts     # idumb_anchor — add/list anchors
│   │   ├── bash.ts       # idumb_bash — TUI-safe shell
│   │   ├── codemap.ts    # idumb_codemap — code intelligence
│   │   ├── init.ts       # idumb_init — project scaffolding
│   │   ├── read.ts       # idumb_read — governed file reader
│   │   ├── scan.ts       # idumb_scan — codebase scanner
│   │   ├── status.ts     # idumb_status — system state
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
├── tests/                # ALL FAIL ❌ (8/8 test files)
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

# Run tests (CURRENTLY ALL FAIL — needs migration to vitest)
npx vitest run

# Deploy agents to a target project
npx idumb-v2 init  # Interactive setup
```

---

## 5. The 10 Tools Available

| Tool | Purpose | Key Args | Notes |
|------|---------|----------|-------|
| `idumb_task` | Epic→Task→Subtask management | action, name, target_id, epic_id, to_agent | 13 actions including delegate |
| `idumb_write` | Schema-regulated file writing | path, content, mode, lifecycle, section | Entity resolution + chain validation |
| `idumb_init` | Project scaffolding + scan | deploy_agents, force | Creates .idumb/ tree |
| `idumb_scan` | Codebase analysis | scope, path, focus | Deterministic (no LLM) |
| `idumb_codemap` | Code intelligence | action (scan/list/todos) | Maps files, functions, TODOs |
| `idumb_anchor` | Context anchors | action (add/list), type, content, priority | Survives compaction |
| `idumb_status` | System state summary | (none) | Shows tasks, anchors, session |
| `idumb_bash` | TUI-safe shell | command, timeout | No console.log pollution |
| `idumb_read` | Governed file read | path, format | Token-budget aware |
| `idumb_webfetch` | Web content fetch | url, mode | TUI-safe output |

---

## 6. The 5 Hooks

| Hook | Type | Purpose |
|------|------|---------|
| Tool Gate (before) | `tool.execute.before` | Intercepts tool calls, injects governance metadata |
| Tool Gate (after) | `tool.execute.after` | Logs tool execution results |
| Compaction | `experimental.session.compacting` | Injects surviving anchors into compaction context |
| System Prompt | `system.prompt.transform` | Adds governance prefix (active task, mode) |
| Chat Params | `chat.params` | Captures agent name for identity tracking |

---

## 7. The 3 Agents (Templates — NOT DEPLOYED)

| Agent | Level | Role | Key Restriction |
|-------|-------|------|-----------------|
| `idumb-supreme-coordinator` | L0 | Orchestrator — creates tasks, delegates, tracks | Never writes files, never researches |
| `idumb-investigator` | L1 | Researcher — reads, analyzes, writes brain entries | Never writes code, never builds |
| `idumb-executor` | L1 | Builder — writes code, runs tests, implements | Cannot delegate, cannot research |

---

## 8. Known Critical Issues

1. **Tests fail:** All 8 test files use `process.exit()` incompatible with vitest
2. **Agents not deployed:** Templates exist but `.opencode/agents/` is empty
3. **Brain schema is dead code:** No tool creates/reads brain entries
4. **6 files exceed 500 LOC limit:** write.ts (1174), templates.ts (1510), task.ts (826), planning-registry.ts (729), code-quality.ts (701), entity-resolver.ts (545)
5. **Integration at 39%:** Most schemas/tools work in isolation but aren't wired together
6. **No live testing:** Plugin has never been loaded in OpenCode
7. **No baseline measurement:** "60% improvement" claim has no baseline

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
2. Start with test runner fix (process.exit → vitest describe/it)
3. Then deploy agents (run CLI or programmatic deploy)
4. Then wire broken chains (tool-gate ↔ entity-resolver)

### If starting a new GSD project WITH iDumb:
1. Run `npx idumb-v2 init` in target project
2. Verify `.idumb/` directory created
3. Verify `.opencode/agents/` populated with 3 agent files
4. Start with `idumb_task create_epic` for first work stream
5. Use `idumb_task create_task` for individual tasks
6. Use `idumb_write` for all file creation (triggers governance)
7. Use `idumb_scan` for codebase awareness
8. Use `idumb_status` to check governance state

### What this brief does NOT tell you:
- How the LLM actually responds to injected context (untested)
- Whether compaction anchor injection actually helps (untested)
- How well the 3-agent model coordinates (agents never deployed)
- Performance impact of hook execution (unmeasured)

---

*This document is designed to be self-sufficient for a fresh agent to begin work.*
*Generated by Ralph Loop Validation — 2026-02-08*
