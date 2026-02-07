# Story Cycle Utilities - Index

> **Master**: `_bmad/bmb/workflows/story-cycle/utils/`

## Available Utilities

| Utility | File | description |
|---------|------|---------|
| **Stale Check** | `_stale-check.md` | Validate file freshness before development |
| **Correct Course** | `_correct-course.md` | Recovery handler when story is stuck |
| **Audit Checkpoint** | `_audit-checkpoint.md` | Cross-cutting quality audit |
| **Handoff Template** | `_handoff-template.md` | Standardized agent handoff format |

## Usage

### Stale Check
```bash
# Check context freshness
stale-check context=_bmad-output/sprint-artifacts/S-001-context.xml

# Used in step 04-validate-context
LOAD: utils/_stale-check.md
EXECUTE: check_freshness(context_file_path)
```

### Correct Course
```bash
# Trigger recovery workflow
/correct-course story=S-001

# Used when:
# - Story exceeds 2x timebox
# - Validation loop >3 attempts
# - Unresolvable blockers
```

### Audit Checkpoint
```bash
# Run quality audit
audit story=S-001

# Used before code review
# Cross-cutting at any point
```

### Handoff Template
```markdown
## 📋 PHASE COMPLETE: {phase_name}

**Story:** {story_key}
**Status:** {new_status}

### Artifacts Updated:
- ✅ {file}

### Next Phase Requirements:
- Load: {next_agent}
- Execute: {next_workflow}
```

---

**See Also**: `../SKILL.md` (main skill), `../steps/` (workflow steps)
