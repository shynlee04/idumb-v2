---
status: resolved
trigger: "Phase 5 Black Screen — TanStack Start SPA: http://localhost:5180/ shows completely black/blank screen"
created: 2026-02-10T00:00:00Z
updated: 2026-02-10T01:00:00Z
---

## Current Focus

hypothesis: CONFIRMED — compound failure: missing ssr.tsx + no pending component + blocking beforeLoad
test: Server starts, SSR body has content, client JS loads, tests pass, TypeScript clean
expecting: N/A — resolved
next_action: N/A — resolved

## Symptoms

expected: Browser shows dashboard UI (sidebar, chat area) at http://localhost:5180/
actual: Completely black/blank screen — no UI content visible
errors: No console errors (silent failure). SSR body contains only `<!--$--><!--$--><!--/$--><!--/$-->` (empty React suspense boundaries)
reproduction: `npm run dev:app` → browse to http://localhost:5180/
started: Since TanStack Start migration (Phase 5)

## Eliminated

- hypothesis: "react() plugin conflict with tanstackStart()"
  evidence: "Removing react() causes ReferenceError: React is not defined at __root.tsx:52 during SSR — both plugins needed"
  timestamp: 2026-02-10 (pre-investigation by verifier)

- hypothesis: "EventStreamProvider SSR failure"
  evidence: "EventSource creation is in useEffect (client-only), Provider context init is trivial. Not the cause."
  timestamp: 2026-02-10

- hypothesis: ".server.ts stripping failure"
  evidence: "TanStack Start handles .server.ts correctly with srcDirectory: '.'. Server log shows no bundling errors."
  timestamp: 2026-02-10

## Evidence

- timestamp: 2026-02-10T00:01:00Z
  checked: "glob app/ssr.tsx"
  found: "File does not exist — 'No files found'"
  implication: "start.ts references ssr.tsx but it was never created. SPA shell generation is degraded."

- timestamp: 2026-02-10T00:01:00Z
  checked: "router.tsx"
  found: "No defaultPendingComponent configured"
  implication: "In SPA mode, TanStack Start renders the pending fallback as the shell HTML. With no pending component, shell body is empty."

- timestamp: 2026-02-10T00:01:00Z
  checked: "__root.tsx beforeLoad"
  found: "`await ensureEngineFn()` — async server function call blocks router initialization"
  implication: "If OpenCode SDK isn't running, this RPC hangs indefinitely, preventing client-side router from ever rendering."

- timestamp: 2026-02-10T00:02:00Z
  checked: "TanStack Start v1.159.5 source: start-plugin-core/start-router-plugin/plugin.js"
  found: "Runtime imports `getRouter` by exact name via #tanstack-router-entry virtual module"
  implication: "Router factory MUST be exported as `getRouter` (not `createRouter`)"

- timestamp: 2026-02-10T00:03:00Z
  checked: "TanStack Start v1.159.5 default-entry/server.ts"
  found: "`createStartHandler(defaultStreamHandler)` is the minimal SSR entry pattern"
  implication: "ssr.tsx should follow this exact pattern"

- timestamp: 2026-02-10T00:04:00Z
  checked: "curl http://localhost:5180/ after fix"
  found: "Body has rendered content (div elements, Loading spinner, client JS entry). Not empty."
  implication: "Fix confirmed — SSR shell now produces visible HTML"

## Resolution

root_cause: |
  COMPOUND FAILURE (3 contributing causes):
  
  1. MISSING SSR ENTRY (ssr.tsx): TanStack Start's Vite plugin needs ssr.tsx even in SPA mode
     to generate the prerendered shell HTML. Without it, shell generation was degraded to
     minimal empty suspense boundaries.
  
  2. NO DEFAULT PENDING COMPONENT: In SPA mode, TanStack Start renders the router's
     `defaultPendingComponent` as the shell HTML (since no actual route is resolved during
     prerendering). With no pending component configured, the shell body was completely empty.
  
  3. BLOCKING SERVER FUNCTION IN ROOT beforeLoad: `await ensureEngineFn()` in __root.tsx
     made an RPC call to start the OpenCode SDK engine. If the SDK wasn't available, this
     call would hang indefinitely, blocking the ENTIRE router from initializing on the client
     side. Combined with #2, nothing ever rendered.

fix: |
  1. Created `app/ssr.tsx` — standard SSR entry using `createStartHandler(defaultStreamHandler)`
  2. Added `defaultPendingComponent` (loading spinner) and `defaultNotFoundComponent` (404 page)
     to router config in `app/router.tsx`
  3. Changed `__root.tsx` beforeLoad from `await ensureEngineFn()` to fire-and-forget
     (non-blocking, client-only, with error catch)

verification: |
  - curl http://localhost:5180/ → Body has rendered content (divs, Loading text, client JS entry)
  - Body is NOT empty (was previously just <!--$--><!--/$--> suspense boundaries)
  - Server starts cleanly, zero errors in log
  - npm test → 79/79 pass
  - tsc --noEmit → clean (zero errors)

files_changed:
  - app/ssr.tsx (CREATED)
  - app/router.tsx (MODIFIED — added DefaultPendingComponent, DefaultNotFoundComponent, defaultPendingMs: 0)
  - app/routes/__root.tsx (MODIFIED — changed beforeLoad from blocking await to fire-and-forget)
