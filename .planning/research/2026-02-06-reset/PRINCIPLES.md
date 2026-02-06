# Non-Negotiable Development Principles (iDumb Reset)

**Researched:** 2026-02-06
**Goal:** Prevent architecture drift, context poisoning, and feature-bloat-by-hypothesis.

## Principles

1. **Single Source-of-Truth (SSOT)**
   - One state machine defines what iDumb “is doing now” (phase, active task, active anchors, current chain).

2. **One Mechanism per Trial**
   - Each trial introduces at most one new lever (e.g., tool-gate, compaction injection).

3. **Baseline Before Improvement Claims**
   - “X% improvement” is illegal without baseline measurement for the same scenario.

4. **Infrastructure, Not Substitute Intelligence**
   - iDumb provides persistence + constraints + visibility; the LLM supplies reasoning.

5. **Artifacts Have Lifecycles**
   - Every persisted entity has: createdAt, modifiedAt, staleness; stale entities are demoted/purged.

6. **Budget Everything**
   - Anchor injection budget, tool output budgets, history caps; no unbounded growth.

7. **Fail Open for Platform Stability**
   - iDumb failures must not break OpenCode; capture errors in logs and degrade gracefully.

8. **Minimize Surface Area**
   - Tool count, hook complexity, configuration options start minimal and expand only with evidence.

9. **Isolation for Stress Tests**
   - Stress tests run in a separate worktree/project to avoid confusing plugin bugs with project bugs.

10. **Explicit Pivot Triggers**
   - Every trial has “continue / fallback / pivot / stop” criteria written before implementation.
