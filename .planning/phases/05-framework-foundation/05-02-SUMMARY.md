---
phase: 05-framework-foundation
plan: 02
subsystem: dashboard-backend
tags: [server-functions, sse, hooks, migration, tanstack-start]
dependency-graph:
  requires: ["05-01 (TanStack Start scaffold)"]
  provides: ["Server function layer for SDK calls", "SSE streaming routes", "Migrated React hooks"]
  affects: ["05-03 (parallel plan)", "Frontend components using old api.ts"]
tech-stack:
  added: ["@opencode-ai/sdk@1.1.53"]
  patterns: ["createServerFn (TanStack Start RPC)", "inputValidator (Zod)", "server.handlers (SSE routes)", "AsyncGenerator streaming", "JSON roundtrip for SDK type compatibility"]
key-files:
  created:
    - app/server/sdk-client.server.ts
    - app/server/validators.ts
    - app/server/engine.ts
    - app/server/sessions.ts
    - app/server/config.ts
    - app/routes/api/sessions.$id.prompt.ts
    - app/routes/api/events.ts
    - app/hooks/useEngine.ts
    - app/hooks/useSession.ts
    - app/hooks/useStreaming.ts
    - app/hooks/useEventStream.tsx
  modified:
    - app/routes/__root.tsx
    - app/server/settings.ts
    - package.json
decisions:
  - "Used inputValidator (not validator) — TanStack Start v1.159.5 API"
  - "JSON roundtrip for SDK types with `unknown` index sigs — TanStack Start serializer requires `{}` not `unknown`"
  - "SSE via server route handlers (spread as any) — server functions use NDJSON which breaks SSE"
  - "@ts-ignore for route path strings — resolved at build time by Vite route generator"
  - "EventStreamProvider wraps app via __root.tsx — global SSE relay available everywhere"
metrics:
  duration: "~26 minutes"
  completed: "2026-02-10T14:51:00Z"
---

# Phase 05 Plan 02: Express→Server Functions Migration Summary

Server function layer replacing Express route handlers with TanStack Start RPC + SSE server routes, with migrated React hooks consuming them.

## One-liner

Express→TanStack Start migration: 18 server functions (engine/session/config) + 2 SSE routes + 5 migrated hooks + engine auto-start

## What Was Built

### Server Functions (Task 1)

**`app/server/sdk-client.server.ts`** (218 LOC)
- SDK client singleton extracted from `src/dashboard/backend/engine.ts`
- Connect-or-start lifecycle: tries existing server first, starts new if needed
- Exports: `startEngine`, `getClient`, `getProjectDir`, `stopEngine`, `getEngineStatus`, `ensureEngine`, `ensureHealthy`, `unwrapSdkResult`, `sdkQuery`
- `.server.ts` suffix ensures tree-shaking excludes from client bundle

**`app/server/validators.ts`** (35 LOC)
- Zod schemas: `SessionIdSchema`, `CreateSessionSchema`, `EngineStartSchema`, `PromptRequestSchema`
- Used by `inputValidator()` on server functions

**`app/server/engine.ts`** (80 LOC)
- 5 server functions: `getEngineStatusFn`, `startEngineFn`, `stopEngineFn`, `restartEngineFn`, `ensureEngineFn`
- All wrapped in try/catch with descriptive error messages

**`app/server/sessions.ts`** (144 LOC)
- 8 server functions: `getSessionsFn`, `createSessionFn`, `getSessionFn`, `deleteSessionFn`, `getSessionMessagesFn`, `abortSessionFn`, `getSessionStatusFn`, `getSessionChildrenFn`
- JSON roundtrip for SDK Message types (unknown→{} compatibility)

**`app/server/config.ts`** (95 LOC)
- 5 server functions: `healthCheckFn`, `getProvidersFn`, `getAgentsFn`, `getConfigFn`, `getAppInfoFn`
- Provider/agent normalization into ProviderInfo/AgentInfo shapes

### SSE Server Routes (Task 2)

**`app/routes/api/sessions.$id.prompt.ts`** (131 LOC)
- POST SSE streaming route for chat prompts
- Subscribe to SDK events BEFORE sending prompt (avoid missing early events)
- Filter events by session ID
- Break on terminal status (idle/failed/error)
- Abort handling via AbortController

**`app/routes/api/events.ts`** (80 LOC)
- GET SSE route for global event relay
- Auto-sends "connected" event on stream start
- Full event passthrough from SDK to client

### Migrated Hooks (Task 2)

**`app/hooks/useEngine.ts`** (115 LOC)
- 8 hooks: `useEngineStatus`, `useStartEngine`, `useStopEngine`, `useRestartEngine`, `useHealthCheck`, `useProviders`, `useAgents`, `useConfig`, `useAppInfo`
- Query key factories for cache management
- Auto-refetch intervals for status polling

**`app/hooks/useSession.ts`** (99 LOC)
- 7 hooks: `useSessions`, `useSession`, `useSessionMessages`, `useSessionChildren`, `useCreateSession`, `useDeleteSession`, `useAbortSession`
- Proper query invalidation on mutations

**`app/hooks/useStreaming.ts`** (153 LOC)
- SSE POST streaming via `fetch()` + `ReadableStream.getReader()`
- Line-by-line SSE parsing with buffer management
- Abort support, error handling, auto-invalidation

**`app/hooks/useEventStream.tsx`** (128 LOC)
- React context provider with EventSource connection
- Auto-reconnect on disconnect (3s delay)
- 500-event rolling buffer

### Engine Auto-start (Task 2)

**`app/routes/__root.tsx`** (modified)
- `beforeLoad` calls `ensureEngineFn()` — OpenCode starts before any route loads
- Wrapped `<Outlet>` with `<EventStreamProvider>` for global event access

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] @opencode-ai/sdk not in node_modules**
- **Found during:** Task 1 setup
- **Issue:** SDK was listed as import in `engine.ts` but not in `package.json` dependencies
- **Fix:** `npm install @opencode-ai/sdk`
- **Files modified:** `package.json`, `package-lock.json`
- **Commit:** `8ac8208`

**2. [Rule 1 - Bug] settings.ts type errors from parallel plan 05-03**
- **Found during:** Task 1 verification
- **Issue:** `updatedAt` field potentially undefined but not handled in return types
- **Fix:** Added `?? null` coalescing for optional field
- **Files modified:** `app/server/settings.ts`
- **Commit:** `8ac8208`

**3. [Rule 1 - Bug] TanStack Start API: `validator` → `inputValidator`**
- **Found during:** Task 1 implementation
- **Issue:** TanStack Start v1.159.5 uses `inputValidator()` not `validator()`
- **Fix:** Changed all validator calls across engine.ts, sessions.ts
- **Files modified:** `app/server/engine.ts`, `app/server/sessions.ts`
- **Commit:** `8ac8208`

**4. [Rule 1 - Bug] SDK types use `unknown` which breaks TanStack Start serialization**
- **Found during:** Task 1 verification
- **Issue:** SDK response types have `[key: string]: unknown` index signatures; TanStack Start requires `{}` (non-nullable)
- **Fix:** JSON roundtrip (`JSON.parse(JSON.stringify(...))`) + explicit return type annotations
- **Files modified:** `app/server/sessions.ts`, `app/server/config.ts`
- **Commit:** `8ac8208`

## Verification

- `npx tsc -p tsconfig.app.json --noEmit` → **0 errors**
- `npm test` → **79/79 passed** (existing test suite unaffected)
- No Express imports in new code
- No `console.log` in new code

## Commits

| Hash | Message |
|------|---------|
| `8ac8208` | feat(05-02): add server functions for engine, sessions, and config |
| `7f2915f` | feat(05-02): add SSE server routes, migrate hooks, engine auto-start |

## Self-Check: PASSED

All 11 created files verified. Both commit hashes verified. Typecheck clean. Test suite passes.
