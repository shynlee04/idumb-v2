# MASTER PLAN: One True Plan + Self-Enforcement

> **This document is the SINGLE SOURCE OF TRUTH for all iDumb v2 planning.**
> No other document may claim planning SOT status. All superseded docs are archived in `planning/_archived-2026-02-08/`.

**Last Updated:** 2026-02-08
**Plan State Runtime:** `.idumb/brain/plan-state.json` (machine-readable projection read by hooks)

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
- **Added:** `planState` field, `getPlanState()`, `setPlanState()`, load/save to `.idumb/brain/plan-state.json`

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
- **Change:** Creates `plan-state.json` with default 6 phases during `idumb-v2 init`

### 2.7 Tests
- **File:** `tests/plan-state.test.ts`
- **Result:** 39/39 assertions

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
- `npm run typecheck && npm test` passes (657/657) ✅

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

## Document Reference Index

| Document | Purpose | Status |
|----------|---------|--------|
| `MASTER-PLAN.md` (this) | Planning SOT | Active |
| `AGENTS.md` | Feature ground truth | Active |
| `CLAUDE.md` | Agent instructions | Active |
| `planning/implamentation-plan-turn-based/implementation_plan-n6.md` | Technical reference | Active |
| `planning/implamentation-plan-turn-based/walkthrough-n6.md` | Latest walkthrough | Active |
| `docs/plans/*.md` | Design references | Active |
| `.agents/prompts/ralph-output/` | Audit reference | Active |
| `planning/_archived-2026-02-08/` | Superseded docs | Archived |

---

## Verification (End-to-End)

After all phases:
1. `npm run typecheck` — zero errors
2. `npm test` — 657+ assertions pass
3. Non-iDumb agent can write/edit without governance block
4. Every system prompt injection includes current phase + next action
5. Post-compaction context preserves phase awareness
6. `govern_plan action=phase phase_id=2 phase_status=in_progress` transitions the phase
7. Only MASTER-PLAN.md claims planning SOT status
8. Zero "meta-builder" references in active source code
