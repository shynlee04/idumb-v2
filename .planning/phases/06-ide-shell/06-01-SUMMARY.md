---
phase: 06-ide-shell
plan: 01
subsystem: ui
tags: [react-resizable-panels, zustand, immer, monaco-editor, react-arborist, radix-ui, ide-layout]

# Dependency graph
requires:
  - phase: 05-framework-foundation
    provides: TanStack Start app scaffold, Vite config, CSS theme, route structure
provides:
  - Resizable 3-panel IDE shell layout (sidebar + editor + terminal)
  - Zustand layout store with localStorage persistence
  - IDE type contracts (PanelId, PanelConfig, IDELayout)
  - Monaco editor chunk splitting in Vite rollup config
  - CSS custom properties for panel theming
affects: [06-02, 06-03, ide-shell, chat, editor]

# Tech tracking
tech-stack:
  added: [react-resizable-panels@4.6.3, zustand@5.0.11, immer@10.2.0, monaco-editor@0.55.1, "@monaco-editor/react@4.7.0", react-arborist@3.4.3, radix-ui@1.4.3]
  patterns: [zustand-persist-immer, resizable-panel-group-nesting, css-custom-properties-for-panels]

key-files:
  created:
    - app/stores/layout-store.ts
    - app/components/ide/IDEShell.tsx
    - app/routes/ide.tsx
  modified:
    - app/shared/ide-types.ts
    - app/vite.config.ts
    - app/styles/app.css
    - package.json

key-decisions:
  - "Used zustand v5 with persist+immer middleware for panel state persistence to localStorage"
  - "Nested Group pattern: horizontal (sidebar|editor-area) + vertical (editor|terminal) for independent resize axes"
  - "Added manualChunks for monaco-editor to isolate 4MB bundle into separate chunk"

patterns-established:
  - "Zustand store pattern: flat interface (no extends) for immer WritableDraft compatibility"
  - "IDE panel sizing: percentage-based via react-resizable-panels v4 Group/Panel/Separator"
  - "CSS custom properties for panel backgrounds (sidebar, editor, terminal)"

# Metrics
duration: 19min
completed: 2026-02-11
---

# Phase 6 Plan 01: IDE Shell Foundation Summary

**Resizable 3-panel IDE layout with Zustand-persisted panel sizes using react-resizable-panels v4, Monaco chunk splitting, and CSS custom properties**

## Performance

- **Duration:** 19 min
- **Started:** 2026-02-10T23:43:40Z
- **Completed:** 2026-02-11T00:03:29Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- Installed 7 Phase 6 dependencies (react-resizable-panels, zustand, immer, monaco-editor, @monaco-editor/react, react-arborist, radix-ui)
- Created Zustand layout store with persist+immer middleware for localStorage panel size persistence
- Built IDEShell component with nested Group/Panel/Separator layout (horizontal + vertical)
- Wired /ide route and added IDE panel CSS custom properties

## Task Commits

Each task was committed atomically:

1. **Task 1: Install deps + create store + types + Vite config** - `9e1db55` (feat)
2. **Task 2: Build IDEShell with resizable panels** - `16fc56e` (feat)
3. **Task 3: Wire IDE route + CSS custom properties** - `64c062e` (feat)

## Files Created/Modified
- `app/stores/layout-store.ts` - Zustand store with persist+immer for panel sizes, collapse, active panel
- `app/components/ide/IDEShell.tsx` - Main IDE shell with nested resizable panel groups
- `app/routes/ide.tsx` - /ide route rendering IDEShell
- `app/shared/ide-types.ts` - Extended with PanelId, PanelConfig, IDELayout types
- `app/vite.config.ts` - Added manualChunks for monaco-editor chunk splitting
- `app/styles/app.css` - IDE panel color custom properties + separator handle styles
- `package.json` - Added 7 new dependencies

## Decisions Made
- **Zustand v5 persist+immer**: Flat interface pattern (no extends) avoids immer WritableDraft resolution issues. localStorage key: `idumb-ide-layout`.
- **Nested Group pattern**: Horizontal Group (sidebar + editor-area) wraps vertical Group (editor + terminal) for independent resize axes.
- **Monaco chunk splitting**: manualChunks in Vite rollup config isolates monaco-editor into separate chunk for on-demand loading.
- **Placeholder components**: SidebarPlaceholder, EditorPlaceholder, TerminalPlaceholder are replaced in Plans 02/03.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Vite production build times out (>2min) due to Monaco editor's 4MB bundle. Verified via esbuild transpile and dev mode instead. This is expected behavior for Monaco and will be addressed by the chunk splitting already configured.
- react-resizable-panels v4 API uses `useDefaultLayout` hook for persistence rather than `autoSaveId` — the plan referenced the correct v4 API (Group/Panel/Separator).

## Next Phase Readiness
- IDE shell layout ready at /ide route with placeholder panels
- Plan 02 (file tree + terminal content) can fill sidebar and terminal panels
- Plan 03 (Monaco editor) can fill the editor panel
- Layout store provides resize persistence infrastructure for all panels

---
*Phase: 06-ide-shell*
*Completed: 2026-02-11*

## Self-Check: PASSED
- All 4 created files verified on disk
- All 3 task commits verified in git history (9e1db55, 16fc56e, 64c062e)
