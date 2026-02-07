# Story Cycle Skill Package

> **Master**: `_bmad/bmb/workflows/story-cycle/` | **Version**: 2.0.0

## Overview

Complete modular story development cycle with 9 steps, validation loops, and cross-platform support.

## Structure

```
story-cycle/
├── SKILL.md                    # Main skill entry point
├── index.md                    # This file
├── steps/                      # 9 step files
│   ├── index.md
│   ├── 01-create-story.md
│   ├── 02-validate-story.md
│   ├── 03-create-context.md
│   ├── 04-validate-context.md
│   ├── 05-pre-planning.md      # NEW v2.0
│   ├── 06-dev-story.md
│   ├── 07-code-review.md
│   ├── 08-story-done.md
│   └── 09-retrospective.md
└── utils/                      # Utility files
    ├── index.md
    ├── _stale-check.md
    ├── _correct-course.md
    ├── _handoff-template.md
    └── _audit-checkpoint.md
```

## Quick Reference

### Full Cycle
```bash
story-cycle              # Start new story
story-cycle continue X   # Continue existing
story-cycle step=N story=X  # Jump to step
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
correct-course story=X
audit story=X
```

## Workflow Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 01-create-story → 02-validate-story →       │
│      03-create-context ↓ fail              ↺ loop              ↓                 │
│                                                  ↓             │
│ 05-pre-planning → 06-dev-story → 07-code-review              │
│      ↓ fail              ↺ loop            ↺ loop             │
│                                                  ↓             │
│                                        08-story-done          │
│                                                  ↓             │
│                                        09-retrospective       │
└─────────────────────────────────────────────────────────────────┘
```

## v2.0 Innovations

| Feature | Description |
|---------|-------------|
| **Pre-planning gate** | Step 05 - Mandatory research before code |
| **Modular architecture** | 10 files instead of 1 monolithic 552-line file |
| **Stale check** | Prevent working with outdated context |
| **Correct course** | Recovery workflow for stuck stories |
| **Audit checkpoint** | Cross-cutting quality verification |

## Token Optimization

All skill files contain **minimal references** to the master workflow in `_bmad/bmb/workflows/story-cycle/`. This pattern:

- ✅ Ensures consistency (single source of truth)
- ✅ Enables live updates (changes propagate automatically)
- ✅ Reduces token count by ~80%

## Related Skills

| Skill | description |
|-------|---------|
| `bmm-workflows` | BMM workflow integration |
| `bmad-core-integration` | Agent access and routing |
| `asgl` | Autonomous loop orchestration |

---

**Generated**: 2026-01-08 | **Master**: `_bmad/bmb/workflows/story-cycle/`
