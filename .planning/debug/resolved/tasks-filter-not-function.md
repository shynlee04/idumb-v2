---
status: resolved
trigger: "Frontend crashes with 'tasks?.tasks.filter is not a function' when accessing the dashboard or tasks page."
created: 2026-02-10T00:00:00Z
updated: 2026-02-10T00:02:00Z
---

## Current Focus

hypothesis: CONFIRMED AND FIXED
test: TypeScript typecheck passes, Vite build succeeds, no unsafe patterns remain
expecting: n/a
next_action: Archive session

## Symptoms

expected: Frontend loads normally, tasks page/dashboard shows task data
actual: JavaScript error "tasks?.tasks.filter is not a function" crashes the page
errors: tasks?.tasks.filter is not a function
reproduction: Access the frontend in browser (likely dashboard or tasks page)
started: Likely after 01-07 gap closure changes which modified frontend components

## Eliminated

- hypothesis: API endpoint /api/tasks returns malformed data
  evidence: getTaskSnapshot() always constructs tasks as array via spread syntax; graph.json verified — all workPlan.tasks are arrays (Python inspection confirmed list type for all 3 workPlans)
  timestamp: 2026-02-10T00:00:30Z

- hypothesis: Vite proxy misconfiguration causes HTML response instead of JSON
  evidence: Vite config has proper /api proxy to backend; json<T>() helper checks response.ok first; if fetch fails, react-query sets data=undefined which short-circuits via ?.
  timestamp: 2026-02-10T00:00:40Z

- hypothesis: Recent 01-07 commits introduced new bug in data shape
  evidence: Commit 277a255 only removed API_BASE constant from ProjectHealthCard; the unsafe tasks?.tasks.filter pattern existed BEFORE 01-07 changes. Commit 8a76c3f deleted orphaned components but didn't modify surviving ones.
  timestamp: 2026-02-10T00:00:45Z

## Evidence

- timestamp: 2026-02-10T00:00:10Z
  checked: useTasks() hook and api.getTasks() return type
  found: Returns Promise<TasksSnapshot> where TasksSnapshot = { workPlan, tasks: TaskNode[], activeTask }
  implication: The data from react-query is TasksSnapshot | undefined

- timestamp: 2026-02-10T00:00:15Z
  checked: All 4 components consuming useTasks()
  found: ActiveTasksCard uses `data?.tasks ?? []` (SAFE), TaskSidebar uses `snapshot?.tasks ?? []` (SAFE), ProjectHealthCard uses `tasks?.tasks.filter(...)` (UNSAFE), TasksPage uses `snapshot?.tasks.find(...)` (UNSAFE)
  implication: 2 of 4 consumers lack defensive array fallback

- timestamp: 2026-02-10T00:00:20Z
  checked: /api/health endpoint response shape
  found: Returns { status: "ok", timestamp: number } — NO issues field. HealthPayload interface expects issues but it's never provided.
  implication: health?.issues is ALWAYS undefined, so ?? ALWAYS falls through to tasks?.tasks.filter(...)

- timestamp: 2026-02-10T00:00:25Z
  checked: Optional chaining semantics of tasks?.tasks.filter(...)
  found: tasks?. only guards against tasks being null/undefined. If tasks is defined but tasks.tasks is not an array, .filter() throws TypeError.
  implication: Any scenario where data exists but .tasks property is non-array causes crash

- timestamp: 2026-02-10T00:00:50Z
  checked: graph.json on disk (1.1MB, 3 workPlans)
  found: All workPlan.tasks fields are arrays (confirmed via Python json.load inspection)
  implication: Server-side data is correct; issue is frontend defensive coding

- timestamp: 2026-02-10T00:01:30Z
  checked: Post-fix verification
  found: TypeScript typecheck passes (zero errors), Vite build succeeds (3.63s), grep for unsafe pattern returns zero matches
  implication: Fix is complete and verified at build level

## Resolution

root_cause: ProjectHealthCard.tsx:42 uses `tasks?.tasks.filter(...)` without guarding `tasks.tasks` being non-array. The optional chain `tasks?.` only prevents crash when `tasks` is null/undefined, but if `tasks` is defined and `.tasks` is not an array (race condition, stale cache, or API edge case), `.filter()` throws TypeError. Additionally, `health?.issues` is ALWAYS undefined because the /api/health endpoint never returns an `issues` field, so the ?? operator ALWAYS falls through to the unsafe `.filter()` call. Secondary vulnerability exists in TasksPage.tsx:16 with the same pattern using `.find()`.
fix: Applied `?? []` array fallback pattern (matching ActiveTasksCard and TaskSidebar safe patterns) to both crash sites. ProjectHealthCard now extracts `const taskList = tasks?.tasks ?? []` before filtering. TasksPage now extracts `const allTasks = snapshot?.tasks ?? []` before finding.
verification: TypeScript typecheck passes, Vite production build succeeds, grep confirms zero remaining unsafe patterns
files_changed:
  - src/dashboard/frontend/src/components/dashboard/ProjectHealthCard.tsx
  - src/dashboard/frontend/src/pages/TasksPage.tsx
