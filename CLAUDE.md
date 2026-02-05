# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# NON-NEGOTIABLE RULES
- All agents must work by gathering context first, knowing which workflow **MUST FIND SKILL** to adapt the best selection for Complex, multi-step, recurring, or, domain-specific tasks. There is **NO TOLERANCE** for agents that start execute tasks without proper context gathering, and planning.
- Update this CLAUDE.md iteratively, and be the single-source-of-truth, at all time for all agents.
- Never make changes to the core plugin without first consulting `.planning/GOVERNANCE.md` and `.planning/PROJECT.md`
- Always validate that changes align with the current phase completion criteria in `.planning/PHASE-COMPLETION.md`
- Zero TypeScript errors and zero lint errors are non-negotiable at all times

## Project Overview

iDumb v2 (Intelligent Delegation Using Managed Boundaries) is a **clean reboot** of the iDumb governance framework. This is a greenfield project that provides structured infrastructure at the tool level so that LLM agents exhibit intelligent behavior — defined as: always knowing what to do, when to stop, and how to recover.

**Version:** 2.0.0-alpha.1 | **Last Updated:** 2026-02-06 | **Current Phase:** Phase 2A Complete

### What This Plugin Does

iDumb provides **structured infrastructure** (hooks, tools, schemas, state persistence) that removes obstacles preventing LLMs from working correctly. It does NOT replace LLM reasoning with rule-based logic.

**Core Mechanism:** Intercept tools before execution → inject governance context (current phase, task, anchors, delegation hierarchy) → enforce permissions → persist state across compactions.

**The Hypothesis:** If agents always have access to current phase/task, relevant anchors, and delegation hierarchy, they will make correct judgments, detect drift, and self-correct.

## Architecture

### Clean Separation: Engines, Tools, Hooks

The plugin follows a strict separation pattern:

```
src/
├── engines/          # Business logic (no OpenCode dependencies)
│   ├── framework-detector.ts  # Detects GSD, BMAD, or custom frameworks
│   ├── scanner.ts            # Scans project structure
│   └── index.ts
├── tools/            # OpenCode tool wrappers (expose engines)
│   ├── init.ts               # idumb_init tool
│   ├── anchor.ts             # idumb_anchor_add, idumb_anchor_list
│   ├── status.ts             # idumb_status
│   └── index.ts
├── hooks/            # OpenCode event handlers
│   ├── tool-gate.ts          # tool.execute.before/after (P1 mechanism)
│   ├── compaction.ts         # experimental.session.compacting (P3 mechanism)
│   └── index.ts
├── schemas/          # Zod schemas (source of truth)
│   ├── state.ts              # Governance state
│   ├── config.ts             # Plugin configuration
│   ├── permission.ts         # Role permissions
│   ├── anchor.ts             # Context anchors
│   └── scan.ts               # Scan results
├── lib/              # Shared utilities
│   ├── persistence.ts        # Atomic file I/O
│   ├── logging.ts            # TUI-safe file logging
│   └── index.ts
└── plugin.ts         # Plugin entry point
```

### Plugin Integration Points

| Hook | Purpose | Priority |
|------|---------|----------|
| `tool.execute.before` | Intercept all tool calls, inject governance, enforce permissions | P1 (Critical) |
| `tool.execute.after` | Log tool execution, update state | P1 (Critical) |
| `experimental.session.compacting` | Inject anchors into compaction summary | P3 (High) |

### Custom Tools

| Tool | Purpose | Exports |
|------|---------|---------|
| `idumb_init` | Initialize governance state, detect framework | `initialize` |
| `idumb_anchor_add` | Add context anchor (survives compaction) | `add` |
| `idumb_anchor_list` | List all anchors | `list` |
| `idumb_status` | Show current governance state | `show` |

## Setup & Installation

### Development Workflow

```bash
# Build the plugin
npm run build

# Watch mode for development
npm run dev

# Type check without emitting
npm run typecheck

# Run validation trials
npm run test:t1  # Trial 1: Stop hook + permission enforcement
npm run test:t2  # Trial 2: Anchor persistence (future)
```

### Installation

**Current (Development):**
```bash
# The plugin is registered in package.json
# OpenCode automatically loads it from node_modules
# After building: npm run build
```

**Future (Production):**
```bash
# Single-command install from npm (planned)
npx idumb-plugin
```

### Verification

After installation, verify:
1. No TUI pollution (ZERO console.log output)
2. Plugin loads without errors
3. Custom tools appear in OpenCode tool list
4. `.idumb/brain/state.json` and `config.json` created

## Development Workflow

### Type Safety (Non-Negotiable)

- **Zero TypeScript errors** at all times
- **Zero lint errors** at all times
- Strict mode enabled in `tsconfig.json`
- All types explicit (no `any`)
- Zod schemas define ALL data structures

### Contracts-First Development

1. Define Zod schema first
2. Generate TypeScript types from schema
3. Implement logic
4. Validate with schema

Example:
```typescript
// 1. Schema
import { z } from 'zod';

export const AnchorSchema = z.object({
  id: z.string(),
  type: z.enum(['decision', 'context', 'checkpoint']),
  content: z.string(),
  priority: z.enum(['critical', 'high', 'normal']),
  createdAt: z.string(),
  staleAt: z.string().optional(),
});

// 2. Type
export type Anchor = z.infer<typeof AnchorSchema>;

// 3. Implementation
export async function addAnchor(data: Anchor): Promise<void> {
  AnchorSchema.parse(data); // Validate
  await persistAnchor(data);
}
```

### Phase Gates

Every phase ends with:
- [ ] All tests passing
- [ ] Zero TypeScript errors
- [ ] Zero lint errors
- [ ] Schema validation passing
- [ ] Documentation updated

See `.planning/PHASE-COMPLETION.md` for detailed phase definitions.

### Testing Strategy

**Rule:** Test features in a SEPARATE worktree, not the project being developed.

```bash
# Create worktree for stress testing
git worktree add ../idumb-stress-test -b stress-test

# Run stress test in separate worktree
cd ../idumb-stress-test
# Test plugin with aggressive context pollution
```

## API Documentation

### Custom Tools API

#### idumb_init

Initialize governance state for the current project.

```typescript
// Usage in agent
await initialize({
  framework: 'gsd', // or 'bmad', 'custom', 'none'
  projectName: 'my-project'
});

// Creates:
// - .idumb/brain/state.json
// - .idumb/brain/config.json
// - Detects framework if not specified
```

#### idumb_anchor_add

Add a context anchor that survives compaction.

```typescript
// Usage in agent
await add({
  type: 'decision', // 'decision' | 'context' | 'checkpoint'
  content: 'Switched from OAuth2 to SAML for enterprise SSO',
  priority: 'critical', // 'critical' | 'high' | 'normal'
  ttl: 60 * 60 * 1000 // Time-to-live in ms (optional)
});
```

#### idumb_status

Show current governance state.

```typescript
// Usage in agent
const status = await show();
// Returns:
// {
//   version: '0.3.1',
//   framework: 'gsd',
//   phase: 'planning',
//   anchors: [...],
//   history: [...]
// }
```

### Hook Integration Points

#### tool.execute.before (Stop Hook)

```typescript
// Hook signature
export async function toolExecuteBefore(
  context: ToolExecuteContext
): Promise<ToolExecuteBeforeResult> {

  const { toolName, toolArgs, agent } = context;

  // Check permissions
  const permitted = checkPermissions(agent.role, toolName);

  if (!permitted) {
    return {
      allowed: false,
      reason: `Agent ${agent.role} not permitted to use ${toolName}`
    };
  }

  // Inject governance context
  const state = await loadState();
  injectContext({
    phase: state.phase,
    currentTask: state.currentTask,
    relevantAnchors: selectRelevantAnchors(toolArgs)
  });

  return { allowed: true };
}
```

#### experimental.session.compacting

```typescript
// Hook signature
export async function sessionCompacting(
  context: SessionCompactingContext
): Promise<void> {

  const { summary } = context;

  // Select high-priority, fresh anchors
  const anchors = await loadAnchors();
  const selected = selectAnchorsByScore(anchors, {
    maxTokens: 500,
    minPriority: 'high'
  });

  // Inject into summary
  summary.addSection('## iDumb Governance Context');
  summary.addSection(formatAnchors(selected));
}
```

## File Structure

```
idumb-v2/
├── package.json              # Plugin manifest (@opencode-ai/plugin)
├── tsconfig.json             # Strict TypeScript config
├── CLAUDE.md                 # This file
├── src/                      # Source code
│   ├── plugin.ts             # Plugin entry point
│   ├── engines/              # Business logic
│   ├── tools/                # OpenCode tool wrappers
│   ├── hooks/                # Event handlers
│   ├── schemas/              # Zod schemas
│   ├── lib/                  # Utilities
│   └── types/                # TypeScript types
├── tests/                    # Validation trials
│   └── trial-1.ts            # P1: Stop hook validation
├── dist/                     # Compiled output (gitignored)
├── .planning/                # Governance documents
│   ├── PROJECT.md            # Project overview (SINGLE SOURCE OF TRUTH)
│   ├── GOVERNANCE.md         # Pitfalls, principles, DOs/DON'Ts
│   ├── PHASE-COMPLETION.md   # Phase definitions + gates
│   ├── SUCCESS-CRITERIA.md   # Real-life use cases
│   └── config.json           # Planning configuration
├── .idumb/                   # Runtime state (gitignored)
│   ├── brain/
│   │   ├── state.json        # Governance state
│   │   ├── config.json       # Plugin configuration
│   │   ├── anchors/          # Persisted anchors
│   │   └── sessions/         # Session tracking
│   └── project-output/       # Phase outputs, research, validation
└── .opencode/                # OpenCode integration (auto-generated)
    ├── agents/               # Agent profiles
    ├── plans/                # Implementation plans
    └── .plugin-dev/          # Development artifacts
```

## Recent Updates (2026-02-06)

### Major Changes from v1 to v2

**Strategic Reset:**
- Complete greenfield reboot based on governance framework analysis
- Documentation cleanup: 20+ stale research documents archived
- Clean architecture: engines → tools → hooks separation
- Contracts-first: Zod schemas define all data structures

**Phase 2A Complete (2026-02-06):**
- ✅ Stop hook implemented and validated (Trial-1 PASS)
- ✅ Permission enforcement working
- ✅ Custom tools implemented (init, anchor, status)
- ✅ Compaction hook implemented (P3 mechanism)
- ✅ Framework detector engine (detects GSD, BMAD, custom)
- ✅ Zero TypeScript/lint errors

**New Agents Added:**
- `idumb-architect` - System architecture design
- `idumb-implementer` - Feature implementation
- `idumb-tester` - Validation testing
- `strategic-debugger` - Debug coordination
- `strategic-framework-researcher` - Framework research
- `validation-architect` - Validation architecture

**Governance Framework Created:**
- `.planning/GOVERNANCE.md` - Pitfalls catalog, principles, DOs/DON'Ts
- `.planning/PHASE-COMPLETION.md` - Phase gates with completion criteria
- `.planning/SUCCESS-CRITERIA.md` - 4 real-life use cases for validation
- `.planning/PROJECT.md` - Single source of truth for project state

### Architecture Improvements

**Engine Pattern:**
- Business logic isolated in `src/engines/`
- No OpenCode dependencies in engines
- Tools expose engines through OpenCode's tool() wrapper

**Schema Registry:**
- All data structures defined with Zod
- TypeScript types inferred from schemas
- Runtime validation on all inputs/outputs

**Permission System:**
- Role-based permissions (coordinator, governance, validator, builder)
- Default role = meta (allow-all) for innate agents
- Never blocks innate agents, only adds governance

### Next Steps (Phase 2B+)

- [ ] Live validation in OpenCode (load plugin, stress test)
- [ ] Baseline measurement (agent behavior WITHOUT plugin)
- [ ] Anchor survival validation across compactions
- [ ] Inner cycle delegation (P3 mechanism)
- [ ] 3-level TODO task list (P4 mechanism)
- [ ] Message transform hooks (P5 mechanism)

## Important Notes

### Governance Documents Priority Order

When working on iDumb, consult governance documents in this order:

1. `.planning/PROJECT.md` - Current project state, what phase we're in
2. `.planning/GOVERNANCE.md` - Principles, pitfalls, DOs/DON'Ts
3. `.planning/PHASE-COMPLETION.md` - What must be done to complete current phase
4. `.planning/SUCCESS-CRITERIA.md` - Real-life use cases for validation

### Critical Principles

**DO:**
- Test one mechanism at a time
- Pivot fast if hypothesis fails
- Define schemas before implementation
- Provide infrastructure, let LLM provide intelligence
- Zero TypeScript/lint errors

**DON'T:**
- Stack features without validation
- Build engines that analyze text for "poisoning"
- Break OpenCode TUI (no console.log)
- Conflict with innate agents
- Skip baseline measurement

### Context Poisoning Prevention

- All planning artifacts in `.planning/` have lifecycle
- Research documents synthesized, then archived
- State.json capped at 100 history entries
- Anchors have time-to-stale (TTL)
- Compaction injection budget-capped (≤500 tokens)

### Integration with Meta-Frameworks

**GSD (Get Shit Done):**
- Plugin provides enforcement layer
- Context injection: "you are in research/planning/execution phase"
- Atomic commit tracking against plan items
- Auto-validation after tool execution

**BMAD (Builder's Mad):**
- Plugin provides traceability layer
- Requirements → anchors (survive compaction)
- Acceptance criteria → validation hooks
- Tech stack decisions → chain-breaking detection

### Testing Philosophy

**Stress Test Scenario:**
User bombards agent with context pollution across 20+ compactions:
- Continuous feature requests
- Mid-stream requirement changes
- Mixed chains of thought

**Success Criteria:**
- Agent correctly identifies current phase/task (60% improvement over baseline)
- Agent detects stale context and discards
- Agent references correct planning artifacts despite noise
- Agent stops and reports when chain breaks
- Agent delegates correctly (coordinators don't write)

## Current Status

**Phase:** Phase 2A Complete — Awaiting Live Validation

**Validated:**
- ✅ REQ-01: Plugin loads in OpenCode without TUI pollution
- ✅ REQ-02: Stop hook intercepts tool execution (Trial-1 PASS)
- ✅ REQ-03: Permission enforcement blocks unauthorized tools (Trial-1 PASS)
- ✅ REQ-10: Zero TypeScript/lint errors at all times
- ✅ REQ-11: All data structures have Zod schemas

**Active (Phase 2B+):**
- [ ] REQ-04: State persists across compactions via anchors (awaiting live test)
- [ ] REQ-05: Agent knows current phase/task at all times
- [ ] REQ-06: Stale context auto-detected and flagged
- [ ] REQ-07: Chain breaks trigger stop + report
- [ ] REQ-08: Delegation respects hierarchy

**Out of Scope:**
- GUI/visual interfaces
- Multi-platform (Cursor, Windsurf)
- Forking OpenCode
- Real-time collaboration

---

*Last updated: 2026-02-06 after Phase 2A completion + governance framework creation*
