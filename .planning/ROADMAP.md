# Roadmap: iDumb v2.0 — AI Code IDE + Workspace Foundation

## Milestones

- ✅ **v1.0 Engine Baseline** — Phases 1, 1A (shipped 2026-02-10)
- 🚧 **v2.0 AI Code IDE + Workspace Foundation** — Phases 5-10 (in progress)

## Phases

<details>
<summary>✅ v1.0 Engine Baseline (Phases 1, 1A) — SHIPPED 2026-02-10</summary>

### Phase 1: Engine + Task Bus
**Goal**: Dashboard backend with OpenCode SDK streaming, task sidebar, settings scaffold
**Status**: Complete (10/10 plans)

Plans:
- [x] 01-01: Backend Engine — OpenCode Server lifecycle + Session Proxy API + SSE relay
- [x] 01-02: Frontend App Shell — React Router + Layout + Sidebar + API hooks
- [x] 01-03: Chat Interface — Streaming renderer + Part renderers + Input bar
- [x] 01-04: Task Bus — Task API routes + Task sidebar + Task detail + Rich cards
- [x] 01-05: Multi-Agent Delegation + Governance
- [x] 01-06: Dashboard Landing + Integration
- [x] 01-07: Gap Closure — 16 pre-UAT audit flaws
- [x] 01-08: Gap Closure — UAT gaps
- [x] 01-09: Config gap closure — Backend config routes + Model/Agent selectors
- [x] 01-10: Config gap closure — Settings page (4 tabs) + Enhanced sidebar

### Phase 1A: Plugin Demotion + Architecture Cleanup
**Goal**: Archive plugin architecture, establish SDK-direct patterns
**Status**: Complete (2/2 plans)

Plans:
- [x] 1A-01: Archive plugin source + fix build chain
- [x] 1A-02: Fix documentation drift

*Phases 1B-4 replaced by v2.0 milestone scope.*

</details>

### 🚧 v2.0 AI Code IDE + Workspace Foundation

**Milestone Goal:** Build a rich Code IDE (Stage 1, Phases 5-8) then add governance differentiators (Phase 9) and i18n validation (Phase 10). Proves OpenCode SDK can power a self-hosted Cursor/Windsurf alternative.

**Stage 1 timebox:** 3 weeks (Phases 5-8)
**Total requirements:** 25 (FND-01..04, IDE-01..05, CHAT-01..06, DF-01..07, I18N-01..03)

- [x] **Phase 5: Framework Foundation** — TanStack Start scaffold + server refactor + shared types + data layer
- [x] **Phase 6: IDE Shell** — File tree + Monaco editor + resizable panel layout *(completed 2026-02-11)*
- [ ] **Phase 7: Chat + Terminal** — Rich chat rendering + step clustering + integrated terminal + config UI
- [ ] **Phase 8: Sessions + Diffs + Agents** — Session management + diff viewer + multi-agent visualization
- [ ] **Phase 9: Governance + Quick Wins** — Task sidebar + file tracking + code quality + minimap + export
- [ ] **Phase 10: i18n Validation** — Translation infrastructure + string extraction + Vietnamese validation

## Phase Details

### Phase 5: Framework Foundation
**Goal**: Platform runs on TanStack Start with type-safe transport and persistent data layer
**Depends on**: Phase 1A (existing dashboard provides starting point)
**Requirements**: FND-01, FND-02, FND-03, FND-04
**Success Criteria** (what must be TRUE):
  1. User starts dev server and TanStack Start SPA loads with file-based routing working
  2. Server functions return typed data — no new Express route handlers (existing ones migrated or wrapped)
  3. SSE streaming works through server routes for OpenCode SDK chat events
  4. Drizzle ORM reads/writes SQLite tables for settings and workspace config with auto-generated migrations
**Plans**: 6 plans (incl. 1 early Phase 7 bonus)

Plans:
- [x] 05-01: TanStack Start scaffold + SPA mode + Vite config + file-based routing
- [x] 05-02: Server refactor — split server.ts (1427 LOC), migrate routes to server functions + server routes
- [x] 05-03: Shared type contracts (ide-types.ts) + Drizzle ORM data layer
- [x] 05-04: Gap closure — SPA hydration fix (startTransition + dead file cleanup + engine init refactor)
- [x] 05-05: *(early Phase 7 bonus)* Chat UI scaffold — messages, input, sidebar, engine status (CHAT-01/CHAT-03 scope, not FND)
- [x] 05-06: Gap closure — SSE architecture fix + Express purge (runtime verified 2026-02-11)

### Phase 6: IDE Shell
**Goal**: Users can browse project files and edit code in a resizable IDE workspace
**Depends on**: Phase 5 (framework + server functions for file operations)
**Requirements**: IDE-01, IDE-02, IDE-05
**Success Criteria** (what must be TRUE):
  1. User navigates project files in a recursive tree with expand/collapse, file icons, and context menu (rename, delete, new file/folder)
  2. User edits code in Monaco with syntax highlighting, multi-tab, save with dirty indicators, and auto-language detection
  3. User arranges workspace panels (sidebar, editor, chat) with draggable dividers, collapsible panels, and layout persisted across sessions
**Plans**: 4 plans

Plans:
- [x] 06-01-PLAN.md — Resizable panel layout + Zustand IDE store + file server functions (wave 1)
- [x] 06-02-PLAN.md — File tree with react-arborist + Radix context menu + React Query hooks (wave 2)
- [x] 06-03-PLAN.md — Monaco editor with model-swapping + multi-tab + save + SSR safety (wave 3)
- [ ] 06-04-PLAN.md — Gap closure: layout persistence wiring + IDE nav link (wave 1)

### Phase 7: Chat + Terminal
**Goal**: Users interact with AI through rich rendered chat and run commands in integrated terminal
**Depends on**: Phase 5 (server functions for streaming + WebSocket for PTY), Phase 6 (layout panels host chat + terminal)
**Requirements**: CHAT-01, CHAT-02, IDE-03, CHAT-05
**Success Criteria** (what must be TRUE):
  1. User sees rich chat messages — markdown with syntax-highlighted code blocks, tool call cards with status, file previews, image rendering, collapsible thinking sections
  2. User sees multi-step AI operations grouped into collapsible step clusters with count badges and running/complete/failed status
  3. User executes commands in integrated terminal with ANSI colors, resize handling, multi-tab, and automatic process cleanup on disconnect
  4. User changes AI model, manages providers, and adjusts settings through UI with changes persisted via SDK
**Plans**: 4 plans

Plans:
- [ ] 07-01: Chat rendering upgrade — PartView + marked + shiki + DOMPurify
- [ ] 07-02: Step clustering component (collapsible groups, status indicators)
- [ ] 07-03: Terminal — xterm.js + node-pty + WebSocket + PTYManager
- [ ] 07-04: Config/settings UI with SDK persistence

### Phase 8: Sessions + Diffs + Agents
**Goal**: Users manage AI sessions, review code changes, and see multi-agent operations with clear attribution
**Depends on**: Phase 6 (Monaco for DiffEditor), Phase 7 (chat rendering for agent viz, session foundation)
**Requirements**: CHAT-03, CHAT-04, IDE-04, CHAT-06, DF-01, DF-06
**Success Criteria** (what must be TRUE):
  1. User creates, switches, deletes, searches, and renames AI sessions with auto-generated titles
  2. User reverts a session to any previous message and restores with visual checkpoint indicators
  3. User reviews code changes in diff viewer with inline and side-by-side modes, file change list, and click-to-open-diff
  4. User sees multi-agent operations with sequential vertical flow and parallel side-by-side split with status indicators per agent
  5. User sees which agent authored each message via badges/avatars with delegation flow annotations
**Plans**: 3 plans

Plans:
- [ ] 08-01: Session management — CRUD + search + auto-title + revert/unrevert
- [ ] 08-02: Diff viewer — Monaco DiffEditor + file change list + disposal
- [ ] 08-03: Multi-agent visualization + agent attribution badges

### Phase 9: Governance + Quick Wins
**Goal**: Users see governance state, track AI file changes, get code quality feedback, and navigate conversations efficiently
**Depends on**: Phase 8 (agent attribution for export, session context for file tracking)
**Requirements**: DF-02, DF-03, DF-04, DF-05, DF-07
**Success Criteria** (what must be TRUE):
  1. User sees governance state in task sidebar — status badges (blocked/needs-review/stale), chain health indicators, delegation routing per task
  2. User tracks which files AI modified, when, as part of which task, with click-to-conversation linking
  3. User sees code quality decorations in Monaco (wavy underlines for smells), status bar grade (A-F), and scan command
  4. User navigates long conversations via minimap — colored message blocks, viewport indicator, click-to-scroll
  5. User exports agent messages — copy individual responses, export full run as markdown, share conversation segments
**Plans**: 3 plans

Plans:
- [ ] 09-01: Governance task sidebar — status badges + chain health + delegation display
- [ ] 09-02: AI file change tracking with conversation linking
- [ ] 09-03: Code quality Monaco decorations + conversation minimap + agent export

### Phase 10: i18n Validation
**Goal**: IDE supports English and Vietnamese with validated localization across all features
**Depends on**: Phase 9 (all UI features must exist for string extraction and validation)
**Requirements**: I18N-01, I18N-02, I18N-03
**Success Criteria** (what must be TRUE):
  1. User switches language in UI, preference persists in localStorage, and all visible strings update live
  2. All UI strings load from namespaced JSON translation files (common, editor, terminal, chat, tasks) with zero hardcoded strings
  3. Vietnamese localization passes validation — NFC normalization, vi-VN date formatting, Vietnamese-safe fonts, Telex IME works in Monaco and terminal, UI containers handle 20% text expansion
**Plans**: 3 plans

Plans:
- [ ] 10-01: react-i18next infrastructure + namespace setup + language switcher
- [ ] 10-02: String extraction + English/Vietnamese translation files
- [ ] 10-03: Vietnamese validation — IME testing + NFC + date/font/expansion verification

## Coverage

| Requirement | Phase | Category |
|-------------|-------|----------|
| FND-01 | Phase 5 | Foundation |
| FND-02 | Phase 5 | Foundation |
| FND-03 | Phase 5 | Foundation |
| FND-04 | Phase 5 | Foundation |
| IDE-01 | Phase 6 | Code IDE |
| IDE-02 | Phase 6 | Code IDE |
| IDE-05 | Phase 6 | Code IDE |
| CHAT-01 | Phase 7 | Chat & AI |
| CHAT-02 | Phase 7 | Chat & AI |
| IDE-03 | Phase 7 | Code IDE |
| CHAT-05 | Phase 7 | Chat & AI |
| CHAT-03 | Phase 8 | Chat & AI |
| CHAT-04 | Phase 8 | Chat & AI |
| IDE-04 | Phase 8 | Code IDE |
| CHAT-06 | Phase 8 | Chat & AI |
| DF-01 | Phase 8 | Differentiator |
| DF-06 | Phase 8 | Differentiator |
| DF-02 | Phase 9 | Differentiator |
| DF-03 | Phase 9 | Differentiator |
| DF-04 | Phase 9 | Differentiator |
| DF-05 | Phase 9 | Differentiator |
| DF-07 | Phase 9 | Differentiator |
| I18N-01 | Phase 10 | i18n |
| I18N-02 | Phase 10 | i18n |
| I18N-03 | Phase 10 | i18n |

**Mapped: 25/25 -- No orphaned requirements**

## Dependency Constraints Verified

| Constraint | Satisfied |
|-----------|-----------|
| DF-06 depends on CHAT-06 (same or later phase) | Phase 8 |
| DF-07 depends on DF-01 (same or later phase) | DF-01 Phase 8, DF-07 Phase 9 |
| IDE-04 diff needs Monaco from IDE-01 | IDE-01 Phase 6, IDE-04 Phase 8 |
| CHAT-06 agent viz needs CHAT-01 rendering | CHAT-01 Phase 7, CHAT-06 Phase 8 |
| Stage 1 timebox covers Phases 5-8 (~3 weeks) | Research estimate: 16-22 days |

## Progress

**Execution Order:** 5 -> 6 -> 7 -> 8 -> 9 -> 10

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Engine + Task Bus | v1.0 | 10/10 | Complete | 2026-02-10 |
| 1A. Plugin Demotion | v1.0 | 2/2 | Complete | 2026-02-10 |
| 5. Framework Foundation | v2.0 | 6/6 | Complete | 2026-02-11 |
| 6. IDE Shell | v2.0 | 3/4 | Gap closure | -- |
| 7. Chat + Terminal | v2.0 | 0/4 | Not started | -- |
| 8. Sessions + Diffs + Agents | v2.0 | 0/3 | Not started | -- |
| 9. Governance + Quick Wins | v2.0 | 0/3 | Not started | -- |
| 10. i18n Validation | v2.0 | 0/3 | Not started | -- |

---
*Roadmap created: 2026-02-09*
*Updated: 2026-02-11 -- Phase 6: 06-01 complete (IDE shell layout + Zustand store + deps)*
