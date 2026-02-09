# Pitfalls Research

**Domain:** Coherent Knowledge Graph — AI Agent Governance Traceability
**Researched:** 2026-02-09
**Confidence:** HIGH

> Research synthesized from: failed KG project post-mortems (Jinfeng Zhang / Insilicom), React Flow performance benchmarks (Synergy Codes), graph visualization UX studies (Cambridge Intelligence, yFiles), i2 Group visual analytics considerations, ACM Queue industry-scale KG analysis, Memgraph schema design guides, and hierarchical tree UX research (Hagan Rivers / UX SE).

---

## Critical Pitfalls

### Pitfall 1: Schema-Before-Questions (Modeling for Completeness, Not Utility)

**What goes wrong:** You model all 14 entity types and 25 cross-entity link fields into a perfect typed graph, then discover the visualization can't answer the one question users actually ask: "Why did the executor fail this task?"

**Why it happens:** Schema-first thinking from the iDumb codebase bleeds into the visualization layer. The source schemas (`task-graph.ts`, `work-plan.ts`, `delegation.ts`) define entities for governance enforcement — not for visual querying. A field that matters for a tool-gate hook (e.g., `shellBlacklist` patterns) is irrelevant for traceability visualization. Teams spend months perfecting ontologies before testing if users understand them at all (Zhang, "Why Million-Dollar KG Projects Fail," 2026-01).

**How to avoid:**
1. Define 5-7 governance questions the graph must answer before writing any schema code: "Who delegated this?", "What tasks are blocked?", "What changed since last session?", "Show the evidence trail for this completion."
2. Design schema in reverse: start with the question, map the query/traversal, then settle on node/edge types (Memgraph best practice).
3. Start with 3-4 entity types (WorkPlan, TaskNode, Agent, Anchor), prove the visual answers work, then add the remaining types incrementally.

**Warning signs:**
- You've defined > 8 entity types before rendering a single node on screen
- Entity types have > 10 properties each in the graph schema
- No one can describe what a user would "do" with the rendered graph

**Phase to address:** Phase 1 (Schema Design) — must be query-driven, not data-completeness-driven.

---

### Pitfall 2: The Governance Hairball

**What goes wrong:** With 14 entity types and ~25 cross-entity link fields, showing the full graph produces an unreadable tangled mess. Every WorkPlan connects to TaskNodes, which connect to Checkpoints, which reference Agents, which link to Anchors, which track Artifacts. The visual is a dense ball of edges — Cambridge Intelligence calls this the "hairball" — where no pattern, hierarchy, or insight is discernible.

**Why it happens:** Graph visualization tools default to "show everything." Developers add entities and links as they parse each JSON file, never gating what's shown. The problem is invisible at 20 nodes but catastrophic at 200+. With governance data specifically, the delegation chains (Coordinator → Investigator → Executor) create high-fanout hub nodes where a single Coordinator connects to dozens of tasks.

**How to avoid:**
1. **Progressive disclosure from day one.** Start with WorkPlan-level summary view. Expand to TaskNode detail on click. Never show Checkpoints unless explicitly requested.
2. **Semantic zoom:** At zoom-out, show entity clusters with counts ("12 tasks, 3 failed"). At zoom-in, show individual nodes with properties.
3. **Filter by governance question:** "Show only failed paths," "Show only active delegation chain," "Show only tasks from last session."
4. **Node grouping/combos:** Group TaskNodes under their parent WorkPlan as collapsible clusters (i2 Group recommendation — entity grouping and link summarization are imperative as graphs grow).

**Warning signs:**
- You can't identify the "main story" in the graph within 3 seconds
- More than 30% of screen area is occupied by edges
- Users say "cool" but can't describe what they're looking at

**Phase to address:** Phase 2 (Layout & Rendering) — but the architecture decision (progressive disclosure vs. full graph) must be made in Phase 1.

---

### Pitfall 3: React Flow Re-render Cascade

**What goes wrong:** A single un-memoized prop or anonymous function on the `<ReactFlow>` component causes ALL custom nodes to re-render on every state change. With governance nodes containing rich content (status badges, timestamps, agent labels, evidence text), performance drops from 60 FPS to 2 FPS during drag operations. Benchmarked by Synergy Codes with 100 "heavy" nodes: un-memoized props = 2 FPS; properly memoized = 60 FPS stable.

**Why it happens:** React Flow uses Zustand internally. Any change to the nodes array (even a single node's position during drag) triggers a store update. If components subscribe to the full `state.nodes` array instead of specific slices, every node re-renders. Custom governance nodes are "heavy" — they display DataGrid-like content with status, evidence, timestamps — making each unnecessary re-render expensive. This is React Flow's #1 documented performance issue.

**How to avoid:**
1. **Wrap ALL custom nodes and edges in `React.memo`** — this is non-negotiable from the first line of code. It's the single highest-impact optimization.
2. **Memoize every prop** passed to `<ReactFlow>`: use `useCallback` for functions, `useMemo` for objects. A single `onNodeClick={() => {}}` anonymous function destroys performance.
3. **Never subscribe to full `state.nodes` array** in components. Use separate Zustand store slices for derived state (selected nodes, filtered views).
4. **Use `createWithEqualityFn` with `shallow`** comparison for the Zustand store to get automatic memoization on selectors.
5. **Wrap heavy node content** (data grids, long text, nested components) in a separate `React.memo` component inside the node.

**Warning signs:**
- FPS drops below 30 during drag/pan/zoom with < 100 nodes
- React DevTools Profiler shows all nodes re-rendering on single-node drag
- Adding `onNodeClick`, `onEdgeClick`, or other handlers causes visible lag

**Phase to address:** Phase 2 (Layout & Rendering) — must be enforced as a lint rule / code review gate from the first custom node implementation.

---

### Pitfall 4: Layout Algorithm Mismatch

**What goes wrong:** You apply a force-directed layout to hierarchical governance data (WorkPlan → TaskNode → Checkpoint), and the parent-child relationships become invisible. Or you apply a strict hierarchical layout to the cross-cutting delegation links (Coordinator → Investigator → Executor), and the tree fractures into disconnected columns. The layout communicates the wrong structure.

**Why it happens:** React Flow doesn't include a built-in layout engine. Developers grab the first layout library (dagre, d3-force, elkjs) and apply it uniformly. But governance data has two conflicting structural patterns: (a) strict hierarchies (WorkPlan → TaskNode → Checkpoint, ArtifactChain → Artifact → Section) that need tree/hierarchical layout, and (b) cross-cutting entity relationships (Agent ↔ Task delegation, Anchor ↔ Task references) that need organic/radial layout. One algorithm cannot serve both. yFiles explicitly recommends: "Match layout to your data structure — hierarchical for dependency flows, organic for entity exploration, radial for ego-centric analysis."

**How to avoid:**
1. **Use hierarchical layout (dagre/elkjs) as the PRIMARY layout** for the governance chains (WorkPlan → TaskNode → Checkpoint). This is the core visual story.
2. **Render cross-cutting links (delegation, anchor references) as styled overlays** on top of the hierarchical layout, not as layout-driving edges.
3. **Provide layout switching:** "Hierarchy view" (tree), "Timeline view" (left-to-right by timestamp), "Agent view" (radial around selected agent).
4. **Pre-compute layout, don't compute on render.** D3-Force is iterative — computing on every render for large graphs causes significant performance hit (React Flow docs).

**Warning signs:**
- Parent nodes are not visually above/left-of child nodes
- Users can't trace the WorkPlan → TaskNode → Checkpoint chain visually
- Delegation arrows cross the entire graph diagonally
- Layout "jumps" on expand/collapse because force simulation restarts

**Phase to address:** Phase 2 (Layout & Rendering) — layout strategy must be decided before first visual prototype. Switching layout engines later requires rewriting position logic.

---

### Pitfall 5: Dangling Cross-References in JSON Ingestion

**What goes wrong:** Task `tn-123` references `workPlanId: "wp-456"` but the work plan JSON file is stale, missing, or was partially written during a concurrent governance operation. The graph renders the task node but the edge to its parent is broken. Silently. The user sees an orphaned node and assumes the governance system is broken, or worse, doesn't notice the missing link and draws incorrect conclusions about the governance chain.

**Why it happens:** The knowledge graph is a read-only consumer of JSON files that are being actively written by the iDumb governance system (hooks, tools, persistence layer). Multiple JSON files reference each other by ID: `tasks.json` references `work-plans.json` IDs, anchors reference task IDs, delegation records reference agent names. There's no referential integrity enforcement between files — the source system uses string IDs, not foreign keys. File writes aren't atomic (no journaling), so a read during write can yield partial JSON.

**How to avoid:**
1. **Validate all cross-references on load.** Build a reference integrity checker that runs after all JSON files are parsed: for every ID reference, verify the target entity exists. Log broken references as warnings, not silent drops.
2. **Render broken references explicitly.** Show a "dangling reference" indicator (dashed red edge to a placeholder node) rather than silently omitting the edge. Make data quality visible (Zhang: "Make quality transparent — show confidence scores, display provenance").
3. **Defensive JSON parsing with try/catch per file.** A single corrupt file should not crash the entire graph load. Parse each file independently, accumulate errors, render what you can.
4. **File read with retry/delay.** If a JSON file fails to parse, retry after 100ms — it may have been mid-write. Use `fs.readFile` (not streams) for atomic read of small files.
5. **Schema validation (Zod or similar) at the ingestion boundary.** Validate each parsed entity against expected shape before adding to graph.

**Warning signs:**
- Graph shows orphaned nodes with no parent edges
- Node count doesn't match expected entity count from JSON files
- `JSON.parse` errors appear intermittently in logs
- Graph looks different on each reload (race condition symptom)

**Phase to address:** Phase 1 (Data Ingestion Layer) — must be implemented before any rendering work begins.

---

### Pitfall 6: Temporal Dimension Blindness

**What goes wrong:** Governance data is fundamentally temporal — tasks have `startedAt`/`completedAt`, anchors have `timestamp`, delegation records have `delegatedAt`, checkpoints have `recordedAt`. A flat graph layout strips this dimension entirely. The user can see that Task A and Task B exist, but can't tell which came first, whether they overlapped, or how the governance sequence unfolded. The most important governance question — "What happened in what order?" — becomes unanswerable.

**Why it happens:** Graph visualization naturally emphasizes topology (who connects to whom) at the expense of temporality (when did connections form). Most graph layout algorithms optimize for edge crossing reduction and node separation, not temporal ordering. Developers think "graph" and forget that governance traceability requires audit trails — inherently sequential.

**How to avoid:**
1. **Support a timeline view** where the X-axis represents time and nodes are positioned by their primary timestamp. This transforms the graph into a Gantt-like view showing governance activity flow.
2. **Encode temporal information visually:** node opacity fading for older entities, color gradients from green (recent) to gray (stale), animated edge traces showing creation order.
3. **"Session boundary" markers:** Visual dividers showing where one agent session ended and another began — critical for understanding cross-session governance continuity.
4. **Temporal filtering:** Slider or date range picker to show "governance state at time T" or "activity window between T1 and T2."

**Warning signs:**
- Users ask "when did this happen?" and can't answer it from the graph
- Active and completed tasks look identical
- No way to distinguish a task that ran for 5 minutes from one that ran for 5 hours

**Phase to address:** Phase 3 (Interaction & Filtering) — but temporal data must be captured in the schema from Phase 1 (store timestamps as first-class node properties, not metadata).

---

### Pitfall 7: Over-Engineering the Ontology Before Visual Testing

**What goes wrong:** Months spent modeling all 14 entity types with full property sets, relationship constraints, and type hierarchies. When the visualization finally renders, users say "I only care about three of these." The perfect ontology sits unused — exactly the pattern documented in failed KG projects: "Teams spend months debating whether 'inhibits' and 'antagonizes' should be separate relationship types... then discover users only care about three entity types and five relationship types" (Zhang, 2026).

**Why it happens:** iDumb already has 14 entity types defined in TypeScript schemas. The temptation is to mirror all 14 directly into the graph. But a visualization tool and a governance enforcement engine have different concerns. The enforcement engine needs `shellBlacklist` patterns — the visualization doesn't. The visualization needs "delegation chain with evidence" — the enforcement engine doesn't store that as a first-class concept.

**How to avoid:**
1. **Start with exactly 4 core types:** `WorkPlan`, `TaskNode`, `Agent`, `Anchor`. Prove the graph answers governance questions with just these.
2. **Add entity types only when a user question requires them.** "Why was this task delegated to executor?" → add `DelegationRecord`. "What artifacts were modified?" → add `Artifact`.
3. **Treat ontology as evolutionary** — not as a design artifact to be perfected up front (Zhang: "Start simple. Add complexity only when users demonstrate the need").
4. **Visual testing within the first week.** Render even a single hardcoded WorkPlan → TaskNode chain before completing the schema.

**Warning signs:**
- Schema file is > 300 LOC before any rendering code exists
- Entity type count exceeds 6 before first visual prototype
- Debates about edge type naming ("delegates_to" vs. "assigned_to") without visual context

**Phase to address:** Phase 1 (Schema Design) — must use an incremental approach, not a big-bang ontology.

---

### Pitfall 8: Hierarchy Depth Context Loss

**What goes wrong:** User expands WorkPlan → sees 8 TaskNodes → expands a TaskNode → sees 5 Checkpoints → scrolls down to see checkpoint details → loses sight of which WorkPlan and TaskNode they're drilling into. With 3-4 levels of nesting (WorkPlan → TaskNode → Checkpoint → evidence detail), the parent context scrolls out of view. The user is "lost in the tree" (Hagan Rivers, "Interaction Design for Trees").

**Why it happens:** Deep hierarchies push child nodes further from their parents in both tree views and graph layouts. In a React Flow canvas, expanding a node's children shifts the viewport. The user must manually scroll/pan to maintain context. Additionally, if the tree resets scroll position on expand/collapse (a documented ExtJS/React bug pattern), user arrangement is destroyed.

**How to avoid:**
1. **Breadcrumb trail** always visible: `WorkPlan: "Quick Setup" > TaskNode: "Research stack" > Checkpoint: "STACK.md verified"` — sticky header that persists regardless of scroll/zoom.
2. **Preserve user arrangement on expand/collapse.** Never reset scroll position or re-layout the entire graph when one node expands. The expand animation should keep the parent in view while children appear below/right (React Flow `useExpandCollapse` hook pattern).
3. **Limit default depth to 2 levels.** Show WorkPlan → TaskNode by default. Require explicit click to reveal Checkpoints. Never auto-expand all levels.
4. **Minimap with current viewport indicator.** React Flow has a built-in `<MiniMap>` component — always enable it for hierarchical views.

**Warning signs:**
- Users repeatedly zoom out/pan to find "where am I?"
- Expanding a node causes the entire graph to re-layout
- No visual indication of how deep the current view is
- Users can't navigate back to parent without manual pan

**Phase to address:** Phase 2 (Layout & Rendering) for structural approach, Phase 3 (Interaction) for breadcrumbs and navigation aids.

---

### Pitfall 9: Edge Type Visual Confusion

**What goes wrong:** With ~25 cross-entity link fields, all edges look the same — thin gray lines connecting nodes. The user can't distinguish "delegated_by" from "depends_on" from "references_anchor" from "belongs_to_plan." The edges carry no semantic meaning. Alternatively, the team creates 25 distinct edge styles (colors, dashes, arrowheads), creating a visual rainbow that's equally unreadable — the "snowstorm" problem where too many visual variables overwhelm pattern recognition.

**Why it happens:** Edge styling is an afterthought. Developers focus on node rendering first and treat edges as simple connections. But in governance graphs, the edge type IS the insight: "who delegated to whom" and "what depends on what" are the core questions. Without distinguishable edges, the graph is a pretty picture with no analytical value. i2 Group: "Not all visualization tools are created equally — being able to control link styling is key to presenting accurate evidence."

**How to avoid:**
1. **Categorize edges into 3-4 semantic groups** with distinct visual treatment:
   - **Hierarchy edges** (belongs_to, parent_of): solid, thin, gray — structural scaffolding
   - **Delegation edges** (delegated_by, assigned_to): solid, medium, colored by agent — the governance story
   - **Dependency edges** (depends_on, blocked_by): dashed, red/amber — the constraint story
   - **Reference edges** (references, linked_to): dotted, light — supplementary context
2. **Show only one edge category at a time** by default. Let users toggle categories on/off.
3. **Edge labels on hover only** — permanent edge labels on a dense graph create unreadable text overlap.
4. **Edge bundling for parallel edges.** If 5 TaskNodes all link to the same Agent, bundle into one thick edge with a count badge rather than 5 separate lines.

**Warning signs:**
- All edges are the same color/style
- Edge labels overlap, creating illegible text clusters
- Users can't answer "what kind of relationship is this?" by looking at an edge

**Phase to address:** Phase 2 (Layout & Rendering) — edge taxonomy must be defined during schema design (Phase 1), but visual implementation is Phase 2.

---

### Pitfall 10: Full-Graph Initial Load

**What goes wrong:** The application loads all ~1000 nodes and renders them on the canvas simultaneously. The initial paint takes 3-5 seconds, the layout algorithm runs for another 2-3 seconds, and the user stares at a loading spinner before seeing a graph so dense it's useless. First impression: "this tool is slow and the graph is incomprehensible."

**Why it happens:** The naive implementation parses all JSON files → creates all graph nodes → passes all to React Flow → computes layout. With ~1000 nodes, React must reconcile 1000+ DOM elements (or virtual nodes), the layout algorithm must compute 1000+ positions, and the renderer must paint 1000+ elements plus edges. This is the "death star" initial render.

**How to avoid:**
1. **Start with a focused view.** Default to showing only active WorkPlans and their immediate TaskNodes (typically < 50 nodes). Render everything else on demand.
2. **Lazy-load children.** Parse all JSON at startup (fast — it's just JSON), but only create React Flow nodes for the current view. Add children when the user expands a node.
3. **Use React Flow's `hidden` property** to toggle node visibility without removing them from the graph. This preserves edge references while reducing render load.
4. **Virtual viewport rendering:** React Flow only renders nodes within the visible viewport by default (`onlyRenderVisibleElements`). Ensure this isn't disabled.
5. **Pre-computed layout cache.** If the JSON files haven't changed since last load, reuse cached node positions instead of recomputing layout.

**Warning signs:**
- Initial load takes > 1 second with < 500 nodes
- Layout computation causes visible "jump" as nodes settle into position
- Browser memory exceeds 200MB on initial render

**Phase to address:** Phase 2 (Layout & Rendering) — architecture decision must be made in Phase 1 (lazy vs. eager graph construction).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| **Skip `React.memo` on custom nodes** | Faster initial dev, less boilerplate | 10x performance degradation at 100+ nodes; fixing later requires touching every node component | Never — add `React.memo` from the first custom node |
| **Single Zustand store for all state** | Simple architecture, fewer files | Store updates on every node drag cascade re-renders to every subscriber; requires expensive refactor to split | Acceptable for MVP if selectors use `useShallow` from day one |
| **`any` types for graph node data** | Fast iteration, no schema friction | Silent type errors in edge resolution, broken references not caught at compile time, untraceable runtime crashes | Never — TypeScript discriminated unions for node types from day one |
| **Hardcoded JSON file paths** | Works immediately for `.idumb/` structure | Breaks if user customizes `.idumb/` location; blocks multi-project support | Acceptable for Phase 1 prototype only, must abstract by Phase 2 |
| **Force-directed layout for all views** | Single layout algorithm, simpler code | Hierarchy relationships invisible, layout unstable across reloads, confusing mental model | Acceptable for initial exploration view only; hierarchy view must use dagre/elk |
| **Parse JSON on every render** | No caching complexity | Disk I/O on every interaction, race conditions with concurrent file writes | Never — parse once on load, use file watcher for updates |
| **Inline edge styles** | Quick visual differentiation | Inconsistent styling, impossible to maintain edge taxonomy, breaks when adding new edge types | Acceptable for first 48 hours of prototyping only |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| **Un-memoized `<ReactFlow>` props** | 60 FPS → 10 FPS on drag with 100 default nodes; → 2 FPS with heavy nodes | `useCallback` for all handler props, `useMemo` for objects, define `nodeTypes` outside component | Immediately — even 50 nodes will stutter |
| **Subscribing to `state.nodes` array in custom nodes** | All nodes re-render on single node position change (drag) | Use separate Zustand store slices; never `useStore(s => s.nodes)` inside a node component | At 50+ nodes with any interactivity |
| **D3-Force layout computed on every render** | Layout recalculates during drag/zoom, causing "jelly" nodes that bounce | Compute layout once on data change; use `cooldownTicks={0}` and `warmupTicks` for initial settle | At 100+ nodes or when any interaction triggers a re-layout |
| **Complex CSS on nodes (shadows, gradients, animations)** | GPU compositing overhead, dropped frames during pan/zoom | Use flat colors, minimal box-shadow; add CSS complexity only to focused/selected nodes | At 200+ nodes with CSS animations |
| **Full JSON re-parse on file watcher trigger** | File watcher fires on every byte change; parsing 500KB of JSON blocks main thread | Debounce file watcher (300ms), diff parsed result against current state, update only changed entities | When JSON files are actively being written during user interaction |
| **Expanding all nodes simultaneously** | 1000-node expand triggers 1000 React Flow node additions in one frame | Animate expansion: add child nodes in batches of 10-20 with `requestAnimationFrame` | When any single expand operation adds > 50 child nodes |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| **"Graph dumps" — showing everything at once** | Information overload; user can't find the signal in the noise; abandons tool after 30 seconds | Progressive disclosure: default to WorkPlan overview, expand on demand; provide "governance story" guided paths |
| **No entry point / landing view** | User opens tool, sees 500 nodes, doesn't know where to start | Start with a dashboard: "3 active plans, 2 failed tasks, 5 stale anchors" — click to drill into graph view |
| **Losing scroll/zoom position on data refresh** | User zooms into a specific area, file watcher triggers reload, viewport resets to origin | Preserve viewport transform across data refreshes; only update changed nodes in-place |
| **No distinction between active and completed entities** | All nodes look the same; user can't identify what's currently running vs. historical | Color-code by status: green=active, blue=completed, red=failed, gray=stale/archived |
| **Edge labels always visible** | Text overlap creates illegible clusters; visual noise dominates; graph looks "busy" | Labels on hover/select only; use edge color/style to convey type; count badges for parallel edges |
| **Single graph view with no alternatives** | Users who think in tables or timelines are forced into a graph paradigm they find confusing | Provide at least 3 views: graph (default), tree (hierarchy), table (flat list with filters) |
| **No keyboard navigation** | Power users forced to mouse-click through deep hierarchies; accessibility failure | Arrow keys to traverse hierarchy; Enter to expand; Escape to collapse; `/` to search |
| **Tooltip overload** | Every hover shows 15-field tooltip; user glazes over without reading | Show 2-3 key fields in tooltip (status, agent, timestamp); "Show details" click for full panel |

---

## "Looks Done But Isn't" Checklist

- [ ] **Node rendering:** Custom nodes exist but aren't wrapped in `React.memo` — verify every node component is memoized
- [ ] **Edge types:** Edges render but all look identical — verify at least 3 visual categories (hierarchy, delegation, dependency) with distinct styling
- [ ] **Cross-reference integrity:** Graph renders but silently drops broken references — verify a validation pass logs all dangling IDs and renders placeholder nodes
- [ ] **Temporal ordering:** Nodes display but have no time context — verify timestamps are shown and at least one view sorts by time
- [ ] **Expand/collapse:** Tree view exists but resets scroll position — verify viewport preservation on expand/collapse operations
- [ ] **File watching:** Auto-reload works but resets viewport — verify camera position preserved across refreshes
- [ ] **Empty states:** Graph renders with data but shows blank screen when JSON files are empty or missing — verify graceful empty-state UX for each view
- [ ] **Search:** Search box exists but only matches node labels — verify it searches across entity properties (ID, agent name, evidence text, status)
- [ ] **Error boundaries:** Graph renders but crashes on malformed JSON — verify `ErrorBoundary` wraps the graph and shows recovery UI, not a white screen
- [ ] **Layout stability:** Layout computes but produces different positions on each reload — verify deterministic layout (same input → same positions) using dagre/elk with fixed seed/ordering

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. Schema-Before-Questions | Phase 1 (Schema Design) | Schema has < 6 entity types; each type maps to at least one governance question |
| 2. Governance Hairball | Phase 1 (Architecture Decision) + Phase 2 (Implementation) | Default view shows < 50 nodes; progressive disclosure documented in design spec |
| 3. React Flow Re-render Cascade | Phase 2 (Layout & Rendering) — enforced from first LOC | FPS > 50 during drag with 200 nodes; React DevTools confirms no cascade re-renders |
| 4. Layout Algorithm Mismatch | Phase 2 (Layout & Rendering) | Hierarchical layout for governance chains; cross-cutting links rendered as overlays |
| 5. Dangling Cross-References | Phase 1 (Data Ingestion Layer) | Validation pass runs on load; broken references logged; placeholder nodes rendered |
| 6. Temporal Dimension Blindness | Phase 1 (Schema) + Phase 3 (Interaction) | At least one view orders nodes by timestamp; active/completed visually distinct |
| 7. Over-Engineering Ontology | Phase 1 (Schema Design) | First visual prototype within 1 week; uses < 5 entity types |
| 8. Hierarchy Depth Context Loss | Phase 2 (Layout) + Phase 3 (Interaction) | Breadcrumb trail visible during deep drill-down; expand doesn't reset viewport |
| 9. Edge Type Visual Confusion | Phase 1 (Taxonomy) + Phase 2 (Implementation) | 3-4 edge categories with distinct visual treatment; edge labels appear on hover only |
| 10. Full-Graph Initial Load | Phase 1 (Architecture) + Phase 2 (Implementation) | Initial render < 1 second; default view < 50 visible nodes |

---

## Sources

1. **Zhang, J.** (2026-01-28). "Why Million-Dollar Knowledge Graph Projects Fail." LinkedIn/Insilicom. — Post-mortem patterns: completeness-over-utility, ontology over-engineering, no user testing, no governance model.
2. **Synergy Codes** (2025-01-23). "The Ultimate Guide to Optimizing React Flow Project Performance." — Benchmarked FPS impact: un-memoized props (60→2 FPS), `React.memo` recovery, Zustand `useShallow` patterns, heavy node optimization.
3. **React Flow Docs** (2025). "Performance — Advanced Use." reactflow.dev/learn/advanced-use/performance. — Memoization requirements, `useStore` anti-patterns, node hiding strategy, CSS simplification.
4. **Cambridge Intelligence** (2025). "Create Meaningful UX and UI in Your Graph Visualization." — Hairball/snowstorm/starburst patterns, progressive disclosure, label truncation, combo grouping.
5. **i2 Group** (2025). "Top 10 Considerations for Knowledge Graph Visualization and Analytics." — Entity grouping/aggregation, dynamic styling, de-duplication, data lineage/provenance, temporal + geospatial special types.
6. **yFiles** (2025). "Guide to Creating Knowledge Graph Visualizations." — Layout-to-data matching (hierarchic for ontologies, organic for exploration, radial for ego-centric), schema vs. instance views, progressive disclosure, predicate filtering.
7. **Memgraph** (2025). "15 Questions to Ask Before Building a Knowledge Graph" + "Graph Data Modeling Best Practices." — Design schema in reverse (question-first), don't overcomplicate the model, avoid data duplication, identify nodes by unique identity.
8. **ACM Queue** (2019). Noy et al. "Industry-Scale Knowledge Graphs: Lessons and Challenges." — Entity disambiguation, type membership resolution, multiple-type entities, quality at scale.
9. **Rivers, H.** (2020). "Interaction Design for Trees." Medium. — Deep nesting context loss, scroll position preservation, Miller columns for deep hierarchies, work preservation in tree interactions.
10. **Hurter, C. et al.** (2013). "Grooming the Hairball — How to Tidy Up Network Visualizations?" HAL-ENAC. — Edge bundling techniques, clutter-vs-overdraw tradeoff, filtering, aggregation, geometry-level methods.
11. **vasturiano/react-force-graph** GitHub Issues #202, #223 (2020). — Force-directed layout performance at scale (117K nodes), warmup/cooldown tick strategies, geometry simplification.

---

*Pitfalls research for: Coherent Knowledge Graph — AI Agent Governance Traceability*
*Researched: 2026-02-09*
