# iDumb v2 - Documentation Index

**Version:** 2.2.0
**Documentation Date:** 2026-02-07
**Purpose:** Master index for all iDumb v2 documentation

---

## Quick Start: Which Document Do I Need?

### I'm a New Developer...

**Start here:** `CLAUDE-ARCHITECTURE.md`
- Understand the 5-level architecture
- Learn how hooks, tools, and agents work together
- See data flow diagrams
- Get familiar with the codebase structure

**Next:** `CLAUDE-NAVIGATION.md`
- Find specific functionality quickly
- Learn common tasks (add hook, add tool, add schema)
- Understand file relationships
- Get code navigation tips

**Then:** `planning/PROJECT.md`
- Understand project goals and hypotheses
- Learn about requirements and success criteria
- See what's validated vs. what's pending
- Get context on the strategic reset from v1

---

### I'm Onboarding to a Specific Role...

**Agent Developer:**
1. `CLAUDE-ARCHITECTURE.md` - Agent system section
2. `AGENTS.md` - Complete agent reference
3. `src/templates.ts` - Agent templates
4. `src/hooks/tool-gate.ts` - Agent-scoped tool access

**Plugin Developer:**
1. `CLAUDE-ARCHITECTURE.md` - Hook system section
2. `CLAUDE-NAVIGATION.md` - Hook patterns
3. `src/index.ts` - Plugin entry point
4. `src/hooks/` - All hook implementations

**Schema Developer:**
1. `CLAUDE-ARCHITECTURE.md` - Schema system section
2. `CLAUDE-NAVIGATION.md` - Schema patterns
3. `src/schemas/` - All Zod schemas
4. `tests/` - Schema validation tests

**Test Engineer:**
1. `CLAUDE-ARCHITECTURE.md` - Validation status
2. `CLAUDE-GAPS.md` - Gap #4 (regression suite)
3. `tests/` - All test suites
4. `planning/PHASE-COMPLETION.md` - Phase gates

**DevOps Engineer:**
1. `CLAUDE-ARCHITECTURE.md` - Installation section
2. `CLAUDE-GAPS.md` - Gap #4 (CI/CD integration)
3. `package.json` - Build and test scripts
4. `.github/workflows/` - CI/CD (future)

---

### I'm Debugging an Issue...

**Plugin not loading:**
1. `src/index.ts` - Check plugin factory
2. `package.json` - Check dependencies
3. `CLAUDE-GAPS.md` - Gap #1 (Phase 2B validation)

**Hook not firing:**
1. `CLAUDE-NAVIGATION.md` - "Debug a Hook Not Firing"
2. `src/hooks/index.ts` - Check hook registration
3. `.idumb/governance/hook-verification.log` - Check logs

**Tool not appearing:**
1. `CLAUDE-NAVIGATION.md` - "Debug a Tool Not Appearing"
2. `src/tools/index.ts` - Check tool export
3. `src/index.ts` - Check tool registration

**Schema validation error:**
1. `CLAUDE-NAVIGATION.md` - Schema pattern reference
2. `src/schemas/` - Check schema definition
3. `tests/` - Check test expectations

**Test failing:**
1. `tests/` - Find failing test
2. `CLAUDE-ARCHITECTURE.md` - Test coverage summary
3. `CLAUDE-GAPS.md` - Regression suite setup

---

### I'm Planning New Features...

**Before starting:**
1. `planning/GOVERNANCE.md` - Principles and pitfalls
2. `planning/PHASE-COMPLETION.md` - Phase gates
3. `CLAUDE-GAPS.md` - Check if gap already exists
4. `AGENTS.md` - Agent system rules

**Design phase:**
1. `CLAUDE-ARCHITECTURE.md` - Architecture overview
2. `CLAUDE-NAVIGATION.md` - File relationships
3. `src/schemas/` - Existing schemas (don't duplicate)
4. `planning/implamentation-plan-turn-based/` - Turn-based plans

**Implementation:**
1. `CLAUDE-NAVIGATION.md` - Common tasks reference
2. `CLAUDE-ARCHITECTURE.md` - Code patterns
3. `tests/` - Add tests as you go
4. `CLAUDE-GAPS.md` - Update gaps as you close them

**Validation:**
1. `planning/PHASE-COMPLETION.md` - Phase criteria
2. `CLAUDE-ARCHITECTURE.md` - Validation status
3. `tests/` - Run full test suite
4. `CLAUDE-GAPS.md` - Update regression suite

---

### I'm Evaluating the Codebase...

**Architecture review:**
1. `CLAUDE-ARCHITECTURE.md` - Complete architecture
2. `planning/GOVERNANCE.md` - Design principles
3. `planning/PROJECT.md` - Project goals
4. `AGENTS.md` - Agent system design

**Code quality review:**
1. `CLAUDE-ARCHITECTURE.md` - Files over 500 LOC
2. `CLAUDE-GAPS.md` - Gap #7 (code quality)
3. `tests/` - Test coverage (294/294)
4. `tsconfig.json` - TypeScript strict mode

**Gap analysis:**
1. `CLAUDE-GAPS.md` - Complete gaps catalog
2. `planning/GOVERNANCE.md` - Gap analysis section
3. `planning/PHASE-COMPLETION.md` - Pending phases
4. `CLAUDE-ARCHITECTURE.md` - Unintegrated components

**Risk assessment:**
1. `CLAUDE-GAPS.md` - Severity prioritization
2. `planning/GOVERNANCE.md` - Pitfalls catalog
3. `planning/PHASE-COMPLETION.md` - Pivot criteria
4. `planning/SUCCESS-CRITERIA.md` - Success metrics

---

## Document Catalog

### Core Documentation (Must Read)

| Document | Purpose | Audience | Length |
|----------|---------|----------|--------|
| **CLAUDE-ARCHITECTURE.md** | Complete architecture reference | All developers | ~2000 lines |
| **CLAUDE-NAVIGATION.md** | Quick reference for finding code | All developers | ~800 lines |
| **CLAUDE-GAPS.md** | Gaps analysis with action items | All developers | ~1200 lines |
| **AGENTS.md** | Agent system documentation | Agent developers | ~1400 lines |
| **CLAUDE.md** | Claude-specific instructions | Claude Code agents | ~500 lines |

### Planning Documents (Strategic)

| Document | Purpose | Status |
|----------|---------|--------|
| `planning/PROJECT.md` | Project overview, requirements, phases | Active |
| `planning/GOVERNANCE.md` | Principles, pitfalls, DOs/DON'Ts | Active |
| `planning/PHASE-COMPLETION.md` | Phase definitions and gates | Active |
| `planning/SUCCESS-CRITERIA.md` | Real-life use cases for validation | Active |
| `planning/implamentation-plan-turn-based/` | Turn-based plan chain (n3→n4→n5→n6) | Active |

### Reference Documentation (Look Up)

| Document | Purpose | Update Frequency |
|----------|---------|------------------|
| `README.md` | Project introduction and setup | Per release |
| `CHANGELOG.md` | Version history and changes | Per release |
| `package.json` | Dependencies and scripts | Per release |
| `tsconfig.json` | TypeScript configuration | Rarely |

### Test Documentation (Validation)

| Document | Purpose | Coverage |
|----------|---------|----------|
| `tests/tool-gate.test.ts` | Stop hook validation | 16/16 ✅ |
| `tests/compaction.test.ts` | Compaction hook validation | 16/16 ✅ |
| `tests/message-transform.test.ts` | Context pruning validation | 13/13 ✅ |
| `tests/init.test.ts` | Init tool validation | 60/60 ✅ |
| `tests/persistence.test.ts` | StateManager validation | 45/45 ✅ |
| `tests/task.test.ts` | Task hierarchy validation | 54/54 ✅ |
| `tests/delegation.test.ts` | Delegation validation | 38/38 ✅ |
| `tests/planning-registry.test.ts` | Planning registry validation | 52/52 ✅ |
| **TOTAL** | **All tests** | **294/294 (100%)** ✅ |

---

## Key Metrics

### Codebase Statistics

| Metric | Value | Source |
|--------|-------|--------|
| **Total Source LOC** | ~14,717 | `find src/ -name "*.ts" \| wc -l` |
| **Test Assertions** | 294/294 (100%) | `npm test` |
| **TypeScript Errors** | 0 (strict mode) | `tsc --noEmit` |
| **Files >500 LOC** | 10 files | `CLAUDE-ARCHITECTURE.md` |
| **Hooks Registered** | 6 hooks | `src/index.ts` |
| **Tools Registered** | 5 tools | `src/index.ts` |
| **Agents Deployed** | 3 agents | `src/cli/deploy.ts` |
| **Schemas Defined** | 8 schemas | `src/schemas/` |

### Phase Completion Status

| Phase | Status | Tests | Evidence |
|-------|--------|-------|----------|
| Phase 0: Foundation | ✅ COMPLETE | - | Plugin loads |
| Phase 1: Stop Hook | ✅ COMPLETE | 16/16 | Blocking works |
| Phase 2A: Custom Tools | ✅ COMPLETE | 16/16 | Tools work |
| Phase 2C: Scanner + Init | ✅ COMPLETE | 60/60 | Scan accurate |
| Phase 2B: Live Validation | ❌ NOT STARTED | - | **CRITICAL GATE** |
| Phase 3: Inner Cycle | ❌ NOT STARTED | - | Gated on 2B |
| Phase 4: 3-Level TODO | ✅ COMPLETE | 54/54 | Not validated |
| Phase 5: Message Transform | ⚠️ PARTIAL | 13/13 | System hook unknown |
| Phase 6: Auto-run + State | ❌ NOT STARTED | - | Gated on 2B |

### Gap Severity Distribution

| Severity | Count | Effort Estimate |
|----------|-------|-----------------|
| **CRITICAL** | 3 | 26-49 hours |
| **HIGH** | 5 | 78-107 hours |
| **MEDIUM** | 7 | 61-98 hours |
| **LOW** | 4 | 48-71 hours |
| **TOTAL** | **19** | **213-325 hours** |

---

## Common Workflows

### Workflow 1: Onboarding a New Developer

**Day 1: Read Core Docs**
1. `CLAUDE-ARCHITECTURE.md` (2-3 hours)
2. `planning/PROJECT.md` (1 hour)
3. `AGENTS.md` (1-2 hours)

**Day 2: Explore Code**
1. `CLAUDE-NAVIGATION.md` (1 hour)
2. `npm run build` + `npm test` (30 min)
3. Read `src/index.ts` (30 min)
4. Explore `/src/hooks/` (1 hour)
5. Explore `/src/tools/` (1 hour)

**Day 3: Pick a Task**
1. `CLAUDE-GAPS.md` - Choose a gap
2. `planning/PHASE-COMPLETION.md` - Check phase status
3. `CLAUDE-NAVIGATION.md` - Find relevant files
4. Start with LOW or MEDIUM gap

**Week 1: Complete First Task**
1. Follow `CLAUDE-NAVIGATION.md` patterns
2. Add tests in `/tests/`
3. Update documentation
4. Submit for review

---

### Workflow 2: Implementing a New Feature

**Step 1: Planning**
1. Read `planning/GOVERNANCE.md` (principles)
2. Check `planning/PHASE-COMPLETION.md` (current phase)
3. Check `CLAUDE-GAPS.md` (is this a gap?)
4. Read `AGENTS.md` (agent rules)

**Step 2: Design**
1. Define Zod schema first
2. Generate TypeScript types
3. Design data flow
4. Document in turn-based plan

**Step 3: Implement**
1. Follow `CLAUDE-NAVIGATION.md` patterns
2. Write code
3. Add tests
4. Zero TypeScript errors

**Step 4: Validate**
1. `npm test` - All tests pass
2. `npm run typecheck` - Zero errors
3. Update phase completion doc
4. Update gaps doc

**Step 5: Document**
1. Update `CLAUDE-ARCHITECTURE.md`
2. Update `CLAUDE-NAVIGATION.md`
3. Update `CLAUDE-GAPS.md`
4. Commit with clear message

---

### Workflow 3: Debugging a Production Issue

**Step 1: Gather Context**
1. Reproduce issue
2. Check logs (`.idumb/governance/`)
3. Review `CLAUDE-ARCHITECTURE.md` (data flow)
4. Review `CLAUDE-NAVIGATION.md` (file relationships)

**Step 2: Isolate**
1. Create minimal reproduction
2. Add debug logging
3. Run relevant tests
4. Check for recent changes

**Step 3: Fix**
1. Follow `CLAUDE-NAVIGATION.md` patterns
2. Add test for issue
3. Fix code
4. Verify test passes

**Step 4: Validate**
1. Run full test suite
2. Check for regressions
3. Update documentation
4. Document fix in turn-based plan

---

### Workflow 4: Preparing for Release

**Step 1: Validate**
1. `npm test` - All 294 tests pass
2. `npm run typecheck` - Zero errors
3. `npm run build` - Clean build
4. Check all phases complete in `planning/PHASE-COMPLETION.md`

**Step 2: Document**
1. Update `CHANGELOG.md`
2. Update `README.md`
3. Update `CLAUDE-ARCHITECTURE.md` (validation status)
4. Update `CLAUDE-GAPS.md` (close gaps)

**Step 3: Test**
1. Load plugin in OpenCode
2. Run live validation (Phase 2B)
3. Run stress test scenario
4. Verify 60% improvement

**Step 4: Release**
1. Tag version
2. Push to GitHub
3. Publish to npm
4. Announce in project

---

## File Naming Conventions

### Documentation Files

| Pattern | Purpose | Example |
|---------|---------|---------|
| `CLAUDE-*.md` | Claude-specific documentation | `CLAUDE-ARCHITECTURE.md` |
| `README.md` | Project introduction | `README.md` |
| `CHANGELOG.md` | Version history | `CHANGELOG.md` |
| `AGENTS.md` | Agent system reference | `AGENTS.md` |

### Source Code Files

| Pattern | Purpose | Example |
|---------|---------|---------|
| `*.ts` | TypeScript source | `src/index.ts` |
| `*.test.ts` | Test file | `tests/tool-gate.test.ts` |
| `index.ts` | Barrel export | `src/hooks/index.ts` |

### Planning Files

| Pattern | Purpose | Example |
|---------|---------|---------|
| `*.md` (UPPERCASE) | Governance docs | `PROJECT.md`, `GOVERNANCE.md` |
| `n*-*.md` | Turn-based plans | `n3-2-1e.md`, `n4-2-1.md` |
| `*-date.md` | Dated artifacts | `session-deldegation-tools-init-run.md` |

---

## Contribution Guidelines

### Before Contributing

1. **Read governance docs**
   - `planning/GOVERNANCE.md` (principles, pitfalls)
   - `planning/PHASE-COMPLETION.md` (phase gates)
   - `AGENTS.md` (agent rules)

2. **Check existing gaps**
   - `CLAUDE-GAPS.md` - Is this already tracked?
   - If yes, work on that gap
   - If no, add new gap with rationale

3. **Understand architecture**
   - `CLAUDE-ARCHITECTURE.md` - How system works
   - `CLAUDE-NAVIGATION.md` - Where code lives
   - Follow existing patterns

### Making Changes

1. **Create branch** from `dev`
2. **Make changes** following patterns
3. **Add tests** for new code
4. **Update documentation** (CLAUDE-*.md)
5. **Run test suite** (npm test)
6. **Type check** (npm run typecheck)
7. **Submit PR** with clear description

### Commit Message Format

```
<type>: <brief description>

<details>

- File: /path/to/file
- Tests: Added/Updated
- Docs: Updated CLAUDE-*.md
- Phase: N (if applicable)
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code refactoring
- `test` - Test changes
- `docs` - Documentation only
- `governance` - Governance updates

---

## Getting Help

### Internal Resources

1. **Documentation** - Start with `CLAUDE-ARCHITECTURE.md`
2. **Planning Docs** - Check `planning/` directory
3. **Tests** - Look at `/tests/` for examples
4. **Logs** - Check `.idumb/governance/` for debug info

### External Resources

1. **OpenCode Docs** - https://opencode-ai.dev
2. **Zod Docs** - https://zod.dev
3. **TypeScript Docs** - https://www.typescriptlang.org/docs

### Asking Questions

1. **Search existing docs** - Use `CLAUDE-INDEX.md` to find relevant doc
2. **Check gaps** - `CLAUDE-GAPS.md` may already track the issue
3. **Check planning** - `planning/` may have context
4. **Ask in team channel** - Provide context from docs

---

## Summary

iDumb v2 has **comprehensive documentation** across 4 core documents:

1. **CLAUDE-ARCHITECTURE.md** - Complete architecture reference (2000 lines)
2. **CLAUDE-NAVIGATION.md** - Code navigation guide (800 lines)
3. **CLAUDE-GAPS.md** - Gaps analysis (1200 lines)
4. **AGENTS.md** - Agent system documentation (1400 lines)

**Plus:**
- Planning docs (`PROJECT.md`, `GOVERNANCE.md`, `PHASE-COMPLETION.md`, `SUCCESS-CRITERIA.md`)
- Test suites (294/294 assertions passing)
- Turn-based plans (`planning/implamentation-plan-turn-based/`)

**Key Stats:**
- ~14,717 LOC source code
- 294/294 tests passing (100%)
- Zero TypeScript errors
- 10 files >500 LOC (need splitting)
- 19 gaps identified (213-325 hours to close)

**Next Action:**
Start with `CLAUDE-ARCHITECTURE.md` to understand the system, then use `CLAUDE-NAVIGATION.md` to find specific code.

---

*Index created: 2026-02-07*
*Plugin version: 2.2.0*
*Documentation coverage: 5 core docs + 4 planning docs + 9 test suites*
