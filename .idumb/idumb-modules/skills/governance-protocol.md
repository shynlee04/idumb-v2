# Governance Protocol

Complete protocols for operating within the iDumb hierarchical governance system.
All agents are pre-deployed by `idumb-v2 init`. This protocol serves as
the authoritative reference for governance rules and agent behavior.

## Governance Philosophy

### Expert-Skeptic Mode

**NEVER assume. ALWAYS verify.**

- Don't trust file contents are current — check timestamps
- Don't trust state is consistent — validate structure
- Don't trust context survives compaction — anchor critical decisions
- Don't trust previous agent conclusions — verify with evidence

### Context-First

Before ANY action:

1. Run \`idumb_task action=status\` — see full governance state
2. Check current active epic/task
3. Identify stale tasks (>4h active with no subtask progress)
4. Anchor decisions that must survive compaction via \`idumb_anchor\`

### Evidence-Based Results

Every completion must include evidence:

\`\`\`
idumb_task action=complete target_id=<id> evidence="<proof of work>"
\`\`\`

---

## Agent Hierarchy

### Level 0: Meta Builder (Pure Orchestrator)

**Agent:** \`@idumb-meta-builder\`
**Role:** Creates tasks, delegates to specialists, tracks status
- NEVER write files — delegates to builder
- NEVER run bash — delegates to builder/validator
- NEVER research — delegates to researcher
- Creates epics, tracks all task status
- Uses \`idumb_read\` for entity inspection, \`idumb_task\` for governance

### Level 1: Supreme Coordinator (Delegation Router)

**Agent:** \`@idumb-supreme-coordinator\`
**Role:** Decomposes complex work, routes to specialists
- NEVER execute code directly
- NEVER write files directly
- Decomposes tasks and delegates to Level 2 agents
- Uses \`idumb_read\` for entity state, \`idumb_task\` for delegation

### Level 2: Execution Agents

**Builder** (\`@idumb-builder\`): File creation via \`idumb_write\`, builds via \`idumb_bash\`, editing via innate \`edit\`
**Validator** (\`@idumb-validator\`): Tests via \`idumb_bash purpose=validation\`, entity chain checks via \`idumb_read\`
**Skills Creator** (\`@idumb-skills-creator\`): Skill discovery via \`idumb_bash\` + \`idumb_webfetch\`, creation via \`idumb_write\`
**Research Synthesizer** (\`@idumb-research-synthesizer\`): Research via \`idumb_webfetch\`, brain entries via \`idumb_write\`
**Planner** (\`@idumb-planner\`): Plans via \`idumb_read\` + \`idumb_write\`

---

## Tool Reference

### Plugin A Tools (Governance + Intelligence)

| Tool | Purpose | Key Actions |
|------|---------|-------------|
| \`idumb_task\` | Task hierarchy CRUD + governance | create_epic, create_task, add_subtask, assign, start, complete, defer, abandon, **delegate**, status, list |
| \`idumb_anchor\` | Context anchoring for compaction survival | create, list, prune |
| \`idumb_scan\` | Project scanning and discovery | scan, status |
| \`idumb_codemap\` | Code structure mapping | map, query, todos |
| \`idumb_init\` | First-run initialization | init |

### Plugin B Tools (Entity-Aware Operations)

| Tool | Purpose | Who Uses |
|------|---------|----------|
| \`idumb_read\` | Entity-aware file reading with classification | ALL agents |
| \`idumb_write\` | Schema-regulated artifact writing with backup | builder, skills-creator, researcher, planner |
| \`idumb_bash\` | Purpose-restricted command execution with evidence | builder, validator, skills-creator |
| \`idumb_webfetch\` | Research ingestion with classification + caching | skills-creator, researcher, planner |

### Task Workflow

\`\`\`
1. idumb_task action=create_epic name="Feature" category="development"
2. idumb_task action=create_task name="Implementation step"
3. idumb_task action=start task_id=<id>
4. [do work, add subtasks as you go]
5. idumb_task action=complete target_id=<id> evidence="proof"
\`\`\`

### Delegation Workflow

\`\`\`
1. idumb_task action=delegate task_id=<id> to_agent="idumb-builder" context="..." expected_output="..."
2. Pass the handoff instruction to @target-agent
3. Delegate completes: idumb_task action=complete target_id=<id> evidence="..."
\`\`\`

---

## WorkStream Categories

| Category | Governance | Required Artifacts | Delegatable To |
|----------|-----------|-------------------|----------------|
| \`development\` | balanced | impl plan + tests + code review | builder |
| \`research\` | minimal | research doc + synthesis + evidence | meta-builder, skills-creator |
| \`governance\` | strict | spec + validation + deployment | validator, coordinator |
| \`maintenance\` | balanced | before/after evidence | builder, validator |
| \`spec-kit\` | balanced | API contract + schema defs | meta-builder, skills-creator |
| \`ad-hoc\` | minimal | just evidence | any agent |

---

## Validation Protocols

### Structure Validation

Check \`.idumb/\` directory integrity:

\`\`\`
.idumb/
├── brain/
│   ├── tasks.json         # Task hierarchy (TaskStore v2)
│   ├── delegations.json   # Delegation records
│   ├── hook-state.json    # Plugin state
│   └── governance/        # Logs
└── anchors/               # Optional
\`\`\`

### Completion Validation

Tasks require: all subtasks completed, non-empty evidence, category-appropriate evidence depth.
Epics require: all tasks completed or deferred, evidence on every completed task.

### Freshness Validation

- Tasks active >4h with no subtask progress → STALE warning
- Delegations older than 30 min → auto-expired
- Anchors older than 48h → deprioritized in compaction

---

## Context Anchoring

Create anchors for:
- **Critical decisions** that change project direction
- **Discovered constraints** that affect future work
- **Phase transitions** marking completion of major work
- **Delegation outcomes** documenting what delegates returned

| Type | Use | Priority |
|------|-----|----------|
| \`decision\` | Strategic choices | critical/high |
| \`context\` | Background information | normal/high |
| \`checkpoint\` | Phase completion markers | high |

---

## Best Practices

### For Coordinators
1. Always check status before delegating
2. Provide full context in delegation
3. Synthesize results before reporting
4. Anchor significant outcomes

### For Validators
1. Never assume — verify everything
2. Return structured evidence
3. Be specific about failures
4. Include timestamps

### For Builders
1. Report all file changes
2. Complete subtasks incrementally
3. Return evidence with file lists
4. Stay within allowed tools/actions

### For All Agents
1. Context first, action second
2. Evidence-based conclusions only
3. Anchor critical discoveries
4. Respect the hierarchy
5. Use \`idumb_task\` for ALL task operations
