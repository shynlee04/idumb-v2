# Step Skill: 04-validate-context

> **Master Source**: `_bmad/bmb/workflows/story-cycle/steps/04-validate-context.md` | **Step**: 4/9

---

## Trigger

```
validate-context
/validate-context
validate context
check context
```

---

## Parameters

```
story={story_key}    # Story key (required)
```

---

## description

Validate context XML file with freshness check. Ensures referenced files haven't changed. Story Manager (SM) agent responsibility.

---

## Master Workflow Reference

**Full Instructions**: `_bmad/bmb/workflows/story-cycle/steps/04-validate-context.md`

**Validation Includes:**
1. XML structure validation
2. Referenced files existence check
3. **Stale check** (see utils/_stale-check.md)
4. Architecture pattern consistency

---

## Calls Utility

**Stale Check**: `_bmad/bmb/workflows/story-cycle/utils/_stale-check.md`

A file is considered **stale** if:
1. Last modified >24 hours ago AND not explicitly acknowledged
2. Has uncommitted changes in git
3. Context file timestamp is older than referenced source files

---

## Validation Report Template

```markdown
## Context Validation Report

**Story:** {story_key}
**Context File:** {context_file}
**Validated At:** {timestamp}

### XML Structure: ✅
### Files Referenced: {N}/{N} found
### Freshness Check:
| File | Modified | Status |
|------|----------|--------|
| src/lib/x.ts | 2h ago | ✅ Current |
| src/lib/y.ts | 3d ago | ⚠️ Stale |

### Overall: {PASS|FAIL|WARN}

### Actions Required:
{if stale files exist}
- Option 1: Refresh context (re-run 03-create-context)
- Option 2: Acknowledge stale state (document reason)
- Option 3: Defer story (wait for files to stabilize)
```

---

## On Stale Context

1. **Refresh Context**: Re-run step 03 (create-context)
2. **Acknowledge**: Document why stale state is acceptable
3. **Defer**: Pause story until files stabilize

---

## Output

- **Validation Report**: Added to handoff artifact
- **Status Update**: `sprint-status.yaml` → `ready-for-implementation`
- **Next Step**: `05-pre-planning.md` (on pass)

---

**See Also**: `03-create-context`, `05-pre-planning`, `utils/_stale-check`
