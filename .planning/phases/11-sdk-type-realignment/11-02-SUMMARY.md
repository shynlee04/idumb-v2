---
phase: 11-sdk-type-realignment
plan: 02
subsystem: governance
tags: [sdk-types, type-safety, agents-md, false-alarms, documentation]

# Dependency graph
requires:
  - phase: 11-01
    provides: SDK type audit and contracts research
provides:
  - SDK Type Governance rules in AGENTS.md (binding for all executors)
  - False Alarm Registry for known tsc issues with documented workarounds
  - Import path rules centralizing SDK access through engine-types.ts
  - Banned patterns preventing type drift (5 patterns with code examples)
affects: [11-03, 11-04, all future SDK-touching work]

# Tech tracking
tech-stack:
  added: []
  patterns: [two-tier type taxonomy, centralized SDK re-export, false alarm registry]

key-files:
  created: []
  modified: [AGENTS.md]

key-decisions:
  - "SDK types are LAW — never redefine, app types are INTERNAL — freely modifiable"
  - "All SDK imports must go through engine-types.ts, never direct from @opencode-ai/sdk"
  - "4 known false alarms documented with workarounds and resolution timelines"

patterns-established:
  - "Two-tier type system: SDK types (immutable law) vs app types (internal, modifiable)"
  - "False alarm registry: check table before creating workarounds for tsc errors"
  - "SDK version contract: upgrade protocol with 4-step checklist"

# Metrics
duration: 3min
completed: 2026-02-11
---

# Phase 11 Plan 02: AGENTS.md Governance Rules Summary

**SDK Type Governance section with two-tier taxonomy, 5 banned patterns, import path rules, and false alarm registry for 4 known tsc issues**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-11T10:13:19Z
- **Completed:** 2026-02-11T10:16:17Z
- **Tasks:** 3
- **Files modified:** 1

## Accomplishments
- Added SDK Type Governance section to AGENTS.md with binding rules for all executors
- Established two-tier type taxonomy: SDK types (law) vs app types (internal)
- Documented 5 banned patterns with ✅/❌ code examples for each
- Created false alarm registry with 4 known type alarms and workarounds
- Defined SDK version contract with 4-step upgrade protocol

## Task Commits

Each task was committed atomically:

1. **Task 1: Add SDK Type Governance rules** - `ec72638` (docs)
2. **Task 2: Add false alarm registry** - `364babc` (docs)
3. **Task 3: Verify AGENTS.md integrity** — No commit (verification only: typecheck clean, 512 assertions pass)

## Files Created/Modified
- `AGENTS.md` - Added ~89 lines: SDK Type Governance section (lines 408-495) with Type Taxonomy, Import Path Rules, Banned Patterns, SDK Version Contract, and Known Type Alarms subsections

## Decisions Made
- SDK types are immutable law, app types are freely modifiable — two-tier system matches existing codebase pattern
- False alarm registry tracks 4 known issues: JsonValue constraint (TanStack Start), implicit any SSE parsing, Part.content narrowing, Part union verbosity
- Import centralization via engine-types.ts — single update point for SDK upgrades

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Governance rules established in AGENTS.md, ready for Plan 03 (SDK contracts + validators)
- False alarm registry provides known-good workarounds for Plans 03-04 implementation
- All future SDK-type work has clear import path and banned pattern rules

---
*Phase: 11-sdk-type-realignment*
*Completed: 2026-02-11*
