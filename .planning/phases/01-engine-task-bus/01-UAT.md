---
status: complete
phase: 01-engine-task-bus
source: [01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md, 01-04-SUMMARY.md, 01-05-SUMMARY.md, 01-07-SUMMARY.md, 01-08-SUMMARY.md]
started: 2026-02-10T02:45:00Z
updated: 2026-02-10T05:00:00Z
reverify_round: 2
reverify_reason: "01-08 gap closure landed — re-testing tests 5, 6, 7, 8"
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
reported_r1: "Chat page viewport is shifted/covered when sessions exist. Clicking a session shows empty chat area with only input bar and DELEGATION THREAD label — no message history renders. Viewport drifts to top."
fix_applied: "01-08: flex-col layout, min-h-0 flex-1 ScrollArea, loading/error states"
reported_r2: "Messages now render but the entire viewport drifts upward — react drift up screen"
severity: major

### 6. Chat: Tool Call Rendering
expected: If the AI uses a tool during response (e.g. file read), it renders as a collapsible block showing tool name, state badge (running/complete), and expandable input/output.
result: pass
note: "Previously skipped (blocked by Test 5). Passed on re-test."

### 7. Tasks: Sidebar Filters
expected: Navigate to Tasks page. Sidebar shows task list (may be empty if no active tasks). Filter buttons (Active/Completed/All) are visible and switch the displayed tasks.
result: pass
note: "Previously failed with React error #31. 01-08 fix confirmed — agent normalization working."

### 8. Tasks: Task Detail Panel
expected: If tasks exist, clicking a task in the sidebar shows a detail panel on the right with task name, status, checkpoints, dependencies, and timeline.
result: pass
note: "Previously skipped (blocked by Test 7). Passed on re-test — agent normalization confirmed."

### 9. Error Recovery
expected: If any page component crashes, a "Something went wrong" error boundary is shown with a "Try Again" button instead of a blank white screen.
result: pass

### 10. Activity Indicator
expected: Sidebar bottom area shows an activity indicator. When OpenCode events fire (e.g. during chat), the indicator updates with a timestamp showing time since last event.
result: pass

## Summary

total: 10
passed: 9
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "Chat viewport stays stable — no drift, messages render in proper scroll area"
  status: fixed_not_reverified
  reason: "Fix applied in commit 6240916 (5 changes: scroll isolation, overflow containment, sidebar/delegation containment, h-screen→h-full). User passed tests 6-8 which depend on chat working, but test 5 not explicitly re-verified after drift fix."
  severity: major
  test: 5
  root_cause: "scrollIntoView in MessageList.tsx:25-27 propagates scroll to all ancestors including document body. html/body lack overflow:hidden, enabling document-level scroll. ChatPage aside has no overflow control. DelegationThread inside flex column compresses MessageList."
  artifacts:
    - path: "src/dashboard/frontend/src/components/chat/MessageList.tsx"
      issue: "Line 25-27: scrollIntoView walks all ancestors, not just scroll container"
    - path: "src/dashboard/frontend/src/styles/app.css"
      issue: "html/body missing overflow:hidden and height:100%"
    - path: "src/dashboard/frontend/src/pages/ChatPage.tsx"
      issue: "Session sidebar aside has no overflow control; DelegationThread inside flex-1 compresses MessageList"
    - path: "src/dashboard/frontend/src/components/layout/Sidebar.tsx"
      issue: "h-screen fights with parent AppShell h-screen"
  missing:
    - "Add overflow:hidden and height:100% to html, body, #root in app.css"
    - "Replace scrollIntoView with container-scoped scrollTop = scrollHeight"
    - "Add overflow-y-auto and h-full to ChatPage aside"
    - "Move DelegationThread outside flex-1 container or give it max-height"
    - "Change Sidebar h-screen to h-full"
  debug_session: ""

- truth: "Active tasks render in task sidebar and detail panel without crashing"
  status: fixed_verified
  reason: "01-08 fix confirmed in UAT R2 — test 7 passes, no React error #31."
  severity: major
  test: 7
  root_cause: "Fixed by 01-08 — agent identity normalized to string at source and consumers"
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Dashboard provides standalone configuration — AI provider, model selector, agent management"
  status: missing_capability
  reason: "User observed: dashboard has no configuration UI — can't connect to AI provider, select models, or manage agents. Without these, it's not standalone."
  severity: major
  test: general
  root_cause: "Phase 1 scoped dashboard as visualization layer, not management layer. Configuration requires OpenCode to be pre-configured externally."
  artifacts: []
  missing:
    - "Settings page with AI provider connection (API keys, endpoints)"
    - "Model selector per agent role"
    - "Agent manager (enable/disable, configure 3-agent system)"
    - "Settings persistence UI backed by .idumb/config.json"
  debug_session: ""
  note: "Scope gap — may belong in Phase 2 or as a new phase. Blocks standalone use."
