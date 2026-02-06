# Architecture

**Analysis Date:** 2026-02-06

## Pattern Overview

**Overall:** Plugin-Based Event-Driven Architecture with Hook Interception

**Key Characteristics:**
- OpenCode Plugin SDK consumer with lifecycle hooks
- Event interception at tool execution boundaries (before/after hooks)
- Zod-validated data contracts for all state transitions
- Functional state transformations with immutable patterns
- Atomic file persistence with backup-on-write

## Layers

**Plugin Entry Layer:**
- Purpose: Initialize plugin, register hooks, expose tools
- Location: `src/plugin.ts`
- Contains: Hook registration, lifecycle handlers, tool exports
- Depends on: Hooks, Tools, Lib, Schemas
- Used by: OpenCode runtime

**Hooks Layer:**
- Purpose: Intercept OpenCode events at decision boundaries
- Location: `src/hooks/`
- Contains: Tool gate (T1), Compaction (T3), Message transform (T5/T6)
- Depends on: Schemas (permission, state, trajectory), Lib (logging, persistence)
- Used by: Plugin entry point

**Tools Layer:**
- Purpose: Expose custom LLM-callable tools
- Location: `src/tools/`
- Contains: `idumb_init`, `idumb_anchor_add`, `idumb_anchor_list`, `idumb_status`, `idumb_agent_create`
- Depends on: Engines (scanner), Lib (persistence), Schemas
- Used by: Plugin entry point, LLM via OpenCode

**Engines Layer:**
- Purpose: Deterministic analysis engines (no LLM involvement)
- Location: `src/engines/`
- Contains: Codebase scanner, Framework detector
- Depends on: Schemas (scan), Node fs/path
- Used by: Tools (init)

**Schemas Layer:**
- Purpose: Zod schemas and business logic for data validation
- Location: `src/schemas/`
- Contains: State, Config, Anchor, Permission, Scan, Trajectory, Agent Profile
- Depends on: Zod
- Used by: All other layers

**Lib Layer:**
- Purpose: Cross-cutting utilities
- Location: `src/lib/`
- Contains: Logging (TUI-safe), Persistence (atomic I/O), Path resolution
- Depends on: Node fs, Schemas
- Used by: All other layers

## Data Flow

**Tool Execution Flow (T1 Permission Enforcement):**

1. User/LLM invokes tool (e.g., `write`, `bash`)
2. OpenCode fires `chat.message` → Plugin captures agent name → `setAgentRole()`
3. OpenCode fires `tool.execute.before` → `createToolGateHook()` executes
4. Hook calls `checkToolPermission(sessionId, toolName)`:
   - Retrieves cached role from `sessionTrackers` Map
   - Calls `isToolAllowedForRole(role, toolName)` from schemas/permission
   - Returns `PermissionDecision` (allowed/denied with reason)
5. If denied: Throws `ToolGateError` → OpenCode blocks execution
6. If allowed: Injects metadata into args (`__idumb_checked`, `__idumb_role`)
7. Tool executes (or is blocked)
8. OpenCode fires `tool.execute.after` → Fallback output replacement if denial failed

**Compaction Flow (T3 Context Preservation):**

1. OpenCode triggers session compaction
2. Fires `experimental.session.compacting` → `createCompactionHook()` executes
3. Hook loads config and state via `readConfig()`, `readState()`
4. Loads all anchors via `loadAllAnchors()`
5. Refreshes staleness: `enforceTimestamp()` on each anchor
6. Selects top-N anchors: `selectAnchors(anchors, budget)` by score
7. Builds governance context block with:
   - Directive (what LLM should do post-compaction)
   - Current phase/state
   - Surviving anchors (priority/type/content)
8. Pushes context into `output.context[]`
9. Post-compaction LLM sees governance directives first

**Message Transform Flow (T5/T6 Drift Detection):**

1. OpenCode fires `experimental.chat.messages.transform` before LLM call
2. Hook analyzes last 4 turns: `analyzeTurns(messages, 4)`
3. For each turn: `classifyIntent()`, `extractKeywords()`, `detectDrift()`
4. Synthesizes intent: `synthesizeIntent(turns)`
5. Builds governance anchor injection with:
   - Trajectory summary
   - Anchored user intent
   - Drift warning (if detected)
   - Role/protocol reminder (ANCHOR → REASON → VALIDATE → EXECUTE)
6. Splices governance message before last user message
7. LLM receives: [...history, GOVERNANCE_ANCHOR, user_message]

**State Management:**
- Single source of truth: `.idumb/brain/state.json`
- Immutable updates via pure functions: `addHistoryEntry()`, `addAnchor()`, `updateSession()`
- Atomic writes via `writeState()` → `atomicWrite()` (temp file + rename)
- Automatic backup on write to `.idumb/backups/`

## Key Abstractions

**SessionTracker:**
- Purpose: In-memory per-session state for permission tracking
- Examples: `src/hooks/tool-gate.ts` lines 31-38, 43
- Pattern: Map<sessionId, tracker> with role, depth, permission history

**Anchor:**
- Purpose: Context preservation unit surviving compaction
- Examples: `src/schemas/anchor.ts`
- Pattern: Priority-weighted, staleness-tracked, type-classified context

**PermissionDecision:**
- Purpose: Tool permission check result with reason and pivot suggestion
- Examples: `src/schemas/permission.ts` lines 41-47
- Pattern: Allowed/denied with actionable pivot (e.g., "delegate to builder")

**ScanResult:**
- Purpose: Complete codebase analysis snapshot
- Examples: `src/schemas/scan.ts`, output at `.idumb/brain/context/scan-result.json`
- Pattern: Deterministic filesystem analysis → gaps, debt, concerns, conventions

**Trajectory:**
- Purpose: Conversation turn analysis for drift detection
- Examples: `src/schemas/trajectory.ts`
- Pattern: Intent classification, keyword extraction, drift signals

## Entry Points

**Plugin Entry:**
- Location: `src/plugin.ts` (exports `IdumbPlugin`)
- Triggers: OpenCode plugin loader
- Responsibilities: Initialize logging, scaffold .idumb/, register all hooks and tools

**Tool Entries:**
- Location: `src/tools/*.ts`
- Triggers: LLM tool calls via OpenCode
- Responsibilities: `idumb_init` (scan), `idumb_anchor_*` (context), `idumb_status` (state)

**Hook Entries:**
- Location: `src/hooks/*.ts`
- Triggers: OpenCode events (`tool.execute.before`, `experimental.session.compacting`, etc.)
- Responsibilities: Intercept, validate, transform

## Error Handling

**Strategy:** Graceful degradation with TUI-safe logging

**Patterns:**
- Hook errors: Catch and log via `createLogger()`, never break tool execution
- ToolGateError: Purpose-built exception for permission denial (thrown to block)
- State read errors: Return default state/config
- Persistence errors: Log and continue (never crash plugin)

**Critical Constraint:** NO `console.log` anywhere — causes TUI background text exposure. All logging via `lib/logging.ts` → file-based logs in `.idumb/governance/`

## Cross-Cutting Concerns

**Logging:** 
- TUI-safe file logging via `createLogger(directory, service)`
- Logs written to `.idumb/governance/{service}-{date}.log`
- Levels: debug, info, warn, error

**Validation:** 
- All data structures validated with Zod schemas
- Parse on read, validate on write
- Schemas in `src/schemas/` provide type inference + runtime validation

**Authentication:** 
- Role detection via agent name pattern matching
- OpenCode innate agents (Build, Plan, General, Explore) mapped to roles
- Custom agents matched by substring (coordinator, builder, validator, etc.)

**Staleness Tracking:**
- All entities with Timestamp schema
- 48-hour staleness threshold
- Enforced on every read via `enforceTimestamp()`
- Stale anchors pruned unless critical priority

---

*Architecture analysis: 2026-02-06*
