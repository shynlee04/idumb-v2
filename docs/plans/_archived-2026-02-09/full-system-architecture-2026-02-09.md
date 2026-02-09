# iDumb v2 — Full System Architecture (Enriched)
# Date: 2026-02-09
# Source: Mind map + user enrichment on task→artifact→wiki relationships

## The Central Flow: Tasks → Sessions → Artifacts → Knowledge

```
User Request
    │
    ▼
┌─────────────────────────────────┐
│  idumb-supreme-coordinator      │
│  (Agents Team Workflow Mgmt)    │
│                                 │
│  Wrapped Framework (BMAD/GSD)   │
│  3-Level Delegation Hierarchy   │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│  DECISION GATE:                 │
│  "What kind of work is this?"   │
│                                 │
│  ┌─ A: Bug Fix / Patch         │
│  │     → Short Action Plan      │
│  │     → Direct to Repo Wiki    │
│  │     → NO tier documents      │
│  │                              │
│  ├─ B: User Request / Install   │
│  │     → No Artifact            │
│  │     → Session logged only    │
│  │     → No planning artifacts  │
│  │                              │
│  └─ C: Feature / Phase Work     │
│        → Giant Action Plan      │
│        → Nested sub-plans       │
│        → Tier 1/2/3 documents   │
│        → Code changes → Wiki    │
│        → Full planning artifact │
│           chain                 │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│  Action Planning & Triggering   │
│                                 │
│  ┌───────────┐  ┌────────────┐  │
│  │ Action    │  │ To-Do List │  │
│  │ Plan      │  │ (Tasks)    │  │
│  │           │  │            │  │
│  │ Phases    │  │ quick_start│  │
│  │  └─Tasks  │  │ parallel   │  │
│  │    └─Subs │  │ complete   │  │
│  └─────┬─────┘  └─────┬──────┘  │
│        │              │          │
│        └──── LINKED ──┘          │
│        (every task points to     │
│         its planning artifact)   │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│  Session Workflow Execution     │
│                                 │
│  Session 1 ──→ Implemented ✓   │
│  Session 2 ──→ In Progress      │
│  Session 3 ──→ Canceled ✗       │
│  Session N ──→ Not Triggered    │
│                                 │
│  Each session tracks:           │
│  - Which agent ran              │
│  - What tasks were active       │
│  - What code changed            │
│  - What artifacts were spawned  │
│  - Delegation depth (0/1/2/3)   │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│  Artifacts + Documents                                  │
│                                                         │
│  Action Blocks ──→ Triggered (code changes happen)      │
│       │                                                 │
│       ▼                                                 │
│  Chained ──→ Sequential execution order                 │
│       │                                                 │
│       ▼                                                 │
│  Tiered Data:                                           │
│  ┌──────────────────────────────────────────────┐       │
│  │ Tier 1: Architecture / Critical Decisions     │       │
│  │   → Always persisted, highest priority        │       │
│  │   → Survives compaction                       │       │
│  │                                               │       │
│  │ Tier 2: Implementation / Working Docs         │       │
│  │   → Phase-scoped, moderate priority           │       │
│  │   → Pruned after phase completion             │       │
│  │                                               │       │
│  │ Tier 3: Reference / Session Logs              │       │
│  │   → Auto-generated, low priority              │       │
│  │   → Purged by staleness (48h+)                │       │
│  └──────────────────────────────────────────────┘       │
│       │                                                 │
│       ▼                                                 │
│  Repo Wiki (Code Changes Sequentially)                  │
│  - Every code change → wiki entry with source citations │
│  - Follows legacy-repo knowledge model pattern          │
│  - Entity per system, typed relationships               │
│  - Section sources with file:line attribution            │
└─────────────────────────────────────────────────────────┘
```

## The Task → Artifact Relationship Chain

### Planning Artifacts Are LIVING Relational Entities

Planning artifacts are NOT static documents. They are living entities that:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PLANNING ARTIFACT LIFECYCLE                                                 │
│                                                                              │
│  1. SHORT ARTIFACT (Type A — bug fix, patch)                                │
│     Created → single session → story-based → flows to wiki → DONE           │
│     No tier document. Direct to repo wiki with citations.                    │
│     Example: "Fix login timeout" → patch → wiki entry                       │
│                                                                              │
│  2. NO ARTIFACT (Type B — installation, setup)                              │
│     Session-only. Nothing spawned. No planning trace.                       │
│     Example: "Install shadcn/ui" → session log only                         │
│                                                                              │
│  3. LONG-HAUL ARTIFACT (Type C — feature, phase work)                       │
│     Created → appends phases → nested sub-artifacts → relational cascade    │
│     KEEPS GROWING as work progresses across sessions and workflows.         │
│     Is relational WITHIN ITSELF (phases reference each other).              │
│     Is relational WITH OTHER ARTIFACTS (changes cascade across).            │
│     Example: "Implement Auth System" → research → stories → implementation  │
│              → new phases appended → wiki entries per code change            │
│              → artifact itself tracks which sessions, agents, workflows      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Artifact as Context Trajectory

Agents traverse the artifact as a trajectory — forward into sub-phases,
backward to review decisions, sideways to check related artifacts:

```
Long-Haul Artifact: "Auth System Implementation"
│
├── Phase 1: Research (completed, Session s-001)
│   ├── Research Synthesis A: "OAuth2 providers comparison"
│   ├── Research Synthesis B: "JWT vs session tokens"
│   └── Decision: "Use JWT with refresh tokens"
│       └── Anchor: decision type, Tier 1 (survives compaction)
│
├── Phase 2: Stories (completed, Session s-002)
│   ├── Story 2.1: "JWT middleware" → COMPLETED → Wiki entry
│   ├── Story 2.2: "Refresh token rotation" → COMPLETED → Wiki entry
│   └── Story 2.3: "Rate limiting" → BLOCKED by 2.2
│
├── Phase 3: Implementation (active, Session s-003 + s-004)
│   ├── Tasks from Story 2.1 → @idumb-executor
│   ├── Tasks from Story 2.2 → @idumb-executor (after 2.1)
│   └── [APPENDING — new phases added as work reveals scope]
│
└── Cross-Artifact Relations:
    ├── CAUSED UPDATE TO: "API docs artifact" (new auth endpoints documented)
    ├── DEPENDS ON: "Database schema artifact" (users table)
    └── SUPERSEDES: "Old auth spike artifact" (from 2 weeks ago, now stale)
```

### Chain-Breaking + Time-to-Stale Interaction

Timestamps at all levels enable coherent lifecycle management:

```
Chain-Break Detection:
  If a series of Tier 3 documents (stories) form an epic,
  and one has newer timestamp but earlier ID/ordering,
  → TRIGGER INVESTIGATION for concept purging.
  → Is this a late addition? A correction? Or stale data?

Time-to-Stale Enforcement:
  Every artifact, document, and code change carries timestamps.
  Time-to-stale is enforced:
  - AUTOMATICALLY: hooks stamp outputs on every tool call
  - AT RUNTIME: agents timestamp their artifacts when creating
  - ON COMPLETION: wiki entries timestamped from checkpoint data

Staleness × Chain-Breaking:
  - Stale anchor + broken dependency chain → auto-purge candidate
  - Fresh anchor + intact chain → preserved and injected
  - Stale Tier 3 doc + all children completed → archive candidate
  - Fresh Tier 1 decision + any chain state → ALWAYS preserved
```

### Rule 1: Every task LINKS to its planning artifact

```
Task "Implement JWT auth"
  ├── artifact_ref: "plans/auth-feature-2026-02-09.md"  (Tier 2)
  ├── parent_plan: "Feature: User Authentication"
  ├── spawned_by: Session s-001
  ├── delegated_to: idumb-executor (depth 1)
  └── wiki_entries: []  (populated on code changes)
```

### Rule 2: Artifact spawn decision happens at task CREATION

```
tasks_quick_start name="Fix login bug"
  → classifier detects: "bug fix" (keyword + small scope)
  → decision: SHORT ACTION PLAN
  → artifact_tier: null (no tier doc)
  → wiki_target: "repo-wiki/patches/"
  → on_complete: auto-generate wiki entry from evidence + git diff

tasks_quick_start name="Implement OAuth2 provider"
  → classifier detects: "feature" (new capability + multi-file)
  → decision: FULL WORKFLOW
  → artifact_tier: 2 (implementation doc)
  → spawns: action plan with nested phases
  → on_complete: promote to Tier 1 if architectural, wiki entry for code changes

tasks_quick_start name="Install shadcn/ui"
  → classifier detects: "installation" (dependency add, no architecture)
  → decision: NO ARTIFACT
  → artifact_tier: null
  → wiki_target: null
  → session_log_only: true
```

### Rule 3: Code changes flow SEQUENTIALLY to wiki

```
Session executes Task "Implement JWT auth"
  │
  ├── write: src/auth/jwt.ts (new file)
  │   → Checkpoint recorded in TaskNode
  │   → Wiki queue: { file: "src/auth/jwt.ts", action: "created", session: "s-001" }
  │
  ├── edit: src/middleware/auth.ts (modified)
  │   → Checkpoint recorded
  │   → Wiki queue: { file: "src/middleware/auth.ts", action: "modified", session: "s-001" }
  │
  ├── complete: evidence="JWT middleware works, tests pass"
  │   → Task marked completed
  │   → Wiki entries generated from checkpoint queue
  │   → Each entry has: file path, change summary, source citations, session ref
  │
  └── Wiki output (follows legacy-repo pattern):
      ┌──────────────────────────────────────────┐
      │ # JWT Authentication                      │
      │                                            │
      │ <cite>                                     │
      │ - [jwt.ts](file://src/auth/jwt.ts)         │
      │ - [auth.ts](file://src/middleware/auth.ts)  │
      │ </cite>                                    │
      │                                            │
      │ ## Implementation                          │
      │ ...                                        │
      │ **Section sources**                        │
      │ - [jwt.ts](file://src/auth/jwt.ts#L1-L45)  │
      └──────────────────────────────────────────┘
```

## The 3-Level Delegation Loop (Coordinator Perspective)

```
LEVEL 0: idumb-supreme-coordinator
│
│  Reads: user request, brain state, existing plans
│  Decides: classification (A/B/C), delegation target, artifact strategy
│  Creates: tasks + action plan + artifact links
│
│  ┌─────────────────────────────────────────────┐
│  │ DELEGATION LOOP (per task or task batch)     │
│  │                                              │
│  │  1. Create tasks (tasks_quick_start/parallel)│
│  │  2. Link to planning artifact                │
│  │  3. Delegate via @idumb-investigator or      │
│  │     @idumb-executor                          │
│  │  4. Monitor: tasks_status                    │
│  │  5. On complete: check progress, next task   │
│  │  6. On fail: re-delegate or adjust plan      │
│  │  7. Loop until all tasks done                │
│  └──────────────┬──────────────────────────────┘
│                 │
▼                 ▼
LEVEL 1: idumb-investigator          LEVEL 1: idumb-executor
│                                    │
│  Research, analysis, planning      │  Implementation, builds, tests
│  Reads code, reads brain           │  Writes code, runs tests
│  Produces: research findings,      │  Produces: code changes,
│    architecture decisions,         │    test results, evidence
│    implementation plans            │
│                                    │
│  Can sub-delegate (depth 2):      │  Can sub-delegate (depth 2):
│  └─ @idumb-executor for           │  └─ (rare — executor is leaf)
│     prototype/validation           │
│                                    │
│  Outputs:                          │  Outputs:
│  - plans_learn (brain entry)       │  - tasks_complete (evidence)
│  - plans_anchor (decision)         │  - Checkpoints (auto from hooks)
│  - tasks_complete (findings)       │  - Wiki entries (auto from code)
│                                    │
LEVEL 2: (sub-delegation, max)       LEVEL 2: (sub-delegation, max)
  └─ Executor validates research     └─ (not typical)
```

## Coherent Knowledge: What Gets Recorded

The brain must answer: "What happened, by whom, in what workflow, through which sessions?"

```
Coherent Knowledge Entry:
{
  // WHAT was done
  action: "Implemented JWT authentication middleware",
  task_id: "t-042",
  plan_id: "wp-007",

  // WHO did it
  agent: "idumb-executor",
  delegated_by: "idumb-supreme-coordinator",
  delegation_depth: 1,

  // WHICH workflow
  workflow: "feature-implementation",
  phase: "Phase 3: Auth System",
  session_id: "s-001",

  // WHAT artifacts
  planning_artifact: "plans/auth-feature-2026-02-09.md",
  tier: 2,
  wiki_entries: ["wiki/jwt-auth.md"],
  code_changes: [
    { file: "src/auth/jwt.ts", action: "created", lines: 45 },
    { file: "src/middleware/auth.ts", action: "modified", lines_changed: 12 }
  ],

  // WHEN (for staleness/lifecycle)
  created_at: "2026-02-09T14:30:00Z",
  completed_at: "2026-02-09T15:45:00Z",
  stale_after: "2026-02-16T15:45:00Z"  // 7 days
}
```

## Tool Superiority Principle: Why Agents PREFER These Tools

### The Problem with "Gate" Tools
If agents treat `idumb_tasks` and `idumb_plans` as mandatory checkpoints to pass through,
they'll resist them. Tools must be **utility-driven**: agents should PREFER them over
OpenCode's innate todo/planning because they provide MORE information and BETTER guidance.

### How Superiority Works: Role-Aware Branching + Situational Navigation

At every level of the agent hierarchy, calling `status` returns a **role-specific view**
that answers 4 questions innate tools cannot:

```
┌─────────────────────────────────────────────────────────────────────┐
│  4 QUESTIONS EVERY STATUS CALL ANSWERS                              │
│                                                                     │
│  1. WHERE AM I?    — Position in plan hierarchy (plan > task > sub) │
│  2. WHAT'S UP?     — Current state (active, blocked, reviewing)     │
│  3. WHAT'S NEXT?   — Next task in dependency order, with context    │
│  4. WHO'S NEXT?    — Which agent collaborates next, with hint       │
└─────────────────────────────────────────────────────────────────────┘
```

### Role-Aware Output Examples

**Coordinator calls `idumb_tasks status`:**
```
📋 PROJECT STATUS — Coordinator View
Plan: "Feature: User Auth" (3/5 tasks complete)

YOUR NEXT ACTION:
  → Delegate task "Implement JWT middleware" to @idumb-executor
  → Task has 0 blockers, ready to start

TEAM STATUS:
  🟢 @idumb-investigator: completed "Research auth providers" (2h ago)
  ⏳ @idumb-executor: idle, available for delegation

ARTIFACTS:
  → Plan: plans/auth-feature-2026-02-09.md (Tier 2)
  → 2 wiki entries generated from completed tasks
```

**Executor calls `idumb_tasks status`:**
```
📋 ACTIVE WORK — Executor View
Task: "Implement JWT middleware" (active)
Plan: "Feature: User Auth" (3/5 tasks complete)

YOUR WORK:
  ✅ 2 checkpoints recorded (jwt.ts created, auth.ts modified)
  ⏳ No test evidence yet

⚠️ LAST TASK IN YOUR BRANCH
  → Run validation/tests before completing
  → Complete with: idumb_tasks complete evidence="tests pass, JWT works"
  → After this: @idumb-supreme-coordinator will review plan progress
```

**Investigator calls `idumb_tasks status`:**
```
📋 RESEARCH STATUS — Investigator View
Task: "Research OAuth2 providers" (active)
Plan: "Feature: User Auth" (1/5 tasks complete)

YOUR WORK:
  ⏳ No anchors or brain entries recorded yet

WHAT'S NEXT:
  → Capture findings: idumb_plans anchor type="decision" content="..."
  → Record knowledge: idumb_plans learn type="research" title="..."
  → Complete with: idumb_tasks complete evidence="findings documented"
  → After this: @idumb-supreme-coordinator assigns implementation tasks
```

### Branch-Awareness: The "Last Node" Pattern

Each agent has a **branch** of tasks — their assigned work within the plan.
The tool tracks which tasks belong to which agent and proactively tells them:

```
Branch Detection Logic:
  1. Find all tasks assigned to the calling agent
  2. Count remaining (non-completed) tasks in this branch
  3. If remaining == 1 (last task):
     → Add validation reminder: "Run tests before completing"
     → Show handoff target: "After this: @coordinator reviews"
  4. If remaining == 0 (all done):
     → Show: "Your branch is complete. Awaiting coordinator review."
```

### Cross-Tool Linking

Tasks and plans always reference each other:
- `idumb_tasks status` → shows plan artifact link, phase context
- `idumb_plans status` → shows task progress, active agents, completion %
- `idumb_tasks complete` → updates plan artifact, triggers wiki queue
- `idumb_plans anchor` → links to active task if present

This bidirectional linking means agents never lose context about
WHERE their work fits in the larger plan.

### Granularity: "Must Load" Framework

`idumb_tasks` is the FIRST tool any agent loads — not because it's mandatory, but because
of how it APPEARS. It adapts output to the complexity of the current state:

```
NONE-PLAN (Type B — install, help, no code changes):
  quick_start creates a standalone task — NO WorkPlan wrapper noise.
  Output: "Task: X. Status: active. You can write."
  Agent sees: simple, clean, minimal. No hierarchy overhead.

SINGLE BRANCH (Type A — bug fix, patch):
  quick_start creates lightweight plan + 1 task.
  Output: "Plan: Fix X. 1 task. Active. Complete when done."
  Agent sees: still simple, with just enough structure.

FULL HIERARCHY (Type C — feature, PRD, phase work):
  Coordinator creates OUTER FRAME FIRST (1-2 main tasks with sub-branches).
  Inner tasks fill in as executor works — top-down hierarchy.
  Output: "Plan: Feature Y. Phase 1: 3 tasks. Phase 2: pending. [expand]"
  Agent sees: clear shape of work, even before details exist.
```

The hierarchy forms TOP-DOWN from the start:
1. Coordinator reads PRD → outer frame (main tasks, dependencies)
2. After 1-2 main tasks with sub-todos → spawns a plan
3. Inner details branch from outer tasks as work progresses
4. Each status call shows the SHAPE — what's done, what's next, what's blocked

Even a single branch or none-plan uses `idumb_tasks` easily because the output
scales with the work — no ceremony for small jobs, rich guidance for big ones.

## How the 3 Tools Map to the Mind Map

### Tool 1: `idumb_tasks` — Action Planning & Triggering node

```
idumb_tasks (multi-export from src/tools/tasks.ts)
│
├── quick_start
│   ├── Creates task + auto-classifies (A/B/C)
│   ├── Sets artifact_tier based on classification
│   ├── Links to parent plan (auto-creates if needed)
│   ├── Unlocks writes for the session
│   └── Returns: task ID + classification + "writes unlocked"
│
├── parallel
│   ├── Creates N tasks with dependency graph
│   ├── Each task independently classified
│   ├── Temporal gates between dependent tasks
│   └── Returns: task IDs + dependency visualization
│
├── complete
│   ├── Records evidence
│   ├── Triggers wiki entry generation (if code changed)
│   ├── Updates planning artifact status
│   ├── Locks writes for the session
│   ├── Unblocks dependent tasks
│   └── Returns: progress + next task suggestion
│
├── fail
│   ├── Records failure reason
│   ├── Blocks dependent tasks
│   ├── Notifies coordinator (via coherent knowledge)
│   └── Returns: blocked tasks + suggested recovery
│
└── status
    ├── Active task + checkpoints
    ├── Plan progress (X/Y tasks)
    ├── Delegation chain
    ├── Artifact links
    └── Returns: full governance state
```

### Tool 2: `idumb_plans` — Artifacts + Documents + Brain nodes

```
idumb_plans (multi-export from src/tools/plans.ts)
│
├── anchor
│   ├── Save context that survives compaction
│   ├── Tier 1 by default (critical decisions)
│   ├── Links to active task if present
│   └── Consumed by: compaction hook, system hook
│
├── learn
│   ├── Record domain/architecture knowledge
│   ├── Auto-links to session + task context
│   ├── Typed: architecture/decision/pattern/convention/gotcha
│   ├── Confidence scoring + time decay
│   └── Consumed by: system hook (future), wiki generation
│
├── phase
│   ├── Advance project phase (MASTER-PLAN tracking)
│   ├── Auto-archives completed phase artifacts
│   ├── Triggers staleness sweep on old phase data
│   └── Returns: phase progress + next phase
│
└── status
    ├── Current phase + progress
    ├── Brain entry count by type
    ├── Active anchors (with staleness)
    ├── Artifact inventory (by tier)
    └── Wiki entry count
```

### Tool 3: `idumb_hive_mind` — Memory + Context + Session Intelligence

> **STATUS: FRAMED** — built together with tasks + plans, tested as a unit.
> The hive mind is the MEMORY LAYER that makes the other 2 tools coherent.

```
idumb_hive_mind (multi-export from src/tools/hive-mind.ts)
│
├── recall
│   ├── What happened? — across sessions, agents, workflows
│   ├── Pulls from: .idumb/brain/sessions/<session_id>.json (exported session files)
│   │   + brain store, wiki store, knowledge store
│   ├── Auto-chains: task → session → agent → artifact → code changes
│   ├── Filters by: agent role, time range, task scope, artifact tier
│   ├── Traces back to specific points in session history (not full replay)
│   └── Returns: contextualized memory relevant to the caller's current work
│
├── orient
│   ├── Where am I? — session trajectory, agent position, plan context
│   ├── READS FROM: .idumb/brain/sessions/ (persisted session brain files)
│   ├── SDK fallback: session.get, session.messages, path.get (if file stale)
│   ├── Loads context into session brain FIRST, then tells agent what to do
│   ├── Detects: illogical sequences, stale references, orphan tasks
│   └── Returns: oriented context + "you were doing X, next is Y"
│
├── clean
│   ├── Context janitor — sweep stale, flag illogical, purge orphans
│   ├── Staleness rules: anchors 48h, brain 7d, delegations 30m, Tier 3 7d
│   ├── Chain-break detection: newer-time + earlier-ID → investigate
│   ├── Cross-references: brain entries vs active tasks vs plan state
│   ├── Purges expired session files from .idumb/brain/sessions/
│   └── Returns: cleanup report + items purged/flagged
│
└── status
    ├── Memory health: brain entries by type, staleness distribution
    ├── Session trajectory: which sessions touched which tasks
    ├── Context coherence score: how well-linked is the current state
    ├── Session brain file count + total size + freshness
    ├── Stale/orphan warnings
    └── Returns: hive mind health report
```

### Session Brain Architecture: Export → Persist → Load

Session data is **NOT injected directly into live sessions**. Instead:

```
DURING SESSION (hooks auto-export):
  chat.params hook → captures agent identity, task state
  tool.execute.after → captures tool usage, checkpoints
  session.compacting → captures compaction event
       │
       ▼
  EXPORTED TO: .idumb/brain/sessions/<session_id>.json
  Each session gets its own trajectory file — a NETWORK of linked entities:
  {
    sessionId, agent, startedAt, lastActivity,
    taskTree: [                          // hierarchical, not flat
      { taskId, parentId, name, status, children: [
        { taskId, parentId, name, status, children: [...] }
      ]}
    ],
    phases: [{ phaseId, tasks: [...taskIds], status }],
    toolsUsed: [...],
    anchorsCreated: [...],
    checkpoints: [...],
    agentSequence: ["coordinator", "executor", ...],
    delegationChain: [{ from, to, task, at }],
    artifactLinks: [{ type, id, tier }]  // plans, wikis, brain entries
  }

  Complete session = NETWORK:
  outer tasks → branch into inner children (tree)
  phases → link to their tasks (graph)
  tasks → link to artifacts, sessions, delegations (network)
  ALL auto-exported — no ceremony

WHEN AGENT NEEDS CONTEXT (pull-based):
  1. Agent calls hive_mind orient → reads session brain files
  2. Or: prompt/command loads context from session brain FIRST
  3. Agent now knows where it's been, what happened, what's next
  4. Then acts with full context — no ceremony, no guessing

CLEANUP:
  hive_mind clean → purges expired session files
  Staleness: sessions inactive >7d, completed task sessions >30d
```

### Why Hive Mind Is a Separate Tool (Not Part of Plans)

`idumb_plans` manages ARTIFACTS — anchors, brain entries, phase state.
`idumb_hive_mind` manages MEMORY — cross-session coherence, context trajectory,
cleanup, and the agent's ability to know WHERE IT HAS BEEN and WHAT HAPPENED.

Plans is about WHAT exists. Hive Mind is about WHAT HAPPENED and WHAT TO DO NEXT.

The hive mind consumes from plans (brain store, anchors) and tasks (graph, checkpoints)
but adds the SESSION INTELLIGENCE layer that neither tool provides alone.

**Data flow**: Hooks auto-export → `.idumb/brain/sessions/` → agents pull via hive_mind → act informed.

### Tool 4: `idumb_init` — stays as-is (project setup)

## SDK Integration Matrix: The Data Backbone

The 3 tools are direct connections to sessions/conversations. They consume OpenCode SDK
data, parse it into schemas, and chain it coherently so agents know what happened
without context loss.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  SDK CLIENT SURFACE → TOOL CONSUMPTION MATRIX                           │
│                                                                          │
│  SDK Namespace    │ Method(s)              │ Consumer Tool(s)            │
│  ─────────────────┼────────────────────────┼─────────────────────────────│
│  session.get      │ Get session details    │ hive_mind (orient, recall)  │
│  session.list     │ List all sessions      │ hive_mind (recall)          │
│  session.children │ Child session tree     │ hive_mind (orient)          │
│  session.messages │ Messages in session    │ hive_mind (recall, orient)  │
│  session.summarize│ Summarize session      │ hive_mind (clean)           │
│  session.abort    │ Abort running session  │ tasks (fail — cascade)      │
│  session.prompt   │ Inject context         │ hive_mind (orient — noReply)│
│  ─────────────────┼────────────────────────┼─────────────────────────────│
│  find.text        │ Search code content    │ tasks (status — code refs)  │
│  find.files       │ Find files by pattern  │ init (brain index)          │
│  find.symbols     │ Workspace symbols      │ init (codemap), plans (wiki)│
│  ─────────────────┼────────────────────────┼─────────────────────────────│
│  file.read        │ Read file content      │ plans (wiki generation)     │
│  file.status      │ Tracked file changes   │ tasks (checkpoint verify)   │
│  ─────────────────┼────────────────────────┼─────────────────────────────│
│  path.get         │ Current working path   │ hive_mind (orient)          │
│  config.get       │ Config info            │ all (governance mode)       │
│  config.providers │ Available models       │ hive_mind (orient context)  │
│  ─────────────────┼────────────────────────┼─────────────────────────────│
│  tui.showToast    │ Toast notification     │ tasks (block alerts)        │
│  tui.executeCommand│ TUI command           │ REMOVED (was govern_delegate)│
│  tui.appendPrompt │ Append to prompt       │ hive_mind (context inject)  │
└──────────────────────────────────────────────────────────────────────────┘
```

### Auto-Parse Chain: SDK → Schema → Tool Network

```
SDK OUTPUT (runtime)
    │
    ▼
SCHEMA PARSING (strict, typed)
    │  session.messages → parsed into SessionTrajectory schema
    │  find.symbols → parsed into CodeMap schema
    │  file.status → parsed into FileChangeSet schema
    │  session.children → parsed into DelegationTree schema
    │
    ▼
TOOL STATE (persisted in .idumb/brain/)
    │  idumb_tasks ←→ graph.json, wiki.json
    │  idumb_plans ←→ knowledge.json, plan.json, anchors in state.json
    │  idumb_hive_mind ←→ ALL of the above + sessions/<session_id>.json (exported)
    │
    ▼
CROSS-TOOL NETWORK
    │  tasks_complete → creates wiki entry → plans consumes
    │  plans_anchor → creates anchor → hive_mind includes in recall
    │  hive_mind_orient → reads tasks state → tells agent "you were doing X"
    │  hive_mind_clean → sweeps stale → updates plans brain store
    │  tasks_status → reads hive_mind trajectory → shows "WHERE AM I"
    │
    ▼
AGENT CONSUMES (without context loss)
    │  Agent calls any tool → gets portion it needs → knows what to do next
    │  No ceremony. No manual chaining. The network links automatically.
```

```
HOOKS (enforce without agent awareness)
│
├── tool.execute.before
│   ├── Write-gate: blocks writes without active task
│   ├── Agent scoping: coordinator can't write
│   ├── Temporal gates: dependency ordering
│   ├── Destructive shell blacklist (moved from govern_shell)
│   └── Per-task allowedTools enforcement
│
├── tool.execute.after
│   ├── Checkpoint auto-recording (write/edit/shell)
│   ├── Wiki queue population (track code changes)
│   ├── Coherent knowledge auto-capture
│   └── Defense-in-depth write-gate
│
├── chat.params
│   ├── Agent identity capture
│   ├── Auto-assign to active task
│   └── Delegation depth tracking
│
├── experimental.session.compacting
│   ├── Inject top anchors (budget: 500 tokens)
│   ├── Inject active task context
│   ├── Inject relevant brain entries
│   └── Inject active delegation chain
│
├── experimental.chat.system.transform
│   ├── Active plan/task injection (every turn)
│   ├── Plan phase progress
│   ├── Governance mode context
│   ├── Critical brain entries
│   └── Framework overlay (GSD/BMAD/spec-kit)
│
└── experimental.chat.messages.transform
    ├── Prune stale tool outputs (keep last 10)
    └── Exempt governance tool outputs from pruning
```

## Templates: The Behavioral Layer (GSD-like structure)

```
.idumb/modules/ (deployed by init)
│
├── references/
│   ├── delegation-protocol.md      — how @mention delegation works
│   ├── artifact-tiers.md           — Tier 1/2/3 classification rules
│   ├── wiki-generation.md          — how code changes become wiki entries
│   ├── governance-rules.md         — what hooks enforce, what agents must do
│   └── task-classification.md      — A/B/C decision gate rules
│
├── templates/
│   ├── coordinator-workflow.md     — 4-stop loop template
│   ├── investigator-workflow.md    — research → findings → learn
│   ├── executor-workflow.md        — implement → verify → complete
│   ├── action-plan.md              — nested phase plan structure
│   ├── wiki-entry.md               — repo wiki page template
│   └── coherent-knowledge.md       — knowledge entry structure
│
├── workflows/
│   ├── feature-implementation.md   — full feature lifecycle (Type C)
│   ├── bug-fix-patch.md            — quick patch lifecycle (Type A)
│   ├── parallel-execution.md       — batch task orchestration
│   ├── self-correction.md          — implement → test → fix loop
│   ├── research-phase.md           — investigation workflow
│   └── phase-transition.md         — completing and advancing phases
│
└── agents/
    ├── idumb-supreme-coordinator.md  — deployed to .opencode/agents/
    ├── idumb-investigator.md         — deployed to .opencode/agents/
    └── idumb-executor.md             — deployed to .opencode/agents/
```

## The File System Watcher → Coherent Knowledge Chain

```
File System Events (NOT BUILT — future)
│
├── File Created → Brain auto-indexes new file
│   └── codemap entry + project-map update
│
├── File Modified → Diff tracked
│   └── If during active task: checkpoint recorded
│   └── If outside task: drift warning
│
├── Git Commit → Commit linked to task
│   └── Wiki entry updated with commit ref
│
└── File Removed/Moved → Brain updates references
    └── Stale wiki entries flagged
```

## Lifecycle & Maintenance

```
Time-to-Stale (Chain-Break Scheme):
│
├── Anchors: 48h → staleness multiplier 0.25x
├── Brain entries: 7d → confidence decay
├── Delegations: 30min → auto-expire
├── Abandoned plans: 48h → purge from injection
├── Tier 3 artifacts: 7d → auto-archive
├── Wiki entries: never stale (permanent record)
│
Purging Factors:
├── On init: expire stale delegations, purge abandoned plans
├── On phase complete: archive Tier 2/3 artifacts
├── On session end: sweep orphan tasks
└── Manual: plans_phase triggers staleness sweep
```

## Schema Mapping (New Architecture)

### KEEP (backing the 3 tools):
| Schema | Backs | Purpose |
|--------|-------|---------|
| `work-plan.ts` | `idumb_tasks` | WorkPlan + TaskNode + Checkpoint |
| `task-graph.ts` | `idumb_tasks` | Graph operations, validation, formatting |
| `anchor.ts` | `idumb_plans` | Anchor scoring, staleness, budget selection |
| `brain.ts` | `idumb_plans` + `idumb_hive_mind` | BrainEntry, knowledge queries |
| `config.ts` | `idumb_init` | Project config |
| `plan-state.ts` | `idumb_plans` | Phase tracking (simplified) |

### DELETE:
| Schema | Why |
|--------|-----|
| `task.ts` | Legacy v2 — fully migrated to task-graph |
| `delegation.ts` | Delegation = @mention, not data structure |
| `planning-registry.ts` | Outlier scan → init.ts, rest unused |

### NEW (to support enriched flow):
| Schema | Purpose |
|--------|---------|
| `classification.ts` | Task classification rules (A/B/C decision gate) |
| `wiki.ts` | Wiki entry structure (follows legacy-repo pattern) |
| `coherent-knowledge.ts` | Cross-session knowledge linking |
| `session-trajectory.ts` | Session brain file schema — exported to .idumb/brain/sessions/<id>.json, agent trail, checkpoint timeline |
| `hive-mind.ts` | Recall queries, orient results, clean reports, coherence scoring |

## What the Mind Map Shows vs What Exists

| Mind Map Node | Built? | Tool/Hook/Template |
|---------------|--------|-------------------|
| File System Watcher | NO | Future: chokidar + hook |
| Coherent Knowledge | NO (schema-only for brain) | `idumb_plans learn` + hooks |
| Decision Point: Spawn Artifacts? | NO | NEW: task classifier in `tasks_quick_start` |
| Session of Workflow | PARTIAL (session state tracked) | `chat.params` hook + persistence |
| Action Planning & Triggering | YES (govern_plan/task) | REPLACE: `idumb_tasks` |
| Context & Integration (Wiki, Codemap) | NO (codemap write-only) | NEW: wiki generation + brain indexer |
| Artifacts + Documents (Tiered) | NO (planning-registry unused) | NEW: tier classification + lifecycle |
| The Brain (Index/Store) | PARTIAL (store only, not indexer) | TRANSFORM: hooks auto-populate |
| Lifecycle & Maintenance | PARTIAL (staleness exists) | EXTEND: tier-aware purging |
| Agents Team Workflow Mgmt | YES (3-agent system) | KEEP: coordinator + investigator + executor |
| 3-Level Delegation Loops | YES (schema), NO (runtime) | FIX: @mention delegation in templates |
| Wrapped Framework (BMAD) | YES (framework overlay in system hook) | KEEP: system.ts framework context |
