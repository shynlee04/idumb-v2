# Architecture Patterns — Code IDE + Workspace Integration

**Domain:** AI-Governed Code IDE — Monaco editor, file tree, terminal, diff viewer
**Researched:** 2026-02-10
**Confidence:** HIGH (Context7, official docs, existing codebase analysis)
**Updated:** 2026-02-10 — TanStack Start decision (see STACK.md)

> **FRAMEWORK UPDATE:** This document was written assuming Express REST API. The decision is now TanStack Start in SPA mode. The impact: Express REST routes → TanStack Start server functions (`createServerFn()`). Express SSE → Server routes with streaming Response. All service layer patterns (FileService, PTYManager, stores, data flows) remain identical. WebSocket for terminal PTY remains standalone. References to "Express routes" should be read as "server functions" for implementation.

Research based on: existing iDumb v2 dashboard architecture (Express + React + Vite + OpenCode SDK), Context7 docs for Monaco React, xterm.js, node-pty, chokidar, react-i18next, and web IDE architecture patterns from EclipseSource/Theia.

---

## Recommended Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Browser (React + Vite SPA)                          │
│                                                                             │
│  ┌──────────────┐  ┌──────────────────────┐  ┌──────────────────────────┐  │
│  │  File Tree    │  │  Monaco Editor Tabs   │  │  Terminal Panel          │  │
│  │  (virtualized │  │  (@monaco-editor/     │  │  (xterm.js +            │  │
│  │   tree view,  │  │   react — multi-tab,  │  │   @xterm/addon-fit +    │  │
│  │   context     │  │   diff editor,        │  │   @xterm/addon-attach)  │  │
│  │   menus)      │  │   language services)  │  │                         │  │
│  └──────┬────────┘  └──────────┬───────────┘  └────────────┬────────────┘  │
│         │                      │                            │               │
│  ───────┴──────────────────────┴────────────────────────────┴───────────── │
│                        Zustand Store Layer                                  │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│   │ file-tree     │  │ editor-store  │  │ terminal     │  │ existing     │  │
│   │ store         │  │ (tabs, dirty, │  │ store        │  │ stores       │  │
│   │ (tree nodes,  │  │  cursor pos)  │  │ (sessions,   │  │ (session,    │  │
│   │  expanded,    │  │              │  │  active tab) │  │  tasks, etc) │  │
│   │  selected)    │  │              │  │              │  │              │  │
│   └──────┬────────┘  └──────┬───────┘  └──────┬───────┘  └──────────────┘  │
│          │                  │                  │                             │
│  ────────┴──────────────────┴──────────────────┴───────────────────────── │
│                    Transport Layer (existing + new)                         │
│   ┌───────────────────────┐  ┌─────────────────────┐  ┌─────────────┐     │
│   │ REST API (fetch)       │  │ WebSocket (ws)       │  │ SSE          │     │
│   │ file CRUD, tree scan   │  │ file watch events,   │  │ chat stream  │     │
│   │                        │  │ terminal I/O         │  │ (existing)   │     │
│   └────────────┬───────────┘  └──────────┬──────────┘  └──────┬──────┘     │
└────────────────┼─────────────────────────┼─────────────────────┼───────────┘
                 │                         │                     │
┌────────────────┼─────────────────────────┼─────────────────────┼───────────┐
│                         Express Backend (server.ts → split)                 │
│                                                                             │
│  ┌──────────────────┐  ┌───────────────────┐  ┌────────────────────────┐   │
│  │  File System      │  │  Terminal Manager  │  │  Existing Routes       │   │
│  │  Routes           │  │  (node-pty pool)   │  │  (sessions, tasks,     │   │
│  │  (tree, read,     │  │                    │  │   governance, config,  │   │
│  │   write, search)  │  │  WebSocket /ws/pty │  │   SSE /api/events)     │   │
│  └────────┬──────────┘  └─────────┬──────────┘  └──────────┬────────────┘   │
│           │                       │                        │                │
│  ─────────┴───────────────────────┴────────────────────────┴────────────── │
│                        Service Layer                                        │
│  ┌──────────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │ FileService       │  │ PTYService    │  │ OpenCode     │                  │
│  │ (fs + chokidar)   │  │ (node-pty)    │  │ Engine       │                  │
│  │                    │  │              │  │ (existing)   │                  │
│  └────────┬──────────┘  └──────┬───────┘  └──────┬───────┘                  │
│           │                    │                  │                          │
│  ─────────┴────────────────────┴──────────────────┴──────────────────────── │
│                        File System Boundary                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                 │
           ┌─────────────────────┴─────────────────────┐
           │           Host File System                  │
           │                                             │
           │  Project files  │  .idumb/brain/  │  Shell  │
           └─────────────────────────────────────────────┘
```

### Component Responsibilities (New + Modified)

| Component | Responsibility | Status | Integration Point |
|-----------|----------------|--------|-------------------|
| **FileService** (new) | Read/write/search project files, watch for changes, gitignore-aware tree scanning | New backend service | Wraps Node.js `fs` + chokidar + `ignore` package |
| **File System Routes** (new) | REST API: `/api/files/tree`, `/api/files/read`, `/api/files/write`, `/api/files/search` | New Express routes | Calls FileService, returns typed responses |
| **PTYService** (new) | Manage node-pty processes, resize, cleanup on disconnect | New backend service | Wraps node-pty, manages Map<terminalId, IPty> |
| **Terminal WebSocket** (new) | Bidirectional terminal I/O via WebSocket at `/ws/pty` | New WS endpoint | Separate from existing `/ws` (file watch broadcasts) |
| **File Tree Component** (new) | Virtualized file tree with expand/collapse, context menus, file type icons | New React component | Reads from file-tree Zustand store, calls REST API |
| **Monaco Editor Tabs** (new) | Multi-tab code editor with language detection, save, dirty indicators | New React component | @monaco-editor/react, reads/writes via REST API |
| **Terminal Panel** (new) | Multi-tab terminal emulator with resize support | New React component | xterm.js connected to PTYService via WebSocket |
| **Diff Viewer** (new) | Side-by-side diff display for AI-modified files | New React component | Monaco DiffEditor, fed by change events |
| **file-tree store** (new) | File tree nodes, expanded set, selected path, loading state | New Zustand store | Hydrated from REST API, updated by WebSocket events |
| **editor-store** (new) | Open tabs, active tab, cursor positions, dirty flags | New Zustand store | Client-only, persisted to sessionStorage |
| **terminal-store** (new) | Terminal session metadata, active terminal tab | New Zustand store | Metadata only — actual buffer lives in xterm.js Terminal instance |
| **server.ts** (modified) | Extract existing routes into separate modules, add file/terminal routes | **Refactor required** | Split into routes/*.ts modules |
| **WebSocket server** (modified) | Add message type routing (currently broadcasts everything), add `/ws/pty` path | **Extend** | Existing WSS at `/ws` + new WSS at `/ws/pty` |

---

## Q1: File System Access Pattern

### Recommendation: Express REST API + WebSocket File Watching

**Confidence: HIGH** (this is the universal pattern for local-first web IDEs)

The browser cannot access the host file system directly. Three options exist:

| Option | What It Is | Verdict |
|--------|-----------|---------|
| **Express REST API** | Backend reads/writes files, exposes via HTTP endpoints | ✅ **USE THIS** — natural fit for existing architecture |
| **WebContainer** | Sandboxed filesystem + Node.js in the browser (StackBlitz pattern) | ❌ REJECT — designed for cloud IDEs running user code in isolation. iDumb runs locally against the real filesystem. WebContainer duplicates what the Express backend already does. |
| **OpenCode SDK** | SDK client provides session/chat/config APIs | ❌ NOT AVAILABLE — the SDK (`@opencode-ai/sdk`) exposes `client.session.*`, `client.config.*` but has no file system API. File access is out of scope for the SDK. |

### File API Design

```typescript
// New routes to add to Express backend

// Tree scanning — returns directory tree
GET /api/files/tree?root=<projectDir>&depth=3
→ FileTreeNode[]

// Read single file
GET /api/files/read?path=<relativePath>
→ { content: string, encoding: string, size: number, mtime: number }

// Write/save file
PUT /api/files/write
→ Body: { path: string, content: string }
→ { success: boolean, mtime: number }

// Search files by content (ripgrep-backed for performance)
GET /api/files/search?query=<regex>&include=<glob>
→ SearchResult[]

// File metadata/stat
GET /api/files/stat?path=<relativePath>
→ { size: number, mtime: number, isDirectory: boolean }
```

### File Watching (Real-Time Updates)

```typescript
// Backend: chokidar watches the project directory
import { watch } from "chokidar"

const watcher = watch(projectDir, {
  ignored: /(^|[\/\\])\../, // dotfiles
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
})

watcher
  .on("add", path => broadcast({ type: "file:add", path: relative(projectDir, path) }))
  .on("change", path => broadcast({ type: "file:change", path: relative(projectDir, path) }))
  .on("unlink", path => broadcast({ type: "file:unlink", path: relative(projectDir, path) }))
  .on("addDir", path => broadcast({ type: "dir:add", path: relative(projectDir, path) }))
  .on("unlinkDir", path => broadcast({ type: "dir:unlink", path: relative(projectDir, path) }))
```

The existing WebSocket broadcast function at `/ws` already supports typed messages — extend it with `file:*` event types. Frontend file-tree store subscribes and updates tree nodes incrementally.

### Security Considerations

- **Path traversal**: All file paths must be resolved relative to `projectDir` and validated to stay within the project boundary. Use `path.resolve()` + `startsWith()` check.
- **File size limits**: Reject reads above 10MB. Binary file detection (check first 8KB for null bytes).
- **gitignore respect**: Use the `ignore` npm package to parse `.gitignore` and filter tree results.

---

## Q2: Terminal Integration

### Recommendation: xterm.js + node-pty + Dedicated WebSocket

**Confidence: HIGH** (Context7 verified for xterm.js, node-pty, and the attach addon)

### Architecture

```
┌─────────────────┐        WebSocket         ┌─────────────────┐
│  Browser         │      /ws/pty/:id         │  Express Backend │
│                  │◄─────────────────────────►│                  │
│  xterm.js        │   Binary frames           │  node-pty        │
│  Terminal inst.  │   (stdin/stdout)           │  IPty process    │
│  + FitAddon      │                            │  (per session)   │
│  + AttachAddon   │   JSON control messages    │                  │
│                  │   (resize, signal)         │  PTYManager      │
└─────────────────┘                            └─────────────────┘
```

### Backend: PTYManager Service

```typescript
// src/dashboard/backend/services/pty-manager.ts
import { spawn, type IPty } from "node-pty"

interface PTYSession {
  id: string
  pty: IPty
  ws: WebSocket | null  // attached client
  cwd: string
  createdAt: number
}

class PTYManager {
  private sessions = new Map<string, PTYSession>()

  create(id: string, cwd: string, shell?: string): PTYSession {
    const pty = spawn(shell ?? process.env.SHELL ?? "/bin/zsh", [], {
      name: "xterm-256color",
      cols: 80,
      rows: 24,
      cwd,
      env: { ...process.env, TERM: "xterm-256color" },
    })
    const session: PTYSession = { id, pty, ws: null, cwd, createdAt: Date.now() }
    this.sessions.set(id, session)
    return session
  }

  resize(id: string, cols: number, rows: number): void {
    this.sessions.get(id)?.pty.resize(cols, rows)
  }

  destroy(id: string): void {
    const session = this.sessions.get(id)
    if (session) {
      session.pty.kill()
      this.sessions.delete(id)
    }
  }

  destroyAll(): void {
    for (const [id] of this.sessions) this.destroy(id)
  }
}
```

### Frontend: Terminal Component

```typescript
// Simplified — actual implementation uses xterm.js addons
import { Terminal } from "@xterm/xterm"
import { FitAddon } from "@xterm/addon-fit"
import { AttachAddon } from "@xterm/addon-attach"

// 1. Create terminal instance
const terminal = new Terminal({ cursorBlink: true, fontSize: 13 })
const fitAddon = new FitAddon()
terminal.loadAddon(fitAddon)

// 2. Connect via WebSocket
const ws = new WebSocket(`ws://${host}/ws/pty/${terminalId}`)
const attachAddon = new AttachAddon(ws)
terminal.loadAddon(attachAddon)

// 3. Open in DOM
terminal.open(containerRef.current)
fitAddon.fit()

// 4. Handle resize
const resizeObserver = new ResizeObserver(() => {
  fitAddon.fit()
  ws.send(JSON.stringify({ type: "resize", cols: terminal.cols, rows: terminal.rows }))
})
```

### Why Dedicated WebSocket Path for PTY

The existing `/ws` endpoint broadcasts JSON messages to all clients. Terminal I/O is:
- **Binary** (raw stdout bytes, not JSON)
- **Per-session** (each terminal has its own PTY)
- **Bidirectional** (user types → stdin, process outputs → stdout)
- **High-frequency** (every keystroke)

Mixing terminal binary frames with JSON broadcast on the same WebSocket would require a framing protocol. Instead, use a separate WebSocket path per terminal session: `/ws/pty/:terminalId`. This is simpler, faster, and how every major web IDE does it (Theia, code-server, VS Code remote).

---

## Q3: Data Flow — Where Each State Lives

### State Ownership Matrix

| State | Owner | Why | Persistence |
|-------|-------|-----|-------------|
| **File tree nodes** | Server (chokidar) → Client cache (Zustand) | Server is the source of truth for filesystem state. Client caches for fast rendering, receives incremental updates via WebSocket. | In-memory only. Re-scanned on reconnect. |
| **Expanded directories** | Client (Zustand) | Pure UI state — which folders the user has expanded. No server relevance. | `sessionStorage` — survives page reload |
| **Open editor tabs** | Client (Zustand) | Which files are open, tab order, which tab is active — pure UI state. | `sessionStorage` |
| **Editor content** | Client (Monaco) | Monaco maintains its own model buffer. Content is the file's text. On save, POST to server. On external change (WebSocket event), prompt user or auto-reload. | Monaco model (in-memory). Saved to disk via PUT /api/files/write. |
| **Dirty flags** | Client (Zustand) | Tracks which editors have unsaved changes. Set when Monaco `onDidChangeModelContent` fires, cleared on save. | In-memory only |
| **Cursor position** | Client (Monaco) | Monaco tracks cursor position per model internally. | Not persisted |
| **Terminal buffer** | Client (xterm.js) | The xterm.js Terminal instance holds the scrollback buffer. This is display-only — the actual process state lives on the server. | In-memory. Lost on page reload. |
| **Terminal sessions** | Server (PTYManager) | Server owns PTY processes. Client stores session metadata (id, title, cwd) in Zustand for rendering tab bar. | Server in-memory (PTY processes die when server stops) |
| **Diff data** | Client (computed) | Monaco DiffEditor takes two models (original + modified). Generated on-demand from version comparison. | Not persisted |
| **Chat/session/task state** | Existing stores | Already implemented — no changes needed. | Existing JSON persistence |

### Data Flow Diagrams

**File Open Flow:**
```
User clicks file in tree
       │
       ▼
file-tree store → dispatch "openFile(path)"
       │
       ├──→ Check editor-store: is file already open?
       │        YES → switch to existing tab
       │        NO ↓
       │
       ├──→ REST: GET /api/files/read?path=<relativePath>
       │
       ├──→ Response: { content, encoding, size, mtime }
       │
       ├──→ Monaco: monaco.editor.createModel(content, language, uri)
       │        Language auto-detected from file extension
       │
       └──→ editor-store: addTab({ path, modelUri, mtime, dirty: false })
```

**File Save Flow:**
```
User presses Ctrl+S / Cmd+S
       │
       ▼
editor-store → get active tab
       │
       ├──→ Monaco: model.getValue() → current content
       │
       ├──→ REST: PUT /api/files/write
       │        Body: { path, content }
       │
       ├──→ Response: { success, mtime }
       │
       └──→ editor-store: setDirty(path, false), updateMtime(path, mtime)
```

**External File Change Flow:**
```
Agent modifies file via OpenCode SDK
       │
       ▼
chokidar detects change
       │
       ▼
WebSocket broadcast: { type: "file:change", path: "src/foo.ts" }
       │
       ├──→ file-tree store: update node metadata (size, mtime)
       │
       └──→ editor-store: is file open?
                YES → check dirty flag
                       NOT dirty → auto-reload from server
                       DIRTY → show "File changed externally" banner
                NO  → no action
```

**Terminal I/O Flow:**
```
User types in terminal
       │
       ▼
xterm.js → AttachAddon → WebSocket /ws/pty/:id → node-pty stdin
       │
       ▼
Process writes to stdout
       │
       ▼
node-pty onData → WebSocket /ws/pty/:id → AttachAddon → xterm.js renders
```

---

## Q4: Schema Architecture

### Recommendation: Extend Existing Plain Interface Pattern in `shared/`

**Confidence: HIGH** (matches existing project conventions)

The project already has `src/dashboard/shared/engine-types.ts` with plain TypeScript interfaces shared between backend and frontend. Continue this pattern. Do NOT introduce Zod — the project explicitly avoids it (AGENTS.md: "Plain interfaces — no Zod for internal state").

### New Shared Types

```typescript
// src/dashboard/shared/ide-types.ts — NEW FILE

/** ── File System Types ─────────────────────────────────────── */

export interface FileTreeNode {
  name: string
  path: string            // relative to projectDir
  type: "file" | "directory"
  size?: number           // bytes, files only
  mtime?: number          // last modified timestamp
  children?: FileTreeNode[]  // populated for expanded directories
}

export interface FileReadResult {
  content: string
  encoding: "utf-8" | "base64"  // base64 for binary files
  size: number
  mtime: number
  language?: string       // detected language ID for Monaco
}

export interface FileWriteRequest {
  path: string
  content: string
}

export interface FileWriteResult {
  success: boolean
  mtime: number
}

export interface FileSearchResult {
  path: string
  matches: Array<{
    line: number
    column: number
    text: string          // the matching line
    matchStart: number
    matchEnd: number
  }>
}

/** ── File Watch Events (WebSocket) ──────────────────────────── */

export type FileWatchEvent =
  | { type: "file:add"; path: string }
  | { type: "file:change"; path: string; mtime: number }
  | { type: "file:unlink"; path: string }
  | { type: "dir:add"; path: string }
  | { type: "dir:unlink"; path: string }

/** ── Terminal Types ─────────────────────────────────────────── */

export interface TerminalSession {
  id: string
  title: string
  cwd: string
  shell: string
  createdAt: number
  status: "running" | "exited"
  exitCode?: number
}

export interface TerminalCreateRequest {
  cwd?: string            // defaults to projectDir
  shell?: string          // defaults to $SHELL
  title?: string
}

export interface TerminalResizeRequest {
  cols: number
  rows: number
}

/** ── Editor Types (client-only, not shared) ─────────────────── */
// These live in the frontend, not in shared/, because they're UI-only state.
// Included here for documentation.

// EditorTab: { path, modelUri, dirty, mtime, cursorLine?, cursorCol? }
// EditorState: { tabs: EditorTab[], activeTabPath: string | null }

/** ── WebSocket Message Envelope ─────────────────────────────── */
// Extend existing WebSocket message format

export type WsMessage =
  | { type: "update"; data: Record<string, unknown> }  // existing
  | FileWatchEvent                                       // new
  | { type: "terminal:output"; terminalId: string; data: string }
  | { type: "terminal:exit"; terminalId: string; exitCode: number }
```

### Schema Organization Rules

1. **Shared types** → `src/dashboard/shared/ide-types.ts` (used by both backend and frontend)
2. **Backend-only types** → `src/dashboard/backend/services/*.ts` (PTYManager internal types)
3. **Frontend-only types** → `src/dashboard/frontend/src/stores/*.ts` (EditorTab, UIState)
4. **Existing schemas** → `src/schemas/*.ts` (untouched — these are for the governance layer, not the IDE layer)

### Why NOT Zod

| Factor | Plain Interfaces | Zod |
|--------|-----------------|-----|
| Project convention | ✅ Matches all existing schemas | ❌ Introduces new pattern |
| Runtime validation need | REST API validates in route handlers | Overkill — we control both sides |
| Bundle size impact | 0 KB | ~14 KB (Zod adds client-side weight) |
| TypeScript strict mode | Already catches type errors at compile time | Adds runtime that duplicates compile-time checks |
| Team onboarding | Everyone already knows the pattern | New dependency to learn |

If runtime validation becomes necessary later (e.g., for untrusted plugin input), add Zod **at the boundary** only — not throughout the type system.

---

## Q5: SSE vs WebSocket Decision

### Recommendation: Keep Both — SSE for Chat, WebSocket for Everything Else

**Confidence: HIGH**

| Feature | Transport | Rationale |
|---------|-----------|-----------|
| **Chat streaming** | SSE ✅ (keep existing) | Unidirectional server→client. SSE handles reconnection automatically. Already working at `/api/events`. |
| **File watching** | WebSocket ✅ (extend existing `/ws`) | Server→client push. Already using WebSocket broadcasts for JSON file changes. Add file watch events to existing message types. |
| **Terminal I/O** | WebSocket ✅ (new `/ws/pty/:id`) | **Bidirectional** — user input AND process output. SSE cannot send data client→server. WebSocket is the only option. |
| **Editor save** | REST ✅ | Request-response. No streaming needed. PUT /api/files/write. |
| **File tree load** | REST ✅ | Request-response. GET /api/files/tree. |
| **Future: real-time collaboration** | WebSocket | If multi-cursor collaboration is ever added, WebSocket handles bidirectional OT/CRDT operations. |

### Transport Architecture

```
                    ┌──────────────────────────────┐
                    │         Express Backend        │
                    │                                │
                    │  /api/*          REST (fetch)   │ ← File CRUD, config, sessions
                    │  /api/events     SSE            │ ← Chat streaming (existing)
                    │  /ws             WebSocket      │ ← File watch + UI updates (existing)
                    │  /ws/pty/:id     WebSocket      │ ← Terminal I/O (new, per-session)
                    └──────────────────────────────────┘
```

### Why NOT Replace SSE with WebSocket

The existing SSE implementation for chat streaming is correct and working. SSE has automatic reconnection built into the browser's `EventSource` API — if the connection drops, it reconnects without application code. WebSocket requires manual reconnection logic. Since chat streaming is strictly unidirectional, SSE is simpler and more reliable for this use case.

### WebSocket Message Type Routing

The existing `/ws` broadcasts all messages to all clients without type filtering. For Code IDE, add message type routing:

```typescript
// Extend existing broadcast with typed messages
interface WsBroadcast {
  type: string
  [key: string]: unknown
}

// Client subscribes to specific types
ws.addEventListener("message", (event) => {
  const msg: WsBroadcast = JSON.parse(event.data)
  switch (msg.type) {
    case "update":        handleExistingUpdate(msg); break     // existing
    case "file:add":      handleFileAdd(msg); break            // new
    case "file:change":   handleFileChange(msg); break         // new
    case "file:unlink":   handleFileUnlink(msg); break         // new
    case "dir:add":       handleDirAdd(msg); break             // new
    case "dir:unlink":    handleDirUnlink(msg); break          // new
  }
})
```

---

## Q6: Suggested Build Order

### Dependency Graph

```
                         ┌─────────────────────┐
                         │  1. Server Refactor  │
                         │  (split server.ts    │
                         │   into route modules)│
                         └──────────┬───────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
           ┌────────▼──────┐  ┌────▼────────┐  ┌───▼───────────┐
           │ 2. Shared Types│  │ 3. File     │  │ 4. i18n Setup │
           │ (ide-types.ts) │  │    Service   │  │ (react-       │
           │                │  │  (backend)   │  │  i18next)     │
           └────────┬───────┘  └────┬────────┘  └───────────────┘
                    │               │
                    │       ┌───────┴──────────┐
                    │       │                  │
               ┌────▼───────▼──┐      ┌────────▼──────────┐
               │ 5. File Tree   │      │ 6. File API Routes │
               │    Store       │      │    (REST)          │
               │    (Zustand)   │      │                    │
               └────────┬───────┘      └────────┬───────────┘
                        │                       │
               ┌────────▼───────────────────────▼──┐
               │ 7. File Tree UI Component          │
               │    (virtualized, icons, context)   │
               └────────┬──────────────────────────┘
                        │
               ┌────────▼──────────────────────────┐
               │ 8. Monaco Editor Integration       │
               │    (multi-tab, language detect,    │
               │     save, dirty tracking)          │
               └────────┬──────────────────────────┘
                        │
         ┌──────────────┼──────────────┐
         │              │              │
   ┌─────▼────┐   ┌────▼─────┐  ┌─────▼────────┐
   │ 9. PTY   │   │ 10. Diff │  │ 11. File     │
   │ Service  │   │  Viewer  │  │   Watcher    │
   │ + Term   │   │ (Monaco  │  │   (chokidar  │
   │ UI       │   │ Diff     │  │    + WS)     │
   │          │   │ Editor)  │  │              │
   └──────────┘   └──────────┘  └──────────────┘
```

### Phase-by-Phase Build Order

#### Phase A: Foundation (No UI — Backend + Types)

| Step | What | Why First | Estimated LOC |
|------|------|-----------|---------------|
| A1 | **Split server.ts into route modules** | server.ts is 1427 LOC — adding file/terminal routes would push it past 2000. Split NOW before it gets worse. Extract: `routes/engine.ts`, `routes/sessions.ts`, `routes/governance.ts`, `routes/tasks.ts`, `routes/config.ts`, `routes/brain.ts`. Keep `server.ts` as the Express app setup + middleware + WebSocket setup. | ~200 (refactor, net-zero new LOC) |
| A2 | **Create `shared/ide-types.ts`** | All file/terminal types defined once, imported by backend routes AND frontend stores. Blocks nothing but enables type-safe development in parallel. | ~100 |
| A3 | **Create FileService** (`backend/services/file-service.ts`) | Backend file operations: tree scan, read, write, search. Wraps `fs` + `ignore` package. Pure service, no Express dependency — testable. | ~200 |
| A4 | **Create file system routes** (`backend/routes/files.ts`) | REST endpoints that call FileService. GET /api/files/tree, GET /api/files/read, PUT /api/files/write, GET /api/files/search. | ~150 |

**Test gate:** `curl /api/files/tree` returns the project's directory tree. Read/write round-trips work.

#### Phase B: File Tree + Editor (Core IDE Surface)

| Step | What | Why This Order | Estimated LOC |
|------|------|----------------|---------------|
| B1 | **file-tree store** (Zustand) | Frontend state for tree nodes, expanded set, selected path. Must exist before the tree UI component. | ~80 |
| B2 | **File Tree component** | Virtualized tree (use react-window or @tanstack/virtual for large directories), file type icons, click-to-select, double-click-to-open. | ~250 |
| B3 | **editor-store** (Zustand) | Tab state: open tabs, active tab, dirty flags. Must exist before Monaco integration. | ~60 |
| B4 | **Monaco Editor integration** | @monaco-editor/react wrapper. Multi-tab. Language auto-detection. Save on Ctrl+S. Dirty indicator. TypeScript/JSON language services come free. | ~300 |
| B5 | **IDE Layout component** | Resizable panels: file tree (left), editor (center), terminal (bottom). Use a splitter library or CSS Grid + drag handle. | ~150 |

**Test gate:** Open a file from tree → appears in editor tab → edit → save → file updated on disk.

#### Phase C: Terminal + Watcher (Real-Time Features)

| Step | What | Why This Order | Estimated LOC |
|------|------|----------------|---------------|
| C1 | **PTYService** (`backend/services/pty-manager.ts`) | node-pty process management. Create, resize, destroy PTY sessions. | ~120 |
| C2 | **Terminal WebSocket endpoint** | New WSS at `/ws/pty`. Route WebSocket connections to PTY sessions. Handle binary frames (stdin/stdout) + JSON control frames (resize). | ~100 |
| C3 | **Terminal Panel component** | xterm.js + FitAddon + AttachAddon. Multi-tab terminals. Resize on panel drag. | ~200 |
| C4 | **File watcher integration** | chokidar watches projectDir. Changes → WebSocket broadcast → file-tree store updates. Open editors detect external changes. | ~150 |

**Test gate:** Type commands in terminal → output appears. External file changes update tree + editors.

#### Phase D: Diff + Polish

| Step | What | Estimated LOC |
|------|------|---------------|
| D1 | **Diff Viewer** | Monaco DiffEditor component. Shows original vs modified side-by-side. Fed by file change events from AI agent sessions. | ~150 |
| D2 | **i18n** | react-i18next setup. Wrap all user-facing strings. JSON translation files in `public/locales/`. | ~100 + string extraction |

### Why This Order

1. **A before B**: Backend APIs must exist before frontend can consume them.
2. **B before C**: File tree + editor is the core IDE experience. Terminal is additive. Users need to see/edit files before they need a terminal.
3. **A1 (server split) is foundational**: Adding 400+ LOC of new routes to a 1427 LOC file violates the project's 500 LOC discipline. Split first.
4. **i18n is last**: It's a cross-cutting concern that can be retrofitted. Building it first would slow down feature development by requiring translation keys for every string during development. Standard practice: build in English, extract strings at the end.

---

## Q7: Module Boundaries

### Recommendation: Feature-Folder Pattern Within Existing Monorepo

**Confidence: HIGH**

Do NOT migrate to a pnpm workspaces monorepo. The current project (~12,000 LOC) is too small to justify the tooling overhead of Turborepo/Nx/pnpm workspaces. Instead, enforce module boundaries via folder structure + barrel exports + import conventions.

### Proposed Directory Structure (After Refactor)

```
src/dashboard/
├── backend/
│   ├── server.ts              # REFACTORED: App setup + middleware + listen only (~200 LOC)
│   ├── engine.ts              # EXISTING: OpenCode SDK bridge (235 LOC)
│   ├── routes/                # NEW: Extracted from server.ts + new routes
│   │   ├── index.ts           #   Barrel: registers all route groups on app
│   │   ├── engine.ts          #   /api/engine/* routes
│   │   ├── sessions.ts        #   /api/sessions/* routes
│   │   ├── governance.ts      #   /api/governance, /api/tasks/*
│   │   ├── config.ts          #   /api/providers, /api/agents, /api/config, /api/app
│   │   ├── brain.ts           #   /api/brain, /api/brain/comments
│   │   ├── files.ts           #   NEW: /api/files/* routes
│   │   └── events.ts          #   /api/events SSE endpoint
│   ├── services/              # NEW: Backend service layer
│   │   ├── file-service.ts    #   File system operations
│   │   └── pty-manager.ts     #   Terminal PTY management
│   └── ws/                    # NEW: WebSocket handlers (extracted from server.ts)
│       ├── broadcast.ts       #   Existing broadcast + file watch events
│       └── pty.ts             #   Terminal WebSocket handler
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── ui/            # EXISTING: shadcn/ui primitives (button, card, etc.)
│       │   ├── layout/        # EXISTING: AppShell, Sidebar, GovernanceBar
│       │   ├── dashboard/     # EXISTING: ActiveTasksCard, ProjectHealthCard, etc.
│       │   ├── chat/          # EXISTING: ChatMessage, ChatInput, ToolCallViewer
│       │   ├── ide/           # NEW: Code IDE components
│       │   │   ├── FileTree.tsx
│       │   │   ├── FileTreeNode.tsx
│       │   │   ├── EditorTabs.tsx
│       │   │   ├── MonacoEditor.tsx
│       │   │   ├── TerminalPanel.tsx
│       │   │   ├── TerminalTab.tsx
│       │   │   ├── DiffViewer.tsx
│       │   │   └── IDELayout.tsx     # Resizable split panes
│       │   └── settings/      # EXISTING: SettingsPage components
│       │
│       ├── stores/            # NEW: Zustand stores (or extend existing hooks/)
│       │   ├── file-tree-store.ts
│       │   ├── editor-store.ts
│       │   └── terminal-store.ts
│       │
│       ├── hooks/             # EXISTING: useEventStream, useSessions
│       │   ├── useFileTree.ts    # NEW: hydrate file-tree store from REST + WS
│       │   ├── useEditor.ts      # NEW: Monaco model management
│       │   └── useTerminal.ts    # NEW: xterm.js lifecycle
│       │
│       ├── lib/               # EXISTING: api.ts, utils.ts
│       │   └── api.ts         # MODIFIED: add file/terminal API functions
│       │
│       ├── pages/             # EXISTING: DashboardPage, ChatPage, etc.
│       │   └── IDEPage.tsx    # NEW: page that composes IDE layout
│       │
│       └── locales/           # NEW: i18n translation files
│           ├── en/
│           │   ├── common.json
│           │   ├── ide.json
│           │   └── chat.json
│           └── vi/
│               ├── common.json
│               ├── ide.json
│               └── chat.json
│
└── shared/
    ├── engine-types.ts        # EXISTING: Session, Provider, Agent types
    └── ide-types.ts           # NEW: File, Terminal, Editor shared types
```

### Module Boundary Rules

| Rule | Enforcement |
|------|-------------|
| **`shared/` imports nothing from `backend/` or `frontend/`** | TypeScript path aliases + code review |
| **`backend/routes/` imports from `services/` but never from `frontend/`** | Separate tsconfig exclude |
| **`frontend/` imports from `shared/` but never from `backend/`** | Vite alias resolution — `@shared` → `../shared/` |
| **`components/ide/` imports from `stores/` and `hooks/` but not from `components/chat/`** | Convention. Features don't cross-import. |
| **Each route file is self-contained** | One route group per file. No shared mutable state between route files. |

### Why NOT a Full Monorepo Migration Now

| Factor | Feature Folders (now) | pnpm Workspaces (future) |
|--------|----------------------|--------------------------|
| Migration effort | 0 — just move files | 2-3 days of tooling setup |
| Build complexity | Existing Vite + tsc | Turborepo/Nx orchestration |
| Team size | 1-2 devs now | Needed when 4+ devs on independent packages |
| Package publishing | Not needed | Needed if shared packages are consumed externally |
| CI/CD impact | None | New pipeline configuration |

**Upgrade trigger:** When 4+ developers are working simultaneously on independent packages that need separate versioning and publishing. Until then, feature folders with barrel exports provide sufficient isolation.

---

## Q8: i18n Architecture

### Recommendation: react-i18next with Namespace Pattern

**Confidence: HIGH** (Context7 verified)

### Setup

```typescript
// src/dashboard/frontend/src/lib/i18n.ts — NEW FILE
import i18n from "i18next"
import { initReactI18next } from "react-i18next"

// Static imports for bundled translations (SPA, no async loading needed)
import enCommon from "@/locales/en/common.json"
import enIde from "@/locales/en/ide.json"
import enChat from "@/locales/en/chat.json"
import viCommon from "@/locales/vi/common.json"
import viIde from "@/locales/vi/ide.json"
import viChat from "@/locales/vi/chat.json"

i18n.use(initReactI18next).init({
  lng: "en",                    // default language
  fallbackLng: "en",
  defaultNS: "common",
  ns: ["common", "ide", "chat"],
  resources: {
    en: { common: enCommon, ide: enIde, chat: enChat },
    vi: { common: viCommon, ide: viIde, chat: viChat },
  },
  interpolation: {
    escapeValue: false,         // React already escapes
  },
})

export default i18n
```

### Provider Placement

```typescript
// App.tsx — wrap at root
import { I18nextProvider } from "react-i18next"
import i18n from "@/lib/i18n"

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </I18nextProvider>
  )
}
```

### Usage in Components

```typescript
// Component using ide namespace
import { useTranslation } from "react-i18next"

function FileTree() {
  const { t } = useTranslation("ide")
  return <h2>{t("fileTree.title")}</h2>  // → "File Explorer"
}
```

### Namespace Strategy

| Namespace | Content | Example Keys |
|-----------|---------|-------------|
| `common` | Shared UI: buttons, labels, errors, confirmations | `common:save`, `common:cancel`, `common:error.network` |
| `ide` | Code IDE: file tree, editor, terminal, diff | `ide:fileTree.title`, `ide:editor.untitled`, `ide:terminal.new` |
| `chat` | Chat interface: messages, prompts, session labels | `chat:input.placeholder`, `chat:session.new` |
| `settings` | Settings page labels | `settings:language.label`, `settings:governance.mode` |
| `tasks` | Task management labels | `tasks:status.active`, `tasks:plan.new` |

### Translation File Format

```json
// locales/en/ide.json
{
  "fileTree": {
    "title": "File Explorer",
    "empty": "No files in project",
    "contextMenu": {
      "newFile": "New File",
      "newFolder": "New Folder",
      "rename": "Rename",
      "delete": "Delete",
      "copyPath": "Copy Path"
    }
  },
  "editor": {
    "untitled": "Untitled",
    "unsavedChanges": "{{count}} unsaved change",
    "unsavedChanges_other": "{{count}} unsaved changes",
    "externalChange": "File changed externally. Reload?",
    "readOnly": "Read-only"
  },
  "terminal": {
    "new": "New Terminal",
    "close": "Close Terminal",
    "split": "Split Terminal",
    "title": "Terminal {{index}}"
  },
  "diff": {
    "title": "Diff: {{filename}}",
    "original": "Original",
    "modified": "Modified",
    "noChanges": "No changes detected"
  }
}
```

### Language Persistence

Store selected language in `localStorage`. Read on app init:

```typescript
const savedLng = localStorage.getItem("idumb-language") ?? "en"
i18n.init({ lng: savedLng, ... })

// On language change
i18n.on("languageChanged", (lng) => {
  localStorage.setItem("idumb-language", lng)
  document.documentElement.lang = lng
})
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Monaco as a God Component

**What people do:** Put Monaco setup, tab management, file loading, save logic, diff comparison, language configuration, and keyboard shortcuts into a single `<CodeEditor>` component of 600+ LOC.

**Why it's wrong:** Monaco's API surface is enormous. Mixing its configuration with application logic creates an untestable monolith. Tab management is UI state, not editor state.

**Do this instead:** Separate concerns: `MonacoEditor.tsx` (thin wrapper around `@monaco-editor/react`, handles only editor mounting/unmounting), `EditorTabs.tsx` (tab bar UI, reads from editor-store), `useEditor.ts` hook (model creation, language detection, save orchestration). Each is independently testable.

### Anti-Pattern 2: Loading Entire Directory Trees Eagerly

**What people do:** Recursively scan the entire project directory on initial load and send the full tree to the client.

**Why it's wrong:** Large monorepos can have 50,000+ files. A full recursive scan blocks the event loop for seconds and sends megabytes of JSON. Users only need the top-level initially.

**Do this instead:** Lazy-load directory contents. Initial load returns only the root directory's children (depth=1). When the user expands a folder, fetch that folder's children. This is O(visible nodes) not O(total files).

### Anti-Pattern 3: Sharing a Single WebSocket for Terminal I/O

**What people do:** Send terminal stdin/stdout as JSON messages on the same WebSocket that handles file watch events and UI updates.

**Why it's wrong:** Terminal I/O is high-frequency binary data. JSON encoding every keystroke and every stdout byte adds latency and CPU overhead. Mixing terminal traffic with UI events requires a message framing protocol and makes debugging harder.

**Do this instead:** Separate WebSocket per terminal session at `/ws/pty/:id`. Binary frames for stdin/stdout. JSON control frame for resize. The existing `/ws` stays clean for JSON broadcasts.

### Anti-Pattern 4: Storing Terminal Scrollback on Server

**What people do:** Buffer all terminal output on the server to support "reconnect and see history."

**Why it's wrong:** Terminal scrollback for a busy process can grow to megabytes. Storing it per-session on the server wastes memory and complicates cleanup. The real terminal state (running process, environment, current directory) is the PTY — not the output buffer.

**Do this instead:** Terminal scrollback lives in the xterm.js Terminal instance on the client. If the user navigates away and comes back, the terminal history is gone — same as closing and reopening a terminal tab in VS Code. If persistent terminal sessions are needed later, use `tmux` or `screen` as the PTY target instead of a bare shell.

### Anti-Pattern 5: Tight Coupling Between IDE and Governance

**What people do:** Make the file tree, editor, and terminal aware of governance state (task required, writes blocked) at the component level.

**Why it's wrong:** The IDE layer should be a general-purpose code editor. Governance is an overlay. If every IDE component checks `writesBlocked` before saving, governance logic leaks into 10+ components.

**Do this instead:** Governance enforcement happens at the API layer. The `PUT /api/files/write` route checks governance state and rejects writes if blocked. The editor shows the error. The editor component doesn't know or care about governance — it just handles the API error.

---

## Scalability Considerations

| Concern | At 1 User (now) | At 10 Users (Phase 4+) | At 100+ Users (future) |
|---------|-----------------|------------------------|------------------------|
| **File watching** | Single chokidar instance, broadcast to 1 WS client | Multiple WS clients, same chokidar instance — broadcasts scale linearly | Consider debouncing rapid changes, only watching actively viewed directories |
| **PTY sessions** | 1-3 terminals | 10-30 terminals (1-3 per user session) — memory: ~5MB per PTY process | PTY pool with max limit, idle timeout + cleanup |
| **Monaco models** | 5-10 open files | Same — each user's browser holds its own models | No server scaling needed — Monaco is client-side |
| **File reads** | Synchronous OK | Add read caching with TTL (1-5s) | LRU cache for hot files, streaming reads for large files |
| **WebSocket connections** | 1-2 clients | 10-20 clients on same `/ws` | Connection pooling, heartbeat/ping for stale cleanup |

---

## Integration Points with Existing Code

### What Changes in Existing Files

| File | Change | Impact |
|------|--------|--------|
| `server.ts` (1427 LOC) | **Split into `server.ts` (setup) + `routes/*.ts`** (route handlers) | High impact but net-positive — reduces file to ~200 LOC, enables independent route development |
| `App.tsx` | Add `<I18nextProvider>` wrapper, add IDE route | Low impact — 2 lines added |
| `lib/api.ts` | Add `files.*` and `terminal.*` API functions | Low impact — additive, no existing function changes |
| `vite.config.ts` | Add `@shared` alias if not already configured | Low impact — 1 line |
| `package.json` (frontend) | Add dependencies: `@monaco-editor/react`, `@xterm/xterm`, `@xterm/addon-fit`, `@xterm/addon-attach`, `react-i18next`, `i18next`, `zustand` | Medium impact — new deps |
| `package.json` (root) | Add dependencies: `node-pty`, `chokidar`, `ignore` | Medium impact — `node-pty` requires native compilation (node-gyp) |
| `WebSocket server` | Add message type routing to existing broadcast, add `/ws/pty` WSS | Medium impact — new code path alongside existing |

### What Does NOT Change

| File/System | Why |
|-------------|-----|
| `engine.ts` (OpenCode SDK bridge) | SDK has no filesystem API — IDE file ops are independent |
| `src/schemas/*.ts` | These are governance schemas, not IDE schemas. No coupling. |
| `cli.ts`, `cli/deploy.ts` | CLI is for agent deployment, unrelated to dashboard IDE features |
| `lib/persistence.ts` | Governance state persistence, not IDE state |
| `tests/*.test.ts` | Existing tests are for schemas/CLI, not dashboard. New tests go in frontend test suite. |

---

## Key Technology Decisions (Architecture-Level)

| Decision | Choice | Rationale | Confidence |
|----------|--------|-----------|------------|
| File access | Express REST API | Only viable option — browser can't access host FS. Already have Express. WebContainer is overkill for local-first. | HIGH |
| Editor | @monaco-editor/react | Official Monaco React wrapper. 400K+ weekly npm downloads. Free TypeScript/JSON language services. DiffEditor included. Vite-compatible via `monaco-editor/esm/vs/editor/editor.worker`. | HIGH |
| Terminal emulator | xterm.js 5.x + addons | Industry standard (used by VS Code, Hyper, Theia). AttachAddon connects directly to WebSocket. FitAddon handles resize. | HIGH |
| PTY backend | node-pty | Only maintained Node.js PTY library. Used by VS Code, Theia, Hyper. Native addon — requires node-gyp. | HIGH |
| File watching | chokidar 4.x | Stable, widely used (47K+ GitHub stars). Cross-platform. Handles symlinks, gitignore, and debouncing. | HIGH |
| Terminal transport | WebSocket (dedicated /ws/pty/:id) | Bidirectional binary I/O required. Separate from JSON broadcast channel. | HIGH |
| State management | Zustand (3 new stores) | Already in frontend `package.json`. Selector-based subscriptions. Minimal boilerplate. | HIGH |
| i18n | react-i18next + i18next | Most popular React i18n solution (10M+ weekly downloads). Namespace support. TypeScript-friendly. Context7 verified. | HIGH |
| Server refactor | Split server.ts → routes/*.ts | 1427 LOC violates 500 LOC discipline. Adding 400+ LOC of new routes would make it unmanageable. Split is prerequisite. | HIGH |
| Monorepo migration | **NOT NOW** — feature folders instead | Project is ~12K LOC with 1-2 devs. Monorepo tooling (Turborepo/Nx) adds complexity without proportional benefit. Upgrade when 4+ devs need independent packages. | MEDIUM |

---

## Sources

- **@monaco-editor/react** — Context7 docs (`/suren-atoyan/monaco-react`): NPM package setup with Vite, Editor/DiffEditor components, multi-model editing, custom Monaco instance configuration. HIGH confidence.
- **xterm.js** — Context7 docs (`/xtermjs/xterm.js`): Terminal setup, AttachAddon for WebSocket connection, FitAddon for container resize, addon architecture (v5 `@xterm/*` package naming). HIGH confidence.
- **node-pty** — Context7 docs (`/microsoft/node-pty`): `spawn()` API, resize, onData handler, environment configuration, cross-platform shell detection. HIGH confidence.
- **chokidar** — Context7 docs (`/paulmillr/chokidar`): Watch API, event types (add/change/unlink/addDir/unlinkDir), `awaitWriteFinish` stabilization, `ignored` patterns. HIGH confidence.
- **react-i18next** — Context7 docs (`/i18next/react-i18next`): `I18nextProvider` setup, `useTranslation` hook with namespaces, key prefixes, language switching, Suspense integration. HIGH confidence.
- **EclipseSource — Web IDE Architecture (2025-02-04)** — https://eclipsesource.com/blogs/2025/02/04/modern-web-based-tool-and-ide-definitions-concepts-architecture — Web-based IDE architecture patterns, client-server separation. MEDIUM confidence.
- **Theia Architecture** — https://theia-ide.org/docs/architecture — Established open-source IDE framework architecture (TypeScript, frontend/backend split, DI container). MEDIUM confidence.
- **SSE vs WebSocket Comparison (2025-12)** — https://medium.com/@sulmanahmed/websockets-vs-server-sent-events-sse — Transport selection rationale, when to use each, reconnection differences. MEDIUM confidence.
- **node-pty + WebSocket Integration (2025-03)** — https://medium.com/@deysouvik/efficient-and-scalable-usage-of-node-js-pty-with-socket-io — PTY pooling, resize handling, binary frame performance. MEDIUM confidence.
- **Feature-Sliced Design Monorepo Guide (2025-12)** — https://feature-sliced.design/blog/frontend-monorepo-explained — When to use monorepo vs feature folders, module boundaries, upgrade triggers. MEDIUM confidence.
- **iDumb v2 codebase** — Direct analysis of `server.ts`, `engine.ts`, `engine-types.ts`, `api.ts`, `App.tsx`, `vite.config.ts`, `package.json`. HIGH confidence.

---

*Architecture research for: Code IDE + Workspace Foundation — iDumb v2 Dashboard*
*Researched: 2026-02-10*
