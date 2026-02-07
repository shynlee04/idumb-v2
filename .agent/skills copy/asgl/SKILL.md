# ASGL - Autonomous Self-Governing Loop Orchestrator

> **Master Document**: `_bmad/modules/asgl/README.md` | **Version**: 2.0.0 | **Last Updated**: 2026-01-05

## Quick Reference

| Item | Location |
|------|----------|
| Master Prompt | `.opencode/skill/asgl/MASTER_PROMPT.md` |
| Loop State | `_bmad/modules/asgl/LOOP_STATE.yaml` |
| Governance Rules | `_bmad/modules/asgl/config/governance.yaml` |
| Module Integration | `_bmad/modules/asgl/config/module-integration.yaml` |
| Main Workflow | `_bmad/modules/asgl/workflows/main-loop.md` |

## What is ASGL?

**ASGL = Autonomous Self-Governing Loop Orchestrator**

ASGL is NOT an executor—it orchestrates existing BMAD modules:

```
┌─────────────────────────────────────────────────────────────┐
│                      ASGL ORCHESTRATOR                       │
│         (Loop + Govern + Assemble + Integrate)               │
└─────────────────────────┬───────────────────────────────────┘
                          │
    ┌─────────────────────┼─────────────────────┐
    ▼                     ▼                     ▼
┌─────────┐      ┌─────────────────┐      ┌──────────────┐
│deep-scan│      │architecture-    │      │  bmad-core   │
│(Diagnose)│      │remediation      │      │  (Workflows) │
└─────────┘      │(Remediate)      │      └──────────────┘
                 └─────────────────┘
                          │
                          ▼
              ┌───────────────────────────┐
              │    Governance Documents   │
              │  AGENTS.md + CLAUDE.md    │
              └───────────────────────────┘
```

## ASGL Triggers

Invoke ASGL when you see these intent patterns:

| Trigger Phrase | Action |
|----------------|--------|
| "autonomous loop" | Load ASGL for multi-story execution |
| "execute course correction" | Load sprint from `course-correction-p0-2026-01-05.yaml` |
| "run comprehensive remediation" | Load sprint from `comprehensive-remediation-sprint-2026-01-05.yaml` |
| "full cycle" | Execute all pending stories in current phase |
| "self-governing" | Enable governance enforcement during loop |

## Module Routing Reference

| Story Type | Invokes | Workflow | Agent |
|------------|---------|----------|-------|
| DIAGNOSTIC | `deep-scan` | `targeted-scan` | domain-scanner |
| GOD_STORE_SPLIT | `architecture-remediation` | `eliminate-god-stores` | store-refactorer |
| COMPONENT_SPLIT | `architecture-remediation` | `normalize-components` | component-splitter |
| TYPESCRIPT_FIX | `architecture-remediation` | `fix-typescript-errors` | typescript-fixer |
| EPIC-53 | `architecture-remediation` | `state-consolidation-cycle` | store-refactorer |
| IMPLEMENTATION | `bmad-core` | `dev-story` | dev |
| CODE_REVIEW | `bmad-core` | `code-review` | dev |

**Full routing table**: `_bmad/modules/asgl/config/module-integration.yaml`

## Governance Integration

### Update Frequency

| Document | Trigger | Frequency |
|----------|---------|-----------|
| **AGENTS.md** | `stories_completed % 3 == 0` | Every 3 stories |
| **CLAUDE.md** | `stories_completed % 5 == 0` | Every 5 stories |
| **Child AGENTS.md** | `files_changed_in_layer > 5` | When layer evolves |

### Single Source of Truth

- **Authoritative**: `AGENTS.md` (root project governance)
- **Pointer**: `CLAUDE.md` → references AGENTS.md only
- **All Platforms**: `.claude/`, `.opencode/`, `.gemini/` → point to AGENTS.md

## Execution Protocol

### 1. Initialize Session

```bash
# Load required context files
Load: _bmad/modules/asgl/LOOP_STATE.yaml
Load: _bmad/modules/asgl/config/governance.yaml
Load: _bmad/modules/asgl/config/module-integration.yaml
Load: _bmad-output/sprint-artifacts/comprehensive-remediation-sprint-2026-01-05.yaml
```

### 2. Route Story to Module

Based on story type from sprint YAML, invoke appropriate module:

- **deep-scan**: `_bmad/modules/deep-scan/`
- **architecture-remediation**: `_bmad/modules/architecture-remediation/`
- **bmad-core**: `_bmad/bmm/`

### 3. Validate After Execution

| Check | Method | Blocking |
|-------|--------|----------|
| Design compliance | grep for glassmorphism | ✅ YES |
| i18n compliance | grep for hardcoded strings | ✅ YES |
| Pending wires | Check `pending-wires.yaml` | ✅ YES |
| Artifact cross-refs | Validate refs exist | ❌ NO |

### 4. Continue or Complete

```yaml
continue_if:
  - "stories_remaining > 0"
  - "pending_wires > 0"
  - "governance_update_pending"

stop_if:
  - "user_interrupt == true"
  - "all_stories_complete AND all_checks_pass"
```

## Interrupt Commands

| Command | Action |
|---------|--------|
| `pause` | Save state, set PAUSED, generate resume prompt |
| `stop` | Complete current step, generate completion report |
| `status` | Display current loop status |
| `override [check]` | Skip validation (requires reason) |
| `skip-story` | Skip current story, go to next |

## Auto-Switching & Handoff

### Module Handoff Protocol

When invoking another module:

1. **Generate Handoff Artifact** → `_bmad/modules/asgl/templates/handoff-artifact.md`
2. **Include Context**: session_id, story_id, constraints, acceptance_criteria
3. **Track in Registry**: `_bmad/modules/asgl/scratchpad/artifact-registry.yaml`

### Cross-Module Communication

- **deep-scan results** → feed to `architecture-remediation` for planning
- **architecture-remediation** → updates `arc-sprint-status.yaml`
- **bmad-core workflows** → update `bmm-workflow-status.yaml`

## Token Optimization

This SKILL.md uses **references only**—full content is in `_bmad/modules/asgl/`. This pattern:

- Reduces token consumption by ~70%
- Ensures consistency (single source of truth)
- Enables live updates without regenerating skills

## Quick Start Commands

```markdown
# Execute course correction sprint
@asgl execute-course-correction

# Run comprehensive remediation (33 stories, 135 hours)
@asgl run-comprehensive-remediation

# Continue paused session
@asgl resume

# Show current status
@asgl status

# Pause execution
@asgl pause
```

## Related Skills

| Skill | description |
|-------|---------|
| `architecture-remediation` | God store/component elimination |
| `deep-scan` | Comprehensive codebase diagnostics |
| `bmad-core-integration` | Standard BMAD workflow execution |

---

**Generated**: 2026-01-05 | **Module**: `_bmad/modules/asgl/` | **Version**: 2.0.0
