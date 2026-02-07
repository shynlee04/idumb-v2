# iDumb Modules

This directory contains the templates, schemas, and reference materials used by the iDumb Meta Builder to create and configure agents, commands, and workflows.

## Structure

```
idumb-modules/
├── agents/          # Agent profile templates
├── schemas/         # Schema definitions and contracts
├── templates/       # Template files for generated content
├── commands/        # Command templates
├── workflows/       # Workflow templates
├── prompts/         # Prompt templates
└── scripts/         # Script templates
```

## How It Works

1. The **Meta Builder** reads these modules to understand governance and coordinate delegation.
2. Modules are **read-only references** — the Meta Builder reads them but doesn't modify them.
3. Generated agents, commands, and workflows are placed in `.opencode/agents/`, `.opencode/commands/`, etc.
4. Project-specific outputs go to `.idumb/modules/` (not here).

## Updating Modules

Modules are installed by `npx idumb-v2 init` and can be updated by running init again with `--force`.
