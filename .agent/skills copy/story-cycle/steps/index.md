# Story Cycle Steps - Index

> **Master**: `_bmad/bmb/workflows/story-cycle/steps/`

## Available Steps

| Step | File | Description |
|------|------|-------------|
| 01 | `01-create-story.md` | Create a new story from epic backlog |
| 02 | `02-validate-story.md` | Validate story file is 100% complete |
| 03 | `03-create-context.md` | Build context XML with code snippets |
| 04 | `04-validate-context.md` | Validate context with freshness check |
| 05 | `05-pre-planning.md` | **NEW v2.0** - Mandatory research gate |
| 06 | `06-dev-story.md` | TDD implementation with validation |
| 07 | `07-code-review.md` | Multi-agent code review |
| 08 | `08-story-done.md` | Complete story, update tracking |
| 09 | `09-retrospective.md` | Epic-level retrospective |

## Usage

Each step can be invoked independently or as part of the full story-cycle:

```bash
# Full cycle
story-cycle

# Individual steps
create-story epic=21 story=1
validate-story story=21-1-fix-bug
pre-planning story=21-1-fix-bug
dev-story story=21-1-fix-bug
code-review story=21-1-fix-bug
story-done story=21-1-fix-bug
retrospective epic=21
```

## Flow

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

**See Also**: `../SKILL.md` (main skill), `../utils/` (utilities)
