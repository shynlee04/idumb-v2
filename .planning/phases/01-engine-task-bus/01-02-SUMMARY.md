---
phase: 01-engine-task-bus
plan: 02
subsystem: ui
tags: [react, react-router-dom, tanstack-query, tailwindcss, lucide-react, vite]

# Dependency graph
requires:
  - phase: 01-engine-task-bus/01
    provides: "Backend server with /api/* endpoints (engine, sessions, governance)"
provides:
  - "React Router app shell with sidebar navigation and 3 routed pages"
  - "Typed API client (api.ts) for all backend endpoints"
  - "React Query hooks for engine status, sessions, and session details"
  - "Dashboard-first landing page"
affects: [01-03, 01-04, 01-05, 01-06]

# Tech tracking
tech-stack:
  added: [react-router-dom v7.13.0]
  patterns: [app-shell-with-outlet, navlink-active-highlighting, query-key-colocation, typed-api-client-singleton]

key-files:
  created:
    - src/dashboard/frontend/src/lib/api.ts
    - src/dashboard/frontend/src/hooks/useEngine.ts
    - src/dashboard/frontend/src/hooks/useSession.ts
    - src/dashboard/frontend/src/components/layout/AppShell.tsx
    - src/dashboard/frontend/src/components/layout/Sidebar.tsx
    - src/dashboard/frontend/src/pages/DashboardPage.tsx
    - src/dashboard/frontend/src/pages/ChatPage.tsx
    - src/dashboard/frontend/src/pages/TasksPage.tsx
  modified:
    - src/dashboard/frontend/src/App.tsx
    - src/dashboard/frontend/package.json

key-decisions:
  - "QueryClientProvider in App.tsx (not AppShell) so hooks work everywhere including Sidebar"
  - "NavLink with end prop for exact root match to avoid always-active dashboard link"
  - "Typed API client with json() helper that throws on non-OK responses for React Query error handling"

patterns-established:
  - "App Shell pattern: Sidebar + Outlet layout for all routed pages"
  - "Query key colocation: keys defined alongside hooks (engineKeys, sessionKeys)"
  - "API client singleton: all fetch calls centralized in api.ts with typed return values"

# Metrics
duration: 4min
completed: 2026-02-09
---

# Phase 1 Plan 02: Frontend App Shell Summary

**React Router app shell with sidebar navigation, 3 placeholder pages (Dashboard/Chat/Tasks), typed API client, and React Query hooks for engine and session state**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-09T15:39:01Z
- **Completed:** 2026-02-09T15:42:56Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Typed API client with methods for engine, session, and governance endpoints
- React Query hooks for engine status polling, session CRUD, and session detail fetching
- App shell layout with dark sidebar navigation and active page highlighting
- Three routed pages: Dashboard (overview cards), Chat (session list + placeholder), Tasks (count + placeholder)
- Dashboard-first landing page per user decision

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Dependencies + Create API Layer + Hooks** - `25ca098` (feat)
2. **Task 2: Create AppShell Layout + Sidebar + Page Routing** - `0caf794` (feat)

## Files Created/Modified
- `src/dashboard/frontend/src/lib/api.ts` - Typed API client singleton with methods for engine, sessions, governance, SSE
- `src/dashboard/frontend/src/hooks/useEngine.ts` - useEngineStatus (10s poll), useSessions, useCreateSession, useDeleteSession
- `src/dashboard/frontend/src/hooks/useSession.ts` - useSession, useMessages, useSessionStatus (2s poll), useSessionChildren
- `src/dashboard/frontend/src/components/layout/AppShell.tsx` - Root layout: Sidebar + Outlet
- `src/dashboard/frontend/src/components/layout/Sidebar.tsx` - NavLink sidebar with engine status indicator
- `src/dashboard/frontend/src/pages/DashboardPage.tsx` - Landing page with 3 overview cards
- `src/dashboard/frontend/src/pages/ChatPage.tsx` - Session list + new/delete + chat placeholder
- `src/dashboard/frontend/src/pages/TasksPage.tsx` - Task count + "coming soon" placeholder
- `src/dashboard/frontend/src/App.tsx` - React Router with dashboard-first routing
- `src/dashboard/frontend/package.json` - Added react-router-dom dependency

## Decisions Made
- QueryClientProvider placed in App.tsx rather than AppShell so hooks work in Sidebar (engine status indicator)
- Used NavLink with `end` prop on root route to prevent dashboard link being always active
- API client uses a `json<T>()` helper that throws on non-OK responses, integrating cleanly with React Query error states
- Engine status indicator uses governance semantic colors (governance-allow/governance-block) already defined in CSS theme

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- App shell is ready for all subsequent UI plans to slot pages into
- Chat page has session CRUD wired but needs message stream UI (future plan)
- Tasks page is a placeholder awaiting task graph visualization (future plan)
- API hooks and client are ready for any component to consume

---
*Phase: 01-engine-task-bus*
*Completed: 2026-02-09*
