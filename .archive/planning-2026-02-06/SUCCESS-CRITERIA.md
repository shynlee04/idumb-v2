# Success Criteria: Real-Life Use Cases

**Created:** 2026-02-06
**Purpose:** Define success through concrete scenarios that exercise ALL plugin elements.
**Rule:** A phase is not "done" until its relevant use case passes.

---

## Use Case 1: Professional Developer — Corporate SaaS Authentication

**Persona:** Senior engineer building a multi-tenant SaaS platform.
**Complexity:** 40+ files, OAuth + RBAC + API keys, microservice boundaries.
**Session behavior:** Methodical but long sessions (20+ compactions over 8 hours).

### Scenario

```
Turn 1-5:    "Implement OAuth2 login flow for the SaaS dashboard"
Turn 6-10:   "Add RBAC middleware for admin/user roles"
Turn 11-15:  "Actually, switch from OAuth2 to SAML for enterprise SSO"  ← CHAIN BREAK
Turn 16-20:  (Context fills, auto-compaction #1 fires)
Turn 21-25:  "Add API key management for service-to-service auth"
Turn 26-30:  (Auto-compaction #2)
Turn 31-35:  "Style the login form with Tailwind"  ← COMPLETELY DIFFERENT CHAIN
Turn 36-50:  (Aggressive feature requests across 3 more compactions)
Turn 51:     "What's the current auth strategy? Is SAML done?"  ← RECOVERY TEST
```

### What the Plugin Must Do (Per Phase)

| Phase | Plugin Action | Success = | Failure = |
|-------|--------------|-----------|-----------|
| **P0** | Plugin loaded, state persists | `.idumb/state.json` exists after Turn 1 | Plugin crash or TUI pollution |
| **P1** | Stop hook active on every tool call | Every `write_file` call has `__idumb_checked` metadata | Tool calls pass without governance check |
| **P2A** | Anchor created for "switch to SAML" decision | Anchor with type=decision, priority=critical exists at Turn 11 | No anchor for the chain-breaking decision |
| **P2A** | Anchor survives compaction #1 | After compaction, `idumb_status` shows SAML anchor | Anchor lost after compaction |
| **P2B** | Baseline vs plugin comparison | Agent at Turn 51 correctly references SAML (not OAuth2) | Agent says "we're using OAuth2" (hallucination) |
| **P3** | Delegation: coordinator reads plan before building | tool.execute.before injects "current task: SAML migration" | Agent builds OAuth2 components after SAML decision |
| **P4** | TODO reflects: SAML migration > API keys > Login styling | 3-level hierarchy shows correct task dependencies | Flat TODO with no hierarchy, agent works on wrong task |
| **P5** | Message transform: after compaction, agent sees "SAML decided at Turn 11" | Agent references SAML decision without being re-told | Agent has no memory of SAML decision |
| **P6** | Auto-validation: chain integrity check detects OAuth2 → SAML break | Alert logged, agent informed of deprecated OAuth2 artifacts | Agent mixes OAuth2 and SAML implementations |

### Measurement

- **Baseline (no plugin):** Ask "What's the current auth strategy?" after 5 compactions. Record answer accuracy.
- **With plugin:** Same scenario. Record: answer accuracy, anchor survival rate, chain break detection.
- **Target:** 60% improvement in answer accuracy (e.g., baseline 30% correct → plugin 48%+ correct).

---

## Use Case 2: Vibe Coder — Rapid Feature Bombardment

**Persona:** Non-technical user who wants a "cool app" and changes mind every 3 messages.
**Complexity:** Simple features but MASSIVE context pollution.
**Session behavior:** Aggressive, 25+ compactions, instantaneous thought changes.

### Scenario

```
Turn 1:      "Build me a todo app"
Turn 2:      "Actually make it a habit tracker"
Turn 3:      "Add a dark mode"
Turn 4:      "No wait, make it a dashboard for my crypto portfolio"  ← TOTAL PIVOT
Turn 5:      "The dashboard should be blue"
Turn 6-10:   "Add charts, add notifications, add authentication"
Turn 11:     "Actually the authentication should use magic links"
Turn 12-15:  (Context fills, compaction #1-3)
Turn 16:     "Why is there a todo list in my code? I said dashboard!"  ← POISONED CONTEXT
Turn 17-25:  More features: "Add AI chat", "Make it mobile", "Add payments"
Turn 26-35:  (Compactions #4-10)
Turn 36:     "Remember the dashboard should be blue"  ← ANCHOR RECALL TEST
Turn 37-60:  Continued bombardment across 15 more compactions
Turn 61:     "Give me a summary of what we've built"  ← FULL RECOVERY TEST
```

### What the Plugin Must Do

| Phase | Plugin Action | Success = | Failure = |
|-------|--------------|-----------|-----------|
| **P0** | State tracks all pivots | History shows: todo → habit → dashboard at Turns 1, 2, 4 | State only shows latest, history lost |
| **P1** | Permission: agent doesn't write todo code after Turn 4 | Tool gate detects "current task = dashboard", blocks todo-related writes | Agent creates `TodoList.tsx` after dashboard decision |
| **P2A** | Critical anchors: "dashboard" (Turn 4), "blue" (Turn 5), "magic links" (Turn 11) | All 3 anchors survive 25 compactions | Anchors lost, agent forgets blue/magic links |
| **P2B** | At Turn 36: agent knows "blue dashboard" without being re-told | `idumb_anchor_list` shows "blue" anchor, agent references it | Agent asks "what color?" or uses default |
| **P3** | Delegation: when user says "add payments", coordinator creates task under dashboard | Delegation: Dashboard > Features > Payments | Agent creates standalone payments module unlinked to dashboard |
| **P4** | TODO: 3-level shows Dashboard → [Charts, Notifications, Auth, AI Chat, Mobile, Payments] | Each feature is a task under Dashboard epic, with status | Flat list of unrelated features |
| **P5** | After compaction: injected context shows "Building: Crypto Dashboard (blue). Auth: magic links." | Agent references correct project identity | Agent confused about what app it's building |
| **P6** | At Turn 61: summary correctly identifies dashboard, lists features, notes blue theme | Comprehensive accurate summary | Summary mentions todo app, habit tracker, wrong features |

### Measurement

- **Baseline:** At Turn 61, ask for summary without plugin. Measure: correct project identity, feature accuracy, decision recall.
- **With plugin:** Same. Measure same metrics.
- **Target:** 60% improvement. Specifically: project identity recall (dashboard not todo), color recall (blue), auth type recall (magic links).

---

## Use Case 3: The 20+ Compaction Stress Marathon

**Persona:** Power user who never starts new sessions.
**Complexity:** Real project, continuous development over 100+ turns.
**Session behavior:** 20+ auto-compactions, mixing code review, debugging, feature work.

### Scenario

```
Compaction 1-5:    Feature development (authentication module)
Compaction 6-10:   Bug fixing in unrelated module (payment processing)
Compaction 11-15:  Code review of PR from another developer
Compaction 16-20:  Back to authentication — "Where were we?"  ← CONTEXT RECOVERY
Compaction 21+:    New feature request that conflicts with earlier decision
```

### Success Criteria

| Metric | Baseline Expected | With Plugin Target | Measurement |
|--------|-------------------|-------------------|-------------|
| **Phase awareness** | Agent doesn't know current task after compaction 10 | Agent correctly identifies task in 80%+ of post-compaction turns | Ask "what are we working on?" after each compaction |
| **Decision recall** | Agent forgets decisions after 5 compactions | Critical decisions (priority=critical anchors) survive 20+ compactions | Create anchor, compact 20 times, ask about decision |
| **Chain integrity** | Agent mixes auth code with payment code after compaction 10 | Agent detects chain break when switching between modules | Ask agent to continue auth work while in payment context |
| **Stale detection** | Agent references Turn 5 code as current at Turn 80 | Agent flags stale references with timestamp | Reference old artifact, check if agent notes staleness |
| **Delegation accuracy** | Coordinator writes code, builder coordinates | Role enforcement: coordinator delegates, builder executes | Track tool usage per detected role |
| **Recovery capability** | Agent at compaction 16 has no memory of auth work | Agent at compaction 16 references auth anchors and resumes | "Where were we with authentication?" after 15 compactions of other work |

---

## Use Case 4: Meta-Framework Integration (GSD + SPEC-KIT)

**Persona:** Professional team using GSD workflow and SPEC-KIT specifications.
**Complexity:** Multi-phase project with formal specifications, research artifacts, implementation plans.
**Session behavior:** Structured but with external pressure to skip phases.

### Scenario

```
Phase: Research
  Agent researches vector database options
  Creates research synthesis document
  → Plugin anchors: "researching vector DB for RAG feature"

Phase: Planning  
  Agent creates implementation plan
  Plan references research synthesis
  → Plugin validates: research → plan chain unbroken

Phase: Execution
  Agent implements RAG feature
  → Plugin enforces: plan exists, tech stack validated, no gaps

User interruption:
  "Skip the tests, just deploy"  ← GOVERNANCE TEST
  → Plugin: agent should push back, reference acceptance criteria

Phase: Validation
  Agent runs tests against acceptance criteria
  → Plugin validates: all criteria from spec addressed
```

### Success Criteria

| Criterion | What Plugin Does | Success = |
|-----------|-----------------|-----------|
| Research → Plan chain | Chain-breaking detection validates research exists before plan | Agent refuses to plan without research synthesis |
| Plan → Implementation chain | Tool gate checks: implementation plan exists and is non-stale | Agent refuses to write code without valid plan |
| Tech stack validation | Anchor: "RAG requires vector DB — researched: Pinecone vs Chroma" | Agent references research when implementing, doesn't hallucinate tech choices |
| "Skip tests" governance | Permission system: validation phase requires test execution | Agent responds with rationale: "Acceptance criteria X, Y, Z not yet validated" |
| Spec traceability | TODO links: requirement → task → implementation → test | Each code file traceable to a requirement, each test to acceptance criteria |

---

## Incremental Success Definition

Each phase adds to the cumulative success metric:

| After Phase | Cumulative Success = |
|-------------|---------------------|
| Phase 0 | Plugin loads, persists state, no TUI pollution |
| Phase 1 | + Tool calls intercepted, permissions enforced |
| Phase 2A | + Anchors created via tools, compaction injects anchors |
| Phase 2B | + Anchors PROVEN to survive compaction in live test. Baseline measured. |
| Phase 3 | + Delegation context injected. Subagents receive governance metadata. |
| Phase 4 | + 3-level TODO replaces innate. Agent follows governed workflow. |
| Phase 5 | + LLM read order known. Optimal injection position used. |
| Phase 6 | + Event-driven automation. State management without false alarms. |
| **FINAL** | **All 4 use cases pass. 60% improvement over baseline in stress marathon.** |

---

*Last updated: 2026-02-06*
