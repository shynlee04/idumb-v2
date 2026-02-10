---
phase: 1A-plugin-demotion
plan: 01
subsystem: infra
tags: [plugin-archival, dependency-cleanup, tsconfig, build-chain]

# Dependency graph
requires:
  - phase: 01-engine
    provides: "Working dashboard + CLI with plugin-based architecture"
provides:
  - "Plugin-free codebase — zero @opencode-ai/plugin dependency"
  - "Archived plugin source (10 files) and test files (6 files) in _archived-plugin/ directories"
  - "Clean build chain: tsc zero errors, npm test 10 suites passing"
  - "deploy.ts without plugin path resolution or opencode.json plugin registration"
affects: [1A-02-doc-drift, 1B-dashboard-features, 1C-multi-agent-workspace]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "_archived-plugin/ convention for preserving deprecated code without breaking builds"
    - "tsconfig exclude pattern for archived code directories"

key-files:
  created:
    - "src/_archived-plugin/ (10 .ts files — preserved plugin source)"
    - "tests/_archived-plugin/ (6 .ts files — preserved plugin tests)"
  modified:
    - "src/lib/index.ts — removed sdk-client barrel exports"
    - "src/lib/logging.ts — removed SDK client logging path"
    - "src/lib/brain-indexer.ts — replaced SdkClient type with Record<string, unknown>"
    - "src/cli/deploy.ts — removed plugin path resolution and opencode.json registration"
    - "src/cli.ts — removed plugin path display from CLI output"
    - "src/templates.ts — removed pluginPath param from getCoordinatorAgent"
    - "package.json — removed @opencode-ai/plugin dep, updated test script to 10 files"
    - "tsconfig.json — added src/_archived-plugin/** to exclude"

key-decisions:
  - "git mv for all file moves — preserves full git history for archived code"
  - "SdkClient replaced with Record<string, unknown> in brain-indexer.ts — maintains optional SDK client parameter for future use"
  - "SDK client logging block removed from logging.ts — file-based logging is the sole mechanism now"
  - "opencode.json plugin registration block removed entirely from deploy.ts — plugin system deprecated"

patterns-established:
  - "_archived-plugin/ directory naming for deprecated plugin code"
  - "tsconfig exclude for archived directories: src/_archived-plugin/**"

# Metrics
duration: 12min
completed: 2026-02-10
---

# Phase 1A Plan 01: Plugin Archival Summary

**Archived 16 plugin-dependent files to _archived-plugin/, removed @opencode-ai/plugin dependency, and fixed all imports so tsc and npm test pass clean**

## Performance

- **Duration:** 12 min
- **Started:** 2026-02-10T08:07:06Z
- **Completed:** 2026-02-10T08:19:30Z
- **Tasks:** 2
- **Files modified:** 24 (16 moved + 8 edited)

## Accomplishments
- All plugin source code (hooks, tools, entry point, sdk-client) archived to src/_archived-plugin/ via git mv
- All plugin test files archived to tests/_archived-plugin/
- @opencode-ai/plugin removed from package.json dependencies
- Build chain fully clean: tsc --noEmit zero errors, npm test 10 suites / 65 assertions passing
- deploy.ts simplified: deploys agents/commands/modules without plugin wiring

## Task Commits

Each task was committed atomically:

1. **Task 1: Archive plugin source files and test files** - `8506ffd` (chore)
2. **Task 2: Fix barrel exports, dependencies, deploy.ts, and test script** - `c9c0485` (feat)

## Files Created/Modified
- `src/_archived-plugin/index.ts` — Archived plugin entry point
- `src/_archived-plugin/hooks/` — Archived 4 hook files (compaction, message-transform, system, barrel)
- `src/_archived-plugin/tools/` — Archived 4 tool files (anchor, init, tasks, barrel)
- `src/_archived-plugin/lib/sdk-client.ts` — Archived SDK client singleton
- `tests/_archived-plugin/` — Archived 6 test files
- `src/lib/index.ts` — Removed sdk-client exports from barrel
- `src/lib/logging.ts` — Removed SDK client logging path, simplified to file-only logging
- `src/lib/brain-indexer.ts` — Replaced SdkClient type import with Record<string, unknown>
- `src/cli/deploy.ts` — Removed resolvePluginPath, cleanStalePluginPaths, opencode.json registration
- `src/cli.ts` — Removed plugin path/method display from CLI output
- `src/templates.ts` — Removed pluginPath parameter from getCoordinatorAgent
- `package.json` — Removed @opencode-ai/plugin dependency, updated test script
- `tsconfig.json` — Added src/_archived-plugin/** to exclude array

## Decisions Made
- Used git mv for all moves to preserve full file history
- Replaced SdkClient type with Record<string, unknown> (not `unknown`) to maintain property access compatibility in brain-indexer.ts
- Removed SDK client logging block from logging.ts entirely rather than stubbing it — file-based logging is sufficient
- Removed entire opencode.json plugin registration block from deploy.ts — no migration path needed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] tool-gate.test.ts already deleted**
- **Found during:** Task 1 (Archive test files)
- **Issue:** Plan specified 7 test files to archive, but tool-gate.test.ts was already deleted in Phase 9 R4
- **Fix:** Skipped the git mv for tool-gate.test.ts — 6 test files archived instead of 7
- **Files modified:** None (file did not exist)
- **Verification:** All other 6 test files archived successfully
- **Committed in:** 8506ffd (Task 1 commit)

**2. [Rule 3 - Blocking] logging.ts imports sdk-client.ts**
- **Found during:** Task 2 (Typecheck after barrel fix)
- **Issue:** src/lib/logging.ts imports tryGetClient from sdk-client.ts which was archived
- **Fix:** Removed import and SDK client logging block — file-based logging is the sole mechanism
- **Files modified:** src/lib/logging.ts
- **Verification:** tsc --noEmit passes clean
- **Committed in:** c9c0485 (Task 2 commit)

**3. [Rule 3 - Blocking] brain-indexer.ts imports SdkClient type**
- **Found during:** Task 2 (Typecheck after barrel fix)
- **Issue:** src/lib/brain-indexer.ts imports SdkClient type from sdk-client.ts which was archived
- **Fix:** Replaced SdkClient type with Record<string, unknown> — maintains property access pattern
- **Files modified:** src/lib/brain-indexer.ts
- **Verification:** tsc --noEmit passes clean
- **Committed in:** c9c0485 (Task 2 commit)

**4. [Rule 3 - Blocking] templates.ts getCoordinatorAgent accepts pluginPath**
- **Found during:** Task 2 (deploy.ts no longer passes pluginPath)
- **Issue:** getCoordinatorAgent in templates.ts required a pluginPath parameter that deploy.ts no longer provides
- **Fix:** Removed pluginPath from function signature and template output
- **Files modified:** src/templates.ts
- **Verification:** tsc --noEmit passes clean
- **Committed in:** c9c0485 (Task 2 commit)

**5. [Rule 3 - Blocking] cli.ts references removed DeployResult fields**
- **Found during:** Task 2 (deploy.ts DeployResult no longer has pluginPath/pluginMethod/opencodConfigUpdated)
- **Issue:** cli.ts referenced deployResult.pluginPath, pluginMethod, opencodConfigUpdated which were removed
- **Fix:** Removed all plugin-related display logic from CLI success output
- **Files modified:** src/cli.ts
- **Verification:** tsc --noEmit passes clean
- **Committed in:** c9c0485 (Task 2 commit)

---

**Total deviations:** 5 auto-fixed (5 blocking — Rule 3)
**Impact on plan:** All auto-fixes necessary to achieve a clean build. The plan covered the primary files but missed 4 secondary files that import from the archived modules. No scope creep — every fix was a direct consequence of the archival.

## Issues Encountered
None — all issues were anticipated consequences of the archival, handled as deviations.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- Plugin-free codebase is ready for Plan 02 (doc drift fix)
- AGENTS.md, CLAUDE.md, and README.md all need updates to reflect the new architecture (covered by 1A-02-PLAN)
- Dashboard and CLI remain fully functional

---
*Phase: 1A-plugin-demotion*
*Completed: 2026-02-10*
