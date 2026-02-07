# Step Skill: 02-validate-story

> **Master Source**: `_bmad/bmb/workflows/story-cycle/steps/02-validate-story.md` | **Step**: 2/9

---

## Trigger

```
validate-story
/validate-story
validate story
```

---

## Parameters

```
story={story_key}    # Story key (required)
```

---

## description

Validate story file is 100% complete before proceeding to context creation. Story Manager (SM) agent responsibility.

---

## Master Workflow Reference

**Full Instructions**: `_bmad/bmb/workflows/story-cycle/steps/02-validate-story.md`

**Validation Checklist:**
- [ ] Story file exists at correct path
- [ ] User story format complete (As a/I want/So that)
- [ ] At least 3 acceptance criteria defined
- [ ] Tasks list is populated
- [ ] Dependencies are documented
- [ ] Metadata (epic, story, agent, hours) is complete

---

## Validation Report Template

```markdown
## Story Validation Report

**Story:** {story_key}
**Validated At:** {timestamp}

### Validation Results:

| Criterion | Status | Notes |
|-----------|--------|-------|
| File exists | ✅ | |
| User story format | ✅ | |
| Acceptance criteria ≥3 | ✅ | |
| Tasks populated | ✅ | |
| Dependencies documented | ✅ | |
| Metadata complete | ✅ | |

### Overall: {PASS|FAIL}

### If FAIL:
- List specific missing items
- Return to 01-create-story for fixes
```

---

## On Validation Fail

1. Return to previous step
2. Fix identified issues
3. Re-run validation
4. Only proceed when 100% pass

---

## Output

- **Validation Report**: Added to story file
- **Status Update**: `sprint-status.yaml` → `validated`
- **Next Step**: `03-create-context.md` (on pass)
- **Loop**: Back to `01-create-story` (on fail)

---

**See Also**: `01-create-story`, `03-create-context`
