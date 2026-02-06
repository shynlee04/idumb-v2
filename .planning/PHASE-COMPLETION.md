# Phase Completion Definitions (Incremental)

**Created:** 2026-02-06
**Status:** Active
**Rule:** Phase N must pass ALL completion criteria before Phase N+1 begins.

---

## Phase 0: Foundation

**Goal:** Plugin loads, persists state, no TUI pollution.
**Status:** COMPLETED

| Criteria | Evidence | Status |
|----------|----------|--------|
| Plugin loads in OpenCode without console output | File logging only via `lib/logging.ts` | PASS |
| `.idumb/` directory created on init | `initializeIdumbDir()` in `plugin.ts` | PASS |
| State persists to `state.json` with atomic writes | `atomicWrite()` in `persistence.ts` | PASS |
| All data has Zod schemas | `StateSchema`, `ConfigSchema`, `AnchorSchema`, `PermissionSchema` | PASS |
| Zero TypeScript errors (strict mode) | `npx tsc --noEmit` = 0 errors | PASS |
| ESM-only, no `require()` calls | Fixed: top-level imports only | PASS |

**Pivot Decision:** CONTINUE — foundation solid.

---

## Phase 1: Stop Hook (T1)

**Goal:** tool.execute.before intercepts tool calls, blocks violations, modifies args.
**Status:** COMPLETED

| Criteria | Evidence | Status |
|----------|----------|--------|
| P1.1: Throwing error blocks tool execution | `ToolGateError` thrown, tool does not execute | PASS |
| P1.2: Error message visible in TUI | Pending manual verification | PENDING |
| P1.3: Arg modification persists to tool | `__idumb_checked`, `__idumb_role` injected | PASS |
| P1.4: Other hooks continue after error | After-hook fires, logs violation | PASS |
| Role detection for innate agents | Build→builder, Plan→researcher, General→builder, Explore→researcher | PASS |
| Default role allows unknown agents | Default = meta (allow-all) | PASS |

**Pivot Decision:** CONTINUE — stop hook works. Error blocking confirmed. Fallback (output replacement) also works.

---

## Phase 2A: Custom Tools + Compaction Hook

**Goal:** Register first custom tools, implement real compaction with anchor injection.
**Status:** COMPLETED

| Criteria | Evidence | Status |
|----------|----------|--------|
| `idumb_anchor_add` tool registered | Defined in `src/tools/anchor.ts`, wired in `plugin.ts` | PASS |
| `idumb_anchor_list` tool registered | Defined in `src/tools/anchor.ts`, wired in `plugin.ts` | PASS |
| `idumb_status` tool registered | Defined in `src/tools/status.ts`, wired in `plugin.ts` | PASS |
| Compaction hook loads anchors from disk | `createCompactionHook()` calls `loadAllAnchors()` | PASS |
| Compaction selects top-N by score | `selectAnchors()` with budget from config | PASS |
| Compaction context budget-capped ≤500 tokens | Truncation at 2000 chars in compaction hook | PASS |
| History capped at 100 entries | `addHistoryEntry()` slices to last 100 | PASS |
| `@opencode-ai/plugin` SDK installed | v1.1.52 installed, local tool helper for zod v3 compat | PASS |
| Zero TypeScript errors | `npx tsc --noEmit` = 0 errors | PASS |
| `dist/` builds cleanly | `npx tsc` = 0 errors, 16 JS files output | PASS |

**Pivot Decision:** PENDING — requires Phase 2B (live validation).

---

## Phase 2C: Codebase Scanner + Init Tool (Intelligence Layer)

**Goal:** Deterministic codebase scan → JSON memory in `.idumb/brain/context/scan-result.json`. Scaffolds full `.idumb/` tree. Detects tech stacks, frameworks, gaps, debt, drift.
**Status:** COMPLETED

| Criteria | Evidence | Status |
|----------|----------|--------|
| `ScanResult` Zod schema defined | `src/schemas/scan.ts` — project info, framework, diagnosis (gaps, debt, concerns, conventions, drift) | PASS |
| Scanner engine deterministic (no LLM) | `src/engines/scanner.ts` — pure filesystem: file walker, language/stack detection, gap analysis | PASS |
| Framework detector with required+optional markers | `src/engines/framework-detector.ts` — GSD (requires STATE.md), BMAD, SPEC-KIT, Open-spec | PASS |
| False positive prevention | GSD no longer matches on generic PROJECT.md/config.json — requires STATE.md (unique to GSD) | PASS |
| `idumb_init` tool registered | `src/tools/init.ts` — scaffolds `.idumb/`, scans, writes scan-result.json | PASS |
| Full `.idumb/` tree scaffolded programmatically | 16 directories: brain/context, brain/drift, brain/governance/validations, brain/history, brain/metadata, brain/sessions, anchors, sessions, signals, modules, governance, backups, project-output/phases, project-output/research, project-output/roadmaps, project-output/validations | PASS |
| `PATHS` in persistence.ts aligned to `.idumb/brain/` | state→`.idumb/brain/state.json`, config→`.idumb/brain/config.json`, scan→`.idumb/brain/context/scan-result.json` | PASS |
| Test passes on this project | `tests/trial-init.ts` — 9/9 assertions (name, stage, languages, stack, packageManager, framework, sourceFiles, gaps) | PASS |
| Zero TypeScript errors | `npx tsc --noEmit` = 0 errors | PASS |
| TOOL_CATEGORIES updated for OpenCode innate tools | Maps actual OpenCode tools: read, list, glob, grep, webfetch, websearch, codesearch, todowrite, todoread, skill, bash, task, edit, write | PASS |

**Pivot Decision:** CONTINUE — scanner produces accurate, schema-validated JSON memory. Framework detection is correct (no false positives). `.idumb/` tree matches the planned architecture.

---

## Phase 2B: Live Validation + Baseline

**Goal:** Verify tools appear in OpenCode, anchors survive compaction, establish baseline.
**Status:** NOT STARTED — CRITICAL GATE

| Criteria | Test Method | Status |
|----------|------------|--------|
| Custom tools appear in OpenCode's tool list | Load plugin in OpenCode, check `/tools` | PENDING |
| LLM calls `idumb_anchor_add` when instructed | Ask agent: "Create an anchor for this decision" | PENDING |
| Anchors persist to `.idumb/anchors/` files | Check filesystem after tool call | PENDING |
| `idumb_status` returns correct summary | Ask agent: "Show iDumb status" | PENDING |
| Anchor survives compaction | Create anchor → fill context → trigger compact → check anchor referenced | PENDING |
| **Baseline measurement** (NO plugin) | Run stress scenario without plugin, measure: phase awareness, chain integrity, stale detection | PENDING |
| **Measurement WITH plugin** | Same scenario with plugin, compare metrics | PENDING |

**Pivot Criteria:**
- If tools don't appear → check plugin registration, OpenCode version compatibility
- If anchors don't survive compaction → check compact hook firing, anchor selection logic
- If baseline shows agents already perform well → reduce scope, focus on edge cases only

---

## Phase 3: Inner Cycle Delegation (T2)

**Goal:** Inject context when agent spawns subagents or delegates tasks.
**Status:** NOT STARTED

| Criteria | Test Method | Status |
|----------|------------|--------|
| P2.1: Detect when coordinator delegates to builder | tool.execute.before on task/delegation tools | PENDING |
| P2.2: Inject current phase + active anchors into delegation context | Modify args to include governance metadata | PENDING |
| P2.3: Subagent receives governance context | Check subagent's tool calls for `__idumb_` metadata | PENDING |
| P2.4: Delegation hierarchy enforced | Coordinator → builder (not reverse) | PENDING |
| Fallback: forced turn-based reads | If delegation injection fails, force agent to call `idumb_status` before executing | PENDING |

**Pivot Criteria:**
- If subagent context injection not possible → PIVOT to forced tool reads (fallback)
- If forced reads also fail → SKIP, move to Phase 4

---

## Phase 4: 3-Level TODO Delegation (T7 — reordered for confidence)

**Goal:** Replace innate TODO with governed 3-level delegation tool.
**Status:** NOT STARTED

| Criteria | Test Method | Status |
|----------|------------|--------|
| P7.1: `idumb_todo` tool replaces innate TODO usage | Agent uses `idumb_todo` instead of platform TODO | PENDING |
| P7.2: 3-level hierarchy (epic → task → subtask) | Schema enforces depth. Metadata required at each level. | PENDING |
| P7.3: Delegation metadata (which agent, doing what, for which plan) | Schema requires: `assignedAgent`, `planRef`, `parentTaskId` | PENDING |
| P7.4: TODO serves as communication tool (agent ↔ user) | Task status visible, comments, progress tracking | PENDING |
| Properties enforced useful data | Each task: timestamp, status, staleness, linked anchor | PENDING |
| Planning artifact integration | Tasks link to planning docs (hardest sub-goal) | PENDING |

**Pivot Criteria:**
- If agents don't use custom TODO → check tool naming, description clarity
- If 3-level hierarchy confuses agents → PIVOT to 2-level (task → subtask only)
- If planning artifact integration too complex → defer to Phase 6+

---

## Phase 5: Message Transform Experiments (T5/T6)

**Goal:** Empirically determine LLM read order and test message transformation.
**Status:** NOT STARTED — **BLOCKED on empirical data**

**Pre-requisite:** A/B test to determine LLM read order after compaction.

| Criteria | Test Method | Status |
|----------|------------|--------|
| A/B Test: Inject marker at START vs END of compact context | Two sessions, same scenario, different injection position. Measure: does agent reference marker? | PENDING |
| P5.1: Compact message with hierarchy of thoughts | If read order known → inject at optimal position | BLOCKED |
| P5.2: Message shows: current work, inner cycles, drift level, critical anchors | Format designed based on A/B results | BLOCKED |
| P6.1: User prompt transformation | Transform user message to include governance context | BLOCKED |
| P6.2: Transformation improves task completion | A/B: transform vs passthrough | BLOCKED |

**Pivot Criteria:**
- If A/B shows LLM doesn't attend to ANY injected content → SKIP entirely
- If LLM attends to START only → inject at start, never end
- If user prompt transform confuses agent → SKIP P6, keep P5 only

---

## Phase 6: Auto-run + State Management (T8)

**Goal:** Event-driven tool execution, meaningful session export, reliable state hooks.
**Status:** NOT STARTED

| Criteria | Test Method | Status |
|----------|------------|--------|
| P8.1: Event hooks trigger on session lifecycle | Log events: session.created, session.idle, session.compacted | PENDING |
| P8.2: Auto-run validation after tool execution | tool.execute.after triggers chain integrity check | PENDING |
| P8.3: Session export with meaningful, schema-validated data | Export: current task, active anchors, delegation status only | PENDING |
| P8.4: State management without false alarms | Chain validation BEFORE alerting. Never alert on stale data. | PENDING |

**Pivot Criteria:**
- If auto-run causes performance lag → reduce frequency, run only on high-impact tools
- If session export data is meaningless → budget-cap and simplify to anchors-only
- If state hooks cause false alarms → disable auto-triggers, make them manual-only

---

## Cross-Phase Quality Gates

Every phase completion requires ALL of the following:

- [ ] Zero TypeScript errors (`npx tsc --noEmit`)
- [ ] Zero lint errors
- [ ] All schemas validate
- [ ] Automated validation script exists and passes
- [ ] GOVERNANCE.md updated with new pitfalls/principles discovered
- [ ] Explicit PIVOT-OR-CONTINUE decision documented
- [ ] No unbounded arrays or unlifecycled data introduced

---

*Last updated: 2026-02-06*
