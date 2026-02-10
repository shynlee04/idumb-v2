---
phase: 1A-plugin-demotion
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/_archived-plugin/index.ts
  - src/_archived-plugin/hooks/index.ts
  - src/_archived-plugin/hooks/compaction.ts
  - src/_archived-plugin/hooks/message-transform.ts
  - src/_archived-plugin/hooks/system.ts
  - src/_archived-plugin/tools/index.ts
  - src/_archived-plugin/tools/anchor.ts
  - src/_archived-plugin/tools/init.ts
  - src/_archived-plugin/tools/tasks.ts
  - src/_archived-plugin/lib/sdk-client.ts
  - tests/_archived-plugin/compaction.test.ts
  - tests/_archived-plugin/message-transform.test.ts
  - tests/_archived-plugin/system.test.ts
  - tests/_archived-plugin/anchor-tool.test.ts
  - tests/_archived-plugin/init-tool.test.ts
  - tests/_archived-plugin/tasks.test.ts
  - tests/_archived-plugin/tool-gate.test.ts
  - src/lib/index.ts
  - src/cli/deploy.ts
  - package.json
autonomous: true

must_haves:
  truths:
    - "`npm run typecheck` passes with zero errors — no broken imports from archived files"
    - "`npm test` passes — all 10 surviving test files run clean"
    - "`@opencode-ai/plugin` is NOT in package.json dependencies"
    - "src/hooks/ and src/tools/ directories no longer exist (moved to src/_archived-plugin/)"
    - "deploy.ts no longer writes plugin entries to opencode.json"
  artifacts:
    - path: "src/_archived-plugin/"
      provides: "All archived plugin source code (hooks, tools, sdk-client, entry)"
      contains: "index.ts, hooks/, tools/, lib/sdk-client.ts"
    - path: "tests/_archived-plugin/"
      provides: "All archived plugin test files"
      contains: "7 test files that import plugin-dependent code"
    - path: "src/lib/index.ts"
      provides: "Updated barrel — no sdk-client exports"
    - path: "package.json"
      provides: "Clean dependencies + updated test script (10 files)"
    - path: "src/cli/deploy.ts"
      provides: "Deploy without plugin path resolution"
  key_links:
    - from: "src/lib/index.ts"
      to: "src/lib/sdk-client.ts"
      via: "REMOVED — barrel no longer exports setClient/tryGetClient/SdkClient"
      pattern: "must NOT contain sdk-client"
    - from: "package.json scripts.test"
      to: "tests/*.test.ts"
      via: "Only surviving test files in script"
      pattern: "must NOT contain compaction|message-transform|system|anchor-tool|init-tool|tasks\\.test|tool-gate"
    - from: "src/cli/deploy.ts"
      to: "opencode.json"
      via: "REMOVED — no more config.plugin writes"
      pattern: "must NOT contain pluginPath|cleanStalePluginPaths|resolvePluginPath"
---

<objective>
Archive all plugin-dependent source code and fix the build chain so `tsc` and `npm test` pass cleanly without `@opencode-ai/plugin`.

Purpose: Phase 1A closes 5 audit gaps (ENG-01-DEPRECATED, SDK-CLIENT-UNUSED, DUAL-STATE, PLUGIN-UNVERIFIED, partial DOC-DRIFT) by physically removing dead plugin code from the active codebase. This unblocks Phase 1B (settings completion) which depends on a clean, plugin-free architecture.

Output: Archived plugin code in `_archived-plugin/` directories, clean build, clean test run.
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
</context>

<tasks>

<task type="auto">
  <name>Task 1: Archive plugin source files and test files</name>
  <files>
    src/_archived-plugin/index.ts
    src/_archived-plugin/hooks/index.ts
    src/_archived-plugin/hooks/compaction.ts
    src/_archived-plugin/hooks/message-transform.ts
    src/_archived-plugin/hooks/system.ts
    src/_archived-plugin/tools/index.ts
    src/_archived-plugin/tools/anchor.ts
    src/_archived-plugin/tools/init.ts
    src/_archived-plugin/tools/tasks.ts
    src/_archived-plugin/lib/sdk-client.ts
    tests/_archived-plugin/compaction.test.ts
    tests/_archived-plugin/message-transform.test.ts
    tests/_archived-plugin/system.test.ts
    tests/_archived-plugin/anchor-tool.test.ts
    tests/_archived-plugin/init-tool.test.ts
    tests/_archived-plugin/tasks.test.ts
    tests/_archived-plugin/tool-gate.test.ts
  </files>
  <action>
    Use `git mv` for all file moves to preserve history:

    **Source files → src/_archived-plugin/:**
    ```bash
    mkdir -p src/_archived-plugin/hooks src/_archived-plugin/tools src/_archived-plugin/lib
    git mv src/index.ts src/_archived-plugin/index.ts
    git mv src/hooks/compaction.ts src/_archived-plugin/hooks/compaction.ts
    git mv src/hooks/message-transform.ts src/_archived-plugin/hooks/message-transform.ts
    git mv src/hooks/system.ts src/_archived-plugin/hooks/system.ts
    git mv src/hooks/index.ts src/_archived-plugin/hooks/index.ts
    git mv src/tools/anchor.ts src/_archived-plugin/tools/anchor.ts
    git mv src/tools/init.ts src/_archived-plugin/tools/init.ts
    git mv src/tools/tasks.ts src/_archived-plugin/tools/tasks.ts
    git mv src/tools/index.ts src/_archived-plugin/tools/index.ts
    git mv src/lib/sdk-client.ts src/_archived-plugin/lib/sdk-client.ts
    ```

    After moving, remove the now-empty directories:
    ```bash
    rmdir src/hooks src/tools  # Should be empty after git mv
    ```

    **Test files → tests/_archived-plugin/:**
    ```bash
    mkdir -p tests/_archived-plugin
    git mv tests/compaction.test.ts tests/_archived-plugin/
    git mv tests/message-transform.test.ts tests/_archived-plugin/
    git mv tests/system.test.ts tests/_archived-plugin/
    git mv tests/anchor-tool.test.ts tests/_archived-plugin/
    git mv tests/init-tool.test.ts tests/_archived-plugin/
    git mv tests/tasks.test.ts tests/_archived-plugin/
    git mv tests/tool-gate.test.ts tests/_archived-plugin/
    ```

    NOTE: `tool-gate.test.ts` tests a source file (`hooks/tool-gate.ts`) that was already deleted in Phase 9 R4. The test itself was quietly dropped from the npm test script but the file was left behind. Archive it now.

    Do NOT delete any files — only move them. The `_archived-plugin/` convention preserves code for reference while excluding it from the active build (tsconfig.json exclude pattern should cover `_archived*`).
  </action>
  <verify>
    ```bash
    # Verify source directories are gone
    test ! -d src/hooks && echo "✓ src/hooks removed"
    test ! -d src/tools && echo "✓ src/tools removed"
    test ! -f src/index.ts && echo "✓ src/index.ts removed"
    test ! -f src/lib/sdk-client.ts && echo "✓ sdk-client.ts removed"

    # Verify archives exist
    ls src/_archived-plugin/index.ts src/_archived-plugin/hooks/ src/_archived-plugin/tools/ src/_archived-plugin/lib/
    ls tests/_archived-plugin/

    # Count: 10 source files + 7 test files = 17 files archived
    find src/_archived-plugin -name "*.ts" | wc -l   # Should be 10
    find tests/_archived-plugin -name "*.ts" | wc -l  # Should be 7
    ```
  </verify>
  <done>All 10 plugin source files and 7 plugin test files moved to `_archived-plugin/` directories via git mv. src/hooks/ and src/tools/ directories no longer exist. No files deleted.</done>
</task>

<task type="auto">
  <name>Task 2: Fix barrel exports, dependencies, deploy.ts, and test script</name>
  <files>
    src/lib/index.ts
    package.json
    src/cli/deploy.ts
  </files>
  <action>
    **1. Fix `src/lib/index.ts` barrel — remove sdk-client exports:**

    Remove these 2 lines:
    ```typescript
    export { setClient, tryGetClient } from "./sdk-client.js"
    export type { SdkClient } from "./sdk-client.js"
    ```
    All other exports remain (logging, framework-detector, scaffolder, persistence, state-reader, code-quality, storage-adapter).

    **2. Update `package.json` — remove plugin dependency + fix test script:**

    Remove `"@opencode-ai/plugin": "^1.1.52"` from `dependencies`.

    Replace the `test` script with ONLY the 10 surviving test files:
    ```
    "test": "tsx tests/init.test.ts && tsx tests/persistence.test.ts && tsx tests/task.test.ts && tsx tests/delegation.test.ts && tsx tests/planning-registry.test.ts && tsx tests/work-plan.test.ts && tsx tests/task-graph.test.ts && tsx tests/plan-state.test.ts && tsx tests/smoke-code-quality.ts && tsx tests/sqlite-adapter.test.ts"
    ```

    The removed test files (compaction, message-transform, system, anchor-tool, init-tool, tasks, tool-gate) all import from archived hooks/tools.

    **3. Strip plugin path logic from `src/cli/deploy.ts`:**

    Remove these constructs:
    - `pluginPath` and `pluginMethod` fields from the `DeployContext` interface/type
    - `PluginResolutionMethod` type if it exists
    - `resolvePluginPath()` function (~line 104)
    - `cleanStalePluginPaths()` function (~line 177)
    - The "Update opencode.json with plugin path" block (~lines 393-417) that writes `config.plugin`
    - Any references to `resolution.path`, `resolution.method` in the deploy context creation

    PRESERVE: All agent deployment, command deployment, module deployment, profile deployment, skill deployment, and directory scaffolding logic. The deploy function should still work — it just no longer wires a plugin into opencode.json.

    Also update the JSDoc comment at line 9 that mentions "track the latest plugin version" — remove plugin version tracking language.

    **4. Verify the build:**
    ```bash
    npx tsc --noEmit
    npm test
    ```
    Both must pass. If typecheck fails, there are additional imports to fix — trace and fix them.

    **5. Exclude archived directories from TypeScript compilation:**
    Check `tsconfig.json` for an `exclude` array. If `_archived*` or `**/archived*` is not already excluded, add:
    ```json
    "exclude": ["node_modules", "dist", "src/_archived-*", "tests/_archived-*"]
    ```
  </action>
  <verify>
    ```bash
    # TypeScript compiles clean
    npx tsc --noEmit && echo "✓ typecheck passes"

    # All surviving tests pass
    npm test && echo "✓ tests pass"

    # Plugin dependency gone
    ! grep -q "opencode-ai/plugin" package.json && echo "✓ plugin dep removed"

    # No broken imports in lib barrel
    ! grep -q "sdk-client" src/lib/index.ts && echo "✓ sdk-client exports removed"

    # deploy.ts has no plugin path logic
    ! grep -q "pluginPath\|cleanStalePluginPaths\|resolvePluginPath" src/cli/deploy.ts && echo "✓ plugin path logic removed"
    ```
  </verify>
  <done>`npm run typecheck` zero errors. `npm test` passes with 10 surviving test files (~471+ assertions). `@opencode-ai/plugin` removed from package.json. No broken barrel imports. deploy.ts deploys agents/commands/modules without plugin registration.</done>
</task>

</tasks>

<verification>
- `npm run typecheck` exits 0
- `npm test` exits 0 (all 10 test files pass)
- `grep -r "@opencode-ai/plugin" src/` returns empty (no plugin imports in active source)
- `src/hooks/` and `src/tools/` directories don't exist
- `src/_archived-plugin/` contains 10 .ts files
- `tests/_archived-plugin/` contains 7 .ts files
</verification>

<success_criteria>
The active codebase has zero dependency on `@opencode-ai/plugin`. All plugin code is preserved in `_archived-plugin/` directories for reference. Build and tests pass cleanly. This closes audit gaps: ENG-01-DEPRECATED, SDK-CLIENT-UNUSED, DUAL-STATE, PLUGIN-UNVERIFIED.
</success_criteria>

<output>
After completion, create `.planning/phases/1A-plugin-demotion/1A-01-SUMMARY.md`
</output>
