# Roadmap: iDumb v2.0 — AI Code IDE + Workspace Foundation

## Milestones

- ✅ **v1.0 Engine Baseline** — Phases 1, 1A (shipped 2026-02-10)
- 🚧 **v2.0 AI Code IDE + Workspace Foundation** — Phases 5-11 (in progress)

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

**Milestone Goal:** Build a rich Code IDE (Stage 1, Phases 5-8) then polish UX (Phase 8.5), add governance differentiators (Phase 9) and i18n validation (Phase 10). Proves OpenCode SDK can power a self-hosted Cursor/Windsurf alternative.

**Stage 1 timebox:** 3 weeks (Phases 5-8)
**Total requirements:** 25 functional (FND-01..04, IDE-01..05, CHAT-01..06, DF-01..07, I18N-01..03) + Phase 8.5 cross-cutting quality

- [x] **Phase 5: Framework Foundation** — TanStack Start scaffold + server refactor + shared types + data layer
- [x] **Phase 6: IDE Shell** — File tree + Monaco editor + resizable panel layout + gap closure *(completed 2026-02-11)*
- [x] **Phase 11: SDK Type Architecture** — SDK contract registry + Zod boundary validation + type governance + consumer migration *(completed 2026-02-11)*
- [x] **Phase 11.1: Build & Config Blockers** — Fix build failure, typecheck, type governance violations, config drift *(completed 2026-02-12)*
- [x] **Phase 11.2: Contamination & Dead Code Purge** — Remove plugin-era docs, dead code, stale references *(completed 2026-02-12)*
- [x] **Phase 7: Chat + Terminal** — Rich chat rendering + step clustering + integrated terminal + config UI + gap closure *(completed 2026-02-12)*
- [x] **Phase 8: Sessions + Diffs + Agents** — Session management + diff viewer + multi-agent visualization *(completed 2026-02-12)*
- [ ] **Phase 8.1: Cross-Phase Infrastructure Fixes + UAT Gap Closure** — Fix project dir mismatch, DB migration, error handling, revert guards, search UX
- [ ] **Phase 8.5: Design System + UX Polish** — Shared UI primitives + consistent state patterns + component refinement across all surfaces
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
- [x] 06-04-PLAN.md — Gap closure: layout persistence wiring + IDE nav link (wave 1)

### Phase 11: SDK Type Architecture + Boundary Validation
**Goal**: Establish validated, research-backed SDK type contracts at all app boundaries, govern executor behavior around type safety, document expected type alarms for downstream phases, and migrate all consumers to SDK-native shapes with Zod-guarded boundaries
**Depends on**: Phase 6 (types consumed by IDE Shell components and server functions). Committed starting point: `c585f48` (SDK re-exports in engine-types.ts already done)
**Requirements**: FND-02 (updated — SDK types = law for engine contracts, app types = internal state only, Zod at boundaries)
**Success Criteria** (what must be TRUE):
  1. SDK type contract registry (`11-CONTRACTS.md`) documents every SDK type shape consumed by this app — field types, nullable fields, discriminant values — as the single executor reference
  2. AGENTS.md contains type governance rules: SDK type taxonomy (SDK = law, app = internal only), banned patterns (`as any` on SDK types, hand-rolling SDK shapes), per-phase false alarm table
  3. Zod schemas exist at server function boundaries validating SDK data shape before it reaches hooks/components — runtime validation, not just compile-time
  4. All consumers (`useStreaming.ts`, `ChatMessage.tsx`, `chat.$sessionId.tsx`) use SDK Part/Event discriminated unions with proper narrowing — zero `as any` casts on SDK types
  5. `tsc --noEmit` passes with zero errors after full migration
**Plans**: 4 plans (archived: `_archived-2026-02-11/11-01-PLAN.md`, `_archived-2026-02-11/11-02-PLAN.md`)

Plans:
- [x] 11-01-PLAN.md — SDK type contract registry + full audit (wave 1, research)
- [x] 11-02-PLAN.md — AGENTS.md type governance + false alarm registry (wave 1, docs)
- [x] 11-03-PLAN.md — Zod boundary schemas + server function guards (wave 2, code)
- [x] 11-04-PLAN.md — Consumer migration with type guards (wave 3, code)

### Phase 11.1: Build & Config Blockers
**Goal**: Unblock Phase 7 — production build works, typecheck passes, type governance clean, config accurate
**Depends on**: Phase 11 (audit revealed gaps in completed phases)
**Requirements**: FND-02 (type governance hardening)
**Gap Closure**: Closes GAP-1, GAP-2, GOV-1, DRIFT-1, DRIFT-2, CONFIG-1, CONFIG-2 from v2.0-MILESTONE-AUDIT.md
**Success Criteria** (what must be TRUE):
  1. `npm run build:app` succeeds (both client and SSR builds)
  2. `npm run typecheck:app` passes with zero errors
  3. All `app/` SDK type imports go through `engine-types.ts` — zero direct `@opencode-ai/sdk` imports except gateway and sdk-client.server.ts
  4. No dead path aliases in tsconfig.app.json or vite.config.ts
  5. `package.json` entry point valid, `package-lock.json` has no phantom `@opencode-ai/plugin`
  6. CLAUDE.md test baseline matches actual (`npm test` output)
**Plans**: 1 plan (all fixes are small, targeted, same-session)

Plans:
- [x] 11.1-01-PLAN.md — Fix 7 build/config/type blockers

### Phase 11.2: Contamination & Dead Code Purge
**Goal**: Remove all plugin-era context pollution — no stale docs misleading agents, no dead code inflating LOC
**Depends on**: Phase 11.1 (config fixes first, then cleanup)
**Requirements**: None (documentation + dead code — no functional requirements)
**Gap Closure**: Closes DOC-1..DOC-3, CODE-1..CODE-2 from contamination audit
**Success Criteria** (what must be TRUE):
  1. No root-level CLAUDE-*.md files exist except CLAUDE.md (the active project instructions)
  2. `.planning/codebase/` files archived to `_archived-2026-02-11/` or deleted
  3. `brain-indexer.ts` deleted (383 LOC dead code, imported by nobody)
  4. `persistence.ts` header comments reference current consumers (not archived tool-gate.ts, compaction.ts)
  5. Stale root .md files (GAP-ANALYSIS, TRIAL-1-RESULTS, fix-delegation-system, conversation, n-3-2-1e, analysis-agent-system, TEST-CASES) archived or deleted
**Plans**: 1 plan (bulk archive/delete operations)

Plans:
- [x] 11.2-01-PLAN.md — Archive stale docs + delete dead code

### Phase 7: Chat + Terminal
**Goal**: Users interact with AI through rich rendered chat and run commands in integrated terminal
**Depends on**: Phase 11 (validated SDK types + Zod boundaries), Phase 5 (server functions for streaming), Phase 6 (layout panels host chat + terminal)
**Requirements**: CHAT-01, CHAT-02, IDE-03, CHAT-05
**Success Criteria** (what must be TRUE):
  1. User sees rich chat messages — markdown with syntax-highlighted code blocks, tool call cards with status, file previews, image rendering, collapsible thinking sections
  2. User sees multi-step AI operations grouped into collapsible step clusters with count badges and running/complete/failed status
  3. User executes commands in integrated terminal with ANSI colors, resize handling, and automatic process cleanup on disconnect
  4. User changes AI model, manages providers, and adjusts settings through UI with changes persisted via SDK
**Plans**: 6 plans (4 feature + 2 gap closure)

Plans:
- [x] 07-01-PLAN.md — Rich chat Part renderers: CodeBlock + ToolCallAccordion + ReasoningCollapse + FilePartRenderer (wave 1)
- [x] 07-02-PLAN.md — Step clustering: StepCluster component + part grouping + streaming step awareness (wave 2)
- [x] 07-03-PLAN.md — Integrated terminal: xterm.js + SDK PTY API + IDEShell integration + standalone route (wave 1)
- [x] 07-04-PLAN.md — Settings & model picker: 3-tab settings page + chat header ModelPicker + theme toggle (wave 1)
- [x] 07-05-PLAN.md — Gap closure: DB migration + theme CSS + stream termination (wave 1)
- [x] 07-06-PLAN.md — Gap closure: terminal visibility + file tree regression + tool copy buttons (wave 1)

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
- [x] 08-01: Session management — CRUD + search + auto-title + revert/unrevert
- [x] 08-02: Diff viewer — Monaco DiffEditor + file change list + disposal
- [x] 08-03: Multi-agent visualization + agent attribution badges

### Phase 8.1: Cross-Phase Infrastructure Fixes + UAT Gap Closure
**Goal**: Fix infrastructure defects inherited from Phases 5/7 that cause Phase 8 UAT failures — project directory mismatch (diffs empty), DB migration failure (settings crash cascade), missing error handling (revert crashes silently)
**Depends on**: Phase 8 (UAT diagnosed these gaps)
**Requirements**: None (gap closure — no new functional requirements)
**Gap Closure**: Closes Phase 8 UAT Tests 1, 4, 7 + Phase 7 inherited settings crash + Phase 5 inherited project dir mismatch
**Success Criteria** (what must be TRUE):
  1. `getProjectDir()` returns git repository root (not `app/` subdirectory) — `session.diff()` returns actual file changes
  2. DB migration runs reliably — `settings` table exists, all `settings.ts` server functions succeed without "no such table" errors
  3. All `settings.ts` server functions have try/catch — return null/empty on failure, never crash consumers
  4. `useSetting("default-model")` in chat page does not crash the page when DB is unavailable
  5. Revert/unrevert mutations have `onError` handlers — user sees error feedback, not silent failure
  6. Revert button is disabled during active streaming — no SDK 400 "session busy" errors
  7. Session search shows result count ("N of M sessions"), clear/X button, and match highlighting in titles
**Plans**: 1 plan (7 targeted fixes across 7 files)

Plans:
- [ ] 08.1-01-PLAN.md — 7 cross-phase infrastructure fixes + UAT gap closure

### Phase 8.5: Design System + UX Polish
**Goal**: Users experience a visually consistent, polished IDE — every surface uses shared primitives with coherent loading/error/empty states, proper animations, and refined component design
**Depends on**: Phase 8 (all UI surfaces must exist before polishing — avoids double work)
**Requirements**: None (no new functional requirements — cross-cutting quality improvement)
**Success Criteria** (what must be TRUE):
  1. Shared UI primitive library exists (Button, Card, Input, Badge, Dialog, Tooltip, Tabs, DropdownMenu) — all components migrate from hand-rolled HTML to shared primitives
  2. Consistent state patterns: single `<LoadingState>` component (spinner + text), single `<ErrorState>` component (icon + message + retry action), single `<EmptyState>` component (icon + title + description) used across all surfaces
  3. Zero hard-coded color values in components — all colors reference design tokens (bg-background, text-foreground, etc.), light/dark theme works across every component
  4. Native browser dialogs (window.prompt, window.confirm) replaced with in-app modal dialogs
  5. All interactive elements have hover/focus/active states with consistent transitions (150ms ease)
  6. Component visual refinement pass: tool accordions, thinking sections, settings tabs, chat messages, step clusters all meet minimum design quality bar
**Plans**: 4 plans (estimated)

Plans:
- [ ] 08.5-01: shadcn/ui primitives installation + shared state components (Loading, Error, Empty)
- [ ] 08.5-02: Component migration — replace hand-rolled buttons/cards/inputs/tabs/dropdowns with primitives
- [ ] 08.5-03: Dialog system — replace window.prompt/confirm with Radix Dialog, add confirmation patterns
- [ ] 08.5-04: Visual refinement pass — spacing, transitions, color consistency, component polish across all surfaces

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
| Phase 11 SDK types + Zod validation must exist before Phase 7 builds on them | Phase 11 → Phase 7 |
| Phase 11.1 build/config blockers must be fixed before Phase 7 | Phase 11.1 → Phase 7 |
| Phase 11.2 contamination cleanup before Phase 7 (prevent context poisoning) | Phase 11.2 → Phase 7 |
| DF-06 depends on CHAT-06 (same or later phase) | Phase 8 |
| DF-07 depends on DF-01 (same or later phase) | DF-01 Phase 8, DF-07 Phase 9 |
| IDE-04 diff needs Monaco from IDE-01 | IDE-01 Phase 6, IDE-04 Phase 8 |
| CHAT-06 agent viz needs CHAT-01 rendering | CHAT-01 Phase 7, CHAT-06 Phase 8 |
| Stage 1 timebox covers Phases 5-8 (~3 weeks) | Research estimate: 16-22 days |

## Progress

**Execution Order:** 5 -> 6 -> 11 -> 11.1 -> 11.2 -> 7 -> 8 -> 8.1 -> 8.5 -> 9 -> 10

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Engine + Task Bus | v1.0 | 10/10 | Complete | 2026-02-10 |
| 1A. Plugin Demotion | v1.0 | 2/2 | Complete | 2026-02-10 |
| 5. Framework Foundation | v2.0 | 6/6 | Complete | 2026-02-11 |
| 6. IDE Shell | v2.0 | 4/4 | Complete | 2026-02-11 |
| 11. SDK Type Architecture | v2.0 | 4/4 | Complete | 2026-02-11 |
| 11.1. Build & Config Blockers | v2.0 | 1/1 | Complete | 2026-02-12 |
| 11.2. Contamination Purge | v2.0 | 1/1 | Complete | 2026-02-12 |
| 7. Chat + Terminal | v2.0 | 6/6 | Complete | 2026-02-12 |
| 8. Sessions + Diffs + Agents | v2.0 | 3/3 | Complete | 2026-02-12 |
| 8.1. Infrastructure Fixes + UAT Gaps | v2.0 | 0/1 | Not started | -- |
| 8.5. Design System + UX Polish | v2.0 | 0/4 | Not started | -- |
| 9. Governance + Quick Wins | v2.0 | 0/3 | Not started | -- |
| 10. i18n Validation | v2.0 | 0/3 | Not started | -- |

---
*Roadmap created: 2026-02-09*
*Updated: 2026-02-12 -- Phase 8.1 added: Cross-Phase Infrastructure Fixes + UAT Gap Closure (7 tasks, 7 files). Closes Phase 8 UAT Tests 1/4/7 + inherited Phase 5/7 defects.*
