# AGENTS.md (v2 Implementation)

**Version:** 2.0.0-alpha.1  
**Last Updated:** 2026-02-06  
**Status:** Active Development

---

# NON-NEGOTIABLE RULES

1. **CONTEXT-FIRST**: All agents must gather context before executing. No tool execution without understanding what files exist, what phase is active, and what anchors are in effect.

2. **ANTI-REPETITION**: Never create duplicate files. Check existing content first. Prefer editing over creating.

3. **TUI SAFETY**: NO `console.log` in any plugin code. Use file-based logging via `lib/logging.ts`.

4. **HIERARCHY ENFORCEMENT**: The chain cannot break:
   ```
   coordinator → governance → validator → builder
   ```
   Coordinators delegate. Validators validate. Only builders write files.

---

## Project Overview

iDumb v2 is a reboot of the intelligent delegation governance framework for OpenCode. This version implements a micro-trial approach with PASS criteria and PIVOT strategies for each feature.

### Architecture Philosophy

**Intelligence = Context Purification**

Every decision boundary intercepts, purifies, and re-injects context:
- Tool interception via `tool.execute.before`
- Compaction survival via `experimental.session.compacting`
- Anchor persistence with priority-weighted selection

---

## Directory Structure

```
v2/
├── src/
│   ├── plugin.ts              # Main plugin entry point
│   ├── types/
│   │   └── plugin.ts          # Local tool helper (zod v3)
│   ├── schemas/
│   │   ├── index.ts           # Barrel exports
│   │   ├── anchor.ts          # Context anchor schema
│   │   ├── config.ts          # Plugin configuration
│   │   ├── permission.ts      # Role/permission matrix
│   │   ├── scan.ts            # Codebase scan results
│   │   └── state.ts           # Governance state
│   ├── lib/
│   │   ├── index.ts           # Barrel exports
│   │   ├── logging.ts         # TUI-safe file logging
│   │   └── persistence.ts     # Atomic file I/O
│   ├── hooks/
│   │   ├── index.ts           # Barrel exports
│   │   ├── tool-gate.ts       # TRIAL-1: Permission enforcement
│   │   └── compaction.ts      # TRIAL-3: Anchor injection
│   ├── engines/
│   │   ├── scanner.ts         # Codebase scanner
│   │   └── framework-detector.ts
│   └── tools/
│       ├── anchor.ts          # idumb_anchor_add, idumb_anchor_list
│       ├── status.ts          # idumb_status
│       └── init.ts            # idumb_init
├── tests/
│   └── trial-1.ts             # T1 validation
├── .idumb/                    # Runtime state (created by plugin)
├── package.json
├── tsconfig.json
└── TRIAL-1-RESULTS.md
```

---

## Installation

```bash
# Navigate to v2 directory
cd v2

# Install dependencies
npm install

# Build TypeScript
npm run build

# Copy to OpenCode plugins
cp -r dist/* ~/.config/opencode/plugins/idumb-v2/
```

---

## Trial Status

| Trial | Description | Status | PASS |
|-------|-------------|--------|------|
| T1 | Stop Hook Tool Manipulation | **VALIDATED** | 3/4 |
| T2 | Inner Cycle Delegation | PARTIAL | 0/4 |
| T3 | Compact Hook + Text Complete | IMPLEMENTED | 2/4 |
| T4 | Sub-task Background Tracking | NOT STARTED | 0/4 |
| T5 | Compact Message Hierarchy | PLACEHOLDER | 0/4 |
| T6 | User Prompt Transform | PLACEHOLDER | 0/4 |
| T7 | Force Delegation + 3-Level TODO | NOT STARTED | 0/4 |
| T8 | Auto-run + Export + State | PARTIAL | 1/4 |

---

## Agent Roles & Permissions

### Role Detection

Agents are classified by name pattern matching in `schemas/permission.ts`:

| Agent Pattern | Role | Description |
|---------------|------|-------------|
| `Build`, `General` | builder | Full write access |
| `Plan`, `Explore` | researcher | Read-only |
| `*meta*` | meta | Full access (framework dev) |
| `*coordinator*`, `*supreme*` | coordinator | Delegate only |
| `*governance*`, `*high*` | high-governance | Mid-level coordination |
| `*mid*`, `*executor*` | mid-coordinator | Phase execution |
| `*validator*`, `*checker*` | validator | Read + validate |
| `*builder*`, `*worker*` | builder | Write access |
| `*research*`, `*explorer*` | researcher | Read-only |

### Permission Matrix

| Role | read | write | execute | delegate | validate |
|------|------|-------|---------|----------|----------|
| coordinator | ✅ | ❌ | ❌ | ✅ | ❌ |
| high-governance | ✅ | ❌ | ❌ | ✅ | ❌ |
| mid-coordinator | ✅ | ❌ | ❌ | ✅ | ❌ |
| validator | ✅ | ❌ | ❌ | ❌ | ✅ |
| builder | ✅ | ✅ | ✅ | ❌ | ❌ |
| researcher | ✅ | ❌ | ❌ | ❌ | ❌ |
| meta | ✅ | ✅ | ✅ | ✅ | ✅ |

### Tool Categories

| Category | Tools |
|----------|-------|
| read | read, list, glob, grep, webfetch, websearch, codesearch, todoread, skill |
| write | write, edit, todowrite |
| execute | bash |
| delegate | task |
| validate | test, verify |

---

## Plugin Hooks

### Implemented Hooks

```typescript
// From plugin.ts
{
  // Session lifecycle
  event: async ({ event }) => { ... },
  
  // Agent detection (captures agent name for role-based permissions)
  "chat.message": async (input, output) => { ... },
  
  // T1: Tool permission enforcement
  "tool.execute.before": async (input, output) => { ... },
  "tool.execute.after": async (input, output) => { ... },
  
  // Permission requests
  "permission.ask": async (input, output) => { ... },
  
  // T3: Compaction context injection
  "experimental.session.compacting": async (input, output) => { ... },
  
  // T5/T6: Message transformation (placeholder)
  "experimental.chat.messages.transform": async (input, output) => { ... },
  
  // Custom tools
  tool: {
    idumb_anchor_add,
    idumb_anchor_list,
    idumb_status,
    idumb_init,
  },
}
```

---

## Custom Tools

### idumb_init

Initialize iDumb intelligence layer. Scaffolds `.idumb/` directory, scans codebase exhaustively.

**Args:**
- `force` (boolean, optional): Re-scan even if scan-result.json exists

**Returns:** Formatted scan report with project info, framework detection, gaps, debt, concerns.

### idumb_anchor_add

Create a context anchor that survives session compaction.

**Args:**
- `type`: `decision` | `context` | `checkpoint` | `error` | `attention`
- `content`: String (max 2000 chars)
- `priority`: `critical` | `high` | `medium` | `low`

### idumb_anchor_list

List all active context anchors with staleness info.

### idumb_status

Get current plugin status: version, phase, anchor count, validation count.

---

## State Management

### .idumb/brain/state.json

Single source of truth for governance state:

```json
{
  "version": "2.0.0",
  "initialized": "ISO-8601",
  "phase": "init|research|planning|execution|validation|completed",
  "framework": "idumb",
  "validationCount": 0,
  "lastValidation": null,
  "anchors": [],
  "history": [],
  "sessions": {},
  "timestamp": {
    "createdAt": "ISO-8601",
    "modifiedAt": "ISO-8601",
    "stalenessHours": 0,
    "isStale": false
  }
}
```

### .idumb/brain/config.json

Plugin configuration:

```json
{
  "version": "2.0.0",
  "governance": {
    "mode": "strict|balanced|minimal",
    "maxDelegationDepth": 3,
    "requireContextFirst": true
  },
  "compaction": {
    "maxAnchors": 5,
    "budgetChars": 2000
  },
  "logging": {
    "level": "debug|info|warn|error",
    "retention": 7
  }
}
```

---

## Path Conventions

```
.idumb/
├── brain/
│   ├── state.json           # Governance state (SSOT)
│   ├── config.json          # Plugin config
│   ├── context/
│   │   └── scan-result.json # Codebase scan
│   ├── drift/
│   ├── governance/
│   │   └── validations/
│   ├── history/
│   ├── metadata/
│   └── sessions/
├── anchors/                  # Individual anchor files
├── sessions/                 # Session tracking
├── signals/
├── modules/
├── project-output/
│   ├── phases/
│   ├── research/
│   ├── roadmaps/
│   └── validations/
└── backups/
```

---

## Code Style

### TypeScript

- Use `@opencode-ai/plugin` SDK types
- Local `tool()` helper for zod v3 compatibility (SDK ships v4)
- NO console.log - use `createLogger(directory, service)`
- Always handle errors with try-catch, return error objects
- Atomic file writes via `writeJson()` for all persistence

### Naming

- Functions: `camelCase`
- Interfaces/Types: `PascalCase`
- Constants: `SCREAMING_SNAKE`
- Files: `kebab-case.ts`

### Schemas

All data structures validated with Zod:
- `StateSchema` - Governance state
- `ConfigSchema` - Plugin config
- `AnchorSchema` - Context anchors
- `PermissionDecisionSchema` - Permission results
- `ScanResultSchema` - Codebase scan

---

## Testing

### TRIAL-1 Validation

```bash
# Run T1 tests
npx tsx tests/trial-1.ts
```

**PASS Criteria:**
- P1.1: Throwing error blocks tool execution ✅
- P1.2: Error message visible in TUI (manual) ⏳
- P1.3: Arg modification persists to execution ✅
- P1.4: Other hooks continue running ✅

### Manual Testing

1. Install plugin in OpenCode
2. Start session with coordinator agent
3. Attempt to use `write` tool
4. Verify governance error appears in chat (not background)

---

## Known Gaps

See `GAP-ANALYSIS.md` for comprehensive gap analysis.

**Critical:**
1. TRIAL-2 delegation tracking not implemented
2. Agent detection relies on `chat.message` which may fire after first tool
3. Session tracking is in-memory only (lost on restart)

**High:**
1. No `experimental.text.complete` hook for T3 completion
2. Pattern-based role detection is fragile
3. Validator role missing bash-read-only permission

---

## Development Commands

```bash
# Build TypeScript
npm run build

# Type check only
npx tsc --noEmit

# Run trial tests
npx tsx tests/trial-1.ts

# Watch mode (development)
npx tsc --watch
```

---

## Contributing

1. Follow the micro-trial approach: implement one TRIAL at a time
2. Each TRIAL must have PASS criteria and PIVOT strategies
3. Validate before merging
4. Update this AGENTS.md with any new capabilities

---

## Session Handoff

When resuming work on v2:

1. Check `GAP-ANALYSIS.md` for known gaps
2. Check `TRIAL-*-RESULTS.md` files for validation status
3. Review recent commits for context
4. Run `idumb_status` to see current state

---

## References

- [MICRO-MILESTONE-ARCHITECTURE-2026-02-05.md](../.qoder/plans/MICRO-MILESTONE-ARCHITECTURE-2026-02-05.md) - Planning architecture
- [iDumb_Plugin_Reboot_v2_96f02b43.md](../.qoder/plans/iDumb_Plugin_Reboot_v2_96f02b43.md) - Implementation plan
- [GAP-ANALYSIS.md](./GAP-ANALYSIS.md) - Current gaps and recommendations
