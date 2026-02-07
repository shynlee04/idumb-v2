---
name: intent-clarification
description: |
  Detect ambiguous or underspecified research requests and guide through structured 
  clarification questions before executing any research. Use proactively when user 
  requests are vague, lack specificity, missing context, or have unclear goals. This 
  skill prevents wasted research by ensuring intent is crystal clear before any web 
  searches, file reads, or data gathering.
  
  Examples:
  - "Research the codebase" → ❌ Too vague, trigger clarification
  - "Why is this slow?" → ❌ Missing context (what is "this"?), trigger clarification
  - "Add a feature" → ❌ Not research, this is implementation
  - "Investigate authentication flow" → ❌ What specifically about it? Trigger clarification
  - "Compare React and Vue" → ✅ Specific enough, but still validate dimensions
version: 1.0.0
---

# Skill: Intent Clarification

Transform vague, underspecified research requests into precise, actionable research 
plans before executing any research activities.

## When to Use This Skill

**Trigger this skill when:**
- User says "research", "investigate", "analyze", "look into", "find out" without specifics
- Request lacks: scope, goals, deliverables, success criteria, time constraints
- Request is ambiguous about: what to research, why it's needed, who will use findings
- User's prompt is > 10 lines or response is absurdly short → MUST trigger clarification
- Request mixes research with implementation → separate concerns

**Do NOT use when:**
- Request is already specific: "Investigate why user login fails with error 403"
- Request clearly defines: scope, goals, deliverables, success criteria
- User explicitly provides context, constraints, and expected outcomes

## Intent Clarification Framework

### Step 1: Detect Ambiguity

Check if the request is missing any of these critical elements:

| Element | What It Looks Like | Why It Matters |
|---------|-------------------|----------------|
| **Scope** | "What exactly should I research?" | Avoids over-researching or missing key areas |
| **Goal** | "What problem are we solving?" | Focuses research on actionable outcomes |
| **Deliverables** | "What output do you expect?" | Defines success criteria upfront |
| **Context** | "Background, constraints, assumptions?" | Prevents researching irrelevant areas |
| **Audience** | "Who will use these findings?" | Determines depth and format of output |

### Step 2: Ask Targeted Questions

Use the **5W1H framework** to structure clarification questions:

```
WHAT:   What specifically do you want to know?
WHY:    Why is this research needed now? What will it enable?
WHO:    Who will use the findings? Decision-maker? Developer? Architect?
WHERE:  In what context will this be applied? Specific feature, system, or project?
WHEN:   By when do you need this? Any time constraints or deadlines?
HOW:    How detailed should the findings be? High-level summary vs deep dive?
```

**Question phrasing principles:**
- Ask ONE question at a time (avoid overwhelming user)
- Use binary choices when possible (A vs B) to reduce cognitive load
- Provide examples to clarify abstract concepts
- Offer default assumptions if user is uncertain

### Step 3: Validate with Examples

After gathering answers, validate by paraphrasing back:

```
Let me confirm I understand correctly:

**Research Scope:** [restate scope]
**Primary Goal:** [restate goal]
**Key Deliverables:** [list expected outputs]
**Assumptions:** [list any assumptions]

**Expected Format:** [bullet points, report, code examples?]
**Success Criteria:** [how will you know I succeeded?]

Is this accurate? Any adjustments needed before I begin research?
```

### Step 4: Define Research Boundaries

Explicitly state what will NOT be researched:

```
**Out of Scope:**
- [Area X] - Not relevant to your goal
- [Area Y] - Requires access I don't have
- [Area Z] - Too time-consuming for current timeline

**In Scope:**
- [Primary research area] - Core focus
- [Secondary area] - If time permits

**Approach:**
1. [First step]
2. [Second step]
3. [Final validation]

Ready to proceed?
```

### Step 5: Establish Checkpoints

Define validation moments during research:

```
**Research Checkpoints:**
- ✓ After [X], I'll share initial findings
- ✓ After [Y], I'll validate direction with you
- ✓ Final deliverable: [what you'll receive]

**Stop Conditions:**
- If I find [condition], I'll pause for your input
- If approach isn't working, I'll propose alternatives

Shall I begin?
```

## Common Ambiguity Patterns

### Pattern 1: Overly Broad Requests

```
User: "Research the codebase"
❌ Too vague

Clarification:
"I'd love to help research the codebase! To focus my research effectively:

1. What aspect of the codebase interests you?
   - Architecture patterns?
   - Performance bottlenecks?
   - Security vulnerabilities?
   - Tech stack decisions?

2. What's your goal with this research?
   - Understand how to contribute?
   - Prepare for a migration?
   - Audit code quality?
   - Something else?

3. What format would be most useful?
   - High-level overview?
   - Deep dive into specific areas?
   - Diagrams and documentation?
   - Code examples?"
```

### Pattern 2: Context-Loss from Compaction

```
User: "Why is this slow?" (after context compaction)
❌ Missing context (what is "this"?)

Clarification:
"I notice we've lost some context from the conversation. To help you:

1. What specific functionality is slow?
   - API endpoint? UI component? Database query? Build process?

2. What does "slow" mean here?
   - Response time > X seconds?
   - Slow relative to what baseline?
   - User-reported latency?

3. When did this start happening?
   - After recent changes?
   - Always been slow?
   - Intermittent issue?

Can you provide more context so I can investigate effectively?"
```

### Pattern 3: Mixed Research and Implementation

```
User: "Research how to add OAuth and implement it"
❌ Two distinct concerns mixed together

Clarification:
"I see two distinct activities here. Let's separate them:

**Research Phase:**
- Investigate OAuth integration options
- Analyze compatibility with your stack
- Document recommended approach

**Implementation Phase:**
- Code the OAuth integration
- Write tests
- Update documentation

Should I:
1. Start with research and get your approval before implementation?
2. Focus only on research right now (you'll handle implementation)?
3. Something else?

What's your preference?"
```

### Pattern 4: Missing Success Criteria

```
User: "Analyze the performance"
❌ No definition of what "good performance" means

Clarification:
"To analyze performance effectively, I need to know what "good" looks like:

1. What are your performance targets?
   - Response time < X milliseconds?
   - Throughput > Y requests/second?
   - Memory usage < Z MB?
   - Some other metric?

2. What's the baseline you're comparing against?
   - Current performance numbers?
   - Industry benchmarks?
   - Previous version?

3. What's the business impact?
   - User experience degradation?
   - Resource costs increasing?
   - Something else?

Once I understand your goals, I can focus the analysis on what matters most."
```

## Research Intent Clarification Checklist

Before starting any research, verify:

- [ ] Scope clearly defined (what will/won't be researched)
- [ ] Goal articulated (what problem will this solve)
- [ ] Deliverables specified (what output will you receive)
- [ ] Success criteria established (how will you know it's complete)
- [ ] Context gathered (constraints, assumptions, audience)
- [ ] Checkpoints defined (when will we validate progress)
- [ ] Stop conditions identified (when will I pause for input)
- [ ] Timeline understood (any deadlines or time constraints)
- [ ] Research vs implementation separated (if applicable)
- [ ] Paraphrased back for confirmation (user validated understanding)

## Research Readiness Levels

**Level 1 (Not Ready):** Vague request, multiple ambiguities  
→ **Action:** Trigger this skill, ask clarification questions

**Level 2 (Partially Ready):** Some clarity, but missing key details  
→ **Action:** Ask targeted questions to fill gaps

**Level 3 (Ready):** Specific request with clear goals, scope, deliverables  
→ **Action:** Paraphrase back for confirmation, then proceed with research

**Level 4 (Over-Defined):** Extremely detailed request  
→ **Action:** Validate if this level of detail is necessary or if it indicates micromanagement

## Integration with Other Skills

This skill works well in sequence with:
- **gap-analysis** - After clarifying intent, systematically identify knowledge gaps
- **multi-aspect-assessment** - Evaluate request from multiple angles (technical, business, UX, etc.)
- **research-workflow-planner** - Create structured research plan once intent is clear
- **opencode-primitive-selector** - Choose appropriate OpenCode tools for research execution

## Common Mistakes to Avoid

❌ **Assuming** what user means instead of asking  
→ Always verify, never assume

❌ **Asking multiple questions at once**  
→ Ask one question at a time, get answer, then ask next

❌ **Skipping paraphrase-back step**  
→ Always validate understanding before proceeding

❌ **Proceeding with research when ambiguity remains**  
→ Better to spend 2 minutes clarifying than 2 hours researching wrong thing

❌ **Not defining what's out of scope**  
→ Explicitly state what you won't research to set expectations

❌ **Forgetting checkpoints**  
→ Define validation moments to catch misalignment early

## Examples of Good vs Bad Clarification

**Bad Clarification:**
```
What do you want to research? Be more specific.
```

**Good Clarification:**
```
To help you effectively, I'd like to understand your research goals:

1. What specific area of authentication are you investigating?
   - Login flow security?
   - Token refresh mechanism?
   - Role-based access control?
   - Something else?

2. What problem are you trying to solve?
   - Security vulnerability?
   - Performance issue?
   - Integration complexity?
   - Another concern?

Let's start with the first question and we'll build from there.
```

## Outcome

After using this skill:
- Research intent is crystal clear
- Scope, goals, deliverables, and success criteria defined
- Research plan established with checkpoints
- Ready to proceed with `gap-analysis`, `multi-aspect-assessment`, or `research-workflow-planner`

**Never start research without clear intent.** This skill is your first line of defense against wasted effort and misaligned deliverables.
