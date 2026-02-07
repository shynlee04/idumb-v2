# Utility: Audit Checkpoint

> **Master Source**: `_bmad/bmb/workflows/story-cycle/utils/_audit-checkpoint.md` | **Utility**

---

## Trigger

```
audit
/audit
audit checkpoint
quality check
```

---

## Parameters

```
story={story_key}    # Story key (required)
```

---

## description

Cross-cutting audit protocol that can be invoked at any point in the workflow to verify quality gates.

---

## Master Workflow Reference

**Full Documentation**: `_bmad/bmb/workflows/story-cycle/utils/_audit-checkpoint.md`

---

## Audit Categories

### 1. State Integrity
- [ ] Story file exists
- [ ] Context XML exists (if past step 3)
- [ ] Sprint status current
- [ ] No duplicate artifacts

### 2. Code Hygiene
- [ ] No `any` types without justification
- [ ] No console.log statements
- [ ] No commented-out code
- [ ] Proper error handling

### 3. Naming Conventions
- [ ] File names follow project conventions
- [ ] Function/variable names descriptive
- [ ] Component names match pattern
- [ ] Store names indicate domain

### 4. Dependencies
- [ ] No circular imports
- [ ] Dependencies are necessary
- [ ] Peer dependencies managed
- [ ] No deprecated packages

### 5. Integration
- [ ] API contracts honored
- [ ] Event system used correctly
- [ ] State management consistent
- [ ] Tests integration verified

### 6. Architecture
- [ ] Four-layer pattern followed
- [ ] Components <120 lines
- [ ] Stores properly sliced
- [ ] No god classes/functions

### 7. Mobile/Responsive (if UI)
- [ ] Mobile layouts defined
- [ ] Responsive breakpoints used
- [ ] Touch targets adequate
- [ ] No horizontal scroll

### 8. Internationalization
- [ ] All strings via t()
- [ ] No hardcoded text
- [ ] i18n keys consistent
- [ ] Translation files updated

### 9. Performance
- [ ] No unnecessary re-renders
- [ ] Lazy loading where appropriate
- [ ] No memory leaks
- [ ] Optimized bundles

### 10. Security
- [ ] No secrets in code
- [ ] Input validation present
- [ ] XSS prevention
- [ ] Proper authentication checks

### 11. Documentation
- [ ] Complex logic commented
- [ ] README updated if needed
- [ ] API documentation complete
- [ ] No TODO comments

### 12. Test Coverage
- [ ] Tests ≥80% coverage
- [ ] Tests are meaningful
- [ ] Edge cases covered
- [ ] No flaky tests

---

## Audit Report

```markdown
## Audit Checkpoint Report

**Story:** {story_key}
**Audit At:** {timestamp}

### Summary:
| Category | Score | Issues |
|----------|-------|--------|
| State Integrity | {N}/{N} | 0 |
| Code Hygiene | {N}/{N} | 2 |
| Naming | {N}/{N} | 0 |
| Dependencies | {N}/{N} | 1 |
| ... | ... | ... |

### Overall Score: {score}% ({PASS|FAIL|WARN})

### Critical Issues:
1. {issue} - {severity} - {fix}

### Minor Issues:
1. {issue} - {suggestion}

### Recommendations:
{actionable items}
```

---

## Integration

**Called from:**
- Any step (manual trigger)
- Automatic: Before code review (step 7)

---

**See Also**: `07-code-review`
