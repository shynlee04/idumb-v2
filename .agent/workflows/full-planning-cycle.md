---
description: Master orchestration workflow for generating all formal planning documents from scratch. Sequences PRD → Architecture → UX Design → Epics/Stories. Designed for brownfield course correction with fresh single-source-of-truth documents.
delegation_target: Claude Code Sub-Agent or Direct Execution
phase: full-cycle
outputs:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design.md
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/sprint-artifacts/sprint-status.yaml
---

# Full Planning Cycle Orchestration

## Overview

This meta-workflow orchestrates the complete planning document generation cycle, creating **fresh single-source-of-truth documents** that supersede unreliable brownfield documentation.

**description:** Course-correct projects with outdated/inconsistent documentation by generating authoritative planning artifacts from codebase reality + stakeholder vision.

**Execution Model:** Sequential delegation to 4 specialized workflows with validation gates between each phase.

---

## Pre-Execution Checklist

Before starting, ensure:

```yaml
prerequisites:
  required:
    - Codebase accessible at project root
    - MCP tools configured (Context7, Deepwiki, Exa, Tavily)
    - Mission/vision documented (or can be captured)
  recommended:
    - agent-os/product/mission.md exists
    - agent-os/product/roadmap.md exists
    - Stakeholder available for async clarifications
  
  cleanup_actions:
    - Archive existing brownfield docs:
        - mv _bmad-output/documentation/ _bmad-output/documentation-archived-{date}/
    - Create fresh output directory:
        - mkdir -p _bmad-output/planning-artifacts/
        - mkdir -p _bmad-output/sprint-artifacts/
```

---

## Phase 0: Mission & Vision Capture

**If `agent-os/product/mission.md` doesn't exist:**

```yaml
capture_mission:
  1. Ask stakeholder (or extract from README/package.json):
     - What problem does this product solve?
     - Who is the target user?
     - What is the core value proposition?
     - What differentiates this from alternatives?
  
  2. Create: agent-os/product/mission.md
     ---
     version: 1.0.0
     captured: {timestamp}
     status: approved
     ---
     # Product Mission
     
     ## Problem
     [Captured problem statement]
     
     ## Target User
     [User persona]
     
     ## Value Proposition
     [Core value]
     
     ## Differentiation
     [Competitive advantage]
```

---

## Phase 1: PRD Generation

### Execution

```
Delegate to: /agent-delegation-prd

Instructions:
- Execute workflow autonomously
- Use codebase analysis for reality-based requirements
- Reference mission.md for vision alignment
- Mark LOW confidence items for review
- Output: _bmad-output/planning-artifacts/prd.md
```

### Validation Gate

```yaml
prd_validation:
  checks:
    - File exists: _bmad-output/planning-artifacts/prd.md
    - Line count > 200
    - All sections populated
    - Confidence scores present
  
  on_pass:
    - Update document status to "draft-complete"
    - Proceed to Phase 2
  
  on_fail:
    - Report issues to orchestrator
    - Re-execute with adjusted parameters
    - Max retries: 2
```

### Human Review Checkpoint

```yaml
review_checkpoint:
  required: true
  reviewer: Product Owner / Stakeholder
  items:
    - Verify problem statement accuracy
    - Validate user personas
    - Approve success metrics
    - Confirm priority (P0/P1/P2) assignments
  
  actions:
    - Update PRD frontmatter: status → "approved"
    - Add: reviewedBy, reviewedAt
```

---

## Phase 2: Architecture Generation

### Execution

```
Delegate to: /agent-delegation-architecture

Prerequisites:
- PRD status == "approved" (or "draft-complete" for fast-track)

Instructions:
- Analyze codebase for implicit decisions
- Research framework best practices
- Generate/update ADRs
- Output: _bmad-output/planning-artifacts/architecture.md
```

### Validation Gate

```yaml
architecture_validation:
  checks:
    - File exists: _bmad-output/planning-artifacts/architecture.md
    - Line count > 300
    - Tech stack documented
    - At least 3 ADRs present
    - Component diagram included
  
  on_pass:
    - Update status to "draft-complete"
    - Proceed to Phase 3
```

### Human Review Checkpoint

```yaml
review_checkpoint:
  required: true
  reviewer: Tech Lead / Architect
  items:
    - Validate tech stack choices
    - Review ADR decisions
    - Approve state management approach
    - Confirm API design
  
  actions:
    - Update frontmatter: status → "approved"
```

---

## Phase 3: UX Design Generation

### Execution

```
Delegate to: /agent-delegation-ux-design

Prerequisites:
- PRD approved
- Architecture approved (or draft-complete)

Instructions:
- Extract design system from codebase
- Audit accessibility
- Map user flows
- Output: _bmad-output/planning-artifacts/ux-design.md
```

### Validation Gate

```yaml
ux_validation:
  checks:
    - File exists: _bmad-output/planning-artifacts/ux-design.md
    - Line count > 250
    - Design tokens extracted
    - Accessibility audit present
    - User flows documented
  
  on_pass:
    - Update status to "draft-complete"
    - Proceed to Phase 4
```

### Human Review Checkpoint

```yaml
review_checkpoint:
  required: false  # Can proceed without if no UI changes
  reviewer: UX Designer / Product Owner
  items:
    - Validate design system
    - Prioritize accessibility fixes
    - Approve user flow mappings
```

---

## Phase 4: Epics & Stories Generation

### Execution

```
Delegate to: /agent-delegation-epics-stories

Prerequisites:
- PRD approved
- Architecture approved
- UX Design approved (or skip if non-UI project)

Instructions:
- Decompose requirements into epics
- Generate stories with GIVEN-WHEN-THEN criteria
- Create dependency graph
- Build traceability matrix
- Output: 
    - _bmad-output/planning-artifacts/epics.md
    - _bmad-output/sprint-artifacts/sprint-status.yaml
```

### Validation Gate

```yaml
epics_validation:
  checks:
    - epics.md exists with > 400 lines
    - sprint-status.yaml generated
    - All stories have 3+ acceptance criteria
    - Traceability matrix complete
    - Coverage > 90%
  
  on_pass:
    - Mark cycle complete
    - Generate final report
```

---

## Phase 5: Final Consolidation

### 5.1 Update Governance Documents

```yaml
governance_updates:
  - Update bmm-workflow-status.yaml:
      phase: implementation
      documents_generated:
        - prd: approved
        - architecture: approved
        - ux_design: approved
        - epics: ready
  
  - Update AGENTS.md with new document references
  
  - Archive brownfield docs (if not done in Phase 0)
```

### 5.2 Generate Cycle Completion Report

```markdown
# Planning Cycle Complete

## Generated Documents

| Document | Location | Lines | Status |
|----------|----------|-------|--------|
| PRD | _bmad-output/planning-artifacts/prd.md | {n} | Approved |
| Architecture | _bmad-output/planning-artifacts/architecture.md | {n} | Approved |
| UX Design | _bmad-output/planning-artifacts/ux-design.md | {n} | Approved |
| Epics & Stories | _bmad-output/planning-artifacts/epics.md | {n} | Ready |
| Sprint Status | _bmad-output/sprint-artifacts/sprint-status.yaml | {n} | Generated |

## Metrics

- Total Epics: {count}
- Total Stories: {count}
- P0 Stories: {count}
- Estimated Sprint 1 Effort: {hours}

## Research Sources Used

- Context7: {count} queries
- Deepwiki: {count} queries
- Exa: {count} queries
- Tavily: {count} queries

## Codebase Files Analyzed

- Routes: {count}
- Components: {count}
- Stores: {count}
- Services: {count}

## Items Requiring Follow-Up

1. [List deferred items]
2. [List LOW confidence items]
3. [List open questions]

## Next Steps

1. ✅ Documents ready for implementation
2. → Run /bmad-bmm-workflows-sprint-planning to start Sprint 1
3. → Execute stories via /bmad-bmm-workflows-dev-story
4. → Update sprint-status.yaml as work progresses

## Brownfield Cleanup

- Archived: _bmad-output/documentation-archived-{date}/
- New single source of truth: _bmad-output/planning-artifacts/
```

---

## Execution Modes

### Mode 1: Full Autonomous (Sub-Agent Delegation)

```
For each phase:
  - Spawn sub-agent with workflow
  - Wait for completion
  - Validate gate
  - Proceed or retry
  
Human checkpoints: Async via document review
Total estimated time: 2-4 hours autonomous
```

### Mode 2: Interactive (With Human Gates)

```
For each phase:
  - Execute workflow
  - Present to human for review
  - Collect feedback
  - Incorporate changes
  - Proceed when approved
  
Human checkpoints: Synchronous
Total estimated time: 1-2 days with reviews
```

### Mode 3: Fast-Track (Skip Optional Reviews)

```
Execute all 4 workflows sequentially
Skip human review checkpoints
Mark all documents as "draft-complete"
Proceed to implementation with iterative refinement

Use when: Time-critical or exploration mode
```

---

## Error Recovery

| Phase | Error | Recovery |
|-------|-------|----------|
| 1-PRD | Mission missing | Capture from stakeholder or infer from code |
| 2-Arch | PRD incomplete | Use draft with LOW confidence markers |
| 3-UX | No UI components | Skip UX phase, generate minimal doc |
| 4-Epics | Coverage < 90% | Flag gaps, continue with partial coverage |
| Any | MCP timeout | Use codebase-only analysis |

---

## Orchestration Commands

### Start Full Cycle
```
Run /full-planning-cycle with mode=autonomous
Report: After each phase completion
Final report: After Phase 5 consolidation
```

### Start from Specific Phase
```
Run /full-planning-cycle from-phase=2
Prerequisites: Previous phase documents must exist
```

### Regenerate Single Document
```
Run /agent-delegation-{prd|architecture|ux-design|epics-stories}
Updates: Only the specified document
Downstream: May require re-running dependent phases
```

---

## Document Hierarchy (Single Source of Truth)

After cycle completion, document authority is:

```
1. _bmad-output/planning-artifacts/prd.md
   └── Authoritative for: Requirements, user needs, priorities

2. _bmad-output/planning-artifacts/architecture.md
   └── Authoritative for: Tech decisions, ADRs, patterns

3. _bmad-output/planning-artifacts/ux-design.md
   └── Authoritative for: Design system, components, a11y

4. _bmad-output/planning-artifacts/epics.md
   └── Authoritative for: Implementation work breakdown

5. _bmad-output/sprint-artifacts/sprint-status.yaml
   └── Authoritative for: Current sprint state

DEPRECATED (archived):
- _bmad-output/documentation-archived-*/
- Any brownfield docs not in planning-artifacts/
```

---

## Integration with Sprint Execution

After completing this cycle:

1. **Sprint Planning:**
   ```
   /bmad-bmm-workflows-sprint-planning
   Input: sprint-status.yaml
   Output: Sprint backlog with assigned stories
   ```

2. **Story Development:**
   ```
   For each story in sprint:
     /bmad-bmm-workflows-create-story
     /bmad-bmm-workflows-dev-story
     /bmad-bmm-workflows-code-review
   ```

3. **Retrospective:**
   ```
   After epic completion:
     /bmad-bmm-workflows-retrospective
   ```

---

## Versioning

When re-running this cycle (course correction):

```yaml
versioning:
  - Increment version in frontmatter: 1.0.0 → 1.1.0
  - Archive previous: prd.md → prd-v1.0.0.md
  - Document changes in CHANGELOG section
  - Update traceability for affected stories
```
