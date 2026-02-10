# Requirements: iDumb v2.0 — AI Code IDE + Workspace Foundation

**Defined:** 2026-02-10
**Core Value:** Prove OpenCode SDK can power a full-featured self-hosted Code IDE with governed multi-agent workspace

## v1 Requirements

Requirements for milestone v2.0. Each maps to roadmap phases.

### Foundation

- [ ] **FND-01**: TanStack Start project scaffold with SPA mode, file-based routing, server functions, Vite plugin configured with Monaco worker support
- [ ] **FND-02**: Server refactor — split 1427 LOC server.ts, migrate Express routes to TanStack Start server functions + server routes for SSE, standalone WebSocket for terminal PTY
- [ ] **FND-03**: Shared type contracts — ide-types.ts defining File, Terminal, Editor, Session, Agent types shared between server functions and frontend
- [ ] **FND-04**: Schema-first data layer — Drizzle ORM + SQLite for persistent state (settings, sessions metadata, workspace config), auto-generated migrations from TypeScript schemas

### Code IDE

- [ ] **IDE-01**: User can edit code files in Monaco editor with syntax highlighting, multi-tab management, save with dirty indicators, auto-language detection from file extension
- [ ] **IDE-02**: User can navigate project files in a recursive file explorer tree with expand/collapse, file type icons, right-click context menu (rename, delete, new file/folder), and open-in-editor behavior
- [ ] **IDE-03**: User can execute commands in an integrated terminal (xterm.js + node-pty + WebSocket) with multi-tab support, ANSI color rendering, resize handling, and automatic process cleanup on disconnect
- [ ] **IDE-04**: User can review code changes in a diff viewer (Monaco DiffEditor) with inline and side-by-side modes, file change list from SDK file.status(), and click-to-open-diff
- [ ] **IDE-05**: User can arrange workspace panels (sidebar, editor, terminal, chat) in a resizable layout with draggable dividers, collapsible panels, and persisted layout state

### Chat & AI

- [ ] **CHAT-01**: User sees rich chat rendering — markdown with syntax-highlighted code blocks (marked + shiki), tool call cards with status indicators, file previews, image rendering, and collapsible thinking/reasoning sections for all SDK Part types
- [ ] **CHAT-02**: User sees multi-step AI operations grouped into collapsible step clusters with count badges, overall status (running/complete/failed), auto-expand for current step, auto-collapse for completed
- [ ] **CHAT-03**: User can create, switch between, delete, search, and rename AI sessions with auto-generated titles via SDK session.summarize()
- [ ] **CHAT-04**: User can revert a session to any previous message (SDK session.revert) and restore (session.unrevert) with visual checkpoint indicators in the conversation
- [ ] **CHAT-05**: User can access all OpenCode configuration through the UI — model selection dropdown, provider connection management, app settings (scrollback, theme, keybindings), with changes persisted via SDK config/app APIs
- [ ] **CHAT-06**: User sees multi-agent operations displayed with thinking blocks, tool use cards, and clear visualization of sequential agent runs (vertical flow) and parallel agent runs (side-by-side split) with status indicators per agent

### Differentiators

- [ ] **DF-01**: User sees which agent (coordinator, investigator, executor) authored each message via badges/avatars, with delegation flow annotations showing routing decisions
- [ ] **DF-02**: User sees governance state in the task sidebar — status badges (blocked/needs-review/stale), chain health indicators, delegation routing display showing which agent is assigned to each task
- [ ] **DF-03**: User can track which files the AI modified, when, as part of which task, with linked conversation context — click a change to see the conversation where the AI decided to make it
- [ ] **DF-04**: User sees code quality indicators in the editor — Monaco decorations for detected smells (wavy underlines), status bar grade display (A-F), scan-current-file command, roast commentary in chat
- [ ] **DF-05**: User can navigate long conversations via a minimap — narrow vertical strip showing message blocks colored by role, current viewport indicator, click-to-scroll
- [ ] **DF-06**: User can view parallel agent runs in split-pane layout and sequential agent runs in vertical flow, with easy switching between agents and clear visual separation of each agent's work
- [ ] **DF-07**: User can export agent messages and scripts — copy individual agent responses, export full agent run as script/markdown, import/share agent conversation segments

### Internationalization

- [ ] **I18N-01**: i18n infrastructure with react-i18next — client-side only (no server routing for vi), namespace-per-feature pattern, language persistence in localStorage, language switcher visible in UI
- [ ] **I18N-02**: All UI strings extracted into namespaced JSON translation files (common, editor, terminal, chat, tasks) with English as source language, structured for auto-translation to Vietnamese
- [ ] **I18N-03**: Vietnamese localization validated — NFC Unicode normalization on string comparisons, Intl.DateTimeFormat('vi-VN') for dates, Vietnamese-safe fonts (JetBrains Mono, Inter), Telex IME tested in Monaco and terminal, 20% text expansion budget in UI containers

## v2 Requirements

Deferred to Stage 2. Tracked but not in current roadmap scope.

### Experimental Features

- **EXP-01**: Tiptap-based Notion-like block editor for knowledge documents — custom block types (code with Shiki, task list, callout), markdown import/export
- **EXP-02**: Governance schemas wired to runtime — planning registry, delegation, wiki, knowledge base connected via SDK-direct patterns with live data flowing through UI

### Carried Forward (from previous milestone, absorbed into v2 requirements or deferred)

- **REG-01 through REG-04**: Planning registry — absorbed into EXP-02 (Stage 2)
- **DEL-01 through DEL-04**: Smart delegation — partially absorbed into DF-01/DF-02/DF-06 (agent visibility), rest deferred to EXP-02
- **WIKI-01 through WIKI-03**: Codebase wiki — absorbed into DF-03 (AI file change tracking)
- **KB-01 through KB-03**: Knowledge base — deferred to Stage 2+ (post-validation)
- **UI-01 through UI-07**: Previous UI requirements — replaced by IDE-01 through IDE-05, DF-01 through DF-07, and EXP-01

## Out of Scope

| Feature | Reason |
|---------|--------|
| Vercel AI SDK integration | OpenCode SDK covers all AI needs — dual pipeline creates maintenance nightmare |
| Full LSP integration (IntelliSense) | VS Code-level complexity, weeks of work. AI agent IS the IntelliSense for now |
| Separate chat tabs per agent | UX research shows single-thread-with-attribution is superior for developer workflows |
| Real-time collaboration (multi-user) | Single-developer tool. CRDT/Yjs complexity for zero current value |
| Plugin/extension system | Already archived one plugin system. Build features directly |
| SDK-direct governance (write gates) | Deferred — validate Stage 1 IDE and Stage 2 schemas first |
| Cloud deployment | Self-hosted first. Cloud pivot is future milestone |
| Mobile app | Web-first, localhost. Mobile is a different product |
| OAuth / multi-tenant auth | Single-user local tool. Auth adds complexity without value |
| Git UI integration | Users have git CLI and VS Code. Git UI is a Stage 3+ feature |
| Payload CMS | Next.js-coupled, wrong paradigm for IDE. Drizzle ORM replaces it |
| tRPC | Redundant with TanStack Start server functions |
| Server-side i18n routing | Client-side language switching only — no /vi/ routes |
| Graph database | JSON files + in-memory traversal sufficient at ~1000 node scale |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FND-01 | Phase 5 | Pending |
| FND-02 | Phase 5 | Pending |
| FND-03 | Phase 5 | Pending |
| FND-04 | Phase 5 | Pending |
| IDE-01 | Phase 6 | Pending |
| IDE-02 | Phase 6 | Pending |
| IDE-03 | Phase 7 | Pending |
| IDE-04 | Phase 8 | Pending |
| IDE-05 | Phase 6 | Pending |
| CHAT-01 | Phase 7 | Pending |
| CHAT-02 | Phase 7 | Pending |
| CHAT-03 | Phase 8 | Pending |
| CHAT-04 | Phase 8 | Pending |
| CHAT-05 | Phase 7 | Pending |
| CHAT-06 | Phase 8 | Pending |
| DF-01 | Phase 8 | Pending |
| DF-02 | Phase 9 | Pending |
| DF-03 | Phase 9 | Pending |
| DF-04 | Phase 9 | Pending |
| DF-05 | Phase 9 | Pending |
| DF-06 | Phase 8 | Pending |
| DF-07 | Phase 9 | Pending |
| I18N-01 | Phase 10 | Pending |
| I18N-02 | Phase 10 | Pending |
| I18N-03 | Phase 10 | Pending |

**Coverage:**
- v1 requirements: 25 total
- Mapped to phases: 25
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-10*
*Last updated: 2026-02-10 — Phase mappings added after roadmap creation*
