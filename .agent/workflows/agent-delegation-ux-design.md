---
description: Autonomous UX Design Document generation through component analysis, design pattern research, and accessibility audit. Designed for sub-agent delegation in Claude Code.
delegation_target: Claude Code Sub-Agent
phase: 3-solutioning
output: _bmad-output/planning-artifacts/ux-design.md
requires:
  - PRD document (_bmad-output/planning-artifacts/prd.md)
  - Architecture document (_bmad-output/planning-artifacts/architecture.md)
  - Codebase access to presentation layer
  - MCP tools (Context7, Deepwiki, Exa)
depends_on: agent-delegation-architecture
---

# Agent Delegation: UX Design Document Workflow

## Overview

This workflow generates a **UX Design Document** through autonomous component analysis, design system extraction, and accessibility audit. Designed for Claude Code sub-agent execution.

**Execution Mode:** Autonomous with validation gates  
**Handoff Protocol:** Report to `@bmad-core-bmad-master` on completion  

---

## Prerequisites Check

```yaml
prerequisites:
  required:
    - _bmad-output/planning-artifacts/prd.md: must exist
    - _bmad-output/planning-artifacts/architecture.md: must exist
    - src/presentation/: component layer accessible
  recommended:
    - src/index.css or tailwind.config: design tokens
    - agent-os/standards/frontend/: UI standards
```

---

## Phase 1: Design System Extraction

### 1.1 Styling System Analysis

```yaml
actions:
  - view_file: tailwind.config.ts or tailwind.config.js
  - view_file: src/index.css (or app.css)
  - grep_search:
      query: "colors:|fontFamily:|spacing:"
      path: "*.config.*"
```

**Extract:**
- Color palette (HSL, RGB, named)
- Typography scale
- Spacing system
- Border radius tokens
- Shadow definitions
- Animation/transition tokens

**Output Variable:** `{design_tokens}`

### 1.2 Component Library Audit

```yaml
actions:
  - list_dir: src/presentation/components/ui/
  - list_dir: src/presentation/components/common/
  - For each component:
      - view_file_outline: component file
      - Extract: props, variants, accessibility props
```

**Output Variable:** `{component_inventory}`

### 1.3 Third-Party UI Dependencies

```yaml
actions:
  - grep_search:
      query: "@radix-ui|lucide-react|shadcn"
      path: src/
  - Check package.json for UI libs
```

**Output Variable:** `{ui_dependencies}`

---

## Phase 2: User Journey Visual Mapping

### 2.1 Route & Navigation Analysis

```yaml
actions:
  - list_dir: src/routes/
  - view_file_outline: src/routeTree.gen.ts
  - Identify:
      - Public vs authenticated routes
      - Workspace routes (/ide, /notes, /knowledge, /study)
      - Settings routes
      - Navigation hierarchy
```

**Output Variable:** `{navigation_structure}`

### 2.2 Page Layout Patterns

```yaml
actions:
  - For each workspace page:
      - view_file: src/routes/{workspace}.lazy.tsx
      - Extract: Layout structure, panels, sidebars
      - Identify: Responsive breakpoints
```

**Output Variable:** `{layout_patterns}`

### 2.3 User Flow Tracing

Cross-reference PRD user journeys with actual implementation:

```yaml
journey_trace:
  - For each journey in PRD:
      - Trace route: start → intermediate → end
      - Identify: UI components involved
      - Note: Any UX gaps or friction points
```

**Output Variable:** `{user_flows}`

---

## Phase 3: Accessibility & UX Quality Audit

### 3.1 Accessibility Pattern Check

```yaml
audit_checks:
  - grep_search:
      query: "aria-|role=|tabIndex"
      path: src/presentation/
  - grep_search:
      query: "sr-only|screen-reader"
      path: src/
  - Check for: Focus management, keyboard navigation
```

**Output Variable:** `{accessibility_status}`

### 3.2 Responsive Design Analysis

```yaml
actions:
  - grep_search:
      query: "useMediaQuery|useResponsive|isMobile"
      path: src/
  - grep_search:
      query: "sm:|md:|lg:|xl:"
      path: src/presentation/
```

**Output Variable:** `{responsive_patterns}`

### 3.3 Motion & Animation Audit

```yaml
actions:
  - grep_search:
      query: "animate-|transition-|duration-"
      path: src/
  - grep_search:
      query: "framer-motion|useSpring|useTransition"
      path: src/
```

**Output Variable:** `{motion_patterns}`

---

## Phase 4: External Research (Design Patterns)

### 4.1 Design System Best Practices

```yaml
mcp_research:
  - context7:
      library: "radix-ui"
      query: "accessible component patterns and composition"
  - exa:
      query: "modern design system architecture React 2025"
      tokens: 4000
```

**Output Variable:** `{design_best_practices}`

### 4.2 Workspace UX Patterns

```yaml
mcp_research:
  - exa:
      query: "IDE workspace UI patterns VSCode Monaco"
      tokens: 3000
  - exa:
      query: "note-taking app UX Notion Obsidian"
      tokens: 3000
  - tavily:
      query: "AI coding assistant interface design 2025"
```

**Output Variable:** `{workspace_ux_patterns}`

---

## Phase 5: UX Document Generation

### 5.1 Create UX Design Document

Create file: `_bmad-output/planning-artifacts/ux-design.md`

```markdown
---
version: 1.0.0-draft
generated: {timestamp}
agent: delegation-workflow
phase: solutioning
status: draft
stepsCompleted: []
based_on_prd: true
based_on_architecture: true
---

# UX Design Document: {project_name}

## Document Control
- **Version:** 1.0.0-draft
- **Generated:** {timestamp}
- **PRD Reference:** _bmad-output/planning-artifacts/prd.md
- **Architecture Reference:** _bmad-output/planning-artifacts/architecture.md
- **Status:** Draft - Pending UX Review

---

## 1. Design System Foundation

### 1.1 Design Principles
[Inferred from codebase patterns + industry best practices]

### 1.2 Color System
| Token | Value | Usage |
|-------|-------|-------|
[From {design_tokens}]

### 1.3 Typography Scale
| Level | Font | Size | Weight | Line Height |
|-------|------|------|--------|-------------|
[From {design_tokens}]

### 1.4 Spacing Scale
[From {design_tokens}]

### 1.5 Motion Design
[From {motion_patterns}]

---

## 2. Component Library

### 2.1 Primitive Components
[From Radix UI usage]

### 2.2 Composed Components
| Component | Location | Props | Variants | A11y Status |
|-----------|----------|-------|----------|-------------|
[From {component_inventory}]

### 2.3 Page-Level Components
[From route analysis]

---

## 3. Navigation Architecture

### 3.1 Information Architecture
```
[ASCII or Mermaid sitemap from {navigation_structure}]
```

### 3.2 Navigation Patterns
- Primary nav: [pattern]
- Secondary nav: [pattern]
- Breadcrumbs: [usage]
- Deep links: [support]

### 3.3 Workspace Navigation
[Switching between IDE, Notes, Knowledge, Study]

---

## 4. Layout System

### 4.1 Layout Templates
[From {layout_patterns}]

| Template | Usage | Structure |
|----------|-------|-----------|
| Hub Layout | / | [description] |
| Workspace Layout | /ide, /notes | [description] |
| Settings Layout | /settings | [description] |

### 4.2 Panel Architecture
[Resizable panels, sidebar patterns]

### 4.3 Responsive Breakpoints
| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
[From {responsive_patterns}]

---

## 5. User Flows

### 5.1 Core User Journeys
[From {user_flows} cross-referenced with PRD]

#### Journey 1: [Name]
```
[Flow diagram or step list]
```
- Entry: [route]
- Components: [list]
- Success State: [description]
- Error Handling: [description]

[Repeat for each journey]

---

## 6. Accessibility Compliance

### 6.1 Current A11y Status
| Criterion | Status | Evidence |
|-----------|--------|----------|
| Keyboard Navigation | ✅/⚠️/❌ | [code refs] |
| Screen Reader Support | ✅/⚠️/❌ | [code refs] |
| Focus Management | ✅/⚠️/❌ | [code refs] |
| Color Contrast | ✅/⚠️/❌ | [token analysis] |
| Motion Sensitivity | ✅/⚠️/❌ | [prefers-reduced-motion] |

### 6.2 WCAG 2.1 AA Compliance
[From {accessibility_status}]

### 6.3 Accessibility Improvement Plan
[Gaps identified and recommendations]

---

## 7. Workspace-Specific UX

### 7.1 IDE Workspace
[Monaco editor integration, file tree, terminal]

### 7.2 Notes Workspace
[BlockNote editor, AI toolbar, slash commands]

### 7.3 Knowledge Workspace
[Source management, RAG UI, search]

### 7.4 Study Workspace
[Flashcards, quizzes, progress tracking]

---

## 8. Interaction Patterns

### 8.1 Form Patterns
[Input validation, error display, submission]

### 8.2 Modal & Dialog Patterns
[From Radix Dialog usage]

### 8.3 Toast & Notification Patterns
[From Sonner usage]

### 8.4 Loading States
[Skeleton, spinner, progress patterns]

---

## 9. Dark/Light Mode

### 9.1 Theme Implementation
[From next-themes usage]

### 9.2 Token Mapping
[How tokens change between themes]

---

## 10. UX Improvement Recommendations

### 10.1 Quick Wins (Low Effort, High Impact)
[List with code references]

### 10.2 Medium-Term Improvements
[Requires refactoring]

### 10.3 Strategic UX Initiatives
[New patterns/features]

---

## Appendix A: Component Inventory Details
[Expanded from {component_inventory}]

## Appendix B: Research References
[URLs from MCP research]

## Appendix C: Screenshot/Wireframe References
[If generate_image was used]
```

### 5.2 Self-Validation

```yaml
validation_checks:
  - All 10 sections populated
  - Design tokens extracted
  - At least 3 user flows documented
  - Accessibility audit complete
  - Component inventory > 10 components
  - Document exceeds 250 lines
```

---

## Phase 6: Handoff & Reporting

### 6.1 Completion Report

```markdown
## UX Design Document Generation Complete

**Status:** ✅ Draft Complete
**Output:** _bmad-output/planning-artifacts/ux-design.md
**Lines:** {line_count}

### Design System Analysis
- Design tokens extracted: {count}
- Components inventoried: {count}
- UI dependencies: {list}

### Accessibility Status
- Overall: {rating}/5
- Critical issues: {count}
- Recommendations: {count}

### User Flows Documented
- Total flows: {count}
- Complete: {count}
- With gaps: {count}

### Items Requiring UX Review
1. [Accessibility gaps]
2. [Design inconsistencies]
3. [UX improvement priorities]

### Next Handoff
→ Ready for @bmad-bmm-ux-designer review
→ After approval: /agent-delegation-epics-stories
```

---

## Validation Gates

### Gate 1: Prerequisites
- PRD exists: REQUIRED
- Architecture exists: REQUIRED
- Presentation layer accessible: REQUIRED

### Gate 2: Extraction Quality
- Design tokens found: REQUIRED
- Components inventoried: REQUIRED

### Gate 3: Accessibility Audit
- A11y patterns checked: REQUIRED
- Issues documented: REQUIRED

### Gate 4: Document Completeness
- 10 sections populated: REQUIRED
- Document > 250 lines: REQUIRED

---

## Execution Command

```
Execute /agent-delegation-ux-design workflow autonomously.
Prerequisites: PRD and Architecture must exist.
Report completion to @bmad-core-bmad-master with artifacts.
Document accessibility gaps with severity.
Extract design tokens from Tailwind config if available.
```
