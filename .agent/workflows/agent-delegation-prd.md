---
description: Autonomous PRD generation through research, codebase analysis, and iterative drafting. Designed for sub-agent delegation in Claude Code.
delegation_target: Claude Code Sub-Agent
phase: 2-planning
output: _bmad-output/planning-artifacts-v2/prd.md
requires: 
  - Mission statement (agent-os/product/mission.md or initial brief)
  - Codebase access
  - MCP tools (Context7, Deepwiki, Exa, Tavily)
---

# Agent Delegation: PRD Creation Workflow

## Overview

This workflow generates a **Product Requirements Document (PRD)** through autonomous research and analysis, designed for Claude Code sub-agent execution without interactive prompting.

**Execution Mode:** Autonomous with validation gates  
**Handoff Protocol:** Report to `@bmad-core-bmad-master` on completion  

---

## Phase 1: Context Ingestion (Research)

### 1.1 Load Existing Mission Context

```yaml
actions:
  - read_file: agent-os/product/mission.md
  - read_file: agent-os/product/roadmap.md (if exists)
  - read_file: _bmad-output/documentation/project-overview.md (brownfield reference only)
```

**Output Variable:** `{mission_context}` - Synthesized understanding of product direction

### 1.2 Codebase Structure Analysis

```yaml
actions:
  - list_dir: src/
  - grep_search: 
      query: "TODO|FIXME|@epic|@story"
      path: src/
  - view_file_outline: key entry files (routes, app, main)
```

**Output Variable:** `{codebase_structure}` - Current implementation state

### 1.3 External Research (MCP Tools)

Execute in parallel:

```yaml
mcp_research:
  - context7:
      library: "@tanstack/ai"
      query: "best practices for AI agent product architecture"
  - deepwiki:
      repo: "TanStack/ai"
      question: "common patterns for AI product features"
  - exa:
      query: "AI coding assistant product requirements 2025"
      tokens: 3000
  - tavily:
      query: "AI note-taking product competitive analysis"
      type: deep
```

**Output Variable:** `{market_research}` - Industry patterns and best practices

---

## Phase 2: Gap Analysis (Brownfield Intelligence)

### 2.1 Compare Codebase vs Documentation

```yaml
analysis_tasks:
  - Compare _bmad-output/documentation/architecture.md against actual src/ structure
  - Identify undocumented features in codebase
  - Identify documented features not yet implemented
  - List technical debt markers (TODO, FIXME, deprecated patterns)
```

**Output Variable:** `{gap_analysis}` - Delta between docs and reality

### 2.2 User Journey Mapping

```yaml
trace_tasks:
  - Map entry points: / → /hub → /notes → /ide → /knowledge → /study
  - Document existing user flows with code evidence
  - Identify broken or incomplete journeys
  - Reference: sprint-status.yaml for known issues
```

**Output Variable:** `{user_journeys}` - Current state journeys

---

## Phase 3: PRD Generation (Iterative Drafting)

### 3.1 Generate PRD Structure

Create file: `_bmad-output/planning-artifacts/prd.md`

```markdown
---
version: 1.0.0-draft
generated: {timestamp}
agent: delegation-workflow
phase: planning
status: draft
stepsCompleted: []
---

# Product Requirements Document: {project_name}

## Document Control
- **Version:** 1.0.0-draft
- **Generated:** {timestamp}
- **Status:** Draft - Pending Review
- **Generating Agent:** Claude Code Sub-Agent (PRD Delegation)

## Executive Summary
[Generated from {mission_context}]

## Problem Statement
[Synthesized from {gap_analysis} and {user_journeys}]

## Target Users
[Derived from codebase personas and route analysis]

## User Stories & Journeys
[Mapped from {user_journeys}]

## Functional Requirements
### Core Features (Existing - Validated)
[Features confirmed working in codebase]

### Core Features (Existing - Broken)
[Features with failing journeys, references to sprint-status.yaml]

### Planned Features
[From roadmap.md and @epic annotations]

### Deferred Features
[Explicitly out of scope]

## Non-Functional Requirements
### Performance
### Security
### Scalability
### Accessibility

## Technical Constraints
[From {codebase_structure} analysis]

## Success Metrics
[Proposed OKRs based on product type]

## Dependencies & Risks
[From {gap_analysis}]

## Appendix: Research References
[URLs and sources from MCP research]
```

### 3.2 Populate Each Section

For each section:
1. Draft content based on collected variables
2. Include code references where applicable (file:line)
3. Add confidence score (HIGH/MEDIUM/LOW) for each claim
4. Mark unknowns explicitly for human review

### 3.3 Self-Validation

```yaml
validation_checks:
  - All sections populated (no empty placeholders)
  - At least 3 user journeys documented
  - Functional requirements linked to code evidence
  - Non-functional requirements have measurable criteria
  - Document exceeds 200 lines (per governance rules)
```

---

## Phase 4: Handoff & Reporting

### 4.1 Update Frontmatter

```yaml
frontmatter_update:
  status: draft-complete
  stepsCompleted: [1, 2, 3, 4]
  validationStatus: PASS|FAIL
  nextAction: Human Review Required
```

### 4.2 Generate Completion Report

Output to console/return:

```markdown
## PRD Generation Complete

**Status:** ✅ Draft Complete
**Output:** _bmad-output/planning-artifacts/prd.md
**Lines:** {line_count}
**Sections Completed:** {section_count}/12

### Confidence Assessment
- Executive Summary: HIGH
- Problem Statement: MEDIUM (needs human validation)
- User Journeys: HIGH (code-traced)
- Functional Requirements: HIGH (code-validated)
- Non-Functional: LOW (needs human input)

### Items Requiring Human Review
1. [List specific items marked as LOW confidence]
2. [List sections with placeholders]

### Next Handoff
→ Ready for @bmad-bmm-pm review
→ After approval: /bmad-bmm-workflows-create-architecture
```

---

## Validation Gates

### Gate 1: Context Sufficiency
- Mission context loaded: REQUIRED
- Codebase accessible: REQUIRED
- MCP research completed: WARN if failed

### Gate 2: Gap Analysis Quality
- At least 1 gap identified: REQUIRED
- User journeys traced: REQUIRED

### Gate 3: PRD Completeness
- Document > 200 lines: REQUIRED
- All sections populated: REQUIRED
- Confidence scores added: REQUIRED

---

## Error Handling

| Error | Action |
|-------|--------|
| Mission.md not found | Generate stub from codebase package.json |
| MCP tools timeout | Continue with codebase-only analysis |
| Codebase access denied | FAIL - abort workflow |
| Brownfield docs corrupt | Ignore and generate fresh |

---

## Execution Command

To delegate this workflow to a sub-agent:

```
Execute /agent-delegation-prd workflow autonomously.
Report completion to @bmad-core-bmad-master with artifacts and validation status.
Do not request interactive input - make best judgment calls.
Mark LOW confidence items for human review.
```
