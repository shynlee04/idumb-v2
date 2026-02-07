# RALPH VALIDATION REPORT — iDumb v2 Complete Audit

**Generated:** 2026-02-08
**Source:** `mess-of-requirements-and-changes.md` (10-Level Validation)
**Verdict:** ❌ NOT COMPLETE — Significant Gaps Across All Levels
**Codebase Hash:** TypeScript compiles (0 errors), Tests FAIL (8/8 files)

---

## Executive Summary

This report is the output of executing the Ralph Loop against `mess-of-requirements-and-changes.md`. It validates the iDumb v2 codebase against all 10 validation levels specified in the requirements document. The output is structured as a complete, non-gap document ecosystem sufficient for a fresh AI agent to begin a GSD-New-Project without clarification questions.

### Critical Findings

| Finding | Severity | Evidence |
|---------|----------|----------|
| **All 8 test files FAIL** | 🔴 CRITICAL | Tests use `process.exit()` incompatible with vitest runner |
| **No agents deployed** | 🔴 CRITICAL | `.opencode/agents/` is empty — deploy has never run |
| **6 files exceed 500 LOC** | 🟡 HIGH | `write.ts`(1174), `templates.ts`(1510), `task.ts`(826), `planning-registry.ts`(729), `code-quality.ts`(701), `entity-resolver.ts`(545) |
| **All 4 planning docs STALE** | 🟡 HIGH | Reference Phase 2 structure; project is at Phase n6 |
| **All Knowledge Items STALE** | 🟡 HIGH | Reference superseded v1 files, outdated agent models |
| **No runtime delegation enforcement** | 🟡 HIGH | Schema exists; hook enforcement NOT wired |
| **No live OpenCode testing** | 🔴 CRITICAL | Phase 2B never completed |
| **No baseline measurement** | 🔴 CRITICAL | "60% improvement" claim has no baseline |

### What Actually Works (Verified by Code + TypeScript Compilation)

1. ✅ TypeScript compiles cleanly (`tsc --noEmit` = 0 errors)
2. ✅ Plugin entry point (`src/index.ts`) registers 5 hooks + 5 tools
3. ✅ StateManager singleton with debounced disk persistence
4. ✅ 3-agent templates defined in `templates.ts` (coordinator, investigator, executor)
5. ✅ Full schema set: task (3-level), delegation, planning-registry, brain, codemap, project-map, anchor, config
6. ✅ `idumb_write` tool with entity resolution, chain validation, lifecycle ops
7. ✅ `idumb_task` tool with 13 actions, delegation integration, governance footers
8. ✅ Planning registry schema with artifact chains, outlier detection, section drift
9. ✅ Entity resolver with classification rules and permission matrix
10. ✅ Chain validator with integrity checks

### What Does NOT Work (Verified by Testing + Code Analysis)

1. ❌ Tests: 8/8 test files fail in vitest (process.exit() crashes runner)
2. ❌ Agents: Not deployed to `.opencode/agents/` (templates exist but deploy never run)
3. ❌ Live validation: No evidence of plugin loading in OpenCode
4. ❌ Delegation runtime: `tool-gate.ts` has no delegation depth tracking
5. ❌ Framework interception: Detector exists but no enforcement actions
6. ❌ Command splitting: Templates are monolithic (1510 LOC), no just-in-time commands
7. ❌ Dashboard: Backend/frontend scaffolds exist but no data integration
8. ❌ Brain/wiki: Schema exists but no read/write tool for brain entries
9. ❌ Compaction live test: Hook code exists but never verified in production
10. ❌ Agent name detection: `chat.params` registered but brittle pattern matching

---

## Level 1: Incremental Validation

### File-by-File Compilation Status

| Category | Files | Status | Notes |
|----------|-------|--------|-------|
| Schemas | 9 files (anchor, brain, codemap, config, delegation, index, planning-registry, project-map, task) | ✅ Compiles | All export types + factory functions |
| Tools | 11 files (anchor, bash, codemap, index, init, read, scan, status, task, webfetch, write) | ✅ Compiles | All use `tool()` helper |
| Hooks | 5 files (compaction, index, message-transform, system, tool-gate) | ✅ Compiles | All use hook factory pattern |
| Lib | 9 files (chain-validator, code-quality, entity-resolver, framework-detector, index, logging, persistence, scaffolder, state-reader) | ✅ Compiles | StateManager singleton pattern |
| CLI | 3 files (cli.ts, deploy.ts, dashboard.ts) | ✅ Compiles | CLI entry + deploy + dashboard scaffold |
| Templates | 1 file (templates.ts) | ✅ Compiles | 1510 LOC (3x over limit) |
| Entry | 2 files (index.ts, tools-plugin.ts) | ✅ Compiles | Plugin entry point |
| Dashboard | 4 files (server.ts, vite.config.ts, types.ts, comments-types.ts) | ✅ Compiles | Scaffold only |
| Modules | 1 file (agent-profile.ts) | ✅ Compiles | Module schema |
| **Tests** | **9 files** | **❌ ALL FAIL** | **process.exit() incompatible with vitest** |

### Test Failure Analysis

```
Test Files  8 failed (8)
Tests       no tests
Errors      3 errors

Root Cause: Test files use process.exit(failed > 0 ? 1 : 0) which crashes vitest.
Affected: compaction.test.ts, message-transform.test.ts, and all others.
Fix Required: Migrate tests from standalone scripts to proper vitest describe/it blocks.
```

---

## Level 2: Stale/Superseded Document Tracking

### Planning Documents Audit

| Document | Created | Last Updated | Current Accuracy | Verdict |
|----------|---------|-------------|------------------|---------|
| `GOVERNANCE.md` | 2026-02-06 | 2026-02-06 | ~40% | 🟡 STALE — references Phase 2B, outdated phase numbering, integration section not code-mapped |
| `PROJECT.md` | 2026-02-06 | 2026-02-06 | ~25% | 🔴 STALE — directory structure shows v1 files (plugin.ts, engines/), old tool names (anchor_add), references Phase 2C |
| `PHASE-COMPLETION.md` | 2026-02-06 | 2026-02-06 | ~30% | 🔴 STALE — Phases 0-2C documented; project is at Phase n6 with 3 agents + delegation + planning registry |
| `SUCCESS-CRITERIA.md` | 2026-02-06 | 2026-02-06 | ~60% | 🟡 PARTIALLY STALE — use cases valid but phase references outdated, tool names changed |
| `implementation_plan-n6.md` | 2026-02-07 | 2026-02-07 | ~70% | 🟢 MOST CURRENT — but Iteration 1 tasks partially complete, no completion evidence |

### Knowledge Items Audit

| KI Artifact | Accuracy | Issues |
|-------------|----------|--------|
| `overview.md` | ~20% | References non-existent "5-Plugin Ecosystem", Phase 1b status, "Meta Builder" agent |
| `governance-master-ssot.md` | ~25% | References 4-tier role model (L0-L3), `idumb_brain` tool (doesn't exist), old agent names |
| `gap-analysis.md` | ~30% | References v1 files (plugin.ts, permission.ts), stale line numbers, T1-T8 trial system |
| `phase-1b-beta-tools.md` | ~50% | Partially accurate for Phase 1b but doesn't cover Phase n6 |
| `technical-implementation-ssot.md` | ~35% | References deprecated architecture patterns |

### Evidence

**PROJECT.md directory structure** (line 168-229) shows:
```
src/plugin.ts          ← DOESN'T EXIST (renamed to index.ts)
src/engines/           ← DOESN'T EXIST (moved to src/lib/)
src/types/             ← DOESN'T EXIST (removed)
tools/anchor.ts        ← EXISTS but tool names changed
```

**AGENTS.md** (current, v6.0.0):
```
Status: Phase 0 COMPLETE, Phase 1b-β tools DONE, Phase α2 DONE, Phase δ2 DONE, Phase n6 DONE
Tests: 294/294 assertions → INCORRECT (tests fail in vitest)
```

---

## Level 3: Same-Level Matrix Validation (Horizontal)

### Schema Cross-Reference Matrix

| Schema | Used By Tools | Used By Hooks | Used By Lib | Tested |
|--------|--------------|---------------|-------------|--------|
| `task.ts` | `task.ts` ✅ | `tool-gate.ts` (partial) | `persistence.ts` ✅ | `task.test.ts` ❌ FAILS |
| `delegation.ts` | `task.ts` ✅ | None ❌ | `persistence.ts` ✅ | `delegation.test.ts` ❌ FAILS |
| `planning-registry.ts` | `write.ts` ✅, `init.ts` ✅ | None ❌ | None ❌ | `planning-registry.test.ts` ❌ FAILS |
| `brain.ts` | None ❌ | None ❌ | None ❌ | None ❌ |
| `codemap.ts` | `codemap.ts` ✅ | None ❌ | None ❌ | None ❌ |
| `project-map.ts` | `scan.ts` ✅ | None ❌ | None ❌ | None ❌ |
| `anchor.ts` | `anchor.ts` ✅ | `compaction.ts` ✅ | `persistence.ts` ✅ | `compaction.test.ts` ❌ FAILS |
| `config.ts` | `init.ts` ✅ | `tool-gate.ts` ✅ | `persistence.ts` ✅ | None ❌ |

### Critical Gap: `brain.ts` Schema

The `brain.ts` schema defines `BrainEntry`, `BrainStore`, and factory functions (`createBrainEntry`, `createBrainStore`, `queryBrain`, `formatBrainEntries`). **No tool reads or writes brain entries.** The schema is orphaned — defined but never used at the tool level.

### Tool Permission Matrix vs Entity Resolver

| Tool | Registered In | Entity Resolution | Chain Validation | Permission Check |
|------|--------------|-------------------|------------------|-----------------|
| `idumb_task` | `index.ts` ✅ | N/A (direct schema) | Via `responseFooter()` | Via `buildGovernanceReminder()` |
| `idumb_write` | `index.ts` ✅ | `entity-resolver.ts` ✅ | `chain-validator.ts` ✅ | `entity-resolver.ts` ✅ |
| `idumb_init` | `index.ts` ✅ | N/A | N/A | None |
| `idumb_scan` | `index.ts` ✅ | N/A | N/A | None |
| `idumb_codemap` | `index.ts` ✅ | N/A | N/A | None |
| `idumb_anchor` | `index.ts` ✅ | N/A (direct schema) | N/A | None |
| `idumb_bash` | `tools-plugin.ts` ✅ | N/A | N/A | None |
| `idumb_read` | `tools-plugin.ts` ✅ | N/A | N/A | None |
| `idumb_webfetch` | `tools-plugin.ts` ✅ | N/A | N/A | None |
| `idumb_status` | `index.ts` ✅ | N/A | N/A | None |

**Gap:** Only `idumb_write` has full entity resolution + chain validation + permission checking. All other tools operate without governance.

---

## Level 4: Vertical Upstream/Downstream Hierarchical Integration

### Hook → Tool → Schema → Persistence Chain

```
Upstream (hooks fire):
  tool.execute.before → tool-gate.ts → StateManager.getSession()
                                     → StateManager.getActiveTask()
                                     → injects __idumb_checked metadata
  
  tool.execute.after  → tool-gate.ts → logs tool execution
  
  experimental.session.compacting → compaction.ts → StateManager.getAnchors()
                                                 → selectAnchors() → injects context
  
  system.prompt.transform → system.ts → reads task store
                                     → builds governance prefix
  
  chat.params → index.ts → StateManager.setCapturedAgent()

Midstream (tools execute):
  idumb_task → schemas/task.ts → StateManager.getTaskStore()
                              → schemas/delegation.ts → StateManager.getDelegationStore()
                              → persistence (commitStore)
  
  idumb_write → lib/entity-resolver.ts → schemas/planning-registry.ts
                                       → lib/chain-validator.ts
                                       → writes file + updates registry

Downstream (persistence):
  StateManager → .idumb/brain/hook-state.json  (sessions, anchors)
              → .idumb/brain/tasks.json        (task store)
              → .idumb/brain/delegations.json  (delegation store)
  
  Planning Registry → .idumb/brain/planning-registry.json
  
  Scan Results → .idumb/brain/context/scan-result.json
```

### Broken Chains Detected

1. **Delegation → Tool Gate:** `delegation.ts` defines `validateDelegation()` but `tool-gate.ts` does NOT call it. Delegations are validated only when `idumb_task` runs `delegate` action — NOT enforced at the hook level.

2. **Brain → Nothing:** `brain.ts` schema is complete but has NO tool, NO hook, and NO persistence path. Dead code.

3. **Framework Detector → Nothing:** `framework-detector.ts` detects GSD/BMAD/SpecKit/Open-spec but the detection result is only used in `idumb_init` greeting. NO enforcement, NO phase injection, NO workflow regulation.

4. **Planning Registry → Hook:** Registry is updated by `idumb_write` but NO hook reads it. System prompt transform reads task store but NOT the planning registry. Agents never see registry state.

5. **Dashboard → Plugin:** Dashboard scaffolds exist (`server.ts`, `types.ts`) but no data integration. No API endpoint reads from `.idumb/brain/`.

---

## Level 5: Evidence of Investigations (Agents, Rules, Prompts, Tools, Skills, Hooks, Plugins)

### Agent Investigation

| Agent | Template Exists | Deployed | Profile File | Actually Used |
|-------|----------------|----------|-------------|---------------|
| `idumb-supreme-coordinator` | ✅ `getCoordinatorAgent()` in templates.ts | ❌ Not deployed | `COORDINATOR_PROFILE` constant | ❌ Never deployed |
| `idumb-investigator` | ✅ `getInvestigatorAgent()` in templates.ts | ❌ Not deployed | `INVESTIGATOR_PROFILE` constant | ❌ Never deployed |
| `idumb-executor` | ✅ `getExecutorAgent()` in templates.ts | ❌ Not deployed | `EXECUTOR_PROFILE` constant | ❌ Never deployed |

**Evidence:** `find .opencode -type f` returns ONLY `node_modules/zod/` files and `package.json`. No `.md` agent files exist.

### Hook Investigation

| Hook | Registered | Implementation | Live-Tested |
|------|-----------|----------------|-------------|
| `tool.execute.before` | ✅ `index.ts:88` | `tool-gate.ts` — role detection, active task check, metadata injection | ❌ Never tested in OpenCode |
| `tool.execute.after` | ✅ `index.ts:95` | `tool-gate.ts` — logs tool execution | ❌ Never tested |
| `experimental.session.compacting` | ✅ `index.ts:104` | `compaction.ts` — anchor injection with budget cap | ❌ Never tested |
| `system.prompt.transform` | ✅ `index.ts:110` | `system.ts` — governance prefix injection | ❌ Never tested |
| `chat.params` | ✅ `index.ts:121` | Inline — captures agent name | ❌ Never tested |

### Tool Investigation

| Tool | Defined | Args Schema | Entity Resolution | Self-Governed |
|------|---------|-------------|-------------------|---------------|
| `idumb_task` | `tools/task.ts` (826 LOC) | 13 actions, zod args | No entity resolver | Partially — governance footer |
| `idumb_write` | `tools/write.ts` (1174 LOC) | 8 args incl. lifecycle | Full via entity-resolver | Yes — chain + permission |
| `idumb_init` | `tools/init.ts` (441 LOC) | deploy_agents, force | No entity resolver | No |
| `idumb_scan` | `tools/scan.ts` (445 LOC) | scope, path, focus | No entity resolver | Generated scan-result.json |
| `idumb_codemap` | `tools/codemap.ts` (521 LOC) | action, scope | No entity resolver | No |
| `idumb_anchor` | `tools/anchor.ts` | add/list | No entity resolver | No |
| `idumb_status` | `tools/status.ts` | No args | No entity resolver | No |
| `idumb_bash` | `tools/bash.ts` (438 LOC) | command, timeout | No entity resolver | TUI-safe wrapper |
| `idumb_read` | `tools/read.ts` (568 LOC) | path, format | No entity resolver | Token-budget reads |
| `idumb_webfetch` | `tools/webfetch.ts` (365 LOC) | url, mode | No entity resolver | No |

### Skill Investigation

| Skill | Template Exists | Content |
|-------|----------------|---------|
| `DELEGATION_SKILL_TEMPLATE` | ✅ in templates.ts | Markdown instructions for delegation protocol |
| `GOVERNANCE_SKILL_TEMPLATE` | ✅ in templates.ts | Markdown instructions for governance protocols |

**Gap:** Skills are defined as string templates but NOT deployed. No `.opencode/skills/` files exist. Skills reference tools and agents that don't exist in `.opencode/`.

---

## Level 6: Evidence Through Research

### External Framework Research

**GSD (Get Shit Done):**
- Linear phase workflow: Research → Plan → Build → Validate
- Uses `STATE.md` as singular state marker
- iDumb has framework detector that finds `STATE.md` → detects GSD
- **Gap:** Detection exists but NO phase enforcement. Plugin doesn't inject "you are in research phase" or block builds during research.

**SpecKit (Specification-Driven Development):**
- Spec → Plan → Tasks pipeline with task dependency ordering
- Uses spec.md → plan.md → tasks.md artifacts
- iDumb has planning-registry that COULD track these artifacts
- **Gap:** No workflow that chains spec → plan → tasks. Registry tracks artifacts but doesn't enforce ordering.

**Agent-OS:**
- Multi-agent orchestration with explicit tool routing and agent creation/destruction
- Agents have lifecycle management (spawn, execute, terminate)
- iDumb has 3-agent delegation model
- **Gap:** Delegation is schema-level only. No runtime spawn/terminate. No tool routing enforcement.

### Platform Research (OpenCode Hooks)

| Hook | Documented | Implemented | Behavior Verified |
|------|-----------|-------------|-------------------|
| `tool.execute.before` | ✅ SDK | ✅ | ❌ Not live-tested |
| `tool.execute.after` | ✅ SDK | ✅ | ❌ |
| `experimental.session.compacting` | ✅ SDK | ✅ | ❌ |
| `system.prompt.transform` | ✅ SDK | ✅ | ❌ |
| `chat.params` | ✅ SDK | ✅ | ❌ |
| `experimental.text.complete` | ✅ SDK | ❌ NOT IMPLEMENTED | N/A |
| `chat.message` | ✅ SDK | ❌ NOT IMPLEMENTED | N/A |
| `event` hooks | ✅ SDK | ❌ NOT IMPLEMENTED | N/A |
| `shell.env` | ✅ SDK | ❌ NOT IMPLEMENTED | N/A |

**Critical Platform Limitation:** `tool.execute.before` does NOT fire for subagent tool calls. This is OpenCode issue `sst/opencode#5894`. All hook-based governance is bypassed when an agent delegates to a subagent.

---

## Level 7: Elaborative Core Concepts — Gaps, Drift, Non-Integration

### Concept: "Intelligence Through Infrastructure"

**Claim** (GOVERNANCE.md Part 2): "iDumb provides structured infrastructure at the tool level so that LLM agents exhibit intelligent behavior."

**Reality Check:**
- ✅ Infrastructure EXISTS: hooks intercept tools, schemas validate data, state persists
- ❌ Infrastructure NOT CONNECTED: most tools don't use entity resolution, hooks don't read registry, brain schema is orphaned
- ❌ "Intelligent behavior" NOT MEASURABLE: no baseline, no stress tests, no live validation
- ❌ "Always knowing what to do" PARTIALLY WORKS: system prompt injects governance prefix but only for active task — doesn't include registry, brain, or delegation state

### Concept: "Schema-First Governance"

**Claim** (implementation_plan-n6.md): "Schemas, agents, and tools evolve together as a regulated unit."

**Reality Check:**
- ✅ Schemas are comprehensive and well-designed
- ❌ "Evolve together" is FALSE: brain schema has no tool, delegation schema has no hook enforcement, planning registry has no hook reader
- ❌ Schema validation only occurs inside tools — if agent uses innate tools (bypassing idumb_write), NO governance applies

### Concept: "3-Agent Model"

**Claim** (AGENTS.md): Supreme Coordinator → Investigator + Executor

**Reality Check:**
- ✅ Templates defined for all 3 agents
- ❌ Never deployed (`.opencode/agents/` empty)
- ❌ Coordinator template is 376 lines — too long for reliable LLM comprehension
- ❌ Delegation validation exists in schema but NOT enforced at hook level
- ❌ Agent name detection relies on pattern matching from `chat.params` — brittle

### Drift Inventory

| Area | Documented State | Actual State | Drift Level |
|------|-----------------|--------------|-------------|
| Agent model | "3 agents deployed" | Templates exist, not deployed | 🔴 SEVERE |
| Test status | "294/294 pass" | 8/8 test files fail | 🔴 SEVERE |
| Directory structure | PROJECT.md shows v1 paths | src/ reorganized under schemas/tools/hooks/lib | 🔴 SEVERE |
| Phase tracking | "Phase 2C Complete" | Phase n6 implemented | 🟡 MODERATE |
| Tool names | "anchor_add, anchor_list" | "idumb_anchor, idumb_write, idumb_task" | 🟡 MODERATE |
| Planning registry | "DONE" in AGENTS.md | Schema + factory complete, integration partial | 🟡 MODERATE |

---

## Level 8: Schema/Type/Hierarchy/Relationship/Property/Contract Mapping

See companion document: **`02-ENTITY-REGISTRY.md`**

### Quick Schema Hierarchy

```
PlanningRegistry
 ├── PlanningArtifact[]
 │    ├── ArtifactSection[]
 │    └── metadata (tier, type, status, chainId)
 ├── ArtifactChain[]
 │    └── entries[] (artifactId, iteration, status)
 └── OutlierEntry[]
      └── (path, reason, action)

TaskStore
 ├── TaskEpic[]
 │    ├── Task[]
 │    │    └── Subtask[]
 │    └── metadata (category, governance, status)
 └── activeEpicId

DelegationStore
 └── DelegationRecord[]
      ├── fromAgent, toAgent, taskId
      ├── allowedTools[], allowedActions[]
      └── result? (evidence, filesModified, testsRun)

BrainStore (ORPHANED)
 └── BrainEntry[]
      ├── type (insight, decision, fact, question, pattern)
      ├── content, source
      └── confidence, linkedArtifacts

StateManager (persistence layer)
 ├── sessions: Map<sessionId, SessionState>
 ├── anchors: Map<sessionId, Anchor[]>
 ├── taskStore: TaskStore
 └── delegationStore: DelegationStore
```

---

## Level 9: Framework Comparison (Standalone vs Wrapper)

See companion document: **`05-FRAMEWORK-COMPARISON.md`**

### Summary Table

| Capability | SpecKit | GSD | Agent-OS | iDumb (Actual) | iDumb (Claimed) |
|------------|---------|-----|----------|----------------|-----------------|
| Spec → Plan pipeline | ✅ Core | ✅ Phases | ❌ N/A | ❌ No pipeline | ✅ "Traceability layer" |
| Task hierarchy | ✅ Tasks | ✅ Epics→Stories | ✅ Goals→Tasks | ✅ Epic→Task→Subtask | ✅ |
| Agent orchestration | ❌ N/A | ❌ Single agent | ✅ Core purpose | ❌ Templates only | ✅ "3-agent model" |
| Runtime enforcement | ❌ Static | ✅ Phase gates | ✅ Dynamic routing | ❌ Hook-level only | ✅ "Tool interception" |
| Schema governance | ❌ Markdown | ❌ Markdown | ✅ JSON schemas | ✅ Zod schemas | ✅ |
| Compaction survival | ❌ N/A | ❌ N/A | ❌ N/A | ✅ Anchor injection | ✅ |
| Live validation | ✅ Tests | ✅ Tests | ✅ Tests | ❌ Tests broken | ✅ "294 pass" |

---

## Level 10: Misconceptions and Fantasy Thoughts

### Misconception 1: "Tests Pass"
**AGENTS.md states:** "Results: 294/294 assertions. Status: all pass"
**Reality:** 8/8 test files fail when run via `npx vitest run`. Tests use `process.exit()` which crashes vitest. The assertion count may have been from manual runs of individual test files with `tsx`, but this is NOT a reliable testing strategy.

### Misconception 2: "Agents Are Deployed"
**Templates exist** for 3 agents in `templates.ts`. **Deploy function exists** in `deploy.ts`. But `.opencode/agents/` contains NO files. The agents have never been deployed to this project. The entire delegation model is theoretical.

### Misconception 3: "Delegation Is Enforced"
**Schema exists** with `validateDelegation()`, depth tracking, and circular detection. But `tool-gate.ts` (the enforcement hook) does NOT call any delegation validation. Delegation is only enforced at the discrete `idumb_task delegate` action level — an agent can bypass it by using innate tools.

### Misconception 4: "Brain System Works"
**Schema exists** (`brain.ts`) with `createBrainEntry()`, `queryBrain()`, `formatBrainEntries()`. But NO tool creates or reads brain entries. NO hook injects brain knowledge. The entire brain system is dead code.

### Misconception 5: "Framework Integration"
**GOVERNANCE.md Part 6** describes integration with GSD and SpecKit. **Reality:** The framework detector identifies these frameworks during `idumb_init`, but produces ZERO enforcement actions. Detecting GSD doesn't inject "you are in research phase." Detecting SpecKit doesn't enforce spec → plan → task ordering.

### Misconception 6: "Planning Registry Is Complete"
**AGENTS.md states:** "Planning Registry schema + integration DONE"
**Reality:** Schema is complete (729 LOC, well-designed). Integration is PARTIAL — `idumb_write` updates registry, `idumb_init` bootstraps it. But NO hook reads it, NO tool queries it, and agents never see registry state in their context.

---

## Companion Documents

| # | Document | Purpose |
|---|----------|---------|
| 02 | `02-ENTITY-REGISTRY.md` | Complete entity map — every file, type, function, relationship |
| 03 | `03-STALE-SUPERSEDED-AUDIT.md` | Every document rated for staleness with evidence |
| 04 | `04-GAP-MATRIX.md` | Horizontal + vertical gap analysis with fix priorities |
| 05 | `05-FRAMEWORK-COMPARISON.md` | iDumb vs SpecKit vs GSD vs Agent-OS honest assessment |
| 06 | `06-TECHNICAL-DEBT-REGISTER.md` | Every misconception, LOC violation, broken chain |
| 07 | `07-GSD-PROJECT-BRIEF.md` | Everything a fresh agent needs to start a new project |
| 08 | `08-TOOL-CHAIN-REFERENCE.md` | What each tool actually does, inputs, outputs, edge cases |
| 09 | `09-AGENT-DELEGATION-PROTOCOL.md` | How the 3 agents work, what's proven, what's not |
| 10 | `10-EVIDENCE-LOG.md` | Every investigation with file references proving claims |

---

*Generated by Ralph Loop Validation — 2026-02-08*
*Source input: `.agents/prompts/mess-of-requirements-and-changes.md`*
*Verdict: ❌ NOT COMPLETE — requires remediation before GSD-New-Project readiness*
