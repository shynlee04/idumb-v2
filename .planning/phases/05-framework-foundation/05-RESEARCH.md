# Phase 5: Framework Foundation — Research

**Date:** 2026-02-10
**Status:** Complete (validated)
**Purpose:** Technical research to inform PLAN.md authoring for Phase 5
**Validation:** All API patterns verified against context7 docs, deepwiki codebase analysis, npm registry, and GitHub releases on 2026-02-10.

---

## 1. TanStack Start SPA Mode

### What SPA Mode Is
TanStack Start's SPA mode completely disables server-side rendering. Static HTML containing the application shell is shipped to users, and the application bootstraps entirely on the client via JavaScript. This is our target — no SSR, no pre-rendering.

### Configuration (Vite)
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'

export default defineConfig({
  plugins: [
    tanstackStart({
      spa: {
        enabled: true,
      },
    }),
  ],
})
```

### Key Facts
- **Package name:** `@tanstack/react-start` (NOT `@tanstack/start` — that's deprecated at v1.120.20)
- **Vite plugin import:** `{ tanstackStart }` from `@tanstack/react-start/plugin/vite` — **named export**, not default
- **Config file:** `vite.config.ts` (NOT `app.config.ts`)
- **Source folder:** `src/` convention (NOT `app/`). Configurable via `srcDirectory` option
- **Current version:** RC v1.159.5 (published 2026-02-09). Still RC — no GA release yet
- **SPA mode:** `spa: { enabled: true }` in the tanstackStart plugin config
- **SSR is off globally** in SPA mode — no server-side component rendering
- **Server functions still work** in SPA mode — they execute on the server, called via RPC from the client
- **Server routes still work** — for SSE, webhooks, raw HTTP endpoints
- **Selective SSR:** Per-route `ssr: false` also exists but we want global SPA mode
- **Repository:** TanStack Start lives inside `tanstack/router` GitHub repo, not a separate repo

### Subpath Exports (validated from package.json)
- `.` (main)
- `./client`, `./client-rpc`
- `./server`, `./server-rpc`
- `./ssr-rpc`
- `./plugin/vite`
- `./server-entry`
- `./package.json`
- **NO `./api` subpath** — `@tanstack/react-start/api` does not exist

### File-Based Routing
Routes live in `src/routes/`. TanStack Router generates `routeTree.gen.ts` automatically.

```
src/routes/
├── __root.tsx          # Root layout (replaces AppShell)
├── index.tsx           # / route
├── chat.tsx            # /chat layout
├── chat.$sessionId.tsx # /chat/:sessionId
├── tasks.tsx           # /tasks layout
├── tasks.$taskId.tsx   # /tasks/:taskId
└── settings.tsx        # /settings
```

### Server Routes (for SSE)
Server routes use `createFileRoute` from `@tanstack/react-router` with `server.handlers`:

```typescript
// src/routes/api/events.ts
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/events')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        return new Response(sseStream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          }
        })
      }
    }
  }
})
```

**CRITICAL:** There is no `createServerFileRoute` function. That name never existed in the codebase (confirmed by deepwiki source analysis). The `server.handlers` property on `createFileRoute` is the only API for server-only HTTP endpoints.

---

## 2. Server Functions

### Creating Server Functions
```typescript
import { createServerFn } from '@tanstack/react-start'

// GET (default)
export const getStatus = createServerFn().handler(async () => {
  return { running: true }
})

// POST
export const startEngine = createServerFn({ method: 'POST' }).handler(async () => {
  // server-only logic
  return { success: true }
})

// With input validation
export const createSession = createServerFn({ method: 'POST' })
  .validator((d: { name: string }) => d)
  .handler(async ({ data }) => {
    return { session: await sdk.createSession(data.name) }
  })
```

### Server-Only Functions
```typescript
import { createServerOnlyFn } from '@tanstack/react-start'

// Crashes if called from client — use for pure server utilities
export const readEnvSecret = createServerOnlyFn().handler(async () => {
  return process.env.SECRET_KEY
})
```

### Streaming from Server Functions
```typescript
const streamChat = createServerFn({ method: 'POST' })
  .handler(async () => {
    const stream = new ReadableStream<Message>({
      async start(controller) {
        for (const message of messages) {
          controller.enqueue(message)
        }
        controller.close()
      },
    })
    return stream
  })
```

**WARNING:** Server function streaming uses NDJSON internally, which has an active bug (#6604) causing JSON parsing errors at buffer boundaries. See Section 3 and Risk Assessment. For SSE, use **server routes** instead.

### Known Issues to Avoid
1. **Redirects return undefined** — always check return value
2. **File uploads load entirely into memory** — not relevant for us
3. **Middleware doesn't catch server function errors** — wrap handlers in try/catch
4. **NDJSON streaming bug** (#6604) — server function streaming can fail at buffer boundaries. Fix PR #6613 is open. Maintainer note: "NDJSON will be gone soon"

---

## 3. SSE Streaming Pattern

The current `server.ts` uses Express SSE for two endpoints:
1. `/api/sessions/:id/prompt` — Chat response streaming (per-session)
2. `/api/events` — Global event relay

### Current SSE Implementation (Express)
```typescript
// server.ts line ~850
app.post('/api/sessions/:id/prompt', async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })
  // Subscribe to OpenCode SDK events
  const subscription = client.event.subscribe()
  for await (const event of subscription) {
    res.write(`data: ${JSON.stringify(event)}\n\n`)
  }
})
```

### TanStack Start SSE Approach
Use **server routes** (not server functions) for SSE — server functions are RPC-style and use NDJSON internally, which has known bugs with streaming.

Server routes are **pass-through** — the Response object is returned as-is to the client. This means `text/event-stream` responses work exactly like they would in Express, without any NDJSON wrapping.

```typescript
// src/routes/api/sessions.$id.prompt.ts
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/sessions/$id/prompt')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const { id } = params
        const body = await request.json()
        // Create SSE response
        const stream = new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder()
            // Subscribe to OpenCode SDK events for this session
            // ...
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
          }
        })
        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
          }
        })
      }
    }
  }
})
```

### SSE Validation Status
**VALIDATED as Low risk.** Server routes are pass-through — they return raw `Response` objects without any framework transformation. The NDJSON bug (#6604) only affects server function streaming, NOT server routes. SSE via server routes is architecturally identical to Express SSE (raw Response with `text/event-stream`).

---

## 4. Drizzle ORM + SQLite

### Schema Definition
```typescript
// src/db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
})

export const workspaceConfig = sqliteTable('workspace_config', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectDir: text('project_dir').notNull().unique(),
  name: text('name'),
  lastOpened: integer('last_opened', { mode: 'timestamp' }),
  config: text('config'), // JSON blob
})
```

### Drizzle Config
```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: './data/idumb.db',
  },
})
```

**NOTE:** The old `satisfies Config` pattern is replaced by `defineConfig()` from `drizzle-kit`. No `driver` field is needed for better-sqlite3.

### Migrations
```bash
npx drizzle-kit generate  # Creates SQL migration files
npx drizzle-kit migrate   # Applies migrations
```

### Client Setup
```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import * as schema from './schema'

const sqlite = new Database('./data/idumb.db')
export const db = drizzle({ client: sqlite, schema })
```

**NOTE:** The old positional argument pattern `drizzle(sqlite, { schema })` is replaced by `drizzle({ client: sqlite, schema })`. This is the current API as of drizzle-orm v0.45.1.

### Version Pinning
- `drizzle-orm`: **0.45.1** (stable, on npm `latest` tag). v1.0.0-beta.15 exists but is NOT on `latest`
- `drizzle-kit`: **0.31.9** (stable)
- `better-sqlite3`: **12.6.2** latest; drizzle tests against 11.9.1. Our existing `^11.10.0` is compatible

### Decision: Task Persistence
**Recommendation:** Keep JSON files via StateManager for now. Rationale:
- Tasks are already working with StateManager
- Migration to Drizzle can happen in Phase 6-8 when features rebuild
- Phase 5 focuses on settings + workspace config in Drizzle (new tables, no migration risk)
- JSON files are transparent and debuggable during rapid iteration

### Decision: Database Location
**Recommendation:** Per-project at `.idumb/data/idumb.db`. Rationale:
- Aligns with existing `.idumb/` directory structure
- Each project gets isolated state
- No user-level config collision
- `.idumb/` is already in the project, so the DB lives next to its data

---

## 5. Current Codebase Mapping (What Migrates)

### Express Routes → TanStack Server Functions/Routes

| Express Route | Method | Migration Target | Plan |
|---|---|---|---|
| `/api/health` | GET | Server function | 05-02 |
| `/api/providers` | GET | Server function | 05-02 |
| `/api/agents` | GET | Server function | 05-02 |
| `/api/config` | GET | Server function | 05-02 |
| `/api/app` | GET | Server function | 05-02 |
| `/api/engine/status` | GET | Server function | 05-02 |
| `/api/engine/start` | POST | Server function | 05-02 |
| `/api/engine/stop` | POST | Server function | 05-02 |
| `/api/engine/restart` | POST | Server function | 05-02 |
| `/api/sessions` | GET/POST | Server function | 05-02 |
| `/api/sessions/:id` | GET/DELETE | Server function | 05-02 |
| `/api/sessions/:id/messages` | GET | Server function | 05-02 |
| `/api/sessions/:id/abort` | POST | Server function | 05-02 |
| `/api/sessions/:id/status` | GET | Server function | 05-02 |
| `/api/sessions/:id/children` | GET | Server function | 05-02 |
| `/api/sessions/:id/prompt` | POST | **Server route (SSE)** | 05-02 |
| `/api/events` | GET | **Server route (SSE)** | 05-02 |
| `/api/tasks` | GET | Server function | Deferred (Phase 7) |
| `/api/tasks/history` | GET | Server function | Deferred (Phase 7) |
| `/api/tasks/:id` | GET | Server function | Deferred (Phase 7) |
| `/api/governance` | GET | Server function | Deferred (Phase 7) |
| `/api/graph` | GET | Server function | Deferred |
| `/api/brain` | GET | Server function | Deferred |
| `/api/delegations` | GET | Server function | Deferred |
| `/api/scan` | GET | Server function | Deferred |
| `/api/codemap` | GET | Server function | Deferred |
| `/api/artifacts` | GET/PUT | Server function | Deferred |
| `/api/artifacts/content` | GET/PUT | Server function | Deferred |
| `/api/artifacts/metadata` | GET | Server function | Deferred |
| `/api/comments` | GET/POST/PUT/DELETE | Server function | Deferred |
| WebSocket `/ws` | WS | **Keep standalone WS** | 05-02 |

### Phase 5 Critical Path (Functional Proof)
Only these must work end-to-end:
1. Engine start/stop/status
2. Session create/list/get/delete
3. Chat prompt (SSE streaming)
4. Global event relay (SSE)

### Frontend Components → TanStack Routes
| Current Component | Current Route | New Route File |
|---|---|---|
| `AppShell.tsx` | Layout wrapper | `__root.tsx` |
| `ChatPage.tsx` | `/chat/:sessionId?` | `chat.$sessionId.tsx` |
| Everything else | Various | Deferred to Phase 6-8 |

For Phase 5, only the chat interface needs to work. Other pages are deferred.

---

## 6. Unified Dev Command

### Requirements
- One command starts everything
- TanStack Start dev server (Vite) handles both frontend and server functions
- OpenCode engine auto-starts on dev server boot

### Architecture
```
npm run dev
  └── vite dev (TanStack Start)
        ├── Serves SPA (frontend)
        ├── Server functions (engine control, sessions, etc.)
        ├── Server routes (SSE streaming)
        └── On startup hook: auto-start OpenCode engine
```

### Implementation
The existing `engine.ts` module handles engine lifecycle. It can be imported directly in server functions. Auto-start can be triggered from the root route's server-side loader or a startup script.

---

## 7. Monaco Worker Configuration

### Vite Plugin for Monaco
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import monacoEditorPlugin from 'vite-plugin-monaco-editor'

export default defineConfig({
  plugins: [
    tanstackStart({ spa: { enabled: true } }),
    monacoEditorPlugin({
      languageWorkers: ['editorWorkerService', 'typescript', 'json', 'css', 'html'],
    }),
  ],
})
```

**Note:** Monaco is needed for Phase 6 (IDE shell) but the Vite plugin should be configured in Phase 5's scaffold to avoid rework.

---

## 8. Middleware

### Overview
TanStack Start provides a middleware system via `createMiddleware` for cross-cutting concerns (logging, auth, CORS).

### Types of Middleware
1. **Request middleware** (`requestMiddleware`) — runs on ALL incoming requests (server functions, server routes, SSR pages)
2. **Function middleware** (`functionMiddleware`) — runs only on server function calls

### Global Middleware Configuration
```typescript
// src/start.ts
import { createStart } from '@tanstack/react-start'

export default createStart({
  requestMiddleware: [loggingMiddleware, corsMiddleware],
  functionMiddleware: [authMiddleware],
})
```

### Creating Middleware
```typescript
import { createMiddleware } from '@tanstack/react-start'

const loggingMiddleware = createMiddleware().handler(async ({ next }) => {
  console.log('Request received')
  const result = await next()
  return result
})
```

### Context Passing (sendContext)
Middleware can pass context to downstream handlers using `sendContext`:
```typescript
const authMiddleware = createMiddleware()
  .handler(async ({ next, sendContext }) => {
    const user = await validateAuth()
    return next({ sendContext: { user } })
  })
```

### Server Route Middleware
Server routes support per-route middleware via the `server.middleware` property:
```typescript
export const Route = createFileRoute('/api/protected')({
  server: {
    middleware: [authMiddleware],
    handlers: {
      GET: async ({ context }) => {
        // context.user available from middleware
        return Response.json({ user: context.user })
      }
    }
  }
})
```

### Decision for Phase 5
Use `requestMiddleware` for CORS (replacing `cors` npm package). Auth middleware is deferred — no auth in Phase 5.

---

## 9. Adapter / Deployment

### Runtime Architecture
TanStack Start is migrating its server runtime from **Nitro** to **srvx** (a lighter-weight server framework). This migration is in progress — some releases reference srvx internals (e.g., `FastResponse`).

### Node Server Adapter
For development and self-hosted deployment, TanStack Start uses the `node-server` preset:
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [
    tanstackStart({
      spa: { enabled: true },
      // Node server is the default for dev
    }),
  ],
})
```

### WebSocket Considerations
TanStack Start's server abstraction does not expose the raw HTTP server needed for WebSocket upgrades. Options for terminal PTY WebSocket:
1. **Separate WS server on different port** — simplest, cleanest isolation
2. **Vite plugin** that hooks into the dev server's `httpServer` for WS upgrades
3. **Standalone ws server** colocated in the same process

**Decision:** Keep standalone WS server (option 1 or 3) — same approach as current Express implementation. WebSocket is only used for terminal PTY, which is Phase 7.

---

## 10. Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| TanStack Start is RC, not GA | Medium | v1.159.5 is actively maintained; we're SPA-only which exercises the simplest code path |
| SSE via server routes in SPA mode | **Low** | **VALIDATED** — server routes are pass-through, Response objects returned as-is. No NDJSON wrapping |
| NDJSON streaming bug (#6604) | Medium | Only affects server function streaming, NOT server routes. We use server routes for SSE. Fix PR #6613 open. Maintainer says "NDJSON will be gone soon" |
| Drizzle + better-sqlite3 compatibility | Low | Both are mature; drizzle-orm 0.45.1 tests against better-sqlite3 11.9.1 |
| 22+ existing components may break on import | Medium | Wrap in TanStack routes; components are React — framework-agnostic |
| WebSocket needs standalone server | Medium | WS can run on separate port or attach to Vite's HTTP server via plugin |
| Nitro → srvx migration in progress | Low | Internal runtime detail; our SPA + server functions + server routes API surface is stable |

---

## 11. Dependencies to Add

```json
{
  "dependencies": {
    "@tanstack/react-start": "^1.159.5",
    "@tanstack/react-router": "^1.159.5",
    "drizzle-orm": "^0.45.1",
    "better-sqlite3": "^11.10.0"
  },
  "devDependencies": {
    "@tanstack/router-cli": "^1.159.5",
    "drizzle-kit": "^0.31.9",
    "vite": "^6.1.0",
    "vite-plugin-monaco-editor": "^1.1.0"
  }
}
```

**Dependencies to REMOVE:**
- `express`
- `@types/express`
- `cors`
- `@types/cors`

**Dependencies to KEEP:**
- `ws` + `@types/ws` (WebSocket for terminal PTY, standalone)
- `better-sqlite3` (used by Drizzle — bump to match Drizzle's tested range)
- `chokidar` (file watching — evaluate if still needed)
- `open` (browser opening)

---

## 12. Discretion Decisions Summary

| Area | Decision | Rationale |
|---|---|---|
| Task persistence | Keep JSON/StateManager | No migration risk; Drizzle for new tables only |
| Settings persistence | Drizzle `settings` table | Key-value pairs, simple schema, enables Phase 1B |
| Workspace config | Drizzle `workspace_config` table | Per-project metadata, clean relational model |
| SQLite location | `.idumb/data/idumb.db` | Aligns with project-scoped `.idumb/` convention |
| Hot-reload | Vite HMR default | TanStack Start handles this via Vite plugin |
| Monaco workers | `vite-plugin-monaco-editor` | Configure in scaffold, actual Monaco usage in Phase 6 |
| CORS | `requestMiddleware` in start.ts | Replaces `cors` npm package cleanly |
| WebSocket | Standalone server | TanStack Start doesn't expose raw HTTP server for WS upgrades |

---

## 13. Validation Changelog

Changes made during validation (2026-02-10):

| # | What Changed | Old Value | New Value | Source |
|---|---|---|---|---|
| 1 | TanStack Start version | v1.154.0 | v1.159.5 | npm registry |
| 2 | Vite plugin import | `import tanstackStart from '@tanstack/start-vite'` | `import { tanstackStart } from '@tanstack/react-start/plugin/vite'` | context7 docs + npm subpath exports |
| 3 | Server route API | `createServerFileRoute` from `@tanstack/react-start/api` | `createFileRoute` from `@tanstack/react-router` with `server.handlers` | deepwiki codebase analysis |
| 4 | Drizzle config pattern | `satisfies Config` | `defineConfig()` from `drizzle-kit` | drizzle-kit docs |
| 5 | Drizzle client constructor | `drizzle(sqlite, { schema })` | `drizzle({ client: sqlite, schema })` | drizzle-orm docs |
| 6 | Dependency versions | `"latest"` for most packages | Pinned semver ranges | npm registry |
| 7 | Route mapping | 28 routes | 32 routes (added 4 missing) | server.ts grep |
| 8 | SSE risk severity | High | Low (validated) | deepwiki + context7 |
| 9 | New section: Middleware | — | Section 8 added | context7 docs |
| 10 | New section: Adapter | — | Section 9 added | deepwiki |
| 11 | Server function validator | `.inputValidator()` | `.validator()` | context7 docs (v1.159.5) |
