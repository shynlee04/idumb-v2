# OpenCode Concepts Mapping

**Created:** 2026-02-08  
**Agent:** idumb-investigator  
**Status:** Active

---

## Executive Summary

This document maps OpenCode ecosystem concepts to their iDumb v2 implementations, focusing on Commands, Skills, Prompts, Tools, CustomTools, and Plugin Development. Understanding these primitives is crucial for building effective skills that integrate seamlessly with the OpenCode platform.

---

## OpenCode Primitives Overview

| Primitive | Purpose | SDK Location | iDumb v2 Usage |
|-----------|---------|---------------|----------------|
| **Commands** | Slash commands for reusable workflows | `@opencode-ai/cli` | 4 commands: init, settings, status, delegate |
| **Skills** | SOPs/workflows triggered by description matching | `.opencode/skills/` | 2 skills: delegation, governance protocols |
| **Prompts** | Prompt engineering patterns | Agent profiles | 3 agent templates in `templates.ts` |
| **Tools** | Innate tools built into OpenCode | Built-in | File operations, web search, etc. |
| **CustomTools** | SDK patterns for tool creation | `@opencode-ai/plugin` | 5 custom tools: task, anchor, init, scan, codemap |
| **Plugin Development** | Hook registration, lifecycle | `@opencode-ai/plugin` | 6 hooks, 5 tools registered in `index.ts` |

---

## Commands

### What Are Commands?

Slash commands are reusable, user-triggered workflows that package complex multi-step operations into single commands. They provide:

- **Consistent interfaces**: Same command structure across different projects
- **Parameter validation**: Input sanitization and type checking
- **User-facing documentation**: Help text and examples
- **Workflow encapsulation**: Multi-step operations in one command

### Command Structure

Commands are YAML files in `.opencode/commands/` with the following structure:

```yaml
name: /command-name
description: What this command does
version: 1.0.0
parameters:
  - name: param1
    type: string
    required: true
    description: Parameter description
  - name: param2
    type: enum
    required: false
    default: option1
    options:
      - option1
      - option2
```

### iDumb v2 Commands

All 4 commands are deployed by `src/cli/deploy.ts` via `npx idumb-v2 init`:

| Command | Description | Purpose |
|---------|-------------|---------|
| `/idumb-init` | Initialize iDumb v2 in a project | Runs brownfield scan, scaffolds .idumb/, deploys agents + commands + modules |
| `/idumb-settings` | Configure iDumb v2 settings | Modify governance mode, experience level, language preferences |
| `/idumb-status` | Show iDumb v2 status | Display active tasks, governance state, code quality metrics |
| `/idumb-delegate` | Delegate tasks to agents | Handoff with context, expected output, permission boundaries |

### Command Template

Located at `.idumb/idumb-modules/commands/command-template.md`, provides:
- Command structure examples
- Parameter type definitions
- Validation patterns
- Error handling patterns

---

## Skills

### What Are Skills?

Skills are SOPs (Standard Operating Procedures) and workflows that extend agent capabilities. They are **NOT agent roles** — they are reusable processes that any agent can follow. Skills are triggered by matching the user's request to the skill's `description` field.

### Skill Discovery Mechanism

1. **Frontmatter-based**: Each skill has a YAML frontmatter with `name` and `description`
2. **Description matching**: OpenCode matches user requests to skill descriptions using semantic similarity
3. **Automatic loading**: When a match is found, the skill's instructions are injected into the agent's context
4. **Progressive disclosure**: Skills structure content into metadata → body → bundled resources

### Skill Structure

Skills live in `.opencode/skills/` (user-level) or `.agents/skills/` (project-level) with the following structure:

```markdown
---
name: skill-name
description: >
  What this skill does. Use proactively when [trigger conditions].
  Examples:
  - User says "X" → trigger this skill
  - User says "Y" → trigger this skill
version: 1.0.0
---

# Skill: skill-name

Skill content goes here...
```

### Frontmatter Requirements

The `description` field is the **PRIMARY trigger mechanism**. It must be:
- **Clear and specific**: Precise language about when to use the skill
- **Action-oriented**: Start with verbs or capability descriptions
- **Context-aware**: Include "Use proactively when..." phrases
- **Example-rich**: 3-5 concrete examples of trigger scenarios
- **Multi-line**: Use `|` or `>` for multi-line descriptions

### Skill Lifecycle

1. **Creation**: Skill file created in `.agents/skills/skill-name/SKILL.md`
2. **Discovery**: OpenCode scans skill directories and indexes skills
3. **Trigger**: User request matches skill description
4. **Injection**: Skill content loaded into agent context
5. **Execution**: Agent follows skill instructions
6. **Iteration**: Skill updated based on feedback

### iDumb v2 Skills

**Deployed Skills:**
- `.opencode/skills/delegation.md` - Delegation protocol (deployed via CLI)
- `.opencode/skills/governance-protocol.md` - Governance protocol (deployed via CLI)

**Project-Level Skills (examples from existing):**
- `brainstorming` - Create creative work, features, components
- `systematic-debugging` - Debugging workflow before proposing fixes
- `test-driven-development` - TDD before writing implementation code
- `requesting-code-review` - Code review before merging
- `verification-before-completion` - Run verification commands before claiming work is done
- `writing-plans` - Create high-level multi-round plans before touching code
- `executing-plans` - Execute implementation plans in separate sessions with review checkpoints
- `subagent-driven-development` - Execute implementation plans with independent tasks
- `create-opencode-plugin` - Create OpenCode plugins using @opencode-ai/plugin SDK
- `command-creator` - Create Claude Code slash commands
- `find-skills` - Discover and install agent skills
- `opencode-config` - Edit opencode.json, AGENTS.md, config files
- `idumb-meta-builder` - Transform specs into structured iDumb workflow modules
- `hierarchical-mindfulness` - Orchestrate, delegate, coordinate agents
- `mermaid-diagrams` - Create diagrams using Mermaid syntax
- `tailwind-v4-shadcn` - Set up Tailwind v4 with shadcn/ui
- `shadcn-ui` - shadcn/ui component library guide
- `web-search` - Web search and content extraction
- `frontend-design` - Create production-grade frontend interfaces
- `web-design-guidelines` - Review UI code for compliance
- `opentui` - Terminal user interfaces
- `mcp-builder` - Create MCP servers for external services
- `ralph-loop` - Automated agent-driven development
- `skill-creator` - Create and refine OpenCode skills
- `agent-architect` - Create and refine OpenCode agents
- `agent-browser` - Browser automation CLI for AI agents
- `dispatching-parallel-agents` - Execute 2+ independent tasks in parallel
- `opencode-bridge` - Bridge between OpenWork UI and OpenCode runtime
- `finishing-a-development-branch` - Decide how to integrate completed work
- `architecture-patterns` - Clean Architecture, Hexagonal, DDD
- `using-git-worktrees` - Create isolated git worktrees
- `using-superpowers` - Establish how to find and use skills

### Skill-Creator Skill Guidelines

The skill-creator skill provides the canonical pattern for skill creation:

**Core Principles:**
1. **Skills are SOPs, NOT agent roles** - Describe processes, not identities
2. **Description is the trigger** - Invest heavily in the `description` field
3. **Progressive disclosure** - Structure as metadata → body → resources
4. **Under 500 lines** - Keep skills focused and consumable
5. **Directory name matches frontmatter** - `skill-name/` directory must match `name: skill-name` in SKILL.md

**Frontmatter Best Practices:**
```markdown
---
name: skill-name
description: |
  Action verb/capability. Use proactively when [trigger contexts].
  Examples:
  - "User says X" → trigger
  - "User says Y" → trigger
version: 1.0.0
---
```

**Content Structure:**
1. **Metadata**: Frontmatter with name, description, version
2. **Body**: Instructions, workflows, examples
3. **Bundled Resources** (optional): `scripts/`, `references/`, `assets/`

---

## Prompts

### What Are Prompts?

Prompts are the instructions that guide AI agents in OpenCode. They define:
- **Agent roles**: What the agent is responsible for
- **Capabilities**: What the agent can and cannot do
- **Workflows**: How the agent should approach tasks
- **Constraints**: Limits on agent behavior

### Prompt Engineering Patterns in iDumb v2

iDumb v2 uses structured prompts in agent templates (`src/templates.ts`):

**Agent Template Pattern:**
```typescript
export function getCoordinatorAgent(): OpenCodeAgent {
  return {
    name: "idumb-supreme-coordinator",
    description: "...",
    model: "claude-3.5-sonnet",
    permissions: {...},
    allowedTools: [...],
    prompt: `
      You are the ${agentName} agent.
      
      ## Your Role
      [Role description]
      
      ## Key Tools
      [Tool descriptions]
      
      ## Boundaries
      [What you can/cannot do]
      
      ## Workflow
      [Step-by-step process]
    `,
  }
}
```

### 3-Agent Prompt Architecture

1. **Supreme Coordinator (L0)**: Pure orchestrator, delegates everything, no direct writes
2. **Investigator (L1)**: Research, analysis, planning, brain entries, no implementation
3. **Executor (L1)**: Code implementation, builds, tests, validation

Each agent has:
- **Clear role definition** - What the agent is responsible for
- **Tool permissions** - What tools the agent can use
- **Boundaries** - What the agent cannot do
- **Workflow instructions** - How to approach tasks

---

## Tools

### What Are Tools?

Tools are the building blocks that agents use to interact with the system. They provide:
- **File operations**: Read, write, delete files
- **Web access**: Search, fetch, analyze URLs
- **Execution**: Run commands, build projects
- **System integration**: Git, package managers, etc.

### Innate vs Custom Tools

**Innate Tools:** Built into OpenCode, available to all agents:
- `read` - Read file contents
- `write` - Write file contents
- `edit` - Edit file with diff
- `bash` - Execute shell commands
- `websearch` - Search the web
- `webfetch` - Fetch web content
- And many more...

**Custom Tools:** Created by plugins using `@opencode-ai/plugin` SDK:
- Schema-defined input/output
- Purpose-specific functionality
- Integration with plugin state
- Permission-scoped access

### Tool Permissions

Tools have role-based permissions defined in agent profiles:

```typescript
{
  permissions: {
    tools: {
      allowed: ["read", "bash"],
      denied: ["write", "edit"]
    }
  }
}
```

**iDumb v2 Custom Tools:**

| Tool | Permissions |
|------|-------------|
| `idumb_task` | All agents (role-based actions) |
| `idumb_anchor` | All agents (add/list context anchors) |
| `idumb_init` | Coordinator only (initialization) |
| `idumb_scan` | Investigator only (read-only scanning) |
| `idumb_codemap` | Investigator only (read-only symbol extraction) |
| `idumb_read` | All agents (5 modes, entity-aware) |
| `idumb_write` | Executor (all), Investigator (brain only), Coordinator (none) |
| `idumb_bash` | Executor (all), Investigator (read-only), Coordinator (none) |
| `idumb_webfetch` | Investigator only (research) |

---

## CustomTools (SDK Patterns)

### CustomTool Structure

Custom tools are defined using the `@opencode-ai/plugin` SDK:

```typescript
export function myCustomTool(context: ToolContext): Tool {
  return {
    name: "my-custom-tool",
    description: "What this tool does",
    input: z.object({
      param1: z.string(),
      param2: z.number().optional(),
    }),
    output: z.object({
      result: z.string(),
      metadata: z.record(z.any()).optional(),
    }),
    handler: async (input, context) => {
      // Tool implementation
      return { result: "..." };
    },
  };
}
```

### Tool Registration

Tools are registered in the plugin entry point (`src/index.ts`):

```typescript
export default function opencodePlugin(context: PluginContext) {
  return {
    name: "idumb-v2",
    version: "1.0.0",
    tools: [
      idumbTaskTool,
      idumbAnchorTool,
      idumbInitTool,
      idumbScanTool,
      idumbCodemapTool,
      idumbReadTool,
      idumbWriteTool,
      idumbBashTool,
      idumbWebfetchTool,
    ],
    hooks: [...],
  };
}
```

### Tool-Gate Pattern

The tool-gate pattern blocks certain tools without an active task:

```typescript
export async function toolGate(context: HookContext) {
  const { toolName } = context.tool;
  
  // Check if this is a write/edit operation
  if (WRITE_EDIT_TOOLS.includes(toolName)) {
    const state = stateManager.readHookState();
    if (!state.activeTaskId) {
      return {
        block: true,
        error: `Tool ${toolName} blocked: No active task. Use idumb_task start to begin work.`,
      };
    }
  }
  
  return { block: false };
}
```

### iDumb v2 Custom Tool Examples

**1. `idumb_task`** (826 LOC ⚠️)
- 12 actions for task management
- Schema: Epic/Task/Subtask hierarchy
- Integration: Delegation routing, category-aware

**2. `idumb_write`** (1174 LOC ⚠️⚠️)
- 4 modes: create, overwrite, append, update-section
- Lifecycle management: activate, supersede, abandon, resolve
- Entity-aware writing with schema validation
- Planning registry integration

**3. `idumb_read`** (568 LOC ⚠️)
- 5 modes: content, outline, traverse, comments, chain-check
- Entity annotation with hierarchy metadata
- Chain integrity checking

---

## Plugin Development

### What Is a Plugin?

An OpenCode plugin is a package that extends OpenCode with:
- **Custom tools**: Purpose-specific functionality
- **Hooks**: Lifecycle event handlers
- **State management**: Persistent data storage
- **UI components**: Dashboard elements (optional)

### Plugin Entry Point

Plugins export a default function that receives a `PluginContext`:

```typescript
import type { PluginContext } from "@opencode-ai/plugin";

export default function opencodePlugin(context: PluginContext) {
  return {
    name: "plugin-name",
    version: "1.0.0",
    tools: [...],
    hooks: [...],
  };
}
```

### Hook Registration

Hooks are registered as part of the plugin export:

```typescript
export default function opencodePlugin(context: PluginContext) {
  return {
    name: "idumb-v2",
    version: "1.0.0",
    hooks: [
      {
        event: "tool.execute.before",
        handler: toolGate,
      },
      {
        event: "experimental.session.compacting",
        handler: compactionAnchorInjector,
      },
    ],
  };
}
```

### Hook Lifecycle

1. **Registration**: Plugin registers hooks in entry point
2. **Triggering**: OpenCode fires hooks at specific events
3. **Execution**: Hook handler receives context, returns result
4. **Graceful degradation**: Hooks wrapped in try/catch, failures logged

### iDumb v2 Hook Implementation

**6 Registered Hooks:**

| Hook | Event | Handler | Status |
|------|-------|---------|--------|
| Event | `event` | `eventLogger` | Works |
| Tool gate | `tool.execute.before` | `toolGate` | **VALIDATED** (16/16 tests) |
| Defense | `tool.execute.after` | `defenseInDepth` | Unit-tested |
| Compaction | `experimental.session.compacting` | `compactionAnchorInjector` | Unit-tested (16/16 tests) |
| System transform | `experimental.chat.system.transform` | `systemTransformInjector` | **UNVERIFIED** |
| Message transform | `experimental.chat.messages.transform` | `messageTransformPruner` | **UNVERIFIED** |
| Chat params | `chat.params` | `chatParamsCapture` | **REGISTERED** |

### Hook Factory Pattern

Every hook is a function that returns an async handler:

```typescript
export function compactionAnchorInjector(context: HookContext): HookFactory {
  return async (event: any) => {
    try {
      const state = stateManager.readHookState();
      
      if (state.activeTaskId) {
        const anchor = {
          type: "task",
          priority: "critical",
          content: `Active task: ${state.activeTaskId}`,
        };
        
        event.output.context.push(anchor);
      }
      
      return { block: false };
    } catch (error) {
      logger.error("Compaction hook error", error);
      return { block: false };
    }
  };
}
```

### Graceful Degradation

All hooks follow the graceful degradation pattern:

```typescript
try {
  // Hook logic
  return { block: false };
} catch (error) {
  logger.error("Hook error", error);
  // Never block on error
  return { block: false };
}
```

---

## SDK Architecture

### Core Abstractions

The `@opencode-ai/plugin` SDK provides these core abstractions:

**1. PluginContext**
- Plugin configuration
- State management
- Tool registration
- Hook registration

**2. ToolContext**
- Input parameters
- Output generation
- State access
- Error handling

**3. HookContext**
- Event data
- State access
- Block/control flow
- Logging

**4. StateManager**
- Disk persistence
- Type-safe state
- Migration support

### Integration Points

iDumb v2 integrates with the SDK at these points:

1. **Plugin Entry** (`src/index.ts`): Registers tools and hooks
2. **Tool Factory** (`src/tools-plugin.ts`): Wraps tools with SDK
3. **State Management** (`src/lib/persistence.ts`): StateManager for hook state, TaskStore, etc.
4. **Logging** (`src/lib/logging.ts`): TUI-safe file-based logging

---

## Anti-Patterns & Pitfalls

### Command Anti-Patterns

❌ **Don't**: Create commands that do one small thing
✅ **Do**: Package multi-step workflows into single commands

❌ **Don't**: Use vague parameter names
✅ **Do**: Use descriptive names with validation

❌ **Don't**: Ignore error handling
✅ **Do**: Provide clear error messages and recovery paths

### Skill Anti-Patterns

❌ **Don't**: Create skills that describe agent roles
✅ **Do**: Create skills that describe workflows/SOPs

❌ **Don't**: Write vague descriptions
✅ **Do**: Invest heavily in the `description` field with concrete examples

❌ **Don't**: Create monolithic skills > 500 lines
✅ **Do**: Keep skills focused and consumable

❌ **Don't**: Use generic AI-generated content
✅ **Do**: Write domain-specific, actionable instructions

### Tool Anti-Patterns

❌ **Don't**: Create tools without schema validation
✅ **Do**: Use Zod or similar for input/output validation

❌ **Don't**: Ignore error handling
✅ **Do**: Wrap in try/catch and provide context

❌ **Don't**: Block without explanation
✅ **Do**: Provide clear error messages with recovery paths

### Plugin Anti-Patterns

❌ **Don't**: Register hooks without error handling
✅ **Do**: Always wrap hooks in try/catch

❌ **Don't**: Block on hook errors
✅ **Do**: Always return `{ block: false }` on error

❌ **Don't**: Use `console.log`
✅ **Do**: Use TUI-safe file-based logging

---

## Summary: Key Takeaways

1. **Commands**: Reusable slash commands for multi-step workflows. iDumb v2 has 4: init, settings, status, delegate.

2. **Skills**: SOPs/workflows triggered by description matching. NOT agent roles. iDumb v2 has 2 deployed + 30+ project-level skills.

3. **Prompts**: Agent instructions defining roles, capabilities, workflows, and constraints. iDumb v2 uses 3-agent prompt architecture.

4. **Tools**: Innate tools (built-in) vs Custom tools (plugin-created). iDumb v2 has 9 custom tools with role-based permissions.

5. **CustomTools**: SDK-defined tools with schema validation, purpose-specific functionality, and permission-scoped access.

6. **Plugin Development**: Hook registration, lifecycle management, graceful degradation. iDumb v2 has 6 registered hooks.

7. **SDK Architecture**: PluginContext, ToolContext, HookContext, StateManager abstractions with clear integration points.

8. **Anti-Patterns**: Avoid vague descriptions, monolithic skills, missing error handling, console.log, blocking on errors.

---

**Analysis complete. Ready for skill suite design.**
