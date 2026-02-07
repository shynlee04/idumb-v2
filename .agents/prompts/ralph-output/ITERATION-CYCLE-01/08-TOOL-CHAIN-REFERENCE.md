# Tool Chain Reference — What Each Tool Actually Does

**Generated:** 2026-02-08
**Coverage:** All 9 registered tools (+ 1 dead code) across two-plugin architecture, with inputs, outputs, edge cases, and integration status

---

## Tool 1: `idumb_task` — Smart TODO Manager

### What It Actually Does
Manages a 3-level task hierarchy (Epic → Task → Subtask) with governance enforcement. Every response includes a governance footer showing active chain, stale warnings, and chain breaks.

### Actions (13)
| Action | Required Args | Optional Args | What Happens |
|--------|--------------|---------------|--------------|
| `create_epic` | `name` | `category` | Creates epic with WorkStreamCategory, sets governance level |
| `create_task` | `epic_id`, `name` | — | Creates task under epic, auto-inherits category settings |
| `add_subtask` | `target_id`, `name` | — | Adds subtask to task, auto-generates subtask ID |
| `assign` | `target_id`, `assignee` | — | Assigns task/subtask to specific entity |
| `start` | `target_id` | — | Sets status=active, records start timestamp |
| `complete` | `target_id` | — | Sets status=completed, validates subtask completion first |
| `defer` | `target_id` | — | Sets status=deferred, preserves context |
| `abandon` | `target_id` | — | Sets status=abandoned, purges from active chain |
| `delegate` | `target_id`, `to_agent`, `context`, `expected_output` | — | Creates DelegationRecord, validates hierarchy, builds instruction |
| `status` | — | — | Shows current active chain, governance state |
| `list` | — | — | Shows all epics/tasks with hierarchy |
| `update` | `target_id`, `name` | — | Renames task/epic |
| `branch` | `task_id`, `branch_name` | — | Future use — creates git branch |

### Edge Cases
- **Creating task without epic:** Returns error "Create an epic first"
- **Completing task with incomplete subtasks:** Returns warning listing incomplete subtasks
- **Delegating UP the hierarchy:** Returns validation error (executor can't delegate to coordinator)
- **Self-delegation:** Returns error "Cannot delegate to self"
- **Delegation depth exceeded (>3):** Returns error "Max delegation depth reached"

### Integration Status
- ✅ Uses `schemas/task.ts` for all CRUD
- ✅ Uses `schemas/delegation.ts` for delegate action
- ✅ Persists via StateManager (`persistence.ts`)
- ❌ Does NOT call `linkTaskToArtifact()` — tasks not linked to planning docs
- ❌ Does NOT trigger codemap refresh after task changes

### Output Format
Every response ends with:
```
═══ GOVERNANCE ═══
Active: [epic name] > [task name]
Category: [development|research|governance|...]
Governance: [strict|balanced|minimal|none]
Next: [suggested next action]
═══════════════════
```

---

## Tool 2: `idumb_write` — Schema-Regulated Artifact Writer

### What It Actually Does
NOT a file writer — a schema-regulated artifact lifecycle manager. Before writing ANY file, it:
1. Resolves entity type via `entity-resolver.ts`
2. Checks chain integrity via `chain-validator.ts`
3. Updates planning registry if artifact is a planning doc
4. Creates audit trail in `.idumb/brain/audit/`
5. Optionally creates git commit tied to active task

### Modes
| Mode | Behavior |
|------|----------|
| `create` | Fails if file exists; registers in planning registry |
| `overwrite` | Backs up existing file; updates registry sections |
| `append` | Adds content to end; updates registry sections |
| `update-section` | Replaces specific markdown section by heading |

### Lifecycle Operations
| Op | Behavior |
|----|----------|
| `activate` | Sets artifact status → active, creates upstream links |
| `supersede` | Sets → superseded, links to replacement artifact |
| `abandon` | Sets → abandoned, purges from AI-visible context |
| `resolve` | Sets → resolved (for research: downstream can reference) |

### Args
| Arg | Type | Required | Description |
|-----|------|----------|-------------|
| `path` | string | ✅ | File path relative to project root |
| `content` | string | ✅ | Content to write |
| `mode` | enum | ❌ | create, overwrite, append, update-section (default: create) |
| `lifecycle` | enum | ❌ | activate, supersede, abandon, resolve |
| `section` | string | ❌ | Section heading for update-section mode |
| `backup` | boolean | ❌ | Create backup before overwrite (default: true) |
| `commit` | boolean | ❌ | Create git commit (default: false) |
| `commit_message` | string | ❌ | Custom commit message |

### Edge Cases
- **Writing to governed planning path without active task:** Writes succeed but with warning
- **Content exceeds 500KB:** Returns error "Content exceeds maximum size"
- **Planning artifact without chain:** Creates new chain automatically
- **Overwriting superseded artifact:** Returns error "Cannot modify superseded artifact"
- **Lifecycle on non-existent file:** Returns error with helpful message

### Integration Status
- ✅ Full entity resolution via `entity-resolver.ts`
- ✅ Chain validation via `chain-validator.ts`
- ✅ Planning registry updates via `planning-registry.ts`
- ✅ Audit trail in `.idumb/brain/audit/`
- ❌ Does NOT check `governanceMode` for write restrictions
- ❌ Does NOT verify active task in strict mode

---

## Tool 3: `idumb_init` — Project Initialization

### What It Actually Does
Scaffolds the `.idumb/` directory tree, runs a brownfield scan of the project, detects frameworks, and bootstraps the planning registry. Optionally deploys agents.

### Args
| Arg | Type | Required | Description |
|-----|------|----------|-------------|
| `deploy_agents` | boolean | ❌ | Also deploy agent templates to .opencode/ |
| `force` | boolean | ❌ | Overwrite existing files |

### What Gets Created
- 16 `.idumb/` subdirectories
- `planning-registry.json` (empty registry)
- `tasks.json` (bootstrap store with "Initialization" epic)
- Scan result in `.idumb/brain/context/scan-result.json`

### Edge Cases
- **Project already initialized:** Skips existing directories, reports what exists
- **Framework detected:** Includes framework info in greeting but takes NO enforcement action
- **Outlier detection:** Files in `.idumb/` not in registry → flagged as outliers

---

## Tool 4: `idumb_scan` — Codebase Scanner

### What It Actually Does
Deterministic (no LLM) analysis of the project filesystem. Walks the file tree, detects languages, package managers, tech stacks, and produces a JSON scan result.

### Args
| Arg | Type | Description |
|-----|------|-------------|
| `scope` | enum | full, src-only, tests-only |
| `path` | string | Specific path to scan |
| `focus` | string | Focus area for analysis |

### Output
`scan-result.json` containing:
- Project name, stage, package manager
- Languages detected (with file counts)
- Tech stack (frameworks, libraries)
- Source file count
- Gaps and concerns identified
- Framework detection results

---

## Tool 5: `idumb_codemap` — Code Intelligence

### What It Actually Does
Builds a structural map of the codebase — files, functions, classes, imports, exports, TODO comments, inconsistencies.

### Actions
| Action | Description |
|--------|-------------|
| `scan` | Full codebase scan → CodeMapStore |
| `list` | Summary of scanned files |
| `todos` | List all TODO/FIXME/HACK comments |

---

## Tool 6: `idumb_anchor` — Context Anchors

### What It Actually Does
Creates and lists context anchors — tagged pieces of information that survive compaction events.

### Actions
| Action | Required Args | Description |
|--------|--------------|-------------|
| `add` | `type`, `content`, `priority` | Creates anchor, persists to disk |
| `list` | — | Shows all anchors for current session |

### Anchor Types
`decision`, `requirement`, `constraint`, `dependency`, `insight`, `warning`

### Priority Levels
`critical`, `high`, `normal`, `low`

### How Anchors Survive Compaction
1. `hooks/compaction.ts` fires on `experimental.session.compacting`
2. Loads all anchors from StateManager
3. Scores each: `score = typePriority × freshness`
4. Selects top-N within budget (≤2000 chars / ~500 tokens)
5. Injects formatted anchor text into compaction context

---

## Tool 7: `idumb_status` — System State ⚠️ DEAD CODE

**⚠️ WARNING:** `idumb_status` is defined in `tools/status.ts` (83 LOC) but is **NOT registered** in either `src/index.ts` (Plugin A) or `src/tools-plugin.ts` (Plugin B). It is NOT available to agents. Status functionality was **absorbed into `idumb_task action=status`** (see task.ts line 578).

### What It Would Do (If Registered)
Returns a summary of current governance state: active task, session info, anchor count, governance mode.

### Args: None

### Output includes:
- Active epic and task (if any)
- Session ID
- Number of anchors
- Governance mode (strict/balanced/minimal)
- Last tool execution

---

## Tool 8: `idumb_bash` — TUI-Safe Shell

### What It Actually Does
Runs bash commands with TUI-safe output capture. Prevents console.log pollution by capturing stdout/stderr to strings.

### Args
| Arg | Type | Description |
|-----|------|-------------|
| `command` | string | Shell command to execute |
| `timeout` | number | Timeout in milliseconds (default: 30000) |

### Safety Features
- Output captured to string (not console)
- Timeout enforcement
- Output truncation for large outputs
- Command sanitization (basic)

---

## Tool 9: `idumb_read` — Governed File Reader

### What It Actually Does
Reads files with awareness of token budgets and format options.

### Args
| Arg | Type | Description |
|-----|------|-------------|
| `path` | string | File to read |
| `format` | enum | raw, summary, structured |

### Features
- Token counting and truncation
- Format detection (markdown, JSON, YAML, code)
- Section extraction for markdown files
- File metadata (size, modified, lines)

---

## Tool 10: `idumb_webfetch` — Web Content Fetcher

### What It Actually Does
Fetches web content from URLs with TUI-safe output handling.

### Args
| Arg | Type | Description |
|-----|------|-------------|
| `url` | string | URL to fetch |
| `mode` | enum | html, text, json |

### Safety Features
- Output captured (no console)
- Content truncation for large pages
- Response validation

---

## Tool Registration Map (Two-Plugin Architecture)

### Plugin A: `src/index.ts` — Governance + Intelligence (7 hooks + 5 tools)

Registered in `tool: {}` object:
1. `idumb_task` — from `tools/task.ts`
2. `idumb_anchor` — from `tools/anchor.ts`
3. `idumb_init` — from `tools/init.ts`
4. `idumb_scan` — from `tools/scan.ts`
5. `idumb_codemap` — from `tools/codemap.ts`

### Plugin B: `src/tools-plugin.ts` — Entity-Aware Operations (0 hooks + 4 tools)

Registered in `tool: {}` object:
6. `idumb_read` — from `tools/read.ts`
7. `idumb_write` — from `tools/write.ts`
8. `idumb_bash` — from `tools/bash.ts`
9. `idumb_webfetch` — from `tools/webfetch.ts`

### ❌ NOT REGISTERED (Dead Code):
- `idumb_status` — `tools/status.ts` (83 LOC) exists but is NOT imported in either plugin entry point
- Functionality absorbed into `idumb_task action=status`

### opencode.json Configuration (BOTH must be registered):
```json
{
  "plugin": ["idumb-v2", "idumb-v2/dist/tools-plugin.js"]
}
```

---

## Cross-Tool Dependencies

```
idumb_task ──→ schemas/task.ts ──→ StateManager
           ──→ schemas/delegation.ts ──→ StateManager

idumb_write ──→ lib/entity-resolver.ts ──→ classification rules
            ──→ lib/chain-validator.ts ──→ integrity checks
            ──→ schemas/planning-registry.ts ──→ .idumb/brain/planning-registry.json

idumb_init ──→ lib/scaffolder.ts ──→ .idumb/ directory tree
           ──→ lib/framework-detector.ts ──→ GSD/BMAD/SpecKit detection
           ──→ schemas/planning-registry.ts ──→ bootstrap registry

idumb_scan ──→ lib/code-quality.ts ──→ quality analysis
           ──→ schemas/project-map.ts ──→ project structure

idumb_codemap ──→ schemas/codemap.ts ──→ code intelligence

idumb_anchor ──→ schemas/anchor.ts ──→ StateManager

idumb_status ──→ StateManager ──→ summary  (⚠️ NOT REGISTERED — dead code)

idumb_bash ──→ (standalone, TUI-safe)  [Plugin B]
idumb_read ──→ (standalone, token-aware)  [Plugin B]
idumb_webfetch ──→ (standalone, TUI-safe)  [Plugin B]

Plugin B tools ──→ lib/state-reader.ts ──→ reads .idumb/ JSON files (READ-ONLY cross-plugin state)
```

---

## Hook Behavioral Constants (Important for Understanding)

### message-transform.ts (`experimental.chat.messages.transform`)
- `KEEP_RECENT = 10` — last 10 tool outputs kept intact
- `TRUNCATE_TO = 150` chars — older tool outputs truncated to this length
- `EXEMPT_TOOLS = ["idumb_task", "idumb_anchor", "idumb_scan", "idumb_codemap"]` — these tool outputs are NEVER pruned
- Input is `{}` (no sessionID) — works purely from message content

### compaction.ts (`experimental.session.compacting`)
- `INJECTION_BUDGET_CHARS = 2000` (~500 tokens)
- Selects anchors by `score = typePriority × freshness`
- Injects active task first (primacy effect)

### system.ts (`experimental.chat.system.transform`)
- Budget: ≤200 tokens (~800 chars)
- Injects `<idumb-governance>` XML block
- Reads active task from `tool-gate.ts`, critical anchors from `compaction.ts` (up to 3)
- Does NOT read: planning registry, delegation store, brain

### tool-gate.ts (`tool.execute.before` / `tool.execute.after`)
- `WRITE_TOOLS = ["write", "edit"]` — only these are write-gated
- `PLUGIN_TOOLS = ["idumb_task", "idumb_anchor", "idumb_init", "idumb_scan", "idumb_codemap"]` — agent-scoped blocking
- `AGENT_TOOL_RULES` — 7 OLD agent names with `blockedTools`/`blockedActions` (⚠️ STALE)
- Auto-inherit: if no session task but store has active epic+task, auto-sets it
- Retry detection: 30-second window for same-tool re-blocks

## Cross-Plugin Communication Pattern

```
Plugin A (index.ts)                    Plugin B (tools-plugin.ts)
─────────────────────────────────────   ────────────────────────────────────
│ StateManager (in-memory singleton)    │ state-reader.ts (reads JSON files)
│  └─ writes to .idumb/brain/*.json       │  └─ reads .idumb/brain/*.json
│  └─ sessions, tasks, delegations        │  └─ tasks, delegations, brain, codemap
│  └─ anchors, hook-state                 │  └─ hook-state, config
│                                       │
│ Hooks fire on every tool call         │ NO hooks — self-governed:
│  └─ tool-gate blocks before execution   │  └─ entity-resolver classifies paths
│  └─ system.ts injects governance ctx    │  └─ chain-validator checks integrity
│  └─ msg-xform prunes stale outputs      │  └─ state-reader reads governance state
```

Key: Plugin B tools are READ-ONLY for governance state. Only Plugin A's StateManager writes state.

---

*Generated by Ralph Loop Validation — 2026-02-08*
*Iteration 2: Added hook constants, cross-plugin communication pattern, corrected tool registration map*
