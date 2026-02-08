# OpenCode SDK Client API — Available Methods

**Extracted from:** `docs/plans/2026-02-08-sot-contract.md` Section 3
**Date:** 2026-02-09
**Status:** Active reference — UNVERIFIED in live OpenCode runtime (Phase 6)

The plugin receives `PluginInput.client: OpencodeClient` which provides these sub-clients. **`fireToast()` and `sdk-client.ts` exist but are UNVERIFIED.**

---

## High-Value for iDumb (Should Use)

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

## Lower Priority

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

## Key Insight: `tui.executeCommand("agent_cycle")`

This is the **missing link** for programmatic delegation. Currently, delegation relies on LLM manually outputting `@agent-name` mentions. With `tui.executeCommand`, the coordinator tool could:

1. Create a delegation record in `.idumb/brain/delegations.json`
2. Call `client.tui.executeCommand("agent_cycle")` to programmatically cycle to the target agent
3. The target agent's session would inherit the delegation context

This needs validation against the live runtime to confirm `agent_cycle` triggers the agent selection dialog and whether it can be parameterized.

## Key Insight: `session.children()` + `session.abort()`

These enable the coordinator to:
1. Track which child sessions (subagents) are spawned
2. Monitor their status via `session.status()`
3. Abort runaway sessions via `session.abort()`

This is the infrastructure needed for the "delegation tree" visualization in the dashboard.
