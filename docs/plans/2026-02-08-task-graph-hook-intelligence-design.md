# Task Graph + Hook Intelligence Engine — Design Document

**Date:** 2026-02-08
**Scope:** Phase 1 (Systems 1 + 4)
**Status:** Draft — awaiting user review
**Supersedes:** `2026-02-08-tool-agent-redesign-plan.md` (Phase 0-5 plan — scope narrowed to Systems 1+4)

---

## 1. Vision

iDumb v2 is transforming from a **gate** (block writes without task) to a **brain** (delegation-aware governance that shapes agent behavior through context injection, temporal gates, and structured communication).

### The 4 Systems

| # | System | Phase | Status |
|---|--------|-------|--------|
| 1 | **Task Graph Protocol** | **Phase 1** | Fundamental revamp |
| 4 | **Hook Intelligence Engine** | **Phase 1** | Enhancement of existing hooks |
| 2 | Living Planning Artifacts | Phase 2+ | planning-registry.ts is 60% foundation |
| 3 | Tech Stack Knowledge Base | Phase 2+ | Greenfield — AST/codemap link later |

**Success Criteria (Level 2):** Systems 1+4 working together — the task graph drives delegation, hooks enforce it, context injection makes agents *aware* of their position in the governance chain.

---

## 2. Current State Tear-Down

### What Works (keep)

| Component | File | What It Does | Verdict |
|-----------|------|-------------|---------|
| Write gate | `tool-gate.ts:172-227` | Blocks write/edit without active task | **KEEP — enhance** |
| Agent-scoped gate | `tool-gate.ts:146-169` | Blocks plugin tools per agent role | **KEEP — extend** |
| Auto-inherit | `tool-gate.ts:184-203` | Session inherits task from store | **KEEP** |
| Retry detection | `tool-gate.ts:206-209` | Prevents infinite retry loops | **KEEP** |
| Compaction anchor injection | `compaction.ts` | Survives context window reset | **KEEP — enhance** |
| System prompt injection | `system.ts` | Always-on governance rules | **KEEP — major enhancement** |
| DCP pruning | `message-transform.ts` | Truncates stale tool outputs | **KEEP** |
| Delegation validation | `delegation.ts:181-229` | Hierarchy + depth + category routing | **KEEP — integrate** |
| Planning registry chains | `planning-registry.ts` | Chain staleness, section hashing | **KEEP for Phase 2** |
| Task-to-tool-gate bridge | `stateManager.setActiveTask()` | Links task lifecycle to write permission | **KEEP — core bridge** |

### What's Hollow (rebuild or kill)

| Component | File | Problem | Action |
|-----------|------|---------|--------|
| Epic-Task-Subtask model | `task.ts` | Passive checklist, no plan-ahead, no dependency graph | **REVAMP** |
| Delegation enforcement | `delegation.ts` | Text-only handoff — no runtime enforcement (PP-01) | **REVAMP** |
| Task tool (13 actions) | `tools/task.ts` | Bloated action-per-tool anti-pattern | **SPLIT** |
| Entity resolver | `entity-resolver.ts` | `children`/`relatedTo` always empty, `chainIntegrity` always "unknown", loose substring matching for permissions | **SIMPLIFY** |
| `idumb_scan` | `tools/scan.ts` | Innate grep/find are strictly better | **KILL** |
| `idumb_codemap` | `tools/codemap.ts` | Regex-only, innate grep more reliable | **KILL** |
| `idumb_read` | `tools/read.ts` | readFileSync with annotation noise | **KILL** |
| `idumb_webfetch` | `tools/webfetch.ts` | fetch() + cache, "intelligence" features are vaporware | **KILL** |
| `createBootstrapStore()` | `task.ts:178-205` | References "Meta Builder" — 3-agent model has no meta-builder | **FIX** |
| `code-quality.ts` | `lib/code-quality.ts` | 7 regex patterns, grades cluster B-C for any codebase | **KILL (defer to AST)** |

### SDK Client — Completely Unused

`src/index.ts:35` destructures only `{ directory }` from PluginInput. The `client` object with 20+ API namespaces is ignored:

| API | What It Provides | Replaces |
|-----|-----------------|----------|
| `client.find.text()` | ripgrep-powered search | `idumb_scan` |
| `client.find.symbols()` | LSP symbol search | `idumb_codemap` |
| `client.file.read()` | File content + git diff | `idumb_read` |
| `client.session.children()` | Delegation tree tracking | Manual delegation records |
| `client.session.prompt()` | Context injection to subagents | Text-only handoff messages |
| `client.event.subscribe()` | 31 SSE event types | Custom WebSocket dashboard |
| `client.tui.showToast()` | Non-blocking notifications | File-based logging |
| `client.app.log()` | App-level logging | File-based logging |

---

## 3. System 1: Task Graph Protocol

### 3.1 Why Epic-Task-Subtask Fails

1. **Passive checklist.** Agents voluntarily call `idumb_task`. Nothing forces them to read it before acting.
2. **No plan-ahead.** Tasks only represent current/past work. You can't see what's coming next.
3. **No dependency graph.** Tasks within an epic are flat — no "A must complete before B."
4. **Delegation is text.** `buildDelegationInstruction()` produces markdown. The delegate can ignore everything in it with zero consequence.
5. **Subtasks are noise.** Just `name + status`. No context, no tool linkage, no artifacts produced.
6. **No temporal gates.** Nothing prevents "B started before A completed" except LLM judgment.
7. **No purging.** Abandoned tasks persist forever, becoming context poison on read.
8. **13 actions in one tool.** Models try wrong combos, fail, give up. (Validated by Gemini research on tool design.)

### 3.2 New Model: Delegation Communication Protocol

The task graph is not a todo list. It is the **communication channel** between:
- Coordinator and sub-agents (delegation protocol)
- AI and user (interactive status + commenting)
- Hooks and tools (enforcement backbone)

#### 3.2.1 Three-Level Hierarchy (retained, meaning changed)

```
WorkPlan (was Epic)     — user-facing goal, owned by coordinator
  └─ TaskNode           — atomic unit of delegation, owned by assigned agent
       └─ Checkpoint    — evidence marker, auto-populated by hooks
```

**WorkPlan** replaces Epic:
- Has `dependsOn: string[]` — cross-plan dependencies
- Has `planAhead: TaskNode[]` — future tasks visible before they start
- Has `acceptance: string[]` — success criteria (not just name)
- Lifecycle: `draft → active → completed → archived | abandoned`
- Abandoned plans are **purged on scan** (first session start = cron-like) from context injection
- Small chain-breaking TaskNodes are **archived immediately** when abandoned (broken `dependsOn` links poison context now, not later)
- Purged data stays on disk for audit — only removed from context injection

**TaskNode** replaces Task:
- Has `dependsOn: string[]` — intra-plan dependencies
- Has `temporalGate: { after: string; reason: string } | null` — "cannot start until X"
- Has `delegatedBy: string` — who assigned this (not optional)
- Has `expectedOutput: string` — what must be returned (required)
- Has `allowedTools: string[]` — scoped permissions for this delegation
- Has `artifacts: string[]` — files produced (auto-populated by write hook)
- Lifecycle: `planned → blocked → active → review → completed | failed`
- `blocked` status means dependencies not met — **enforced by hook**, not by LLM checking

**Checkpoint** replaces Subtask:
- Auto-populated by `tool.execute.after` when task is active
- Records: `{ tool, timestamp, summary, filesModified }`
- **Meaningful context only** — only write, edit, and significant bash (build/test/git) create checkpoints. Reads, greps, status checks are skipped. Filter: `CHECKPOINT_TOOLS = new Set(["write", "edit"])` + bash filtered by build/test/git patterns.
- No manual CRUD — hooks write these automatically
- Serves as evidence trail (replaces manual `evidence` string)

#### 3.2.2 Schema Design

```typescript
// schemas/work-plan.ts — new file
interface WorkPlan {
  id: string                          // "wp-{timestamp}-{counter}"
  name: string
  acceptance: string[]                // success criteria
  category: WorkStreamCategory
  governanceLevel: GovernanceLevel
  status: "draft" | "active" | "completed" | "archived" | "abandoned"
  dependsOn: string[]                 // other WorkPlan IDs
  ownedBy: string                     // agent name (coordinator)

  tasks: TaskNode[]                   // current work
  planAhead: TaskNode[]               // visible future work (status=planned)

  createdAt: number
  modifiedAt: number
  completedAt?: number
  purgedAt?: number                   // when abandoned + purged from context
}

interface TaskNode {
  id: string                          // "tn-{timestamp}-{counter}"
  workPlanId: string
  name: string
  expectedOutput: string              // required — what must be returned

  status: "planned" | "blocked" | "active" | "review" | "completed" | "failed"

  // Delegation protocol
  delegatedBy: string                 // agent who assigned this
  assignedTo: string                  // agent who executes this
  allowedTools: string[]              // scoped tool permissions

  // Dependencies
  dependsOn: string[]                 // other TaskNode IDs
  temporalGate: TemporalGate | null   // "cannot start until..."

  // Evidence (auto-populated)
  checkpoints: Checkpoint[]           // auto-written by hooks
  artifacts: string[]                 // file paths produced

  // Lifecycle
  createdAt: number
  modifiedAt: number
  startedAt?: number
  completedAt?: number

  // Result (filled on completion)
  result?: TaskResult
}

interface TemporalGate {
  afterTaskId: string                 // must complete first
  reason: string                      // why this ordering matters
  enforcedAt?: number                 // timestamp when gate was checked
}

interface Checkpoint {
  id: string
  taskNodeId: string
  tool: string                        // which tool fired
  timestamp: number
  summary: string                     // auto-generated from tool output
  filesModified: string[]             // captured from write/edit
}

interface TaskResult {
  evidence: string
  filesModified: string[]
  testsRun: string
  anchorsCreated: string[]
}

interface TaskGraph {
  version: string                     // "3.0.0"
  activeWorkPlanId: string | null
  workPlans: WorkPlan[]
}
```

#### 3.2.3 Key Behavioral Differences from Current

| Behavior | Current | New |
|----------|---------|-----|
| Coordinator reads tasks before acting | Suggested in agent profile | **Enforced by `chat.params` hook** — injects task status into every turn |
| Subtask creation | Manual `add_subtask` | **Auto-created as checkpoints** by `tool.execute.after` — meaningful context only (write/edit/build/test/git) |
| Task dependencies | None | **Temporal gates** block `start` action until dependencies met |
| Delegation enforcement | Text instruction only | **`allowedTools` enforced by tool-gate** per TaskNode |
| Abandoned work | Persists forever | **Two-tier purge**: scan on session start clears old abandoned plans; chain-breaking nodes archived immediately |
| Plan-ahead visibility | No concept | **`planAhead` array** shows future work before it starts |
| Evidence | Manual `evidence` string | **Checkpoint trail** auto-populated by hooks |
| Task status transition | Voluntary | **Hook-gated**: `blocked→active` only when deps met, `active→review` when checkpoints satisfy expectedOutput |

### 3.3 Tool Split (from 1 tool with 13 actions to 3 focused tools)

#### `govern_plan` — WorkPlan lifecycle (Coordinator only)

| Action | Purpose |
|--------|---------|
| `create` | New WorkPlan with name + acceptance criteria |
| `plan_tasks` | Add TaskNode(s) to tasks or planAhead |
| `status` | Full graph display |
| `archive` | Mark completed plan as archived |
| `abandon` | Mark failed plan as abandoned (triggers purge timer) |

5 actions. Coordinator-only (investigator/executor blocked via tool-gate).

#### `govern_task` — TaskNode lifecycle (All agents, scoped)

| Action | Purpose |
|--------|---------|
| `start` | Activate a planned task (checks temporal gates) |
| `complete` | Close task with result (checks checkpoints satisfy expectedOutput) |
| `fail` | Mark task as failed with reason |
| `review` | Request review (checkpoints shown) |
| `status` | Show current task + checkpoints |

5 actions. `start` is the bridge to tool-gate (same as today's `stateManager.setActiveTask()`).

#### `govern_delegate` — Delegation protocol (Coordinator only)

| Action | Purpose |
|--------|---------|
| `assign` | Create delegation: task → agent with scoped permissions |
| `recall` | Withdraw a delegation (abort subagent if possible via SDK) |
| `status` | Show delegation tree |

3 actions. Validates hierarchy, depth, category routing (existing `validateDelegation()` logic).

**Total: 13 actions → 3 tools with 5+5+3=13 actions.** Same capability, but each tool has a focused mental model. A coordinator never sees `complete` in the wrong tool. An executor never sees `create` WorkPlan options.

### 3.4 Delivery Classification

Not everything is a tool. The governance surface splits across 4 delivery mechanisms:

| Capability | Delivery | Rationale |
|------------|----------|-----------|
| WorkPlan CRUD | **Tool** (`govern_plan`) | Needs structured args, returns state |
| TaskNode lifecycle | **Tool** (`govern_task`) | Needs structured args, bridges to tool-gate |
| Delegation handoff | **Tool** (`govern_delegate`) | Needs structured args, creates record |
| Write gate enforcement | **Hook** (prompt injection) | Automatic, no user action |
| Shell gate enforcement | **Hook** (prompt injection) | Automatic, no user action |
| Task status before every turn | **Hook** (system.transform) | Automatic, enforces "read before act" |
| Checkpoint recording | **Hook** (tool.execute.after) | Automatic evidence trail |
| Temporal gate enforcement | **Hook** (tool.execute.before) | Blocks `start` when deps unmet |
| Context anchoring | **Tool** (`anchor`) | Needs structured args |
| Init scaffolding | **Command** (`/idumb:init`) | One-time user-triggered setup |
| Governance rules | **Skill** (agent profile) | Protocol instructions, not runtime tool |
| Delegation protocol | **Skill** (agent profile) | How to delegate, not what to delegate |
| Planning artifact lifecycle | **Skill** (Phase 2) | Protocol for artifact management |

### 3.5 Role-Specific Tool Chaining

Each agent sees a different tool surface:

**Coordinator** (`idumb-supreme-coordinator`):
```
govern_plan → govern_delegate → govern_task(status) → anchor
```
- CAN: create plans, delegate tasks, read status, create anchors
- CANNOT: start/complete tasks, write files, run shell commands
- Path restriction: reads `.idumb/brain/` only

**Investigator** (`idumb-investigator`):
```
govern_task(start, complete, status) → anchor → [innate: grep, read, glob]
```
- CAN: start/complete assigned tasks, create anchors, use innate search tools
- CANNOT: create plans, delegate, write source code
- Path restriction: writes `.idumb/brain/` only (anchors, brain entries)

**Executor** (`idumb-executor`):
```
govern_task(start, complete, status) → govern_shell → [innate: write, edit, bash]
```
- CAN: start/complete assigned tasks, run governed shell, write source code
- CANNOT: create plans, delegate, create anchors
- Path restriction: writes `src/**`, `tests/**`, `planning/**` — NOT `.idumb/brain/config.json`, NOT `agents/*.md`

### 3.6 Shadow Techniques

Shadow = describing WHY innate tools fail in the custom tool's description, so the model reaches for the right tool without being told.

**`govern_task` description:**
> "Check or advance your current task. Unlike the innate todo tool, this enforces temporal gates (tasks can't start before dependencies complete), auto-records checkpoints from your tool usage, and bridges to the write gate — without an active task from this tool, all write/edit calls are blocked."

**`govern_shell` description:**
> "Run shell commands with governance safety. Unlike innate bash, this blocks destructive operations (rm -rf, git push --force, DROP TABLE) and audits all commands to the active task's checkpoint trail. Use this for builds, tests, and git operations."

**`govern_delegate` description (coordinator only):**
> "Delegate a task to a sub-agent with scoped permissions. Unlike calling @agent directly, this creates a structured handoff with expected output, allowed tools, and temporal gates. The delegate's tool access is enforced — they literally cannot call tools outside their allowedTools list."

### 3.7 Instructive Error Design

Every error returns 4 components: **WHAT → WHY → USE INSTEAD → EVIDENCE**

```
GOVERNANCE BLOCK: write denied

WHAT: You tried to use "write" but task "tn-123" has status "blocked".
WHY: Task depends on "tn-122" (Database schema migration) which has status "active".
     Temporal gate: "Schema must be migrated before API endpoints can reference new tables."
USE INSTEAD: Wait for "tn-122" to complete, or ask the coordinator to adjust dependencies.
EVIDENCE: TaskNode tn-123.temporalGate.afterTaskId = "tn-122", tn-122.status = "active"
```

```
GOVERNANCE BLOCK: govern_task action=start denied

WHAT: You tried to start task "Build login form" but you are "idumb-investigator".
WHY: This task is assigned to "idumb-executor" (delegatedBy: idumb-supreme-coordinator).
USE INSTEAD: Report your findings and let the coordinator delegate execution to the executor.
EVIDENCE: TaskNode tn-456.assignedTo = "idumb-executor", your role = "idumb-investigator"
```

---

## 4. System 4: Hook Intelligence Engine

### 4.1 The Four Techniques (ranked by effectiveness)

#### Technique 1: Conditional Tool Interception (HIGHEST IMPACT)

**Current:** `tool.execute.before` checks: is this a write tool? → is there an active task? → block or allow.

**New:** Context-aware interception that reads the current task graph position and injects relevant governance context.

**Example flow:**
```
Agent calls write("src/auth/login.tsx", ...) →
Hook reads: current task = "tn-456: Build login form" (part of WorkPlan "wp-1: User Authentication") →
Hook checks: temporal gates? → "tn-455: Database schema" completed ✓ →
Hook checks: agent role matches assignedTo? → "idumb-executor" ✓ →
Hook checks: path within allowed scope? → "src/**" ✓ →
ALLOW + auto-record checkpoint:
  { tool: "write", summary: "Created login form component", filesModified: ["src/auth/login.tsx"] }
```

**When blocking, inject context:**
```xml
<idumb-governance>
BLOCKED: write to src/auth/login.tsx

CONTEXT: You are working on WorkPlan "User Authentication", task "Build login form".
This task depends on "Database schema migration" which is still active.

CHAIN STATUS:
  wp-1: User Authentication [active]
    tn-455: Database schema migration [active] ← BLOCKING
    tn-456: Build login form [blocked] ← YOUR TASK
    tn-457: Write auth tests [planned]

DRIFT WARNING: 0 anchors, 2 checkpoints recorded in this session.
POISONING LEVEL: low (3 tool outputs in context, 0 stale)
</idumb-governance>
```

**SDK hooks used:** `tool.execute.before` (VERIFIED), `tool.execute.after` (VERIFIED)

#### Technique 2: Inner Cycle Delegation Manipulation (HIGH IMPACT)

**Current:** Delegation produces a text instruction via `buildDelegationInstruction()`. No runtime enforcement on the delegate's side.

**New:** When `govern_delegate` assigns a task, the hook system:
1. Records the delegation in the TaskGraph (existing logic)
2. Scopes the delegate's `AGENT_TOOL_RULES` dynamically based on `TaskNode.allowedTools`
3. Uses `experimental.chat.system.transform` to inject delegation context into every turn of the delegate's session
4. Uses `session.children()` (if available) to track delegation tree depth

**Critical PP-01 constraint:** OpenCode subagent hooks don't fire on delegated sessions. Workaround options:
- **Option A (text-based, current):** Encode all governance in the delegation instruction text. Rely on LLM compliance.
- **Option B (hook-based, new):** If `session.children()` returns subagent session IDs, register those IDs in `stateManager` and apply tool-gate rules when those sessions invoke tools.
- **Option C (prompt-based):** Use `session.prompt({ noReply: true })` to inject governance rules into the subagent's context.

**Verification needed:** Whether `tool.execute.before` fires for subagent tool calls. If yes, Option B works. If not, fall back to Option A with enhanced instruction encoding.

**SDK hooks used:** `chat.params` (VERIFIED for agent capture), `experimental.chat.system.transform` (UNVERIFIED), `session.children()` (UNVERIFIED)

#### Technique 3: Compact + Last-Message Transform Coordination (MEDIUM IMPACT)

**Current:**
- Compaction injects anchors + active task (2000 char budget)
- DCP prunes tool outputs older than 10 most recent to 150 chars

**New enhancements:**
- Compaction injects the **full active chain** (WorkPlan → active TaskNode → recent checkpoints), not just task name
- DCP prunes based on **task relevance** — outputs from completed/abandoned tasks get pruned first
- **Timing coordination:** Last-message transform should NOT fire immediately before compaction (let compaction handle it). Add a "compaction pending" flag to prevent conflict.

**Enhanced compaction context:**
```
=== iDumb Governance Context (post-compaction) ===

ACTIVE WORK:
  WorkPlan: "User Authentication" (3/7 tasks done)
  Current Task: "Build login form" (assigned to idumb-executor)
  Recent Checkpoints:
    - [12:34] write: Created src/auth/login.tsx
    - [12:31] bash: npm test (4 passed, 0 failed)
  Next Task: "Write auth tests" (blocked until current completes)

CRITICAL ANCHORS (2):
  - [CRITICAL/decision] Using JWT tokens, not sessions — per user requirement R-003
  - [CRITICAL/context] Database uses Neon PostgreSQL — connection string in .env.local

RULES:
  - Do not write/edit without an active task
  - Complete current task before starting next
  - Report completion to coordinator via govern_task action=complete
```

**SDK hooks used:** `experimental.session.compacting` (UNVERIFIED), `experimental.chat.messages.transform` (UNVERIFIED)

#### Technique 4: Background + Ongoing Delegation (LOWER IMPACT — SDK-dependent)

**Current:** No background delegation concept.

**New:** 3-level delegation combining synchronous and background agents:
- Level 0 (coordinator): Always foreground, drives the conversation
- Level 1 (investigator/executor): Foreground when user is engaged, background for async work
- Level 2 (sub-delegation): Always background

**Requires:** `session.children()` + `session.abort()` + event.subscribe() — all UNVERIFIED.

**Recommendation:** Defer to Phase 1c. Focus Phase 1a on Techniques 1+2 which work on verified hooks.

### 4.2 SDK Verification Matrix

| API | Purpose | Verified? | Phase |
|-----|---------|-----------|-------|
| `tool.execute.before` | Write gate, temporal gates, agent scope | YES | 1a |
| `tool.execute.after` | Checkpoint auto-recording, defense-in-depth | YES | 1a |
| `chat.params` | Agent name capture, auto-task-assign | YES | 1a |
| `event` (basic) | Event logging | YES | 1a |
| `experimental.chat.system.transform` | Task status injection every turn | **UNVERIFIED** | 1b |
| `experimental.chat.messages.transform` | DCP + task-aware pruning | **UNVERIFIED** | 1b |
| `experimental.session.compacting` | Enhanced compaction with chain context | **UNVERIFIED** | 1b |
| `client.session.children()` | Delegation tree tracking | **UNVERIFIED** | 1c |
| `client.session.prompt()` | Context injection to subagents | **UNVERIFIED** | 1c |
| `client.session.abort()` | Delegation recall | **UNVERIFIED** | 1c |
| `client.tui.showToast()` | Non-blocking governance notifications | **UNVERIFIED** | 1c |
| `client.event.subscribe()` | Real-time event streaming | **UNVERIFIED** | 1c |

### 4.3 Hook Enhancement Map

| Hook | Current LOC | Current Behavior | New Behavior |
|------|-------------|-----------------|-------------|
| `tool-gate.ts` (before) | 277 | Check active task, agent scope | + temporal gates, + checkpoint auto-record, + per-TaskNode `allowedTools`, + context-aware block messages |
| `tool-gate.ts` (after) | 277 (same file) | Defense-in-depth fallback | + auto-record checkpoint on every write/edit/bash |
| `system.ts` | 68 | Inject task name + 3 anchors | + inject full active chain, + plan-ahead visibility, + delegation context, + drift/poisoning warnings |
| `compaction.ts` | 103 | Inject anchors + task name | + inject chain (WorkPlan → TaskNode → checkpoints), + purge abandoned plan context |
| `message-transform.ts` | 123 | DCP: prune old tool outputs | + task-aware pruning (completed task outputs first), + timing coordination with compaction |
| `chat.params` (in index.ts) | ~10 | Capture agent name | + enforce "coordinator must read task status before any action" |

---

## 5. Tool Architecture Summary

### 5.1 Final Tool Set (Phase 1)

| Tool | Group | Actions | Agents | Delivery |
|------|-------|---------|--------|----------|
| `govern_plan` | GOVERN | create, plan_tasks, status, archive, abandon | Coordinator | Tool |
| `govern_task` | GOVERN | start, complete, fail, review, status | All (scoped) | Tool |
| `govern_delegate` | GOVERN | assign, recall, status | Coordinator | Tool |
| `govern_shell` | GOVERN | (single action: run) | Executor | Tool |
| `anchor` | CONTEXT | create, list | All | Tool |
| `govern_init` | BOOTSTRAP | (single action: init) | None (CLI) | Command |

**6 tools, 18 actions total.** Down from 9 tools, ~30+ actions.

### 5.2 Killed Tools (replaced by innate + hooks)

| Killed Tool | Replacement |
|-------------|-------------|
| `idumb_scan` | Innate grep/find + SDK `client.find.text()` |
| `idumb_codemap` | Innate grep + SDK `client.find.symbols()` (Phase 1c) |
| `idumb_read` | Innate read (entity annotation via system.transform hook if needed) |
| `idumb_webfetch` | Innate fetch + MCP tools |
| `idumb_write` | Innate write (governance via tool-gate hook, not wrapper tool) |
| `idumb_bash` | Replaced by `govern_shell` (thinner, focused on safety) |

### 5.3 What Hooks Replace (previously tool responsibilities)

| Was Tool Responsibility | Now Hook Responsibility |
|------------------------|----------------------|
| `idumb_write` schema validation | `tool.execute.before` validates path scope |
| `idumb_write` entity annotation | `system.transform` injects entity context |
| `idumb_write` chain integrity | `tool.execute.before` checks temporal gates |
| `idumb_read` entity decoration | `system.transform` injects relevant context |
| `idumb_bash` ROLE_PERMISSIONS | `govern_shell` tool (simplified) |
| `task.ts` checkpoint recording | `tool.execute.after` auto-records |
| `task.ts` stale detection | `system.transform` injects warnings |
| `task.ts` chain-break detection | `system.transform` injects warnings |

---

## 6. Phase Plan

### Phase 1a: Core Task Graph + Verified Hooks (1-2 sessions)

**Goal:** Replace Epic-Task-Subtask with WorkPlan-TaskNode-Checkpoint. Wire to verified hooks.

**Tasks:**
1. Create `schemas/work-plan.ts` with new data model
2. Create `schemas/task-graph.ts` with store, factory, lookup, validation helpers
3. Create `tools/govern-plan.ts` (5 actions, coordinator-only)
4. Create `tools/govern-task.ts` (5 actions, all agents scoped)
5. Create `tools/govern-delegate.ts` (3 actions, coordinator-only)
6. Simplify `tools/bash.ts` → `tools/govern-shell.ts` (single `run` action)
7. Enhance `tool-gate.ts`:
   - Add temporal gate enforcement on `govern_task start`
   - Add per-TaskNode `allowedTools` enforcement
   - Add checkpoint auto-recording in `after` hook
8. Update `AGENT_TOOL_RULES` for new tool names
9. Update `index.ts` to wire new tools
10. Kill: `scan.ts`, `codemap.ts`, `read.ts`, `webfetch.ts`, `write.ts`
11. Migrate tests: update all 8 test suites for new tool names/schemas
12. Update `AGENTS.md` ground truth

**Verification gate:** `npm run typecheck` clean, `npm test` passes (new baseline), 3 tools work in manual OpenCode test.

### Phase 1b: Experimental Hook Enhancement (1 session)

**Goal:** Verify and enhance the 3 experimental hooks.

**Tasks:**
1. Verify `experimental.chat.system.transform` fires in live OpenCode
2. If verified: enhance `system.ts` to inject full active chain + plan-ahead + drift warnings
3. Verify `experimental.session.compacting` fires in live OpenCode
4. If verified: enhance `compaction.ts` to inject WorkPlan → TaskNode → checkpoints chain
5. Verify `experimental.chat.messages.transform` fires in live OpenCode
6. If verified: add task-aware DCP pruning (completed task outputs first)
7. Add timing coordination flag between message-transform and compaction

**Verification gate:** Each hook tested in live OpenCode with logging. If unverified, document and skip (graceful degradation already works).

### Phase 1c: SDK Client Integration (1 session)

**Goal:** Wire unused SDK client APIs.

**Tasks:**
1. Destructure `client` in `index.ts` plugin factory
2. Wire `client.tui.showToast()` for governance notifications
3. Wire `client.app.log()` as logging backend option
4. Test `client.session.children()` for delegation tree tracking
5. Test `client.session.prompt({ noReply: true })` for subagent context injection
6. If session APIs work: implement Technique 2 (inner cycle delegation) with runtime enforcement

**Verification gate:** At least `showToast` + `app.log` working. Session APIs documented as verified/unverified.

---

## 7. Deferred Systems

### System 2: Living Planning Artifacts (Phase 2+)

Foundation exists in `planning-registry.ts` (730 LOC):
- Chain staleness by position (not time)
- Section-level content hashing
- Cross-entity linking (task ↔ artifact ↔ brain-entry)
- Outlier detection

Missing: automated lifecycle callers (`supersedSection`, `markSectionStale`), dashboard GUI for commenting, artifact purging integration with TaskGraph.

Connect to TaskGraph via `TaskNode.artifacts[]` → registry chain tracking.

### System 3: Tech Stack Knowledge Base (Phase 2+)

Greenfield. Will use:
- AST analysis via `oxc-parser` (3.6 MB, native+WASM, ESTree output) for code intelligence
- `@ast-grep/napi` as alternative (7 MB, excellent pattern API)
- SDK `client.find.symbols()` for LSP-powered symbol search
- Planning registry as the linking layer (artifacts ↔ tech decisions ↔ requirements)

The enforcement model: tech decisions are nodes in the planning registry with `dependsOn` links to requirements. An implementor cannot start a task whose linked tech decisions have `status: "unresolved"`.

---

## 8. Migration Path

### What Breaks

1. **All test suites** — tool names change, schema shapes change
2. **`tasks.json` format** — Epic-Task-Subtask → WorkPlan-TaskNode-Checkpoint
3. **Agent templates** — tool references change in `templates.ts`
4. **`AGENT_TOOL_RULES`** — new tool names
5. **`stateManager` API** — new persistence methods for TaskGraph

### Migration Strategy

1. Add `migrateTaskStoreV2ToV3()` in new schema file (like existing `migrateTaskStore()`)
2. Dual-write period: old task.ts exports coexist during test migration
3. Feature flag: `config.json` → `useTaskGraph: true` (default false initially)
4. Once all tests pass on new model, remove old code and flip default

### What Doesn't Break

- Compaction hook (additive enhancement)
- System hook (additive enhancement)
- Message transform (additive enhancement)
- Anchor schema (unchanged)
- Delegation validation logic (reused, integrated into govern_delegate)
- Tool-gate write blocking (same bridge mechanism, new state source)

---

## 9. Open Questions

1. **PP-01 subagent hooks:** Does `tool.execute.before` fire for subagent sessions? This determines whether delegation enforcement is runtime (Option B) or text-only (Option A). Must verify empirically.

2. **TaskNode.allowedTools enforcement timing:** Should tool-gate check `allowedTools` per-task on every tool call? This adds a state lookup to the hot path. Alternative: check only on `govern_task start` and cache for the session.

3. ~~**Checkpoint granularity**~~ **RESOLVED:** Only record checkpoints that form meaningful context — writes, edits, builds, test runs. Skip reads, greps, status checks, and exploratory tool calls. Filter in `tool.execute.after`: `CHECKPOINT_TOOLS = new Set(["write", "edit", "bash"])` where bash is further filtered to build/test/git commands only.

4. ~~**WorkPlan purge timing**~~ **RESOLVED:** Two-tier strategy:
   - **Scan-based purge:** Runs on first session start (like a cron). Scans for abandoned WorkPlans older than threshold, purges from context injection (data stays on disk for audit).
   - **Immediate archive for chain-breakers:** If a small unit (story-level TaskNode) is abandoned and it breaks a dependency chain (`dependsOn` links become dangling), archive it immediately. Don't wait for scan — broken chains poison context now, not later.

5. **Dashboard integration:** System 1 data model must support the dashboard (Phase 2). Should `TaskGraph` include a `toJSON()` that the dashboard API can serve directly, or should the dashboard have its own projection?
