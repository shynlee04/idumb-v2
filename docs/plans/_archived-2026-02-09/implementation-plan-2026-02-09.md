# iDumb v2 — 3-Tool Architecture Implementation Plan
# Date: 2026-02-09
# Parent: full-system-architecture-2026-02-09.md
# Type: Multi-round routed plan — each round requires user authorization

## Scope

Transform 6 governance tools (1,875 LOC) + templates (1,484 LOC) into:
- **3 parent tools**: `idumb_tasks` (5 exports) + `idumb_plans` (4 exports) + `idumb_hive_mind` (4 exports)
- **1 bootstrap tool**: `idumb_init` (stays, minor updates)
- **SDK data backbone**: session/find/file/path/config auto-parsed into tool schemas
- **GSD-like template structure**: references/ + templates/ + workflows/ + agents/
- **Enhanced hooks**: shell blacklist absorbed into tool-gate, brain auto-population

### Design Principles (NON-NEGOTIABLE)
1. **Tool Superiority** — agents PREFER these over innate because they get role-aware guidance
2. **No Ceremony** — `quick_start` is the default, multi-call sequences are advanced-only
3. **Situational Navigation** — every output answers: where am I, what's next, who's next
4. **Branch Awareness** — tools detect "last task in your branch" and prompt validation
5. **Cross-Linking** — tasks always reference plans, plans always show task progress
6. **Schema-First Network** — SDK outputs parsed into schemas, tools consume portions, agents get coherent context
7. **3 Tools = 1 Unit** — tasks, plans, hive_mind are co-developed, tested together, deployed together

---

## Pre-Flight: What Must Survive the Migration

### CRITICAL (loss = broken governance)
| Capability | Current Location | Target |
|-----------|-----------------|--------|
| `setActiveTask()` bridge to tool-gate | govern-task.ts → tool-gate.ts | `idumb_tasks` quick_start/start/complete/fail |
| Write-gate enforcement | tool-gate.ts (546 LOC) | KEEP — no changes to gate logic |
| Checkpoint auto-recording | tool-gate.ts after hook | KEEP — no changes |
| Compaction anchor injection | compaction.ts | KEEP — anchors via `idumb_plans anchor` |
| Agent identity capture | index.ts chat.params | KEEP — no changes |
| Destructive shell blacklist | govern-shell.ts DESTRUCTIVE_BLACKLIST | MOVE → tool-gate.ts before hook |

### HIGH (loss = degraded functionality)
| Capability | Current Location | Target |
|-----------|-----------------|--------|
| WorkPlan lifecycle (create/archive/abandon) | govern-plan.ts | `idumb_tasks` quick_start + complete |
| TaskNode lifecycle (start/complete/fail/review) | govern-task.ts | `idumb_tasks` (all exports) |
| Dependency validation (temporal gates) | task-graph.ts + tool-gate.ts | KEEP — task-graph.ts unchanged |
| MASTER-PLAN phase tracking | govern-plan.ts phase action | `idumb_plans phase` |
| Brain knowledge entries | anchor.ts learn action | `idumb_plans learn` |
| Graph warning detection | task-graph.ts detectGraphBreaks | KEEP — consumed by `idumb_tasks status` |

### MEDIUM (loss = reduced observability)
| Capability | Current Location | Target |
|-----------|-----------------|--------|
| Delegation records | govern-delegate.ts + delegation.ts | REMOVE — delegation = @mention in templates |
| Shell command classification | govern-shell.ts classifyCommand | MOVE → tool-gate.ts (classification for logging) |
| Role-based shell permissions | govern-shell.ts ROLE_PERMISSIONS | MOVE → tool-gate.ts (AGENT_TOOL_RULES extension) |
| Formatted task graph display | task-graph.ts formatTaskGraph | KEEP — consumed by `idumb_tasks status` |

### SAFE TO DELETE
| Artifact | Reason |
|---------|--------|
| govern-delegate.ts (244 LOC) | Delegation = @mention. tui.executeCommand UNVERIFIED. Records kept but never enforced. |
| govern-shell.ts (252 LOC) | Thin execSync wrapper. Blacklist → hook. Classification → hook. |
| govern-plan.ts (344 LOC) | Absorbed into idumb_tasks + idumb_plans. |
| govern-task.ts (375 LOC) | Absorbed into idumb_tasks. |
| anchor.ts (133 LOC) | Absorbed into idumb_plans. |
| schemas/task.ts | Legacy v2, fully migrated to task-graph.ts. Migration code in task-graph.ts preserved. |
| schemas/delegation.ts | Delegation = @mention, not data structure. |
| schemas/planning-registry.ts | Outlier scan logic stays in init.ts. Registry schema unused at runtime. |

---

## Round 1: Schema Foundation
**Estimated effort**: 2-4 hours
**Risk**: Low — additive only, no deletions yet
**Authorization gate**: User confirms before execution

### 1.1 Create `src/schemas/classification.ts`
Task classification decision gate (Type A/B/C from architecture doc):
```
Type A: Bug Fix / Patch
  → Short action plan
  → Direct to repo wiki (no tier documents)
  → Classifier signals: keywords (fix, bug, patch, hotfix), small scope (<3 files expected)

Type B: User Request / No Artifact
  → Session logged only
  → No planning artifacts spawned
  → Classifier signals: keywords (install, setup, configure, help), no code changes expected

Type C: Feature / Phase Work
  → Giant action plan with nested phases
  → Tier 1/2/3 documents
  → Code changes → sequential wiki entries
  → Classifier signals: keywords (implement, add, create, feature), multi-file scope
```
Exports: `classifyTask(name, description?)`, `TaskClassification` type, `ClassificationResult`

### 1.2 Create `src/schemas/wiki.ts`
Wiki entry structure following legacy-repo knowledge model pattern:
```
WikiEntry {
  id: string
  title: string
  taskId: string
  planId: string
  sessionId: string
  files: { path, action: "created"|"modified"|"deleted", lines }[]
  content: string  // markdown with source citations
  createdAt: number
  agent: string
}
WikiStore { version, entries[] }
```
Exports: `createWikiEntry(opts)`, `createWikiStore()`, `formatWikiEntry(entry)`, `WikiEntry`, `WikiStore`

### 1.3 Create `src/schemas/coherent-knowledge.ts`
Cross-session knowledge linking (from architecture doc coherent knowledge section):
```
CoherentKnowledgeEntry {
  action: string
  taskId: string
  planId: string
  agent: string
  delegatedBy: string | null
  delegationDepth: number
  workflow: string
  phase: string
  sessionId: string
  planningArtifact: string | null
  tier: 1 | 2 | 3 | null
  wikiEntries: string[]
  codeChanges: { file, action, linesChanged }[]
  createdAt: number
  completedAt: number | null
}
```
Exports: `createKnowledgeEntry(opts)`, `CoherentKnowledgeEntry`, `KnowledgeStore`

### 1.4 Update `src/schemas/index.ts` barrel
- Add new schema exports
- Mark deprecated schemas with `@deprecated` JSDoc (don't delete yet — Round 4 handles cleanup)

### 1.5 Validation
- `npm run typecheck` — zero errors
- `npm test` — all 637 tests pass (no behavior changes yet)

---

## Round 2: Tool Implementation — `idumb_tasks`
**Estimated effort**: 4-6 hours
**Risk**: Medium — new tool must wire to tool-gate correctly
**Authorization gate**: User confirms before execution
**Depends on**: Round 1 complete

### 2.1 Create `src/tools/tasks.ts`
Multi-export tool following OpenCode pattern (`filename_exportname`):

```typescript
// Each export becomes a separate tool: tasks_quick_start, tasks_complete, etc.

export const quick_start = tool({ ... })  // → tasks_quick_start
export const complete = tool({ ... })      // → tasks_complete
export const fail = tool({ ... })          // → tasks_fail
export const status = tool({ ... })        // → tasks_status
export const parallel = tool({ ... })      // → tasks_parallel
```

#### `quick_start` (absorbs govern_task quick_start + govern_plan create + plan_tasks)
- Single call: creates WorkPlan (if needed) + TaskNode + activates + sets session active task
- NEW: Runs task classifier (Round 1.1) to determine Type A/B/C
- NEW: Sets `artifact_tier` based on classification
- NEW: Links to parent plan artifact
- Calls `stateManager.setActiveTask()` — CRITICAL bridge to tool-gate
- Returns: task ID + classification + what's next + who's next (role-aware)

#### `complete` (absorbs govern_task complete)
- Records evidence on TaskNode
- Clears session active task (re-locks writes)
- Unblocks dependent tasks
- Auto-completes parent WorkPlan if all tasks done
- NEW: Triggers wiki queue entry if code changed (from checkpoints)
- NEW: Creates CoherentKnowledgeEntry
- NEW: Branch-aware: if last task → includes validation reminder in output
- Returns: progress + next task suggestion + handoff target

#### `fail` (absorbs govern_task fail)
- Records failure reason
- Blocks dependent tasks (chain-breaker)
- Clears session active task
- Returns: blocked tasks + suggested recovery + coordinator notification

#### `status` (NEW: role-aware situational navigator)
- Detects calling agent via `stateManager.getCapturedAgent(sessionID)`
- **Coordinator view**: plan progress, delegation options, team status, artifact links
- **Executor view**: active task, checkpoints, validation status, branch position, handoff target
- **Investigator view**: research task, anchor/brain prompts, handoff target
- **Default view**: full graph + active chain (for non-iDumb agents)
- Always answers: WHERE AM I, WHAT'S UP, WHAT'S NEXT, WHO'S NEXT
- Cross-links to planning artifacts via `idumb_plans`

#### `parallel` (absorbs govern_plan plan_tasks for batch creation)
- Creates N tasks with dependency graph in one call
- Each task independently classified (Type A/B/C)
- Temporal gates between dependent tasks
- Returns: task IDs + dependency visualization + role-specific guidance

### 2.2 Update `src/tools/index.ts` barrel
- Import and re-export `tasks.ts` exports with namespace prefix
- Keep old tool imports temporarily (Round 4 removes them)

### 2.3 Update `src/index.ts` plugin entry
- Wire new tool exports into the `tool:` object
- Keep old tools temporarily (Round 4 removes them)

### 2.4 Update `src/hooks/tool-gate.ts`
- Add new tool names to `PLUGIN_TOOLS` set
- Update `AGENT_TOOL_RULES` for new tool names
- Keep old rules temporarily (Round 4 removes them)

### 2.5 Validation
- `npm run typecheck` — zero errors
- `npm test` — all existing tests pass
- NEW tests for `tasks.ts` (minimum: quick_start, complete, fail, status per role)

---

## Round 3: Tool Implementation — `idumb_plans`
**Estimated effort**: 3-4 hours
**Risk**: Medium — anchor wiring crosses hook/tool boundary
**Authorization gate**: User confirms before execution
**Depends on**: Round 1 complete (can run parallel with Round 2)

### 3.1 Create `src/tools/plans.ts`
Multi-export tool:

```typescript
export const anchor = tool({ ... })  // → plans_anchor
export const learn = tool({ ... })   // → plans_learn
export const phase = tool({ ... })   // → plans_phase
export const status = tool({ ... })  // → plans_status
```

#### `anchor` (absorbs anchor.ts add + list)
- Creates compaction-surviving context with priority/type
- Lists anchors with staleness indicators
- NEW: Auto-links to active task if present
- Consumed by compaction hook for injection

#### `learn` (absorbs anchor.ts learn)
- Records brain knowledge entry (architecture/decision/pattern/etc.)
- NEW: Auto-links to session + task context
- NEW: Records agent identity + delegation depth
- Persisted to `knowledge.json` via StateManager

#### `phase` (absorbs govern_plan phase)
- Advances MASTER-PLAN phase status
- Auto-archives completed phase artifacts
- Triggers staleness sweep on old phase data
- Returns: phase progress + next phase

#### `status` (NEW: artifact-centric view)
- Current phase + progress
- Brain entry count by type + recent entries
- Active anchors with staleness
- Artifact inventory by tier (when classification wired)
- Wiki entry count (when wiki wired)
- Cross-links to task progress via `idumb_tasks`

### 3.2 Update barrel and plugin entry
- Same pattern as Round 2.2 and 2.3

### 3.3 Validation
- `npm run typecheck` — zero errors
- `npm test` — all existing tests pass
- NEW tests for `plans.ts` (minimum: anchor CRUD, learn, phase transitions, status)

---

## Round 3.5: Tool Framing — `idumb_hive_mind`
**Estimated effort**: 3-4 hours
**Risk**: Medium — session trajectory schema is new ground
**Authorization gate**: User confirms before execution
**Depends on**: Round 1 complete (can run parallel with Round 2/3)

> **STATUS: FRAMED** — built together with tasks + plans, tested as a unit.
> The hive mind is the MEMORY LAYER that makes the other 2 tools coherent.

### 3.5.1 Create `src/schemas/session-trajectory.ts`
Session brain file schema — exported to `.idumb/brain/sessions/<session_id>.json`:
```
TaskTreeNode {
  taskId: string
  parentId: string | null      // null = root (outer cycle)
  name: string
  status: "pending" | "active" | "completed" | "failed"
  children: TaskTreeNode[]     // inner tasks branch from outer
}

PhaseLink {
  phaseId: string
  taskIds: string[]            // which tasks belong to this phase
  status: string
}

ArtifactLink {
  type: "plan" | "wiki" | "brain" | "anchor"
  id: string
  tier: 1 | 2 | 3 | null
}

SessionTrajectory {
  sessionId: string
  agent: string | null
  startedAt: number
  lastActivity: number
  taskTree: TaskTreeNode[]     // hierarchical — outer → inner children
  phases: PhaseLink[]          // each phase links to its tasks
  toolsUsed: string[]
  anchorsCreated: string[]
  checkpoints: string[]
  agentSequence: string[]      // ordered agent trail
  delegationChain: { from: string, to: string, task: string, at: number }[]
  artifactLinks: ArtifactLink[] // plans, wikis, brain entries touched
  compactedAt: number | null
  status: "active" | "completed" | "compacted"
}
SessionBrainStore { version: number, sessions: Record<string, SessionTrajectory> }
```
The session is a NETWORK: outer tasks branch into inner children (tree), phases link to flows (graph), tasks cross-link to artifacts/sessions/delegations (network). ALL auto-exported.

Exports: `createSessionTrajectory(opts)`, `SessionTrajectory`, `SessionBrainStore`, `TaskTreeNode`, `PhaseLink`, `ArtifactLink`, `updateTrajectory(existing, event)`

### 3.5.2 Create `src/schemas/hive-mind.ts`
Hive mind query/result types:
```
RecallQuery { scope?: "session" | "task" | "agent", id?: string, timeRange?: { from, to }, limit?: number }
RecallResult { entries: RecallEntry[], sessionCount: number, agentTrail: string[] }
RecallEntry { type: "task" | "anchor" | "knowledge" | "checkpoint", id: string, summary: string, at: number, session: string }

OrientResult { sessionId, agent, activeTask?, lastAction, nextAction, position: string, wasDoingWhat: string }
CleanReport { purged: { type: string, id: string, reason: string }[], flagged: { type: string, id: string, warning: string }[] }
HiveStatus { sessionCount, brainEntries, staleDist: Record<string, number>, coherenceScore: number, warnings: string[] }
```
Exports: `RecallQuery`, `RecallResult`, `OrientResult`, `CleanReport`, `HiveStatus`

### 3.5.3 Create `src/tools/hive-mind.ts`
Multi-export tool:

```typescript
export const recall = tool({ ... })  // → hive_mind_recall
export const orient = tool({ ... })  // → hive_mind_orient
export const clean = tool({ ... })   // → hive_mind_clean
export const status = tool({ ... })  // → hive_mind_status
```

#### `recall` — What happened?
- Reads from `.idumb/brain/sessions/` directory (persisted session brain files)
- Cross-references: brain store, wiki store, knowledge store
- Auto-chains: task → session → agent → artifact → code changes
- Filters by: agent role, time range, task scope, artifact tier
- Traces back to specific points in session history (not full replay)
- Returns: contextualized memory relevant to the caller's current work

#### `orient` — Where am I?
- READS FROM `.idumb/brain/sessions/<current_session>.json` first (pull-based)
- SDK fallback if session file stale: session.get, session.messages, path.get
- Loads context into session brain FIRST, then tells agent what to do
- Detects illogical sequences, stale references, orphan tasks
- Returns: "you were doing X, next is Y" + position in plan hierarchy

#### `clean` — Context janitor
- Sweeps stale session files from `.idumb/brain/sessions/`
- Staleness rules: anchors 48h, brain 7d, delegations 30m, sessions 7d inactive
- Chain-break detection: newer-time + earlier-ID → investigate
- Cross-references brain entries vs active tasks vs plan state
- Purges expired files, flags suspicious patterns
- Returns: cleanup report

#### `status` — Memory health
- Session brain file count + total size + freshness
- Brain entries by type + staleness distribution
- Context coherence score
- Which sessions touched which tasks
- Stale/orphan warnings

### 3.5.4 Update persistence.ts
- Add `getSessionBrainStore()`, `saveSessionBrain(sessionId, trajectory)`
- Session brain files go to `.idumb/brain/sessions/<session_id>.json`
- New debounce timer for session writes (500ms coalesce)
- Auto-create `sessions/` directory on first write

### 3.5.5 Add auto-export hooks
Wire session trajectory export into existing hooks (observation, not ceremony):
- `chat.params` hook: Update session trajectory with agent identity
- `tool.execute.after` hook: Record tool usage in session trajectory
- `session.compacting` hook: Mark session as compacted, export snapshot
- These are fire-and-forget — never block, never fail the parent hook

### 3.5.6 Update barrel and plugin entry
- Same pattern as Round 2.2 and 2.3
- Wire `hive_mind_*` exports into `tool:` object

### 3.5.7 Update tool-gate.ts
- Add `hive_mind_*` to `PLUGIN_TOOLS` set
- Add `AGENT_TOOL_RULES` for hive_mind (all 3 agents can use recall/orient/status; only coordinator can use clean)

### 3.5.8 Validation
- `npm run typecheck` — zero errors
- `npm test` — all existing tests pass
- NEW tests for `hive-mind.ts`: recall query/result, orient, clean, status, session trajectory CRUD

---

## Round 4: Hook Migration + Old Tool Deletion
**Estimated effort**: 4-6 hours
**Risk**: HIGH — this is the breaking change round
**Authorization gate**: User confirms before execution
**Depends on**: Rounds 2 + 3 complete, all new tests passing

### 4.1 Absorb govern_shell into tool-gate.ts
Move from govern-shell.ts to tool-gate.ts before hook:
- `DESTRUCTIVE_BLACKLIST` (13 patterns) → new Layer 0 in before hook
- Fires BEFORE agent-scoped gating (Layer 1)
- Applies to ALL agents including non-iDumb (safety net)
- `classifyCommand()` → tool-gate.ts for logging/audit only
- `ROLE_PERMISSIONS` → extend `AGENT_TOOL_RULES` with bash restrictions

### 4.2 Brain auto-population in tool-gate.ts after hook
Extend the after hook (currently just checkpoints):
- After task completion (detect `tasks_complete` tool call): auto-create CoherentKnowledgeEntry
- After significant code changes: auto-queue wiki entry
- This is OBSERVATION, not ceremony — brain fills without agents calling tools

### 4.3 Delete old tools
Remove (in order):
1. `src/tools/govern-delegate.ts` (244 LOC)
2. `src/tools/govern-shell.ts` (252 LOC) — after 4.1 confirmed
3. `src/tools/govern-plan.ts` (344 LOC)
4. `src/tools/govern-task.ts` (375 LOC)
5. `src/tools/anchor.ts` (133 LOC)

### 4.4 Delete old schemas
Remove:
1. `src/schemas/task.ts` — BUT preserve migration code in task-graph.ts
2. `src/schemas/delegation.ts`
3. `src/schemas/planning-registry.ts` — BUT preserve outlier detection in init.ts

### 4.5 Clean up persistence.ts
- Remove `getDelegationStore()`, `setDelegationStore()`, `saveDelegationStore()`
- Remove `delegationSaveTimer` and disk path
- Remove delegation import from schemas
- Add `getWikiStore()`, `saveWikiStore()` (new)
- Add `getKnowledgeStore()`, `saveKnowledgeStore()` (new)
- Keep legacy TaskStore methods (needed for v2→v3 migration on init)

### 4.6 Update index.ts plugin entry
- Remove old tools from `tool:` object
- Wire only: `tasks_*`, `plans_*`, `idumb_init`
- Update AGENT_TOOL_RULES for new tool names only
- Remove old tool names from PLUGIN_TOOLS set

### 4.7 Update init.ts
- Remove planning-registry direct-fs calls (D03 disconnection fix)
- Keep outlier detection but simplify (no longer needs separate schema)
- Update greeting to reference new tool names

### 4.8 Validation
- `npm run typecheck` — zero errors
- **REWRITE** affected test suites (govern-plan, govern-task, govern-delegate, govern-shell, anchor-tool)
- NEW comprehensive test suites for tasks.ts and plans.ts
- `npm test` — all tests pass (count will change significantly)

---

## Round 5: Template Rewrite (GSD-Like Structure)
**Estimated effort**: 4-6 hours
**Risk**: Medium — changes agent behavior, no code breakage
**Authorization gate**: User confirms before execution
**Depends on**: Round 4 complete

### 5.1 Rewrite `src/templates.ts` into GSD-like structure

Replace monolithic templates.ts (1,484 LOC) with structured content:

```
src/templates/
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
│   └── wiki-entry.md               — repo wiki page template
│
├── workflows/
│   ├── feature-implementation.md   — full feature lifecycle (Type C)
│   ├── bug-fix-patch.md            — quick patch lifecycle (Type A)
│   ├── parallel-execution.md       — batch task orchestration
│   ├── self-correction.md          — implement → test → fix loop
│   └── phase-transition.md         — completing and advancing phases
│
└── agents/
    ├── coordinator.md              — supreme-coordinator agent definition
    ├── investigator.md             — investigator agent definition
    └── executor.md                 — executor agent definition
```

### 5.2 Agent templates: The 4-Stop Loop (coordinator)
Replace current Phase 1/2/3 sections with:
- Stop 1: Research (coordinator reads request, investigator researches via @mention)
- Stop 2: Plan (coordinator splits into tasks via `tasks_quick_start` or `tasks_parallel`)
- Stop 3: User Confirm (present task graph, wait for approval)
- Stop 4: Execute (delegate via @mention to executor, monitor via `tasks_status`)

### 5.3 Agent templates: Self-Regulation Loop (executor)
- Check active task: `tasks_status`
- Implement the task
- Verify (run tests, typecheck)
- If fails → fix and re-verify (max 3 retries)
- If passes → `tasks_complete evidence="..."`
- Check if more tasks → loop or handoff

### 5.4 Agent templates: Research → Learn Loop (investigator)
- Check research task: `tasks_status`
- Research using read/grep/glob/web tools
- Capture findings: `plans_anchor type="decision" content="..."`
- Record knowledge: `plans_learn type="research" title="..."`
- Complete: `tasks_complete evidence="findings documented"`

### 5.5 Fix phantom action references
- Remove ALL references to non-existent actions: `create_task`, `evidence`, `add_subtask`
- Replace with actual new tool exports: `tasks_quick_start`, `tasks_complete`, etc.
- Validate: grep for any remaining phantom references

### 5.6 Update deploy.ts
- Update file copy logic to deploy from new template structure
- Ensure .idumb/modules/ mirrors the new layout
- Update agent file deployment to .opencode/agents/

### 5.7 Validation
- `npm run typecheck` — zero errors
- `npm test` — all tests pass
- Manual: inspect generated agent files for correct tool references
- Manual: verify no phantom actions remain (grep)

---

## Round 6: Integration, Documentation, Dashboard
**Estimated effort**: 3-4 hours
**Risk**: Low — non-breaking changes
**Authorization gate**: User confirms before execution
**Depends on**: Round 5 complete

### 6.1 Update AGENTS.md (ground truth)
- Reflect new 3-tool architecture
- Update file tree
- Update test baseline
- Remove references to deleted tools/schemas

### 6.2 Update CLAUDE.md
- Update architecture section
- Update commands section
- Update source layout
- Update schema listing

### 6.3 Update README.md
- Update tool descriptions
- Update architecture diagram

### 6.4 Dashboard: Fix D02 (optional, defer if time-constrained)
- Update backend to read from TaskGraph v3 instead of legacy TaskStore
- Add wiki store and knowledge store endpoints
- Add brain entries panel
- This is lower priority — dashboard is dev-mode prototype

### 6.5 Final Validation
- `npm run typecheck` — zero errors
- `npm test` — all tests pass
- `npm run build` — clean dist output
- Smoke test: `idumb-v2 init -y` on a test project
- Smoke test: new tool calls via test harness

---

## Routing Table: Conditional Paths

| Condition | Route |
|-----------|-------|
| Round 1 typecheck fails | Fix schemas before proceeding |
| Round 2/3 can run in parallel | YES — independent tool implementations |
| Round 4.1 shell blacklist breaks tests | Add shell tests BEFORE deleting govern-shell |
| Round 4.3 deletion breaks imports | Fix barrel exports first, then delete |
| Round 4.8 test rewrite scope too large | Split into sub-rounds: 4.8a (delete old tests), 4.8b (write new tests) |
| Round 5 templates too large for single round | Split: 5a (agent definitions), 5b (workflows), 5c (references) |
| Dashboard update blocked by Phase 6 | Defer 6.4 entirely |

## Rollback Strategy

Each round is independently committable. If a round fails validation:
1. `git stash` all changes from that round
2. Previous rounds remain stable
3. Fix issues and retry the round

Commit message pattern: `feat(v3): Round N — [description]`

## Files Changed Per Round

| Round | New Files | Modified Files | Deleted Files |
|-------|-----------|---------------|---------------|
| 1 | 3 schemas | 1 barrel | 0 |
| 2 | 1 tool | 2 (barrel + index.ts + tool-gate) | 0 |
| 3 | 1 tool | 2 (barrel + index.ts) | 0 |
| 3.5 | 1 tool + 2 schemas | 3 (barrel + index.ts + persistence + tool-gate) | 0 |
| 4 | 0 | 3 (tool-gate + persistence + init) | 5 tools + 3 schemas |
| 5 | ~15 template files | 2 (templates.ts → templates/, deploy.ts) | 1 (templates.ts monolith) |
| 6 | 0 | 3-4 docs | 0 |
| **Total** | ~23 | ~12 | ~9 |

## Success Criteria

1. `npm run typecheck` — zero errors
2. `npm test` — all tests pass (new baseline after Round 4)
3. `npm run build` — clean
4. `idumb_tasks status` returns role-aware output for all 3 agents
5. `idumb_tasks quick_start` unlocks writes in ONE call (no ceremony)
6. `idumb_plans anchor` creates compaction-surviving context
7. `idumb_plans learn` persists brain entries
8. Hooks enforce write-gate + destructive blacklist WITHOUT agents using tools
9. Templates reference ONLY existing tool exports (zero phantom actions)
10. Brain has entries after a work session (auto-populated by hooks)
11. `idumb_hive_mind orient` returns "you were doing X, next is Y" from session brain files
12. `.idumb/brain/sessions/` auto-populated by hooks (export, not injection)
13. `idumb_hive_mind clean` purges expired session files
14. All 3 tools cross-link: tasks↔plans↔hive_mind form a coherent network
