---
name: gap-analysis
description: |
  Systematically identify what's missing, unknown, or needs investigation before 
  making changes or decisions. Use proactively when proposing features, 
  implementing changes, or making technical decisions to ensure all critical 
  areas are covered. This skill catches overlooked dependencies, edge cases, 
  and integration points before they become problems.
  
  Examples:
  - "Implement user authentication" → trigger gap analysis (what's the current auth system?)
  - "Add caching to API" → trigger gap analysis (what caching infrastructure exists?)
  - "Migrate to TypeScript" → trigger gap analysis (what's the build pipeline?)
  - "Refactor this module" → trigger gap analysis (what depends on this module?)
  - "Add new API endpoint" → trigger gap analysis (what endpoints exist, what patterns?)
version: 1.0.0
---

# Skill: Gap Analysis

Systematically identify what's missing, unknown, or needs investigation before 
making changes. Turn vague requirements into comprehensive gap assessments.

## When to Use This Skill

**Trigger this skill when:**
- Proposing new features or changes
- Making technical decisions or architecture choices
- Implementing solutions without full context
- Modifying existing systems or modules
- Integrating new dependencies or third-party services
- Migrating or refactoring code

**Do NOT use when:**
- Research is complete and implementation is straightforward
- Changes are trivial and isolated (e.g., typo fix)
- Context is already comprehensive and gaps are identified

## Gap Analysis Framework

### Step 1: Map the Current State

Before identifying gaps, establish what exists:

**Questions to ask:**
```
What do we know?
- [Existing systems, features, patterns]
- [Current architecture, tech stack, tools]
- [Related implementations, similar code]
- [Documentation, tests, existing research]

What don't we know?
- [Missing context, unknowns, assumptions]
- [Areas not yet investigated]
- [Dependencies not yet mapped]
- [Edge cases not yet considered]
```

**Tools to use:**
- `idumb_scan` - Framework detection and structure analysis
- `idumb_codemap` - Symbol extraction to find related code
- `idumb_read` - Entity-aware reading to gather context
- `grep` - Search for patterns across codebase

### Step 2: Identify Gap Categories

Use this systematic framework to identify gaps across 8 dimensions:

| Category | Questions to Ask | Common Gaps |
|----------|------------------|-------------|
| **Context** | What's the background? Why this change now? | Missing requirements, unclear motivation |
| **Knowledge** | What do we need to know before starting? | Unresearched dependencies, unknown edge cases |
| **Integration** | How does this connect to existing systems? | Unmapped dependencies, breaking changes |
| **Dependencies** | What does this depend on? What depends on this? | Missing dependency analysis, circular deps |
| **Constraints** | What limitations exist? Technical, business, timeline? | Unstated constraints, unrealistic assumptions |
| **Validation** | How will we know this works? | Missing tests, unclear success criteria |
| **Rollback** | What if this fails? | Missing rollback plan, no migration path |
| **Documentation** | How will this be documented? | Missing doc plan, unclear maintenance burden |

### Step 3: Prioritize Gaps by Impact

Not all gaps are equal. Prioritize using this matrix:

```
HIGH IMPACT + HIGH LIKELIHOOD  →  Critical gaps (address immediately)
HIGH IMPACT + LOW LIKELIHOOD     →  Important gaps (have contingency plan)
LOW IMPACT + HIGH LIKELIHOOD     →  Watchlist (monitor during implementation)
LOW IMPACT + LOW LIKELIHOOD      →  Nice-to-know (research if time permits)
```

**Impact dimensions to consider:**
- Blockers: Will this prevent implementation?
- Risk: How likely is this to cause problems?
- Cost: How expensive to fix if we get it wrong?
- Time: How long to investigate?
- Complexity: How complex to address?

### Step 4: Create Gap Investigation Plan

For each prioritized gap, define:

```
Gap: [Description]
Impact: [Critical/Important/Watchlist/Nice-to-know]
Investigation needed:
  - [Step 1]
  - [Step 2]
  - [Step 3]
Expected output: [What we'll learn]
Estimated effort: [Time/resource estimate]
Owner: [Who investigates]
```

### Step 5: Validate Gap Completeness

Use this checklist to ensure you haven't missed anything:

```
- [ ] Context gaps: Requirements, motivation, background understood?
- [ ] Knowledge gaps: Dependencies, patterns, edge cases identified?
- [ ] Integration gaps: Connections to existing systems mapped?
- [ ] Dependency gaps: Forward and backward dependencies clear?
- [ ] Constraint gaps: Technical, business, timeline constraints known?
- [ ] Validation gaps: Tests, success criteria defined?
- [ ] Rollback gaps: Migration path, rollback plan clear?
- [ ] Documentation gaps: Doc plan, maintenance burden understood?
```

### Step 6: Present Gap Analysis

Structure findings clearly for stakeholder review:

```
## Gap Analysis Summary

**Proposal:** [What we're proposing to change]
**Total Gaps Identified:** [X critical, Y important, Z watchlist]

### Critical Gaps (Must Address)

**1. [Gap Name]**
- **Issue:** [Description]
- **Impact:** [Why critical]
- **Investigation:** [What to research]
- **Estimate:** [Effort]

### Important Gaps (Should Address)

**2. [Gap Name]**
...

### Watchlist (Monitor During Implementation)

**3. [Gap Name]**
...

### Recommended Next Steps

1. [Address critical gaps first]
2. [Research important gaps in parallel]
3. [Monitor watchlist during implementation]
4. [Consider nice-to-know gaps if time permits]

**Ready to proceed with implementation?**
```

## Common Gap Patterns

### Pattern 1: Missing Context (Context Gap)

```
Proposal: "Implement user authentication"

Gap Analysis:

**Critical Gaps:**
1. Current auth system state
   - Issue: Don't know if auth exists at all
   - Impact: Cannot proceed without understanding current state
   - Investigation: Search for auth-related code, check existing user management
   - Estimate: 30 minutes

2. Authentication requirements
   - Issue: Unknown what auth features are needed
   - Impact: May implement wrong solution
   - Investigation: Ask stakeholder about requirements (social login, 2FA, etc.)
   - Estimate: 15 minutes

**Important Gaps:**
3. Session management approach
   - Issue: Unknown how sessions are currently managed
   - Impact: Integration complexity
   - Investigation: Review session handling, token storage
   - Estimate: 45 minutes

**Watchlist:**
4. Rate limiting needs
   - Issue: Unknown if rate limiting is required
   - Impact: Security concern
   - Investigation: Review security requirements
   - Estimate: 20 minutes
```

### Pattern 2: Unmapped Dependencies (Integration Gap)

```
Proposal: "Add caching to API"

Gap Analysis:

**Critical Gaps:**
1. Existing caching infrastructure
   - Issue: Don't know if caching layer exists
   - Impact: May duplicate work or create conflicts
   - Investigation: Search for Redis, Memcached, or cache implementations
   - Estimate: 30 minutes

2. Cache invalidation strategy
   - Issue: Unknown how to invalidate stale data
   - Impact: Data inconsistency bugs
   - Investigation: Research cache invalidation patterns for this use case
   - Estimate: 60 minutes

**Important Gaps:**
3. Cache key design
   - Issue: Unknown how to structure cache keys
   - Impact: Cache collisions, invalid cache hits
   - Investigation: Review caching patterns in codebase
   - Estimate: 30 minutes

**Watchlist:**
4. Cache performance requirements
   - Issue: Unknown throughput/latency targets
   - Impact: May over-engineer or under-perform
   - Investigation: Ask stakeholder about performance goals
   - Estimate: 15 minutes
```

### Pattern 3: Breaking Changes (Dependency Gap)

```
Proposal: "Refactor user module"

Gap Analysis:

**Critical Gaps:**
1. Downstream dependencies
   - Issue: Unknown what depends on user module
   - Impact: May break existing functionality
   - Investigation: Use `idumb_codemap` to find all imports/references
   - Estimate: 45 minutes

2. API contract changes
   - Issue: Unknown if refactor will change public API
   - Impact: Breaking changes for consumers
   - Investigation: Review exported functions/types, identify consumers
   - Estimate: 60 minutes

**Important Gaps:**
3. Migration path
   - Issue: Unknown how to migrate existing code
   - Impact: Coordination effort, potential downtime
   - Investigation: Design migration strategy, versioning approach
   - Estimate: 90 minutes

**Watchlist:**
4. Test coverage
   - Issue: Unknown if tests exist for affected code
   - Impact: May introduce regressions
   - Investigation: Review test coverage for user module and dependents
   - Estimate: 30 minutes
```

### Pattern 4: Missing Constraints (Constraint Gap)

```
Proposal: "Add real-time notifications"

Gap Analysis:

**Critical Gaps:**
1. Technology constraints
   - Issue: Unknown what real-time technologies are allowed
   - Impact: May implement prohibited technology
   - Investigation: Review existing infrastructure, ask about preferences
   - Estimate: 30 minutes

2. Performance constraints
   - Issue: Unknown throughput/latency requirements
   - Impact: May over-engineer or under-perform
   - Investigation: Ask stakeholder about performance targets
   - Estimate: 15 minutes

**Important Gaps:**
3. Infrastructure constraints
   - Issue: Unknown if infrastructure supports real-time (WebSockets, SSE)
   - Impact: Technical blocker
   - Investigation: Review infrastructure capabilities
   - Estimate: 45 minutes

**Watchlist:**
4. Budget constraints
   - Issue: Unknown if additional services have budget
   - Impact: May propose expensive solution
   - Investigation: Ask about budget for infrastructure/services
   - Estimate: 15 minutes
```

### Pattern 5: Undefined Success (Validation Gap)

```
Proposal: "Optimize database queries"

Gap Analysis:

**Critical Gaps:**
1. Current performance baseline
   - Issue: Unknown what current performance is
   - Impact: Cannot measure improvement
   - Investigation: Profile queries, establish baseline metrics
   - Estimate: 60 minutes

2. Performance targets
   - Issue: Unknown what "good performance" means
   - Impact: May over-optimize or miss mark
   - Investigation: Ask stakeholder about performance goals
   - Estimate: 15 minutes

**Important Gaps:**
3. Test environment
   - Issue: Unknown if representative test data exists
   - Impact: Optimizations may not translate to production
   - Investigation: Review test data, staging environment
   - Estimate: 30 minutes

**Watchlist:**
4. Monitoring setup
   - Issue: Unknown if performance monitoring exists
   - Impact: Hard to verify improvement in production
   - Investigation: Review monitoring, alerting setup
   - Estimate: 20 minutes
```

## Gap Analysis Integration with iDumb v2

### Using `idumb_codemap` for Dependency Gaps

```typescript
// Find all imports/references to a module
const codemap = await idumb_codemap({ action: "graph", path: "src/user-module" });
// Returns: dependency graph showing all dependents
```

### Using `idumb_scan` for Context Gaps

```typescript
// Scan project to understand current state
const scan = await idumb_scan({ action: "frameworks" });
// Returns: detected frameworks, technologies, patterns
```

### Using `idumb_read` for Knowledge Gaps

```typescript
// Read entity with outline mode to understand structure
const outline = await idumb_read({ 
  path: "src/auth", 
  mode: "outline" 
});
// Returns: structure + entity context, reveals patterns
```

### Using `grep` for Pattern Gaps

```typescript
// Search for patterns across codebase
const cachingPatterns = await grep({ 
  pattern: "cache|Cache|CACHE", 
  include: "*.ts" 
});
// Returns: all caching implementations and usages
```

## Gap Analysis Process Flow

```
┌─────────────────┐
│ 1. Map Current  │ → Gather existing context with codemap/scan/read
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. Identify     │ → Systematic gap identification (8 dimensions)
│    Gaps         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. Prioritize   │ → Impact/Likelihood matrix, risk assessment
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 4. Create       │ → Investigation plan for each prioritized gap
│    Plan         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 5. Validate     │ → Checklist review, completeness check
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 6. Present     │ → Clear summary for stakeholder approval
│    Analysis     │
└─────────────────┘
```

## Gap Analysis vs Risk Assessment

**Gap Analysis** is proactive - identifies what's missing BEFORE starting work

**Risk Assessment** is reactive - identifies what could go wrong during/after work

Both are important, but gap analysis happens FIRST:
1. Gap Analysis → Ensure we have complete picture
2. Risk Assessment → Plan for what might go wrong

## Common Mistakes to Avoid

❌ **Jumping to solutions before identifying gaps**  
→ Must understand what's missing before proposing fixes

❌ **Assuming gaps don't exist**  
→ There are always gaps. Even "simple" changes have unknowns.

❌ **Prioritizing based on difficulty instead of impact**  
→ Focus on impact first, then difficulty

❌ **Skipping validation step**  
→ Use checklist to ensure comprehensive coverage

❌ **Not presenting findings to stakeholders**  
→ Gap analysis is useless if people don't act on it

❌ **Treating all gaps equally**  
→ Prioritize ruthlessly using impact/likelihood matrix

❌ **Not updating gap analysis as new information emerges**  
→ Gaps evolve as you learn more. Keep analysis current.

## Integration with Other Skills

Use **before**:
- `research-workflow-planner` - Gap analysis informs research scope
- `multi-aspect-assessment` - Gaps are one aspect to assess

Use **after**:
- `intent-clarification` - Gap analysis clarifies intent further

Use **in parallel with**:
- `opencode-primitive-selector` - Choose tools to investigate gaps

## Success Criteria

Gap analysis is successful when:
- ✓ All 8 gap dimensions have been considered
- ✓ Critical gaps are identified and prioritized
- ✓ Investigation plan exists for each prioritized gap
- ✓ Stakeholder has reviewed and approved findings
- ✓ Implementation can proceed with confidence
- ✓ Unknowns are now known or at least documented

## Outcome

After using this skill:
- Unknowns are identified and prioritized
- Investigation plan is clear
- Stakeholder is aligned on what needs to be researched
- Ready to proceed with `research-workflow-planner` or implementation

**Never start implementation without gap analysis.** This skill catches problems before they happen.
