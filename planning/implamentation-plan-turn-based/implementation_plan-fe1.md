# iDumb Dashboard — Interactive Governance UI

**Status:** IMPLEMENTATION IN PROGRESS | **Date:** 2026-02-07 | **Last Updated:** 2026-02-07 (Gap Analysis)
**Prerequisites:** iDumb v2 Phase n4-α complete (entity-resolver, chain-validator, idumb_read)

---

## Executive Summary

**Completed:**
- ✅ Phase 1: Backend Foundation (CLI, Express, WebSocket, API routes)
- ✅ Phase 2: Frontend Layout + Task Panel (DashboardLayout, TaskHierarchyPanel)
- ✅ Phase 3: Planning Artifacts + Comments (Viewer, Comments API, Inline Editor with backup)

**Critical Gaps Identified:**
- ❌ Typo: `implamentation-plan-turn-based` → `implementation-plan-turn-based` (server.ts:92)
- ❌ Comment types duplicated: `ArtifactComment` (types.ts) vs `CommentEntry` (comments-types.ts)
- ❌ Backend doesn't import shared types - uses inline interfaces
- ❌ Console logging violates TUI safety (use file logging instead)
- ❌ WebSocket messages use `data: unknown` - need strict typing
- ❌ Missing standard error response format
- ❌ Frontend switched to plain CSS (not Tailwind as planned)

**Next Steps:**
1. Fix critical gaps (typo, type consolidation, TUI-safe logging)
2. Complete Phase 4: Enhanced Brain/Delegation/Drift panels
3. Complete Phase 5: Git integration (simple-git wrapper, commit/diff APIs)
4. Complete Phase 6: Polish (dark mode, responsive, error boundaries)

---

## Overview

Build a local web-based dashboard that provides real-time visualization and interaction with iDumb governance state. The dashboard reads from `.idumb/brain/` JSON files and provides:

1. **Task Hierarchy Panel** — Epic/Task/Subtask tree with categories, status, assignees
2. **Planning Artifacts Panel** — Interactive markdown viewing + commenting + inline editing
3. **Brain/Knowledge Panel** — Knowledge entries with confidence, relationships, staleness
4. **Delegation Chain Panel** — Agent delegation flow visualization
5. **Drift/Scan Panel** — Project scan results, drift detection
6. **Code Map Panel** — File tree with function/class counts
7. **Dependency Graph** — Visual representation of entity relationships
8. **Git Integration** — Commits, diffs tied to task evidence

**Key Design Decisions:**
- **Dev server plugin**: Runs via `idumb dashboard` command
- **Hybrid editing**: Comments + inline edit toggle for artifacts (md, json, yaml, xml) — NOT replacing code editor for .ts/.js
- **Both data sources**: iDUMB governance data + git integration for detailed diffs
- **Plain CSS (changed)**: Using plain CSS with CSS variables instead of Tailwind (developer preference)

---

## Critical Gaps to Fix

### 1. Type System Inconsistencies (HIGH PRIORITY)

**Problem:** Comment types are duplicated between two files with different schemas.

| Location | Type | Fields |
|----------|------|--------|
| `shared/types.ts` | `ArtifactComment` | `id, artifactPath, line?, author, content, timestamp, resolved` |
| `shared/comments-types.ts` | `CommentEntry` | `id, artifactPath, line?, author, authorType, content, timestamp, resolved, resolvedBy?, resolvedAt?, replies[]` |

**Fix Required:**
- Consolidate into single `CommentEntry` type in `shared/types.ts`
- Remove `shared/comments-types.ts` (redundant)
- Update frontend components to use unified type
- Update backend to import and use shared type

### 2. Backend Type Safety Gap

**Problem:** Backend defines inline interfaces instead of importing shared types.

```typescript
// server.ts - inline interface (BAD)
const newComment = {
  id: randomUUID(),
  artifactPath,
  line: line ? Number(line) : undefined,
  // ...
}
```

**Fix Required:**
- Import shared types in `server.ts`
- Add request/response validation using shared schemas
- Create `ApiResponse<T>` wrapper type for consistent responses

### 3. Directory Name Typo

**File:** `src/dashboard/backend/server.ts:92`
```typescript
// WRONG
const implPlanDir = join(planningDir, "implamentation-plan-turn-based")
// SHOULD BE
const implPlanDir = join(planningDir, "implementation-plan-turn-based")
```

### 4. TUI Safety Violation

**Problem:** Console.log statements pollute OpenCode TUI output.

**Fix Required:**
- Replace `console.log()` with file logging via `lib/logging.ts`
- Backend should write to `.idumb/brain/logs/dashboard.log` instead

### 5. WebSocket Type Safety

**Problem:** `broadcastUpdate()` uses `data: unknown`.

```typescript
// Current
export function broadcastUpdate(type: string, data: unknown)

// Should be
interface WebSocketMessage {
  type: WebSocketEventType
  data: WebSocketMessageData
  timestamp: number
}
```

### 6. Missing Error Response Type

**Problem:** No standard error format across API endpoints.

**Fix Required:**
```typescript
interface ApiError {
  error: string
  code?: string
  details?: unknown
}
```

### 7. Missing API Endpoints for Phase 4

**Required:**
- `GET /api/scan/drift` - Compare current scan vs baseline
- `GET /api/brain/relationships` - For dependency graph
- `GET /api/artifacts/metadata` - Artifact metadata (status, stale, chain integrity)

---

## Gap Fix Priority Order

**Before Phase 4 (Must Fix):**

1. **Fix directory typo** (2 min) - `server.ts:92`
   ```typescript
   "implamentation-plan-turn-based" → "implementation-plan-turn-based"
   ```

2. **Consolidate comment types** (15 min)
   - Merge `ArtifactComment` + `CommentEntry` into single type
   - Delete `shared/comments-types.ts`
   - Update imports across components

3. **Replace console.log** (20 min)
   - Import `log()` from `lib/logging.ts`
   - Replace all `console.log()` with file logging
   - Only error logging goes to stderr

**Before Phase 5 (Should Fix):**

4. **Add shared type imports to backend** (30 min)
   - Import shared types in `server.ts`
   - Add `ApiResponse<T>` wrapper
   - Create standard `ApiError` type

5. **WebSocket type safety** (20 min)
   - Create `WebSocketMessage` union type
   - Type `broadcastUpdate()` properly

**Before Phase 6 (Nice to Have):**

6. **Add missing Phase 4 endpoints** (45 min)
   - `GET /api/scan/drift`
   - `GET /api/brain/relationships`
   - `GET /api/artifacts/metadata`

---

## Architecture

```
iDumb Dashboard Architecture
├── Backend (Node/Express)
│   ├── Dev server spawned by `idumb dashboard` CLI
│   ├── File watcher service — watches .idumb/brain/*.json
│   ├── Git service — uses simple-git for commit/diff data
│   ├── API routes — /api/tasks, /api/brain, /api/delegations, /api/artifacts
│   └── WebSocket — real-time updates when JSON files change
│
├── Frontend (Vite + React 19 + Plain CSS)
│   ├── Dashboard layout — collapsible panels, resizable
│   ├── Task tree component — 3-level hierarchy with expand/collapse
│   ├── Artifact viewer — markdown render with inline edit toggle
│   ├── Comments system — per-line and per-artifact comments
│   ├── Brain knowledge graph — force-directed D3 graph
│   └── Delegation flow — directed graph of agent handoffs
│
└── Integration Points
    ├── Reads from .idumb/brain/*.json (tasks.json, knowledge.json, delegations.json, etc.)
    ├── Reads planning artifacts from planning/ directory
    ├── Git integration via simple-git for commits/diffs
    └── Writes comments to .idumb/brain/comments.json (new file)
```

---

## File Structure

```
src/dashboard/
├── backend/
│   ├── server.ts              # Express server entry point
│   ├── routes/
│   │   ├── tasks.ts           # GET /api/tasks, /api/tasks/:id
│   │   ├── brain.ts           # GET /api/brain, /api/brain/query
│   │   ├── delegations.ts     # GET /api/delegations
│   │   ├── artifacts.ts       # GET/POST /api/artifacts, /api/artifacts/:path/comments
│   │   ├── git.ts             # GET /api/git/commits, /api/git/diff
│   │   └── scan.ts            # GET /api/scan, /api/scan/drift
│   ├── services/
│   │   ├── file-watcher.ts    # Watch .idumb/brain/*.json for changes
│   │   ├── git-service.ts     # Wrap simple-git for commit/diff data
│   │   ├── artifact-parser.ts # Parse planning artifacts with metadata
│   │   └── comment-store.ts   # Read/write .idumb/brain/comments.json
│   └── websocket/
│       └── events.ts          # Broadcast JSON file changes to clients
│
├── frontend/
│   ├── main.tsx               # Vite entry
│   ├── App.tsx                # Root component with layout
│   ├── pages/
│   │   ├── Dashboard.tsx      # Main dashboard with all panels
│   │   └── ArtifactView.tsx   # Single artifact view with comments
│   ├── components/
│   │   ├── layout/
│   │   │   ├── DashboardLayout.tsx  # Resizable panel layout
│   │   │   └── Panel.tsx            # Collapsible panel component
│   │   ├── panels/
│   │   │   ├── TaskHierarchyPanel.tsx    # Epic/Task/Subtask tree
│   │   │   ├── PlanningArtifactsPanel.tsx # Artifact list + viewer
│   │   │   ├── BrainKnowledgePanel.tsx   # Knowledge entries
│   │   │   ├── DelegationChainPanel.tsx   # Delegation flow viz
│   │   │   ├── DriftScanPanel.tsx        # Scan results
│   │   │   ├── CodeMapPanel.tsx          # Code structure tree
│   │   │   └── DependencyGraph.tsx       # D3 force graph
│   │   ├── artifacts/
│   │   │   ├── ArtifactViewer.tsx        # Markdown render + inline edit
│   │   │   ├── ArtifactComments.tsx      # Per-line comments sidebar
│   │   │   ├── InlineEditor.tsx          # Textarea for md/json/yaml/xml
│   │   │   └── ArtifactMetadata.tsx      # Status, stale, chain integrity
│   │   └── ui/
│   │       └── ...shadcn components...
│   ├── hooks/
│   │   ├── useGovernanceState.ts  # Query React Query for state
│   │   ├── useFileWatcher.ts      # WebSocket for live updates
│   │   └── useComments.ts         # Comment CRUD
│   ├── lib/
│   │   ├── api.ts                # Axios/fetch client for backend API
│   │   └── websocket.ts          # WebSocket connection
│   └── styles/
│       └── globals.css           # Plain CSS with CSS variables (no Tailwind)
│
└── shared/
    └── types.ts                  # Shared TypeScript types
```

---

## Phase 1: Backend Foundation ✅ COMPLETE

### Status
- ✅ Dashboard CLI command: `src/cli/dashboard.ts`
- ✅ Express server: `src/dashboard/backend/server.ts` (port 3001)
- ✅ File watcher: Chokidar watching `.idumb/brain/*.json` and `planning/**/*.md`
- ✅ WebSocket: Broadcasting file changes, comments, artifact saves
- ✅ API Routes: `/api/tasks`, `/api/brain`, `/api/delegations`, `/api/artifacts`, `/api/comments`
- ✅ Vite + React: Frontend scaffold complete
- ✅ Plain CSS: Using CSS variables (not Tailwind - changed)

**Gap:** Need to fix typo "implamentation-plan-turn-based" in server.ts:92

**Gap:** Replace console.log with TUI-safe file logging

---

## Phase 2: Frontend Layout + Task Panel ✅ COMPLETE

### Status
- ✅ Dashboard layout: `DashboardLayout.tsx` - collapsible panels
- ✅ Task hierarchy: `TaskHierarchyPanel.tsx` - Epic→Task→Subtask tree
- ✅ Status indicators: Icons for statuses, category colors
- ✅ Expand/collapse: Full tree navigation
- ✅ React Query: Data fetching with 2s polling
- ✅ WebSocket integration: Real-time updates on file changes

---

## Phase 3: Planning Artifacts + Comments ✅ COMPLETE

### Status
- ✅ Artifact list: `PlanningArtifactsPanel.tsx` - lists planning/ artifacts
- ✅ Markdown viewer: `ArtifactViewer.tsx` - react-markdown + rehype-highlight
- ✅ Artifact metadata: `ArtifactMetadata.tsx` - status, stale, chain integrity
- ✅ Comments schema: `shared/types.ts` + `shared/comments-types.ts` (NEEDS CONSOLIDATION)
- ✅ Comments API: GET/POST/PUT/DELETE `/api/comments`
- ✅ Comments sidebar: `ArtifactComments.tsx` - per-artifact comments
- ✅ Inline editor: `InlineEditor.tsx` - textarea for md/json/yaml/xml
- ✅ Edit validation: File extension check on backend
- ✅ Save with backup: Backups to `.idumb/backups/` before save

**Gap:** Consolidate duplicate comment types

**Gap:** Add per-line comments (line click → add comment)

---

## Phase 4: Brain + Delegation + Drift Panels (IN PROGRESS)

### Current State
- ✅ BrainKnowledgePanel.tsx exists - shows entries with confidence bars
- ✅ DelegationChainPanel.tsx exists - shows active/pending delegations
- ⚠️ Panels are basic - need enhancements (relationships, staleness, flow viz)
- ❌ DriftScanPanel.tsx - NOT IMPLEMENTED
- ❌ CodeMapPanel.tsx - NOT IMPLEMENTED
- ⚠️ Backend scan API exists but basic - needs drift detection

### Remaining Tasks

| # | Task | Files | Details |
|---|------|-------|---------|
| 4.1 | Enhance Brain panel | `BrainKnowledgePanel.tsx` | Add staleness indicator, related entries display |
| 4.2 | Brain entry types filter | `BrainKnowledgePanel.tsx` | Filter by BrainEntryType (architecture, decision, pattern, etc.) |
| 4.3 | Knowledge entry detail view | `BrainKnowledgePanel.tsx` | Show evidence[], parent/child relationships, relatedTo[] |
| 4.4 | Delegation flow viz | `DelegationChainPanel.tsx` | Add simple directed graph (SVG) showing agent→agent flow |
| 4.5 | Drift detection API | `server.ts` | GET `/api/scan/drift` - compare current vs baseline scan |
| 4.6 | Drift panel | `DriftScanPanel.tsx` | Show new/deleted/modified files with color coding |
| 4.7 | Code map panel | `CodeMapPanel.tsx` | File tree with function/class counts from codemap.json |
| 4.8 | Backend type imports | `server.ts` | Import shared types instead of inline interfaces |

**Success:** All governance panels enhanced with live data, staleness indicators, relationship visualization.

---

## Phase 5: Dependency Graph + Git Integration (PENDING)

### Tasks

| # | Task | Files | Details |
|---|------|-------|---------|
| 5.1 | Install D3 | `package.json` | Add `d3` and `@types/d3` dependencies |
| 5.2 | Dependency graph component | `DependencyGraph.tsx` | Force-directed graph using D3 |
| 5.3 | Graph nodes | `DependencyGraph.tsx` | Nodes: tasks, artifacts, brain entries, delegations |
| 5.4 | Graph edges | `DependencyGraph.tsx` | Edges: parent/child, relatedTo, delegations |
| 5.5 | Relationships API | `server.ts` | GET `/api/brain/relationships` - return graph data |
| 5.6 | Install simple-git | `package.json` | Add `simple-git` dependency |
| 5.7 | Git service backend | `server.ts` | Wrap simple-git for log, diff, show commands |
| 5.8 | Git commits API | `server.ts` | GET `/api/git/commits?limit=20` |
| 5.9 | Git diff API | `server.ts` | GET `/api/git/diff?commit=hash` or `?path=file` |
| 5.10 | Commits timeline | `GitCommitsPanel.tsx` | Show commits with links to tasks |
| 5.11 | Diff viewer | `DiffViewer.tsx` | Side-by-side or unified diff view |
| 5.12 | Task→Commit linking | `TaskHierarchyPanel.tsx` | Show commits for selected task |

**Success:** Dependency graph visualizes entity relationships. Git commits visible with diffs, linked to tasks.

---

## Phase 6: Polish + Integration (PENDING)

### Tasks

| # | Task | Files | Details |
|---|------|-------|---------|
| 6.1 | Dark mode toggle | `App.tsx`, `globals.css` | Add theme switcher button, persist in localStorage |
| 6.2 | Responsive layout | `DashboardLayout.tsx` | Mobile-friendly panel collapse (CSS media queries) |
| 6.3 | Error boundaries | `App.tsx` | React ErrorBoundary for each panel |
| 6.4 | Loading skeletons | All panels | Add skeleton loaders while data fetches |
| 6.5 | Keyboard shortcuts | `App.tsx` | Cmd+K for command palette, Cmd+1-4 for panels |
| 6.6 | Settings panel | `SettingsPanel.tsx` | Theme, refresh interval, panel visibility |
| 6.7 | CLI args complete | `src/cli/dashboard.ts` | `--port`, `--backend-port`, `--open`, `--no-browser` |
| 6.8 | Connection status | `App.tsx` | Show WebSocket connection status indicator |
| 6.9 | Toast notifications | `App.tsx` | Show success/error toasts for save operations |
| 6.10 | End-to-end testing | Manual | Verify all panels work with real `.idumb/brain/` data |

**Success:** Dashboard is production-ready for local development use.

---

## Data Flow

### Reading Data (Read-Only Governance State)

```
.idumb/brain/tasks.json → file-watcher detects change
                     → WebSocket broadcasts update
                     → Frontend React Query invalidates
                     → Panels re-render with new data
```

### Writing Comments

```
User adds comment → POST /api/artifacts/:path/comments
                 → Validate artifact exists
                 → Append to .idumb/brain/comments.json
                 → WebSocket broadcast update
                 → All clients see new comment
```

### Editing Artifacts

```
User toggles edit → Replace viewer with InlineEditor
User saves         → POST /api/artifacts/:path
                 → Validate file type (md/json/yaml/xml only)
                 → Create backup in .idumb/backups/
                 → Write file
                 → WebSocket broadcast
```

### Git Integration

```
User clicks commit → GET /api/git/diff?commit=hash
                 → git-service.ts runs `git show`
                 → Returns unified diff
                 → DiffViewer renders side-by-side
```

---

## Critical Files to Reference

| File | Purpose |
|------|---------|
| [src/schemas/task.ts](src/schemas/task.ts) | TaskStore, Epic/Task/Subtask, WorkStreamCategory |
| [src/schemas/brain.ts](src/schemas/brain.ts) | BrainStore, BrainEntry, confidence decay |
| [src/schemas/delegation.ts](src/schemas/delegation.ts) | DelegationStore, DelegationRecord |
| [src/lib/state-reader.ts](src/lib/state-reader.ts) | readGovernanceState() for API routes |
| [planning/implementation-plan-turn-based/implementation_plan-n4.md](planning/implementation-plan-turn-based/implementation_plan-n4.md) | Entity model reference |
| [planning/implementation-plan-turn-based/implementation_plan-n3.md](planning/implementation-plan-turn-based/implementation_plan-n3.md) | GUI prototype reference |

---

## Verification Plan

### Manual Testing

1. **Task Hierarchy**: Create epic → add tasks → add subtasks → verify tree renders correctly
2. **Live Updates**: Run `idumb_task action=start` in terminal → verify dashboard updates within 2s
3. **Comments**: Add comment to artifact → refresh → verify comment persists
4. **Editing**: Edit planning artifact → verify backup created → verify file updated
5. **Git**: Show commit diff → verify side-by-side diff renders
6. **Staleness**: Create stale task → verify warning icon appears

### Type Safety

- `tsc --noEmit` → 0 errors
- All shared types in `shared/types.ts`

### Build

- `npm run build` → Dashboard frontend builds successfully
- `npm run dev` → Dev server starts, hot-reload works

---

## Dependencies to Add

### Already Installed (Phase 1-3)
```json
{
  "dependencies": {
    "express": "^4.18.x",
    "ws": "^8.x",
    "cors": "^2.8.x",
    "chokidar": "^4.x",
    "open": "^10.x",
    "react": "^18.x",
    "react-dom": "^18.x",
    "@tanstack/react-query": "^5.x",
    "react-markdown": "^9.x",
    "remark-gfm": "^4.x",
    "rehype-highlight": "^7.x",
    "rehype-raw": "^7.x",
    "lucide-react": "^0.344.x"
  },
  "devDependencies": {
    "vite": "^5.x",
    "@vitejs/plugin-react": "^4.x",
    "typescript": "^5.x"
  }
}
```

### Phase 5 Additions
```json
{
  "dependencies": {
    "d3": "^7.x",
    "simple-git": "^3.x"
  },
  "devDependencies": {
    "@types/d3": "^7.x"
  }
}
```

**Note:** Plain CSS used instead of Tailwind CSS (developer preference - CSS variables in `globals.css`)
