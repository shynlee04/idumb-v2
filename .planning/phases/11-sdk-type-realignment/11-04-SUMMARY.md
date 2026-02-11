---
phase: 11-sdk-type-realignment
plan: 04
subsystem: types
tags: [sdk, opencode, discriminated-union, type-narrowing, sse, part-rendering]

# Dependency graph
requires:
  - phase: 11-03
    provides: Zod boundary schemas, parseSSEEvent, validated server functions
  - phase: 11-01
    provides: SDK type contract registry (11-CONTRACTS.md), engine-types.ts re-exports
provides:
  - SDK-typed chat route with proper { info: Message; parts: Part[] } mapping
  - Part discriminated union narrowing in ChatMessage rendering (12 SDK Part types)
  - ToolPart state-aware rendering (pending/running/completed/error)
  - getTextContent() helper for extracting text from Part[] via type predicate
  - End-to-end type chain: SDK -> server (Zod) -> SSE (typed parse) -> hook -> component
affects: [chat, ui, streaming, phase-7]

# Tech tracking
tech-stack:
  added: []
  patterns: [sdk-discriminated-union-narrowing, server-message-shape-typing, tool-state-rendering]

key-files:
  modified:
    - app/routes/chat.$sessionId.tsx
    - app/components/chat/ChatMessage.tsx

key-decisions:
  - "SDK session.messages() returns Array<{ info: Message; parts: Part[] }>, not flat Message[] -- route mapping fixed to access item.info.role"
  - "ChatMessageData keeps content?: string for streaming fallback alongside SDK Part[] for server messages"
  - "ToolPart rendered with state-aware display using ToolState discriminated union (not old tool-call/tool-result split)"
  - "Meta/internal Part types (step/snapshot/patch/agent/retry/compaction/subtask) render as null -- not user-facing"
  - "extractTextFromEvent updated with SDK delta path (properties.delta) for OpenCode SSE event format"

patterns-established:
  - "Discriminated union narrowing: switch(part.type) with TypeScript narrowing, not as-any casts"
  - "Server message shape: Array<{ info: Message; parts: Part[] }> from SDK, not flat Message[]"
  - "Streaming vs server dual-path: content string for streaming, Part[] for server messages"
  - "Type predicate helpers: (p): p is TextPart => p.type === 'text' for Part array filtering"

# Metrics
duration: 13min
completed: 2026-02-11
---

# Phase 11 Plan 04: SDK Consumer Migration Summary

**SDK Part discriminated union narrowing in ChatMessage with type-safe server message mapping and end-to-end type chain completion**

## Performance

- **Duration:** 13 min
- **Started:** 2026-02-11T14:21:37Z
- **Completed:** 2026-02-11T14:34:42Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Migrated chat route to properly type SDK server messages as `Array<{ info: Message; parts: Part[] }>` (fixed incorrect `msg.role` access that was always returning undefined)
- Replaced hand-rolled `MessagePart` interface with SDK `Part` discriminated union in ChatMessage rendering
- Implemented full PartRenderer with switch-based narrowing for all 12 SDK Part types (text, tool, reasoning, file, + 8 meta types)
- Added ToolPartRenderer with ToolState discriminated union rendering (pending/running/completed/error badges)
- Verified end-to-end type chain: SDK -> Zod validation -> server function -> SSE (typed parse) -> hook -> component

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate useStreaming and chat route to SDK-typed patterns** - `93d65c4` (feat)
2. **Task 2: Migrate ChatMessage to Part discriminated union narrowing** - `216d091` (feat)

## Files Created/Modified
- `app/routes/chat.$sessionId.tsx` - SDK-typed server message mapping, improved extractTextFromEvent with SDK delta path
- `app/components/chat/ChatMessage.tsx` - Part discriminated union narrowing, ToolState rendering, getTextContent helper

## Decisions Made
- **SDK message shape discovery:** `session.messages()` returns `Array<{ info: Message; parts: Part[] }>`, not flat `Message[]`. The previous code accessed `msg.role` which was always `undefined` (role is at `msg.info.role`). This was a silent data bug -- all server messages appeared as "assistant" regardless of actual role.
- **Dual content path preserved:** `ChatMessageData` keeps `content?: string` for streaming text accumulation and `parts?: Part[]` for server messages. The `MessageBody` component checks parts first, falls back to content. This avoids needing the streaming hook to construct synthetic Part objects.
- **Tool rendering redesigned:** Old `PartRenderer` handled `tool-call` and `tool-result` as separate part types. SDK has a single `ToolPart` with a `state: ToolState` discriminated union. The new `ToolPartRenderer` renders all four states (pending/running/completed/error) with status badges.
- **Meta parts skipped:** 8 SDK Part types (step-start, step-finish, snapshot, patch, agent, retry, compaction, subtask) are internal/meta -- they don't have user-facing content and render as `null`. Future UI enhancements can add rendering for these.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Server message shape was wrong -- roles always showed as "assistant"**
- **Found during:** Task 1
- **Issue:** Code accessed `msg.role` on `Record<string, unknown>` but SDK returns `{ info: Message; parts: Part[] }`. Since `role` doesn't exist at top level, it was always `undefined`, defaulting to `"assistant"`.
- **Fix:** Changed to `item.info.role` using proper SDK message shape typing
- **Files modified:** app/routes/chat.$sessionId.tsx
- **Verification:** tsc --noEmit passes, role access type-safe
- **Committed in:** 93d65c4

**2. [Rule 1 - Bug] extractTextFromEvent missing SDK event delta path**
- **Found during:** Task 1
- **Issue:** OpenCode SSE events use `{ properties: { delta: "..." } }` shape, which the old function didn't handle
- **Fix:** Added `data.properties.delta` extraction path with proper typeof narrowing
- **Files modified:** app/routes/chat.$sessionId.tsx
- **Verification:** tsc --noEmit passes
- **Committed in:** 93d65c4

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes necessary for correctness. The role bug was a silent data error from Phase 5 that would have misattributed all server messages.

## Issues Encountered
None -- all tasks completed without runtime issues.

## User Setup Required
None -- no external service configuration required.

## Next Phase Readiness
- Phase 11 (SDK Type Architecture) is COMPLETE -- all 4 plans done
- End-to-end type chain verified: SDK -> Zod boundaries -> server functions -> SSE -> hooks -> components
- Ready for Phase 7 (Chat + Terminal) with type-safe foundation
- `tsc --noEmit` passes with zero errors
- `npm test` passes with zero failures

---
*Phase: 11-sdk-type-realignment*
*Completed: 2026-02-11*

## Self-Check: PASSED

All modified files exist on disk. Both task commits verified in git log.
