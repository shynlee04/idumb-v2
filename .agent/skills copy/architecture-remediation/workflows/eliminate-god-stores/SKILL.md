---
name: Eliminate God Stores
description: Systematic workflow for eliminating god stores (>300 lines) by extracting focused slices (≤120 lines each) while maintaining 100% backward compatibility. Use this workflow when refactoring Zustand stores, implementing Zustand v5 patterns, creating facade exports, or consolidating duplicate stores.
---

# Eliminate God Stores Workflow

This Workflow provides Claude Code with step-by-step guidance for refactoring god stores into modular slices.

## When to use this workflow

- When a Zustand store exceeds 300 lines (god store)
- When splitting stores into focused slices (≤120 lines each)
- When implementing Zustand v5 best practices (individual selectors, persist on combined store)
- When creating facade exports for backward compatibility
- When consolidating duplicate stores across the codebase

## Workflow Steps

### Step 1: Store Analysis (2-3 hours)
**Agent**: store-refactorer
**Input**: God store file path
**Output**: Analysis report with slice recommendations

**Acceptance Criteria**:
- [ ] Store size calculated (lines, functions, dependencies)
- [ ] Circular dependencies identified
- [ ] Slice boundaries recommended (≤120 lines each)
- [ ] Consumer usage mapped (who uses what)
- [ ] Migration strategy defined (facade, gradual, immediate)

### Step 2: Slice Extraction (4-8 hours)
**Agent**: store-refactorer
**Input**: Analysis report
**Output**: Slice files + unified store

**Acceptance Criteria**:
- [ ] All slice files created (≤120 lines each)
- [ ] Slice state interfaces defined
- [ ] Slice actions implemented (single responsibility)
- [ ] JSDoc comments added for all public methods
- [ ] Zero circular imports between slices
- [ ] Unified store composed with all slices
- [ ] Individual selectors exported (Zustand v5 pattern)

### Step 3: Migration Execution (3-6 hours)
**Agent**: store-refactorer
**Input**: Unified store + consumer list
**Output**: Facade export + updated consumers

**Acceptance Criteria**:
- [ ] Facade export created in old location
- [ ] Zero TypeScript errors
- [ ] Zero test failures (100% pass rate)
- [ ] All consumers still work (backwards compatible)
- [ ] Documentation updated (CLAUDE.md)

### Step 4: Validation & Cleanup (1-2 hours)
**Agent**: store-refactorer
**Input**: Migrated store + updated consumers
**Output**: Validation report

**Acceptance Criteria**:
- [ ] Main component size ≤300 lines
- [ ] All slices ≤120 lines
- [ ] Zero TypeScript errors
- [ ] Zero test failures
- [ ] Zero breaking changes (API stable)
- [ ] Test coverage ≥80%
- [ ] Documentation updated

## Example Usage

```
"Split src/lib/state/rag-store.ts using the eliminate-god-stores workflow"
```

## Validation Commands

```bash
# TypeScript check (incremental, excludes test files)
pnpm tsc --noEmit --incremental

# Test suite
pnpm test

# Coverage check
pnpm test -- --coverage
```

## Success Criteria

- ✅ Store size: ≤120 lines per slice
- ✅ Functions per slice: ≤10
- ✅ Dependencies per slice: ≤5
- ✅ TypeScript errors: 0 new errors
- ✅ Test pass rate: 100%
- ✅ Test coverage: ≥80%
- ✅ Zero breaking changes (backwards compatible)

## Artifacts

For detailed workflow documentation, refer to:
[Eliminate God Stores Workflow](../../../../_bmad/modules/architecture-remediation/workflows/eliminate-god-stores.md)
