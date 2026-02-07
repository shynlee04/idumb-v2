---
description: Multi-cycle validation and integration workflow for iDumb development
---

# Validation & Integration Workflow

This workflow enforces the multi-cycle development discipline defined in AGENTS.md rules 5–14. Every change to iDumb follows this protocol. No exceptions.

---

## Phase Gate: Before ANY Work Begins

// turbo
1. Run `npm run typecheck` — must be zero errors. If errors exist, fix them FIRST.

// turbo
2. Run `npm test` — record the baseline (e.g. 242/242). This is the floor. It can never go down.

3. Read `AGENTS.md` — confirm the current phase, roadmap status, and non-negotiable rules.

4. Read the **highest-numbered** plan in `planning/implamentation-plan-turn-based/` (e.g. `implementation_plan-n6.md`). This is the active plan.

5. Read the **highest-numbered** walkthrough (e.g. `walkthrough-n6.md`). This is the most recent hand-off context.

6. **CONFLICT CHECK**: Compare what the plan says should exist vs what AGENTS.md says exists. If there is ANY discrepancy → **STOP and ALERT the user**. Do not silently resolve.

---

## Cycle 1: Implementation

This cycle implements NEW functionality. It does NOT integrate or wire into existing systems.

### 1.1 Scope Definition

7. Define the exact scope of this cycle's work. List:
   - Files to create (with target LOC — must be 300–500)
   - Files to modify (with estimated delta)
   - Tests to create (companion test for every new file)
   - NO file should be created outside `src/` unless it's a test in `tests/`

### 1.2 Schema-First

8. If the work involves new data structures, write the **schema file first** in `src/schemas/`. Types, interfaces, factory functions, helpers — all in one file. Target 300–500 LOC.

9. Write the companion test immediately: `tests/<schema-name>.test.ts`. Tests must cover:
   - Factory function output shape
   - All helper function edge cases
   - Round-trip serialization (if persisted)

// turbo
10. Run `npx tsc --noEmit` — must pass with the new schema.

// turbo
11. Run the new test: `npx tsx tests/<new-test>.test.ts` — must pass.

### 1.3 Implementation

12. Implement the feature in `src/`. Respect LOC limits:
   - If a file would exceed 500 LOC, split it into sub-modules
   - Tools can nest tools — group related handlers
   - Use barrel exports (`index.ts`) for clean imports

13. For each new source file, write or update its companion test.

// turbo
14. Run `npx tsc --noEmit` after each file change.

// turbo
15. Run `npm test` after each file change — baseline must not drop.

### 1.4 Cycle 1 Gate

// turbo
16. Run full `npm test` — must pass at or above baseline.

// turbo
17. Run `npx tsc --noEmit` — zero errors.

18. **DO NOT** update plans or AGENTS.md yet. Cycle 1 produces code only.

19. **DO** update the walkthrough with:
    - What was implemented
    - Files created/modified
    - Test results (before → after)
    - What's NOT yet integrated

---

## Cycle 2: Integration

This cycle wires Cycle 1's work into the existing system. No new features — only connections.

### 2.1 Integration Checklist

20. For each new file from Cycle 1, check:
    - [ ] Is it exported from its barrel `index.ts`?
    - [ ] Is it imported where needed?
    - [ ] Is its test in the `npm test` script in `package.json`?
    - [ ] Does it interact with `StateManager` / `persistence.ts`? If so, is persistence tested?
    - [ ] Does it interact with `deploy.ts`? If so, is it deployed?
    - [ ] Does it interact with `entity-resolver.ts`? If so, are `canWrite`/`canRead` arrays updated?
    - [ ] Does it interact with `delegation.ts`? If so, is the hierarchy updated?

### 2.2 Wire It In

21. Update barrel exports (`schemas/index.ts`, `lib/index.ts`, `tools/index.ts`, `hooks/index.ts`) to include new modules.

22. Update `package.json` test script to include new test files.

23. Update `deploy.ts` if new files need deployment.

24. Update `entity-resolver.ts` classification rules if new entity types were added.

// turbo
25. Run `npm test` — must pass. New test file should now be included.

// turbo
26. Run `npx tsc --noEmit` — zero errors.

### 2.3 Documentation Update

27. Update `AGENTS.md`:
    - [ ] File tree: add/remove/move entries with LOC annotations
    - [ ] "What Works" table: add new components with evidence
    - [ ] "What Does NOT Work" table: update anything that now works
    - [ ] Test counts: update assertion totals
    - [ ] Source LOC total
    - [ ] LOC violations table: add any new files > 500 LOC
    - [ ] Version bump
    - [ ] Last Updated date

28. Update the active plan (highest `n`): mark completed items, note any deviations.

29. Update walkthrough with integration details.

### 2.4 Cycle 2 Gate

// turbo
30. Final `npm run typecheck` — zero errors.

// turbo
31. Final `npm test` — must be at or above new baseline (old baseline + new tests).

32. Review AGENTS.md — every section must reflect reality. No hallucination.

---

## Commit Protocol

33. Make atomic commits. One commit per logical unit:

```
# Schema change
git add src/schemas/<file>.ts tests/<file>.test.ts
git commit -m "feat(schema): add <name> schema with <N> tests"

# Implementation
git add src/tools/<file>.ts src/lib/<file>.ts
git commit -m "feat(<area>): implement <feature>"

# Integration
git add src/schemas/index.ts package.json src/cli/deploy.ts
git commit -m "chore(integration): wire <feature> into deploy + test pipeline"

# Documentation
git add AGENTS.md planning/implamentation-plan-turn-based/walkthrough-<n>.md
git commit -m "docs: update AGENTS.md v<X> + walkthrough-<n>"
```

34. Never mix code changes with documentation changes in the same commit.

---

## Conflict Protocol

At ANY point during Cycle 1 or Cycle 2:

35. If you discover a conflict between:
    - The active plan and the code
    - AGENTS.md and the code
    - Two plan files
    - Test expectations and actual behavior

    → **STOP IMMEDIATELY**. Alert the user with:
    - What conflicts
    - Where it lives (file + line)
    - Your recommendation
    - Do NOT auto-resolve

---

## LOC Health Check

// turbo
36. After all work is done, run:
```bash
find src -name '*.ts' -not -path '*/node_modules/*' -not -path '*/dashboard/frontend/*' | xargs wc -l | sort -rn | head -20
```

37. Any file above 500 LOC must be:
    - Listed in AGENTS.md LOC violations table
    - Given a recommended split strategy
    - Flagged for the next available cycle

---

## Quick Reference: What Goes Where

| Artifact | Location | When to Update |
|---|---|---|
| Source code | `src/` | Cycle 1 |
| Tests | `tests/` | Cycle 1 |
| AGENTS.md | root | Cycle 2 ONLY |
| Plan (n-series) | `planning/implamentation-plan-turn-based/` | Cycle 2 ONLY |
| Walkthrough | `planning/implamentation-plan-turn-based/` | End of Cycle 1 + End of Cycle 2 |
| package.json test script | root | Cycle 2 |
| Barrel exports | `src/*/index.ts` | Cycle 2 |
