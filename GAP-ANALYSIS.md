# iDumb v2 Plugin Gap Analysis

**Date:** 2026-02-06  
**Analyst:** Comprehensive review of v2 implementation vs MICRO-MILESTONE-ARCHITECTURE

---

## Executive Summary

The v2 implementation has made significant progress with a solid foundation, but several gaps remain between the planning architecture and current implementation.

| Area | Status | Completeness |
|------|--------|--------------|
| TRIAL-1 (Tool Gate) | **VALIDATED** | 95% |
| TRIAL-2 (Delegation) | **PARTIAL** | 40% |
| TRIAL-3 (Compaction) | **IMPLEMENTED** | 75% |
| TRIAL-4 (Sub-task) | **NOT STARTED** | 0% |
| TRIAL-5/6 (Message Transform) | **PLACEHOLDER** | 5% |
| TRIAL-7 (TODO) | **NOT STARTED** | 0% |
| TRIAL-8 (Auto-run) | **PARTIAL** | 30% |

---

## 1. Technical Gaps

### 1.0 PLATFORM LIMITATION: Subagent Hook Bypass - CRITICAL BLOCKER

**Discovery:** 2026-02-06  
**Source:** [sst/opencode#5894](https://github.com/sst/opencode/issues/5894)

**Issue:** OpenCode `tool.execute.before` hooks fire for primary agent tool calls but **do NOT fire for subagent tool calls** spawned via the `task` tool. This means any governance enforced via tool hooks is completely bypassed when agents delegate to subagents.

**Impact on iDumb v2:**
- T2 (Delegation Tracking) — planned `task` tool interception will only catch the delegation itself, NOT the subagent's subsequent tool calls
- Permission enforcement — a coordinator delegating to a builder via `task` cannot have the builder's tool calls governed
- Context injection — subagents will NOT receive governance metadata via `__idumb_*` args

**Pivot Strategy:**
1. **Primary:** Use `chat.params` hook (fires before tool hooks, includes agent name) for earlier role detection on primary agents
2. **Secondary:** Enforce governance via agent profile `.md` files — instruct subagents to call `idumb_status` before executing
3. **Long-term:** Monitor issue #5894 for upstream fix; re-evaluate when subagent interception is available
4. **Hard pivot:** If governance cannot be enforced on subagents at all → limit delegation to single-level only

**Status:** PIVOT REQUIRED — original T2 approach is partially invalidated.

---

### 1.1 TRIAL-2: Delegation Depth Tracking - CRITICAL GAP

**Planned:**
- Intercept `task` tool for delegation depth tracking
- Detect circular delegation
- Track delegation chains persistently

**Current Implementation:**
- `tool-gate.ts` has basic session tracking but NO delegation-specific logic
- `delegationChain` field exists in `SessionTracker` but is NEVER populated
- No max depth enforcement (plan specifies 3 levels)
- No circular delegation detection
- **NEW:** Even if implemented, subagent tool calls won't be intercepted (see §1.0)

**Files to modify:** `src/hooks/tool-gate.ts`

**Missing Code:**
```typescript
// NOT YET IMPLEMENTED
if (tool === 'task') {
  const { description, subagent_type } = output.args
  const tracker = getSessionTracker(sessionID)
  
  // Track delegation
  tracker.delegationChain.push(subagent_type || 'unknown')
  tracker.depth++
  
  // Check max depth (3 levels per spec)
  if (tracker.depth > 3) {
    throw new ToolGateError(role, tool, {
      allowed: false,
      reason: `MAX_DELEGATION_DEPTH exceeded: ${tracker.delegationChain.join(' → ')}`,
    })
  }
  
  // Check circular delegation
  const previousAgents = tracker.delegationChain.slice(0, -1)
  if (previousAgents.includes(subagent_type)) {
    throw new ToolGateError(role, tool, {
      allowed: false,
      reason: `CIRCULAR_DELEGATION detected: ${tracker.delegationChain.join(' → ')}`,
    })
  }
}
```

### 1.2 Agent Name Availability in tool.execute.before - DESIGN GAP

**Issue:** The SDK's `tool.execute.before` hook input does NOT include the agent name. Role detection depends on `chat.message` capturing the agent first, but:

1. If the first tool call happens before `chat.message` fires, role defaults to `meta` (allow-all)
2. This creates a race condition where permission enforcement may be bypassed

**Current Workaround (line 141-142 of tool-gate.ts):**
```typescript
// Use detected role or default to meta (allow-all) since SDK tool.execute.before
// input has no agent field — we can't detect role there. Never break innate agents.
const role = tracker.agentRole || "meta"
```

**Recommended Fix:** Use `chat.params` hook which fires BEFORE `tool.execute.before` and includes agent name:
```typescript
"chat.params": async (input, _output) => {
  const { sessionID, agent } = input
  if (agent) {
    setAgentRole(sessionID, agent)
  }
}
```

### 1.3 Compaction Context Injection - PARTIAL IMPLEMENTATION

**Planned (MICRO-MILESTONE §3.3):**
- P3.1: Context injection appears in compacted summary
- P3.2: Custom prompt replacement works
- P3.3: Text completion modification visible
- P3.4: Modification doesn't break TUI rendering

**Current (`compaction.ts`):**
- ✅ Context injection implemented
- ❌ Custom prompt replacement NOT implemented (output.prompt never set)
- ❌ No text.complete hook (T3 spec item)
- ✅ TUI safety (no console.log)

**Missing:** `experimental.text.complete` hook to append governance reminders.

### 1.4 Session Persistence vs In-Memory - INCONSISTENCY

**Current State:**
- `tool-gate.ts` uses in-memory `sessionTrackers` Map
- `lib/persistence.ts` has `saveSession()` and `loadSession()` for file persistence
- These two systems are NOT synchronized

**Risk:** If the plugin restarts mid-session, all in-memory tracking is lost.

**Fix:** Call `saveSession()` after each permission check to persist tracking state.

---

## 2. Stress Testing Completeness

### 2.1 Existing Tests
- ✅ `tests/trial-1.ts` - Automated validation of T1 PASS criteria

### 2.2 Missing Tests

| Test | Description | Priority |
|------|-------------|----------|
| T1.P1.2 Manual | TUI visibility verification | HIGH |
| T2 Delegation | Delegation depth and circular detection | CRITICAL |
| T3 Compaction | Post-compaction anchor survival | HIGH |
| T4 Sub-task | Parallel task registry | MEDIUM |
| T5/T6 Message | LLM attention position testing | EXPERIMENTAL |
| T7 TODO | Hierarchical TODO enforcement | MEDIUM |
| T8 Auto-run | Event-triggered validation | LOW |

### 2.3 Stress Test Scenarios Missing

From MICRO-MILESTONE §Part 4:

1. **Hallucination Detection** - No mechanism to detect if LLM ignores injected context
   - Needed: Probe message in compaction context, verify LLM references it

2. **Context Poisoning** - No test for malicious user input attempting to override governance
   - Needed: Injection attempt test cases

3. **Memory Pressure** - No test for behavior under high anchor count
   - Needed: 100+ anchor performance test

---

## 3. Governance Framework Robustness

### 3.1 Strengths

| Feature | Implementation |
|---------|---------------|
| Atomic file writes | ✅ `atomicWrite()` with rename |
| Backup before write | ✅ `createBackup()` |
| Schema validation | ✅ Zod on all reads |
| TUI safety | ✅ File-based logging only |
| Time-to-stale | ✅ 48-hour threshold enforced |
| Anchor scoring | ✅ Priority + freshness algorithm |

### 3.2 Weaknesses

| Feature | Issue | Severity |
|---------|-------|----------|
| No config file watcher | Changes require restart | LOW |
| No state locking | Concurrent writes may corrupt | MEDIUM |
| No schema migration | Version bumps may break | MEDIUM |
| No garbage collection | Old backups accumulate | LOW |

### 3.3 Missing Governance Features

1. **Auto-validation cycles** - `TRIAL-8` spec requires automatic validation on events
2. **Drift detection** - Schema exists (`DriftInfoSchema`) but no runtime enforcement
3. **Quality metrics** - No actual quality measurement implementation

---

## 4. Agent Hierarchy and Permission System

### 4.1 Role Detection Accuracy

**Current Pattern Matching (`permission.ts`):**
```typescript
// OpenCode innate agents
if (name === "build") return "builder"
if (name === "plan") return "researcher"
if (name === "general") return "builder"
if (name === "explore") return "researcher"

// iDumb custom agents (pattern-based)
if (name.includes("meta")) return "meta"
// ... etc
```

**Issues:**
1. OpenCode agent names are case-sensitive (`Build` vs `build`) - current code lowercases
2. Pattern matching is greedy: `name.includes("high")` could match unintended agents
3. No handling for future OpenCode agents (Debug, Fix, etc.)

**Recommendation:** Create explicit mapping table:
```typescript
const OPENCODE_AGENTS: Record<string, AgentRole> = {
  Build: "builder",
  Plan: "researcher",
  General: "builder",
  Explore: "researcher",
  Debug: "validator",  // Future-proofing
}
```

### 4.2 Permission Matrix Alignment

**AGENTS.md v1 Matrix:**
| Agent Category | edit | write | bash | task | delegate |
|----------------|------|-------|------|------|----------|
| Coordinators   | ❌   | ❌    | ❌   | ✅   | ✅       |
| Researchers    | ❌   | ❌    | ❌   | ❌   | ❌       |
| Validators     | ❌   | ❌    | read | ❌   | ❌       |
| Builder        | ✅   | ✅    | ✅   | ❌   | ❌       |

**v2 Implementation (`ROLE_PERMISSIONS`):**
```typescript
coordinator: ["read", "delegate"]      // ✅ Matches
validator: ["read", "validate"]        // ⚠️ Missing bash-read-only
builder: ["read", "write", "execute"]  // ✅ Matches
researcher: ["read"]                   // ✅ Matches
```

**Gap:** Validators should have `execute` with READ-ONLY restriction for running tests.

### 4.3 Hierarchy Enforcement

**Missing:** No actual delegation chain validation. The spec requires:
- Coordinators can ONLY delegate, never execute
- Builders can ONLY execute, never delegate
- Validators can read and run non-destructive commands

**Current:** Roles are detected but hierarchy is NOT enforced across sessions.

---

## 5. Recommendations

### 5.1 Critical (Must Fix)

1. **Implement TRIAL-2 delegation tracking** in `tool-gate.ts`
2. **Add `chat.params` hook** to capture agent name before first tool call
3. **Persist session state** to survive plugin restart

### 5.2 High Priority

1. **Add `experimental.text.complete`** hook for T3 completion
2. **Create explicit OpenCode agent mapping** instead of pattern matching
3. **Add validator bash-read-only** permission category

### 5.3 Medium Priority

1. Implement drift detection runtime
2. Add state file locking
3. Create stress test suite for hallucination detection

### 5.4 Low Priority

1. Add backup garbage collection
2. Implement config file watching
3. Add schema migration support

---

## 6. Files Summary

| File | Lines | Purpose | Completeness |
|------|-------|---------|--------------|
| `plugin.ts` | 217 | Main entry | 80% |
| `hooks/tool-gate.ts` | 269 | T1 implementation | 85% |
| `hooks/compaction.ts` | 103 | T3 implementation | 70% |
| `schemas/permission.ts` | 238 | Role/permission matrix | 90% |
| `schemas/state.ts` | 205 | Governance state | 95% |
| `schemas/anchor.ts` | ~150 | Context anchors | 95% |
| `schemas/scan.ts` | 175 | Codebase scan | 95% |
| `lib/persistence.ts` | 414 | File I/O | 90% |
| `lib/logging.ts` | ~200 | TUI-safe logging | 95% |
| `engines/scanner.ts` | 654 | Codebase scanner | 95% |
| `tools/init.ts` | 195 | Init command | 90% |
| `tools/anchor.ts` | 80 | Anchor tools | 95% |
| `tools/status.ts` | 48 | Status tool | 95% |

---

**Conclusion:** The v2 implementation has a solid foundation with excellent schema design, persistence layer, and TRIAL-1 validation. The critical gaps are in TRIAL-2 (delegation tracking), agent detection timing, and session persistence synchronization. With these fixes, the governance framework will be production-ready.
