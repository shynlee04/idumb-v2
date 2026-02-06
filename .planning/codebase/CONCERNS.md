# Codebase Concerns

**Analysis Date:** 2026-02-06

## Tech Debt

**Subagent Hook Bypass - CRITICAL BLOCKER:**
- Issue: OpenCode `tool.execute.before` hooks fire for primary agent tool calls but NOT for subagent tool calls spawned via `task` tool
- Files: `src/hooks/tool-gate.ts`
- Impact: Any governance enforced via tool hooks is completely bypassed when agents delegate to subagents. T2 (Delegation Tracking) is partially invalidated.
- Fix approach: Use `chat.params` hook for earlier role detection; enforce governance via agent profile `.md` files instructing subagents to call `idumb_status` before executing. Monitor [OpenCode #5894](https://github.com/sst/opencode/issues/5894) for upstream fix.

**Delegation Tracking Not Implemented:**
- Issue: `delegationChain` field exists in `SessionTracker` but is NEVER populated. No max depth enforcement (spec requires 3 levels). No circular delegation detection.
- Files: `src/hooks/tool-gate.ts` (lines 31-38, 56-57)
- Impact: Coordinators can delegate infinitely, circular delegation is possible, delegation hierarchy not enforced
- Fix approach: Implement delegation tracking in `tool-gate.ts` when `task` tool is intercepted; check max depth and circular patterns

**In-Memory Session Trackers Not Persisted:**
- Issue: `sessionTrackers` Map in `tool-gate.ts` is in-memory only. `lib/persistence.ts` has `saveSession()` and `loadSession()` but these are NOT synchronized with the in-memory trackers.
- Files: `src/hooks/tool-gate.ts` (line 43), `src/lib/persistence.ts` (lines 353-369)
- Impact: If plugin restarts mid-session, all tracking state is lost - roles reset, permission history lost
- Fix approach: Call `saveSession()` after each permission check; load session on `getSessionTracker()` if not in memory

**Compaction Custom Prompt Not Implemented:**
- Issue: `output.prompt` is never set in compaction hook. T3.P3.2 fails.
- Files: `src/hooks/compaction.ts` (line 30)
- Impact: Cannot replace compaction prompt with governance-aware version
- Fix approach: Set `output.prompt` to governance-prefixed prompt in compaction hook

**No text.complete Hook:**
- Issue: `experimental.text.complete` hook mentioned in spec but not implemented
- Files: `src/plugin.ts` (hook missing)
- Impact: Cannot append governance reminders to LLM completion. T3.P3.3 fails.
- Fix approach: Add `experimental.text.complete` hook when SDK supports it

## Known Bugs

**Agent Detection Race Condition:**
- Symptoms: First tool call may execute before `chat.message` captures agent name, causing role to default to `meta` (allow-all)
- Files: `src/hooks/tool-gate.ts` (lines 140-142), `src/plugin.ts` (lines 110-116)
- Trigger: Agent uses tool on first turn before chat.message fires
- Workaround: Use `chat.params` hook which fires BEFORE `tool.execute.before` (suggested in GAP-ANALYSIS.md)

**Greedy Pattern Matching for Agent Roles:**
- Symptoms: `name.includes("high")` could match unintended agents like "highlights-agent"
- Files: `src/schemas/permission.ts` (lines 114-120)
- Trigger: Agent names containing substring matches (e.g., "high", "mid", "meta")
- Workaround: Create explicit mapping table for OpenCode innate agents instead of `includes()` matching

## Security Considerations

**Unknown Tool Category Defaults to Allow:**
- Risk: Any new/unknown tool not in `TOOL_CATEGORIES` map is allowed by default
- Files: `src/schemas/permission.ts` (lines 158-164)
- Current mitigation: Warning logged when unknown category encountered
- Recommendations: Consider defaulting to deny for unknown categories; require explicit whitelist for new tools

**Meta Role Has Full Access:**
- Risk: Unknown agents default to `meta` role which has ALL permissions
- Files: `src/schemas/permission.ts` (lines 122-124, 96)
- Current mitigation: Intentional design to "never break innate agents"
- Recommendations: Add explicit OpenCode agent mapping; only default to `meta` for framework development agents

**State Files Have No Access Control:**
- Risk: `.idumb/brain/state.json` and config are world-readable JSON files
- Files: `src/lib/persistence.ts` (PATHS object lines 37-63)
- Current mitigation: None - files written with default permissions
- Recommendations: Consider restricting file permissions; add integrity checksums

**No Input Sanitization for Anchor Content:**
- Risk: Anchor content (up to 2000 chars) is user-provided and injected into LLM context
- Files: `src/tools/anchor.ts`, `src/hooks/compaction.ts` (lines 76-80)
- Current mitigation: Length limit only
- Recommendations: Sanitize for injection patterns; consider content hash validation

## Performance Bottlenecks

**Full Anchor Load on Every Compaction:**
- Problem: `loadAllAnchors()` reads ALL anchor files from disk on each compaction
- Files: `src/hooks/compaction.ts` (line 40), `src/lib/persistence.ts` (lines 287-301)
- Cause: No in-memory caching; directory read + file parse for each anchor
- Improvement path: Add anchor cache with TTL; only re-read when anchors directory mtime changes

**Scanner Reads Entire Package.json:**
- Problem: Full package.json parse on every scan
- Files: `src/engines/scanner.ts` (line 222)
- Cause: No partial parsing; loads entire file to extract dependencies
- Improvement path: Consider caching scan results; implement incremental scan

## Fragile Areas

**Role Detection via Pattern Matching:**
- Files: `src/schemas/permission.ts` (lines 104-124)
- Why fragile: Relies on naming conventions; any deviation breaks permission enforcement
- Safe modification: Add new patterns to the if/else chain; test each addition
- Test coverage: No unit tests for role detection edge cases

**Tool Category Normalization:**
- Files: `src/schemas/permission.ts` (lines 129-146)
- Why fragile: Uses includes() for partial matching which can false-positive
- Safe modification: Use exact matching first, then fall back to normalized lookup
- Test coverage: Basic categories tested; edge cases untested

**Compaction Context Size Limit:**
- Files: `src/hooks/compaction.ts` (lines 87-94)
- Why fragile: Hard truncation at 2000 chars may cut anchors mid-sentence
- Safe modification: Truncate at anchor boundary, not character boundary
- Test coverage: No tests for truncation behavior

## Scaling Limits

**Anchor Count:**
- Current capacity: Works with <50 anchors
- Limit: `loadAllAnchors()` reads all files; >100 anchors may cause latency
- Scaling path: Implement anchor index; prune stale anchors automatically

**Session History:**
- Current capacity: No limit on history entries in state.json
- Limit: State file grows unbounded
- Scaling path: Implement history rotation; archive old entries

**Backup Accumulation:**
- Current capacity: Unlimited backups created on each state write
- Limit: Disk space; no garbage collection
- Scaling path: Add `cleanupOldBackups()` function; retain last N backups

## Dependencies at Risk

**Zod Version Compatibility:**
- Risk: Local `types/plugin.ts` exists because SDK ships zod v4 but code uses v3 patterns
- Files: `src/types/plugin.ts`
- Impact: Type helper may break if SDK updates zod version
- Migration plan: Align with SDK zod version when stable

**OpenCode SDK Experimental Hooks:**
- Risk: Using `experimental.session.compacting` and `experimental.chat.messages.transform` hooks
- Files: `src/plugin.ts` (lines 180, 195)
- Impact: Experimental APIs may change without notice
- Migration plan: Wrap in try/catch with graceful degradation; monitor SDK changelog

## Missing Critical Features

**Validator Bash Read-Only:**
- Problem: Validators should have `execute` permission with READ-ONLY restriction for running tests
- Files: `src/schemas/permission.ts` (line 93)
- Blocks: Validators cannot run `npm test` or other verification commands

**Auto-Validation Cycles:**
- Problem: TRIAL-8 requires automatic validation on events; not implemented
- Files: `src/plugin.ts` (lines 78-99)
- Blocks: No proactive drift detection; manual validation only

**Drift Detection Runtime:**
- Problem: `DriftInfoSchema` exists but no runtime enforcement
- Files: `src/schemas/state.ts` (schema exists), no runtime implementation
- Blocks: Cannot detect when agent behavior drifts from expected pattern

## Test Coverage Gaps

**TRIAL-2 Delegation Tests:**
- What's not tested: Delegation depth tracking, circular delegation detection
- Files: `src/hooks/tool-gate.ts` (lines 31-38)
- Risk: Delegation limits never enforced
- Priority: CRITICAL

**Role Detection Edge Cases:**
- What's not tested: Mixed-case agent names, special characters, substring collisions
- Files: `src/schemas/permission.ts` (lines 104-124)
- Risk: Wrong role assigned to agents
- Priority: HIGH

**Compaction Survival:**
- What's not tested: Anchors actually appearing in post-compaction context; LLM attending to injected content
- Files: `src/hooks/compaction.ts`
- Risk: Governance context ignored by LLM
- Priority: HIGH

**Concurrent Write Safety:**
- What's not tested: Multiple agents writing state simultaneously
- Files: `src/lib/persistence.ts` (atomicWrite function)
- Risk: State corruption under concurrent access
- Priority: MEDIUM

**Permission Matrix Coverage:**
- What's not tested: All 7 roles x 5 categories = 35 permission combinations
- Files: `src/schemas/permission.ts` (ROLE_PERMISSIONS)
- Risk: Permission leaks for untested combinations
- Priority: MEDIUM

---

## Trial Status Summary

| Trial | Status | PASS | Blocker |
|-------|--------|------|---------|
| T1 | **VALIDATED** | 3/4 | P1.2 needs manual TUI test |
| T2 | **PARTIAL** | 0/4 | Subagent hook bypass (#5894) |
| T3 | **IMPLEMENTED** | 2/4 | No text.complete hook |
| T4 | **NOT STARTED** | 0/4 | Blocked on T2 |
| T5 | **PLACEHOLDER** | 0/4 | Needs A/B test data |
| T6 | **PLACEHOLDER** | 0/4 | Blocked on T5 |
| T7 | **NOT STARTED** | 0/4 | Design after T2 pivot |
| T8 | **PARTIAL** | 1/4 | Blocked on T3 validation |

---

*Concerns audit: 2026-02-06*
