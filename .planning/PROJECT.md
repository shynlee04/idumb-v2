# iDumb v2: Intelligence Plugin for OpenCode

**Created:** 2026-02-06
**Updated:** 2026-02-06
**Status:** Phase 2C Complete — Awaiting Phase 2B Live Validation
**Type:** Greenfield (strategic reset from v1)

---

## What This Is

An OpenCode plugin that provides **true intelligence** to AI agents — meaning non-hallucination, self-governance, and self-remediation. When context gets poisoned (users bombard with text, chain-of-thought changes mid-session, 20+ compactions), agents detect it, stop, and bounce back to correct workflows.

**The One-Liner:** Make LLMs work like expert senior engineers who always know what to do, when to stop, and how to recover.

---

## The Problem

AI agents in agentic platforms (OpenCode, Claude Code, Cursor, Windsurf) suffer from:

1. **Context Poisoning** — Long sessions, user changes, stale artifacts → agents hallucinate
2. **No Self-Awareness** — Agents don't know what phase they're in, what task, what workflow
3. **No Self-Correction** — When things go wrong, agents continue confidently in the wrong direction
4. **Permission Chaos** — Coordinators write files, validators execute code, boundaries blur

**Target Users:**
- Professional developers (corporate-level complexity)
- Vibe coders (aggressive context pollution, instantaneous thought changes)

---

## The Hypothesis

> Structured governance at the tool level → intelligent agent behavior

If we can:
1. **Intercept tools** before execution (stop hook)
2. **Inject context** (what phase, what task, what's stale)
3. **Enforce permissions** (coordinators delegate, builders build)
4. **Persist state** across compactions (anchors survive)

Then agents will behave "intelligently" — making correct judgments, detecting drift, self-correcting.

---

## Core Mechanisms (Ordered by Frequency/Impact)

| Priority | Mechanism | What It Does | Fallback If Fails |
|----------|-----------|--------------|-------------------|
| **P1** | Stop Hook (tool.execute.before) | Intercept tools, inject governance, block violations | Enforce read order via custom tools |
| **P2** | Inner Cycle Delegation | Manipulate subagent spawning, inject context | Force turn-based reads |
| **P3** | Compact Hook + Message Transform | Inject hierarchy summary on compaction | Last assistant message transform |
| **P4** | 3-Level TODO Task List | Replace innate TODO with governed delegation tool | Simplified 2-level fallback |
| **P5** | Time-to-Stale Enforcement | Timestamp artifacts, auto-invalidate old context | Manual stale detection |
| **P6** | Chain-Breaking Detection | Schema guards on entity relationships | Periodic validation hooks |
| **P7** | Planning Artifacts Hierarchy | Relational metadata, auto-update upstream | Flat artifact structure |

---

## Success Criteria

### The Stress Test

**Scenario:** User bombards agent with context pollution across 20+ compactions
- Requesting features continuously
- Changing requirements mid-stream  
- Mixing multiple chains of thought

**Success:** 60% improvement over baseline (no plugin) measured by:
1. Agent correctly identifies current phase/task
2. Agent detects stale context and discards
3. Agent references correct planning artifacts despite noise
4. Agent stops and reports when chain breaks
5. Agent delegates correctly (coordinators don't write, builders don't coordinate)

### Phase Gates

Every phase ends with:
- [ ] All tests passing
- [ ] Zero TypeScript errors
- [ ] Zero lint errors
- [ ] Schema validation passing
- [ ] Documentation updated

---

## Pivot Boundaries

| Condition | Action |
|-----------|--------|
| Stop hook works | Continue with P1 approach |
| Stop hook fails, workaround exists | Use workaround (read order, tool order enforcement) |
| Entry point + high-frequency mechanisms < 80% efficiency | **PIVOT to fork OpenCode** |
| Context purification doesn't improve behavior | Rethink intelligence hypothesis |

**Hard Boundary:** If plugin approach fundamentally can't achieve tool interception + context injection → pivot to fork.

---

## Architectural Constraints

### Installation
- Single command: `npx idumb-plugin` from GitHub
- Works with OpenCode innate agents (non-breaking)
- No TUI pollution

### Type Safety (Non-Negotiable)
- Zero TypeScript errors
- Zero lint errors
- Strict mode enabled
- All types explicit (no `any`)

### Contracts-First
- Zod schemas define all data structures
- Auto-generated TypeScript types from schemas
- Schema registry with versioning
- API contracts before implementation
- Business contracts (who does what) enforced

### Boundaries
- Clear module responsibilities (no overlap)
- Explicit lifecycles (create → use → dispose)
- Data ownership defined per module
- No cross-boundary mutations

### Governance
- Incremental phases (each builds on previous)
- 100% validation coverage
- Every planning point → implementation → validation
- Phase gates with passing tests

---

## Learning from Ecosystem (Principles)

**From Community Plugins:**
- Study 5+ OpenCode ecosystem plugins
- Extract patterns, not code
- Reimagine, adapt, integrate — **no fork, no copy**
- Document what was learned and how it was adapted

**Platform Concepts (Researched):**
| Concept | OpenCode | Claude Code | iDumb Mapping |
|---------|----------|-------------|---------------|
| Agents | Build, Plan, General, Explore | Single agent with tools | Permission roles (builder, researcher, meta) |
| Subagents | General/Explore as sub | Subagents via tool use | Delegation hierarchy via tool interception |
| Hooks | 10+ hooks (tool.before/after, compact, message transform, permission, event, config, shell.env, chat.params, chat.headers, chat.message) | Shell-based hooks (PreToolUse, PostToolUse, Notification, Stop, SubagentStop) | Interception points: tool-gate, compaction, permission |
| Tools | Custom tools via `tool()` helper + Zod schemas | Bash, computer, MCP tools | Custom governance tools (anchor, status, TODO) |
| Plugins | JS/TS modules exporting hooks + tools | No plugin system (hooks only) | Core delivery mechanism — single package |
| Commands | `/` commands (slash commands) | `/` commands | User entry points (future: `/idumb` commands) |
| Skills | `.opencode/agents/*.md` files | Not available | Agent profiles (deferred — file-based, not plugin) |
| Modes | Agent selection (Build/Plan) | Not available | Context switching via delegation |

**What LLMs See at Key Moments:**
| Moment | What Happens | Plugin Opportunity |
|--------|-------------|--------------------|
| New session | System prompt + agent profile loaded | `event` hook: initialize state |
| Mid-session tool call | Tool args sent, result returned | `tool.execute.before/after`: inject governance |
| Auto-compaction | Session summarized, new context starts | `experimental.session.compacting`: inject anchors |
| User cancel + new message | Previous generation stopped, new message processed | `event` hook: detect interruption, preserve state |
| Manual compact | User triggers `/compact` | Same as auto-compaction — compact hook fires |

---

## Directory Structure (Actual — Phase 2C)

```text
idumb-v2/
├── package.json              # Single entry, @opencode-ai/plugin + zod deps
├── tsconfig.json             # Strict TypeScript, ESM, NodeNext
├── src/
│   ├── plugin.ts             # Plugin entry point (hooks + tools registered)
│   ├── schemas/              # Zod schemas (source of truth)
│   │   ├── index.ts          # Barrel export
│   │   ├── state.ts          # Governance state (history capped at 100)
│   │   ├── anchor.ts         # Context anchors (staleness, scoring, selection)
│   │   ├── config.ts         # Plugin configuration
│   │   ├── permission.ts     # Role permissions (actual OpenCode innate tool names)
│   │   └── scan.ts           # ScanResult schema (project, framework, diagnosis)
│   ├── types/
│   │   └── plugin.ts         # SDK re-exports + local tool() helper (zod v3 compat)
│   ├── engines/              # Deterministic analysis (no LLM)
│   │   ├── index.ts           # Barrel export
│   │   ├── scanner.ts         # Codebase scanner → ScanResult JSON
│   │   └── framework-detector.ts  # GSD/BMAD/SPEC-KIT/Open-spec detection
│   ├── hooks/
│   │   ├── index.ts           # Barrel export
│   │   ├── tool-gate.ts       # P1: Stop hook + after-hook fallback
│   │   └── compaction.ts      # P3: Real anchor injection into compaction
│   ├── tools/
│   │   ├── index.ts           # Barrel export
│   │   ├── anchor.ts          # idumb_anchor_add, idumb_anchor_list
│   │   ├── status.ts          # idumb_status
│   │   └── init.ts            # idumb_init (scaffold + scan + diagnose)
│   └── lib/
│       ├── index.ts           # Barrel export
│       ├── logging.ts         # TUI-safe file logging
│       └── persistence.ts     # Atomic file I/O, state/config/anchor CRUD, PATHS
├── tests/
│   ├── trial-1.ts             # P1 validation (automated)
│   └── trial-init.ts          # Phase 2C validation (9/9 assertions)
├── .planning/                 # Governance documents
│   ├── PROJECT.md             # This file
│   ├── GOVERNANCE.md          # Pitfalls, principles, DOs/DON'Ts, confidence tiers
│   ├── PHASE-COMPLETION.md    # Phase definitions + completion criteria
│   ├── SUCCESS-CRITERIA.md    # Real-life use cases
│   └── config.json            # Planning configuration
├── .idumb/                    # Runtime state + memory (gitignored)
│   ├── brain/
│   │   ├── state.json         # Governance state
│   │   ├── config.json        # Plugin config
│   │   ├── execution-metrics.json
│   │   ├── context/           # Scan results (scan-result.json)
│   │   ├── drift/             # Drift detection history
│   │   ├── governance/validations/
│   │   ├── history/           # Decision history
│   │   ├── metadata/          # Project metadata
│   │   └── sessions/          # Per-session brain state
│   ├── anchors/               # Persisted anchors (one JSON per anchor)
│   ├── sessions/              # Session JSON files
│   ├── signals/               # Inter-agent signals
│   ├── modules/               # Installed modules (future)
│   ├── governance/            # Plugin logs
│   ├── backups/               # State backups
│   └── project-output/        # Phase outputs, research, roadmaps, validations
├── .plugin-dev/research/      # Dev-time research artifacts (not shipped)
└── dist/                      # Compiled JS output (21 files)
```

---

## Requirements

### Validated (Phase 0-2C)

- [x] REQ-01: Plugin loads in OpenCode without TUI pollution
- [x] REQ-02: Stop hook intercepts tool execution (Trial-1 PASS)
- [x] REQ-03: Permission enforcement blocks unauthorized tools (Trial-1 PASS)
- [x] REQ-10: Zero TypeScript/lint errors at all times
- [x] REQ-11: All data structures have Zod schemas
- [x] REQ-17: TOOL_CATEGORIES maps actual OpenCode innate tools (not invented names)
- [x] REQ-18: Codebase scanner produces schema-validated JSON memory (9/9 assertions)
- [x] REQ-19: Framework detector uses required+optional markers (no false positives)
- [x] REQ-20: `.idumb/` tree scaffolded programmatically (16 directories)
- [x] REQ-21: All scan output → JSON in `.idumb/brain/context/` (no .md dump)

### Active (Phase 2B+)

**Core Plugin:**
- [ ] REQ-04: State persists across compactions via anchors (awaiting live test)

**Governance (Intelligence):**
- [ ] REQ-05: Agent knows current phase/task at all times
- [ ] REQ-06: Stale context auto-detected and flagged
- [ ] REQ-07: Chain breaks trigger stop + report
- [ ] REQ-08: Delegation respects hierarchy (coordinators → builders)

**Architecture (Quality):**
- [ ] REQ-09: Single npx install command works
- [ ] REQ-12: Every phase passes validation gate

**Stress Test:**
- [ ] REQ-13: Survives 20+ compactions with correct state
- [ ] REQ-14: 60% improvement over baseline in stress scenarios
- [ ] REQ-15: Baseline measurement established (NO plugin)
- [ ] REQ-16: Custom tools appear and function in OpenCode tool list

### Out of Scope

- GUI/visual interfaces — CLI and file-based only
- Multi-platform (Cursor, Windsurf) — OpenCode first, others later
- Forking OpenCode — plugin approach unless pivot triggered
- Real-time collaboration — single user focus

---

## Key Decisions

| Decision | Rationale | Status |
|----------|-----------|--------|
| Plugin over fork | Lower barrier, faster iteration, ecosystem compatibility | **VALIDATED** — plugin loads, hooks fire |
| Stop hook as primary mechanism | Highest frequency, most control | **VALIDATED** — Trial-1 PASS |
| Zod for schemas | Runtime validation + type inference | Decided |
| Contracts-first development | Prevent boundary violations, enforce quality | Decided |
| 60% improvement bar | Measurable, ambitious but achievable | Decided — baseline measurement pending |
| No fork/copy from plugins | Ethical learning, original implementation | Decided |
| Compact replaces innate (not manual) | Compact hook fires on auto-compaction, injects anchors automatically | Decided |
| Local tool() helper for zod v3 | SDK ships zod v4, project uses v3. Local wrapper mirrors SDK runtime. | Decided |
| Default role = meta (allow-all) | Never break innate agents. Plugin ADDS, never RESTRICTS. | Decided |
| Integration with GSD + SPEC-KIT | Plugin provides enforcement + traceability layers for external workflows | Decided — design pending |
| All output → JSON in .idumb/brain/ | No .md template dump. Everything in code. Traceable, queryable. | **VALIDATED** — Phase 2C |
| Scanner = deterministic (no LLM) | Pure filesystem analysis. No hallucination risk. Reproducible. | **VALIDATED** — 9/9 assertions |
| Framework detector: required markers | Prevents false positives (GSD requires STATE.md, not generic PROJECT.md) | **VALIDATED** — Phase 2C |
| TOOL_CATEGORIES = actual OpenCode tools | Map real innate tools (read, list, glob, grep, edit, write, bash, task, etc.) not invented names | **VALIDATED** — Phase 2C |

---

## Research Status

| Dimension | Status | Artifact |
|-----------|--------|----------|
| Platform Concepts Matrix | COMPLETED | Filled in this document (above) |
| Community Plugins Study | COMPLETED | `.windsurf/plans/idumb-strategic-reboot-phase2-0de880.md` |
| Pitfalls Catalog | COMPLETED | `.planning/GOVERNANCE.md` Part 3 |
| Development Principles | COMPLETED | `.planning/GOVERNANCE.md` Parts 4-5 |
| Phase Completion Criteria | COMPLETED | `.planning/PHASE-COMPLETION.md` |
| Success Criteria (Use Cases) | COMPLETED | `.planning/SUCCESS-CRITERIA.md` |
| Gap Analysis | COMPLETED | `.planning/GOVERNANCE.md` Part 7 |

## Integration with Meta-Frameworks

### GSD (Get Shit Done) Workflow

iDumb serves as the **enforcement layer**:
- Research phase → plugin context injection: "you are in research"
- Planning phase → tool interception: "read plan before executing"
- Execution phase → atomic commit tracking against plan items
- Validation phase → auto-run validation checks after tool execution

### SPEC-KIT (Specification-Driven Development)

iDumb serves as the **traceability layer**:
- Requirements → anchors → survive compaction
- Acceptance criteria → validation hooks
- Tech stack decisions → chain-breaking detection
- Implementation plans → 3-level TODO delegation

### Compact Command Clarification

The compact hook is **NOT** for manual `/compact` commands. It:
1. **Replaces** innate compaction behavior by injecting structured context
2. **Fires automatically** when OpenCode triggers compaction (token limit, session length)
3. **Selects** anchors by score (priority × freshness), budget-capped to ≤500 tokens
4. **Does NOT** require user action — governance is always active

---

## Implementation Progress

| Phase | Status | Key Artifacts |
|-------|--------|---------------|
| Phase 0: Foundation | COMPLETE | `plugin.ts`, `persistence.ts`, `logging.ts`, schemas |
| Phase 1: Stop Hook (T1) | COMPLETE | `hooks/tool-gate.ts`, `schemas/permission.ts`, `tests/trial-1.ts` |
| Phase 2A: Custom Tools + Compaction | COMPLETE | `tools/anchor.ts`, `tools/status.ts`, `hooks/compaction.ts` |
| Phase 2C: Scanner + Init (Intelligence) | COMPLETE | `engines/scanner.ts`, `engines/framework-detector.ts`, `schemas/scan.ts`, `tools/init.ts`, `tests/trial-init.ts` |
| Phase 2B: Live Validation + Baseline | NOT STARTED | **CRITICAL GATE** — requires: load in OpenCode, stress test |
| Phase C: Interactive Config | NOT STARTED | Post-scan questionnaire → config.json |
| Phase D: Meta-Builder | NOT STARTED | Gap → build agents/commands via Task() delegation |
| Phase 3: Inner Cycle Delegation | NOT STARTED | |
| Phase 4: 3-Level TODO | NOT STARTED | |
| Phase 5: Message Transform | BLOCKED | Requires: LLM read order A/B test |
| Phase 6: Auto-run + State | NOT STARTED | |

## Governance Documents

| Document | Purpose |
|----------|---------|
| `GOVERNANCE.md` | Pitfalls, non-negotiable principles, DOs/DON'Ts, confidence tiers, integration framework, gap analysis |
| `PHASE-COMPLETION.md` | Phase definitions with incremental completion criteria and pivot decisions |
| `SUCCESS-CRITERIA.md` | 4 real-life use cases exercising all plugin elements with measurement methodology |
| `PROJECT.md` | This file — single source of truth for project state |

---

*Last updated: 2026-02-06 after Phase 2C completion (scanner + init tool) + validation audit*
