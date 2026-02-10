---
status: diagnosed
phase: 05-framework-foundation
source: [05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-SUMMARY.md]
started: 2026-02-10T22:30:00Z
updated: 2026-02-11T12:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Dev Server Starts and SPA Loads
expected: Run `cd app && npm run dev`. Browser opens at localhost. TanStack Start SPA loads. `/` redirects to `/chat/new`. No console errors about missing modules.
result: issue
reported: "Black screen (original), then eternal spinner after fix attempt (commit 8f31b48). Router stuck in pending state — no route component ever renders."
severity: blocker
root_cause: |
  Multi-layered SPA hydration failure:
  1. ssr.tsx added as "fix" — creates SSR handler (createStartHandler + defaultStreamHandler)
  2. routeTree.gen.ts auto-generates `ssr: true` because ssr.tsx exists, contradicting spa.enabled=true
  3. Router gets DefaultPendingComponent with defaultPendingMs:0 — spinner shows immediately
  4. index.tsx throws redirect() in beforeLoad during hydration — SSR shell prerenders `/` with pending state, then client redirect causes hydration mismatch
  5. Router locks in pending state forever, never resolves to route components
  Original cause (client.tsx using getElementById("root")) was partially fixed but replaced with this deeper issue.

### 2. File-Based Route Navigation
expected: With dev server running, manually navigate to `/tasks` and `/settings` in browser URL bar. Each renders its page without 404. Back button works. URL matches route.
result: issue
reported: "Cannot test — SPA never renders past spinner. Router pending state blocks all route resolution."
severity: blocker

### 3. Engine Auto-Start on Load
expected: When the SPA first loads, the engine should auto-start via `beforeLoad` in the root route. Check the terminal/server logs — you should see the SDK client attempting to connect to OpenCode.
result: issue
reported: "Root beforeLoad fires but ensureEngineFn() is fire-and-forget — no way to verify it worked from UI since routes never render. Engine may start but UI can't show it."
severity: major

### 4. SSE Chat Streaming Route
expected: With dev server running, try `curl -X POST http://localhost:5180/api/sessions/test/prompt -H 'Content-Type: application/json' -d '{\"prompt\":\"hello\"}'`. Should get SSE response headers. Should NOT get 404.
result: skipped
reason: Deferred — SSE routes may work server-side but were not independently verified. Requires SPA fix first to test full E2E flow.

### 5. SSE Global Events Route
expected: With dev server running, try `curl http://localhost:5180/api/events`. Should get SSE response headers and keep connection open. Should NOT get 404.
result: skipped
reason: Same as Test 4.

### 6. TypeScript Clean for App Directory
expected: Run `npx tsc --noEmit -p tsconfig.app.json` from project root. Should complete with zero errors.
result: pass

### 7. Drizzle Migration Exists
expected: Check `drizzle/0000_white_slyde.sql` exists and contains CREATE TABLE statements for `settings` and `workspace_config` tables.
result: pass

### 8. Existing Test Suite Still Passes
expected: Run `npm test` from project root. All 10 test suites pass with 466+ assertions. No regressions from Phase 5 changes.
result: pass

## Summary

total: 8
passed: 3
issues: 3
pending: 0
skipped: 2

## Gaps

- truth: "TanStack Start SPA loads when dev server starts"
  status: failed
  reason: "User reported: Black screen replaced by eternal spinner after fix attempt. Router stuck in pending state."
  severity: blocker
  test: 1
  root_cause: |
    SPA/SSR mode conflict: ssr.tsx triggers `ssr: true` in auto-generated route tree, contradicting
    spa.enabled=true in vite config. Router receives SSR-prerendered pending shell but client-side
    hydration never transitions past pending because: (a) index route throws redirect() during
    beforeLoad which causes hydration mismatch, (b) ssr: true tells router to expect dehydrated
    server data that doesn't exist in SPA mode.
  artifacts:
    - path: "app/ssr.tsx"
      issue: "Full SSR handler added for SPA-mode app — contradicts spa.enabled=true"
    - path: "app/routeTree.gen.ts"
      issue: "Auto-generates ssr: true because ssr.tsx exists"
    - path: "app/routes/index.tsx"
      issue: "throw redirect() in beforeLoad causes hydration mismatch during SSR shell"
    - path: "app/router.tsx"
      issue: "defaultPendingMs: 0 + DefaultPendingComponent shows spinner immediately, never transitions"
    - path: "app/routes/__root.tsx"
      issue: "beforeLoad calls ensureEngineFn() fire-and-forget — may interfere with hydration"
  missing:
    - "Fix SPA hydration: either remove ssr.tsx and use pure client-side SPA, or properly configure SSR mode"
    - "Fix index route: redirect should not throw during hydration — use navigate or component-level redirect"
    - "Validate TanStack Start SPA mode against latest docs — current setup follows no documented pattern"
  blocked_tests: [2, 3]

- truth: "File-based routing resolves routes and renders components"
  status: failed
  reason: "Router stuck in pending — no route component ever renders"
  severity: blocker
  test: 2
  root_cause: "Same root cause as Test 1 — SPA/SSR hydration conflict"
  artifacts: []
  missing: []

- truth: "Engine auto-starts and UI reflects connection status"
  status: failed
  reason: "Engine may start server-side but UI never renders to show status"
  severity: major
  test: 3
  root_cause: "Blocked by Test 1 SPA failure + fire-and-forget ensureEngineFn has no UI feedback path"
  artifacts:
    - path: "app/routes/__root.tsx"
      issue: "ensureEngineFn() result is discarded — no state update for UI to consume"
  missing:
    - "Engine start result needs to be observable by UI components (React Query mutation or state)"
