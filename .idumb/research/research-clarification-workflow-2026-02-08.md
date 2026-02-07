# Research Clarification Workflow

**Created:** 2026-02-08  
**Agent:** idumb-investigator  
**Status:** Active

---

## Overview

This workflow documents how the intent-clarification skill suite works together to transform vague research requests into precisely structured, validated research plans. The suite consists of 5 skills that can be used independently or in sequence, depending on the complexity of the request.

---

## Skill Suite Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Intent Clarification Skill Suite               │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        │                                           │
┌──────▼──────────┐  ┌───────────────────────────┐ │
│ intent-clarification│  │  opencode-primitive-selector │ │
└──────────┬────────┘  └───────────┬───────────────┘ │
           │                       │                  │
           │                       │                  │
┌──────────▼──────────────────────▼──────────────────▼─────┐
│          gap-analysis & multi-aspect-assessment            │
└──────────┬──────────────────────┬──────────────────┬───────┘
           │                      │                  │
           │                      │                  │
┌──────────▼──────────────────────▼──────────────────▼───────┐
│              research-workflow-planner                      │
└───────────────────────────────────────────────────────────────┘
```

## Skill Sequence Flow

### Primary Sequence (Linear)

For most research requests, use skills in this order:

```
1. intent-clarification
   ↓ (Intent is now clear)
2. gap-analysis
   ↓ (Gaps are identified and prioritized)
3. multi-aspect-assessment
   ↓ (Aspects are evaluated, trade-offs identified)
4. opencode-primitive-selector
   ↓ (Right OpenCode tools chosen)
5. research-workflow-planner
   ↓ (Research plan created, ready to execute)
```

### Parallel Sequences

For complex research, some skills can run in parallel:

```
Parallel Branch 1:                 Parallel Branch 2:
gap-analysis ←→ multi-aspect-assessment
      ↓                           ↓
   Identify gaps                  Evaluate aspects
      ↓                           ↓
         Both feed into research-workflow-planner
```

### Independent Skill Usage

Any skill can be used independently when relevant:

- **intent-clarification** → User request is vague
- **gap-analysis** → Intent is clear but what's missing?
- **multi-aspect-assessment** → Evaluate from multiple dimensions
- **opencode-primitive-selector** → Choose right OpenCode primitive
- **research-workflow-planner** → Create structured research plan

---

## Summary

The intent-clarification skill suite transforms research from vague, ad-hoc activity to systematic, validated process. By using these skills independently or in sequence, agents ensure:

- **Research is purposeful** (intent-clarification)
- **Unknowns are known** (gap-analysis)
- **Decisions are informed** (multi-aspect-assessment)
- **Tools are optimal** (opencode-primitive-selector)
- **Execution is structured** (research-workflow-planner)

**Result:** Research produces useful, validated, actionable insights every time.

---

**For detailed workflow documentation, see the individual SKILL.md files in .agents/skills/**

Created Skills:
1. `.agents/skills/intent-clarification/SKILL.md` (330 lines)
2. `.agents/skills/gap-analysis/SKILL.md` (485 lines)
3. `.agents/skills/multi-aspect-assessment/SKILL.md` (689 lines)
4. `.agents/skills/research-workflow-planner/SKILL.md` (684 lines)
5. `.agents/skills/opencode-primitive-selector/SKILL.md` (539 lines)

Research Artifacts Created:
1. `.idumb/research/codebase-architecture-analysis-2026-02-08.md` (405 lines)
2. `.idumb/research/opencode-concepts-mapping-2026-02-08.md` (642 lines)
3. `.idumb/research/integration-pitfalls-2026-02-08.md` (864 lines)

**Total Deliverables: 8 documents**
