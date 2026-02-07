# Step Skill: 05-pre-planning (NEW v2.0)

> **Master Source**: `_bmad/bmb/workflows/story-cycle/steps/05-pre-planning.md` | **Step**: 5/9

---

## Trigger

```
pre-planning
/pre-planning
pre planning
planning gate
research phase
```

---

## Parameters

```
story={story_key}    # Story key (required)
```

---

## description

**MANDATORY RESEARCH GATE** - Research and planning before implementation. Developer agent responsibility. This is the v2.0 "plan before code" innovation.

---

## Master Workflow Reference

**Full Instructions**: `_bmad/bmb/workflows/story-cycle/steps/05-pre-planning.md`

---

## What This Step Does

### 1. Load All Context
- Read story file: `{sprint_artifacts}/{story_key}.md`
- Read context XML: `{sprint_artifacts}/{story_key}-context.xml`

### 2. Research Protocol (MANDATORY)

**Use MCP Tools:**

| Tool | description | Query Pattern |
|------|---------|---------------|
| **Context7** | Official docs | `resolve-library-id` → `get-library-docs` |
| **DeepWiki** | GitHub patterns | `ask_question` with repo-specific query |
| **Tavily/Exa** | Community solutions | Semantic search for patterns |
| **Repomix** | Local analysis | Pack and grep existing code |

### 3. Document Research Findings

```markdown
#### Research Executed:

1. **Context7: {library_name}**
   - Query: {specific question}
   - Finding: {key insight}
   - Code Example: {relevant snippet}

2. **DeepWiki: {repo_name}**
   - Query: {how they solve this}
   - Finding: {pattern used}
   - Adaptation: {how we apply it}

3. **Tavily/Exa: {topic}**
   - Query: {community best practices}
   - Finding: {solutions found}
   - Decision: {chosen approach}

4. **Repomix: {component}**
   - Analyzed: {files analyzed}
   - Pattern: {existing patterns}
   - Consistency: {aligned with codebase}
```

### 4. Create Implementation Plan

```markdown
### Implementation Plan

#### Architecture Decision:
- Approach: {chosen approach}
- Rationale: {why this approach}
- Alternatives Considered:
  - Option A: {pros/cons}
  - Option B: {pros/cons}

#### File Changes:
| File | Action | description |
|------|--------|---------|
| src/lib/x.ts | Create | New utility |
| src/lib/y.ts | Modify | Add feature |

#### Task Breakdown:
1. T1: {task} - {files}
2. T2: {task} - {files}
3. T3: {task} - {files}

#### Estimated Time: {N} hours
#### Complexity: {low|medium|high}
```

### 5. Constitution Check

Verify implementation will follow:
- 8-bit design (no glassmorphism)
- TypeScript strict mode
- i18n for all strings
- Test coverage ≥80%

---

## Quality Gate

**Before proceeding to dev-story:**

- [ ] Research completed with all 4 MCP tools
- [ ] Implementation plan documented
- [ ] Architecture decision recorded
- [ ] Task breakdown created
- [ ] Constitution compliance verified

---

## Output

- **Research Document**: Added to story file
- **Implementation Plan**: Added to story file
- **Status Update**: `sprint-status.yaml` → `ready-for-dev`
- **Next Step**: `06-dev-story.md`

---

## v2.0 Innovation

This is the **mandatory "plan before code" gate** that was missing in v1.0. Prevents:
- Blind implementation without context
- Architectural inconsistency
- Reinventing existing patterns

---

**See Also**: `04-validate-context`, `06-dev-story`, `utils/_stale-check`
