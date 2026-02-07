---
name: multi-aspect-assessment
description: |
  Evaluate requests, proposals, or decisions from multiple dimensions (technical, 
  business, UX, security, performance, maintainability, etc.) to ensure 
  holistic understanding before proceeding. Use proactively when making 
  technical decisions, choosing solutions, or proposing changes. This skill 
  prevents single-minded thinking and uncovers trade-offs, risks, and 
  opportunities across all relevant aspects.
  
  Examples:
  - "Use Redis for caching" → assess multiple aspects (performance, cost, complexity, ops)
  - "Add AI to our app" → assess aspects (technical feasibility, user experience, data privacy)
  - "Refactor to microservices" → assess aspects (benefits, costs, migration complexity, team readiness)
  - "Implement authentication" → assess aspects (security, UX, integration effort, maintenance)
  - "Switch to React 19" → assess aspects (benefits, migration cost, breaking changes, learning curve)
version: 1.0.0
---

# Skill: Multi-Aspect Assessment

Evaluate requests, proposals, or decisions from multiple dimensions to ensure 
holistic understanding before proceeding.

## When to Use This Skill

**Trigger this skill when:**
- Making technical decisions or architecture choices
- Choosing between multiple solutions or technologies
- Proposing significant changes or features
- Evaluating third-party integrations or dependencies
- Designing systems or user experiences
- Considering migrations or refactors

**Do NOT use when:**
- Decision is trivial and low-impact (e.g., variable naming)
- Previous assessment exists and context hasn't changed
- Decision is already validated and approved

## Assessment Framework

### The 8 Assessment Aspects

Always evaluate across these 8 aspects (add/remove based on context):

| Aspect | Questions to Ask | Key Considerations |
|--------|------------------|-------------------|
| **Technical** | Is it technically feasible? What are the technical implications? | Complexity, risk, compatibility, dependencies |
| **Business** | Does it solve a real problem? What's the ROI? | Value, cost, opportunity cost, alignment |
| **User Experience** | How does it affect users? Is it intuitive? | Usability, accessibility, satisfaction |
| **Security** | What are the security implications? Are there vulnerabilities? | Data privacy, attack surface, compliance |
| **Performance** | How does it impact performance? Are there bottlenecks? | Latency, throughput, resource usage, scalability |
| **Maintainability** | How easy is it to maintain? What's the technical debt? | Code quality, documentation, testability |
| **Operational** | How does it affect operations? What's the ops burden? | Deployment, monitoring, debugging, reliability |
| **Strategic** | Does it align with long-term goals? Is it future-proof? | Roadmap, standards, migration path, vendor lock-in |

### Step 1: Identify Relevant Aspects

Not all aspects apply equally. For each proposal:

```
Proposal: [Description]

Relevant Aspects: [Select from 8 aspects above]
- [Aspect 1] - Why relevant?
- [Aspect 2] - Why relevant?
- [Aspect 3] - Why relevant?
- [Aspect 4] - Why relevant?

Less Relevant: [Aspects with minimal impact]
- [Aspect] - Reason it's less relevant
```

### Step 2: Score Each Aspect

For each relevant aspect, use this scoring rubric:

```
Score 1 (Critical Risk): Major blocker, significant downside
Score 2 (Concern): Moderate issue, needs mitigation
Score 3 (Neutral): Neither good nor bad
Score 4 (Benefit): Positive impact, minor benefit
Score 5 (Major Benefit): Significant advantage, strong positive
```

**Assessment Template:**

```
## [Aspect Name]: [Score 1-5]

**Summary:** [One-sentence summary]

**Pros:**
- [Positive outcome 1]
- [Positive outcome 2]

**Cons:**
- [Negative outcome 1]
- [Negative outcome 2]

**Risks:**
- [Risk 1] - [Mitigation strategy]
- [Risk 2] - [Mitigation strategy]

**Recommendation:** [What to do about this aspect]
```

### Step 3: Identify Trade-Offs

Look for conflicts between aspects:

```
Trade-Off Matrix:

Aspect A (Score X) vs Aspect B (Score Y):
- [Describe conflict]
- [Which one wins? Why?]
- [How to mitigate the loser?]

Aspect C (Score X) vs Aspect D (Score Y):
- [Describe conflict]
- [Which one wins? Why?]
- [How to mitigate the loser?]
```

### Step 4: Weigh by Priorities

Not all aspects are equally important. Context matters:

```
Aspect Priorities (Context-Dependent):

High Priority (Must excel):
- [Aspect] - [Why critical in this context]

Medium Priority (Important):
- [Aspect] - [Why important in this context]

Low Priority (Nice-to-have):
- [Aspect] - [Why less important in this context]

Weighted Score Calculation:
- [Aspect]: [Raw Score] × [Weight] = [Weighted Score]
- Total Weighted Score: [Sum]
```

### Step 5: Generate Recommendations

Based on assessment, provide clear guidance:

```
## Assessment Summary

**Proposal:** [Description]
**Overall Assessment:** [Positive/Neutral/Negative]
**Weighted Score:** [Number]/[Max Possible]

### Key Findings

**Strengths:**
- [Major advantage 1]
- [Major advantage 2]

**Weaknesses:**
- [Major concern 1]
- [Major concern 2]

**Trade-Offs:**
- [Trade-off 1] - [Resolution]
- [Trade-off 2] - [Resolution]

### Recommendations

**Go/No-Go:** [Recommendation with confidence level]

**If Go:**
- [Critical mitigation 1]
- [Critical mitigation 2]
- [Success criteria]

**If No-Go:**
- [Alternative 1]
- [Alternative 2]
- [What would make this viable?]

**If Conditional:**
- [Condition 1] - Must be met before proceeding
- [Condition 2] - Must be met before proceeding
- [What changes if conditions are met?]
```

## Common Assessment Patterns

### Pattern 1: Technical Decision with Business Implications

```
Proposal: "Use Redis for caching"

**Relevant Aspects:** Technical, Performance, Operational, Business

## Technical: Score 4
**Summary:** Solid technical fit, moderate complexity

**Pros:**
- Proven technology, mature ecosystem
- Excellent performance for read-heavy workloads
- Rich feature set (pub/sub, data structures)

**Cons:**
- Additional infrastructure to manage
- Requires operational expertise
- Data eviction strategy complexity

**Risks:**
- Single point of failure - Mitigate: Use Redis Cluster
- Cache stamping attacks - Mitigate: Rate limiting, cache invalidation strategy
- Memory exhaustion - Mitigate: Monitoring, auto-scaling

**Recommendation:** Proceed with Redis, invest in operational expertise

## Performance: Score 5
**Summary:** Major performance improvement

**Pros:**
- Sub-millisecond latency for cached data
- Reduces database load significantly
- Scales horizontally with cluster

**Cons:**
- Cache warm-up time on cold starts
- Network latency for distributed deployments

**Risks:**
- Cache invalidation bugs - Mitigate: Comprehensive testing, gradual rollout

**Recommendation:** Cache is critical, prioritize performance

## Operational: Score 2
**Summary:** Operational burden is significant concern

**Pros:**
- Good monitoring and observability tools
- Active community, good documentation

**Cons:**
- Requires 24/7 operations coverage
- Backup/restore complexity
- Upgrade management for cluster

**Risks:**
- Operational team overwhelmed - Mitigate: Managed Redis service, training

**Recommendation:** Consider managed Redis service to reduce ops burden

## Business: Score 3
**Summary:** Neutral business impact

**Pros:**
- Reduced database costs (operational savings)
- Better user experience (business value)

**Cons:**
- Infrastructure costs (Redis service)
- Training costs for operations team

**Risks:**
- ROI uncertain - Mitigate: Pilot in one region, measure impact

**Recommendation:** Validate ROI with pilot before full rollout

### Trade-Offs

Performance (5) vs Operational (2):
- Redis provides major performance benefits but adds operational complexity
- Performance wins - user experience is critical
- Mitigate operational burden with managed service

### Priorities

High Priority: Performance (user experience is key)
Medium Priority: Technical (feasibility)
Low Priority: Business (ROI uncertain)

### Weighted Score

Performance: 5 × 1.0 = 5.0
Technical: 4 × 0.5 = 2.0
Business: 3 × 0.3 = 0.9
Operational: 2 × 0.5 = 1.0
**Total: 8.9/10**

### Recommendations

**Go/No-Go:** Go (Confidence: 70%)

**If Go:**
- Use managed Redis service (AWS ElastiCache, etc.) to reduce operational burden
- Pilot in one region to validate ROI
- Invest in monitoring and alerting
- Establish cache invalidation strategy before launch

**Success Criteria:**
- 50% reduction in database load
- 90% cache hit rate
- Sub-100ms latency for cached queries
- < 5 minutes mean time to resolution (MTTR) for Redis issues
```

### Pattern 2: User Experience with Security Trade-Offs

```
Proposal: "Add social login (Google, GitHub)"

**Relevant Aspects:** User Experience, Security, Technical, Business

## User Experience: Score 5
**Summary:** Major UX improvement, reduces friction

**Pros:**
- No password management for users
- Fast login with one click
- Familiar, trusted login flow

**Cons:**
- Loss of control over login experience
- Dependency on third-party providers

**Risks:**
- Provider downtime blocks login - Mitigate: Keep email/password fallback

**Recommendation:** Social login significantly improves UX

## Security: Score 2
**Summary:** Security concerns require careful implementation

**Pros:**
- Delegates authentication to OAuth providers (Google's security expertise)
- No password storage (reduces risk of password breaches)
- Strong security practices enforced by providers

**Cons:**
- Third-party dependency (trust in provider security)
- OAuth implementation vulnerabilities (CSRF, token leakage)
- Provider data access (privacy concerns)

**Risks:**
- OAuth implementation bugs - Mitigate: Use mature OAuth libraries, security audit
- Provider data harvesting - Mitigate: Minimal scopes, privacy policy disclosure

**Recommendation:** Proceed with caution, thorough security review required

## Technical: Score 4
**Summary:** Well-supported, moderate complexity

**Pros:**
- Standard OAuth 2.0 protocol
- Mature libraries for all major frameworks
- Extensive documentation and examples

**Cons:**
- Integration complexity (multiple providers)
- Token management (access tokens, refresh tokens)
- User account linking complexity

**Risks:**
- Token expiry/refresh bugs - Mitigate: Robust token management, comprehensive testing

**Recommendation:** Use proven OAuth library, don't implement OAuth from scratch

## Business: Score 4
**Summary:** Strong business value, clear ROI

**Pros:**
- Higher conversion rates (fewer drop-offs at login)
- Reduced support requests (password reset issues)
- Access to user data from providers (optional, valuable)

**Cons:**
- Dependency on provider terms of service
- Potential costs (OAuth provider limits)

**Risks:**
- Provider API changes - Mitigate: Stay updated on OAuth spec, multiple providers

**Recommendation:** Business value is clear, proceed

### Trade-Offs

User Experience (5) vs Security (2):
- Social login improves UX but introduces security complexity
- UX wins - user onboarding is critical
- Mitigate security with thorough review and testing

### Priorities

High Priority: User Experience (onboarding is key)
Medium Priority: Security (cannot compromise on security)
Low Priority: Business (assumed value)

### Weighted Score

User Experience: 5 × 1.0 = 5.0
Business: 4 × 0.5 = 2.0
Technical: 4 × 0.5 = 2.0
Security: 2 × 1.0 = 2.0
**Total: 11.0/15**

### Recommendations

**Go/No-Go:** Conditional Go (Confidence: 65%)

**Conditions:**
1. Security audit of OAuth implementation before production
2. Keep email/password login as fallback (no social-only login)
3. Minimal OAuth scopes (only essential data)
4. Privacy policy disclosure of data collection

**If Conditions Met:**
- Start with Google (largest user base), add GitHub later
- Use mature OAuth library (passport, auth0, etc.)
- Comprehensive testing of token lifecycle
- Monitor for provider issues, have fallback ready

**Success Criteria:**
- 30% increase in sign-up conversion
- < 5% of users choose email/password fallback
- Zero security vulnerabilities in OAuth implementation
- < 1% login failure rate due to provider issues
```

### Pattern 3: Strategic Architecture Decision

```
Proposal: "Refactor monolith to microservices"

**Relevant Aspects:** Technical, Operational, Business, Maintainability, Strategic

## Technical: Score 3
**Summary:** Technical complexity increases significantly

**Pros:**
- Independent scaling of services
- Technology diversity (right tool for each service)
- Fault isolation (one service doesn't bring down everything)

**Cons:**
- Distributed system complexity
- Network latency and reliability
- Data consistency challenges

**Risks:**
- Service dependencies become unmanageable - Mitigate: Service mesh, API governance
- Distributed transactions complexity - Mitigate: Eventual consistency, saga pattern

**Recommendation:** Only proceed if technical team has distributed systems expertise

## Operational: Score 2
**Summary:** Operational burden increases dramatically

**Pros:**
- Granular monitoring and observability
- Independent deployments

**Cons:**
- Multiple services to monitor, debug, and operate
- Deployment complexity (orchestration needed)
- Increased infrastructure costs

**Risks:**
- Operational team overwhelmed - Mitigate: Automation, managed services, training
- Debugging across services - Mitigate: Distributed tracing, structured logging

**Recommendation:** Strong operations team is prerequisite

## Business: Score 2
**Summary:** Business case is unclear for most organizations

**Pros:**
- Potential for faster time-to-market (independent deployments)
- Better alignment with business domains (domain-driven design)

**Cons:**
- Higher development costs (more coordination)
- Slower initial development (infrastructure setup)
- Opportunity cost (not building features)

**Risks:**
- ROI not realized - Mitigate: Pilot with one service, measure impact

**Recommendation:** Only proceed if there's clear business case

## Maintainability: Score 2
**Summary:** Maintainability may degrade without strong discipline

**Pros:**
- Smaller codebases per service (easier to understand)
- Clear ownership boundaries

**Cons:**
- More places to look for bugs
- Service boundaries must be maintained
- Refactoring across services is harder

**Risks:**
- Service boundaries leak (tight coupling) - Mitigate: Strong API governance, testing
- Team coordination overhead - Mitigate: Conway's Law awareness, team structure alignment

**Recommendation:** Requires strong engineering culture and discipline

## Strategic: Score 3
**Summary:** Strategic fit depends on organization

**Pros:**
- Aligns with domain-driven design principles
- Enables autonomous teams
- Future-proofs for scale

**Cons:**
- Vendor lock-in to microservices ecosystem
- Harder to reverse back to monolith
- Mismatch if team size is small

**Risks:**
- Microservices for wrong reasons - Mitigate: Clear criteria for when to use microservices

**Recommendation:** Only use microservices if organization meets criteria

### Trade-Offs

Technical (3) vs Operational (2):
- Technical benefits don't justify operational burden
- Neither wins - both are concerns

Business (2) vs Strategic (3):
- Strategic benefits don't justify business costs
- Neither wins - both are concerns

### Priorities

High Priority: Business (must have ROI)
Medium Priority: Strategic (must align with goals)
Low Priority: Technical, Operational, Maintainability (supporting aspects)

### Weighted Score

Strategic: 3 × 0.6 = 1.8
Business: 2 × 1.0 = 2.0
Technical: 3 × 0.3 = 0.9
Operational: 2 × 0.3 = 0.6
Maintainability: 2 × 0.3 = 0.6
**Total: 5.9/15**

### Recommendations

**Go/No-Go:** No-Go (Confidence: 85%)

**Why No-Go:**
- Business case is unclear
- Operational burden is significant
- Technical complexity is high
- ROI is uncertain

**When to Reconsider:**
1. Organization has 50+ developers (microservices scale with team size)
2. Services have clear domain boundaries (DDD)
3. Independent scaling needs are clear (performance issues)
4. Strong operations team exists (24/7 coverage)
5. Business value is measurable and significant

**Alternative:**
- Modular monolith with clear boundaries
- Extract services when there's clear need
- Delay microservices until organization grows

**What Would Make This Viable?**
- Clear business case with measurable ROI
- Proven operational team with distributed systems expertise
- Services have clear domain boundaries with low coupling
- Independent scaling requirements are critical
- Organization is large enough to justify overhead
```

## Assessment Templates

### Quick Assessment (5-10 minutes)

Use for low-impact decisions or initial screening:

```
**Proposal:** [Description]

**Relevant Aspects:** [List]

**Quick Scores:**
- [Aspect]: [Score 1-5] - [One sentence reason]
- [Aspect]: [Score 1-5] - [One sentence reason]

**Overall:** [Go/No-Go/Conditional] - [One sentence reason]
```

### Comprehensive Assessment (30-60 minutes)

Use for high-impact decisions or architecture choices:

```
[Full assessment as shown in patterns above]
```

### Comparative Assessment (Compare 2-3 options)

Use when choosing between alternatives:

```
**Option A:** [Description]
**Option B:** [Description]
**Option C:** [Description]

**Comparison Matrix:**

| Aspect | Option A | Option B | Option C | Winner |
|--------|----------|----------|----------|--------|
| [Aspect] | [Score] | [Score] | [Score] | [Option] |
| [Aspect] | [Score] | [Score] | [Score] | [Option] |
| [Aspect] | [Score] | [Score] | [Score] | [Option] |

**Total Scores:**
- Option A: [Score]
- Option B: [Score]
- Option C: [Score]

**Recommendation:** [Option with best fit] - [Reasoning]
```

## Common Mistakes to Avoid

❌ **Only assessing technical aspects**  
→ Must consider business, UX, security, operations, etc.

❌ **Ignoring trade-offs**  
→ Every decision has trade-offs. Identify and address them.

❌ **Weighting all aspects equally**  
→ Context determines priority. Weight aspects by importance.

❌ **Scoring without justification**  
→ Always explain why you gave a score. Scoring is a conversation starter.

❌ **Not considering context**  
→ Same proposal may have different scores in different contexts.

❌ **Making recommendations without mitigation**  
→ If there are concerns, propose mitigation strategies.

❌ **Binary thinking (go/no-go only)**  
→ Conditional decisions are common. Define conditions clearly.

## Integration with Other Skills

Use **before**:
- `gap-analysis` - Assessment reveals gaps to investigate
- `research-workflow-planner` - Assessment informs research scope

Use **after**:
- `intent-clarification` - Assessment clarifies intent further

Use **in parallel with**:
- `gap-analysis` - Assessment reveals gaps across multiple aspects

## Success Criteria

Multi-aspect assessment is successful when:
- ✓ All relevant aspects have been evaluated
- ✓ Trade-offs have been identified and addressed
- ✓ Recommendations are clear and actionable
- ✓ Stakeholder understands the implications
- ✓ Decision is made with full understanding of consequences
- ✓ Risks have mitigation strategies

## Outcome

After using this skill:
- Request has been evaluated holistically
- Trade-offs are understood and addressed
- Clear recommendation with confidence level
- Mitigation strategies for identified risks
- Stakeholder alignment on implications

**Never make important decisions without multi-aspect assessment.** This skill prevents single-minded thinking and uncovers hidden risks.
