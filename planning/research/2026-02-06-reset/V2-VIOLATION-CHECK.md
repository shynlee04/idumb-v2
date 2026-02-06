# V2 Codebase Violation Check

**Checked:** 2026-02-06
**Purpose:** Verify v2 doesn't repeat legacy mistakes
**Files scanned:** 30 TypeScript files, ~5K LOC

---

## Legacy Flaw Comparison

| # | Legacy Flaw | V2 Status | Evidence |
|---|-------------|-----------|----------|
| 1 | LOG ONLY pattern | **✅ AVOIDED** | `tool-gate.ts` throws `ToolGateError` to block, plus fallback output replacement |
| 2 | console.log everywhere | **✅ CLEAN** | 0 violations; only comments referencing the rule |
| 3 | 14 hollow tools | **✅ MINIMAL** | Only 5 tools registered: `anchor_add`, `anchor_list`, `status`, `init`, `agent_create` |
| 4 | Smart tasks disconnected | **⚠️ N/A** | No smart task system yet (correct — not implemented until validated) |
| 5 | Chain rules bypassable | **⚠️ NOT IMPLEMENTED** | No chain enforcement yet — OK since T2/T7 not started |
| 6 | Compaction unverified | **⚠️ SAME RISK** | Compaction hook exists but no verification tests |
| 7 | Agent detection fragile | **⚠️ PARTIAL** | Pattern matching in `permission.ts`, but fallback to `meta` is safer |
| 8 | Timestamp tracking not implemented | **⚠️ SAME** | `time-to-stale` in schemas but no enforcement runtime |
| 9 | Scattered responsibilities | **✅ BETTER** | Clear separation: hooks/, schemas/, lib/, tools/, engines/ |
| 10 | Tests prove code runs, not works | **⚠️ SAME RISK** | `trial-1.ts` exists but no adversarial stress tests |

---

## Principle Violations

| Principle | Status | Notes |
|-----------|--------|-------|
| 1. SSOT | ✅ | Single state.json in `.idumb/brain/` |
| 2. One mechanism per trial | ✅ | Clear T1-T8 separation |
| 3. Baseline before claims | ⚠️ | No baseline measurement exists |
| 4. Infrastructure not intelligence | ✅ | Plugin provides boundaries, not reasoning |
| 5. Artifacts have lifecycles | ⚠️ | Schemas have timestamps, no enforcement |
| 6. Budget everything | ⚠️ | Compaction has 5 anchor limit, but no other budgets |
| 7. Fail open for stability | ✅ | All hooks wrapped in try/catch, graceful degradation |
| 8. Minimize surface area | ✅ | 5 tools, 4 hooks — minimal |
| 9. Isolation for stress tests | ⚠️ | No separate worktree for testing |
| 10. Explicit pivot triggers | ✅ | GAP-ANALYSIS.md and TRIAL-TRACKER.md document pivots |

---

## Critical Gaps (Already Known)

From GAP-ANALYSIS.md — these are acknowledged, not violations:

1. **T2 delegation tracking not implemented** — `delegationChain` exists but never populated
2. **Subagent hook bypass** — OpenCode #5894 limitation, pivot documented
3. **Agent detection race condition** — First tool may fire before `chat.message`
4. **Session persistence sync** — In-memory trackers not persisted to disk
5. **No `experimental.text.complete`** — T3 spec item missing

---

## New Concerns (From Legacy Analysis)

### 1. Message Transform May Have Same Issue as Legacy

**Legacy problem:** Injected messages but never verified LLM reads them.

**V2 current (`message-transform.ts`):**
```typescript
// Line 311: Splice governance message into output
output.messages.splice(lastUserIdx, 0, governanceMessage)
logger.info(`Trajectory captured...`)
// No verification that LLM attends to this
```

**Recommendation:** Add Knot-0C stress test before relying on message transform.

---

### 2. Compaction Hook Has Same "Hope" Pattern

**Legacy problem:** Context injected, success assumed.

**V2 current (`compaction.ts`):**
```typescript
// Line 80-89: Inject anchors
output.context.push(injectionBlock)
logger.info(`Injected ${topAnchors.length} anchors into compaction context`)
// No post-compaction verification
```

**Recommendation:** Add Knot-0D stress test before proceeding past T3.

---

### 3. Agent Profile Schema May Be Premature

**File:** `schemas/agent-profile.ts` — 359 LOC

**Concern:** This creates agent profiles programmatically, but legacy showed generating `.md` files from plugins causes conflicts. RESET-SYNTHESIS.md DON'T #10: "Don't create .md agents/commands/skills programmatically from plugins."

**Status:** Tool exists (`idumb_agent_create`) but is not in critical path. Flag for review.

---

### 4. Trajectory Schema May Be Over-Engineered

**File:** `schemas/trajectory.ts` — 299 LOC

**Concern:** Complex intent classification + drift detection before T5/T6 are validated. Legacy flaw was building features before validating underlying mechanism.

**Status:** Message transform hook uses this. If `experimental.chat.messages.transform` doesn't exist (per validation), this code is dead.

**Recommendation:** Confirm hook exists before investing more in trajectory.

---

## Clean Areas

| Area | Assessment |
|------|------------|
| `src/lib/logging.ts` | ✅ No console.log, file-based, TUI-safe |
| `src/lib/persistence.ts` | ✅ Atomic writes, backups, schema validation |
| `src/engines/scanner.ts` | ✅ Exhaustive, well-tested (9/9 assertions) |
| `src/hooks/tool-gate.ts` | ✅ Throws to block, fallback output replacement |
| `src/schemas/*.ts` | ✅ Zod schemas, type-safe, versioned |

---

## Action Items

### HIGH PRIORITY (Before Phase 0 Knot Tests)

1. **Confirm experimental hooks exist** — Live test `experimental.chat.messages.transform` and `experimental.chat.system.transform`
2. **Add Knot-0A test** — Verify blocking actually blocks (not just throws)
3. **Add Knot-0D test** — Verify compaction context is attended after compaction

### MEDIUM PRIORITY (Before T3/T5 Implementation)

4. **Review `agent-profile.ts` usage** — May violate "don't generate .md from plugins"
5. **Add baseline measurement** — Before/after comparison for any "improvement" claims
6. **Add staleness enforcement** — Runtime check on anchor reads, not just schema

### LOW PRIORITY (Cleanup)

7. **Consider removing CLI** — 437 LOC, never tested, not in critical path
8. **Consider simplifying trajectory** — 299 LOC for unvalidated T5/T6 feature

---

## Verdict

**V2 is significantly cleaner than legacy.** The main risks are:

1. **Same verification gap** — Compaction and message injection assume success
2. **Experimental hooks unverified** — May not exist in current OpenCode
3. **Some premature complexity** — `trajectory.ts`, `agent-profile.ts` before underlying mechanisms validated

**No blocking violations.** Proceed to Knot-0 tests with these documented risks.

---

*Violation check completed: 2026-02-06*
