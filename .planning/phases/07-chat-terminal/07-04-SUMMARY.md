---
phase: 07-chat-terminal
plan: 04
subsystem: ui
tags: [react, tailwind, settings, theme, model-picker, zustand, react-query]

# Dependency graph
requires:
  - phase: 05-framework-foundation
    provides: TanStack Start server functions (settings, config, engine), Drizzle ORM, React Query
  - phase: 06-ide-shell
    provides: layout-store (resetLayout), EngineStatus component
  - phase: 11-sdk-type-realignment
    provides: engine-types.ts SDK type re-exports, ProviderInfo/ModelInfo types
provides:
  - Settings page with 3 tabbed sections (General, Providers, Appearance)
  - Dark/light theme toggle with localStorage + SQLite persistence
  - Provider list + detail panel with model listing
  - Model picker dropdown in chat header
  - Settings JSON export/import for backup/migration
  - useSettings hooks (React Query wrappers for settings CRUD)
  - useTheme hook with ThemeProvider context
affects: [08-sessions-diffs-agents, 09-governance-quick-wins]

# Tech tracking
tech-stack:
  added: [lucide-react icons]
  patterns: [settings-tab-components, theme-context-provider, model-picker-dropdown, json-export-import]

key-files:
  created:
    - app/components/settings/GeneralTab.tsx
    - app/components/settings/ProvidersTab.tsx
    - app/components/settings/AppearanceTab.tsx
    - app/components/settings/SettingsExport.tsx
    - app/components/chat/ModelPicker.tsx
  modified:
    - app/routes/chat.tsx
    - app/routes/chat.$sessionId.tsx

key-decisions:
  - "Custom dropdown for ModelPicker instead of native <select> for better styling and provider grouping"
  - "SettingsExport placed in GeneralTab (not a separate tab) to keep tab count at 3"
  - "Default model stored as JSON string in SQLite via settings key 'default-model'"
  - "useProviders re-exported from useEngine.ts via useSettings.ts for convenience imports"

patterns-established:
  - "Settings tab pattern: each tab is an independent component in app/components/settings/"
  - "Model selection pattern: persisted to SQLite, read via useSetting('default-model'), passed as options to sendPrompt"

# Metrics
duration: 7min
completed: 2026-02-12
---

# Phase 7 Plan 04: Settings & Model Picker Summary

**Settings page with General/Providers/Appearance tabs, dark/light theme toggle, JSON export/import, and model picker dropdown in chat header**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-11T20:54:34Z
- **Completed:** 2026-02-11T21:02:09Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Settings page with 3 tabbed sections: General (app info, engine controls, backup), Providers (list + detail with model listing), Appearance (theme toggle, font size, layout reset)
- Model picker dropdown in chat header with provider-grouped model selection, persisted to SQLite
- Selected model wired into sendPrompt for functional model switching on new prompts
- JSON settings export/import for backup and migration between machines

## Task Commits

Each task was committed atomically:

1. **Task 1: Theme system + Settings page with 3 tabs + hooks** - `5850118` (feat)
2. **Task 2: Model picker in chat header** - `f6e914c` (feat)

## Files Created/Modified
- `app/components/settings/GeneralTab.tsx` - App info, engine controls, SettingsExport integration
- `app/components/settings/ProvidersTab.tsx` - Provider list + detail panel with model listing and default selection
- `app/components/settings/AppearanceTab.tsx` - Theme toggle, font size selector, layout reset button
- `app/components/settings/SettingsExport.tsx` - JSON export/import with validation and confirmation
- `app/components/chat/ModelPicker.tsx` - Custom dropdown with provider grouping for quick model switching
- `app/routes/chat.tsx` - Added ModelPicker to header alongside EngineStatus
- `app/routes/chat.$sessionId.tsx` - Reads default-model setting and passes to sendPrompt

## Decisions Made
- Custom dropdown for ModelPicker (not native `<select>`) for better styling, provider group headers, and consistent dark/light theme appearance
- SettingsExport placed at bottom of GeneralTab rather than a separate 4th tab to keep the tab count clean at 3
- Default model stored as JSON string `{ providerID, modelID }` in SQLite settings table under key `"default-model"`
- parseDefaultModel helper duplicated in ProvidersTab and ModelPicker (2 consumers) rather than extracted to shared util (lightweight, 10 LOC each)

## Deviations from Plan

None - plan executed exactly as written. The hooks (useTheme, useSettings), route files (__root.tsx, settings.tsx), and CSS (app.css) were already implemented from previous work. This plan created the 5 missing component files and wired model selection into the chat.

## Issues Encountered

Pre-existing typecheck errors in `app/components/chat/parts/` (import path issues) and `app/server/pty.server.ts` (`.validator()` vs `.inputValidator()`) were observed but not addressed — they are outside this plan's scope and pre-date this execution.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Settings infrastructure complete for Phase 8 (session management can use settings)
- Model picker wired end-to-end (select model -> persist -> use in prompt)
- Theme system fully operational (dark/light toggle with persistence)

---
*Phase: 07-chat-terminal*
*Completed: 2026-02-12*

## Self-Check: PASSED

All 6 created files verified on disk. Both commit hashes (5850118, f6e914c) found in git log.
