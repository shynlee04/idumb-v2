# Command Template

Use this template when creating new OpenCode commands.
Reference: https://opencode.ai/docs/commands/

## Format

```markdown
---
description: "<what this command does — shown in TUI>"
agent: <which agent handles this command>    # optional — routes to specific agent
subtask: true | false                        # optional — force subagent mode
model: "provider/model-id"                   # optional — override model
---

<prompt template that gets sent to the agent>

$ARGUMENTS
```

## Special Syntax

- `$ARGUMENTS` — all arguments passed to the command
- `$1`, `$2`, `$3` — positional arguments
- `@filename` — include file content in the prompt
- `!`command`` — inject shell output into the prompt

## Examples

### Route through coordinator (forces delegation)

```markdown
---
description: "Build a feature with governed delegation"
agent: idumb-supreme-coordinator
---

Decompose and delegate this task: $ARGUMENTS

Follow the delegation workflow: decompose → delegate to builder → validate → report.
```

### Quick validation (direct to validator)

```markdown
---
description: "Validate recent changes"
agent: idumb-validator
subtask: true
---

Validate the following scope: $ARGUMENTS

Recent changes: !`git diff --stat`
```

## Placement

- Project-level: `.opencode/commands/<name>.md`
- Global: `~/.config/opencode/commands/<name>.md`

## Naming

Use kebab-case: `idumb-<action>.md`
