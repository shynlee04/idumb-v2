---
name: research-workflow-planner
description: |
  Create structured, executable research plans with clear phases, checkpoints, 
  and validation criteria. Use proactively when research intent is clear but 
  execution plan is missing. This skill transforms research goals into 
  actionable workflows with defined deliverables, time estimates, and 
  success metrics, ensuring research is systematic and produces useful 
  outputs.
  
  Examples:
  - "Research how to add OAuth" (intent clear, need plan) → trigger workflow planner
  - "Investigate performance bottlenecks" (intent clear, need plan) → trigger workflow planner
  - "Analyze codebase architecture" (intent clear, need plan) → trigger workflow planner
  - "Find best practices for X" (intent clear, need plan) → trigger workflow planner
  - "Compare technology options" (intent clear, need plan) → trigger workflow planner
version: 1.0.0
---

# Skill: Research Workflow Planner

Create structured, executable research plans with clear phases, checkpoints, 
and validation criteria.

## When to Use This Skill

**Trigger this skill when:**
- Research intent is clear (use `intent-clarification` first if not)
- Research scope is defined (use `gap-analysis` if not)
- Gaps are identified and prioritized (use `gap-analysis` if not)
- Need a systematic approach to execute research
- Research involves multiple steps, sources, or phases
- Stakeholder approval required before research begins

**Do NOT use when:**
- Research is trivial (single web search or file read)
- Research plan already exists
- Intent is unclear (use `intent-clarification` first)
- Scope or gaps are undefined (use `gap-analysis` first)

## Research Workflow Framework

### Step 1: Define Research Objectives

Start with clear, measurable objectives:

```
Research Title: [Descriptive title]

Primary Objective:
[What is the main goal? Must be specific and measurable]

Secondary Objectives:
[What additional goals support the primary objective?]

Success Criteria:
[How will we know when research is complete?]
- [Criterion 1 - measurable]
- [Criterion 2 - measurable]
- [Criterion 3 - measurable]

Research Question(s):
[What questions will this research answer?]
1. [Question 1]
2. [Question 2]
3. [Question 3]
```

### Step 2: Identify Information Sources

Map out where information will come from:

```
Primary Sources (Direct Investigation):
- [Codebase analysis - codemap, grep, read]
- [Internal documentation - AGENTS.md, docs, comments]
- [Running the system - logs, metrics, behavior]
- [Existing tests - test files reveal expected behavior]

Secondary Sources (External Research):
- [Official documentation - SDK docs, API references]
- [Community resources - Stack Overflow, GitHub issues]
- [Best practices - blog posts, conference talks]
- [Comparison studies - benchmarks, case studies]
- [Industry standards - RFCs, specifications]

Tertiary Sources (Contextual Understanding):
- [Similar code in this codebase - patterns, conventions]
- [Related features - dependencies, integrations]
- [Historical context - git history, previous decisions]
```

### Step 3: Structure Research Phases

Break research into logical phases with clear deliverables:

```
Phase 1: Discovery
Goal: [What will this phase achieve?]
Duration: [Estimated time]
Deliverables: [What will you have at the end?]
  - [Deliverable 1]
  - [Deliverable 2]
Checkpoint: [What validates completion?]
  
Phase 2: Deep Dive
Goal: [What will this phase achieve?]
Duration: [Estimated time]
Deliverables: [What will you have at the end?]
  - [Deliverable 1]
  - [Deliverable 2]
Checkpoint: [What validates completion?]
  
Phase 3: Validation
Goal: [What will this phase achieve?]
Duration: [Estimated time]
Deliverables: [What will you have at the end?]
  - [Deliverable 1]
  - [Deliverable 2]
Checkpoint: [What validates completion?]
  
Phase 4: Synthesis
Goal: [What will this phase achieve?]
Duration: [Estimated time]
Deliverables: [What will you have at the end?]
  - [Deliverable 1]
  - [Deliverable 2]
Checkpoint: [What validates completion?]
```

### Step 4: Define Phase Tasks

For each phase, break down into specific tasks:

```
Phase X: [Phase Name]

Tasks:
1. [Task name]
   - Description: [What to do]
   - Tools: [Which OpenCode tools to use]
   - Output: [What will this produce]
   - Estimated time: [How long?]
   - Dependencies: [What must happen first?]
   
2. [Task name]
   - Description: [What to do]
   - Tools: [Which OpenCode tools to use]
   - Output: [What will this produce]
   - Estimated time: [How long?]
   - Dependencies: [What must happen first?]
```

### Step 5: Specify Checkpoints and Validation

Define validation moments at checkpoints:

```
Checkpoint: After [Phase/Task]

Validation Questions:
- [Question 1 - has phase delivered its outputs?]
- [Question 2 - is direction still correct?]
- [Question 3 - should we adjust approach?]

Approval Required: [Yes/No - if yes, who approves?]

Stop Conditions:
- If [condition], pause for input
- If [condition], adjust plan
- If [condition], abort research

Go/No-Go Decision:
- [Criteria for continuing]
- [Criteria for stopping]
```

### Step 6: Define Final Deliverables

Specify what research will produce:

```
Research Outputs:

Primary Deliverable:
[Main research output - report, recommendation, analysis]
- Format: [markdown, presentation, code examples, etc.]
- Structure: [sections, sections, sections]
- Audience: [who will read this?]

Secondary Deliverables:
- [Supporting materials - data, code snippets, diagrams]
- [Supporting materials - links, references, citations]
- [Supporting materials - action items, recommendations]

Artifacts to Create:
- [Document 1 - e.g., .idumb/research/analysis-2026-02-08.md]
- [Document 2 - e.g., .idumb/brain/knowledge/finding.md]
- [Document 3 - e.g., implementation recommendations]

Documentation Format:
- Structure: [outline of document]
- Evidence: [how to cite sources?]
- Recommendations: [how to structure recommendations?]
```

### Step 7: Estimate Resources

Define what's needed for research:

```

Time Estimates:
Phase 1: [X hours/days]
Phase 2: [X hours/days]
Phase 3: [X hours/days]
Phase 4: [X hours/days]
Total: [X hours/days]

Buffer Time: [X% for unknowns, contingencies]
Total with Buffer: [X hours/days]

Tool Access Needed:
- [idumb_webfetch for external docs]
- [idumb_codemap for dependency analysis]
- [idumb_read for code investigation]
- [grep for pattern searching]
- [bash for running commands if needed]

External Resources:
- [URLs to fetch - official docs, APIs, etc.]
- [Tools to install if needed]
- [Access needed - APIs, accounts, etc.]

Risks and Contingencies:
- [Risk 1] - [Mitigation]
- [Risk 2] - [Mitigation]
```

### Step 8: Create Research Plan Document

Compile into a comprehensive plan:

```
# Research Plan: [Title]

## Overview

**Research Objective:** [Primary objective]

**Success Criteria:**
- [Criterion 1]
- [Criterion 2]

**Research Questions:**
1. [Question 1]
2. [Question 2]

## Information Sources

**Primary Sources:**
- [Source 1]
- [Source 2]

**Secondary Sources:**
- [Source 1]
- [Source 2]

## Research Phases

### Phase 1: [Phase Name]
**Goal:** [Goal]
**Duration:** [Time]
**Deliverables:** [Deliverables]
**Checkpoint:** [Validation criteria]

**Tasks:**
1. [Task 1] - [Time] - [Output]
2. [Task 2] - [Time] - [Output]

### Phase 2: [Phase Name]
...

## Final Deliverables

**Primary Deliverable:** [Description]
**Secondary Deliverables:** [List]
**Artifacts:** [List of documents to create]

## Resource Estimates

**Time:** [Total time]
**Buffer:** [Buffer time]
**Total with Buffer:** [Final time estimate]

**Tools Needed:** [List]
**External Resources:** [List]

## Risks and Contingencies

- [Risk 1] - [Mitigation 1]
- [Risk 2] - [Mitigation 2]

## Approval

- [ ] Research objectives approved
- [ ] Research plan approved
- [ ] Resources available
- [ ] Ready to begin

**Stakeholder Approval:** [Name, Date]

---

## Research Execution Log

[Track progress as research unfolds]

### Phase 1 Complete
- [ ] All tasks completed
- [ ] Deliverables produced
- [ ] Checkpoint validated
- [ ] Approved to proceed to Phase 2

### Phase 2 Complete
...

### Research Complete
- [ ] All phases completed
- [ ] All deliverables produced
- [ ] Success criteria met
- [ ] Stakeholder review and approval

**Completion Date:** [Date]
**Total Time Spent:** [Actual time]
```

## Common Research Workflow Patterns

### Pattern 1: Technology Investigation

```
Research: "Investigate how to add OAuth 2.0 authentication"

Phase 1: Context Discovery (2 hours)
Goal: Understand current auth state and requirements
Tasks:
  1. Search codebase for existing auth implementations (idumb_codemap)
  2. Read AGENTS.md and relevant docs for context (idumb_read)
  3. Identify auth-related dependencies (grep)
Deliverables: Current auth state report, requirements summary
Checkpoint: Stakeholder confirms requirements and context

Phase 2: OAuth Standards Research (3 hours)
Goal: Understand OAuth 2.0 specification and best practices
Tasks:
  1. Fetch official OAuth 2.0 RFC docs (idumb_webfetch)
  2. Research OAuth implementation patterns in similar projects (web search)
  3. Identify security considerations and pitfalls (web search)
Deliverables: OAuth 2.0 spec summary, security checklist, best practices guide
Checkpoint: Stakeholder confirms understanding and approach

Phase 3: Technology Selection (2 hours)
Goal: Evaluate OAuth libraries and choose solution
Tasks:
  1. Research popular OAuth libraries for our stack (web search)
  2. Compare features, community support, maintenance (multi-aspect-assessment)
  3. Identify integration complexity for each option (gap-analysis)
Deliverables: Technology comparison matrix, recommendation with justification
Checkpoint: Stakeholder approves technology choice

Phase 4: Implementation Planning (2 hours)
Goal: Create implementation roadmap
Tasks:
  1. Map OAuth flow to existing auth system (idumb_read)
  2. Identify integration points and dependencies (gap-analysis)
  3. Create phased implementation plan with milestones (this skill)
Deliverables: Implementation plan, migration strategy, testing checklist
Checkpoint: Stakeholder approves implementation plan

Total Estimated Time: 9 hours + 2 hours buffer = 11 hours
```

### Pattern 2: Performance Investigation

```
Research: "Investigate performance bottlenecks in API"

Phase 1: Baseline Measurement (3 hours)
Goal: Establish current performance characteristics
Tasks:
  1. Run existing performance tests (bash)
  2. Analyze current metrics and logs (idumb_read)
  3. Identify slowest endpoints (grep search for logs)
Deliverables: Performance baseline report, slowest endpoints list
Checkpoint: Stakeholder confirms baseline understanding

Phase 2: Root Cause Analysis (4 hours)
Goal: Identify why slow endpoints are slow
Tasks:
  1. Read slow endpoint code to identify patterns (idumb_read)
  2. Search for N+1 queries, inefficient loops (grep patterns)
  3. Analyze database queries if applicable (codemap for DB access)
Deliverables: Root cause analysis, suspected bottlenecks identified
Checkpoint: Stakeholder validates root causes

Phase 3: Solution Research (3 hours)
Goal: Identify solutions for each bottleneck
Tasks:
  1. Research caching strategies (web search)
  2. Research query optimization patterns (web search)
  3. Research async processing options (web search)
Deliverables: Solution options for each bottleneck, feasibility analysis
Checkpoint: Stakeholder prioritizes solutions

Phase 4: Validation Planning (2 hours)
Goal: Create validation plan for solutions
Tasks:
  1. Define performance targets (gap-analysis)
  2. Create testing approach (this skill)
  3. Identify monitoring needs (gap-analysis)
Deliverables: Validation plan, success criteria, monitoring recommendations
Checkpoint: Stakeholder approves validation approach

Total Estimated Time: 12 hours + 3 hours buffer = 15 hours
```

### Pattern 3: Codebase Architecture Analysis

```
Research: "Analyze codebase architecture and identify patterns"

Phase 1: Structure Mapping (2 hours)
Goal: Map codebase structure and organization
Tasks:
  1. Run full project scan (idumb_scan)
  2. Analyze directory structure and module organization (glob, ls)
  3. Identify framework and tech stack (idumb_scan)
Deliverables: Codebase structure map, technology inventory
Checkpoint: Structure confirmed with stakeholder

Phase 2: Pattern Identification (4 hours)
Goal: Identify architectural patterns and conventions
Tasks:
  1. Read key architectural files (AGENTS.md, docs) (idumb_read)
  2. Analyze module dependencies (idumb_codemap - graph)
  3. Search for common patterns (grep patterns)
Deliverables: Pattern inventory, dependency diagram, convention summary
Checkpoint: Patterns validated with stakeholder

Phase 3: Quality Assessment (3 hours)
Goal: Assess code quality and technical debt
Tasks:
  1. Run code quality scanner (idumb_init quality scan)
  2. Identify smell patterns in code (codemap - todos)
  3. Map technical debt hotspots (grep for TODO, FIXME)
Deliverables: Quality report, technical debt inventory, prioritized issues
Checkpoint: Quality assessment validated

Phase 4: Recommendations (3 hours)
Goal: Create actionable recommendations
Tasks:
  1. Analyze findings and identify improvement opportunities
  2. Prioritize recommendations by impact and effort (multi-aspect-assessment)
  3. Create phased improvement roadmap (this skill)
Deliverables: Recommendations report, phased improvement plan
Checkpoint: Stakeholder approves recommendations

Total Estimated Time: 12 hours + 3 hours buffer = 15 hours
```

### Pattern 4: Technology Comparison

```
Research: "Compare React, Vue, and Angular for new project"

Phase 1: Requirement Definition (1 hour)
Goal: Define project requirements and constraints
Tasks:
  1. Clarify project goals and constraints (intent-clarification)
  2. Identify team skills and preferences (gap-analysis)
  3. Define success criteria (gap-analysis)
Deliverables: Requirements document, constraints list, success criteria
Checkpoint: Requirements approved by stakeholder

Phase 2: Technology Research (4 hours)
Goal: Deep dive into each technology
Tasks:
  1. Research React: docs, ecosystem, learning curve (web search, webfetch)
  2. Research Vue: docs, ecosystem, learning curve (web search, webfetch)
  3. Research Angular: docs, ecosystem, learning curve (web search, webfetch)
Deliverables: Technology deep-dives (3 documents)
Checkpoint: Deep-dives validated by stakeholder

Phase 3: Multi-Aspect Assessment (2 hours)
Goal: Compare technologies across multiple dimensions
Tasks:
  1. Assess each technology: technical, business, UX, maintainability (multi-aspect-assessment)
  2. Create comparison matrix (this skill)
  3. Identify trade-offs and recommendations (multi-aspect-assessment)
Deliverables: Comparison matrix, assessment report, recommendations
Checkpoint: Assessment validated by stakeholder

Phase 4: Proof of Concept Planning (2 hours)
Goal: Plan validation approach
Tasks:
  1. Define POC scope for top choice (gap-analysis)
  2. Identify POC success criteria (gap-analysis)
  3. Create POC plan (this skill)
Deliverables: POC plan, success criteria
Checkpoint: Stakeholder approves POC approach

Total Estimated Time: 9 hours + 2 hours buffer = 11 hours
```

## Research Plan Template

```markdown
# Research Plan: [Title]

## Overview

**Primary Objective:** [What we're trying to learn/achieve]

**Secondary Objectives:**
- [Objective 1]
- [Objective 2]

**Success Criteria:**
- [Criterion 1 - measurable]
- [Criterion 2 - measurable]
- [Criterion 3 - measurable]

**Research Questions:**
1. [What will this research answer?]
2. [What will this research answer?]

## Information Sources

**Primary Sources (Direct Investigation):**
- [ ] Codebase analysis
- [ ] Internal documentation
- [ ] Existing tests
- [ ] Running the system

**Secondary Sources (External Research):**
- [ ] Official documentation
- [ ] Community resources
- [ ] Best practices
- [ ] Comparison studies

## Research Phases

### Phase 1: [Phase Name]
**Goal:** [What this phase achieves]
**Duration:** [Estimated time]
**Deliverables:**
- [ ] [Deliverable 1]
- [ ] [Deliverable 2]

**Tasks:**
1. [Task 1] - [Time] - [Output]
2. [Task 2] - [Time] - [Output]

**Checkpoint:**
- [ ] All deliverables produced
- [ ] [Validation question 1]
- [ ] [Validation question 2]
**Approval Required:** [Yes/No]

### Phase 2: [Phase Name]
...

## Final Deliverables

**Primary Deliverable:** [Description]

**Secondary Deliverables:**
- [ ] [Deliverable 1]
- [ ] [Deliverable 2]

**Artifacts to Create:**
- [ ] [Document 1 path]
- [ ] [Document 2 path]

## Resource Estimates

**Total Time:** [Hours/Days]
**Buffer Time:** [Hours/Days]
**Total with Buffer:** [Hours/Days]

**Tools Needed:**
- [ ] [idumb_webfetch]
- [ ] [idumb_codemap]
- [ ] [idumb_read]
- [ ] [grep]

**External Resources:**
- [ ] [URL 1]
- [ ] [URL 2]

## Risks and Contingencies

- [Risk 1] - [Mitigation 1]
- [Risk 2] - [Mitigation 2]

## Approval

- [ ] Research objectives approved
- [ ] Research plan approved
- [ ] Resources available
- [ ] Ready to begin

**Stakeholder Approval:** [Name, Date]
```

## Common Mistakes to Avoid

❌ **Creating vague objectives**  
→ Objectives must be specific and measurable

❌ **Skipping checkpoints**  
→ Checkpoints catch misalignment early. Define them clearly.

❌ **Not estimating buffer time**  
→ Research always takes longer than expected. Add 20-30% buffer.

❌ **Forgetting validation criteria**  
→ How will you know a phase is complete? Define criteria.

❌ **Ignoring stakeholder approval**  
→ Research is worthless if stakeholder doesn't accept outputs.

❌ **Planning in isolation**  
→ Validate plan with stakeholder before executing.

❌ **Not defining stop conditions**  
→ When should you pause or abort? Define conditions upfront.

❌ **Over-planning**  
→ Don't plan every detail. Keep phases and tasks high-level enough to adapt.

❌ **Not using the right tools**  
→ Use `opencode-primitive-selector` to choose appropriate tools.

❌ **Skipping documentation**  
→ Create artifacts as you go. Don't wait until the end.

## Integration with Other Skills

Use **after**:
- `intent-clarification` - Ensure intent is clear before planning
- `gap-analysis` - Ensure gaps are identified before planning
- `multi-aspect-assessment` - Use assessment to inform research scope

Use **with**:
- `opencode-primitive-selector` - Choose tools for each task

Use **before**:
- Research execution (following the plan)

## Success Criteria

Research workflow plan is successful when:
- ✓ Objectives are specific and measurable
- ✓ Phases are logical with clear goals
- ✓ Tasks are actionable with tools specified
- ✓ Checkpoints have validation criteria
- ✓ Deliverables are clearly defined
- ✓ Time estimates include buffer
- ✓ Stakeholder approves plan before execution
- ✓ Plan is documented in `.idumb/research/` or `.idumb/brain/`

## Outcome

After using this skill:
- Clear research plan with phases, tasks, and deliverables
- Defined checkpoints and validation criteria
- Resource estimates with buffer time
- Stakeholder approval to proceed
- Ready to execute research systematically

**Never execute research without a plan.** This skill transforms research goals into actionable workflows.
