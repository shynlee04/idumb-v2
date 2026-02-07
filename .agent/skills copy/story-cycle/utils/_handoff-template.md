# Utility: Handoff Template

> **Master Source**: `_bmad/bmb/workflows/story-cycle/utils/_handoff-template.md` | **Utility**

---

## description

Standardized handoff artifact format for agent transitions between workflow steps.

---

## Master Workflow Reference

**Full Documentation**: `_bmad/bmb/workflows/story-cycle/utils/_handoff-template.md`

---

## Handoff Format

```markdown
## 📋 PHASE COMPLETE: {phase_name}

**Story:** {epic}-{story}-{slug}
**Status:** {new_status}
**Completed At:** {timestamp}

### Artifacts Updated:
- ✅ {file_path_1}
- ✅ {file_path_2}

### Summary:
{brief summary of what was accomplished}

### Decisions Made:
- {decision 1}: {rationale}
- {decision 2}: {rationale}

### Issues Encountered:
- {issue 1}: {resolution}
- {issue 2}: {resolution}

### Next Phase Requirements:
- Load: {next_agent}
- Execute: {next_workflow}
- Input: {artifact_paths}
```

---

## Example Handoffs

### 01 → 02 Handoff
```markdown
## 📋 PHASE COMPLETE: 01-create-story

**Story:** 21-3-fix-auth
**Status:** ready

### Artifacts Updated:
- ✅ _bmad-output/sprint-artifacts/21-3-fix-auth.md

### Summary:
Created story file with 5 acceptance criteria and 4 tasks.

### Decisions Made:
- Assigned to @bmad-bmm-dev agent
- Estimated 4 hours for implementation

### Next Phase Requirements:
- Load: SM agent
- Execute: 02-validate-story
- Input: 21-3-fix-auth.md
```

### 06 → 07 Handoff
```markdown
## 📋 PHASE COMPLETE: 06-dev-story

**Story:** 21-3-fix-auth
**Status:** review

### Artifacts Updated:
- ✅ _bmad-output/sprint-artifacts/21-3-fix-auth.md
- ✅ _bmad-output/sprint-artifacts/21-3-fix-auth-dev-record.md

### Summary:
All 4 tasks completed with TDD. 12 tests passing.

### Decisions Made:
- Used Zustand persist middleware for token storage
- Implemented AES-256-GCM encryption for API keys

### Issues Encountered:
- Initial encryption approach was too slow: switched to incremental

### Next Phase Requirements:
- Load: Dev/Reviewer agent
- Execute: 07-code-review
- Input: Story file + dev record
```

---

## Usage

Each step file ends with a handoff template that should be filled and passed to the next step.

---

**See Also**: Any step file (handoff section)
