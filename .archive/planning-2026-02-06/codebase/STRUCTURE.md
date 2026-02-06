# Codebase Structure

**Analysis Date:** 2026-02-06

## Directory Layout

```
v2/
├── src/                        # TypeScript source code
│   ├── plugin.ts               # Main plugin entry point
│   ├── cli/                    # CLI commands (standalone)
│   │   ├── index.ts            # CLI entry
│   │   └── commands/           # Individual commands
│   ├── engines/                # Deterministic analysis engines
│   │   ├── index.ts            # Barrel export
│   │   ├── scanner.ts          # Codebase scanner
│   │   └── framework-detector.ts
│   ├── hooks/                  # OpenCode event hooks
│   │   ├── index.ts            # Barrel export
│   │   ├── tool-gate.ts        # T1: Permission enforcement
│   │   ├── compaction.ts       # T3: Anchor injection
│   │   └── message-transform.ts # T5/T6: Drift detection
│   ├── lib/                    # Cross-cutting utilities
│   │   ├── index.ts            # Barrel export
│   │   ├── logging.ts          # TUI-safe file logging
│   │   ├── persistence.ts      # Atomic file I/O
│   │   └── path-resolver.ts    # Path resolution helpers
│   ├── schemas/                # Zod schemas + business logic
│   │   ├── index.ts            # Barrel export
│   │   ├── anchor.ts           # Context anchors
│   │   ├── config.ts           # Plugin configuration
│   │   ├── permission.ts       # Role/permission matrix
│   │   ├── scan.ts             # Codebase scan results
│   │   ├── state.ts            # Governance state
│   │   ├── trajectory.ts       # Conversation analysis
│   │   └── agent-profile.ts    # Agent profile generation
│   ├── tools/                  # LLM-callable custom tools
│   │   ├── index.ts            # Barrel export
│   │   ├── init.ts             # idumb_init
│   │   ├── anchor.ts           # idumb_anchor_add, idumb_anchor_list
│   │   ├── status.ts           # idumb_status
│   │   └── agent-create.ts     # idumb_agent_create
│   └── types/                  # Local type helpers
│       └── plugin.ts           # Zod v3 tool helper
├── tests/                      # Trial validation tests
│   └── trial-1.ts              # T1 permission tests
├── dist/                       # Compiled JavaScript (generated)
├── .idumb/                     # Runtime state directory
│   ├── brain/                  # Core memory
│   │   ├── state.json          # Governance state (SSOT)
│   │   ├── config.json         # Plugin config
│   │   ├── context/            # Scan results
│   │   ├── drift/              # Drift tracking
│   │   ├── governance/         # Validation records
│   │   ├── history/            # Action history
│   │   ├── metadata/           # Plugin metadata
│   │   └── sessions/           # Session tracking
│   ├── anchors/                # Individual anchor files
│   ├── sessions/               # Per-session state
│   ├── signals/                # Signal files
│   ├── modules/                # Module storage
│   ├── governance/             # Log files
│   ├── project-output/         # User-facing outputs
│   │   ├── phases/             # Phase artifacts
│   │   ├── research/           # Research outputs
│   │   ├── roadmaps/           # Project roadmaps
│   │   └── validations/        # Validation reports
│   └── backups/                # Automatic state backups
├── .planning/                  # GSD planning artifacts
│   ├── codebase/               # Codebase analysis docs
│   └── research/               # Research docs
├── package.json                # NPM package manifest
├── tsconfig.json               # TypeScript config
├── AGENTS.md                   # Agent instructions
└── GAP-ANALYSIS.md             # Known gaps document
```

## Directory Purposes

**src/plugin.ts:**
- Purpose: Main entry point exported for OpenCode plugin loader
- Contains: Hook registrations, tool exports, lifecycle initialization
- Key files: Single file, 225 lines

**src/hooks/:**
- Purpose: Event interception hooks for OpenCode lifecycle
- Contains: Tool permission gate, compaction context, message transform
- Key files: `tool-gate.ts` (269 lines, T1), `compaction.ts` (103 lines, T3), `message-transform.ts` (346 lines, T5/T6)

**src/tools/:**
- Purpose: Custom tools callable by LLM via OpenCode
- Contains: Init scanner, anchor management, status reporting, agent creation
- Key files: `init.ts` (195 lines), `anchor.ts`, `status.ts`, `agent-create.ts`

**src/engines/:**
- Purpose: Deterministic codebase analysis (no LLM)
- Contains: Full filesystem scanner, framework detector
- Key files: `scanner.ts` (654 lines - largest file), `framework-detector.ts`

**src/schemas/:**
- Purpose: Zod schemas + business logic functions
- Contains: Data contracts for all entities, validation, transformation utilities
- Key files: `permission.ts` (238 lines - role matrix), `state.ts` (205 lines), `anchor.ts` (157 lines), `scan.ts`, `trajectory.ts`, `config.ts`

**src/lib/:**
- Purpose: Cross-cutting utilities used by all layers
- Contains: TUI-safe logging, atomic persistence, path resolution
- Key files: `persistence.ts` (414 lines - all file I/O), `logging.ts`, `path-resolver.ts`

**src/types/:**
- Purpose: Local type helpers for SDK compatibility
- Contains: Zod v3 tool helper (SDK ships v4)
- Key files: `plugin.ts`

**src/cli/:**
- Purpose: Standalone CLI commands
- Contains: Direct command implementations
- Key files: `index.ts`, `commands/init.ts`, `commands/status.ts`, `commands/anchors.ts`

**.idumb/:**
- Purpose: Runtime state directory (created by plugin)
- Contains: All persistent state, anchors, sessions, logs, outputs
- Key files: `brain/state.json` (SSOT), `brain/config.json`, `brain/context/scan-result.json`

## Key File Locations

**Entry Points:**
- `src/plugin.ts`: Main plugin export (IdumbPlugin)
- `src/cli/index.ts`: CLI entry point

**Configuration:**
- `package.json`: Dependencies (@opencode-ai/plugin, zod)
- `tsconfig.json`: ES2022 target, ESM modules
- `.idumb/brain/config.json`: Runtime plugin config

**Core Logic:**
- `src/hooks/tool-gate.ts`: T1 permission enforcement
- `src/hooks/compaction.ts`: T3 anchor injection
- `src/hooks/message-transform.ts`: T5/T6 drift detection
- `src/engines/scanner.ts`: Codebase analysis

**Testing:**
- `tests/trial-1.ts`: T1 validation tests

**State Files:**
- `.idumb/brain/state.json`: Governance state (phase, anchors, history)
- `.idumb/brain/config.json`: Plugin configuration
- `.idumb/brain/context/scan-result.json`: Codebase scan cache

## Naming Conventions

**Files:**
- kebab-case: `tool-gate.ts`, `message-transform.ts`, `framework-detector.ts`
- Exception: `plugin.ts` (entry point)

**Directories:**
- Plural nouns: `hooks/`, `tools/`, `engines/`, `schemas/`, `anchors/`
- Compound: `project-output/`

**Exports:**
- Functions: camelCase (`createToolGateHook`, `readState`)
- Types: PascalCase (`State`, `Anchor`, `PermissionDecision`)
- Constants: SCREAMING_SNAKE (`PATHS`, `TOOL_CATEGORIES`, `ROLE_PERMISSIONS`)
- Schemas: PascalCase + Schema suffix (`StateSchema`, `AnchorSchema`)

## Where to Add New Code

**New Hook:**
- Create: `src/hooks/{hook-name}.ts`
- Export from: `src/hooks/index.ts`
- Register in: `src/plugin.ts` (hook registration section)
- Pattern: Factory function `createXxxHook(directory: string)`

**New Tool:**
- Create: `src/tools/{tool-name}.ts`
- Export from: `src/tools/index.ts`
- Register in: `src/plugin.ts` (tool section)
- Pattern: Use `tool()` helper from `src/types/plugin.ts`

**New Schema:**
- Create: `src/schemas/{schema-name}.ts`
- Export from: `src/schemas/index.ts`
- Pattern: Zod schema + type export + helper functions

**New Engine:**
- Create: `src/engines/{engine-name}.ts`
- Export from: `src/engines/index.ts`
- Pattern: Pure functions, no LLM, deterministic

**New Utility:**
- Add to: `src/lib/` appropriate file or new file
- Export from: `src/lib/index.ts`
- Pattern: Pure functions, no side effects except logging

**New CLI Command:**
- Create: `src/cli/commands/{command-name}.ts`
- Register in: `src/cli/index.ts`

## Import/Export Patterns

**Barrel Exports:**
Every directory has an `index.ts` barrel file that re-exports all public APIs:

```typescript
// src/schemas/index.ts
export { StateSchema, type State, createDefaultState } from "./state.js"
export { AnchorSchema, type Anchor, createAnchor } from "./anchor.js"
// ...etc
```

**Import Pattern:**
Always import from barrel, not direct files:

```typescript
// Good
import { readState, writeState, createLogger } from "./lib/index.js"
import { StateSchema, type State } from "./schemas/index.js"

// Avoid
import { readState } from "./lib/persistence.js"
```

**ES Module Extensions:**
All imports use `.js` extension (required for ESM):

```typescript
import { foo } from "./bar.js"  // Correct
import { foo } from "./bar"     // Wrong (ESM requires extension)
```

## Special Directories

**.idumb/brain/:**
- Purpose: Core plugin memory and state
- Generated: Yes, by `idumb_init` tool
- Committed: No (add to .gitignore)

**.idumb/backups/:**
- Purpose: Automatic state.json backups before writes
- Generated: Yes, by `writeState()` in persistence.ts
- Committed: No

**.idumb/project-output/:**
- Purpose: User-facing artifacts (research, roadmaps, validations)
- Generated: Yes, by various tools
- Committed: Optional (user choice)

**dist/:**
- Purpose: Compiled JavaScript output
- Generated: Yes, by `npm run build`
- Committed: No

**.planning/:**
- Purpose: GSD workflow planning artifacts
- Generated: Yes, by GSD commands
- Committed: Yes (part of project documentation)

---

*Structure analysis: 2026-02-06*
