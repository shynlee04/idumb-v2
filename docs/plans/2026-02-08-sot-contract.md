# SOT (Source of Truth) Contract — iDumb v2

**Date:** 2026-02-08
**Status:** ACTIVE
**Purpose:** Map every source of truth node in the system, cross-validate them, and define which one is canonical when conflicts arise.

---

## 1. SOT Node Registry

Every location where agent names, tool names, permissions, schemas, or config are defined is a **SOT node**. When two nodes disagree, only one can be canonical. This contract defines which.

### 1.1 Agent Identity — Who Exists?

| SOT Node | File | What It Defines | Canonical? |
|---|---|---|---|
| **AGENT_HIERARCHY** | `src/schemas/delegation.ts:80` | 3 agents: coordinator (depth 0), investigator (depth 1), executor (depth 1) | **YES — PRIMARY** |
| **AGENT_TOOL_RULES** | `src/hooks/tool-gate.ts:40-66` | 3 agents: coordinator, investigator, executor | YES — mirrors delegation.ts |
| **CLASSIFICATION_RULES** | `src/lib/entity-resolver.ts:100-270` | 3 agents: coordinator, investigator, executor + entity-type canWrite matrix | YES — mirrors delegation.ts |
| **Deploy manifest** | `src/cli/deploy.ts` | 3 agent .md files deployed to `.opencode/agents/` | YES — mirrors delegation.ts |
| **Templates** | `src/templates.ts` | 3 agent templates + skill templates referencing 7+ legacy agents | **DRIFT** |
| **ROLE_PERMISSIONS** | `src/tools/bash.ts:43-54` | 10 legacy agent names; investigator/executor ABSENT | **CRITICAL DRIFT** |

**Canonical source for "which agents exist":** `src/schemas/delegation.ts` → `AGENT_HIERARCHY`

**Validation rule:** Any file that references an agent name MUST use only names present in `AGENT_HIERARCHY`. A CI check should grep for `idumb-` prefixed strings and validate against the hierarchy.

### 1.2 Tool Identity — What Tools Exist?

| SOT Node | File | Tools | Canonical? |
|---|---|---|---|
| **Plugin A exports** | `src/tools/index.ts` | `idumb_task, idumb_anchor, idumb_init, idumb_scan, idumb_codemap` | **YES — Plugin A** |
| **Plugin B exports** | `src/tools-plugin.ts:56-61` | `idumb_read, idumb_write, idumb_bash, idumb_webfetch` | **YES — Plugin B** |
| **PLUGIN_TOOLS gate set** | `src/hooks/tool-gate.ts:24` | Only Plugin A tools (5) | Intentional subset |
| **package.json exports** | `package.json:11-20` | `"."` (Plugin A), `"./tools-plugin"` (Plugin B) | YES |

**Total custom tools:** 9 (5 Plugin A + 4 Plugin B)

**Canonical source for "which tools exist":** The barrel exports in `src/tools/index.ts` (Plugin A) and `src/tools-plugin.ts` (Plugin B).

**Architectural note:** Plugin A's tool gate (`tool.execute.before`) fires for ALL tools including Plugin B's. This cross-plugin enforcement is an assumption — it works because OpenCode fires hooks globally, not per-plugin.

### 1.3 Tool Action Enums — What Can Each Tool Do?

| Tool | File | Actions | Count |
|---|---|---|---|
| `idumb_task` | `src/tools/task.ts` | `create_epic, create_task, add_subtask, assign, start, complete, defer, abandon, delegate, status, list, update, branch` | **13** |
| `idumb_anchor` | `src/tools/anchor.ts` | `add, list` | 2 |
| `idumb_init` | `src/tools/init.ts` | `install, scan, status` | 3 |
| `idumb_scan` | `src/tools/scan.ts` | `full, incremental, drift, frameworks, documents` | 5 |
| `idumb_codemap` | `src/tools/codemap.ts` | `scan, todos, inconsistencies, diff, graph` | 5 |
| `idumb_read` | `src/tools/read.ts` | `content, outline, traverse, comments, chain-check` | 5 |
| `idumb_write` | `src/tools/write.ts` | `create, overwrite, append, update-section, activate, supersede, abandon, resolve` | **8** |
| `idumb_bash` | `src/tools/bash.ts` | `validation, build, git, inspection, general` (purposes) | 5 |
| `idumb_webfetch` | `src/tools/webfetch.ts` | `research, reference, validation` (purposes) | 3 |

**Total actions across all tools: 49**

**Canonical source for tool actions:** The Zod schema in each tool file (the `action` enum).

### 1.4 Permission Matrix — Who Can Do What?

There are **four independent permission systems** that must stay synchronized:

#### System A: AGENT_TOOL_RULES (Plugin A tool gate)
**File:** `src/hooks/tool-gate.ts:40-66`
**Scope:** Blocks Plugin A + Plugin B tools per agent
**Runtime:** Checked in `tool.execute.before` hook

| Agent | Blocked Tools | Blocked Actions |
|---|---|---|
| coordinator | `idumb_init, idumb_write, idumb_bash, idumb_webfetch` | `create_epic` |
| investigator | `idumb_init, idumb_write, idumb_bash` | `delegate, create_epic` |
| executor | `idumb_init, idumb_webfetch` | `delegate, create_epic` |

#### System B: ROLE_PERMISSIONS (Plugin B bash tool)
**File:** `src/tools/bash.ts:43-54`
**Scope:** Restricts bash command purposes per agent
**Runtime:** Checked inside `idumb_bash` execute function

| Agent | Allowed Purposes | Status |
|---|---|---|
| coordinator | inspection | OK |
| investigator | **(MISSING — falls back to inspection)** | **DRIFT** |
| executor | **(MISSING — falls back to inspection)** | **DRIFT** |
| 8 legacy agents | various | **DEAD CODE** |

#### System C: CLASSIFICATION_RULES (Entity resolver)
**File:** `src/lib/entity-resolver.ts:100-270`
**Scope:** Controls which agents can write to which entity types
**Runtime:** Checked inside `idumb_write` and `idumb_read`

| Entity Type | canWrite |
|---|---|
| task-store | coordinator, executor |
| delegation-store | coordinator |
| project-map | coordinator, investigator |
| codemap | investigator |
| brain-entry | investigator |
| planning-artifact | executor, investigator |
| source-code | executor |
| test | executor |
| documentation | any |

#### System D: OpenCode Frontmatter (Agent templates)
**File:** `src/templates.ts:63-84`
**Scope:** Controls OpenCode's native innate tools (write, edit, bash)
**Runtime:** Enforced by OpenCode host, not by plugin

| Agent | write | edit | bash |
|---|---|---|---|
| coordinator | false (deny) | false (deny) | false (deny) |
| investigator | false | false | false |
| executor | false | true | false |

**Cross-system conflicts:**
- Executor has `edit: true` in frontmatter (System D) but uses `idumb_write` (System C) for governed writes. The innate `edit` tool bypasses all governance. This is intentional for implementation velocity but **undocumented**.
- `idumb_init` is blocked for ALL agents in System A. No agent can call `idumb_init action=status` or `action=scan` at runtime, despite the coordinator's instructions saying to call it.

### 1.5 Schema Registry — Data Structure Definitions

| Schema | File | Version | Key Types |
|---|---|---|---|
| Anchor | `src/schemas/anchor.ts` | `STALE_HOURS = 48` | `Anchor, AnchorType, AnchorPriority` |
| Brain | `src/schemas/brain.ts` | `1.0.0` | `BrainEntry, BrainStore` |
| Task | `src/schemas/task.ts` | `2.0.0` | `TaskEpic, Task, Subtask, TaskStore` |
| Config | `src/schemas/config.ts` | `1.0.0` | `IdumbConfig, GovernanceMode` |
| Delegation | `src/schemas/delegation.ts` | `1.0.0` | `DelegationRecord, DelegationStore` |
| Planning Registry | `src/schemas/planning-registry.ts` | `1.0.0` | `PlanningArtifact, ArtifactChain` |
| Codemap | `src/schemas/codemap.ts` | `1.0.0` | `CodeMapStore, FileMapEntry` |
| Project Map | `src/schemas/project-map.ts` | `1.0.0` | `ProjectMap, DirectoryEntry` |

**Canonical source for all data structures:** The Zod schemas in `src/schemas/`. Types MUST be derived via `z.infer<>`, never hand-written.

### 1.6 Version Registry

| Location | Value | Status |
|---|---|---|
| `package.json` | `2.2.0` | **CANONICAL** |
| `src/index.ts:17` VERSION | `2.2.0` | OK |
| `src/tools-plugin.ts:28` TOOLS_VERSION | `0.1.0` | Separate version for Plugin B |
| `src/lib/persistence.ts:43` STATE_VERSION | `1.1.0` | State file format version |

### 1.7 Hook Registry

| Hook Name | Factory | File |
|---|---|---|
| `tool.execute.before` | `createToolGateBefore` | `src/hooks/tool-gate.ts` |
| `tool.execute.after` | `createToolGateAfter` | `src/hooks/tool-gate.ts` |
| `experimental.session.compacting` | `createCompactionHook` | `src/hooks/compaction.ts` |
| `experimental.chat.system.transform` | `createSystemHook` | `src/hooks/system.ts` |
| `experimental.chat.messages.transform` | `createMessageTransformHook` | `src/hooks/message-transform.ts` |
| `chat.params` | inline | `src/index.ts:115-137` |
| `event` | inline | `src/index.ts:54-59` |

**Note:** `experimental.*` hooks are unverified in live OpenCode runtime (per CLAUDE.md known issues).

### 1.8 Persistence Layer

| State File | Path | Manager | Backend |
|---|---|---|---|
| hook-state.json | `.idumb/brain/hook-state.json` | `StateManager` singleton | JSON or SQLite |
| tasks.json | `.idumb/brain/tasks.json` | `StateManager` | JSON or SQLite |
| delegations.json | `.idumb/brain/delegations.json` | `StateManager` | JSON or SQLite |
| governance.db | `.idumb/brain/governance.db` | `SqliteAdapter` | SQLite (feature-flagged) |

---

## 2. Drift Register

Active drift items that need resolution.

| ID | Severity | Location | Issue | Resolution |
|---|---|---|---|---|
| **DRIFT-01** | **CRITICAL** | `src/tools/bash.ts:43-54` | `ROLE_PERMISSIONS` references 10 legacy agent names. `idumb-investigator` and `idumb-executor` are **absent**, causing fallback to inspection-only. Executor cannot run builds or git. | Replace all 10 entries with 3 current agents. Executor needs: validation, build, git, inspection. Investigator needs: validation, inspection. |
| **DRIFT-02** | MODERATE | `src/templates.ts` (skill templates) | Delegation/governance skill templates reference legacy 7-agent hierarchy. Models see contradictory agent lists. | Strip all legacy agent references from skill templates. |
| **DRIFT-03** | LOW | `src/templates.ts` (executor frontmatter) | Executor has innate `edit: true` but `write: false`. Innate edit bypasses governance. | Document this as intentional. Add comment in template explaining the two-track permission model (innate vs plugin). |
| **DRIFT-04** | HIGH | `src/hooks/tool-gate.ts:44-45` | `idumb_init` blocked for ALL agents including coordinator. No agent can call `idumb_init action=status` at runtime. | Unblock `idumb_init` for coordinator (status + scan actions needed). Keep `install` action blocked. |
| **DRIFT-05** | MODERATE | `src/tools/bash.ts:78` | Build purpose pattern `/^npx\s+/` is far too broad — matches ANY npx command as "build". | Narrow to specific build tool patterns: `npx tsc`, `npx vite`, `npx esbuild`, etc. |

---

## 3. OpenCode SDK Client API — Available Methods

The plugin receives `PluginInput.client: OpencodeClient` which provides these sub-clients. **None are currently used by the plugin.**

### 3.1 High-Value for iDumb (Should Use)

| Client | Method | Purpose | iDumb Use Case |
|---|---|---|---|
| `client.session` | `.list()` | List all sessions | Session-aware governance state |
| `client.session` | `.status(id)` | Get session status (busy/idle) | Know if agent is running |
| `client.session` | `.todo(id)` | Get session todo list | Integrate with task tracking |
| `client.session` | `.messages(id)` | List messages in session | Audit trail, delegation tracking |
| `client.session` | `.diff(id)` | Get file diffs for session | Track what executor changed |
| `client.session` | `.abort(id)` | Abort a session | Kill runaway delegated agents |
| `client.session` | `.children(id)` | Get child sessions | Track delegation tree |
| `client.find` | `.text(query)` | Search text in files | Replace innate grep in tools |
| `client.find` | `.files(query)` | Find files by pattern | Replace innate find in tools |
| `client.find` | `.symbols(query)` | Find workspace symbols | Code analysis via LSP |
| `client.file` | `.read(path)` | Read file content | Governed file reads |
| `client.file` | `.status()` | Get file status (git) | Track modifications |
| `client.app` | `.agents()` | List all agents | Runtime agent discovery |
| `client.app` | `.log()` | Write to server logs | Replace file-based logging |
| `client.tool` | `.ids()` | List all tool IDs | Runtime tool discovery |
| `client.tool` | `.list(provider)` | List tools with schemas | Validate tool availability |
| `client.tui` | `.showToast(msg)` | Show toast in TUI | Non-polluting status messages |
| `client.tui` | `.executeCommand(cmd)` | Execute TUI command (e.g. agent_cycle) | Programmatic agent delegation |
| `client.vcs` | `.get()` | Get VCS info | Branch-aware governance |
| `client.project` | `.current()` | Get current project | Project directory validation |
| `client.config` | `.get()` | Get OpenCode config | Read agent tool scoping |

### 3.2 Lower Priority

| Client | Method | Purpose |
|---|---|---|
| `client.session.create()` | Create new session | Future: programmatic delegation |
| `client.session.prompt(id, msg)` | Send message to session | Future: agent-to-agent messaging |
| `client.session.fork(id, msgId)` | Fork session at message | Future: branch exploration |
| `client.mcp.status()` | MCP server status | Diagnostics |
| `client.lsp.status()` | LSP server status | Diagnostics |
| `client.formatter.status()` | Formatter status | Diagnostics |
| `client.provider.list()` | List LLM providers | Model selection |
| `client.pty.*` | PTY management | Shell session management |
| `client.tui.appendPrompt()` | Append to TUI prompt | Future: guided workflows |
| `client.tui.control.*` | TUI request queue | Future: interactive governance |

### 3.3 Key Insight: `tui.executeCommand("agent_cycle")`

This is the **missing link** for programmatic delegation. Currently, delegation relies on LLM manually outputting `@agent-name` mentions. With `tui.executeCommand`, the coordinator tool could:

1. Create a delegation record in `.idumb/brain/delegations.json`
2. Call `client.tui.executeCommand("agent_cycle")` to programmatically cycle to the target agent
3. The target agent's session would inherit the delegation context

This needs validation against the live runtime to confirm `agent_cycle` triggers the agent selection dialog and whether it can be parameterized.

### 3.4 Key Insight: `session.children()` + `session.abort()`

These enable the coordinator to:
1. Track which child sessions (subagents) are spawned
2. Monitor their status via `session.status()`
3. Abort runaway sessions via `session.abort()`

This is the infrastructure needed for the "delegation tree" visualization in the dashboard.

---

## 4. Cross-Validation Rules

These rules should be checked by a validation tool or CI step:

1. **Agent Name Consistency**: All strings matching `/idumb-\w+/` in source code must be present in `AGENT_HIERARCHY` (delegation.ts). Violations indicate legacy drift.

2. **Tool Name Consistency**: All strings matching `/idumb_\w+/` in AGENT_TOOL_RULES must be present in either Plugin A or Plugin B tool exports. No phantom tools.

3. **Permission Symmetry**: If AGENT_TOOL_RULES allows an agent to call a tool, that tool's internal permission system (ROLE_PERMISSIONS, CLASSIFICATION_RULES) must also allow the agent. No contradictions across systems.

4. **Action Enum Completeness**: If a blocked action is listed in AGENT_TOOL_RULES, it must exist in the tool's action enum. No phantom action blocks.

5. **Schema Version Monotonicity**: Schema versions must increase, never decrease. State file version must be compatible with schema version.

6. **Template-Gate Alignment**: Agent frontmatter tool permissions (System D) should not contradict AGENT_TOOL_RULES (System A). If frontmatter blocks a tool, the gate shouldn't rely on that tool being available.

---

## 5. SOT Hierarchy (Conflict Resolution)

When two nodes disagree, this precedence applies:

```
1. Zod schemas (src/schemas/)          — data structure truth
2. AGENT_HIERARCHY (delegation.ts)     — agent identity truth
3. Tool barrel exports (tools/index)   — tool identity truth
4. AGENT_TOOL_RULES (tool-gate.ts)     — permission truth for plugin tools
5. Agent templates (templates.ts)      — permission truth for innate tools
6. ROLE_PERMISSIONS (bash.ts)          — secondary enforcement (must mirror #4)
7. CLASSIFICATION_RULES (entity-resolver) — entity-level write access
8. package.json                        — version truth
```

Lower-numbered entries override higher-numbered entries in case of conflict.
