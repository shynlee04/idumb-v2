# Knot-0 Mechanism Validation Tests

**Created:** 2026-02-06  
**Purpose:** Validate that plugin hooks ACTUALLY work before building real features  
**Principle:** "Works without error" ≠ "Changes behavior" — tests must prove IMPACT

---

## Quick Start

1. Build the test plugin:
   ```bash
   cd tests/knot-0
   npx tsc --project ../../tsconfig.json knot-0-plugin.ts --outDir ./dist
   ```

2. Copy to OpenCode plugins:
   ```bash
   cp dist/knot-0-plugin.js ~/.config/opencode/plugins/
   ```

3. Restart OpenCode and run tests via the `knot0_run_tests` tool

---

## Test Matrix

| Knot | Test | Min Pass Rate | Status |
|------|------|---------------|--------|
| 0A | Stop hook blocks execution | 100% | - |
| 0B | Args modification persists | 80% | - |
| 0C | Message injection attended | 70% | **BLOCKED** (hook may not exist) |
| 0D | Compaction context survives | 80% | - |
| 0E | Custom tool selected by LLM | 60% | - |
| 0F | Background spawn works | 75% OR fallback | - |

---

## CRITICAL FINDING: Hook Availability

From official OpenCode docs (Feb 5, 2026):

| Hook | Status | Notes |
|------|--------|-------|
| `tool.execute.before` | ✅ CONFIRMED | Documented + examples |
| `tool.execute.after` | ✅ CONFIRMED | Documented |
| `experimental.session.compacting` | ✅ CONFIRMED | Documented + examples |
| `shell.env` | ✅ CONFIRMED | Documented |
| `event` | ✅ CONFIRMED | All session events documented |
| `todo.updated` | ✅ NEW | Event for TODO tracking |
| `chat.message` | ❌ NOT DOCUMENTED | May not work |
| `experimental.chat.messages.transform` | ❌ NOT DOCUMENTED | Likely doesn't exist |
| `chat.params` | ❌ NOT DOCUMENTED | Likely doesn't exist |

**Impact:**
- T5/T6 (message transform) based on non-existent hooks — code is dead
- Agent detection via `chat.message` may not work
- `todo.updated` event available for T7!

---

## Test Details

### 0A: Stop Hook Actually Blocks

**What it tests:** Does throwing an error in `tool.execute.before` actually prevent tool execution?

**Legacy failure:** Logged warning but tool ran anyway ("LOG ONLY" pattern)

**Test procedure:**
1. Try to write a file: `.knot0a-test`
2. Plugin intercepts and throws error
3. Verify file was NOT created

**PASS criteria:**
- Error message visible in chat
- File does NOT exist after attempt
- Agent acknowledges the block

**FAIL indicators:**
- File gets created
- Error only in logs (not chat)

---

### 0B: Args Modification Persists

**What it tests:** Does modifying `output.args` in the before hook affect actual execution?

**Test procedure:**
1. Run `echo "knot0b test"`
2. Plugin appends `&& echo "KNOT0B_MODIFIED"` to command
3. Check if output includes "KNOT0B_MODIFIED"

**PASS criteria:**
- Output contains "KNOT0B_MODIFIED"
- Proves modification wasn't ignored

**FAIL indicators:**
- Plain output without modification
- Hook ran but modification ignored

---

### 0C: Message Injection Attended (BLOCKED)

**What it tests:** Does injecting messages cause LLM to actually read them?

**Status:** BLOCKED — `experimental.chat.messages.transform` hook NOT in official docs

**Alternative approach:**
- Test via compaction context injection (0D)
- If 0D passes, message injection likely works similarly

---

### 0D: Compaction Context Survives

**What it tests:** Does context injected during compaction survive and affect LLM behavior?

**Test procedure:**
1. Plugin injects anchor: "DECISION: PostgreSQL NOT MySQL"
2. Trigger compaction (fill context or `/compact`)
3. Ask: "What database did we decide to use?"
4. Expected answer: "PostgreSQL"

**PASS criteria:**
- Agent answers "PostgreSQL"
- References decision anchor

**FAIL indicators:**
- Agent says "MySQL" or "I don't know"
- No reference to injected context

---

### 0E: Custom Tool Selected (NATURAL SELECTION)

**What it tests:** Does LLM call custom plugin tools based on description ALONE?

**Legacy failure:** 14 hollow tools that LLM only used when prompted/reminded

**⚠️ CRITICAL DISTINCTION:**
```
Tool + Prompt reminder → Agent uses tool → FAIL (prompt-dependent)
Tool + NO prompt → Agent uses tool → PASS (natural selection)
```

If a tool requires a prompt/instruction to remind the agent to use it, the tool description is ineffective. This is a hollow tool pattern.

**Test procedure:**
1. **NO prior instructions** about using custom tools
2. Fresh session, no context about iDumb tools
3. Ask: "What is the governance state?"
4. Watch which tool is called
5. Expected: `knot0e_status` selected NATURALLY

**PASS criteria:**
- Plugin's custom tool called WITHOUT any prompt/reminder
- Tool description alone was sufficient for selection
- No "use idumb tools" instruction in system prompt

**FAIL indicators:**
- Agent reads files directly (ignores custom tool)
- Agent hallucinates state
- Tool only works when prompted "use knot0e_status"
- Requires agent profile/.md instructions to work

**Why this matters:**
If tool selection requires prompt engineering, the governance is fragile:
- New agents won't know to use the tools
- Compaction may lose the "use X tool" instruction
- Different models may ignore the instruction

---

### 0F: Background Spawn (Optional)

**What it tests:** Can the plugin spawn background sub-agents?

**Status:** Deferred — requires SDK `client.session.create()`

**Fallback:** If spawn fails, use sequential approach (user waits)

---

## Files

| File | Purpose |
|------|---------|
| `knot-0-plugin.ts` | Minimal test plugin |
| `knot-0-state.json` | Test results (auto-generated) |
| `knot-0.log` | Test log file (auto-generated) |
| `README.md` | This file |

---

## Success Criteria

Phase 0 passes when:
- 0A: 100% block rate (must work)
- 0B: 80% modification rate
- 0D: 80% recall rate after compaction
- 0E: 60% tool selection rate
- 0F: Works OR sequential fallback documented

All knots must pass before proceeding to real T1-T8 implementation.

---

*Knot-0 tests informed by legacy flaws analysis*
