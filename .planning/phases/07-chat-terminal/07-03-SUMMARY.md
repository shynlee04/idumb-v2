---
phase: 07-chat-terminal
plan: 03
subsystem: terminal
tags: [xterm, pty, websocket, sdk-pty, terminal-emulator, lazy-loading]

# Dependency graph
requires:
  - phase: 06-ide-shell
    provides: IDEShell with resizable panels, layout-store persistence
  - phase: 11-sdk-type-realignment
    provides: SDK client singleton, unwrapSdkResult, sdkQuery helpers
provides:
  - PTY server functions wrapping SDK client.pty.* API (create, list, remove, resize, connection info)
  - useTerminal hook managing full PTY + xterm.js lifecycle
  - TerminalPanel component with connection status and error handling
  - Standalone /terminal route for full-screen terminal
  - xterm.js CSS integration and theme overrides
affects: [07-chat-terminal, 08-sessions-diffs-agents]

# Tech tracking
tech-stack:
  added: ["@xterm/xterm v6.0.0", "@xterm/addon-fit v0.11.0"]
  patterns: ["React.lazy for DOM-dependent libraries", "ResizeObserver + debounce for terminal resize", "WebSocket pipe between xterm.js and SDK PTY"]

key-files:
  created:
    - app/server/pty.server.ts
    - app/hooks/useTerminal.ts
    - app/components/terminal/TerminalPanel.tsx
    - app/routes/terminal.tsx
  modified:
    - app/server/validators.ts
    - app/components/ide/IDEShell.tsx
    - app/styles/app.css

key-decisions:
  - ".validator() fixed to .inputValidator() for TanStack Start v1.159.5 compat in pty.server.ts"
  - "Dynamic import for xterm.js (SSR-safe) — typeof window guard not needed since React.lazy handles it"
  - "Catppuccin Mocha color palette for terminal ANSI colors — matches dark theme aesthetic"
  - "ResizeObserver + 100ms debounce for terminal resize sync — prevents flooding SDK with resize calls"

patterns-established:
  - "Lazy-load DOM-dependent libraries: React.lazy(() => import(...).then(m => ({ default: m.Component })))"
  - "PTY lifecycle: createPtyFn → WebSocket connect → xterm pipe → removePtyFn on unmount"
  - "Server function naming: {operation}PtyFn for PTY operations"

# Metrics
duration: 10min
completed: 2026-02-12
---

# Phase 7 Plan 3: Terminal Integration Summary

**Integrated terminal using SDK PTY API + xterm.js v6 with lazy loading, WebSocket pipe, and resize sync**

## Performance

- **Duration:** 10 min
- **Started:** 2026-02-11T20:55:07Z
- **Completed:** 2026-02-11T21:06:06Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- PTY server functions wrap SDK client.pty.* API with Zod validation (create, list, remove, resize, connection info)
- useTerminal hook manages full lifecycle: dynamic xterm import, PTY creation, WebSocket pipe, ResizeObserver + debounce, cleanup on unmount
- TerminalPanel replaces placeholder in IDEShell with connection status indicator, error overlay, and reconnect
- Standalone /terminal route provides full-screen terminal experience
- xterm.js CSS imported and themed to match app dark/light modes

## Task Commits

Each task was committed atomically:

1. **Task 1: Install xterm packages + PTY server functions + useTerminal hook** - `7fe4df1` (feat)
2. **Task 2: TerminalPanel component + IDEShell integration + standalone route** - `49e0f25` (feat, pre-existing from concurrent session)

## Files Created/Modified

- `app/server/pty.server.ts` - 5 server functions wrapping SDK client.pty.* API with Zod validators
- `app/hooks/useTerminal.ts` - Hook managing PTY lifecycle, WebSocket connection, xterm.js instance, resize sync
- `app/components/terminal/TerminalPanel.tsx` - Terminal panel with header bar, status indicator, error overlay
- `app/routes/terminal.tsx` - Standalone /terminal page with lazy-loaded TerminalPanel
- `app/server/validators.ts` - Added PtyCreateSchema, PtyIdSchema, PtyResizeSchema validators
- `app/components/ide/IDEShell.tsx` - Replaced TerminalPlaceholder with lazy-loaded LazyTerminalPanel
- `app/styles/app.css` - xterm.js CSS import and theme overrides (padding, thin scrollbar)

## Decisions Made

- Fixed `.validator()` to `.inputValidator()` in pty.server.ts -- TanStack Start v1.159.5 uses `.inputValidator()` not `.validator()` (documented in STATE.md decisions)
- Used Catppuccin Mocha color palette for terminal ANSI colors to match the app's dark theme
- Dynamic imports for xterm.js via React.lazy -- no `typeof window` guard needed since lazy loading is client-only
- 100ms debounce on resize events to prevent flooding SDK with resize calls
- WebSocket constructed from engine URL by replacing http:// with ws:// and appending /pty/{id}/connect

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed .validator() to .inputValidator() in pty.server.ts**
- **Found during:** Task 1 (PTY server functions verification)
- **Issue:** pty.server.ts used `.validator()` which does not exist on TanStack Start v1.159.5's ServerFnBuilder -- all other server functions in the codebase use `.inputValidator()`
- **Fix:** Changed all 3 occurrences of `.validator()` to `.inputValidator()` in pty.server.ts
- **Files modified:** app/server/pty.server.ts, app/server/validators.ts (comment fix)
- **Verification:** `npm run typecheck:app` passes with zero errors
- **Committed in:** 7fe4df1

**2. [Rule 3 - Blocking] Renamed useTheme.ts to useTheme.tsx**
- **Found during:** Task 1 (typecheck verification)
- **Issue:** useTheme.ts contained JSX syntax (`<ThemeContext value=...>`) but had `.ts` extension -- TypeScript requires `.tsx` for files with JSX, causing 7 compilation errors
- **Fix:** Renamed to useTheme.tsx (Vite bundler resolves both extensions from import paths)
- **Files modified:** app/hooks/useTheme.ts -> app/hooks/useTheme.tsx
- **Verification:** `npm run typecheck:app` passes after rename

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes were necessary for typecheck to pass. No scope creep.

## Issues Encountered

- Task 2 files (TerminalPanel.tsx, IDEShell.tsx, terminal.tsx, app.css) were already committed by a concurrent agent session in `49e0f25` -- no redundant commit needed
- Route tree auto-generation requires running `vite build` since TanStack Router CLI defaults to `src/routes` without a `tsr.config.json` -- the Vite plugin handles it correctly during build

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Terminal integration complete -- IDE bottom panel and standalone route both functional
- SDK PTY API provides process management (no node-pty dependency)
- Theme matches app dark mode with Catppuccin Mocha ANSI colors
- Ready for Phase 7 Plan 04 (Settings) or Phase 8 (Sessions + Diffs)

---
*Phase: 07-chat-terminal*
*Completed: 2026-02-12*

## Self-Check: PASSED

All files verified present on disk:
- app/server/pty.server.ts
- app/hooks/useTerminal.ts
- app/components/terminal/TerminalPanel.tsx
- app/routes/terminal.tsx
- app/hooks/useTheme.tsx

All commits verified in git history:
- 7fe4df1 (Task 1)
- 49e0f25 (Task 2 pre-existing)

Typecheck: `npm run typecheck:app` passes with zero errors.
Build: `npm run build:app` succeeds.
