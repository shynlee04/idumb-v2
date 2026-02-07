# Agent Delegation Protocol — What's Proven, What's Not

**Generated:** 2026-02-08
**Status:** Schema-level COMPLETE, Runtime enforcement NONE, Live testing NONE

---

## 1. The 3-Agent Model

### 1.1 Design (From templates.ts)

```
┌──────────────────────────────┐
│  Supreme Coordinator (L0)     │
│  - Creates tasks/epics        │
│  - Delegates to L1 agents     │
│  - Tracks all status vars     │
│  - NEVER writes files         │
│  - NEVER runs builds          │
│  - NEVER researches           │
└──────────┬───────────────────┘
           │ delegates
     ┌─────┴─────┐
┌────▼─────┐ ┌───▼──────┐
│Investigator│ │ Executor  │
│(L1)       │ │ (L1)      │
│- Reads    │ │- Writes   │
│- Analyzes │ │- Builds   │
│- Brain    │ │- Tests    │
│- NEVER    │ │- CANNOT   │
│  writes   │ │  delegate │
│  code     │ │- CANNOT   │
│           │ │  research │
└───────────┘ └───────────┘
```

### 1.2 Agent Hierarchy (From delegation.ts)

```typescript
const AGENT_HIERARCHY = new Map([
  ["coordinator", 0],   // L0 — can delegate to L1
  ["investigator", 1],  // L1 — can receive from L0
  ["executor", 1],      // L1 — can receive from L0
])
```

**Rule:** Higher level (lower number) can delegate to lower level (higher number). Same level CAN'T delegate to each other. Nobody can delegate UP.

---

## 2. What's Actually Implemented

### 2.1 Schema Level (PROVEN by TypeScript compilation)

| Component | Status | Evidence |
|-----------|--------|----------|
| `DelegationRecord` type | ✅ | `schemas/delegation.ts` — fromAgent, toAgent, taskId, context, allowedTools, allowedActions |
| `DelegationStore` type | ✅ | `schemas/delegation.ts` — stores all delegation records |
| `createDelegation()` | ✅ | Factory function creates valid record |
| `validateDelegation()` | ✅ | Checks self-delegation, upward delegation, depth, category routing |
| `acceptDelegation()` | ✅ | Sets status=accepted, records acceptance timestamp |
| `completeDelegation()` | ✅ | Sets status=completed, records result (evidence, filesModified, testsRun) |
| `rejectDelegation()` | ✅ | Sets status=rejected, records reason |
| `expireStaleDelegations()` | ✅ | Marks delegations older than 4 hours as expired |
| `findDelegation*()` | ✅ | Multiple lookup functions (by task, by agent, active) |
| `getDelegationDepth()` | ✅ | Counts delegation chain depth |
| `MAX_DELEGATION_DEPTH` | ✅ | Set to 3 |
| `buildDelegationInstruction()` | ✅ | Formats markdown instruction for delegate |
| `AGENT_HIERARCHY` | ✅ | Coordinator=0, Investigator=1, Executor=1 |

### 2.2 Tool Level (PROVEN by code analysis)

| Component | Status | Evidence |
|-----------|--------|----------|
| `idumb_task delegate` action | ✅ | Creates DelegationRecord, validates hierarchy, returns instruction |
| Delegation result in tool output | ✅ | Returns formatted instruction text |
| Delegation persistence | ✅ | StateManager saves to `.idumb/brain/delegations.json` |
| Task status updated on delegate | ✅ | Task set to "delegated" when delegate action runs |

### 2.3 Hook Level (NOT IMPLEMENTED)

| Component | Status | Evidence |
|-----------|--------|----------|
| Tool-gate delegation enforcement | ❌ | `tool-gate.ts` does NOT call `validateDelegation()` |
| Delegation depth tracking per-call | ❌ | Hook doesn't check if current agent has exceeded depth |
| Active delegation context injection | ❌ | System prompt doesn't include delegation state |
| Delegation expiry on hook fire | ❌ | No auto-expiration in hooks |
| Blocked tools enforcement | ❌ | `allowedTools` in DelegationRecord is never checked by hook |

### 2.4 Agent Template Level (NOT DEPLOYED)

| Component | Status | Evidence |
|-----------|--------|----------|
| Coordinator template | ✅ Exists | `getCoordinatorAgent()` in templates.ts (376 lines) |
| Investigator template | ✅ Exists | `getInvestigatorAgent()` in templates.ts |
| Executor template | ✅ Exists | `getExecutorAgent()` in templates.ts |
| Deployed to `.opencode/agents/` | ❌ | Directory contains NO agent files |
| Agent actually invoked in OpenCode | ❌ | Never tested |

---

## 3. How Delegation Is Supposed to Work (Design Intent)

### Step-by-step Flow (Intended)

1. **Coordinator** creates epic + tasks via `idumb_task`
2. **Coordinator** delegates task via `idumb_task delegate` with:
   - `target_id`: task to delegate
   - `to_agent`: "investigator" or "executor"
   - `context`: what the delegate needs to know
   - `expected_output`: what result to produce
3. **Schema validates:** hierarchy, depth, self-delegation, category routing
4. **DelegationRecord created** with allowedTools and allowedActions
5. **Instruction text returned** — coordinator is supposed to use OpenCode's `task` tool to spawn subagent
6. **Subagent (investigator/executor)** runs with the instruction
7. **Subagent** works within its allowed tools/actions
8. **Subagent** calls `idumb_task complete` when done
9. **DelegationRecord** updated with result (evidence, files modified, tests run)
10. **Coordinator** reviews result via `idumb_task status`

### What Actually Happens

1. ✅ Steps 1-2: Coordinator can create tasks and call delegate action
2. ✅ Steps 3-4: Validation and record creation work
3. ⚠️ Step 5: Instruction text returned but NO MECHANISM to spawn subagent
4. ❌ Steps 6-10: Never happen because subagent is never spawned

### The Critical Break Point

**Step 5 is the break.** The delegation system returns a well-formatted instruction text, but:
- There is no API call to spawn a subagent
- There is no integration with OpenCode's `task` tool
- The coordinator is supposed to "just know" to use the platform's task creation
- But since the coordinator agent template ISN'T DEPLOYED, it can't follow the instructions

---

## 4. Category-Based Tool Routing

The delegation schema defines category→agent routing:

```typescript
// From delegation.ts (approximately)
const CATEGORY_ROUTING = {
  "development": "executor",
  "research": "investigator",
  "governance": "coordinator",
  "maintenance": "executor",
  "spec-kit": "investigator",
  "ad-hoc": "executor"
}
```

This means:
- Research tasks route to investigator
- Development tasks route to executor
- Governance tasks stay with coordinator
- Spec-kit tasks route to investigator

**Status:** Routing table exists in schema. ❌ NOT enforced — coordinator can delegate any task to any agent regardless of category.

---

## 5. Delegation Depth Tracking

```typescript
// Max chain depth
const MAX_DELEGATION_DEPTH = 3

// Hierarchy: coordinator → investigator → ??? → ???
// In practice: only 2 levels possible given current 3-agent model
```

**Reality:** With only coordinator (L0) and investigator/executor (L1), the maximum delegation depth is 1. L1 agents can't delegate (no L2 agents). The depth limit of 3 is designed for future extensibility.

---

## 6. What Tools Each Agent Can Use (Design Intent)

### Coordinator (L0)
| Tool | Allowed | Enforcement |
|------|---------|-------------|
| `idumb_task` | ✅ All 13 actions | ❌ NOT ENFORCED |
| `idumb_write` | ❌ DENIED (per template) | ❌ NOT ENFORCED — coordinator CAN use write tool |
| `idumb_scan` | ❌ Should delegate to investigator | ❌ NOT ENFORCED |
| `idumb_bash` | ❌ Should delegate to executor | ❌ NOT ENFORCED |
| `idumb_status` | ✅ | N/A |

### Investigator (L1)
| Tool | Allowed | Enforcement |
|------|---------|-------------|
| `idumb_read` | ✅ | ❌ NOT ENFORCED |
| `idumb_scan` | ✅ | ❌ NOT ENFORCED |
| `idumb_codemap` | ✅ | ❌ NOT ENFORCED |
| `idumb_webfetch` | ✅ | ❌ NOT ENFORCED |
| `idumb_write` | ❌ Only brain entries | ❌ NOT ENFORCED |
| `idumb_bash` | ❌ DENIED | ❌ NOT ENFORCED |
| `idumb_task` | ✅ Read-only (status, list) | ❌ NOT ENFORCED |

### Executor (L1)
| Tool | Allowed | Enforcement |
|------|---------|-------------|
| `idumb_write` | ✅ Code + config files | ❌ NOT ENFORCED |
| `idumb_bash` | ✅ | ❌ NOT ENFORCED |
| `idumb_read` | ✅ | ❌ NOT ENFORCED |
| `idumb_task` | ✅ Complete, status | ❌ NOT ENFORCED |
| `idumb_scan` | ❌ Should not | ❌ NOT ENFORCED |
| `idumb_codemap` | ❌ Should not | ❌ NOT ENFORCED |
| `idumb_webfetch` | ❌ DENIED | ❌ NOT ENFORCED |

### Enforcement Gap Summary
**100% of tool restrictions are defined in agent templates (markdown) only.** Zero restrictions are enforced at the hook level. The tool-gate hook (`tool-gate.ts`) does NOT:
- Read the agent's template to check allowed tools
- Check `DelegationRecord.allowedTools` against the current tool call
- Block tool execution for unauthorized agents

---

## 7. Honest Assessment

### What Works
1. ✅ Schema design is comprehensive and well-thought-out
2. ✅ Validation logic catches real errors (self-delegation, hierarchy violations)
3. ✅ DelegationRecord captures everything needed for audit
4. ✅ Instruction formatting produces clear, actionable text
5. ✅ Persistence works (records saved to disk)

### What Doesn't Work
1. ❌ No agent spawning mechanism
2. ❌ No runtime permission enforcement
3. ❌ No hook-level delegation tracking
4. ❌ Agents not deployed to `.opencode/`
5. ❌ Category routing not enforced
6. ❌ Tool restrictions are suggestions, not enforcement
7. ❌ Never tested with actual LLM agents
8. ❌ No evidence of delegation working end-to-end

### What Would Fix It
1. Deploy agents via CLI (`npx idumb-v2 init --deploy-agents`)
2. Wire `tool-gate.ts` to check `DelegationRecord.allowedTools` before tool execution
3. Wire `tool-gate.ts` to call `validateDelegation()` on delegation-related tool calls
4. Use OpenCode's built-in `task` tool to spawn subagents (if available)
5. Add delegation state to `system.ts` prompt injection
6. Add integration test: coordinator delegates → investigator completes → result recorded

---

*Generated by Ralph Loop Validation — 2026-02-08*
