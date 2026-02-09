# Stack Research — Knowledge Graph Visualization

**Domain:** Coherent Knowledge Graph — AI Agent Governance Traceability
**Researched:** 2026-02-09
**Confidence:** HIGH
**Method:** All versions verified against npm registry (`npm view <pkg> version`) on 2026-02-09. Library selection validated through Context7 docs, Exa search, Tavily deep search, and npm dependency analysis.

---

## Architecture Decision

**Two-layer architecture: graphology (data) + reagraph (rendering)**

reagraph bundles graphology internally as a dependency. This means a single `npm install reagraph` gives us both the graph data structure engine AND the WebGL rendering layer. We install graphology as a direct dependency too — so we can import it explicitly for our typed graph operations (traversal, metrics, queries) while reagraph uses it under the hood for layout computations.

This eliminates the need for separate graph-engine + renderer + React-binding packages (the sigma.js approach requires 3+ packages). For ~1000 nodes, WebGL via Three.js is performant and reagraph's built-in tree layouts, clustering, and custom node rendering cover all our visualization requirements without additional libraries.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| TypeScript | 5.9.3 | Language | Strict typing for graph schemas. Generic support for `Graph<NodeAttrs, EdgeAttrs>`. Project constraint. | HIGH |
| React | 19.2.4 | UI framework | Project constraint (merge-back compatibility). React 19 gives us `use()`, improved Suspense, and Server Components if needed later. | HIGH |
| Vite | 7.3.1 | Build tool | Sub-second HMR, native ESM, first-class TypeScript support. Vite 7 is current stable. | HIGH |
| @vitejs/plugin-react | 5.1.3 | Vite React plugin | Official React plugin for Vite. Uses SWC for fast transforms. | HIGH |
| Tailwind CSS | 4.1.18 | Styling | Utility-first CSS. v4 uses CSS-native `@theme` directive — no config file needed. Faster than v3. | HIGH |
| @tailwindcss/vite | 4.1.18 | Vite integration | Official Tailwind v4 Vite plugin. Replaces PostCSS setup from v3. | HIGH |

### Graph Engine + Visualization (The Core Decision)

| Library | Version | Purpose | Why Recommended | Confidence |
|---------|---------|---------|-----------------|------------|
| **reagraph** | 4.30.8 | Graph visualization | WebGL React component. Built-in: force-directed, tree (Td/Lr), radial, hierarchical, ForceAtlas2, circular, concentric layouts. Clustering via `clusterAttribute`. Custom node rendering via `renderNode`. Light/dark themes. Selection, lasso, path-finding, drag, zoom/pan. **Bundles graphology internally.** | HIGH |
| **graphology** | 0.26.0 | Graph data structure | Typed multi-graph: `Graph<NodeAttributes, EdgeAttributes>`. Traversal (BFS/DFS), metrics (centrality, degree), shortest-path. Used internally by reagraph — installing directly lets us build/query our typed knowledge graph independently of rendering. | HIGH |
| graphology-types | 0.24.8 | TypeScript types | Full type definitions for graphology. Required for generic `Graph<N, E>` typing. | HIGH |
| graphology-traversal | 0.3.1 | Graph traversal | BFS/DFS traversal algorithms. Essential for chain-walking (plan chains, delegation chains, task dependency graphs). | HIGH |

### State Management & Data Fetching

| Library | Version | Purpose | Why Recommended | Confidence |
|---------|---------|---------|-----------------|------------|
| zustand | 5.0.11 | State management | Minimal, TypeScript-first store. Perfect for graph view state (selected node, active filters, layout mode, view mode). No boilerplate. v5 is current stable. | HIGH |
| @tanstack/react-query | 5.90.20 | Data fetching/caching | Polls `.idumb/brain/*.json` files via fetch. Built-in `refetchInterval` for file watching. Stale-while-revalidate. Automatic cache invalidation. | HIGH |

### UI Chrome

| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| lucide-react | 0.563.0 | Icons | Entity type icons, toolbar icons, status indicators. Tree-shakeable, consistent style. | HIGH |
| react-resizable-panels | 4.6.2 | Split panes | Graph canvas + detail panel + entity list. Drag-to-resize layout. | HIGH |
| cmdk | 1.1.1 | Command palette | Entity search, filter commands, navigation. `Cmd+K` pattern. Composable, unstyled. | HIGH |
| class-variance-authority | 0.7.1 | Component variants | Type-safe component variant definitions (button sizes, node badge colors). | MEDIUM |
| clsx | 2.1.1 | Class merging | Conditional className construction. Pairs with tailwind-merge. | HIGH |
| tailwind-merge | 3.4.0 | Tailwind conflict resolution | Prevents Tailwind class conflicts in component composition. | HIGH |
| tw-animate-css | 1.4.0 | Animations | shadcn/ui animation classes for Tailwind v4. Replaces tailwindcss-animate. | HIGH |

### Validation

| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| zod | 4.3.6 | Schema validation | Runtime validation of JSON files loaded from `.idumb/brain/`. Ensures graph data integrity before ingestion. Zod 4 is 15x faster than v3. | HIGH |

### Development Tools

| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| vitest | 4.0.18 | Unit/integration testing | Vite-native test runner. Same transform pipeline as dev server. | 
| @testing-library/react | 16.3.2 | Component testing | DOM-centric testing for UI components (panels, filters, search). |
| happy-dom | 20.5.3 | Test DOM environment | Faster than jsdom. Used as vitest environment for React component tests. |
| @types/react | 19.2.13 | React type definitions | TypeScript definitions for React 19. |
| typescript | 5.9.3 | Type checker | `tsc --noEmit` for CI. Strict mode. |

---

## Installation

```bash
# Core platform
npm install react react-dom typescript

# Graph engine + visualization (THE critical dependency)
npm install reagraph graphology graphology-types graphology-traversal

# State management + data fetching
npm install zustand @tanstack/react-query

# UI chrome
npm install tailwindcss @tailwindcss/vite tw-animate-css
npm install lucide-react react-resizable-panels cmdk
npm install class-variance-authority clsx tailwind-merge

# Validation
npm install zod

# Dev dependencies
npm install -D vite @vitejs/plugin-react vitest @testing-library/react happy-dom
npm install -D @types/react @types/react-dom
```

### shadcn/ui Components (via CLI, not npm)

```bash
# Initialize shadcn/ui (after Tailwind v4 is configured)
npx shadcn@latest init

# Install individual components as needed:
npx shadcn@latest add button card badge dialog scroll-area separator
npx shadcn@latest add tooltip popover dropdown-menu tabs
```

> shadcn/ui is NOT an npm dependency — it copies component source files into your project. This gives full control over styling and zero version lock-in. Components use Radix UI primitives internally.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative Instead |
|-------------|-------------|--------------------------------|
| **reagraph** | react-force-graph-2d (1.29.1) | If you need ONLY force-directed layout, want Canvas2D instead of WebGL, or need to render >10k nodes in 2D with simpler styling needs. Lighter dependency tree. |
| **reagraph** | sigma.js (3.0.2) + @react-sigma/core | If you need to render 50k+ nodes. Sigma.js is optimized for massive graphs. But requires 3+ packages, more boilerplate, and no built-in tree layouts. |
| **reagraph** | cytoscape.js + react-cytoscapejs | If you need advanced graph algorithms (community detection, minimum spanning tree) at the rendering layer. Mature ecosystem but heavier, jQuery-era API patterns, no built-in 3D. |
| **reagraph** | @neo4j-nvl/react | If graph data lives in Neo4j. Tightly coupled to Neo4j ecosystem. Not applicable here (we read local JSON). |
| **graphology** | Custom adjacency map | If you want zero dependencies for the data layer. Graphology is 26KB and battle-tested — rolling your own saves nothing. |
| **zustand** | jotai | If you prefer atomic state (bottom-up). Zustand is better for our case: few large stores (graph state, UI state) vs many small atoms. |
| **zustand** | Redux Toolkit | If team already uses Redux. Massive overhead for a single-user local tool. |
| **@tanstack/react-query** | SWR | If you want a simpler API. TanStack Query has better devtools, mutation support, and `refetchInterval` for our file-polling pattern. |
| **zod v4** | zod v3 (3.24.x) | Never. Zod 4 is 15x faster and has better TypeScript inference. Only use v3 if a dependency forces it. |
| **Vite** | Next.js | If you need SSR/SSG. This is a localhost dev tool — SPA is correct. Next.js adds routing/server complexity we don't need. |
| **Vite** | Turbopack | Still experimental outside Next.js. Not standalone-ready for arbitrary React SPAs. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **D3.js directly** | Low-level SVG manipulation. Requires imperative DOM code that fights React's declarative model. Every D3 + React integration is a compromise. | reagraph (uses D3 forces internally but exposes React components) |
| **vis.js / vis-network** | Unmaintained. Last meaningful update was 2021. API is callback-heavy, not React-native. | reagraph |
| **Gephi / desktop tools** | Not embeddable in browser. Different use case (offline analysis vs live dashboard). | reagraph in-browser |
| **Neo4j / graph databases** | Massive overhead for ~1000 nodes read from JSON. We don't need ACID, Cypher, or a database server. Our data fits in memory. | graphology in-memory |
| **three.js directly** | reagraph already abstracts Three.js for graph rendering. Using Three.js directly for graphs means reimplementing layout algorithms, node selection, edge rendering, labels, etc. | reagraph (built on @react-three/fiber + three.js) |
| **react-flow / xyflow** | Designed for flowcharts/node editors with drag-to-connect, not for knowledge graph visualization. No force-directed layouts. No clustering. | reagraph |
| **tailwindcss-animate** | Tailwind v3 animation plugin. Not compatible with Tailwind CSS v4. | tw-animate-css (1.4.0) |
| **styled-components / emotion** | CSS-in-JS adds runtime cost and bundle size. Tailwind v4 is zero-runtime CSS. No reason to mix paradigms. | Tailwind CSS v4 |
| **Redux / MobX** | Overkill state management for a single-user local tool with ~5 state slices. | zustand |
| **express / fastify backend** | This is a read-only JSON consumer. No API server needed. Files are loaded directly via fetch from the filesystem (Vite dev server serves them). | Vite dev server + TanStack Query |

---

## Version Compatibility Matrix

| Package A | Package B | Compatible Versions | Notes |
|-----------|-----------|---------------------|-------|
| reagraph 4.30.x | React 19.x | Yes | reagraph supports React 18+ |
| reagraph 4.30.x | graphology 0.26.x | Bundled internally | reagraph depends on `graphology: ^0.26.0` — same version we install directly |
| reagraph 4.30.x | three 0.180.x | Bundled internally | Transitive via @react-three/fiber |
| Tailwind CSS 4.1.x | @tailwindcss/vite 4.1.x | Must match minor | Both from tailwindlabs, released in lockstep |
| Tailwind CSS 4.1.x | tw-animate-css 1.4.x | Yes | tw-animate-css is the v4-compatible replacement for tailwindcss-animate |
| Vite 7.3.x | @vitejs/plugin-react 5.1.x | Yes | v5 plugin targets Vite 6+/7+ |
| Vite 7.3.x | vitest 4.0.x | Yes | vitest 4 supports Vite 6+/7+ |
| zustand 5.0.x | React 19.x | Yes | zustand 5 supports React 18+ |
| @tanstack/react-query 5.90.x | React 19.x | Yes | TanStack Query 5 supports React 18+ |
| zod 4.3.x | TypeScript 5.9.x | Yes | Zod 4 targets TS 5.0+ |
| cmdk 1.1.x | React 19.x | Yes | Unstyled, minimal React dependency |

---

## Key Architecture Notes

### Why reagraph + graphology (not alternatives)

1. **Single install covers 80% of needs.** `npm install reagraph` gives you: graph data structure (graphology), force-directed + tree + hierarchical + radial + ForceAtlas2 layouts, WebGL rendering, clustering, theming, selection, drag, zoom, pan.

2. **graphology is the data layer AND the rendering layer.** reagraph uses graphology internally for layout computation. We install graphology directly so our code can build, traverse, and query the typed graph independently — then pass `nodes[]` and `edges[]` to `<GraphCanvas>` for rendering.

3. **Custom node rendering per entity type.** reagraph's `renderNode` prop accepts a React component that receives node data. We can render different shapes/colors/icons for each of our 14 entity types (WorkPlan, TaskNode, Anchor, Agent, etc.).

4. **Layout switching is a prop change.** `<GraphCanvas layoutType="forceDirected2d">` → `<GraphCanvas layoutType="treeTd2d">` — no code restructuring needed. Critical for our "force-directed overview" + "tree view for chains" requirement.

5. **Clustering is built-in.** `<GraphCanvas clusterAttribute="entityType">` groups nodes by entity type with visual hulls. No plugin needed.

### Data Flow

```
.idumb/brain/*.json  →  TanStack Query (poll/fetch)  →  Zod validation
     →  graphology Graph<NodeAttrs, EdgeAttrs>  →  zustand store
     →  reagraph <GraphCanvas nodes={} edges={} />  →  Browser
```

### File Serving Strategy

Vite dev server can serve static JSON files from a configured public directory. Point Vite's `server.fs.allow` to the `.idumb/brain/` directory of the target project. TanStack Query polls these files with `refetchInterval: 2000` (2s). No backend server needed.

For production use, a tiny file-watcher (chokidar 5.0.0) could push updates via WebSocket, but polling is sufficient for the prototype.

---

## Package Count Summary

| Category | Count | Packages |
|----------|-------|----------|
| Core platform | 3 | react, react-dom, typescript |
| Graph (critical) | 4 | reagraph, graphology, graphology-types, graphology-traversal |
| State/data | 2 | zustand, @tanstack/react-query |
| UI chrome | 7 | tailwindcss, @tailwindcss/vite, tw-animate-css, lucide-react, react-resizable-panels, cmdk, clsx + tailwind-merge + cva |
| Validation | 1 | zod |
| Dev tools | 5 | vite, @vitejs/plugin-react, vitest, @testing-library/react, happy-dom |
| **Total** | **~22** | Production: ~17, Dev: ~5 |

---

## Sources

- npm registry (`npm view <pkg> version`) — all versions verified 2026-02-09
- reagraph npm dependencies (`npm view reagraph dependencies`) — confirmed graphology 0.26.0 is bundled
- Context7 `/reaviz/reagraph` docs — custom node rendering, tree layouts, clustering, theming examples
- Exa search — reagraph vs react-force-graph vs sigma.js feature comparison
- Tavily advanced search — graphology ecosystem, Tailwind CSS v4 + shadcn/ui compatibility
- npmjs.com — tailwindcss 4.1.18 (published 2026-01-27), react-force-graph 1.48.2

---

*Stack research for: Coherent Knowledge Graph — AI Agent Governance Traceability*
*Researched: 2026-02-09*
*Total packages: ~22 (17 production + 5 dev)*
*Primary decision: reagraph + graphology — single-install graph engine + WebGL renderer with built-in tree/force/cluster layouts*
