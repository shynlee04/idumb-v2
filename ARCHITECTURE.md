# ARCHITECTURE.md — iDumb v2 Internal Architecture

> **Status**: CURRENT as of 2026-02-09
> **Scope**: Source code architecture — `src/` directory only
> **Purpose**: Map reality, not aspirations

---

## Executive Summary

The codebase has **12,192 LOC** across 47 TypeScript files with clear 4-layer separation — except for several structural violations. The biggest problems:

1. **`src/lib/` is a flat junk drawer** — 12 files, 3,581 LOC, no subdirectories, no domain grouping
2. **`persistence.ts` is a 1,082-line god object** — 13 imports, 35+ public methods, 10 data domains
3. **`brain-indexer.ts` is dead code** — 383 LOC imported by nobody
4. **`tools/anchor.ts` violates layer boundary** — imports from `hooks/compaction.ts`
5. **`templates.ts` is 1,466 LOC** — a single file generating all 3 agent markdown profiles
6. **3 schemas are unused at runtime** — `classification.ts`, `wiki.ts`, `coherent-knowledge.ts` (R1 staging)

---

## 1. Layer Architecture

```
Layer 4: index.ts                    Plugin entry — wiring only (175 LOC)
Layer 3: tools/                      OpenCode tool implementations (969 LOC)
Layer 2: hooks/                      Event handlers (504 LOC)
Layer 1: lib/                        Utilities, persistence, detection (3,581 LOC)
Layer 0: schemas/                    Pure data definitions (4,333 LOC)

Standalone: cli.ts, cli/, templates.ts, dashboard/
```

### Layer Rules

| Rule | Expected | Actual |
|------|----------|--------|
| schemas → nothing internal | PASS | task-graph→work-plan→task (intra-layer) |
| lib → schemas only | PASS | All lib files comply |
| hooks → lib + schemas | PASS | compaction, system, message-transform comply |
| tools → lib + schemas | **FAIL** | `tools/anchor.ts` → `hooks/compaction.ts` |
| index.ts → all barrels | PASS | Pure wiring |
| No circular deps | PASS | Zero cycles found |

---

## 2. Current File Map with LOC + Problems

### `src/lib/` — 3,581 LOC (FLAT, NO SUBDIRECTORIES)

| File | LOC | Domain | Problem |
|------|-----|--------|---------|
| `persistence.ts` | **1,082** | Disk I/O, sessions, tasks, graph, delegations, brain, codemap, projectmap, anchors, governance status | **GOD OBJECT** — 13 imports, 35+ methods, 10 data domains. Violates SRP catastrophically. |
| `code-quality.ts` | 719 | Code smell detection, A-F grading | Over 500 LOC limit. Should be `analysis/code-quality.ts`. |
| `framework-detector.ts` | 445 | Brownfield project scanning | Coupled to `code-quality.ts`. Should be `analysis/framework-detector.ts`. |
| `brain-indexer.ts` | **383** | Code/project map population | **DEAD FILE** — exported functions imported by NOBODY. Not in barrel. |
| `sqlite-adapter.ts` | 323 | SQLite storage backend | Part of persistence domain. Should be `persistence/sqlite-adapter.ts`. |
| `state-reader.ts` | 199 | Read-only governance state from disk | Part of persistence domain. Should be `persistence/state-reader.ts`. |
| `scaffolder.ts` | 180 | Creates `.idumb/` directory tree | CLI concern, not lib. |
| `logging.ts` | 96 | TUI-safe file-based logger | Fine at this size. |
| `storage-adapter.ts` | 56 | Storage adapter interface | Part of persistence domain. Should be `persistence/storage-adapter.ts`. |
| `paths.ts` | 38 | Brain directory path constants | Part of persistence domain. |
| `sdk-client.ts` | 36 | OpenCode SDK client singleton | Fine at this size. |
| `index.ts` | 24 | Barrel re-exports | Fine. |

### `src/schemas/` — 4,333 LOC (FLAT, NO SUBDIRECTORIES)

| File | LOC | Domain | Problem |
|------|-----|--------|---------|
| `planning-registry.ts` | 729 | Artifact tracking, tiers, chains, staleness | Over 500 LOC limit. |
| `task-graph.ts` | 605 | TaskNode migration, graph operations | Over 500 LOC limit. Imports from `task.ts` at line 489 for migration. |
| `task.ts` | 517 | Epic/Task/Subtask hierarchy | Over 500 LOC limit. |
| `delegation.ts` | 363 | 3-agent hierarchy, category routing | Fine. |
| `work-plan.ts` | 291 | WorkPlan lifecycle | Fine. |
| `config.ts` | 250 | IdumbConfig, Language, GovernanceMode | Fine. |
| `codemap.ts` | 241 | Code map symbol extraction | Fine. |
| `coherent-knowledge.ts` | 235 | Knowledge graph | **UNUSED at runtime** (R1 staging). |
| `project-map.ts` | 193 | Directory/file mapping | Fine. |
| `brain.ts` | 189 | Brain entry knowledge persistence | Fine. |
| `classification.ts` | 168 | Task classification | **UNUSED at runtime** (R1 staging). |
| `wiki.ts` | 153 | Wiki entry schema | **UNUSED at runtime** (R1 staging). |
| `index.ts` | 155 | Barrel re-exports all 14 schemas | Fine (barrel). |
| `plan-state.ts` | 142 | MASTER-PLAN phase tracking | Fine. |
| `anchor.ts` | 102 | Anchor types, scoring, budget selection | Fine. |

### `src/hooks/` — 504 LOC

| File | LOC | Notes |
|------|-----|-------|
| `system.ts` | 247 | Config-aware governance context injection |
| `compaction.ts` | 129 | Anchor survival post-compaction |
| `message-transform.ts` | 125 | DCP-pattern context pruning |
| `index.ts` | 3 | Barrel |

### `src/tools/` — 969 LOC

| File | LOC | Notes |
|------|-----|-------|
| `init.ts` | 526 | Project initialization + code quality (over 500 LOC) |
| `tasks.ts` | 299 | 5 lifecycle verb tools |
| `anchor.ts` | 132 | Context anchors. **LAYER VIOLATION**: imports from hooks/ |
| `index.ts` | 12 | Barrel |

### Other

| File | LOC | Notes |
|------|-----|-------|
| `templates.ts` | **1,466** | 3 agent markdown profiles in ONE FILE |
| `cli.ts` | 453 | CLI entry point |
| `cli/deploy.ts` | 440 | Agent/command deployment |
| `cli/dashboard.ts` | 271 | Dashboard launcher |
| `index.ts` | 175 | Plugin entry |

---

## 3. Dependency Graph

```
                     ┌──────────────┐
                     │   index.ts   │ Layer 4 (wiring)
                     └──┬──┬──┬────┘
                        │  │  │
          ┌─────────────┘  │  └─────────────┐
          ▼                ▼                 ▼
    ┌──────────┐    ┌──────────┐      ┌──────────┐
    │  tools/  │    │  hooks/  │      │   lib/   │
    │ Layer 3  │    │ Layer 2  │      │ Layer 1  │
    └──┬──┬──┬─┘    └──┬──┬──┬─┘      └──────────┘
       │  │  │         │  │  │              ▲
       │  │  │         │  │  │              │
       │  ▼  │         │  │  │         (all import)
       │ anchor.ts ────┘  │  │              │
       │ VIOLATION ▲      │  │              │
       │           │      │  │              │
       ▼           ▼      ▼  ▼              │
    ┌────────────────────────────────────────┤
    │           lib/ (Layer 1)              │
    │                                       │
    │  persistence.ts ◄── GOD OBJECT        │
    │    ├── 9 schema imports               │
    │    ├── 3 lib imports                  │
    │    └── 35+ public methods             │
    │                                       │
    │  brain-indexer.ts ◄── DEAD FILE       │
    │    └── 0 consumers                    │
    │                                       │
    │  code-quality.ts (719 LOC)            │
    │  framework-detector.ts (445 LOC)      │
    │  sqlite-adapter.ts (323 LOC)          │
    │  state-reader.ts (199 LOC)            │
    │  scaffolder.ts (180 LOC)              │
    │  logging.ts (96 LOC)                  │
    │  storage-adapter.ts (56 LOC)          │
    │  paths.ts (38 LOC)                    │
    │  sdk-client.ts (36 LOC)              │
    └───────────────────────┬───────────────┘
                            │
                            ▼
    ┌───────────────────────────────────────┐
    │         schemas/ (Layer 0)            │
    │                                       │
    │  task.ts ──▶ delegation.ts            │
    │    │                                  │
    │    ├──▶ work-plan.ts ──▶ task-graph   │
    │    └──▶ task-graph.ts (migration)     │
    │                                       │
    │  config, anchor, brain, codemap,      │
    │  project-map, plan-state,             │
    │  planning-registry (all leaf nodes)   │
    │                                       │
    │  classification, wiki,                │
    │  coherent-knowledge (UNUSED)          │
    └───────────────────────────────────────┘
```

---

## 4. The `persistence.ts` God Object — Detailed Breakdown

**1,082 LOC. 13 internal imports. 35+ public methods. 10 distinct data domains.**

| Data Domain | Methods | Should Be |
|-------------|---------|-----------|
| Session state (active task, last block, captured agent) | `getSession`, `setActiveTask`, `getActiveTask`, `setLastBlock`, `getLastBlock`, `setCapturedAgent`, `getCapturedAgent` | `persistence/session-store.ts` |
| Anchors (per-session anchor list) | `addAnchor`, `getAnchors` | `persistence/anchor-store.ts` |
| Task store (legacy Epic→Task→Subtask) | `getTaskStore`, `setTaskStore`, `getActiveEpic`, `getSmartActiveTask`, `setActiveEpicId` | `persistence/task-store.ts` |
| Task graph (v3 WorkPlan→TaskNode) | `getTaskGraph`, `saveTaskGraph` | `persistence/graph-store.ts` |
| Delegation store | `getDelegationStore`, `setDelegationStore`, `saveDelegationStore` | `persistence/delegation-store.ts` |
| Plan state (MASTER-PLAN phases) | `getPlanState`, `setPlanState` | `persistence/plan-store.ts` |
| Brain store (knowledge entries) | `getBrainStore`, `saveBrainStore` | `persistence/brain-store.ts` |
| Code map | `getCodeMap`, `saveCodeMap` | `persistence/codemap-store.ts` |
| Project map | `getProjectMap`, `saveProjectMap` | `persistence/project-store.ts` |
| Governance status (composite query) | `getGovernanceStatus` | `persistence/governance-status.ts` |
| Init, save, load, migration | `init`, `forceSave`, `clear`, `resetDegraded`, `close` | `persistence/manager.ts` |
| Disk I/O (debounced writes, file reads) | Private: `saveToDisk`, `loadFromDisk`, `scheduleSave` | `persistence/disk-io.ts` |

This is **12 separate responsibilities** in one class. Every schema change touches this file. Every test that uses state touches this file. It's the #1 fragility point.

---

## 5. Target Architecture

### `src/lib/` → Domain-grouped subdirectories

```
src/lib/
├── index.ts                    # Barrel (re-exports public API)
├── logging.ts                  # TUI-safe file logger (96 LOC) ✓
├── sdk-client.ts               # OpenCode SDK client singleton (36 LOC) ✓
│
├── persistence/                # ── Disk I/O domain ──
│   ├── index.ts                # Barrel for persistence
│   ├── manager.ts              # StateManager class (init, save, load, clear, close)
│   ├── disk-io.ts              # Debounced writes, file read/write
│   ├── session-store.ts        # Session state (active task, captured agent, last block)
│   ├── anchor-store.ts         # Per-session anchor management
│   ├── graph-store.ts          # TaskGraph (v3 WorkPlan→TaskNode)
│   ├── task-store.ts           # Legacy Epic→Task→Subtask store
│   ├── delegation-store.ts     # Delegation records
│   ├── plan-store.ts           # MASTER-PLAN phase state
│   ├── brain-store.ts          # Knowledge entries
│   ├── codemap-store.ts        # Code map symbols
│   ├── project-store.ts        # Project directory map
│   ├── governance-status.ts    # Composite governance query
│   ├── paths.ts                # Brain directory constants
│   ├── storage-adapter.ts      # Storage adapter interface
│   └── sqlite-adapter.ts       # SQLite backend (323 LOC)
│
├── analysis/                   # ── Code analysis domain ──
│   ├── index.ts                # Barrel
│   ├── code-quality.ts         # Smell detection, A-F grading (719 LOC)
│   └── framework-detector.ts   # Brownfield scanning (445 LOC)
│
└── setup/                      # ── Project setup domain ──
    ├── index.ts                # Barrel
    └── scaffolder.ts           # Creates .idumb/ directory tree (180 LOC)
```

### `src/schemas/` → Domain-grouped subdirectories

```
src/schemas/
├── index.ts                    # Barrel (re-exports all)
│
├── governance/                 # ── Core governance schemas ──
│   ├── task.ts                 # Epic/Task/Subtask hierarchy
│   ├── work-plan.ts            # WorkPlan lifecycle
│   ├── task-graph.ts           # TaskNode graph + migration
│   ├── delegation.ts           # 3-agent hierarchy
│   └── plan-state.ts           # Phase tracking
│
├── context/                    # ── Context preservation ──
│   ├── anchor.ts               # Anchors, scoring, budget
│   ├── config.ts               # IdumbConfig, GovernanceMode
│   └── planning-registry.ts    # Artifact tracking
│
└── knowledge/                  # ── Brain/knowledge schemas ──
    ├── brain.ts                # Brain entry persistence
    ├── codemap.ts              # Symbol extraction
    ├── project-map.ts          # Directory mapping
    ├── classification.ts       # Task classification (unused)
    ├── wiki.ts                 # Wiki entries (unused)
    └── coherent-knowledge.ts   # Knowledge graph (unused)
```

---

## 6. Most Depended-On Files

| File | Incoming Dependencies | Risk |
|------|----------------------|------|
| `schemas/task.ts` | 10 files | HIGH — breaking change breaks everything |
| `schemas/config.ts` | 10 files | HIGH — same |
| `lib/persistence.ts` | 6 direct consumers | CRITICAL — god object, change amplification |
| `lib/logging.ts` | 8 files (via barrel) | LOW — stable interface |
| `schemas/anchor.ts` | 5 files | MEDIUM |
| `schemas/delegation.ts` | 5 files | MEDIUM |

---

## 7. Dead Code Inventory

| File | LOC | Status | Action |
|------|-----|--------|--------|
| `lib/brain-indexer.ts` | 383 | DEAD — imported by nobody | Delete or move to `_staged/` |
| `schemas/classification.ts` | 168 | UNUSED — exported via barrel only | Keep (Phase 10 staging) |
| `schemas/wiki.ts` | 153 | UNUSED — exported via barrel only | Keep (Phase 10 staging) |
| `schemas/coherent-knowledge.ts` | 235 | UNUSED — exported via barrel only | Keep (Phase 10 staging) |
| `lib/_archived-2026-02-08/` | 845 | ARCHIVED — excluded from build | Delete when Phase 10 confirms no need |

---

## 8. Layer Violations

### `tools/anchor.ts` → `hooks/compaction.ts`

```typescript
// tools/anchor.ts:15 — VIOLATION
import { addAnchor, getAnchors } from "../hooks/compaction.js"
```

**Why it's wrong**: Tools must only import from `lib/` and `schemas/`. The `addAnchor`/`getAnchors` functions are module-level state closures inside `compaction.ts`.

**Fix**: Move `addAnchor`/`getAnchors` into `lib/persistence/anchor-store.ts`. Both `hooks/compaction.ts` and `tools/anchor.ts` import from there. Layer boundary restored.

---

## 9. Files Over 500 LOC Limit

| File | LOC | Violation |
|------|-----|-----------|
| `templates.ts` | 1,466 | 3x over limit |
| `persistence.ts` | 1,082 | 2x over limit |
| `planning-registry.ts` | 729 | 1.5x over limit |
| `code-quality.ts` | 719 | 1.4x over limit |
| `task-graph.ts` | 605 | 1.2x over limit |
| `init.ts` | 526 | Just over limit |
| `task.ts` | 517 | Just over limit |

---

## 10. Worktree Delta (`prototype-multi-agent-engine`)

Files that exist in worktree but not on `dev`:
- `lib/brain-indexer.ts` — Actually exists on both. Dead on both.

Files identical between worktree and dev:
- All `lib/` files except persistence.ts share the same base

The worktree does NOT solve any of the structural problems listed above.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-02-09 | Initial creation — full architecture map |
