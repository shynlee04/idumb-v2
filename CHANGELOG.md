# Changelog

All notable changes to iDumb v2 will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0-alpha.1] - 2026-02-06

### Added

**Phase 0: Foundation**
- Plugin entry point (`src/plugin.ts`) with OpenCode plugin interface
- Atomic file I/O with backup support (`src/lib/persistence.ts`)
- TUI-safe file-based logging — zero `console.log` (`src/lib/logging.ts`)
- Zod schemas for all data structures: State, Config, Anchor, Permission, Scan
- `.idumb/` directory scaffolding (16 subdirectories)

**Phase 1: Stop Hook (Trial-1)**
- `tool.execute.before` hook — intercepts all tool calls (`src/hooks/tool-gate.ts`)
- Permission enforcement: role-based tool blocking with pivot suggestions
- Role detection for OpenCode innate agents (Build, Plan, General, Explore)
- `tool.execute.after` fallback — output replacement if blocking fails
- Trial-1 validation: 3/4 PASS criteria automated (`tests/trial-1.ts`)

**Phase 2A: Custom Tools + Compaction**
- `idumb_anchor_add` — create context anchors that survive compaction
- `idumb_anchor_list` — list active anchors with staleness info
- `idumb_status` — show current governance state
- `experimental.session.compacting` hook — injects top-N anchors by score
- Anchor scoring algorithm: priority × freshness, budget-capped ≤500 tokens
- History capped at 100 entries to prevent unbounded growth

**Phase 2C: Scanner + Init (Intelligence Layer)**
- `idumb_init` tool — scaffolds `.idumb/`, scans codebase, writes JSON memory
- Deterministic codebase scanner (`src/engines/scanner.ts`) — no LLM involvement
- Framework detector (`src/engines/framework-detector.ts`) — GSD, BMAD, SPEC-KIT, Open-spec
- Language/stack detection, gap analysis, debt signals, drift detection
- `ScanResult` schema with project info, framework, diagnosis
- Trial-init validation: 9/9 assertions pass (`tests/trial-init.ts`)

**Documentation & Governance**
- `.planning/PROJECT.md` — single source of truth for project state
- `.planning/GOVERNANCE.md` — pitfalls, principles, DOs/DON'Ts
- `.planning/PHASE-COMPLETION.md` — phase gates with completion criteria
- `.planning/SUCCESS-CRITERIA.md` — 4 real-life stress test use cases
- `AGENTS.md` — agent guide for AI assistants
- `CLAUDE.md` — Claude Code integration guide
- `GAP-ANALYSIS.md` — comprehensive gap analysis
- `TRIAL-1-RESULTS.md` — Trial-1 validation report

### Known Limitations
- Phase 2B (Live Validation) not yet started — plugin not tested in live OpenCode
- Trial-2 delegation tracking not implemented (delegationChain never populated)
- Agent detection race condition: `chat.message` may fire after first tool call
- Session tracking is in-memory only (lost on plugin restart)
- OpenCode `tool.execute.before` does not intercept subagent tool calls ([#5894](https://github.com/sst/opencode/issues/5894))

---

## [Unreleased]

### Planned
- Phase 2B: Live validation in OpenCode + baseline measurement
- Phase 3: Inner cycle delegation (T2) with pivot for subagent limitation
- Phase 4: 3-level TODO delegation tool (T7)
- Phase 5: Message transform experiments (T5/T6) — blocked on A/B data
- Phase 6: Auto-run + state management (T8)
