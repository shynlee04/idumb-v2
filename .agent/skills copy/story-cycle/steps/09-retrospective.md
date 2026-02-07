# Step Skill: 09-retrospective

> **Master Source**: `_bmad/bmb/workflows/story-cycle/steps/09-retrospective.md` | **Step**: 9/9

---

## Trigger

```
retrospective
/retrospective
retro
epic retrospective
```

---

## Parameters

```
epic={N}           # Epic number (required)
```

---

## description

Epic-level retrospective when all stories are complete. Story Manager (SM) agent responsibility.

---

## Master Workflow Reference

**Full Instructions**: `_bmad/bmb/workflows/story-cycle/steps/09-retrospective.md`

---

## Trigger Condition

All stories in epic must be marked `done` in `sprint-status.yaml`.

---

## Retrospective Sections

### 1. Epic Summary

```markdown
## Epic {N}: {Epic Title}

**Started:** {start_date}
**Completed:** {end_date}
**Duration:** {N} days
**Total Stories:** {N}
**Completed:** {N}/{N}
**Total Hours:** {actual}/{estimated}
```

### 2. Velocity Analysis

```markdown
### Velocity

| Metric | Planned | Actual | Variance |
|--------|---------|--------|----------|
| Stories | {N} | {N} | {±N} |
| Hours | {N} | {N} | {±N} |
| Points | {N} | {N} | {±N} |

### Sprint Velocity Trend:
- Sprint {N-1}: {N} points
- Sprint {N}: {N} points
- Trend: {up|down|stable}
```

### 3. Story Completion Analysis

```markdown
### Story Completion

| Story | Status | Hours | Notes |
|-------|--------|-------|-------|
| {epic}-{story}-{slug} | done | {N} | On track |
| {epic}-{story}-{slug} | done | {N+2} | +2 hours |

### Blockers Encountered:
- {blocker 1}
- {blocker 2}
```

### 4. Quality Metrics

```markdown
### Quality

| Metric | Value | Target |
|--------|-------|--------|
| Test Coverage | {N}% | ≥80% |
| TypeScript Errors | {N} | 0 |
| Code Review Approvals | {N}/{N} | 100% |
| Re-work Required | {N} | Minimize |

### Technical Debt:
- {debt item 1}
- {debt item 2}
```

### 5. What Went Well

```markdown
### Successes

1. **{item}**
   - {description}
   - Impact: {positive effect}

2. **{item}**
   - {description}
   - Impact: {positive effect}
```

### 6. What Could Improve

```markdown
### Improvements Needed

1. **{item}**
   - Current: {what happens now}
   - Better: {what should happen}
   - Action: {specific improvement}

2. **{item}**
   - Current: {what happens now}
   - Better: {what should happen}
   - Action: {specific improvement}
```

### 7. Action Items

```markdown
### Action Items

| Priority | Item | Owner | Sprint |
|----------|------|-------|--------|
| P0 | {action} | {who} | {N+1} |
| P1 | {action} | {who} | {N+1} |
| P2 | {action} | {who} | {N+2} |
```

---

## Output

- **Retrospective Document**: `{sprint_artifacts}/epic-{N}-retrospective.md`
- **Sprint Metrics**: Added to `sprint-status.yaml`
- **Action Items**: Tracked for next sprint

---

## Next Epic

After retrospective:
1. Review action items
2. Plan next epic
3. Begin with `01-create-story`

---

**See Also**: `08-story-done`, `01-create-story`
