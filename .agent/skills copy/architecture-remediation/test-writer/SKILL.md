---
name: Test Writer
description: Specialized agent for systematic improvement of test coverage from current baseline to ≥80%. Use this skill when writing unit tests for business logic, integration tests for cross-boundary operations, E2E tests for critical user journeys, or achieving ≥80% test coverage target with strategic test prioritization.
---

# Test Writer

This Skill provides Claude Code with specific guidance for improving test coverage systematically.

## When to use this skill

- When test coverage is below 80% (current: 16.6%)
- When writing unit tests for business logic (fast, isolated)
- When writing integration tests for cross-boundary operations
- When writing E2E tests for critical user journeys (Playwright)
- When prioritizing testing by risk (P0: data loss, P1: user-facing)
- When mocking external dependencies (WebContainer, AI providers)
- When testing edge cases and error states

## Instructions

For detailed implementation guidance, refer to:
[Test Writer Agent](../../../../_bmad/modules/architecture-remediation/agents/test-writer.md)

## Workflow Integration

This skill follows the testing-test-writing workflow:
1. **Coverage Analysis**: Identify untested critical paths, calculate coverage metrics, prioritize by risk
2. **Test Writing**: Write unit tests for business logic, integration tests for boundaries, E2E tests for critical journeys
3. **Test Quality**: Follow best practices (AAA pattern, descriptive names), mock external dependencies, test edge cases
4. **Validation**: Run test suite (100% pass rate), measure coverage, ensure no regression

## Quality Standards

### Test Coverage Target
- ✅ **Target**: ≥80% coverage (current: 16.6%)
- ✅ **Unit Tests**: Business logic, utilities, pure functions
- ✅ **Integration Tests**: Store + component interactions
- ✅ **E2E Tests**: Critical user journeys (login, file operations, AI chat)

### Test Quality
- ✅ AAA pattern (Arrange, Act, Assert)
- ✅ Descriptive test names (should [expected behavior] when [state/context])
- ✅ Mock external dependencies (WebContainer, AI providers)
- ✅ Test edge cases and error states
- ✅ Tests are maintainable and reliable

## Test Prioritization Strategy

### P0: Critical Paths (Data Loss Risk)
- File system operations (read, write, delete)
- Database operations (IndexedDB CRUD)
- Authentication and authorization
- State persistence and hydration

### P1: User-Facing Features
- UI components (critical workflows)
- AI agent interactions
- Workspace switching
- Sync operations

### P2: Business Logic
- Data transformations
- Validation logic
- Error handling
- Utility functions

## Example Usage

```
"Write tests for src/lib/state/rag-store.ts to achieve ≥80% coverage"
```

This will:
1. Analyze current coverage for the store
2. Identify untested critical paths (CRUD operations, state updates)
3. Write unit tests for each action method
4. Write integration tests for store + component interactions
5. Validate with coverage measurement

## Validation Commands

```bash
# Run test suite
pnpm test

# Measure coverage
pnpm test -- --coverage

# Check coverage report
open coverage/index.html

# Show uncovered lines
pnpm test -- --coverage --reporter=text-summary
```

## Success Criteria

- ✅ Test coverage ≥80% (target)
- ✅ 100% test pass rate
- ✅ All critical paths tested (P0 priority)
- ✅ Edge cases and error states covered
- ✅ Tests are maintainable (clear names, good structure)
- ✅ External dependencies properly mocked
