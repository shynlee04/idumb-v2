# MASTER PLAN: One True Plan + Self-Enforcement

> **This document is the SINGLE SOURCE OF TRUTH for all iDumb v2 planning.**
> No other document may claim planning SOT status. All superseded docs are archived in `planning/_archived-2026-02-08/`.

**Last Updated:** 2026-02-09
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

## Phase 7: Documentation Hygiene

**Status:** Pending
**Goal:** Fix 3 known defects from Phase 1-5 audit, archive stale design docs.

### 7.1 Investigator description fix
- **File:** `src/templates.ts:652`
- **Defect:** `description` field says "Uses innate read + webfetch" but `tools.webfetch: false` blocks it
- **Fix:** Remove "webfetch" from description string

### 7.2 AGENTS.md directory tree fix
- **File:** `AGENTS.md:135`
- **Defect:** Lists deleted `STRATEGIC-PLANNING-PROMPT.md` as "Planning SOT", missing `MASTER-PLAN.md` and `src/schemas/plan-state.ts`
- **Fix:** Update tree to match actual file system

### 7.3 Archive stale docs/plans/
- 4 documents are >60% factually wrong (reference deleted Plugin B, 9 tools, 49 actions)
- **Archive to `docs/plans/_archived-2026-02-09/`:** sot-contract.md, tool-agent-redesign-plan.md, slice1-enforcement-sqlite-dashboard-revival.md, phase-1a-completion.md
- **Keep:** user-journey-governance-design.md (implementation-agnostic, still valid), task-graph-hook-intelligence-design.md (design philosophy valid)
- **Preserve:** SOT contract Section 3 (SDK Client API) — extract to `docs/sdk-client-api.md` before archiving

### Acceptance Criteria
- `grep -i "webfetch" src/templates.ts` shows zero in description fields
- AGENTS.md tree matches `ls` output
- Only 2 active docs remain in docs/plans/
- 657+ tests, zero typecheck errors

---

## Phase 8: .idumb/ Structure Redesign

**Status:** Pending
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
- Old files left in place (user can delete manually)
- Scaffolder skips existing directories gracefully (already does this)
- No `.gitkeep` files — only create directories that will be populated

### Acceptance Criteria
- `ls .idumb/` after fresh init shows only: `brain/`, `config.json`, `modules/`
- `ls .idumb/brain/` shows: `state.json`, `tasks.json`, `graph.json`, `plan.json`, `delegations.json`, `registry.json`, `index/`
- `ls .idumb/brain/index/` is empty (populated by Phase 9 fullscan)
- Zero empty directories with only `.gitkeep`
- Old installs with `hook-state.json` still load correctly (migration)
- 657+ tests pass with path updates

---

## Phase 9: Fullscan — Brain Index Population

**Status:** Pending
**Goal:** `idumb_init action=scan` populates `brain/index/` with real codebase intelligence. The brain becomes an indexer, not a dump.
**Depends on:** Phase 8

### 9.1 Wire framework-detector → brain/index/frameworks.json
- **File:** `src/lib/framework-detector.ts`
- **Change:** `scanProject()` also writes results to `brain/index/frameworks.json`
- **Content:** `{ governance: [...], tech: [...], packageManager: "...", hasMonorepo: bool, scannedAt: timestamp }`

### 9.2 Wire code-quality → brain/index/quality.json
- **File:** `src/lib/code-quality.ts`
- **Change:** `scanCodeQuality()` also writes results to `brain/index/quality.json`
- **Content:** `{ grade: "A-F", score: N, totalFiles: N, totalLines: N, stats: {...}, topSmells: [...], scannedAt: timestamp }`

### 9.3 Extract tech stacks → brain/index/stacks.json
- **New function:** `extractTechStacks(projectDir)` in `framework-detector.ts`
- **Reads:** `package.json` (dependencies, devDependencies), lockfiles, `tsconfig.json`, `pyproject.toml`, `Cargo.toml`
- **Writes:** `brain/index/stacks.json` — `{ runtime: "node@22", language: "typescript@5.x", frameworks: [...], buildTools: [...], testTools: [...], scannedAt: timestamp }`

### 9.4 Generate project map → brain/index/project.json
- **Wire:** `schemas/project-map.ts` (currently schema-only) → actual directory scan
- **New function:** `generateProjectMap(projectDir)` in `framework-detector.ts` or new `lib/project-indexer.ts`
- **Writes:** `brain/index/project.json` — directory tree with file count, total lines, top-level structure
- **Scope:** Top 2 levels only (fast), no node_modules

### 9.5 Wire into init tool
- **File:** `src/tools/init.ts`
- **Change:** `action=scan` runs all 4 indexers, writes to `brain/index/`
- **Change:** `action=install` runs scan as final step (after scaffold)
- **Result:** Every fresh init populates the index

### Acceptance Criteria
- `idumb_init action=scan` produces 4+ files in `brain/index/`
- `brain/index/quality.json` has grade and stats
- `brain/index/stacks.json` shows actual dependencies from package.json
- `brain/index/frameworks.json` shows detected frameworks
- `brain/index/project.json` shows directory structure
- All files have `scannedAt` timestamp for freshness tracking
- Scan completes in <3 seconds for a 15K LOC project

---

## Phase 10: Init Experience — Showcase the Foundation

**Status:** Pending
**Goal:** After `idumb-v2 init`, the user sees their project's intelligence profile. The `.idumb/` directory is a living foundation, not a skeleton.
**Depends on:** Phase 9

### 10.1 CLI fullscan flag
- **File:** `src/cli.ts`
- **Change:** `idumb-v2 init --fullscan` runs deep scan during install (currently code quality scan is optional)
- **Default:** Quick scan (frameworks + stacks). `--fullscan` adds code quality + full codemap

### 10.2 Structured init output
- **File:** `src/cli.ts` + `src/tools/init.ts`
- **Change:** Init output shows a "Foundation Report" box:
  ```
  ┌─────────────────────────────────────────┐
  │  iDumb v2 — Foundation Report           │
  ├─────────────────────────────────────────┤
  │  Project:    15,420 lines across 149 files
  │  Grade:      C (62/100)
  │  Tech Stack: TypeScript, Node 22, Express
  │  Frameworks: None detected
  │  Brain:      6 state files + 4 index files
  │  Agents:     3 deployed (coordinator, investigator, executor)
  └─────────────────────────────────────────┘
  ```
- **Vietnamese variant** for `language.communication: "vi"`

### 10.3 Brain summary in system hook
- **File:** `src/hooks/system.ts`
- **Change:** If `brain/index/` has populated files, include one-line project awareness in governance injection:
  `Project: 149 files, grade C, TypeScript+Express | Phase: "Phase 8" [in_progress]`
- **Budget:** Max 120 chars for project context line

### 10.4 Scan freshness enforcement
- **File:** `src/tools/init.ts`
- **Change:** `action=status` checks `brain/index/*.json` timestamps. If older than 7 days, suggests rescan: `"Brain index is 12 days stale. Run idumb_init action=scan to refresh."`

### Acceptance Criteria
- Fresh `idumb-v2 init` on this codebase shows Foundation Report with real data
- `idumb-v2 init --fullscan` adds code quality grade and smell counts
- System prompt includes project awareness line
- `idumb_init action=status` warns about stale index
- Non-English support (Vietnamese Foundation Report)
- 670+ tests (new assertions for init output + system hook project context)

---

## Document Reference Index

| Document | Purpose | Status |
|----------|---------|--------|
| `MASTER-PLAN.md` (this) | Planning SOT | Active |
| `AGENTS.md` | Feature ground truth | Active |
| `CLAUDE.md` | Agent instructions | Active |
| `planning/implamentation-plan-turn-based/implementation_plan-n6.md` | Technical reference | Active |
| `planning/implamentation-plan-turn-based/walkthrough-n6.md` | Latest walkthrough | Active |
| `planning/diagrams/from-a-closer-angle.png` | System concepts mind map | Active (vision reference) |
| `planning/diagrams/the-hierarchy-relationships.png` | Flow & concepts mind map | Active (vision reference) |
| `docs/plans/2026-02-08-user-journey-governance-design.md` | User journey design | Active |
| `docs/plans/2026-02-08-task-graph-hook-intelligence-design.md` | Intelligence design | Active (philosophy) |
| `docs/sdk-client-api.md` | OpenCode SDK client reference | Active (extracted from SOT contract Phase 7.3) |
| `.agents/prompts/ralph-output/` | Audit reference | Active |
| `planning/_archived-2026-02-08/` | Superseded docs (Phases 1-5 era) | Archived |
| `docs/plans/_archived-2026-02-09/` | Stale design docs (Phase 7.3) | Archived |

---

## Verification (End-to-End)

After all phases:
1. `npm run typecheck` — zero errors
2. `npm test` — 670+ assertions pass
3. Non-iDumb agent can write/edit without governance block
4. Every system prompt injection includes current phase + project awareness
5. Post-compaction context preserves phase awareness
6. `govern_plan action=phase phase_id=N phase_status=in_progress` transitions the phase
7. Only MASTER-PLAN.md claims planning SOT status
8. Zero "meta-builder" references in active source code
9. Fresh `idumb-v2 init` produces zero empty directories
10. `brain/index/` populated with real codebase intelligence after scan
11. Foundation Report shows project stats in CLI output
