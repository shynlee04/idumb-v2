---
description: Autonomous Architecture Document generation through codebase analysis, research, and decision formalization. Designed for sub-agent delegation in Claude Code.
delegation_target: Claude Code Sub-Agent
phase: 3-solutioning
output: _bmad-output/planning-artifacts/architecture.md
requires:
  - PRD document (_bmad-output/planning-artifacts/prd.md)
  - Codebase access
  - MCP tools (Context7, Deepwiki, Exa, Tavily)
  - Research artifacts from investigations
depends_on: agent-delegation-prd
---

# Agent Delegation: Architecture Creation Workflow

## Overview

This workflow generates an **Architecture Decision Document** through autonomous codebase analysis, pattern recognition, and decision formalization. Designed for Claude Code sub-agent execution.

**Execution Mode:** Autonomous with validation gates  
**Handoff Protocol:** Report to `@bmad-core-bmad-master` on completion  

---

## Prerequisites Check

Before execution, verify:

```yaml
prerequisites:
  required:
    - _bmad-output/planning-artifacts/prd.md: must exist and be complete
    - src/: codebase must be accessible
  recommended:
    - _bmad-output/research/: existing investigation reports
    - agent-os/standards/: coding standards documents
```

If PRD doesn't exist, abort with message: "Dependency not met. Execute /agent-delegation-prd first."

---

## Phase 1: Codebase Architecture Extraction

### 1.1 Package & Dependency Analysis

```yaml
actions:
  - view_file: package.json
  - view_file: tsconfig.json
  - list_dir: src/
  - list_dir: src/infrastructure/
  - list_dir: src/lib/
  - list_dir: src/presentation/
```

**Extract:**
- Framework (TanStack Start, React, etc.)
- State management (Zustand, etc.)
- UI libraries (Radix, etc.)
- Build tools (Vite, etc.)
- External APIs (providers)

**Output Variable:** `{tech_stack}`

### 1.2 Layer Analysis

```yaml
pattern_detection:
  - Clean Architecture: Check for src/{core,domain,application,infrastructure,presentation}
  - Feature-based: Check for src/features/
  - Route-based: Check for src/routes/
  - Hybrid: Document actual pattern used
```

**Output Variable:** `{architecture_pattern}`

### 1.3 Store & State Mapping

```yaml
actions:
  - grep_search: 
      query: "create\(" 
      path: src/infrastructure/persistence/stores/
  - grep_search:
      query: "useStore|useAppStore"
      path: src/
```

**Output Variable:** `{state_architecture}`

### 1.4 API Contracts Extraction

```yaml
actions:
  - grep_search:
      query: "createFileRoute.*api"
      path: src/routes/
  - list files matching: src/routes/api/*.ts
```

**Output Variable:** `{api_contracts}`

---

## Phase 2: External Research (Patterns & Best Practices)

### 2.1 Framework-Specific Research

Based on `{tech_stack}`, execute targeted research:

```yaml
mcp_research:
  tanstack:
    - context7:
        library: "@tanstack/start"
        query: "server functions and SSR architecture"
    - context7:
        library: "@tanstack/ai"
        query: "chat streaming and tool calling patterns"
  zustand:
    - deepwiki:
        repo: "pmndrs/zustand"
        question: "slice pattern and persist middleware"
  webcontainer:
    - deepwiki:
        repo: "stackblitz/webcontainer-core"
        question: "file system and process management"
```

**Output Variable:** `{framework_patterns}`

### 2.2 Architecture Pattern Research

```yaml
mcp_research:
  - exa:
      query: "clean architecture TypeScript React 2025"
      tokens: 5000
  - tavily:
      query: "AI coding assistant architecture patterns"
      type: deep
```

**Output Variable:** `{industry_patterns}`

---

## Phase 3: Decision Extraction & Formalization

### 3.1 Extract Existing ADRs

```yaml
actions:
  - find files: _bmad-output/architecture/adr-*.md
  - Parse each ADR for: ID, Title, Status, Decision
```

**Output Variable:** `{existing_adrs}`

### 3.2 Identify Implicit Decisions

Analyze codebase for implicit architectural decisions:

```yaml
implicit_decisions:
  - Storage strategy: FSA vs IndexedDB (from storageType patterns)
  - Agent architecture: Full agents vs AI features (from investigation reports)
  - API routing: TanStack file routes vs REST (from routes/ structure)
  - State management: Zustand slices vs monolithic (from stores/)
  - Styling: TailwindCSS patterns (from component analysis)
```

**Output Variable:** `{implicit_decisions}`

### 3.3 Generate New ADRs from Investigations

For each investigation report in `_bmad-output/research/`:

```yaml
adr_generation:
  - Read investigation findings
  - Extract recommendations with HIGH confidence
  - Format as ADR with:
      - Context from investigation
      - Decision from recommendation
      - Consequences from impact analysis
```

**Output Variable:** `{new_adrs}`

---

## Phase 4: Architecture Document Generation

### 4.1 Create Architecture Document

Create file: `_bmad-output/planning-artifacts/architecture.md`

```markdown
---
version: 1.0.0-draft
generated: {timestamp}
agent: delegation-workflow
phase: solutioning
status: draft
stepsCompleted: []
based_on_prd: true
adr_count: {count}
---

# Architecture Decision Document: {project_name}

## Document Control
- **Version:** 1.0.0-draft
- **Generated:** {timestamp}
- **PRD Reference:** _bmad-output/planning-artifacts/prd.md
- **Status:** Draft - Pending Architect Review

## 1. System Overview

### 1.1 Architecture Style
[From {architecture_pattern}]

### 1.2 Technology Stack
| Layer | Technology | Version | Rationale |
|-------|------------|---------|-----------|
[From {tech_stack}]

### 1.3 High-Level Component Diagram
```
[ASCII or Mermaid diagram from layer analysis]
```

## 2. Core Architecture Decisions

### 2.1 Layer Structure
[From {architecture_pattern} with code evidence]

### 2.2 State Management Strategy
[From {state_architecture}]

### 2.3 API Design
[From {api_contracts}]

### 2.4 Storage Architecture
[From implicit decisions about FSA/IndexedDB]

### 2.5 Agent Execution Architecture
[From investigation 5: Unified AI Service]

## 3. Architecture Decision Records

### Existing ADRs
[List from {existing_adrs}]

### New ADRs (Generated)
[From {new_adrs}]

## 4. Component Architecture

### 4.1 Frontend Components
[From src/presentation/components/ analysis]

### 4.2 Business Logic
[From src/lib/ and src/application/ analysis]

### 4.3 Infrastructure
[From src/infrastructure/ analysis]

## 5. Data Architecture

### 5.1 Data Models
[From src/core/entities/ and src/domain/]

### 5.2 Persistence Strategy
[Dexie.js tables, localStorage, etc.]

### 5.3 Caching Strategy
[From store persistence middleware]

## 6. Integration Architecture

### 6.1 External Providers
[AI providers, APIs from codebase]

### 6.2 Browser APIs
[FSA, IndexedDB, WebContainer]

### 6.3 Event Architecture
[From event-bus.ts analysis]

## 7. Security Architecture

### 7.1 API Key Management
[From credential-vault.ts analysis]

### 7.2 Permission Model
[From workspace-permission-manager.ts]

## 8. Non-Functional Decisions

### 8.1 Performance
### 8.2 Scalability
### 8.3 Observability

## 9. Constraints & Trade-offs

[From gap analysis and investigation reports]

## 10. Open Questions

[Items requiring architect/human input]

## Appendix A: Research References
[URLs from MCP research]

## Appendix B: Code Evidence Index
[File:line references for each decision]
```

### 4.2 Populate Each Section

For each section:
1. Reference specific code files with line numbers
2. Include Mermaid diagrams where applicable
3. Add confidence scores
4. Cross-reference to PRD requirements

### 4.3 Self-Validation

```yaml
validation_checks:
  - All 10 sections populated
  - At least 3 ADRs documented (existing or new)
  - Tech stack complete with rationale
  - Component diagram present
  - Document exceeds 300 lines
  - Security architecture documented
```

---

## Phase 5: Handoff & Reporting

### 5.1 Update Frontmatter

```yaml
frontmatter_update:
  status: draft-complete
  stepsCompleted: [1, 2, 3, 4, 5]
  validationStatus: PASS|FAIL
  adrs_generated: {count}
  nextAction: Architect Review Required
```

### 5.2 Generate Completion Report

```markdown
## Architecture Document Generation Complete

**Status:** ✅ Draft Complete
**Output:** _bmad-output/planning-artifacts/architecture.md
**Lines:** {line_count}
**Sections:** 10/10

### ADR Status
- Existing ADRs parsed: {count}
- New ADRs generated: {count}
- Total decisions documented: {total}

### Confidence Assessment
- Tech Stack: HIGH (from package.json)
- Layer Architecture: HIGH (from codebase)
- State Management: HIGH (from stores)
- API Design: MEDIUM (evolving)
- Security: HIGH (credential-vault documented)

### Items Requiring Architect Review
1. [Implicit decisions needing formalization]
2. [Trade-offs needing validation]
3. [Open questions list]

### Research Sources Used
- Context7: {count} queries
- Deepwiki: {count} queries
- Exa/Tavily: {count} queries

### Next Handoff
→ Ready for @bmad-bmm-architect review
→ After approval: /agent-delegation-ux-design → /agent-delegation-epics-stories
```

---

## Validation Gates

### Gate 1: Prerequisites
- PRD exists: REQUIRED
- Codebase accessible: REQUIRED

### Gate 2: Extraction Quality
- Tech stack complete: REQUIRED
- At least 5 layers/modules identified: REQUIRED

### Gate 3: Decision Coverage
- All implicit decisions documented: REQUIRED
- ADRs formatted correctly: REQUIRED

### Gate 4: Document Completeness
- 10 sections populated: REQUIRED
- Document > 300 lines: REQUIRED
- Diagrams included: REQUIRED

---

## Error Handling

| Error | Action |
|-------|--------|
| PRD not found | ABORT - dependency not met |
| Investigation reports missing | WARN - continue with codebase-only |
| MCP tools timeout | Continue with cached patterns |
| ADR parsing fails | Generate from scratch |

---

## Execution Command

```
Execute /agent-delegation-architecture workflow autonomously.
Prerequisites: PRD must exist at _bmad-output/planning-artifacts/prd.md
Report completion to @bmad-core-bmad-master with artifacts.
Generate ADRs for any undocumented architectural decisions.
Mark trade-offs and open questions for architect review.
```
