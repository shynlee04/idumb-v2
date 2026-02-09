---
phase: 01-engine-task-bus
plan: 09
subsystem: dashboard
tags: [opencode-sdk, react-query, model-selector, providers, agents, config-proxy]

# Dependency graph
requires:
  - phase: 01-08
    provides: SSE streaming, session CRUD, engine lifecycle routes
provides:
  - Config proxy routes (providers, agents, config, app)
  - Model override on prompt route
  - Shared ProviderInfo/AgentInfo/AppInfo types
  - ModelSelector dropdown component
  - React Query hooks for providers/agents/config/app
affects: [01-engine-task-bus, dashboard-features]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Config proxy routes normalize SDK responses into typed shapes"
    - "React Query hooks with 5-min staleTime for config data"
    - "Model override passed as optional body params on prompt route"

key-files:
  created:
    - src/dashboard/frontend/src/components/chat/ModelSelector.tsx
  modified:
    - src/dashboard/shared/engine-types.ts
    - src/dashboard/backend/server.ts
    - src/dashboard/frontend/src/lib/api.ts
    - src/dashboard/frontend/src/hooks/useEngine.ts
    - src/dashboard/frontend/src/hooks/useStreaming.ts
    - src/dashboard/frontend/src/pages/ChatPage.tsx

key-decisions:
  - "Model override is per-prompt (not per-session) because SDK SessionCreateData has no modelID field"
  - "Used config.providers() SDK method instead of plan's provider.list() which doesn't exist"
  - "Composed app info from path.get() + vcs.get() since SDK has no app.get()"
  - "Built custom dropdown instead of installing shadcn select (no dependency added)"

patterns-established:
  - "Config proxy routes: normalize SDK Result<T> into typed JSON responses"
  - "ModelSelector: upward-opening dropdown with provider grouping"

# Metrics
duration: 17min
completed: 2026-02-10
---

# Phase 1 Plan 9: Config Proxy & Model Selector Summary

**Config proxy routes for providers/agents/config/app with ModelSelector dropdown enabling per-prompt model override**

## Performance

- **Duration:** 17 min
- **Started:** 2026-02-09T23:19:52Z
- **Completed:** 2026-02-09T23:37:10Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- 4 backend config proxy routes (GET /api/providers, /api/agents, /api/config, /api/app)
- Model override (providerID + modelID) wired through prompt route to SDK
- Shared types for ProviderInfo, AgentInfo, AppInfo in engine-types.ts
- React Query hooks (useProviders, useAgents, useConfig, useAppInfo) with 5-min staleTime
- ModelSelector dropdown component with grouped provider/model display
- ChatPage wired to pass selected model through sendPrompt

## Task Commits

Each task was committed atomically:

1. **Task 1: Backend config proxy routes + shared types + API client** - `4a849ca` (feat)
2. **Task 2: ModelSelector dropdown component + ChatPage wiring** - `40efd46` (feat)

## Files Created/Modified
- `src/dashboard/shared/engine-types.ts` - Added ProviderInfo, AgentInfo, AppInfo types
- `src/dashboard/backend/server.ts` - 4 GET routes + model override on prompt route
- `src/dashboard/frontend/src/lib/api.ts` - 4 new api methods + sendPrompt model param
- `src/dashboard/frontend/src/hooks/useEngine.ts` - 4 new React Query hooks
- `src/dashboard/frontend/src/hooks/useStreaming.ts` - Model param on sendPrompt
- `src/dashboard/frontend/src/components/chat/ModelSelector.tsx` - New dropdown component
- `src/dashboard/frontend/src/pages/ChatPage.tsx` - Model state + selector in header

## Decisions Made
- Model override is per-prompt not per-session — SDK's SessionCreateData only supports parentID + title, while SessionPromptData accepts model: { providerID, modelID }
- Used config.providers() instead of plan's provider.list() — the SDK exposes providers through the Config class, not a separate Provider class
- Composed app info from path.get() + vcs.get() — SDK has no unified app.get() method
- Built custom dropdown rather than adding shadcn Select — avoids dependency bloat, matches existing minimalist component style

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected SDK method names for provider and agent listing**
- **Found during:** Task 1 (Backend config proxy routes)
- **Issue:** Plan referenced `provider.list()` and `agent.list()` but SDK uses `config.providers()` and `app.agents()`
- **Fix:** Used correct SDK method names after checking generated type definitions
- **Files modified:** src/dashboard/backend/server.ts
- **Verification:** `tsc --noEmit` passes clean
- **Committed in:** 4a849ca (Task 1 commit)

**2. [Rule 1 - Bug] Fixed app info composition — no unified app.get() in SDK**
- **Found during:** Task 1 (Backend config proxy routes)
- **Issue:** Plan assumed `app.get()` exists but SDK exposes path/vcs as separate endpoints
- **Fix:** Composed AppInfo from `path.get()` + `vcs.get()` with graceful vcs fallback
- **Files modified:** src/dashboard/backend/server.ts
- **Verification:** `tsc --noEmit` passes clean
- **Committed in:** 4a849ca (Task 1 commit)

**3. [Rule 1 - Bug] Model override on prompt route, not session create**
- **Found during:** Task 1 (Backend config proxy routes)
- **Issue:** Plan mentioned passing modelID on session create, but SDK SessionCreateData has no modelID field; SessionPromptData accepts model object
- **Fix:** Applied model override to prompt route body instead of create route
- **Files modified:** src/dashboard/backend/server.ts, src/dashboard/frontend/src/lib/api.ts
- **Verification:** `tsc --noEmit` passes clean
- **Committed in:** 4a849ca (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (3 bugs — all SDK method name/shape corrections)
**Impact on plan:** All fixes necessary for correctness — SDK API surface differs from plan assumptions. No scope creep.

## Issues Encountered
None - after SDK method corrections, everything compiled and integrated cleanly.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Config proxy routes ready for consumption by any dashboard feature
- ModelSelector ready for visual verification when engine is running
- Next plan can build on these hooks for settings pages, agent selection, etc.

---
*Phase: 01-engine-task-bus*
*Completed: 2026-02-10*

## Self-Check: PASSED
- All 7 key files exist on disk
- Both task commits found (4a849ca, 40efd46)
- `tsc --noEmit` clean
