---
status: resolved
trigger: "chat viewport drifts upward during use"
created: 2026-02-10T00:00:00Z
updated: 2026-02-10T00:01:00Z
---

## Current Focus

hypothesis: CONFIRMED — all 5 fixes applied and verified
test: Frontend typecheck, Vite build, project typecheck — all pass
expecting: n/a — complete
next_action: commit and archive

## Symptoms

expected: Chat viewport stays stable — messages render in a proper scroll area, page does not move
actual: Entire viewport drifts upward — the page scrolls up on its own during chat
errors: No console errors — purely a layout/scroll behavior issue
reproduction: Navigate to Chat page, select a session with messages. The viewport gradually drifts upward. Worse during streaming responses.
started: After 01-08 fix that changed viewport layout to flex-col

## Eliminated

(none — root cause was pre-diagnosed)

## Evidence

- timestamp: 2026-02-10T00:00:00Z
  checked: MessageList.tsx line 25-27
  found: useEffect calls scrollIntoView({ behavior: "smooth" }) on every message/stream update
  implication: scrollIntoView walks ALL scrollable ancestors — causes document-level drift

- timestamp: 2026-02-10T00:00:00Z
  checked: app.css base styles
  found: No overflow:hidden on html/body/#root — document itself is scrollable
  implication: scrollIntoView can scroll the document, causing viewport drift

- timestamp: 2026-02-10T00:00:00Z
  checked: ChatPage.tsx aside (session sidebar)
  found: No overflow control on aside element
  implication: Sidebar content can push layout if it grows

- timestamp: 2026-02-10T00:00:00Z
  checked: ChatPage.tsx DelegationThread placement
  found: DelegationThread inside min-h-0 flex-1 container compresses MessageList
  implication: Growing DelegationThread steals space from message scroll area

- timestamp: 2026-02-10T00:00:00Z
  checked: Sidebar.tsx
  found: Uses h-screen which fights with AppShell's h-screen
  implication: Redundant h-screen can cause layout conflicts

## Resolution

root_cause: scrollIntoView propagates to document-level because html/body have no overflow:hidden. Contributing factors include no sidebar overflow control, DelegationThread compressing MessageList, and redundant h-screen in Sidebar.
fix: 5-part fix — (1) html/body/#root overflow:hidden, (2) container-scoped scrolling in MessageList, (3) sidebar overflow control, (4) DelegationThread max-height+overflow, (5) Sidebar h-screen -> h-full
verification: PASSED — frontend tsc --noEmit (0 errors), vite build (clean), project npm run typecheck (0 errors)
files_changed:
  - src/dashboard/frontend/src/styles/app.css
  - src/dashboard/frontend/src/components/chat/MessageList.tsx
  - src/dashboard/frontend/src/components/ui/scroll-area.tsx
  - src/dashboard/frontend/src/pages/ChatPage.tsx
  - src/dashboard/frontend/src/components/layout/Sidebar.tsx
