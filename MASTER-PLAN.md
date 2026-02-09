# MASTER PLAN: One True Plan + Self-Enforcement

> **This document is the SINGLE SOURCE OF TRUTH for all iDumb v2 planning.**
> No other document may claim planning SOT status. All superseded docs are archived in `planning/_archived-2026-02-08/`.

**Last Updated:** 2026-02-09 (Phase 9 rewritten to Lifecycle Verbs)
**Plan State Runtime:** `.idumb/brain/plan.json` (machine-readable projection read by hooks)

---

## Phase 1: Critical Bug Fixes ✅

**Status:** Completed
**Goal:** Fix the three bugs that break OpenCode's innate agents and lie to iDumb agents.

### 1.1 Tool-gate passthrough for non-iDumb agents
- **File:** `src/hooks/tool-gate.ts`
- **Change:** Added passthrough — if `capturedAgent` is null or doesn't start with `"idumb-"`, all write/edit gating is skipped.
- **Result:** OpenCode's built-in agents (e.g., "build") are never blocked.

### 1.2 Agent template frontmatter/body contradictions
- **File:** `src/templates.ts`
- **Change:** Aligned body text to match YAML frontmatter. Investigator: write/bash/webfetch marked as ❌ BLOCKED. Executor: write marked as ❌ BLOCKED (edit remains ✅).

### 1.3 AGENTS.md factual errors
- **File:** `AGENTS.md`
- **Changes:** Removed false "pre-deployed" claim, marked Planning Registry as schema-only, added CAUTION about unit-test-only verification.

### 1.4 Tests
- **File:** `tests/tool-gate.test.ts`
- **Result:** 93/93 (was 88/88). Added 5 passthrough assertions.

---

## Phase 2: Self-Enforcement Wiring ✅

**Status:** Completed
**Goal:** Make the plan self-aware — every system prompt and post-compaction context includes current phase + next action.

### 2.1 Plan-state schema
- **File:** `src/schemas/plan-state.ts` (~138 LOC)
- **Content:** `PlanState`, `PlanPhase` interfaces, factory functions, `getCurrentPhase()`, `getNextPhase()`, `formatPlanStateCompact()`

### 2.2 StateManager integration
- **File:** `src/lib/persistence.ts`
- **Added:** `planState` field, `getPlanState()`, `setPlanState()`, load/save to `.idumb/brain/plan.json` (with legacy fallback from `plan-state.json`)

### 2.3 System hook wiring
- **File:** `src/hooks/system.ts`
- **Change:** Injects `Phase: "name" [status]` into `<idumb-governance>` block

### 2.4 Compaction hook wiring
- **File:** `src/hooks/compaction.ts`
- **Change:** Injects `## CURRENT PHASE: ...` into post-compaction context

### 2.5 Phase transition in govern_plan
- **File:** `src/tools/govern-plan.ts`
- **New action:** `phase` — updates plan-state via `govern_plan action=phase phase_id=N phase_status=in_progress`

### 2.6 Bootstrap during init
- **File:** `src/cli/deploy.ts`
- **Change:** Creates `plan.json` with default 6 phases during `idumb-v2 init`

### 2.7 Tests
- **File:** `tests/plan-state.test.ts`
- **Result:** 40/40 assertions (was 39, updated when Phases 7-10 added)

---

## Phase 3: Document Consolidation ✅

**Status:** Completed
**Goal:** Archive 25+ superseded documents, delete ephemeral transcripts, update references.

### 3.1 This document (MASTER-PLAN.md)
- Created at project root as the ONE planning SOT

### 3.2 Archived to `planning/_archived-2026-02-08/`
- `planning/MASTER-ACTION-PLAN/` (entire dir)
- `planning/GOVERNANCE.md`, `PROJECT.md`, `SUCCESS-CRITERIA.md`, `PHASE-COMPLETION.md`, `RESET-SYNTHESIS.md`
- `planning/codebase/` (7 files)
- `planning/implamentation-plan-turn-based/` — n1 through n5, n3-1, n3-2, walkthrough-n2, n3, n3-2, fe1, intelligence-gap-analysis-n5, implementation_plan-fe1
- `planning/research/` (entire dir)
- `STRATEGIC-PLANNING-PROMPT.md` (root)

### 3.3 Deleted (ephemeral transcripts)
- `planning/this-is-when-run-init-a-terrible-experiencea.md` (188KB session log)
- `session-deldegation-tools-init-run.md` (root)
- `session-ses_3c9b.md` (root)
- `src/modules/agents/meta-builder.md` (deprecated)

### 3.4 Kept as living references
- `planning/implamentation-plan-turn-based/implementation_plan-n6.md` — active technical reference
- `planning/implamentation-plan-turn-based/walkthrough-n6.md` — latest walkthrough
- `planning/legacy-repo/` — historical v1 docs
- `docs/plans/*.md` (6 files) — design references
- `.agents/prompts/ralph-output/` — most accurate audit

### 3.5 CLAUDE.md updated
- Session Handoff references MASTER-PLAN.md

### 3.6 AGENTS.md updated
- Roadmap section references MASTER-PLAN.md

---

## Phase 4: Hook Intelligence Enhancement ✅

**Status:** Completed
**Goal:** Add graph warnings, delegation context, and language-aware injection to hooks.

### 4.1 Graph warnings in system.ts
- **File:** `src/hooks/system.ts`
- **Change:** Added `detectGraphBreaks(graph)` call, injects first warning message into `<idumb-governance>` block

### 4.2 Delegation context in compaction.ts
- **File:** `src/hooks/compaction.ts`
- **Change:** Added delegation chain (up to 3 active delegations with `pending`/`accepted` status) into post-compaction context

### 4.3 Language-aware injection in system.ts
- **File:** `src/hooks/system.ts`
- **Change:** Created `TRANSLATIONS` map with Vietnamese governance strings, `getModeContext()` accepts language parameter, "no active task" message replaced when Vietnamese is configured

### Results
- System prompt includes graph warnings ✅
- Post-compaction context includes delegation chain ✅
- Vietnamese users see Vietnamese governance context ✅
- All budgets respected ✅

---

## Phase 5: Dead Code Cleanup ✅

**Status:** Completed
**Goal:** Remove meta-builder references, document orphaned code.

### 5.1 Replace "Meta Builder" references
- **Files:** `src/templates.ts`, `src/cli.ts`, `src/tools/init.ts`, `src/modules/schemas/agent-profile.ts`, `src/lib/framework-detector.ts`, `src/cli/deploy.ts`, `src/schemas/task.ts`, `src/schemas/config.ts`
- **Result:** All replaced with "Supreme Coordinator" / "CLI deployer" / "agents" as appropriate. Only remaining reference is in `src/lib/_archived-2026-02-08/entity-resolver.ts` (archived dead code).

### 5.2 Document orphaned schemas
- **Files:** `src/schemas/brain.ts`, `project-map.ts`, `codemap.ts`
- **Change:** Added "STATUS: Schema-only. Not wired. Planned for future integration." header comments

### 5.3 Document SQLite adapter
- **Files:** `src/lib/sqlite-adapter.ts`, `storage-adapter.ts`
- **Change:** Added "STATUS: Feature-flagged. Activate via `{ sqlite: true }` in stateManager.init()." header comments

### Results
- `grep -ri "meta.builder" src/` returns zero (excluding `_archived/`) ✅
- All orphaned code has status documentation ✅
- `npm run typecheck && npm test` passes ✅

---

## Phase 6: SDK Integration Foundation

**Status:** Pending — Requires Manual Verification in Live OpenCode
**Goal:** Verify SDK capabilities, document results, wire child session tracking.

### 6.1 Toast notifications
- **Code exists:** `fireToast` in `src/hooks/tool-gate.ts` lines 33-46
- **Status:** Wired but **UNVERIFIED** in live OpenCode — requires manual test

### 6.2 agent_cycle validation
- **Code exists:** `src/lib/sdk-client.ts` with `client.tui.executeCommand()`
- **Status:** **UNVERIFIED** — needs live OpenCode session to test `agent_cycle` command
- Results must be documented regardless of outcome

### 6.3 Child session tracking
- **Depends on:** 6.2 confirming SDK capabilities
- **Target:** Wire child session IDs from SDK into `src/tools/govern-delegate.ts`

### Acceptance Criteria
- Toast behavior documented (works/doesn't) — PENDING MANUAL TEST
- agent_cycle behavior documented (works/doesn't) — PENDING MANUAL TEST
- No regressions in existing tests ✅ (657/657)

---

## Phase 7: Documentation Hygiene ✅

**Status:** Completed
**Goal:** Fix 3 known defects from Phase 1-5 audit, archive stale design docs.

### 7.1 Investigator description fix
- **File:** `src/templates.ts` (lines 322, 502, 652, 901)
- **Defect:** 4 locations described investigator as using "webfetch" but `tools.webfetch: false` blocks it
- **Fix:** Removed "webfetch" from all 4 description/capability strings
- **Result:** `grep -i "webfetch" src/templates.ts` → zero in description fields ✅

### 7.2 AGENTS.md directory tree fix
- **File:** `AGENTS.md`
- **Changes:** Removed deleted `STRATEGIC-PLANNING-PROMPT.md`, added `MASTER-PLAN.md`, `src/schemas/plan-state.ts`, `tests/plan-state.test.ts`, `planning/diagrams/`
- **Result:** Tree matches `ls` output ✅

### 7.3 Archive stale docs/plans/
- **Archived to `docs/plans/_archived-2026-02-09/`:** sot-contract.md (~40% accurate), tool-agent-redesign-plan.md, slice1-enforcement-sqlite-dashboard-revival.md, phase-1a-completion.md
- **Kept:** user-journey-governance-design.md (implementation-agnostic), task-graph-hook-intelligence-design.md (design philosophy valid)
- **Extracted:** SOT contract Section 3 → `docs/sdk-client-api.md` (SDK Client API reference preserved before archiving)
- **Result:** Only 2 active docs remain in docs/plans/ ✅

### Results
- `npm run typecheck` clean, `npm test` passing ✅
- Commit: `b306972` docs: Phase 7 documentation hygiene

---

## Phase 8: .idumb/ Structure Redesign ✅

**Status:** Completed
**Goal:** Remove 6 empty directories, restructure for purpose, add brain/index/ for intelligence layer.
**Depends on:** Phase 7

### 8.1 The Problem
Current scaffolder creates 15 directories. **6 are permanently empty** (anchors/, governance/, sessions/, modules/, project-core/, project-output/). Anchors and sessions don't even use their directories — they serialize into `hook-state.json`. The naming lies about what's inside.

### 8.2 Target Structure
```
.idumb/
├── config.json              # User settings (ACTIVE — read every turn)
├── brain/                   # Runtime state + intelligence index
│   ├── state.json           # Plugin state: sessions, anchors, agent captures
│   ├── tasks.json           # Task store (Epic/Task/Subtask)
│   ├── graph.json           # Task graph (WorkPlan/TaskNode)
│   ├── plan.json            # Phase tracking (plan-state)
│   ├── delegations.json     # Delegation records
│   ├── registry.json        # Planning artifact registry
│   └── index/               # ★ Codebase intelligence (populated by fullscan)
│       ├── frameworks.json  # Detected governance + tech frameworks
│       ├── quality.json     # Code quality grade, smells, stats
│       ├── stacks.json      # Tech stack extracted from package.json + lockfiles
│       ├── codemap.json     # File-level symbol extraction
│       └── project.json     # Directory tree + file metadata
├── logs/                    # Debug logs (created on-the-fly by logging.ts)
└── modules/                 # Agent reference docs + user extensions
    ├── agents/              # 3 agent profiles (coordinator, investigator, executor)
    ├── skills/              # Delegation + governance protocols
    ├── schemas/             # Agent contract template
    └── templates/           # Command + workflow templates
```

**Removed:** `anchors/`, `governance/`, `sessions/`, `project-core/`, `project-output/`, `modules/` (the old empty one)
**Renamed:** `idumb-modules/` → `modules/`, `hook-state.json` → `state.json`, `task-graph.json` → `graph.json`, `plan-state.json` → `plan.json`, `planning-registry.json` → `registry.json`
**Added:** `brain/index/` (populated by fullscan, not empty scaffolding)
**Merged:** `idumb-modules/prompts/` + `scripts/` removed (were empty, never used)

### 8.3 Files Changed

| File | Change |
|------|--------|
| `src/lib/scaffolder.ts` | New `SCAFFOLD_DIRS` — remove 6, add `brain/index` |
| `src/schemas/config.ts` | Remove dead path entries (anchors, governance, sessions, projectCore, projectOutput, projectModules), rename modules path, add `index` path |
| `src/lib/persistence.ts` | Rename constants: STATE_FILE→`state.json`, TASK_GRAPH_FILE→`graph.json`, PLAN_STATE_FILE→`plan.json`, DELEGATIONS_FILE→`delegations.json` (unchanged), PLANNING_REGISTRY→`registry.json` |
| `src/lib/state-reader.ts` | Update path constants to match new names |
| `src/cli/deploy.ts` | Update bootstrap paths + module deployment paths |
| `src/tools/init.ts` | Update PLANNING_REGISTRY_PATH, IGNORED_OUTLIER_PREFIXES |
| `src/templates.ts` | Update directory tree references in agent templates |
| `tests/init.test.ts` | Update path expectations |

### 8.4 Migration Strategy
- `persistence.ts init()` checks for old filenames → reads them → saves to new filenames → logs migration
- `init.ts` outlier scan reads `registry.json` first and falls back to legacy `planning-registry.json`
- Old files left in place (user can delete manually)
- Scaffolder skips existing directories gracefully (already does this)
- No `.gitkeep` files — only create directories that will be populated

### Acceptance Criteria
- `ls .idumb/` after fresh init shows only: `brain/`, `config.json`, `modules/`
- `ls .idumb/brain/` shows: `state.json`, `tasks.json`, `graph.json`, `plan.json`, `delegations.json`, `registry.json`, `index/`
- `ls .idumb/brain/index/` is empty (populated by Phase 9 fullscan)
- Zero empty directories with only `.gitkeep`
- Old installs with `hook-state.json` still load correctly (migration)
- `npm run typecheck` passes
- `npm test` passes with path updates (core suites + SQLite-aware persistence coverage)

---

## Phase 9: Lifecycle Verbs — Agent-Native Tool Redesign

**Status:** In Progress (Round 1 complete, Round 2 next)
**Goal:** Replace verbose, ceremony-driven governance tools with agent-native **Lifecycle Verbs** — 5 tools, each with 1 argument and 1-line output. Kill the 3-call ceremony. Apply 5 Agent-Native Principles: Iceberg, Native Parallelism, Signal-to-Noise, Context Inference, No-Shadowing.
**Depends on:** Phase 8
**Design Plan:** `.claude/plans/toasty-purring-nygaard.md` (brainstorming plan, user-gated rounds)

### Why This Supersedes the 3-Tool Architecture
The earlier 3-tool plan (idumb_tasks/idumb_plans/idumb_hive_mind) still suffered from **cognitive overloading** — agents forced to be project managers, JSON parsers, and state machines simultaneously. The 783-line tasks.ts returned 20+ line outputs with navigation footers, classification guidance, and role-aware branching nobody asked for.

**Root problems the Lifecycle Verbs fix:**
- **3-call ceremony** makes governance agent-hostile (plan create → plan_tasks → task start)
- **9 phantom action references** in templates (agents call non-existent actions)
- **7 real actions undocumented** (agents don't know about quick_start, fail, learn)
- **Multi-call ceremonies** (3+ sequential calls to unlock a capability) are agent-hostile
- **Tools should be utility-driven** — agents should WANT to use them, not be forced

### The 5 Agent-Native Principles (NON-NEGOTIABLE)

1. **Iceberg** — Hide bureaucracy behind simple interfaces. 1 arg in, system handles plan creation, classification, write-unlock, wiki, knowledge behind the scenes.
2. **Native Parallelism** — Don't force JSON batch parsing. Agent calls `tasks_add` N times in a single turn. Each call adds ONE task.
3. **Signal-to-Noise** — Minimal output, pull-not-push. 1-line success messages. Agent calls `tasks_check` ONLY when confused.
4. **Context Inference** — Never ask for what the system already knows. No `target_id` — system knows the active task.
5. **No-Shadowing** — Describe rewards, not rules. Tool descriptions say what agents GET, not what they're forced to do.

### The Lifecycle Verbs Tool Surface

| Tool | Args | Output | Replaces |
|------|------|--------|----------|
| `tasks_start` | `objective: string` | `Active: "X". Writes UNLOCKED.` (1 line) | quick_start (783 LOC), govern_task quick_start, govern_plan create |
| `tasks_done` | `evidence: string` | `Done: "X". Writes LOCKED.` (1 line) | tasks_complete, govern_task complete |
| `tasks_check` | (none) | JSON: `{task, progress, next, role}` | tasks_status, govern_task status, govern_plan status |
| `tasks_add` | `title: string, after?: string` | `Added: "X" (depends on: "Y").` (1 line) | tasks_parallel JSON batch, govern_plan plan_tasks |
| `tasks_fail` | `reason: string` | `Failed: "X". Writes LOCKED.` (1 line) | tasks_fail, govern_task fail |

**Unchanged tools (already clean):**
- `idumb_anchor` (3 actions: add, list, learn) — agent WANTS to call these
- `idumb_init` (3 actions: install, scan, status) — one-time bootstrap

**Total: 7 tools** (5 lifecycle verbs + anchor + init), down from 11.

### New StateManager Method: `getGovernanceStatus()`

Eliminates 4x-duplicated StateManager call pattern across system.ts, compaction.ts, tasks.ts status, govern-task.ts status:

```typescript
interface GovernanceStatus {
  activeTask: { id: string; name: string } | null
  taskNode: TaskNode | null
  workPlan: { name: string; status: string } | null
  agent: string | null
  progress: { completed: number; total: number; failed: number } | null
  nextPlanned: { name: string; blockedBy?: string } | null
  recentCheckpoints: number
}
```

### Integration Points (Critical Paths)

**Critical Path 1 — Write Unlock:**
```
tasks_start → setActiveTask() → tool-gate reads → ALLOW write/edit
```

**Critical Path 2 — Context Survival:**
```
idumb_anchor add → addAnchor() → compaction hook → post-compaction context
```

**Critical Path 3 — Agent Identity:**
```
chat.params hook → setCapturedAgent() → tool-gate → AGENT_TOOL_RULES → role-aware gating
```

### Implementation Rounds

| Round | Scope | Risk | Status |
|-------|-------|------|--------|
| R1: Schema Foundation | 3 new schemas (classification, wiki, coherent-knowledge) | Low | **COMPLETE** |
| R2: Rewrite `tasks.ts` | 5 lifecycle verb exports (~200 LOC), `getGovernanceStatus()` | Medium | Next |
| R3: Absorb govern_plan | `tasks_add` handles single + batch, `tasks_start` auto-creates plan | Medium | Pending |
| R4: Hook Migration + Deletion | Shell blacklist → hook, delete govern_shell/plan/task/delegate/anchor | HIGH | Pending |
| R5: Template Rewrite | Reference new tool names, fix phantom actions, 4-stop loop | Medium | Pending |
| R6: Docs + Dashboard | AGENTS.md, CLAUDE.md, README.md | Low | Pending |

### What Gets Deleted (Round 4)
**Tools:** govern_plan.ts, govern_task.ts, govern_delegate.ts, govern_shell.ts, anchor.ts
**Schemas:** task.ts (legacy v2), delegation.ts, planning-registry.ts

### What Gets Preserved
- `setActiveTask()` bridge (→ `tasks_start`)
- Destructive shell blacklist, 13 patterns (→ tool-gate.ts Layer 0)
- 6-layer gate sequence in tool-gate.ts (unchanged)
- Checkpoint auto-recording in tool-gate.ts after hook (unchanged)
- 8 debounce timers in persistence.ts (unchanged)
- Compaction anchor injection (→ `idumb_anchor add`)
- Agent identity capture in chat.params hook (unchanged)

### What Moves to Hooks (Round 4)
- **Destructive blacklist** (14 patterns from govern-shell.ts) → tool-gate.ts Layer 0 on innate bash
- **Role permissions** (coordinator=inspection, executor=all) → tool-gate.ts AGENT_TOOL_RULES extension
- **Auto-archive** (plan completion) → tool-gate.ts after-hook
- **Shell classification** (command categorization) → tool-gate.ts for logging/audit

### Acceptance Criteria
- `npm run typecheck` — zero errors
- `npm test` — all tests pass (new baseline after R4)
- `tasks_start objective="Fix auth"` → 1-line output, writes unlock in ONE call
- `tasks_check` → JSON status object (not 20-line prose)
- `tasks_done evidence="Fixed"` → 1-line output, writes re-lock
- `tasks_add title="Research"` then `tasks_add title="Build" after="Research"` → dependency chain
- Templates reference ONLY existing tool exports (zero phantom actions)
- Destructive shell blacklist enforced in hook layer (not tool layer)

---

## Phase 10: Brain Engine + Session Intelligence + Init Experience

**Status:** Pending — deferred until Phase 9 completes
**Goal:** Brain becomes an indexer (not a dump). Session brain layer for cross-session memory. Init shows Foundation Report with real data. Hook-driven automation for brain reflexes.
**Depends on:** Phase 9 (lifecycle verbs must exist first)
**Brain Engine Plan:** `.qoder/plans/Brain_Engine_Prototype_980105f5.md` (detailed, deferred)

### 10.1 Brain Engine (Hook-Driven Automation)
- `tool.execute.after` hook: auto-scan modified files, update wiki/artifacts
- Session trajectory auto-export to `.idumb/brain/sessions/<session_id>.json`
- Agents PULL context via tools when needed (pull-based, not push)
- `clean` action purges expired session files (>7d inactive, >30d completed)
- Hook-driven, not ceremony-driven — brain fills without agents calling tools

### 10.2 Session Intelligence Tools (formerly idumb_hive_mind)
- `recall` — cross-session memory queries
- `orient` — "where am I, what was I doing?"
- `clean` — context janitor, sweep stale data
- `status` — memory health report

### 10.3 Plans/Artifacts Tools (formerly idumb_plans)
- `anchor` — compaction-surviving context (absorbs current anchor.ts)
- `learn` — brain knowledge entry persistence
- `phase` — MASTER-PLAN phase transitions
- `status` — artifact-centric view

### 10.4-10.5 Brain Index Population
Wire framework-detector, code-quality, tech-stacks, project-map to `brain/index/`.
`idumb_init scan` runs all indexers. Every fresh init populates the index.
**CRITICAL**: `client.find.symbols()` could replace manual codemap generation.
**CRITICAL**: `client.find.files()` could replace `listFilesRecursively()` in init.ts.

### 10.6-10.9 Init Experience
CLI fullscan flag, Foundation Report box, brain summary in system hook, scan freshness enforcement.

### Acceptance Criteria
- `brain/index/` populated with 4+ files after scan
- Foundation Report shows project stats in CLI output
- System prompt includes project awareness line
- `idumb_init status` warns about stale index
- Bilingual support (English + Vietnamese)

---

## Document Reference Index

| Document | Purpose | Status |
|----------|---------|--------|
| `MASTER-PLAN.md` (this) | Planning SOT | Active |
| `AGENTS.md` | Feature ground truth | Active |
| `CLAUDE.md` | Agent instructions | Active |
| `.claude/plans/toasty-purring-nygaard.md` | Lifecycle Verbs design plan | Active (Phase 9) |
| `docs/plans/pitfalls-when-creating-tools.md` | Tool design constraints | Active |
| `planning/diagrams/from-a-closer-angle.png` | System concepts mind map | Active (vision reference) |
| `planning/diagrams/the-hierarchy-relationships.png` | Flow & concepts mind map | Active (vision reference) |
| `docs/plans/2026-02-08-user-journey-governance-design.md` | User journey design | Active (partially stale — tool sections) |
| `docs/plans/2026-02-08-task-graph-hook-intelligence-design.md` | Intelligence design | Active (partially stale — tool names) |
| `docs/sdk-client-api.md` | OpenCode SDK client reference | Active |
| `.qoder/plans/Brain_Engine_Prototype_980105f5.md` | Brain Engine detailed plan | Deferred (Phase 10) |
| `.agents/prompts/ralph-output/` | Audit reference | Active |
| `planning/_archived-2026-02-08/` | Superseded docs (Phases 1-5 era) | Archived |
| `docs/plans/_archived-2026-02-09/` | Stale design docs (Phase 7.3 + Phase 9 predecessors) | Archived |

---

## Verification (End-to-End)

After all phases:
1. `npm run typecheck` — zero errors
2. `npm test` — all tests pass (new baseline after Phase 9 R4)
3. Non-iDumb agent can write/edit without governance block
4. Every system prompt injection includes current phase + project awareness
5. Post-compaction context preserves phase awareness
6. Phase transitions work (via tool or hook)
7. Only MASTER-PLAN.md claims planning SOT status
8. Zero "meta-builder" references in active source code
9. Fresh `idumb-v2 init` produces zero empty directories
10. `brain/index/` populated with real codebase intelligence after scan
11. Foundation Report shows project stats in CLI output
12. `tasks_start objective="X"` → 1-line output, writes unlock in ONE call (no ceremony)
13. `tasks_check` → JSON status object (not 20-line prose)
14. `tasks_done evidence="X"` → 1-line output, writes re-lock
15. Zero phantom action references in templates
16. Destructive shell blacklist enforced in hook layer (not tool layer)
17. Brain has entries after a work session (auto-populated by hooks, Phase 10)
