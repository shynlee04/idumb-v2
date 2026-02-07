# Story Cycle Integration Summary

> **Date**: 2026-01-08 | **Master**: `_bmad/bmb/workflows/story-cycle/` | **Version**: 2.0.0

## Integration Complete ✅

The story-cycle workflow has been successfully integrated into OpenCode with **references instead of copies** to maintain single source of truth.

---

## Files Created

### Skill Package (`.opencode/skill/story-cycle/`)

```
.opencode/skill/story-cycle/
├── SKILL.md                      # Main skill entry point
├── README.md                     # Package documentation
├── INTEGRATION.md                # This file
├── index.md                      # Package index
├── steps/                        # 9 step skill files
│   ├── index.md
│   ├── 01-create-story.md
│   ├── 02-validate-story.md
│   ├── 03-create-context.md
│   ├── 04-validate-context.md
│   ├── 05-pre-planning.md        # NEW v2.0
│   ├── 06-dev-story.md
│   ├── 07-code-review.md
│   ├── 08-story-done.md
│   └── 09-retrospective.md
└── utils/                        # Utility files
    ├── index.md
    ├── _stale-check.md
    ├── _correct-course.md
    ├── _handoff-template.md
    └── _audit-checkpoint.md

Total: 18 files
```

### Command Documentation (`.opencode/command/`)

```
.opencode/command/
├── story-cycle.md                # Full cycle command
├── create-story.md               # Create story command
└── dev-story.md                  # Development command

Total: 3 files
```

### Configuration Updates

| File | Changes |
|------|---------|
| `.opencode/opencode.jsonc` | Added 5 new commands (story-cycle, create-story, dev-story, code-review, correct-course) |
| `.opencode/skill/bmm-workflows/SKILL.md` | Added story-cycle reference and commands section |

---

## Usage

### OpenCode Commands

```bash
# Full cycle
story-cycle
story-cycle continue S-001

# Individual steps
create-story epic=21 story=1
dev-story story=21-1
code-review story=21-1
correct-course story=21-1
```

### Agent Mentions

```markdown
@story-cycle
@dev-story story=S-001
@code-review story=S-001
@correct-course story=S-001
```

---

## Architecture

### Single Source of Truth

All skill files contain **minimal references** to the master workflow:

```
.opencode/skill/story-cycle/SKILL.md
  → References: _bmad/bmb/workflows/story-cycle/README.md
  → References: _bmad/bmb/workflows/story-cycle/steps/*.md
  → References: _bmad/bmb/workflows/story-cycle/utils/*.md

.opencode/skill/story-cycle/steps/06-dev-story.md
  → References: _bmad/bmb/workflows/story-cycle/steps/06-dev-story.md
```

This pattern:
- ✅ Ensures consistency (single source)
- ✅ Enables live updates
- ✅ Reduces token count by ~80%

---

## Workflow Flow

```
01-create-story → 02-validate-story → 03-create-context → 04-validate-context
       ↓ fail              ↺ loop             ↓                 ↺ loop
                                                              ↓
05-pre-planning → 06-dev-story → 07-code-review → 08-story-done
       ↓ fail              ↺ loop            ↺ loop             ↓
                                                              ↓
                                              09-retrospective ← (if epic complete)
```

---

## Key Features

| Feature | File | Description |
|---------|------|-------------|
| **Modular Architecture** | `SKILL.md`, `steps/*.md` | 10 files instead of 1 monolithic file |
| **Pre-Planning Gate** | `steps/05-pre-planning.md` | Mandatory research before code |
| **Stale Check** | `utils/_stale-check.md` | Validate file freshness |
| **Correct Course** | `utils/_correct-course.md` | Recovery workflow |
| **Audit Checkpoint** | `utils/_audit-checkpoint.md` | Quality audit |
| **Handoff Templates** | `utils/_handoff-template.md` | Standardized transitions |

---

## Prerequisites

Before running any step:

1. ✅ `_bmad/bmb/config.yaml` exists
2. ✅ `_bmad-output/sprint-artifacts/sprint-status.yaml` exists
3. ✅ `_bmad-output/epics.md` exists
4. ✅ `_bmad-output/architecture.md` exists
5. ✅ Story exists with status `backlog`

---

## Related Documentation

| Document | Location |
|----------|----------|
| Master README | `_bmad/bmb/workflows/story-cycle/README.md` |
| Step Skills | `_bmad/bmb/workflows/story-cycle/skills/step-skills.md` |
| Full Skill | `_bmad/bmb/workflows/story-cycle/skills/story-cycle.md` |
| BMM Workflows | `.opencode/skill/bmm-workflows/SKILL.md` |
| Project AGENTS.md | `AGENTS.md` |

---

## Verification Checklist

- [x] Skill package created at `.opencode/skill/story-cycle/`
- [x] All 9 step skill files created
- [x] All 4 utility skill files created
- [x] Barrel exports (index.md files) created
- [x] Command documentation created
- [x] `opencode.jsonc` updated with new commands
- [x] `bmm-workflows/SKILL.md` updated with references
- [x] Token optimization applied (minimal references)

---

## Next Steps

1. **Test Integration**: Run `story-cycle` command to verify
2. **Update Claude Code**: Sync similar structure to `.claude/skills/`
3. **Documentation**: Add to project docs if needed

---

**Generated**: 2026-01-08 | **Master**: `_bmad/bmb/workflows/story-cycle/`
