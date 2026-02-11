---
phase: 11-sdk-type-realignment
verified: 2026-02-11T22:10:00Z
status: passed
score: 5/5 must-haves verified
gaps: []
---

# Phase 11: SDK Type Architecture + Boundary Validation — Verification Report

**Phase Goal:** Establish validated, research-backed SDK type contracts at all app boundaries, govern executor behavior around type safety, document expected type alarms for downstream phases, and migrate all consumers to SDK-native shapes with Zod-guarded boundaries

**Verified:** 2026-02-11T22:10:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Contract registry documents every SDK type consumed by this app with field shapes, nullable fields, and discriminant values | VERIFIED | `11-CONTRACTS.md` exists at 862 lines with 11 sections covering 30+ SDK types (Session, Message, 12-member Part union, SessionStatus, ToolState, 5 Error types, Event types, Config types, Auxiliary types). Consumer Map covers 11 consumer files with property access patterns. Gap Analysis and Gotchas (10 items) present. |
| 2 | AGENTS.md contains SDK type governance rules: taxonomy, banned patterns, false alarm table | VERIFIED | `AGENTS.md` lines 408-495: Type Taxonomy (SDK = law, app = internal), Import Path Rules with code examples, 5 Banned Patterns with code examples, SDK Version Contract (4-step upgrade protocol), Known Type Alarms (4 entries with workarounds + protocol). |
| 3 | Zod schemas exist at server function boundaries validating SDK data shape before it reaches hooks/components | VERIFIED | `app/server/sdk-validators.ts` (344 lines): PartSchema (12-member `z.discriminatedUnion`), MessageSchema (user/assistant), SessionStatusSchema (idle/retry/busy), SessionSchema, ToolStateSchema (4-member). All use `.passthrough()`. Validation functions (`validateSessionList`, `validateSession`, `validateMessages`, `validateSessionStatus`, `parseSSEEvent`) exported and wired into `sessions.ts` at all 7 return boundaries. |
| 4 | All consumers use SDK Part/Event discriminated unions with proper narrowing — zero `as any` casts on SDK types | VERIFIED | `useStreaming.ts` line 14: imports `parseSSEEvent` from `sdk-validators`, uses it at line 109 (replaces raw `JSON.parse`). `ChatMessage.tsx` line 13: imports `Part, TextPart, ToolPart` from `engine-types`; `PartRenderer` uses `switch(part.type)` covering all 12 SDK Part types; `ToolPartRenderer` narrows on `state.status`. `chat.$sessionId.tsx` line 22: imports `Message, Part`; maps server messages via `item.info.role` and `item.parts`. Zero `as any` on SDK types in any of the 3 consumer files. |
| 5 | `tsc --noEmit` passes with zero errors after full migration | VERIFIED | `npx tsc --noEmit` produces empty output (zero errors, zero warnings). |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `.planning/phases/11-sdk-type-realignment/11-CONTRACTS.md` | SDK type contract registry — single executor reference | VERIFIED (862 lines) | 11 sections: core types, message subtypes, part subtypes (12 members), tool state, errors, events, config, auxiliary, consumer map (11 files), gap analysis, violation scan + gotchas (10 items) |
| `AGENTS.md` (SDK Type Governance section) | Type governance rules + false alarm registry | VERIFIED (lines 408-495, ~88 lines added) | Type Taxonomy, Import Path Rules, 5 Banned Patterns with code examples, SDK Version Contract, False Alarm Registry (4 entries + protocol) |
| `app/server/sdk-validators.ts` | Zod boundary validation schemas for SDK types | VERIFIED (344 lines) | Exports: PartSchema, MessageSchema, SessionSchema, SessionStatusSchema, validateSessionList, validateSession, validateMessages, validateSessionStatus, parseSSEEvent. All schemas use `.passthrough()` for forward compatibility. Graceful degradation (log + return raw on failure). |
| `app/server/sessions.ts` | Server functions with Zod-validated SDK data | VERIFIED (171 lines) | Imports all 4 validators from sdk-validators (line 18-23). Applied in: getSessionsFn (line 34), createSessionFn (line 50), getSessionFn (line 66), getSessionMessagesFn (line 107), getSessionStatusFn (line 149), getSessionChildrenFn (line 166). |
| `app/hooks/useStreaming.ts` | SSE streaming with validated event parsing | VERIFIED (160 lines) | Imports `parseSSEEvent` (line 14), uses it in SSE loop (line 109). Returns typed `{ type: string; [key: string]: unknown }` instead of raw `any`. |
| `app/components/chat/ChatMessage.tsx` | Part discriminated union narrowing renderer | VERIFIED (197 lines) | Imports `Part, TextPart, ToolPart` (line 13). `PartRenderer` uses switch on `part.type` covering all 12 types. `ToolPartRenderer` narrows `state.status` (pending/running/completed/error). `getTextContent()` helper uses type predicate `(p): p is TextPart`. |
| `app/routes/chat.$sessionId.tsx` | SDK-typed chat route with proper message mapping | VERIFIED (168 lines) | Imports `Message, Part` (line 22). Maps `Array<{ info: Message; parts: Part[] }>` at line 78 using `item.info.role`. |
| `app/shared/engine-types.ts` | SDK type re-export gateway | VERIFIED (144 lines) | Re-exports 18 SDK types: Session, SessionStatus, Message, UserMessage, AssistantMessage, Part, TextPart, ToolPart, FilePart, ReasoningPart, StepStartPart, StepFinishPart, SnapshotPart, PatchPart, AgentPart, RetryPart, CompactionPart, Event. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `sdk-validators.ts` | `sessions.ts` | `import { validateSessionList, validateSession, validateMessages, validateSessionStatus }` | WIRED | sessions.ts line 18-23: imports all 4 validators. Used at lines 34, 50, 66, 107, 149, 166. |
| `sdk-validators.ts` | `useStreaming.ts` | `import { parseSSEEvent }` | WIRED | useStreaming.ts line 14: import. Line 109: `parseSSEEvent(line.slice(6))`. |
| `sdk-validators.ts` | `useEventStream.tsx` | `import { parseSSEEvent }` | WIRED | useEventStream.tsx line 25: import. Lines 77, 99: `parseSSEEvent(e.data)`. |
| `ChatMessage.tsx` | `engine-types.ts` | `import type { Part, TextPart, ToolPart }` | WIRED | Line 13: type import. Used in switch (line 96-143), ToolPartRenderer (line 150), getTextContent type predicate (line 79). |
| `chat.$sessionId.tsx` | `engine-types.ts` | `import type { Message, Part }` | WIRED | Line 22: type import. Line 78: `Array<{ info: Message; parts: Part[] }>` cast. |
| `chat.$sessionId.tsx` | `useStreaming.ts` | `useStreaming()` | WIRED | Line 71: `useStreaming()` destructured. Line 113: `sendPrompt(sessionId, text)`. |
| `sessions.ts` | `chat.$sessionId.tsx` | Server function returns flow via React Query / loader | WIRED | Line 70: `useSessionMessages(sessionId)` fetches from `getSessionMessagesFn`. |

### Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| FND-02 (updated — SDK types = law for engine contracts, app types = internal state only, Zod at boundaries) | SATISFIED | None |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/routes/api/events.ts` | 81 | `as any` on TanStack Start route handler config | Info | Framework interop — NOT on SDK types. Has eslint-disable comment. |
| `app/routes/api/sessions.$id.prompt.ts` | 139 | `as any` on TanStack Start route handler config | Info | Framework interop — NOT on SDK types. Has eslint-disable comment. |
| `app/server/config.ts` | 17 | Direct SDK import (`Provider, Agent, Path, VcsInfo`) | Warning | Violates Import Path Rules in AGENTS.md. These 4 types are not re-exported through engine-types.ts. Not blocking — types are server-only. |
| `AGENTS.md` | 487 | False alarm registry says "SDK Part union has 11 members" | Info | Actual SDK has 12 (includes subtask). Minor doc inaccuracy, non-blocking. |

### Human Verification Required

### 1. SSE Streaming End-to-End

**Test:** Open the app, start a chat session, send a prompt, and observe the streaming response.
**Expected:** Text streams in real-time without errors. After streaming completes, messages appear with proper role attribution (user vs assistant). Tool calls render with status badges (pending/running/completed/error). Reasoning parts show in collapsible "Thinking..." sections.
**Why human:** SSE streaming behavior, visual rendering of Part types, and real-time state transitions cannot be verified by static analysis.

### 2. Server Message Rendering After Reload

**Test:** After a chat session has messages, reload the page.
**Expected:** Server messages load and render with proper role badges (user = person icon, assistant = bot icon). Parts render correctly (text as markdown, tools as cards, reasoning as collapsible). Previously, `item.info.role` was accessed as `msg.role` which was always undefined — verify the fix works.
**Why human:** Server → loader → component data flow with SDK message shape (`{ info: Message; parts: Part[] }`) needs runtime verification.

### Gaps Summary

No gaps found. All 5 success criteria from ROADMAP.md are met:

1. **Contract registry** — 11-CONTRACTS.md at 862 lines with comprehensive type documentation, consumer map, gap analysis, and gotchas.
2. **AGENTS.md governance** — SDK Type Governance section with taxonomy, 5 banned patterns, import rules, version contract, and 4-entry false alarm registry.
3. **Zod boundary schemas** — sdk-validators.ts with 4 discriminated union schemas, 5 validator functions, all wired into sessions.ts and SSE hooks.
4. **Consumer migration** — All 3 named consumers (useStreaming.ts, ChatMessage.tsx, chat.$sessionId.tsx) use SDK types with proper narrowing. Zero `as any` on SDK types.
5. **tsc --noEmit** — Passes with zero errors.

### Informational Notes

- **config.ts direct SDK imports:** Provider, Agent, Path, VcsInfo are imported directly from `@opencode-ai/sdk` because they are not re-exported through engine-types.ts. The Gap Analysis in 11-CONTRACTS.md identifies these as "recommended" re-exports. This should be addressed in a future plan (adding them to engine-types.ts) but does not block Phase 11 goals.
- **9 commits verified:** 3f47478, 769a342, ec72638, 364babc, 9e9a14b, f657066, 17870d3, 93d65c4, 216d091 — all present in git log.
- **useEventStream.tsx** was also migrated to use parseSSEEvent (not listed in success criteria but provides additional coverage).

---

_Verified: 2026-02-11T22:10:00Z_
_Verifier: Claude (gsd-verifier)_
