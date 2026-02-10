---
status: testing
phase: 05-framework-foundation
source: [05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-SUMMARY.md]
started: 2026-02-10T22:30:00Z
updated: 2026-02-10T23:00:00Z
---

## Current Test

[non-UI tests complete — UI tests blocked by Test 1 blocker]

## Tests

### 1. Dev Server Starts and SPA Loads
expected: Run `cd app && npm run dev`. Browser opens at localhost. TanStack Start SPA loads. `/` redirects to `/chat/new`. No console errors about missing modules.
result: issue
reported: "ptch black of nothing"
severity: blocker
root_cause: |
  app/client.tsx line 12: `hydrateRoot(document.getElementById("root")!, <StartClient />)`
  TanStack Start renders full <html> via RootDocument — no <div id="root"> exists in DOM.
  getElementById("root") returns null, ! assertion passes null through, hydrateRoot(null, ...) fails silently.
  Confirmed via Context7 TanStack Start docs: correct pattern is `hydrateRoot(document, <StartClient />)`.

### 2. File-Based Route Navigation
expected: With dev server running, manually navigate to `/tasks` and `/settings` in browser URL bar. Each renders its page without 404. Back button works. URL matches route.
result: skipped
reason: Blocked by Test 1 blocker (black screen)

### 3. Engine Auto-Start on Load
expected: When the SPA first loads, the engine should auto-start via `beforeLoad` in the root route. Check the terminal/server logs — you should see the SDK client attempting to connect to OpenCode.
result: skipped
reason: Blocked by Test 1 blocker (black screen)

### 4. SSE Chat Streaming Route
expected: With dev server running, try `curl -X POST http://localhost:5180/api/sessions/test/prompt -H 'Content-Type: application/json' -d '{"prompt":"hello"}'`. Should get SSE response headers. Should NOT get 404.
result: skipped
reason: Blocked by Test 1 blocker (black screen — SSE routes may still work independently, but testing deferred to post-fix)

### 5. SSE Global Events Route
expected: With dev server running, try `curl http://localhost:5180/api/events`. Should get SSE response headers and keep connection open. Should NOT get 404.
result: skipped
reason: Blocked by Test 1 blocker (same as Test 4)

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
issues: 1
pending: 0
skipped: 4

## Gaps

- truth: "TanStack Start SPA loads when dev server starts"
  status: failed
  reason: "User reported: ptch black of nothing"
  severity: blocker
  test: 1
  root_cause: |
    app/client.tsx line 12: `hydrateRoot(document.getElementById("root")!, <StartClient />)`
    TanStack Start renders full <html> via RootDocument — no <div id="root"> exists in DOM.
    getElementById("root") returns null, ! assertion passes null through, hydrateRoot(null, ...) fails silently.
    Confirmed via Context7 TanStack Start docs: correct pattern is `hydrateRoot(document, <StartClient />)`.
  artifacts:
    - path: "app/client.tsx"
      issue: "Wrong hydration target — uses document.getElementById('root')! instead of document"
  missing:
    - "Fix client.tsx: hydrateRoot(document, <StrictMode><StartClient /></StrictMode>)"
    - "Remove #root CSS rule from app/styles/app.css (targets non-existent element)"
  blocked_tests: [2, 3, 4, 5]
