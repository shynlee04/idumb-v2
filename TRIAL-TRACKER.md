# Trial Tracker

> Living document tracking all 8 micro-trials. Updated after each test session.  
> **Last updated:** 2026-02-06

---

## Quick Status

| Trial | Name | Status | PASS | Pivot? | Next Action |
|-------|------|--------|------|--------|-------------|
| **T1** | Stop Hook Tool Manipulation | **VALIDATED** | 3/4 | No | P1.2 manual TUI test |
| **T2** | Inner Cycle Delegation | PARTIAL | 0/4 | **YES** — subagent hooks broken | Implement `chat.params` hook + forced reads |
| **T3** | Compact Hook + Text Complete | IMPLEMENTED | 2/4 | Pending | Live compaction test |
| **T4** | Sub-task Background Tracking | NOT STARTED | 0/4 | — | Blocked on T2 |
| **T5** | Compact Message Hierarchy | PLACEHOLDER | 0/4 | — | Blocked on A/B test data |
| **T6** | User Prompt Transform | PLACEHOLDER | 0/4 | — | Blocked on A/B test data |
| **T7** | Force Delegation + 3-Level TODO | NOT STARTED | 0/4 | — | Design schema after T2 |
| **T8** | Auto-run + Export + State | PARTIAL | 1/4 | — | After T3 live validation |

---

## Trial Details

### T1: Stop Hook Tool Manipulation

**Hypothesis:** `tool.execute.before` can block tool execution, modify args, and show governance errors.

| Criteria | Description | Result | Evidence |
|----------|-------------|--------|----------|
| P1.1 | Throwing error blocks tool execution | **PASS** | `ToolGateError` thrown and caught |
| P1.2 | Error message visible in TUI (not background) | **PENDING** | Requires manual test in OpenCode |
| P1.3 | Arg modification persists to execution | **PASS** | `__idumb_*` metadata added to args |
| P1.4 | Other hooks continue running | **PASS** | Permission history records all checks |

**Pivot status:** No pivot needed. Stop hook works as designed.  
**Fallback ready:** `tool.execute.after` output replacement if P1.1 fails in production.  
**Next:** Load plugin in OpenCode, manually verify P1.2.

---

### T2: Inner Cycle Delegation

**Hypothesis:** Intercept `task` tool to track delegation depth and prevent circular delegation.

| Criteria | Description | Result | Evidence |
|----------|-------------|--------|----------|
| P2.1 | Detect coordinator → builder delegation | **NOT STARTED** | `delegationChain` field exists but never populated |
| P2.2 | Inject governance into delegation context | **NOT STARTED** | — |
| P2.3 | Subagent receives governance context | **NOT STARTED** | — |
| P2.4 | Delegation hierarchy enforced | **NOT STARTED** | — |

**⚠️ PIVOT REQUIRED:**  
OpenCode GitHub issue [#5894](https://github.com/sst/opencode/issues/5894) confirms `tool.execute.before` hooks **do NOT fire for subagent tool calls**. The planned approach of intercepting `task` tool won't enforce governance on spawned subagents.

**Pivot strategy:**
1. **Primary:** Use `chat.params` hook (fires before tool hooks, includes agent name) for earlier role detection
2. **Secondary:** Force subagents to call `idumb_status` via agent profile `.md` instructions
3. **Long-term:** Monitor issue #5894 for upstream fix; re-evaluate when subagent interception is available
4. **Hard pivot:** If none work → skip T2, focus on T3/T7 which don't depend on subagent interception

---

### T3: Compact Hook + Text Complete

**Hypothesis:** Injecting governance context during compaction helps agents maintain phase/task awareness.

| Criteria | Description | Result | Evidence |
|----------|-------------|--------|----------|
| P3.1 | Context injection appears in compacted summary | **IMPLEMENTED** | `compaction.ts` injects governance block |
| P3.2 | Custom prompt replacement works | **NOT IMPLEMENTED** | `output.prompt` never set |
| P3.3 | Text completion modification visible | **NOT IMPLEMENTED** | No `experimental.text.complete` hook |
| P3.4 | Modification doesn't break TUI rendering | **PASS** | No console.log, file logging only |

**Pivot status:** Pending live validation.  
**Next:** Create anchor → fill context → trigger compaction → verify anchor referenced in new context.

---

### T4: Sub-task Background Tracking

**Hypothesis:** Track parallel sub-tasks and their progress across sessions.

| Criteria | Description | Result | Evidence |
|----------|-------------|--------|----------|
| P4.1 | Sub-task registry persisted | **NOT STARTED** | — |
| P4.2 | Parallel task status visible | **NOT STARTED** | — |
| P4.3 | Task completion detection | **NOT STARTED** | — |
| P4.4 | Cross-session task continuity | **NOT STARTED** | — |

**Status:** Blocked on T2 (delegation tracking).

---

### T5: Compact Message Hierarchy

**Hypothesis:** Injecting structured content at specific positions in compacted messages improves agent attention.

| Criteria | Description | Result | Evidence |
|----------|-------------|--------|----------|
| P5.1 | A/B test determines optimal injection position | **BLOCKED** | Need empirical data |
| P5.2 | Hierarchy message shows: work, cycles, drift, anchors | **BLOCKED** | Depends on P5.1 |

**Status:** Blocked on A/B test. Need to determine if LLM attends to start vs end of injected context.

---

### T6: User Prompt Transform

**Hypothesis:** Transforming user prompts to include governance context improves task completion.

| Criteria | Description | Result | Evidence |
|----------|-------------|--------|----------|
| P6.1 | User prompt transformation implemented | **BLOCKED** | — |
| P6.2 | Transformation improves task completion | **BLOCKED** | Needs A/B comparison |

**Status:** Blocked on T5 results.

---

### T7: Force Delegation + 3-Level TODO

**Hypothesis:** A governed TODO tool with 3-level hierarchy (epic → task → subtask) improves delegation quality.

| Criteria | Description | Result | Evidence |
|----------|-------------|--------|----------|
| P7.1 | `idumb_todo` tool replaces innate TODO | **NOT STARTED** | — |
| P7.2 | 3-level hierarchy enforced by schema | **NOT STARTED** | — |
| P7.3 | Delegation metadata required | **NOT STARTED** | — |
| P7.4 | TODO serves as agent ↔ user communication | **NOT STARTED** | — |

**Status:** Design schema after T2 pivot resolves.

---

### T8: Auto-run + Export + State

**Hypothesis:** Event-driven validation and session export improve governance reliability.

| Criteria | Description | Result | Evidence |
|----------|-------------|--------|----------|
| P8.1 | Event hooks trigger on session lifecycle | **PASS** | `event` hook in plugin.ts logs session events |
| P8.2 | Auto-run validation after tool execution | **NOT STARTED** | — |
| P8.3 | Session export with schema-validated data | **NOT STARTED** | — |
| P8.4 | State management without false alarms | **NOT STARTED** | — |

**Status:** P8.1 works. Rest blocked on T3 live validation.

---

## Test Session Log

| Date | Tester | Trials Tested | Results | Notes |
|------|--------|---------------|---------|-------|
| 2026-02-06 | Automated | T1 | 3/4 PASS | P1.2 requires manual OpenCode test |
| 2026-02-06 | Automated | T-Init | 9/9 PASS | Scanner + init tool validation |
| — | — | — | — | *Awaiting Phase 2B live validation* |

---

## Pivot Decision Log

| Date | Trial | Decision | Rationale |
|------|-------|----------|-----------|
| 2026-02-06 | T1 | CONTINUE | Stop hook works. Fallback (output replacement) ready. |
| 2026-02-06 | T2 | **PIVOT** | OpenCode #5894: subagent hooks don't fire. Need alternative approach. |
| 2026-02-06 | T3 | PENDING | Awaiting live compaction test. |
