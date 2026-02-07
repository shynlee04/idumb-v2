# Entity Registry — Complete Codebase Map

**Generated:** 2026-02-08
**Total Source Files:** 45 TypeScript files in `src/`
**Total Test Files:** 9 TypeScript files in `tests/`
**Total LOC:** ~16,877 (src/) + templates (1,510)
**LOC Violations (>500):** 6 files

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
- **Constants:** `MAX_DELEGATION_DEPTH` (3), `DELEGATION_EXPIRY_MS` (4 hours)
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

### 2.7 `status.ts` — System Status
- **Tool name:** `idumb_status`
- **Purpose:** Returns current governance state, active task, session info, anchor count
- **Dependencies:** `lib/persistence.ts` (StateManager), `schemas/task.ts`
- **LOC:** ~100

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
- **Functions:** `createToolGateHook(stateManager)`, `createToolAfterHook(stateManager)`
- **Before-hook behavior:**
  1. Gets or creates session state
  2. Detects agent role from `capturedAgent` or defaults to "meta"
  3. Checks if active task exists (warns if not)
  4. Injects `__idumb_checked`, `__idumb_role`, `__idumb_task` metadata into tool args
- **After-hook behavior:** Logs tool execution result
- **⚠️ MISSING:** Delegation depth tracking, circular delegation detection, permission enforcement against entity resolver
- **LOC:** 281

### 3.2 `compaction.ts` — Compaction Anchor Injection
- **Hook type:** `experimental.session.compacting`
- **Function:** `createCompactionHook(stateManager)`
- **Behavior:** Selects top-N anchors by score, injects formatted context into compaction
- **Budget cap:** ≤2000 chars (≈500 tokens)
- **LOC:** ~80

### 3.3 `message-transform.ts` — Message Format Transform
- **Hook type:** `experimental.chat.message` (?)
- **Purpose:** Transform messages for optimal LLM comprehension
- **LOC:** ~50

### 3.4 `system.ts` — System Prompt Transform
- **Hook type:** `system.prompt.transform`
- **Function:** `createSystemHook(stateManager)`
- **Behavior:** Injects governance prefix with active task info, governance mode, critical anchors
- **LOC:** ~80

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

## 6. Entry Points

### 6.1 `src/index.ts` — Plugin Entry
- Registers 5 hooks + 5 tools
- Initializes StateManager
- **LOC:** 154

### 6.2 `src/tools-plugin.ts` — Additional Tools
- Registers bash, read, webfetch as separate tool bundle
- **LOC:** 65

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

## 7. Tests (`tests/`) — ALL FAILING

| File | Purpose | Status |
|------|---------|--------|
| `compaction.test.ts` | Compaction hook anchor injection | ❌ FAILS (process.exit) |
| `delegation.test.ts` | Delegation schema + validation | ❌ FAILS |
| `init.test.ts` | Init tool scaffold + scan | ❌ FAILS |
| `message-transform.test.ts` | Message transform hook | ❌ FAILS (process.exit) |
| `persistence.test.ts` | StateManager persistence | ❌ FAILS |
| `planning-registry.test.ts` | Planning registry schema | ❌ FAILS |
| `smoke-code-quality.ts` | Code quality scanner smoke | ❌ FAILS |
| `task.test.ts` | Task tool + governance | ❌ FAILS |
| `tool-gate.test.ts` | Tool gate hook | ❌ FAILS |

**Root cause:** Tests written as standalone scripts with `process.exit()` — incompatible with vitest test runner.

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
  └── schemas/brain.ts ← DEAD CODE
```

---

*This document maps every entity in the codebase with types, properties, and relationships.*
*Generated by Ralph Loop Validation — 2026-02-08*
