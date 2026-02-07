---
name: Store Refactorer
description: Specialized agent for systematic elimination of god stores (>300 lines) by extracting focused slices (≤120 lines each) while maintaining 100% backward compatibility. Use this skill when refactoring Zustand stores, splitting god classes into modular slices, implementing Zustand v5 patterns (individual selectors, persist on combined store), creating facade exports for backward compatibility, or migrating legacy stores to modern architecture.
---

# Store Refactorer

This Skill provides Claude Code with specific guidance for refactoring god stores into modular, maintainable slices.

## When to use this skill

- When a store exceeds 300 lines (god store)
- When splitting Zustand stores into focused slices (≤120 lines each)
- When implementing Zustand v5 best practices (individual selectors, no destructuring)
- When creating facade exports for backward compatibility
- When consolidating duplicate stores across the codebase
- When eliminating circular dependencies between stores
- When applying Dexie persistence with partialize for selective persistence

## Instructions

For detailed implementation guidance, refer to:
[Store Refactorer Agent](../../../../_bmad/modules/architecture-remediation/agents/store-refactorer.md)

## Workflow Integration

This skill is part of the **eliminate-god-stores** workflow:
1. **Store Analysis**: Calculate size, identify circular dependencies, recommend slice boundaries
2. **Slice Extraction**: Extract focused slices (≤120 lines each) with single responsibility
3. **Store Unification**: Create unified store with composed slices
4. **Migration Execution**: Create facade exports, update consumers, validate
5. **Validation & Cleanup**: Verify zero breaking changes, update documentation

## Quality Standards

### Code Quality
- ✅ Max 120 lines per slice (excluding imports/comments)
- ✅ Max 10 functions per slice
- ✅ Max 5 dependencies per slice
- ✅ Individual selectors (Zustand v5 pattern)
- ✅ Persist on combined store (not per slice)
- ✅ Partialize for selective persistence

### Backward Compatibility
- ✅ Zero breaking changes (facade exports)
- ✅ All old imports still work
- ✅ Consumer migration is optional
- ✅ API stability maintained

## Example Usage

```
"Analyze and split src/lib/state/rag-store.ts using the eliminate-god-stores workflow"
```

This will:
1. Analyze the god store (1,595 lines)
2. Recommend slice boundaries (e.g., document-crud, chunk-management, embedding-ops)
3. Extract slices (≤120 lines each)
4. Create unified store with composed slices
5. Create facade export for backward compatibility
6. Validate with incremental TypeScript checking

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

- ✅ All slices ≤120 lines
- ✅ Zero TypeScript errors (code files only)
- ✅ 100% test pass rate
- ✅ ≥80% test coverage
- ✅ Zero breaking changes
- ✅ Documentation updated (AGENTS.md, CLAUDE.md)
