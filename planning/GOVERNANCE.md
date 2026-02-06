# iDumb Governance Framework

**Created:** 2026-02-06
**Status:** Active — living document
**Scope:** All development decisions, principles, and constraints

---

## Part 1: Fundamental Design Violations Detected

These violations led to the strategic reset. They are the *reason* this governance exists.

| # | Violation | Why It's Fatal | Evidence |
|---|-----------|---------------|----------|
| V1 | **No singular source-of-truth** for what the plugin does | Does many things, nothing works efficiently. Each session adds features, none validated. | v1 had 8 trials planned, 0 stress-tested end-to-end |
| V2 | **Subjective hypotheses treated as facts** | "I think compact injection works" → no pivot point → more features stacked → LLMs confused more | Time-to-stale, chain-breaking, delegation all assumed working before any was tested |
| V3 | **No micro-phases with pivot decisions** | Tactical development had no decision gates between mechanisms. If P1 fails, P2-P8 are still queued. | Plan shows 8 trials as sequential without pivot trees |
| V4 | **Feature stacking without validation** | Adding complexity before proving fundamentals. Each new feature becomes context poison for the agent trying to use the plugin. | v1 accumulated 12+ planned tools before testing 1 |
| V5 | **Planning artifacts unregulated** | Plans, research docs, notes — all read as context by agents. Unregulated = context poisoning. | `.plugin-dev/` has 20+ research files with no lifecycle or staleness |
| V6 | **No baseline measurement** | "60% improvement" over what? No measurement of agent behavior without the plugin. | Success criteria reference improvement with no baseline data |
| V7 | **LLM read order unknown** | Which injected message does the LLM actually attend to? First? Last? Unknown. Building transform hooks on assumption. | T5/T6 planned without any empirical data |

---

## Part 2: What This Plugin Does (Singular Definition)

> **iDumb provides structured infrastructure at the tool level so that LLM agents exhibit intelligent behavior — defined as: always knowing what to do, when to stop, and how to recover.**

### What this means concretely:

- **"Structured infrastructure"** = hooks, tools, schemas, state persistence. NOT text analysis engines. NOT intelligence itself.
- **"At the tool level"** = intercept tool execution, inject context via tools, enforce via tool permissions. The plugin operates through OpenCode's tool system.
- **"LLM agents exhibit intelligent behavior"** = the LLM *already has* intelligence. The plugin removes obstacles (stale context, missing phase info, broken chains) so the LLM's native reasoning works correctly.
- **"Always knowing what to do"** = at every tool call, the agent has access to: current phase, current task, relevant anchors, delegation hierarchy.
- **"When to stop"** = chain breaks, permission violations, stale context → the agent is informed and can decide to stop.
- **"How to recover"** = anchors survive compaction, state persists, delegation history available → the agent has recovery paths.

### What this does NOT mean:

- We do NOT build engines that analyze text for "poisoning" 
- We do NOT replace the LLM's reasoning with rule-based logic
- We do NOT create a parallel platform alongside OpenCode
- We do NOT build GUIs (except localhost-link workarounds if needed)

---

## Part 3: Detected Pitfalls Catalog

### Category A: Architecture Pitfalls

| ID | Pitfall | Consequence | Prevention |
|----|---------|-------------|------------|
| A1 | Registering 12+ tools at once | LLM overwhelmed with tool options, picks wrong ones | Phase in: 3 tools max per trial, validate each |
| A2 | Growing state.json unbounded | Slow reads, memory pressure, stale data accumulates | Cap at 100 history entries (DONE), purge stale anchors |
| A3 | Planning artifacts without lifecycle | Agents read abandoned plans as truth → hallucinate | Every artifact: created → active → stale → purged |
| A4 | Overlapping module responsibilities | Confusion about what owns state, what triggers hooks | Explicit ownership in schemas, no cross-boundary mutation |
| A5 | No schema for data that exists | Runtime crashes, type mismatches, silent corruption | If it's not in a Zod schema, it doesn't exist |

### Category B: LLM Interaction Pitfalls

| ID | Pitfall | Consequence | Prevention |
|----|---------|-------------|------------|
| B1 | Injecting nonsensical/empty data into context | Agent reads garbage, responds with nothing useful | Every injection must be: non-empty, schema-validated, relevant |
| B2 | Data transformed but not hierarchical | Tons of chunks, agent can't prioritize | All injections: priority-ordered, budget-capped (≤500 tokens) |
| B3 | Forcing agent to read → but data has no actionable content | Agent acknowledges reading but gains nothing | Every injection must answer: "What should the agent DO with this?" |
| B4 | States with broken chains trigger false alerts | Agent loses trust in governance system | Validate chain integrity BEFORE alerting |
| B5 | Stale timestamps that don't reflect reality | Agent treats old data as current | Time-to-stale enforcement on EVERY read, not just periodic |

### Category C: Platform Pitfalls

| ID | Pitfall | Consequence | Prevention |
|----|---------|-------------|------------|
| C1 | Breaking OpenCode TUI | Plugin pollutes terminal, user can't work | ZERO console.log. All output to files. Log to `.idumb/` only |
| C2 | Conflicting with innate agents | Build/Plan/General/Explore agents blocked or confused | Default role = meta (allow-all). Plugin ADDS, never RESTRICTS innate behavior |
| C3 | Compact hook + message transform timing collision | Both fire, data duplicated or corrupted | Compact hook = context injection. Message transform = format only. Never overlap content. |
| C4 | Plugin slows down tool execution | User perceives lag, disables plugin | All hook logic: <50ms. Async where possible. Fail silently. |
| C5 | ESM/CJS module conflicts | Runtime crashes on require() in ESM context | Pure ESM only. No require(). Top-level imports only. (FIXED) |

### Category D: Process Pitfalls

| ID | Pitfall | Consequence | Prevention |
|----|---------|-------------|------------|
| D1 | Testing features in the same project being developed | Test pollution, can't distinguish plugin bugs from project bugs | Stress test in SEPARATE worktree |
| D2 | Skipping baseline measurement | No way to prove improvement | Measure agent behavior WITHOUT plugin first |
| D3 | Building on untested hypotheses | Feature tower on sand | Test hypothesis → validate → then build next layer |
| D4 | Research documents never pruned | Context bloat, stale references treated as truth | Research → synthesize → archive original → use synthesis only |
| D5 | No automated regression | Manual testing only, regressions slip in | Each trial: automated validation script that can re-run |

### Category E: Integration Pitfalls (discovered during Phase 2C)

| ID | Pitfall | Consequence | Prevention |
|----|---------|-------------|------------|
| E1 | **TOOL_CATEGORIES using invented tool names** | getToolCategory() returns null for real OpenCode tools → permission checks silently skip | Map ONLY actual OpenCode innate tools: read, list, glob, grep, edit, write, bash, task, webfetch, websearch, codesearch, todowrite, todoread, skill. FIXED in Phase 2C. |
| E2 | **Framework detector false positives** | Generic file markers (PROJECT.md, config.json) match non-framework projects | Use required+optional markers. Require the UNIQUE file (e.g., STATE.md for GSD). FIXED in Phase 2C. |
| E3 | **PATHS migration breaks existing data** | Changing state/config paths orphans existing files | Verify existing data location BEFORE changing PATHS. In our case .idumb/brain/ already existed. |
| E4 | **Scanner outputs .md files instead of JSON** | Violates "everything in code, no exposed templates" principle | ALL scan output → JSON in .idumb/brain/context/. Enforced by ScanResultSchema. |
| E5 | **Adding features without updating planning docs** | Planning docs become stale, agents read outdated context as truth | Every phase completion → update PHASE-COMPLETION.md, GOVERNANCE.md with new findings |

---

## Part 4: Non-Negotiable Development Principles

### The DOs

| # | Principle | Rationale | Enforcement |
|---|-----------|-----------|-------------|
| DO-1 | **One mechanism at a time** | Each must be tested independently before combining | Phase gates: mechanism N must pass before N+1 starts |
| DO-2 | **Pivot fast** | If hypothesis fails after 1 trial, try the fallback. If fallback fails, skip to next mechanism. | Every mechanism has: primary approach, fallback, skip criteria |
| DO-3 | **Contracts before code** | Zod schemas define truth. Implementation follows schemas. | No new module without schema + type definition first |
| DO-4 | **Plugin provides infrastructure, LLM provides intelligence** | Don't compete with the LLM's reasoning. Remove obstacles. | Review every feature: "Am I providing data or making decisions?" If deciding → remove. |
| DO-5 | **Every state has a lifecycle** | create → use → stale → purge. No immortal data. | TimestampSchema on everything. Staleness enforced on read. |
| DO-6 | **Measure before and after** | Can't claim improvement without baseline | Baseline test before each new mechanism |
| DO-7 | **Stress test in isolation** | Separate worktree for stress tests | Never test plugin behavior in the plugin's own development project |
| DO-8 | **Cap everything** | History, anchors, injections, tools — all bounded | Explicit limits in config schema. No unbounded arrays. |
| DO-9 | **Schema guards on every boundary** | Data crossing module boundaries MUST be validated | readJson() always validates. writeJson() always from typed source. |
| DO-10 | **Graceful degradation** | Plugin failure must never break the user's workflow | try/catch on every hook. Fail silently to logs. Never throw from after-hooks. |

### The DON'Ts

| # | Anti-Pattern | Why It's Dangerous | Consequence if Violated |
|---|-------------|-------------------|------------------------|
| DONT-1 | **Don't build text analysis engines** | LLMs already analyze text. Plugin doing it = competing, confusing, slower. | Feature rejected. |
| DONT-2 | **Don't register 12+ tools at once** | LLM tool selection degrades with too many options | Max 3-5 new tools per phase |
| DONT-3 | **Don't modify messages experimentally without empirical data** | Unknown LLM read order → could make things worse | T5/T6 gated on: first run A/B test to determine read order |
| DONT-4 | **Don't create parallel permission systems** | Must work WITH innate agents, not alongside them | Permission checks only add metadata, never block innate agents |
| DONT-5 | **Don't plan 8 weeks of trials without validating the first** | Feature tower on sand. One failed assumption = all wasted. | After each trial: PIVOT-OR-CONTINUE decision required |
| DONT-6 | **Don't store unstructured data** | Any data without schema = future context poison | If you can't define a Zod schema for it, don't persist it |
| DONT-7 | **Don't console.log** | TUI background text exposure. User sees garbage. | File logging only. Zero console output. |
| DONT-8 | **Don't assume compact hook content survives** | LLM may not attend to injected context | Validate via stress test: did agent reference anchor after compaction? |
| DONT-9 | **Don't grow features without pruning** | Every new feature = more context for agents to process | Monthly: audit tools. If unused in 5 sessions → archive. |
| DONT-10 | **Don't skip the pivot decision** | Sunk cost fallacy kills projects | After every trial: explicit written "CONTINUE because X" or "PIVOT because Y" |

---

## Part 5: Confidence Tiers for Mechanisms

Honest assessment of what we know vs. what we assume.

### Tier 1: Most Likely Works (Proven or High Confidence)

| Mechanism | Evidence | Status |
|-----------|----------|--------|
| Stop Hook (tool.execute.before) | Trial-1 validated: error blocks execution, arg modification persists | PROVEN |
| Permission enforcement via roles | Trial-1 validated: role detection, tool categorization working. TOOL_CATEGORIES updated to map actual OpenCode innate tools. | PROVEN |
| Anchor persistence to disk | Implemented, schema-validated, atomic writes | IMPLEMENTED |
| Compact hook context injection | Implemented with budget cap, anchor selection | IMPLEMENTED (untested in live compaction) |
| Codebase scanner → JSON memory | Phase 2C: deterministic scan, 9/9 test assertions pass, ScanResult schema-validated | IMPLEMENTED |
| Framework detector (GSD/BMAD/SPEC-KIT) | Phase 2C: required+optional markers, false positive fixed | IMPLEMENTED |
| `.idumb/` tree scaffolding | Phase 2C: 16 directories created programmatically by `idumb_init` | IMPLEMENTED |

### Tier 2: Unknown Effectiveness (Hypothesis Only)

| Mechanism | Unknown | Test Required |
|-----------|---------|---------------|
| Compact message hierarchy | Which message does LLM read first after compaction? | A/B: inject at start vs. end, measure agent reference rate |
| User prompt transformation | Does transforming user messages help or confuse? | A/B: transform vs. passthrough, measure task completion |
| Inner cycle delegation injection | Can we meaningfully inject into subagent context? | Test: inject context in tool.execute.before for task tools |

### Tier 3: Strongly Confident but Untested

| Mechanism | Why Confident | Why Untested |
|-----------|--------------|--------------|
| 3-Level TODO replacing innate | Forced tool usage = forced workflow. LLMs follow tool schemas. | Complex: needs metadata, hierarchy, delegation, interactive planning |
| Force delegation via tool interception | If we can block tools, we can force read-before-write. | Needs: delegation schema, coordinator detection, enforcement logic |

### Tier 4: Safe but Complex (High False Alarm Risk)

| Mechanism | Risk | Mitigation |
|-----------|------|------------|
| Auto-run tools via hooks | Export nonsensical data → agent reads garbage → hallucination | ONLY auto-run if: data is schema-validated, non-empty, actionable |
| State-driven hook triggers | Stale states + broken chains = false alerts everywhere | Validate chain integrity BEFORE triggering. Never alert on stale data. |
| Session export for agent consumption | Meaningless data chunks → agent wastes context window | Budget-cap exports. Only export: current task, active anchors, delegation status. |

---

## Part 6: Integration Framework

### With GSD (Get Shit Done) Workflow

iDumb provides the **enforcement layer** for GSD workflow stages:
- **Research phase**: Plugin injects "you are in research" context → agent uses research tools only
- **Planning phase**: Plugin enforces "read plan before executing" via tool interception
- **Execution phase**: Plugin tracks atomic commits against plan items
- **Validation phase**: Plugin auto-runs validation checks after tool execution

### With SPEC-KIT (Specification-Driven Development)

iDumb provides the **traceability layer** for SPEC-KIT:
- **Requirements** → linked to anchors → survive compaction
- **Acceptance criteria** → linked to validation hooks
- **Tech stack decisions** → linked to research synthesis → enforced via chain-breaking detection
- **Implementation plans** → linked to TODO delegation → tracked via 3-level tasks

### Compact Command: Replaces Innate (Not Manual)

The compact hook is NOT for manual "compact" commands. It:
1. **Replaces** the innate compaction behavior by injecting structured context
2. **Automatically** fires when OpenCode triggers compaction (session length, token limit)
3. **Selects** which anchors survive based on score (priority × freshness)
4. **Budget-caps** injection to ≤500 tokens to avoid overwhelming the post-compaction context

---

## Part 7: Gap Analysis

### Detected Gaps (Self-Assessment)

| # | Gap | Severity | Current Status | Required Action |
|---|-----|----------|---------------|-----------------|
| G1 | **No baseline measurement** | CRITICAL | We claim "60% improvement" but have zero baseline data | Create baseline stress test: run scenario WITHOUT plugin, measure agent accuracy |
| G2 | **No automated stress test** | HIGH | Manual testing only, subjective assessment | Build automated scenario runner that measures: anchor survival, phase awareness, chain integrity |
| G3 | **LLM read order unknown** | HIGH | Building T5/T6 on assumption | Design A/B test: inject marker at position A vs. B, measure which agent references |
| G4 | **No knowledge base mechanism** | MEDIUM | Repowiki-like system mentioned but no design | Phase this after TODO delegation works. Knowledge base = anchors + planning artifacts + codebase links |
| G5 | **No tech stack document lifecycle** | MEDIUM | Tech docs mentioned but no schema/enforcement | Design TechStackSchema with: source links, research validation status, staleness |
| G6 | **Interactive planning artifacts** | LOW (deferred) | "Hardest part" — localhost GUI or file-based? | Defer until Phase 4+. Start with file-based markdown with metadata headers |
| G7 | **Multi-agent coordination** | MEDIUM | Agents don't know about each other's active work | Session tracking exists but no cross-session awareness mechanism |
| G8 | **Background automation** | LOW | Cron-based time-to-stale mentioned but no implementation path | Design as: tool.execute.after checks staleness on relevant anchors. No actual cron needed. |
| G9 | **Research artifact pruning** | HIGH | `.plugin-dev/` has 20+ files, no lifecycle | Immediate: archive completed research. Ongoing: every research doc gets staleness timestamp |
| G10 | **Regression testing** | HIGH | No automated regression suite | Each trial produces a validation script. Suite grows incrementally. |

### Self-Improvement Protocol

After every trial completion:
1. **Measure**: Did the mechanism achieve its pass criteria?
2. **Compare**: Against baseline (or previous trial's metrics)
3. **Detect**: What gaps were exposed by this trial?
4. **Update**: This governance document with new pitfalls/principles
5. **Decide**: CONTINUE (expand mechanism) or PIVOT (try fallback) or SKIP (move to next)

---

*Last updated: 2026-02-06*
*Next review: After Phase 2B stress test alpha*
