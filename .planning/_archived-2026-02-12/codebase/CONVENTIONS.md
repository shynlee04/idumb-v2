# Coding Conventions

**Analysis Date:** 2026-02-09

## Naming Patterns

**Files:**
- Use `kebab-case.ts` for all source files: `tool-gate.ts`, `message-transform.ts`, `sdk-client.ts`
- Test files: `{module}.test.ts` in `tests/` directory: `compaction.test.ts`, `tasks.test.ts`
- Schema files: singular noun: `task.ts`, `anchor.ts`, `config.ts`, `delegation.ts`
- Barrel exports: `index.ts` in every directory (`src/hooks/index.ts`, `src/tools/index.ts`, `src/schemas/index.ts`, `src/lib/index.ts`)

**Functions:**
- Use `camelCase` for all functions: `createCompactionHook`, `getActiveTask`, `findTaskNode`
- Factory functions: `create{Thing}` pattern: `createLogger()`, `createAnchor()`, `createWorkPlan()`, `createTaskNode()`
- Hook factories: `create{Name}Hook` pattern: `createCompactionHook()`, `createSystemHook()`, `createMessageTransformHook()`
- Boolean queries: `is{Condition}` pattern: `isStale()`, `isInitialized()`, `isDegraded()`
- Getters: `get{Thing}` pattern: `getAnchors()`, `getActiveTask()`, `getGovernanceStatus()`
- Setters: `set{Thing}` pattern: `setClient()`, `setActiveTask()`, `setTaskStore()`

**Variables:**
- Use `camelCase` for all variables and parameters: `sessionID`, `activeTask`, `criticalAnchors`
- Private module-level variables: underscore prefix: `_client`, `_require`, `_pkg`

**Types:**
- Use `PascalCase` for types and interfaces: `Anchor`, `TaskNode`, `WorkPlan`, `Logger`, `StateManager`
- Type aliases for union enums: `PascalCase`: `AnchorType`, `AnchorPriority`, `GovernanceMode`, `TaskNodeStatus`
- Type-only imports use `import type`: `import type { Anchor } from "../schemas/index.js"`

**Constants:**
- Use `SCREAMING_SNAKE_CASE`: `INJECTION_BUDGET_CHARS`, `STALE_HOURS`, `KEEP_RECENT`, `TRUNCATE_TO`
- Version constants: `TASK_STORE_VERSION`, `DELEGATION_STORE_VERSION`, `PLAN_STATE_VERSION`
- Map/Set constants: `PRIORITY_WEIGHTS`, `EXEMPT_TOOLS`, `CHECKPOINT_TOOLS`

**Exported tool names:**
- Use `snake_case` for tool exports matching OpenCode convention: `tasks_start`, `tasks_done`, `idumb_anchor`, `idumb_init`

## Code Style

**Formatting:**
- No explicit formatter configured (no `.prettierrc`, no `eslint.config.*`)
- 2-space indentation used throughout
- Semicolons omitted (no-semicolon style) — consistent across all files
- Trailing commas in multi-line object/array literals
- Single quotes NOT used — all string literals use double quotes `"`

**Linting:**
- No ESLint or Biome configured
- TypeScript strict mode enforces quality via `tsconfig.json`:
  - `"strict": true`
  - `"noImplicitAny": true`
  - `"noUnusedLocals": true`
  - `"noUnusedParameters": true`
  - `"noImplicitReturns": true`
  - `"forceConsistentCasingInFileNames": true`

**TypeScript Configuration:**
- Target: `ES2022`
- Module: `NodeNext` / `moduleResolution: NodeNext`
- Strict mode with all extra checks enabled
- Source maps and declaration maps enabled
- Root: `src/`, Output: `dist/`

## Import Organization

**Order:**
1. Node built-in modules: `import { existsSync } from "node:fs"`, `import { join } from "node:path"`
2. External packages: `import { tool } from "@opencode-ai/plugin/tool"`, `import { z } from "zod"`
3. Internal types (type-only imports): `import type { Anchor } from "../schemas/index.js"`
4. Internal modules: `import { stateManager } from "../lib/persistence.js"`

**Path Aliases:**
- No path aliases configured. All imports use relative paths with `.js` extension.

**Import Extension Rule (CRITICAL):**
- ALL imports MUST use `.js` extension, even for `.ts` source files. This is required by NodeNext module resolution.
- Correct: `import { createLogger } from "./lib/logging.js"`
- Wrong: `import { createLogger } from "./lib/logging"` or `import { createLogger } from "./lib/logging.ts"`

**Barrel Export Pattern:**
- Each directory has an `index.ts` that re-exports public API
- `src/hooks/index.ts`: re-exports hook factories
- `src/tools/index.ts`: re-exports tool definitions with rename (`start as tasks_start`)
- `src/schemas/index.ts`: comprehensive re-export of all schemas, types, and helpers (155 lines)
- `src/lib/index.ts`: re-exports utilities and singletons
- Separate `export type` statements for type-only exports:
  ```typescript
  export { createAnchor, scoreAnchor } from "./anchor.js"
  export type { Anchor, AnchorType } from "./anchor.js"
  ```

## Error Handling

**P3 Pattern (Graceful Degradation):**
- Every hook handler is wrapped in a top-level try/catch that catches all errors
- On failure, log the error and return silently — never crash the host
- This is referred to as "P3" throughout the codebase (Principle 3)
- Example from `src/hooks/compaction.ts`:
  ```typescript
  try {
    // ... hook logic
  } catch (error) {
    // P3: Never break compaction — this is critical
    log.error(`Compaction hook error: ${error}`)
  }
  ```

**Tool Error Returns:**
- Tools return error strings prefixed with `"ERROR: "` — they never throw
- Error messages are instructive: tell what went wrong AND what to do instead
- Example from `src/tools/tasks.ts`:
  ```typescript
  if (!activeTask) {
    return "ERROR: No active task. Start one with tasks_start."
  }
  ```

**Inline try/catch for Optional Features:**
- Empty catch blocks are acceptable for truly optional operations
- Always comment WHY the error is swallowed: `// P3: Never crash on log failure`
- Example from `src/lib/logging.ts`:
  ```typescript
  try {
    writeFileSync(logFile, line, { flag: "a" })
  } catch {
    // P3: Never crash on log failure
  }
  ```

**Validation Pattern:**
- Schema validation returns `{ valid: boolean, reason: string }` objects — never throws
- Functions like `validateCompletion()`, `validateTaskStart()`, `validateDelegation()` follow this pattern
- Callers check `.valid` and use `.reason` for error messages

## Logging

**Framework:** File-based logger via `createLogger()` from `src/lib/logging.ts`

**CRITICAL RULE: NO `console.log` ANYWHERE**
- `console.log` breaks TUI rendering in OpenCode
- Use `createLogger(directory, serviceName, minLevel)` instead
- Logs write to `.idumb/logs/{serviceName}.log`
- SDK client logging is optional (fire-and-forget via `client.app.log()`)

**Logger Interface:**
```typescript
interface Logger {
  debug(msg: string, meta?: Record<string, unknown>): void
  info(msg: string, meta?: Record<string, unknown>): void
  warn(msg: string, meta?: Record<string, unknown>): void
  error(msg: string, meta?: Record<string, unknown>): void
}
```

**Patterns:**
- Create logger at module initialization: `const log = createLogger(directory, "idumb-core")`
- Use structured metadata as second argument: `log.info("Task started", { sessionID, taskName })`
- Log at appropriate levels:
  - `debug`: Hook fired events, config details, injection sizes
  - `info`: State changes (task started, agent captured, compaction injected)
  - `warn`: Budget exceeded, config load issues, degraded state
  - `error`: Hook failures, disk I/O errors, unexpected states

**Log Format:**
```
[2026-02-09T12:00:00.000Z] [INFO] [idumb-core] Task started {"sessionID":"abc","taskName":"Fix bug"}
```

## Comments

**When to Comment:**
- File-level JSDoc block at top of every file explaining purpose, design principles, and consumers
- Example from `src/hooks/compaction.ts`:
  ```typescript
  /**
   * Compaction Hook — preserves critical context across session compaction.
   *
   * P3: try/catch — never break compaction
   * P5: In-memory anchor store — no file I/O in hot path
   * Pitfall 7: Budget-capped injection ≤500 tokens (~2000 chars)
   */
  ```

**Principle References:**
- Inline comments frequently reference design principles by code: `P3`, `P5`, `P7`, `DO #5`, `DON'T #9`, `DON'T #11`
- These map to a set of documented design principles (DOs and DON'Ts from the project's pitfalls document)

**Section Dividers:**
- Use horizontal rule comments to separate logical sections:
  ```typescript
  // ─── Helpers ─────────────────────────────────────────────────────────
  // ─── tasks_start ─────────────────────────────────────────────────────
  ```
- Both `// ───` (single-line) and `// ══════` (double-line for test groups) patterns used

**JSDoc/TSDoc:**
- JSDoc `/** */` blocks on exported functions and interfaces
- Brief single-line JSDoc for simple exports: `/** Budget in characters (~500 tokens at ~4 chars/token) */`
- Parameter documentation via `@param` when non-obvious

## Function Design

**Size:**
- Target 300-500 LOC per file. Files >500 LOC are flagged as tech debt
- Individual functions are typically 10-40 lines
- Tool `execute` methods are 15-50 lines

**Parameters:**
- Tool args defined via `tool.schema` Zod builders: `tool.schema.string()`, `tool.schema.enum()`
- Optional parameters use `.optional()` and are checked at runtime with `if (!param)`
- Context always passed as second arg to tool execute: `async execute(args, context)`
- Hook factories take `log: Logger` as primary parameter, return async handler

**Return Values:**
- Tools return `string` — either a 1-line success message or `"ERROR: ..."` message
- `tasks_check` is the exception: returns JSON string (parsed by agent)
- Hook handlers return `Promise<void>` — side effects via `output` parameter mutation
- Schema helpers return plain objects or arrays — never Promises

## Module Design

**Exports:**
- Named exports only (no default exports) except `src/index.ts` which exports `default idumb`
- Separate `export type` for types vs `export` for values
- Tools export individual tool definitions: `export const start = tool({ ... })`
- Hook factories export creator functions: `export function createCompactionHook(log: Logger)`

**Barrel Files:**
- Every directory (`hooks/`, `tools/`, `schemas/`, `lib/`) has `index.ts`
- All public API goes through barrel files
- Internal-only helpers are NOT re-exported through barrels
- Re-exports may rename: `export { start as tasks_start } from "./tasks.js"`

**Singleton Pattern:**
- `StateManager` uses singleton for persistence: `export const stateManager = new StateManager()` in `src/lib/persistence.ts`
- SDK client uses module-level variable: `let _client: SdkClient | null = null` in `src/lib/sdk-client.ts`
- In-memory anchor store managed via `StateManager` singleton

## Zod Schema Strategy

**Where Zod is Used:**
- External data validation on disk reads (`src/lib/persistence.ts`): `PersistedStateSchema`, `TaskStoreSchema`, `TaskGraphSchema`
- Tool argument definitions via `tool.schema` builder (`src/tools/tasks.ts`, `src/tools/anchor.ts`)
- Config validation (`src/schemas/config.ts`)

**Where Zod is NOT Used:**
- Internal state interfaces use plain TypeScript: `interface Anchor`, `interface TaskNode`, `interface WorkPlan`
- This is an explicit design decision documented as "DON'T #9: no Zod for internal state"
- Schemas define shape-level validation, nested data passes through as `z.any()`

**Pattern:**
```typescript
// Zod for disk read validation (permissive shape check)
const TaskStoreSchema = z.object({
  version: z.string(),
  activeEpicId: z.string().nullable(),
  epics: z.array(z.any()),
})

// Plain TS for internal state
export interface TaskStore {
  version: string
  activeEpicId: string | null
  epics: TaskEpic[]
}
```

## Hook Factory Pattern

**All hooks follow the same factory pattern** (documented as "DO #5"):

```typescript
export function createSomeHook(log: Logger) {
  // Captured state in closure
  return async (
    input: { sessionID: string; ... },
    output: { context: string[]; ... },
  ): Promise<void> => {
    try {
      // Hook logic — mutate output, never throw
    } catch (error) {
      log.error(`Hook error: ${error}`)
    }
  }
}
```

- Factory captures logger (and optionally directory, config)
- Returns async handler matching OpenCode's hook signature
- Top-level try/catch for P3 graceful degradation
- Created in `src/index.ts`, wired to OpenCode event names

## Tool Definition Pattern

**All tools use the `tool()` builder from `@opencode-ai/plugin/tool`:**

```typescript
import { tool } from "@opencode-ai/plugin/tool"

export const some_tool = tool({
  description: "Agent-facing description. Describe rewards, not rules.",
  args: {
    param: tool.schema.string().describe("Example: 'Fix auth bug'"),
    optional: tool.schema.string().optional().describe("Optional param"),
  },
  async execute(args, context) {
    const { sessionID } = context
    // ... tool logic
    return "1-line output."  // Signal-to-Noise principle
  },
})
```

**Tool Design Principles (NON-NEGOTIABLE):**
1. Iceberg: hide bureaucracy behind simple interfaces
2. Native Parallelism: `tasks_add` called N times, no JSON batch
3. Signal-to-Noise: 1-line output, pull-not-push
4. Context Inference: never ask for what the system already knows
5. No-Shadowing: describe rewards, not rules

## ID Generation

**Pattern used throughout schemas:**
```typescript
const id = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
```
- Prefix indicates entity type: `anchor-`, `epic-`, `task-`, `wp-`, `tn-`, `cp-`, `deleg-`
- Timestamp + random suffix ensures uniqueness without external deps

---

*Convention analysis: 2026-02-09*
