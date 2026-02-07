# Workflow Template

Workflows are implemented as commands that guide agents through multi-step processes.
In OpenCode, workflows ARE commands — there is no separate workflow system.

## Format

A workflow command is a command with structured multi-step instructions:

```markdown
---
description: "<what this workflow accomplishes>"
agent: idumb-supreme-coordinator
---

## Objective
<what needs to be accomplished>

## Step 1: Context Gathering
Use glob, grep, list, read to understand the current state.
Report findings before proceeding.

## Step 2: Planning
Decompose the objective into subtasks with acceptance criteria.
Write subtasks to TODO.

## Step 3: Execution
Delegate each subtask to @idumb-builder sequentially.
After each delegation, read the report and update TODO.

## Step 4: Validation
Delegate validation to @idumb-validator with full scope.
If gaps found, re-delegate to builder. Max 3 loops.

## Completion Criteria
- All TODO items completed with evidence
- Validator report shows zero gaps
- Summary produced for user

$ARGUMENTS
```

## Delegation Pattern

Workflows ALWAYS route through the coordinator to enforce governance:
`User → Command → Coordinator → Builder/Validator → Report`

This ensures every step goes through the delegation + validation loop.
