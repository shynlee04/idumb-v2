---
phase: 1A-plugin-demotion
verified: 2026-02-10T16:00:00Z
status: gaps_found
score: 10/10 plan must-haves verified, 4/5 ROADMAP success criteria met
re_verification: false
gaps:
  - truth: "@opencode-ai/sdk must be declared in package.json dependencies"
    status: failed
    reason: "ROADMAP SC3 says 'only @opencode-ai/sdk remains' but SDK is not in package.json. Active source (engine.ts, engine-types.ts) imports from @opencode-ai/sdk. Currently works because stale package-lock.json still references @opencode-ai/plugin which brings SDK as transitive dep. A lockfile regeneration or clean install without lockfile would break the build."
    artifacts:
      - path: "package.json"
        issue: "@opencode-ai/sdk not listed in dependencies despite being imported in active source"
      - path: "package-lock.json"
        issue: "Stale — still lists @opencode-ai/plugin as root dependency (removed from package.json)"
      - path: "src/dashboard/backend/engine.ts"
        issue: "Imports createOpencode, createOpencodeClient, OpencodeClient from @opencode-ai/sdk"
      - path: "src/dashboard/shared/engine-types.ts"
        issue: "Imports Session, Message, Part, SessionStatus types from @opencode-ai/sdk"
    missing:
      - "Add @opencode-ai/sdk to package.json dependencies"
      - "Run npm install to regenerate package-lock.json cleanly"
      - "Verify zod is still available (persistence.ts imports it) — may need explicit dep"
  - truth: "CLAUDE.md must not contain stale plugin references"
    status: partial
    reason: "CLAUDE.md was not in Plan 02 scope (only AGENTS.md, README.md, CHANGELOG.md were targeted). But CLAUDE.md has 10+ stale references: calls project 'an OpenCode plugin', references src/index.ts as plugin entry, lists tool-gate.ts, shows src/hooks/ and src/tools/ in source layout, references @opencode-ai/plugin as key dependency. Any agent reading CLAUDE.md gets misinformation."
    artifacts:
      - path: "CLAUDE.md"
        issue: "10+ stale references to plugin architecture (lines 7, 15, 35, 67, 77, 106, 165, 173, 190, 227)"
    missing:
      - "Update CLAUDE.md project overview to reflect SDK-direct architecture"
      - "Update source layout to match actual filesystem"
      - "Remove tool-gate.ts and plugin references"
      - "Update key dependencies section"
human_verification:
  - test: "Run npm ci in a clean directory (no node_modules) and verify typecheck passes"
    expected: "npm ci installs all deps including @opencode-ai/sdk, tsc --noEmit succeeds"
    why_human: "Cannot safely delete node_modules in this verification to test clean install"
---

# Phase 1A: Plugin Demotion + Architecture Cleanup -- Verification Report

**Phase Goal:** Archive all plugin code (hooks, tools, plugin entry). Fix documentation drift. Remove @opencode-ai/plugin dependency. Dashboard backend with @opencode-ai/sdk is the sole entry point.

**Verified:** 2026-02-10T16:00:00Z
**Status:** gaps_found
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

**Plan 01 Must-Haves:**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `npm run typecheck` passes with zero errors | VERIFIED | Exit code 0, zero output |
| 2 | `npm test` passes -- all 10 surviving test files run clean | VERIFIED | Exit code 0, 466 assertions across 10 suites (65+43+54+44+52+56+112+40 + smoke + sqlite-skip) |
| 3 | `@opencode-ai/plugin` is NOT in package.json dependencies | VERIFIED | Confirmed: not in dependencies or devDependencies |
| 4 | src/hooks/ and src/tools/ directories no longer exist | VERIFIED | Both directories gone; src/index.ts gone; src/lib/sdk-client.ts gone |
| 5 | deploy.ts no longer writes plugin entries to opencode.json | VERIFIED | grep for pluginPath/cleanStalePluginPaths/resolvePluginPath returns empty |

**Plan 02 Must-Haves:**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 6 | AGENTS.md directory tree matches the actual filesystem | VERIFIED | 37 paths spot-checked against filesystem -- all exist |
| 7 | AGENTS.md test count matches actual passing tests (not 814) | VERIFIED | AGENTS.md says 466/10, actual npm test outputs 466 assertions across 10 suites |
| 8 | AGENTS.md 'What Works' table no longer claims tool-gate.ts has 147/147 assertions | VERIFIED | tool-gate.ts appears only in "Archived" table with "Previously 147/147" qualifier |
| 9 | AGENTS.md 'What Does NOT Work' section reflects SDK-direct architecture | VERIFIED | Lists "SDK-direct governance: Not implemented. Plugin hooks archived." |
| 10 | README.md describes the project without 'OpenCode plugin' framing | VERIFIED | grep for "OpenCode plugin" returns empty. Badges say "SDK-Direct" and "Standalone" |

**Score:** 10/10 plan must-haves verified

### ROADMAP Success Criteria

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| SC1 | src/index.ts, src/hooks/*, src/tools/* archived to src/_archived-plugin/ | VERIFIED | 10 .ts files in src/_archived-plugin/, 6 test files in tests/_archived-plugin/ |
| SC2 | AGENTS.md updated -- no references to plugin hooks, tool-gate, or deleted files | VERIFIED | Zero results for "hooks/tool-gate.ts", "src/hooks/", "src/tools/" in active context |
| SC3 | @opencode-ai/plugin removed from package.json -- only @opencode-ai/sdk remains | FAILED | Plugin removed, but @opencode-ai/sdk is NOT in package.json. See Gaps section. |
| SC4 | Test count and file references accurate in all docs | PARTIAL | AGENTS.md, README.md accurate. CLAUDE.md has 10+ stale references (see Gaps). |
| SC5 | npm run typecheck and npm test pass after removal | VERIFIED | Both exit 0 |

**ROADMAP Score:** 3.5/5 (SC3 failed, SC4 partial)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/_archived-plugin/` | All archived plugin source code | VERIFIED | 10 .ts files: index.ts, hooks/4, tools/4, lib/sdk-client.ts |
| `tests/_archived-plugin/` | All archived plugin test files | VERIFIED | 6 .ts files (7 planned, but tool-gate.test.ts was already deleted in Phase 9 R4) |
| `src/lib/index.ts` | Updated barrel -- no sdk-client exports | VERIFIED | sdk-client exports removed, archive comment present (lines 3-4) |
| `package.json` | Clean dependencies + updated test script | VERIFIED | Plugin removed, test script lists 10 files, description updated |
| `src/cli/deploy.ts` | Deploy without plugin path resolution | VERIFIED | No pluginPath/resolvePluginPath/cleanStalePluginPaths references |
| `AGENTS.md` | Ground truth -- accurate post-archival state | VERIFIED | v8.0.0, tree matches filesystem, 466/10 baseline, archived section |
| `README.md` | Updated project description | VERIFIED | No "OpenCode plugin" framing, SDK-Direct badge |
| `CHANGELOG.md` | 1A archival entry | VERIFIED | [Unreleased] Phase 1A entry with Changed/Archived/Fixed/Preserved sections |
| `tsconfig.json` | Exclude archived directories | VERIFIED | `src/_archived-plugin/**` in exclude array |

### Key Link Verification

**Plan 01 Key Links:**

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| src/lib/index.ts | src/lib/sdk-client.ts | REMOVED barrel export | VERIFIED | Lines 3-4: archive comment, no export statements for sdk-client |
| package.json scripts.test | tests/*.test.ts | Only surviving test files | VERIFIED | 10 files listed, no archived test names (compaction, message-transform, system, anchor-tool, init-tool, tasks, tool-gate) |
| src/cli/deploy.ts | opencode.json | REMOVED plugin writes | VERIFIED | No pluginPath, cleanStalePluginPaths, resolvePluginPath in file |

**Plan 02 Key Links:**

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| AGENTS.md directory tree | actual filesystem | manual verification | VERIFIED | 37 paths spot-checked, all exist |
| AGENTS.md test baseline | npm test output | assertion count | VERIFIED | 466 matches actual output |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| CHANGELOG.md | 63 | [Unreleased] section appears AFTER versioned release (wrong order per Keep a Changelog) | Info | Formatting only -- does not block goal |
| src/lib/persistence.ts | 20 | `import { z } from "zod"` -- zod not in package.json | Warning | Transitive dep via stale lockfile. Fragile but currently works. |

### Human Verification Required

### 1. Clean Install Test

**Test:** Delete node_modules, run `npm ci`, then `npm run typecheck`
**Expected:** All deps install correctly, typecheck passes
**Why human:** Cannot safely destroy node_modules during verification. The @opencode-ai/sdk gap means this might fail if lockfile is regenerated.

### Gaps Summary

**Gap 1 (BLOCKER): @opencode-ai/sdk not in package.json**

The ROADMAP success criterion SC3 explicitly states "only @opencode-ai/sdk remains" after removing the plugin. However, `@opencode-ai/sdk` was never a direct dependency -- it was a transitive dependency of `@opencode-ai/plugin`. When plugin was removed from `package.json`, the SDK entry was not added as a replacement.

Currently, the build works because:
- `package-lock.json` is stale -- it still lists `@opencode-ai/plugin` at the root level
- This causes `@opencode-ai/sdk` to be installed as a transitive dependency
- Two active source files import from `@opencode-ai/sdk`: `engine.ts` and `engine-types.ts`

This is a time bomb. If anyone runs `npm install` fresh without the lockfile, or if the lockfile is regenerated, the build breaks. Fix: add `@opencode-ai/sdk` to `package.json` dependencies and regenerate the lockfile.

**Gap 2 (WARNING): CLAUDE.md has 10+ stale references**

CLAUDE.md was not in Phase 1A Plan 02's explicit file list (AGENTS.md, README.md, CHANGELOG.md, package.json). However, CLAUDE.md is read by every Claude Code session and contains stale information:
- Line 15: "iDumb v2 is an OpenCode plugin"
- Line 35: References `tests/tool-gate.test.ts`
- Line 67: References `src/index.ts` as "Main plugin export"
- Line 106: Lists `tool-gate.ts` in source layout
- Lines 165-173: Plugin deployment description
- Line 227: Lists `@opencode-ai/plugin` as key dependency

Any agent reading CLAUDE.md will operate under false assumptions about the project architecture. This is arguable as out-of-scope for Phase 1A, but it undermines the "fix documentation drift" goal.

### Commits Verified

All 6 Phase 1A commits exist in git log:

| Commit | Message | Plan |
|--------|---------|------|
| 8506ffd | chore(1A-01): archive plugin source and test files | Plan 01 Task 1 |
| c9c0485 | feat(1A-01): remove @opencode-ai/plugin dependency and fix build chain | Plan 01 Task 2 |
| e02a974 | docs(1A-01): complete plugin archival plan -- SUMMARY + STATE update | Plan 01 wrap |
| 9039a25 | docs(1A-02): update AGENTS.md to reflect post-archival reality | Plan 02 Task 1 |
| ec543d3 | docs(1A-02): update README.md, CHANGELOG.md, and package.json | Plan 02 Task 2 |
| bb009ab | docs(1A-02): complete doc drift fix plan -- SUMMARY and STATE updated | Plan 02 wrap |

---

_Verified: 2026-02-10T16:00:00Z_
_Verifier: Claude (gsd-verifier)_
