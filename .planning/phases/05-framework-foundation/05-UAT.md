---
status: diagnosed
phase: 05-framework-foundation
source: [05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-SUMMARY.md]
started: 2026-02-11T15:00:00Z
updated: 2026-02-11T15:20:00Z
---

## Current Test

[testing complete]

## Tests

### 1. TypeScript Compilation — App Directory (FND-01)
expected: Run `npx tsc --noEmit -p tsconfig.app.json` from project root. Should complete with zero errors.
result: pass

### 2. Production Build Script (FND-01)
expected: Run `npm run build:app` from project root. Vite builds without errors.
result: issue
reported: "npm error Missing script: 'build:app'. Script IS defined in package.json but npm doesn't find it."
severity: major

### 3. Existing Test Suite Unaffected (FND-01)
expected: Run `npm test` from project root. All test suites pass. Phase 5 changes caused zero test regressions.
result: pass

### 4. Dev Server Starts (FND-01)
expected: Run `npm run dev:app`. Vite dev server starts on port 5180. No crash.
result: pass
notes: Verified via CLI — Vite v7.3.1 starts in 1941ms, serves HTML at localhost

### 5. SPA Loads in Browser (FND-01)
expected: Open http://localhost:5180. TanStack Start SPA renders, routes work, UI visible.
result: pass
notes: User confirms UI loads. curl returns full HTML with dark class + React app shell.

### 6. File-Based Route Navigation (FND-01)
expected: Navigate to /tasks, /settings, /chat/new — each renders its route component. No 404s.
result: pass
notes: routeTree.gen.ts registers __root, /, /chat, /chat/$sessionId, /tasks, /settings

### 7. Tailwind v4 Dark Theme (FND-01)
expected: Dark background, light text, governance semantic colors.
result: pass
notes: HTML has class="dark", Tailwind v4 via @tailwindcss/vite plugin configured

### 8. Server Function Files with Typed APIs (FND-02)
expected: 5 server function files in app/server/ using createServerFn + .inputValidator() + .handler() pattern.
result: pass
notes: engine.ts(6), sessions.ts(9), config.ts(6), settings.ts(5), validators.ts — all use createServerFn

### 9. No Express Imports in App Code (FND-02)
expected: Zero Express imports in app/ directory.
result: pass
notes: grep -r "from.*express" app/ returns zero results

### 10. Engine Auto-Start via Root Route (FND-02)
expected: __root.tsx beforeLoad calls ensureEngineFn() so engine starts on any route load.
result: pass
notes: __root.tsx:53 — ensureEngineFn().catch(() => {})

### 11. SSE Chat Streaming Route — Files Exist (FND-03)
expected: Server route file exists with POST handler, SSE streaming, text/event-stream content type.
result: pass
notes: app/_server-routes/sessions.$id.prompt.ts — 138 LOC, POST handler with ReadableStream

### 12. SSE Global Events Route — Files Exist (FND-03)
expected: Server route file exists with GET handler, persistent SSE, "connected" event.
result: pass
notes: app/_server-routes/events.ts — 82 LOC, GET handler with sendEvent("connected", ...)

### 13. Streaming Hooks Exist (FND-03)
expected: useStreaming.ts with fetch+ReadableStream+abort. useEventStream.tsx with EventSource+reconnect.
result: pass
notes: useStreaming.ts(161 LOC), useEventStream.tsx — both exist with expected patterns

### 14. SSE Chat Streaming — Actually Reachable (FND-03)
expected: POST to /api/sessions/test/prompt returns SSE stream (not HTML 404).
result: issue
reported: "POST /api/sessions/test/prompt returns full HTML page (404 fallback). SSE route is unreachable — chat sends messages into the void, no AI response ever comes back."
severity: blocker

### 15. SSE Global Events — Actually Reachable (FND-03)
expected: GET /api/events returns SSE stream with text/event-stream content type.
result: issue
reported: "GET /api/events returns {error: 'Only HTML requests are supported here'} with HTTP 500. Events endpoint is dead."
severity: blocker

### 16. Drizzle Schema Defines Tables (FND-04)
expected: app/db/schema.ts with settings + workspace_config tables.
result: pass
notes: Both tables defined with correct columns

### 17. Database Auto-Creates on First Use (FND-04)
expected: app/db/index.server.ts with better-sqlite3 singleton, mkdirSync, WAL mode, .server.ts suffix.
result: pass
notes: All patterns present and verified

### 18. Drizzle Migration Infrastructure (FND-04)
expected: drizzle.config.ts at root + migration SQL in drizzle/.
result: pass
notes: drizzle.config.ts exists, drizzle/0000_white_slyde.sql has CREATE TABLE statements

### 19. Settings CRUD Server Functions (FND-04)
expected: 4 CRUD functions with createServerFn + inputValidator + Zod + Drizzle.
result: pass
notes: getSettingFn, setSettingFn, getAllSettingsFn, deleteSettingFn — all present

### 20. Shared Type Contracts (FND-04)
expected: engine-types.ts (standalone SDK types) + ide-types.ts (re-exports + domain types).
result: pass
notes: Both files exist with Session, Message, Part, Event, SessionStatus, SettingsEntry, WorkspaceConfig

## Summary

total: 20
passed: 16
issues: 3
pending: 0
skipped: 0

## Gaps

- truth: "npm run build:app builds successfully"
  status: failed
  reason: "User reported: npm error Missing script: 'build:app'. Script IS defined in package.json but npm doesn't find it."
  severity: major
  test: 2
  root_cause: "npm script cache stale — script exists in package.json but npm doesn't see it. Likely needs npm install to refresh or node_modules/.package-lock.json is outdated."
  artifacts:
    - path: "package.json"
      issue: "build:app script defined but not recognized by npm"
  missing:
    - "Run npm install to refresh script cache, verify script works after"
  debug_session: ""

- truth: "POST /api/sessions/$id/prompt returns SSE stream for chat"
  status: failed
  reason: "POST /api/sessions/test/prompt returns full HTML page (404 fallback). SSE route is unreachable — chat sends messages into the void, no AI response ever comes back."
  severity: blocker
  test: 14
  root_cause: "SSE server routes live in app/_server-routes/ — the underscore prefix tells TanStack Router to EXCLUDE this directory from the route tree. routeTree.gen.ts confirms: no /api/* routes registered. useStreaming.ts:72 fetches /api/sessions/${sessionId}/prompt which hits TanStack's SSR fallback and returns HTML."
  artifacts:
    - path: "app/_server-routes/sessions.$id.prompt.ts"
      issue: "File exists but directory is excluded by TanStack Router underscore convention"
    - path: "app/routeTree.gen.ts"
      issue: "No /api/* routes in generated tree — only __root, /, /chat, /chat/$sessionId, /tasks, /settings"
    - path: "app/hooks/useStreaming.ts"
      issue: "Line 72: fetch('/api/sessions/${sessionId}/prompt') hits 404"
  missing:
    - "Move SSE route files from app/_server-routes/ to app/routes/api/ so TanStack Router registers them"
    - "Verify routeTree.gen.ts regenerates with /api/sessions/$id/prompt and /api/events paths"
    - "Confirm useStreaming.ts fetch path matches the registered route"
  debug_session: ""

- truth: "GET /api/events returns SSE stream for global events"
  status: failed
  reason: "GET /api/events returns {error: 'Only HTML requests are supported here'} with HTTP 500. Events endpoint is dead."
  severity: blocker
  test: 15
  root_cause: "Same root cause as Test 14 — app/_server-routes/events.ts is excluded by underscore prefix convention. TanStack Router never registers /api/events route."
  artifacts:
    - path: "app/_server-routes/events.ts"
      issue: "File exists but directory excluded by TanStack Router underscore convention"
  missing:
    - "Move to app/routes/api/events.ts alongside the chat SSE route fix"
  debug_session: ""
