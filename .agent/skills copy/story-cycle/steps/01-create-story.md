# Step Skill: 01-create-story

> **Master Source**: `_bmad/bmb/workflows/story-cycle/steps/01-create-story.md` | **Step**: 1/9

---

## Trigger

```
create-story
/create-story
new story
```

---

## Parameters

```
epic={N}           # Epic number (required)
story={N}          # Story number (optional, auto-increments)
```

---

## description

Create a new story file from epic backlog. Story Manager (SM) agent responsibility.

---

## Master Workflow Reference

**Full Instructions**: `_bmad/bmb/workflows/story-cycle/steps/01-create-story.md`

**Key Steps:**
1. Load epic definition from `epics.md`
2. Extract story template if available
3. Create story file at `{sprint_artifacts}/{epic}-{story}-{slug}.md`
4. Initialize with template structure
5. Update sprint status

---

## Story File Template

```markdown
---
epic: {N}
story: {N}
title: "{title}"
status: "backlog"
agent: "{agent}"
hours: {estimated_hours}
created_at: {timestamp}
---

## User Story

**As a** [user persona]
**I want** [action/feature]
**So that** [benefit/value]

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Tasks

- [ ] T1: Task description
- [ ] T2: Task description

## Dependencies

- {list dependencies}

## Notes

{additional notes}

## Dev Agent Record

_Initialized_

## History

| Date | Action | By |
|------|--------|-----|
| {timestamp} | Created | {agent} |
```

---

## Output

- **Story File**: `{sprint_artifacts}/{epic}-{story}-{slug}.md`
- **Status Update**: `sprint-status.yaml` → `backlog` → `ready`
- **Next Step**: `validate-story`

---

**See Also**: `02-validate-story`, `03-create-context`
