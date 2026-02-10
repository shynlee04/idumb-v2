---
status: investigating
trigger: "Phase 5 Black Screen — TanStack Start SPA: http://localhost:5180/ shows completely black/blank screen"
created: 2026-02-10T00:00:00Z
updated: 2026-02-10T00:00:00Z
---

## Current Focus

hypothesis: "Index route's `throw redirect()` in beforeLoad prevents SSR from rendering any component content during SPA shell generation"
test: "Read all route files, check if beforeLoad redirect fires during SSR shell pass, verify chat target route exists"
expecting: "SSR shell pass runs beforeLoad → redirect throws → no component renders → empty suspense boundaries"
next_action: "Read chat.$sessionId route to verify target exists, then apply fix to index.tsx"

## Symptoms

expected: Browser shows dashboard UI (sidebar, chat area) at http://localhost:5180/
actual: Completely black/blank screen — no UI content visible
errors: No console errors (silent failure). SSR body contains only `<!--$--><!--$--><!--/$--><!--/$-->` (empty React suspense boundaries)
reproduction: `npm run dev:app` → browse to http://localhost:5180/
started: Since TanStack Start migration (Phase 5)

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-02-10T00:01:00Z
  checked: "vite.config.ts"
  found: "SPA mode enabled: `spa: { enabled: true }` in tanstackStart plugin. Both react() and tanstackStart() plugins present."
  implication: "SPA shell SSR still runs to generate initial HTML shell"

- timestamp: 2026-02-10T00:01:00Z
  checked: "routeTree.gen.ts"
  found: "Registers `ssr: true` in module declaration. Routes: /, /tasks, /settings, /chat/$sessionId, /api/events, /api/sessions/$id/prompt"
  implication: "SSR is active even in SPA mode — route beforeLoad WILL run during SSR"

- timestamp: 2026-02-10T00:01:00Z
  checked: "routes/index.tsx"
  found: "`throw redirect({ to: '/chat/$sessionId', params: { sessionId: 'new' } })` in beforeLoad — this throws during SSR"
  implication: "SSR receives redirect throw → no component renders for this route → Outlet produces nothing → empty body"

- timestamp: 2026-02-10T00:01:00Z
  checked: "__root.tsx"
  found: "beforeLoad calls ensureEngineFn() (server fn) with catch block. RootComponent wraps Outlet in QueryClientProvider + EventStreamProvider"
  implication: "Server fn call may silently fail during SSR but error is caught — not the primary cause"

## Resolution

root_cause: (investigating — H1: redirect in index.tsx beforeLoad blocks SSR render)
fix:
verification:
files_changed: []
