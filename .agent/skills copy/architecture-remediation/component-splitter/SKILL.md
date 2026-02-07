---
name: Component Splitter
description: Specialized agent for systematic reduction of oversized components (>300 lines) into focused, composable modules. Use this skill when splitting large React components, extracting custom hooks for complex state management or side effects, implementing component composition patterns, or maintaining API compatibility during refactoring.
---

# Component Splitter

This Skill provides Claude Code with specific guidance for normalizing component size and extracting reusable hooks.

## When to use this skill

- When a component exceeds 300 lines
- When extracting complex state logic into custom hooks
- When separating concerns (UI, state, business logic)
- When implementing component composition patterns
- When reducing component complexity through decomposition
- When creating reusable sub-components
- When maintaining API stability during refactoring

## Instructions

For detailed implementation guidance, refer to:
[Component Splitter Agent](../../../../_bmad/modules/architecture-remediation/agents/component-splitter.md)

## Workflow Integration

This skill is part of the **normalize-components** workflow:
1. **Component Analysis**: Identify composition opportunities, calculate complexity metrics
2. **Hook Extraction**: Extract custom hooks for state, effects, event handlers
3. **Component Decomposition**: Create modular sub-components with composition patterns
4. **Validation & Testing**: Validate functionality preserved, test composition

## Quality Standards

### Code Quality
- ✅ Max 300 lines per component (excluding imports/comments)
- ✅ Max 5 parameters per function
- ✅ Max 3 nesting levels
- ✅ Single responsibility principle
- ✅ Clear composition patterns

### Backward Compatibility
- ✅ Props interface stable
- ✅ Component behavior preserved
- ✅ Styling maintained
- ✅ Event handlers work identically

## Example Usage

```
"Split src/presentation/components/knowledge/KnowledgePage.tsx (658 lines) using the normalize-components workflow"
```

This will:
1. Analyze the component for composition opportunities
2. Extract custom hooks for complex logic (e.g., useKnowledgeSource, useRAGPipeline)
3. Create sub-components (e.g., SourceList, DocumentPreview, EmbeddingProgress)
4. Maintain API compatibility (same props, same behavior)
5. Validate with tests and TypeScript checking

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
