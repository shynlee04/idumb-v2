# Integration Pitfalls & Anti-Patterns

**Created:** 2026-02-08  
**Agent:** idumb-investigator  
**Status:** Active

---

## Executive Summary

This document catalogues known pitfalls, anti-patterns, and architectural constraints when integrating with the iDumb v2 system. Understanding these pitfalls is critical for creating skills that work harmoniously with the 5-level architecture, 3-agent delegation system, and governance enforcement mechanisms.

---

## Development Cycle Discipline Violations

### Pitfall #1: One-Shot Implementation

**Problem:** Attempting to complete a phase in a single cycle.

**Why It's Wrong:**
- Multi-phase work requires Cycle 1 (implement) → Cycle 2 (integrate)
- Integration reveals issues that weren't visible during initial implementation
- Testing incrementally catches regressions early
- Documentation and artifacts need refinement after real-world usage

**Correct Approach:**
```typescript
// ❌ WRONG: One-shot implementation
await implementFeature();
await runTests(); // May pass, but integration issues hidden
await commit("Feature complete"); // Premature

// ✅ RIGHT: Multi-cycle implementation
// Cycle 1: Initial implementation
await implementFeature();
await runTests();
await commit("Feature: Cycle 1 implementation");

// Cycle 2: Integration + iteration
await integrateWithExistingCode();
await runFullTestSuite();
await refineDocumentation();
await commit("Feature: Cycle 2 integration");
```

**Evidence:** AGENTS.md Rule 5: "MULTI-CYCLE, NEVER ONE-SHOT"

---

### Pitfall #2: Hallucinating Features

**Problem:** Describing features, files, or schemas that don't exist in AGENTS.md or codebase.

**Why It's Wrong:**
- AGENTS.md is the ground truth — it describes ONLY what exists
- Hallucinations cause agents to chase non-existent implementations
- Breaks hand-off readiness for fresh agents
- Violates "NO HALLUCINATION" rule

**Correct Approach:**
```markdown
# ❌ WRONG: Describing non-existent features
The "smart-debugger" feature automatically detects and fixes bugs.

# ✅ RIGHT: Describing only what exists
Code quality scanner (src/lib/code-quality.ts) detects 7 smell types and grades A-F.
Debugging is manual via `systematic-debugging` skill.
```

**Evidence:** AGENTS.md Rule 1: "NO HALLUCINATION"

---

### Pitfall #3: Using console.log

**Problem:** Using `console.log` anywhere in the codebase.

**Why It's Wrong:**
- TUI-safe logging required via `lib/logging.ts`
- `console.log` breaks terminal UI rendering
- Violates "TUI SAFETY" rule

**Correct Approach:**
```typescript
// ❌ WRONG: console.log
console.log("Processing file:", filePath);

// ✅ RIGHT: TUI-safe logging
import { createLogger } from "./lib/logging";

const logger = createLogger(logDirectory, "service-name");
logger.debug("Processing file", { filePath });
```

**Evidence:** AGENTS.md Rule 3: "TUI SAFETY"

---

### Pitfall #4: Executing Without Context

**Problem:** Making code changes without reading existing files first.

**Why It's Wrong:**
- Violates "CONTEXT-FIRST" rule
- Causes duplicate work or conflicts
- Misses existing patterns and conventions

**Correct Approach:**
```typescript
// ❌ WRONG: Blindly create file
await writeFile("src/new-file.ts", "...");

// ✅ RIGHT: Context-first approach
const existingFiles = await glob("src/**/*.ts");
const similarFile = await readFile("src/similar-file.ts");
const conventions = extractConventions(similarFile);
await writeFile("src/new-file.ts", applyConventions(conventions));
```

**Evidence:** AGENTS.md Rule 4: "CONTEXT-FIRST"

---

### Pitfall #5: Creating Duplicate Files

**Problem:** Creating new files when similar files already exist.

**Why It's Wrong:**
- Violates "ANTI-REPETITION" rule
- Scatters related functionality
- Violates "ALL CODE LIVES IN `src/`" rule

**Correct Approach:**
```typescript
// ❌ WRONG: Create duplicate file in different location
await writeFile("lib/new-utility.ts", "...");

// ✅ RIGHT: Add to existing file or create in src/
const existingUtility = await readFile("src/lib/utilities.ts");
await writeFile("src/lib/utilities.ts", existingUtility + "\n" + newUtility);
```

**Evidence:** AGENTS.md Rules 5, 6: "ANTI-REPETITION", "ALL CODE LIVES IN `src/`"

---

### Pitfall #6: Violating LOC Discipline

**Problem:** Creating files > 500 LOC.

**Why It's Wrong:**
- Files > 500 LOC are flagged for splitting
- Violates "LOC DISCIPLINE" rule (target 300-500 LOC)
- Reduces code maintainability and readability

**Correct Approach:**
```typescript
// ❌ WRONG: Monolithic file (1510 LOC)
// templates.ts

// ✅ RIGHT: Split into focused modules
// src/templates/coordinator.ts (300 LOC)
// src/templates/investigator.ts (300 LOC)
// src/templates/executor.ts (300 LOC)
// src/templates/modules.ts (300 LOC)
```

**Evidence:** AGENTS.md Rule 6: "LOC DISCIPLINE"

**Known Violations:**
- `templates.ts` (1510 LOC) ⚠️⚠️⚠️ Critical
- `tools/write.ts` (1174 LOC) ⚠️⚠️⚠️ Critical
- `tools/task.ts` (826 LOC) ⚠️⚠️ High
- `schemas/planning-registry.ts` (729 LOC) ⚠️ High
- `lib/code-quality.ts` (701 LOC) ⚠️ Medium
- `tools/read.ts` (568 LOC) ⚠️ Medium
- `dashboard/backend/server.ts` (563 LOC) ⚠️ Medium
- `lib/entity-resolver.ts` (545 LOC) ⚠️ Medium
- `schemas/task.ts` (530 LOC) ⚠️ Low
- `tools/codemap.ts` (521 LOC) ⚠️ Low

---

### Pitfall #7: Non-Atomic Commits

**Problem:** Bundling multiple unrelated changes into one commit.

**Why It's Wrong:**
- Violates "ATOMIC MEANINGFUL COMMITS" rule
- Makes debugging and rollback difficult
- Blurs the distinction between code, schema, test, and documentation changes

**Correct Approach:**
```bash
# ❌ WRONG: Non-atomic commit
git add .
git commit -m "Updated everything"

# ✅ RIGHT: Atomic commits
git add src/feature.ts
git commit -m "Feature: Implement X"

git add tests/feature.test.ts
git commit -m "Tests: Add feature tests"

git add AGENTS.md
git commit -m "Docs: Update architecture description"
```

**Evidence:** AGENTS.md Rule 7: "ATOMIC MEANINGFUL COMMITS"

---

### Pitfall #8: Skipping Incremental Testing

**Problem:** Adding code without companion tests.

**Why It's Wrong:**
- Violates "INCREMENTAL TESTING ONLY" rule
- Allows untested logic into codebase
- Breaks schema-driven, type-strict, zero-debt discipline

**Correct Approach:**
```typescript
// ❌ WRONG: No test
// src/utils/new-function.ts
export function newFunction(input: string): string {
  return input.toUpperCase();
}

// ✅ RIGHT: Test included
// src/utils/new-function.ts
export function newFunction(input: string): string {
  return input.toUpperCase();
}

// tests/utils/new-function.test.ts
describe("newFunction", () => {
  it("should uppercase input", () => {
    expect(newFunction("hello")).toBe("HELLO");
  });
});
```

**Evidence:** AGENTS.md Rule 8: "INCREMENTAL TESTING ONLY"

**Test Baseline:** 294/294 assertions across 8 test files

---

### Pitfall #9: Not Updating File Tree

**Problem:** Committing file changes without updating AGENTS.md directory structure.

**Why It's Wrong:**
- Violates "FILE TREE UPDATES MANDATORY" rule
- Breaks hand-off readiness
- Causes confusion for fresh agents

**Correct Approach:**
```bash
# ❌ WRONG: Commit without updating AGENTS.md
git add src/new-dir/new-file.ts
git commit -m "Add new feature file"

# ✅ RIGHT: Update AGENTS.md after file changes
git add src/new-dir/new-file.ts
git add AGENTS.md
git commit -m "Feature: Add new file + update AGENTS.md"
```

**Evidence:** AGENTS.md Rule 9: "FILE TREE UPDATES MANDATORY"

---

### Pitfall #10: Non-Handoff-Ready Artifacts

**Problem:** Creating artifacts, walkthroughs, or commit messages that lack instructional context.

**Why It's Wrong:**
- Violates "ALL OUTPUT = HAND-OFF READY" rule
- Prevents fresh agents from continuing work in new context windows
- Creates ambiguity and confusion

**Correct Approach:**
```bash
# ❌ WRONG: Non-handoff-ready commit message
git commit -m "Fixed bug"

# ✅ RIGHT: Handoff-ready commit message
git commit -m "Bug: Fixed null pointer in src/lib/entity-resolver.ts

Problem: canAgentWrite returned null when entity not found in classification map
Solution: Added fallback to default permissions in classifyEntity()
Impact: Resolves tool-gate blocking writes for unknown entities
Tests: Added 3 new assertions in tests/entity-resolver.test.ts (now 48/48)"
```

**Evidence:** AGENTS.md Rule 10: "ALL OUTPUT = HAND-OFF READY"

---

## Plan Chain Protocol Violations

### Pitfall #11: Ignoring Plan Chain

**Problem:** Working from outdated plans or ignoring the highest `n` version.

**Why It's Wrong:**
- Turn-based plans live in `planning/implamentation-plan-turn-based/`
- Each has an `n`-suffix (n3, n4, n5, n6)
- Highest `n` = closest to current reality
- Violates "PLAN CHAIN IS SACRED" rule

**Correct Approach:**
```bash
# ❌ WRONG: Using outdated plan
working from: planning/implamentation-plan-turn-based/implementation_plan-n3.md

# ✅ RIGHT: Using current plan
working from: planning/implamentation-plan-turn-based/implementation_plan-n6.md
```

**Evidence:** AGENTS.md Rule 11: "PLAN CHAIN IS SACRED"

---

### Pitfall #12: Silently Resolving Conflicts

**Problem**: Detecting conflicts between plans, code, or AGENTS.md but not surfacing them.

**Why It's Wrong:**
- Conflicts indicate divergent understanding or stale documentation
- Silently resolving creates hidden issues
- Violates "CONFLICT = ALERT" rule

**Correct Approach:**
```markdown
# ❌ WRONG: Silent resolution
// Code says X, AGENTS.md says Y
// Just implementing X silently

# ✅ RIGHT: Surface conflict immediately
## CONFLICT DETECTED

**Source:** AGENTS.md line 42 vs codebase reality

**Discrepancy:** 
- AGENTS.md says: "tool.execute.after hook is unit-tested"
- Codebase shows: tests/file/after-hook.test.ts doesn't exist

**Resolution Required:**
1. Verify actual test coverage
2. Update AGENTS.md to reflect reality
3. Add missing tests if needed
```

**Evidence:** AGENTS.md Rule 12: "CONFLICT = ALERT"

---

### Pitfall #13: Updating Plans Mid-Cycle

**Problem:** Updating implementation plans during Cycle 1 (initial implementation).

**Why It's Wrong:**
- Plans updated ONLY after Cycle 2 (integration cycle)
- Updating mid-cycle causes plans to reflect partial reality
- Violates "ITERATIVE PLAN UPDATES" rule

**Correct Approach:**
```bash
# ❌ WRONG: Update plan during Cycle 1
// Implementing feature
git commit -m "Partial implementation"
// Updating plan to reflect partial state...
git add planning/implamentation-plan-turn-based/implementation_plan-n6.md
git commit -m "Update plan mid-cycle"

# ✅ RIGHT: Update plan after Cycle 2
// Cycle 1: Initial implementation
git commit -m "Feature: Cycle 1 implementation"

// Cycle 2: Integration + testing
git commit -m "Feature: Cycle 2 integration"

// NOW update plan
git add planning/implamentation-plan-turn-based/implementation_plan-n6.md
git commit -m "Plan: Update to reflect completed implementation"
```

**Evidence:** AGENTS.md Rule 13: "ITERATIVE PLAN UPDATES"

---

## Tool-Gate Pattern Violations

### Pitfall #14: Bypassing Tool-Gate

**Problem:** Attempting to write/edit files without an active task.

**Why It's Wrong:**
- `tool.execute.before` hook blocks write/edit without active task
- Tool-gate pattern is **VALIDATED** with 16/16 unit tests
- Breaking this violates governance enforcement

**Correct Approach:**
```typescript
// ❌ WRONG: Bypass tool-gate
// Attempting write without active task
await idumb_write({ path: "file.ts", mode: "create", content: "..." });
// Error: Tool write blocked: No active task. Use idumb_task start to begin work.

// ✅ RIGHT: Use tool-gate properly
await idumb_task({ action: "start", task_id: "task-123" });
await idumb_write({ path: "file.ts", mode: "create", content: "..." });
await idumb_task({ action: "complete", target_id: "task-123", evidence: "..." });
```

**Evidence:** `src/hooks/tool-gate.ts`, 16/16 unit tests

---

### Pitfall #15: Not Understanding Entity Permissions

**Problem:** Assuming all agents can write to all files.

**Why It's Wrong:**
- Entity resolver maps agent permissions to file entities
- Coordinator: ❌ No write permissions
- Investigator: ✅ Brain entries only
- Executor: ✅ All writes
- Violates 3-agent delegation system

**Correct Approach:**
```typescript
// ❌ WRONG: Investigator writing source code
// Agent: idumb-investigator
await idumb_write({ path: "src/feature.ts", content: "..." });
// Error: Agent idumb-investigator cannot write to entity type "source-code"

// ✅ RIGHT: Investigator writing brain entries
// Agent: idumb-investigator
await idumb_write({ 
  path: ".idumb/brain/knowledge/analysis.md", 
  content: "..." 
});
// Success: Agent can write to entity type "documentation" in brain/

// ✅ RIGHT: Delegating to executor for source code
// Agent: idumb-investigator
await idumb_task({ 
  action: "delegate", 
  task_id: "task-123",
  to_agent: "idumb-executor",
  context: "Implement feature based on research findings",
  expected_output: "Feature implemented and tested"
});
```

**Evidence:** `src/lib/entity-resolver.ts`, 3-agent permission matrix

---

## Delegation System Violations

### Pitfall #16: Delegating Up the Hierarchy

**Problem:** Executor (L1) trying to delegate to Coordinator (L0).

**Why It's Wrong:**
- Delegation chain: Coordinator (0) → Investigator (1) → Executor (1)
- Executor cannot delegate up
- Violates 3-agent hierarchy

**Correct Approach:**
```typescript
// ❌ WRONG: Executor delegating up
// Agent: idumb-executor
await idumb_task({ 
  action: "delegate", 
  task_id: "task-123",
  to_agent: "idumb-supreme-coordinator", // ❌ Wrong direction!
  context: "...",
  expected_output: "..."
});
// Error: Agent idumb-executor cannot delegate to agent idumb-supreme-coordinator (hierarchy violation)

// ✅ RIGHT: Executor delegating to investigator (same level)
// Agent: idumb-executor
await idumb_task({ 
  action: "delegate", 
  task_id: "task-123",
  to_agent: "idumb-investigator",
  context: "Need research on X to complete implementation",
  expected_output: "Research findings with recommendations"
});
```

**Evidence:** `src/schemas/delegation.ts`, agent hierarchy rules

---

### Pitfall #17: Ignoring Category Routing

**Problem:** Creating tasks with wrong category or not following routing rules.

**Why It's Wrong:**
- Categories map to specific agents via `CATEGORY_AGENT_MATRIX`
- Routing: development→executor, research→investigator, governance→coordinator
- Violating routing causes task delegation failures

**Correct Approach:**
```typescript
// ❌ WRONG: Wrong category for task
await idumb_task({ 
  action: "create_task", 
  name: "Implement feature",
  category: "research" // ❌ Should be "development"
});
// Result: Task routed to investigator, but investigator can't implement features

// ✅ RIGHT: Correct category
await idumb_task({ 
  action: "create_task", 
  name: "Research best practices",
  category: "research" // ✅ Correct - routed to investigator
});
await idumb_task({ 
  action: "create_task", 
  name: "Implement feature",
  category: "development" // ✅ Correct - routed to executor
});
```

**Evidence:** `CATEGORY_AGENT_MATRIX` in `src/schemas/delegation.ts`

---

## Hook Integration Violations

### Pitfall #18: Blocking on Hook Errors

**Problem:** Hooks returning `{ block: true }` on error.

**Why It's Wrong:**
- Hooks must use graceful degradation
- Never block on error
- Always return `{ block: false }` in catch blocks

**Correct Approach:**
```typescript
// ❌ WRONG: Block on error
export async function badHook(context: HookContext) {
  try {
    const state = stateManager.readHookState();
    return { block: shouldBlock(state) };
  } catch (error) {
    // ❌ Blocking on error!
    return { block: true, error: "Hook failed" };
  }
}

// ✅ RIGHT: Graceful degradation
export async function goodHook(context: HookContext) {
  try {
    const state = stateManager.readHookState();
    return { block: shouldBlock(state) };
  } catch (error) {
    logger.error("Hook error", error);
    // ✅ Never block on error
    return { block: false };
  }
}
```

**Evidence:** All hooks in `src/hooks/` follow graceful degradation pattern

---

### Pitfall #19: Not Using Hook Factory Pattern

**Problem:** Defining hooks as plain async functions.

**Why It's Wrong:**
- Hook factory pattern: every hook = function returning async hook
- Provides closure access to context
- Standard pattern across all iDumb v2 hooks

**Correct Approach:**
```typescript
// ❌ WRONG: Plain async function
export async function badHook(context: HookContext) {
  return async (event: any) => {
    // Hook logic
  };
}

// ✅ RIGHT: Hook factory pattern
export function goodHook(context: HookContext): HookFactory {
  return async (event: any) => {
    // Hook logic with closure access to context
  };
}
```

**Evidence:** All hooks in `src/hooks/index.ts` follow hook factory pattern

---

## Skill Creation Anti-Patterns

### Pitfall #20: Describing Agent Roles

**Problem:** Creating skills that describe "what the agent is" instead of "what to do".

**Why It's Wrong:**
- Skills are SOPs/workflows, NOT agent roles
- Describing roles causes skill discovery failures
- Violates skill-creator guidelines

**Correct Approach:**
```markdown
---
# ❌ WRONG: Describing agent role
name: research-agent
description: You are a research agent...
version: 1.0.0
---

You are the research agent. You love researching.

---

# ✅ RIGHT: Describing workflow/SOP
name: research-workflow
description: |
  Conduct systematic research before implementing features.
  Use proactively when user asks to "research", "investigate", "analyze", 
  or needs information before coding.
  Examples:
  - "Research best practices for X" → trigger this skill
  - "Investigate why Y is failing" → trigger this skill
  - "Analyze performance of Z" → trigger this skill
version: 1.0.0
---

## Research Workflow

1. **Clarify intent**: Ask targeted questions about research goals
2. **Scope the research**: Define what will and won't be researched
3. **Choose approach**: Select appropriate tools (web search, code analysis, etc.)
4. **Execute**: Run research systematically
5. **Validate**: Cross-check findings from multiple sources
6. **Document**: Create structured output with citations
```

**Evidence:** skill-creator skill guidelines, all existing skills follow SOP pattern

---

### Pitfall #21: Vague Skill Descriptions

**Problem:** Using generic descriptions like "helps with X" or "improves Y".

**Why It's Wrong:**
- `description` field is the PRIMARY trigger mechanism
- Vague descriptions cause skill discovery failures
- Must include "Use proactively when..." phrases

**Correct Approach:**
```markdown
---
# ❌ WRONG: Vague description
name: vague-skill
description: Helps with debugging
version: 1.0.0
---

---

# ✅ RIGHT: Specific description with trigger contexts
name: systematic-debugging
description: |
  Use when encountering any bug, test failure, or unexpected behavior, 
  before proposing fixes. Systematic approach: isolate → hypothesize → 
  validate → iterate. Never conclude it's fixed without human validation.
  Use proactively when user says "debug", "fix bug", "test failing", 
  or reports unexpected behavior.
  Examples:
  - "Why is this test failing?" → trigger this skill
  - "Debug the login flow" → trigger this skill
  - "Tests are passing but I see error in logs" → trigger this skill
version: 1.0.0
---
```

**Evidence:** skill-creator skill guidelines, all existing skills have specific descriptions

---

### Pitfall #22: Creating Monolithic Skills

**Problem:** Creating skills > 500 lines.

**Why It's Wrong:**
- Skills should be focused and consumable
- Monolithic skills are hard to discover and use
- Violates LOC discipline (skills < 500 lines)

**Correct Approach:**
```markdown
---
# ❌ WRONG: Monolithic skill (800 lines)
name: everything-skill
description: Does everything
version: 1.0.0
---

# [800 lines of everything]

---

# ✅ RIGHT: Focused skills (300 lines each)
name: systematic-debugging
description: Use when encountering bugs...
version: 1.0.0
---

# [300 lines of debugging workflow]

---

name: test-driven-development
description: Use when implementing features...
version: 1.0.0
---

# [300 lines of TDD workflow]
```

**Evidence:** skill-creator skill guidelines, LOC discipline

---

### Pitfall #23: Generic AI-Generated Content

**Problem:** Using generic ChatGPT-style content instead of domain-specific instructions.

**Why It's Wrong:**
- Reduces skill effectiveness
- Causes agents to give generic advice
- Skills should be domain-specific and actionable

**Correct Approach:**
```markdown
---
# ❌ WRONG: Generic AI content
name: generic-research
description: Research things
version: 1.0.0
---

To research, you should ask questions, gather information, 
and present findings in a clear manner.
---

# ✅ RIGHT: Domain-specific instructions
name: iDumb-architectural-research
description: |
  Research iDumb v2 architecture decisions, patterns, and integration points
  before proposing changes. Use proactively when investigating the 5-level 
  architecture, 3-agent delegation system, or planning registry integration.
  Examples:
  - "How does the tool-gate pattern work?" → trigger this skill
  - "Research the delegation chain validation" → trigger this skill
  - "What's the relationship between tasks and planning artifacts?" → trigger this skill
version: 1.0.0
---

## iDumb Architecture Research Workflow

1. **Read AGENTS.md** - Ground truth for what exists
2. **Map the concern** - Identify which level (1-5) the question relates to
3. **Check schema files** - Read relevant TypeScript schemas in `src/schemas/`
4. **Examine implementations** - Look at tool/hook implementations
5. **Check tests** - Test files reveal expected behavior
6. **Validate against governance** - Ensure findings don't violate rules
7. **Document with evidence** - Cite files, line numbers, test assertions
```

**Evidence:** skill-creator skill guidelines, domain-specific skill examples

---

## Summary: Critical Pitfalls to Avoid

### Development Cycle Discipline (1-10)
1. One-Shot Implementation
2. Hallucinating Features
3. Using console.log
4. Executing Without Context
5. Creating Duplicate Files
6. Violating LOC Discipline
7. Non-Atomic Commits
8. Skipping Incremental Testing
9. Not Updating File Tree
10. Non-Handoff-Ready Artifacts

### Plan Chain Protocol (11-13)
11. Ignoring Plan Chain
12. Silently Resolving Conflicts
13. Updating Plans Mid-Cycle

### Tool-Gate Pattern (14-15)
14. Bypassing Tool-Gate
15. Not Understanding Entity Permissions

### Delegation System (16-17)
16. Delegating Up the Hierarchy
17. Ignoring Category Routing

### Hook Integration (18-19)
18. Blocking on Hook Errors
19. Not Using Hook Factory Pattern

### Skill Creation (20-23)
20. Describing Agent Roles
21. Vague Skill Descriptions
22. Creating Monolithic Skills
23. Generic AI-Generated Content

---

## Best Practices Checklist

Before making any changes:

- [ ] Active task started via `idumb_task start`?
- [ ] Read AGENTS.md for ground truth?
- [ ] Read relevant schema files?
- [ ] Checked existing files before creating?
- [ ] File target < 500 LOC?
- [ ] Test companion created/updated?
- [ ] Commit message handoff-ready?
- [ ] AGENTS.md file tree updated?
- [ ] Using `lib/logging.ts` (not `console.log`)?
- [ ] Following skill-creator guidelines?
- [ ] Respecting entity permissions?
- [ ] Following delegation routing?
- [ ] Using hook factory pattern?
- [ ] Graceful degradation in hooks?
- [ ] Description specific with trigger contexts?
- [ ] Skill describes SOP, not role?
- [ ] Skill < 500 lines?
- [ ] Domain-specific instructions?
- [ ] Using highest `n` plan version?
- [ ] Surfacing conflicts immediately?

---

**Analysis complete. Ready for skill suite design.**
