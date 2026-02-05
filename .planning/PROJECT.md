# iDumb v2: Intelligence Plugin for OpenCode

**Created:** 2026-02-06
**Status:** Initialized
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

**Platform Concepts to Master:**
| Concept | OpenCode | Claude Code | iDumb Mapping |
|---------|----------|-------------|---------------|
| Agents | ? | ? | Permission roles |
| Subagents | ? | ? | Delegation hierarchy |
| Hooks | ? | ? | Interception points |
| Tools | ? | ? | Custom governance tools |
| Plugins | ? | ? | Core delivery mechanism |
| Commands | ? | ? | User entry points |
| Skills | ? | ? | Specialized knowledge |
| Modes | ? | ? | Context switching |

*(To be filled by research)*

---

## Directory Structure (Target)

```
idumb-v2/
├── package.json              # Single entry, npx installable
├── tsconfig.json             # Strict TypeScript
├── .eslintrc.json            # Zero tolerance
├── src/
│   ├── index.ts              # Plugin entry point
│   ├── schemas/              # Zod schemas (source of truth)
│   │   ├── registry.ts       # Schema registry
│   │   ├── state.ts          # Governance state
│   │   ├── anchor.ts         # Context anchors
│   │   ├── permission.ts     # Role permissions
│   │   └── ...
│   ├── types/                # Auto-generated from schemas
│   │   └── index.ts          # Re-exports inferred types
│   ├── hooks/                # OpenCode hook implementations
│   │   ├── tool-gate.ts      # P1: Stop hook
│   │   ├── delegation.ts     # P2: Inner cycle
│   │   ├── compact.ts        # P3: Compaction
│   │   └── ...
│   ├── tools/                # Custom governance tools
│   │   ├── todo.ts           # P4: 3-level TODO
│   │   ├── stale.ts          # P5: Time-to-stale
│   │   └── ...
│   ├── lib/                  # Shared utilities
│   │   ├── logging.ts        # TUI-safe logging
│   │   ├── persistence.ts    # Atomic file I/O
│   │   └── validation.ts     # Contract validation
│   └── contracts/            # Business contracts
│       ├── roles.ts          # Who does what
│       └── lifecycles.ts     # State transitions
├── tests/                    # Trial validations
│   ├── trial-1.test.ts       # P1 validation
│   ├── trial-2.test.ts       # P2 validation
│   └── ...
├── .idumb/                   # Runtime state (gitignored)
│   ├── state.json            # Current governance state
│   └── logs/                 # Debug logs
└── docs/
    ├── CONCEPTS.md           # Platform concept mapping
    ├── PITFALLS.md           # What to avoid
    └── PRINCIPLES.md         # Development DOs/DONTs
```

---

## Requirements

### Validated

*(None yet — ship to validate)*

### Active

**Core Plugin (Must Work):**
- [ ] REQ-01: Plugin loads in OpenCode without TUI pollution
- [ ] REQ-02: Stop hook intercepts tool execution
- [ ] REQ-03: Permission enforcement blocks unauthorized tools
- [ ] REQ-04: State persists across compactions via anchors

**Governance (Intelligence):**
- [ ] REQ-05: Agent knows current phase/task at all times
- [ ] REQ-06: Stale context auto-detected and flagged
- [ ] REQ-07: Chain breaks trigger stop + report
- [ ] REQ-08: Delegation respects hierarchy (coordinators → builders)

**Architecture (Quality):**
- [ ] REQ-09: Single npx install command works
- [ ] REQ-10: Zero TypeScript/lint errors at all times
- [ ] REQ-11: All data structures have Zod schemas
- [ ] REQ-12: Every phase passes validation gate

**Stress Test:**
- [ ] REQ-13: Survives 20+ compactions with correct state
- [ ] REQ-14: 60% improvement over baseline in stress scenarios

### Out of Scope

- GUI/visual interfaces — CLI and file-based only
- Multi-platform (Cursor, Windsurf) — OpenCode first, others later
- Forking OpenCode — plugin approach unless pivot triggered
- Real-time collaboration — single user focus

---

## Key Decisions

| Decision | Rationale | Status |
|----------|-----------|--------|
| Plugin over fork | Lower barrier, faster iteration, ecosystem compatibility | Pending validation |
| Stop hook as primary mechanism | Highest frequency, most control | Pending TRIAL-1 |
| Zod for schemas | Runtime validation + type inference | Decided |
| Contracts-first development | Prevent boundary violations, enforce quality | Decided |
| 60% improvement bar | Measurable, ambitious but achievable | Decided |
| No fork/copy from plugins | Ethical learning, original implementation | Decided |

---

## Research Needed

Before roadmap, research these dimensions:

1. **Platform Concepts Matrix**
   - OpenCode vs Claude Code: agents, hooks, tools, plugins, commands, skills
   - What LLMs see: new thread, mid-session, compaction, cancel
   - Subsets and custom variants of each concept

2. **Community Plugins Study**
   - 5+ plugins from OpenCode ecosystem
   - Extract patterns (not code)
   - Document learnings and adaptations

3. **Pitfalls Catalog**
   - What breaks TUI
   - What conflicts with innate agents
   - What doesn't work in practice

4. **Development Principles**
   - DOs and DONTs for plugin development
   - Success criteria for each mechanism
   - Pivot decision framework

---

## Context from v1 (Reference Only)

The existing v2/ directory contains TRIAL-1 implementation:
- Permission schemas and role detection
- Tool-gate hook implementation
- Basic state persistence

**Status:** Archived as reference. This project starts fresh with proper research and contracts-first approach. Learnings from TRIAL-1 inform but don't constrain the new architecture.

---

*Last updated: 2026-02-06 after initialization*
