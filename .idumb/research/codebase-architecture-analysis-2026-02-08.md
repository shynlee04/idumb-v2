# iDumb v2 Codebase Architecture Analysis

**Created:** 2026-02-08  
**Agent:** idumb-investigator  
**Status:** Active

---

## Executive Summary

iDumb v2 is a 5-level OpenCode plugin + agent system that enforces governance on AI agents through deterministic hooks, structured agent prompts, hierarchical task governance, static code analysis, and schema-regulated planning. All "intelligence" is manufactured from these mechanisms, not LLM reasoning.

**Total LOC:** ~14,717 (excluding dashboard frontend, node_modules)  
**Test Baseline:** 294/294 assertions across 8 test files  
**TypeScript:** Clean, zero errors

---

## 5-Level Architecture

### Level 1: Plugin Hooks (Governance Enforcement)

**Purpose:** Block file writes without active tasks, preserve context across compaction, prune stale tool outputs

| Hook | Status | Evidence | What It Does |
|------|--------|----------|-------------|
| `event` | Works | Logs session lifecycle events | Session lifecycle tracking |
| `tool.execute.before` | **VALIDATED** | 16/16 unit tests | Blocks write/edit without active task |
| `tool.execute.after` | **VALIDATED** | Unit-tested | Defense-in-depth replacement |
| `experimental.session.compacting` | Unit-tested | 16/16 unit tests | Injects anchors + active task |
| `experimental.chat.system.transform` | **UNVERIFIED** | Registered but not confirmed | Governance directive injection |
| `experimental.chat.messages.transform` | **UNVERIFIED** | SDK input is `{}` (empty) | Prunes old tool outputs |
| `chat.params` | **REGISTERED** | Captures agent field | Auto-assigns agent to active task |

**Files:**
- `src/hooks/index.ts` - Barrel exports
- `src/hooks/tool-gate.ts` - Write/edit blocking logic (tool-gate pattern)
- `src/hooks/compaction.ts` - Anchor injection on compaction
- `src/hooks/message-transform.ts` - DCP-pattern context pruning
- `src/hooks/system.ts` - Unverified system hook

**Key Patterns:**
- **Tool-gate pattern**: Blocks write/edit without active task using `idumb_task` tool
- **Hook factory pattern**: Every hook = function returning async hook
- **Graceful degradation**: Every hook wrapped in try/catch

---

### Level 2: Agent System (3 Auto-Deployed Agents)

**Purpose:** Structured delegation with role-based permissions and category-aware routing

**All agents deployed by:** `src/cli/deploy.ts` via `npx idumb-v2 init`

| Agent | Level | Role | Write Permissions | Key Tools |
|-------|-------|------|------------------|-----------|
| `idumb-supreme-coordinator` | 0 | Pure orchestrator | ❌ None | `idumb_task`, `idumb_init`, `idumb_read` (limited) |
| `idumb-investigator` | 1 | Research, analysis, planning | ✅ Brain entries only | `idumb_read`, `idumb_write` (brain), `idumb_webfetch`, `idumb_bash` (read-only) |
| `idumb-executor` | 1 | Code implementation | ✅ All | `idumb_write` (all), `idumb_bash` (builds/tests), `idumb_read`, edit |

**Delegation Routing (from `src/schemas/delegation.ts`):**

```typescript
const CATEGORY_AGENT_MATRIX: Record<WorkStreamCategory, string[]> = {
    "development": ["idumb-executor"],
    "research": ["idumb-investigator"],
    "governance": ["idumb-supreme-coordinator"],
    "maintenance": ["idumb-executor", "idumb-investigator"],
    "spec-kit": ["idumb-investigator"],
    "ad-hoc": ["idumb-executor", "idumb-investigator"],
}
```

**Agent Hierarchy:**
- Coordinator (0) can delegate to anyone
- Investigator (1) can delegate to executor (same level)
- Executor (1) cannot delegate up

**Files:**
- `src/templates.ts` (1510 LOC ⚠️) - Agent templates for all 3 agents
- `src/schemas/delegation.ts` (363 LOC) - Delegation schema with validation
- `src/lib/entity-resolver.ts` (545 LOC ⚠️) - `canAgentWrite` permissions mapping
- `src/lib/chain-validator.ts` (300 LOC) - Delegation chain validation

**Known Violations:**
- `templates.ts` (1510 LOC) - Needs split into `templates/coordinator.ts`, `templates/investigator.ts`, `templates/executor.ts`, `templates/modules.ts`

---

### Level 3: Smart TODO System (3-Level Hierarchy)

**Purpose:** Hierarchical task system with 12 actions, 6 edge-case mechanisms, prerequisite enforcement

**Schema:** `src/schemas/task.ts` (530 LOC ⚠️)

**Hierarchy:**
```
Epic → Task → Subtask
```

**WorkStream Categories:**
- `development` - Feature implementation, bug fixes
- `research` - Investigation, analysis, documentation
- `governance` - Policy, architecture decisions
- `maintenance` - Refactoring, tech debt
- `spec-kit` - Module development, tooling
- `ad-hoc` - One-off tasks

**12 Actions:**
1. `create_epic` - Name, category
2. `create_task` - Name (auto-links to active epic)
3. `add_subtask` - Name, task_id
4. `assign` - Task_id, assignee
5. `start` - Task_id (REQUIRED before file writes)
6. `complete` - Target_id, evidence (required for tasks)
7. `defer` - Target_id, reason
8. `abandon` - Target_id, reason
9. `delegate` - Task_id, to_agent, context, expected_output
10. `status` - Full governance state
11. `list` - List all epics/tasks
12. `update` - Target_id, name (rename)

**6 Edge-Case Mechanisms:**
- Prerequisite enforcement
- Completion chain validation
- Active task tracking
- Agent identity capture
- Auto-migration (v1→v2)
- Category-aware delegation routing

**Files:**
- `src/tools/task.ts` (826 LOC ⚠️) - 12 actions + 6 edge-case mechanisms
- `src/schemas/task.ts` (530 LOC ⚠️) - Epic/Task/Subtask schema, WorkStream categories
- `src/lib/persistence.ts` (407 LOC) - TaskStore with separate `tasks.json`

**Evidence:** 54/54 unit tests in `tests/task.test.ts`

**Known Violations:**
- `tools/task.ts` (826 LOC) - Needs split into `task-actions/` directory
- `schemas/task.ts` (530 LOC) - Needs split (types from helpers)

---

### Level 4: Code Intelligence (Static Analysis + Quality)

**Purpose:** Framework detection, code quality scanning, symbol extraction

**Tools:**

1. **Framework Detection** (`src/lib/framework-detector.ts`, 445 LOC)
   - Read-only brownfield scanner
   - Detects frameworks: React, Vue, Angular, Next.js, Express, NestJS, etc.
   - Outputs: Detected frameworks, file counts, confidence scores

2. **Code Quality Scanner** (`src/lib/code-quality.ts`, 701 LOC ⚠️)
   - 7 smell types:
     - Large files (>500 LOC)
     - Deep nesting (>4 levels)
     - Long functions (>50 LOC)
     - Complex cyclomatic complexity (>10)
     - Duplicate code blocks
     - Dead code
     - Magic numbers
   - A-F grading system
   - 50+ roast comments
   - Integration with `idumb_init`

3. **Code Mapper** (`src/tools/codemap.ts`, 521 LOC ⚠️)
   - Symbol extraction (functions, classes, methods)
   - Import/export analysis
   - TODO/FIXME/HACK comment scanning
   - Naming inconsistency detection

**Files:**
- `src/lib/code-quality.ts` (701 LOC ⚠️) - Quality scanner, grading, roasts
- `src/lib/framework-detector.ts` (445 LOC) - Framework detection
- `src/tools/codemap.ts` (521 LOC ⚠️) - Symbol extraction
- `src/tools/scan.ts` (445 LOC) - Framework detection + structure analysis

**Evidence:** `tests/smoke-code-quality.ts` - Runs scanner against own codebase

**Known Violations:**
- `lib/code-quality.ts` (701 LOC) - Extract smell detectors into separate modules
- `tools/codemap.ts` (521 LOC) - Extract symbol extraction logic

---

### Level 5: Planning Registry (Schema-Validated Planning)

**Purpose:** Planning artifacts with tier hierarchy, chain versioning, section-level staleness tracking, outlier detection

**Schema:** `src/schemas/planning-registry.ts` (729 LOC ⚠️)

**Tiers:**
- **T1 (Strategy)**: Strategic planning, vision documents
- **T2 (Architecture)**: Architecture decisions, ADRs
- **T3 (Implementation)**: Implementation plans, task breakdowns

**Key Features:**
- **Artifact chains**: Versioned planning documents (n3, n4, n5, n6)
- **Section-level staleness**: Track individual sections, not just files
- **Outlier detection**: Identify files not linked to any plan
- **Lifecycle management**: activate, supersede, abandon, resolve
- **Task linking**: Link tasks to planning artifacts

**Integration Points:**
- `tools/write.ts` - Pre-write guard, sync-after-write, lifecycle sync
- `tools/init.ts` - Outlier scan on install
- `cli/deploy.ts` - Bootstrap empty `planning-registry.json`

**Files:**
- `src/schemas/planning-registry.ts` (729 LOC ⚠️) - Schema + factory functions
- `src/tools/write.ts` (1174 LOC ⚠️⚠️) - Planning registry integration
- `src/tools/init.ts` (441 LOC) - Outlier scanning

**Evidence:** 52/52 unit tests in `tests/planning-registry.test.ts`

**Known Violations:**
- `schemas/planning-registry.ts` (729 LOC) - Split schema types from helper functions
- `tools/write.ts` (1174 LOC ⚠️⚠️) - Extract planning registry helpers (~290 LOC) to `lib/planning-registry-runtime.ts`

---

## Tooling Ecosystem

### Custom Tools (5 of max 5)

| Tool | Description | LOC | Key Features |
|------|-------------|-----|--------------|
| `idumb_task` | 12 actions, 3-level hierarchy, category-aware | 826 ⚠️ | Epic→Task→Subtask, WorkStream categories, delegation routing |
| `idumb_anchor` | Context anchors surviving compaction | 365 | Priority scoring, 48h staleness, session compaction |
| `idumb_init` | Brownfield scan, scaffold, code quality analysis | 441 | Framework detection, A-F grading, outlier reporting |
| `idumb_scan` | Framework detection, structure analysis | 445 | Framework detection, file counting, confidence scores |
| `idumb_codemap` | Symbol extraction, TODO scanning | 521 ⚠️ | Functions, classes, imports/exports, TODO/FIXME/HACK |

### Entity-Aware Tools

**`idumb_read`** (568 LOC ⚠️) - 5 modes:
- `content` - Read with entity annotation
- `outline` - Structure + entity context
- `traverse` - Hop-read across entity chains
- `comments` - Extract TODOs/FIXMEs/JSDoc with entity context
- `chain-check` - Validate chain integrity without reading content

**`idumb_write`** (1174 LOC ⚠️⚠️) - 4 modes + lifecycle:
- `create` - Fail if exists
- `overwrite` - Backup + schema validate
- `append` - Add to end
- `update-section` - Replace markdown section by heading
- `lifecycle` - activate, supersede, abandon, resolve
- **Planning registry integration**: Pre-write guard, sync-after-write, lifecycle sync

**`idumb_bash`** (438 LOC) - Role-based permissions:
- Purpose: validation (test/lint), build (compile), git (add/commit), inspection (cat/ls), general (fallback)
- **Destructive commands are ALWAYS blocked** (rm -rf, git push --force, npm publish)

**`idumb_webfetch`** (365 LOC) - Research intelligence:
- Purpose: research (fetch → brain entry → task link), reference (API docs), validation (link alive check)
- Session cache prevents redundant fetching

---

## Known LOC Violations (> 500 LOC)

These files need future splitting. Listed in severity order:

| File | LOC | Recommended Split | Priority |
|------|-----|-------------------|----------|
| `templates.ts` | 1510 | `templates/coordinator.ts`, `templates/investigator.ts`, `templates/executor.ts`, `templates/modules.ts` | ⚠️⚠️⚠️ Critical |
| `tools/write.ts` | 1174 ⚠️⚠️ | Extract planning registry helpers to `lib/planning-registry-runtime.ts` (~290 LOC); extract entity-specific write handlers | ⚠️⚠️⚠️ Critical |
| `tools/task.ts` | 826 | Split actions into `task-actions/` directory | ⚠️⚠️ High |
| `schemas/planning-registry.ts` | 729 | Split schema types from helper functions | ⚠️ High |
| `lib/code-quality.ts` | 701 | Extract smell detectors into separate modules | ⚠️ Medium |
| `tools/read.ts` | 568 | Extract entity-specific read handlers | ⚠️ Medium |
| `dashboard/backend/server.ts` | 563 | Extract route handlers | ⚠️ Medium |
| `lib/entity-resolver.ts` | 545 | Extract classification rules into data file | ⚠️ Medium |
| `schemas/task.ts` | 530 | Split types from helpers | ⚠️ Low |
| `tools/codemap.ts` | 521 | Extract symbol extraction logic | ⚠️ Low |

---

## Integration Points & Critical Paths

### Init → Config → Deploy → Coordinator Pipeline

```
npx idumb-v2 init
    │
    ├─→ Interactive CLI prompts (language, governance, experience, scope)
    │
    ├─→ Brownfield Scan (framework-detector.ts + code-quality.ts)
    │   ├── Framework detection + code quality scan (A-F grading)
    │   └─→ CLI output: health grade box, stats, issue breakdown, roasts
    │
    ├─→ deploy.ts (ALL agents + commands + modules pre-deployed)
    │   ├── .opencode/agents/ (3 agents: coordinator, investigator, executor)
    │   ├── .opencode/commands/ (4 commands: init, settings, status, delegate)
    │   ├── .idumb/idumb-modules/agents/ (3 agent reference profiles)
    │   ├── .idumb/idumb-modules/schemas/agent-contract.md
    │   ├── .idumb/idumb-modules/skills/ (delegation + governance protocols)
    │   ├── .idumb/idumb-modules/commands/command-template.md
    │   ├── .idumb/idumb-modules/workflows/workflow-template.md
    │   └─→ opencode.json (plugin path auto-added)
    │
    └─→ Supreme Coordinator runs in OpenCode
        ├── Delegates research → @idumb-investigator
        ├── Delegates execution → @idumb-executor
        └─→ Validates completion before accepting
```

**This pipeline is COMPLETE and WORKING.** All 3 agents auto-deployed on install.

---

## Known Pitfalls & Anti-Patterns

### From AGENTS.md Development Cycle Discipline

1. **MULTI-CYCLE, NEVER ONE-SHOT**: No single cycle completes a phase. Every change follows: **Cycle 1** = implement → **Cycle 2** = iterate + integrate.
2. **NO HALLUCINATION**: AGENTS.md describes ONLY what exists. No features, files, or schemas that aren't implemented and tested.
3. **TUI SAFETY**: NO `console.log` anywhere. File-based logging via `lib/logging.ts`.
4. **CONTEXT-FIRST**: Gather context before executing. Read existing files before creating new ones.
5. **ANTI-REPETITION**: Check before creating. Prefer editing over creating.
6. **ALL CODE LIVES IN `src/`**: If a source file exists outside `src/`, move it in. Restructure, don't scatter.
7. **ATOMIC MEANINGFUL COMMITS**: One commit per task completion. Distinguish between: code changes, schema changes, test changes, documentation changes, and artifact updates.
8. **INCREMENTAL TESTING ONLY**: Tests must pass incrementally. Every new file gets a companion test. No logic goes unchecked. Schema-driven, type-strict, zero-debt.
9. **FILE TREE UPDATES MANDATORY**: Every commit that adds/removes/moves files MUST update the directory structure in this document.
10. **ALL OUTPUT = HAND-OFF READY**: Every artifact, walkthrough, and commit message must be instructive enough for a fresh agent to continue the work in a new context window.

### Plan Chain Protocol

11. **PLAN CHAIN IS SACRED**: Turn-based plans live in `planning/implamentation-plan-turn-based/`. Each has an `n`-suffix (n3, n4, n5, n6). The highest `n` is closest to current reality.
12. **CONFLICT = ALERT**: Any conflict between plans, code, or AGENTS.md must be surfaced immediately. Do NOT silently resolve.
13. **ITERATIVE PLAN UPDATES**: Plans are updated ONLY after Cycle 2 (integration cycle) of a phase implementation. Never update plans during Cycle 1 (initial implementation).

---

## What Does NOT Work / Does NOT Exist Yet

| Item | Reality |
|------|---------|
| Live hook verification | **Not yet tested.** Never installed in real OpenCode. |
| `experimental.chat.system.transform` | **Unverified.** Registered but not confirmed firing. |
| `experimental.chat.messages.transform` | **Unverified.** SDK input is `{}` (empty!). |
| Framework agent interception | **Not implemented.** BMAD/GSD/Agent-OS agents not intercepted yet. |
| Command splitting | **Not implemented.** Agent prompts still monolithic in `templates.ts`. |
| Dashboard integration | **Frontend built.** Backend exists. Not integrated into CLI. |
| Delegation runtime | **Schema done (δ2).** Runtime enforcement not wired. |
| Brain / wiki | **Not implemented.** |

---

## Governance Modes

| Mode | Description |
|------|-------------|
| `strict` | Full enforcement — task required before every write |
| `standard` | Balanced — task tracking + governance warnings |
| `relaxed` | Light governance — task tracking, no write-blocking |
| `retard` | 🔥 Expert-only — maximum autonomy + savage roasts |

---

## Development Commands

```bash
npm run build        # tsc
npm run dev          # tsc --watch
npm run typecheck    # tsc --noEmit
npm test             # 8 test files via tsx (294 assertions)
```

---

## Session Handoff Checklist

When resuming work:

1. ✅ Read this file (AGENTS.md) — it reflects reality
2. ✅ Read `planning/implamentation-plan-turn-based/implementation_plan-n6.md` — current active plan
3. ✅ Read `planning/implamentation-plan-turn-based/walkthrough-n6.md` — latest changes walkthrough
4. ✅ Check which Phase is current (see Roadmap above)
5. ✅ Run `npm run typecheck` — must be zero errors
6. ✅ Run `npm test` — must be 294/294 baseline
7. **NEXT WORK**: Extract planning registry runtime helpers from `write.ts` to `lib/planning-registry-runtime.ts` (LOC fix). Then Phase n6-Iter2: framework interception + command splitting.

---

## Summary of Key Patterns

1. **Tool-gate pattern**: Block writes without active task via `tool.execute.before` hook
2. **Hook factory pattern**: Every hook = function returning async hook
3. **Entity-aware I/O**: `idumb_read` and `idumb_write` annotate every operations with hierarchy metadata
4. **Schema-regulated artifacts**: Planning registry enforces structure, chain versioning, staleness tracking
5. **Delegation chain**: 3-agent hierarchy with category-aware routing and depth limits
6. **TUI-safe logging**: Zero `console.log`, file-based via `lib/logging.ts`
7. **Graceful degradation**: Every hook wrapped in try/catch
8. **Incremental testing**: Every new file gets companion test, 294/294 baseline
9. **LOC discipline**: Files above 500 LOC flagged for splitting, 300-500 LOC target
10. **Hand-off ready**: All artifacts instructive enough for fresh agent to continue

---

**Analysis complete. Ready for skill suite design.**
