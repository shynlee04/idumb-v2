# Roadmap: iDumb — AI Knowledge Work Platform

**Created:** 2026-02-09
**Updated:** 2026-02-10 (architecture pivot: plugin demoted, SDK-direct)
**Phases:** 7 (4 original + 3 gap closure)
**Requirements:** 22 v1
**Depth:** Quick

## Architecture Pivot (2026-02-10)

Plugin system demoted. OpenCode is used as **Engine via SDK** directly from dashboard backend — NOT as a plugin host. Tool-gate, compaction hooks, and all plugin-based governance are deprecated. The product is a **standalone multi-agent workspace** that controls agents for various purposes beyond coding.

## Phase Overview

| # | Phase | Goal | Requirements | Plans | Status |
|---|-------|------|--------------|-------|--------|
| 1 | Engine + Task Bus | Runnable chat UI with OpenCode engine, task hierarchy, config UI | ENG-01*, ENG-02, ENG-03, DEL-01, DEL-04 | 10 | Done |
| 1A | Plugin Demotion + Cleanup | Archive plugin code, fix doc drift, remove @opencode-ai/plugin dependency | — (architecture) | 2 | Planned |
| 1B | Dashboard Feature Completion | Make all UI features functional — settings save, code quality, interactive inputs | — (quality) | 0 | Pending |
| 1C | Multi-Agent Workspace Engine | Agent spawning from UI, multi-session management, workspace controls | ENG-02 (full) | 0 | Pending |
| 2 | Planning Registry + Commit Governance | Tracked development workflow — planning artifacts, atomic commits, codebase wiki | REG-01, REG-02, DEL-02, DEL-03, WIKI-01, WIKI-02, WIKI-03 | 2 | Pending |
| 3 | Knowledge Engine | Chain-break governance, tech stack tracking, research agents, knowledge synthesis | REG-03, REG-04, KB-01, KB-02, KB-03, ENG-04 | 2 | Pending |
| 4 | UI Views + Source Synthesis | Specialized UI views for delegation/planning + NotebookLM-style synthesis | UI-01, UI-02, UI-03, ENG-05 | 2 | Pending |

*ENG-01 re-scoped: governance enforcement via SDK-direct calls, not plugin hooks

---

## Phase 1: Engine + Task Bus

**Goal:** A runnable web application where users chat with OpenCode through the browser, tasks exist as a 3-level hierarchy, and governance hooks enforce write-gates.

**Requirements:**
- **ENG-01**: Governance hooks wired through OpenCode SDK — tool-gate (blocks writes without active task), compaction (anchor injection), context injection (system.transform with active trajectory only)
- **ENG-02**: Agent orchestration through OpenCode Server — multiple AI sessions managed programmatically, agents spawned/coordinated for multi-step workflows
- **ENG-03**: Chat completion through the Web UI — user sends messages, OpenCode processes them, streaming responses rendered in the browser
- **DEL-01**: 3-level task hierarchy — Epic (Coordinator) → Task (Investigator/Executor) → Subtask (Executor) — replacing the innate TODO list
- **DEL-04**: Schema-regulated metadata — agents must emit structured delegation data: which agent delegated, to whom, doing what, expected output, and downstream agents must emit which tools executed, for which plan, and last assistant message

**Success Criteria:**
1. User opens `localhost:PORT` in a browser, sees a chat interface, sends a message, and receives a streaming response from OpenCode
2. User can create Epics with child Tasks and Subtasks; the 3-level hierarchy is persisted as JSON and queryable via API
3. Governance hooks fire on tool execution — file writes are blocked when no task is active
4. Agent sessions are spawned and coordinated programmatically through OpenCode Server; multiple agents can run concurrently

**Dependencies:** None — this is the foundation. Requires aggressive cleanup of existing codebase (branch, strip dead code, rebuild).

**Plans:** 10 plans

Plans:
- [x] 01-01-PLAN.md — Backend Engine: OpenCode Server lifecycle + Session Proxy API + SSE relay
- [x] 01-02-PLAN.md — Frontend App Shell: React Router + Layout + Sidebar + API hooks
- [x] 01-03-PLAN.md — Chat Interface: Streaming renderer + Part renderers + Input bar
- [x] 01-04-PLAN.md — Task Bus: Task API routes + Task sidebar + Task detail + Rich cards
- [x] 01-05-PLAN.md — Multi-Agent Delegation + Governance: Threaded delegation + Governance bar
- [x] 01-06-PLAN.md — Dashboard Landing + Integration: Overview page + Human verification checkpoint
- [x] 01-07-PLAN.md — Gap Closure: 16 pre-UAT audit flaws (backend, frontend, docs)
- [x] 01-08-PLAN.md — Gap Closure: UAT gaps — chat viewport layout + agent object normalization + data migration
- [x] 01-09-PLAN.md — Config gap closure: Backend config routes + Model/Agent selectors + ChatPage wiring
- [x] 01-10-PLAN.md — Config gap closure: Settings page (4 tabs) + Enhanced sidebar connection indicator

---

## Phase 1A: Plugin Demotion + Architecture Cleanup

**Goal:** Archive all plugin code (hooks, tools, plugin entry). Fix documentation drift. Remove `@opencode-ai/plugin` dependency. Dashboard backend with `@opencode-ai/sdk` is the sole entry point.

**Gap Closure:** DOC-DRIFT, SDK-CLIENT-UNUSED, DUAL-STATE, PLUGIN-UNVERIFIED

**Success Criteria:**
1. `src/index.ts`, `src/hooks/*`, `src/tools/*` archived to `src/_archived-plugin/`
2. AGENTS.md updated — no references to plugin hooks, tool-gate, or deleted files
3. `@opencode-ai/plugin` removed from package.json — only `@opencode-ai/sdk` remains
4. Test count and file references accurate in all docs
5. `npm run typecheck` and `npm test` pass after removal

**Dependencies:** Phase 1 complete.

**Plans:** 2 plans

Plans:
- [ ] 1A-01-PLAN.md — Archive plugin source (hooks, tools, entry) + fix build chain
- [ ] 1A-02-PLAN.md — Fix documentation drift (AGENTS.md, README.md, CHANGELOG.md)

---

## Phase 1B: Dashboard Feature Completion

**Goal:** Make all existing UI features fully functional. No more read-only stubs or disabled buttons. Every feature either works end-to-end or is removed.

**Gap Closure:** SETTINGS-READONLY, HEALTH-STUB, CHAT-STUBS, CONSOLE-ERROR

**Success Criteria:**
1. Settings page: governance mode readable from config + saveable via API
2. Settings page: appearance theme persisted beyond localStorage
3. Code quality: `/api/health` returns real grade, fileCount, LOC, issues from `code-quality.ts` scanner
4. Code quality: Run Scan button enabled and triggers backend scan
5. InputBar: basic file attachment upload or button removed
6. InputBar: basic slash command palette or button removed
7. ErrorBoundary uses file-based logging, not console.error

**Dependencies:** Phase 1A complete (plugin code archived, clean dependency tree).

**Plans:** 0 (to be planned via `/gsd-plan-phase 1B`)

---

## Phase 1C: Multi-Agent Workspace Engine

**Goal:** Transform the dashboard from a chat UI into a multi-agent workspace. Users spawn agents for various purposes (coding, research, writing, analysis), manage multiple concurrent sessions, and monitor agent activity — all through the browser.

**Gap Closure:** ENG-02-PARTIAL + new multi-agent workspace capability

**Requirements:**
- **ENG-02** (full): Agent orchestration through OpenCode Server — multiple AI sessions managed programmatically, agents spawned/coordinated for multi-step workflows

**Success Criteria:**
1. User can spawn a new agent session from the UI with a system prompt / context
2. Multiple agent sessions run concurrently — sidebar shows all active sessions with status
3. User can switch between agent sessions, seeing each agent's conversation independently
4. Workspace controls: stop, restart, or abort any agent session from the UI
5. Agent activity monitor: live view of what each agent is doing (tools called, files modified)

**Dependencies:** Phase 1B complete (dashboard features work end-to-end).

**Plans:** 0 (to be planned via `/gsd-plan-phase 1C`)

---

## Phase 2: Planning Registry + Commit Governance

**Goal:** Planning artifacts stored as a traversable JSON graph with staleness tracking. Every code change is committed atomically with task linkage, diff tracking, and rationale — creating a fully traced development workflow.

**Requirements:**
- **REG-01**: Planning artifacts stored as JSON nodes in a hierarchical graph (Chain → Artifact → Section → Task), not flat markdown files
- **REG-02**: Every artifact node carries a timestamp (created, modified) used for staleness detection and temporal ordering
- **DEL-02**: Atomic commit enforcement — when a task moves to `completed`, the system checks `git diff`; if diff exists, forces a commit with task ID reference in the message
- **DEL-03**: Empty diff blocks completion — task cannot complete if `git diff` is empty (no changes = no evidence of work)
- **WIKI-01**: Every git commit is linked to its originating task ID — the commit message or metadata contains a machine-readable task reference
- **WIKI-02**: Diff tracking per commit — file changes with hashes and brief descriptions recorded as structured data, not just git log
- **WIKI-03**: Rationale embedded in actions — every code change action carries a "why" field that aids AI agent reasoning when traversing context

**Success Criteria:**
1. Planning artifacts are stored as JSON nodes with Chain → Artifact → Section → Task structure, queryable by ID and traversable as a graph
2. Every artifact node has created/modified timestamps; stale artifacts (>configurable threshold) are flagged automatically
3. Completing a task with uncommitted changes forces an atomic commit with the task ID in the commit message
4. A task cannot be marked complete if `git diff` shows no changes — the system blocks completion
5. Every commit is recorded as structured data: files changed, diff hashes, human-readable descriptions, and a rationale field explaining why the change was made

**Dependencies:** Phase 1 complete — task hierarchy exists, governance hooks fire, chat works.

**Plans:**
1. Planning registry schema + JSON storage + graph traversal
2. Commit governance (atomic enforcement, diff gating, wiki tracking)

---

## Phase 3: Knowledge Engine

**Goal:** Advanced governance (chain-break detection, auto-healing) plus a knowledge base where tech decisions are stateful, research links to implementation, and AI research agents write structured findings.

**Requirements:**
- **REG-03**: Chain-break detection hook: when a parent-child link breaks (orphan, missing dependency, stale reference), the system auto-detects and triggers governance re-consumption of the affected subtree
- **REG-04**: Auto-decision hook: when a chain break is detected, the governance system automatically evaluates the break severity and either flags for human attention or auto-heals (e.g., re-links to nearest valid parent)
- **KB-01**: TechStackNode with status lifecycle (proposed → approved → deprecated) — tech decisions are tracked as stateful entities, not static docs
- **KB-02**: Research-to-feature linking — implementation features are explicitly linked to research artifacts; the link is bidirectional and queryable
- **KB-03**: Knowledge synthesis — raw research notes compiled into single-source-of-truth entries that agents consume instead of re-reading scattered research docs
- **ENG-04**: Research agents — AI agents that investigate topics, search the web, read documentation, and write structured findings to the knowledge base

**Success Criteria:**
1. When a parent-child link in the planning graph breaks (deleted node, stale reference), the system detects it within one governance cycle and flags the affected subtree
2. Chain breaks are auto-evaluated: minor breaks (stale timestamp, single orphan) are auto-healed; major breaks (missing chain, multi-node orphan) surface for human review
3. Tech decisions (libraries, frameworks, patterns) are tracked as stateful nodes with a proposed → approved → deprecated lifecycle visible in the knowledge base
4. Research artifacts are bidirectionally linked to implementation features — querying a feature returns its supporting research, and vice versa
5. Research agents can investigate a topic autonomously, search the web, and write structured findings to the knowledge base as synthesized entries

**Dependencies:** Phase 2 complete — planning graph populated with real data, commit tracking active, wiki entries exist.

**Plans:**
1. Chain-break detection + auto-decision hooks
2. Knowledge base schema + research agents + synthesis

---

## Phase 4: UI Views + Source Synthesis

**Goal:** Specialized UI views for delegation hierarchies, planning trajectories, and interactive artifacts. Plus NotebookLM-style source synthesis for knowledge workers.

**Requirements:**
- **UI-01**: Delegation task view — interactive task list showing the 3-level hierarchy, who delegated to whom, what they're doing, current status, and agent assignments
- **UI-02**: Trajectory visualization — only the active/winning planning path is shown; abandoned branches are hidden from default views (preventing context poisoning)
- **UI-03**: Interactive planning artifacts — planning documents rendered as markdown with metadata hierarchy, commentable by users, showing related upstream and cross-section artifacts
- **ENG-05**: Source synthesis — user uploads documents/sources, AI synthesizes across them (NotebookLM-style cross-source reasoning and Q&A)

**Success Criteria:**
1. The delegation view renders the 3-level task hierarchy with agent assignments, delegation chains, and live status — users can expand/collapse and filter by status
2. Only the active/winning planning trajectory is shown by default; abandoned branches are hidden unless explicitly toggled
3. Planning artifacts render as interactive markdown with metadata sidebar, inline comments, and navigable cross-artifact links
4. User uploads multiple documents; AI synthesizes across all sources and answers questions with citations referencing specific source passages

**Dependencies:** Phases 1-3 complete — all backend data exists, governance active, knowledge base populated.

**Plans:**
1. Delegation view + trajectory visualization + interactive artifacts
2. Source synthesis engine (document upload, cross-source reasoning, citation)

---

## Coverage Validation

| Requirement | Phase | Verified | Note |
|-------------|-------|----------|------|
| REG-01 | Phase 2 | ✓ | |
| REG-02 | Phase 2 | ✓ | |
| REG-03 | Phase 3 | ✓ | |
| REG-04 | Phase 3 | ✓ | |
| DEL-01 | Phase 1 | ✓ | |
| DEL-02 | Phase 2 | ✓ | |
| DEL-03 | Phase 2 | ✓ | |
| DEL-04 | Phase 1 | ✓ | |
| WIKI-01 | Phase 2 | ✓ | |
| WIKI-02 | Phase 2 | ✓ | |
| WIKI-03 | Phase 2 | ✓ | |
| KB-01 | Phase 3 | ✓ | |
| KB-02 | Phase 3 | ✓ | |
| KB-03 | Phase 3 | ✓ | |
| UI-01 | Phase 4 | ✓ | |
| UI-02 | Phase 4 | ✓ | |
| UI-03 | Phase 4 | ✓ | |
| ENG-01 | Phase 1 → re-scoped | ✓ | Plugin hooks deprecated; governance via SDK-direct in 1C |
| ENG-02 | Phase 1 + 1C | ✓ | Basic in Phase 1, full multi-agent in 1C |
| ENG-03 | Phase 1 | ✓ | |
| ENG-04 | Phase 3 | ✓ | |
| ENG-05 | Phase 4 | ✓ | |

**Unmapped:** 0

---
*Roadmap created: 2026-02-09*
*Updated: 2026-02-10 — architecture pivot, 3 gap closure phases added*
