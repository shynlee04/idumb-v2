---
phase: 11-sdk-type-realignment
plan: 03
subsystem: types
tags: [sdk, opencode, zod, validation, sse, boundary-typing]

# Dependency graph
requires:
  - phase: 11-01
    provides: SDK type contract registry (11-CONTRACTS.md)
provides:
  - Zod boundary schemas for all SDK types (Session, Message, Part, SessionStatus)
  - Typed SSE event parsing via parseSSEEvent()
  - Server function validation wrappers (validateSessionList, validateMessages, etc.)
affects: [11-04, chat, sessions, dashboard]

# Tech tracking
tech-stack:
  added: [zod@4.3.6 boundary schemas]
  patterns: [graceful-validation, passthrough-schemas, discriminated-union, generic-validator-signatures]

key-files:
  created:
    - app/server/sdk-validators.ts
  modified:
    - app/server/sessions.ts
    - app/server/config.ts
    - app/hooks/useStreaming.ts
    - app/hooks/useEventStream.tsx
    - app/routes/api/events.ts
    - app/routes/api/sessions.$id.prompt.ts
    - app/shared/engine-types.ts

key-decisions:
  - "Generic validator signatures (T -> T) preserve TanStack Start type flow instead of returning unknown"
  - "Graceful degradation: validators log warnings but return raw data on failure, preventing schema bugs from crashing the app"
  - "12-member Part union matches SDK contract exactly, not plan's 11-member estimate"
  - "SessionStatus uses SDK-actual values (idle/retry/busy), not plan's incorrect (completed/running/error/interrupted)"

patterns-established:
  - "Passthrough schemas: .passthrough() on all objects for SDK forward-compat"
  - "Boundary validation: validate at server function return, not at consumer"
  - "parseSSEEvent replaces raw JSON.parse for typed event parsing"

# Metrics
duration: 17min
completed: 2026-02-11
---

# Phase 11 Plan 03: SDK Boundary Validators Summary

**Zod boundary schemas for all SDK types with graceful degradation, typed SSE parsing, and server function validation wiring**

## Performance

- **Duration:** 17 min
- **Started:** 2026-02-11T10:35:46Z
- **Completed:** 2026-02-11T10:53:05Z
- **Tasks:** 4
- **Files modified:** 8

## Accomplishments
- Created comprehensive Zod schemas for SDK boundary validation: 12-member Part discriminated union, Message union, Session, SessionStatus, ToolState
- Wired validation into all 6 session server functions + 2 config server functions
- Replaced all raw JSON.parse calls in SSE hooks/routes with typed parseSSEEvent()
- Added Event type to engine-types.ts re-exports

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Zod boundary schemas** - `9e9a14b` (feat)
2. **Task 2: Wire validators into server functions** - `f657066` (feat)
3. **Task 3: Type SSE event parsing** - `17870d3` (feat)
4. **Task 4: Verify full type safety** - verification only, no code changes

## Files Created/Modified
- `app/server/sdk-validators.ts` - Zod schemas + validation helpers + parseSSEEvent
- `app/server/sessions.ts` - All 6 handlers now validate SDK returns
- `app/server/config.ts` - Runtime shape-checks on providers/agents arrays
- `app/hooks/useStreaming.ts` - parseSSEEvent replaces JSON.parse
- `app/hooks/useEventStream.tsx` - parseSSEEvent replaces JSON.parse
- `app/routes/api/events.ts` - SDK Event type, removed Record casts
- `app/routes/api/sessions.$id.prompt.ts` - SDK Event type, removed Record casts
- `app/shared/engine-types.ts` - Added Event re-export

## Decisions Made
- **Generic validator signatures:** Used `<T>(data: T): T` instead of `(data: unknown): unknown` — preserves TanStack Start's type inference through server functions. Validators are runtime checks that log warnings, not type transformers.
- **Graceful degradation:** On validation failure, log warning + return raw data. A Zod schema bug should produce a console warning, not a 500 error.
- **12-member Part union:** Plan specified 11 members; SDK contract has 12 (includes `subtask`). Fixed to match reality.
- **SessionStatus corrected:** Plan said `completed|running|error|interrupted`; SDK contract says `idle|retry|busy`. Used SDK-actual values.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] SessionStatus values corrected**
- **Found during:** Task 1 (schema creation)
- **Issue:** Plan specified SessionStatus as `completed|running|error|interrupted` but SDK contract (11-CONTRACTS.md) shows `idle|retry|busy`
- **Fix:** Used contract-accurate values
- **Files modified:** app/server/sdk-validators.ts
- **Verification:** tsc --noEmit passes
- **Committed in:** 9e9a14b

**2. [Rule 1 - Bug] Part union member count corrected**
- **Found during:** Task 1 (schema creation)
- **Issue:** Plan specified 11 Part types but SDK has 12 (missing `subtask`)
- **Fix:** Added SubtaskPart schema
- **Files modified:** app/server/sdk-validators.ts
- **Verification:** tsc --noEmit passes
- **Committed in:** 9e9a14b

**3. [Rule 1 - Bug] Validator return type fixed for TanStack Start compat**
- **Found during:** Task 2 (wiring validators)
- **Issue:** Validators returning `unknown` broke TanStack Start server function type inference
- **Fix:** Changed to generic `<T>(data: T): T` signatures
- **Files modified:** app/server/sdk-validators.ts
- **Verification:** tsc --noEmit passes, server functions return inferred types
- **Committed in:** f657066

---

**Total deviations:** 3 auto-fixed (3 bugs from plan inaccuracies vs SDK contract)
**Impact on plan:** All fixes necessary for correctness. Plan was written before 11-CONTRACTS.md was fully audited — contract is source of truth.

## Issues Encountered
None — all tasks completed without runtime issues.

## Next Phase Readiness
- SDK boundary validation complete, ready for 11-04 (ChatMessage Part rendering)
- All server functions now validate SDK returns at boundary
- SSE event parsing is typed end-to-end
- `tsc --noEmit` passes with zero errors

---
*Phase: 11-sdk-type-realignment*
*Completed: 2026-02-11*

## Self-Check: PASSED

All created files exist on disk. All 3 task commits verified in git log.
