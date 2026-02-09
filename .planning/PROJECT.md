# iDumb — AI Knowledge Work Platform

## What This Is

A Web UI product that extends OpenCode's capabilities beyond coding into general knowledge work. Users run one command to launch a browser-based interface where developers get governed AI-assisted coding (smart TODO, planning artifacts, multi-agent delegation) and knowledge workers get Notion-like features (research synthesis, NotebookLM-style Q&A, multi-agent RAG). OpenCode runs as the engine underneath — all AI capabilities, tool execution, and agent orchestration flow through it.

## Core Value

Prove that OpenCode can power a multi-persona knowledge work UI — not just a coding assistant, but a platform where planning, research, delegation, and implementation all flow through one governed system with full traceability.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Web UI that wraps OpenCode Server/SDK as its engine
- [ ] Smart TODO as 3-level delegation bus (Epic→Task→Subtask) with schema-regulated metadata, property watching, and governance hooks
- [ ] Planning artifacts as JSON-backed hierarchical documents with lifecycle states, context purging of abandoned branches, and upstream propagation on child changes
- [ ] Codebase-as-source-of-truth repo wiki — auto-updated on atomic commits, linked to task IDs, with traversable rationale chains
- [ ] Knowledge base with synthesized tech stack documents linked to research artifacts — gap enforcement blocks implementation when research is unresolved
- [ ] NotebookLM-style source ingestion and cross-source synthesis for knowledge workers
- [ ] Chat completion and multimodal interaction through the UI
- [ ] Multi-agent RAG system for non-coding office workflows

### Out of Scope

- Graph database (Neo4j, ArangoDB) — data fits in JSON files, in-memory traversal is sufficient at this scale
- Mobile app — web-first, localhost for now
- Multi-tenant authentication — single-user local tool initially
- NLP graph queries — structured traversal and search, not conversational graph queries
- Bi-directional git sync — read git state, don't manage git history

## Context

**Existing work:**
- iDumb v2 has ~13,500 LOC of governance tooling (hooks, schemas, agent templates, task graph) — most is over-engineered or architecturally wrong. This pivot aggressively cleans up and rebuilds what's salvageable.
- A prototype dashboard exists (React + Express + WebSocket) — patterns worth studying but not importing wholesale.
- 7 tool definitions already work (lifecycle verbs, anchor, init) — some of these may survive the cleanup.
- project-alpha-master is a separate project in the same product vision space.
- OpenCode SDK provides hooks (tool.execute.before/after, session.compacting, chat.system.transform, chat.messages.transform) and the Server exposes HTTP/programmatic access to agent sessions.

**What failed in v2:**
- Over-templated agent deployment (1482 LOC templates.ts) instead of lean, reusable hooks
- Reinvented what OpenCode SDK/Server already provides
- Too many dead code paths and schemas that were never wired
- Planning artifacts stored as flat markdown with no relational metadata — context poisoning inevitable
- No actual UI for the governance features — everything was CLI/terminal only

**What should survive:**
- The core governance insight: agents need write-gates, tasks need lifecycle verbs, planning needs hierarchy
- Hook patterns: tool-gate (blocks writes without active task), compaction (anchor injection)
- Schema concepts: WorkPlan, TaskNode, Checkpoint hierarchy; artifact chains; delegation routing
- NOT the implementations themselves — the concepts, rebuilt simply

## Constraints

- **Engine**: OpenCode SDK + Server — not a custom LLM integration. The product is a UI layer over OpenCode, not a competing AI backend.
- **Stack**: TypeScript + React (frontend), Node.js (backend), OpenCode Server (AI engine). Keep dependencies minimal.
- **Architecture**: JSON files for state (not a database). In-memory graph for traversal. WebSocket for live updates. Hooks for governance enforcement.
- **Implementation approach**: Branch from current repo, aggressively clean dead code, rebuild. Not a clean-room rewrite — salvage what works.
- **Simplicity**: No over-engineered schemas. JSON files that get cleaned up and traversed. Hooks that are thin wrappers around OpenCode SDK. Reusable tools, not templatic one-offs.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| OpenCode as engine, not custom LLM backend | Leverage existing tool execution, agent orchestration, hook system instead of rebuilding | — Pending |
| JSON files over graph database | ~1000 nodes max, in-memory traversal is microseconds, zero deployment complexity | — Pending |
| Aggressive cleanup over clean-room rewrite | Concepts are right, implementations are wrong — salvage the thinking, rebuild the code | — Pending |
| Web UI over CLI-only | The governance features need visual interaction — planning artifacts, task hierarchies, knowledge graphs are visual by nature | — Pending |
| Multi-persona product | Developers (coding governance) + knowledge workers (research/RAG/synthesis) share one platform | — Pending |

---
*Last updated: 2026-02-09 after pivot from graph-visualization-prototype to full knowledge-work platform*
