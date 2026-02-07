# n6 Walkthrough — 3-Agent Model Refactor + AGENTS.md v6.0.0

**Date:** 2026-02-07  
**Scope:** Phase n6-Iter1 Cycle 1 — Agent consolidation + development rules codification  
**Baseline:** 242/242 tests, `tsc --noEmit` clean

---

## What Changed

### 1. Agent Model: 7 → 3

Consolidated 7 innate agents into 3:

| Old Agent | → | New Agent |
|---|---|---|
| `idumb-meta-builder` | → | `idumb-supreme-coordinator` (L0 orchestrator) |
| `idumb-supreme-coordinator` | → | (merged into coordinator) |
| `idumb-builder` | → | `idumb-executor` (L1) |
| `idumb-validator` | → | (merged into executor) |
| `idumb-skills-creator` | → | (merged into investigator) |
| `idumb-research-synthesizer` | → | `idumb-investigator` (L1) |
| `idumb-planner` | → | (merged into investigator) |

### 2. Files Modified (Code)

| File | Change |
|---|---|
| `src/templates.ts` | Replaced `getMetaBuilderAgent` → `getCoordinatorAgent`. Added `getInvestigatorAgent`, `getExecutorAgent`. Removed 6 old generators + 6 old profiles. Added 3 new profiles. Fixed over-escaped backticks and template interpolation. |
| `src/cli/deploy.ts` | Updated imports to 3 agents. Deploy section: 3 agents + 3 profiles instead of 7+6. |
| `src/schemas/delegation.ts` | `AGENT_HIERARCHY`: 3 agents (coordinator L0, investigator L1, executor L1). `CATEGORY_AGENT_MATRIX`: development→executor, research→investigator, governance→coordinator, planning→investigator, documentation→investigator, ad-hoc→both. |
| `src/lib/entity-resolver.ts` | All `canWrite` arrays updated to reference 3 new agent names. |
| `tests/delegation.test.ts` | All agent references updated from old names to new 3-agent model. |

### 3. AGENTS.md v6.0.0

Complete rewrite with:
- **14 non-negotiable development rules** covering multi-cycle discipline, LOC limits (300-500 target), atomic commits, plan conflict protocol, incremental testing, and hand-off quality
- **Accurate file tree** with LOC annotations and ⚠️ flags for violations
- **3-agent team documentation** with delegation routing table
- **Level 5: Planning Registry** added as new capability layer
- **Plan chain tracking** — documents all n3→n6 plans and walkthroughs
- **LOC violations table** — 10 files above 500 LOC listed with recommended splits
- **Session handoff** — updated to reference n6 plan and walkthrough

---

## Verification

- **TypeScript:** `npx tsc --noEmit` → **0 errors** ✅
- **All tests:** `npm test` → **242/242 pass** ✅
  - tool-gate: 16/16
  - compaction: 16/16
  - message-transform: 13/13
  - init: 60/60
  - persistence: 45/45
  - task: 54/54
  - delegation: 38/38

---

## What's Next (Cycle 2 — Integration)

1. Wire `planning-registry.test.ts` into `npm test` script
2. Integrate planning registry into `write.ts` (registration-at-creation)
3. Integrate outlier detection into `init.ts`
4. Address LOC violations — split `templates.ts` (1510 LOC)
5. Atomic git commits for each sub-task
