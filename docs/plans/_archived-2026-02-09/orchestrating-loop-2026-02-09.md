# Orchestrating Loop Fix — 2026-02-09

> **Problem**: iDumb's orchestrating loop doesn't work. Delegation is fake, tools require
> 3-call ceremony, brain is empty, agents can't self-regulate. A user should be able to
> paste a PRD (like LocalMinds) and have agents auto-orchestrate with 3-4 human stops.
> Currently iDumb makes this WORSE than innate OpenCode alone.

## Context: The 4-Stop Workflow (Target State)

```
Stop 1: Research     — Coordinator reads PRD, investigator researches domain
Stop 2: Stories      — Coordinator splits into executable tasks with dependencies
Stop 3: User Confirm — Human approves the plan
Stop 4: Auto-Loop    — Executor implements. Self-corrects. Loops until done.
                       Coordinator monitors progress, re-delegates on failure.
```

## Root Causes

1. **3-call ceremony**: plan create → task create → task start before writes unlock
2. **Delegation is record-only**: `tui.executeCommand('agent_cycle')` is UNVERIFIED,
   cycles randomly, and falls back to text instructions nobody follows
3. **PP-01 constraint**: Sub-agent hooks DON'T FIRE in OpenCode — tool-gate can't
   enforce permissions on delegated agents
4. **Brain is empty**: 4 of 9 brain paths are schema-only, never populated at runtime
5. **Templates teach ceremony**: Coordinator template literally lists the 3-call
   sequence as "how to work"

## Solution A: Template-Driven Orchestration (RECOMMENDED)

**Timeframe**: 2-3 days
**Risk**: Low — changes templates and tool defaults, preserves all existing code

### Core Principle
Stop fighting OpenCode's innate agent system. Use `@agent` mentions for delegation
(which WORK), and make iDumb tools OPTIONAL accelerators, not mandatory gates.

### Changes

#### A1. Kill the 3-call ceremony
- Make `govern_task action=quick_start` the PRIMARY documented API
- `quick_start` already exists: creates WorkPlan + TaskNode + auto-starts in ONE call
- Update coordinator template to show `quick_start` as the default, not the 3-step sequence
- Keep `create` + `plan_tasks` + `start` as advanced API for complex multi-task plans

#### A2. Delegation via @mention (not govern_delegate)
- Coordinator template instructs: "To delegate, mention @idumb-executor or @idumb-investigator"
- `govern_delegate` tool becomes OPTIONAL — records the delegation for traceability,
  but the actual agent switch is the @mention
- Remove the `tui.executeCommand('agent_cycle')` code path entirely — it doesn't work
  and creates false expectations
- The text-protocol handoff instruction becomes the ONLY output (no "agent switch: manual" noise)

#### A3. Rewrite coordinator template with 4-stop loop
Replace the current Phase 1/2/3 sections with:
```
## Your Workflow: The 4-Stop Loop

### Stop 1: Research (YOU do this)
- Read the user's request/PRD
- Use read/grep/glob to understand the codebase
- Mention @idumb-investigator for domain research if needed
- Anchor key findings: idumb_anchor action="add" type="decision" content="..."

### Stop 2: Plan (YOU do this)
- Split work into tasks with dependencies using quick_start or plan_tasks
- Present the task graph to the user
- ⛔ STOP — wait for user confirmation

### Stop 3: User Confirms
- User approves, modifies, or rejects the plan
- Adjust tasks based on feedback

### Stop 4: Execute (DELEGATE this)
- For each task in dependency order:
  - Mention @idumb-executor with task context
  - Executor calls govern_task action=quick_start (or inherits active task)
  - Executor writes code, runs tests, completes task
  - You check progress via govern_task action=status
  - If task fails: re-delegate or adjust plan
  - If task completes: move to next task
- Loop until all tasks complete
```

#### A4. Executor template: self-regulation loop
Add self-correction pattern to executor template:
```
## Your Work Loop
1. Check your active task: govern_task action=status
2. Implement the task
3. Verify your work (run tests, typecheck)
4. If verification fails → fix and re-verify (max 3 retries)
5. If verification passes → govern_task action=complete evidence="..."
6. After completion, check if more tasks exist
```

#### A5. Brain auto-population from hooks
- `tool.execute.after` hook: After task completion, auto-record a brain entry
  (knowledge.json) with: task name, files touched, evidence, timestamp
- `chat.params` hook: Already captures agent identity — extend to record
  session activity summary
- `compaction` hook: Already preserves anchors — extend to include
  recent brain entries
- This is OBSERVATION, not ceremony — brain fills up without agents calling tools

#### A6. Soften write-gate for quick_start flow
- When `quick_start` is called, the task is IMMEDIATELY active
- Write-gate should check: "is there ANY active task in this session?" → allow
- Remove the requirement for the task to be assigned to the CURRENT agent
  (since PP-01 means we can't reliably identify the delegate agent)

### What This Preserves
- All existing test suites (637/637)
- All existing schemas and persistence
- Tool-gate enforcement (still blocks writes without active task)
- Decision records (govern_task/govern_delegate still log everything)
- Compaction survival (anchors + active task still preserved)

### What This Removes
- `tui.executeCommand('agent_cycle')` code path (never worked)
- 3-call ceremony as the documented default
- Expectation that `govern_delegate` switches agents programmatically

---

## Solution B: Tool Consolidation (Alternative)

**Timeframe**: 1 week
**Risk**: Medium — changes tool surface, requires test rewrites

### Core Principle
If tools are anti-patterns, reduce them. Merge govern_plan + govern_task into
single `govern` tool. Remove govern_delegate entirely (delegation = @mention).
Remove govern_shell (use innate bash with hook-level classification).

### Changes
- 2 tools total: `govern` (all task/plan lifecycle) + `idumb_anchor`
- `idumb_init` stays but moves to CLI-only (not a runtime tool)
- Fewer tools = higher correct selection rate by LLMs
- Requires rewriting all test suites

### Why NOT recommended as first step
- Destroys 637 passing tests
- Significant refactoring risk
- Solution A achieves the same UX improvement with templates alone
- Can layer B on top of A later if validated

---

## Solution C: Full SDK Integration (Deferred)

**Timeframe**: 2+ weeks, requires Phase 6 completion
**Risk**: High — depends on UNVERIFIED SDK methods

### Core Principle
If OpenCode SDK actually supports programmatic delegation, use it.
If `client.find.symbols()` works, use it for brain indexing.
If `context.agent` is populated, use it instead of `chat.params`.

### Why deferred
- Phase 6 (SDK verification in live OpenCode) NEVER completed
- Building on UNVERIFIED APIs is what created the current mess
- Solution A works WITHOUT any SDK verification
- Layer C on top once SDK methods are confirmed

---

## Execution Order

```
Week 1: Solution A (template-driven orchestration)
  Day 1: A1 + A2 — kill ceremony, fix delegation
  Day 2: A3 + A4 — rewrite coordinator + executor templates
  Day 3: A5 + A6 — brain auto-population, soften write-gate

Week 2: Validate with real PRD
  - Test the 4-stop workflow with LocalMinds PRD
  - Identify gaps, iterate on templates
  - Record which SDK methods to verify for Solution C

Week 3+: Solution B/C based on validation results
```

## Acceptance Criteria

1. User pastes a PRD → coordinator reads it and presents a task plan (Stop 1+2)
2. User confirms → executor auto-implements tasks in dependency order (Stop 4)
3. No 3-call ceremony — `quick_start` is one call to unlock writes
4. Delegation is @mention — no `tui.executeCommand` dependency
5. Brain has entries after a work session — not empty
6. All existing tests still pass
7. `npm run typecheck` still clean

## Files to Change

| File | Change | Solution |
|------|--------|----------|
| `src/templates.ts` | Rewrite coordinator loop, executor self-regulation | A3, A4 |
| `src/tools/govern-delegate.ts` | Remove `tui.executeCommand` code, simplify to record + instruction | A2 |
| `src/hooks/tool-gate.ts` | Soften write-gate for quick_start active tasks | A6 |
| `src/hooks/compaction.ts` | Extend to include brain entries | A5 |
| `src/tools/govern-task.ts` | Promote `quick_start` in tool description | A1 |
| `src/lib/persistence.ts` | Add brain entry auto-recording method | A5 |
| `src/schemas/brain.ts` | May need lightweight entry schema for auto-population | A5 |
