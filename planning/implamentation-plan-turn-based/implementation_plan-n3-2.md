# Phase δ2.5 — Tool Discoverability + Agent Scoping + Delegation Awareness

## Problem

Three issues exposed by real agent testing:

1. **Tool confusion** — The meta-builder couldn't figure out `idumb_task` actions. It tried `action=create`, then `action=create_epic`, then re-read the source code. Root cause: the tool description is a compressed single line with no examples.
2. **No agent-scoped plugin tool gating** — All 5 plugin tools are visible to all agents. A validator shouldn't call `idumb_init`, and agents that aren't coordinators shouldn't call `action=delegate`.
3. **Meta-builder lacks delegation awareness** — The template doesn't teach agents about the delegation skill or `action=delegate` workflows.

---

## Proposed Changes

### Component 1: Tool Description Enhancement

#### [MODIFY] [task.ts](file:///Users/apple/Documents/coding-projects/idumb/v2/src/tools/task.ts)

Rewrite the `description` string to be multi-line with:
- Clear action list with required args per action
- Quick-start examples showing the 3-step flow (create_epic → create_task → start)
- Common mistake warnings

> [!IMPORTANT]
> This is the #1 fix. Agents can only discover tool API through the description string. If it's unclear, agents will hallucinate actions or read source code.

---

### Component 2: Agent-Scoped Plugin Tool Gating

#### [MODIFY] [tool-gate.ts](file:///Users/apple/Documents/coding-projects/idumb/v2/src/hooks/tool-gate.ts)

Add agent-scoped gating to [createToolGateBefore](file:///Users/apple/Documents/coding-projects/idumb/v2/src/hooks/tool-gate.ts#69-138):

```typescript
// Agent → Plugin tool access matrix
const AGENT_TOOL_RULES: Record<string, { blocked: Set<string>, blockedActions?: Set<string> }> = {
  "idumb-supreme-coordinator": {
    blocked: new Set(["idumb_init"]),
    // Can delegate but cannot init
  },
  "idumb-validator": {
    blocked: new Set(["idumb_init"]),
    blockedActions: new Set(["delegate", "create_epic"]),
  },
  "idumb-builder": {
    blocked: new Set(["idumb_init"]),
    blockedActions: new Set(["create_epic"]),
  },
}
```

When a plugin tool call comes in:
1. Check `stateManager.getCapturedAgent(sessionID)` for current agent
2. If agent matches a rule and tool/action is blocked → throw governance block

> [!WARNING]
> Action-level gating only works for `idumb_task` because we can inspect `args.action`. For other tools, we can only gate at the tool level.

---

### Component 3: Meta-Builder Delegation Awareness

#### [MODIFY] [templates.ts](file:///Users/apple/Documents/coding-projects/idumb/v2/src/templates.ts)

Update [getMetaBuilderAgent()](file:///Users/apple/Documents/coding-projects/idumb/v2/src/templates.ts#14-260) to add in Phase 2:
- Reference delegation protocol from `.idumb/idumb-modules/skills/delegation-protocol.md`
- Instruct agents it creates to embed delegation rules in their system prompts
- Include `idumb_task action=delegate` in the agent creation contract

Update Phase 3:
- Include delegation skill injection into created agents

---

## Verification Plan

### Automated Tests
- `npm run typecheck` → 0 errors
- `npm test` → all existing tests pass
- New tests for agent-scoped gating (blocked tool → throws, allowed tool → passes)

### Manual Verification
- Deploy to test project, run meta-builder, verify it successfully calls `idumb_task action=create_epic` without confusion
