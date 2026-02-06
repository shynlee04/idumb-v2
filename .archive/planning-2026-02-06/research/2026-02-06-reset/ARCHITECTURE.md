# Architecture Patterns for iDumb (OpenCode Plugin First)

**Researched:** 2026-02-06

## Recommended Architecture

Design principle: iDumb is a **governance substrate** with deterministic state + strict boundaries. It is not a second agentic platform.

### Component Boundaries

| Component | Responsibility | Communicates With |
|----------|----------------|-------------------|
| Platform adapter (OpenCode) | Hook registration, tool definitions, event translation | Governance engine, persistence, logging |
| Governance engine | Deterministic decisions about what context to inject/block/record | Schemas, persistence |
| Schemas/contracts | Zod schemas for all persisted entities and tool I/O | All modules |
| Persistence | Atomic read/write, migrations, path layout | Governance engine |
| Injection composer | Budgeted context blocks for compaction/tool boundaries | Governance engine |
| Observability | Structured logs + metrics snapshots | All modules |

### Data Model (Minimal)

- `State`: phase, current task identity, active chain id, last compaction, counters, config version.
- `Anchor`: type (decision/context/checkpoint/error), priority, content, createdAt/modifiedAt, stalenessHours, evidence pointers.
- `Event`: tool call summaries, compaction events, chain breaks, delegation events.

## Patterns To Follow

### Pattern: Budgeted, Ranked Injection

**What:** Every time you inject context (especially at compaction), pick a small set of anchors by score (priority x freshness) and cap output size.

**When:** `experimental.session.compacting` (OpenCode) / `PreCompact` (Claude Code).

**Why:** Too much injection becomes new poison.

### Pattern: Deterministic Hygiene Before LLM Hygiene

**What:** Deduplicate repeated tool outputs and remove superseded information deterministically; only then consider LLM-driven distillation.

**Why:** Zero-LLM-cost hygiene is predictable and easier to validate.

## Anti-Patterns

### Anti-pattern: Overlapping Responsibilities

**What:** Hooks mutate state, tools mutate state, and engines also mutate state ad hoc.
**Why bad:** Impossible to reason about “what changed state” under compaction.
**Instead:** Centralize all state mutation behind a single persistence API, validated by schemas.

### Anti-pattern: “Always alert” governance

**What:** Every inconsistency triggers a stop/alert.
**Why bad:** Trains the user and the agent to ignore governance.
**Instead:** Alerts require evidence + confidence; most issues become silent logs until a threshold.

## Scalability Considerations

| Concern | At 1 user | At 10 users | At 100+ users |
|---------|----------|-------------|---------------|
| Storage growth | Cap anchors/history | Add per-project pruning | Add retention policies + export |
| Performance | Keep hooks <50ms | Cache computed scores | Move expensive ops off hot paths |
| Policy management | Local config | Team-shared config | Managed policy support (if needed) |

## Sources

- OpenCode Plugins: https://opencode.ai/docs/plugins/
- OpenCode Tools/Permissions: https://opencode.ai/docs/tools/ , https://opencode.ai/docs/permissions/
- Claude Code Hooks: https://code.claude.com/docs/en/hooks.md
