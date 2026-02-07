---
name: context-first
description: Load required context before any work. Uses prompt matrix to determine what to load based on request type. Prevents premature implementation and context poisoning.
---

# Context First

> **TRAP 1 & 2 Defense**: Load context before implementation

## Core Principle

**Never implement before understanding.** Context loading is mandatory before any code changes.

## 3-Step Validation Protocol

Before ANY implementation:

### Step 1: Dry Reading
Read existing code to understand:
- Current architecture patterns
- Related components and dependencies
- Existing conventions in similar files

### Step 2: Context Gathering
Load artifacts based on request type:

| Request Category | Context to Load |
|-----------------|-----------------|
| New feature | Product requirements, UX specs |
| Feature extension | Architecture, existing patterns |
| Bug fix | Sprint status, story context |
| Refactoring | Architecture, project truths |
| Documentation | Architecture, existing docs |
| Ambiguous | AGENTS.md, project truths |

### Step 3: Plan Validation
Confirm approach before coding:
- Does it align with project architecture?
- Is scope manageable (< 4 hours)?
- Are dependencies identified?

## Artifact Freshness

Documents have different lifespans:

| Document Type | Typical Lifespan | Refresh Trigger |
|--------------|------------------|-----------------|
| Architecture | Long-lived | Major changes only |
| ADRs | Long-lived | Superseded by new ADR |
| Stories | Sprint-lived | Sprint completion |
| Tech specs | Story-lived | Story completion |
| Plans | Task-lived | Task completion |

**Check modification timestamps.** Stale artifacts (> 2 hours for short-lived, > 24 hours for long-lived) may need refresh.

## Document Tiering

Documents iterate on each other in tiers:

```
Tier 1: Governing (Architecture, PRD, AGENTS.md)
   ↓ informs
Tier 2: Planning (Epics, Stories, ADRs)
   ↓ informs  
Tier 3: Execution (Tech Specs, Tasks)
   ↓ informs
Tier 4: Ephemeral (Session notes, scratch files)
```

**Always validate lower tiers against higher tiers.** If Tier 3 conflicts with Tier 1, Tier 1 wins.

## Integration

Use project context loader tools to load based on request classification:
- Identify prompt type from request
- Load recommended context files
- Validate freshness before using

## Failure Mode

If validation fails:
```
⛔ CONTEXT FIRST VIOLATION

Attempted: {action}
Missing: {missing_context}
Tier conflict: {if any}

ACTION: Complete 3-Step Validation before proceeding.
```
