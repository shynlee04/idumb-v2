# Coding Conventions

**Analysis Date:** 2026-02-06

## Naming Patterns

**Files:**
- Use `kebab-case.ts` for all source files
- Examples: `tool-gate.ts`, `framework-detector.ts`, `path-resolver.ts`

**Functions:**
- Use `camelCase` for all functions
- Export functions with descriptive verb prefixes: `create*`, `read*`, `write*`, `load*`, `save*`, `detect*`, `check*`, `build*`
- Examples: `createLogger()`, `readState()`, `detectAgentRole()`, `checkToolPermission()`

**Variables:**
- Use `camelCase` for local variables and parameters
- Use `SCREAMING_SNAKE_CASE` for constants
- Examples: `sessionTrackers`, `LOG_LEVEL_PRIORITY`, `TOOL_CATEGORIES`, `ROLE_PERMISSIONS`

**Types/Interfaces:**
- Use `PascalCase` for types, interfaces, and schemas
- Suffix Zod schemas with `Schema`: `StateSchema`, `AnchorSchema`, `ConfigSchema`
- Derive types using `z.infer<typeof Schema>`: `type State = z.infer<typeof StateSchema>`
- Examples: `Anchor`, `AnchorType`, `AgentRole`, `PermissionDecision`

**Classes:**
- Use `PascalCase` for class names
- Suffix custom errors with `Error`: `ToolGateError`

## Code Style

**Formatting:**
- 2-space indentation (no tabs)
- No trailing semicolons (using TypeScript's optional semicolons is accepted, but project uses semicolons)
- 100 character line length (approximate)

**Linting:**
- No explicit ESLint or Prettier config files detected
- TypeScript strict mode handles most quality checks

## TypeScript Configuration

**Strict Mode:** Fully enabled with all strict flags

From `tsconfig.json`:
```json
{
  "strict": true,
  "strictNullChecks": true,
  "strictFunctionTypes": true,
  "strictBindCallApply": true,
  "strictPropertyInitialization": true,
  "noImplicitAny": true,
  "noImplicitReturns": true,
  "noImplicitThis": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noFallthroughCasesInSwitch": true
}
```

**Module System:**
- ES Modules (`"type": "module"` in package.json)
- `NodeNext` module resolution
- `.js` extensions required in imports: `import { foo } from "./bar.js"`

**Target:**
- ES2022 for modern JavaScript features
- Node.js 18+ required

## Import Organization

**Order:**
1. Node.js built-in modules (`fs`, `path`)
2. External packages (`zod`, `@opencode-ai/plugin`)
3. Internal absolute imports (with `.js` extension)
4. Types imported separately with `import type`

**Pattern Example:**
```typescript
// From src/lib/persistence.ts
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "fs"
import { dirname, join, basename } from "path"
import { z } from "zod"
import {
  StateSchema,
  type State,
  createDefaultState,
} from "../schemas/index.js"
```

**Path Aliases:**
- None configured - use relative paths with `.js` extension

**Barrel Exports:**
- Each directory has `index.ts` for re-exports
- Import from barrel: `from "./schemas/index.js"`
- Locations: `src/lib/index.ts`, `src/schemas/index.ts`, `src/hooks/index.ts`, `src/tools/index.ts`, `src/engines/index.ts`

## Error Handling

**Patterns:**

1. **Try-Catch with Silent Fail (for non-critical paths):**
```typescript
// From src/lib/logging.ts
try {
  const logPath = getLogPath(directory)
  ensureLogDir(logPath)
  const entry = formatLogEntry(level, message, data)
  appendFileSync(logPath, entry)
} catch {
  // Silent fail - never pollute TUI
}
```

2. **Return null/default for missing data:**
```typescript
// From src/lib/persistence.ts
export function readJson<T>(
  filePath: string,
  schema: z.ZodType<T>,
  defaultValue: T
): T {
  if (!existsSync(filePath)) {
    return defaultValue
  }
  try {
    const content = readFileSync(filePath, "utf-8")
    const parsed = JSON.parse(content)
    return schema.parse(parsed)
  } catch {
    return defaultValue
  }
}
```

3. **Custom Error Classes (for governance enforcement):**
```typescript
// From src/hooks/tool-gate.ts
export class ToolGateError extends Error {
  public readonly role: AgentRole
  public readonly tool: string
  public readonly decision: PermissionDecision
  
  constructor(role: AgentRole, tool: string, decision: PermissionDecision) {
    super(buildDenialMessage(role, tool, decision))
    this.name = "ToolGateError"
    this.role = role
    this.tool = tool
    this.decision = decision
  }
}
```

4. **Throw to Block (for hook enforcement):**
```typescript
// From src/plugin.ts
"tool.execute.before": async (input, output) => {
  try {
    await toolGateHook(input, output)
  } catch (error) {
    // Re-throw to test P1.1 (blocking via error)
    throw error
  }
},
```

## Logging

**Framework:** Custom file-based logger (`src/lib/logging.ts`)

**CRITICAL RULE: NO console.log in plugin code!**

From plugin header comment:
```typescript
// CRITICAL: NO console.log - causes TUI background text exposure
// Use file logging via lib/logging.ts instead
```

**Pattern - Create scoped logger:**
```typescript
// From src/plugin.ts
const logger = createLogger(directory, "idumb-core")
logger.info(`iDumb v${VERSION} initializing`, { directory })
logger.debug(`Event: ${eventType}`, { sessionId })
logger.error(`tool.execute.after error: ${error}`)
```

**Log Levels:**
- `debug`: Detailed tracing (tool checks, hook execution)
- `info`: Important state changes (initialization, session events)
- `warn`: Recoverable issues (blocked tools that executed anyway)
- `error`: Failures (hook errors)

**Log Format:**
```
[2026-02-06T12:34:56.789Z] [INFO ] [module] Message {"key": "value"}
```

**Log File Location:**
- `.idumb/logs/plugin.log`
- Max size: 1MB before rotation

## Schema Validation (Zod)

**Pattern - Define Schema then derive Type:**
```typescript
// From src/schemas/anchor.ts
export const AnchorPrioritySchema = z.enum(["critical", "high", "medium", "low"])
export type AnchorPriority = z.infer<typeof AnchorPrioritySchema>

export const AnchorSchema = z.object({
  id: z.string().uuid(),
  type: AnchorTypeSchema,
  content: z.string().max(2000),
  priority: AnchorPrioritySchema,
  survives_compaction: z.boolean().default(true),
  timestamp: TimestampSchema,
})

export type Anchor = z.infer<typeof AnchorSchema>
```

**Pattern - Validation in factory functions:**
```typescript
// From src/schemas/anchor.ts
export function createAnchor(
  type: AnchorType,
  content: string,
  priority: AnchorPriority,
  options?: Partial<Anchor>
): Anchor {
  const now = new Date().toISOString()
  return AnchorSchema.parse({
    id: crypto.randomUUID(),
    type,
    content,
    priority,
    // ... rest of fields
  })
}
```

**Pattern - Generic read with schema validation:**
```typescript
// From src/lib/persistence.ts
export function readJson<T>(
  filePath: string,
  schema: z.ZodType<T>,
  defaultValue: T
): T {
  // ... read file
  return schema.parse(parsed)
}
```

**Zod Version Note:**
- Uses Zod v3.23.8
- OpenCode SDK ships Zod v4; local `src/types/plugin.ts` provides v3-compatible `tool()` helper

## Function Design

**Size:** Functions generally 20-50 lines, with clear single responsibility

**Parameters:**
- Use object destructuring for complex inputs
- First parameter often `directory` for file operations
- Return descriptive objects, not tuples

**Return Values:**
- Use `| null` for optional returns instead of undefined
- Return `{ success: boolean, ... }` or full result objects
- Schema-validated returns using `Schema.parse()`

## Module Design

**Exports:**
- Named exports preferred over default exports (except plugin entry point)
- Export both Schema and Type together
- Use barrel files (`index.ts`) for public API

**Structure:**
- Single responsibility per file
- Related functions grouped in same file
- Private helpers not exported

**Constants:**
- Define as `const` with type annotation
- Co-locate with related functions
- Example: `PATHS` object in `persistence.ts`, `TOOL_CATEGORIES` in `permission.ts`

## JSDoc Comments

**When to Comment:**
- Module header with purpose and critical notes
- All exported functions with brief description
- Complex logic blocks

**Pattern:**
```typescript
/**
 * Tool gate error - thrown to block tool execution
 * This tests P1.1: Can throwing error block tool execution?
 */
export class ToolGateError extends Error {
```

```typescript
/**
 * Main log function - NEVER uses console.log
 * 
 * @param directory - Project directory for relative log path
 * @param level - Log level
 * @param message - Log message
 * @param data - Optional structured data
 */
export function log(
```

---

*Convention analysis: 2026-02-06*
