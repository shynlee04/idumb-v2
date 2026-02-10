# Technology Stack: Code IDE + Workspace Foundation

**Project:** iDumb v2 — AI Code IDE + Knowledge Work Platform
**Researched:** 2026-02-10
**Mode:** Ecosystem (stack additions for Code IDE features)
**Overall Confidence:** HIGH

---

## Executive Summary

This research evaluates 8 specific technology decisions for adding Code IDE features (Monaco editor, file tree, terminal, code diffs), i18n support, and schema-first data management to the existing React + Express + Vite dashboard.

**Core verdict:** Migrate to TanStack Start in SPA mode as the new foundation. The current React+Express+Vite is being rebuilt anyway — TanStack Start provides type-safe file-based routing, built-in server functions (replacing tRPC need), deep TanStack Query integration, and runs on Vite. Do NOT add Payload CMS, do NOT add Vercel AI SDK. Add Monaco Editor, xterm.js, react-i18next, and Drizzle ORM as targeted additions.

---

## Existing Stack (DO NOT RE-RESEARCH)

Already validated and working:

| Technology | Role | Status |
|---|---|---|
| React 18 + TypeScript | Frontend framework | 34 .tsx files |
| Express.js | Backend server | 1427 LOC server.ts |
| Vite | Build + dev server | Working |
| WebSocket (ws) | Bidirectional comms | Working |
| SSE | Streaming AI responses | Working |
| OpenCode SDK | AI engine | Chat streaming, sessions |
| Vitest | Testing | 466 assertions |
| TypeScript strict | Type safety | Zero errors |

---

## Critical Decisions: Verdicts

### 1. TanStack Start vs Current Stack

**VERDICT: USE TANSTACK START in SPA mode. Fresh frontend build.**

| Factor | Assessment |
|---|---|
| Maturity | v1 RC since Sep 23, 2025. API "considered stable" and "feature-complete" per Tanner Linsley. Built on TanStack Router (13.4k stars, fully stable). |
| SPA mode | First-class: `spa: { enabled: true }` in Vite config. Docs: "SPA mode does not mean giving up server-side features!" Server functions + server routes work alongside SPA. |
| Migration cost | LOW. The frontend is being rebuilt anyway. TanStack Start is a Vite plugin (`@tanstack/start-vite`), not a paradigm shift. |
| What it provides | Type-safe file-based routing, `createServerFn()` for type-safe RPCs (replaces tRPC), server routes for custom HTTP (SSE, webhooks), deep TanStack Query integration for caching/prefetching. |
| Ecosystem momentum | 9,000+ companies using TanStack ecosystem. Active migration wave FROM Next.js in early 2026 (byteiota, codewithseb, crystallize, catalins.tech all document this). |

**Evidence:**
- TanStack Start v1 RC blog post (Sep 23, 2025): "This is the build we expect to ship as 1.0, pending your final feedback." API stable. [Source: tanstack.com/blog/announcing-tanstack-start-v1]
- SPA mode docs explicitly support self-hosted apps without SSR: "Benefits include easier deployment, simpler development by eliminating complexities associated with SSR." [Source: tanstack.com/start/latest/docs/framework/react/guide/spa-mode]
- Server functions provide type-safe RPCs with Zod validation — `createServerFn().inputValidator(z.object({...})).handler(async ({ data }) => ...)` — eliminates need for separate tRPC layer.
- Server routes provide full Request/Response API for SSE streaming, webhooks, and custom endpoints.
- Built on Vite (same bundler as current stack). Migration = replacing React Router + Express routes, not rebuilding everything.
- byteiota (Feb 2, 2026): "React developers are leaving Next.js for TanStack Start... 30-35% smaller client bundles."
- InfoQ (Nov 7, 2025): "A New Meta Framework Powered by React" — legitimate tech press coverage.
- Builder.io (Jan 20, 2026): "The React + AI Stack for 2026" recommends TanStack ecosystem.

**WebSocket limitation (honest):** TanStack Start server routes handle standard HTTP (including SSE). WebSocket protocol upgrade needs either Nitro's `crossws` support or a standalone tiny WebSocket server for terminal PTY only. This is a narrow concern — only the terminal feature needs WebSocket.

**What replaces what:**
| Current | TanStack Start Equivalent |
|---|---|
| React Router (manual routes) | File-based routing (automatic, type-safe) |
| Express API routes | `createServerFn()` (type-safe RPCs) + server routes |
| tRPC (proposed) | NOT NEEDED — `createServerFn()` is the built-in equivalent |
| Express SSE endpoints | Server routes with streaming Response |
| Vite bundler | Same Vite (Start is a Vite plugin) |
| TanStack Query (manual wiring) | Deep integration (prefetching, caching built-in) |

**Confidence: HIGH** (Official docs, Context7, 2026 web articles, npm stats, migration success stories)

---

### 2. WebSocket vs SSE

**VERDICT: KEEP BOTH. Each serves a distinct purpose.**

| Channel | Use Case | Why |
|---|---|---|
| **SSE** | AI chat streaming, task status updates, log tailing | Server→client only. Auto-reconnect. HTTP/2 multiplexing. Perfect for OpenCode SDK response streaming. |
| **WebSocket** | Terminal I/O, real-time collaboration, bidirectional commands | Terminal emulation REQUIRES bidirectional communication. PTY data flows both ways. |

**The terminal addition makes WebSocket essential.** Without the terminal feature, SSE alone could handle everything. With terminal, WebSocket is non-negotiable for PTY communication.

**Pattern for 2026:**
- SSE for "server pushes data to client" (streaming, notifications, status)
- WebSocket for "client and server exchange data interactively" (terminal, collaboration)

**Do NOT consolidate to one protocol.** They serve fundamentally different communication patterns.

**Confidence: HIGH** (established web patterns, verified against 2026 articles)

---

### 3. Monaco Editor

**VERDICT: Use `@monaco-editor/react` v4.x**

| Criterion | @monaco-editor/react | react-ace | CodeMirror 6 |
|---|---|---|---|
| Weekly downloads | 2,526,546 | 609,505 | 11,465 |
| VS Code parity | Full (same engine) | Partial | Different engine |
| Built-in diff | YES (DiffEditor) | No | Plugin |
| TypeScript support | Native (built-in) | Plugin | Plugin |
| Bundle size | ~3MB (lazy-loaded from CDN by default) | ~2MB | ~500KB |
| Stars | 4,608 | 4,210 | 1,560 |

**Why @monaco-editor/react:**
- Same editor engine as VS Code — users get familiar keybindings, IntelliSense, minimap
- Built-in `DiffEditor` component eliminates need for separate diff library (Decision #8)
- Supports multi-model editing (multiple files open simultaneously)
- TypeScript/JavaScript language services built-in (no additional configuration)
- Lazy-loads Monaco from CDN by default, can be configured for self-hosted bundles via `@monaco-editor/loader`

**Critical configuration for iDumb:**
```typescript
// Self-hosted Monaco for offline/self-hosted deployments
import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';
loader.config({ monaco }); // Use bundled instead of CDN

// Or with Vite worker setup
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'typescript' || label === 'javascript') return new tsWorker();
    return new editorWorker();
  },
};
```

**Bundle size mitigation:** Monaco workers run in Web Workers. Lazy-load the editor component only when the code view is active. With code splitting, initial page load is unaffected.

**Version:** `@monaco-editor/react@4.7.0` (latest stable, published 2025)

**Confidence: HIGH** (Context7 docs verified, npm stats confirmed)

---

### 4. Terminal Component

**VERDICT: `@xterm/xterm` + `node-pty` + custom React wrapper**

**Frontend: `@xterm/xterm` v5.x**

| Criterion | Assessment |
|---|---|
| Industry standard | Powers VS Code, Theia, JupyterLab, Hyper, 50+ terminal apps |
| Architecture | Canvas-based rendering, WebGL acceleration via addon |
| React wrapper | No official React wrapper — write a thin one (~50 LOC) or use community `react-xtermjs` |
| Addons | `@xterm/addon-fit` (auto-resize), `@xterm/addon-attach` (WebSocket), `@xterm/addon-webgl` (GPU) |

**Backend: `node-pty` v1.1.0**

| Criterion | Assessment |
|---|---|
| Purpose | Fork pseudo-terminal processes on the server |
| Used by | VS Code, Theia, Hyper — battle-tested |
| Platform | Linux, macOS, Windows (conpty API) |
| Note | Native module — requires build tools or prebuilt binaries |

**Recommended: `@lydell/node-pty` v1.2.0-beta.3** — Smaller distribution (1MB vs 60MB), platform-specific optional deps, no node-gyp needed. Used by 1.5M+ weekly downloads.

**Architecture:**
```
Browser                          Server
┌──────────┐    WebSocket    ┌──────────┐
│ xterm.js │◄──────────────►│ node-pty │
│ (canvas) │   binary data   │ (PTY)    │
└──────────┘                 └──────────┘
```

**React wrapper pattern (write custom, ~80 LOC):**
```typescript
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { AttachAddon } from '@xterm/addon-attach';
import { useEffect, useRef } from 'react';

export function TerminalPanel({ wsUrl }: { wsUrl: string }) {
  const termRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = new Terminal({ cursorBlink: true, fontSize: 14 });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    const ws = new WebSocket(wsUrl);
    const attachAddon = new AttachAddon(ws);
    term.loadAddon(attachAddon);

    term.open(termRef.current!);
    fitAddon.fit();

    const resizeObserver = new ResizeObserver(() => fitAddon.fit());
    resizeObserver.observe(termRef.current!);

    return () => {
      resizeObserver.disconnect();
      ws.close();
      term.dispose();
    };
  }, [wsUrl]);

  return <div ref={termRef} style={{ height: '100%' }} />;
}
```

**Install:**
```bash
# Frontend
npm install @xterm/xterm @xterm/addon-fit @xterm/addon-attach @xterm/addon-webgl

# Backend
npm install @lydell/node-pty
```

**Confidence: HIGH** (Context7 docs, npm verified, VSCode-proven stack)

---

### 5. i18n Framework

**VERDICT: `react-i18next` v16.x + `i18next` v25.x**

| Criterion | react-i18next | react-intl | LinguiJS |
|---|---|---|---|
| Weekly downloads | 4.8M+ | 1.2M+ | 200K+ |
| React hooks | `useTranslation()` | `useIntl()` | `useLingui()` |
| TypeScript | Full (v25.4+ with `enableSelector`) | Good | Good |
| Namespace support | YES (code-split translations) | No | Limited |
| Lazy loading | YES (i18next-http-backend) | Manual | Build-time |
| Ecosystem maturity | 13+ years, 360 versions | Mature | Growing |
| Vietnamese support | Full (ICU, plurals, formatting) | Full | Full |

**Why react-i18next:**
- **Namespace support** enables code-splitting translations by feature area (editor, terminal, settings, tasks) — critical for the growing codebase
- **TypeScript type safety** with `enableSelector` (i18next v25.4+) provides compile-time translation key validation
- **Lazy loading** via `i18next-http-backend` means Vietnamese translations load on-demand, not in the initial bundle
- **13+ years of maturity** — every edge case is solved

**English-first, Vietnamese-ready architecture:**
```
src/
  locales/
    en/
      common.json          # Shared UI strings
      editor.json          # Code editor strings
      terminal.json        # Terminal strings
      tasks.json           # Task management strings
    vi/
      common.json          # Vietnamese translations (added later)
      ...
```

**Setup pattern:**
```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(HttpBackend)           // Lazy-load translation files
  .use(LanguageDetector)      // Auto-detect user language
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'editor', 'terminal', 'tasks'],
    interpolation: { escapeValue: false },  // React already escapes
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
  });
```

**Install:**
```bash
npm install i18next react-i18next i18next-http-backend i18next-browser-languagedetector
```

**Version:** `react-i18next@16.5.3`, `i18next@25.x` (latest as of Jan 2026)

**Confidence: HIGH** (Context7 docs verified, npm confirmed, TypeScript docs checked)

---

### 6. Payload CMS

**VERDICT: DO NOT USE. Over-engineered for this project.**

| Factor | Assessment |
|---|---|
| Next.js dependency | Payload v3 is deeply coupled to Next.js. Using outside Next.js requires `getPayload()` local API pattern with significant setup. |
| Architecture mismatch | iDumb already has Express backend (1427 LOC), custom schemas (12 schema files), and persistence layer (1082 LOC). Payload would be a parallel system. |
| Admin UI | Payload ships its own admin panel — conflicts with iDumb's existing React dashboard. |
| Value proposition | Auto-generated TypeScript types and CRUD. But project already has hand-crafted TypeScript schemas with 466 test assertions. |
| Database | Payload uses its own database abstraction. iDumb already uses SQLite with custom adapter. |

**What Payload CMS solves that this project doesn't need:**
- Content management (CMS) — iDumb is not a CMS
- Admin UI generation — iDumb has its own dashboard
- User auth system — not needed for single-user/self-hosted
- Media management — not needed

**What this project actually needs (schema-first data management):**
Use **Drizzle ORM** instead. See "Schema-First Data Architecture" section below.

**Confidence: HIGH** (Context7 docs for Payload, official "Using Payload outside Next.js" docs reviewed)

---

### 7. Vercel AI SDK

**VERDICT: DO NOT ADD. OpenCode SDK already covers AI needs.**

| Capability | Vercel AI SDK | OpenCode SDK (existing) |
|---|---|---|
| Chat streaming | `useChat()` hook + `streamText()` | Already implemented via SSE relay |
| Multi-model support | 20+ providers via adapters | Via OpenCode configuration |
| Tool calling | Built-in | Via OpenCode agents |
| Express support | YES (documented adapter) | Already integrated |
| Self-hosted | YES (no Vercel required) | YES (fully self-hosted) |

**Why not add it:**
1. **Duplication.** OpenCode SDK already handles AI chat streaming through the dashboard's SSE relay (see `server.ts`). Adding Vercel AI SDK creates two streaming systems.
2. **Architecture conflict.** iDumb's AI flows through OpenCode SDK → Express backend → SSE → React frontend. Vercel AI SDK would add a parallel path with its own hooks (`useChat`).
3. **Complexity tax.** Two AI SDKs means two sets of message formats, two streaming protocols, two error handling paths.

**When Vercel AI SDK WOULD make sense:**
- Building a standalone AI chat app from scratch
- Needing to switch between AI providers frequently (but OpenCode already handles this)
- Using Next.js (tighter integration)

**Confidence: HIGH** (Context7 docs for Vercel AI SDK, existing codebase analysis)

---

### 8. Code Diff Component

**VERDICT: Use Monaco's built-in `DiffEditor`. No separate library needed.**

| Approach | Bundle Impact | VS Code Parity | Maintenance |
|---|---|---|---|
| **Monaco DiffEditor** | 0 KB (included with Monaco) | Full (same engine) | Maintained by Microsoft |
| react-diff-viewer-continued | +132 KB | None | Community (last update: 2 years ago) |
| react-diff-view | +1.48 MB | None | Community (last update: 6 months ago) |

**Why Monaco DiffEditor:**
- Already bundled with @monaco-editor/react — ZERO additional cost
- Same diff rendering as VS Code — users already know this UI
- Supports inline diff AND side-by-side diff modes
- Syntax highlighting for ALL languages Monaco supports
- No additional dependency to maintain

**Usage:**
```tsx
import { DiffEditor } from '@monaco-editor/react';

<DiffEditor
  original={originalCode}
  modified={modifiedCode}
  language="typescript"
  theme="vs-dark"
  options={{
    readOnly: true,
    renderSideBySide: true,   // or false for inline
    renderIndicators: true,
  }}
/>
```

**For non-code diffs** (e.g., JSON config changes, text documents), Monaco DiffEditor still works. For structured data diffs shown in UI (not full editor), consider a simple custom component using `diff` npm package (~8KB).

**Confidence: HIGH** (Context7 docs for @monaco-editor/react, built-in feature)

---

## Recommended Stack Additions

### Core IDE Components

| Technology | Version | Purpose | Why |
|---|---|---|---|
| `@monaco-editor/react` | ^4.7.0 | Code editor + diff viewer | VS Code engine, built-in diff, 2.5M/week |
| `@xterm/xterm` | ^5.5.0 | Terminal emulator (frontend) | Industry standard, canvas rendering, WebGL |
| `@xterm/addon-fit` | ^0.10.0 | Terminal auto-resize | Required for responsive layout |
| `@xterm/addon-attach` | ^0.11.0 | Terminal WebSocket attach | Connects xterm to backend PTY |
| `@xterm/addon-webgl` | ^0.18.0 | Terminal GPU acceleration | Smooth rendering for heavy output |
| `@lydell/node-pty` | ^1.1.0 | Terminal PTY backend | Native PTY spawning, VSCode-proven |

### i18n

| Technology | Version | Purpose | Why |
|---|---|---|---|
| `i18next` | ^25.4.0 | i18n core | 13yr maturity, TypeScript type-safe keys |
| `react-i18next` | ^16.5.0 | React bindings | `useTranslation()` hook, 4.8M/week |
| `i18next-http-backend` | ^3.0.0 | Lazy-load translations | On-demand loading for Vietnamese |
| `i18next-browser-languagedetector` | ^8.0.0 | Auto-detect language | Browser language detection |

### Schema-First Data Architecture (replaces Payload CMS need)

| Technology | Version | Purpose | Why |
|---|---|---|---|
| `drizzle-orm` | ^0.40.0 | Type-safe ORM | Code-first TS schemas, SQLite native, zero codegen |
| `drizzle-kit` | ^0.30.0 | Migration tool | Auto-generate migrations from schema changes |
| `better-sqlite3` | ^11.0.0 | SQLite driver | Synchronous SQLite for Node.js (or use existing adapter) |

**Note:** tRPC is NOT needed. TanStack Start's `createServerFn()` provides type-safe RPCs with Zod input validation. Server functions replace what tRPC would do, with zero additional dependency.

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---|---|---|---|
| `zod` | ^3.24.0 | Runtime validation | Server function input validation, config parsing |
| `@tanstack/react-query` | ^5.62.0 | Server state management | Deep integration with TanStack Start — caching, prefetching, optimistic updates |
| `diff` | ^7.0.0 | Text diffing | Lightweight diff for non-editor contexts |
| `monaco-editor` | ^0.52.0 | Monaco core (self-hosted) | Required when NOT using CDN loader |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|---|---|---|---|
| Framework | TanStack Start (SPA mode) | React SPA + Vite + Express | Start provides file-based routing, server functions, deep Query integration. Express is manual boilerplate. |
| Code Editor | @monaco-editor/react | CodeMirror 6 | Smaller bundle but loses VS Code parity, no built-in diff |
| Code Editor | @monaco-editor/react | react-ace | Less capable, no built-in TypeScript support |
| Terminal | @xterm/xterm + custom wrapper | react-xtermjs | Community wrapper adds abstraction, xterm is simple enough |
| i18n | react-i18next | react-intl | No namespace support, no lazy loading, less flexible |
| i18n | react-i18next | LinguiJS | Smaller ecosystem, build-time extraction adds complexity |
| Data layer | Drizzle ORM | Prisma 7 | Prisma: 1.6MB bundle, requires `prisma generate` step |
| Data layer | Drizzle ORM | Payload CMS | Payload: Next.js coupled, admin UI conflicts, massive overhead |
| Diff viewer | Monaco DiffEditor | react-diff-viewer-continued | Extra dependency for what Monaco includes free |
| AI SDK | OpenCode SDK (keep existing) | Vercel AI SDK | Duplicates existing streaming, architecture conflict |
| API layer | TanStack Start server functions | tRPC v11 | Start's `createServerFn()` provides same type-safe RPCs natively |
| API layer | TanStack Start server functions | REST (Express) | Server functions are type-safe end-to-end, no manual fetch |

---

## Schema-First Data Architecture (Deep Dive)

The project has a hard constraint on schema-first development. Here's the recommended architecture:

### Why Drizzle ORM (not Payload CMS)

| Criterion | Drizzle | Payload CMS |
|---|---|---|
| Schema definition | TypeScript files (code-first) | payload.config.ts (CMS-first) |
| Bundle size | ~57KB | ~2MB+ |
| Database | SQLite, PostgreSQL, MySQL | MongoDB, PostgreSQL |
| Integration | Any server runtime (Nitro, Express, etc.) | Next.js-coupled |
| Type generation | Zero-step (TS inference) | Requires generate step |
| Admin UI | None (you build your own) | Ships its own (conflicts with iDumb dashboard) |
| Learning curve | Low (SQL-like API) | Medium (CMS concepts) |

### Drizzle + Existing SQLite Adapter

The project already has `sqlite-adapter.ts` (323 LOC). Drizzle can work alongside it or replace it:

**Schema example (schema-first, code-first):**
```typescript
// src/db/schema/tasks.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  status: text('status', { enum: ['pending', 'active', 'done', 'failed'] }).notNull(),
  parentId: text('parent_id').references(() => tasks.id),
  complexity: text('complexity', { enum: ['A', 'B', 'C'] }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Type is inferred — no codegen needed
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
```

**Migration path from existing `persistence.ts`:**
1. Phase 1: Add Drizzle schemas alongside existing JSON persistence
2. Phase 2: Migrate read paths to Drizzle queries
3. Phase 3: Migrate write paths, remove JSON persistence
4. Phase 4: Full Drizzle with migration tooling

### Type-Safe API via TanStack Start Server Functions (replaces tRPC)

**Why server functions (not tRPC):**
- TanStack Start includes `createServerFn()` — type-safe RPCs with Zod input validation, zero additional dependency.
- Deep integration with TanStack Query — server functions return typed data that flows into `useQuery`/`useMutation` hooks automatically.
- No codegen, no separate router definition, no trpc context boilerplate.
- v11 tRPC would work alongside Start, but adds redundant abstraction over what Start already provides natively.

**Server function pattern:**
```typescript
// src/server/files.ts
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

export const listFiles = createServerFn({ method: 'GET' })
  .validator(z.object({ path: z.string() }))
  .handler(async ({ data }) => {
    // Read filesystem, return typed result
    return await readDirectory(data.path);
  });

export const writeFile = createServerFn({ method: 'POST' })
  .validator(z.object({ path: z.string(), content: z.string() }))
  .handler(async ({ data }) => {
    await fs.writeFile(data.path, data.content);
    return { success: true };
  });
```

```typescript
// Frontend: Type-safe calls
import { listFiles, writeFile } from '../server/files';

function FileTree() {
  const { data: files } = useQuery({
    queryKey: ['files', currentPath],
    queryFn: () => listFiles({ data: { path: currentPath } }),
  });
  //     ^? Fully typed from server function return type
}
```

---

## Bundle Size & Performance Impact

| Addition | Bundle Size | Load Strategy | Impact |
|---|---|---|---|
| Monaco Editor | ~3MB | Lazy-load on editor tab open | Zero initial impact |
| Monaco Workers | ~2MB | Web Workers (off main thread) | Zero UI impact |
| xterm.js | ~400KB | Lazy-load on terminal open | Zero initial impact |
| react-i18next | ~30KB | Initial load (core only) | Minimal |
| Translation files | ~5KB/language | On-demand per namespace | Minimal |
| Drizzle ORM | ~57KB | Server-only | Zero frontend impact |
| tRPC client | ~0KB | Not used | NOT NEEDED — Start has server functions |
| @tanstack/react-query | ~40KB | Initial load | Minimal |

**Total initial bundle increase:** ~70KB (react-query + i18next core)
**Lazy-loaded on demand:** ~5.4MB (Monaco + xterm, only when those panels open)

---

## Installation

```bash
# === Core IDE Components ===
npm install @monaco-editor/react monaco-editor
npm install @xterm/xterm @xterm/addon-fit @xterm/addon-attach @xterm/addon-webgl
npm install @lydell/node-pty

# === i18n ===
npm install i18next react-i18next i18next-http-backend i18next-browser-languagedetector

# === Schema-First Data (backend) ===
npm install drizzle-orm better-sqlite3
npm install -D drizzle-kit @types/better-sqlite3

# === Type-Safe API Layer ===
# NOT NEEDED: TanStack Start's createServerFn() replaces tRPC
npm install @tanstack/react-start @tanstack/react-router @tanstack/react-query zod

# === Supporting ===
npm install diff
```

---

## Integration Points with Existing Stack

### Monaco Editor Integration

| Existing Component | Integration |
|---|---|
| Dashboard layout (`App.tsx`) | New `<EditorPanel>` in main content area, lazy-loaded |
| WebSocket (`server.ts`) | NOT used for editor (local file operations via server functions) |
| File system access | TanStack Start server functions for file read/write/list |
| OpenCode SDK | AI-assisted code actions in editor context menu |

### Terminal Integration

| Existing Component | Integration |
|---|---|
| WebSocket (`server.ts`) | New `/ws/terminal` endpoint for PTY data |
| Dashboard layout | New `<TerminalPanel>` in bottom panel, lazy-loaded |
| Express server | WebSocket handler for PTY (standalone, or via Nitro crossws) |

### Server Functions Integration (replaces tRPC + Express routes)

| Existing Component | Integration |
|---|---|
| Express server (`server.ts`) | Replaced by TanStack Start server functions + server routes |
| Existing REST routes | Migrate to `createServerFn()` calls — type-safe, zero boilerplate |
| React frontend | Replace `fetch()` calls with typed server function imports |
| SSE streaming | Server routes with streaming Response (replaces Express SSE handlers) |
| WebSocket | Keep standalone for terminal PTY only |

### i18n Integration

| Existing Component | Integration |
|---|---|
| React components (34 files) | Wrap strings with `t()` calls incrementally |
| Settings page | Add language picker |
| Backend messages | Server-side i18next for error messages |

---

## What NOT to Add (Over-Engineering Warnings)

| Technology | Why NOT |
|---|---|
| **tRPC** | Redundant with TanStack Start's `createServerFn()` — same type-safe RPCs, built-in, no extra dependency |
| **Payload CMS** | Next.js-coupled, ships competing admin UI, CMS paradigm doesn't fit IDE |
| **Vercel AI SDK** | Duplicates OpenCode SDK, two streaming systems = maintenance nightmare |
| **GraphQL** | Over-engineered for single-client app. Server functions give same type safety with less complexity |
| **Electron** | Web-first architecture is correct for now. Desktop wrapper is a future concern |
| **Redux / Zustand** | TanStack Query handles server state. For client state, React context is sufficient for current scale |
| **Tailwind CSS** (if not already used) | Don't add mid-project. Stick with existing CSS approach |
| **Monorepo tooling** (Turborepo, Nx) | Not needed until multiple packages exist. Current flat structure works |
| **Docker** | Self-hosted via `npx`. Docker is a deployment concern for later |
| **Express.js** (new routes) | Stop writing Express routes. Use TanStack Start server functions + server routes instead |

---

## Team Development Readiness (Phase 4+)

The recommended stack supports parallel development:

| Concern | Solution |
|---|---|
| API contract conflicts | TanStack Start server functions — types flow automatically, no manual API spec |
| Database schema conflicts | Drizzle Kit — generates migration SQL files that merge cleanly |
| Translation conflicts | Namespaced JSON files — `editor.json`, `terminal.json` etc. merge independently |
| Component conflicts | Feature-based directory structure with lazy-loaded panels |
| Type safety across boundaries | Server functions + Drizzle + TypeScript strict — compile-time safety end-to-end |

---

## Sources

### Context7 (HIGH confidence)
- `@monaco-editor/react` — `/suren-atoyan/monaco-react` — Setup, DiffEditor, multi-model
- `xterm.js` — `/xtermjs/xterm.js` — AttachAddon, FitAddon, WebSocket integration
- `react-i18next` — `/i18next/react-i18next` — useTranslation, namespace support, TypeScript
- `TanStack Start` — `/websites/tanstack_start_framework_react` — Server functions, comparison
- `Payload CMS` — `/payloadcms/payload` — Collections, config, database setup
- `Vercel AI SDK` — `/vercel/ai` — useChat, Express adapter, streaming

### Official Documentation (HIGH confidence)
- TanStack Start v1 RC announcement (Sep 23, 2025): tanstack.com/blog/announcing-tanstack-start-v1
- TanStack Start SPA mode: tanstack.com/start/latest/docs/framework/react/guide/spa-mode
- TanStack Start server functions: tanstack.com/start/latest/docs/framework/react/guide/server-functions
- TanStack Start server routes: tanstack.com/start/latest/docs/framework/react/guide/server-routes
- byteiota (Feb 2, 2026): byteiota.com — "TanStack Start: React Framework Developers Switch From Next.js"
- Builder.io (Jan 20, 2026): builder.io/blog — "The React + AI Stack for 2026"
- InfoQ (Nov 7, 2025): infoq.com — "TanStack Start: A New Meta Framework Powered by React"
- Payload CMS "Using outside Next.js": payloadcms.com/docs/local-api/outside-nextjs
- node-pty npm (v1.1.0, Dec 2025): npmjs.com/package/node-pty
- react-i18next npm (v16.5.3, Jan 2026): npmjs.com/package/react-i18next

### Web Research (MEDIUM confidence, verified against official sources)
- TanStack Start stable release status: github.com/TanStack/router/discussions/5999
- Drizzle vs Prisma 2026 comparison: makerkit.dev/blog/tutorials/drizzle-vs-prisma
- @monaco-editor/react vs alternatives: npm-compare.com
- react-diff-viewer alternatives: npmtrends.com
- WebSocket vs SSE patterns 2026: Multiple articles (Jan 2026)
- @lydell/node-pty (1.5M weekly downloads): npmjs.com/package/@lydell/node-pty

### npm Stats (HIGH confidence, verified Feb 2026)
- @monaco-editor/react: 2,526,546 weekly downloads
- react-i18next: 4,800,000+ weekly downloads
- @xterm/xterm: Industry standard (used by VS Code, Theia, JupyterLab)
- drizzle-orm: 25,000+ GitHub stars, growing adoption
- @trpc/server: 35,000+ GitHub stars, 700K+ weekly downloads
