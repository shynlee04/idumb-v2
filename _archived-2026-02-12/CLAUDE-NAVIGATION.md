# iDumb v2 - Code Navigation Guide

**Version:** 2.2.0
**Last Updated:** 2026-02-07
**Purpose:** Quick reference for finding specific functionality in the codebase

---

## Quick Reference: Where to Find Things

### I want to...

| Want to... | Go to... | File | LOC |
|------------|----------|------|-----|
| **Understand plugin architecture** | Entry point | `src/index.ts` | 155 |
| **Deploy agents** | CLI deployment | `src/cli/deploy.ts` | 411 |
| **Initialize iDumb** | Init tool | `src/tools/init.ts` | 441 |
| **Create/manage tasks** | Task tool | `src/tools/task.ts` | 826 |
| **Block writes without task** | Tool gate | `src/hooks/tool-gate.ts` | 282 |
| **Preserve context across compaction** | Compaction hook | `src/hooks/compaction.ts` | 104 |
| **Reduce token usage** | Message transform | `src/hooks/message-transform.ts` | 82 |
| **Persist state to disk** | State manager | `src/lib/persistence.ts` | 407 |
| **Detect framework** | Framework detector | `src/lib/framework-detector.ts` | 445 |
| **Grade code quality** | Code quality scanner | `src/lib/code-quality.ts` | 701 |
| **Resolve entity permissions** | Entity resolver | `src/lib/entity-resolver.ts` | 545 |
| **Track delegation** | Delegation schema | `src/schemas/delegation.ts` | 363 |
| **Manage planning artifacts** | Planning registry | `src/schemas/planning-registry.ts` | 729 |
| **Define task hierarchy** | Task schema | `src/schemas/task.ts` | 530 |
| **Log without TUI pollution** | Logger | `src/lib/logging.ts` | ~100 |
| **Run tests** | Test suite | `tests/*.test.ts` | 9 files |

---

## Directory-by-Directory Breakdown

### `/src/` - Root Source

**Purpose:** Plugin entry points and core orchestration

| File | Purpose | Key Functions | LOC |
|------|---------|---------------|-----|
| `index.ts` | Plugin entry point | `idumb()` - factory returning hooks + tools | 155 |
| `tools-plugin.ts` | Plugin tool registration | Exports tools for OpenCode | ~50 |
| `cli.ts` | CLI entry point | `npx idumb-v2 init` command | 431 |
| `templates.ts` | Agent/command templates | `getCoordinatorAgent()`, etc. | 1510 ⚠️ |

**When to edit:**
- `index.ts` - Adding new hooks or tools
- `cli.ts` - Adding CLI commands
- `templates.ts` - Modifying agent profiles or commands

---

### `/src/hooks/` - Plugin Hooks

**Purpose:** OpenCode event handlers that intercept and inject

| File | Hook | Purpose | Status |
|------|------|---------|--------|
| `tool-gate.ts` | `tool.execute.before` + `tool.execute.after` | Blocks writes without active task | ✅ VALIDATED |
| `compaction.ts` | `experimental.session.compacting` | Injects anchors into compaction context | ✅ VALIDATED |
| `message-transform.ts` | `experimental.chat.messages.transform` | Prunes stale tool outputs | ✅ VALIDATED |
| `system.ts` | `experimental.chat.system.transform` | Injects governance into system prompt | ⚠️ UNVERIFIED |

**Key Patterns:**

**Hook Factory Pattern (all hooks):**
```typescript
export function createHookName(log: Logger) {
  return async (input, output) => {
    try {
      // Hook logic
    } catch (error) {
      log.error(`Hook error: ${error}`)
      // P3: Never crash hooks
    }
  }
}
```

**Tool Gate Block Pattern:**
```typescript
// Check active task
if (!activeTask) {
  throw new Error([
    "GOVERNANCE BLOCK: write denied",
    "WHAT: You tried to use write without active task",
    "USE INSTEAD: Call idumb_task action=start",
    "EVIDENCE: Session has no active task",
  ].join("\n"))
}
```

**When to edit:**
- Modifying hook behavior
- Adding new governance checks
- Changing context injection logic

---

### `/src/tools/` - Custom Tools

**Purpose:** User-facing and agent-scoped tools

| File | Tool | Purpose | LOC | Tests |
|------|------|---------|-----|-------|
| `task.ts` | `idumb_task` | 3-level task hierarchy | 826 ⚠️ | 54/54 ✅ |
| `init.ts` | `idumb_init` | Initialize governance | 441 | 60/60 ✅ |
| `read.ts` | `idumb_read` | File/entity reading | 568 ⚠️ | - |
| `write.ts` | `idumb_write` | File/entity writing | 1174 ⚠️⚠️ | - |
| `scan.ts` | `idumb_scan` | Project scanning | 445 | - |
| `codemap.ts` | `idumb_codemap` | Code mapping | 521 ⚠️ | - |
| `bash.ts` | `idumb_bash` | Bash execution | 438 | - |
| `webfetch.ts` | `idumb_webfetch` | Web fetching | 365 | - |
| `anchor.ts` | `idumb_anchor` | Anchor management | ~100 | - |
| `status.ts` | `idumb_status` | Status reporting | ~100 | - |

**Tool Definition Pattern:**
```typescript
export const tool_name = tool({
  description: "What this tool does",
  args: {
    arg1: tool.schema.string().describe("Argument description"),
    arg2: tool.schema.enum(["a", "b"]).describe("Options"),
  },
  async execute(args, context) {
    // Tool logic
    return "Result string"
  }
})
```

**When to edit:**
- Adding new tool actions
- Modifying tool behavior
- Adding new tools (follow pattern)

---

### `/src/lib/` - Core Libraries

**Purpose:** Business logic, utilities, state management

| File | Purpose | Key Functions | LOC | Tests |
|------|---------|---------------|-----|-------|
| `persistence.ts` | State persistence | `StateManager`, `init()`, `save()` | 407 | 45/45 ✅ |
| `logging.ts` | TUI-safe logging | `createLogger()`, `log.info()` | ~100 | - |
| `framework-detector.ts` | Framework detection | `scanProject()`, `formatDetectionReport()` | 445 | - |
| `code-quality.ts` | Code quality scanning | `scanCodeQuality()`, grade A-F | 701 ⚠️ | - |
| `scaffolder.ts` | Directory scaffolding | `scaffoldProject()` | ~200 | - |
| `chain-validator.ts` | Chain validation | `validateChain()`, `detectBreaks()` | 300 | - |
| `entity-resolver.ts` | Entity resolution | `resolveEntity()`, `canAgentWrite()` | 545 ⚠️ | - |
| `state-reader.ts` | State reading | `readGovernanceState()` | ~150 | - |

**State Manager Pattern:**
```typescript
export class StateManager {
  // In-memory state
  private sessions = new Map<string, SessionState>()
  private anchors = new Map<string, Anchor[]>()
  private taskStore: TaskStore
  private delegationStore: DelegationStore

  // Disk persistence
  async init(directory: string, log: Logger): Promise<void>
  private async save(): Promise<void>
  private async load(): Promise<void>

  // Accessors
  getActiveTask(sessionID: string): Task | null
  setActiveTask(sessionID: string, task: Task): void
  getTaskStore(): TaskStore
  setTaskStore(store: TaskStore): void
}
```

**When to edit:**
- Adding new state to persist
- Modifying persistence logic
- Adding utility functions

---

### `/src/schemas/` - Zod Schemas

**Purpose:** Source of truth for all data structures

| File | Schema | Purpose | LOC | Tests |
|------|--------|---------|-----|-------|
| `task.ts` | TaskStore, TaskEpic, Task | Task hierarchy | 530 ⚠️ | Part of task.test.ts |
| `delegation.ts` | DelegationStore, DelegationRecord | Delegation tracking | 363 | 38/38 ✅ |
| `planning-registry.ts` | PlanningRegistry, PlanningArtifact | Planning artifacts | 729 ⚠️ | 52/52 ✅ |
| `anchor.ts` | Anchor | Context anchors | ~150 | - |
| `config.ts` | IdumbConfig | Plugin configuration | ~200 | - |
| `brain.ts` | BrainEntry, BrainStore | Knowledge persistence | ~150 | - |
| `project-map.ts` | ProjectMap | Project structure | ~200 | - |
| `codemap.ts` | CodeMapStore | Code symbols | ~250 | - |

**Schema Pattern:**
```typescript
// 1. Define Zod schema
export const AnchorSchema = z.object({
  id: z.string(),
  type: z.enum(["decision", "context", "checkpoint"]),
  content: z.string(),
  priority: z.enum(["critical", "high", "normal"]),
  createdAt: z.string(),
  staleAt: z.string().optional(),
})

// 2. Export type
export type Anchor = z.infer<typeof AnchorSchema>

// 3. Factory function
export function createAnchor(opts: {
  type: AnchorType,
  content: string,
  priority: AnchorPriority,
}): Anchor {
  const now = new Date().toISOString()
  return {
    id: `anchor-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    staleAt: new Date(Date.now() + STALE_TTL_MS).toISOString(),
    ...opts,
  }
}

// 4. Helper functions
export function scoreAnchor(anchor: Anchor): number {
  // Scoring logic
}
```

**When to edit:**
- Adding new data structures
- Modifying validation rules
- Adding helper functions

---

### `/src/modules/` - Deployable Modules

**Purpose:** Templates for user-installable modules

| Directory | Purpose |
|-----------|---------|
| `agents/` | Agent templates (user can create custom agents) |
| `commands/` | Command templates (user can create custom commands) |
| `schemas/` | Schema templates (user can extend schemas) |

**Status:** Infrastructure exists, no modules deployed yet

**When to edit:**
- Creating module templates
- Defining module API

---

### `/src/cli/` - CLI Implementation

**Purpose:** Command-line interface for iDumb

| File | Purpose | Key Functions | LOC |
|------|---------|---------------|-----|
| `deploy.ts` | Deploy agents to `.opencode/` | `deployAgents()`, `deployCommands()` | 411 |
| `dashboard.ts` | Launch dashboard | `startDashboard()` | ~100 |

**Deployment Flow:**
```typescript
// 1. Create .opencode directory structure
await mkdir(".opencode/agents", { recursive: true })

// 2. Write agent profiles from templates
for (const agent of agents) {
  await writeFile(`.opencode/agents/${agent.name}.md`, agent.profile)
}

// 3. Write command files
for (const command of commands) {
  await writeFile(`.opencode/commands/${command.name}.md`, command.content)
}

// 4. Create skills
await mkdir(".opencode/skills/idumb", { recursive: true })
// Write skill files...

// 5. Bootstrap planning registry
await writeFile(".idumb/brain/planning-registry.json", JSON.stringify(createPlanningRegistry()))
```

**When to edit:**
- Adding new deployable agents
- Modifying deployment logic
- Adding CLI commands

---

### `/src/dashboard/` - Web Dashboard

**Purpose:** Visual interface for iDumb governance

| File | Purpose | LOC |
|------|---------|-----|
| `backend/server.ts` | Express server | 563 ⚠️ |
| `frontend/` | React + Vite app | ~1000 |
| `shared/types.ts` | Shared types | ~100 |

**Status:** Implemented but not documented

**When to edit:**
- Adding dashboard features
- Modifying API endpoints
- Changing UI components

---

### `/tests/` - Test Suites

**Purpose:** Automated validation of all components

| File | Tests | Purpose |
|------|-------|---------|
| `tool-gate.test.ts` | 16/16 ✅ | Validate stop hook |
| `compaction.test.ts` | 16/16 ✅ | Validate compaction injection |
| `message-transform.test.ts` | 13/13 ✅ | Validate context pruning |
| `init.test.ts` | 60/60 ✅ | Validate init tool |
| `persistence.test.ts` | 45/45 ✅ | Validate StateManager |
| `task.test.ts` | 54/54 ✅ | Validate task hierarchy |
| `delegation.test.ts` | 38/38 ✅ | Validate delegation |
| `planning-registry.test.ts` | 52/52 ✅ | Validate planning registry |
| `smoke-code-quality.ts` | Smoke test | Run scanner on own codebase |

**Test Pattern:**
```typescript
import { describe, it } from "node:test"
import assert from "node:assert"
import { functionToTest } from "../src/path/to/file.js"

describe("Feature Name", () => {
  it("should do something specific", () => {
    const input = { /* test data */ }
    const result = functionToTest(input)
    assert.strictEqual(result.expected, actual)
  })
})
```

**When to edit:**
- Adding new tests
- Fixing broken tests
- Increasing coverage

---

## Common Tasks Quick Reference

### Task: Add a New Hook

1. Create hook file in `/src/hooks/`
2. Follow hook factory pattern
3. Add to `/src/hooks/index.ts`
4. Register in `/src/index.ts` plugin factory
5. Add tests in `/tests/`

```typescript
// src/hooks/my-hook.ts
export function createMyHook(log: Logger) {
  return async (input, output) => {
    try {
      // Hook logic
    } catch (error) {
      log.error(`MyHook error: ${error}`)
    }
  }
}
```

### Task: Add a New Tool

1. Create tool file in `/src/tools/`
2. Follow tool definition pattern
3. Add to `/src/tools/index.ts`
4. Register in `/src/index.ts` plugin factory
5. Add tests in `/tests/`

```typescript
// src/tools/my-tool.ts
import { tool } from "@opencode-ai/plugin/tool"

export const idumb_my_tool = tool({
  description: "What this tool does",
  args: {
    arg1: tool.schema.string().describe("Argument"),
  },
  async execute(args, context) {
    return "Result"
  }
})
```

### Task: Add a New Schema

1. Create schema file in `/src/schemas/`
2. Follow schema pattern
3. Add to `/src/schemas/index.ts`
4. Add tests in `/tests/`

```typescript
// src/schemas/my-schema.ts
import { z } from "zod"

export const MySchema = z.object({
  id: z.string(),
  name: z.string(),
})

export type MyType = z.infer<typeof MySchema>

export function createMy(opts: { name: string }): MyType {
  return {
    id: `my-${Date.now()}`,
    ...opts,
  }
}
```

### Task: Add a New Agent

1. Add agent template to `/src/templates.ts`
2. Add agent to deployment list in `/src/cli/deploy.ts`
3. Add agent rules to `/src/hooks/tool-gate.ts`
4. Document in `/AGENTS.md`

```typescript
// src/templates.ts
export function getMyAgent(): string {
  return `
---
description: My agent does X
mode: chat
permissions:
  write: true
  edit: true
  task: false
tools:
  - idumb_task
  - idumb_anchor

## My Agent

You are a specialized agent for X purpose.
...
`.trim()
}
```

### Task: Debug a Hook Not Firing

1. Check hook is registered in `/src/index.ts`
2. Check hook name matches OpenCode hook name exactly
3. Add debug logging to hook:
```typescript
export function createMyHook(log: Logger) {
  return async (input, output) => {
    log.info("HOOK FIRED: my-hook", { inputKeys: Object.keys(input) })
    // ...
  }
}
```
4. Check `.idumb/governance/hook-verification.log` for logs
5. Verify hook is supported in current OpenCode version

### Task: Debug a Tool Not Appearing

1. Check tool is registered in `/src/index.ts`:
```typescript
tool: {
  idumb_task,
  idumb_anchor,
  idumb_init,
  idumb_scan,
  idumb_codemap,
  // Add your tool here
}
```
2. Check tool is exported in `/src/tools/index.ts`
3. Check plugin builds: `npm run build`
4. Reload plugin in OpenCode
5. Check `/tools` command in OpenCode

### Task: Understand Data Flow

**Session → Task → Write Flow:**
1. Session starts → `chat.params` captures agent
2. `idumb_task action=start` → sets active task
3. Write tool called → `tool.execute.before` checks active task
4. Active task exists → tool allowed
5. `tool.execute.after` logs result

**Compaction → Anchor Flow:**
1. Session fills context → compaction triggers
2. `experimental.session.compacting` fires
3. Compaction hook loads anchors
4. Selects top N by score (budget-capped)
5. Injects via `output.context.push()`
6. Agent references anchor → governance validated

**Delegation Flow:**
1. Coordinator delegates: `idumb_task action=delegate`
2. Delegation record created in `delegations.json`
3. Executor receives delegation
4. Executor works, updates subtasks
5. Executor completes with evidence
6. Delegation marked complete
7. Coordinator validates, marks task complete

---

## Code Navigation Tips

### 1. Use Search Effectively

**Find all hook registrations:**
```bash
grep -r "tool.execute.before\|compacting\|system.transform\|messages.transform" src/
```

**Find all tool definitions:**
```bash
grep -r "export const idumb_" src/tools/
```

**Find all schema definitions:**
```bash
grep -r "export const.*Schema = z.object" src/schemas/
```

**Find all test files:**
```bash
ls tests/*.test.ts
```

### 2. Trace Data Flow

**State persistence:**
```
StateManager (lib/persistence.ts)
├─ hook-state.json (session state, anchors)
├─ tasks.json (task hierarchy)
├─ delegations.json (delegation records)
└─ planning-registry.json (planning artifacts)
```

**Tool execution:**
```
User calls tool
→ tool.execute.before (hooks/tool-gate.ts)
  → Check active task
  → Block or allow
→ Tool executes (tools/*.ts)
  → Perform action
  → Update state
→ tool.execute.after (hooks/tool-gate.ts)
  → Log result
  → Fallback block if needed
```

### 3. Understand File Relationships

**Plugin registration:**
```
index.ts (plugin factory)
├─ hooks/
│  ├─ tool-gate.ts
│  ├─ compaction.ts
│  ├─ message-transform.ts
│  └─ system.ts
└─ tools/
   ├─ task.ts
   ├─ anchor.ts
   ├─ init.ts
   ├─ scan.ts
   └─ codemap.ts
```

**Schema consumption:**
```
schemas/*.ts (define data structures)
├─ tools/*.ts (use schemas for validation)
├─ lib/*.ts (use schemas for typing)
└─ tests/*.test.ts (use schemas for test data)
```

---

## File Complexity Warnings

Files marked with ⚠️ are above 500 LOC and may need splitting:

| File | LOC | Recommendation |
|------|-----|----------------|
| `templates.ts` | 1510 | Split into agent-templates.ts, command-templates.ts |
| `tools/write.ts` | 1174 | Extract planning registry logic to separate module |
| `tools/task.ts` | 826 | Extract action handlers to separate files |
| `schemas/planning-registry.ts` | 729 | Extract chain management, outlier detection |
| `lib/code-quality.ts` | 701 | Extract smell detectors, grading logic |
| `tools/read.ts` | 568 | Extract entity resolution logic |
| `dashboard/backend/server.ts` | 563 | Extract API routes to separate files |
| `lib/entity-resolver.ts` | 545 | Extract classification rules to config |
| `schemas/task.ts` | 530 | Extract task operations to separate module |
| `tools/codemap.ts` | 521 | Extract symbol parsers to separate module |

---

## Summary

The iDumb v2 codebase is organized into:

- **6 hooks** (tool-gate, compaction, message-transform, system, chat.params)
- **10+ tools** (task, init, read, write, scan, codemap, bash, webfetch, anchor, status)
- **8 schemas** (task, delegation, planning-registry, anchor, config, brain, project-map, codemap)
- **8 libraries** (persistence, logging, framework-detector, code-quality, scaffolder, chain-validator, entity-resolver, state-reader)
- **3 agents** (coordinator, investigator, executor)
- **294 tests** (all passing)

**Key principle:** Every component follows a pattern - hook factory, tool definition, schema definition, factory function, helper functions.

**Next steps:** Use this guide to navigate the codebase, understand data flow, and make modifications.

---

*Navigation guide created: 2026-02-07*
*Plugin version: 2.2.0*
