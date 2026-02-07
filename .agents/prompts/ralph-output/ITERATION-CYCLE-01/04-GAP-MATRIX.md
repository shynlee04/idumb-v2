# Gap Matrix — Horizontal & Vertical Analysis

**Generated:** 2026-02-08
**Method:** Same-level cross-reference (horizontal) + upstream/downstream chain analysis (vertical)
**Total Gaps Found:** 34 (11 Critical, 12 High, 7 Medium, 4 Low)

---

## Part 1: Horizontal Gap Matrix (Same-Level Components)

### 1.1 Schema ↔ Schema Gaps

| Schema A | Schema B | Expected Relationship | Actual Status | Gap |
|----------|----------|----------------------|---------------|-----|
| `task.ts` | `delegation.ts` | Task.delegate action creates DelegationRecord | ✅ LINKED | via `tools/task.ts` delegate action |
| `task.ts` | `planning-registry.ts` | Tasks link to planning artifacts | ✅ SCHEMA EXISTS | `linkTaskToArtifact()` in registry — but **never called from task tool** ❌ |
| `delegation.ts` | `planning-registry.ts` | Delegations link to artifact sections | ✅ SCHEMA EXISTS | `linkDelegationToSections()` — but **never called** ❌ |
| `brain.ts` | `planning-registry.ts` | Brain entries link to artifacts | ✅ SCHEMA EXISTS | `linkBrainEntryToArtifact()` — but **brain.ts is orphaned** ❌ |
| `brain.ts` | `task.ts` | Brain insights contextualize tasks | ❌ NO LINK | Brain entries have no field for taskId |
| `codemap.ts` | `planning-registry.ts` | Code map informs artifact health | ❌ NO LINK | Codemap doesn't report to registry |
| `anchor.ts` | `brain.ts` | Anchors could become brain entries | ❌ NO LINK | Separate persistence paths, no migration |
| `config.ts` | All schemas | Config drives governance levels | ✅ PARTIAL | tool-gate reads config; init reads config; but Most tools ignore config |

### 1.2 Tool ↔ Tool Gaps

| Tool A | Tool B | Expected Interaction | Actual Status | Gap |
|--------|--------|---------------------|---------------|-----|
| `idumb_task` | `idumb_write` | Write blocked without active task | ❌ NOT ENFORCED | write.ts checks governance snapshot but doesn't hard-block |
| `idumb_task` | `idumb_scan` | Scan results contextualize task creation | ❌ NO LINK | Scan writes to JSON; task doesn't read it |
| `idumb_init` | `idumb_task` | Init bootstraps first epic | ✅ PARTIAL | Bootstrap store created but no auto-first-epic |
| `idumb_write` | `idumb_codemap` | Write triggers codemap update | ❌ NO LINK | Write completes; codemap requires explicit re-scan |
| `idumb_task delegate` | `idumb_status` | Status shows active delegations | ❌ PARTIAL | Status shows tasks but delegation display is minimal |
| `idumb_anchor` | `idumb_write` | Anchors persisted during write ops | ❌ NO LINK | Separate tools, no cross-triggering |
| `idumb_bash` | `idumb_task` | Bash output could link to task evidence | ❌ NO LINK | Bash results not captured in task metadata |

### 1.3 Hook ↔ Hook Gaps

| Hook A | Hook B | Expected Coordination | Actual Status | Gap |
|--------|--------|----------------------|---------------|-----|
| `tool.execute.before` | `exp.chat.system.transform` | Both inject governance context | ✅ WORKS | Different timing: system prompt every turn, tool gate per-call |
| `compaction` | `exp.chat.system.transform` | After compaction, system prompt should reference surviving anchors | ✅ PARTIAL COORDINATION | system.ts imports `getAnchors()` from compaction.ts and injects critical anchors into system prompt. BUT: system prompt doesn't know WHICH anchors survived compaction specifically — it reads ALL anchors, not just survived ones |
| `chat.params` | `tool.execute.before` | Agent name captured → used in tool gate | ✅ PARTIAL | Agent name stored in StateManager; tool gate reads it but falls back to "meta" |
| `tool.execute.after` | `exp.chat.system.transform` | After-hook results should inform next system prompt | ❌ NO LINK | After-hook only does defense-in-depth blocking; doesn't update state that system prompt reads |

---

## Part 2: Vertical Gap Analysis (Upstream → Downstream)

### 2.1 Configuration → Enforcement Chain

```
CONFIG (config.ts)
  ├── governanceMode: "strict" | "balanced" | "minimal"
  │   └── Read by: tool-gate.ts ✅
  │   └── Used for: permission decisions ✅
  │   └── Gap: NOT used by system.ts, write.ts, task.ts ❌
  │
  ├── language: "en" | "ar" | "es" | "fr" | ...
  │   └── Read by: templates.ts ✅
  │   └── Gap: NOT used at runtime (only deploy-time) ❌
  │
  ├── detection.frameworks: FrameworkDetection
  │   └── Read by: framework-detector.ts ✅
  │   └── Gap: Detection result NOT acted upon ❌
  │
  └── paths.*: file paths
      └── Read by: persistence.ts ✅ (hardcoded, not from config) ❌
```

**Gap G-V1 (CRITICAL):** `governanceMode` is only partially enforced. `strict` mode should prevent writes without active tasks — but `idumb_write` doesn't check governance mode.

**Gap G-V2 (HIGH):** Framework detection produces no enforcement. If GSD is detected, the plugin should inject phase awareness — it doesn't.

### 2.2 Agent Identity → Permission Chain

```
AGENT IDENTITY
  ├── chat.params hook → StateManager.setCapturedAgent()  ✅
  │   └── tool-gate.ts reads capturedAgent  ✅
  │   └── Gap: Falls back to "meta" if not detected  ⚠️
  │
  ├── Agent role lookup (AGENT_HIERARCHY in delegation.ts)
  │   └── Defines: coordinator=0, investigator=1, executor=1
  │   └── Gap: tool-gate.ts does NOT consult AGENT_HIERARCHY ❌
  │   └── Gap: Permission matrix in entity-resolver.ts NOT checked by tool-gate ❌
  │
  └── Agent template instructions (templates.ts)
      └── Embed rules in agent markdown files
      └── Gap: These files are NOT DEPLOYED ❌
      └── Gap: Even if deployed, LLM can ignore instructions ⚠️
```

**Gap G-V3 (CRITICAL — NUANCED):** Permission enforcement is PARTIALLY connected but STALE. `tool-gate.ts` HAS `AGENT_TOOL_RULES` (lines 40-73) that block specific tools/actions per agent — but these use OLD 7-agent names (validator, builder, skills-creator, etc.). The current 3-agent model names (investigator, executor) are NOT in rules, so they bypass enforcement. Additionally, entity-resolver defines what each agent can do but tool-gate never calls it.

### 2.3 Task → Delegation → Enforcement Chain

```
TASK CREATION
  ├── idumb_task create_epic / create_task ✅
  │   └── Stored in tasks.json ✅
  │   └── Gap: No required fields for linking to planning artifacts ❌
  │
  ├── idumb_task delegate
  │   └── Creates DelegationRecord ✅
  │   └── Validates delegation hierarchy ✅
  │   └── Gap: Builds instruction but DOES NOT spawn subagent ❌
  │   └── Gap: tool-gate doesn't check active delegations ❌
  │
  └── idumb_task complete
      └── Updates task status ✅
      └── Gap: No automatic delegation result recording ❌
      └── Gap: No validation of acceptance criteria ❌
```

**Gap G-V4 (CRITICAL):** `idumb_task delegate` creates a delegation record and builds an instruction string, but there is NO mechanism to actually spawn the target agent. The instruction is returned as tool output, hoping the LLM will follow it. No enforcement exists.

### 2.4 Write → Registry → Context Chain

```
FILE WRITE
  ├── idumb_write detects entity type via entity-resolver ✅
  │   └── Planning artifacts get registered ✅
  │   └── Chain integrity checked ✅
  │
  ├── Planning registry updated
  │   └── planning-registry.json written ✅
  │   └── Gap: NO hook reads registry ❌
  │   └── Gap: system.ts prompt doesn't include registry state ❌
  │   └── Gap: compaction.ts doesn't consider registry ❌
  │
  └── Agent context
      └── Gap: Agent never sees registry status ❌
      └── Gap: Stale artifacts not flagged in context ❌
      └── Gap: Chain breaks in registry not surfaced ❌
```

**Gap G-V5 (HIGH):** Planning registry is a write-only store. Data goes IN but never comes OUT to the agent's context. The entire effort of maintaining artifact chains, sections, and outliers is invisible to the LLM.

---

## Part 3: Critical Gap Summary

### Priority 1 (CRITICAL) — System Doesn't Work Without These

| ID | Gap | Component | Fix |
|----|-----|-----------|-----|
| G-C1 | Tests don't run | All tests | Migrate from process.exit() to vitest describe/it blocks |
| G-C2 | Agents not deployed | templates.ts → .opencode/ | Run deploy CLI or auto-deploy on install |
| G-C3 | Tool-gate has STALE agent names in AGENT_TOOL_RULES | tool-gate.ts | Update rules to use 3-agent model names (investigator, executor) instead of old 7-agent names |
| G-C4 | Entity resolver disconnected from tool-gate | tool-gate.ts ↔ entity-resolver.ts | Tool-gate should consult entity resolver for permission checks |
| G-C8 | Two-plugin arch undocumented in codebase | index.ts + tools-plugin.ts | opencode.json needs both plugins registered; no docs explain this |
| G-C5 | Delegation doesn't spawn agents | tools/task.ts | Either use OpenCode task tool to spawn subagent, or document as manual step |
| G-C6 | Brain schema is dead code | schemas/brain.ts | Either build `idumb_brain` tool or remove schema |
| G-C7 | No live OpenCode testing | Entire plugin | Load plugin in OpenCode, verify tools appear, test hooks fire |

### Priority 2 (HIGH) — System Works But Governance is Partial

| ID | Gap | Component | Fix |
|----|-----|-----------|-----|
| G-H1 | Planning registry write-only | hooks/ + registry | Add registry snapshot to system.ts prompt |
| G-H2 | Framework detection → no action | framework-detector.ts | After detection, inject phase context via tool-gate |
| G-H3 | Write not blocked without task | tools/write.ts | Check governance mode, require active task in strict mode |
| G-H4 | Config governance mode underused | config.ts → all tools | Pass governance mode to entity resolver, chain validator |
| G-H5 | Compaction ↔ system prompt partially coordinated | hooks/ | system.ts already reads anchors from compaction.ts. BUT: doesn't distinguish pre/post-compaction anchors. Consider adding compaction timestamp tracking. |
| G-H6 | Task ↔ artifact linking not called | tools/task.ts | Call linkTaskToArtifact when task references a planning doc |
| G-H7 | LOC violations (6 files) | write.ts, task.ts, etc. | Split into focused sub-modules |
| G-H8 | Stale planning docs | planning/ | Archive PROJECT.md, PHASE-COMPLETION.md; update n6 plan |

### Priority 3 (MEDIUM) — Enhancement Quality

| ID | Gap | Component | Fix |
|----|-----|-----------|-----|
| G-M1 | No automated regression suite | tests/ | Build proper vitest suite with coverage |
| G-M2 | Scan results not used by tasks | tools/scan.ts ↔ task.ts | Scan produces context; task could read it |
| G-M3 | Bash output not linked to evidence | tools/bash.ts ↔ delegation.ts | Capture command output in delegation result |
| G-M4 | Agent name detection brittle | chat.params hook | Add explicit mapping table for known agents |
| G-M5 | Codemap not auto-triggered | tools/write.ts ↔ codemap.ts | Consider auto-refresh after significant writes |

### Priority 4 (LOW) — Nice-to-Have

| ID | Gap | Component | Fix |
|----|-----|-----------|-----|
| G-L1 | Dashboard not integrated | dashboard/ | Build API endpoints reading from .idumb/brain/ |
| G-L2 | Skills not deployed | templates.ts | Deploy via CLI |
| G-L3 | Language setting not runtime | config.ts | Make language affect governance prefix at runtime |
| G-L4 | No experimental.text.complete hook | hooks/ | Implement when OpenCode SDK stabilizes |

---

## Part 4: Integration Chain Completeness Score

| Chain | Components | Connected | Score |
|-------|-----------|-----------|-------|
| Hook → Tool → Schema → Persistence | 4 | 3 | 75% |
| Config → Enforcement → Agent | 3 | 1 | 33% |
| Agent Identity → Permission → Block | 3 | 1.5 | 50% | (tool-gate has rules but stale names)
| Task → Delegation → Spawn | 3 | 2 | 67% |
| Write → Registry → Context | 3 | 1 | 33% |
| Scan → Detect → Enforce | 3 | 1 | 33% |
| Brain → Tool → Context | 3 | 0 | 0% |
| System → Anchors → Compaction | 3 | 2 | 67% | (system.ts reads anchors from compaction.ts)
| **Average** | | | **~43%** |

**Overall Integration Score: ~43%** — The codebase has comprehensive schemas and tools, but they are poorly connected. Most chains break at the enforcement or context delivery step. The system.ts ↔ compaction.ts anchor sharing provides better coordination than initially assessed. The tool-gate has partial enforcement but with stale agent names.

---

*Generated by Ralph Loop Validation — 2026-02-08*
