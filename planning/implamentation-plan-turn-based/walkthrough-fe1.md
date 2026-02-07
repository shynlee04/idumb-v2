# Dashboard Setup & Bug Fixes — Walkthrough

## What Was Accomplished

The iDumb governance dashboard is now **running locally** and displaying **live data** from the `.idumb/brain/` directory.

![Dashboard rendering with live governance data](dashboard_live_1770459561197.png)

## Bugs Fixed

| # | Issue | Root Cause | Fix |
|---|-------|-----------|-----|
| 1 | Vite PostCSS crash: "Unknown word `use strict`" | `globals.css` used `@import "tailwindcss"` (v4 syntax) but Tailwind v3 was installed | Replaced entire CSS with pure vanilla CSS + 80+ utility class definitions |
| 2 | React crash on mount | `DashboardLayout.tsx` used `useEffect` but never imported it | Added `useEffect` to import statement |
| 3 | White screen: "Objects are not valid as React children" | `task.assignee` is sometimes an agent profile object, not a string | Added safe extraction: `typeof task.assignee === "string" ? task.assignee : task.assignee.name` |
| 4 | Module not found errors | `App.tsx` used default imports but components use named exports | Changed to named imports: `{ DashboardLayout }`, `{ TaskHierarchyPanel }`, etc. |

## Files Modified

- [globals.css](file:///Users/apple/Documents/coding-projects/idumb/v2/src/dashboard/frontend/src/styles/globals.css) — Complete rewrite from Tailwind v4 to vanilla CSS
- [DashboardLayout.tsx](file:///Users/apple/Documents/coding-projects/idumb/v2/src/dashboard/frontend/src/components/layout/DashboardLayout.tsx) — Added `useEffect` import, removed unused `Panel` import
- [TaskHierarchyPanel.tsx](file:///Users/apple/Documents/coding-projects/idumb/v2/src/dashboard/frontend/src/components/panels/TaskHierarchyPanel.tsx) — Safe assignee rendering + optional chaining on subtasks
- [App.tsx](file:///Users/apple/Documents/coding-projects/idumb/v2/src/dashboard/frontend/src/App.tsx) — Fixed named imports

## How to Launch

```bash
cd /Users/apple/Documents/coding-projects/idumb/v2
npx tsx src/cli.ts dashboard --no-browser
# Backend: http://localhost:3001
# Frontend: http://localhost:3000
```

## What the Dashboard Shows

- **Task Hierarchy**: 2 epics (Meta Builder Initialization, Intelligence Formation) with tasks and agent assignee badges
- **Planning Artifacts**: 14 files from `.idumb/brain/` with Active/Inactive status badges
- **Brain Knowledge**: Panel ready, currently empty
- **Delegations**: Panel ready, currently empty

## Remaining Polish

- Dark mode toggle (CSS variables already defined, needs `dark` class on `<html>`)
- Panel visual polish (card backgrounds, spacing refinement)
- Markdown preview in Planning Artifacts panel
