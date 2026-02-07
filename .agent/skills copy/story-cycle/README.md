# Story Cycle Integration - OpenCode

> **Master Source**: `_bmad/bmb/workflows/story-cycle/` | **Version**: 2.0.0

## Overview

This directory contains OpenCode skill integrations for the **Story Development Cycle v2.0** - a complete modular workflow for developing stories from backlog to done.

## Architecture

```
.opencode/
├── skill/story-cycle/
│   ├── SKILL.md              # Main skill entry point
│   ├── README.md             # This file
│   ├── index.md              # Package index
│   ├── steps/                # 9 step skill files
│   │   ├── index.md
│   │   ├── 01-create-story.md
│   │   ├── 02-validate-story.md
│   │   ├── 03-create-context.md
│   │   ├── 04-validate-context.md
│   │   ├── 05-pre-planning.md
│   │   ├── 06-dev-story.md
│   │   ├── 07-code-review.md
│   │   ├── 08-story-done.md
│   │   └── 09-retrospective.md
│   └── utils/                # Utility skill files
│       ├── index.md
│       ├── _stale-check.md
│       ├── _correct-course.md
│       ├── _handoff-template.md
│       └── _audit-checkpoint.md
│
└── command/
    ├── story-cycle.md        # Command documentation
    ├── create-story.md
    ├── dev-story.md
    └── correct-course.md
```

## Quick Start

### Full Story Cycle
```bash
story-cycle              # Start new story (interactive)
story-cycle continue S-001  # Continue existing story
```

### Individual Steps
```bash
create-story epic=21 story=1
validate-story story=21-1
create-context story=21-1
validate-context story=21-1
pre-planning story=21-1
dev-story story=21-1
code-review story=21-1
story-done story=21-1
retrospective epic=21
```

### Utilities
```bash
stale-check context=path
correct-course story=S-001
audit story=S-001
```

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  STORY DEVELOPMENT CYCLE v2.0                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │ 01-create-  │ →  │ 02-validate-│ →  │ 03-create-  │ →  │ 04-validate-│  │
│  │   story     │    │   story     │    │   context   │    │   context   │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│        ↓ fail              ↺ loop             ↓                 ↺ loop     │
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │ 05-pre-     │ →  │ 06-dev-     │ →  │ 07-code-    │ →  │ 08-story-   │  │
│  │   planning  │    │   story     │    │   review    │    │   done      │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│        ↓ fail              ↺ loop             ↺ loop             ↓         │
│                                                                             │
│  ┌─────────────┐                                                            │
│  │ 09-retro-   │  ← [if last story of epic]                                │
│  │   spective  │                                                            │
│  └─────────────┘                                                            │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ CROSS-CUTTING: correct-course, audit-checkpoint, stale-check        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Key Features

| Feature | Description |
|---------|-------------|
| **Modular Architecture** | 10 files instead of 1 monolithic 552-line file |
| **Pre-Planning Gate** | Step 05 - Mandatory research before code (v2.0 innovation) |
| **Stale Check** | Prevent working with outdated context |
| **Correct Course** | Recovery workflow for stuck stories |
| **Audit Checkpoint** | Cross-cutting quality verification |
| **Handoff Templates** | Standardized agent transitions |

## Token Optimization

All skill files contain **minimal references** to the master workflow. This pattern:

- ✅ Ensures consistency (single source of truth)
- ✅ Enables live updates (changes propagate automatically)
- ✅ Reduces token count by ~80%

## Integration Points

### OpenCode Configuration
- **Commands**: `.opencode/opencode.jsonc` - Added `story-cycle`, `create-story`, `dev-story`, `code-review`, `correct-course`
- **Skills**: `.opencode/skill/story-cycle/` - Complete skill package

### BMM Workflows
- **Reference**: `.opencode/skill/bmm-workflows/SKILL.md` - Updated to reference story-cycle

## Prerequisites

Before running any step:

1. **Sprint status file**: `_bmad-output/sprint-artifacts/sprint-status.yaml`
2. **Epics document**: `_bmad-output/epics.md`
3. **Architecture document**: `_bmad-output/architecture.md`
4. **Constitution**: `.opencode/instructions/bmad-constitution.md`
5. **Story in backlog**: Story exists with status `backlog`

## Governance Rules

### Mandatory Research (Before Implementation)

Every story **MUST** include research using MCP tools:

| Tool | description | Query Pattern |
|------|---------|---------------|
| **Context7** | Official docs | `resolve-library-id` → `get-library-docs` |
| **DeepWiki** | GitHub patterns | `ask_question` with repo-specific query |
| **Tavily/Exa** | Community solutions | Semantic search for patterns |
| **Repomix** | Local analysis | Pack and grep existing code |

### Validation Gates (100% Pass Required)

- [ ] Story file exists at correct path
- [ ] User story format complete (As a/I want/So that)
- [ ] At least 3 acceptance criteria defined
- [ ] Context XML passes freshness check
- [ ] Pre-planning gate passed
- [ ] All tests passing
- [ ] Code review approved

## Recovery Handlers

### Correct Course Workflow

**Triggered when:**
- Story stuck >2x timebox
- Validation unable to pass
- External blockers identified

**Actions:**
1. Pause current workflow
2. Assess situation
3. Propose options:
   - Split story
   - Defer to next sprint
   - Escalate to architect
4. Document decision
5. Resume or terminate

### Stale Check

**Triggered:**
- At context creation
- Before development
- After significant delays

**Checks:**
- File modification timestamps
- Git status for uncommitted changes
- Sprint status currency

## Output Artifacts

| Artifact | Location | description |
|----------|----------|---------|
| Story File | `{sprint_artifacts}/{story}.md` | Requirements, tracking |
| Context XML | `{sprint_artifacts}/{story}-context.xml` | Developer context |
| Handoff | `{sprint_artifacts}/{story}-handoff.md` | Agent transition |
| Sprint Status | `{sprint_artifacts}/sprint-status.yaml` | Sprint tracking |
| Retrospective | `{sprint_artifacts}/epic-{N}-retro.md` | Epic review |

## Related Documentation

| Document | Location |
|----------|----------|
| Master README | `_bmad/bmb/workflows/story-cycle/README.md` |
| Step Skills | `_bmad/bmb/workflows/story-cycle/skills/step-skills.md` |
| Full Workflow | `_bmad/bmb/workflows/story-cycle/skills/story-cycle.md` |
| BMM Integration | `.opencode/skill/bmm-workflows/SKILL.md` |
| AGENTS.md | `AGENTS.md` (project root) |

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2026-01-08 | Modular architecture, pre-planning gate, cross-platform |
| 1.0.0 | 2025-12-20 | Original monolithic workflow |

---

**Generated**: 2026-01-08 | **Master**: `_bmad/bmb/workflows/story-cycle/`
