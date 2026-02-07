# iDumb Agent Contract

Every agent created by the iDumb Meta Builder MUST follow this contract.
Reference: https://opencode.ai/docs/agents/

## Required YAML Frontmatter (OpenCode Format)

```yaml
---
description: "<clear, one-line description>"     # REQUIRED
mode: primary | subagent                          # REQUIRED for iDumb agents
tools:
  "*": true                                      # wildcard: enable all
  read: true | false                              # or per-tool control
  write: true | false
  edit: true | false
  bash: true | false
  glob: true | false
  grep: true | false
  list: true | false
  webfetch: true | false
  skill: true | false
  task: true | false
  todowrite: true | false
  todoread: true | false
  question: true | false
permissions:                                      # NOTE: plural!
  edit: allow | ask | deny
  bash: allow | ask | deny
  webfetch: allow | ask | deny
  task:
    "agent-glob": allow | deny                   # glob patterns for delegation
model: "provider/model-id"                        # optional
temperature: 0.3                                  # optional (0.0-1.0)
max_steps: 50                                     # optional
hidden: true | false                              # optional — hide from @ menu
color: "#FF5733"                                  # optional — hex or theme color
top_p: 0.9                                        # optional (0.0-1.0)
prompt: "./path/to/prompt.md"                     # optional — external prompt file
---
```

**CRITICAL:** The key is `permissions` (PLURAL), not `permission`. OpenCode silently ignores the singular form.

## Required Body Sections

### 1. Persona
- Role description and communication style
- Domain expertise and focus area

### 2. Workflow
- Step-by-step workflow the agent follows
- What triggers the agent and what it produces

### 3. Boundaries
- Explicit list of what this agent CANNOT do
- What happens when boundaries are hit

## Role Hierarchy

| Role | Permission Level | Can Write? | Can Bash? | Can Delegate? | Plugin B Access |
|------|-----------------|-----------|----------|---------------|-----------------|
| meta | read + delegate | no (delegates) | no (delegates) | yes — all agents | idumb_read only |
| coordinator | read + delegate | no | no | yes — builder/validator/skills/researcher | idumb_read only |
| builder | read + write + build | yes (idumb_write) | yes (idumb_bash) | yes — validator only | read + write + bash |
| validator | read + test | no | test only (idumb_bash) | no (leaf) | read + bash (validation) |
| skills-creator | read + create skills | yes (new only, idumb_write) | npx skills only (idumb_bash) | no (leaf) | read + write + bash + webfetch |
| researcher | read + research | yes (idumb_write) | no | no (leaf) | read + write + webfetch |
| planner | read + plan | yes (idumb_write) | no | research only | read + write + webfetch |

**IMPORTANT:** Plugin B tools (idumb_read/write/bash/webfetch) CANNOT be controlled via the `tools:` frontmatter.
They are self-governed — their governance is embedded in the tool code via entity-resolver + chain-validator + state-reader.
Each agent's system prompt MUST document its Plugin B boundaries for self-regulation.

## Bash Permission Patterns

OpenCode supports glob patterns for granular bash control:

```yaml
permissions:
  bash:
    "npm test*": allow
    "npm run lint*": allow
    "git status": allow
    "*": deny
```

Last matching rule wins. Put `*` first, specific rules after.

## Naming Convention

Agent files: `idumb-<role-name>.md`
Examples: `idumb-supreme-coordinator.md`, `idumb-builder.md`, `idumb-validator.md`, `idumb-skills-creator.md`
