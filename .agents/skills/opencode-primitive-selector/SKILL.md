---
name: opencode-primitive-selector
description: |
  Choose the right OpenCode primitive (Command, Skill, Tool, Prompt, CustomTool, 
  Plugin hook) for a given task or workflow. Use proactively when deciding 
  which OpenCode capability to use, or when trying to understand what's 
  available. This skill maps research and development needs to appropriate 
  OpenCode mechanisms, ensuring optimal use of the platform's capabilities.
  
  Examples:
  - "How do I search the codebase?" → select tool (read/grep)
  - "I need a reusable workflow for feature development" → select command
  - "How do I intercept file writes?" → select plugin hook
  - "What primitive should I use for systematic debugging?" → select skill
  - "I need a custom tool for X" → select CustomTool (if innate tools insufficient)
version: 1.0.0
---

# Skill: OpenCode Primitive Selector

Choose the right OpenCode primitive (Command, Skill, Tool, Prompt, CustomTool, 
Plugin hook) for a given task or workflow.

## When to Use This Skill

**Trigger this skill when:**
- Deciding which OpenCode capability to use for a task
- Trying to understand what's available in the OpenCode ecosystem
- Designing reusable workflows (command vs skill?)
- Needing to extend OpenCode functionality (CustomTool vs plugin hook?)
- Creating agents or skills (which primitive to use?)
- Unsure what primitive matches a use case

**Do NOT use when:**
- Primitive is already clear (e.g., "I need to read a file" → use `read` tool)
- Working with well-defined primitives that you already understand
- Using innate tools for basic operations (read, write, bash, etc.)

## OpenCode Primitives Overview

| Primitive | Purpose | When to Use | Example |
|-----------|---------|-------------|---------|
| **Commands** | Reusable slash commands for multi-step workflows | User-triggered workflows that combine multiple tools/steps | `/idumb-init` - Brownfield scan + scaffold + deploy |
| **Skills** | SOPs/workflows that guide agent behavior | Teaching agents how to approach tasks systematically | `systematic-debugging` - Debugging workflow |
| **Tools (Innate)** | Built-in capabilities available to all agents | File operations, web access, command execution | `read`, `write`, `bash`, `websearch`, `webfetch` |
| **Prompts** | Agent instructions defining roles and capabilities | Defining what an agent is and what it can do | Agent prompt in `templates.ts` |
| **CustomTools** | Purpose-specific tools created via `@opencode-ai/plugin` SDK | When innate tools are insufficient or too generic | `idumb_task`, `idumb_write` (entity-aware) |
| **Plugin Hooks** | Event handlers that intercept OpenCode lifecycle events | When you need to react to or control platform events | `tool.execute.before` - Block writes without active task |

## Decision Framework

### Step 1: Classify the Use Case

Ask: What type of work is this?

```
[ ] User-triggered workflow with parameters → Command
[ ] Agent behavior pattern / SOP → Skill
[ ] One-time operation / data access → Tool (Innate or Custom)
[ ] Agent definition / role definition → Prompt
[ ] Platform event interception → Plugin Hook
[ ] Custom functionality not available as innate tool → CustomTool
```

### Step 2: Evaluate Each Primitive

Use this decision tree to narrow down:

```
Is this a reusable workflow that users trigger?
├─ YES → Command
│  └─ Does it have parameters? (name, type, validation)
│     └─ YES → Command is right choice
│     └─ NO → Consider Skill (no parameters, just guidance)
│
└─ NO → Is this teaching an agent how to approach tasks?
   ├─ YES → Skill
   │  └─ Is it triggered by user request matching description?
   │     └─ YES → Skill is right choice
   │     └─ NO → Consider Prompt (agent role, not workflow)
   │
   └─ NO → Is this accessing platform capabilities (files, web, execution)?
      ├─ YES → Tool (Innate or Custom)
      │  └─ Does an innate tool already do this?
      │     ├─ YES → Use innate tool (read, write, bash, etc.)
      │     └─ NO → Create CustomTool
      │
      └─ NO → Is this defining an agent's role or capabilities?
         ├─ YES → Prompt
         │  └─ Is this agent already defined?
         │     ├─ YES → Use existing agent (coordinator, investigator, executor)
         │     └─ NO → Create new agent (requires prompt + permissions + tools)
         │
         └─ NO → Is this reacting to platform events?
            ├─ YES → Plugin Hook
            │  └─ What event? (tool.execute.before, session.compacting, etc.)
            │     └─ Check available hooks
            │
            └─ NO → Re-evaluate (might be combination of primitives)
```

### Step 3: Validate Against Constraints

Check if the chosen primitive fits the context:

```
Constraints Checklist:
[ ] Does this primitive have the needed capabilities?
[ ] Is this primitive available in the current context? (agent permissions, tool access)
[ ] Is this primitive the right abstraction level? (not too low-level, not too high-level)
[ ] Does this primitive integrate well with existing patterns?
[ ] Is there an existing primitive that does this? (check before creating new)
```

### Step 4: Document the Decision

For complex cases, document why you chose this primitive:

```
**Use Case:** [Description]

**Chosen Primitive:** [Command/Skill/Tool/Prompt/CustomTool/Hook]

**Why this primitive:**
- [Reason 1 - capability match]
- [Reason 2 - abstraction level]
- [Reason 3 - integration fit]

**Why not others:**
- [Alternative 1] - [Why not chosen]
- [Alternative 2] - [Why not chosen]

**Implementation Plan:**
- [Step 1]
- [Step 2]
```

## Primitive Selection Guide

### Command vs Skill

**Use Command when:**
- User triggers with slash command (e.g., `/my-command`)
- Workflow has input parameters (name, type, validation)
- Workflow is reusable and user-facing
- Workflow combines multiple tools/steps
- You want a consistent interface

**Use Skill when:**
- Agent triggers based on request matching description
- Workflow guides agent behavior (SOP)
- No input parameters (or minimal)
- Workflow is about "how to do X" not "do X"
- You want to teach agents a pattern

**Example Comparison:**

```
Use Case: "I need a workflow for implementing features"

Option A: Command - `/implement-feature`
✅ User triggers with `/implement-feature --name=user-auth --type=backend`
✅ Has parameters: feature name, type, priority
✅ Reusable workflow: create task → assign to executor → implement → test → complete
❌ Agent doesn't learn "how to implement features", just follows command

Option B: Skill - `feature-implementation`
✅ Agent triggers when user says "implement a feature"
✅ Teaches agent: clarify requirements → break into tasks → write tests → implement → validate
❌ No parameters, just guidance
❌ Agent learns "how to implement features" systematically

Decision: Use Skill if teaching pattern, use Command if providing reusable workflow
```

### Innate Tool vs CustomTool

**Use Innate Tool when:**
- Built-in capability exists (read, write, bash, websearch, webfetch, etc.)
- Basic operation that's universally useful
- No special validation or state management needed
- Generic enough to be platform-provided

**Use CustomTool when:**
- Innate tools don't provide the capability you need
- Need input/output schema validation (Zod)
- Need to access plugin state or context
- Need purpose-specific functionality
- Need to integrate with existing systems (e.g., iDumb tools)

**Example Comparison:**

```
Use Case: "I need to read a file"

Option A: Innate Tool - `read`
✅ Platform provides file reading
✅ Generic, universally useful
✅ Simple: path parameter → file content
❌ No entity annotation, no chain checking

Option B: CustomTool - `idumb_read`
✅ Adds entity annotation (hierarchy metadata)
✅ Multiple modes (content, outline, traverse, etc.)
✅ Chain integrity checking
❌ More complex, but provides iDumb-specific value

Decision: Use `read` for simple file access, use `idumb_read` for entity-aware I/O
```

### Skill vs Prompt

**Use Skill when:**
- Teaching agent a workflow or pattern (SOP)
- Agent triggers based on request matching description
- "How to do X" guidance
- Reusable across multiple agents (same skill for different agents)
- Progressive disclosure: metadata → body → resources

**Use Prompt when:**
- Defining an agent's role and identity
- Specifying what agent can and cannot do
- Setting agent permissions and allowed tools
- Agent-specific configuration
- One-time agent definition (not reusable as SOP)

**Example Comparison:**

```
Use Case: "I want agents to systematically debug"

Option A: Skill - `systematic-debugging`
✅ Teaches workflow: isolate → hypothesize → validate → iterate
✅ Triggered by description matching: "debug", "fix bug", "test failing"
✅ Reusable across multiple agents
✅ Progressive disclosure
❌ Doesn't define agent role, just workflow

Option B: Prompt - Agent prompt
✅ Defines agent as "debugger"
✅ Specifies debugging capabilities
✅ Sets debugging permissions and tools
❌ Not reusable, agent-specific
❌ Doesn't teach systematic workflow

Decision: Use Skill to teach workflow, use Prompt to define agent role
```

### Plugin Hook vs Tool

**Use Plugin Hook when:**
- Reacting to platform events (tool execution, session compaction, chat, etc.)
- Controlling platform behavior (block operations, transform messages, inject context)
- Running code at specific lifecycle moments
- Integrating deeply with platform
- No user-triggered action, automatic response to events

**Use Tool when:**
- User or agent explicitly invokes functionality
- On-demand operation, not event-driven
- Takes input and produces output
- Stateless or stateful computation on demand
- User-triggered via slash command or agent call

**Example Comparison:**

```
Use Case: "I need to block file writes without an active task"

Option A: Plugin Hook - `tool.execute.before`
✅ Reacts to tool execution event
✅ Can block write operations
✅ Automatic, no explicit invocation needed
✅ Deep platform integration
❌ Event-driven, not user-triggered
❌ Doesn't take user input (just context from event)

Option B: Tool - `check-task-active`
✅ User or agent explicitly invokes
✅ Returns whether task is active
✅ Takes input (optional)
❌ Requires explicit invocation
❌ Can't automatically block operations

Decision: Use Hook for automatic blocking, use Tool for manual checking
```

## Common Selection Scenarios

### Scenario 1: Searching Codebase

**Question:** "How do I search for patterns in the codebase?"

**Selection Process:**
1. Is this a reusable workflow? No, it's a one-time operation
2. Is this teaching agent behavior? No
3. Is this accessing platform capabilities? Yes (search codebase)
4. Does innate tool exist? Yes, `grep` tool

**Chosen Primitive:** Innate Tool (`grep`)

**Alternative:** CustomTool if `grep` is insufficient for specific use case

---

### Scenario 2: Creating Feature Development Workflow

**Question:** "I want a workflow that guides developers through implementing features"

**Selection Process:**
1. Is this a reusable workflow? Yes
2. Is it user-triggered with parameters? Yes (feature name, type, priority)
3. Should it be a Command or Skill?
   - Command: User triggers `/implement-feature --name=X --type=Y`
   - Skill: Agent triggers when user says "implement a feature"

**Decision:**
- If you want explicit user control with parameters → Command
- If you want agents to guide the process → Skill

**Chosen Primitive:** Command (for explicit control) OR Skill (for agent guidance)

---

### Scenario 3: Intercepting File Operations

**Question:** "I need to track all file writes and log them"

**Selection Process:**
1. Is this reacting to platform events? Yes (file writes)
2. Is this automatic (no explicit invocation)? Yes
3. Does a tool exist? No, tools are explicitly invoked

**Chosen Primitive:** Plugin Hook (`tool.execute.after` or `tool.execute.before`)

---

### Scenario 4: Teaching Debugging Pattern

**Question:** "I want agents to systematically debug issues instead of guessing"

**Selection Process:**
1. Is this teaching agent behavior? Yes (systematic debugging)
2. Is it triggered by request matching description? Yes
3. Is it a prompt (agent role) or skill (workflow)?
   - Prompt: Defines "debugger" agent
   - Skill: Teaches "how to debug" workflow

**Chosen Primitive:** Skill (`systematic-debugging`)

**Why Skill not Prompt:**
- Skill teaches workflow (isolate → hypothesize → validate → iterate)
- Prompt defines agent role (what is a debugger?)
- You can use the skill on any agent, not just a dedicated "debugger" agent

---

### Scenario 5: Entity-Aware File Writing

**Question:** "I need to write files with entity validation and lifecycle management"

**Selection Process:**
1. Is this accessing platform capabilities? Yes (write files)
2. Does innate tool exist? Yes (`write` tool)
3. Is innate tool sufficient? No (no entity validation, no lifecycle management)
4. Should I create CustomTool? Yes, adds iDumb-specific value

**Chosen Primitive:** CustomTool (`idumb_write`)

**Why CustomTool not Hook:**
- Tool is explicitly invoked (user/agent calls `idumb_write`)
- Not reacting to events (that would be a hook)

---

### Scenario 6: Creating New Agent

**Question:** "I need an agent specialized for database operations"

**Selection Process:**
1. Is this defining an agent role? Yes
2. Is this teaching a workflow? No (that would be a skill)
3. What primitives do I need?
   - Prompt: Defines agent role, permissions, tools
   - (Optional) Skill: Teaches database workflow (if systematic approach needed)

**Chosen Primitive:** Prompt (agent definition)

**Additional:** May also create Skill for database workflow (e.g., `database-migration`)

---

### Scenario 7: Injecting Context on Session Compaction

**Question:** "I need to preserve active task context across session compaction"

**Selection Process:**
1. Is this reacting to platform events? Yes (session compaction)
2. Is this automatic? Yes (no explicit invocation)
3. Does a tool exist? No, tools don't react to events

**Chosen Primitive:** Plugin Hook (`experimental.session.compacting`)

---

### Scenario 8: Reusable Research Workflow

**Question:** "I want a reusable workflow for researching technologies"

**Selection Process:**
1. Is this a reusable workflow? Yes
2. Is it user-triggered? No, agent triggers based on request
3. Is it teaching agent behavior? Yes (research workflow)

**Chosen Primitive:** Skill (`research-workflow`)

**Alternative:** Could also be Command if you want explicit `/research-tech` invocation

---

## Primitive Selection Cheat Sheet

| Use Case | Primitive | Why |
|----------|-----------|-----|
| User-triggered workflow with parameters | Command | Slash command interface, input validation |
| Teaching agent workflow/SOP | Skill | Description-triggered, reusable |
| File operations (read, write, etc.) | Innate Tool | Platform provides, no custom logic needed |
| Entity-aware operations, iDumb-specific | CustomTool | Adds validation, state, lifecycle |
| Defining agent role/permissions | Prompt | Agent configuration, one-time definition |
| Reacting to platform events | Plugin Hook | Event-driven, automatic execution |
| Searching codebase | Innate Tool (`grep`) | Platform provides |
| Systematic debugging | Skill | Teaches workflow, description-triggered |
| Blocking operations based on state | Plugin Hook | Event-driven control |
| Analyzing code structure | CustomTool (`idumb_codemap`) | iDumb-specific, adds value |
| Multi-step user workflow | Command | Reusable, parameterized |
| Agent behavior guidance | Skill | Progressive disclosure, reusable |
| Platform integration points | Plugin Hook | Deep platform access |
| Stateful operations with persistence | CustomTool | Access to plugin state |
| Agent-specific configuration | Prompt | Role definition, permissions |
| Generic operations | Innate Tool | Platform provides, universally useful |
| Domain-specific operations | CustomTool | Adds domain value |

## Integration with iDumb v2

### iDumb v2 Custom Tools

iDumb v2 provides these CustomTools that extend innate capabilities:

| Tool | Why CustomTool? | When to Use |
|------|-----------------|-------------|
| `idumb_task` | Task management, state persistence | Managing tasks, delegation |
| `idumb_write` | Entity-aware, lifecycle, planning registry integration | Writing files with governance |
| `idumb_read` | Entity annotation, multiple modes, chain checking | Reading with context |
| `idumb_bash` | Role-based permissions, evidence capture | Running commands with governance |
| `idumb_webfetch` | Research purpose, caching, brain entry linking | Fetching web content |
| `idumb_scan` | Framework detection, code quality | Brownfield scanning |
| `idumb_codemap` | Symbol extraction, TODO scanning | Code analysis |

### iDumb v2 Plugin Hooks

iDumb v2 uses these hooks for governance:

| Hook | Why Hook? | Purpose |
|------|-----------|---------|
| `tool.execute.before` | Block operations | Enforce active task requirement |
| `tool.execute.after` | Capture state | Defense-in-depth, evidence capture |
| `experimental.session.compacting` | Inject context | Preserve active task, anchors |
| `experimental.chat.system.transform` | Inject governance | Add governance directives |
| `experimental.chat.messages.transform` | Prune context | Remove stale tool outputs |
| `chat.params` | Capture agent | Auto-assign agent to task |

### iDumb v2 Skills

iDumb v2 uses skills to teach patterns:

| Skill | Why Skill? | Teaches |
|-------|-----------|---------|
| `systematic-debugging` | Debugging workflow | Isolate → hypothesize → validate |
| `test-driven-development` | TDD workflow | Test first, implement after |
| `requesting-code-review` | Review workflow | Code review before merging |
| `intent-clarification` | Clarification workflow | 5W1H framework, validation |
| `gap-analysis` | Gap identification workflow | 8 dimensions, prioritization |
| `multi-aspect-assessment` | Assessment workflow | 8 aspects, trade-offs |
| `research-workflow-planner` | Planning workflow | Phases, checkpoints, deliverables |

## Common Mistakes to Avoid

❌ **Creating CustomTool when innate tool exists**  
→ Check innate tools first (read, write, bash, websearch, etc.)

❌ **Creating Command when Skill is more appropriate**  
→ Commands for explicit user control, Skills for agent guidance

❌ **Using Hook when Tool is sufficient**  
→ Hooks for automatic/event-driven, Tools for explicit invocation

❌ **Defining agent role in Skill instead of Prompt**  
→ Prompts define roles, Skills teach workflows

❌ **Creating new primitive when existing one works**  
→ Check existing skills, commands, tools before creating new ones

❌ **Choosing primitive without considering permissions**  
→ Agent permissions determine what's available

❌ **Forgetting integration with existing primitives**  
→ How does this fit with existing skills, tools, commands?

## Integration with Other Skills

Use **after**:
- `intent-clarification` - Choose primitive once intent is clear
- `gap-analysis` - Choose primitive based on identified gaps
- `multi-aspect-assessment` - Choose primitive based on assessment findings

Use **with**:
- `research-workflow-planner` - Selected primitives become part of research plan

## Success Criteria

OpenCode primitive selection is successful when:
- ✓ Chosen primitive matches the use case
- ✓ Alternative primitives considered and rejected with reasoning
- ✓ Primitive integrates well with existing patterns
- ✓ Agent has permissions to use chosen primitive
- ✓ Documentation exists for custom primitives (CustomTools, Skills, Commands)
- ✓ Stakeholder understands the choice and trade-offs

## Outcome

After using this skill:
- Correct OpenCode primitive selected for the use case
- Clear reasoning documented for complex cases
- Alternative primitives evaluated and rejected
- Implementation plan for the chosen primitive
- Stakeholder alignment on the choice

**Never guess which primitive to use.** This skill ensures optimal use of OpenCode's capabilities.
