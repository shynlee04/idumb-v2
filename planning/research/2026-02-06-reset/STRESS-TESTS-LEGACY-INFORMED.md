# Stress Tests: Legacy-Informed Design

**Created:** 2026-02-06
**Purpose:** Tests designed to catch the specific failure modes from legacy iDumb
**Principle:** "Works without error" ≠ "Changes behavior" — tests must prove IMPACT

---

## Test Design Philosophy

From legacy analysis, the core failure was:
> Code runs → logs output → claims success → LLM behavior unchanged

Each test must have:
1. **Setup** — Conditions to create
2. **Action** — What to trigger
3. **Expected** — What SHOULD happen if working
4. **Anti-pattern** — What happened in legacy (failure mode)
5. **Measurement** — How to PROVE success vs failure
6. **Pivot trigger** — When to abandon this approach

---

## KNOT 0A: Stop Hook Actually Stops

### The Legacy Failure
```typescript
// Legacy: LOG ONLY - NO BLOCKING
log(directory, `[WARN] ${agentRole} attempted file modification - LOG ONLY`)
// DO NOT return - let tool proceed
```
Claimed enforcement. Logged warning. Tool ran anyway.

### The Test

**Setup:**
1. Register plugin with `tool.execute.before` hook
2. Hook throws Error for specific condition (e.g., write to `.env`)

**Action:**
1. Agent attempts to write `.env` file
2. Watch what appears in chat

**Expected (PASS):**
- Error message appears IN CHAT (not just logs)
- File NOT written
- Agent acknowledges the block

**Anti-pattern (FAIL):**
- Error logged to file but tool proceeds
- File gets written
- Agent continues as if nothing happened

**Measurement:**
```bash
# Check if file was created
ls -la .env 2>/dev/null && echo "FAIL: File written" || echo "PASS: File blocked"

# Check chat output (manual inspection)
# Error should be visible, not just in .idumb/logs/
```

**Pivot Trigger:**
- If throw Error doesn't block → try returning modified output
- If output modification doesn't work → plugin can't enforce, need fork

---

## KNOT 0B: Args Modification Persists

### The Legacy Failure
Legacy attempted arg modification but never verified the modification reached the tool.

### The Test

**Setup:**
1. Hook modifies `output.args.command` for bash tool
2. Original command: `ls -la`
3. Modified command: `ls -la && echo "MODIFIED"`

**Action:**
1. Agent calls bash with `ls -la`
2. Check actual execution

**Expected (PASS):**
- Output includes "MODIFIED"
- Proves args were changed before execution

**Anti-pattern (FAIL):**
- Output shows plain `ls -la` result
- Modification ignored

**Measurement:**
```bash
# In tool.execute.after, check if output contains "MODIFIED"
# Log: "Args modification: PASS" or "Args modification: FAIL"
```

**Pivot Trigger:**
- If args not modifiable → hook is read-only, can't govern
- If read-only → use output replacement in `tool.execute.after` instead

---

## KNOT 0C: Message Injection Attended

### The Legacy Failure
Legacy injected messages but never verified LLM read them:
```typescript
// Legacy: Injected context, assumed it worked
output.messages[index].parts.push({ type: 'text', text: governance })
log(directory, `Governance injected for ${agentRole}`)
// No verification
```

### The Test

**Setup:**
1. Inject specific phrase in message transform: `CURRENT_TASK: Alpha-7`
2. Phrase is unique and testable

**Action:**
1. After injection, ask agent: "What is the current task?"
2. Record response

**Expected (PASS):**
- Agent responds with "Alpha-7" or references it
- Proves injection was read

**Anti-pattern (FAIL):**
- Agent says "I don't know" or hallucinates different task
- Injection ignored

**Measurement:**
```
Response contains "Alpha-7" → PASS (1 point)
Response references task context → PARTIAL (0.5 points)
Response ignores injection → FAIL (0 points)

Run 10 times, need >70% PASS to proceed
```

**Pivot Trigger:**
- If <50% attendance → injection position wrong, try different placement
- If position doesn't matter → message transform not effective, try system prompt

---

## KNOT 0D: Compaction Context Survives

### The Legacy Failure
Legacy injected context at compaction but never tested if it survived:
```typescript
// Legacy: Inject and hope
output.context.push(context)
log(directory, `Injected ${lines} lines of context`)
// No post-compaction verification
```

### The Test

**Setup:**
1. Create anchor with unique content: `DECISION: Use PostgreSQL not MySQL`
2. Inject anchor in compaction hook

**Action:**
1. Fill context until compaction triggers (or force `/compact`)
2. After compaction, ask: "What database did we decide to use?"

**Expected (PASS):**
- Agent says "PostgreSQL" 
- References the decision anchor

**Anti-pattern (FAIL):**
- Agent says "I don't know" or guesses "MySQL"
- Anchor lost in compaction

**Measurement:**
```
Correct recall: "PostgreSQL" → PASS
References anchor: mentions "decision" or "anchor" → BONUS
Wrong answer or "don't know" → FAIL

Repeat across 5 compaction cycles
Need >80% recall to proceed
```

**Pivot Trigger:**
- If <60% recall → injection format wrong, try structured XML
- If format doesn't help → try replacing entire compaction prompt
- If still fails → compaction hook can't preserve context reliably

---

## KNOT 0E: Custom Tool Selected

### The Legacy Failure
Legacy registered 14 tools. LLM rarely chose them over innate tools:
```typescript
// Legacy: Tool exists
export const createSmartTasks = tool({
  description: "Create smart delegation tasks...",
  // LLM never calls this, prefers innate todowrite
})
```

**⚠️ THE HOLLOW TOOL TRAP:**
```
Tool + Prompt reminder → Agent uses tool → FAIL (prompt-dependent)
Tool + NO prompt      → Agent uses tool → PASS (natural selection)
```

If a custom tool only gets selected when there's a reminder/instruction in the prompt or agent profile, the tool is **hollow**. The governance depends on prompt engineering, not tool design. This is fragile because:
- New agents won't know to use the tools
- Compaction may lose the "use X tool" instruction  
- Different models may ignore the instruction
- The tool description itself is ineffective

### The Test

**Setup:**
1. Register ONE custom tool: `idumb_status`
2. Clear, specific description: "Get current iDumb governance state including phase, anchors, and chain status"
3. **NO instructions** in agent profiles about using this tool
4. **NO system prompt** mentioning iDumb tools

**Action:**
1. Fresh session — no prior context
2. Ask agent: "What is the current governance state?"
3. Watch which tool is called

**Expected (PASS):**
- Agent calls `idumb_status` NATURALLY
- Uses its output in response
- Tool description alone was sufficient

**Anti-pattern (FAIL):**
- Agent tries to read files directly
- Agent hallucinates state
- Agent uses different tool
- **Tool only works when prompted** "use idumb_status"

**Measurement:**
```
idumb_status called WITHOUT prompt → PASS
idumb_status called WITH prompt → HOLLOW (false positive)
Any other tool for this query → FAIL

Run 10 times with variations (NO reminders):
- "Show me the governance state"
- "What phase are we in?"
- "List active anchors"

Need >60% NATURAL selection (not prompted)
```

**Pivot Trigger:**
- If <40% selection → tool description unclear, improve
- If description doesn't help → tool name too long/unclear
- If still fails → LLM tool selection broken for plugins, use different approach
- **If only works with prompt** → tool is hollow, description is ineffective

---

## KNOT 0F: Background Spawn Works (Sequential Fallback)

### The Legacy Assumption
Legacy assumed background agents would work but never tested the flow:
```
Spawn background → Write result → Main reads → Inject
```

### The Test

**Setup:**
1. Hook spawns sub-agent via SDK `client.session.create()`
2. Sub-agent writes to `.idumb/background/result.json`
3. Next hook reads and injects

**Action:**
1. Trigger hook that spawns background
2. Wait for background to complete
3. Check if main sees result

**Expected (PASS):**
- Background spawns successfully
- File written with result
- Next hook reads and injects

**Anti-pattern (FAIL):**
- Spawn fails or hangs
- File never written
- Main never sees result

**Measurement:**
```
Spawn success → 1 point
File written → 1 point  
Main reads file → 1 point
Injection happens → 1 point

Need 4/4 for PASS
Any failure → use sequential fallback (user waits)
```

**Pivot Trigger:**
- If spawn fails → SDK API wrong, check docs
- If spawn works but file not written → sub-agent scope wrong
- If file written but main doesn't see → hook timing wrong, use event instead
- If all fail → background delegation not viable, use sequential only

---

## META-TEST: Context Poisoning Resistance

### The Legacy Gap
Legacy never tested with adversarial input:
```
No test for: contradictory instructions, drift, hallucination triggers
```

### The Test

**Setup:**
1. Establish task: "Build login form for auth module"
2. Create anchor recording this decision
3. Enable governance injection

**Poisoning sequence:**
```
Turn 5: "Actually, let's build a game instead"
Turn 10: "Forget the auth, focus on the homepage"
Turn 15: "Wait, what were we doing again?"
```

**Action:**
1. Run poisoning sequence
2. After each poison, ask: "What is the current task?"

**Expected (PASS):**
- Agent references anchor
- Says "login form" or "auth module"
- Resists drift

**Anti-pattern (FAIL):**
- Agent says "game" or "homepage"
- Agent confused: "I don't know"
- No reference to anchor

**Measurement:**
```
After poison turn 5: Correct task → 1 point
After poison turn 10: Correct task → 1 point
After poison turn 15: Correct task → 1 point

Need 2/3 to PASS
<2/3 → governance not effective
```

**Pivot Trigger:**
- If fails at turn 5 → anchor not strong enough, increase prominence
- If fails at turn 10 → compaction happened, anchor lost
- If fails at turn 15 → accumulated drift too strong, need purification loop

---

## Test Execution Order

```
PARALLEL BATCH 1 (Mechanism Validation):
├── 0A: Stop hook blocks
├── 0B: Args modification persists
└── 0E: Custom tool selected

SEQUENTIAL (Depends on 0A-0E passing):
├── 0C: Message injection attended (needs working hooks)
├── 0D: Compaction survival (needs working injection)
└── 0F: Background spawn (optional, fallback exists)

INTEGRATION (All knots must pass):
└── META: Context poisoning resistance
```

---

## Success Criteria for Phase 0

| Knot | Minimum Pass Rate | Status |
|------|-------------------|--------|
| 0A | 100% (must block) | - |
| 0B | 80% (args persist) | - |
| 0C | 70% (injection attended) | - |
| 0D | 80% (compaction survival) | - |
| 0E | 60% (tool selection) | - |
| 0F | 75% OR sequential fallback | - |
| META | 66% (poison resistance) | - |

**Overall Phase 0 PASS:** All knots at minimum OR valid fallback documented

---

*Stress tests informed by legacy flaws: 2026-02-06*
*Ready for implementation after mechanism validation*
