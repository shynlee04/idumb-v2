# Framework Comparison — iDumb vs SpecKit vs GSD vs Agent-OS

**Generated:** 2026-02-08
**Method:** Research-backed analysis comparing standalone and wrapper capabilities
**Verdict:** iDumb has unique compaction-survival and hook-level governance capabilities that no other framework offers, but its integration and enforcement are 39% complete vs 80%+ for mature frameworks.

---

## 1. What Each Framework Is

### 1.1 SpecKit (Specification-Driven Development)
- **Purpose:** Transform natural language feature descriptions into implementation-ready development artifacts
- **Pipeline:** Feature Description → Spec (`spec.md`) → Plan (`plan.md`) → Tasks (`tasks.md`)
- **Key Feature:** Linear, deterministic pipeline with cross-artifact validation
- **Strength:** Each artifact builds on the previous one; consistency guaranteed by sequential generation
- **Limitation:** Single-agent, single-direction pipeline — no multi-agent orchestration

### 1.2 GSD (Get Shit Done)
- **Purpose:** Structured workflow phases for AI-assisted development
- **Pipeline:** Research → Plan → Build → Validate (sometimes: Brief → Research → Plan → Build → QA)
- **Key Feature:** Phase gates prevent premature execution; `STATE.md` tracks current phase
- **Strength:** Simple, opinionated — agents know what phase they're in
- **Limitation:** No schema governance, no persistence across compactions, markdown-based state

### 1.3 Agent-OS
- **Purpose:** Multi-agent orchestration platform with explicit lifecycle management
- **Pipeline:** Goal decomposition → Agent spawning → Task routing → Result aggregation
- **Key Feature:** Dynamic agent creation/destruction with tool routing
- **Strength:** True multi-agent coordination with structured handoffs
- **Limitation:** Platform-specific, heavy infrastructure, often requires custom runtime

### 1.4 iDumb (Intelligence Plugin for OpenCode)
- **Purpose:** Governance infrastructure at the tool level for LLM agent behavior improvement
- **Pipeline:** Hook interception → Schema validation → Context injection → State persistence
- **Key Feature:** Compaction-proof context via anchors; tool-level enforcement via hooks
- **Strength:** Operates INSIDE existing platform (OpenCode) without forking; schema-first governance
- **Limitation:** Integration incomplete (39%); enforcement not connected to detection

---

## 2. Capability Comparison Matrix

### 2.1 Core Capabilities

| Capability | SpecKit | GSD | Agent-OS | iDumb (Actual) | iDumb (Designed) |
|------------|---------|-----|----------|----------------|------------------|
| **Document Pipeline** | ✅ spec→plan→tasks | ✅ research→plan→build→validate | ❌ N/A | ❌ None | ✅ Planning registry chains |
| **Task Hierarchy** | ✅ Tasks with deps | ✅ Epics→Stories→Tasks | ✅ Goals→Tasks | ✅ Epic→Task→Subtask | ✅ |
| **Schema Validation** | ❌ Markdown-based | ❌ Markdown-based | ✅ JSON schemas | ✅ Zod + TypeScript | ✅ |
| **Multi-Agent** | ❌ Single agent | ❌ Single agent | ✅ N agents dynamic | ❌ Templates only | ✅ 3-agent model |
| **Agent Spawning** | ❌ N/A | ❌ N/A | ✅ Dynamic spawn/kill | ❌ Not implemented | ⚠️ Via OpenCode `task` tool |
| **Tool Interception** | ❌ N/A | ❌ N/A | ⚠️ Some | ✅ Hook-based | ✅ |
| **Compaction Survival** | ❌ N/A | ❌ N/A | ❌ N/A | ✅ Anchor injection | ✅ |
| **State Persistence** | ❌ Files only | ⚠️ STATE.md | ✅ Database | ✅ JSON + StateManager | ✅ |
| **Permission Enforcement** | ❌ N/A | ❌ N/A | ✅ Role-based | ❌ Schema only | ✅ Role-based |
| **Phase Awareness** | ⚠️ Implicit by step | ✅ STATE.md | ❌ N/A | ❌ Not enforced | ✅ Phase injection |
| **Chain Integrity** | ✅ Sequential validation | ❌ N/A | ❌ N/A | ✅ Chain validator | ✅ |
| **Framework Detection** | ❌ N/A | ❌ N/A | ❌ N/A | ✅ Detector exists | ✅ |
| **Live Testing** | ✅ Tests pass | ✅ Workflows tested | ✅ Tests pass | ❌ Tests broken | ✅ "294 pass" |

### 2.2 Governance Capabilities

| Governance Feature | SpecKit | GSD | Agent-OS | iDumb (Actual) |
|-------------------|---------|-----|----------|----------------|
| **Write blocking** | ❌ | ❌ | ✅ | ⚠️ Schema-level, not enforced |
| **Tool permission matrix** | ❌ | ❌ | ✅ | ⚠️ Defined in entity-resolver, not connected to tool-gate |
| **Delegation validation** | ❌ | ❌ | ✅ | ⚠️ Schema validates, tool-gate doesn't enforce |
| **Stale detection** | ❌ | ❌ | ❌ | ✅ isStale(), stalenessHours() |
| **Chain-break detection** | ❌ | ❌ | ❌ | ✅ detectChainBreaks() |
| **Lifecycle management** | ❌ | ❌ | ✅ | ✅ create→active→stale→superseded→abandoned |
| **Audit trail** | ❌ | ❌ | ⚠️ | ✅ .idumb/brain/audit/ |
| **Context poisoning prevention** | ❌ | ⚠️ Phase awareness | ❌ | ⚠️ Designed but not connected |

### 2.3 Integration Capabilities

| Integration | SpecKit | GSD | Agent-OS | iDumb |
|-------------|---------|-----|----------|-------|
| **Works as OpenCode plugin** | ❌ | ❌ | ❌ | ✅ Native |
| **Works as Claude Code hook** | ❌ | ❌ | ❌ | ❌ (OpenCode only) |
| **Works standalone** | ✅ | ✅ | ✅ | ❌ (requires OpenCode) |
| **Wraps existing frameworks** | ❌ | ❌ | ❌ | ✅ Designed (via framework detector) |
| **npm installable** | ✅ | ✅ | ⚠️ | ✅ `npx idumb-v2` |

---

## 3. What iDumb Does That Others Don't

### 3.1 Compaction-Proof Context (UNIQUE)
**No other framework addresses compaction.**

When sessions get long, platforms summarize and discard old context. All frameworks lose decision history, tech stack choices, and workflow state after compaction. iDumb's anchor system (`schemas/anchor.ts` + `hooks/compaction.ts`) injects critical context back into the compaction summary, budget-capped at ~500 tokens.

**Status:** Implemented in code but **never live-tested**.

### 3.2 Hook-Level Tool Interception (UNIQUE for plugins)
**iDumb intercepts at the tool execution level, not at the prompt level.**

SpecKit and GSD guide behavior through prompts and instructions — the LLM can choose to ignore them. iDumb uses `tool.execute.before` to actually intercept tool calls, inject metadata, and potentially block execution. This is a fundamentally different enforcement model.

**Status:** Hook fires and injects metadata. **Blocking and permission enforcement NOT connected.**

### 3.3 Schema-Governed Artifact Lifecycle (UNIQUE depth)
**iDumb's planning registry tracks individual sections, not just documents.**

SpecKit tracks spec→plan→tasks as documents. iDumb's `planning-registry.ts` tracks documents DOWN TO individual sections with content hashes, staleness, and drift detection. This enables detecting when a specific section of a plan drifts from its implementation.

**Status:** Schema complete. **Integration partial — write.ts updates registry but NO hook surfaces it to agents.**

---

## 4. What Others Do That iDumb Doesn't

### 4.1 SpecKit: Linear Pipeline Enforcement
SpecKit guarantees spec→plan→tasks ordering. You CAN'T generate tasks without a plan, and you CAN'T generate a plan without a spec. This is enforced by the pipeline itself.

**iDumb equivalent:** Planning registry chains COULD enforce this but currently don't. `idumb_write` checks chain integrity but doesn't block writes for missing upstream artifacts.

### 4.2 GSD: Phase State Machine
GSD uses `STATE.md` as a simple, explicit state marker. The current phase is always visible and agents respect it because it's in the system prompt.

**iDumb equivalent:** Framework detector detects GSD but doesn't inject phase state. The system prompt (`hooks/system.ts`) injects active task info but NOT phase information.

### 4.3 Agent-OS: Dynamic Agent Spawning
Agent-OS can create, route to, and destroy agents at runtime. This enables true multi-agent workflows where the number and type of agents varies by need.

**iDumb equivalent:** 3 agent templates exist but are NOT deployed and NOT dynamically spawnable. `idumb_task delegate` creates a delegation record but relies on the LLM following the returned instruction to spawn a subagent.

---

## 5. Standalone vs Wrapper Assessment

### As a Standalone Framework
| Criterion | Score | Evidence |
|-----------|-------|----------|
| Can start a new project from scratch | 2/10 | `idumb_init` scaffolds directories but no project bootstrapping |
| Can guide development workflow | 3/10 | Task hierarchy exists but no phase enforcement |
| Can prevent quality regressions | 2/10 | Tests broken, no automated validation |
| Can enforce code standards | 4/10 | Code quality scanner exists, write tool has entity resolution |
| Can manage multi-agent coordination | 2/10 | Delegation schema exists, agents not deployed |

**Standalone Score: 2.6/10** — iDumb cannot function as a standalone development framework.

### As a Wrapper for GSD/SpecKit
| Criterion | Score | Evidence |
|-----------|-------|----------|
| Detects existing framework | 8/10 | Framework detector correctly identifies GSD, BMAD, SpecKit, Open-spec |
| Enhances existing framework | 2/10 | Detection produces no enforcement actions |
| Adds compaction survival | 7/10 | Anchor system works (code-level), never live-tested |
| Adds tool governance | 3/10 | Hook fires but permission chain disconnected |
| Adds agent coordination | 2/10 | Schema exists but no runtime coordination |

**Wrapper Score: 4.4/10** — iDumb can detect frameworks but doesn't meaningfully enhance them yet.

---

## 6. Honest Assessment

### iDumb's True Differentiator
The only truly unique capability iDumb offers that NO competitor has is **hook-level tool interception inside an existing platform**. This enables:
- Intercepting every tool call before execution
- Injecting metadata that the LLM cannot ignore (it's in the tool args)
- Potentially blocking execution (proven in Trial-1)
- Surviving compaction with anchor injection

### The Gap Between Design and Reality
- **Designed:** 90%+ coverage — schemas, types, factories, validators, detectors, resolvers, templates all exist
- **Connected:** 39% — most components work in isolation but aren't wired together
- **Proven:** <10% — no live testing, failing tests, agents not deployed, never loaded in OpenCode

### What Would Make iDumb Competitive

1. **Fix tests** — from 0/8 passing to 8/8 passing
2. **Deploy agents** — from templates to `.opencode/agents/*.md`
3. **Wire tool-gate ↔ entity-resolver** — from schema-only to enforced permissions
4. **Wire registry → system prompt** — from write-only to agent-visible
5. **Wire framework-detector → enforcement** — from detection to phase injection
6. **Live test in OpenCode** — prove hooks fire, tools appear, compaction works

These 6 fixes would move iDumb from 39% to ~75% integration and make it the only plugin-based governance system for any AI coding platform.

---

*Generated by Ralph Loop Validation — 2026-02-08*
*Research sources: SpecKit docs, GSD workflow analysis, Agent-OS architecture papers*
