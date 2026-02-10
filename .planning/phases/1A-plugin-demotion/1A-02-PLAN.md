---
phase: 1A-plugin-demotion
plan: 02
type: execute
wave: 2
depends_on: ["1A-01"]
files_modified:
  - AGENTS.md
  - README.md
  - CHANGELOG.md
autonomous: true

must_haves:
  truths:
    - "AGENTS.md directory tree matches the actual filesystem — no references to deleted files"
    - "AGENTS.md test count matches actual passing tests (not 814)"
    - "AGENTS.md 'What Works' table no longer claims tool-gate.ts has 147/147 assertions"
    - "AGENTS.md 'What Does NOT Work' section reflects SDK-direct architecture, not plugin concerns"
    - "README.md describes the project without 'OpenCode plugin' framing"
  artifacts:
    - path: "AGENTS.md"
      provides: "Ground truth documentation — accurate post-archival state"
      contains: "_archived-plugin in directory tree, updated test counts, removed tool-gate references"
    - path: "README.md"
      provides: "Updated project description"
    - path: "CHANGELOG.md"
      provides: "1A archival entry"
  key_links:
    - from: "AGENTS.md directory tree"
      to: "actual filesystem"
      via: "manual verification"
      pattern: "tree must match ls -R output"
    - from: "AGENTS.md test baseline"
      to: "npm test output"
      via: "assertion count"
      pattern: "count must match actual npm test output"
---

<objective>
Fix documentation drift so AGENTS.md, README.md, and CHANGELOG.md reflect the post-archival codebase reality.

Purpose: The DOC-DRIFT audit gap identified that AGENTS.md claims `tool-gate.ts` exists with 147/147 assertions (file was deleted in Phase 9 R4), reports 814 total assertions (inflated — plugin tests archived), and describes iDumb as "an OpenCode plugin" (no longer accurate). Every future agent session inherits these lies as ground truth. Fixing this prevents cascading misinformation.

Output: Accurate AGENTS.md, updated README.md, CHANGELOG.md entry for Phase 1A.
</objective>

<execution_context>
@/Users/apple/.config/opencode/get-shit-done/workflows/execute-plan.md
@/Users/apple/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/v1-MILESTONE-AUDIT.md
@.planning/phases/1A-plugin-demotion/1A-01-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update AGENTS.md to reflect post-archival reality</name>
  <files>AGENTS.md</files>
  <action>
    Run `npm test 2>&1 | tail -5` and `find src -name "*.ts" | grep -v _archived | wc -l` to get actual counts before editing.

    Run `ls -R src/ | grep -v _archived` to get the actual directory structure.

    **Edits to make (targeted, not full rewrite):**

    1. **Status line (top):** Update to reflect Phase 1A complete. Remove "7 tools: 5 lifecycle verbs + anchor + init" — tools are archived. Add "Plugin archived, SDK-direct architecture."

    2. **"What iDumb Is" section:** Replace "An OpenCode plugin + agent system" framing. iDumb is now a "Web UI product + agent system that wraps OpenCode as its engine." Remove Level 1 (Plugin) description. Renumber remaining levels. Keep Levels 2-5 descriptions but note tools/hooks are archived.

    3. **Directory structure:** Update the tree to show:
       - `src/_archived-plugin/` with contents (hooks/, tools/, lib/sdk-client.ts, index.ts)
       - Remove `src/hooks/` and `src/tools/` from the active tree
       - Remove `src/lib/sdk-client.ts` from the active tree
       - `tests/_archived-plugin/` with 7 test files listed
       - Verify every other file in the tree ACTUALLY EXISTS (use `ls` to confirm)
       - Specifically: `tool-gate.ts` must NOT appear under `src/hooks/` (it was already deleted before Phase 1A, AGENTS.md was lying)

    4. **"What Works" tables:**
       - Move all "Level 1: Plugin Hooks & Tools" entries to a new "Archived (Plugin)" section or remove entirely
       - Update test assertion counts to match surviving tests only
       - Keep Level 2-5 tables but add note that tools/hooks backing them are archived

    5. **"Custom Tools" section:** Note all 7 tools are archived. They exist as schemas/concepts but the `@opencode-ai/plugin/tool` implementations are in `_archived-plugin/`.

    6. **"Plugin Hooks" section:** Note all hooks are archived. Replace with "Archived — see src/_archived-plugin/".

    7. **Test baseline:** Update from "814 assertions across 17 test files" to actual count. Run `npm test` and count. Should be ~10 test files with ~471+ core assertions. Use the ACTUAL output, not estimates.

    8. **Source LOC:** Update from ~13,500 to actual. Run `find src -name "*.ts" -not -path "*_archived*" | xargs wc -l | tail -1` to get real count.

    9. **"Known LOC Violations" table:** Remove `tool-gate.ts` (doesn't exist). Keep remaining violations that still exist in active code.

    10. **"What Does NOT Work" section:** Remove plugin-centric items (live hook verification, chat hooks, framework interception). Replace with current reality: "Plugin archived — governance will be reimplemented via SDK-direct calls from dashboard backend."

    11. **Roadmap section:** Add Phase 1A completion entry. Note the architecture pivot.

    Do NOT change anything about schemas/, lib/, cli/, or dashboard/ — those sections should remain accurate.
  </action>
  <verify>
    ```bash
    # Every file in the directory tree exists
    # (executor should spot-check 10+ paths from the tree against filesystem)

    # No references to non-existent files
    ! grep -q "hooks/tool-gate.ts" AGENTS.md && echo "✓ tool-gate.ts reference removed"

    # Test count matches reality
    npm test 2>&1 | tail -3
    # Compare assertion count in AGENTS.md to npm test output

    # No "814 assertions" claim
    ! grep -q "814" AGENTS.md && echo "✓ old assertion count removed"
    ```
  </verify>
  <done>AGENTS.md directory tree matches actual filesystem. Test baseline matches actual `npm test` output. No references to deleted files (tool-gate.ts, src/hooks/, src/tools/). Architecture description reflects SDK-direct pivot. DOC-DRIFT audit gap closed.</done>
</task>

<task type="auto">
  <name>Task 2: Update README.md and CHANGELOG.md</name>
  <files>README.md, CHANGELOG.md</files>
  <action>
    **README.md updates:**

    1. Update the project description: No longer "an OpenCode plugin that makes AI agents think before they write." Now: "An AI knowledge work platform built on OpenCode — governed agent workflows, smart planning, and research synthesis through a Web UI."

    2. Update the `description` field in `package.json` to match — current: "Intelligent Delegation Using Managed Boundaries — an OpenCode plugin that makes AI agents think before they write". New: "Intelligent Delegation Using Managed Boundaries — an AI knowledge work platform built on OpenCode"

    3. Remove or update any installation instructions that reference plugin setup. The entry point is now `npx idumb-v2 init` which deploys agents (no plugin wiring needed).

    4. If README has a features list, update to reflect what actually works vs what's planned.

    **CHANGELOG.md updates:**

    Add entry for Phase 1A at the top:

    ```markdown
    ## [Unreleased] — Phase 1A: Plugin Demotion + Architecture Cleanup

    ### Changed
    - Architecture pivot: OpenCode plugin demoted to SDK-direct. All governance moves to dashboard backend.
    - `@opencode-ai/plugin` removed from dependencies
    - `deploy.ts` no longer writes plugin entries to `opencode.json`

    ### Archived
    - `src/hooks/` → `src/_archived-plugin/hooks/` (compaction, message-transform, system)
    - `src/tools/` → `src/_archived-plugin/tools/` (anchor, init, tasks)
    - `src/index.ts` → `src/_archived-plugin/index.ts` (plugin entry point)
    - `src/lib/sdk-client.ts` → `src/_archived-plugin/lib/sdk-client.ts`
    - 7 plugin-dependent test files → `tests/_archived-plugin/`

    ### Fixed
    - DOC-DRIFT: AGENTS.md updated to match actual filesystem and test counts
    - Removed references to deleted `tool-gate.ts` (was deleted in Phase 9 R4, docs never updated)

    ### Preserved
    - All schemas (task-graph, work-plan, delegation, planning-registry, etc.) — no plugin dependency
    - CLI (`npx idumb-v2 init`) — still deploys agents, commands, modules
    - Dashboard frontend + backend — no plugin dependency
    - 10 test files with ~471+ core assertions still passing
    ```
  </action>
  <verify>
    ```bash
    # README doesn't say "plugin" in description
    head -5 README.md

    # package.json description updated
    grep '"description"' package.json

    # CHANGELOG has 1A entry
    grep -c "Phase 1A" CHANGELOG.md  # Should be >= 1

    # Build still passes after package.json description change
    npm run typecheck
    ```
  </verify>
  <done>README.md describes the project accurately without plugin framing. package.json description updated. CHANGELOG.md has a complete Phase 1A entry documenting what was archived, changed, and fixed.</done>
</task>

</tasks>

<verification>
- AGENTS.md directory tree: spot-check 15+ paths against `ls` — all exist
- AGENTS.md: zero mentions of `hooks/tool-gate.ts` as an active file
- AGENTS.md: test baseline matches `npm test` output
- README.md: no "OpenCode plugin" description
- CHANGELOG.md: Phase 1A entry exists with archived/changed/fixed sections
- `npm run typecheck` still passes (package.json description is metadata-only, but verify)
</verification>

<success_criteria>
All project documentation accurately reflects the post-archival codebase. A fresh agent reading AGENTS.md gets the true state of the project — not inflated assertion counts, not phantom files, not a plugin-first architecture that was deprecated. DOC-DRIFT audit gap fully closed.
</success_criteria>

<output>
After completion, create `.planning/phases/1A-plugin-demotion/1A-02-SUMMARY.md`
</output>
