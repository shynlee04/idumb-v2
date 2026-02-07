# Utility: Correct Course

> **Master Source**: `_bmad/bmb/workflows/story-cycle/utils/_correct-course.md` | **Utility**

---

## Trigger

```
correct-course
/correct-course
correct course
recovery
fix story
```

---

## Parameters

```
story={story_key}    # Story key (required)
```

---

## description

Recovery handler when story is stuck or validation fails. Triggered when:
- Story exceeds 2x timebox estimate
- Validation loop count >3 on same step
- Unresolvable blockers identified

---

## Master Workflow Reference

**Full Documentation**: `_bmad/bmb/workflows/story-cycle/utils/_correct-course.md`

---

## When to Trigger

### Automatic Triggers
- Story exceeds 2x timebox estimate
- Validation loop count >3 on same step
- Unresolvable blockers identified

### Manual Triggers
- User requests `/correct-course {story_key}`
- Agent detects fundamental issues

---

## Course Correction Process

### 1. Pause Current Workflow

```yaml
# Update story status
{story_key}:
  status: "needs-course-correction"
  paused_at: {timestamp}
  paused_step: {current_step}
```

### 2. Assess Situation

```markdown
## Course Correction Assessment

**Story:** {story_key}
**Assessed At:** {timestamp}
**Trigger:** {reason_for_correction}

### Current State
- Step: {current_step}
- Attempts: {N}
- Time elapsed: {actual}/{estimated} hours
- Blockers: {list}

### Issues Identified
1. {issue_1}
   - Severity: {critical|major|minor}
   - Impact: {what_it_blocks}
   - Attempts: {N} tries to resolve
```

### 3. Propose Options

#### Option A: Split Story
**When:** Story is too large or complex
**Action:**
- Identify clean split point
- Create 2-3 smaller stories
- Link dependencies
- Close current story as "split"

#### Option B: Defer to Next Sprint
**When:** External blockers, insufficient information
**Action:**
- Document current state
- Move to backlog
- Set prerequisites for resumption

#### Option C: Escalate to Architect
**When:** Fundamental design issues, pattern uncertainty
**Action:**
- Create architect ticket
- Provide full context
- Await resolution before continuing

#### Option D: Reduce Scope
**When:** Timebox exceeded, can ship partial value
**Action:**
- Identify must-have ACs
- Move nice-to-haves to new story
- Complete with reduced scope

#### Option E: Continue with Acknowledged Risk
**When:** Issue is minor, acceptable workaround exists
**Action:**
- Document risk
- Implement workaround
- Add tech debt item to address later

### 4. Execute Decision

Based on user selection:

```yaml
# Update story with course correction
course_correction:
  triggered_at: {timestamp}
  issue: {description}
  option_selected: {A|B|C|D|E}
  decision_maker: {user|agent}
  notes: {additional_context}
```

### 5. Resume or Terminate

```yaml
# If resuming
{story_key}:
  status: "in-progress"
  course_correction_complete: true
  resumed_at: {timestamp}

# If terminating
{story_key}:
  status: {deferred|split|blocked}
  course_correction_complete: true
  closed_at: {timestamp}
```

---

## Course Correction Template

```markdown
## Course Correction Report

**Story:** {story_key}
**Date:** {timestamp}

### Trigger
{why_correction_was_needed}

### Assessment
{analysis_of_situation}

### Options Presented
1. **Split Story** - {pros/cons}
2. **Defer** - {pros/cons}
3. **Escalate** - {pros/cons}
4. **Reduce Scope** - {pros/cons}
5. **Continue** - {pros/cons}

### Decision
**Selected:** Option {X}
**By:** {user|agent}
**Reasoning:** {why_this_option}

### Outcome
{result_of_correction}

### Next Steps
{what_happens_next}
```

---

## Integration

- **Manual trigger**: `/correct-course {story_key}`
- **Automatic**: Timebox exceeded, validation loop
- **Called by**: Any step that detects blocking issues

---

**See Also**: Any step file (for on_fail handlers)
