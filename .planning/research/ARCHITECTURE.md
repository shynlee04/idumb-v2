# Architecture Research

**Domain:** Coherent Knowledge Graph — AI Agent Governance Traceability
**Researched:** 2026-02-09
**Confidence:** HIGH

Research based on: iDumb v2 schema analysis (12 entity types across 7 JSON stores), current graph visualization ecosystem (react-force-graph, Reagraph, d3-force), state management landscape (Zustand vs Jotai vs Redux comparison 2025/2026), and ETL pipeline architecture patterns for JSON-to-graph transformation.

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Browser (Single Page)                        │
│                                                                      │
│  ┌─────────────┐   ┌──────────────────────┐   ┌──────────────────┐  │
│  │  UI Shell    │   │  Graph Viewport       │   │  Detail Panel    │  │
│  │  (filters,   │   │  (Canvas2D via        │   │  (entity props,  │  │
│  │   toolbar,   │   │   react-force-graph)  │   │   linked nodes,  │  │
│  │   search)    │   │                       │   │   raw JSON)      │  │
│  └──────┬───────┘   └──────────┬────────────┘   └────────┬─────────┘  │
│         │                      │                         │            │
│  ───────┴──────────────────────┴─────────────────────────┴────────── │
│                         Zustand Store Layer                          │
│         ┌──────────────────────────────────────────────┐             │
│         │  graph-store   │  ui-store    │  filter-store │             │
│         │  (nodes,edges, │  (selection, │  (active      │             │
│         │   adjacency)   │   viewport)  │   filters)    │             │
│         └───────────────────────┬───────────────────────┘             │
│                                 │                                     │
│  ──────────────────────────────┴──────────────────────────────────── │
│                        Data Pipeline Layer                           │
│         ┌────────────┐  ┌─────────────┐  ┌─────────────┐            │
│         │  Loader     │→│ Normalizer   │→│  Linker      │            │
│         │  (read JSON │  │ (entity →    │  │ (resolve     │            │
│         │   files)    │  │  GraphNode)  │  │  cross-refs  │            │
│         └─────┬───────┘  └─────────────┘  │  → GraphEdge)│            │
│               │                           └──────────────┘            │
│  ─────────────┴──────────────────────────────────────────────────── │
│                        File System Boundary                          │
└──────────────────────────────────────────────────────────────────────┘
                                │
         ┌──────────────────────┴──────────────────────┐
         │          .idumb/brain/ (7 JSON files)        │
         │                                              │
         │  plans.json        tasks.json                │
         │  knowledge.json    wiki.json                 │
         │  registry.json     anchors.json              │
         │  plan.json                                   │
         └──────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Loader** | Read raw JSON files from `.idumb/brain/`, parse, validate structure | `fetch()` or `fs.readFile` → `JSON.parse` with type guards |
| **Normalizer** | Convert each entity type into a uniform `GraphNode` with display metadata | Per-entity adapter functions (12 adapters, one per type) |
| **Linker** | Resolve cross-reference fields into typed `GraphEdge` records | Field scanner that maps known reference fields to edge types |
| **Graph Store** | Hold the normalized graph (nodes, edges, adjacency index) | Zustand store with selectors for filtered subsets |
| **UI Store** | Track selection state, panel visibility, viewport bounds | Zustand store (separate from graph to avoid re-render coupling) |
| **Filter Store** | Active entity type filters, search query, time range, agent filter | Zustand store with derived `filteredNodes` selector |
| **Graph Viewport** | Render force-directed layout, handle pan/zoom/click/hover | `react-force-graph-2d` wrapping HTML5 Canvas |
| **Detail Panel** | Show full entity properties when a node is selected | React component reading from UI store selection |
| **Filter Panel** | Entity type toggles, search box, status/agent dropdowns | React component writing to filter store |
| **Stats Panel** | Graph-level metrics: node counts by type, edge density, connectivity | Computed from graph store on demand |

---

## Data Model: Entity-to-Graph Mapping

### Source Entities (14 types from iDumb schemas)

| Entity | Source File | Key Cross-Reference Fields | Node Category |
|--------|------------|---------------------------|---------------|
| `WorkPlan` | `plans.json` | `tasks[]` (TaskNode IDs) | Governance |
| `TaskNode` | `plans.json` (nested in WorkPlan) | `workPlanId`, `dependsOn[]`, `assignedTo`, `delegatedBy`, `temporalGate.afterTaskId`, `checkpoints[]` | Governance |
| `Checkpoint` | `plans.json` (nested in TaskNode) | `taskNodeId` | Governance |
| `BrainEntry` | `knowledge.json` | `parentId`, `childIds[]`, `relatedTo[]`, `supersedes` | Knowledge |
| `Anchor` | `anchors.json` | — (standalone, referenced by others) | Context |
| `DelegationRecord` | `tasks.json` | `fromAgent`, `toAgent`, `taskId` | Governance |
| `CoherentKnowledgeEntry` | `knowledge.json` | `taskId`, `planId`, `wikiEntries[]`, `planningArtifact` | Knowledge |
| `WikiEntry` | `wiki.json` | `taskId`, `planId`, `sessionId` | Knowledge |
| `PlanningArtifact` | `registry.json` | `chainId`, `sectionIds[]` | Planning |
| `ArtifactSection` | `registry.json` (nested) | `artifactId` | Planning |
| `ArtifactChain` | `registry.json` | `artifactIds[]`, `headId` | Planning |
| `PlanPhase` | `plan.json` | — (referenced by index) | Planning |

### Derived Edge Types

| Edge Type | Source Field(s) | From → To | Semantics |
|-----------|----------------|-----------|-----------|
| `contains` | `WorkPlan.tasks[]`, `TaskNode.checkpoints[]`, `ArtifactChain.artifactIds[]`, `PlanningArtifact.sectionIds[]` | Parent → Child | Structural containment |
| `dependsOn` | `TaskNode.dependsOn[]` | TaskNode → TaskNode | Execution ordering |
| `delegatedTo` | `DelegationRecord.toAgent`, `TaskNode.assignedTo` | Agent → TaskNode | Who does what |
| `producedBy` | `WikiEntry.taskId`, `CoherentKnowledgeEntry.taskId` | Knowledge → TaskNode | Provenance chain |
| `linkedTo` | `BrainEntry.relatedTo[]`, `CoherentKnowledgeEntry.wikiEntries[]` | Any → Any | Semantic association |
| `supersedes` | `BrainEntry.supersedes` | BrainEntry → BrainEntry | Version chain |
| `chainParent` | `ArtifactChain.headId` | Chain → Head artifact | Chain head pointer |
| `temporalGate` | `TaskNode.temporalGate.afterTaskId` | Blocked → Blocker | Temporal ordering |

---

## Recommended Project Structure

```
coherent-kg/                      # Separate project root
├── src/
│   ├── types/                    # Pure TypeScript — zero React dependency
│   │   ├── graph.ts              # GraphNode, GraphEdge, GraphModel, AdjacencyIndex
│   │   ├── entities.ts           # Mirrored entity interfaces (from iDumb schemas)
│   │   ├── edges.ts              # EdgeType enum, EdgeStyle config
│   │   └── filters.ts            # FilterState, SearchQuery, TimeRange
│   │
│   ├── data/                     # Data pipeline — pure functions, testable without React
│   │   ├── loader.ts             # Read + parse JSON files (7 sources)
│   │   ├── adapters/             # Per-entity normalizers
│   │   │   ├── work-plan.ts      # WorkPlan → GraphNode[]
│   │   │   ├── task-node.ts      # TaskNode → GraphNode[] + edges
│   │   │   ├── brain-entry.ts    # BrainEntry → GraphNode[] + edges
│   │   │   ├── delegation.ts     # DelegationRecord → GraphNode[] + edges
│   │   │   ├── knowledge.ts      # CoherentKnowledgeEntry → GraphNode[] + edges
│   │   │   ├── wiki.ts           # WikiEntry → GraphNode[] + edges
│   │   │   ├── planning.ts       # PlanningArtifact/Section/Chain → GraphNode[] + edges
│   │   │   └── index.ts          # Barrel export + registry
│   │   ├── linker.ts             # Resolve dangling refs, build adjacency index
│   │   └── pipeline.ts           # Orchestrator: load → adapt → link → GraphModel
│   │
│   ├── store/                    # Zustand stores — separated by concern
│   │   ├── graph-store.ts        # GraphModel + adjacency lookups + computed metrics
│   │   ├── ui-store.ts           # selectedNodeId, hoveredNodeId, panelState, viewMode
│   │   └── filter-store.ts       # entityTypeFilters, searchQuery, timeRange, agentFilter
│   │
│   ├── engine/                   # Graph algorithms — pure functions, no React
│   │   ├── adjacency.ts          # Build/query adjacency index (Map<id, neighbors>)
│   │   ├── traversal.ts          # BFS/DFS neighborhood, connected components
│   │   ├── metrics.ts            # Degree distribution, centrality, cluster detection
│   │   └── layout-config.ts      # Force simulation parameters per graph size
│   │
│   ├── components/               # React components
│   │   ├── graph/                # Core graph visualization
│   │   │   ├── GraphCanvas.tsx   # react-force-graph-2d wrapper + event handlers
│   │   │   ├── node-paint.ts     # Canvas paint functions per entity type (no JSX)
│   │   │   └── edge-paint.ts     # Canvas paint functions per edge type (no JSX)
│   │   ├── panels/               # Inspector panels
│   │   │   ├── DetailPanel.tsx   # Selected entity properties + linked nodes
│   │   │   ├── FilterPanel.tsx   # Entity type toggles, search, time range
│   │   │   └── StatsPanel.tsx    # Graph metrics summary
│   │   ├── views/                # Alternative view modes
│   │   │   ├── TreeView.tsx      # Hierarchical containment tree
│   │   │   └── ChainView.tsx     # Artifact chain linear view
│   │   └── layout/               # App shell
│   │       ├── AppLayout.tsx     # Main layout: sidebar + viewport + detail
│   │       └── Toolbar.tsx       # View mode switcher, reload, export
│   │
│   ├── hooks/                    # React hooks — bridge store to components
│   │   ├── useGraphData.ts       # Load pipeline + hydrate store on mount
│   │   ├── useSelection.ts      # Click/hover → ui-store
│   │   ├── useNeighborhood.ts    # Get N-hop neighbors of selected node
│   │   └── useFilteredGraph.ts   # Derive visible nodes/edges from filters
│   │
│   └── utils/                    # Pure utility functions
│       ├── colors.ts             # Entity type → color palette
│       ├── shapes.ts             # Entity type → node shape (circle, diamond, square)
│       ├── formatters.ts         # ID shortening, date formatting, label truncation
│       └── constants.ts          # Edge type styles, default force params
│
├── public/
│   └── sample-data/              # Sample .idumb/brain/ JSON files for development
│
├── tests/
│   ├── data/                     # Pipeline + adapter tests (pure function tests)
│   ├── engine/                   # Graph algorithm tests
│   └── integration/              # Full pipeline → store → render tests
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── index.html
```

### Structure Rationale

- **`types/` is dependency-free.** Everything imports from types. Types import from nothing. This makes them shareable if the iDumb core ever consumes them.
- **`data/` has zero React dependency.** The entire pipeline (load → normalize → link) runs as pure functions. Testable with plain `node:test` or Vitest without jsdom.
- **`data/adapters/` uses one file per entity type.** Each adapter is a pure function: `(rawEntity) → { nodes: GraphNode[], edges: GraphEdge[] }`. Easy to add/remove entity types. Maps 1:1 to schema files in iDumb.
- **`store/` splits into three stores.** Graph data changes rarely (only on reload). UI state changes constantly (selection, hover). Filters change occasionally. Splitting prevents re-render cascading.
- **`engine/` is pure computation.** Adjacency, traversal, metrics — all operate on `GraphModel` without touching React or DOM. Testable, composable, extractable.
- **`components/graph/` uses Canvas paint functions, not JSX nodes.** At ~1000 nodes, react-force-graph-2d renders via `nodeCanvasObject` callback — a plain function that paints on `CanvasRenderingContext2D`. No React reconciliation per node.
- **`hooks/` bridges store to components.** Each hook has a single concern. `useFilteredGraph` is the key derived-data hook — combines graph-store + filter-store into `{ visibleNodes, visibleEdges }`.
- **`tests/` mirrors `src/` structure.** Data pipeline tests run without React. Integration tests verify the full chain.

---

## Architectural Patterns

### Pattern 1: ETL Pipeline (Extract → Transform → Load)

**What:** The data layer follows a strict three-stage pipeline. Extract reads JSON files. Transform normalizes heterogeneous entities into uniform `GraphNode`/`GraphEdge`. Load hydrates the Zustand store with the complete `GraphModel`.

**When to use:** Any time the source data format differs from the visualization format. Here, 14 entity types with different shapes must become uniform graph nodes. The pipeline is the natural seam.

**Trade-offs:**
- (+) Each stage is independently testable
- (+) Adding a new entity type = adding one adapter file
- (+) The pipeline can run once on load, or re-run on file change
- (-) Full pipeline re-run on any file change (acceptable at ~1000 nodes — takes <50ms)
- (-) Intermediate representations allocate memory (negligible at this scale)

```
┌────────────┐    ┌──────────────────┐    ┌─────────────┐    ┌────────────┐
│ loader.ts  │───→│ adapters/*.ts    │───→│ linker.ts   │───→│ graph-store │
│ (7 files)  │    │ (14 normalizers) │    │ (resolve    │    │ (hydrate)  │
│            │    │                  │    │  cross-refs)│    │            │
└────────────┘    └──────────────────┘    └─────────────┘    └────────────┘
   EXTRACT             TRANSFORM             TRANSFORM          LOAD
```

### Pattern 2: Adapter-per-Entity Normalization

**What:** Each entity type gets its own adapter function. The adapter knows how to read the raw entity shape and produce `GraphNode[]` + `GraphEdge[]`. All adapters share the same signature: `(raw: RawEntity) => { nodes: GraphNode[], edges: GraphEdge[] }`.

**When to use:** When source data has heterogeneous shapes (14 different entity interfaces) but the consumer needs a uniform representation. The adapter pattern localizes schema knowledge — only `adapters/task-node.ts` knows what `TaskNode.dependsOn` means.

**Trade-offs:**
- (+) Adding entity types requires only a new adapter file + test
- (+) Schema changes in iDumb affect exactly one adapter
- (+) Each adapter is <100 LOC — easy to review
- (-) Some redundancy in edge extraction across adapters (mitigated by shared helpers in `linker.ts`)

### Pattern 3: Separated Zustand Stores

**What:** Three Zustand stores instead of one monolithic store. `graph-store` holds the data model. `ui-store` holds interaction state. `filter-store` holds filter configuration.

**When to use:** When different parts of state change at different frequencies. Graph data changes once per load. Filters change on user action. Selection/hover changes on every mouse move. Separating prevents a hover event from triggering a re-render of the filter panel.

**Trade-offs:**
- (+) Fine-grained subscriptions — components only re-render for state they actually read
- (+) `graph-store` selectors can compute derived data (adjacency, metrics) without UI churn
- (+) Stores are independently testable
- (-) Cross-store coordination requires manual wiring (e.g., `useFilteredGraph` reads from two stores)
- (-) Three stores means three mental models (mitigated by clear naming)

### Pattern 4: Canvas Paint Functions (not React Nodes)

**What:** Node and edge rendering uses `nodeCanvasObject` / `linkCanvasObject` callbacks from `react-force-graph-2d`. These are plain functions that receive a `CanvasRenderingContext2D` and paint directly — no JSX, no React reconciliation per node.

**When to use:** Any graph above ~100 nodes where DOM-based rendering (SVG/HTML per node) becomes a bottleneck. Canvas paint functions run in the browser's paint loop, not React's reconciliation loop.

**Trade-offs:**
- (+) O(1) React components regardless of node count (the Canvas is a single `<canvas>` element)
- (+) 60fps at 1000 nodes — Canvas paint is GPU-accelerated
- (+) Paint functions are pure: `(node, ctx, globalScale) => void` — testable with canvas mocks
- (-) No CSS styling per node — all visual logic lives in paint functions
- (-) Hit detection requires manual coordinate math (react-force-graph handles this internally)
- (-) Accessibility is harder — Canvas has no DOM tree for screen readers (add ARIA labels to panel)

---

## Data Flow

### Load Flow (App Mount)

```
  User opens app
       │
       ▼
  useGraphData() hook fires on mount
       │
       ▼
  pipeline.ts orchestrates:
       │
       ├──→ loader.ts reads 7 JSON files from path
       │        plans.json → { workPlans: WorkPlan[] }
       │        tasks.json → { delegations: DelegationRecord[] }
       │        knowledge.json → { entries: BrainEntry[], knowledge: CoherentKnowledgeEntry[] }
       │        wiki.json → { entries: WikiEntry[] }
       │        registry.json → { artifacts: PlanningArtifact[], chains: ArtifactChain[] }
       │        anchors.json → { anchors: Anchor[] }
       │        plan.json → { phases: PlanPhase[] }
       │
       ├──→ Each entity array → corresponding adapter
       │        WorkPlan[] → work-plan adapter → GraphNode[] + contains edges
       │        TaskNode[] (nested) → task-node adapter → GraphNode[] + dependsOn/delegatedTo edges
       │        ... (12 more adapters)
       │
       ├──→ linker.ts:
       │        Collect all nodes into Map<id, GraphNode>
       │        Collect all edges, validate both endpoints exist
       │        Drop edges with dangling references (warn, don't crash)
       │        Build adjacency index: Map<nodeId, Set<neighborId>>
       │
       └──→ graph-store.setState({ nodes, edges, adjacency, metadata })
```

### Interaction Flow (Click/Select)

```
  User clicks node in Canvas
       │
       ▼
  GraphCanvas.tsx onNodeClick handler
       │
       ├──→ ui-store.setSelectedNode(nodeId)
       │
       └──→ Components re-render:
              DetailPanel subscribes to ui-store.selectedNodeId
                   → reads full node from graph-store
                   → reads neighbors from adjacency index
                   → displays entity properties + linked nodes

              GraphCanvas subscribes to ui-store.selectedNodeId
                   → highlights selected node + N-hop neighborhood
                   → dims non-connected nodes
```

### Filter Flow

```
  User toggles entity type filter (e.g., hides Checkpoints)
       │
       ▼
  FilterPanel.tsx → filter-store.toggleEntityType("Checkpoint")
       │
       ▼
  useFilteredGraph() hook recomputes:
       │
       ├── Reads graph-store.nodes (all nodes)
       ├── Reads filter-store.activeFilters
       ├── Applies: node.entityType IN activeFilters
       │   AND node.timestamp IN timeRange
       │   AND (searchQuery === "" OR node.label INCLUDES searchQuery)
       │
       └── Returns { visibleNodes, visibleEdges }
              │
              ▼
       GraphCanvas receives new graphData prop → re-renders
```

### State Management Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Zustand Stores                        │
│                                                         │
│  ┌─────────────────┐  ┌───────────────┐  ┌───────────┐ │
│  │  graph-store     │  │  filter-store  │  │  ui-store  │ │
│  │                  │  │                │  │            │ │
│  │  nodes: Map      │  │  entityTypes:  │  │  selected: │ │
│  │  edges: Map      │  │    Set<string> │  │    string  │ │
│  │  adjacency: Map  │  │  searchQuery:  │  │  hovered:  │ │
│  │  metadata: {}    │  │    string      │  │    string  │ │
│  │                  │  │  timeRange:    │  │  panelOpen:│ │
│  │  CHANGES: rare   │  │    [from, to]  │  │    boolean │ │
│  │  (load/reload)   │  │  agentFilter:  │  │  viewMode: │ │
│  │                  │  │    string|null  │  │    string  │ │
│  │                  │  │                │  │            │ │
│  │                  │  │  CHANGES:      │  │  CHANGES:  │ │
│  │                  │  │  on user input │  │  on every  │ │
│  │                  │  │               │  │  mouse evt │ │
│  └────────┬─────────┘  └───────┬───────┘  └─────┬──────┘ │
│           │                    │                 │        │
│  ─────────┴────────────────────┴─────────────────┴─────── │
│                    Derived Selectors                      │
│                                                          │
│  useFilteredGraph():                                     │
│    reads graph-store.nodes + filter-store.activeFilters   │
│    → returns { visibleNodes, visibleEdges }               │
│                                                          │
│  useNeighborhood():                                      │
│    reads graph-store.adjacency + ui-store.selectedNodeId  │
│    → returns Set<nodeId> within N hops                   │
└──────────────────────────────────────────────────────────┘
```

### Key Data Flows

1. **Load flow** (mount): JSON files → pipeline → store → initial render. Runs once. ~50ms for 1000 nodes.
2. **Filter flow** (user action): filter-store mutation → `useFilteredGraph` recomputes → GraphCanvas re-renders with subset. React diffing is fast because `react-force-graph` receives new `graphData` prop.
3. **Selection flow** (click/hover): ui-store mutation → DetailPanel shows entity → GraphCanvas highlights neighborhood. No graph-store mutation — purely visual state.
4. **Reload flow** (file watcher or manual): pipeline re-runs → graph-store replaced → all derived selectors recompute → full re-render. Acceptable at this scale.

---

## Anti-Patterns

### Anti-Pattern 1: Monolithic Graph Component

**What people do:** Put JSON loading, state management, force simulation config, Canvas rendering, event handling, and panel rendering into a single `<GraphVisualization>` component of 800+ LOC.

**Why it's wrong:** Violates single responsibility. Any change to data loading requires re-testing rendering logic. Force simulation config is buried in JSX. Canvas paint functions can't be unit tested.

**Do this instead:** Split into layers: `pipeline.ts` (data), `graph-store.ts` (state), `GraphCanvas.tsx` (rendering), `node-paint.ts` (visual logic). Each is independently testable and replaceable.

### Anti-Pattern 2: Over-Engineering for Scale

**What people do:** Bring in WebGL (Reagraph/Sigma.js), Web Workers for layout computation, virtual scrolling for node lists, or a graph database (Neo4j/ArangoDB) for a tool that will never exceed 1000 nodes.

**Why it's wrong:** At ~1000 nodes, HTML5 Canvas with `d3-force` runs at 60fps without optimization. The engineering complexity of WebGL shaders, Worker message passing, or database connections far exceeds the performance gain. WebGL is warranted at 10K+ nodes; graph databases at 100K+ nodes.

**Do this instead:** Use `react-force-graph-2d` (Canvas-based, d3-force under the hood). If performance becomes a problem later (it won't at 1000 nodes), migration to `react-force-graph-3d` (ThreeJS/WebGL) shares the same API surface.

### Anti-Pattern 3: Duplicating iDumb Type Definitions

**What people do:** Copy-paste entity interfaces from `src/schemas/*.ts` into the visualization project, creating a fork that drifts.

**Why it's wrong:** Schema evolution in iDumb (new field on `TaskNode`, renamed property on `BrainEntry`) silently breaks the visualizer. Two sources of truth = guaranteed drift.

**Do this instead:** Mirror the interfaces with explicit version tagging. The `entities.ts` in the visualizer should comment which iDumb schema version it mirrors. When schemas change, update the mirror. Long-term: publish iDumb types as a shared package.

### Anti-Pattern 4: Eager Full-Graph Edge Resolution

**What people do:** Try to resolve ALL cross-references at load time and crash or error when a referenced ID doesn't exist (dangling reference).

**Why it's wrong:** Real governance data has dangling references — a `taskId` in a `WikiEntry` might reference a task that was purged. A `relatedTo` in a `BrainEntry` might point to an anchor that was cleaned up. Crashing on missing refs makes the tool unusable with real data.

**Do this instead:** Use lenient linking. The linker should: (1) attempt to resolve each reference, (2) if the target doesn't exist, skip the edge and add it to a `danglingRefs` report, (3) expose the report in the UI so users can see data integrity issues. This is a visualization tool, not a validator.

### Anti-Pattern 5: SVG-per-Node Rendering

**What people do:** Use D3's traditional SVG approach where each node is a `<circle>` or `<g>` element in the DOM, and each edge is a `<line>` or `<path>`.

**Why it's wrong:** At 500+ nodes, SVG rendering hits DOM limits. Each node/edge is a separate DOM element. Browser layout/paint cycles scale linearly with element count. Drag interactions cause layout thrashing.

**Do this instead:** Use Canvas rendering via `react-force-graph-2d`'s `nodeCanvasObject` callback. The entire graph is a single `<canvas>` element. Paint functions draw directly on the 2D context. D3-force handles physics; Canvas handles pixels.

---

## Integration Points

### Internal Boundaries

```
┌─────────────────────────────────────────────────────┐
│  BOUNDARY 1: File System → Data Pipeline            │
│                                                     │
│  Contract: loader.ts expects specific JSON shapes   │
│  from 7 files. If a file is missing, loader returns │
│  empty array (graceful degradation, not crash).     │
│  If a file has unexpected shape, log warning and    │
│  skip (don't throw).                                │
│                                                     │
│  Direction: One-way. Visualizer READS JSON only.    │
│  Never writes back.                                 │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  BOUNDARY 2: Data Pipeline → Zustand Store          │
│                                                     │
│  Contract: pipeline.ts produces a complete           │
│  GraphModel: { nodes: Map<id, GraphNode>,           │
│  edges: Map<id, GraphEdge>, adjacency: Map,         │
│  danglingRefs: DanglingRef[], metadata: {} }         │
│                                                     │
│  Direction: Pipeline → Store (one-way hydration).   │
│  Store never calls back into pipeline except on     │
│  explicit reload.                                   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  BOUNDARY 3: Zustand Store → React Components       │
│                                                     │
│  Contract: Components subscribe to stores via       │
│  selectors. Never mutate store state directly —     │
│  always through store actions.                      │
│                                                     │
│  Direction: Store → Components (reactive).          │
│  Components → Store (via actions only).             │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  BOUNDARY 4: React Components → Canvas Paint        │
│                                                     │
│  Contract: GraphCanvas.tsx passes paint functions   │
│  to react-force-graph-2d. Paint functions receive   │
│  (node, ctx, globalScale) and draw directly.        │
│  No React state inside paint functions.             │
│                                                     │
│  Direction: Component configures → Library renders. │
└─────────────────────────────────────────────────────┘
```

### External Integration: iDumb v2

| Integration | Method | Notes |
|-------------|--------|-------|
| Schema types | Manual mirror in `types/entities.ts` | Version-tagged. Update when iDumb schemas change. |
| Data files | Read from configurable path (default: `.idumb/brain/`) | User provides path at startup. No hardcoded paths. |
| File watching (future) | `fs.watch` or Vite HMR on JSON files | Re-run pipeline on change. Not needed for prototype. |
| Dashboard overlap | None initially | The existing dashboard (`src/dashboard/`) uses Express+WebSocket. The KG tool is a separate SPA. Future integration possible via shared component library. |

---

## Build Order (Dependencies Between Components)

The build order defines which components can be implemented and tested independently, and which require prior components.

```
Phase 1: Foundation (no React, no browser)
─────────────────────────────────────────
  1a. types/          ← Zero dependencies. Define GraphNode, GraphEdge, etc.
  1b. data/loader.ts  ← Depends on types. Reads JSON, returns typed arrays.
  1c. data/adapters/  ← Depends on types. One adapter per entity type.
  1d. data/linker.ts  ← Depends on types. Resolves cross-references.
  1e. data/pipeline.ts ← Orchestrates 1b-1d. Pure function: path → GraphModel.
  1f. engine/         ← Depends on types. Adjacency, traversal, metrics.

  TEST GATE: Pipeline produces correct GraphModel from sample JSON.
  All tests run with node:test, no browser needed.

Phase 2: State Layer (Zustand, still no DOM)
─────────────────────────────────────────────
  2a. store/graph-store.ts   ← Depends on types + pipeline output shape.
  2b. store/filter-store.ts  ← Depends on types (filter config types).
  2c. store/ui-store.ts      ← Depends on types (selection types).

  TEST GATE: Stores accept GraphModel, selectors return correct subsets.

Phase 3: Visualization Core (React + Canvas)
──────────────────────────────────────────────
  3a. utils/          ← Colors, shapes, formatters. Pure functions.
  3b. components/graph/node-paint.ts ← Depends on types + utils.
  3c. components/graph/edge-paint.ts ← Depends on types + utils.
  3d. components/graph/GraphCanvas.tsx ← Depends on stores + paint functions.
  3e. hooks/useGraphData.ts ← Depends on pipeline + graph-store.
  3f. hooks/useFilteredGraph.ts ← Depends on graph-store + filter-store.

  TEST GATE: GraphCanvas renders sample data. Click events update ui-store.

Phase 4: UI Shell (React components)
──────────────────────────────────────
  4a. components/panels/DetailPanel.tsx  ← Depends on ui-store + graph-store.
  4b. components/panels/FilterPanel.tsx  ← Depends on filter-store.
  4c. components/panels/StatsPanel.tsx   ← Depends on graph-store + engine.
  4d. components/layout/AppLayout.tsx    ← Depends on all panels + GraphCanvas.
  4e. components/layout/Toolbar.tsx      ← Depends on ui-store (view mode).

  TEST GATE: Full app renders. Filters work. Selection shows detail.

Phase 5: Alternative Views (stretch)
──────────────────────────────────────
  5a. components/views/TreeView.tsx   ← Depends on graph-store (containment).
  5b. components/views/ChainView.tsx  ← Depends on graph-store (chain data).
```

### Build Order Implications for Roadmap

1. **Phases 1-2 can be built and tested without any browser or React.** This means the data pipeline and state management can be developed, tested, and validated purely with `vitest` + `node`. This is the safest foundation to build first.
2. **Phase 3 is the integration risk.** This is where `react-force-graph-2d` meets real data. Budget extra time here for force simulation tuning (charge strength, link distance, centering forces) to make the graph readable.
3. **Phase 4 is UI polish.** Once the graph renders and interactions work, panels are straightforward React components. This is where the tool becomes usable.
4. **Phase 5 is optional for the prototype.** Tree and chain views add value but are not required to prove the core thesis (governance traceability through graph visualization).

---

## Technology Decisions (Architecture-Level)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Graph renderer | `react-force-graph-2d` (Canvas) | ~1000 nodes fits comfortably in Canvas. Same API as 3D variant if upgrade needed. d3-force physics built in. |
| State management | Zustand (3 stores) | Centralized store fits interconnected graph data. Minimal boilerplate. Selector-based subscriptions prevent over-rendering. |
| Build tool | Vite | Fast HMR for React development. Native ESM. Works with TypeScript out of the box. |
| Data format | Raw JSON (read-only) | The visualizer is a consumer of iDumb's existing JSON files. No database, no API server, no transformation layer needed. |
| Testing | Vitest | Shared config with Vite. Runs data pipeline tests without jsdom. Component tests with jsdom when needed. |

---

## Key Type Definitions (Reference)

```typescript
// types/graph.ts — the uniform representation

interface GraphNode {
  id: string                    // Original entity ID
  entityType: EntityType        // "WorkPlan" | "TaskNode" | "BrainEntry" | ...
  label: string                 // Display label (derived from entity name/title)
  category: NodeCategory        // "governance" | "knowledge" | "planning" | "context"
  status?: string               // Entity-specific status (for color coding)
  metadata: Record<string, unknown>  // Full original entity (for detail panel)
  // Layout hints (optional, for initial positioning)
  x?: number
  y?: number
}

interface GraphEdge {
  id: string                    // Synthetic: `${sourceId}-${edgeType}-${targetId}`
  source: string                // Source node ID
  target: string                // Target node ID
  edgeType: EdgeType            // "contains" | "dependsOn" | "delegatedTo" | ...
  label?: string                // Optional edge label
  metadata?: Record<string, unknown>
}

interface GraphModel {
  nodes: Map<string, GraphNode>
  edges: Map<string, GraphEdge>
  adjacency: Map<string, Set<string>>  // nodeId → Set of connected nodeIds
  danglingRefs: DanglingRef[]          // Unresolvable cross-references
  metadata: {
    loadedAt: number
    sourcePath: string
    entityCounts: Record<EntityType, number>
    edgeCounts: Record<EdgeType, number>
  }
}

type EntityType =
  | "WorkPlan" | "TaskNode" | "Checkpoint"
  | "BrainEntry" | "Anchor"
  | "DelegationRecord" | "CoherentKnowledgeEntry" | "WikiEntry"
  | "PlanningArtifact" | "ArtifactSection" | "ArtifactChain"
  | "PlanPhase"

type EdgeType =
  | "contains" | "dependsOn" | "delegatedTo"
  | "producedBy" | "linkedTo" | "supersedes"
  | "chainParent" | "temporalGate"

type NodeCategory = "governance" | "knowledge" | "planning" | "context"
```

---

## Sources

- **iDumb v2 schemas** — `src/schemas/work-plan.ts`, `task-graph.ts`, `brain.ts`, `anchor.ts`, `coherent-knowledge.ts`, `wiki.ts`, `delegation.ts`, `planning-registry.ts`, `plan-state.ts` (direct codebase analysis)
- **react-force-graph** — https://github.com/vasturiano/react-force-graph (Canvas/WebGL graph rendering for React, d3-force integration)
- **Reagraph** — https://reagraph.dev (WebGL graph visualization for React, considered but rejected for over-engineering at this scale)
- **Zustand** — https://zustand.docs.pmnd.rs (Centralized store with selectors, chosen over Jotai for graph data shape)
- **State Management Comparison 2025** — https://www.reactlibraries.com/blog/zustand-vs-jotai-vs-valtio-performance-guide-2025 (Zustand vs Jotai vs Valtio architectural trade-offs)
- **Graph Visualization with react-force-graph** — https://lyonwj.com/blog/graph-visualization-with-graphql-react-force-graph (Architecture patterns for graph data pipeline + React integration)
- **Pipeline Pattern** — https://dev.to/wallacefreitas/the-pipeline-pattern-streamlining-data-processing-in-software-architecture-44hn (ETL pipeline architecture for TypeScript)

---

*Architecture research for: Coherent Knowledge Graph — AI Agent Governance Traceability*
*Researched: 2026-02-09*
