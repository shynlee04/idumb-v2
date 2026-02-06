# External Integrations

**Analysis Date:** 2026-02-06

## OpenCode Plugin SDK Integration

**Package:** `@opencode-ai/plugin` ^1.1.52

**Plugin Entry Point:** `src/plugin.ts`

**Export Pattern:**
```typescript
import type { Plugin } from "@opencode-ai/plugin"

export const IdumbPlugin: Plugin = async ({ directory }) => {
  // Initialize and return hooks + tools
}

export default IdumbPlugin
```

**OpenCode Configuration (`package.json`):**
```json
{
  "opencode": {
    "plugin": "dist/plugin.js"
  }
}
```

## Plugin Hooks Used

### Session Lifecycle Hooks

**`event`** - Session lifecycle events
- Location: `src/plugin.ts` lines 71-100
- Events handled: `session.created`, `session.idle`, `session.compacted`
- Purpose: Track session lifecycle, record history entries

### Agent Detection

**`chat.message`** - Captures agent name for role-based permissions
- Location: `src/plugin.ts` lines 110-116
- Purpose: Detect agent name (unavailable in `tool.execute.before`)
- Sets agent role for subsequent permission checks

### Tool Execution Hooks (TRIAL-1)

**`tool.execute.before`** - Pre-execution permission gate
- Location: `src/plugin.ts` lines 130-138
- Implementation: `src/hooks/tool-gate.ts` `createToolGateHook()`
- Purpose: Block unauthorized tool access by role
- Behavior: Throws `ToolGateError` to block execution
- Injects metadata: `__idumb_checked`, `__idumb_role`, `__idumb_session`

**`tool.execute.after`** - Post-execution fallback (PIVOT)
- Location: `src/plugin.ts` lines 146-153
- Implementation: `src/hooks/tool-gate.ts` `createToolGateAfterHook()`
- Purpose: Output replacement if throwing didn't block
- Behavior: Marks output with `GOVERNANCE VIOLATION` if tool shouldn't have executed

### Permission Hook

**`permission.ask`** - Permission request interception
- Location: `src/plugin.ts` lines 163-169
- Purpose: Log permission requests (future: auto-deny by role)
- Status: Logging only, no blocking implemented

### Compaction Hook (TRIAL-3)

**`experimental.session.compacting`** - Context injection on compaction
- Location: `src/plugin.ts` lines 180-182
- Implementation: `src/hooks/compaction.ts` `createCompactionHook()`
- Purpose: Inject governance directives + anchors into compacted context
- Budget: <= 500 tokens (~2000 chars)
- Injects:
  - Governance directives (5-step protocol)
  - Current state (phase, framework, session)
  - Top-N anchors by priority score

### Message Transform Hook (TRIAL-5/6)

**`experimental.chat.messages.transform`** - Pre-LLM message injection
- Location: `src/plugin.ts` lines 195-202
- Implementation: `src/hooks/message-transform.ts` `createMessageTransformHook()`
- Purpose: Inject governance anchor before last user message
- Behavior:
  - Analyzes last 4 turns
  - Classifies intent (keyword-based, no LLM)
  - Detects conversation drift
  - Synthesizes anchored intent
  - Inserts governance message before last user message

## Custom Tools

### `idumb_init`
- Location: `src/tools/init.ts`
- Purpose: Initialize `.idumb/` directory, scan codebase
- Args: `force` (boolean, optional) - Re-scan if exists

### `idumb_anchor_add`
- Location: `src/tools/anchor.ts`
- Purpose: Create context anchor that survives compaction
- Args:
  - `type`: `decision` | `context` | `checkpoint` | `error` | `attention`
  - `content`: string (max 2000 chars)
  - `priority`: `critical` | `high` | `medium` | `low`

### `idumb_anchor_list`
- Location: `src/tools/anchor.ts`
- Purpose: List active anchors with staleness info

### `idumb_status`
- Location: `src/tools/status.ts`
- Purpose: Get current plugin status (version, phase, counts)

### `idumb_agent_create`
- Location: `src/tools/agent-create.ts`
- Purpose: Create new OpenCode agent profiles

## File System Integrations

### State Directory (`.idumb/`)

**Root Structure:**
- `.idumb/brain/` - Core state and memory
- `.idumb/anchors/` - Individual anchor JSON files
- `.idumb/sessions/` - Session tracking files
- `.idumb/signals/` - Signal files
- `.idumb/modules/` - Module storage
- `.idumb/backups/` - State backups
- `.idumb/project-output/` - Generated outputs

**Brain Subdirectory:**
- `.idumb/brain/state.json` - Governance state (SSOT)
- `.idumb/brain/config.json` - Plugin configuration
- `.idumb/brain/context/` - Context data
- `.idumb/brain/context/scan-result.json` - Codebase scan output
- `.idumb/brain/drift/` - Drift detection data
- `.idumb/brain/governance/validations/` - Validation reports
- `.idumb/brain/history/` - Historical data
- `.idumb/brain/metadata/` - Metadata storage
- `.idumb/brain/sessions/` - Session brain data

**Project Output:**
- `.idumb/project-output/phases/` - Phase execution outputs
- `.idumb/project-output/research/` - Research documents
- `.idumb/project-output/roadmaps/` - Roadmap files
- `.idumb/project-output/validations/` - Validation reports

### File Operations

**Atomic Writes:**
- All JSON writes use atomic write pattern (temp file + rename)
- Implementation: `src/lib/persistence.ts` `atomicWrite()`

**Backup Strategy:**
- State file backed up before each write
- Backups stored in `.idumb/backups/`
- Format: `{name}-{ISO-timestamp}.json`

**Staleness Tracking:**
- All timestamps include `stalenessHours` and `isStale` flags
- Computed on read via `enforceTimestamp()`

## Logging Integration

**TUI-Safe Logging:**
- Location: `src/lib/logging.ts`
- NO `console.log` - prevents TUI background text pollution
- All output to file: `.idumb/logs/plugin.log`
- Max file size: 1MB (rotation not implemented)

**Logger Factory:**
```typescript
const logger = createLogger(directory, "module-name")
logger.info("Message", { key: value })
```

**Log Levels:** debug, info, warn, error

## CLI Integration

**Entry Point:** `src/cli/index.ts`
**Binary Name:** `idumb`

**Implementation:**
- Zero external dependencies (no commander)
- Uses `process.argv` directly
- Custom argument parser

**Commands:**
- `idumb init [--global] [--path <dir>] [--force]`
- `idumb status [--path <dir>]`
- `idumb anchors [--path <dir>]`
- `idumb help`

**Console Output:**
- CLI uses `console.log` (TUI safety only applies in plugin context)
- Uses `process.stdout.write` for help text

## Codebase Scanner

**Location:** `src/engines/scanner.ts`

**Purpose:** Deterministic filesystem analysis (no LLM)

**Detects:**
- Languages (TypeScript, JavaScript, Python, Go, Rust, etc.)
- Stack (React, Next.js, Vue, Express, etc.)
- Package manager (npm, yarn, pnpm, bun, cargo)
- Project stage (greenfield, brownfield, mature)
- Conventions (linting, formatting, testing, bundler)
- Gaps (missing tests, CI/CD, README, etc.)
- Technical debt signals
- Structural concerns
- Context drift

**Output:** `ScanResult` JSON written to `.idumb/brain/context/scan-result.json`

## Framework Detector

**Location:** `src/engines/framework-detector.ts`

**Purpose:** Detect governance framework compatibility

**Detection Methods:**
- Check for `.idumb/` directory
- Check for AGENTS.md configuration
- Analyze project structure patterns

## External Services

**None.** This is a local-only plugin with no external API calls.

All data is:
- Stored locally in `.idumb/` directory
- Read from local filesystem
- Never transmitted externally

## Environment Variables

**None required.** The plugin receives all context from OpenCode:
- `directory` - Project root path (from plugin init)
- `sessionID` - Session identifier (from hook inputs)
- `agent` - Agent name (from `chat.message` hook)

---

*Integration audit: 2026-02-06*
