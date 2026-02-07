---
description: "Ủy quyền task hiện tại cho agent chuyên biệt với theo dõi handoff"
agent: idumb-supreme-coordinator
---

Delegate a task to the appropriate sub-agent with full context tracking.

## Workflow

1. **Check active task** — verify there's a task to delegate via `idumb_task action=status`
2. **Validate target** — ensure arguments specify a valid agent
3. **Create delegation** — use `idumb_task action=delegate` with:
   - `task_id` = the current active task
   - `to_agent` = target from arguments
   - `context` = delegation context from arguments
   - `expected_output` = inferred from task name and context
4. **Pass handoff** — send the delegation instruction to @target-agent

## Available Targets

- `idumb-builder` — code implementation, file writes, test execution
- `idumb-validator` — validation, compliance checks, evidence review
- `idumb-skills-creator` — skill discovery, installation, custom skill creation
- `idumb-research-synthesizer` — web research, documentation analysis, brain entries
- `idumb-planner` — implementation plans, strategy documents

## Rules

- Only the coordinator and meta-builder can delegate
- Delegation depth max = 3
- Category routing is enforced (development → builder, research → researcher, governance → validator)
- Delegations expire after 30 minutes if not accepted

$ARGUMENTS
