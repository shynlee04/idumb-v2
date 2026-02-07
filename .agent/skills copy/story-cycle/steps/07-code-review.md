# Step Skill: 07-code-review

> **Master Source**: `_bmad/bmb/workflows/story-cycle/steps/07-code-review.md` | **Step**: 7/9

---

## Trigger

```
code-review
/code-review
code review
review
```

---

## Parameters

```
story={story_key}    # Story key (required)
focus={area}         # Optional focus area
```

---

## description

Multi-agent code review with quality gates. Developer/Reviewer agent responsibility.

---

## Master Workflow Reference

**Full Instructions**: `_bmad/bmb/workflows/story-cycle/steps/07-code-review.md`

---

## Review Checklist

### Design Compliance
- [ ] Follows 4-layer architecture
- [ ] Component size limits respected
- [ ] Store patterns (Zustand slices)
- [ ] No circular dependencies

### Code Quality
- [ ] TypeScript (production code only)
- [ ] No `any` types without justification
- [ ] Meaningful naming
- [ ] DRY principles followed

### UI/UX (if applicable)
- [ ] 8-bit design (no glassmorphism)
- [ ] Responsive design
- [ ] No hardcoded strings (i18n)
- [ ] Accessibility considerations

### Testing
- [ ] Tests ≥80% coverage
- [ ] Tests are meaningful
- [ ] Edge cases covered
- [ ] No flaky tests

### Documentation
- [ ] Comments for complex logic
- [ ] No commented-out code
- [ ] Self-documenting where possible

---

## Review Report Template

```markdown
## Code Review Report

**Story:** {story_key}
**Reviewed At:** {timestamp}
**Reviewer:** {agent}

### Files Reviewed:
| File | Lines | Issues |
|------|-------|--------|
| src/lib/x.ts | 45 | 0 |
| src/lib/y.ts | 120 | 2 (minor) |

### Design Review: {PASS|FAIL}
### Code Quality: {PASS|FAIL}
### UI/UX Review: {PASS|FAIL} (if applicable)
### Testing Review: {PASS|FAIL}
### Documentation Review: {PASS|FAIL}

### Issues Found:
| Severity | File | Line | Issue | Fix |
|----------|------|------|-------|-----|
| minor | src/lib/x.ts | 23 | Naming | Rename variable |

### Overall: {APPROVE|REQUEST_CHANGES}

### Comments:
{reviewer comments}
```

---

## On Pass

Proceed to `08-story-done.md`

---

## On Fail

Loop back to `06-dev-story.md` with specific fixes required.

---

## Output

- **Code Review Report**: Added to story file
- **Status Update**: `sprint-status.yaml` → `reviewed`
- **Next Step**: `08-story-done.md` (on pass)
- **Loop**: Back to `06-dev-story.md` (on fail)

---

**See Also**: `06-dev-story`, `08-story-done`
