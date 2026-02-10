---
status: investigating
trigger: "After SSR shell renders loading spinner, TanStack Router stays in pending state forever. No route component ever renders."
created: 2026-02-10T00:00:00Z
updated: 2026-02-10T00:00:00Z
symptoms_prefilled: true
goal: find_and_fix
---

## Current Focus

hypothesis: Index route redirect during SPA hydration breaks router — SSR dehydrated `/` but client beforeLoad throws redirect to `/chat/new`, causing hydration mismatch
test: Read all route files, router config, and route tree to find the exact mechanism
expecting: Evidence of redirect-during-hydration or hanging server function or broken route tree
next_action: Read all key files — __root.tsx, index.tsx, router.tsx, routeTree.gen.ts, client.tsx, ssr.tsx, start config

## Symptoms

expected: After SSR shell + hydration, router resolves routes → ChatPage stub visible with "Chat" heading
actual: Loading spinner (DefaultPendingComponent) renders and never goes away — router stuck "pending"
errors: No explicit errors mentioned — silent failure
reproduction: npm run dev:app → browser on port 5180 → spinner forever
started: After SSR shell was made to work (spinner renders = SSR works, but routes never resolve)

## Eliminated

## Evidence

## Resolution

root_cause:
fix:
verification:
files_changed: []
