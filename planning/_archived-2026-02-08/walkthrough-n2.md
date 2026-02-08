# Phase 1b-β Walkthrough — Scan + CodeMap Showcase

## Summary

Implemented the Phase 1b-β showcase: two new intelligence tools (`idumb_scan`, `idumb_codemap`) that give AI agents deep project understanding. Also merged `idumb_status` into `idumb_task` and created 3 entity schemas for the knowledge graph.

## Changes Made

### α-1: Merged `idumb_status` → `idumb_task action=status`

The standalone `idumb_status` tool (84 LOC) was absorbed into `idumb_task`'s existing `status` action, which previously only showed a basic task tree. Now it includes:
- Full anchor summary (fresh/stale counts, critical decisions)
- Session task info with smart-start hints
- Chain warnings
- Governance rules reminder

This freed tool slot 3 for `idumb_scan`.

**Files changed:**
- [task.ts](file:///Users/apple/Documents/coding-projects/idumb/v2/src/tools/task.ts) — Enhanced status case (lines 531-589)
- [tools/index.ts](file:///Users/apple/Documents/coding-projects/idumb/v2/src/tools/index.ts) — Removed `idumb_status` export
- [index.ts](file:///Users/apple/Documents/coding-projects/idumb/v2/src/index.ts) — Removed from tool registry
- [message-transform.ts](file:///Users/apple/Documents/coding-projects/idumb/v2/src/hooks/message-transform.ts) — Removed from EXEMPT_TOOLS
- [init.ts](file:///Users/apple/Documents/coding-projects/idumb/v2/src/tools/init.ts) — Updated greeting references

---

### α-5: Entity Schemas

Three new schema files define the data model for Phase 1b's intelligence layer:

| Schema | File | Key Types |
|--------|------|-----------|
| Brain/Knowledge | [brain.ts](file:///Users/apple/Documents/coding-projects/idumb/v2/src/schemas/brain.ts) | [BrainEntry](file:///Users/apple/Documents/coding-projects/idumb/v2/src/schemas/brain.ts#37-63), [BrainStore](file:///Users/apple/Documents/coding-projects/idumb/v2/src/schemas/brain.ts#68-74) — confidence decay, relationship traversal, query helpers |
| Project Map | [project-map.ts](file:///Users/apple/Documents/coding-projects/idumb/v2/src/schemas/project-map.ts) | [ProjectMap](file:///Users/apple/Documents/coding-projects/idumb/v2/src/schemas/project-map.ts#72-105), [FrameworkDetection](file:///Users/apple/Documents/coding-projects/idumb/v2/src/schemas/project-map.ts#28-35), [DocumentEntry](file:///Users/apple/Documents/coding-projects/idumb/v2/src/schemas/project-map.ts#50-57) — structure + drift detection |
| Code Map | [codemap.ts](file:///Users/apple/Documents/coding-projects/idumb/v2/src/schemas/codemap.ts) | [CodeMapStore](file:///Users/apple/Documents/coding-projects/idumb/v2/src/schemas/codemap.ts#96-116), [FileMapEntry](file:///Users/apple/Documents/coding-projects/idumb/v2/src/schemas/codemap.ts#56-75), [CodeComment](file:///Users/apple/Documents/coding-projects/idumb/v2/src/schemas/codemap.ts#46-53) — code structure + TODO extraction |

---

### β-1: `idumb_scan` Tool (NEW — slot 3)

[scan.ts](file:///Users/apple/Documents/coding-projects/idumb/v2/src/tools/scan.ts) — 310 LOC

| Action | What it does |
|--------|-------------|
| `full` | Complete project scan: frameworks, documents, directories, stats |
| `incremental` | Quick re-scan detecting drift since last full scan |
| `drift` | Show only new/deleted/modified files |
| `frameworks` | Tech stack detection only |
| `documents` | Map project documents by type |

Persists to `.idumb/brain/project-map.json`. Leverages existing [framework-detector.ts](file:///Users/apple/Documents/coding-projects/idumb/v2/src/lib/framework-detector.ts).

---

### β-2: `idumb_codemap` Tool (NEW — slot 5)

[codemap.ts](file:///Users/apple/Documents/coding-projects/idumb/v2/src/tools/codemap.ts) — 350 LOC

| Action | What it does |
|--------|-------------|
| [scan](file:///Users/apple/Documents/coding-projects/idumb/v2/src/lib/framework-detector.ts#278-321) | Full code analysis: functions, classes, imports, exports, comments |
| `todos` | Extract TODO/FIXME/HACK comments (fast) |
| `inconsistencies` | Detect naming/pattern deviations |
| `diff` | Structural changes since last scan |
| `graph` | Dependency map (who imports whom) |

Persists to `.idumb/brain/codemap.json`. Parses TS/JS with regex-based extraction.

---

## Tool Registry (5/5 slots filled)

| Slot | Tool | Status |
|------|------|--------|
| 1 | `idumb_task` | Enhanced (absorbed status) |
| 2 | `idumb_anchor` | Unchanged |
| 3 | `idumb_init` | Kept (may replace with `idumb_brain` in Phase γ) |
| 4 | `idumb_scan` | **NEW** ✅ |
| 5 | `idumb_codemap` | **NEW** ✅ |

## Verification

- **Typecheck:** `tsc --noEmit` → 0 errors
- **Tests:** 204/204 passed (16+16+13+60+45+54)
- **Lint:** All unused import warnings resolved
