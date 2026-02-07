---
description: Run validation gate for phase completion in Notes Remediation
---

# Validate Phase Workflow

## Usage

```bash
/validate-phase phase_0
/validate-phase phase_1
/validate-phase phase_2
```

## Phase 0 Validation

### Automated Checks

```bash
# 1. TypeScript compilation
pnpm exec tsc --noEmit
echo "✅ TypeScript: PASSED" || echo "❌ TypeScript: FAILED"

# 2. Build
pnpm build
echo "✅ Build: PASSED" || echo "❌ Build: FAILED"

# 3. Tests
pnpm test
echo "✅ Tests: PASSED" || echo "❌ Tests: FAILED"
```

### Manual Checks

| Check | Steps | Expected Result |
|-------|-------|-----------------|
| AI Magic Works | Open /notes → Type `/ai` or `/magic` → Enter prompt | Real AI content appears (not mock) |
| Agent Used | Check console for `[NoteAIService] Calling...` | Shows provider/model from selected agent |
| Error Handling | Remove API key from settings → Use AI Magic | Shows error message, not crash |
| Note Switching | Create 2 notes → Click between them | Content updates immediately |
| No Refresh Needed | Switch notes 5 times | Never need to refresh page |

### Update LOOP_STATE.yaml

```yaml
validation_gates:
  phase_0:
    passed: true
    validated_at: "2025-12-31T..."
    notes: "All automated and manual checks passed"
    
phase_status:
  phase_0: "DONE"
  phase_1: "IN_PROGRESS"
```

---

## Phase 1 Validation

### Automated Checks

Same as Phase 0, plus:

```bash
# All Phase 0 checks still pass
pnpm exec tsc --noEmit && pnpm build && pnpm test
```

### Manual Checks

| Check | Steps | Expected Result |
|-------|-------|-----------------|
| Agent Dialog Shows Agent | Open AI Magic dialog | Shows "AI Magic via [Agent Name]" |
| Agent Switch Effect | Change agent → Use AI Magic | Different response style/quality |
| Text Selection Menu | Select text in note | Floating AI menu appears |
| Transform Actions | Select text → Click "Summarize" | Text is replaced with summary |
| Command Palette | Type `/summarize-note` | Full note summary generated |
| Loading States | Use any AI action | Spinner/loading indicator shown |

### Update LOOP_STATE.yaml

```yaml
validation_gates:
  phase_1:
    passed: true
    validated_at: "2026-01-02T..."
    notes: "All AI features functional, transform menu working"
    
phase_status:
  phase_1: "DONE"
  phase_2: "IN_PROGRESS"
```

---

## Phase 2 Validation

### Automated Checks

```bash
# All previous checks
pnpm exec tsc --noEmit && pnpm build && pnpm test

# Sweeping Validation L1-L6 (if available)
# pnpm run sweeping-validation --levels 1-6
```

### Manual Checks

| Check | Steps | Expected Result |
|-------|-------|-----------------|
| Export Note | Right-click note → Export | Markdown file created in project |
| Import Markdown | Click Import → Select .md file | New note created with content |
| Batch Export | Select "Export All" | All notes exported to directory |
| Event Emission | Create note → Check console | `[StoreEvents] note:created` logged |
| Cross-Workspace | Open Knowledge → Check sources | Notes appear as available sources |

### Update LOOP_STATE.yaml

```yaml
validation_gates:
  phase_2:
    passed: true
    validated_at: "2026-01-05T..."
    notes: "Full ecosystem integration complete"
    
phase_status:
  phase_2: "DONE"
  
completion_signal: true
```

---

## Validation Failure Handling

If any check fails:

1. **Document the failure:**
   ```yaml
   validation_gates:
     phase_X:
       passed: false
       validated_at: "..."
       notes: "FAILED: [description of failure]"
   ```

2. **Identify the story:**
   - Which story's acceptance criteria failed?
   - Is it a regression from a previous story?

3. **Loop back:**
   - Set story status back to "IN_PROGRESS"
   - Fix the issue
   - Re-run validation

4. **If blocked:**
   - Document in `errors` section of LOOP_STATE.yaml
   - Create issue/bug report if needed
   - Proceed with other stories if possible

---

## Completion Checklist

When all phases pass:

- [ ] All 8 stories have status: "DONE"
- [ ] All 3 validation gates: passed: true
- [ ] completion_signal: true
- [ ] Update bmm-workflow-status.yaml with results
- [ ] Close Sprint Change Proposal SCP-NOTES-2025-12-31
- [ ] Celebrate! 🎉
