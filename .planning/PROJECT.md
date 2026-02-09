# iDumb Brain Prototype — Coherent Knowledge Graph

## What This Is

A standalone read-only prototype that proves the coherent knowledge graph concept for AI agent governance. It ingests iDumb v2's existing state files (`.idumb/brain/*.json`) and builds a unified, schema-first typed graph linking actions, agents, sessions, artifacts, and tasks into traceable hierarchical chains. Both queryable via API and visually rendered in a dashboard. This prototype lives as a separate project from iDumb v2 — it consumes iDumb v2 data but never modifies it.

## Core Value

Prove that a schema-first typed graph with coherent knowledge linking makes AI agent governance **traceable and visible** — you can answer "who did what, when, under which task, delegated by whom, producing which artifacts" through a single connected graph.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Schema-first typed graph with strict IDs, tiers (1/2/3), and typed relationships between entities
- [ ] Coherent knowledge linking: actions → agents → sessions → artifacts → tasks as a connected graph
- [ ] Read-only ingestion of iDumb v2 state files (graph.json, state.json, delegations.json, tasks.json, plan.json, knowledge.json)
- [ ] Queryable API: "what happened to task X?" returns the full chain (agent, session, delegations, artifacts, timestamps)
- [ ] Visual dashboard rendering the hierarchy, chains, and relationships
- [ ] Entity types: GovernanceNode with tier, parent_id, chain_id, status, trace (agent_id, delegated_by, level, session_id, timestamp)
- [ ] Cross-hierarchical relationships: entities link across tiers bidirectionally (e.g., research synthesis → codemap entry → planning artifact → stories)

### Out of Scope

- Modifying iDumb v2 source code — this is a read-only consumer
- Write-gate enforcement or governance interception hooks — prove the data model first
- Time-to-stale enforcement automation — deferred until graph model is validated
- Chain-break auto-detection and alerting — deferred until graph model is validated
- Sectional artifact management (shard writing) — deferred until graph model is validated
- File system watcher / live indexing — deferred; start with snapshot ingestion
- Code intelligence (symbol resolution, "what calls this function?") — deferred to post-pivot
- Live OpenCode plugin integration — deferred; prototype reads files, not hooks

## Context

This prototype emerges from iDumb v2's Phase 9 (Lifecycle Verbs) completion and the deferred Phase 10 (Brain Engine). The existing iDumb v2 has:

- **7 tools** (5 lifecycle verbs + anchor + init), **7 hooks**, **14 schemas**, 919 passing tests
- **State files** in `.idumb/brain/`: graph.json (TaskGraph with WorkPlan→TaskNode), state.json (sessions, anchors), delegations.json, tasks.json (legacy Epic→Task→Subtask), plan.json, knowledge.json, codemap.json, project-map.json
- **Schemas** already started: `coherent-knowledge.ts`, `wiki.ts`, `classification.ts` (Phase 9 R1 scaffolding), `task-graph.ts`, `work-plan.ts`, `delegation.ts`
- **Dashboard prototype** in `src/dashboard/` (React + Express + WebSocket) — not integrated but functional
- **Key problem**: existing stores are disconnected — TaskGraph, DelegationStore, SessionState, Anchors each live in separate JSON files with no unified linking

The diagrams at `planning/diagrams/from-a-closer-angle.png` and `planning/diagrams/the-hierarchy-relationships.png` define the full architectural vision. This prototype proves the foundational 2 of 5 concepts:
1. Schema-first typed graph (the data model)
2. Coherent knowledge linking (the relationships)

If these two work, the remaining concepts (time-to-stale enforcement, chain-break detection, sectional artifact management) build on top.

## Constraints

- **Tech stack**: TypeScript + React (aligned with iDumb v2 for eventual merge-back)
- **Data source**: Read-only from iDumb v2's `.idumb/brain/` directory — never writes to it
- **Isolation**: Separate project directory, separate package.json, no imports from iDumb v2 source
- **Schema compatibility**: Must understand iDumb v2's existing Zod schemas (TaskGraph, WorkPlan, TaskNode, DelegationStore, PersistedState) to ingest their JSON output
- **Merge path**: Design for eventual integration into iDumb v2 as the Brain Engine (Phase 10)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Separate prototype, not in-place evolution | Avoid breaking 919 passing tests; prove concept in isolation | -- Pending |
| Read-only consumer of iDumb v2 state | Decouple prototype from plugin lifecycle; focus on data model | -- Pending |
| Schema-first graph + coherent knowledge as the 2 MVP concepts | Everything else (time-to-stale, chain-break, sectional artifacts) builds on these foundations | -- Pending |
| Both visual + queryable output | Visual proves UX; queryable proves programmatic integration path | -- Pending |
| TypeScript + React stack | Aligned with iDumb v2 for eventual merge-back | -- Pending |

---
*Last updated: 2026-02-09 after initialization*
