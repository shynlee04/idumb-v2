---
phase: 05-framework-foundation
plan: 01
subsystem: ui
tags: [tanstack-start, tanstack-router, react-query, tailwind-v4, vite, spa]

# Dependency graph
requires:
  - phase: 01-plugin-demotion
    provides: existing dashboard frontend at src/dashboard/frontend/
provides:
  - TanStack Start SPA scaffold at app/
  - File-based routing with 4 route stubs (index, chat, tasks, settings)
  - Tailwind v4 dark theme with governance semantic colors
  - Build pipeline (vite build --config app/vite.config.ts)
  - TypeScript project config (tsconfig.app.json)
affects: [05-02-component-migration, 05-03-api-bridge]

# Tech tracking
tech-stack:
  added: ["@tanstack/react-start ^1.159.5", "@tanstack/react-router ^1.159.5", "vite ^7.3.1", "@tailwindcss/vite ^4.x"]
  patterns: ["TanStack Start SPA mode", "file-based routing", "route-level CSS injection", "getRouter factory"]

key-files:
  created:
    - app/package.json
    - app/vite.config.ts
    - app/start.ts
    - app/client.tsx
    - app/router.tsx
    - app/routes/__root.tsx
    - app/routes/index.tsx
    - app/routes/chat.$sessionId.tsx
    - app/routes/tasks.tsx
    - app/routes/settings.tsx
    - app/styles/app.css
    - tsconfig.app.json
  modified:
    - package.json
    - .gitignore

key-decisions:
  - "Export getRouter (not createRouter) — required by TanStack Start internals"
  - "Retained express/cors in root deps — needed by existing src/dashboard/backend/server.ts"
  - "SPA mode via spa.enabled=true + srcDirectory='.' (not target='client' as plan suggested)"
  - "CSS injected via route head() links pattern (TanStack Start convention)"

patterns-established:
  - "Route stubs: createFileRoute with inline component functions"
  - "Root route provides QueryClientProvider + HeadContent/Scripts document shell"
  - "Path aliases: @/ -> app/, @shared/ -> src/dashboard/shared/"
  - "Separate tsconfig: tsconfig.app.json for app/ code"

# Metrics
duration: 25min
completed: 2026-02-10
---

# Phase 5 Plan 01: TanStack Start SPA Scaffold Summary

**TanStack Start SPA scaffold with file-based routing, Tailwind v4 dark theme, and code-split route stubs at app/**

## Performance

- **Duration:** 25 min
- **Started:** 2026-02-10T13:41:41Z
- **Completed:** 2026-02-10T14:07:28Z
- **Tasks:** 8
- **Files modified:** 14

## Accomplishments
- Complete TanStack Start SPA scaffold at `app/` with working vite build
- File-based routing with 4 route stubs (index redirect, chat, tasks, settings)
- Tailwind CSS v4 dark theme with governance semantic colors carried from old frontend
- Separate TypeScript config (`tsconfig.app.json`) — zero errors on `typecheck:app`
- Code-split build output (5 JS chunks, each route in its own chunk)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create app/package.json + update root scripts** - `3ea9679` (chore)
2. **Task 2: Create tsconfig.app.json** - `cda26dd` (chore)
3. **Task 3: Create app/vite.config.ts** - `ed79648` (feat)
4. **Task 4: Create TanStack Start entry files** - `2315fa0` (feat)
5. **Task 5: Create root route** - `431eb40` (feat)
6. **Task 6: Create route stubs** - `9a02189` (feat)
7. **Task 7: Add CSS theme** - `e92bef3` (feat)
8. **Task 8: Verify build** - `faf9ea1` (feat)

## Files Created/Modified
- `app/package.json` - Minimal workspace package (deps at root)
- `app/vite.config.ts` - Vite + TanStack Start SPA + React + Tailwind v4 plugins
- `app/start.ts` - createStart instance configuration
- `app/client.tsx` - hydrateRoot with StartClient (replaces old main.tsx)
- `app/router.tsx` - getRouter factory with typed Register module augmentation
- `app/routes/__root.tsx` - Root route: QueryClientProvider, HeadContent/Scripts, error boundary
- `app/routes/index.tsx` - Redirects `/` to `/chat/new`
- `app/routes/chat.$sessionId.tsx` - Chat route stub with useParams
- `app/routes/tasks.tsx` - Tasks route stub
- `app/routes/settings.tsx` - Settings route stub
- `app/styles/app.css` - Tailwind v4 theme (dark, governance colors, Inter/JetBrains Mono)
- `tsconfig.app.json` - Separate TS config for app/ (Bundler resolution, react-jsx)
- `package.json` - Updated scripts (dev:app, build:app, preview:app, typecheck:app)
- `.gitignore` - Added routeTree.gen.ts exclusion

## Decisions Made
1. **getRouter over createRouter** — TanStack Start internals require `getRouter` as the exported factory name from `router.tsx`. The plan referenced `createRouter` but runtime errored.
2. **Kept express/cors in root deps** — Plan said to remove them, but `src/dashboard/backend/server.ts` imports both. Removing would break `tsc --noEmit` and the existing dashboard command. Will be cleaned up when old backend is fully replaced.
3. **SPA mode: `spa.enabled=true`** — Plan suggested `target: "client"` but the actual API uses `spa: { enabled: true }` plus `srcDirectory: "."`. Validated against source types.
4. **Route-level CSS injection** — Used TanStack Start's `head()` links pattern instead of a static CSS import, following the framework's convention for proper SPA document handling.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed getRouter export name**
- **Found during:** Task 8 (build verification)
- **Issue:** Plan specified `createRouter` but TanStack Start requires `getRouter` as the export name
- **Fix:** Renamed export from `createRouter` to `getRouter` in router.tsx
- **Files modified:** app/router.tsx
- **Verification:** `npm run build:app` succeeds
- **Committed in:** faf9ea1 (Task 8 commit)

**2. [Rule 3 - Blocking] Fixed SPA mode configuration API**
- **Found during:** Task 3-4 (vite config creation)
- **Issue:** Plan specified `target: "client"` but actual API uses `spa: { enabled: true }` + `srcDirectory: "."`
- **Fix:** Used correct API after checking start-plugin-core schema source
- **Files modified:** app/vite.config.ts
- **Verification:** `npm run build:app` succeeds
- **Committed in:** 2315fa0 (Task 4 commit)

**3. [Rule 3 - Blocking] Retained express/cors dependencies**
- **Found during:** Task 1 (package.json updates)
- **Issue:** Plan said to remove express/cors/@types/express/@types/cors but `src/dashboard/backend/server.ts` depends on them
- **Fix:** Kept dependencies to avoid breaking existing typecheck and dashboard command
- **Files modified:** None (prevented breakage)
- **Verification:** `npm run typecheck` still works (pre-existing errors only from @opencode-ai/sdk changes)
- **Committed in:** 3ea9679 (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (all Rule 3 - Blocking)
**Impact on plan:** All fixes necessary for correctness. No scope creep. Plan's intent preserved.

## Issues Encountered
- Pre-existing TypeScript errors in `src/dashboard/backend/server.ts` from `@opencode-ai/sdk` API changes (Property 'vcs', 'project', 'provider' do not exist on OpencodeClient). These are NOT caused by this plan and exist on the base commit.

## Next Phase Readiness
- TanStack Start scaffold is complete and builds clean
- Ready for Plan 05-02: Component migration (copy components from old frontend to app/)
- Old frontend stays at `src/dashboard/frontend/` as reference

---
*Phase: 05-framework-foundation*
*Completed: 2026-02-10*

## Self-Check: PASSED

- All 12 created files exist on disk
- All 8 task commits found in git log
