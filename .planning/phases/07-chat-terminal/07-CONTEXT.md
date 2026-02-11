# Phase 7: Chat + Terminal - Context

**Gathered:** 2026-02-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Rich AI chat rendering with Part-based message display, multi-step operation clustering, integrated terminal via OpenCode SDK PTY API, and config/settings UI with model picker and provider management. Session management, diff viewer, and multi-agent visualization are Phase 8.

</domain>

<decisions>
## Implementation Decisions

### Chat message rendering
- Tool calls render as **collapsed accordions** — show tool name + status, expand on click to see full input/output
- Thinking/reasoning sections **collapsed by default** — "Thinking..." label, click to expand reasoning text
- Code blocks include: **copy button** (on hover), **line numbers** (gutter), **language badge** (top corner)
- Message density is **balanced** — clear message boundaries without wasted space, small role indicators instead of avatars

### Step clustering
- Group by **SDK step boundaries** (step-start/step-finish pairs) — all tool calls within a step nested inside the cluster
- Default state: **latest/running cluster expanded**, older clusters collapsed — shows current work, hides completed
- Status display: **icon + text + duration timer** ("Running 3 tools... 4.2s", "Completed 5 tools — 12.1s")
- **Show count badge** — small number showing how many operations are inside each cluster

### Terminal
- Placement: **both** — bottom panel in IDE view + accessible as standalone tab
- This is **OpenCode's SDK PTY** (`client.pty.*`), not a custom implementation — SDK handles shell selection, process lifecycle, WebSocket connection
- **Single terminal** instance (not multi-tab) — simpler UI for this phase
- Theme: **match app theme** — consistent look across IDE, chat, and terminal
- Shell: **SDK default** — whatever OpenCode SDK PTY creates (respects system shell)
- Frontend: xterm.js + FitAddon + AttachAddon connected to SDK PTY WebSocket

### Settings page
- **Tabbed sections** — top-level tabs (General, Providers, Appearance)
- **Model picker in both places** — quick dropdown in chat header for fast switching + full config in settings page
- Provider management via **list + detail panel** — list of providers, click to open detail/edit for each
- Settings should be **intuitive in both contexts** — streamlined in chat, comprehensive in settings panel
- **Dark + light theme toggle** included in this phase (Appearance tab)
- **Keybindings UI skipped** — deferred to later phase
- Persistence: **split SDK + SQLite** — SDK for provider/model config, SQLite (Drizzle) for app preferences (theme, layout)
- **JSON export/import** for settings backup/migration

### Claude's Discretion
- Loading skeleton design for chat messages
- Exact spacing, typography, and color palette
- Error state rendering (network failures, SDK errors)
- File preview rendering within chat (FilePart)
- Image rendering within chat (FilePart with image mime)
- Animation/transition on cluster collapse/expand
- Terminal resize behavior and keyboard shortcuts
- Settings tab ordering and specific form layouts

</decisions>

<specifics>
## Specific Ideas

- Tool calls should feel like accordions, not heavy cards — minimal visual weight when collapsed, full detail when expanded
- Step clusters should give a sense of "the AI is working on this right now" (latest expanded) while keeping history clean (older collapsed)
- Terminal is a thin xterm.js skin over OpenCode's PTY — no custom process management, no node-pty
- Settings should work at two speeds: quick model switch in chat (doesn't break flow) and deep configuration in settings page (full control)

</specifics>

<deferred>
## Deferred Ideas

- Multi-tab terminals — keep single terminal for now, multi-tab in later phase if needed
- Keybindings configuration UI — later phase
- Split terminal panes — later phase
- Terminal-to-chat linking (click terminal output to reference in chat) — later phase

</deferred>

---

*Phase: 07-chat-terminal*
*Context gathered: 2026-02-12*
