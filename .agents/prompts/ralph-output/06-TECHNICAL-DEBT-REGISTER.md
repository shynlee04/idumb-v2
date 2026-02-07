# Technical Debt Register

**Generated:** 2026-02-08
**Total Items:** 42 (6 Critical, 14 High, 12 Medium, 10 Low)
**Categories:** Misconceptions, LOC Violations, Broken Chains, Fantasy Thoughts, Conflicts

---

## Category 1: Misconceptions (False Beliefs in Documentation)

| ID | Misconception | Where Stated | Reality | Severity |
|----|--------------|-------------|---------|----------|
| MC-1 | "Tests pass (294/294 assertions)" | AGENTS.md v6.0.0 | 8/8 test files FAIL in vitest. process.exit() crashes runner. | 🔴 CRITICAL |
| MC-2 | "3 innate agents auto-deployed" | AGENTS.md v6.0.0 | Templates exist in templates.ts but `.opencode/agents/` is EMPTY | 🔴 CRITICAL |
| MC-3 | "Planning Registry schema + integration DONE" | AGENTS.md v6.0.0 | Schema DONE ✅. Integration PARTIAL — no hook reads registry | 🟡 HIGH |
| MC-4 | "Phase n6 3-agent refactor DONE" | AGENTS.md v6.0.0 | Templates defined ✅. Not deployed ❌. Not tested ❌. | 🟡 HIGH |
| MC-5 | "Delegation depth tracking" | gap-analysis.md | delegation.ts has getDelegationDepth(). tool-gate.ts does NOT call it. | 🟡 HIGH |
| MC-6 | "chat.params NOT REGISTERED" | gap-analysis.md | chat.params IS registered at index.ts:121. KI is stale. | 🟡 HIGH |
| MC-7 | "Phase 2C Complete — Awaiting Phase 2B" | PROJECT.md line 5 | Phase 2B was never started. Project jumped to Phase n6. | 🟡 MEDIUM |
| MC-8 | "60% improvement over baseline" | SUCCESS-CRITERIA.md | No baseline exists. No measurement methodology implemented. | 🟡 MEDIUM |
| MC-9 | "5-Plugin Ecosystem Architecture" | KI overview.md | Never existed. Single plugin: idumb-v2. | 🟡 MEDIUM |
| MC-10 | "Meta Builder" agent | KI overview.md | Superseded by coordinator/investigator/executor model months ago. | 🟡 MEDIUM |

---

## Category 2: LOC Violations

AGENTS.md states: "Files < 500 LOC (split if approaching)."

| ID | File | LOC | Over Limit | Priority |
|----|------|-----|------------|----------|
| LOC-1 | `src/templates.ts` | 1,510 | 3.0x | 🔴 CRITICAL — contains agents + commands + skills + profiles in one file |
| LOC-2 | `src/tools/write.ts` | 1,174 | 2.3x | 🔴 CRITICAL — has 4 mode handlers + lifecycle + helpers |
| LOC-3 | `src/tools/task.ts` | 826 | 1.7x | 🟡 HIGH — 13 actions in single execute() function |
| LOC-4 | `src/schemas/planning-registry.ts` | 729 | 1.5x | 🟡 HIGH — factory + query + display + linking in one file |
| LOC-5 | `src/lib/code-quality.ts` | 701 | 1.4x | 🟡 HIGH — multiple scan categories in one file |
| LOC-6 | `src/lib/entity-resolver.ts` | 545 | 1.1x | 🟡 MEDIUM — classification rules could split by entity type |

### Suggested Splits

**templates.ts (1510 → 3 files):**
- `templates/agents.ts` — coordinator, investigator, executor generators
- `templates/commands.ts` — init, settings, status, delegate generators
- `templates/skills.ts` — delegation skill, governance skill, profiles

**write.ts (1174 → 3 files):**
- `tools/write.ts` — main tool definition + execute routing
- `tools/write-modes.ts` — handleCreate, handleOverwrite, handleAppend, handleUpdateSection
- `tools/write-lifecycle.ts` — handleLifecycle (activate, supersede, abandon, resolve)

**task.ts (826 → 2 files):**
- `tools/task.ts` — tool definition + action routing
- `tools/task-actions.ts` — individual action handlers

---

## Category 3: Broken Chains (Disconnected Components)

| ID | Chain | Break Point | Impact | Fix Effort |
|----|-------|-------------|--------|------------|
| BC-1 | Entity Resolver → Tool Gate | Tool gate never calls resolveEntity() | Permissions not enforced at hook level | MEDIUM |
| BC-2 | Delegation Schema → Tool Gate | Tool gate never calls validateDelegation() | Agents can delegate UP the hierarchy | MEDIUM |
| BC-3 | Planning Registry → System Prompt | System prompt never reads registry | Agents don't see artifact status | LOW |
| BC-4 | Brain Schema → Everything | No tool creates/reads brain entries | Dead code | HIGH (delete or build) |
| BC-5 | Framework Detector → Enforcement | Detection result stored but never acted upon | GSD/SpecKit detection meaningless | MEDIUM |
| BC-6 | Task → Artifact Linking | linkTaskToArtifact() never called | Tasks disconnected from planning docs | LOW |
| BC-7 | Delegation → Artifact Linking | linkDelegationToSections() never called | Delegations disconnected from docs | LOW |
| BC-8 | Config GovernanceMode → Write Tool | write.ts doesn't check governance strictness | "strict" mode doesn't block untracked writes | MEDIUM |
| BC-9 | Scan Results → Task Context | Scan produces JSON; task tool doesn't read it | Scan intelligence not used | LOW |
| BC-10 | Compaction → System Prompt | After compaction, system prompt doesn't know which anchors survived | Potential context duplication | LOW |

---

## Category 4: Fantasy Thoughts (Designed but Not Real)

| ID | Fantasy | Where Described | Code Reality | Gap |
|----|---------|----------------|--------------|-----|
| FT-1 | "Plugin provides enforcement layer for GSD workflow stages" | GOVERNANCE.md Part 6, line 180 | Framework detector finds GSD marker files. No enforcement actions exist. No "you are in research phase" injection. | 🔴 COMPLETE FANTASY |
| FT-2 | "Plugin provides traceability layer for SPEC-KIT" | GOVERNANCE.md Part 6, line 188 | Planning registry tracks artifacts. No spec→plan→task chain enforcement. No acceptance criteria linking. | 🔴 COMPLETE FANTASY |
| FT-3 | "Brain/wiki implementation" | AGENTS.md, various KIs | brain.ts schema exists. No tool, no hook, no persistence path for brain entries. | 🔴 COMPLETE FANTASY |
| FT-4 | "Just-in-time commands replacing monolithic templates" | implementation_plan-n6.md Iteration 2 | Templates are 1510 LOC in one file. No command splitting implemented. | 🟡 PLANNED BUT NOT STARTED |
| FT-5 | "Dashboard integration backend" | implementation_plan-n6.md Iteration 3 | server.ts scaffold exists. No API endpoints. No data integration. | 🟡 PLANNED BUT NOT STARTED |
| FT-6 | "Background automation (cron-based time-to-stale)" | GOVERNANCE.md Part 7, G8 | No cron, no background process. Staleness only checked synchronously. | 🟡 LOW PRIORITY |
| FT-7 | "Agents always know what phase they're in" | PROJECT.md line 34, GOVERNANCE.md line 34 | System prompt injects active task but NOT phase. Agent doesn't know "research" vs "build" vs "validate". | 🟡 PARTIAL — task context exists, phase context doesn't |
| FT-8 | "Chain breaks trigger stop + report" | PROJECT.md REQ-07 | Chain breaks detected by detectChainBreaks() in task schema. But tool-gate doesn't call it. Agent not informed. | 🟡 DETECTION EXISTS, TRIGGER MISSING |

---

## Category 5: Type/Schema Conflicts

| ID | Conflict | File A | File B | Impact |
|----|----------|--------|--------|--------|
| TC-1 | `DelegationStatus` vs `TaskStatus` overlap | delegation.ts (pending→accepted→completed→rejected→expired) | task.ts (pending→active→completed→deferred→abandoned) | Different lifecycle models for related concepts |
| TC-2 | `ArtifactStatus` vs `SectionStatus` naming | planning-registry.ts | Same file, different enums | `ArtifactStatus = active|stale|superseded|abandoned` vs `SectionStatus = active|stale|superseded|invalid` — "invalid" only on sections |
| TC-3 | `GovernanceMode` used differently | config.ts defines strict/balanced/minimal | tool-gate.ts reads it | entity-resolver.ts, chain-validator.ts, write.ts do NOT read it |
| TC-4 | `WorkStreamCategory` routing | delegation.ts routes by category | task.ts creates epics with category | Routing table in delegation.ts hardcoded; not driven by config |
| TC-5 | State persistence split | hook-state.json (sessions/anchors) | tasks.json + delegations.json (separate files) | Three files for what could be one — sync issues possible |

---

## Category 6: Missing Automation

| ID | What's Missing | Where Expected | Impact |
|----|---------------|----------------|--------|
| MA-1 | Auto-deploy agents on npm install | `postinstall` in package.json | Users must manually run CLI to get agents |
| MA-2 | Auto-refresh codemap after writes | write.ts → codemap.ts | Codemap goes stale after every write |
| MA-3 | Auto-expire stale delegations on hook fire | tool-gate.ts | Expired delegations linger until task tool cleanup |
| MA-4 | Auto-link tasks to artifacts on create | task.ts | Tasks created without artifact references |
| MA-5 | Auto-detect LOC violations in CI | package.json scripts | Manual checking only |
| MA-6 | Auto-update AGENTS.md on schema changes | deployment | AGENTS.md frequently drifts from code |

---

## Remediation Roadmap

### Phase R1: Critical Fixes (estimated 4-6 hours)
1. Fix test runner compatibility (MC-1)
2. Deploy agents via CLI or programmatically (MC-2)
3. Wire tool-gate → entity-resolver (BC-1)
4. Wire tool-gate → delegation validation (BC-2)

### Phase R2: Integration Wiring (estimated 6-8 hours)
1. Wire planning registry → system prompt (BC-3)
2. Wire framework detector → enforcement (BC-5)
3. Build brain tool or remove brain schema (BC-4)
4. Split templates.ts (LOC-1)
5. Split write.ts (LOC-2)

### Phase R3: Documentation Cleanup (estimated 2-3 hours)
1. Update AGENTS.md with accurate test status
2. Archive PROJECT.md, PHASE-COMPLETION.md
3. Update implementation_plan-n6.md with completion evidence
4. Regenerate Knowledge Items

### Phase R4: Live Validation (estimated 4-6 hours)
1. Load plugin in OpenCode
2. Verify tools appear in tool list
3. Verify hooks fire on tool calls
4. Test compaction anchor survival
5. Establish baseline measurement

---

*Generated by Ralph Loop Validation — 2026-02-08*
