# Feature Landscape

**Domain:** AI Code IDE + Workspace Foundation (Stage 1 MVP + Stage 2 Preview)
**Researched:** 2026-02-10
**Mode:** Ecosystem
**Supersedes:** Previous FEATURES.md (2026-02-09, Coherent Knowledge Graph Prototype scope)

---

## Reference Projects Analyzed

| Project | Tech Stack | Key Patterns Extracted | Confidence |
|---------|-----------|----------------------|------------|
| **[OpenWork](https://github.com/different-ai/openwork)** (SolidJS) | SolidJS, OpenCode SDK v2, marked, custom renderer | `PartView` component (text/tool/diff/image rendering), `MessageList` with step clustering, tool categorization (read/write/search/terminal), minimap, session share/revert, developer mode toggle | HIGH — full codebase analyzed via Repomix |
| **[CodeNomad](https://github.com/NeuralNomadsAI/CodeNomad)** (React) | React, Monaco, xterm.js, marked, Shiki, Tailwind | Monaco editor integration, file tree, terminal emulator, code diff viewer, ANSI rendering, tool call display, chat streaming | HIGH — full codebase analyzed via Repomix |
| **[Portal](https://github.com/hosenur/portal)** (React) | React, OpenCode SDK, Monaco, file operations | Lighter implementation, session management, file read/status integration, diff display | HIGH — full codebase analyzed via Repomix |

---

## OpenCode SDK Capability Map

**Source:** Context7 (`/sst/opencode-sdk-js`, `/anomalyco/opencode`), official docs (opencode.ai/docs/sdk/)
**Confidence:** HIGH — verified via two Context7 library sources + official docs extraction

### What the SDK Provides (App Does NOT Need to Build)

| Capability | SDK Method | What It Does |
|-----------|-----------|-------------|
| **Session CRUD** | `session.create()`, `.list()`, `.delete()` | Full session lifecycle management |
| **Chat messaging** | `session.chat(id, { parts })` | Send text + file parts, get assistant response |
| **Message history** | `session.messages(id)` | Retrieve full conversation with typed Parts |
| **Session control** | `session.abort(id)`, `.revert(id, { messageID })`, `.unrevert(id)` | Abort running, revert to checkpoint, restore |
| **Session sharing** | `session.share(id)`, `.unshare(id)` | Generate/remove share URLs |
| **Session summarize** | `session.summarize(id)` | Get AI summary of conversation |
| **File reading** | `file.read({ path })` | Read file content from project |
| **File status** | `file.status()` | Git-like status: modified/added/deleted + line counts |
| **File search** | `find.file({ query })` | Search files by pattern (glob-like) |
| **Symbol search** | `find.symbol({ query })` | Search code symbols (functions, classes, variables) |
| **Text search** | `find({ query, path })` | Grep-like text search across project |
| **Real-time events** | `event.list()` → async iterator | Stream of: `message.updated`, `file.edited`, `session.updated`, `session.error`, `file.watcher.updated` |
| **App config** | `app.get()`, `.init()`, `.modes()`, `.providers()` | Hostname, CWD, git info, available modes + tools, provider list with model costs |
| **Config read** | `config.get()` | Default model, keybindings, settings |

### What the SDK Does NOT Provide (App MUST Build)

| Capability | Why Not in SDK | App-Layer Responsibility |
|-----------|---------------|------------------------|
| **Terminal/shell execution** | SDK operates via AI agent tools, not direct shell access | xterm.js + Node.js `child_process` / PTY |
| **File tree rendering** | SDK reads files, doesn't provide tree structure | Walk filesystem via Node.js `fs`, render as tree component |
| **Code editor** | SDK is headless API | Monaco Editor integration |
| **Diff rendering** | SDK provides `file.status()` with line counts but no diff content | Monaco diff editor or `diff` library for actual diff computation |
| **File writing** | SDK delegates to AI agent tools (Read/Write/Edit) | Direct fs write for non-AI operations (settings, config) |
| **Multi-agent routing** | SDK has sessions, not agent concepts | Agent selection UI + routing to different session configs |

### SDK Part Types (Critical for Chat Rendering)

From OpenWork's `PartView` component — the SDK returns these Part types in messages:

| Part Type | Content | Rendering Needed |
|----------|---------|-----------------|
| `text` | Markdown text from assistant | Markdown → HTML with syntax highlighting |
| `tool-invocation` | Tool name, input, output, state (pending/result/error) | Collapsible tool call cards with status indicators |
| `file` | File path + content | File preview with syntax highlighting |
| `image` | Base64 data URI or URL | Image rendering with safe URL validation |
| `reasoning` | Thinking/reasoning content | Collapsible "thinking" section |
| `source` | Source attribution | Citation rendering |

---

## Table Stakes

Features users expect in an AI Code IDE. Missing = product feels incomplete compared to Cursor, Windsurf, Zed, or even the OpenWork reference implementation.

### TS-1: Monaco Code Editor

| Attribute | Value |
|---|---|
| **Why Expected** | Every AI code IDE (Cursor, Windsurf, CodeNomad, Portal) uses Monaco or a Monaco-derivative. It is the VS Code editor engine. Users expect syntax highlighting, IntelliSense-like autocomplete, bracket matching, minimap, multi-cursor, and keyboard shortcuts identical to VS Code. |
| **Complexity** | Medium |
| **Dependencies** | None (foundational) |
| **What to Build** | `@monaco-editor/react` wrapper component, theme configuration (dark/light matching app theme), language auto-detection from file extension, tab management for multiple open files, unsaved changes indicator. |
| **SDK Integration** | `file.read({ path })` for file content. File write is app-layer (Node.js `fs`). |
| **Evidence** | CodeNomad uses `@monaco-editor/react` with custom themes. Portal wraps Monaco similarly. OpenWork does NOT have a code editor (it's chat-only). |
| **Confidence** | HIGH — `@monaco-editor/react` verified via Context7, patterns confirmed across 2 reference projects |

### TS-2: File Explorer Tree

| Attribute | Value |
|---|---|
| **Why Expected** | Every IDE has a file tree. Users need to navigate, open files, and understand project structure. Without it, users can't browse code — they can only ask the AI to show files. |
| **Complexity** | Medium |
| **Dependencies** | TS-1 (editor to open files into) |
| **What to Build** | Recursive directory tree component with expand/collapse, file icons by type/extension, open-file highlighting, right-click context menu (rename, delete, new file/folder), search/filter within tree. |
| **SDK Integration** | SDK has `find.file()` for search but no directory listing API. Must use Node.js `fs.readdir` (recursive) from backend, or the `file.watcher.updated` event stream for live updates when AI creates/modifies files. |
| **Evidence** | CodeNomad implements full file tree with icon mapping. Portal has simpler file browser. OpenWork has no file tree. |
| **Confidence** | HIGH |

### TS-3: Integrated Terminal

| Attribute | Value |
|---|---|
| **Why Expected** | Developers need a terminal for build commands, git operations, test runs, and debugging. Every code IDE includes one. Without it, users must switch to a separate terminal app. |
| **Complexity** | Medium-High |
| **Dependencies** | None (independent of editor) |
| **What to Build** | xterm.js terminal emulator in browser, connected to server-side PTY (pseudo-terminal) via WebSocket. Support multiple terminal tabs, ANSI color rendering, scrollback buffer, copy/paste, and resize. |
| **SDK Integration** | None — terminal is fully app-layer. The SDK's AI agents use their own shell tool internally; the user terminal is separate. |
| **Implementation** | `xterm.js` + `@xterm/addon-fit` + `@xterm/addon-web-links`. Backend: `node-pty` for PTY management, WebSocket bridge. CodeNomad uses exactly this pattern. |
| **Evidence** | CodeNomad: xterm.js with PTY bridge. Wasmer docs (2026-01) confirm xterm.js 5.x is current. |
| **Confidence** | HIGH — xterm.js is the universal standard for web terminals |

### TS-4: Chat Message Rendering (Markdown + Code + Tools)

| Attribute | Value |
|---|---|
| **Why Expected** | The chat panel is the primary AI interaction surface. Users expect rich markdown rendering, syntax-highlighted code blocks, collapsible tool call displays, image rendering, and smooth streaming. The current iDumb dashboard has basic chat — this must be production-quality. |
| **Complexity** | High |
| **Dependencies** | None (foundational for chat panel) |
| **What to Build** | Five sub-components based on SDK Part types: |
| | **(a) Markdown renderer** — `marked` library for MD→HTML, with custom renderer for links (safe URL validation), tables, blockquotes. `shiki` for code block syntax highlighting (100+ languages). XSS sanitization via `DOMPurify` or HTML entity escaping. |
| | **(b) Tool call cards** — Collapsible cards showing tool name, input summary, output/error, and status (pending spinner → success checkmark → error X). Tool categorization with icons: 📖 read, ✏️ write, 🔍 search, 💻 terminal, 👁️ view, 📁 file. |
| | **(c) Diff rendering in tool results** — When a tool result contains a diff (detected by `+`/`-` line prefixes or `@@` markers), render with green/red line coloring. OpenWork extracts diffs from tool output with regex pattern matching. |
| | **(d) Image rendering** — Support `data:image/*` base64 URIs (from AI screenshots/diagrams) and external URLs (with safety validation). |
| | **(e) Thinking/reasoning sections** — Collapsible "thinking" blocks for models that expose reasoning (Claude, DeepSeek). |
| **Evidence** | OpenWork's `PartView` implements ALL of these patterns in ~400 LOC. CodeNomad uses marked+Shiki. Both categorize tools by type and render diffs inline. |
| **Confidence** | HIGH — patterns verified across all 3 reference projects |

### TS-5: Step Clustering & Progress Indicators

| Attribute | Value |
|---|---|
| **Why Expected** | AI agents perform multi-step operations (read file → analyze → edit → verify). Users expect to see these grouped as a logical "step" rather than as individual raw tool calls. Cursor and Claude Code both cluster steps. |
| **Complexity** | Medium |
| **Dependencies** | TS-4 (rendering infrastructure) |
| **What to Build** | Group consecutive tool-call parts into collapsible "step clusters." Show: step count badge, overall status (running/complete/failed), expand to see individual tool calls. Default: expanded for the current (running) step, collapsed for completed steps. |
| **SDK Integration** | Use `message.updated` events to track step progress in real-time. Parts arrive sequentially — cluster by message boundaries and tool-invocation sequences. |
| **Evidence** | OpenWork's `MessageList` implements `StepClusterBlock` with exactly this pattern: `stepIds`, `partsGroups`, inverted expand logic (collapsed by default, expanded = not in set). `summarizeStep()` and `classifyTool()` utility functions. |
| **Confidence** | HIGH — directly observed in OpenWork source |

### TS-6: Code Diff Viewer

| Attribute | Value |
|---|---|
| **Why Expected** | When the AI modifies files, users MUST see what changed before accepting. This is the safety mechanism. Every AI code IDE shows diffs. Without diffs, users are blindly accepting AI edits. |
| **Complexity** | Medium-High |
| **Dependencies** | TS-1 (Monaco provides diff editor component) |
| **What to Build** | Two diff modes: |
| | **(a) Inline diff** — Monaco's built-in `DiffEditor` component in inline mode. Green highlights for additions, red for deletions. Used in the chat panel for quick review. |
| | **(b) Side-by-side diff** — Monaco `DiffEditor` in side-by-side mode. Full-page view for detailed comparison. Used when clicking a file change notification. |
| | **(c) File change list** — List of all files changed by the AI (from `file.status()`), with icons for modified/added/deleted, line change counts (+N/-M). Click to open diff. |
| **SDK Integration** | `file.status()` returns file paths with status + line counts. `file.read({ path })` gets current content. Original content from git or message history for diff baseline. |
| **Evidence** | CodeNomad has dedicated diff viewer. Monaco's `DiffEditor` is purpose-built for this. OpenWork extracts diffs from tool output but doesn't use Monaco diff. |
| **Confidence** | HIGH — Monaco DiffEditor verified via Context7 |

### TS-7: Session Management

| Attribute | Value |
|---|---|
| **Why Expected** | Users need to create, switch between, and delete AI sessions. This is basic conversation management. Without it, users can only use one conversation. |
| **Complexity** | Low-Medium |
| **Dependencies** | None (foundational) |
| **What to Build** | Session list sidebar with: create new, rename, delete, search. Session title (auto-generated from first message or via `session.summarize()`). Timestamp display. Active session indicator. |
| **SDK Integration** | `session.create()`, `.list()`, `.delete()`, `.summarize()`. The SDK handles all persistence — the app just calls these methods. |
| **Evidence** | Both OpenWork and Portal implement full session management against the SDK. OpenWork adds share/unshare. |
| **Confidence** | HIGH |

### TS-8: Responsive Panel Layout

| Attribute | Value |
|---|---|
| **Why Expected** | Users expect resizable panels (file tree, editor, chat, terminal) arranged in a configurable layout. VS Code established this pattern. Without it, the IDE feels rigid and unusable at different screen sizes. |
| **Complexity** | Medium |
| **Dependencies** | All panel components (TS-1 through TS-7) |
| **What to Build** | Split-pane layout with draggable dividers. Minimum 3-panel layout: sidebar (file tree + sessions), main (editor + terminal), right (chat). Panels should be collapsible, resizable, and their state persisted to localStorage. |
| **Implementation** | `react-resizable-panels` (lightweight, React-specific) or `allotment` (VS Code-style splits). Avoid heavy layout frameworks. |
| **Evidence** | CodeNomad uses resizable panel layout. Standard in all IDE-like applications. |
| **Confidence** | HIGH |

---

## Differentiators

Features that set iDumb apart from generic AI code IDEs. Not expected, but valued by target users (Vietnamese developers, knowledge workers).

### DF-1: Multi-Agent Visibility

| Attribute | Value |
|---|---|
| **Value Proposition** | iDumb has 3 agents (coordinator, investigator, executor) with distinct roles. Showing which agent is active, what it's doing, and its delegation chain is unique — no other AI IDE exposes multi-agent internals to the user. |
| **Complexity** | Medium-High |
| **Dependencies** | TS-4 (chat rendering), TS-5 (step clustering) |
| **What to Build** | Agent indicators on messages (avatar/badge showing which agent responded), delegation flow visualization (coordinator → investigator → executor), agent status indicators (idle/working/waiting). NOT separate chat tabs per agent (anti-pattern — see AF-3). |
| **UX Pattern** | Single conversation thread with agent annotations. Like Slack where different team members respond in the same channel, not separate DMs. The coordinator's delegation decisions appear as "routing" messages. Investigated agents' research appears as grouped steps attributed to that agent. |
| **Evidence** | No reference project implements this (OpenWork/CodeNomad/Portal are single-agent). This is a novel differentiator enabled by iDumb's 3-agent schema. Multi-agent UX research (Exa, 2025-11) confirms "single-thread with attribution" outperforms "separate-tab per agent" for developer workflows. |
| **Confidence** | MEDIUM — UX pattern is novel, needs user validation |

### DF-2: Governance-Aware Task Sidebar

| Attribute | Value |
|---|---|
| **Value Proposition** | The existing task sidebar shows task hierarchy (Epic→Task→Subtask). Enhancing it with governance state (blocked/needs-review/stale), chain integrity badges, and delegation routing makes it a governance control panel, not just a task list. |
| **Complexity** | Medium |
| **Dependencies** | Existing task sidebar (already built), delegation schema, planning registry |
| **What to Build** | Status badges (governance mode indicators), chain health indicators (from `detectGraphBreaks()`), delegation routing display (which agent is assigned), stale task warnings. |
| **Evidence** | iDumb already has task schemas + delegation schemas + planning registry. This is wiring existing schemas to UI. |
| **Confidence** | HIGH — builds on existing, verified schemas |

### DF-3: AI-Aware File Change Tracking

| Attribute | Value |
|---|---|
| **Value Proposition** | Track which files the AI modified, when, as part of which task, and with what reasoning. Goes beyond git diff — it's a provenance trail. "This function was changed by the executor agent during task 'add-auth', and here's the conversation context." |
| **Complexity** | High |
| **Dependencies** | TS-6 (diff viewer), session management, task graph |
| **What to Build** | File change timeline per session, linked to task context. Click a change → see the conversation where the AI decided to make it. Uses `file.edited` events correlated with `message.updated` events. |
| **Evidence** | No reference project does this. OpenCode SDK provides `file.edited` and `file.watcher.updated` events that enable this correlation. |
| **Confidence** | MEDIUM — feasibility confirmed via SDK events, UX is novel |

### DF-4: Code Quality Integration

| Attribute | Value |
|---|---|
| **Value Proposition** | iDumb already has a code quality scanner (A-F grading, smell detection, roast commentary). Surfacing this in the IDE — showing smells inline in the editor, grade in the status bar, roasts in the chat — makes it a unique feature no other AI IDE has. |
| **Complexity** | Medium |
| **Dependencies** | TS-1 (editor for inline decorations), existing `code-quality.ts` |
| **What to Build** | Monaco editor decorations for detected smells (wavy underlines), status bar grade display, "scan current file" command, roast commentary in chat panel. |
| **Evidence** | `code-quality.ts` (719 LOC) already implements 9 smell types + grading + 42 roasts. This is wiring existing logic to UI. |
| **Confidence** | HIGH |

### DF-5: Session Revert/Unrevert (Time Travel)

| Attribute | Value |
|---|---|
| **Value Proposition** | The OpenCode SDK supports `session.revert(id, { messageID })` and `session.unrevert(id)`. This means users can "undo" AI actions back to a specific message, then optionally restore. This is time travel for AI conversations. |
| **Complexity** | Low-Medium |
| **Dependencies** | TS-7 (session management) |
| **What to Build** | "Revert to here" button on each message. Confirmation dialog showing what will be undone. "Restore" button after revert. Visual indicator of the revert point in the conversation. |
| **SDK Integration** | Direct SDK calls. The SDK handles file state restoration. |
| **Evidence** | OpenWork implements share but NOT revert UI (the SDK method exists but UI is missing). This is an easy win. |
| **Confidence** | HIGH — SDK API verified, implementation is straightforward |

### DF-6: Conversation Minimap

| Attribute | Value |
|---|---|
| **Value Proposition** | Long AI conversations become hard to navigate. A minimap (like VS Code's code minimap but for conversation) shows message positions, scroll location, and allows quick navigation. |
| **Complexity** | Low-Medium |
| **Dependencies** | TS-4 (chat rendering) |
| **What to Build** | Narrow vertical strip showing message blocks (colored by role: user blue, assistant gray, tool green). Current viewport indicator. Click to scroll. |
| **Evidence** | OpenWork implements exactly this in `minimap.tsx` — measures DOM elements with `data-message-id` attributes and maps to viewport positions. ~100 LOC. |
| **Confidence** | HIGH — directly copied from OpenWork pattern |

---

## Anti-Features

Features to explicitly NOT build. Including these would increase complexity without proportional value.

### AF-1: Built-in AI Model (Vercel AI SDK Direct)

| Attribute | Value |
|---|---|
| **Why Avoid** | The OpenCode SDK already handles all AI model communication (provider selection, tool execution, streaming, multi-step reasoning). Adding Vercel AI SDK's `streamText`/`streamObject` would create a PARALLEL AI pipeline competing with OpenCode's. The Vercel AI SDK is designed for apps that need to build their own AI pipeline from scratch — iDumb already has one via OpenCode. |
| **What to Do Instead** | Use OpenCode SDK exclusively for AI features. Vercel AI SDK's value (streaming, tool use, multi-modal) is already provided by OpenCode SDK's session.chat() + event streaming. If custom AI features are needed later (e.g., local summarization), evaluate Vercel AI SDK at that point as a SUPPLEMENTARY tool, not a replacement. |
| **Confidence** | HIGH — verified both SDKs' capabilities; OpenCode SDK covers all needed AI capabilities |

### AF-2: Full LSP Integration (IntelliSense, Go-to-Definition)

| Attribute | Value |
|---|---|
| **Why Avoid** | Language Server Protocol integration requires spawning language servers per language, managing their lifecycle, wiring Monaco's language features API, and handling workspace events. This is VS Code's core complexity and would take weeks to implement properly. Users who need full LSP have VS Code already. |
| **What to Do Instead** | Use Monaco's built-in syntax highlighting and basic autocomplete (keyword-based). The AI agent IS the IntelliSense — users ask questions instead of hovering. Consider LSP for Stage 3+ if user demand warrants it. |

### AF-3: Separate Chat Tabs Per Agent

| Attribute | Value |
|---|---|
| **Why Avoid** | Splitting the coordinator, investigator, and executor into separate chat tabs forces users to context-switch between tabs and mentally reconstruct the delegation flow. Multi-agent UX research shows "single thread with attribution" is superior for developer workflows. |
| **What to Do Instead** | Single conversation thread with agent badges/avatars on each message. The coordinator's delegation appears as a routing annotation. See DF-1. |

### AF-4: Real-Time Collaboration (Multi-User)

| Attribute | Value |
|---|---|
| **Why Avoid** | iDumb is a single-developer tool operating on local files. Adding CRDT-based collaboration (Yjs/Automerge), presence indicators, cursor sharing, and conflict resolution is massive scope for zero value in the current use case. |
| **What to Do Instead** | Single-user, single-instance. If the user opens two tabs, they operate independently. |

### AF-5: Notion-Like Block Editor (Stage 1)

| Attribute | Value |
|---|---|
| **Why Avoid for Stage 1** | Block editors (Tiptap, BlockNote, ProseMirror) are complex — even BlockNote (the simplest) requires 200+ LOC for basic setup, custom block types, and serialization. This is a Stage 2 feature for knowledge documents, not a Stage 1 IDE requirement. |
| **What to Do Instead** | For Stage 1: render markdown content with `marked` + syntax highlighting. For Stage 2: use **Tiptap** (ProseMirror-based, most popular React block editor in 2025-2026, extensive extension ecosystem, better customization than BlockNote). |
| **Stage 2 Complexity Assessment** | Medium-High. Tiptap core setup: 1-2 days. Custom block types (code block with Shiki, task list, callout): 2-3 days. Serialization to/from markdown: 1-2 days. Total: ~5-8 days for MVP block editor. |
| **Evidence** | Liveblocks 2025 comparison: Tiptap > BlockNote > Lexical > ProseMirror for React apps needing Notion-like editing with custom blocks. BlockNote is simpler but less extensible. ProseMirror is too low-level. |
| **Confidence** | HIGH — Tiptap recommendation verified via Exa search (Liveblocks blog, Feb 2025) |

### AF-6: Plugin/Extension System

| Attribute | Value |
|---|---|
| **Why Avoid** | An extension API adds massive surface area (API design, sandboxing, distribution, versioning). iDumb already had a plugin that was ARCHIVED because the architecture was wrong. Don't repeat the mistake. |
| **What to Do Instead** | Build features directly into the app. If extensibility is needed, add it as a structured configuration (modes, tool sets) via the existing OpenCode SDK modes system. |

---

## Feature Dependencies

```
FOUNDATION (parallel, no dependencies):
  TS-1 (Monaco Editor)
  TS-3 (Terminal)
  TS-4 (Chat Rendering)
  TS-7 (Session Management)
  TS-8 (Panel Layout)

LAYER 1 (depends on foundation):
  TS-2 (File Tree) ──→ TS-1 (opens files into editor)
  TS-5 (Step Clustering) ──→ TS-4 (rendering infrastructure)
  TS-6 (Diff Viewer) ──→ TS-1 (Monaco DiffEditor component)

LAYER 2 (depends on Layer 1):
  DF-1 (Multi-Agent Visibility) ──→ TS-4 + TS-5
  DF-2 (Governance Task Sidebar) ──→ existing task sidebar
  DF-3 (AI File Change Tracking) ──→ TS-6 + TS-7
  DF-4 (Code Quality Integration) ──→ TS-1
  DF-5 (Session Revert) ──→ TS-7
  DF-6 (Conversation Minimap) ──→ TS-4

STAGE 2 (future):
  Block Editor (Tiptap) ──→ independent of Stage 1
```

### Critical Path

```
TS-8 (Layout) → TS-1 (Editor) + TS-4 (Chat) → TS-6 (Diffs) + TS-5 (Steps) → DF-1 (Agents)
```

The layout shell must exist first, then editor and chat panels fill it, then diffs and step clustering layer on top.

---

## MVP Recommendation

### Stage 1 MVP: Code IDE Core

Prioritize in this order:

1. **TS-8 (Panel Layout)** — The shell. Without panels, nothing has a place to render. Use `react-resizable-panels` for VS Code-style splits. **Est: 1-2 days.**

2. **TS-4 (Chat Rendering)** — Upgrade existing chat from basic to production-quality. Implement `PartView`-equivalent component handling all SDK Part types. Use `marked` + `shiki` for markdown/code. **Est: 3-4 days.**

3. **TS-1 (Monaco Editor)** — `@monaco-editor/react` with tab management, theme matching, language detection. **Est: 2-3 days.**

4. **TS-2 (File Tree)** — Recursive directory tree with file icons, open-in-editor behavior. **Est: 2-3 days.**

5. **TS-7 (Session Management)** — Upgrade existing session handling with create/switch/delete/search. **Est: 1-2 days.**

6. **TS-6 (Diff Viewer)** — Monaco `DiffEditor` for file changes + file change list from `file.status()`. **Est: 2-3 days.**

7. **TS-5 (Step Clustering)** — Group tool calls into collapsible steps. **Est: 1-2 days.**

8. **TS-3 (Terminal)** — xterm.js + PTY bridge. Can be deferred if time is tight (users have external terminals). **Est: 2-3 days.**

**Total Stage 1 estimate:** 14-22 days for full IDE core.

### Quick Wins After MVP

- **DF-6 (Minimap)** — ~100 LOC, high visual impact. **Est: 0.5 days.**
- **DF-5 (Session Revert)** — SDK does the work, just needs UI buttons. **Est: 1 day.**
- **DF-4 (Code Quality)** — Wiring existing scanner to Monaco decorations. **Est: 1-2 days.**

### Defer to Stage 2

- DF-1 (Multi-Agent Visibility) — Needs agent routing infrastructure first
- DF-2 (Governance Task Sidebar) — Needs schemas wired to runtime
- DF-3 (AI File Change Tracking) — Needs event correlation infrastructure
- Block Editor (Tiptap) — Independent feature set

---

## Vercel AI SDK Assessment

**Verdict: NOT needed for Stage 1. Potentially useful for Stage 2+ supplementary features.**

**Confidence:** HIGH — verified via Context7 `/vercel/ai`

### What Vercel AI SDK Offers

| Capability | Vercel AI SDK | OpenCode SDK Equivalent |
|-----------|--------------|----------------------|
| Text streaming | `streamText()` with SSE | `session.chat()` + `event.list()` async iterator |
| Tool calling | `tool()` with Zod schemas, `stepCountIs()` for multi-step | Built-in — OpenCode agents have tools natively |
| Multi-modal input | Text + file parts | `session.chat({ parts: [{ type: 'text' }, { type: 'file' }] })` |
| Custom providers | `createCustomProvider()` | `app.providers()` — OpenCode manages providers |
| UI message streaming | `useChat()`, `toUIMessageStreamResponse()` | Must build custom — but OpenWork already solved this |
| Multi-step orchestration | `createUIMessageStream` + `writer.merge()` | OpenCode agents handle multi-step internally |
| Self-hosted | ✅ Fully works without Vercel cloud | ✅ Fully self-hosted |

### Why NOT to Use It

1. **Redundant AI pipeline** — OpenCode SDK already handles streaming, tools, and multi-modal. Adding Vercel AI SDK creates two competing pipelines.
2. **Different Part types** — Vercel AI SDK has its own message format (`UIMessage`, `CoreMessage`). OpenCode SDK has its own Part types. Bridging them adds complexity.
3. **Governance bypass** — Vercel AI SDK's `streamText()` calls models directly. OpenCode SDK routes through governed agents with permissions, tool restrictions, and mode enforcement. Using Vercel AI SDK bypasses all governance.

### When to Reconsider

- If a feature needs LOCAL AI inference (summarization, embeddings) without going through OpenCode
- If OpenCode SDK's event streaming proves insufficient for real-time UI updates
- For Stage 2 knowledge features (AI-assisted writing in block editor) where OpenCode agent tools are overkill

---

## Chat Rendering Implementation Guide

Based on OpenWork's `PartView` and CodeNomad's message rendering, here's the recommended implementation pattern:

### Library Stack

| Library | Purpose | Version (2026) |
|---------|---------|----------------|
| `marked` | Markdown → HTML parsing | 15.x |
| `shiki` | Code syntax highlighting (100+ languages) | 3.x |
| `DOMPurify` | XSS sanitization of rendered HTML | 3.x |
| `lucide-react` | Icons for tool categories | Latest |

### Part Rendering Matrix

| Part Type | Renderer | Key Behavior |
|----------|----------|-------------|
| `text` | marked → shiki (for code blocks) → DOMPurify | Stream-friendly (append delta to existing content) |
| `tool-invocation` (pending) | Spinner + tool name + input summary | Auto-expand, show progress |
| `tool-invocation` (result) | Collapsible card + formatted output | Auto-collapse after completion |
| `tool-invocation` (error) | Red card + error message | Always expanded |
| `file` | Syntax-highlighted code preview | File name header + language badge |
| `image` | `<img>` with safe URL validation | Support data:image/* and https:// |
| `reasoning` | Collapsible "Thinking..." section | Italic styling, muted color |

### Tool Category Icons (from OpenWork)

| Category | Tools | Icon |
|----------|-------|------|
| `read` | file_read, glob, grep | 👁️ Eye |
| `write` | file_write, file_edit | ✏️ Pencil / FileEdit |
| `search` | find_file, find_symbol, find_text | 🔍 Search |
| `terminal` | bash, shell | 💻 Terminal |
| `navigate` | folder_search | 📁 FolderSearch |
| `ai` | skill, agent | ✨ Sparkles |

---

## Block Editor Assessment (Stage 2)

### Comparison Matrix

| Criterion | Tiptap | BlockNote | ProseMirror | Lexical |
|-----------|--------|-----------|-------------|---------|
| React support | ✅ First-class | ✅ Built for React | ⚠️ Requires wrapper | ✅ First-class |
| Notion-like blocks | ✅ Via extensions | ✅ Out-of-box | ❌ Manual build | ⚠️ Partial |
| Customization | ✅ Extensive extension API | ⚠️ Limited, opinionated | ✅ Total control | ✅ Good |
| Learning curve | Medium | Low | Very High | Medium |
| Community size | Large (10k+ GitHub stars) | Medium (5k+) | Large (established) | Large (Meta) |
| Markdown import/export | ✅ Via extensions | ✅ Built-in | ❌ Manual | ⚠️ Partial |
| Code block support | ✅ With Shiki integration | ✅ Basic | ❌ Manual | ⚠️ Basic |
| Collaborative editing | ✅ Via Yjs extension | ✅ Via Yjs | ✅ Via Yjs | ⚠️ Limited |

**Recommendation: Tiptap** because it offers the best balance of Notion-like block editing out-of-box AND deep customization for iDumb-specific blocks (governance annotations, task links, code quality callouts). BlockNote is simpler but would limit us when adding custom governance blocks.

**Confidence:** HIGH — verified via Liveblocks blog (Feb 2025) + Exa search results

---

## Sources

### Primary (HIGH confidence)
- OpenCode SDK JS: Context7 `/sst/opencode-sdk-js` — full API reference with code examples
- OpenCode core: Context7 `/anomalyco/opencode` — event types, session management
- OpenWork source: Repomix analysis of `github.com/different-ai/openwork` — PartView, MessageList, minimap, session management patterns
- CodeNomad source: Repomix analysis of `github.com/NeuralNomadsAI/CodeNomad` — Monaco, xterm.js, file tree, chat rendering
- Portal source: Repomix analysis of `github.com/hosenur/portal` — OpenCode SDK integration patterns
- Vercel AI SDK: Context7 `/vercel/ai` — streamText, tool, UIMessage, createUIMessageStream
- Monaco Editor: Context7 `/anthropics/monaco-editor` — React integration, DiffEditor

### Secondary (MEDIUM confidence)
- Liveblocks blog: "Which rich text editor framework should you choose in 2025?" (Feb 2025) — Tiptap vs BlockNote vs ProseMirror comparison
- xterm.js: Wasmer docs (Jan 2026) — confirms xterm.js 5.x current patterns
- OpenCode official docs: opencode.ai/docs/sdk/ — SDK overview, event documentation

### Tertiary (LOW confidence — supplementary only)
- Multi-agent UX patterns: Exa search results (Nov 2025) — agent pattern articles
- AI chat rendering patterns: Exa search results (2025) — ChatVista, general patterns
- Code diff patterns: Exa search results (Dec 2024-2025) — React diff viewer approaches
