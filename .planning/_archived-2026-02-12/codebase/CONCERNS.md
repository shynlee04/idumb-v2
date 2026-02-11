# Codebase Concerns

**Analysis Date:** 2026-02-09

## Tech Debt

**Stale References to Deleted Tools (CRITICAL):**
- Issue: 40+ references to `govern_plan`, `govern_task`, `govern_delegate`, `govern_shell` scattered across hooks, schemas, and templates. These tools were replaced by lifecycle verbs (`tasks_start`, `tasks_done`, `tasks_check`, `tasks_add`, `tasks_fail`) in Phase 9, but references were not cleaned up in all locations.
- Files:
  - `src/hooks/system.ts` (lines 37, 45, 60, 63, 66, 68): NO_ACTIVE_TASK_MSG says "Use govern_task to start one"
  - `src/hooks/compaction.ts` (line 55): "create one with govern_plan + govern_task"
  - `src/hooks/message-transform.ts` (lines 27-31): EXEMPT_TOOLS set contains 4 deleted tool names (`govern_plan`, `govern_task`, `govern_delegate`, `govern_shell`)
  - `src/schemas/task.ts` (lines 161, 275, 286, 351, 384-386, 421, 459, 483, 485): govern_task/govern_plan references in display strings
  - `src/schemas/task-graph.ts` (lines 7, 186, 222, 350, 458, 478, 480): govern_plan/govern_task references
  - `src/schemas/delegation.ts` (line 134): allowedTools defaults include govern_task
  - `src/schemas/work-plan.ts` (lines 15-16, 252, 280, 287): govern_plan/govern_task/govern_shell references
  - `src/schemas/planning-registry.ts` (line 14): govern_plan reference
  - `src/schemas/plan-state.ts` (line 9): govern_plan reference
  - `src/schemas/coherent-knowledge.ts` (line 5): "tool-gate after hook" reference
  - `src/tools/init.ts` (lines 347, 349, 381, 383): govern_plan/govern_task in greeting strings
  - `src/dashboard/frontend/src/components/panels/TaskHierarchyPanel.tsx` (line 196): "govern_plan action=create"
- Impact: Agents receiving system/compaction context see instructions referencing tools that do not exist. This causes confusion and failed tool calls. The EXEMPT_TOOLS set in message-transform.ts will never match real tool outputs since those tools are gone.
- Fix approach: Global find-and-replace of `govern_task` with `tasks_start`/`tasks_done`/`tasks_check`; `govern_plan` with `tasks_start`/`tasks_add`; remove `govern_delegate` and `govern_shell` references entirely. Update EXEMPT_TOOLS to `["tasks_start", "tasks_done", "tasks_check", "tasks_add", "tasks_fail", "idumb_anchor", "idumb_init"]`.

**Missing tool-gate.ts (CRITICAL):**
- Issue: `src/hooks/tool-gate.ts` is referenced 25+ times across documentation and code comments but the file does not exist on disk. It was part of the pre-Phase-9 write-blocking enforcement architecture. CLAUDE.md describes it as a 556 LOC file with 6-layer gate sequence, AGENT_TOOL_RULES, and destructive shell blacklist. None of this enforcement currently exists.
- Files:
  - `src/templates.ts` (20+ references): agent templates mention "tool-gate hook" as the mechanism that blocks writes without active task
  - `src/lib/persistence.ts` (lines 4, 15, 447): comments reference "tool-gate.ts"
  - `src/schemas/task.ts` (line 14): lists "tool-gate (governance)" as consumer
  - `src/schemas/work-plan.ts` (lines 16, 224): references tool-gate hook
  - `src/schemas/task-graph.ts` (line 7): lists "tool-gate hook" as consumer
  - `src/lib/sqlite-adapter.ts` (line 5): "critical for tool-gate hot path"
  - `src/cli/deploy.ts` (line 346): "tool-gate auto-inherits"
- Impact: **No write-gate enforcement exists.** The original design blocked writes without an active task. Currently, the lifecycle verbs are purely opt-in tools with no blocking. Agent templates promise tool-gate enforcement that does not exist.
- Fix approach: Either (a) implement a new tool.execute.before hook that enforces "active task required for writes" or (b) update all templates and documentation to reflect the opt-in model. Decision depends on Phase 9 R4 completion plan.

**CLAUDE.md / MEMORY.md Documentation Drift:**
- Issue: CLAUDE.md describes `hooks/tool-gate.ts` (556 LOC, 6-layer gate), `AGENT_TOOL_RULES`, `setActiveTask() bridge`, destructive blacklist of 13 patterns, and `GOVERNANCE BLOCK:` sentinel strings. None of these exist in the current codebase. The CLAUDE.md also lists 11 tools, but only 7 are registered. The MEMORY.md references R4 (Hook Migration + Deletion) as pending, but the current state shows tool-gate was already removed without the planned migration.
- Files:
  - `/Users/apple/Documents/coding-projects/idumb/v2/CLAUDE.md`: "Source Layout" section lists tool-gate.ts; "Architecture" mentions 6-layer gate
  - `/Users/apple/.claude/projects/-Users-apple-Documents-coding-projects-idumb-v2/memory/MEMORY.md`: describes tool-gate as existing infrastructure
- Impact: Any agent (including future Claude instances) reading CLAUDE.md will have a fundamentally wrong understanding of the architecture. They will look for files that don't exist and assume enforcement mechanisms that aren't present.
- Fix approach: Rewrite CLAUDE.md architecture section to reflect current state: 7 tools, 0 write-gate enforcement, opt-in lifecycle verbs.

**`templates.ts` at 1466 LOC:**
- Issue: Single file contains all agent templates, module templates, skill templates, command templates. Far exceeds the 300-500 LOC target.
- Files: `src/templates.ts` (1466 LOC)
- Impact: Hard to modify individual agent templates. Every template change requires navigating a monolithic file. Risk of editing the wrong template function.
- Fix approach: Split into `src/templates/coordinator.ts`, `src/templates/investigator.ts`, `src/templates/executor.ts`, `src/templates/modules.ts`, `src/templates/skills.ts` with a barrel `src/templates/index.ts`.

**`persistence.ts` at 1082 LOC — God File:**
- Issue: StateManager singleton manages 8 separate data stores (state, tasks, taskGraph, delegations, planState, brainStore, codeMap, projectMap), each with its own debounced save timer, disk read, and disk write. The `init()` method alone is 280+ lines of sequential try/catch blocks.
- Files: `src/persistence.ts` (1082 LOC)
- Impact: Adding any new persistent store requires modifying 5+ methods. The 8 debounce timers are a maintenance burden. The SQLite branching (`if (this.useSqlite && this.sqliteAdapter)`) is duplicated in 15+ methods.
- Fix approach: Extract each store into a separate `PersistentStore<T>` generic class that handles its own load/save/debounce. StateManager becomes a facade that composes N stores.

**`server.ts` (dashboard backend) at 793 LOC:**
- Issue: Monolithic Express server with route handlers, WebSocket broadcasting, file watching, SQLite initialization, and port retry logic in a single file.
- Files: `src/dashboard/backend/server.ts` (793 LOC)
- Impact: Difficult to test individual routes. No route-level middleware separation.
- Fix approach: Extract route handlers into `routes/` directory; separate WebSocket into `ws.ts`; extract file watcher into `watcher.ts`.

**Archived Dead Code (845 LOC):**
- Issue: Two files archived but still present in the source tree.
- Files:
  - `src/lib/_archived-2026-02-08/entity-resolver.ts` (545 LOC)
  - `src/lib/_archived-2026-02-08/chain-validator.ts` (300 LOC)
- Impact: Inflates codebase size. `chain-validator.ts` imports from `entity-resolver.ts` so they form a dead dependency chain. Both use `readFileSync`/`statSync`/`existsSync` from `fs` which would be a concern if accidentally re-imported.
- Fix approach: Delete the `_archived-2026-02-08/` directory entirely if no Phase 10 plan references them. If needed, they can be recovered from git history.

**Duplicate Save Method Boilerplate:**
- Issue: `persistence.ts` contains 8 nearly identical `schedule*Save()` methods (lines 715-826) and 8 nearly identical `save*ToDisk()` methods (lines 828-988). Each follows the exact same pattern: check degraded flag, clear timer, set timeout, call save method.
- Files: `src/lib/persistence.ts` (lines 715-988)
- Impact: 270 lines of pure boilerplate. Adding a new store requires copy-pasting two methods.
- Fix approach: Generic `scheduleSave(timerKey, saveFn)` helper that eliminates all 8 duplicates.

## Known Bugs

**EXEMPT_TOOLS Set References Non-Existent Tools:**
- Symptoms: The message-transform hook's context pruning will never exempt governance tool outputs because the EXEMPT_TOOLS set contains old tool names (`govern_plan`, `govern_task`, `govern_delegate`, `govern_shell`) that no longer exist.
- Files: `src/hooks/message-transform.ts` (lines 26-33)
- Trigger: When message transform prunes old tool outputs, governance tool results (from `tasks_start`, `tasks_done`, etc.) will be truncated instead of preserved.
- Workaround: None. The lifecycle verb tools produce 1-line outputs so truncation has minimal effect, but the intent to exempt them is not fulfilled.

**Dashboard `process.cwd()` Fallback (16 Occurrences):**
- Symptoms: Every API route in the dashboard server uses `req.header("X-Project-Dir") || process.cwd()` as the project directory. If the `X-Project-Dir` header is missing, the server reads state from wherever the process was launched, not from the intended project.
- Files: `src/dashboard/backend/server.ts` (lines 156, 187, 196, 207, 231, 241, 251, 259, 289, 350, 447, 467, 502, 535)
- Trigger: Any HTTP request without the `X-Project-Dir` header.
- Workaround: The `configuredProjectDir` variable is set during `startServer()` but is not used by route handlers. Use `configuredProjectDir` instead of `process.cwd()` as fallback.

**Dashboard Frontend Path Hardcoded to Plugin Source:**
- Symptoms: The dashboard server looks for pre-built frontend assets at `join(config.projectDir, "src/dashboard/frontend/dist")` which is relative to the user's project directory, not the plugin's install location. This only works when running from the iDumb v2 source tree.
- Files: `src/dashboard/backend/server.ts` (line 667)
- Trigger: Running the dashboard on any project that is not the iDumb v2 source itself.
- Workaround: None. The dashboard is not integrated into the main CLI workflow.

## Security Considerations

**Dashboard CORS Set to Allow All Origins:**
- Risk: `app.use(cors())` with no configuration allows any origin to make API requests to the dashboard server.
- Files: `src/dashboard/backend/server.ts` (line 70)
- Current mitigation: The dashboard runs locally and is not exposed to the internet by default.
- Recommendations: Restrict CORS to `http://localhost:*` origins only. Consider adding an API key or session token.

**Dashboard File Write Endpoint (PUT /api/artifacts/content):**
- Risk: The artifact write endpoint allows editing files within the project directory. While it validates path traversal and file extension, it does not require authentication.
- Files: `src/dashboard/backend/server.ts` (lines 287-340)
- Current mitigation: Path sanitization via `sanitizePath()` prevents directory traversal. Extension whitelist limits to `.md`, `.json`, `.yaml`, `.yml`, `.xml`.
- Recommendations: Add authentication. Consider restricting to `.idumb/` and `planning/` directories only.

**No Input Sanitization on Tool Arguments:**
- Risk: Tool arguments (e.g., `tasks_start` objective, `tasks_add` title) are stored directly in JSON state files without sanitization. While not exploitable in the current architecture, injecting control characters or very long strings could corrupt state files.
- Files: `src/tools/tasks.ts` (all tool execute functions)
- Current mitigation: None. Zod schemas validate structure but not content length or character encoding.
- Recommendations: Add max-length validation on tool string arguments (e.g., 500 chars for objective, 200 for title). Reject control characters.

## Performance Bottlenecks

**8 Independent Debounce Timers in StateManager:**
- Problem: Each store (state, tasks, taskGraph, delegations, planState, brain, codeMap, projectMap) has its own 500ms debounce timer. In rapid-mutation scenarios (e.g., `tasks_add` called 10 times in parallel), this can trigger 10+ disk writes within a short window.
- Files: `src/lib/persistence.ts` (lines 197-204 timer declarations, 715-826 schedule methods)
- Cause: Each store saves independently. A single user action (like adding tasks) may touch multiple stores.
- Improvement path: Batch all pending saves into a single debounced "flush" that writes all dirty stores in one pass.

**Synchronous File-Based Logging:**
- Problem: `createLogger()` uses `writeFileSync` for every log line. In hooks that fire frequently (chat.params fires every turn), synchronous file I/O blocks the event loop.
- Files: `src/lib/logging.ts` (line 67)
- Cause: Design choice for simplicity and guaranteed write ordering.
- Improvement path: Buffer log lines in memory and flush periodically (every 100 lines or 1 second), or switch to async `appendFile`.

**StateManager.init() Sequential File Loading:**
- Problem: The `init()` method loads 8 JSON files sequentially (state, tasks, delegations, taskGraph, planState, brain, codeMap, projectMap). Each has its own try/catch. Total is 280+ lines.
- Files: `src/lib/persistence.ts` (lines 233-444)
- Cause: Sequential `await readFile()` calls. No parallelization.
- Improvement path: Use `Promise.allSettled()` to load all 8 files in parallel.

## Fragile Areas

**Singleton StateManager — Global Mutable State:**
- Files: `src/lib/persistence.ts` (line 1079: `export const stateManager = new StateManager()`)
- Why fragile: Single global instance shared between all hooks and tools. Any hook or tool can mutate any store. No locking or concurrency control. If `saveTaskGraph()` is called during a debounced save of the same graph, data races are possible.
- Safe modification: Always read-modify-write through StateManager methods. Never cache graph references across async boundaries.
- Test coverage: `tests/persistence.test.ts` (619 LOC) covers basic CRUD but does not test concurrent access or debounce timing.

**Hook-to-State Coupling:**
- Files:
  - `src/hooks/system.ts`: reads from stateManager, compaction anchors, task graph, plan state
  - `src/hooks/compaction.ts`: reads from stateManager, delegation store
  - `src/index.ts` (chat.params): writes to stateManager (agent capture, task auto-assign, graph save)
- Why fragile: Three hooks read/write the same StateManager during a single chat turn. The `chat.params` hook mutates the task graph and the session state. If `system.transform` fires before `chat.params`, it will see stale agent identity.
- Safe modification: Document hook firing order. Ensure `chat.params` fires before `system.transform` in the OpenCode lifecycle.
- Test coverage: Each hook is tested in isolation. No integration test validates the combined hook execution order.

**TaskGraph Mutation Without Cloning:**
- Files: `src/tools/tasks.ts` (all 5 tools)
- Why fragile: `stateManager.getTaskGraph()` returns a reference to the live in-memory graph. Tools mutate it directly (e.g., `wp.tasks.push(node)`, `node.status = "completed"`) and then call `stateManager.saveTaskGraph(graph)`. If a tool throws between mutation and save, the in-memory state is corrupted but not persisted, causing inconsistency.
- Safe modification: Clone the graph before mutation, or use a transaction pattern.
- Test coverage: `tests/tasks.test.ts` (344 LOC) tests happy paths but does not test error-during-mutation scenarios.

## Scaling Limits

**JSON File-Based Persistence:**
- Current capacity: Works for ~100 work plans with ~10 tasks each (~1000 TaskNodes).
- Limit: JSON files grow linearly. At ~10,000 TaskNodes, `readFile` + `JSON.parse` on every plugin init becomes noticeable (>100ms). The `JSON.stringify(state, null, 2)` on every debounced save creates O(n) serialization cost.
- Scaling path: SQLite adapter exists (`src/lib/sqlite-adapter.ts`, 323 LOC) but is feature-flagged and not the default. Activate via `{ sqlite: true }` in `stateManager.init()`.

**Unbounded Anchor Accumulation:**
- Current capacity: Anchors per session are stored in memory with no eviction.
- Limit: A long session with many anchor additions could accumulate hundreds of anchors. `selectAnchors()` handles budget-capped selection for compaction injection, but the in-memory list grows without bound.
- Scaling path: Add max-anchor-per-session limit (e.g., 50) with LRU eviction of low-priority anchors.

## Dependencies at Risk

**`better-sqlite3` — Native Module Fragility:**
- Risk: Requires `npm rebuild` after Node version changes. Native compilation can fail on some platforms. Currently lazy-imported to avoid crashing the plugin on import failure.
- Impact: SQLite adapter becomes unavailable. Dashboard server falls back to JSON reads with a warning.
- Migration plan: Already mitigated by lazy import + JSON fallback. Consider `sql.js` (WASM-based) as a zero-native-dependency alternative if SQLite becomes the default backend.

**`express` + `ws` + `cors` + `chokidar` + `open` — Dashboard Dependencies in Production:**
- Risk: These are listed as `dependencies` (not `devDependencies`) but are only used by the dashboard, which is not integrated into the main plugin workflow. They inflate the npm package size.
- Impact: Users who `npm install idumb-v2` get 5 unnecessary production dependencies.
- Migration plan: Move to `devDependencies` or extract dashboard into a separate `@idumb/dashboard` package.

## Missing Critical Features

**No Write-Gate Enforcement (Post Phase 9):**
- Problem: The original `tool-gate.ts` provided write-blocking without an active task. After Phase 9 removed it (as part of the "opt-in, not enforcement" redesign), there is no mechanism to prevent agents from writing files without first calling `tasks_start`. The agent templates still promise tool-gate enforcement.
- Blocks: The governance guarantee that "every write is tracked" is aspirational, not enforced.

**No Graceful Shutdown Hook:**
- Problem: StateManager's debounced saves use `setTimeout`. If the plugin process exits (OpenCode closes, crash), pending debounced saves are lost. The `forceSave()` method exists but no shutdown hook calls it.
- Blocks: State written in the last 500ms before exit is lost.

**No Session Cleanup / GC:**
- Problem: Sessions accumulate in the state file indefinitely. Old sessions from weeks ago persist in `state.json` with their anchors.
- Blocks: State files grow over time with dead session data.

## Test Coverage Gaps

**No Integration Tests for Hook Execution Order:**
- What's not tested: The combined behavior of `chat.params` + `system.transform` + `compaction` hooks firing in sequence on a single chat turn. Each hook is tested in isolation but never together.
- Files: `tests/system.test.ts`, `tests/compaction.test.ts`, `tests/message-transform.test.ts`
- Risk: Hook ordering assumptions (e.g., agent captured before system prompt injected) are untested. A change in OpenCode's hook firing order could silently break governance context.
- Priority: High

**No Tests for Lifecycle Verb Edge Cases:**
- What's not tested: Concurrent `tasks_add` calls (the documented "call N times in parallel" pattern). Race conditions when two lifecycle verbs mutate the same TaskGraph simultaneously.
- Files: `tests/tasks.test.ts` (344 LOC) — tests sequential operations only
- Risk: Parallel `tasks_add` calls could produce duplicate TaskNodes or corrupt the graph.
- Priority: High

**No Tests for Dashboard Server:**
- What's not tested: All 15+ API endpoints in the dashboard server. Path sanitization logic. WebSocket broadcasting. Port retry logic.
- Files: `src/dashboard/backend/server.ts` (793 LOC — zero test coverage)
- Risk: Path traversal prevention, file write validation, and CORS behavior are untested.
- Priority: Medium (dashboard is not integrated into main workflow)

**No Live OpenCode Hook Verification:**
- What's not tested: Whether `experimental.chat.system.transform`, `experimental.chat.messages.transform`, and `experimental.session.compacting` actually fire in live OpenCode. All three are tested via mocked inputs only.
- Files: `src/hooks/system.ts`, `src/hooks/message-transform.ts`, `src/hooks/compaction.ts`
- Risk: These hooks may never fire in production. The entire context injection and pruning pipeline could be dead code.
- Priority: High

**No Tests for SQLite Adapter in Degraded Mode:**
- What's not tested: What happens when SQLite init fails and the system falls back to JSON. The `isDegraded()` path through StateManager.
- Files: `src/lib/sqlite-adapter.ts`, `src/lib/persistence.ts`
- Risk: Degraded mode could silently lose data or leave the StateManager in an inconsistent state.
- Priority: Medium

---

*Concerns audit: 2026-02-09*
