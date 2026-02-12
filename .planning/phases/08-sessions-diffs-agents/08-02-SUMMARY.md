---
phase: 08-sessions-diffs-agents
plan: 02
subsystem: ui
tags: [monaco, diff-editor, react-query, zustand, ssr, code-splitting]

# Dependency graph
requires:
  - phase: 06-ide-shell
    provides: Monaco editor integration patterns (lazy loading, SSR guard, EXT_TO_LANG)
  - phase: 11-sdk-type-realignment
    provides: SDK type re-exports via engine-types.ts, sdk-client.server.ts utilities
  - phase: 08-01
    provides: Session server function patterns, validators, hooks
provides:
  - SDK session.diff() server function (getSessionDiffFn)
  - React Query hook for diff data (useSessionDiff)
  - Zustand store for diff viewer state (useDiffStore)
  - FileDiff SDK type re-export
  - Monaco DiffEditor viewer with file change list
  - SSR-safe lazy DiffEditor wrapper
  - Chat/Changes view toggle in chat layout
affects: [08-sessions-diffs-agents, 08.5-design-system]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - DiffEditor disposal pattern (models + editor) for memory leak mitigation
    - DiffEditor lazy loading via SSR-safe wrapper (same pattern as MonacoEditor.lazy.tsx)
    - EXT_TO_LANG copied (not imported) to avoid cross-component coupling

key-files:
  created:
    - app/server/diffs.ts
    - app/hooks/useSessionDiff.ts
    - app/stores/diff-store.ts
    - app/components/diff/DiffViewer.tsx
    - app/components/diff/DiffEditor.lazy.tsx
    - app/components/diff/FileChangeList.tsx
    - app/components/diff/DiffToolbar.tsx
  modified:
    - app/shared/engine-types.ts
    - app/routes/chat.tsx

key-decisions:
  - "FileDiff re-exported from SDK (not hand-rolled) — SDK exports it via types.gen.d.ts, following SDK Type Governance"
  - "EXT_TO_LANG duplicated in DiffViewer (not imported from MonacoEditor) — avoids coupling between editor and diff components"
  - "30s staleTime for diff queries — diffs are relatively stable during a session"
  - "DiffEditor models explicitly disposed on unmount — mitigates monaco-editor#4659 memory leak"
  - "View resets to Chat on session change — prevents stale diff view when switching sessions"

patterns-established:
  - "DiffEditor disposal: dispose editor + original model + modified model in cleanup effect"
  - "View toggle pattern: useState in layout route with conditional Outlet/component render"

# Metrics
duration: 9min
completed: 2026-02-12
---

# Phase 8 Plan 02: Diff Viewer Summary

**Monaco DiffEditor-based code diff viewer with file change list, inline/side-by-side toggle, SSR-safe lazy loading, and Chat/Changes view toggle in chat layout**

## Performance

- **Duration:** 9 min
- **Started:** 2026-02-12T09:44:26Z
- **Completed:** 2026-02-12T09:53:53Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Complete diff data pipeline: server function wrapping SDK session.diff(), React Query hook with 30s cache, Zustand store for view state
- Monaco DiffEditor with file change list sidebar showing color-coded file icons and +/- line counts
- SSR-safe lazy loading following established MonacoEditor.lazy.tsx pattern (typeof window guard + React.lazy)
- Aggressive DiffEditor disposal on unmount mitigating known memory leak (monaco-editor#4659)
- Chat/Changes view toggle in chat layout header, disabled when no session selected

## Task Commits

Each task was committed atomically:

1. **Task 1: Diff server function + hook + store + FileDiff type** - `853c042` (feat)
2. **Task 2: DiffViewer components + SSR-safe DiffEditor + chat layout view toggle** - `168b279` (feat)

## Files Created/Modified
- `app/shared/engine-types.ts` - Added FileDiff SDK type re-export
- `app/server/diffs.ts` - Server function wrapping SDK session.diff()
- `app/hooks/useSessionDiff.ts` - React Query hook for diff data with 30s staleTime
- `app/stores/diff-store.ts` - Zustand store for selected file and side-by-side mode
- `app/components/diff/DiffViewer.tsx` - Main diff viewer with file list + Monaco DiffEditor
- `app/components/diff/DiffEditor.lazy.tsx` - SSR-safe lazy wrapper
- `app/components/diff/FileChangeList.tsx` - Sidebar with changed files and +/- counts
- `app/components/diff/DiffToolbar.tsx` - Mode toggle toolbar
- `app/routes/chat.tsx` - Added Chat/Changes view toggle

## Decisions Made
- **FileDiff from SDK, not hand-rolled:** Plan stated "no named SDK export for FileDiff exists" but the SDK does export `FileDiff` via `types.gen.d.ts`. Per SDK Type Governance ("SDK types are LAW"), re-exported from SDK instead of defining a duplicate interface.
- **EXT_TO_LANG copied, not imported:** DiffViewer has its own copy of the extension-to-language map to avoid coupling with MonacoEditor.tsx. Same pattern recommended in the plan.
- **DiffEditor disposal pattern:** Editor instance + both original and modified models disposed in cleanup effect, wrapped in try/catch for resilience.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] FileDiff re-exported from SDK instead of hand-rolled**
- **Found during:** Task 1 (FileDiff type addition)
- **Issue:** Plan stated "no named SDK export for FileDiff exists" but `@opencode-ai/sdk` exports `FileDiff` from `types.gen.d.ts` → `client.d.ts` → `index.d.ts`
- **Fix:** Re-exported from SDK via engine-types.ts instead of defining duplicate interface. Per SDK Type Governance: "SDK types are LAW - never redefine"
- **Files modified:** app/shared/engine-types.ts
- **Verification:** `npm run typecheck:app` passes, import works correctly
- **Committed in:** 853c042 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug in plan assumption)
**Impact on plan:** Stronger type safety by using SDK source type. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Diff viewer pipeline complete and ready for visual testing
- Chat/Changes toggle provides the UX surface for accessing diffs
- Ready for 08-03 (agent visualization) or phase verification

## Self-Check: PASSED

All 9 files verified present. Both commits (853c042, 168b279) verified in git log. All exports (FileDiff, getSessionDiffFn, useSessionDiff, useDiffStore, LazyDiffViewer, SSR guard, dispose pattern, Changes toggle) verified present.

---
*Phase: 08-sessions-diffs-agents*
*Completed: 2026-02-12*
