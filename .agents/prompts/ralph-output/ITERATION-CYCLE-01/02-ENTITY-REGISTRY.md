# Entity Registry — Complete Codebase Map

**Generated:** 2026-02-08
**Total Source Files:** 44 TypeScript files in `src/` (verified by `find src -name "*.ts" -type f`)
**Total Test Files:** 9 TypeScript files in `tests/`
**Total LOC:** ~16,877 (src/) including templates (1,510)
**LOC Violations (>500):** 6 files
**Architecture:** Two-plugin system — Plugin A (index.ts: 5 tools + 7 hooks), Plugin B (tools-plugin.ts: 4 tools + 0 hooks)

---

## 1. Schemas (`src/schemas/`)

### 1.1 `anchor.ts` — Context Anchors
- **Types:** `Anchor`, `AnchorType`, `AnchorPriority`
- **Factory:** `createAnchor(type, content, priority)` → `Anchor`
- **Functions:** `scoreAnchor(a)` → number, `selectAnchors(anchors, budget)` → `Anchor[]`, `isStale(a)` → boolean, `stalenessHours(a)` → number
- **Used by:** `tools/anchor.ts`, `hooks/compaction.ts`, `lib/persistence.ts`
- **LOC:** ~120

### 1.2 `brain.ts` — Brain Knowledge Store ⚠️ ORPHANED
- **Types:** `BrainEntry`, `BrainEntryType` (insight|decision|fact|question|pattern), `BrainSource`, `BrainStore`
- **Factory:** `createBrainEntry(type, content, source)` → `BrainEntry`, `createBrainStore()` → `BrainStore`
- **Functions:** `effectiveConfidence(entry)`, `isBrainEntryStale(entry)`, `queryBrain(store, query)`, `formatBrainEntries(entries)`
- **Used by:** `schemas/index.ts` (exported) — **NOTHING ELSE**
- **Status:** ❌ DEAD CODE — no tool creates/reads entries, no hook injects
- **LOC:** ~180

### 1.3 `codemap.ts` — Code Intelligence Map
- **Types:** `CodeMapStore`, `FileMapEntry`, `CodeItem`, `CodeItemType`, `CodeComment`, `CommentMarker`, `Inconsistency`, `InconsistencyType`
- **Factory:** `createCodeMapStore()` → `CodeMapStore`
- **Functions:** `formatCodeMapSummary(store)`, `formatTodoList(store)`
- **Used by:** `tools/codemap.ts`
- **LOC:** 235

### 1.4 `config.ts` — Plugin Configuration
- **Types:** `IdumbConfig`, `Language`, `InstallScope`, `ExperienceLevel`, `GovernanceMode`, `GovernanceFramework`, `TechFramework`, `FrameworkDetection`
- **Factory:** `createConfig()` → `IdumbConfig`
- **Functions:** `validateConfig(config)` → boolean
- **Constants:** `CONFIG_VERSION`, `DEFAULT_PATHS`, `DEFAULT_DETECTION`
- **Used by:** `tools/init.ts`, `hooks/tool-gate.ts`, `lib/persistence.ts`
- **LOC:** 219

### 1.5 `delegation.ts` — Delegation Protocol
- **Types:** `DelegationStatus` (pending|accepted|completed|rejected|expired), `DelegationResult`, `DelegationRecord`, `DelegationStore`, `CreateDelegationOptions`, `DelegationValidation`
- **Factory:** `createEmptyDelegationStore()`, `createDelegation(opts)`
- **Lookup:** `findDelegation`, `findDelegationsForTask`, `findDelegationsFromAgent`, `findDelegationsToAgent`, `findActiveDelegations`
- **Validation:** `validateDelegation(from, to, depth, category?)` → checks self-delegation, upward delegation, depth limit, target existence, category routing
- **Lifecycle:** `acceptDelegation`, `completeDelegation`, `rejectDelegation`, `expireStaleDelegations`
- **Display:** `formatDelegationRecord`, `formatDelegationStore`, `buildDelegationInstruction`
- **Constants:** `MAX_DELEGATION_DEPTH` (3), `DELEGATION_EXPIRY_MS` (30 minutes — `30 * 60 * 1000`)
- **Agent Hierarchy:** `AGENT_HIERARCHY` map = coordinator(0), investigator(1), executor(1)
- **Used by:** `tools/task.ts`, `lib/persistence.ts`
- **⚠️ NOT used by:** `hooks/tool-gate.ts` — delegation is NOT enforced at hook level
- **LOC:** 363

### 1.6 `planning-registry.ts` — Planning Artifact Governance
- **Types:** `DocumentTier` (governance|strategic|operational|tactical), `ArtifactType` (prd|architecture|ux|...), `SectionStatus` (active|stale|superseded|invalid), `ArtifactStatus`, `ArtifactSection`, `PlanningArtifact`, `ArtifactChain`, `OutlierReason`, `OutlierAction`, `OutlierEntry`, `PlanningRegistry`
- **Factory:** `createPlanningRegistry()`, `createPlanningArtifact(path, type, tier)`, `createArtifactSection(title, content)`, `createArtifactChain(name)`, `createOutlierEntry(path, reason)`
- **Section Ops:** `supersedSection`, `markSectionStale`, `markSectionInvalid`, `detectSectionDrift`(hash comparison)
- **Chain Ops:** `resolveChainHead`, `getChainHistory`, `addToChain`, `extractIterationPattern`
- **Outlier Ops:** `findPendingOutliers`, `acceptOutlier`, `rejectOutlier`
- **Linking:** `linkTaskToArtifact`, `linkDelegationToSections`, `linkBrainEntryToArtifact`
- **Query:** `findArtifactByPath`, `findArtifactById`, `findArtifactsByType`, `findArtifactsByChain`, `findStaleArtifacts`, `findStaleSections`, `isArtifactHealthy`
- **Display:** `formatRegistrySummary`, `formatArtifactDetail`
- **Parsing:** `computeContentHash`, `parseMarkdownSections`, `parseSectionsFromMarkdown`
- **Used by:** `tools/write.ts` ✅, `tools/init.ts` ✅, `cli/deploy.ts` ✅
- **⚠️ NOT used by:** any hook — agents never see registry state
- **LOC:** 729 (exceeds 500 LOC limit)

### 1.7 `project-map.ts` — Project Structure Map
- **Types:** `ProjectMap`, `FrameworkCategory`, `DocumentType`, `DocumentEntry`, `DirectoryEntry`, `FrameworkDetection`
- **Factory:** `createProjectMap()`
- **Functions:** `formatProjectMap(map)`
- **Used by:** `tools/scan.ts`
- **LOC:** ~200

### 1.8 `task.ts` — Smart TODO System
- **Types:** `EpicStatus`, `TaskStatus`, `SubtaskStatus`, `WorkStreamCategory` (development|research|governance|maintenance|spec-kit|ad-hoc), `GovernanceLevel`, `CreateEpicOptions`, `Subtask`, `Task`, `TaskEpic`, `TaskStore`, `ActiveChain`, `ValidationResult`, `ChainWarning`
- **Factory:** `createEpic(name, opts?)`, `createTask(epicId, name)`, `createSubtask(text)`, `createEmptyStore()`, `createBootstrapStore()`
- **Lookup:** `findEpic`, `findTask`, `findSubtask`, `findParentTask`, `findParentEpic`
- **Analysis:** `getActiveChain`, `validateCompletion`, `findOrphanTasks`, `findStaleTasks`, `detectChainBreaks`
- **Display:** `formatTaskTree`, `buildGovernanceReminder`
- **Migration:** `migrateTaskStore` (v1→v2)
- **Constants:** `TASK_STORE_VERSION`, `SESSION_STALE_MS`, `CATEGORY_DEFAULTS`, `CATEGORY_SKIP_SUBTASKS`
- **Used by:** `tools/task.ts` ✅, `hooks/tool-gate.ts` (partial) ✅, `hooks/system.ts` ✅, `lib/persistence.ts` ✅
- **LOC:** 530 (exceeds 500 LOC limit)

### 1.9 `index.ts` — Barrel Export
- Exports everything from all schema modules
- **LOC:** 87

---

## 2. Tools (`src/tools/`)

### 2.1 `anchor.ts` — Anchor Management
- **Tool name:** `idumb_anchor`
- **Actions:** add (creates anchor), list (shows anchors for session)
- **Dependencies:** `schemas/anchor.ts`, `lib/persistence.ts` (StateManager)
- **LOC:** ~150

### 2.2 `bash.ts` — TUI-Safe Shell Execution
- **Tool name:** `idumb_bash`
- **Purpose:** Runs bash commands with TUI-safe output capture (no console.log)
- **Features:** Timeout enforcement, output truncation, command sanitization
- **LOC:** 438

### 2.3 `codemap.ts` — Code Intelligence Scanner
- **Tool name:** `idumb_codemap`
- **Actions:** scan (builds code map), list (shows summary), todos (lists TODO/FIXME comments)
- **Dependencies:** `schemas/codemap.ts`, `lib/code-quality.ts`
- **LOC:** 521 (exceeds 500 LOC limit)

### 2.4 `init.ts` — Project Initialization
- **Tool name:** `idumb_init`
- **Purpose:** Scaffolds `.idumb/` directory tree, runs brownfield scan, detects frameworks, bootstraps planning-registry.json
- **Features:** Outlier detection, deploy_agents flag, framework detection
- **Dependencies:** `lib/scaffolder.ts`, `lib/framework-detector.ts`, `schemas/planning-registry.ts`, `schemas/config.ts`
- **LOC:** 441

### 2.5 `read.ts` — Governed File Reader
- **Tool name:** `idumb_read`
- **Purpose:** Reads files with token-budget awareness, format options (raw, summary, structured)
- **Features:** Token counting, format detection, section extraction
- **LOC:** 568 (exceeds 500 LOC limit)

### 2.6 `scan.ts` — Codebase Scanner
- **Tool name:** `idumb_scan`
- **Purpose:** Deterministic codebase analysis — no LLM, pure filesystem
- **Output:** `scan-result.json` in `.idumb/brain/context/`
- **Dependencies:** `schemas/project-map.ts`, `lib/framework-detector.ts`, `lib/code-quality.ts`
- **LOC:** 445

### 2.7 `status.ts` — System Status ⚠️ DEAD CODE
- **Tool name:** `idumb_status`
- **Purpose:** Returns current governance state, active task, session info, anchor count
- **Dependencies:** `lib/persistence.ts` (StateManager), `schemas/task.ts`
- **⚠️ NOT REGISTERED** in either `src/index.ts` (Plugin A) or `src/tools-plugin.ts` (Plugin B)
- **Status absorbed into:** `idumb_task action=status` (task.ts line 578)
- **LOC:** 83

### 2.8 `task.ts` — Smart TODO Task Manager ⚠️ OVERSIZED
- **Tool name:** `idumb_task`
- **Actions (13):** create_epic, create_task, add_subtask, assign, start, complete, defer, abandon, delegate, status, list, update, branch
- **Features:** 
  - 3-level hierarchy: Epic → Task → Subtask
  - Delegation integration: creates DelegationRecord with context + allowed tools
  - Governance footer: every response includes governance reminder + stale warnings + chain breaks
  - WorkStream categories: development, research, governance, maintenance, spec-kit, ad-hoc
- **Dependencies:** `schemas/task.ts`, `schemas/delegation.ts`, `lib/persistence.ts`
- **LOC:** 826 (exceeds 500 LOC limit)

### 2.9 `webfetch.ts` — Web Content Fetcher
- **Tool name:** `idumb_webfetch`
- **Purpose:** Fetches web content with TUI-safe output, token-budget truncation
- **LOC:** 365

### 2.10 `write.ts` — Schema-Regulated Artifact Writer ⚠️ OVERSIZED
- **Tool name:** `idumb_write`
- **Modes:** create, overwrite, append, update-section
- **Lifecycle ops:** activate, supersede, abandon, resolve
- **Features:**
  - Entity resolution via `entity-resolver.ts` — classifies file type before writing
  - Chain validation via `chain-validator.ts` — checks integrity before modification
  - Planning registry sync — updates `.idumb/brain/planning-registry.json` on write
  - Audit trail — records all writes in `.idumb/brain/audit/`
  - Git commit integration — optional atomic commits tied to active task
  - Backup creation — optional backup before overwrite
- **Dependencies:** `lib/entity-resolver.ts`, `lib/chain-validator.ts`, `schemas/planning-registry.ts`
- **LOC:** 1174 (>2x over 500 LOC limit)

### 2.11 `index.ts` — Barrel Export
- **LOC:** ~15

---

## 3. Hooks (`src/hooks/`)

### 3.1 `tool-gate.ts` — Tool Execution Gatekeeper
- **Hook types:** `tool.execute.before`, `tool.execute.after`
- **Functions:** `createToolGateBefore(log)`, `createToolGateAfter(log)` (hook factory pattern with captured logger)
- **Before-hook behavior:**
  1. **Agent-scoped plugin tool blocking:** Checks `AGENT_TOOL_RULES` for 7 OLD agent names (coordinator, validator, builder, skills-creator, research-synthesizer, planner, roadmapper) — blocks specific `blockedTools` and `blockedActions` per agent. **⚠️ 3-agent model names (investigator, executor) NOT in rules → bypass enforcement**
  2. **Write/edit gate:** Only gates `WRITE_TOOLS` ("write", "edit") — checks `StateManager.getActiveTask(sessionID)`
  3. **Auto-inherit:** If no session-level task but task store has active epic+task, auto-sets session task
  4. **Retry detection:** Tracks recently blocked tools, provides escalated messaging
  5. **Throws `GOVERNANCE BLOCK` error** with STOP + REDIRECT + EVIDENCE pattern
- **After-hook behavior:** Defense-in-depth — replaces output with governance block if before-hook didn't catch
- **Exports:** `setActiveTask()`, `getActiveTask()` (used by other hooks)
- **⚠️ MISSING:** Delegation schema validation, DelegationRecord.allowedTools enforcement, entity-resolver consultation
- **⚠️ STALE:** AGENT_TOOL_RULES uses old 7-agent model, not current 3-agent model
- **LOC:** 282

### 3.2 `compaction.ts` — Compaction Anchor Injection
- **Hook type:** `experimental.session.compacting`
- **Function:** `createCompactionHook(log)` (hook factory pattern)
- **Behavior:** Selects top-N anchors by score via `selectAnchors()`, gets active task from tool-gate, injects formatted context into `output.context[]`
- **Budget cap:** `INJECTION_BUDGET_CHARS = 2000` (≈500 tokens)
- **Exports:** `addAnchor(sessionID, anchor)`, `getAnchors(sessionID)` (delegates to StateManager, used by system.ts)
- **LOC:** 103

### 3.3 `message-transform.ts` — Message Format Transform
- **Hook type:** `experimental.chat.messages.transform` (SDK: modifies `output.messages[]`)
- **Function:** `createMessageTransformHook(log)` (hook factory pattern)
- **Purpose:** DCP-pattern context pruning — truncates stale tool outputs to save tokens and delay compaction. Keeps last 10 tool results intact, truncates older ones.
- **LOC:** 123

### 3.4 `system.ts` — System Prompt Transform
- **Hook type:** `experimental.chat.system.transform` (SDK: appends to `output.system[]`)
- **Function:** `createSystemHook(log)` (hook factory pattern)
- **Behavior:** Injects `<idumb-governance>` block containing:
  1. Active task from `getActiveTask(sessionID)` (imported from tool-gate.ts)
  2. Critical anchors from `getAnchors(sessionID)` (imported from compaction.ts) — up to 3
  3. Two governance rules (no write without task, no override without anchor update)
- **Budget:** ≤200 tokens (~800 chars)
- **⚠️ Does NOT read:** planning registry, delegation store, brain store, governance mode
- **LOC:** 68

### 3.5 `index.ts` — Barrel Export
- **LOC:** ~15

---

## 4. Libraries (`src/lib/`)

### 4.1 `chain-validator.ts` — Chain Integrity Checker
- **Purpose:** Validates entity relationship chains before mutations
- **Functions:** `validateChain(entity, registry)`, `checkChainBreaks(registry)`
- **Used by:** `tools/write.ts`
- **LOC:** 300

### 4.2 `code-quality.ts` — Source Code Quality Scanner ⚠️ OVERSIZED
- **Purpose:** Deterministic code quality analysis (no LLM)
- **Scans for:** Complexity, duplication estimation, naming conventions, dead code indicators
- **Used by:** `tools/scan.ts`, `tools/codemap.ts`
- **LOC:** 701 (exceeds 500 LOC limit)

### 4.3 `entity-resolver.ts` — Entity Type Classifier ⚠️ OVERSIZED
- **Purpose:** Classifies files by entity type before write operations
- **Types resolved:** `ResolvedEntity` with entityType, permissions, chainRequirements
- **Functions:** `resolveEntity(path, projectDir)`, `formatEntityAnnotation(entity)`
- **Classification rules:** Maps file paths to entity types (agent-profile, planning-artifact, governance-config, brain-entry, etc.)
- **Used by:** `tools/write.ts`
- **LOC:** 545 (exceeds 500 LOC limit)

### 4.4 `framework-detector.ts` — Framework Detection Engine
- **Purpose:** Detects GSD, BMAD, SpecKit, Open-spec frameworks by marker files
- **Detection method:** Required markers (unique files) + optional markers (supporting evidence)
- **Output:** Framework name + confidence + detected markers
- **Used by:** `tools/init.ts`, `tools/scan.ts`
- **⚠️ GAP:** Detection only — no enforcement actions taken
- **LOC:** 445

### 4.5 `logging.ts` — TUI-Safe Logger
- **Purpose:** File-only logging (ZERO console.log)
- **Output:** `.idumb/governance/plugin.log`
- **Interface:** `Logger { info, warn, error, debug }`
- **LOC:** ~60

### 4.6 `persistence.ts` — State Persistence (StateManager)
- **Class:** `StateManager` (singleton)
- **Manages:** sessions (Map), anchors (Map), taskStore, delegationStore
- **Persistence files:**
  - `.idumb/brain/hook-state.json` (sessions + anchors)
  - `.idumb/brain/tasks.json` (task store)
  - `.idumb/brain/delegations.json` (delegation store)
- **Features:** Debounced saves (500ms), graceful degradation, atomic writes, v1→v2 migration
- **LOC:** 408

### 4.7 `scaffolder.ts` — Directory Structure Creator
- **Purpose:** Creates `.idumb/` directory tree programmatically
- **Directories created:** 16 subdirectories under `.idumb/`
- **Used by:** `tools/init.ts`
- **LOC:** ~60

### 4.8 `state-reader.ts` — Governance State Reader
- **Purpose:** Reads current governance snapshot for tool consumption
- **Interface:** `GovernanceSnapshot` with activeTask, capturedAgent, anchors, delegations
- **Used by:** `tools/write.ts`
- **LOC:** ~80

### 4.9 `index.ts` — Barrel Export
- **LOC:** ~15

---

## 5. Templates (`src/templates.ts`) ⚠️ SEVERELY OVERSIZED

- **LOC:** 1510 (3x over 500 LOC limit)
- **Agent generators:** `getCoordinatorAgent()`, `getInvestigatorAgent()`, `getExecutorAgent()`
- **Command generators:** `getInitCommand()`, `getSettingsCommand()`, `getStatusCommand()`, `getDelegateCommand()`
- **Skill templates:** `DELEGATION_SKILL_TEMPLATE`, `GOVERNANCE_SKILL_TEMPLATE`
- **Profile constants:** `COORDINATOR_PROFILE`, `INVESTIGATOR_PROFILE`, `EXECUTOR_PROFILE`

---

## 6. Entry Points (Two-Plugin Architecture)

### 6.1 `src/index.ts` — Plugin A (Governance + Intelligence)
- Registers 7 hooks (event, tool.execute.before/after, experimental.session.compacting, experimental.chat.system.transform, experimental.chat.messages.transform, chat.params)
- Registers 5 tools (task, anchor, init, scan, codemap)
- Initializes StateManager singleton
- **LOC:** 155

### 6.2 `src/tools-plugin.ts` — Plugin B (Entity-Aware Operations)
- Registers 0 hooks (self-governed via entity-resolver, chain-validator, state-reader)
- Registers 4 tools (read, write, bash, webfetch)
- opencode.json needs BOTH: `"plugin": ["idumb-v2", "idumb-v2/dist/tools-plugin.js"]`
- **LOC:** 66

### 6.3 `src/cli.ts` — CLI Entry
- Interactive setup: language, governance, experience, scope
- Calls `deployAll()` from `cli/deploy.ts`
- **LOC:** 431

### 6.4 `src/cli/deploy.ts` — Deploy Module
- Deploys agents, commands, skills to `.opencode/`
- Bootstraps planning-registry.json, tasks.json
- Resolves plugin path (4-strategy chain)
- Updates `opencode.json` with plugin reference
- **LOC:** 412

---

## 7. Tests (`tests/`) — STANDALONE tsx SCRIPTS

| File | Purpose | Runner |
|------|---------|--------|
| `tool-gate.test.ts` | Tool gate hook | `tsx` (standalone) |
| `compaction.test.ts` | Compaction hook anchor injection | `tsx` (standalone) |
| `message-transform.test.ts` | Message transform hook | `tsx` (standalone) |
| `init.test.ts` | Init tool scaffold + scan | `tsx` (standalone) |
| `persistence.test.ts` | StateManager persistence | `tsx` (standalone) |
| `task.test.ts` | Task tool + governance | `tsx` (standalone) |
| `delegation.test.ts` | Delegation schema + validation | `tsx` (standalone) |
| `planning-registry.test.ts` | Planning registry schema | `tsx` (standalone) |
| `smoke-code-quality.ts` | Code quality scanner smoke | `tsx` (standalone) |

**Architecture:** Custom `assert()` function + `process.exit(failed > 0 ? 1 : 0)`. Run via `npm test` which chains `tsx` calls. vitest is NOT a project dependency. AGENTS.md claims 294/294 assertions pass (unverified in this audit).

---

## 8. Relationship Matrix

```
index.ts (entry)
  ├── hooks/tool-gate.ts ←→ lib/persistence.ts (StateManager)
  ├── hooks/compaction.ts ←→ lib/persistence.ts (anchors)
  ├── hooks/system.ts ←→ lib/persistence.ts (tasks)
  ├── hooks/message-transform.ts
  ├── tools/task.ts ←→ schemas/task.ts ←→ schemas/delegation.ts
  ├── tools/write.ts ←→ lib/entity-resolver.ts ←→ lib/chain-validator.ts ←→ schemas/planning-registry.ts
  ├── tools/init.ts ←→ lib/scaffolder.ts ←→ lib/framework-detector.ts
  ├── tools/scan.ts ←→ lib/code-quality.ts ←→ schemas/project-map.ts
  └── tools/codemap.ts ←→ schemas/codemap.ts

ORPHANED (no incoming connections):
  ├── schemas/brain.ts ← DEAD CODE (no tool, no hook, no consumer)
  └── tools/status.ts ← DEAD CODE (not registered in either plugin entry point)
```

---

*This document maps every entity in the codebase with types, properties, and relationships.*
*Generated by Ralph Loop Validation — 2026-02-08*
