---
description: Platform Unification Ralph Loop - Autonomous iteration workflow for systematic migration, integration, and validation until 100% completion
---

# Ralph Loop: Platform Unification

## Overview

This workflow executes autonomous iteration cycles for platform unification. Each cycle:
1. **Analyzes** current state via codebase scanning
2. **Implements** the next priority item
3. **Validates** via TypeScript, dev server, and tests
4. **Loops** until all success criteria met (100%)

## Activation

```bash
# To start the Ralph Loop:
# Reference: .claude/ralph-loop.local.md
# Sprint Change Proposal: _bmad-output/sprint-change-proposal-platform-unification-2026-01-02.md
```

// turbo-all

---

## Phase 0: Context Acquisition (Every Grand Cycle)

### Step 0.1: Load Current State

<action>
Read the following files to understand current state:
- `.claude/ralph-loop.local.md` (iteration count, phase, active story)
- `_bmad-output/sprint-change-proposal-platform-unification-2026-01-02.md` (master plan)
- `_bmad-output/sprint-artifacts/sprint-status.yaml` (story status)
- Latest `_bmad-output/research/platform-unification-2026-01-*/*.md` (previous findings)
</action>

### Step 0.2: Quick Health Check

<action>
Run quick validation to assess current state:
```bash
# TypeScript errors
pnpm tsc --noEmit 2>&1 | head -20

# Dev server (quick start check)
timeout 10 pnpm dev 2>&1 | head -20 || true
```
</action>

### Step 0.3: Determine Next Action

<action>
Based on health check and current phase, determine:
1. If TypeScript errors exist → Focus on fixing type errors first
2. If current story incomplete → Continue story implementation
3. If current story complete → Move to next story
4. If phase complete → Move to next phase
5. If all phases complete → Run final validation
</action>

---

## Phase 1: Story Execution Cycle

### Step 1.1: Load Active Story Context

<action>
Identify active story from sprint-status.yaml or determine next story:
- Story 51-0: Codebase Audit (if not started)
- Story 51-1 through 51-11: Follow dependency order
</action>

### Step 1.2: Execute Story Tasks

<action>
For each story, execute in order:

**Analysis Tasks:**
- Grep for relevant patterns
- Scan file structure with `tree` or `find`
- Pack related code sections with repomix MCP

**Implementation Tasks:**
- Create/modify files following BMAD patterns
- Wire components to stores
- Update exports and barrel files

**Validation Tasks:**
- Run `pnpm tsc --noEmit`
- Run `pnpm dev` to verify no crashes
- Run relevant tests if available
</action>

### Step 1.3: Story Completion Check

<action>
Verify all acceptance criteria for current story:

For Story 51-0 (Audit):
- [ ] Store inventory document created
- [ ] Consolidation plan documented
- [ ] Dependency graph mapped

For Story 51-1 (Provider):
- [ ] Single provider store exists
- [ ] All workspaces consume it
- [ ] Zero TS errors in domain

For Story 51-2 (Agent):
- [ ] Single agent store exists
- [ ] Workspace bindings work
- [ ] Zero TS errors in domain

(Continue for all stories...)
</action>

### Step 1.4: Update Progress

<action>
After each story completion:
1. Update sprint-status.yaml with story status
2. Update ralph-loop.local.md iteration count
3. Create cycle completion artifact:
   `_bmad-output/ralph-loop-cycle-{N}-{story-id}-{date}.md`
</action>

---

## Phase 2: Validation Gates

### Step 2.1: Per-Iteration Validation

<action>
Run after each significant change:
```bash
pnpm tsc --noEmit  # Must pass
pnpm dev           # Must start without crash
```
</action>

### Step 2.2: Per-Story Validation

<action>
Run after story completion:
```bash
pnpm tsc --noEmit   # Zero errors
pnpm dev            # Starts successfully
pnpm test --run     # Core tests pass
```
</action>

### Step 2.3: Per-Phase Validation

<action>
Run after phase completion:
```bash
pnpm tsc --noEmit   # Zero errors
pnpm build          # Production build succeeds
pnpm test --run     # All tests pass
```

Additionally run 12-level sweeping validation checklist.
</action>

### Step 2.4: Final Validation (100% Check)

<action>
Run when all stories complete:

**Cornerstone Verification:**
- [ ] Provider: Single store, reactive, persistent
- [ ] Agent: Centralized vault, workspace bindings
- [ ] Conversation: Unified system, thread hierarchy
- [ ] Project: Hub integration, file sync
- [ ] RAG: Pipeline complete, canvas integrated

**Workspace Verification:**
- [ ] IDE: All tools functional
- [ ] Knowledge: Source → RAG → Synthesis flow
- [ ] Notes: BlockNote + AI features
- [ ] Study: Flashcard/Quiz generation

**Use Case Verification:**
- [ ] UC1: Vault population testable
- [ ] UC2: Canvas linkage functional
- [ ] UC3: Conversational RAG working
- [ ] UC4: Knowledge matrix visible

**Quality Verification:**
- [ ] Zero TypeScript errors
- [ ] All tests passing
- [ ] Build succeeds
- [ ] 3-Device rule passed
</action>

---

## Phase 3: Loop Control

### Step 3.1: Increment Iteration

<action>
Update ralph-loop.local.md:
- Increment iteration counter
- Update current phase/story
- Log completion status
</action>

### Step 3.2: Context Save (Every 5 Iterations)

<action>
Create context save artifact:
```
_bmad-output/context-save-iteration-{N}-{date}.md
```

Include:
- Current progress percentage
- Completed stories
- Active blockers
- TypeScript error count
- Key findings
</action>

### Step 3.3: Decision Point

<action>
Evaluate continuation:

If completion < 100%:
  → Continue to next iteration (goto Step 0.1)

If completion = 100%:
  → Generate final report
  → Update all documentation
  → Set ralph-loop active: false
  → Report to BMAD Master
</action>

---

## Completion Signal

When all criteria met, output:

```xml
<promise>Platform Unified: All 5 cornerstones integrated as single-source-of-truth, all 4 workspaces functional with seamless navigation, all 4 use cases implementable end-to-end, zero TypeScript errors, 12-level validation passed</promise>
```

Then create:
- `_bmad-output/platform-unification-completion-2026-01-XX.md`
- Update `AGENTS.md` with final architecture
- Update `CLAUDE.md` with new patterns

---

## Quick Reference Commands

```bash
# Health Check
pnpm tsc --noEmit 2>&1 | head -50
pnpm dev

# Store Audit
find src -name "*store*.ts" | wc -l
grep -r "useProviderStore\|useAgentsStore\|useConversationStore" src/ --include="*.ts" --include="*.tsx" -l

# Dependency Check
grep -r "from.*store" src/ --include="*.ts" --include="*.tsx" | head -30

# Build Validation
pnpm build

# Test Run
pnpm test --run
```

---

## Story Priority Order

Execute stories in this order (respects dependencies):

```
1. 51-0: Codebase Audit (FIRST - creates plan)
2. 51-1: Provider Store Unification (foundation for agents)
3. 51-2: Agent Store Consolidation (depends on providers)
4. 51-3: Conversation Store Merge (depends on agents)
5. 51-4: Workspace State Binding (integrates all above)
6. 51-5: IDE Workspace Wiring
7. 51-6: Knowledge Workspace Wiring
8. 51-7: Notes Workspace Wiring
9. 51-8: Study Workspace Wiring
10. 51-9: Four Use Cases Validation
11. 51-10: Mobile/Desktop UX Fixes
12. 51-11: Legacy Cleanup (LAST - removes deprecated)
```

---

## Error Handling

### TypeScript Errors

If errors persist after fix attempt:
1. Grep for error pattern across codebase
2. Identify root cause (missing type, wrong import, schema mismatch)
3. Fix at source, not symptom
4. Validate fix resolved all instances

### Build Failures

If build fails:
1. Check build output for specific error
2. Check vite.config.ts for SSR externals
3. Check for circular imports
4. Verify all exports exist

### Test Failures

If tests fail:
1. Run specific test file to isolate
2. Check for mock requirements
3. Verify Dexie/IndexedDB mocks
4. Check for async timing issues

---

## Iteration State Template

```yaml
# Update ralph-loop.local.md frontmatter each iteration:
---
active: true
iteration: {N}
max_iterations: 2500
phase: "phase-{0-3}"
current_story: "51-{X}"
story_status: "in-progress|complete"
typescript_errors: {count}
workspaces_functional: {0-4}/4
use_cases_complete: {0-4}/4
completion_percentage: {X}%
last_updated: "{ISO-datetime}"
---
```

---

*Workflow created by BMAD Master for Platform Unification*
*Execution: Autonomous until 100% completion*
