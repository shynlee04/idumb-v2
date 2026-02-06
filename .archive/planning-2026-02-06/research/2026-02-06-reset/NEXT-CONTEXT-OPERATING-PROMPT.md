# iDumb v2 Reset: Next-Context Operating Prompt (Canonical SOT)

Date: 2026-02-06
Scope: Strategic reset for OpenCode-first governance plugin, with explicit pivot logic.
Status: Active source-of-truth for next planning context.

## 1) Mission and Source-of-Truth

### Mission
Build a governance substrate that makes agent behavior more reliable under long, noisy, multi-agent sessions by:
- enforcing workflow boundaries,
- preserving high-value context across compaction,
- detecting and recovering from drift,
- requiring evidence before completion.

### What iDumb is (and is not)
- iDumb is a governance and context-control layer over agentic platforms.
- iDumb is not a replacement for model reasoning.
- iDumb should optimize decision quality and recovery behavior, not produce decorative complexity.

### Source-of-truth hierarchy
1. This document (decision framework and pivot gates).
2. Verified platform capabilities from official docs.
3. Local repo architecture and trial evidence.
4. Hypotheses (must be tagged as unverified until tested).

## 2) Verified Platform Reality (OpenCode vs Claude Code)

Snapshot date: 2026-02-06.

| Concept | OpenCode | Claude Code | iDumb implication |
|---|---|---|---|
| Primary + subagents | Built-in primary and subagents (`Build`, `Plan`, `General`, `Explore`) | Main agent + configurable subagents | Keep orchestration role explicit; avoid role ambiguity |
| Tool interception | `tool.execute.before` and `tool.execute.after` plugin hooks | `PreToolUse` and `PostToolUse` hooks | High-leverage enforcement boundary |
| Compaction interception | `experimental.session.compacting` (inject context or replace prompt) | `PreCompact` hook | Main persistence boundary |
| Todo lifecycle | `todo.updated` event exists | Todo tools and hookable lifecycle events | Can build iterative loop governance around todo updates |
| Rules/system instructions | `AGENTS.md` + instructions + compatibility with `CLAUDE.md` | `CLAUDE.md` + `.claude/rules/*.md` | Rules are foundational but not sufficient alone |
| Skills | Native skill system + `skill` tool | Native skills system | Skill design should be minimal and task-specific |
| Plugins | First-class JS/TS plugin runtime | Plugin packaging + hooks/components model | OpenCode is strong for in-process governance experiments |
| Commands/workflows | Slash commands, markdown command files | Slash commands + skills | Commands are orchestration helpers, not core enforcement |

Critical uncertainty to keep explicit:
- Some previously assumed OpenCode experimental hooks are not clearly documented in current official docs. Treat message/system transform hooks as unverified until live-tested in your exact runtime.

## 3) Non-Negotiable Development Principles

1. Context-first or no execution.
2. One trial = one mechanism + one measurable outcome.
3. Evidence over intuition: no success claim without metrics.
4. Enforce hierarchy: coordinator -> governance -> validator -> builder.
5. No `console.log` in plugin runtime paths.
6. No architecture expansion before passing current pivot gate.
7. Every new artifact must have lifecycle metadata (createdAt, updatedAt, staleAt, owner, chain).
8. Every automation has a safe fallback and a disable switch.
9. If a mechanism only works when repeatedly prompted, it is hollow and must be redesigned.
10. Prefer additive compatibility with platform-native behavior; do not fight the host runtime.

## 4) Do / Dont

### Do
- Start with high-frequency boundaries: tool interception, todo updates, compaction.
- Use deterministic checks before LLM-heavy logic.
- Persist only compact, high-signal state.
- Run stress tests under poisoned context early.
- Keep plugin surface small until stress metrics are stable.

### Dont
- Do not stack multiple speculative mechanisms at once.
- Do not rely on long reminder prompts as core control logic.
- Do not add UI-only features before correctness and recovery pass.
- Do not introduce new entities without hierarchy and lifecycle definitions.
- Do not mark trial complete with anecdotal behavior.

## 5) Pivotal Decision Framework

## Pivot 1: Can OpenCode plugin architecture deliver core governance value?

Pass if all are true:
1. Tool-gate enforcement blocks or redirects invalid actions reliably.
2. Compaction survival preserves critical anchors across >=20 compactions.
3. Drift detection triggers recovery loop within <=2 turns.
4. TUI remains stable enough for continuation flow.

Fail if any are true:
1. Core hooks required for enforcement are unavailable or unreliable.
2. Mechanisms execute but produce no measurable improvement under stress.
3. TUI/session continuity breaks in ways that block practical use.

If Pivot 1 fails:
- Keep a minimal compatibility plugin only.
- Move advanced visualization and heavy orchestration to sidecar/local web interface.
- Continue using OpenCode hooks only for narrow governance guardrails.

## Pivot 1.5: Prompt-level mechanisms vs structural mechanisms

If a mechanism helps only through repeated prompt reminders:
- classify as prompt-dependent,
- keep only as temporary support,
- prioritize structural alternatives (tool/event/state controls).

## 6) Micro-Milestones (Frequency-First)

Order is based on how often events happen in real sessions.

### M0 - Baseline instrumentation
- Goal: Measure failure types before new features.
- Output: failure taxonomy + baseline rates.
- Pass: baseline report generated and reproducible.

### M1 - Tool gate loop (highest frequency)
- Goal: enforce "stop, explain, reroute" on invalid actions.
- Mechanism: pre/post tool hooks.
- Pass: blocked actions show actionable reroute guidance.
- Pivot trigger: blocking works but causes workflow paralysis.

### M2 - Delegation verification loop
- Goal: ensure delegated work returns evidence, not generic summary.
- Mechanism: enforce structured return format for delegated tasks.
- Pass: >=90% delegated results include evidence + gap report.
- Pivot trigger: delegation returns are noisy and non-actionable.

### M3 - Compaction anchor survival
- Goal: preserve critical decisions and active task trajectory.
- Mechanism: compaction context injection with budgeted anchors.
- Pass: critical anchors referenced correctly after >=20 compactions.
- Pivot trigger: anchors persist but model behavior ignores them.

### M4 - Todo governance integration
- Goal: enforce sequence and completion definition through todo lifecycle.
- Mechanism: todo update event + schema checks.
- Pass: coordinator follows read->update->delegate cadence.
- Pivot trigger: todo overhead increases confusion or non-compliance.

### M5 - Prompt/message transformation experiments (optional)
- Goal: test whether message positioning materially affects outcomes.
- Mechanism: only if hook support is verified in runtime.
- Pass: measurable improvement vs control in hallucination/recovery metrics.
- Pivot trigger: no measurable gain after A/B runs.

## 7) Stress Test Design (Poisoned Context First)

### Test tracks
1. Rapid requirement churn: contradictory requests across many turns.
2. Long-session compaction marathon: >=20 compactions.
3. Delegation overload: parallel subtasks with partial/misaligned outputs.
4. Stale-chain injection: old artifacts conflict with current decisions.
5. Tool misuse pressure: attempts to bypass sequence and governance.

### Required metrics
- Wrong-action rate.
- Recovery latency (turns to return to valid workflow).
- Stale-context usage rate.
- Delegation evidence completeness rate.
- Completion integrity rate (done criteria actually validated).

### Initial pass thresholds (MVP)
- Wrong-action rate <= 10%.
- Recovery latency <= 2 turns.
- Stale-context usage <= 5%.
- Delegation evidence completeness >= 90%.
- Completion integrity >= 90%.

## 8) Architecture Boundaries for Clean Branch

### Minimal core
- `plugin-core`: hooks + small state adapter.
- `governance-engine`: policy checks and decision outputs.
- `artifact-store`: typed persistence with lifecycle metadata.
- `stress-harness`: scenario runner and metrics collector.

### Responsibilities
- Coordinator: delegates and sequences only.
- Governance: policy decisions and chain validation.
- Validator: evidence checks and completion gating.
- Builder: code/file execution.

### Data contracts (mandatory)
- All persistent entities require:
  - `id`, `type`, `createdAt`, `updatedAt`, `staleAt`,
  - `status`, `owner`, `parentId`, `chainVersion`,
  - `supersedes` (if replacing prior node).

## 9) Entity Model and Chain Semantics

Use explicit entity classes so governance checks are deterministic.

### Core entity classes
1. `StateNode`
- Purpose: global run state (`phase`, `activeTask`, `lastValidation`, `driftLevel`).

2. `ArtifactNode`
- Purpose: plans, specs, checklists, reports, research summaries.
- Required: `artifactType`, `parentArtifactId`, `supersedes`.

3. `TaskNode`
- Purpose: executable units (including delegated subtasks).
- Required: `level` (1/2/3), `assigneeRole`, `dependsOn`, `doneDefinition`.

4. `EvidenceNode`
- Purpose: verification outputs (tests, diffs, logs, citations).
- Required: `evidenceType`, `sourcePath`, `hash` (or stable signature), `verifiedAt`.

5. `SessionNode`
- Purpose: map lifecycle across compactions and delegated branches.
- Required: `sessionId`, `parentSessionId`, `compactionCount`, `resumeFrom`.

### Mandatory watchers
- `time-to-stale`: invalidate or demote stale nodes.
- `chain-break`: detect missing parent/invalid dependency links.
- `supersession`: retire replaced nodes and prevent stale reuse.
- `evidence-missing`: block completion when required evidence is absent.
- `phase-mismatch`: block actions that violate current phase policy.

## 10) High-Frequency Micro-Pivot Loop

Run this loop on every critical boundary.

| Trigger | Immediate check | Action if pass | Action if fail | Pivot condition |
|---|---|---|---|---|
| User message submitted | phase + active task + stale chain | continue normal flow | inject correction prompt and require task realignment | fail >=3 consecutive turns |
| Before tool execution | permission + sequencing + required context tools | allow + annotate | block + reroute with explicit next step | block rate too high without recovery |
| After delegation result | evidence completeness + drift summary | update todo + continue | require validation subtask before next delegation | repeated low-quality returns |
| Before compaction | critical anchors present + budget fit | inject anchors/context | force compact-safe summary template | post-compact recall drops below threshold |
| Completion message | doneDefinition checklist + evidence links | allow completion | restart validation loop | false completion > threshold |

If any pivot condition is hit, freeze feature expansion and run root-cause analysis before next implementation step.

## 11) Ecosystem-Derived Lessons (Why These 5)

Chosen from OpenCode ecosystem for direct relevance to your goals:

1. `opencode-dynamic-context-pruning`
- Why: context budget and pruning governance.
- Lesson: deterministic pruning first; LLM-driven pruning second.

2. `opencode-background-agents`
- Why: async delegation + persistence.
- Lesson: persist delegation results to disk; keep background work read-focused when safety is uncertain.

3. `@openspoon/subtask2`
- Why: orchestration entropy control.
- Lesson: replace generic returns with structured, explicit next-action contracts.

4. `opencode-supermemory`
- Why: memory persistence and compaction-aware recall.
- Lesson: retrieval quality and scoping matter more than storing everything.

5. `opencode-skillful`
- Why: lazy skill loading and context pressure control.
- Lesson: load guidance on demand; avoid large always-on prompt payloads.

## 12) idumb-init and Meta-Builder Entry Contract

`idumb-init` is the first-run control point and must be deterministic.

### Required first-run sequence
1. Detect environment and framework signals (OpenCode-first, then wrappers).
2. Show a permission-aware greeting with:
- detected project state (greenfield/brownfield),
- detected risk signals (drift, stale artifacts, chain breaks),
- planned actions and expected approvals.
3. Run neutral scan (list/glob/grep/read) before any write.
4. Produce a proposed change plan (paths + artifacts + agents/commands/tools impacts).
5. Apply changes only after confirmation for high-impact updates.
6. Write initial state/config and bootstrap governance artifacts.
7. Emit post-init report with next recommended milestone.

### Meta-builder boundaries
- Meta-builder can scaffold and wire governance assets.
- Meta-builder must not bypass hierarchy responsibilities.
- Meta-builder must emit structured diffs and rationale for each write group.
- Meta-builder must support settings updates through `idumb-settings`.

## 13) Project-Start Planning Proposal (Immediate)

### Phase A (1-2 days): Truth and baseline
- Freeze scope to M0-M1 only.
- Finalize metrics schema and logging.
- Run baseline stress pack and capture results.

### Phase B (2-3 days): Hard guardrails
- Implement/verify M1 tool gate loop with clear reroute UX.
- Add evidence format for delegated outputs.

### Phase C (2-3 days): Context survival
- Implement/verify M3 compaction anchor pipeline.
- Execute 20x compaction stress track.

### Phase D (2-3 days): Todo governance
- Implement M4 against native todo lifecycle.
- Evaluate coordination quality and overhead.

Do not begin Phase E experiments (prompt/message transforms) until A-D pass thresholds are met.

## 14) Copy-Paste Prompt for Next Session

Use this block as your next-context bootstrap prompt:

```markdown
You are continuing the iDumb v2 strategic reset.

Follow this strict order:
1) Read and obey `.planning/research/2026-02-06-reset/NEXT-CONTEXT-OPERATING-PROMPT.md` as canonical SOT.
2) Re-validate platform assumptions against official docs before proposing architecture changes.
3) Work only on the current micro-milestone gate (do not jump ahead).
4) Produce evidence-first outputs:
   - assumptions table (verified vs unverified),
   - risk table (impact, likelihood, mitigation),
   - pass/fail metrics from the active stress track.
5) If pass thresholds are not met, propose pivot options with rationale and smallest-change path.

Current objective:
- Improve governance reliability under poisoned context and compaction pressure without breaking host platform usability.

Constraints:
- One mechanism per trial.
- No speculative feature stacking.
- No completion claims without metrics.
- Preserve hierarchy: coordinator -> governance -> validator -> builder.
```

## 15) References

Primary docs and sources used:
- OpenCode plugins: https://opencode.ai/docs/plugins/
- OpenCode custom tools: https://opencode.ai/docs/custom-tools/
- OpenCode agents: https://opencode.ai/docs/agents/
- OpenCode commands: https://opencode.ai/docs/commands/
- OpenCode rules: https://opencode.ai/docs/rules/
- OpenCode tools: https://opencode.ai/docs/tools/
- OpenCode skills: https://opencode.ai/docs/skills/
- OpenCode ecosystem: https://opencode.ai/docs/ecosystem/
- OpenCode TUI: https://opencode.ai/docs/tui/
- OpenCode CLI: https://opencode.ai/docs/cli/
- Claude Code hooks: https://code.claude.com/docs/en/hooks
- Claude Code subagents: https://code.claude.com/docs/en/sub-agents
- Claude Code settings: https://code.claude.com/docs/en/settings
- Claude Code slash commands: https://code.claude.com/docs/en/slash-commands
- Claude Code output styles: https://code.claude.com/docs/en/output-styles
- Claude Code memory: https://code.claude.com/docs/en/memory
- Claude Code common workflows: https://code.claude.com/docs/en/common-workflows
- Ecosystem plugin study inputs:
  - https://github.com/Opencode-DCP/opencode-dynamic-context-pruning
  - https://github.com/kdcokenny/opencode-background-agents
  - https://github.com/spoons-and-mirrors/subtask2
  - https://github.com/supermemoryai/opencode-supermemory
  - https://github.com/zenobi-us/opencode-skillful
