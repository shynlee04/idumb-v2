# Project Research Summary

**Project:** iDumb v2 — AI Code IDE + Knowledge Work Platform
**Domain:** AI-Governed Code IDE (Monaco, Terminal, Chat, Diff, i18n)
**Researched:** 2026-02-10
**Confidence:** HIGH
**Supersedes:** Previous SUMMARY.md (2026-02-09, Coherent Knowledge Graph Prototype scope)
**Synthesized from:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md

## Executive Summary

iDumb v2 is building a **Code IDE + AI Workspace** on top of the OpenCode SDK. Research across 4 dimensions — stack, features, architecture, and pitfalls — converges on a clear recommendation: **build a fresh frontend on TanStack Start (SPA mode)** with Monaco Editor, xterm.js terminal, and production-quality chat rendering, while leveraging OpenCode SDK as the sole AI engine. The existing Express+Vite dashboard is being rebuilt anyway; TanStack Start provides file-based routing, type-safe server functions (replacing both Express routes AND tRPC), and deep TanStack Query integration — all running on the same Vite bundler. Three reference projects (OpenWork, CodeNomad, Portal) were analyzed via Repomix to extract proven patterns for every feature.

The recommended approach is a **strict 2-stage build**: Stage 1 delivers the Code IDE core (8 table stakes: editor, file tree, terminal, chat rendering, step clustering, diffs, sessions, panel layout) within a **3-week timebox**. Stage 2 adds the governance differentiators (multi-agent visibility, task sidebar, AI file tracking). This staging is critical because the project has a documented history of scope creep — project-alpha-master died from feature gravity, and iDumb v2 itself has 2000+ LOC of unconsumed schemas. The NOT-MVP list (no LSP, no git UI, no plugins, no real-time collab, no Vercel AI SDK) must be enforced as strictly as the MVP list.

The key risks are: (1) **Monaco DiffEditor memory leak** (GitHub #4659, confirmed open) requiring aggressive disposal, (2) **Schema-first paralysis** repeating past patterns of writing tested-but-unconsumed types, (3) **TanStack Start RC gotchas** requiring version pinning and early SSE validation, and (4) **Vietnamese IME bugs** in Monaco (#4805) and terminals needing Telex input testing. All are manageable with the prevention strategies documented in PITFALLS.md. The OpenCode SDK single-dependency risk is mitigated by the existing `engine.ts` abstraction layer (235 LOC) — all SDK calls route through this wrapper.

## Key Findings

### Recommended Stack

The stack strategy is **targeted additions to a new TanStack Start foundation**, not a from-scratch rewrite. TanStack Start in SPA mode replaces React Router + Express routes with file-based routing and type-safe server functions. The AI layer stays OpenCode SDK (no Vercel AI SDK). Data management uses Drizzle ORM to replace Payload CMS (which was a hard no — Next.js coupled, wrong paradigm). Three technologies were explicitly rejected: Payload CMS, Vercel AI SDK, and tRPC (all redundant with chosen stack).

**Core technologies:**
- **TanStack Start (SPA mode):** Framework foundation — replaces Express + React Router + tRPC. `createServerFn()` provides type-safe RPCs; server routes handle SSE streaming. Built on Vite.
- **@monaco-editor/react v4.7:** Code editor + built-in DiffEditor — VS Code engine, 2.5M weekly downloads. Zero additional diff library needed.
- **@xterm/xterm v5 + @lydell/node-pty:** Terminal emulator (frontend canvas) + PTY backend (server). Industry standard (VS Code, Theia, JupyterLab).
- **react-i18next v16 + i18next v25:** i18n with namespace support, lazy loading, TypeScript type-safe keys. English-first, Vietnamese-ready.
- **Drizzle ORM v0.40:** Schema-first data management — TypeScript code-first schemas, SQLite native, zero codegen. Replaces Payload CMS need.
- **OpenCode SDK (existing):** All AI capabilities — session CRUD, chat streaming, file operations, events, search. No supplementary AI SDK needed.
- **Zustand (existing):** 3 new stores (file-tree, editor, terminal) alongside existing stores.
- **Chat rendering stack:** marked (MD→HTML) + shiki (syntax highlighting) + DOMPurify (XSS sanitization) + custom PartView component.

**Hard NOs (explicitly rejected with rationale):**
- Payload CMS (Next.js coupled, ships competing admin UI)
- Vercel AI SDK (duplicates OpenCode SDK streaming pipeline, bypasses governance)
- tRPC (redundant — `createServerFn()` is the built-in equivalent)
- LSP integration (too complex for MVP, AI agent IS the IntelliSense)
- Monorepo migration (premature — project is 12K LOC with 1-2 devs)
- Express.js for new routes (stop writing Express routes — use server functions)

### Expected Features

Three reference projects (OpenWork/SolidJS, CodeNomad/React, Portal/React) were analyzed via Repomix to validate feature expectations. The OpenCode SDK capability map was verified via Context7 — the SDK covers ALL AI needs (session, chat, file, find, events), eliminating need for any additional AI library.

**Must have (table stakes — 8 features):**
- **TS-1: Monaco Code Editor** — multi-tab, syntax highlighting, language detection, save/dirty tracking
- **TS-2: File Explorer Tree** — recursive directory tree, file icons, context menus, lazy-load on expand
- **TS-3: Integrated Terminal** — xterm.js + PTY, ANSI rendering, resize, multiple tabs
- **TS-4: Chat Message Rendering** — marked + shiki + DOMPurify, PartView for all SDK Part types (text, tool-invocation, file, image, reasoning)
- **TS-5: Step Clustering** — group consecutive tool calls into collapsible steps with progress indicators
- **TS-6: Code Diff Viewer** — Monaco DiffEditor inline + side-by-side, file change list from `file.status()`
- **TS-7: Session Management** — create/switch/delete/search sessions via SDK
- **TS-8: Responsive Panel Layout** — resizable splits (file tree | editor + terminal | chat)

**Should have (differentiators — 3 quick wins for post-MVP):**
- **DF-6: Conversation Minimap** — ~100 LOC, copied from OpenWork pattern (0.5 days)
- **DF-5: Session Revert/Unrevert** — SDK does the work, just needs UI buttons (1 day)
- **DF-4: Code Quality Integration** — wire existing 719 LOC scanner to Monaco decorations (1-2 days)

**Defer to Stage 2:**
- DF-1: Multi-Agent Visibility — needs agent routing infrastructure first
- DF-2: Governance Task Sidebar — needs schemas wired to runtime
- DF-3: AI File Change Tracking — needs event correlation infrastructure
- Block Editor (Tiptap) — independent feature set, medium-high complexity (5-8 days)

**Anti-features (DO NOT BUILD):**
- Vercel AI SDK direct model calls (bypasses governance)
- Full LSP integration (weeks of work for marginal value)
- Separate chat tabs per agent (UX research says "single thread with attribution" wins)
- Real-time collaboration (single-user tool, CRDT is massive scope)
- Plugin/Extension system (already failed once — archived plugin)
- Notion-like block editor in Stage 1 (defer Tiptap to Stage 2)

**Critical path:** `TS-8 (Layout) → TS-1 (Editor) + TS-4 (Chat) → TS-6 (Diffs) + TS-5 (Steps) → DF-1 (Agents)`

**Stage 1 estimate:** 14-22 days (aligned with 3-week timebox from pitfalls research)

### Architecture Approach

The architecture follows the **local-first web IDE pattern** (same as VS Code Remote, Theia, code-server): browser renders UI, server provides filesystem access and process management, communication via REST + SSE + WebSocket. With the TanStack Start pivot, Express REST routes become server functions (`createServerFn()`), Express SSE becomes server routes with streaming Response, and terminal WebSocket stays standalone. The service layer (FileService, PTYManager) and all data flows remain identical — only the transport wrapper changes.

**Major components:**
1. **FileService** (new backend service) — wraps Node.js `fs` + chokidar + `ignore` package for gitignore-aware file operations
2. **PTYManager** (new backend service) — manages `Map<terminalId, IPty>` with create/resize/destroy lifecycle and cleanup on disconnect
3. **3 Zustand stores** (new frontend) — file-tree (nodes, expanded, selected), editor (tabs, dirty, cursor), terminal (sessions, active tab)
4. **Shared types** in `dashboard/shared/ide-types.ts` — FileTreeNode, FileReadResult, TerminalSession etc. Plain TypeScript interfaces (NO Zod — project convention)
5. **Transport layer** — SSE for chat streaming (keep existing pattern), WebSocket broadcast for file watch events (extend existing `/ws`), dedicated WebSocket per terminal (`/ws/pty/:id`)

**Key architecture decisions:**
- File system via server functions (not WebContainer, not direct SDK — browser can't access host FS)
- Terminal via dedicated WebSocket (not shared with JSON broadcast — binary I/O, high-frequency, per-session)
- Governance at API layer (not component level — server functions reject blocked writes, editor just handles the error)
- Feature folders (not monorepo — premature for 12K LOC / 1-2 devs)

**Prerequisite refactor:** Split `server.ts` (1427 LOC) into route modules BEFORE adding new routes. Extract: `routes/engine.ts`, `routes/sessions.ts`, `routes/governance.ts`, `routes/files.ts`, `routes/events.ts`. Keep `server.ts` as app setup + middleware only (~200 LOC).

### Critical Pitfalls

5 critical + 4 moderate pitfalls identified with specific prevention strategies and confirmed evidence.

1. **Monaco DiffEditor memory leak (GitHub #4659)** — dispose editors explicitly in `useEffect` cleanup, dispose all models on page leave, lazy-load editor via `React.lazy()`, use `vite-plugin-monaco-editor-esm` for web workers, isolate Monaco into its own chunk via `manualChunks`. DiffEditor for static display only — dispose aggressively.

2. **Scope creep (the project-alpha-master pattern)** — define NOT-MVP list before starting, 3-week timebox for Stage 1, one-feature-at-a-time rule, acceptance criteria before implementation. Evidence: templates.ts at 1463 LOC, archived plugin directory, project-alpha-master death from WebContainer/block editor/agent scope expansion.

3. **PTY security and zombie processes** — process tracking Map with kill-on-disconnect, max 3-5 concurrent terminals, idle timeout 30min, `cwd` restriction to project directory, graceful cleanup on SIGTERM. WebSocket auth on every connection.

4. **Schema-first paralysis (the unconsumed schema trap)** — max 50 LOC of new schema per feature, every schema must have a consumer in the same PR, "schema follows implementation" for UI features. Evidence: 2000+ LOC of tested-but-unconsumed schemas in iDumb v2 (planning-registry 729 LOC, task-graph 605 LOC, coherent-knowledge 235 LOC, wiki 153 LOC).

5. **OpenCode SDK single-dependency risk** — keep `engine.ts` as abstraction layer, define iDumb-specific interfaces (not pass-through SDK types), mock-first testing, version-pin SDK, fallback "Engine disconnected" state. Evidence: plugin→SDK-direct pivot already caused `_archived-plugin/` with hundreds of lines of dead code.

**Additional moderate pitfalls:**
- **Vietnamese IME in Monaco (#4805):** Decorations freeze during Telex composition. Workaround: defer decoration updates during `onDidCompositionStart`/`onDidCompositionEnd`. Must test with Telex input. Also test xterm.js with Vietnamese IME.
- **TanStack Start RC gotchas:** Pin exact version (`@tanstack/react-start`, not old `@tanstack/start`), verify SSE streaming early, keep WebSocket separate, budget 2-3 days for framework setup. Rollback plan: same React components work with React Router + Express.
- **i18n retrofitting cost:** Set up react-i18next infrastructure with first components (even English-only). Never concatenate translated strings — use interpolation. Namespace by feature. Design with 20% width buffer for Vietnamese text.
- **2-Stage validation trap:** Stage 1 timebox 3 weeks max. Build governance hook interfaces (no-op) into Stage 1. Define Stage 1 exit criteria upfront.

## Implications for Roadmap

Based on combined research, the build follows the architecture's dependency graph while respecting the pitfalls' timebox constraints. Six phases suggested, with Phases 1-4 (Stage 1) fitting within the 3-week timebox.

### Phase 1: Framework Foundation + Server Refactor
**Rationale:** Everything depends on the framework being set up and the server being split. TanStack Start setup is the highest-risk task (RC framework) — validate early. Server split is a prerequisite for all new routes (ARCHITECTURE: server.ts at 1427 LOC).
**Delivers:** Working TanStack Start SPA with server functions, split server routes, shared `ide-types.ts`, i18n infrastructure (English-only).
**Addresses:** Framework setup, prerequisite refactor, i18n infrastructure.
**Avoids:** Pitfall 8 (TanStack RC gotchas — validate SSE + server functions before building on them), Pitfall 6 (i18n retrofitting — set up infrastructure now).
**Estimated:** 3-4 days.

### Phase 2: Core IDE Shell (File Tree + Editor + Layout)
**Rationale:** File tree + editor is the core IDE experience — users need to see and edit files before anything else. FEATURES critical path starts here: `TS-8 (Layout) → TS-1 (Editor)`. ARCHITECTURE Phase B depends on Phase A completion.
**Delivers:** Resizable panel layout, file tree with lazy-loading, Monaco editor with multi-tab + save + dirty tracking, FileService backend.
**Addresses:** TS-1 (Monaco), TS-2 (File Tree), TS-8 (Panel Layout).
**Avoids:** Pitfall 1 (Monaco memory leaks — implement disposal from day one), Pitfall 4 (schema paralysis — build components first, extract types after).
**Estimated:** 5-7 days.

### Phase 3: Chat Upgrade + Terminal
**Rationale:** Chat rendering upgrade and terminal are independent of each other and can be parallelized. Chat is the primary AI interaction surface (FEATURES: TS-4 is HIGH complexity). Terminal requires the dedicated WebSocket path validated in Phase 1.
**Delivers:** Production-quality chat with PartView (all SDK Part types), step clustering, xterm.js terminal with PTY bridge, file watcher integration.
**Addresses:** TS-3 (Terminal), TS-4 (Chat Rendering), TS-5 (Step Clustering).
**Avoids:** Pitfall 3 (PTY security — implement cleanup from day one), Pitfall 7 (Vietnamese IME — test Telex input in both editor and terminal).
**Estimated:** 5-7 days.

### Phase 4: Diff + Session Management + Stage 1 Gate
**Rationale:** Diff viewer depends on Monaco (Phase 2) and file change events (Phase 3 watcher). Session management upgrades depend on chat rendering (Phase 3). This phase completes the Stage 1 MVP and enforces the exit criteria check.
**Delivers:** Monaco DiffEditor (inline + side-by-side), file change list from `file.status()`, session create/switch/delete/search, governance hook interfaces (no-op for Stage 2).
**Addresses:** TS-6 (Diff Viewer), TS-7 (Session Management).
**Avoids:** Pitfall 9 (2-stage validation trap — complete Stage 1 within timebox, define bridge interfaces for Stage 2).
**Stage 1 exit criteria:** Monaco opens/saves files, file tree navigates project, terminal runs commands, diff shows changes, chat renders all Part types, demo-able in 5 minutes.
**Estimated:** 3-4 days.

### Phase 5: Quick Wins (Post-MVP Differentiators)
**Rationale:** Low-effort, high-impact features that build on completed Stage 1 infrastructure. Minimap is ~100 LOC copied from OpenWork. Session revert is an SDK call with a button. Code quality wires existing scanner to Monaco decorations.
**Delivers:** Conversation minimap, session revert/unrevert UI, code quality inline decorations + status bar grade.
**Addresses:** DF-4 (Code Quality), DF-5 (Session Revert), DF-6 (Minimap).
**Estimated:** 2-3 days.

### Phase 6: i18n Application + Vietnamese Validation
**Rationale:** ARCHITECTURE recommends i18n last to avoid slowing feature development. PITFALLS recommends infrastructure early (done in Phase 1) but string extraction as a dedicated sprint. Vietnamese validation (IME bugs, diacritics, date/number formats) is a cross-cutting concern that must be verified across all features.
**Delivers:** Full English translation files, Vietnamese translation files, language picker in settings, Vietnamese IME workarounds verified.
**Addresses:** i18n requirement, Vietnamese localization.
**Avoids:** Pitfall 6 (i18n retrofit — infrastructure was set up in Phase 1, this phase does string extraction), Pitfall 7 (Vietnamese IME — dedicated testing with Telex input).
**Estimated:** 2-3 days.

### Phase Ordering Rationale

- **Phase 1 before everything:** TanStack Start is the highest-risk decision (RC framework). If it fails, rollback to React Router + Express is cleanest before features are built on top. Server split is a hard prerequisite — 1427 LOC cannot absorb 400+ new LOC.
- **Phase 2 before Phase 3:** File tree + editor is the visual foundation. Terminal and chat enhancement are additive. Users can browse code without a terminal, but a terminal without a file browser feels incomplete.
- **Phase 3 parallel-safe:** Chat rendering and terminal integration are independent — different components, different backend services, different transport protocols. They CAN be parallelized by separate agents/developers.
- **Phase 4 as Stage 1 gate:** Diff + sessions complete the MVP. This phase includes the Stage 1 exit criteria check (3-week timebox, governance hook interfaces exist, demo-able in 5 minutes).
- **Phase 5 before Phase 6:** Quick wins add immediate user value. i18n is infrastructure that doesn't add features.
- **i18n infrastructure in Phase 1, strings in Phase 6:** Resolves the tension between ARCHITECTURE ("i18n last") and PITFALLS ("add infrastructure NOW"). Infrastructure early avoids retrofit cost; string extraction late avoids slowing feature development.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** TanStack Start SPA + server functions integration — RC framework, limited community resources for edge cases. Verify SSE streaming via server routes, verify WebSocket handling is separate. Budget 2-3 days for framework learning.
- **Phase 3 (Terminal):** PTY process management and WebSocket binary frames — security boundaries, zombie process cleanup, `@lydell/node-pty` native binding CI challenges.
- **Phase 3 (Chat):** OpenCode SDK Part types rendering — SDK Part type exhaustiveness needs verification against latest SDK version. OpenWork patterns are SolidJS (need React adaptation).

Phases with standard patterns (skip research-phase):
- **Phase 2 (File Tree + Editor):** Monaco integration and file tree are thoroughly documented in Context7, with code examples from CodeNomad. Established patterns.
- **Phase 4 (Diff + Sessions):** Monaco DiffEditor is a built-in component. Session management is direct SDK calls. Well-documented.
- **Phase 5 (Quick Wins):** All three features have existing code/patterns to copy (OpenWork minimap ~100 LOC, SDK revert API, existing code-quality.ts 719 LOC scanner).

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | Context7 verified for all major libraries, npm stats confirmed, official TanStack Start docs reviewed, 3 reference projects analyzed via Repomix |
| Features | **HIGH** | 3 reference projects (OpenWork, CodeNomad, Portal) fully analyzed via Repomix, OpenCode SDK API mapped via Context7 + official docs, clear table stakes vs differentiators |
| Architecture | **HIGH** | Established web IDE patterns (VS Code, Theia, code-server), existing codebase analyzed, Context7 docs for all integration libraries, TanStack Start update consistent |
| Pitfalls | **HIGH/MEDIUM** | Monaco issues confirmed via GitHub (#4659, #4805), scope creep evidenced by project history, TanStack Start assessment is MEDIUM (RC, evolving rapidly) |

**Overall confidence:** HIGH

### Gaps to Address

- **TanStack Start SSE behavior:** Server routes must support streaming Response for OpenCode SDK event relay. Documented but not battle-tested in SPA mode. **Validate in Phase 1 before building features.**
- **TanStack Start + WebSocket:** Server routes don't support WebSocket protocol upgrade. Terminal needs standalone WebSocket handler or Nitro's `crossws`. **Architecture decision needed in Phase 1.**
- **Monaco web workers in TanStack Start/Vite:** `vite-plugin-monaco-editor-esm` compatibility with TanStack Start's Vite plugin needs verification. **Test in Phase 2.**
- **OpenCode SDK Part type exhaustiveness:** The SDK's Part types were mapped from Context7 + OpenWork, but the SDK is pre-1.0. New Part types may appear. **Build extensible PartView renderer with fallback for unknown types.**
- **Drizzle ORM migration path:** Existing `persistence.ts` (1082 LOC) uses custom JSON + SQLite adapter. Migration to Drizzle ORM needs a gradual approach. **Not a Stage 1 concern — defer to post-Stage 1.**
- **node-pty native binding on CI:** node-pty requires node-gyp/build tools. `@lydell/node-pty` (prebuilt binaries, 1.5M weekly downloads) mitigates but needs CI verification. **Test in Phase 3.**
- **Schema budget enforcement:** Max 50 LOC new schema per feature is a PITFALLS recommendation. Needs to be codified as a PR review rule, not just a guideline. **Establish in Phase 1 planning.**

## Sources

### Primary (HIGH confidence)
- Context7 `/suren-atoyan/monaco-react` — Editor/DiffEditor setup, multi-model, Vite config
- Context7 `/xtermjs/xterm.js` — AttachAddon, FitAddon, WebSocket integration
- Context7 `/i18next/react-i18next` — useTranslation, namespaces, TypeScript type safety
- Context7 `/websites/tanstack_start_framework_react` — Server functions, SPA mode, server routes
- Context7 `/sst/opencode-sdk-js` — Full SDK API: session, chat, file, find, events
- Context7 `/anomalyco/opencode` — Event types, session management, Part types
- Context7 `/vercel/ai` — Capability comparison (confirmed redundancy with OpenCode SDK)
- Context7 `/payloadcms/payload` — Assessed and rejected (Next.js coupled)
- Repomix: OpenWork (`different-ai/openwork`) — PartView, MessageList, minimap, session patterns
- Repomix: CodeNomad (`NeuralNomadsAI/CodeNomad`) — Monaco, xterm.js, file tree, chat rendering
- Repomix: Portal (`hosenur/portal`) — OpenCode SDK integration, session management

### Secondary (MEDIUM confidence)
- TanStack Start v1 RC blog (Sep 23, 2025): tanstack.com/blog/announcing-tanstack-start-v1
- TanStack Start SPA mode docs: tanstack.com/start/latest/docs/framework/react/guide/spa-mode
- ByteIota (Feb 2, 2026): TanStack Start migration analysis — 30-35% smaller client bundles
- Builder.io (Jan 20, 2026): React + AI Stack for 2026 — recommends TanStack ecosystem
- InfoQ (Nov 7, 2025): TanStack Start as new React meta-framework
- Liveblocks (Feb 2025): Rich text editor comparison (Tiptap > BlockNote > Lexical for Stage 2)
- EclipseSource (Feb 2025): Web IDE architecture patterns — client-server separation
- GitHub microsoft/monaco-editor#4659 — DiffEditor memory leak (confirmed open, Aug 2024)
- GitHub microsoft/monaco-editor#4805 — IME decoration bug (confirmed open, Jan 2025)
- GitHub anthropics/claude-code#10429 — Vietnamese IME CLI bug (confirmed, Oct 2025)

### Tertiary (LOW confidence — needs validation)
- TanStack Start community reports on server route edge cases (LogRocket: "vague and directionless" errors)
- Multi-agent UX patterns (Exa search, Nov 2025) — "single thread with attribution" preference
- vite-plugin-monaco-editor-esm compatibility with TanStack Start Vite plugin

---
*Research completed: 2026-02-10*
*Ready for roadmap: yes*
