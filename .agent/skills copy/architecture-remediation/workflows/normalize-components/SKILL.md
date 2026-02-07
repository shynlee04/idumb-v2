---
name: Normalize Components
description: Systematic workflow for reducing oversized components (>300 lines) into focused, composable modules through hook extraction and component decomposition. Use this workflow when splitting large React components, extracting custom hooks, or implementing component composition patterns.
---

# Normalize Components Workflow

This Workflow provides Claude Code with step-by-step guidance for normalizing component size.

## When to use this workflow

- When a React component exceeds 300 lines
- When extracting complex state logic into custom hooks
- When separating concerns (UI, state, business logic)
- When implementing component composition patterns
- When reducing component complexity through decomposition

## Workflow Steps

### Step 1: Component Analysis (1-2 hours)
**Agent**: component-splitter
**Input**: Oversized component file path
**Output**: Analysis report with refactoring recommendations

**Acceptance Criteria**:
- [ ] Component size calculated (lines, props, hooks, nesting depth)
- [ ] Composition opportunities identified (nested components, repeated logic)
- [ ] Hook extraction candidates identified (state, effects, event handlers)
- [ ] Concern separation planned (UI, state, business logic)
- [ ] Consumer impact assessed (who uses this component)

### Step 2: Hook Extraction (2-4 hours)
**Agent**: component-splitter
**Input**: Analysis report
**Output**: Custom hooks for complex logic

**Acceptance Criteria**:
- [ ] Custom hooks created for state management
- [ ] Custom hooks created for side effects
- [ ] Custom hooks created for event handlers
- [ ] Hook dependencies properly managed
- [ ] Hook cleanup implemented where needed
- [ ] Hooks tested independently

### Step 3: Component Decomposition (3-6 hours)
**Agent**: component-splitter
**Input**: Component with extracted hooks
**Output**: Modular sub-components

**Acceptance Criteria**:
- [ ] Sub-components created for UI sections
- [ ] Composition patterns implemented (render props, children)
- [ ] Props interface stable (backward compatible)
- [ ] Component behavior preserved
- [ ] Styling maintained (design tokens, CSS)
- [ ] Event handlers work identically

### Step 4: Validation & Testing (1-2 hours)
**Agent**: component-splitter
**Input**: Refactored components
**Output**: Validation report

**Acceptance Criteria**:
- [ ] All components ≤300 lines
- [ ] Zero TypeScript errors
- [ ] Zero test failures (100% pass rate)
- [ ] Component behavior validated (manual testing)
- [ ] Props interface stable
- [ ] Custom hooks tested

## Example Usage

```
"Split src/presentation/components/knowledge/KnowledgePage.tsx using the normalize-components workflow"
```

## Validation Commands

```bash
# TypeScript check
pnpm tsc --noEmit --incremental

# Test suite
pnpm test

# Component size verification
find src/presentation/components -name "*.tsx" -exec wc -l {} \; | awk '$1 > 300 {print $2, $1, "lines"}'
```

## Success Criteria

- ✅ All components ≤300 lines
- ✅ Zero TypeScript errors
- ✅ 100% test pass rate
- ✅ Props interface stable
- ✅ Component behavior preserved
- ✅ Custom hooks tested independently
- ✅ Styling maintained (design tokens)

## Artifacts

For detailed workflow documentation, refer to:
[Normalize Components Workflow](../../../../_bmad/modules/architecture-remediation/workflows/normalize-components.md)
