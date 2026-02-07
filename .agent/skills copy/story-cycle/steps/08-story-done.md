# Step Skill: 08-story-done

> **Master Source**: `_bmad/bmb/workflows/story-cycle/steps/08-story-done.md` | **Step**: 8/9

---

## Trigger

```
story-done
/story-done
story done
complete story
mark done
```

---

## Parameters

```
story={story_key}    # Story key (required)
```

---

## description

Complete story, update all tracking files, and prepare handoff. Story Manager (SM) agent responsibility.

---

## Master Workflow Reference

**Full Instructions**: `_bmad/bmb/workflows/story-cycle/steps/08-story-done.md`

---

## Completion Checklist

- [ ] All acceptance criteria verified
- [ ] All tasks completed
- [ ] Tests passing (100%)
- [ ] TypeScript: 0 errors
- [ ] Code review: approved
- [ ] Documentation updated
- [ ] No blocking issues

---

## Final Story Update

```yaml
# Story file frontmatter
status: "done"
completed_at: {timestamp}
hours_actual: {actual_hours}
```

---

## Sprint Status Update

```yaml
# sprint-status.yaml
{story_key}:
  status: "done"
  completed_at: {timestamp}
  points_completed: {story_points}
```

---

## Handoff Artifact

```markdown
## 📋 STORY COMPLETE: {story_key}

**Status:** DONE ✅
**Completed At:** {timestamp}
**Actual Hours:** {actual} / {estimated}

### Summary:
- All acceptance criteria met
- Tests: {N}/{N} passing
- TypeScript: 0 errors
- Code review: approved

### Files Changed:
| File | Action | Lines |
|------|--------|-------|
| src/lib/x.ts | Created | 45 |
| src/lib/y.ts | Modified | +12/-3 |

### Time Breakdown:
| Phase | Hours |
|-------|-------|
| Pre-planning | 2 |
| Development | 4 |
| Code Review | 1 |
| **Total** | 7 |

### Lessons Learned:
{key insights for future stories}

### Next Actions:
- If last story of epic: Trigger retrospective (09-retrospective)
- If not: Continue with next story
```

---

## Epic Completion Check

If all stories in epic are done:
- Trigger `09-retrospective.md`

Otherwise:
- Continue with next story

---

## Output

- **Status Update**: `sprint-status.yaml` → `done`
- **Handoff Artifact**: `{story_key}-handoff.md`
- **Next Step**: `09-retrospective.md` (if epic complete) or next story

---

**See Also**: `07-code-review`, `09-retrospective`
