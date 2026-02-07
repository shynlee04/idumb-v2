---
name: TypeScript Fixer
description: Specialized agent for systematic reduction of TypeScript errors through categorized batch fixing and pattern identification. Use this skill when fixing TypeScript errors in batches (50-100 per session), categorizing errors by type (missing imports, wrong types, circular deps), identifying error patterns, or applying incremental TypeScript checking.
---

# TypeScript Fixer

This Skill provides Claude Code with specific guidance for reducing TypeScript errors systematically.

## When to use this skill

- When TypeScript error count is high (>100 errors)
- When fixing errors in categorized batches
- When identifying and fixing error patterns
- When applying incremental TypeScript checking (excludes test files)
- When fixing missing imports, wrong types, or circular dependencies
- When eliminating `any` types for strict typing

## Instructions

For detailed implementation guidance, refer to:
[TypeScript Fixer Agent](../../../../_bmad/modules/architecture-remediation/agents/typescript-fixer.md)

## Workflow Integration

This skill is part of the **fix-typescript-errors** workflow:
1. **Error Analysis**: Categorize errors by type, prioritize by severity, identify patterns
2. **Batch Fixing**: Fix 50-100 errors per session, apply pattern-based fixes
3. **Validation**: Validate with incremental TypeScript, ensure zero regression
4. **Documentation**: Document error patterns and solutions, track metrics

## Important Strategy

### Test File Errors: IGNORE
**Directive**: Ignore TypeScript errors in `*.test.ts`, `*.test.tsx`, `__tests__/` directories.

**Reasoning**: Test file errors are NON-BLOCKING. Focus production effort on code files only.

**Validation Command**:
```bash
# Incremental check (excludes test files)
pnpm tsc --noEmit --incremental

# Filter out test file errors
pnpm tsc --noEmit 2>&1 | grep -v "\.test\." | grep -v "__tests__"
```

### Code Files: ENFORCE
- All TypeScript errors in production code MUST be addressed
- Use incremental checking for faster validation
- Track error reduction metrics

## Quality Standards

### Error Categorization
- **P0**: Compilation blockers (missing imports, wrong types)
- **P1**: Type safety issues (any types, implicit any)
- **P2**: Circular dependencies
- **P3**: Style issues (unused vars, missing returns)

### Batch Fixing Strategy
- ✅ Fix 50-100 errors per session (sustainable pace)
- ✅ Apply pattern-based fixes (common error types)
- ✅ Validate after each batch (zero regression)
- ✅ Document error patterns for future reference

## Example Usage

```
"Fix the next 50 TypeScript errors using the fix-typescript-errors workflow"
```

This will:
1. Categorize errors by type (imports, types, circular deps)
2. Identify common patterns (e.g., missing React imports, wrong prop types)
3. Apply batch fixes (auto-import, type annotations, eliminate any)
4. Validate with incremental TypeScript (excludes test files)
5. Track error reduction metrics

## Validation Commands

```bash
# Incremental TypeScript check (excludes test files)
pnpm tsc --noEmit --incremental

# Count errors (code files only)
pnpm tsc --noEmit 2>&1 | grep -v "\.test\." | grep -v "__tests__" | wc -l

# Show error summary by type
pnpm tsc --noEmit 2>&1 | grep -v "\.test\." | grep -v "__tests__" | sort | uniq -c
```

## Success Criteria

- ✅ Reduced error count by target amount (e.g., 100 → 50)
- ✅ Zero new errors introduced
- ✅ All P0 compilation blockers fixed
- ✅ Pattern-based fixes documented
- ✅ Test suite still passes (100% pass rate)
