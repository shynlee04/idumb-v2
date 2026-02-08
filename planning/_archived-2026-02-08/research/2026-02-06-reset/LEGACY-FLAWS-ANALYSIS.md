# Legacy iDumb Plugin: Flaw Analysis

**Analyzed:** 2026-02-06
**Source:** https://github.com/shynlee04/idumb-plugin
**Purpose:** Identify what actually broke so stress tests can detect similar failures

---

## Executive Summary: Why "100% Complete" Failed

The legacy codebase claims "✅ COMPLETE AND VERIFIED" with "100% improvement" metrics. 
But the code reveals **fundamental disconnects**:

1. **LOG ONLY, NO BLOCKING** — Most enforcement is logging, not action
2. **console.log everywhere** — 28 files have console.log/error, breaks TUI
3. **Hollow tools** — 14 tools registered but many do nothing meaningful
4. **Schema without enforcement** — Schemas exist but nothing validates at runtime
5. **Chain rules that don't chain** — Prerequisites logged but not enforced

---

## FLAW 1: "LOG ONLY" Pattern (Critical)

### Evidence from idumb-core.ts

```typescript
// Line 878-886
if ((toolName === 'edit' || toolName === 'write') && agentRole?.startsWith('idumb-') && agentRole !== 'idumb-builder') {
  log(directory, `[WARN] ${agentRole} attempted file modification - LOG ONLY`)
  // LOG ONLY - NO BLOCKING - let the tool run
  addHistoryEntry(directory, `warn:file_mod:${agentRole}:${toolName}`, 'interceptor', 'partial')
  // DO NOT return - let tool proceed  <-- THE PROBLEM
}
```

**What claims to happen:** Non-builder agents blocked from file writes
**What actually happens:** Warning logged, tool proceeds anyway

### Same pattern repeats at:
- Line 861: First tool enforcement → LOG ONLY
- Line 897: General permission check → LOG ONLY  
- Line 796: Permission denial → configurable but defaults to LOG ONLY

**Impact:** Governance is decorative. Agents do whatever they want.

---

## FLAW 2: Console.log Corruption (28 files affected)

### Files with console.log/console.error:
- `idumb-core.ts` — main plugin
- `idumb-smart-tasks.ts` line 301: `console.error()`
- All 14 tools have console usage
- All lib files have console usage

**The docs even acknowledge this:**
> Line 9: "CRITICAL: NO console.log - causes TUI background text exposure"

Yet console.log is used 78+ times across the codebase.

**Impact:** TUI corrupted during plugin operation.

---

## FLAW 3: Tool Explosion Without Value

### 14 Tools Registered:

| Tool | LOC | Actual Value |
|------|-----|--------------|
| idumb-chunker | 929 | Generates chunks but no consumer |
| idumb-config | 1023 | Config management, works |
| idumb-context | 276 | Context injection, never called |
| idumb-manifest | 597 | Manifest generation, unused |
| idumb-orchestrator | 526 | Orchestration, no integration |
| idumb-performance | 532 | Metrics, decorative |
| idumb-quality | 523 | Quality checks, decorative |
| idumb-security | 358 | Security checks, decorative |
| idumb-smart-tasks | 329 | Task generation, creates files but OpenCode ignores |
| idumb-state | 598 | State management, works |
| idumb-style | 195 | Style management, works |
| idumb-todo | 384 | TODO management, works |
| idumb-validate | 1042 | Validation, comprehensive but unused |

**Problem:** 
- Tools generate data but nothing consumes it
- No feedback loop: tool outputs don't influence hook behavior
- Agents choose innate tools over custom tools

---

## FLAW 4: Smart Tasks Don't Integrate

### idumb-smart-tasks.ts

```typescript
// Line 82-94
return JSON.stringify({
  status: "tasks_created",
  groupName: taskGroup.groupName,
  taskCount: tasks.length,
  tasks: tasks.map(t => ({...})),
  message: `${tasks.length} smart tasks created and visible in OpenCode TUI`
}, null, 2);
```

**Claim:** "visible in OpenCode TUI"
**Reality:** Tasks written to `.idumb/brain/smart-tasks/*.json`

OpenCode's TUI reads from `todoread`/`todowrite` tools, NOT custom JSON files.
The tasks are invisible to the native TODO system.

**Impact:** "Smart task generation" is file dumps that no one reads.

---

## FLAW 5: Chain Rules Without Chain Enforcement

### From chain-rules.ts (inferred from usage)

```typescript
// Line 1120-1157 in idumb-core.ts
if (matchingRule.mustBefore && matchingRule.mustBefore.length > 0) {
  const { allPassed, failures } = checkPrerequisites(...)
  
  if (!allPassed) {
    if (args.includes('--force') && matchingRule.onViolation.action !== 'block') {
      // User bypassed with --force
      log(directory, `[CHAIN] --force override used for ${command}`)
      return  // <-- ALLOWS BYPASS
    } else {
      // Block
      output.parts.push({ type: 'text', text: blockMsg })
      return
    }
  }
}
```

**Problems:**
1. `--force` flag bypasses ALL chain rules
2. Chain check happens in `command.execute.before`, not tool hooks
3. User can simply not use commands and call tools directly

**Impact:** Chain integrity only enforced for slash commands, not tool calls.

---

## FLAW 6: Compaction Context Ignored

### idumb-core.ts line 362-392

```typescript
"experimental.session.compacting": async (input, output) => {
  const context = buildCompactionContext(directory, config)
  output.context.push(context)
  log(directory, `Injected ${context.split("\\n").length} lines of context`)
}
```

**The injection happens. But:**
1. No verification that LLM actually reads/uses the injected context
2. No stress test to confirm context survives compaction
3. No measurement of "did the agent remember the anchor after compaction?"

**Impact:** Context injection is hopeful, not validated.

---

## FLAW 7: Agent Detection Fragile

### From session-tracker.ts (detectAgentFromMessages)

```typescript
const isResearchAgent = context.agent?.includes('research') ||
                        context.agent?.includes('explorer') ||
                        context.agent?.includes('mapper');
```

**Problems:**
1. String matching on agent names
2. `context.agent` may be undefined in early hooks
3. No fallback detection from actual behavior

**Impact:** Agent role often wrong, governance applied incorrectly.

---

## FLAW 8: No Stress Tests for Actual Intelligence

### What they tested:
- Path structure resolution ✅
- Agent matrix creation ✅  
- Command workflow matrix ✅
- TypeScript compilation ✅

### What they DIDN'T test:
- Does governance actually change LLM behavior?
- Do anchors survive 20+ compactions?
- Does chain-breaking trigger enforcement?
- Does context injection improve recall?
- Does logging reduce drift?

**Impact:** Tests prove code runs, not that it works.

---

## FLAW 9: Timestamp Tracking "Not Implemented"

### idumb-core.ts line 932-937

```typescript
// TODO: Implement timestamp tracking
// if (shouldTrackTimestamp(filePath)) {
//   recordTimestamp(directory, filePath)
// }
log(directory, `[FILE] Timestamp tracking skipped (not implemented): ${filePath}`)
```

**This is supposed to be core functionality** — time-to-stale enforcement.
It was never implemented.

---

## FLAW 10: Scattered Responsibilities

### File organization:

```
src/plugins/
├── idumb-core.ts (1215 LOC - monolithic)
└── lib/
    ├── state.ts
    ├── chain-rules.ts
    ├── schema-validator.ts
    ├── governance-builder.ts
    ├── styles.ts
    ├── types.ts
    ├── message-scoring.ts (never stress-tested)
    └── session-tracker.ts

src/tools/
├── 14 separate tools (7K+ LOC total)
└── lib/
    ├── bash-executors.ts
    ├── hierarchy-parsers.ts
    └── index-manager.ts
```

**Problems:**
1. `idumb-core.ts` at 1215 LOC does too many things
2. Tools don't share state with hooks
3. `lib/` modules split arbitrarily
4. No clear ownership of cross-cutting concerns

---

## Stress Test Requirements (Based on Flaws)

### Test 1: Does Blocking Actually Block?

```
SETUP: Configure enforcement.blockOnPermissionViolation = true
ACTION: Non-builder agent attempts write tool
EXPECTED: Tool blocked, error visible in chat
MEASURE: Tool output replaced OR original output shown
```

### Test 2: Does Console.log Break TUI?

```
SETUP: Plugin with console.log in hot path
ACTION: Use any intercepted tool
EXPECTED: Clean TUI
MEASURE: Visual inspection for background text corruption
```

### Test 3: Do Smart Tasks Appear in TUI?

```
SETUP: Call createSmartTasks tool
ACTION: Check OpenCode TUI task list
EXPECTED: Tasks visible
MEASURE: Tasks appear OR don't appear in native TODO
```

### Test 4: Does Context Survive Compaction?

```
SETUP: Create anchor with critical decision
ACTION: Force 5 compactions
VERIFY: Ask agent "What was the decision?"
EXPECTED: Agent references anchor
MEASURE: Correct recall vs hallucination
```

### Test 5: Does Chain Enforcement Work for Tools?

```
SETUP: Chain rule requiring `idumb-state read` before `write`
ACTION: Agent calls `write` without reading state
EXPECTED: Write blocked
MEASURE: Tool blocked OR proceeds anyway
```

### Test 6: Does Time-to-Stale Enforcement Exist?

```
SETUP: Create anchor with 1-hour staleness
ACTION: Wait 2 hours, attempt to use anchor
EXPECTED: Anchor marked stale, excluded from context
MEASURE: Stale anchor used OR excluded
```

---

## Root Cause: Hypothesis Towers Without Validation

The legacy codebase built **8 phases of features** before validating Phase 1:

```
Phase 0: Setup → never stress-tested
Phase 1: Tool gate → LOG ONLY
Phase 2: State management → works
Phase 3: Compaction → unverified
Phase 4: TODO hierarchy → disconnected from native
Phase 5: Style system → works but decorative
Phase 6: Message scoring → never stress-tested
Phase 7: Chain rules → bypassable
```

Each phase assumed the previous worked. None were validated with **adversarial stress tests**.

---

## Recommendations for v2

1. **Test enforcement BEFORE building tools** — Prove blocking works
2. **No console.log ever** — Use file logging only
3. **Fewer tools, higher impact** — 3-5 tools max for Phase 0
4. **Native integration first** — Use `todowrite` not custom files
5. **Stress test every mechanism** — Poisoned context, compaction marathon, drift injection
6. **No "LOG ONLY" mode** — Either enforce or don't intercept

---

*Analysis completed: 2026-02-06*
*For stress test design, see: STRESS-TESTS-LEGACY-INFORMED.md*
