---
description: Start Notes Remediation Loop - fixes AI features, reactivity, and ecosystem integration for the Notes workspace
---

# Notes Remediation Loop

// turbo-all

## Overview

This workflow coordinates the remediation of the **Notes Workspace** through an automated iterative loop. It addresses 6 critical defects identified in Sprint Change Proposal SCP-NOTES-2025-12-31.

## Defects Being Fixed

| ID | Defect | Severity |
|----|--------|----------|
| D1 | Fake AI Service (mock content) | CRITICAL |
| D2 | Agent Selector Disconnected | CRITICAL |
| D3 | Editor Hot-Reload Failure | HIGH |
| D4 | No File System Sync | MEDIUM |
| D5 | Text Selection AI Missing | HIGH |
| D6 | Header AI Non-Functional | HIGH |

## Quick Start

```
1. Load module state: _bmad-output/bmb-creations/notes-remediation-module/LOOP_STATE.yaml
2. Check current_phase and current_story
3. Execute the appropriate story workflow
4. Update LOOP_STATE.yaml after each story
5. Run validation gate after each phase
6. Loop until completion_signal: true
```

## Execution Steps

### Step 1: Load State

Read the current state from:
```
_bmad-output/bmb-creations/notes-remediation-module/LOOP_STATE.yaml
```

Check:
- `current_phase` - Which phase are we in?
- `current_story` - Which story is in progress?
- `stories` - Which stories are PENDING?

### Step 2: Select Next Story

If `current_story` is null, find the next PENDING story in the current phase:

**Phase 0 Stories (Immediate Fixes):**
- NR-01: Wire AI Service to Agent System
- NR-02: Fix Editor Hot-Reload Reactivity

**Phase 1 Stories (AI Integration):**
- NR-03: Connect AgentSelector to AI Service (depends on NR-01)
- NR-04: Add Text Selection AI Transform (depends on NR-01, NR-03)
- NR-05: Implement Command Palette AI Actions (depends on NR-01)

**Phase 2 Stories (Ecosystem Integration):**
- NR-06: Implement Notes → FileSync Binding (depends on CW-01)
- NR-07: Cross-Workspace Note Access (depends on NR-06)
- NR-08: Markdown Import/Export UI (depends on NR-06)

### Step 3: Execute Story

For each story, load its specific workflow:

| Story | Workflow File |
|-------|--------------|
| NR-01 | `_bmad-output/bmb-creations/notes-remediation-module/workflows/wire-ai-service.md` |
| NR-02 | `_bmad-output/bmb-creations/notes-remediation-module/workflows/fix-editor-reactivity.md` |
| NR-03 | Inline in main loop (connect agent selector) |
| NR-04 | Create AITransformMenu component |
| NR-05 | Add slash menu commands |
| NR-06 | Create NoteFileSyncAdapter |
| NR-07 | Add event bus integration |
| NR-08 | Create import/export UI |

### Step 4: Update State After Story

After completing each story:

```yaml
stories:
  NR-XX:
    status: "DONE"
    completed_at: "2025-12-31T..."
    files_changed:
      - "path/to/changed/file.ts"
    review_status: "PASSED"
```

### Step 5: Validate Phase

When all stories in a phase are DONE:

```
Load: _bmad-output/bmb-creations/notes-remediation-module/workflows/validate-phase.md
Execute: Validation gate for current phase
```

### Step 6: Advance Phase

If validation passes:

```yaml
validation_gates:
  phase_X:
    passed: true
    validated_at: "..."
    
phase_status:
  phase_X: "DONE"
  phase_X+1: "IN_PROGRESS"
```

### Step 7: Check Completion

If all phases are DONE:

```yaml
completion_signal: true
```

Report completion and close Sprint Change Proposal.

---

## Linked Documents

| Document | Path |
|----------|------|
| Sprint Change Proposal | `_bmad-output/project-planning-artifacts/notes-remediation-sprint-change-proposal-2025-12-31.md` |
| Module Manifest | `_bmad-output/bmb-creations/notes-remediation-module/module.yaml` |
| Loop State | `_bmad-output/bmb-creations/notes-remediation-module/LOOP_STATE.yaml` |
| Main Loop Workflow | `_bmad-output/bmb-creations/notes-remediation-module/workflows/notes-remediation-loop.md` |

---

## Emergency Commands

```bash
# Reset to beginning
# Edit LOOP_STATE.yaml, set all stories to PENDING

# Skip a story (not recommended)
# Set story status to "SKIPPED" with reason

# Force complete (for testing)
# Set completion_signal: true
```

---

## Handoff Protocol

When switching agents or sessions:

1. Save current work
2. Update LOOP_STATE.yaml with progress
3. Document any blockers in `errors` section
4. Note the next action needed

Next agent should:
1. Read LOOP_STATE.yaml
2. Continue from last `current_story`
3. Follow the workflow for that story
