# Stale & Superseded Document Audit

**Generated:** 2026-02-08
**Documents Assessed:** 22 (planning, knowledge items, research)
**Result:** 17 documents STALE, 3 PARTIALLY STALE, 2 CURRENT

---

## Rating System

| Rating | Meaning |
|--------|---------|
| 🔴 STALE | >50% content references outdated structures, names, or status |
| 🟡 PARTIALLY STALE | 20-50% content outdated but core concepts still valid |
| 🟢 CURRENT | <20% outdated, actively reflects codebase |

---

## Planning Documents

### 1. `planning/PROJECT.md` — 🔴 STALE (Accuracy: ~25%)

| Issue | Line(s) | Evidence |
|-------|---------|----------|
| Status says "Phase 2C Complete" | 5 | Project is at Phase n6 with 3 agents + delegation + planning registry |
| Directory structure shows `src/plugin.ts` | 173 | File doesn't exist; entry is `src/index.ts` |
| Shows `src/engines/` directory | 184-186 | Directory doesn't exist; code moved to `src/lib/` |
| Shows `src/types/` directory | 182 | Directory doesn't exist; removed |
| References `tools/anchor.ts` only | 193 | 11 tools now exist: anchor, bash, codemap, init, read, scan, status, task, webfetch, write |
| Tool names: `idumb_anchor_add`, `idumb_anchor_list`, `idumb_status` | 52-54 | Tools renamed: `idumb_anchor`, `idumb_task`, `idumb_write`, etc. |
| Missing schemas: brain, codemap, delegation, planning-registry, project-map | N/A | These schemas exist in code but not in document |
| Requirements REQ-01 through REQ-21 | 236-268 | Requirements not updated for Phase n6 features |
| References `.planning/` directory | 203-208 | Directory is `planning/` (no dot prefix) |
| Test files: `trial-1.ts`, `trial-init.ts` | 201-202 | Tests renamed to `*.test.ts` pattern (8 files) |
| Shows 16 `.idumb/` directories | 209-227 | Correct count but missing `planning-registry.json` bootstrap |
| Key Decisions table | 278-295 | Missing decisions about 3-agent model, delegation schema, LOC limits |

**Superseded by:** `AGENTS.md` (v6.0.0) for current status; `implementation_plan-n6.md` for plans.

### 2. `planning/GOVERNANCE.md` — 🟡 PARTIALLY STALE (Accuracy: ~40%)

| Issue | Line(s) | Evidence |
|-------|---------|----------|
| References "Phase 2B Live Validation" | 89 | Phase 2B never started; project jumped to Phase n6 |
| "After Phase 2B stress test alpha" | 233 | No stress test ever conducted |
| Integration Framework (Part 6) mentions concepts not code-mapped | 176-201 | GSD/SpecKit integration described but NOT implemented |
| Gap Analysis (Part 7) lists 10 gaps all as "current status" | 206-219 | Many gaps still open but status descriptions are stale |
| Pitfall E2 says "FIXED" for framework detector | 92 | Correct — framework-detector.ts uses required markers |

**Still valid:** Violations (Part 1), singular definition (Part 2), pitfall categories A-D (Part 3), DOs/DON'Ts (Part 4), confidence tiers (Part 5). These core principles remain accurate.

### 3. `planning/PHASE-COMPLETION.md` — 🔴 STALE (Accuracy: ~30%)

| Issue | Line(s) | Evidence |
|-------|---------|----------|
| Phase numbering P0-P6 | Throughout | Project uses Phase n6 naming, completely different structure |
| Phase 2B "NOT STARTED" | 92 | Still true but the phase was bypassed entirely |
| Phase 3-6 "NOT STARTED" | 111-188 | These phases were superseded by Phase n6 plan |
| Phase 0-2A completion evidence references old file names | 14-62 | `plugin.ts`, `persistence.ts`, `logging.ts` — some no longer exist at listed paths |
| Cross-Phase Quality Gates at bottom | 192-203 | Valid principles but never enforced in current development |

**Superseded by:** `implementation_plan-n6.md` iteration structure.

### 4. `planning/SUCCESS-CRITERIA.md` — 🟡 PARTIALLY STALE (Accuracy: ~60%)

| Issue | Line(s) | Evidence |
|-------|---------|----------|
| Phase references (P0-P6) in success tables | 31-42, 78-87, 115-122 | Phase numbering stale |
| Tool names: `idumb_anchor_add`, `idumb_anchor_list`, `idumb_status` | 82-83, 99 | Tool names changed |
| "Baseline established (NO plugin)" | 101 | Never done—no baseline exists |
| 60% improvement target | 47, 93, 123 | No measurement methodology implemented |

**Still valid:** The 4 use cases themselves (corporate SaaS, vibe coder, stress marathon, meta-framework integration) are excellent test scenarios. The WHAT to test is correct; the HOW references stale tools.

### 5. `planning/implamentation-plan-turn-based/implementation_plan-n6.md` — 🟢 MOST CURRENT (Accuracy: ~70%)

| Issue | Line(s) | Evidence |
|-------|---------|----------|
| Iteration 1 tasks listed as TODO | Throughout | Most Iteration 1 tasks are actually DONE (schemas, templates, registry) but file not updated |
| References "Iteration 2" and "Iteration 3" as future | ~200+ | Never started |
| No completion evidence for Iteration 1 | N/A | Tests fail, agents not deployed |

**Status:** This IS the current plan. It needs a status update, not replacement.

---

## Knowledge Items

### 6. `overview.md` — 🔴 STALE (Accuracy: ~20%)

| Issue | Evidence |
|-------|----------|
| "5-Plugin Ecosystem Architecture" (core, context, gov, intel, verify) | Never implemented — it's a single plugin (idumb-v2) |
| "Meta Builder" as the agent | Superseded by 3-agent model (coordinator, investigator, executor) |
| "4 Universal Workflow Phases" | Not implemented in code |
| Phase 1b status referenced | Project is at Phase n6 |
| "Portable, Predictive, and PURE" tagline | Not reflected in current code or docs |

### 7. `governance-master-ssot.md` — 🔴 STALE (Accuracy: ~25%)

| Issue | Evidence |
|-------|----------|
| 4-Tier Role Model (L0-L3: Coordinator, Builder, Validator, Skills Creator) | Superseded — only 3 agents exist (coordinator L0, investigator L1, executor L1) |
| References `idumb_brain` tool | Tool doesn't exist — brain.ts schema is orphaned |
| "Supreme Coordinator, Builder, Validator, Skills Creator" agent names | Only coordinator, investigator, executor exist in templates.ts |
| Agent name detection via includes pattern | Refactored — now uses `chat.params` hook |
| "4 Resolutions" | Some still valid but not enforced by code |

### 8. `gap-analysis.md` — 🔴 STALE (Accuracy: ~30%)

| Issue | Evidence |
|-------|----------|
| References v1 file names: `plugin.ts`, `permission.ts`, `state.ts`, `engines/scanner.ts` | All renamed or moved |
| Trial numbers T1-T8 | Superseded by phase-based approach |
| Line numbers: "line 141-142 of tool-gate.ts" | File has been rewritten; line numbers no longer valid |
| `chat.params` listed as "NOT REGISTERED" | It IS registered in `index.ts:121` |
| "validator needs bash-read-only" | Validator agent doesn't exist in 3-agent model |

### 9-17. Other KI artifacts — 🔴 STALE to 🟡 PARTIALLY STALE

All reference Phase 1b-era architecture. Some technical details (hook reference, troubleshooting) retain value but context has shifted significantly.

---

## Research Documents (`planning/research/2026-02-06-reset/`)

### 18-22. Research Files (13 total)

| File | Rating | Notes |
|------|--------|-------|
| `ARCHITECTURE.md` | 🟡 | Core architecture concepts valid, specifics stale |
| `COMPARISON-opencode-vs-claude-code.md` | 🟢 | Platform comparison still valid |
| `ECOSYSTEM-PLUGINS.md` | 🟢 | External plugin research still valid |
| `FEATURES.md` | 🟡 | Feature list partially stale |
| `LEGACY-FLAWS-ANALYSIS.md` | 🟢 | v1 flaws analysis still relevant as historical context |
| `PITFALLS.md` | 🟡 | Some pitfalls addressed, some new ones discovered |
| `PRINCIPLES.md` | 🟢 | Core principles still valid |
| `STACK.md` | 🟢 | Tech stack unchanged |
| `STRESS-TESTS-LEGACY-INFORMED.md` | 🔴 | References old tool names and phases |
| `STRESS-TESTS.md` | 🔴 | Same — stale references |
| `SUMMARY.md` | 🟡 | Summary partially valid |
| `V2-VIOLATION-CHECK.md` | 🟡 | Some violations fixed, some remain |
| `VALIDATION-RESULTS.md` | 🔴 | Results reference old test structure |

---

## Summary

| Category | Total | 🔴 STALE | 🟡 PARTIAL | 🟢 CURRENT |
|----------|-------|---------|-----------|-----------|
| Planning Docs | 5 | 2 | 2 | 1 |
| Knowledge Items | 9+ | 7+ | 2 | 0 |
| Research Docs | 13 | 3 | 4 | 6 |
| **Total** | **27+** | **12+** | **8** | **7** |

### Remediation Priority

1. **IMMEDIATE:** Fix test runner compatibility (process.exit → vitest describe/it)
2. **HIGH:** Update `AGENTS.md` test status, deploy agents to project
3. **HIGH:** Update `implementation_plan-n6.md` with completion evidence
4. **MEDIUM:** Archive/supersede `PROJECT.md`, `PHASE-COMPLETION.md` (replaced by AGENTS.md + n6 plan)
5. **MEDIUM:** Regenerate Knowledge Items after fixes
6. **LOW:** Update research docs with current tool names

---

*Generated by Ralph Loop Validation — 2026-02-08*
