---
status: diagnosed
phase: 01-engine-task-bus
source: [01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md, 01-04-SUMMARY.md, 01-05-SUMMARY.md, 01-07-SUMMARY.md]
started: 2026-02-10T02:45:00Z
updated: 2026-02-10T03:05:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Dashboard Startup + Engine Connection
expected: Run `npx tsx src/cli.ts dashboard`. Dashboard loads in browser. Sidebar shows green "Engine running" indicator.
result: pass

### 2. Sidebar Navigation
expected: Click "Chat" in sidebar — Chat page loads with session list. Click "Tasks" — Tasks page loads with sidebar+detail layout. Click "Dashboard" — returns to landing page. Active link is highlighted with blue left border.
result: pass

### 3. Governance Bar
expected: Top of the page shows a thin status strip. It displays governance mode (e.g. "mode: standard"), write-gate status, and "live" or "offline" connection indicator. If governance is active, shows current task name.
result: pass

### 4. Dashboard Landing Cards
expected: Dashboard page shows overview cards — Project Health card with issue count, Active Tasks card with task list, and Quick Actions in sidebar (Quick Chat button).
result: pass

### 5. Chat: Create Session + Send Message
expected: Click "Quick Chat" button in sidebar. New chat session opens. Type a message in the input bar and send. OpenCode responds with streaming text that appears incrementally.
result: issue
reported: "Chat page viewport is shifted/covered when sessions exist. Clicking a session shows empty chat area with only input bar and DELEGATION THREAD label — no message history renders. Viewport drifts to top."
severity: major

### 6. Chat: Tool Call Rendering
expected: If the AI uses a tool during response (e.g. file read), it renders as a collapsible block showing tool name, state badge (running/complete), and expandable input/output.
result: skipped
reason: Blocked by Test 5 — chat messages not rendering

### 7. Tasks: Sidebar Filters
expected: Navigate to Tasks page. Sidebar shows task list (may be empty if no active tasks). Filter buttons (Active/Completed/All) are visible and switch the displayed tasks.
result: issue
reported: "Completed tasks render fine, but clicking active/ongoing tasks crashes with React error #31: object with keys {name, mode, permission, options, native, prompt, description, color} rendered as React child. An agent object is being rendered directly instead of agent.name."
severity: major

### 8. Tasks: Task Detail Panel
expected: If tasks exist, clicking a task in the sidebar shows a detail panel on the right with task name, status, checkpoints, dependencies, and timeline.
result: skipped
reason: Blocked by Test 7 — active tasks crash, detail panel untestable

### 9. Error Recovery
expected: If any page component crashes, a "Something went wrong" error boundary is shown with a "Try Again" button instead of a blank white screen.
result: pass

### 10. Activity Indicator
expected: Sidebar bottom area shows an activity indicator. When OpenCode events fire (e.g. during chat), the indicator updates with a timestamp showing time since last event.
result: pass

## Summary

total: 10
passed: 6
issues: 2
pending: 0
skipped: 2

## Gaps

- truth: "Clicking a chat session loads message history in the viewport"
  status: failed
  reason: "User reported: Chat page viewport is shifted/covered when sessions exist. Clicking a session shows empty chat area with only input bar and DELEGATION THREAD label — no message history renders."
  severity: major
  test: 5
  root_cause: "ChatPage.tsx:122 content div lacks flex flex-col — MessageList h-full consumes 100% height, DelegationThread overflows into InputBar area. Secondary: useMessages() errors silently swallowed (ChatPage.tsx:28) — API failures produce empty [] with no feedback."
  artifacts:
    - path: "src/dashboard/frontend/src/pages/ChatPage.tsx"
      issue: "Line 122: div missing flex flex-col; Line 28: error state discarded from useMessages()"
    - path: "src/dashboard/frontend/src/components/chat/MessageList.tsx"
      issue: "Line 43: h-full should be min-h-0 flex-1 inside flex column"
  missing:
    - "Add flex flex-col to ChatPage.tsx:122 content wrapper"
    - "Change MessageList ScrollArea from h-full to min-h-0 flex-1"
    - "Destructure isLoading/isError from useMessages and show error states"
  debug_session: ""

- truth: "Active tasks render in task sidebar and detail panel without crashing"
  status: failed
  reason: "User reported: Active tasks crash with React error #31 — agent object with keys {name, mode, permission, options, native, prompt, description, color} rendered as React child instead of extracting agent.name"
  severity: major
  test: 7
  root_cause: "OpenCode SDK passes input.agent as full object at runtime (despite string type declaration). chat.params hook in index.ts:120-124 stores it as-is via setCapturedAgent(). TaskNode.assignedTo becomes an object. TaskDetailPanel.tsx:38 renders {task.assignedTo} directly — object as React child crashes. Only active tasks affected because older tasks have string values."
  artifacts:
    - path: "src/index.ts"
      issue: "Line 120-124: agent from chat.params stored without normalization to string"
    - path: "src/dashboard/frontend/src/components/tasks/TaskDetailPanel.tsx"
      issue: "Line 38: {task.assignedTo} renders object directly instead of extracting .name"
    - path: "src/tools/tasks.ts"
      issue: "Line 26-28: getAgent() returns stored object, propagates to new TaskNodes"
  missing:
    - "Normalize input.agent to string in index.ts chat.params hook"
    - "Safe render in TaskDetailPanel.tsx: extract .name from object or use as string"
    - "Fix getAgent() in tasks.ts to normalize return value"
    - "Migration: convert existing object values in graph.json to strings"
  debug_session: ""
