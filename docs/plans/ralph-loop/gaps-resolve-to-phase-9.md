# Ralph Loop — Gap Resolution Plan: Current State → Phase 9 Ready

**Created:** 2026-02-09
**Auditor:** Claude Opus 4.6
**Scope:** Every gap, inconsistency, and issue between the current codebase state (Phase 8 + quick_start done) and Phase 9 (Brain Index) readiness.
**Method:** Ralph Loop — user stories with testable acceptance criteria, executed in dependency order.

---

## Executive Summary

**Current state:** 637/637 tests passing, 24/30 Ralph stories complete (Group 06 pending). Internal architecture is sound — schema-first, hook factory pattern, tool-gate enforcement all work.

**External surface is broken.** CLI entry point doesn't exist (`bin/cli.mjs`), GitHub default branch has stale code, dashboard is 50% empty, delegation records but doesn't spawn agents, no data safety rails, significant dead code, zero tool-level test coverage, and 3 schema modules (brain, codemap, project-map) are write-path orphans that Phase 9 needs to populate.

**Gap count:** 52 discrete issues across 10 categories, organized into 7 new story groups (08-14) totaling 34 stories.

---

## Dependency Graph

```
GROUP 06 (pending)     GROUP 08              GROUP 09
Installation           Critical Fixes        Dead Code Purge
Channel Integrity      (shell bug, safety,   (orphans, dupes,
[6 stories, 0/6]       zod validation)       stale exports)
         │              [4 stories]           [5 stories]
         │                   │                     │
         ▼                   ▼                     ▼
         └──────────► GROUP 10 ◄───────────────────┘
                      Documentation
                      Alignment
                      [3 stories]
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         GROUP 11     GROUP 12     GROUP 13
         Tool Tests   Dashboard    Git + npm
         [6 stories]  [4 stories]  [4 stories]
              │
              ▼
         GROUP 14
         SDK + Phase 9
         Foundation
         [8 stories]
```

**Critical path:** 06 → 10 → 11 → 14
**Parallel track A:** 08 → 10 (can run alongside 06)
**Parallel track B:** 09 → 10 (can run alongside 06 and 08)
**Optional track:** 12, 13 (dashboard and git — no Phase 9 dependency)

---

## Gap Inventory: 52 Issues, 10 Categories

### CATEGORY A: Critical Infrastructure (4 issues)
| # | Issue | Severity | File:Line | Story |
|---|-------|----------|-----------|-------|
| A1 | `bin/cli.mjs` doesn't exist — CLI unusable | CRITICAL | package.json:9 | 06-03 |
| A2 | `govern_shell` "general" category blocks ALL unclassified commands (node, python, docker, curl) | HIGH | govern-shell.ts:30-34,223 | 08-01 |
| A3 | No backup on `--force` — 155KB data destruction risk | HIGH | cli/deploy.ts:71-79, scaffolder.ts:83-92 | 08-02 |
| A4 | No self-install detection (running init inside idumb-v2 repo) | HIGH | cli.ts — absent | 08-02 |

### CATEGORY B: Data Integrity (4 issues)
| # | Issue | Severity | File:Line | Story |
|---|-------|----------|-----------|-------|
| B1 | JSON.parse → `as Type` without Zod validation on 5 disk reads | MEDIUM | persistence.ts:130,172,192,214,242 | 08-03 |
| B2 | Re-init creates parallel brain files (graph.json vs task-graph.json) | MEDIUM | deploy.ts:344, persistence.ts:57 | 08-02 |
| B3 | VERSION string manual sync required (index.ts vs package.json) | LOW | index.ts:25 | 08-04 |
| B4 | `migrateV2ToV3()` tested but never called from runtime | LOW | task-graph.ts:500 | 14-06 |

### CATEGORY C: Dead Code & Orphans (8 issues)
| # | Issue | Severity | File:Line | Story |
|---|-------|----------|-----------|-------|
| C1 | `src/modules/schemas/agent-profile.ts` (89 LOC) — never imported | LOW | agent-profile.ts | 09-01 |
| C2 | `getClient()` exported but never called | LOW | sdk-client.ts:34 | 09-02 |
| C3 | `CATEGORY_SKIP_SUBTASKS` exported, never used | LOW | task.ts:48, schemas/index.ts:12 | 09-02 |
| C4 | `GRAPH_SESSION_STALE_MS` re-export, never imported | LOW | schemas/index.ts:70 | 09-02 |
| C5 | Duplicate `SESSION_STALE_MS` in task.ts:108 and work-plan.ts:128 | LOW | task.ts:108, work-plan.ts:128 | 09-03 |
| C6 | Duplicate `SessionState` interface in persistence.ts:35 and storage-adapter.ts:18 | LOW | persistence.ts:35, storage-adapter.ts:18 | 09-03 |
| C7 | `code-quality.ts` (701 LOC) missing from lib/index.ts barrel | LOW | lib/index.ts | 09-04 |
| C8 | Archived files (_archived-2026-02-08/) compiled into dist/ | LOW | tsconfig.json include | 09-04 |

### CATEGORY D: Stale References (5 issues)
| # | Issue | Severity | File:Line | Story |
|---|-------|----------|-----------|-------|
| D1 | "chain-validator (integrity)" comment references deleted file | LOW | planning-registry.ts:15 | 09-05 |
| D2 | "Plugin A's governance state" references old naming | LOW | state-reader.ts:61 | 09-05 |
| D3 | "entity-resolver.ts + chain-validator.ts moved to _archived" comment | LOW | lib/index.ts:11 | 09-05 |
| D4 | Agent names hardcoded in 5+ files instead of referencing AGENT_HIERARCHY | MEDIUM | govern-shell.ts:30, tool-gate.ts:70, govern-delegate.ts:69, govern-task.ts:63 | 14-02 |
| D5 | `createDefaultPlanState()` hardcodes 10 MASTER-PLAN phase names | LOW | plan-state.ts:82-98 | 09-05 |

### CATEGORY E: Documentation Drift (6 issues)
| # | Issue | Severity | File:Line | Story |
|---|-------|----------|-----------|-------|
| E1 | v2 CLAUDE.md references 19 slash commands — only 4 exist | HIGH | CLAUDE.md | 10-01 |
| E2 | v2 CLAUDE.md references 11 tools — only 6 exist | HIGH | CLAUDE.md | 10-01 |
| E3 | v2 CLAUDE.md references 23 agents — only 3 exist | HIGH | CLAUDE.md | 10-01 |
| E4 | v2 CLAUDE.md references `npm run install:local` — doesn't exist | MEDIUM | CLAUDE.md | 10-01 |
| E5 | v1 CLAUDE.md at parent dir pollutes every Claude Code conversation | MEDIUM | /Users/apple/.../idumb/CLAUDE.md | 10-03 |
| E6 | AGENTS.md directory tree lists deleted STRATEGIC-PLANNING-PROMPT.md | LOW | AGENTS.md:~135 | 10-02 |

### CATEGORY F: Test Coverage (6 issues)
| # | Issue | Severity | File:Line | Story |
|---|-------|----------|-----------|-------|
| F1 | govern_plan.ts (~290 LOC) — zero tests | HIGH | tools/govern-plan.ts | 11-01 |
| F2 | govern_task.ts (~375 LOC) — zero direct tool tests | HIGH | tools/govern-task.ts | 11-02 |
| F3 | govern_delegate.ts (~244 LOC) — zero direct tool tests | HIGH | tools/govern-delegate.ts | 11-03 |
| F4 | govern_shell.ts (~232 LOC) — zero tests | HIGH | tools/govern-shell.ts | 11-04 |
| F5 | anchor.ts (~87 LOC) — zero tests | MEDIUM | tools/anchor.ts | 11-05 |
| F6 | smoke-code-quality.ts and sqlite-adapter.test.ts not in npm test | MEDIUM | package.json test script | 11-06 |

### CATEGORY G: Dashboard (6 issues)
| # | Issue | Severity | File:Line | Story |
|---|-------|----------|-----------|-------|
| G1 | Vite proxy hardcoded to port 3001 — breaks on backend port retry | MEDIUM | frontend/vite.config.ts:13 | 12-01 |
| G2 | No production serve mode — always dev mode via npx vite | MEDIUM | cli/dashboard.ts:104 | 12-02 |
| G3 | ArtifactMetadata is mocked via getMockMetadata() | LOW | PlanningArtifactsPanel.tsx:30 | 12-03 |
| G4 | Client listens for "state-update" event server never sends | LOW | frontend/App.tsx:45 | 12-03 |
| G5 | Frontend dir resolution fragile for compiled CLI | MEDIUM | cli/dashboard.ts:92 | 12-04 |
| G6 | knowledge.json, codemap.json, project-map.json never populated | HIGH | (see Category I) | 14-03,04,05 |

### CATEGORY H: Git & Release (5 issues)
| # | Issue | Severity | File:Line | Story |
|---|-------|----------|-----------|-------|
| H1 | 3 diverged branches with no merge strategy | HIGH | git | 13-01 |
| H2 | GitHub default (main) has stale code, no AGENTS.md | HIGH | git | 13-01 |
| H3 | Author's personal governance state tracked on dev | MEDIUM | .idumb/brain/ | 13-02 |
| H4 | .gitignore differs between branches (main ignores .idumb, dev doesn't) | MEDIUM | .gitignore | 13-02 |
| H5 | package.json: workspaces field, postinstall no-op, missing publishConfig | MEDIUM | package.json | 13-04 |

### CATEGORY I: SDK & Phase 9 Foundation (8 issues)
| # | Issue | Severity | File:Line | Story |
|---|-------|----------|-----------|-------|
| I1 | `client.find.files()` unused — could replace `listFilesRecursively()` | MEDIUM | tools/init.ts | 14-01 |
| I2 | `context.agent` from ToolContext never consumed — agent identity from chat.params only | MEDIUM | tools/*.ts | 14-02 |
| I3 | knowledge.json has no write path — brain schema is dead | HIGH | schemas/brain.ts | 14-03 |
| I4 | codemap.json has no write path — codemap schema is dead | HIGH | schemas/codemap.ts | 14-04 |
| I5 | project-map.json has no write path — project-map schema is dead | HIGH | schemas/project-map.ts | 14-05 |
| I6 | `migrateV2ToV3()` exported, tested, but never called at runtime | MEDIUM | task-graph.ts:500 | 14-06 |
| I7 | 10+ SDK namespaces completely unused | INFO | sdk-client.ts | 14-01,02 |
| I8 | `client.app.agents()` could replace hardcoded AGENT_TOOL_RULES | MEDIUM | tool-gate.ts:70 | 14-02 |

---

## Story Groups (New: 08-14)

### GROUP 08: Critical Fixes (4 stories)
**Priority:** HIGHEST — unblocks usability and data safety
**Dependencies:** None
**Files:** `docs/user-stories/08-critical-fixes.json`

| Story | Description | Effort |
|-------|-------------|--------|
| 08-01 | Fix govern_shell "general" category — executor must run node/python/docker | 20 min |
| 08-02 | Self-install guard + backup on --force + parallel file resolution | 30 min |
| 08-03 | Zod validation on JSON.parse disk reads in persistence.ts | 30 min |
| 08-04 | Auto-sync VERSION from package.json (import or build step) | 10 min |

### GROUP 09: Dead Code & Duplication Purge (5 stories)
**Priority:** HIGH — reduces noise, prevents future confusion
**Dependencies:** None (parallel with 08)
**Files:** `docs/user-stories/09-dead-code-purge.json`

| Story | Description | Effort |
|-------|-------------|--------|
| 09-01 | Delete orphaned agent-profile.ts | 5 min |
| 09-02 | Remove dead exports: getClient, CATEGORY_SKIP_SUBTASKS, GRAPH_SESSION_STALE_MS | 15 min |
| 09-03 | Consolidate duplicate SESSION_STALE_MS + SessionState | 15 min |
| 09-04 | Exclude archived from tsconfig + add code-quality.ts to barrel | 10 min |
| 09-05 | Clean stale comments: Plugin A, chain-validator, hardcoded phases | 15 min |

### GROUP 10: Documentation Alignment (3 stories)
**Priority:** HIGH — accurate docs prevent context poisoning
**Dependencies:** 08, 09 (need accurate codebase state first)
**Files:** `docs/user-stories/10-documentation-alignment.json`

| Story | Description | Effort |
|-------|-------------|--------|
| 10-01 | Rewrite v2 CLAUDE.md to match current reality | 30 min |
| 10-02 | Fix AGENTS.md minor issues (file tree, investigator desc) | 15 min |
| 10-03 | Neutralize v1 CLAUDE.md context pollution | 5 min |

### GROUP 11: Tool Test Coverage (6 stories)
**Priority:** HIGH — must have test safety net before Phase 9 changes
**Dependencies:** 08 (shell fix first), 10 (accurate docs)
**Files:** `docs/user-stories/11-tool-test-coverage.json`

| Story | Description | Effort |
|-------|-------------|--------|
| 11-01 | govern_plan tests — create, plan_tasks, status, archive, abandon, phase | 60 min |
| 11-02 | govern_task tests — quick_start, start, complete, fail, review, status | 60 min |
| 11-03 | govern_delegate tests — assign, recall, status | 45 min |
| 11-04 | govern_shell tests — classify, execute, block, timeout | 45 min |
| 11-05 | anchor + init tool tests | 30 min |
| 11-06 | Add smoke-code-quality.ts + sqlite-adapter.test.ts to npm test | 10 min |

### GROUP 12: Dashboard Maturation (4 stories)
**Priority:** MEDIUM — not on Phase 9 critical path
**Dependencies:** 10 (docs), 14-03/04/05 (data population partially overlaps)
**Files:** `docs/user-stories/12-dashboard-maturation.json`

| Story | Description | Effort |
|-------|-------------|--------|
| 12-01 | Dynamic port proxy — backend writes port file, Vite reads it | 30 min |
| 12-02 | Production serve mode — express.static for built frontend | 45 min |
| 12-03 | Remove mocked metadata + fix WebSocket event mismatch | 20 min |
| 12-04 | Fix frontend directory resolution for compiled CLI | 20 min |

### GROUP 13: Git Strategy & npm Publish (4 stories)
**Priority:** MEDIUM — required for public release, not for Phase 9
**Dependencies:** 06 (bin/cli.mjs), 08, 09, 10
**Files:** `docs/user-stories/13-git-npm-readiness.json`

| Story | Description | Effort |
|-------|-------------|--------|
| 13-01 | Define and execute branch consolidation (dev → main) | 60 min |
| 13-02 | Align .gitignore — stop tracking personal governance state | 15 min |
| 13-03 | Remove personal brain data from git history | 15 min |
| 13-04 | Fix package.json for publish (workspaces, postinstall, files, bin) | 20 min |

### GROUP 14: SDK Surface Expansion + Phase 9 Foundation (8 stories)
**Priority:** HIGHEST (after 11) — this IS Phase 9
**Dependencies:** 11 (test coverage), 08 (shell fix)
**Files:** `docs/user-stories/14-sdk-phase9-foundation.json`

| Story | Description | Effort |
|-------|-------------|--------|
| 14-01 | Wire client.find.files() with fs fallback for init.ts | 30 min |
| 14-02 | Wire context.agent + client.app.agents() for dynamic agent rules | 45 min |
| 14-03 | Brain index: knowledge.json write path in StateManager + tool | 60 min |
| 14-04 | Brain index: codemap.json write path via find.symbols() + fs fallback | 60 min |
| 14-05 | Brain index: project-map.json write path via find.files() + fs fallback | 45 min |
| 14-06 | Auto-invoke migrateV2ToV3() on TaskStore load | 15 min |
| 14-07 | Duplicate path constants: unify persistence.ts + state-reader.ts paths | 15 min |
| 14-08 | E2E validation: all brain files populated, dashboard panels show data | 30 min |

---

## Totals

| Metric | Value |
|--------|-------|
| New story groups | 7 (groups 08-14) |
| New stories | 34 |
| Existing pending (Group 06) | 6 |
| Total pending stories | 40 |
| Estimated effort (sequential) | ~15 hours |
| Estimated effort (parallel tracks) | ~10 hours |
| Gap coverage | 52/52 (100%) |

---

## Execution Strategy

### Wave 1: Foundation (Groups 06 + 08 + 09 — PARALLEL)
Run all three groups simultaneously. They have no cross-dependencies.
- **06**: Installation channel integrity (bin/cli.mjs, deploy fixes)
- **08**: Critical fixes (shell bug, backup, zod validation, version sync)
- **09**: Dead code purge (orphans, dead exports, dupes, stale comments)
- **Gate**: `npm run typecheck && npm test` — zero regression

### Wave 2: Truth (Group 10)
All docs rewritten against Wave 1's cleaned codebase.
- **10**: Documentation alignment (CLAUDE.md rewrite, AGENTS.md fix, v1 neutralization)
- **Gate**: Grep verification — zero stale references in docs

### Wave 3: Safety Net (Group 11)
Complete tool-level test coverage before Phase 9 changes.
- **11**: Tool tests for all 6 governance tools + test script update
- **Gate**: `npm test` includes all tool suites, assertion count ≥ 700

### Wave 4: Phase 9 Core (Group 14)
SDK integration + brain index population.
- **14**: Wire SDK APIs, create write paths for knowledge/codemap/project-map, auto-migration
- **Gate**: Dashboard shows data in all 4 panels, brain index files populated

### Wave 5: Polish (Groups 12 + 13 — PARALLEL, optional)
Dashboard maturation and release readiness. Can defer past Phase 9.
- **12**: Dashboard production mode, dynamic ports, metadata
- **13**: Git branch consolidation, npm publish fixes
- **Gate**: `npm publish --dry-run` succeeds, dashboard works from compiled CLI

---

## Ralph Loop Configuration

### Updated prompt.md additions needed:
```
## Story Priority Order (Updated 2026-02-09)

## GROUP 06 (pending from prior session)
6. `06-installation-channel-integrity.json` — bin/cli.mjs, deploy fixes

## WAVE 1: Foundation (parallel)
7. `08-critical-fixes.json` — Shell bug, backup, Zod validation
8. `09-dead-code-purge.json` — Orphans, dead exports, dupes

## WAVE 2: Truth
9. `10-documentation-alignment.json` — CLAUDE.md rewrite, v1 neutralization

## WAVE 3: Safety Net
10. `11-tool-test-coverage.json` — All 6 tool test suites

## WAVE 4: Phase 9 Core
11. `14-sdk-phase9-foundation.json` — SDK wiring, brain index population

## WAVE 5: Polish (optional)
12. `12-dashboard-maturation.json` — Production mode, dynamic ports
13. `13-git-npm-readiness.json` — Branch strategy, publish readiness
```

### Verification commands:
```bash
npm run typecheck    # Must be zero errors
npm test             # Must be all green, ≥ 637 assertions
npx tsx scripts/verify-user-stories.ts  # Check story status
```

---

## Risk Register

| Risk | Mitigation |
|------|-----------|
| SDK APIs (find.symbols, app.agents) don't work at runtime | Every SDK call gets fs-based fallback. Phase 6 verification runs alongside. |
| Zod validation rejects existing brain files | Migration function wraps parse — corrupted files get reset with backup, not crash. |
| Branch consolidation loses commits | Create backup branch before any force operations. Compare commit lists. |
| Tool tests reveal behavioral bugs | Fix bugs in the tool code, not in the tests. Tests are the specification. |
| Dashboard panels still empty after Phase 9 | Group 14-08 is the E2E gate — blocks completion until all panels show data. |
