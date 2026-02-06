# Phase 0: Smart TODO Tool — Implementation Plan

Replace the shallow `idumb_task` (flat create/complete/status) with a 3-level (Epic→Task→Subtask) governance-aware TODO system that surfaces reminders, enforces prerequisites, and handles edge cases through multiple defensive mechanisms.

---

## CURRENT STATE

- **`src/tools/task.ts`** (67 LOC): flat `create`/`complete`/`status` — no hierarchy, no metadata, no evidence
- **`src/lib/persistence.ts`** (221 LOC): `StateManager` with `SessionState.activeTask = { id, name } | null` — too shallow
- **`src/hooks/tool-gate.ts`** (128 LOC): reads `stateManager.getActiveTask()` — needs to read smart task state
- **`src/tools/status.ts`** (59 LOC): displays flat task — needs hierarchy display
- **`src/schemas/index.ts`**: barrel — needs new task exports
- **`src/tools/index.ts`**: barrel — unchanged (same `idumb_task` export name)

---

## FILES TO CREATE/MODIFY

| File | Action | Est. LOC |
|------|--------|----------|
| `src/schemas/task.ts` | **CREATE** — Epic/Task/Subtask types, validation, helpers | ~130 |
| `src/schemas/index.ts` | MODIFY — add task exports | ~5 |
| `src/lib/persistence.ts` | MODIFY — add task persistence methods to StateManager | ~80 |
| `src/tools/task.ts` | **REWRITE** — expanded actions with edge-case handling | ~280 |
| `src/hooks/tool-gate.ts` | MODIFY — read smart task state, add reminder injection | ~30 |
| `src/tools/status.ts` | MODIFY — display hierarchy | ~40 |
| `src/hooks/index.ts` | MODIFY — export new task accessors if needed | ~3 |
| `tests/task.test.ts` | **CREATE** — 40+ assertions | ~250 |

**Estimated total: ~820 new/modified LOC**

---

## STEP 1: Schema — `src/schemas/task.ts` (NEW)

```typescript
// Core types from STRATEGIC-PLANNING-PROMPT.md Part 9.1
type EpicStatus = "planned" | "active" | "completed" | "deferred" | "abandoned"
type TaskStatus = "planned" | "active" | "completed" | "blocked" | "deferred"
type SubtaskStatus = "pending" | "done" | "skipped"

interface Subtask {
  id: string
  taskId: string
  name: string
  status: SubtaskStatus
  toolUsed?: string      // which tool completed this
  timestamp?: number     // when status last changed
}

interface Task {
  id: string
  epicId: string
  name: string
  status: TaskStatus
  assignee?: string      // agent name
  evidence?: string      // proof of completion (required for "completed")
  createdAt: number
  modifiedAt: number
  subtasks: Subtask[]
}

interface TaskEpic {
  id: string
  name: string
  status: EpicStatus
  createdAt: number
  modifiedAt: number
  tasks: Task[]
}

// Entire task store (persisted to .idumb/brain/tasks.json)
interface TaskStore {
  version: string
  activeEpicId: string | null
  epics: TaskEpic[]
}
```

**Validation helpers:**
- `validateCompletion(task)` — blocks if subtasks still pending, requires evidence
- `findOrphanTasks(store)` — tasks referencing deleted epics
- `findStaleTasks(store, thresholdMs)` — tasks active >4h with no subtask progress
- `getActiveChain(store)` — returns active epic → active task → pending subtasks
- `formatTaskTree(store)` — rich text display of full hierarchy with status icons

**Chain-break detection:**
- Epic active but no active tasks → warning
- Task completed but pending subtasks → block
- Task active >4h with 0 subtask progress → stale warning

---

## STEP 2: StateManager extensions — `src/lib/persistence.ts` (MODIFY)

Add to `PersistedState`:
```typescript
interface PersistedState {
  // ... existing fields
  tasks: TaskStore  // NEW
}
```

Add to `StateManager`:
```typescript
// Task store operations
getTaskStore(): TaskStore
setTaskStore(store: TaskStore): void
getActiveEpic(): TaskEpic | null
getActiveTask(): Task | null      // overloads existing — returns active task in active epic
setActiveEpicId(epicId: string | null): void
```

**Key:** The existing `getActiveTask(sessionID)` returns `{ id, name } | null`. The new system stores tasks globally (not per-session) because task state transcends sessions. But the tool-gate still needs a session→task mapping. Solution: tool-gate reads from `getTaskStore().activeEpicId` → finds active task in that epic.

**Backward compatibility:** Keep old `setActiveTask(sessionID, task)` working — it writes to both old session state AND updates the smart task store's active task. This way existing tests (45/45) still pass.

---

## STEP 3: Tool rewrite — `src/tools/task.ts` (REWRITE)

### Actions (args.action enum)

| Action | Purpose | Required Args | Edge Cases |
|--------|---------|---------------|------------|
| `create_epic` | Start new epic | `name` | Already active epic → warn + confirm |
| `create_task` | Add task to active epic | `name` | No active epic → error + remind to create epic first |
| `add_subtask` | Add subtask to a task | `name`, `task_id` | No matching task → error + list tasks |
| `assign` | Set assignee on task | `task_id`, `assignee` | Task not found → error + list tasks |
| `start` | Mark task as active | `task_id` | Another task active → warn |
| `complete` | Complete task/subtask | `target_id`, `evidence` | Missing evidence → block + explain |
| `defer` | Defer task/epic | `target_id`, `reason` | — |
| `abandon` | Abandon epic | `target_id`, `reason` | Warn about active tasks |
| `status` | Show hierarchy | — | No epics → remind to create |
| `list` | List all epics | — | Empty → encourage creation |
| `update` | Update name/assignee | `target_id`, fields | Not found → list available |
| `branch` | Create branch from task | `task_id`, `branch_name` | Git integration for later |

### Edge Case Handling (User's feedback — multiple mechanisms)

**Mechanism 1: Argument validation with helpful errors**
```
Agent calls: idumb_task action=create_task
Missing name → "ERROR: 'name' is required for create_task. Example: idumb_task action=create_task name='Implement login form'"
```

**Mechanism 2: Prerequisite enforcement**
```
Agent calls: idumb_task action=create_task name="Login form"
No active epic → "ERROR: No active epic. You must create an epic first.
  USE: idumb_task action=create_epic name='Build auth feature'
  THEN: idumb_task action=create_task name='Login form'"
```

**Mechanism 3: State reminders in every response**
Every successful response includes a footer:
```
--- Governance Reminder ---
Active Epic: "Build auth" (2/5 tasks)
Current Task: "Login form" (assigned: idumb-builder, 1/3 subtasks done)
Next: Complete subtask "Add email validation" or add more subtasks
```

**Mechanism 4: Wrong argument hints**
```
Agent calls: idumb_task action=complete target_id=epic-123
Missing evidence → "BLOCKED: Cannot complete without evidence.
  Provide proof: idumb_task action=complete target_id=epic-123 evidence='All tests passing, login form renders correctly'
  Evidence examples: test results, file paths created, behavior verified"
```

**Mechanism 5: Stale task warnings**
If active task hasn't had subtask progress in >30 min (during session):
```
⚠️ STALE WARNING: Task "Login form" has been active for 45 min with no subtask progress.
  Options:
  - Add subtasks: idumb_task action=add_subtask task_id=task-123 name="..."
  - Complete it: idumb_task action=complete target_id=task-123 evidence="..."
  - Defer it: idumb_task action=defer target_id=task-123 reason="..."
```

**Mechanism 6: Completion chain validation**
```
Agent calls: idumb_task action=complete target_id=task-123 evidence="done"
2 subtasks still pending → "BLOCKED: Task has 2 pending subtasks:
  - [ ] Add email validation
  - [ ] Handle error states
  Complete or skip these first:
  - idumb_task action=complete target_id=sub-456 evidence='...'
  - idumb_task action=complete target_id=sub-789 evidence='...'
  Or skip: action=complete target_id=sub-456 evidence='skipped: not needed'"
```

---

## STEP 4: Tool-gate integration — `src/hooks/tool-gate.ts` (MODIFY)

Current: checks `stateManager.getActiveTask(sessionID)` for `{ id, name } | null`.

Change: Also check smart task store. If there's an active epic with an active task → allow writes. Keep backward compat with old `setActiveTask` API.

Add: When blocking, include current task state in the block message:
```
GOVERNANCE BLOCK: write denied
WHAT: No active task in your current epic.
CURRENT STATE: Epic "Build auth" is active, but no task is marked active.
USE INSTEAD: idumb_task action=start task_id=task-123
             OR: idumb_task action=create_task name="..."
```

---

## STEP 5: Status tool update — `src/tools/status.ts` (MODIFY)

Update to display smart task hierarchy:
```
=== iDumb Governance Status ===

ACTIVE EPIC: "Build auth feature" (2/5 tasks complete)
  ✅ Database schema (evidence: migration created)
  ✅ API routes (evidence: 3 endpoints tested)
  🔄 Login form (assigned: idumb-builder)
     ☐ Add email validation
     ☐ Handle error states
     ☑ Create form component (done: src/components/LoginForm.tsx)
  ⬜ Session management
  ⬜ Protected routes

ANCHORS: 3 total (3 fresh, 0 stale)
CRITICAL DECISIONS (1):
  - [decision] Using PostgreSQL + Drizzle ORM

RULES:
  - File writes blocked without active task
  - Task completion requires evidence
  - Epic completion requires all tasks complete/deferred
```

---

## STEP 6: Tests — `tests/task.test.ts` (NEW)

Target: **40+ assertions** covering:

| Group | Tests | Count |
|-------|-------|-------|
| Schema validation | Create epic/task/subtask, validate fields, chain integrity | 8 |
| CRUD operations | Create, read, update, complete, defer, abandon | 8 |
| Edge cases | Missing args, wrong IDs, no active epic, duplicate names | 8 |
| Prerequisite enforcement | Create task without epic, complete without evidence, complete with pending subtasks | 6 |
| Stale detection | Task active >threshold, epic with no active tasks | 4 |
| State persistence | Round-trip save/load of task store | 4 |
| Backward compatibility | Old setActiveTask/getActiveTask still work | 4 |
| Tool-gate integration | Smart task state allows/blocks writes correctly | 4 |

---

## STEP 7: Barrel exports + typecheck

- Update `src/schemas/index.ts` — export task types and helpers
- Update `src/hooks/index.ts` — export new task accessors if added
- Run `tsc --noEmit` — must pass
- Run `npm test` — all 150 existing + 40+ new tests must pass

---

## EXECUTION ORDER

1. Create `src/schemas/task.ts` (types + validation + helpers)
2. Update `src/schemas/index.ts` (exports)
3. Modify `src/lib/persistence.ts` (StateManager task methods)
4. Rewrite `src/tools/task.ts` (expanded actions + edge cases)
5. Modify `src/hooks/tool-gate.ts` (smart task integration)
6. Modify `src/tools/status.ts` (hierarchy display)
7. Update barrel exports
8. Create `tests/task.test.ts`
9. Run `tsc --noEmit` + `npm test`
10. Update `package.json` test script to include new test file

---

## RISK ASSESSMENT

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Breaking existing 150 tests | LOW | Backward-compat `setActiveTask` API preserved |
| Tool args too complex for LLM | MEDIUM | Clear descriptions, helpful error messages, examples in every error |
| Single tool with too many actions | MEDIUM | Each action is self-contained with validation. If too complex → split into 2 tools (still within 5-tool budget) |
| Persistence format migration | LOW | New `tasks` field in PersistedState, old state still loads fine (tasks defaults to empty) |
