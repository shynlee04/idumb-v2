# Project Research Summary

**Project:** iDumb Brain Prototype — Coherent Knowledge Graph
**Domain:** AI Agent Governance Traceability (Knowledge Graph Visualization)
**Researched:** 2026-02-09
**Confidence:** HIGH (with one unresolved renderer conflict — see Research Flags)

## Executive Summary

Four research streams (stack, features, architecture, pitfalls) converge on a clear prototype design: a read-only React SPA that ingests 7 JSON state files from `.idumb/brain/`, builds a typed in-memory graph of ~1000 nodes across 14 entity types with ~25 cross-entity relationship types, and renders the governance chain visually with progressive disclosure. The prototype proves two foundational concepts — schema-first typed graph and coherent knowledge linking — without modifying iDumb v2 source data. Estimated MVP: 7-10 days.

The architecture is a clean three-layer stack: (1) an ETL data pipeline that reads JSON, normalizes 14 entity types into uniform `GraphNode`/`GraphEdge` via per-entity adapters, and resolves cross-references with lenient linking; (2) separated Zustand stores (graph-store, filter-store, ui-store) that prevent re-render cascading; (3) a graph renderer with force-directed and hierarchical layouts. The stack is TypeScript + React 19 + Vite 7 + Tailwind CSS 4 + Zod 4, with graphology as the graph data structure engine.

Pitfall research identifies 10 critical failure modes, with the top three being: premature schema completeness (modeling all 14 entity types before visual testing), the "governance hairball" (unreadable dense graphs from showing everything), and renderer performance degradation from un-memoized components. The mitigation strategy is consistent: start with 4-5 entity types, enforce progressive disclosure from day one, and treat performance as a Phase 1 architectural decision rather than a Phase 4 optimization.

## Key Findings

### Recommended Stack

The stack research verified all package versions against the npm registry on 2026-02-09 and validated compatibility matrices. The core decision is a two-layer graph architecture: **graphology** (0.26.0) as the typed graph data structure engine for building, traversing, and querying the knowledge graph, paired with a WebGL/Canvas renderer for visualization. Supporting libraries include zustand (5.0.11) for state management, @tanstack/react-query (5.90.20) for file polling, and Zod 4 (4.3.6) for runtime validation at the ingestion boundary. Total package count is ~22 (17 production, 5 dev).

**Core technologies:**
- **TypeScript 5.9.3**: Strict typing for graph schemas. Generic support for `Graph<NodeAttrs, EdgeAttrs>`. Project constraint for merge-back compatibility.
- **React 19.2.4**: UI framework. Project constraint aligned with iDumb v2.
- **Vite 7.3.1**: Sub-second HMR, native ESM, first-class TypeScript. SPA is the correct choice (no SSR needed for a localhost dev tool).
- **Tailwind CSS 4.1.18**: Utility-first CSS with v4's native `@theme` directive. Zero-runtime CSS.
- **graphology 0.26.0 + graphology-traversal 0.3.1**: Typed multi-graph data structure. BFS/DFS traversal, metrics, shortest-path. The data layer for all graph operations.
- **reagraph 4.30.8**: WebGL graph visualization component (bundles graphology internally). Built-in force-directed, tree, radial, hierarchical, ForceAtlas2 layouts. Clustering via `clusterAttribute`. Custom node rendering.
- **zustand 5.0.11**: Minimal TypeScript-first state management. Three separate stores (graph, UI, filter) to prevent re-render cascading.
- **@tanstack/react-query 5.90.20**: Polls `.idumb/brain/*.json` files with `refetchInterval` for file watching. Stale-while-revalidate pattern.
- **Zod 4.3.6**: Runtime validation of JSON files at the ingestion boundary. 15x faster than v3.
- **shadcn/ui** (via CLI): Copy-pasted component source files for buttons, cards, badges, dialogs. Full styling control, zero version lock-in.

### Expected Features

Feature research identified 7 table-stakes features, 8 differentiators, and 6 anti-features. The prototype must prove the "coherent knowledge graph" concept, which means table-stakes features are non-negotiable. Differentiators are production features to defer. Anti-features are scope traps to actively avoid.

**Must have (table stakes):**
- **TS-1: Entity Ingestion** — Read 7 JSON files from `.idumb/brain/`, parse with existing TypeScript interfaces, handle missing files gracefully
- **TS-2: Typed Graph Construction** — Build unified graph with typed nodes (14 types), typed edges (8 types), and ID-based lookups using graphology
- **TS-3: Relationship Traversal** — Forward, reverse, and multi-hop traversal answering "what happened to task X?"
- **TS-4: Hierarchy Visualization** — Tree view (WorkPlan→TaskNode→Checkpoint) and graph view (force-directed cross-entity connections)
- **TS-5: Entity Detail Panel** — Click node, see all properties + connected entities as clickable links
- **TS-6: Search and Filter** — Filter by entity type, status, agent. Text search across labels/IDs. Combinable (AND logic).
- **TS-7: Chain Integrity Display** — Visual indicators for broken chains, orphan nodes, stale entities. Port existing `detectGraphBreaks()` logic.

**Should have (competitive):**
- **DF-4: Time-to-Stale Heat Map** — Color interpolation (green→yellow→red) based on entity TTL. Low complexity, high visual impact. Stretch goal for MVP.
- **DF-3: Chain-Break Auto-Detection** — Active scanning with badge counts ("3 broken chains"). Extends TS-7.
- **DF-8: Perspectives / Curated Views** — Saved filter+layout presets for common governance questions.

**Defer (v2+):**
- **DF-1: Real-Time File Watching** — chokidar + WebSocket push. Polling via TanStack Query is sufficient for prototype.
- **DF-2: Drift Scoring** — Content hash comparison. Requires filesystem access beyond JSON state files.
- **DF-5: Collaborative Annotations** — Requires write capability + separate annotation store.
- **DF-6: Export / Reporting** — PNG/SVG/PDF/CSV export. Standard but not MVP-critical.
- **DF-7: Timeline / Temporal View** — Gantt-like governance activity view. Valuable but scope expansion.

**Explicitly NOT building (anti-features):**
- Write-back to iDumb v2 state files (bypasses governance hooks)
- Full graph database (Neo4j/ArangoDB — ~1000 nodes fits in memory)
- Authentication/authorization (localhost dev tool)
- Multi-user support (single-developer tool)
- Natural language graph queries (requires LLM integration)
- Bi-directional Git sync (massive scope expansion)

### Architecture Approach

The architecture follows an ETL pipeline pattern with strict layer separation. The data pipeline (pure TypeScript, no React) handles extraction (JSON file reading), transformation (per-entity adapters normalizing 14 entity types into uniform `GraphNode`/`GraphEdge`), and loading (hydrating Zustand stores). Three separated Zustand stores prevent re-render cascading: `graph-store` (changes rarely, on load/reload), `filter-store` (changes on user input), `ui-store` (changes on every mouse event). The visualization layer renders the graph with configurable layouts. The entire data pipeline is testable without a browser or DOM.

**Major components:**
1. **Loader** (`data/loader.ts`) — Reads 7 JSON files, parses with type guards, returns empty arrays for missing files
2. **Adapters** (`data/adapters/*.ts`) — 12 per-entity normalizers, each ~100 LOC. Signature: `(raw) => { nodes: GraphNode[], edges: GraphEdge[] }`
3. **Linker** (`data/linker.ts`) — Resolves cross-references into typed edges. Lenient: drops dangling refs with warnings, never crashes
4. **Pipeline** (`data/pipeline.ts`) — Orchestrates loader→adapters→linker, produces complete `GraphModel`
5. **Graph Store** (`store/graph-store.ts`) — Holds nodes, edges, adjacency index. Computed metrics on demand
6. **Filter Store** (`store/filter-store.ts`) — Entity type toggles, search query, time range, agent filter
7. **UI Store** (`store/ui-store.ts`) — Selection, hover, panel visibility, view mode
8. **Graph Viewport** (`components/graph/GraphCanvas.tsx`) — Renderer wrapper + event handlers
9. **Detail Panel** (`components/panels/DetailPanel.tsx`) — Entity properties + linked nodes on selection
10. **Filter Panel** (`components/panels/FilterPanel.tsx`) — Entity type toggles, search, status/agent dropdowns

### Critical Pitfalls

Research identified 10 critical pitfalls from failed KG projects, React Flow performance benchmarks, and graph visualization UX studies. The top 5 that directly impact roadmap decisions:

1. **Schema-Before-Questions** — Modeling all 14 entity types before visual testing wastes months. Start with 4 core types (WorkPlan, TaskNode, Agent, Anchor), prove visual answers work, add types incrementally. Define 5-7 governance questions the graph must answer before writing schema code.

2. **The Governance Hairball** — With 14 entity types and ~25 link fields, showing the full graph produces an unreadable tangle. Enforce progressive disclosure from day one: default to WorkPlan-level summary (<50 nodes), expand on click. Never show Checkpoints unless explicitly requested. Use semantic zoom and node grouping.

3. **Renderer Performance Degradation** — Un-memoized props or anonymous functions on graph components cause ALL custom nodes to re-render on every state change. Wrap all custom nodes in `React.memo` from the first line of code. Memoize every prop. Never subscribe to full `state.nodes` array. This is non-negotiable from Phase 2 onward.

4. **Layout Algorithm Mismatch** — Force-directed layout makes parent-child relationships invisible. Hierarchical layout fractures cross-cutting delegation links. Solution: use hierarchical layout (dagre/elkjs) as PRIMARY for governance chains, render cross-cutting links as styled overlays. Provide layout switching.

5. **Dangling Cross-References** — Real governance data has broken references (purged tasks, cleaned-up anchors). Lenient linking with a `danglingRefs` report — skip broken edges, render placeholder nodes, make data quality visible. Defensive JSON parsing with try/catch per file.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Data Foundation
**Rationale:** The architecture research confirms the data pipeline can be built and tested entirely without React or a browser. This is the safest foundation — pure TypeScript functions that transform JSON into a typed graph model. Pitfall research mandates starting with <6 entity types and validating with governance questions before expanding.
**Delivers:** Type definitions (`GraphNode`, `GraphEdge`, `GraphModel`, `EntityType`, `EdgeType`), JSON loader for 7 files, 4-5 initial entity adapters (WorkPlan, TaskNode, Checkpoint, Agent/DelegationRecord), cross-reference linker with dangling-ref reporting, pipeline orchestrator, and a complete test suite.
**Addresses:** Pitfall 1 (schema-before-questions — start with 4 types), Pitfall 5 (dangling cross-references — lenient linking from day one), Pitfall 7 (over-engineering ontology — incremental entity addition).
**Avoids:** Building all 14 entity adapters before visual testing. Crashing on missing/broken references. Using `any` types for node data.
**Test gate:** Pipeline produces correct `GraphModel` from sample JSON. All tests run with vitest, no browser needed.

### Phase 2: State Layer + Core Visualization
**Rationale:** Once the data pipeline is validated, add Zustand stores and the graph renderer. The renderer choice must be resolved before this phase (see Research Flags). Architecture research dictates three separated stores to prevent re-render cascading. Performance must be treated as an architectural decision, not an optimization — enforce `React.memo`, memoized props, and selector-based subscriptions from the first line of code.
**Delivers:** Three Zustand stores (graph, filter, UI), graph renderer component with force-directed layout, custom node painting per entity type (color + shape per category), edge styling taxonomy (3-4 visual categories), initial app shell with resizable panels.
**Addresses:** Pitfall 2 (governance hairball — progressive disclosure, default <50 nodes), Pitfall 3 (re-render cascade — `React.memo` enforced from day one), Pitfall 4 (layout mismatch — hierarchical as primary), Pitfall 10 (full-graph initial load — focused default view).
**Avoids:** Showing all nodes on initial load. Using a single layout algorithm for all views. Un-memoized custom nodes.
**Test gate:** Graph renders sample data at 60fps. Click events update UI store. Drag does not cause cascade re-renders.

### Phase 3: Interaction + Panels
**Rationale:** With the graph rendering, add the panels and interactions that make it useful. Detail panel leverages existing `format*` functions from iDumb schemas. Filter panel enables entity type, status, and agent filtering. Search provides text-based node finding. This phase makes the prototype actually usable for governance questions.
**Delivers:** Entity detail panel (all 14 types with type-specific formatting), filter panel (entity type toggles, status, agent), text search (cmdk command palette), breadcrumb trail for hierarchy depth, keyboard navigation (arrow keys, Enter, Escape, `/`).
**Addresses:** Pitfall 6 (temporal blindness — timestamps as first-class display, status color-coding), Pitfall 8 (hierarchy depth — breadcrumbs, viewport preservation on expand), Pitfall 9 (edge type confusion — edge labels on hover, 3-4 visual categories).
**Avoids:** Tooltip overload (2-3 key fields, not 15). Edge labels always visible. Single graph view with no alternatives.
**Test gate:** Full app renders. Filters reduce visible nodes. Selection shows detail. Breadcrumbs track hierarchy position.

### Phase 4: Chain Integrity + Remaining Adapters
**Rationale:** With the core prototype working, add the governance-specific differentiators that no existing graph tool provides. Port `detectGraphBreaks()` and `findStaleArtifacts()` from iDumb v2 schemas. Add remaining entity adapters (WikiEntry, PlanningArtifact, ArtifactSection, ArtifactChain, PlanPhase, CoherentKnowledgeEntry, BrainEntry). Add DF-4 (time-to-stale heat map) as stretch goal.
**Delivers:** Chain integrity visualization (solid/dashed/red edges for healthy/broken chains), orphan node badges, stale entity indicators, remaining 7-8 entity adapters, time-to-stale heat map (stretch).
**Addresses:** TS-7 (chain integrity — the governance-specific differentiator), DF-4 (heat map — high visual impact, low complexity).
**Avoids:** Building chain-break auto-detection (DF-3) or drift scoring (DF-2) — those are production features.
**Test gate:** Broken references render as dashed red edges. Stale entities show visual indicators. All 14 entity types render correctly.

### Phase Ordering Rationale

The phase ordering follows two principles from the research:

1. **Data before visualization** (Architecture research, Build Order): Phases 1-2 of the architecture build order explicitly state that the data pipeline can be built and tested without any browser or React. This is the lowest-risk starting point — if the data model is wrong, no amount of UI polish helps.

2. **Progressive entity expansion** (Pitfalls 1 and 7): Start with 4-5 entity types in Phase 1, prove the visual story works in Phases 2-3, then add remaining types in Phase 4. This directly counters the #1 KG project failure mode (modeling for completeness before utility).

Phase 3 (interaction) comes before Phase 4 (chain integrity) because the pitfall research emphasizes that "governance chain visualization" is meaningless without basic navigation tools (search, filter, detail panel). Users need to find nodes before they can evaluate chain health.

### Research Flags

1. **RENDERER CONFLICT (must resolve before Phase 2):** The stack research recommends **reagraph** (WebGL via Three.js, built-in tree/force/cluster layouts, graphology bundled internally). The architecture research recommends **react-force-graph-2d** (Canvas via d3-force, lighter weight, same API surface as 3D variant). The pitfalls research assumes **React Flow / xyflow** (DOM-based node editor with custom nodes). These are three different libraries with different rendering strategies (WebGL vs Canvas vs DOM). The architecture research explicitly warns against WebGL as "over-engineering for scale" at ~1000 nodes, while the stack research argues reagraph's all-in-one nature (single install, built-in layouts) outweighs the complexity. **Recommendation:** Resolve by prototyping a 200-node graph with both reagraph and react-force-graph-2d. The winner is whichever provides hierarchical tree layout + force-directed layout switching with less code. Discard the React Flow assumption from pitfalls research — STACK.md correctly identifies it as "designed for flowcharts/node editors, not for knowledge graph visualization."

2. **Type mirroring strategy:** Architecture research recommends mirroring iDumb v2 interfaces in `types/entities.ts` with version tagging. This creates a drift risk. The prototype should include a schema compatibility test that verifies the mirrored types match sample JSON output from iDumb v2.

3. **File serving in development:** Stack research proposes using Vite's `server.fs.allow` to serve `.idumb/brain/` JSON files directly. This needs validation — the target `.idumb/brain/` directory is in a different project root than the prototype's Vite dev server. May need a proxy or symlink strategy.

4. **Performance pitfalls reference wrong library:** Pitfalls 3 (React Flow Re-render Cascade) and its mitigations (`<ReactFlow>` props, `nodeTypes`, `<MiniMap>`) are specific to React Flow (xyflow), not to reagraph or react-force-graph-2d. If the renderer decision goes to reagraph, these specific mitigations need to be re-researched for reagraph's component model. The general principle (memoize everything, separate stores) still applies.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified against npm registry 2026-02-09. Compatibility matrix validated. graphology as data layer is unambiguous. |
| Features | HIGH | 7 table-stakes + 8 differentiators + 6 anti-features clearly categorized. MVP scope well-defined. Competitive landscape compared against Gephi, Neo4j Bloom, Linkurious. |
| Architecture | HIGH | ETL pipeline, adapter-per-entity, separated Zustand stores are well-researched patterns. Build order with test gates is actionable. |
| Pitfalls | HIGH | 10 pitfalls sourced from failed KG post-mortems, performance benchmarks, and UX studies. Pitfall-to-phase mapping is explicit. |
| Renderer choice | MEDIUM | Three conflicting recommendations across research files. Stack research favors reagraph; architecture research favors react-force-graph-2d; pitfalls research assumes React Flow. Needs prototype validation before Phase 2. |
| Data model | HIGH | 14 entity types and 8 edge types are well-defined. GraphNode/GraphEdge/GraphModel interfaces specified. Entity-to-graph mapping is explicit. |
| Performance | HIGH | ~1000 nodes is well within Canvas or WebGL limits. Performance traps are documented with prevention strategies. |

**Overall confidence:** HIGH. The research is thorough, internally consistent within each file, and the one major conflict (renderer choice) is clearly identified with a resolution path. The data pipeline (Phase 1) can proceed immediately regardless of renderer decision. The renderer decision must be resolved before Phase 2 begins.

### Gaps to Address

1. **Renderer prototype comparison** — Build a 200-node test with reagraph and react-force-graph-2d to resolve the conflict
2. **Sample data generation** — Need representative `.idumb/brain/*.json` fixture files for development and testing
3. **Vite cross-project file serving** — Validate that Vite can serve JSON files from a different project's `.idumb/brain/` directory
4. **Entity adapter priority** — The 4-5 initial entity types (WorkPlan, TaskNode, Checkpoint, Agent/DelegationRecord) need validation against actual governance questions
5. **Accessibility** — Canvas/WebGL rendering has no DOM tree for screen readers. The detail panel must carry the accessibility burden. This wasn't deeply explored in any research file.
6. **Testing strategy for visual components** — Architecture mentions vitest + @testing-library/react but doesn't detail how to test Canvas paint functions or graph layout correctness

## Sources

### Stack Research
- npm registry (`npm view <pkg> version`) — all versions verified 2026-02-09
- reagraph npm dependencies — confirmed graphology 0.26.0 bundled internally
- Context7 `/reaviz/reagraph` docs — custom node rendering, tree layouts, clustering
- Exa search — reagraph vs react-force-graph vs sigma.js comparison
- Tavily advanced search — graphology ecosystem, Tailwind CSS v4 + shadcn/ui compatibility

### Feature Research
- iDumb v2 schema files: `src/schemas/` (10 schema files analyzed)
- Existing dashboard: `src/dashboard/frontend/src/components/panels/` (5 panels)
- Gephi features (verified via WebFetch)
- Neo4j Bloom documentation (verified via WebFetch)
- Linkurious Enterprise (LOW confidence — product page returned 404)

### Architecture Research
- iDumb v2 schema analysis (12 entity types across 7 JSON stores)
- react-force-graph GitHub + docs
- Reagraph docs (considered but rejected in architecture research as over-engineering)
- Zustand vs Jotai vs Valtio comparison 2025/2026
- ETL pipeline architecture patterns for JSON-to-graph transformation

### Pitfalls Research
- Zhang, J. (2026-01-28). "Why Million-Dollar Knowledge Graph Projects Fail." LinkedIn/Insilicom
- Synergy Codes (2025-01-23). "The Ultimate Guide to Optimizing React Flow Project Performance."
- React Flow Docs (2025). "Performance — Advanced Use."
- Cambridge Intelligence (2025). "Create Meaningful UX and UI in Your Graph Visualization."
- i2 Group (2025). "Top 10 Considerations for Knowledge Graph Visualization and Analytics."
- yFiles (2025). "Guide to Creating Knowledge Graph Visualizations."
- Memgraph (2025). "15 Questions to Ask Before Building a Knowledge Graph."
- ACM Queue (2019). Noy et al. "Industry-Scale Knowledge Graphs: Lessons and Challenges."
- Rivers, H. (2020). "Interaction Design for Trees."
- Hurter, C. et al. (2013). "Grooming the Hairball."

---
*Research completed: 2026-02-09*
*Ready for roadmap: yes*
*Renderer conflict must be resolved before Phase 2 planning*
