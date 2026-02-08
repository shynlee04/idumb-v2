# Tool & Agent Redesign Plan — iDumb v2

**Date:** 2026-02-08
**Status:** DESIGN (Not Approved)
**Depends on:** `2026-02-08-sot-contract.md` (drift items must be resolved first)

---

## Problem Statement

Models can't use the current tools. They try `idumb_task` with wrong action/params, fail 2-3 times, then give up and skip governance entirely. Root causes:

1. **13 actions in `idumb_task`** — models can't navigate the action/param matrix
2. **9 mega-tools with 49 total actions** — cognitive overload for any LLM
3. **`ROLE_PERMISSIONS` drift** — executor can't run builds, investigator can't validate (DRIFT-01)
4. **`idumb_init` blocked for all agents** — bootstrap is broken (DRIFT-04)
5. **Delegation is manual** — relies on LLM outputting `@agent-name` mentions with no programmatic mechanism
6. **No SDK client usage** — the plugin ignores the entire `OpencodeClient` API despite receiving it
7. **Agent templates reference phantom agents** — coordinator mentions 5 agents that don't exist (DRIFT-02)

---

## Design Principles

### From User Research

1. **Name by intent, not mechanism** — `govern_write` not `idumb_write action=create`
2. **Shadow innate tools** — descriptions must say WHY the innate tool fails: "Unlike `edit`, this tool tracks provenance, creates audit entries, and enforces the active-task gate"
3. **Error messages teach** — failed calls return: what went wrong, why, what to do instead, evidence
4. **AGENTS.md enforces tool preference** — "ALWAYS use `govern_write` instead of `edit` for governed files"
5. **Single-purpose tools** — one tool = one verb = one Zod schema = one mental model

### From SDK Research

6. **Use the SDK client** — `client.find.*`, `client.file.*`, `client.session.*`, `client.tui.*` provide platform capabilities the plugin currently reinvents
7. **No tool count limit** — `Record<string, ToolDefinition>` is open-ended; "max 5" was self-imposed
8. **Native per-agent scoping via frontmatter** — `tools: { "tool_name": true/false }` in agent markdown controls tool visibility natively. This REPLACES `AGENT_TOOL_RULES`
9. **`experimental.primary_tools`** — scopes tools to primary agents only (subagents don't see them)

### From Architecture

10. **Schema-first always** — Zod schema defines the tool's args; `z.infer<>` derives the type
11. **Tools import from lib/ and schemas/ only** — never from hooks or other tools
12. **Hooks import from lib/ only** — never from tools

---

## Phase 0: Fix Critical Drift (Pre-requisite)

Before any redesign, fix the 5 drift items from the SOT contract:

| ID | Fix | Files |
|---|---|---|
| DRIFT-01 | Replace 10 legacy agent entries in ROLE_PERMISSIONS with 3 current agents | `src/tools/bash.ts` |
| DRIFT-02 | Strip legacy 7-agent references from skill templates | `src/templates.ts` |
| DRIFT-03 | Add doc comment explaining innate edit vs plugin write | `src/templates.ts` |
| DRIFT-04 | Unblock `idumb_init` for coordinator (status + scan). Keep install blocked | `src/hooks/tool-gate.ts` |
| DRIFT-05 | Narrow build purpose pattern from `/^npx\s+/` to specific tools | `src/tools/bash.ts` |

**Estimated effort:** 1-2 hours. No architectural changes.

---

## Phase 1: Tool Split (The Big Restructure)

### Current → Proposed Tool Mapping

#### From `idumb_task` (13 actions → 5 tools)

| Current Action | New Tool | Description | Agent Scope |
|---|---|---|---|
| `create_epic` | `epic_create` | Create a new epic with work-stream classification | coordinator |
| `create_task, add_subtask` | `task_create` | Create a task or subtask within an epic | coordinator |
| `assign, start, complete, defer, abandon` | `task_transition` | Change task/subtask lifecycle state | coordinator, executor |
| `delegate` | `task_delegate` | Delegate a task to a specific agent with context | coordinator |
| `status, list, update, branch` | `task_query` | Read task state, list tasks, get branch info | all |

#### From `idumb_anchor` (2 actions → 1 tool, keep as-is)

| Current | New Tool | Notes |
|---|---|---|
| `add, list` | `anchor` (rename from `idumb_anchor`) | Simple enough. Rename for consistency. |

#### From `idumb_init` (3 actions → 2 tools)

| Current Action | New Tool | Description | Agent Scope |
|---|---|---|---|
| `install` | `govern_init` | One-time project initialization | coordinator (first run only) |
| `status, scan` | `govern_status` | Get governance state, run health check | all |

#### From `idumb_scan` (5 actions → 2 tools)

| Current Action | New Tool | Description | Agent Scope |
|---|---|---|---|
| `full, incremental, drift` | `project_scan` | Scan project structure, detect drift | coordinator, investigator |
| `frameworks, documents` | `project_discover` | Detect frameworks, find documents | investigator |

#### From `idumb_codemap` (5 actions → 2 tools)

| Current Action | New Tool | Description | Agent Scope |
|---|---|---|---|
| `scan, graph` | `code_analyze` | Build code map, dependency graph | investigator |
| `todos, inconsistencies, diff` | `code_audit` | Find TODOs, inconsistencies, drift | investigator, executor |

#### From `idumb_read` (5 actions → 2 tools)

| Current Action | New Tool | Description | Agent Scope |
|---|---|---|---|
| `content, outline` | `artifact_read` | Read governed artifact with provenance tracking | all |
| `traverse, comments, chain-check` | `artifact_inspect` | Traverse chain, check integrity, read comments | investigator |

#### From `idumb_write` (8 actions → 2 tools)

| Current Action | New Tool | Description | Agent Scope |
|---|---|---|---|
| `create, overwrite, append, update-section` | `artifact_write` | Write governed artifact with audit trail. **Shadow innate edit:** "Unlike edit, this tracks provenance and enforces active-task gate" | executor |
| `activate, supersede, abandon, resolve` | `artifact_lifecycle` | Change artifact status (active → superseded → abandoned) | coordinator, executor |

#### From `idumb_bash` (5 purposes → keep as 1, fix permissions)

| Current | New Tool | Notes |
|---|---|---|
| 5 purposes with pattern matching | `governed_shell` | Rename for clarity. Fix ROLE_PERMISSIONS (DRIFT-01). Keep purpose-based gating. |

#### From `idumb_webfetch` (3 purposes → keep as 1)

| Current | New Tool | Notes |
|---|---|---|
| 3 purposes | `governed_fetch` | Rename for clarity. Keep purpose-based gating. |

### Summary

| Before | After |
|---|---|
| 9 tools, 49 actions | 19 tools, 0 multi-action switches |
| Largest tool: 13 actions | Largest tool: 1 action |
| Tool naming: `idumb_*` (mechanism) | Tool naming: `verb_noun` (intent) |

### Agent Tool Visibility (via OpenCode frontmatter)

This replaces `AGENT_TOOL_RULES` entirely. Each agent's markdown frontmatter includes:

```yaml
# coordinator frontmatter
tools:
  epic_create: true
  task_create: true
  task_transition: true
  task_delegate: true
  task_query: true
  anchor: true
  govern_init: true
  govern_status: true
  project_scan: true
  artifact_read: true
  artifact_lifecycle: true
  # Blocked for coordinator:
  artifact_write: false
  governed_shell: false
  governed_fetch: false
  code_analyze: false
  code_audit: false
  artifact_inspect: false
  project_discover: false
```

```yaml
# investigator frontmatter
tools:
  task_query: true
  anchor: true
  govern_status: true
  project_scan: true
  project_discover: true
  code_analyze: true
  code_audit: true
  artifact_read: true
  artifact_inspect: true
  governed_fetch: true
  # Blocked for investigator:
  epic_create: false
  task_create: false
  task_transition: false
  task_delegate: false
  artifact_write: false
  artifact_lifecycle: false
  govern_init: false
  governed_shell: false
```

```yaml
# executor frontmatter
tools:
  task_query: true
  task_transition: true
  anchor: true
  govern_status: true
  code_audit: true
  artifact_read: true
  artifact_write: true
  artifact_lifecycle: true
  governed_shell: true
  # Blocked for executor:
  epic_create: false
  task_create: false
  task_delegate: false
  govern_init: false
  project_scan: false
  project_discover: false
  code_analyze: false
  artifact_inspect: false
  governed_fetch: false
```

**Impact:** `AGENT_TOOL_RULES` in `tool-gate.ts` becomes dead code. Remove it. The tool gate hook simplifies to only checking the active-task gate for write tools.

---

## Phase 2: SDK Client Integration

### 2.1 Store the Client Reference

```typescript
// src/index.ts
let sdkClient: ReturnType<typeof createOpencodeClient> | null = null

export default async function plugin(input: PluginInput): Promise<Hooks> {
  sdkClient = input.client
  // ... rest of plugin setup
}

// src/lib/sdk-client.ts (new file)
export function getClient() {
  if (!sdkClient) throw new Error("SDK client not initialized")
  return sdkClient
}
```

### 2.2 Replace Reinvented Wheels

| Current Approach | SDK Replacement | File(s) Affected |
|---|---|---|
| File-based logging (`createLogger`) | `client.app.log()` | `src/lib/logging.ts`, all consumers |
| `process.cwd()` for project dir | `input.directory` / `input.worktree` | Tool context, hooks |
| Manual grep/find in scan tools | `client.find.text()`, `client.find.files()` | `src/tools/scan.ts` |
| No agent discovery | `client.app.agents()` | `src/tools/init.ts`, validation |
| No session tracking | `client.session.list()`, `.status()` | Hook state management |
| console.log pollution risk | `client.tui.showToast()` | Status messages |
| Manual agent cycling | `client.tui.executeCommand("agent_cycle")` | Delegation tool (needs validation) |
| No VCS awareness | `client.vcs.get()` | Branch-aware governance |

### 2.3 Delegation via SDK (Needs Runtime Validation)

The `task_delegate` tool should:

1. Create delegation record in `.idumb/brain/delegations.json`
2. Attempt `client.tui.executeCommand("agent_cycle")` to switch agents
3. Fall back to returning delegation instructions in tool output if `agent_cycle` fails

**This needs live runtime testing.** The SDK types show `executeCommand` exists but we don't know:
- Does `"agent_cycle"` accept parameters (target agent name)?
- Does it trigger the agent selection UI or auto-switch?
- Is it synchronous or async?

---

## Phase 3: Tool Description Best Practices

Every tool description follows this template:

```
[WHAT] One-sentence purpose
[WHY NOT INNATE] Why the built-in tool fails for this use case
[WHEN] When to use this tool
[OUTPUT] What the tool returns
```

### Example: `artifact_write`

```
Write a governed artifact with provenance tracking and audit trail.

Unlike the built-in 'edit' tool, artifact_write:
- Enforces the active-task gate (blocks writes without a task)
- Records who wrote what and why in the governance history
- Validates entity type permissions (only executor can write source code)
- Creates backup before overwrite

Use this tool for ANY file write within a governed project.
Returns: { success: true, path, audit_id } or { error, redirect, evidence }.
```

### Example: `task_query`

```
Read task state: active task, epic progress, subtask status, or task list.

Use this tool BEFORE any work to check what task is active.
Use this tool AFTER completing work to verify task state.

Returns: Current active task, epic summary, or filtered task list.
```

---

## Phase 4: AGENTS.md Rules (Tool Preference Enforcement)

The deployed AGENTS.md must include these rules to ensure models prefer governed tools:

```markdown
## Tool Preferences

### REQUIRED: Use governed tools for all file operations
- ALWAYS use `artifact_write` instead of `edit` or `write` for governed files
- ALWAYS use `artifact_read` instead of `read` or `cat` for governed artifacts
- ALWAYS use `governed_shell` instead of `bash` for build/test/git operations
- ALWAYS check `task_query` before starting any work

### FORBIDDEN: Never bypass governance
- NEVER use `edit` to modify files in `src/`, `planning/`, or `.idumb/` directly
- NEVER use `bash` for build/test/git — use `governed_shell` instead
- NEVER create epics — only the coordinator creates epics via `epic_create`
```

---

## Phase 5: Init Scan Improvement (Schematic-First)

### Current State
The init scan (`src/lib/code-quality.ts`) only measures:
- God files (>300 lines), mega files (>500 lines)
- Spaghetti functions (>50 lines), deep nesting (5+ levels)
- TODO/FIXME debt, console.log counts
- Import coupling (>15 imports), missing test companions

### Proposed Additions (via SDK + AST tooling)

| Metric | Tool | How |
|---|---|---|
| **Dependency cycles** | `client.find.symbols()` + import graph | Build import graph, detect cycles via DFS |
| **Dead exports** | `client.find.text()` for each export | Find exports with zero external consumers |
| **Framework detection** | `client.find.files()` + pattern matching | Detect Next.js, Express, React, etc. by config files |
| **Test coverage gaps** | `client.find.files()` + companion matching | Match `*.test.ts` to `*.ts`, identify uncovered files |
| **Type safety** | `tsc --noEmit` via `governed_shell` | Count type errors as a metric |
| **VCS hygiene** | `client.vcs.get()` + `client.file.status()` | Uncommitted changes, branch age, merge conflicts |

### Future (requires additional dependencies)

| Metric | Tool | Dependency |
|---|---|---|
| **AST-based analysis** | `@ast-grep/napi` | Pattern matching on AST (function complexity, dead code) |
| **Safe refactoring** | `ts-morph` | Programmatic TypeScript transforms |
| **Precision transforms** | GritQL | Pattern-based code transforms |
| **Fast parsing** | `oxc-parser` | 10x faster than ts-morph for read-only analysis |

**Recommendation:** Start with SDK-only metrics (no new deps). Add `@ast-grep/napi` in a later slice for AST analysis. `ts-morph` and GritQL are heavy — only add if refactoring features are explicitly requested.

---

## Implementation Slicing

### Slice A: Fix Drift (Phase 0)
- Fix DRIFT-01 through DRIFT-05
- ~1-2 hours, no architecture change
- Tests must pass after

### Slice B: Tool Split (Phase 1)
- Create 19 new tool files in `src/tools/`
- Migrate logic from 9 mega-tools
- Update `src/tools/index.ts` barrel export
- Update `src/tools-plugin.ts` barrel export
- Delete old tool files
- Update all tests
- ~2-3 days

### Slice C: Native Scoping (Phase 1 continued)
- Update agent templates with `tools:` frontmatter
- Remove `AGENT_TOOL_RULES` from tool-gate.ts
- Simplify tool gate hook to active-task check only
- ~4-6 hours

### Slice D: SDK Client Integration (Phase 2)
- Create `src/lib/sdk-client.ts`
- Replace file logging with `client.app.log()`
- Replace `process.cwd()` with `input.directory`
- Add toast notifications via `client.tui.showToast()`
- ~1 day

### Slice E: Delegation via SDK (Phase 2 continued)
- Implement `task_delegate` with `client.tui.executeCommand()`
- Add session tracking via `client.session.*`
- **Requires live runtime validation**
- ~1-2 days

### Slice F: Init Scan Improvement (Phase 5)
- Add SDK-based metrics to code-quality scanner
- Integrate `client.find.*`, `client.vcs.*`, `client.file.*`
- ~1 day

### Slice G: Tool Descriptions + AGENTS.md (Phases 3-4)
- Rewrite all tool descriptions with the template
- Update deployed AGENTS.md with tool preference rules
- ~4-6 hours

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| OpenCode frontmatter `tools:` doesn't actually scope plugin tools | Medium | High (Phase 1 blocked) | Test with a minimal plugin first. If frontmatter only scopes innate tools, keep `AGENT_TOOL_RULES` as fallback |
| `tui.executeCommand("agent_cycle")` doesn't support parameters | Medium | Medium (delegation stays manual) | Fall back to tool output instructions. Document as known limitation |
| 19 tools overwhelm LLM context | Low | Medium | Use `experimental.primary_tools` to show only 5-6 tools to primary agent |
| `experimental.*` hooks don't fire in production | Medium | Low (already known) | Continue with non-experimental hooks. File issue with OpenCode team |
| `client.app.log()` has different semantics than file logging | Low | Low | Keep file logging as fallback |

---

## Open Questions (Need Runtime Validation)

1. Does `AgentConfig.tools` in frontmatter scope plugin-registered tools, or only innate tools?
2. Does `tui.executeCommand("agent_cycle")` accept a target agent parameter?
3. Does `client.session.prompt()` work for sending messages to subagent sessions?
4. Does `experimental.primary_tools` actually hide tools from subagents?
5. Is `client.app.log()` visible in the TUI log viewer or only in server logs?
6. Does `client.find.symbols()` use LSP workspace symbols (requires running LSP)?
