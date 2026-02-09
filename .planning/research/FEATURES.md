# Feature Landscape

**Domain:** Coherent Knowledge Graph Prototype -- AI Agent Governance Traceability
**Researched:** 2026-02-09
**Mode:** Ecosystem

## Entity Model Summary (Source of Truth)

The prototype ingests 7 JSON state files from `.idumb/brain/`, each containing typed entities with cross-references. The graph is built from these relationships:

| Source File | Entity Types | Key Relationships |
|---|---|---|
| `graph.json` | TaskGraph, WorkPlan, TaskNode, Checkpoint | WorkPlan->TaskNode->Checkpoint, dependsOn, temporalGate |
| `knowledge.json` | CoherentKnowledgeEntry | ->taskId, ->planId, ->agent, ->sessionId, ->wikiEntries |
| `registry.json` | PlanningRegistry, ArtifactChain, PlanningArtifact, ArtifactSection | Chain->Artifact->Section, ->linkedTaskIds, ->linkedBrainEntryIds |
| `brain-entries.json` | BrainEntry | ->parentId, ->childIds, ->relatedTo (cross-entity IDs) |
| `delegations.json` | DelegationRecord | ->fromAgent, ->toAgent, ->taskId |
| `wiki.json` | WikiEntry | ->taskId, ->planId, ->sessionId |
| `state.json` | Anchor (via anchors array) | ->type, ->priority (no foreign keys) |
| `plan.json` | PlanState, PlanPhase | Phase->id ordering |

**Total entity types:** 14
**Total relationship types:** ~25 cross-entity link fields

---

## Table Stakes

Features users expect. Missing any of these and the prototype does not prove the "coherent knowledge graph" concept.

### TS-1: Entity Ingestion from JSON Files

| Attribute | Value |
|---|---|
| **Why Expected** | The entire prototype is predicated on reading iDumb v2 state files. Without ingestion, nothing works. |
| **Complexity** | Low |
| **Dependencies** | None (foundational) |
| **Notes** | Read 7 JSON files from `.idumb/brain/`. Parse with the existing TypeScript interfaces. No Zod validation needed at read-time -- the schemas already validate at write-time in iDumb v2. Handle missing files gracefully (empty store defaults exist in every schema's factory function). |

### TS-2: Typed Graph Construction

| Attribute | Value |
|---|---|
| **Why Expected** | Raw JSON arrays are not a graph. The prototype must build a unified graph with typed nodes, typed edges, and ID-based lookups. This is the core data structure that everything else queries. |
| **Complexity** | Medium |
| **Dependencies** | TS-1 (ingestion) |
| **Notes** | Node types: WorkPlan, TaskNode, Checkpoint, CoherentKnowledgeEntry, PlanningArtifact, ArtifactSection, ArtifactChain, BrainEntry, DelegationRecord, WikiEntry, Anchor, PlanPhase. Edge types: contains, dependsOn, delegatedTo, producedBy, linkedTo, supersedes, chainParent, temporalGate. Each node carries its original entity properties. Each edge is typed and directional. Use adjacency list with typed edge labels -- not a generic graph library. |

### TS-3: Relationship Traversal ("What happened to task X?")

| Attribute | Value |
|---|---|
| **Why Expected** | The entire value proposition of a knowledge graph over flat JSON files is answering traversal questions. "Show me task X, who delegated it, what checkpoints exist, what wiki entries it produced, what knowledge entries link to it." Without traversal, this is just a JSON viewer. |
| **Complexity** | Medium |
| **Dependencies** | TS-2 (graph construction) |
| **Notes** | Must support: (a) Forward traversal -- given a node, find all outgoing edges and their targets. (b) Reverse traversal -- given a node, find all incoming edges and their sources ("who references me?"). (c) Multi-hop -- traverse 2-3 hops for chain queries like WorkPlan->TaskNode->Checkpoint->filesModified. Expose as a query API (function calls), not SQL. The existing helper functions in `task-graph.ts` (findTaskNode, findParentPlan, getActiveWorkChain) prove this pattern works. |

### TS-4: Hierarchy Visualization (Tree/Chain Views)

| Attribute | Value |
|---|---|
| **Why Expected** | Knowledge graphs are meaningless without visual rendering. The primary insight is structural -- seeing parent-child-sibling relationships at a glance. This is what Gephi (Force Atlas layout), Neo4j Bloom (expandable graph), and every graph tool provides as their core offering. |
| **Complexity** | High |
| **Dependencies** | TS-2 (graph construction), TS-3 (traversal for expansion) |
| **Notes** | Two view modes needed: (1) **Tree view** -- hierarchical top-down rendering. TaskGraph->WorkPlan->TaskNode->Checkpoint as an expandable tree. ArtifactChain->Artifact->Section as a chain. (2) **Graph view** -- force-directed or dagre layout showing cross-entity connections. Use React Flow or d3-dag for the graph view; a simple collapsible tree component for the tree view. The existing dashboard already has `TaskGraphPanel.tsx` and `TaskHierarchyPanel.tsx` -- study their patterns but do NOT import them (standalone prototype). |

### TS-5: Entity Detail Panel (Click Node -> See Properties)

| Attribute | Value |
|---|---|
| **Why Expected** | Every graph visualization tool provides a detail panel when you select a node. Neo4j Bloom calls it "Card List." Gephi calls it "Data Laboratory." Without it, the graph is just circles and lines with no meaning. |
| **Complexity** | Low |
| **Dependencies** | TS-4 (visualization provides click targets) |
| **Notes** | Sidebar panel that renders all properties of a selected entity. Must handle all 14 entity types with type-specific formatting. Show: ID, type, status, timestamps (formatted), all scalar properties, list of connected entities as clickable links. The formatting functions already exist in every schema file (formatBrainEntries, formatDelegationRecord, formatWikiEntry, formatArtifactDetail, etc.) -- port their logic. |

### TS-6: Search and Filter by Entity Type, Status, Agent

| Attribute | Value |
|---|---|
| **Why Expected** | With 14 entity types and potentially hundreds of nodes, users need to narrow what they see. Neo4j Bloom's "Perspectives" and "Slicer" exist for exactly this reason. Gephi has "Filters" as a first-class panel. |
| **Complexity** | Medium |
| **Dependencies** | TS-2 (graph construction), TS-4 (visualization to apply filters to) |
| **Notes** | Three filter dimensions: (1) **Entity type** -- toggle visibility of node types (show only TaskNodes and DelegationRecords). (2) **Status** -- filter by status field (active, completed, failed, stale, superseded). (3) **Agent** -- filter by agent name (idumb-supreme-coordinator, idumb-investigator, idumb-executor). Plus a text search box that matches against node labels/IDs. Filters should be combinable (AND logic). |

### TS-7: Chain Integrity Display

| Attribute | Value |
|---|---|
| **Why Expected** | This is the governance-specific differentiator over generic graph tools. The whole point of iDumb v2's planning registry is chain integrity: parent->child links forming versioned artifact chains, task dependency chains, and delegation chains. If parent->child links are broken (orphan nodes, missing dependencies), the prototype must surface this visually. |
| **Complexity** | Medium |
| **Dependencies** | TS-2 (graph construction), TS-4 (visualization) |
| **Notes** | Visual indicators on edges: solid lines for healthy chains, dashed/red lines for broken references (dependsOn pointing to non-existent IDs). Node badges for orphans (no parent), chain heads (no children), and stale entities. Use the existing `detectGraphBreaks()` function from `task-graph.ts` which already identifies: no_active_tasks, stale_task, broken_dependency, orphan_node. Port `isArtifactStaleByChainPosition()` from `planning-registry.ts` for artifact chain health. |

---

## Differentiators

Features that set the product apart from a generic graph viewer. Not expected in a prototype, but valued in production.

### DF-1: Real-Time File Watching / Live Updates

| Attribute | Value |
|---|---|
| **Value Proposition** | During active development sessions, iDumb v2 writes to `.idumb/brain/*.json` continuously (debounced). A live-updating dashboard lets developers see governance state change as they work, without manual refresh. |
| **Complexity** | Medium |
| **Dependencies** | TS-1 (ingestion), TS-2 (graph rebuild), TS-4 (re-render) |
| **Notes** | Use `chokidar` (already a dependency in iDumb v2) to watch `.idumb/brain/` for changes. On change: re-read affected file, diff against current graph, update nodes/edges incrementally. Push updates via WebSocket (the existing dashboard backend already uses `ws`). Debounce to avoid thrashing during rapid writes. |

### DF-2: Drift Scoring and Auto-Alerting

| Attribute | Value |
|---|---|
| **Value Proposition** | Surfaces when the knowledge graph's internal state has drifted from reality. Content hash comparison (already implemented in `planning-registry.ts` via `computeContentHash` and `detectSectionDrift`) can flag when artifact sections have changed without governance acknowledgment. |
| **Complexity** | High |
| **Dependencies** | TS-2 (graph construction), DF-1 (live watching for trigger) |
| **Notes** | Requires reading actual file content from disk and comparing against stored content hashes. This is a read-only operation but needs filesystem access beyond the JSON state files. Production feature -- prototype should only show staleness badges (TS-7). |

### DF-3: Chain-Break Auto-Detection with Badges

| Attribute | Value |
|---|---|
| **Value Proposition** | Goes beyond passive display (TS-7) to active detection: scanning the graph periodically for structural problems and surfacing them as badges/alerts. Neo4j Bloom has no equivalent -- this is governance-specific intelligence. |
| **Complexity** | Medium |
| **Dependencies** | TS-7 (chain integrity display) |
| **Notes** | Run `detectGraphBreaks()` and `findStaleArtifacts()` on an interval. Surface counts as badges in the navigation: "3 broken chains", "5 stale artifacts", "2 orphan tasks". Clicking a badge jumps to the affected nodes. |

### DF-4: Time-to-Stale Enforcement

| Attribute | Value |
|---|---|
| **Value Proposition** | Brain entries have `staleAfter` TTL fields. Anchors have 48h staleness thresholds. The prototype could visualize approaching staleness with heat-map coloring (green -> yellow -> red) based on time remaining. |
| **Complexity** | Low |
| **Dependencies** | TS-2 (graph construction), TS-4 (visualization for color rendering) |
| **Notes** | Use `effectiveConfidence()` from `brain.ts` for BrainEntry heat. Use `stalenessHours()` from `anchor.ts` for Anchor heat. Node color interpolation: green (fresh) -> yellow (>50% TTL consumed) -> red (stale). Simple to implement but adds significant visual value. Could be included in prototype as a stretch goal. |

### DF-5: Collaborative Annotations

| Attribute | Value |
|---|---|
| **Value Proposition** | Allow users to annotate graph nodes with notes, questions, or observations. The existing dashboard already has `ArtifactComments.tsx` -- this pattern extends to all entity types. |
| **Complexity** | High |
| **Dependencies** | TS-5 (detail panel as annotation host), persistence layer for annotations |
| **Notes** | Requires write capability to a separate annotation store (not writing back to iDumb v2 state -- see Anti-Features). Would need its own JSON/SQLite store. Multi-user adds authentication complexity. Production only. |

### DF-6: Export / Reporting

| Attribute | Value |
|---|---|
| **Value Proposition** | Export the graph state as a static report (PDF/HTML) or as data (CSV/JSON-LD). Gephi offers PNG/SVG/PDF export. This is standard for any analysis tool. |
| **Complexity** | Medium |
| **Dependencies** | TS-4 (visualization for image export), TS-2 (graph for data export) |
| **Notes** | Image export: capture the React Flow canvas as SVG/PNG. Data export: serialize the unified graph as JSON-LD or a simple CSV adjacency list. Report generation: summarize graph statistics (node counts by type, chain health, stale percentages) into a markdown document. |

### DF-7: Timeline / Temporal View

| Attribute | Value |
|---|---|
| **Value Proposition** | Every entity has `createdAt` and `modifiedAt` timestamps. A timeline view showing entity creation/completion over time reveals work patterns, bottlenecks, and session boundaries. No existing graph tool provides this natively -- it is governance-specific. |
| **Complexity** | Medium |
| **Dependencies** | TS-2 (graph construction) |
| **Notes** | X-axis: time. Y-axis: entity type swim lanes. Dots for creation events, bars for active duration. Color by status. This is essentially a Gantt chart of governance activity. Valuable for post-session review. |

### DF-8: Perspectives / Curated Views

| Attribute | Value |
|---|---|
| **Value Proposition** | Pre-configured filter+layout combinations for common questions. Inspired by Neo4j Bloom's Perspectives feature. Examples: "Active Work" (show only active WorkPlans + active TaskNodes + recent checkpoints), "Delegation Flow" (show only agents + delegation records), "Artifact Chains" (show only registry entities). |
| **Complexity** | Medium |
| **Dependencies** | TS-6 (search/filter), TS-4 (layout) |
| **Notes** | Essentially saved filter presets with optional layout algorithms. Stored in local browser storage or a config file. 3-5 built-in perspectives plus user-defined ones. |

---

## Anti-Features

Features to explicitly NOT build. Including any of these would distort the prototype's purpose.

### AF-1: Write-Back to iDumb v2 State Files

| Attribute | Value |
|---|---|
| **Why Avoid** | The prototype is read-only by design. iDumb v2's `StateManager` singleton owns all disk I/O with debounced writes, session isolation, and governance enforcement. Writing from a separate process would bypass all governance hooks, corrupt state, and create race conditions. The whole point of iDumb v2 is that writes go through governed tools. |
| **What to Do Instead** | Display-only. If users need to modify state, they do it through iDumb v2's lifecycle verb tools (tasks_start, tasks_done, etc.) in OpenCode. The prototype shows consequences, not causes. |

### AF-2: Full Graph Database (Neo4j, ArangoDB, etc.)

| Attribute | Value |
|---|---|
| **Why Avoid** | The data volume is tiny. A busy iDumb v2 project might have 50 WorkPlans, 200 TaskNodes, 500 Checkpoints, and 100 knowledge entries. That is ~1000 nodes. An in-memory adjacency list handles this in microseconds. A graph database adds deployment complexity (Docker, drivers, schema migration), operational burden, and zero performance benefit at this scale. |
| **What to Do Instead** | In-memory typed graph built on startup from JSON files. TypeScript `Map<string, GraphNode>` and `Map<string, GraphEdge[]>`. The existing schema helper functions (findTaskNode, findParentPlan, queryBrain, resolveChainHead) already implement graph traversal patterns in plain TypeScript. |

### AF-3: Authentication / Authorization

| Attribute | Value |
|---|---|
| **Why Avoid** | This is a local developer tool reading local files. There is no multi-tenant scenario. Adding auth adds login flows, session management, token storage, and CORS complexity for zero value. |
| **What to Do Instead** | Serve on localhost only. No auth headers. No login page. The same security model as the existing iDumb v2 dashboard (Express + CORS on localhost). |

### AF-4: Multi-User Support

| Attribute | Value |
|---|---|
| **Why Avoid** | iDumb v2 is a single-developer governance tool running inside a single OpenCode instance. The state files are local filesystem JSON. There is no concurrent write scenario and no need for conflict resolution, operational transforms, or presence indicators. |
| **What to Do Instead** | Single-user, single-browser-tab assumption. If the user opens two tabs, they both read the same files independently. No synchronization needed. |

### AF-5: Natural Language Graph Queries

| Attribute | Value |
|---|---|
| **Why Avoid** | Tempting to add "ask the graph a question in English" but this requires an LLM integration, prompt engineering, query translation, and validation pipeline. Way out of scope for a prototype proving visual traceability. |
| **What to Do Instead** | Structured search (TS-6) and direct traversal (TS-3). Users click nodes and follow edges. The UI teaches the graph structure through interaction, not conversation. |

### AF-6: Bi-Directional Sync with Git

| Attribute | Value |
|---|---|
| **Why Avoid** | BrainEntry has `source: "git-commit"` as a possible source type, suggesting future git integration. But parsing git history, correlating commits with tasks, and maintaining sync is a massive scope expansion with edge cases around rebases, squashes, and merge commits. |
| **What to Do Instead** | Display git-sourced BrainEntries if they exist in the state files. Do not read git history directly. |

---

## Feature Dependencies

```
TS-1 (Ingestion)
  |
  v
TS-2 (Graph Construction)
  |
  +---> TS-3 (Traversal)
  |       |
  |       v
  |     TS-4 (Hierarchy Visualization)
  |       |
  |       +---> TS-5 (Detail Panel)
  |       |
  |       +---> TS-7 (Chain Integrity)
  |               |
  |               v
  |             DF-3 (Chain-Break Badges)
  |
  +---> TS-6 (Search/Filter)
  |       |
  |       v
  |     DF-8 (Perspectives)
  |
  +---> DF-4 (Time-to-Stale Heat Map)
  |
  +---> DF-7 (Timeline View)

TS-1 --> DF-1 (File Watching) --> DF-2 (Drift Scoring)

TS-5 --> DF-5 (Annotations)

TS-4 + TS-2 --> DF-6 (Export)
```

## MVP Recommendation

Prioritize in this order:

1. **TS-1 (Ingestion)** + **TS-2 (Graph Construction)** -- These are the foundation. Without a unified graph, nothing else works. Estimated 1-2 days.

2. **TS-4 (Hierarchy Visualization)** -- The visual proof that a coherent graph exists. Use React Flow for the graph layout and a tree component for hierarchical views. This is the "demo moment." Estimated 2-3 days.

3. **TS-5 (Detail Panel)** -- Makes the visualization meaningful. Click a node, see its properties and connections. Leverage the existing `format*` functions from the schema files. Estimated 1 day.

4. **TS-3 (Traversal API)** -- Powers the "what happened to task X?" question. Forward and reverse traversal, exposed as functions the UI calls when expanding nodes. Estimated 1 day.

5. **TS-6 (Search/Filter)** -- Makes large graphs navigable. Type toggles, status filters, text search. Estimated 1-2 days.

6. **TS-7 (Chain Integrity)** -- The governance-specific differentiator. Red badges on broken chains, dashed lines for missing references. Port existing detection logic. Estimated 1-2 days.

7. **DF-4 (Heat Map)** as stretch goal -- Simple to implement (color interpolation on existing staleness functions), high visual impact. Estimated 0.5 days.

**Defer everything else.** DF-1 through DF-8 (except DF-4) are production features. The prototype must prove the graph concept first.

**Total MVP estimate:** 7-10 days for a working prototype.

---

## Competitive Landscape Comparison

How this prototype's features compare to existing graph visualization tools:

| Feature | Gephi | Neo4j Bloom | Linkurious | This Prototype |
|---------|-------|-------------|------------|----------------|
| Layout algorithms | Force Atlas 2, FR, OpenOrd | Auto-layout | Ogma layout engine | React Flow dagre/elk |
| Entity details | Data Laboratory panel | Card List | Property panel | TS-5 Detail Panel |
| Search/filter | Filter panel, partition | Perspectives + Slicer | Full-text + visual search | TS-6 Search/Filter |
| Relationship traversal | Manual edge following | Expand neighbors, near-neighbor | Expand/collapse | TS-3 Traversal API |
| Typed edges | Edge attributes | Relationship types | Typed relationships | Typed edges w/ labels |
| Chain integrity | Not applicable | Not applicable | Alert rules (generic) | TS-7 (domain-specific) |
| Staleness/TTL | Not applicable | Not applicable | Not applicable | DF-4 (governance-specific) |
| Export | PNG, SVG, PDF | CSV, Cypher | PDF reports | DF-6 (production) |
| Live updates | Not applicable | Connected to DB | Connected to DB | DF-1 (production) |
| Community detection | Built-in algorithms | GDS integration | Algorithm library | Not planned |
| Statistics/metrics | Centrality, clustering | Via GDS | Via algorithms | Not planned (graph is small) |

**Key insight:** Gephi, Bloom, and Linkurious are general-purpose graph tools. They excel at large-scale network analysis but have no concept of governance chains, artifact tiers, delegation hierarchies, or temporal staleness. This prototype's value is not in better graph algorithms (the data is too small for that to matter) but in domain-specific intelligence: chain integrity, staleness enforcement, delegation flow, and task-to-evidence traceability. No existing tool provides this out of the box.

---

## Sources

- iDumb v2 schema files: `src/schemas/coherent-knowledge.ts`, `task-graph.ts`, `planning-registry.ts`, `brain.ts`, `delegation.ts`, `anchor.ts`, `wiki.ts`, `plan-state.ts`, `classification.ts`, `work-plan.ts`
- Existing dashboard: `src/dashboard/frontend/src/components/panels/` (5 panels, confirms UI patterns)
- [Gephi features](https://gephi.org) -- Force Atlas 2, filtering, statistics, PNG/SVG/PDF export (MEDIUM confidence, verified via WebFetch)
- [Neo4j Bloom documentation](https://neo4j.com/docs/bloom-user-guide/current/) -- Perspectives, Slicer, Card List, GDS integration (MEDIUM confidence, verified via WebFetch)
- Linkurious Enterprise feature set (LOW confidence, based on training data only -- could not verify via WebFetch, product page returned 404)
