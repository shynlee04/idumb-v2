# Delegation Skills, Commands & Schema — Phase δ2

The meta-builder module can't leverage new tools/concepts directly. Due to **PP-01** (subagent hooks don't fire), the only way to govern sub-agents is through **agent [.md](file:///Users/apple/Documents/coding-projects/idumb/v2/README.md) profiles + skills**. This makes delegation skills and commands the lifeblood of the system — the project lives or dies on delegation.

## Current State

| Component | Status | Problem |
|-----------|--------|---------|
| `idumb-governance` skill | EXISTS but **stale** | References old agents (`idumb-high-governance`, `idumb-low-validator`), old tools (`idumb-state`, `idumb-validate`) — none of which exist |
| `idumb-meta-builder` skill | EXISTS but **stale** | References `idumb-planner`, `idumb-integration-checker`, `idumb-skeptic-validator` — don't exist |
| Neither skill | **NOT SYMLINKED** to `.agent/skills/` | Neither skill is actually active for agents to use |
| Sub-agents | Templates only in `templates.ts` | Only `idumb-meta-builder.md` is deployed in `.opencode/agents/` |
| Delegation | **DOES NOT EXIST** | No `delegate` action, no `DelegationRecord`, no delegation commands |
| Commands | Only 3: init/settings/status | No delegation-oriented commands |

---

## Proposed Changes

### Component 1: Delegation Skill (NEW)

#### [NEW] [SKILL.md](file:///Users/apple/Documents/coding-projects/idumb/v2/.agents/skills/idumb-delegation/SKILL.md)

The core new skill that teaches ALL agents the delegation protocol:

- **How to delegate**: Using `@agent-name` mentions with structured context handoff
- **Delegation format**: What context must be passed (task ID, acceptance criteria, expected output, allowed tools)
- **Return protocol**: What delegates must return (evidence, files modified, status)
- **Chain rules**: Max depth 3, no upward delegation, no self-delegation, category-aware routing
- **Category→Agent matrix**: Which agent can handle which WorkStream category
- **PP-01 workaround**: Since subagent hooks don't fire, delegation is tracked via `idumb_task action=delegate` + disk persistence
- **Examples**: Concrete delegation examples for each category type

Will include `references/` directory with:
- `delegation-protocol.md` — detailed handoff format
- `category-agent-matrix.md` — routing rules  
- `return-format.md` — what delegates must return

---

### Component 2: Governance Skill (UPDATE)

#### [MODIFY] [SKILL.md](file:///Users/apple/Documents/coding-projects/idumb/v2/.agents/skills/idumb-governance/SKILL.md)

Full rewrite to align with the **current** tool/agent landscape:

- Replace `idumb-state` / `idumb-validate` / `idumb-context` references → `idumb_task` / `idumb_anchor` / `idumb_scan` / `idumb_codemap`
- Replace `idumb-high-governance` / `idumb-low-validator` → `idumb-supreme-coordinator` / `idumb-builder` / `idumb-validator` / `idumb-skills-creator`
- Update state management → `.idumb/brain/tasks.json` (TaskStore v2)
- Update validation protocol → `idumb_task action=evidence` + `action=complete`
- Add WorkStream category awareness
- Keep the core governance philosophy (expert-skeptic mode, context-first, evidence-based)

---

### Component 3: Skill Symlinks

#### [NEW] Symlink: `.agent/skills/idumb-delegation` → `../../.agents/skills/idumb-delegation`
#### [NEW] Symlink: `.agent/skills/idumb-governance` → `../../.agents/skills/idumb-governance`

Activate both skills so OpenCode agents can load them via the `skill` tool.

---

### Component 4: Delegation Schema (Phase δ2 Foundation)

#### [NEW] [delegation.ts](file:///Users/apple/Documents/coding-projects/idumb/v2/src/schemas/delegation.ts)

TypeScript types + helpers for delegation tracking:

```typescript
interface DelegationRecord {
  id: string
  fromAgent: string       // captured via chat.params
  toAgent: string         // target agent
  taskId: string          // linked task
  context: string         // what delegate needs
  expectedOutput: string  // what must be returned
  allowedTools: string[]  // scoped permissions
  maxDepth: number        // remaining depth (starts at 3)
  status: "pending" | "accepted" | "completed" | "rejected" | "expired"
  createdAt: number
  completedAt?: number
  expiresAt: number       // auto-expire stale delegations (30 min)
  result?: DelegationResult
}
```

Factory helpers: `createDelegation()`, `findDelegation()`, `completeDelegation()`, `validateDelegationChain()`

#### [MODIFY] [task.ts](file:///Users/apple/Documents/coding-projects/idumb/v2/src/schemas/task.ts)

Add `delegatedTo?: string` and `delegationId?: string` to the `Task` interface.

#### [MODIFY] [index.ts](file:///Users/apple/Documents/coding-projects/idumb/v2/src/schemas/index.ts)

Add barrel exports for delegation types and helpers.

---

### Component 5: Delegate Action on `idumb_task`

#### [MODIFY] [task.ts](file:///Users/apple/Documents/coding-projects/idumb/v2/src/tools/task.ts)

Add `action=delegate` with parameters: `task_id`, `to_agent`, `context`, `expected_output`

The action will:
1. Validate the delegation is allowed (category→agent matrix, depth check, no upward delegation)
2. Create a `DelegationRecord` and persist to `.idumb/brain/delegations.json`
3. Update the Task with `delegatedTo` + `delegationId`
4. Return a structured delegation instruction the calling agent can pass to `@to_agent`

#### [MODIFY] [persistence.ts](file:///Users/apple/Documents/coding-projects/idumb/v2/src/lib/persistence.ts)

Add delegation store management to `StateManager`: `getDelegationStore()`, `setDelegationStore()`, with separate `delegations.json` file.

---

### Component 6: Delegation Commands

#### [NEW] [idumb-delegate.md](file:///Users/apple/Documents/coding-projects/idumb/v2/src/modules/commands/idumb-delegate.md)

Template for `/idumb-delegate` command:
```yaml
---
description: "Delegate current task to a specialized agent"
agent: idumb-supreme-coordinator
---
```

Quick delegation through coordinator with `$ARGUMENTS` for target agent and context.

#### [MODIFY] [templates.ts](file:///Users/apple/Documents/coding-projects/idumb/v2/src/templates.ts)

Add `getDelegateCommand()` function that generates the command template. Also add to `cli/deploy.ts` so it deploys alongside existing commands.

---

> [!IMPORTANT]
> **Scope decision:** This plan covers skills, commands, schema, and the `delegate` action. It does NOT cover deploying the 4 sub-agents (they're created by the meta-builder at runtime during Phase 2 of its workflow). The sub-agents are templates in `templates.ts` that the meta-builder deploys to `.opencode/agents/` when the user runs `/idumb-init`.

---

## Verification Plan

### Automated Tests

**Command:** `npm test` (runs all 6 test files via tsx)

1. **Existing tests must pass** — 204/204 assertions across 6 test files remain green
2. **New delegation schema tests** — Added in `tests/delegation.test.ts`:
   - Schema validation: `createDelegation()` produces valid records
   - Chain depth enforcement: depth 3 blocks, depth 2 allows
   - Category-agent validation: research→builder blocked, research→validator allowed
   - Expiration: stale delegations (>30 min) detected
   - Round-trip persistence: delegations survive save/load
   
   **Command:** `tsx tests/delegation.test.ts` (same custom assert harness as existing tests)

3. **Typecheck:** `npm run typecheck` → 0 errors

### Manual Verification

1. **Skill loading:** Open OpenCode in the project, check that `idumb-delegation` and `idumb-governance` skills appear in the skill list
2. **Delegation action:** Run `idumb_task action=delegate task_id=<id> to_agent=idumb-builder context="implement login" expected_output="working login form with tests"` and verify structured response
3. **(Ask user):** Deploy to a test project and verify the full delegation round-trip with actual sub-agents
