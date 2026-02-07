# Step Skill: 06-dev-story

> **Master Source**: `_bmad/bmb/workflows/story-cycle/steps/06-dev-story.md` | **Step**: 6/9

---

## Trigger

```
dev-story
/dev-story
develop story
implementation
```

---

## Parameters

```
story={story_key}    # Story key (required)
```

---

## description

TDD implementation with validation at each task. Developer agent responsibility.

---

## Master Workflow Reference

**Full Instructions**: `_bmad/bmb/workflows/story-cycle/steps/06-dev-story.md`

---

## TDD Cycle (Red-Green-Refactor)

### For Each Task: Follow Red-Green-Refactor

#### Red: Write Failing Test
```bash
# Create test file first
WRITE: src/{path/to/file}.test.ts

# Run test - should fail
pnpm test {file}.test.ts
```

#### Green: Write Minimum Code
```bash
# Write just enough to pass
WRITE: src/{path/to/file}.ts

# Run test - should pass
pnpm test {file}.test.ts
```

#### Refactor: Clean Up
```bash
# Improve code while keeping tests green
# Extract, rename, simplify
pnpm test {file}.test.ts
```

---

## Quality Gates

**Before marking tasks complete:**

- [ ] Test written first (TDD)
- [ ] Test fails initially (red)
- [ ] Code passes test (green)
- [ ] Code refactored (still green)
- [ ] No TypeScript errors
- [ ] No console warnings
- [ ] Follows architecture patterns
- [ ] Within size limits

---

## Dev Agent Record

Update in story file:

```markdown
### Dev Agent Record

**Agent:** {model_name}
**Session:** {timestamp}
**Started At:** {timestamp}

#### Task Progress:
- [x] T1: {task} - {notes}
- [x] T2: {task} - {notes}
- [x] T3: {task} - {notes}

#### Research Executed:
- Context7: {query} → {finding}
- DeepWiki: {repo} → {pattern}

#### Files Changed:
| File | Action | Lines |
|------|--------|-------|
| src/lib/x.ts | Created | 45 |
| src/lib/y.ts | Modified | +12/-3 |

#### Tests Created:
- x.test.ts: 5 tests, all passing
- y.test.ts: 3 tests, all passing

#### Decisions Made:
- Decision 1: {rationale}
- Decision 2: {rationale}

#### TypeScript Check:
✅ PASS - 0 errors in production code

#### Test Results:
✅ PASS - {N}/{N} tests passing
```

---

## Full Test Suite

After all tasks complete:

```bash
# TypeScript check (production code only)
pnpm typecheck

# Full test suite
pnpm test
```

**Both must pass before proceeding.**

---

## On Error

### TypeScript Errors
1. Count errors: `pnpm typecheck 2>&1 | grep -v '.test.' | wc -l`
2. Fix each error
3. Re-run until 0 errors

### Test Failures
1. Identify failing test
2. Debug failure reason
3. Fix implementation or test
4. Re-run until all pass

### Blocked
1. Document blocker in story file
2. Update status to `blocked`
3. Notify with specific issue
4. Suggest: defer / split / escalate

---

## Output

- **Status Update**: `sprint-status.yaml` → `review`
- **Dev Agent Record**: Complete in story file
- **Next Step**: `07-code-review.md`

---

**See Also**: `05-pre-planning`, `07-code-review`, `utils/_correct-course`
