# Delegation Protocol

Reference protocol for structured task delegation between iDumb agents.
All agents are pre-deployed by `idumb-v2 init`. The meta-builder references this
protocol when coordinating delegation and embeds the relevant rules in task handoffs.

## Key Insight

**Delegation ≠ assignment.** It's a schema-regulated handoff with:
- Context transfer (what the delegate needs to know)
- Evidence requirements (what must be returned)
- Permission boundaries (what tools the delegate can use)
- Chain tracking (who delegated to whom, depth limit)

**PP-01 constraint:** Subagent hooks don't fire. ALL governance for sub-agents
flows through agent profiles + this protocol + disk-persisted delegation records.

---

## When to Delegate

| Your Role | Delegate To | When |
|-----------|------------|------|
| `meta-builder` | `supreme-coordinator`, `planner` | Complex work requiring decomposition, planning |
| `supreme-coordinator` | `builder`, `validator`, `skills-creator`, `research-synthesizer` | Implementation, validation, skills, research |
| `builder` | `validator` | Post-implementation validation |
| `planner` | `research-synthesizer` | Research needed for planning |

**NEVER delegate:**
- To yourself
- Upward (builder → coordinator, coordinator → meta-builder)
- Beyond depth 3 (meta-builder → coordinator → builder → validator STOP)
- Cross-category without coordinator approval

---

## How to Delegate

### Step 1: Create the Delegation

```
idumb_task action=delegate
  task_id=task-123
  to_agent="idumb-builder"
  context="Implement the login form component with email validation..."
  expected_output="Working LoginForm component with unit tests"
```

### Step 2: Pass the Handoff

The tool returns a structured delegation instruction. Pass it verbatim to the target agent via `@agent-name`.

### Step 3: Receive Results

The delegate completes with evidence:

\`\`\`
idumb_task action=complete target_id=task-123 evidence="LoginForm implemented, 8/8 tests passing"
\`\`\`

---

## Context Transfer Rules

### What Context MUST Include

| Field | Purpose | Example |
|-------|---------|---------|
| **What to do** | Clear action description | "Implement login form" |
| **Where** | File paths, directories | "src/components/LoginForm.tsx" |
| **Constraints** | Tech stack, patterns | "Use React + Shadcn, follow existing Button pattern" |
| **Acceptance criteria** | How to know it's done | "Tests pass, renders correctly" |
| **Related files** | Context the delegate needs | "See src/components/Button.tsx for pattern" |

### What Context MUST NOT Include

- Sensitive credentials or API keys
- Full file contents (reference paths instead)
- Previous failed attempts (unless relevant to the fix)

---

## Evidence Requirements

### What Delegates MUST Return

\`\`\`yaml
result:
  evidence: "Description of what was done and verification"
  filesModified:
    - "src/components/LoginForm.tsx"
    - "tests/LoginForm.test.tsx"
  testsRun: "8/8 passed"
  brainEntriesCreated:
    - "login-form-architecture"
\`\`\`

### Evidence Quality by Governance Level

| Governance Level | Required Evidence |
|-----------------|-------------------|
| \`strict\` | Test results + file list + verification command output |
| \`balanced\` | Test results + file list |
| \`minimal\` | Summary statement |

---

## Category → Agent Routing

| Category | Allowed Agents | Reason |
|----------|---------------|--------|
| \`development\` | builder | Write + bash permissions needed |
| \`research\` | meta-builder, skills-creator | Read access and synthesis |
| \`governance\` | validator, coordinator | Validation authority |
| \`maintenance\` | builder, validator | Write + validation |
| \`spec-kit\` | meta-builder, skills-creator | Structured output generation |
| \`ad-hoc\` | any agent | Minimal routing constraints |

---

## Chain Rules

### Hierarchy Levels

```
Level 0: idumb-meta-builder (pure orchestrator — creates tasks, delegates, tracks status)
Level 1: idumb-supreme-coordinator, idumb-planner (decompose + route + plan)
Level 2: idumb-builder, idumb-validator, idumb-skills-creator, idumb-research-synthesizer (execute)
```

### Depth Limits

- Depth 0 → 1: meta-builder delegates to coordinator/planner ✅
- Depth 1 → 2: coordinator delegates to builder/validator/skills/researcher ✅
- Depth 2 → 3: builder delegates to validator ✅ (MAX)
- Depth 3 → ❌: BLOCKED

### Conflict Resolution

**Rejected:** Delegator adjusts scope and re-delegates. 3 rejections → escalate to coordinator.
**Expired (30 min):** Task returns to delegator as "expired." Re-delegate, adjust, or handle self.

---

## Quick Reference

### For Delegators

1. Identify the right agent for the task category
2. Provide clear context with file paths and constraints
3. Define specific expected output and acceptance criteria
4. Use \`idumb_task action=delegate\` with all required args
5. Pass the handoff instruction to \`@target-agent\`
6. Monitor delegation status via \`idumb_task action=status\`

### For Delegates

1. Read the full delegation instruction
2. Verify you have the required permissions
3. Work within allowed tools and actions
4. Complete with evidence via \`idumb_task action=complete\`
5. Include filesModified, testsRun in your evidence
6. Do NOT delegate beyond your remaining depth
