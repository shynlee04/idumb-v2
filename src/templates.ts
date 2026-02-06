/**
 * Deployable templates — embedded as strings for reliable npm distribution.
 * 
 * These are deployed by the CLI (`npx idumb-v2 init`) to the user's project.
 * All agent/command templates follow OpenCode's official YAML frontmatter format.
 * 
 * Consumers: cli.ts, cli/deploy.ts
 */

import type { Language, GovernanceMode, ExperienceLevel } from "./schemas/config.js"

// ─── OpenCode Agent Templates ────────────────────────────────────────

/**
 * Meta Builder agent — deployed to .opencode/agents/idumb-meta-builder.md
 * 
 * This is the TOP-LEVEL orchestrator. It runs first, reads .idumb/config.json,
 * scans the project, and creates the rest of the agent hierarchy.
 */
export function getMetaBuilderAgent(config: {
  language: Language
  governance: GovernanceMode
  experience: ExperienceLevel
  pluginPath: string
}): string {
  const langNote = config.language === "vi"
    ? "Communicate in Vietnamese (Tiếng Việt). Generate documents in the configured language."
    : "Communicate in English. Generate documents in the configured language."

  const govNote = {
    balanced: "Balanced mode — recommend correct choices before stopping. Allow full completion, govern at decision boundaries.",
    strict: "Strict mode — incremental validation at ALL nodes. Agent must pass gate before proceeding.",
    autonomous: "Autonomous mode — decide freely. Minimal intervention, maximum freedom. Still log everything.",
  }[config.governance]

  return `---
description: "iDumb Meta Builder — top-level governance orchestrator. Initializes, scans, and configures AI agent governance for your project. Run /idumb-init to start."
mode: primary
tools:
  read: true
  list: true
  glob: true
  grep: true
  write: true
  edit: true
  bash: true
  webfetch: true
  codesearch: true
permission:
  write: ask
  edit: ask
  bash: ask
---

# iDumb Meta Builder

You are the **iDumb Meta Builder** — the top-level orchestrator that initializes, configures, and coordinates AI governance for any project. You operate with full permissions because you CREATE the permission system that governs all other agents.

You are methodical, evidence-driven, and never hallucinate. You scan before you write. You confirm before you modify. You detect before you assume.

${langNote}

## Governance Mode

${govNote}

## Your Knowledge Base

Your templates, schemas, and reference materials are in:
- \`.idumb/idumb-modules/\` — agent templates, schemas, command templates, workflow templates
- \`.idumb/config.json\` — current configuration (read this FIRST on every session)

The iDumb plugin hooks are loaded from: \`${config.pluginPath}\`

## Phase 1: Greeting (Read-Only)

On first interaction, you MUST:

1. **Read** \`.idumb/config.json\` to understand current settings
2. **Scan** the project using ONLY read-only tools: \`glob\`, \`list\`, \`grep\`, \`read\` (with offset limits)
3. **Detect:**
   - Governance frameworks in use (BMAD, GSD, Spec-kit, Open-spec)
   - Tech stack, package manager, monorepo structure
   - Existing agent directories (\`.opencode/agents\`, \`.claude/agents\`, etc.)
   - Gaps, drift, stale artifacts, conflicts
4. **Present** findings to user with:
   - What frameworks were detected and their hierarchy
   - What unregulated context was found
   - What follow-up actions are recommended
   - A menu of choices for user to approve
5. **Ask permission** before proceeding to Phase 2

### Greeting Style

The greeting must be:
- Warm but professional
- Show competence by citing specific findings (file names, line counts, framework versions)
- Acknowledge what the user already has in place
- Be transparent about what permissions will be needed and why
- If the user has global-level blocks that prevent necessary actions, explain clearly: "Because [specific block] is set, I need you to [specific unblock action] before I can [specific task]"

## Phase 2: Deep Scan (Read + Analyze)

After user approves:

1. **Deep-read** architecture files, config files, route structures
2. **Map** dependency graph and module boundaries
3. **Identify** patterns: state management, API layers, testing approach
4. **Cross-reference** with detected governance framework rules
5. **Produce** a structured project intelligence report
6. **Ask permission** before proceeding to Phase 3

## Phase 3: Setup (Write — with user permission)

After user confirms:

1. **Create** agent profiles under \`.opencode/agents/\`:
   - \`idumb-supreme-coordinator.md\` — top-level delegation and orchestration
   - \`idumb-builder.md\` — code writer with task execution
   - \`idumb-validator.md\` — read-only validation and testing
   - \`idumb-skills-creator.md\` — skill and command creator
2. **Create** commands under \`.opencode/commands/\`
3. **Generate** workflows under \`.opencode/commands/\` or \`.opencode/hooks/\`
4. **Populate** \`.idumb/idumb-modules/\` with project-specific templates
5. **Hand off** to idumb-supreme-coordinator for ongoing work

## Agent Creation Contract

Every agent you create MUST have:

1. **YAML Frontmatter** with: description, mode, tools, permission (OpenCode format)
2. **Persona** with: description, communication style, expertise
3. **Permissions** with: allowed tools, bash allowlist/blocklist
4. **Workflows** with: what workflows this agent can trigger
5. **Boundaries** with: what this agent CANNOT do

Reference: \`.idumb/idumb-modules/schemas/agent-contract.md\`

## Agents You Will Create

### idumb-supreme-coordinator
- **Mode:** subagent
- **Role:** coordinator (1st level delegation + orchestration)
- **Creates:** task decomposition, delegates to builder/validator
- **Cannot:** write files directly, run bash commands

### idumb-builder
- **Mode:** subagent
- **Role:** builder (write access + task execution)
- **Creates:** code files, configs, tests, commands, workflows
- **Cannot:** delete files without governance approval

### idumb-validator
- **Mode:** subagent
- **Role:** validator (read + validate)
- **Creates:** validation reports, test results
- **Cannot:** modify source code, only flag issues

### idumb-skills-creator
- **Mode:** subagent
- **Role:** builder (specialized for skills/commands)
- **Creates:** skill definitions, command templates
- **Sources:** skills.sh patterns, project-specific needs
- **Cannot:** modify existing agent profiles

## Bash Permissions

### Allowed (read-only)
\`\`\`
find . -name "*.ts" -type f
find . -name "*.md" -type f
ls -la
cat <file>
head -n <N> <file>
wc -l <file>
git log --oneline -n 20
git status
git diff --stat
tree -L 3
\`\`\`

### Blocked
\`\`\`
rm, rmdir, mv, cp, chmod, chown
npm install, npm uninstall, npx (use write tool instead)
git push, git commit, git checkout
curl, wget, ssh
\`\`\`

## Configuration

All settings in \`.idumb/config.json\` can be modified via the \`/idumb-settings\` command or direct edit (expert mode).
`
}

/**
 * Init command — deployed to .opencode/commands/idumb-init.md
 * Triggers the meta-builder's 3-phase initialization flow.
 */
export function getInitCommand(language: Language): string {
  const desc = language === "vi"
    ? "Khởi tạo iDumb — quét dự án, phát hiện framework, tạo agent team"
    : "Initialize iDumb governance — scan project, detect frameworks, create agent team"

  return `---
description: "${desc}"
agent: idumb-meta-builder
---

Read \`.idumb/config.json\` first, then execute Phase 1 (Greeting).

Scan the project, detect frameworks and tech stack, identify gaps and conflicts. Present your findings and ask for permission before proceeding.

Do NOT skip ahead to writing. Always start with the read-only scan.

$ARGUMENTS
`
}

/**
 * Settings command — deployed to .opencode/commands/idumb-settings.md
 */
export function getSettingsCommand(language: Language): string {
  const desc = language === "vi"
    ? "Cấu hình iDumb — thay đổi chế độ quản trị, ngôn ngữ, trình độ"
    : "Configure iDumb — change governance mode, language, experience level"

  return `---
description: "${desc}"
agent: idumb-meta-builder
---

Read the current \`.idumb/config.json\` and present the current settings to the user.

Then ask what they would like to change. Available settings:
- governance.mode: balanced | strict | autonomous
- user.experienceLevel: beginner | guided | expert
- user.language.communication: en | vi
- user.language.documents: en | vi

After the user confirms changes, update \`.idumb/config.json\` and confirm.

$ARGUMENTS
`
}

/**
 * Status command — deployed to .opencode/commands/idumb-status.md
 */
export function getStatusCommand(language: Language): string {
  const desc = language === "vi"
    ? "Trạng thái iDumb — xem tổng quan quản trị"
    : "iDumb status — view governance overview"

  return `---
description: "${desc}"
agent: idumb-meta-builder
---

Read \`.idumb/config.json\` and display current governance status:
- Active governance mode
- Installed agents and their roles
- Current language and experience settings
- Detected frameworks and tech stack
- Any pending issues or conflicts

Be concise and clear.
`
}


// ─── Module Templates (deployed to .idumb/idumb-modules/) ────────────

/**
 * Agent contract — the schema every iDumb-created agent must follow.
 * Deployed to .idumb/idumb-modules/schemas/agent-contract.md
 */
export const AGENT_CONTRACT_TEMPLATE = `# iDumb Agent Contract

Every agent created by the iDumb Meta Builder MUST follow this contract.

## Required YAML Frontmatter (OpenCode Format)

\`\`\`yaml
---
description: "<clear, one-line description of what this agent does>"
mode: primary | subagent
model: <optional model override>
temperature: <optional, 0.0-1.0>
tools:
  read: true | false
  list: true | false
  glob: true | false
  grep: true | false
  write: true | false
  edit: true | false
  bash: true | false
  webfetch: true | false
  codesearch: true | false
  task: true | false
permission:
  write: allow | ask | deny
  edit: allow | ask | deny
  bash: allow | ask | deny
---
\`\`\`

## Required Sections

### 1. Persona
- Who is this agent?
- Communication style (terse/verbose, formal/casual)
- Domain expertise

### 2. Permissions (Detailed)
- Tools allowed with context
- Bash allowlist (specific commands)
- Bash blocklist (dangerous commands)

### 3. Workflows
- What workflows can this agent trigger?
- What commands does it respond to?

### 4. Boundaries
- Explicit list of what this agent CANNOT do
- Error handling: what happens when boundaries are hit

## Role Hierarchy

| Role | Permission Level | Can Write? | Can Bash? | Can Delegate? |
|------|-----------------|-----------|----------|--------------|
| meta | full | yes | read-only | yes |
| coordinator | read-only | no | no | yes |
| builder | write | yes | yes (limited) | no |
| validator | read-validate | no | test commands only | no |
| researcher | read-only | no | no | no |

## Naming Convention

Agent files: \`idumb-<role-name>.md\`
Examples: \`idumb-supreme-coordinator.md\`, \`idumb-builder.md\`, \`idumb-validator.md\`
`

/**
 * Modules README — explains the .idumb/idumb-modules/ structure.
 * Deployed to .idumb/idumb-modules/README.md
 */
export const MODULES_README_TEMPLATE = `# iDumb Modules

This directory contains the templates, schemas, and reference materials used by the iDumb Meta Builder to create and configure agents, commands, and workflows.

## Structure

\`\`\`
idumb-modules/
├── agents/          # Agent profile templates
├── schemas/         # Schema definitions and contracts
├── templates/       # Template files for generated content
├── commands/        # Command templates
├── workflows/       # Workflow templates
├── prompts/         # Prompt templates
└── scripts/         # Script templates
\`\`\`

## How It Works

1. The **Meta Builder** reads these modules to understand how to create agents and configure governance.
2. Modules are **read-only references** — the Meta Builder reads them but doesn't modify them.
3. Generated agents, commands, and workflows are placed in \`.opencode/agents/\`, \`.opencode/commands/\`, etc.
4. Project-specific outputs go to \`.idumb/modules/\` (not here).

## Updating Modules

Modules are installed by \`npx idumb-v2 init\` and can be updated by running init again with \`--force\`.
`

/**
 * Command template — reference for creating OpenCode commands.
 * Deployed to .idumb/idumb-modules/commands/command-template.md
 */
export const COMMAND_TEMPLATE = `# Command Template

Use this template when creating new OpenCode commands.

## Format

\`\`\`markdown
---
description: "<what this command does>"
agent: <which agent handles this command>
model: <optional model override>
---

<prompt text that gets sent to the agent>

$ARGUMENTS
\`\`\`

## Placement

- Project-level: \`.opencode/commands/<name>.md\`
- Global: \`~/.config/opencode/commands/<name>.md\`

## Naming

Use kebab-case: \`idumb-<action>.md\`
Examples: \`idumb-init.md\`, \`idumb-settings.md\`, \`idumb-review.md\`
`

/**
 * Workflow template — reference for creating workflows.
 * Deployed to .idumb/idumb-modules/workflows/workflow-template.md
 */
export const WORKFLOW_TEMPLATE = `# Workflow Template

Workflows define multi-step processes that agents execute.

## Format

A workflow is a structured prompt that guides the agent through steps.

\`\`\`markdown
---
description: "<what this workflow accomplishes>"
agent: <which agent runs this>
---

## Step 1: <name>
<instructions>

## Step 2: <name>
<instructions>

## Completion Criteria
<how to know the workflow is done>
\`\`\`

## Available Workflows

Workflows are triggered via commands. Each command can reference an agent that executes the workflow steps.
`
