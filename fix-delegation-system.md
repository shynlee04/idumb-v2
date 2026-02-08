# iDumb Delegation System — Fix Plan

## Critical Issues Identified

### Issue 1: Delegation Instructions Not Delivered to Target Agent

**Severity:** 🔴 CRITICAL — Delegation mechanism is non-functional

**Location:** `src/tools/task.ts:801-816`

**Problem:**
- `buildDelegationInstruction()` builds a markdown instruction
- Instruction text is returned to caller
- No mechanism to deliver instruction to target agent
- Target agent has no way to receive delegated work

**Current Code:**
```typescript
const instruction = buildDelegationInstruction(delegation)

return [
  `✅ Delegation created successfully.`,
  `  Delegation ID: ${delegation.id}`,
  `  From: ${delegation.fromAgent}`,
  `  To: ${delegation.toAgent}`,
  `  Task: ${delegation.taskId}`,
  `  📨 Pass the following to @${args.to_agent}:`,
  instruction,
  `  Expected: ${delegation.expectedOutput}`,
]
```

**Impact:**
- Coordinator must manually copy-paste instruction to target agent
- No automated handoff
- Delegation is meaningless without delivery
- Governance enforcement is incomplete

---

### Issue 2: Coordinator Permission Misconfiguration

**Severity:** 🟡 HIGH — Coordinator has access to tools it shouldn't use

**Location:** `src/templates.ts:66-77`

**Problem:**
- Coordinator's YAML frontmatter includes `write: false` and `bash: false`
- But `permissions.edit: deny` and `permissions.bash: deny` block innate tools
- Plugin B tools `idumb_write` and `idumb_bash` are NOT blocked in YAML
- This means coordinator COULD accidentally call these tools
- System prompt says "CANNOT use idumb_write or idumb_bash" but YAML allows it

**Current YAML:**
```yaml
tools:
  read: true
  list: true
  glob: true
  grep: true
  question: true
  todoread: true
  todowrite: true
  write: false
  edit: false
  bash: false
  webfetch: false
permissions:
  edit: deny
  bash: deny
  webfetch: deny
  task:
    "*": allow
```

**Missing:**
```yaml
permissions:
  write: deny      # ← BLOCK innate write tool
  edit: deny
  bash: deny
  webfetch: deny
  task:
    "*": allow
```

**Impact:**
- Coordinator could accidentally call `idumb_write` (though not in system prompt)
- No runtime enforcement to prevent coordinator from writing
- Governance boundary is soft (prompt-based) rather than hard (permission-based)

---

## Proposed Solutions

### Solution for Issue 1: Delegation Delivery

#### Option A: Context Parameter Injection (RECOMMENDED)

**Approach:**
Store delegation instruction in a special file that target agent reads on startup.

**Implementation:**
1. When `delegate` action creates delegation, write instruction to `.idumb/delegations/pending/{delegation-id}.md`
2. Modify target agent's system prompt to check for pending delegations on startup
3. Agent reads file, processes instruction, removes file
4. Agent reports completion back via `idumb_task action=complete`

**Pros:**
- Simple, no hooks required
- File-based persistence (works across sessions)
- Agent has full control over when to read instruction
- Compatible with existing PP-01 constraint

**Cons:**
- Requires agent prompt changes
- File cleanup needed
- Race conditions possible if multiple delegations pending

**Implementation Steps:**
```
1. In task.ts delegate action:
   - After createDelegation(), write instruction to file
   - File path: .idumb/delegations/pending/{delegation.id}.md

2. In target agent's system prompt (investigator, executor):
   - Add startup check: "Read .idumb/delegations/pending/*.md"
   - If file exists, process it and report

3. Add cleanup:
   - When agent completes delegation, remove pending file
```

#### Option B: Hook Message Delivery

**Approach:**
Use `experimental.chat.system.transform` hook to inject delegation instruction into target agent's system prompt.

**Implementation:**
1. Register hook that listens for agent switching
2. When switching to target agent, check for pending delegations
3. Inject delegation instruction into system prompt via `output.system.push()`
4. Agent receives instruction automatically

**Pros:**
- Automatic, no file I/O
- Clean integration with OpenCode hooks
- No agent prompt changes needed
- Works with existing PP-01 constraint

**Cons:**
- Hook implementation is complex
- Unreliable (hooks may not fire consistently)
- Debugging is harder
- Depends on OpenCode hook stability

**Implementation Steps:**
```
1. In index.ts, register new hook:
   experimental.chat.system.transform

2. Hook checks:
   - Is this a subagent session?
   - Is there a pending delegation for this agent?

3. If yes, inject:
   output.system.push(buildDelegationInstruction(delegation))

4. Hook removes delegation from pending after agent reads
```

#### Option C: Skill Trigger

**Approach:**
Create a `@idumb-delegate` skill that target agent must invoke to accept delegation.

**Implementation:**
1. Delegating agent creates delegation record
2. Returns instruction text
3. Target agent manually invokes `/idumb-delegate {delegation-id}`
4. Skill loads instruction, sets context, returns to agent

**Pros:**
- Explicit handoff (agent must acknowledge)
- Clear audit trail
- No hooks required
- Skills are already part of the system

**Cons:**
- Requires manual agent trigger (not automatic)
- Adds command that users might invoke
- Extra step in delegation flow
- Target agent might not know to call skill

**Implementation Steps:**
```
1. Create skill: .idumb/idumb-modules/skills/delegate-accept.md

2. Skill implementation:
   - Load delegation by ID from delegations.json
   - Return instruction text to agent
   - Mark delegation as "accepted"

3. Update target agent prompts:
   - "When starting, check for pending delegations via /idumb-delegate"
```

---

### Solution for Issue 2: Coordinator Permissions

**Fix:** Add explicit permission blocks for Plugin B tools.

**Updated YAML:**
```yaml
tools:
  read: true
  list: true
  glob: true
  grep: true
  question: true
  todoread: true
  todowrite: true
  write: false
  edit: false
  bash: false
  webfetch: false
permissions:
  write: deny      # ← ADDED: Block innate write
  edit: deny
  bash: deny
  webfetch: deny
  task:
    "*": allow
```

**Update System Prompt:**
```markdown
### Plugin B Tool Permissions

| Tool | Your Access | Purpose |
|------|-------------|---------|
| `idumb_task` | ✅ ALL actions | Task hierarchy CRUD + governance |
| `idumb_scan` | ✅ ALL modes | Project intelligence scanner |
| `idumb_codemap` | ✅ ALL modes | Code structure analysis |
| `idumb_anchor` | ✅ add + list | Context anchors |
| `idumb_init` | ✅ install + status | Initialize/check iDumb setup |
| `idumb_read` | ✅ ALL modes | Read entities, check chain state |
| `idumb_write` | ❌ BLOCKED | Delegate to @idumb-executor |
| `idumb_bash` | ❌ BLOCKED | Delegate to @idumb-executor |
| `idumb_webfetch` | ❌ BLOCKED | Delegate to @idumb-investigator |
```

---

## Implementation Priority

### Phase 1: Fix Coordinator Permissions (QUICK WIN)
1. Update `getCoordinatorAgent()` in `templates.ts`
2. Add `permissions.write: deny` to YAML
3. Update system prompt to list blocked Plugin B tools
4. Run tests to verify

**Estimated Time:** 30 minutes
**Risk:** Low
**Impact:** Medium (hardens governance boundary)

---

### Phase 2: Implement Delegation Delivery (CRITICAL)
**Recommended:** Option A (Context Parameter Injection)

1. Update `delegate` action in `task.ts` to write pending file
2. Update Investigator agent system prompt to check for pending delegations
3. Update Executor agent system prompt to check for pending delegations
4. Add cleanup logic (remove file after completion)
5. Write tests for delegation delivery
6. Run full test suite

**Estimated Time:** 2-3 hours
**Risk:** Medium
**Impact:** Critical (makes delegation functional)

---

## Testing Strategy

### Coordinator Permissions Test
```typescript
// Test: Coordinator cannot call idumb_write
test("coordinator blocked from idumb_write", async () => {
  const result = await callTool("idumb_write", { path: "test.txt", content: "test" }, { agent: "idumb-supreme-coordinator" })
  expect(result).toContain("blocked")
  expect(result).toContain("idumb-supreme-coordinator")
})
```

### Delegation Delivery Test
```typescript
// Test: Delegation instruction is written to file
test("delegation creates pending file", async () => {
  await callTool("idumb_task", {
    action: "delegate",
    task_id: "task-1",
    to_agent: "idumb-executor",
    context: "Write hello world",
    expected_output: "File created"
  })

  const files = await glob(".idumb/delegations/pending/*.md")
  expect(files.length).toBe(1)
})
```

### Agent Startup Test
```typescript
// Test: Agent reads pending delegation on startup
test("executor reads pending delegation", async () => {
  await setupPendingDelegation("deleg-1")

  const agent = new Agent("idumb-executor")
  await agent.startup()

  expect(agent.hasPendingDelegation("deleg-1")).toBe(true)
  expect(agent.currentTask).toBe("Write hello world")
})
```

---

## Rollback Plan

If implementation causes issues:

1. **Coordinator Permissions:** Revert to previous YAML if tests fail
2. **Delegation Delivery:** Disable pending file creation, keep instruction text return only
3. **Agent Startup:** Remove delegation check from system prompt if agents break

All changes are isolated and can be rolled back independently.

---

## Questions for Decision

1. **Delegation Delivery Option:** Which approach (A, B, or C) do you prefer?
   - A: File-based injection (simple, file persistence)
   - B: Hook message delivery (automatic, complex)
   - C: Skill trigger (explicit, manual)

2. **Timeline:** Should we fix Coordinator Permissions first (quick win) or go straight to Delegation Delivery (critical)?

3. **Testing:** Do you want full integration tests or just unit tests for these fixes?

4. **Agent Prompt Changes:** Are you comfortable modifying Investigator and Executor system prompts?

---

**Next Steps:** Awaiting decision on Delegation Delivery option before implementation begins.
