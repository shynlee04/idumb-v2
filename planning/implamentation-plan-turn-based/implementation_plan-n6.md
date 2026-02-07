# Schema-First Governance Redesign — Unified Iterations

Data never enters `.idumb/` without being schema-validated and registry-tracked. Unregistered files are **outliers** — init detects them, agents escalate them to the user. Schema and agents evolve **together** per iteration, not in separate phases.

---

## Core Corrections Applied

| My Previous Assumption | User's Actual Intent |
|---|---|
| Phase 1 = schema, Phase 2 = agents, Phase 3 = dashboard | Schema + agents + commands designed **together** per iteration. Iterative test-and-see. |
| Retroactively register existing files | Files that aren't registered at creation = **outliers**. Init detects + escalates. Agents verify with user before accepting. |
| 3 agents replace ALL agents | 3 agents replace only **innate** OpenCode agents. Framework agents (BMAD, GSD, Agent-OS) are intercepted via commands/skills and forced onto custom tools. |
| `idumb-meta-builder` name continues | Replaced by `idumb-supreme-coordinator` to eliminate "builder" misconception. |
| Long unregulated template lists | Split templates into schema-regulated just-in-time command+prompt units. |

---

## Iteration 1: Foundation — Init → Schema → 3 Agents

The minimum loop where init creates the registry, deploys 3 agents, and every write goes through schema validation.

### Schema: Planning Registry

#### [NEW] [planning-registry.ts](file:///Users/apple/Documents/coding-projects/idumb/v2/src/schemas/planning-registry.ts)

The **missing schema** that makes planning artifacts first-class governed entities. Persists to `.idumb/brain/planning-registry.json`.

```typescript
// Tier hierarchy — what CAN exist in .idumb/
type DocumentTier = 1 | 2 | 3
// T1: Governance SOT (PROJECT.md, SUCCESS-CRITERIA.md) — few, immutable gates
// T2: Planning (impl plans, gap analyses, specs) — versioned chains
// T3: Evidence (walkthroughs, research, execution logs) — append-mostly

type ArtifactType =
  | "implementation-plan" | "walkthrough" | "gap-analysis"
  | "research" | "spec" | "governance-doc" | "phase-completion"

type SectionStatus = "active" | "stale" | "superseded" | "invalid"

interface ArtifactSection {
    id: string
    heading: string
    depth: number          // H1=1, H2=2
    status: SectionStatus
    supersededBy?: string  // section ID in replacement artifact
    linkedTaskIds: string[]
    contentHash: string    // drift detection
    modifiedAt: number
}

interface PlanningArtifact {
    id: string
    path: string
    tier: DocumentTier
    type: ArtifactType
    chainId: string        // groups n1→n2→n3 into one chain
    chainParentId?: string
    chainChildIds: string[]
    sections: ArtifactSection[]
    status: "draft" | "active" | "superseded" | "abandoned"
    createdBy: string      // agent that wrote it
    createdAt: number
    modifiedAt: number
    sessionId?: string
    linkedTaskIds: string[]
    linkedBrainEntryIds: string[]
}

interface ArtifactChain {
    id: string
    name: string
    rootArtifactId: string
    activeArtifactId: string  // current chain head
    artifactIds: string[]     // ordered history
    tier: DocumentTier
}

interface PlanningRegistry {
    version: string
    artifacts: PlanningArtifact[]
    chains: ArtifactChain[]
    outliers: OutlierEntry[]  // detected-but-unregistered files
    lastScanAt: number
}

// Init-detected files that exist but aren't in the registry
interface OutlierEntry {
    path: string
    detectedAt: number
    reason: "unregistered" | "no-chain" | "schema-mismatch"
    userAction?: "accepted" | "rejected" | "pending"
}
```

Factory functions: `createPlanningArtifact`, `createArtifactSection`, `createArtifactChain`, `createPlanningRegistry`, `addOutlier`.

Helpers: `resolveChainHead`, `getChainHistory`, `findStaleSections`, `computeSectionHash`, `linkTaskToArtifact`, `findOutliers`.

#### [MODIFY] [index.ts](file:///Users/apple/Documents/coding-projects/idumb/v2/src/schemas/index.ts)

Add re-exports for all planning-registry types and factory functions.

---

### Init: Outlier Detection

#### [MODIFY] [init.ts](file:///Users/apple/Documents/coding-projects/idumb/v2/src/tools/init.ts)

After brownfield scan, add outlier detection:

1. Scan `.idumb/` for any files NOT in `planning-registry.json`
2. For each unregistered file → create `OutlierEntry` with `reason: "unregistered"`, `userAction: "pending"`
3. Return outlier list in init greeting — agents must ask user to accept/reject
4. Bootstrap `planning-registry.json` alongside existing `tasks.json` bootstrap

#### [MODIFY] [deploy.ts](file:///Users/apple/Documents/coding-projects/idumb/v2/src/cli/deploy.ts)

Bootstrap `planning-registry.json` during [deployAll](file:///Users/apple/Documents/coding-projects/idumb/v2/src/cli/deploy.ts#189-450):
```typescript
const registryPath = join(projectDir, ".idumb", "brain", "planning-registry.json")
const emptyRegistry = createPlanningRegistry()
await writeIfNew(registryPath, JSON.stringify(emptyRegistry, null, 2), force, result)
```

---

### Agents: 3 Innate Agents (Replace All Current)

> [!IMPORTANT]
> These 3 replace the current 7 innate agents (`meta-builder`, `supreme-coordinator`, `builder`, `validator`, `skills-creator`, `research-synthesizer`, `planner`). Framework agents (BMAD, GSD, Agent-OS) are **not replaced** — they're intercepted via commands/skills and forced to use custom tools.

#### Agent Permission Matrix

| Agent | Role | Tools Allowed | Reads | Writes |
|---|---|---|---|---|
| `idumb-supreme-coordinator` | Governance-only orchestrator | `idumb_task`, `idumb_init`, `idumb_status` | `glob`, `list_dir`, `grep` (keywords), `idumb_read` (offset-limited) | **None** — must delegate |
| `idumb-investigator` | Context gathering, research, analysis | `idumb_read`, `idumb_scan`, `idumb_codemap`, `idumb_anchor`, `webfetch` | Full codebase read | `idumb_write` (brain entries only) |
| `idumb-executor` | Precision writes, schema-validated | `idumb_write`, `idumb_task` (complete/evidence) | `idumb_read` (targeted) | Full `idumb_write` (all entity types) |

**Supreme coordinator restrictions:**
- No direct codebase reads beyond `glob`/`list_dir`/keyword grep
- Forces delegation for any depth requirement → keeps its context pure
- High-level perspective only → avoids context poisoning

#### [MODIFY] [templates.ts](file:///Users/apple/Documents/coding-projects/idumb/v2/src/templates.ts)

Major changes:

1. **Remove** 6 agent generators: [getMetaBuilderAgent](file:///Users/apple/Documents/coding-projects/idumb/v2/src/templates.ts#14-393), [getSupremeCoordinatorAgent](file:///Users/apple/Documents/coding-projects/idumb/v2/src/templates.ts#977-1079) (old), [getBuilderAgent](file:///Users/apple/Documents/coding-projects/idumb/v2/src/templates.ts#1080-1173), [getValidatorAgent](file:///Users/apple/Documents/coding-projects/idumb/v2/src/templates.ts#1174-1262), [getSkillsCreatorAgent](file:///Users/apple/Documents/coding-projects/idumb/v2/src/templates.ts#1263-1341), [getResearchSynthesizerAgent](file:///Users/apple/Documents/coding-projects/idumb/v2/src/templates.ts#1342-1418), [getPlannerAgent](file:///Users/apple/Documents/coding-projects/idumb/v2/src/templates.ts#1419-1497)
2. **Remove** 6 profile constants: `SUPREME_COORDINATOR_PROFILE`, `BUILDER_PROFILE`, `VALIDATOR_PROFILE`, `SKILLS_CREATOR_PROFILE`, `RESEARCH_SYNTHESIZER_PROFILE`, `PLANNER_PROFILE`
3. **Add** 3 new agent generators:
   - `getCoordinatorAgent(config)` — governance-only, delegates everything, restricted tool list
   - `getInvestigatorAgent(config)` — research-focused, brain-writing, context gathering
   - `getExecutorAgent(config)` — precision writes, schema validation emphasis
4. **Add** 3 new profile constants for `.idumb/idumb-modules/agents/`

> [!WARNING]
> Agent template content should be **minimal**. The detailed "what to do and how" instructions move to **just-in-time commands+prompts** — the long unregulated template lists get split into schema-regulated command units that the agent triggers as needed.

#### [MODIFY] [deploy.ts](file:///Users/apple/Documents/coding-projects/idumb/v2/src/cli/deploy.ts)

Replace the 7-agent deploy block (lines 217-269) with 3 agents:

```typescript
// ─── Deploy 3 Innate Agents ──────────────────────────────────────
await writeIfNew(join(agentsDir, "idumb-supreme-coordinator.md"), getCoordinatorAgent(agentConfig), force, result)
await writeIfNew(join(agentsDir, "idumb-investigator.md"), getInvestigatorAgent(agentConfig), force, result)
await writeIfNew(join(agentsDir, "idumb-executor.md"), getExecutorAgent(agentConfig), force, result)
```

Replace the 6-profile deploy block (lines 323-359) with 3 profiles.

#### [MODIFY] [delegation.ts](file:///Users/apple/Documents/coding-projects/idumb/v2/src/schemas/delegation.ts)

Update `AGENT_HIERARCHY` to reflect 3-agent model:
- `idumb-supreme-coordinator` → level 0 (was already there but alongside `meta-builder`)
- `idumb-investigator` → level 1
- `idumb-executor` → level 1
- Remove: `meta-builder`, `builder`, `validator`, `skills-creator`, `research-synthesizer`, `planner`

#### [MODIFY] [entity-resolver.ts](file:///Users/apple/Documents/coding-projects/idumb/v2/src/lib/entity-resolver.ts)

Update all `canWrite` / `canRead` arrays in classification rules to reference only the 3 new agent names.

---

### Write Tool: Registration-at-Creation

#### [MODIFY] [write.ts](file:///Users/apple/Documents/coding-projects/idumb/v2/src/tools/write.ts)

When `entityType === "planning-artifact"`:

1. **Parse** the markdown into `ArtifactSection[]` (extract headings, compute hashes)
2. **Register** in `.idumb/brain/planning-registry.json` — create `PlanningArtifact` entry
3. **Chain link** — detect iteration pattern (`-n1`, `-n2`) and link to existing chain
4. **Reject unregistered** — if the path is outside `.idumb/` designated hierarchy and no chain exists → block write, return error asking agent to verify with user first
5. **Lifecycle ops** — `supersede` updates section statuses + chain links, `abandon` purges from active context

---

### Test: Unified Schema + Agent Tests

#### [NEW] [planning-registry.test.ts](file:///Users/apple/Documents/coding-projects/idumb/v2/tests/planning-registry.test.ts)

- Schema creation (artifact, section, chain, registry, outlier)
- Chain management (add, resolve head, history traversal)
- Section lifecycle (stale, supersede, drift detection via hash)
- Outlier detection (unregistered file → outlier entry)
- Cross-entity linking (task ID → artifact, delegation → artifact)

#### [MODIFY] existing test files

- Update `delegation.test.ts` → 3-agent hierarchy (remove old agent names)
- Update `tool-gate.test.ts` → new agent name validation

---

## Iteration 2: Framework Interception + Command Splitting

> [!NOTE]
> This iteration depends on Iteration 1 being tested and stable. Design details here are directional — they'll be refined based on Iteration 1 learnings.

### Framework Agent Interception

Framework agents (BMAD, GSD, Agent-OS) don't get replaced — they get intercepted:

1. When a framework agent is detected (via `chat.params` hook capturing agent identity)
2. Commands/skills inject schema requirements into their context
3. The `tool.execute.before` hook forces them to use `idumb_write` instead of raw `write_to_file`
4. Any files they produce outside `.idumb/` hierarchy → flagged as outliers

### Command Splitting

The current templates.ts has long unregulated instruction blocks embedded in agent prompts. Split into:

- **Just-in-time commands**: `idumb-investigate`, `idumb-plan`, `idumb-execute`, `idumb-review` — each triggers specific instructions
- **Schema-regulated**: each command specifies which schema set, which tools, which output format
- Commands are auto-appended or triggered by the coordinator based on delegation context

---

## Iteration 3: Dashboard Data Layer

The dashboard reads only from regulated `.idumb/` data:

- Planning Registry → chain visualization with section drilldown
- Execution logs → agent activity timeline
- Outlier alerts → governance warnings panel
- Cross-entity maps → task ↔ artifact ↔ delegation connections

---

## Verification Plan

### Automated Tests (Iteration 1)

```bash
# New planning registry tests
npx vitest run tests/planning-registry.test.ts

# All existing tests must still pass (204+ assertions)
npx vitest run
```

### Manual Verification (Iteration 1)

1. `npx idumb-v2 init --force` → verify only 3 agents deployed to `.opencode/agents/`
2. Verify `.idumb/brain/planning-registry.json` is bootstrapped
3. Use `idumb_write` to create a planning artifact → verify it's registered
4. Place an unregistered file in `.idumb/` → run `idumb_init action=scan` → verify outlier detected
5. Check delegation validation with 3-agent hierarchy
