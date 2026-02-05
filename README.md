# iDumb v2 — Intelligent Delegation Using Managed Boundaries

> Make LLMs work like expert senior engineers who always know what to do, when to stop, and how to recover.

**iDumb v2** is an [OpenCode](https://opencode.ai) plugin that provides structured governance for AI agents through tool interception, permission enforcement, context preservation across compactions, and delegation hierarchy.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![OpenCode Plugin](https://img.shields.io/badge/OpenCode-Plugin-green.svg)](https://opencode.ai/docs/plugins/)

---

## The Problem

AI agents in agentic platforms suffer from:

- **Context Poisoning** — Long sessions, user changes, stale artifacts → agents hallucinate
- **No Self-Awareness** — Agents don't know what phase they're in, what task, what workflow
- **No Self-Correction** — When things go wrong, agents continue confidently in the wrong direction
- **Permission Chaos** — Coordinators write files, validators execute code, boundaries blur

## The Hypothesis

> Structured governance at the tool level → intelligent agent behavior

If we can **intercept tools** before execution, **inject context** (phase, task, staleness), **enforce permissions** (coordinators delegate, builders build), and **persist state** across compactions (anchors survive), then agents will behave "intelligently."

## Architecture

```
src/
├── plugin.ts           # Entry point — hooks + custom tools
├── engines/            # Business logic (no OpenCode dependencies)
│   ├── scanner.ts      # Deterministic codebase scanner
│   └── framework-detector.ts
├── hooks/              # OpenCode event handlers
│   ├── tool-gate.ts    # T1: tool.execute.before/after
│   └── compaction.ts   # T3: session.compacting
├── schemas/            # Zod schemas (source of truth)
│   ├── state.ts        # Governance state
│   ├── anchor.ts       # Context anchors (staleness, scoring)
│   ├── config.ts       # Plugin configuration
│   ├── permission.ts   # Role-based permissions
│   └── scan.ts         # Codebase scan results
├── tools/              # Custom tools for agents
│   ├── init.ts         # idumb_init — scaffold + scan
│   ├── anchor.ts       # idumb_anchor_add/list
│   └── status.ts       # idumb_status
├── lib/                # Utilities
│   ├── persistence.ts  # Atomic file I/O
│   └── logging.ts      # TUI-safe file logging
└── types/
    └── plugin.ts       # SDK type helpers (zod v3 compat)
```

### Core Mechanisms

| Priority | Mechanism | Hook | Status |
|----------|-----------|------|--------|
| **P1** | Stop Hook — intercept tools, enforce permissions | `tool.execute.before` | ✅ Validated |
| **P2** | Delegation — track subagent spawning | `tool.execute.before` on `task` | ⚠️ Pivoting |
| **P3** | Compaction — inject anchors on context reset | `experimental.session.compacting` | 🔨 Implemented |
| **P4** | 3-Level TODO — governed task delegation | Custom tool | 📋 Planned |
| **P5** | Message Transform — optimize LLM attention | `experimental.chat.messages.transform` | 🔬 Experimental |

## Quick Start

### Prerequisites

- Node.js ≥ 18
- [OpenCode](https://opencode.ai) installed

### Install & Build

```bash
# Clone
git clone https://github.com/shynlee04/v2.git
cd v2

# Install dependencies
npm install

# Build TypeScript
npm run build

# Type check (no emit)
npm run typecheck
```

### Install in OpenCode

```bash
# Copy built plugin to OpenCode plugins directory
cp -r dist/* ~/.config/opencode/plugins/idumb-v2/
```

### Run Tests

```bash
# Trial 1: Stop hook validation
npm run test:t1

# Trial Init: Scanner validation
npm run test:t2
```

## Plugin Hooks

| Hook | Purpose | Trial |
|------|---------|-------|
| `event` | Session lifecycle tracking (created, idle, compacted) | T8 |
| `chat.message` | Agent name capture for role detection | T1 |
| `tool.execute.before` | Permission enforcement, arg injection | **T1** |
| `tool.execute.after` | Violation detection, output replacement (fallback) | T1 |
| `experimental.session.compacting` | Anchor injection into compaction context | **T3** |
| `experimental.chat.messages.transform` | Message position experiments | T5/T6 |
| `permission.ask` | Permission request logging | T8 |

## Custom Tools

### `idumb_init`

Initialize governance state. Scaffolds `.idumb/` directory, scans codebase, detects frameworks.

```
> Use idumb_init to set up governance for this project
```

### `idumb_anchor_add`

Create a context anchor that survives session compaction.

| Arg | Type | Description |
|-----|------|-------------|
| `type` | `decision` \| `context` \| `checkpoint` \| `error` \| `attention` | Anchor classification |
| `content` | string (max 2000) | What to preserve |
| `priority` | `critical` \| `high` \| `medium` \| `low` | Survival priority |

### `idumb_anchor_list`

List all active anchors with staleness information and scores.

### `idumb_status`

Show current governance state: version, phase, anchor count, validation count.

## Permission System

### Agent Roles

| Agent Pattern | Role | Permissions |
|---------------|------|-------------|
| Build, General | builder | read, write, execute |
| Plan, Explore | researcher | read |
| *coordinator*, *supreme* | coordinator | read, delegate |
| *validator*, *checker* | validator | read, validate |
| *meta* | meta | all (framework dev) |

### Tool Categories

| Category | OpenCode Tools |
|----------|---------------|
| **read** | read, list, glob, grep, webfetch, websearch, codesearch, todoread, skill |
| **write** | write, edit, todowrite |
| **execute** | bash |
| **delegate** | task |
| **validate** | test, verify |

## Trial Status

This project uses a **micro-trial methodology** — each feature is a trial with explicit PASS criteria and PIVOT strategies.

| Trial | Description | Status | PASS |
|-------|-------------|--------|------|
| T1 | Stop Hook Tool Manipulation | **✅ VALIDATED** | 3/4 |
| T2 | Inner Cycle Delegation | ⚠️ PIVOTING | 0/4 |
| T3 | Compact Hook + Text Complete | 🔨 IMPLEMENTED | 2/4 |
| T4 | Sub-task Background Tracking | ⏳ NOT STARTED | 0/4 |
| T5 | Compact Message Hierarchy | 🔬 PLACEHOLDER | 0/4 |
| T6 | User Prompt Transform | 🔬 PLACEHOLDER | 0/4 |
| T7 | Force Delegation + 3-Level TODO | ⏳ NOT STARTED | 0/4 |
| T8 | Auto-run + Export + State | 🔨 PARTIAL | 1/4 |

See [`TRIAL-TRACKER.md`](./TRIAL-TRACKER.md) for detailed trial status, pivot decisions, and test logs.

## Roadmap

```
Phase 0: Foundation .......................... ✅ COMPLETE
Phase 1: Stop Hook (T1) ..................... ✅ COMPLETE
Phase 2A: Custom Tools + Compaction .......... ✅ COMPLETE
Phase 2C: Scanner + Init .................... ✅ COMPLETE
Phase 2B: Live Validation + Baseline ......... ⬅️ CURRENT (critical gate)
Phase 3: Inner Cycle Delegation (T2) ........ 📋 NEXT
Phase 4: 3-Level TODO (T7) .................. 📋 PLANNED
Phase 5: Message Transform (T5/T6) .......... 🔬 EXPERIMENTAL
Phase 6: Auto-run + State (T8) .............. 📋 PLANNED
```

## Success Criteria

**The Stress Test:** User bombards agent with context pollution across 20+ compactions — continuous feature requests, mid-stream requirement changes, mixed chains of thought.

**Target:** 60% improvement over baseline (no plugin) measured by:
1. Agent correctly identifies current phase/task
2. Agent detects stale context and discards
3. Agent references correct planning artifacts despite noise
4. Agent stops and reports when chain breaks
5. Agent delegates correctly (coordinators don't write)

## Project Documentation

| Document | Purpose |
|----------|---------|
| [`TRIAL-TRACKER.md`](./TRIAL-TRACKER.md) | Living trial-pivot status board |
| [`GAP-ANALYSIS.md`](./GAP-ANALYSIS.md) | Technical gaps and recommendations |
| [`CHANGELOG.md`](./CHANGELOG.md) | Version history |
| [`TRIAL-1-RESULTS.md`](./TRIAL-1-RESULTS.md) | Trial-1 validation report |
| [`.planning/PROJECT.md`](./.planning/PROJECT.md) | Single source of truth for project state |
| [`.planning/GOVERNANCE.md`](./.planning/GOVERNANCE.md) | Pitfalls, principles, DOs/DON'Ts |
| [`.planning/PHASE-COMPLETION.md`](./.planning/PHASE-COMPLETION.md) | Phase gates with completion criteria |
| [`.planning/SUCCESS-CRITERIA.md`](./.planning/SUCCESS-CRITERIA.md) | Real-life stress test use cases |

## Contributing

### Methodology

This project follows a **trial-pivot** approach:

1. **Define** — Each feature is a numbered trial (T1-T8) with 4 PASS criteria
2. **Implement** — Build the minimum to test the hypothesis
3. **Validate** — Automated tests + manual OpenCode verification
4. **Pivot or Continue** — If criteria fail, execute the predefined pivot strategy

### Development Rules

- **Zero TypeScript errors** at all times (`npm run typecheck`)
- **Zero `console.log`** — use file logging via `lib/logging.ts` (TUI safety)
- **Contracts-first** — define Zod schema → generate types → implement logic
- **One trial at a time** — don't stack features without validation

### Code Style

- Functions: `camelCase`
- Types/Interfaces: `PascalCase`
- Constants: `SCREAMING_SNAKE`
- Files: `kebab-case.ts`

## Known Limitations

- **Subagent hook gap:** OpenCode `tool.execute.before` does not intercept subagent tool calls ([sst/opencode#5894](https://github.com/sst/opencode/issues/5894)). This affects T2 delegation tracking.
- **Agent detection timing:** `chat.message` may fire after the first tool call, causing a race condition where the first tool runs with default (allow-all) permissions.
- **In-memory sessions:** Session tracking is lost on plugin restart. File persistence exists but is not synchronized with in-memory state.

## License

[MIT](https://opensource.org/licenses/MIT)
