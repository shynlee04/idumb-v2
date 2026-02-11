# iDumb Plugin — Agent System Analysis

## Executive Summary

This document analyzes the custom agents deployed by the iDumb plugin, their intended purposes, tool permissions, and delegation mechanisms. The plugin currently implements **3 agents** in a strict hierarchy with schema-regulated delegation.

---

## Current Agent Deployment

### 1. Supreme Coordinator (idumb-supreme-coordinator)

**Location:** `.opencode/agents/idumb-supreme-coordinator.md` (pre-deployed by `npx idumb-v2 init`)

**Level:** 0 — Top-tier orchestrator, governance-only agent

**Primary Role:**
- Pure orchestration — creates tasks, delegates to specialists, tracks status
- Does NOT write files, run builds, or research directly
- Manages the entire governance lifecycle from initialization to ongoing monitoring

**Tool Permissions:**
| Tool Category | Access | Purpose |
|---------------|--------|---------|
| **Plugin B (Entity-Aware)** | Limited | idumb_task (all), idumb_scan, idumb_codemap, idumb_anchor, idumb_init |
| **Read-Only Tools** | Full | read, glob, list, grep (for non-entity files) |
| **Write/Edit/Bash/Webfetch** | DENIED | Delegated to executor/investigator |

**Key Capabilities:**
- Creates 3-level task hierarchy (Epic → Task → Subtask)
- Routes work based on WorkStream categories
- Tracks delegation chains and validation gates
- Generates comprehensive intelligence reports (scan + codemap)
- Monitors governance mode (strict/balanced/autonomous/retard)

**Delegation Authority:**
- Can delegate to ANY agent below it (investigator, executor)
- Cannot delegate UP (hierarchy enforced)
- Max depth: 3 (coordinator → investigator/executor → any sub-delegation)

**Example Workflow:**
```
User Request: "Implement authentication feature"
  ↓
Supreme Coordinator:
  1. Creates Epic: "Authentication System" (category: development)
  2. Creates Task: "Implement login endpoint" (auto-linked to epic)
  3. Creates Subtasks: "Write code", "Add tests", "Update docs"
  4. Delegates to idumb-executor with context + acceptance criteria
  5. Tracks status, validates evidence before completing
```

---

### 2. Investigator (idumb-investigator)

**Location:** `.opencode/agents/idumb-investigator.md` (pre-deployed)

**Level:** 1 — Context-gathering, research, analysis, planning

**Primary Role:**
- Researches topics, analyzes codebases, creates plans
- Produces brain entries, research summaries, strategy documents
- Discovers and evaluates skills
- Acts as the team's knowledge engine

**Tool Permissions:**
| Tool Category | Access | Purpose |
|---------------|--------|---------|
| **Plugin B (Entity-Aware)** | Limited | idumb_read (all modes), idumb_write (brain entries), idumb_bash (inspection), idumb_webfetch (research) |
| **Innate Tools** | Read-Only | read, glob, list, grep |
| **Write/Edit/Bash** | DENIED | Cannot write source code, cannot run builds/tests |

**Key Capabilities:**
- **Research**: Web research, documentation analysis, API exploration via `idumb_webfetch`
- **Planning**: Implementation plans, strategy documents, architecture diagrams, ADRs
- **Analysis**: Codebase analysis, gap detection, pattern identification, dependency mapping
- **Skills**: Skill discovery, evaluation, installation via `npx skills`
- **Knowledge**: Brain entry creation and maintenance

**Delegation Authority:**
- Leaf node at level 1 (cannot delegate to other agents)
- Can only create tasks within delegated scope

**Example Workflow:**
```
User Request: "Research best practices for Next.js 15 authentication"
  ↓
Supreme Coordinator:
  Delegates to idumb-investigator
    Context: "Research Next.js 15 authentication patterns"
    Expected Output: "Summary + reference links + pros/cons"

idumb-investigator:
  1. Uses idumb_webfetch to research Next.js docs
  2. Uses idumb_read to examine project structure
  3. Creates brain entry with findings
  4. Returns: "Found 3 patterns: Auth.js, NextAuth.js, custom cookies. [details]"
```

**Routing Rules:**
- Routes to: **investigator** (for research, analysis, planning)
- Not for: Implementation (that's executor's job)

---

### 3. Executor (idumb-executor)

**Location:** `.opencode/agents/idumb-executor.md` (pre-deployed)

**Level:** 1 — Precision implementation, builds, validation

**Primary Role:**
- Writes code, runs builds, executes tests
- Creates agents/commands/workflows
- Validates results via type checks, tests, compliance checks
- Receives tasks with clear acceptance criteria

**Tool Permissions:**
| Tool Category | Access | Purpose |
|---------------|--------|---------|
| **Plugin B (Entity-Aware)** | Full | idumb_read (all modes), idumb_write (all modes + lifecycle), idumb_bash (build + validation + git) |
| **Innate Tools** | Full | read, edit, glob, list, grep (for source files) |
| **Webfetch** | DENIED | Research delegated to investigator |

**Key Capabilities:**
- **Implementation**: Code writes, agent/command/workflow creation, schema-validated file writing
- **Building**: npm test, tsc, eslint, builds, package installs
- **Validation**: Type checks, test runs, compliance checks, gap analysis
- **Artifacts**: Entity-regulated file creation with auto-backup + audit trail
- **Git Operations**: All git commands (with blacklist for destructive operations)

**Delegation Authority:**
- Leaf node at level 1 (cannot delegate to other agents)
- Can create subtasks within delegated scope

**Example Workflow:**
```
User Request: "Implement login endpoint with JWT"
  ↓
Supreme Coordinator:
  Delegates to idumb-executor
    Context: "Implement /api/auth/login endpoint. Accepts email/password, returns JWT token."
    Expected Output: "Working endpoint + unit tests + integration test + documentation"

idumb-executor:
  1. Reads existing codebase via idumb_read
  2. Creates login.ts file via idumb_write (with schema validation)
  3. Creates auth.test.ts via idumb_write
  4. Runs tests via idumb_bash
  5. Returns: "✅ Completed. Tests passed. Created 2 files."
```

**Routing Rules:**
- Routes to: **executor** (for development, maintenance, implementation)
- Not for: Research or planning

---

## Delegation Mechanism (Phase δ2)

### Architecture

The delegation system enforces strict governance through schema validation:

```
1. Caller (supreme coordinator) calls idumb_task action="delegate"
2. Validation checks:
   - No self-delegation
   - Cannot delegate UP hierarchy (0 → 1)
   - Depth limit (max 3)
   - Category routing (advisory)
3. DelegationRecord created and persisted to .idumb/delegations.json
4. Instruction built via buildDelegationInstruction()
5. Instruction text returned to caller
```

### Delegation Schema (src/schemas/delegation.ts)

**Core Types:**
- `DelegationStatus`: pending → accepted → completed/rejected/expired
- `DelegationRecord`: Complete handoff state
- `DelegationResult`: Evidence, files modified, tests run

**Factory Functions:**
- `createDelegation()`: Creates delegation record
- `validateDelegation()`: Enforces 4 governance rules
- `buildDelegationInstruction()`: Generates markdown handoff

**Hierarchy Levels:**
```typescript
const AGENT_HIERARCHY = {
  "idumb-supreme-coordinator": 0,
  "idumb-investigator": 1,
  "idumb-executor": 1,
}
```

**Category Routing Matrix:**
```typescript
const CATEGORY_AGENT_MATRIX = {
  "development": ["idumb-executor"],
  "research": ["idumb-investigator"],
  "governance": ["idumb-supreme-coordinator"],
  "maintenance": ["idumb-executor", "idumb-investigator"],
  "spec-kit": ["idumb-investigator"],
  "ad-hoc": ["idumb-executor", "idumb-investigator"],
}
```

### Critical Gap: Context Not Delivered to Target Agent

**Issue Identified:** The delegation instruction is built but **not delivered** to the target agent.

**Location:** `src/tools/task.ts:801-816`

**Current Flow:**
```typescript
const instruction = buildDelegationInstruction(delegation)

return [
  `✅ Delegation created successfully.`,
  `  Delegation ID: ${delegation.id}`,
  `  From: ${delegation.fromAgent}`,
  `  To: ${delegation.toAgent}`,
  `  Task: ${delegation.taskId}`,
  `  📨 Pass the following to @${args.to_agent}:`,
  instruction,  // ← Text is built but not sent
  `  Expected: ${delegation.expectedOutput}`,
]
```

**What's Missing:**
1. No parameter passed to target agent's `execute()` function
2. No hook message sent to target agent
3. No skill/command triggered that target agent must invoke
4. Caller must manually copy-paste the instruction

**Impact:**
- Delegation mechanism is **non-functional** in practice
- Agents cannot receive delegated work automatically
- Governance enforcement is incomplete

---

## WorkStream Categories (Phase n3)

The system uses 6 WorkStream categories that determine governance strictness and routing:

| Category | Description | Governance Level | Required Artifacts | Routes To |
|----------|-------------|------------------|-------------------|-----------|
| **development** | Features/bugfixes | Strict | Implementation plan + tests + code review | executor |
| **research** | Investigation | Balanced | Research doc + synthesis + evidence | investigator |
| **governance** | Framework/rules | Strict | Spec + validation + deployment | coordinator |
| **maintenance** | Cleanup/refactor | Balanced | Before/after evidence | executor, investigator |
| **spec-kit** | Specification work | Balanced | API contract + schema defs | investigator |
| **ad-hoc** | Quick fixes | Minimal | Just evidence | executor, investigator |

---

## Task Hierarchy (3-Level System)

```
Epic (Level 0)
├── Task (Level 1)
│   ├── Subtask (Level 2)
│   └── Subtask (Level 2)
└── Task (Level 1)
    ├── Subtask (Level 2)
```

**12 Actions in idumb_task:**
1. `create_epic` — Create root-level task container
2. `create_task` — Create task within epic
3. `add_subtask` — Add subtask to task
4. `assign` — Assign task to agent
5. `start` — Mark task as active
6. `complete` — Mark task complete (requires evidence)
7. `defer` — Defer task temporarily
8. `abandon` — Abandon task permanently
9. `delegate` — Delegate to another agent (δ2)
10. `status` — Show full governance state
11. `list` — List all epics/tasks
12. `update` — Rename task

---

## Tool Permissions Model

### Plugin B (Entity-Aware Tools)

These tools are restricted to prevent unauthorized writes:

| Tool | What It Does | Restrictions |
|------|--------------|--------------|
| `idumb_read` | Read entities, check chain state | Read-only by default |
| `idumb_write` | Create/update entities with schema validation | Purpose-restricted, auto-backup |
| `idumb_bash` | Run commands | Purpose-restricted, evidence capture |
| `idumb_webfetch` | Research URLs | Purpose-restricted |

### Innate Tools

Standard OpenCode tools with no restrictions.

### Agent-Specific Access

Each agent has explicit tool access documented in their system prompt:

**Coordinator:** Read-only innate + limited Plugin B
**Investigator:** Read innate + limited Plugin B (write for brain entries only)
**Executor:** Full innate + full Plugin B (except webfetch)

---

## Integration Points

### Deployed Files

1. **Agents:** `.opencode/agents/idumb-*.md` (3 agents, auto-deployed)
2. **Reference Profiles:** `.idumb/idumb-modules/agents/*.md` (for documentation)
3. **Commands:** `.opencode/commands/idumb-*.md` (init, settings, status, delegate)
4. **Skills:** `.idumb/idumb-modules/skills/` (delegation-protocol, governance-protocol)

### Hook Integration

1. **`chat.params`** — Captures `agent` field, auto-assigns to active task
2. **`tool.execute.before`** — Blocks write/edit without active task
3. **`experimental.session.compacting`** — Injects anchors + active task

### Persistence Layer

- **`.idumb/config.json`** — Configuration (governance mode, language, experience)
- **`.idumb/brain/tasks.json`** — Task hierarchy (Epic/Task/Subtask)
- **`.idumb/brain/delegations.json`** — Delegation records (Phase δ2)
- **`.idumb/brain/anchors.json`** — Context anchors (survive compaction)

---

## Agent Handoff Quality

### Current Implementation

The Supreme Coordinator's system prompt (lines 78-83 of templates.ts) describes delegation routing:

```yaml
tools:
  idumb_task: true
  idumb_scan: true
  idumb_codemap: true
  idumb_anchor: true
  idumb_init: true
  idumb_read: true
  idumb_write: false
  idumb_bash: false
  idumb_webfetch: false
```

This is **INCORRECT**. The coordinator should NOT use `idumb_write` or `idumb_bash`. The tools should be:
- `idumb_task`: true (all actions)
- `idumb_read`: true
- `idumb_scan`, `idumb_codemap`, `idumb_anchor`, `idumb_init`: true
- `idumb_write`: false
- `idumb_bash`: false
- `idumb_webfetch`: false

### Corrected Permissions

**Supreme Coordinator:**
- ✅ Can create/assign/complete/track tasks via `idumb_task`
- ✅ Can read entities and scan codebase via `idumb_read`, `idumb_scan`, `idumb_codemap`
- ✅ Can add anchors via `idumb_anchor`
- ✅ Can read config via `idumb_init`
- ❌ CANNOT write files or run builds
- ❌ CANNOT research via `idumb_webfetch`

---

## Recommendations

### Critical Fixes

1. **Fix Delegation Delivery Gap**
   - Pass delegation instruction to target agent's `execute()` context
   - Or send via hook message to target agent
   - Or create `@idumb-delegate` skill that target agent must invoke

2. **Correct Coordinator Permissions**
   - Remove `idumb_write` and `idumb_bash` from tools
   - Add explicit note that all writes are delegated to executor

3. **Add Runtime Delegation Enforcement**
   - In target agent's system prompt, check for pending delegations on start
   - If delegation instruction exists, read it and proceed
   - If no instruction, ask for it

### Enhancements

4. **Add Delegation Skills**
   - Create `idumb-delegate` skill for delegating work with validation
   - Create `idumb-accept` skill for agents to accept delegated work
   - Create `idumb-report` skill for agents to return results

5. **Improve Delegation Instructions**
   - Add agent-specific guidance in instruction
   - Include examples of expected output format
   - Include reference links to agent's system prompt

6. **Add Delegation Monitoring**
   - Track delegation success rate
   - Alert on long-stale delegations
   - Provide statistics on delegation depth and agent utilization

---

## Testing Coverage

### Current Test Coverage

- **Tool Gate:** 16/16 assertions (write-blocking) ✅
- **Compaction:** 16/16 assertions (anchor injection) ✅
- **Message Transform:** 13/13 assertions (pruning old outputs) ✅
- **Task Tool:** 54/54 assertions (CRUD operations) ✅
- **Delegation Schema:** 38/38 assertions (validation, lifecycle) ✅
- **Persistence:** 45/45 assertions (state management) ✅

### Missing Tests

- **Delegation Delivery:** No test verifies instruction is passed to target agent
- **Coordinator Permissions:** No test verifies coordinator cannot write
- **Agent Handoff:** No test verifies target agent receives delegation
- **Runtime Delegation:** No test verifies agents handle incoming delegations

---

## Conclusion

The iDumb plugin implements a sophisticated 3-agent governance system with clear roles, strict hierarchy, and schema-validated delegation. However, there are **critical gaps** in the delegation delivery mechanism that make it non-functional in practice. Additionally, there are configuration errors in the Supreme Coordinator's tool permissions that could lead to unauthorized write attempts.

The delegation system is architected correctly but needs runtime implementation (delivery of instructions to target agents) before it can be considered complete.

---

**Analysis Date:** 2026-02-08
**Source Files:**
- src/templates.ts (agent definitions)
- src/schemas/delegation.ts (delegation mechanism)
- src/schemas/task.ts (task hierarchy)
- src/tools/task.ts (delegate action)
- AGENTS.md (documentation)
