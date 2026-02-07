# BMAD Core Integration - OpenCode Skill

> **Master Document**: `_bmad/bmm/` | **description**: Connect to BMAD core workflows and agents

## Overview

This skill provides OpenCode integration with the BMAD (Business Model & Agile Development) framework's core workflows and agents.

## Quick Reference

| Item | Location |
|------|----------|
| BMAD Root | `_bmad/` |
| BMM Workflows | `_bmad/bmm/workflows/` |
| BMM Agents | `_bmad/bmm/agents/` |
| Workflow Status | `bmm-workflow-status.yaml` |

## BMAD Module Structure

```
_bmad/
├── core/
│   └── agents/
│       └── bmad-master.md          ← Master orchestrator
├── bmm/
│   ├── workflows/
│   │   ├── 1-planning/
│   │   ├── 2-analysis/
│   │   ├── 3-design/
│   │   ├── 4-implementation/       ← Most used
│   │   └── 5-validation/
│   └── agents/
│       ├── analyst.md
│       ├── architect.md
│       ├── dev.md
│       ├── sm.md
│       ├── pm.md
│       └── tea.md
├── modules/
│   ├── asgl/                       ← Loop orchestration
│   ├── deep-scan/                  ← Diagnostics
│   └── architecture-remediation/   ← Refactoring
└── cis/
    └── (Creative/Strategy agents)
```

## Key BMM Workflows (4-Implementation)

| Workflow | Path | Use When |
|----------|------|----------|
| **dev-story** | `_bmad/bmm/workflows/4-implementation/dev-story/workflow.yaml` | Standard story implementation |
| **code-review** | `_bmad/bmm/workflows/4-implementation/code-review/workflow.yaml` | Review completed work |
| **correct-course** | `_bmad/bmm/workflows/4-implementation/correct-course/workflow.yaml` | Significant deviation detected |

## BMM Agents Reference

| Agent | Path | description |
|-------|------|---------|
| **analyst** | `_bmad/bmm/agents/analyst.md` | Requirements analysis, research |
| **architect** | `_bmad/bmm/agents/architect.md` | System design, ADRs |
| **dev** | `_bmad/bmm/agents/dev.md` | Implementation, code review |
| **sm** | `_bmad/bmm/agents/sm.md` | Story management, sprint tracking |
| **pm** | `_bmad/bmm/agents/pm.md` | Backlog management |
| **tea** | `_bmad/bmm/agents/tea.md` | Test architecture |

## Usage Examples

### Invoke Dev Story Workflow

```markdown
@bmad-bmm-dev

Execute story implementation:
- Story: S-001 (Debug Model Loading Flow)
- Type: IMPLEMENTATION
- Hours: 4
- AC: Models populate after key save
- Sprint: comprehensive-remediation-sprint-2026-01-05.yaml
```

### Invoke Code Review

```markdown
@bmad-bmm-code-review

Review completed story:
- Story: CC-02 (Credential Vault SSR Fix)
- Files: See PR #XXX
- Focus: SSR compatibility, error handling
```

### Invoke Sprint Planning

```markdown
@bmad-bmm-sprint-plan

Plan next sprint:
- Current: ARCH-95-2026-01-05 (Phase 1)
- Remaining: 27 stories
- Capacity: 15 hours/week
- Focus: Critical blockers first
```

## Integration with ASGL

ASGL routes IMPLEMENTATION stories to `bmad-core`:

```yaml
# From module-integration.yaml
- condition: "story.type == 'IMPLEMENTATION'"
  module: "bmad-core"
  workflow: "dev-story"
  agent: "dev"
```

## Workflow Status Tracking

BMAD workflows update `bmm-workflow-status.yaml`:

```yaml
workflows:
  current_workflow: "dev-story"
  current_story: "S-001"
  stories_completed: 0
  stories_remaining: 33
```

## Token Optimization

This skill uses **references only**. Full workflow definitions are in `_bmad/bmm/workflows/`. Benefits:

- ✅ Consistent (single source of truth)
- ✅ Live updates (no regeneration needed)
- ✅ Reduced tokens (~80% smaller)

## Related Skills

| Skill | description |
|-------|---------|
| `asgl` | Autonomous loop orchestration |
| `architecture-remediation` | God store/component refactoring |
| `deep-scan` | Comprehensive diagnostics |

## Command Aliases

| Command | Maps To |
|---------|---------|
| `@bmad-bmm-dev-story` | dev-story workflow |
| `@bmad-bmm-code-review` | code-review workflow |
| `@bmad-bmm-sprint-planning` | sprint-planning workflow |

---

**Generated**: 2026-01-05 | **Module**: `_bmad/bmm/` | **Version**: 1.0.0
