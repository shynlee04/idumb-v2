# Phase 5: Framework Foundation - Context

**Gathered:** 2026-02-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Platform runs on TanStack Start (SPA mode) with type-safe server functions replacing Express route handlers, SSE streaming for OpenCode SDK chat events, and Drizzle ORM for persistent SQLite data layer. Phase 5 delivers the foundation + core transport. Phases 6-8 rebuild features on top.

Requirements: FND-01, FND-02, FND-03, FND-04

</domain>

<decisions>
## Implementation Decisions

### Migration strategy
- Foundation + incremental migration across phases (not full parity in Phase 5)
- Phase 5 delivers: TanStack Start scaffold, server functions for core transport, SSE streaming, Drizzle ORM
- Phases 6-8 rebuild features (IDE shell, chat, sessions) on the new foundation
- Existing Phase 1 components are wrapped into TanStack Start file-based routing — new routes import existing components with minimal changes to component code

### Express replacement
- Clean cut — old Express server.ts (1427 LOC) is split into server functions in Phase 5
- Express dependency is removed entirely, not kept as middleware layer
- Routes not yet needed by Phase 5 are not stubbed — they simply don't exist until the phase that needs them (Phase 6-8) rebuilds them
- No parallel run of old + new servers

### Functional proof (critical path)
- Chat + SSE streaming + engine control + session management must all be functional
- This is the minimum that proves TanStack Start works end-to-end: user sends message, sees AI response via SSE, can start/stop engine, can create/switch/delete sessions
- Tasks page, Settings page, Dashboard landing — not required in Phase 5 (rebuilt in later phases)

### Dev startup
- Unified dev command — one command starts TanStack Start dev server AND auto-starts the OpenCode engine
- Working chat with basic markdown rendering (headers, bold, code blocks) — readable responses, not raw text, not fancy
- Proves the full transport chain: browser → server function → OpenCode SDK → SSE → browser

### Claude's Discretion
- Settings persistence scope (iDumb config, UI preferences, model prefs) — decide what's best-in-class for the architecture
- Task persistence approach (JSON files via StateManager vs migrate to Drizzle) — decide what sets up future phases cleanly
- Workspace config definition and scope — decide what workspace state needs to persist
- SQLite database file location (per-project vs user-level) — decide based on architectural best fit
- Hot-reload behavior (HMR + server restart patterns)
- Monaco worker plugin configuration for Vite

</decisions>

<specifics>
## Specific Ideas

- User wants the "it works" moment to be a working chat — send a message, see an AI response stream in. Not a status page, not a bare routing proof.
- Basic markdown rendering for chat responses (not raw text). Doesn't need shiki/syntax-highlighting — that's Phase 7.
- The existing 22+ React components from Phase 1 should remain importable — wrap them in TanStack Start routes rather than archiving. This preserves working UI while the foundation changes underneath.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-framework-foundation*
*Context gathered: 2026-02-10*
