---
description: Conduct systematic deep research on tech specs, architecture patterns, and cross-dependencies using MCP tools
---

# Deep Research Workflow

Systematic research framework for in-depth technical research using MCP tool orchestration. Use this workflow when you need comprehensive understanding of:
- Library APIs and SDK patterns
- Architecture decisions and best practices
- Cross-dependency interactions
- Implementation patterns comparison
- Troubleshooting complex technical issues

---

## Prerequisites

Before starting, ensure you have:
- [ ] Clear research question or topic defined
- [ ] Understanding of which framework type applies
- [ ] Access to relevant MCP tools (Context7, Deepwiki, Exa, Brave)

---

## Step 1: Topic Analysis

Parse the research question and prepare the research strategy.

**Actions:**
1. Identify the core research question
2. Extract key terms and concepts
3. Determine the research framework:
   - `tech-spec`: Library/SDK API research
   - `architecture`: System design patterns
   - `dependencies`: Cross-dependency analysis
   - `patterns`: Best practices research
   - `comparison`: Technology comparison
   - `troubleshooting`: Error resolution
4. Set depth level:
   - `quick`: 1-2 sources, surface-level
   - `standard`: 3-4 sources, moderate depth
   - `comprehensive`: All sources, full analysis

**Output:**
```yaml
research_plan:
  topic: "[Research question]"
  framework: "[tech-spec|architecture|dependencies|patterns|comparison|troubleshooting]"
  depth: "[quick|standard|comprehensive]"
  key_terms:
    - term1
    - term2
  target_sources:
    - Context7
    - Deepwiki
    - Exa
```

---

## Step 2: Source Selection and Query Strategy

Based on the framework, select the appropriate MCP tools and define query strategies.

### Framework-Specific Protocols

#### Tech-Spec Framework
```
Sources: Context7 (primary), Deepwiki (secondary), Exa (examples)
Query Strategy:
1. Context7: resolve-library-id → get-library-docs(topic)
2. Deepwiki: ask_question about API patterns
3. Exa: get_code_context_exa for implementation examples
```

#### Architecture Framework
```
Sources: Deepwiki (primary), Exa (secondary), Repomix (codebase)
Query Strategy:
1. Deepwiki: ask_question about architectural decisions
2. Exa: search for architecture patterns 2025
3. Repomix: pack_codebase for current structure analysis
```

#### Dependencies Framework
```
Sources: Codebase (primary), Context7 (secondary), Deepwiki (tertiary)
Query Strategy:
1. view_file package.json for current dependencies
2. Context7: get-library-docs for each key dependency
3. Deepwiki: ask_question about integration patterns
```

#### Patterns Framework
```
Sources: Exa (primary), Deepwiki (secondary), Brave (tertiary)
Query Strategy:
1. Exa: get_code_context_exa for pattern implementations
2. Deepwiki: ask_question about best practices
3. Brave: web_search for latest patterns
```

#### Comparison Framework
```
Sources: All (parallel queries)
Query Strategy:
1. Exa: Compare implementations
2. Context7: Documentation for each option
3. Brave: Community opinions and benchmarks
```

#### Troubleshooting Framework
```
Sources: Exa (primary), Brave (secondary), Context7 (tertiary)
Query Strategy:
1. Exa: Error patterns and fixes
2. Brave: Stack Overflow, GitHub issues
3. Context7: Official documentation edge cases
```

---

## Step 3: Parallel Research Execution

Execute research queries across selected sources.

### 3.1 Context7 Research (Official Documentation)

```
# First resolve the library ID
mcp_context7_resolve-library-id:
  libraryName: "[library name from topic]"

# Then fetch documentation
mcp_context7_get-library-docs:
  context7CompatibleLibraryID: "[resolved ID]"
  topic: "[specific topic focus]"
  mode: "code"  # or "info" for conceptual questions
```

**Note:** Context7 supports 2 sequential calls per turn for best results.

### 3.2 Deepwiki Research (Repository Semantics)

```
# For repositories in the project's dependencies
mcp_deepwiki_ask_question:
  repoName: "[org/repo]"  # e.g., "TanStack/ai", "stackblitz/webcontainer-core"
  question: "[semantic question about the topic]"

# Reference common repos:
# - TanStack/ai (AI SDK)
# - xtermjs/xterm.js (Terminal)
# - microsoft/monaco-editor (Editor)
# - dexie/Dexie.js (IndexedDB)
# - stackblitz/webcontainer-core (WebContainers)
# - pmndrs/zustand (State management)
```

### 3.3 Exa Code Search

```
mcp_exa_get_code_context_exa:
  query: "[research topic] implementation patterns 2025"
  tokensNum: 5000  # Adjust based on depth
```

### 3.4 Brave Web Search

```
mcp_brave-search_brave_web_search:
  query: "[research topic] best practices"
  count: 10
```

---

## Step 4: Codebase Comparison

Compare research findings against the current codebase.

**Actions:**
1. Search for existing patterns:
   ```
   grep_search:
     SearchPath: "[project root]"
     Query: "[key pattern from findings]"
     MatchPerLine: true
   ```

2. View current implementations:
   ```
   view_file or view_file_outline for relevant files
   ```

3. Find related files:
   ```
   find_by_name:
     Pattern: "[relevant file pattern]"
     SearchDirectory: "[project root]"
   ```

**Analysis Points:**
- Which findings are already implemented?
- Which patterns diverge from recommendations?
- What gaps exist in current implementation?
- Are there conflicts between research sources?

---

## Step 5: Synthesis

Combine all findings into coherent analysis.

**Synthesis Structure:**

```markdown
## Key Findings

### [Finding Category 1]
- **Source:** [Context7/Deepwiki/Exa/Brave]
- **Confidence:** [High/Medium/Low]
- **Relevance:** [Core/Supporting/Background]

[Detailed finding content]

### [Finding Category 2]
...

## Patterns Identified

1. [Pattern Name]
   - Description: [what it does]
   - Implementation: [how to implement]
   - Adoption: [current status in codebase]

## Conflicts and Trade-offs

| Option A | Option B | Recommendation |
|----------|----------|----------------|
| [pros/cons] | [pros/cons] | [which to choose] |

## Knowledge Gaps

- [Areas needing further research]
- [Questions that remain unanswered]
```

---

## Step 6: Evaluation

Filter and validate findings for accuracy.

**Evaluation Criteria:**

| Criterion | Weight | Assessment |
|-----------|--------|------------|
| Source Reliability | 30% | Official docs > Community > Blog |
| Recency | 20% | 2024-2025 > 2023 > Older |
| Codebase Alignment | 25% | Matches current stack? |
| Implementation Clarity | 15% | Clear examples provided? |
| Community Validation | 10% | Widely adopted? |

**Confidence Scoring:**
- **High (80-100%):** Multiple reliable sources agree, codebase aligned
- **Medium (50-79%):** Some sources agree, minor conflicts
- **Low (0-49%):** Limited sources, significant conflicts, unverified

---

## Step 7: Output Generation

Generate the research artifact document.

**Output Location:** `_bmad-output/research/[topic-slug]-research-[YYYY-MM-DD].md`

**Required Sections:**
1. Executive Summary
2. Research Question
3. Methodology (sources used)
4. Findings (structured by category)
5. Codebase Comparison
6. Synthesis
7. Recommendations (prioritized)
8. Action Items
9. References

**Recommendation Format:**
```markdown
### [Priority: Critical/High/Medium/Low]

#### Recommendation: [Title]
- **Category:** [Implementation/Refactor/Documentation/Testing]
- **Effort:** [Trivial/Small/Medium/Large]
- **Affected Files:** [list]
- **Description:** [what to do and why]
- **Code Example:** (if applicable)
```

---

## Workflow Completion Checklist

- [ ] Topic analyzed and framework selected
- [ ] All relevant MCP sources queried
- [ ] Codebase comparison completed
- [ ] Findings synthesized with source attribution
- [ ] Confidence scores assigned
- [ ] Recommendations prioritized
- [ ] Research artifact saved to `_bmad-output/research/`
- [ ] Action items clear and actionable

---

## Quick Reference: Common Research Queries

### TanStack AI SDK
```yaml
Context7: /tanstack/ai (or /websites/tanstack_ai)
Deepwiki: TanStack/ai
Topics: tools, streaming, chat, adapters
```

### WebContainer API
```yaml
Context7: (search for webcontainer)
Deepwiki: stackblitz/webcontainer-core, stackblitz/webcontainer-api
Topics: spawn, mount, fs, shell
```

### Monaco Editor
```yaml
Context7: /microsoft/monaco-editor
Deepwiki: microsoft/monaco-editor
Topics: models, decorations, languages
```

### Zustand State Management
```yaml
Context7: /pmndrs/zustand
Deepwiki: pmndrs/zustand
Topics: store, persist, middleware
```

### xterm.js Terminal
```yaml
Deepwiki: xtermjs/xterm.js
Topics: Terminal, addons, fit, attach
```

---

**Workflow Notes:**
- This workflow is designed for BMAD development agents
- MCP tools are external to Via-gent runtime
- Future: Integrate subset of capabilities into Via-gent agent tools
- Always verify findings against current codebase
