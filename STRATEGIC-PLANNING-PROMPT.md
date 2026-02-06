# iDumb v3 — Strategic Planning Prompt (Source of Truth)

**Version:** 3.0.0-draft.1  
**Date:** 2026-02-06  
**Purpose:** This document IS the planning prompt. Every future AI agent session working on iDumb MUST consume this before any action.

---

# PART 1: WHAT iDumb DOES

## 1.1 One-Sentence Definition

iDumb is an **OpenCode plugin system** (set of plugins + custom tools) that replicates "intelligence" in AI agents by enforcing structured workflows, context purification, and self-governance loops.

## 1.2 The "Intelligence" Is Fake — And That's The Point

| "Intelligence" Illusion | Actual Mechanism |
|---|---|
| Agent "knows" what to do next | Enforced TODO task-list read before any action |
| Agent "detects" context drift | Time-to-stale timestamps + chain-break validation |
| Agent "recovers" from hallucination | Delegation to isolated sub-context → validator returns evidence → main loop re-enters |
| Agent gives "expert" decisions | 3-level validation loop: do → self-check → delegate-validate → loop until gaps=0 |
| Agent "remembers" across compaction | Budget-capped anchor injection into compaction context |
| Agent "refuses" bad work | Stop-hook blocks completion when TODO items remain unchecked |

## 1.3 Target Users

1. **Professional teams** — corporate complexity, spec-driven (GSD, BMAD, Spec-kit)
2. **Vibe coders** — pollute context, rapid changes, 20+ compactions per session

The stress test is the vibe coder. The value proposition is the professional team.

---

# PART 2: PLATFORM KNOWLEDGE — OpenCode vs Claude Code

## 2.1 Master Concept Matrix

| # | Concept | OpenCode | Claude Code | Notes |
|---|---------|----------|-------------|-------|
| 1 | **Agents** | Primary (`Build`, `Plan`) + Subagents (`General`, `Explore`) + Hidden (`compaction`, `title`, `summary`) | Main agent + Subagents (foreground/background) | Defined in `.opencode/agents/*.md` or `opencode.json` vs `.claude/agents/*.md` |
| 2 | **Subagents** | Via `task` tool or `@mention`. Child sessions. **Hooks do NOT fire for subagent tool calls** (issue #5894) | Via `Task` tool. Foreground/background. **Hooks DO fire inside subagents** | **#1 platform divergence** |
| 3 | **Modes/Roles** | `primary` / `subagent` / `all` per agent | Implicit from config | `mode` field in OpenCode |
| 4 | **Permissions** | `allow`/`ask`/`deny` per-tool, per-agent. Glob patterns. `doom_loop` detection | `allow`/`deny`/`ask` per-agent. `permissionMode` field | OpenCode has `doom_loop` (3x identical call) |
| 5 | **Rules** | `AGENTS.md` (project) + global. Reads `CLAUDE.md` as fallback. `instructions` array | `CLAUDE.md` (project) + global. `.claude/settings.json` | Constitution of agent behavior |
| 6 | **System Prompts** | Per-agent `prompt` field → `.md` file | Agent `.md` body = system prompt. **NOT user prompt** | #1 mistake: writing agent body as user prompt |
| 7 | **Commands** | `.opencode/commands/*.md` with frontmatter. `$ARGUMENTS`, shell output, file refs | `/command` slash commands, similar frontmatter | Can force subtask mode, override agent/model |
| 8 | **Tools** | Built-in: `bash`, `edit`, `write`, `read`, `grep`, `glob`, `list`, `todowrite`, `todoread`, `webfetch`, `question`, etc. Custom via plugins | Built-in: `Bash`, `Read`, `Write`, `Edit`, `Task`, `TodoWrite`, `TodoRead`, etc. Custom via MCP/hooks | Lowercase (OC) vs PascalCase (CC) |
| 9 | **Skills** | `SKILL.md` in `.opencode/skills/`, global, or `~/.claude/skills/`. On-demand via `skill` tool | `SKILL.md` in `.claude/skills/`. Can fork to subagent context | Right way to inject large context without bloating |
| 10 | **Hooks (OC)** | Plugin TS functions: `tool.execute.before/after`, `permission.ask`, `experimental.session.compacting`, `experimental.chat.messages.transform`, `chat.message`, lifecycle events | N/A (different system) | In-process, return modified output objects |
| 11 | **Hooks (CC)** | N/A | Shell scripts: `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `Stop`, `SubagentStop`, `PreCompact`, `SessionStart/End`, etc. Exit code 0/2 for allow/block | Out-of-process, stdin JSON + stdout + exit codes |
| 12 | **Plugins (OC)** | JS/TS modules. Receive `{ project, client, $, directory, worktree }`. Return hooks + tools | JSON manifest `plugin.json`. Provide agents, hooks, skills, commands, MCP servers | OC = code-first. CC = config-first |

## 2.2 Session Lifecycle — What LLMs See

```
SESSION START
├── System prompt: base + AGENTS.md + agent prompt + skill descriptions + tool descriptions
├── User message → chat.message fires → messages.transform fires → LLM processes
├── AGENTIC LOOP: LLM calls tools → before/after hooks fire → context accumulates
├── COMPACTION (~75% capacity or /compact)
│   ├── experimental.session.compacting fires → plugin pushes context
│   ├── Compaction agent summarizes everything
│   ├── ALL old messages REPLACED with summary
│   └── LLM sees: system prompt + summary + new messages (everything else GONE)
├── SUBAGENT (via task tool)
│   ├── New child session, own context window
│   ├── Plugin hooks DO NOT fire for subagent tool calls
│   └── Returns summary to parent
└── USER INTERRUPTION: generation aborted, new message appended, no compaction
```

## 2.3 OpenCode Plugin Hook Reference

| Hook | Fires When | Can Block? | Subagents? | Key Capability |
|---|---|---|---|---|
| `tool.execute.before` | Before tool call | **YES (throw)** | **NO** | Block/modify tool args |
| `tool.execute.after` | After tool completes | No | **NO** | Modify tool output |
| `permission.ask` | Permission dialog | Yes | Unknown | Auto-approve/deny |
| `experimental.session.compacting` | Before compaction | No | N/A | `output.context.push(string)` |
| `experimental.chat.messages.transform` | Every message cycle | No | Unknown | Modify message content |
| `chat.message` | Every message | No | Unknown | Observe agent name |
| `event` | Session lifecycle | No | No | Observe events |

## 2.4 SDK Client (Plugin's Power Tool)

```typescript
client.session.prompt({ path: { id }, body: { noReply: true, parts: [...] } }) // inject context silently
client.session.create/list/compact()  // session management
client.tui.showToast/appendPrompt()   // TUI control
client.find.text/files()              // search codebase
```

---

# PART 3: COMMUNITY PLUGIN ANALYSIS (5 Selected)

## 3.1 opencode-dynamic-context-pruning (DCP) — ⭐719

**Relevance:** Most relevant to context purification. Production-proven, 38 releases.

**Mechanisms:** Auto-dedup, supersede-writes, purge-errors, LLM-driven distill/compress/prune tools, nudge system, token tracking.

**Key lessons:**
- Uses `messages.transform` to modify `part.state.output` in-place ✅
- Separate config (`dcp.jsonc`) — avoids conflicts ✅
- **Disabled for subagents** — confirms subagent limitation ✅
- Protected tools list prevents pruning governance tools ✅
- ⚠️ DCP + iDumb could conflict if both modify same message parts

## 3.2 opencode-background-agents — ⭐55

**Relevance:** Delegation persistence pattern.

**Mechanisms:** `delegate()` → background child session → disk persistence as markdown → `delegation_read/list()`.

**Key lessons:**
- Read-only agents only for background delegation (safety) ✅
- Disk persistence survives compaction/restart ✅
- ⚠️ No governance on background agent behavior

## 3.3 oh-my-opencode — ⭐28.5k (LARGEST)

**Relevance:** Batteries-included. Most real-world validation. Has Ralph Loop + Todo Enforcer.

**Mechanisms:** Agent team (Sisyphus/Prometheus/Oracle/Librarian), 25+ hooks, background agents, LSP/AST tools, context injection, session tools.

**Key lessons:**
- **Ralph Loop validates recursive validation IS achievable** ✅
- **Todo Enforcer validates forcing TODO-first IS achievable** ✅
- Feature sprawl is #1 risk — same problem as v2 ⚠️
- Each feature minimal + disablable = success pattern ✅

## 3.4 opencode-workspace (kdco) — Bundled multi-agent harness

**Relevance:** Orchestration patterns.

**Key lessons:**
- Agent specialization (researcher/planner/coder) improves output ✅
- ALL prompt-based enforcement — no actual enforcement ❌
- Agents drift, nobody catches it ❌
- **This is exactly the gap iDumb fills**

## 3.5 opencode-skillful — ⭐120

**Relevance:** Best skill management. Lazy loading pattern.

**Key lessons:**
- 3-tool pattern (find/use/resource) is clean ✅
- Per-model format rendering (XML for Claude, JSON for GPT) ✅
- On-demand loading saves significant tokens ✅

## 3.6 Synthesis: What's Proven

| Capability | Evidence | Confidence |
|---|---|---|
| `tool.execute.before` blocks via throw | DCP, oh-my-opencode | HIGH |
| `tool.execute.after` modifies output | DCP, type-inject | HIGH |
| `messages.transform` prunes messages | DCP (core) | HIGH |
| `session.compacting` + `context.push()` | Multiple | HIGH |
| Recursive validation loops work | oh-my-opencode Ralph Loop | MEDIUM |
| TODO enforcement works | oh-my-opencode | MEDIUM |
| **Subagent hooks don't fire** | DCP (disabled for subagents), #5894 | **CONFIRMED** |
| Prompt-only enforcement fails under stress | opencode-workspace | HIGH (negative) |

---

# PART 4: CURRENT v2 STATE AUDIT

## 4.1 What Works (Carry Forward)

| Component | File | Evidence |
|---|---|---|
| Tool gate — blocks writes without active task | `hooks/tool-gate.ts` | TRIAL-1 passed 3/4 |
| Compaction anchor injection | `hooks/compaction.ts` | Uses `output.context.push()` correctly |
| TUI-safe file logging | `lib/logging.ts` | Zero `console.log` |
| Anchor scoring + staleness | `schemas/anchor.ts` | Clean algorithm, budget-capped |
| Plugin entry wiring | `index.ts` | All hooks registered correctly |

## 4.2 What Doesn't Work

| Component | Issue | Root Cause |
|---|---|---|
| Delegation tracking (TRIAL-2) | Never implemented | Subagent hooks don't fire (PP-01) |
| Role detection | Race condition → defaults to `meta` (allow-all) | `chat.message` fires AFTER first tool call |
| Session persistence | In-memory only, lost on restart | `persistence.ts` referenced but missing from `src/` |
| `message-transform.ts` | Untested against real SDK format | No real-world validation |
| `system.ts` | Unknown if actually modifies system prompt | Hook may not support system message modification |

## 4.3 What's Bloated / Ghost References

| Item | Issue |
|---|---|
| `schemas/permission.ts`, `config.ts`, `state.ts`, `scan.ts` | In AGENTS.md but **MISSING from src/** |
| `engines/scanner.ts`, `framework-detector.ts` | In AGENTS.md but **MISSING from src/** |
| `tools/init.ts`, `lib/persistence.ts` | In AGENTS.md but **MISSING from src/** |
| `.idumb/` elaborate hierarchy | **Empty** — never populated |
| `session-ses_3ced.md` (92KB) | Session export in project root |
| `.agent/`, `.agents/`, `.claude/`, `.gemini/`, `.planning/`, `.plugin-dev/`, `.qoder/` | ALL empty exploration artifacts |
| TRIAL-TRACKER.md (8 trials) | Only T1 validated. Rest = aspirational |

## 4.4 Honest Assessment

**14 files, ~536 lines of actual code.** AGENTS.md describes a system 10x larger. The gap between docs and implementation is the core problem — false sense of progress while only the tool gate was validated.

**Actual src/ tree:**
```
hooks/   compaction.ts, index.ts, message-transform.ts, system.ts, tool-gate.ts
lib/     index.ts, logging.ts
schemas/ anchor.ts, index.ts
tools/   anchor.ts, index.ts, status.ts, task.ts
index.ts
```

---

# PART 5: PITFALLS REGISTRY

## 5.1 Platform Pitfalls (Design Around — Cannot Fix)

| ID | Pitfall | Severity | Mitigation |
|---|---|---|---|
| **PP-01** | Plugin hooks DO NOT fire for subagent tool calls | CRITICAL | Govern subagents via agent `.md` profiles + skills, not hooks |
| **PP-02** | `chat.message` fires AFTER first tool call — role detection race | HIGH | Default to restricted role (NOT `meta`). Use earliest available hook |
| **PP-03** | Compaction replaces ALL messages — only summary + injected context survives | HIGH | Budget-capped anchor injection + disk persistence for ALL state |
| **PP-04** | No `experimental.text.complete` hook in OpenCode | MEDIUM | Use `tool.execute.after` + system prompt instead |
| **PP-05** | Plugin tools appear in ALL agents unless disabled per-agent | MEDIUM | Max 5 tools. Use descriptions to guide natural selection |
| **PP-06** | Session state is in-memory only — restart loses everything | HIGH | Persist to disk after every mutation. Read from disk on hook entry |
| **PP-07** | `messages.transform` format undocumented | MEDIUM | Follow DCP's patterns (reverse-engineered) |

## 5.2 Design Pitfalls (From v2 Failures)

| ID | Pitfall | Prevention Rule |
|---|---|---|
| **DP-01** | Docs described 10x more than existed (false progress) | **No docs for unimplemented features. Document AFTER tests pass** |
| **DP-02** | 8 trials planned, only 1 validated (feature stacking) | **Each milestone MUST pass stress test before next begins** |
| **DP-03** | "Hooks enforce governance" assumed without testing subagent limit | **Every hypothesis gets a spike test before building on it** |
| **DP-04** | Empty directories created speculatively | **Create directory when first file is written** |
| **DP-05** | Schemas defined but never consumed | **Schema + read consumer + write consumer in same PR** |
| **DP-06** | 10+ tools planned, LLM confused at 3 | **Max 5 custom tools. Each naturally useful** |
| **DP-07** | In-memory Maps + unused persistence module | **State strategy decided ONCE, used everywhere** |

## 5.3 LLM Engineering Pitfalls

| ID | Pitfall | Prevention |
|---|---|---|
| **LP-01** | Agent `.md` body is SYSTEM prompt, not USER prompt | Write as persona: "You are...", "You always...", "You never..." |
| **LP-02** | Irrelevant context injection = noise | Every injection must relate to current task |
| **LP-03** | Too many governance reminders = boilerplate ignored | Inject at compaction + session start only, NOT every message |
| **LP-04** | Validation loops that never terminate | Hard limit: max 3 iterations. Then surface to user |
| **LP-05** | Fake intelligence crumbles under poisoned context | Stress test FIRST with poisoned context, THEN build features |
| **LP-06** | Compaction summary is flat text, not hierarchical | Use clear section headers, not hierarchy attempts |
| **LP-07** | Tools exist but LLM never calls them | Test: "When would you use [tool]?" — if LLM can't answer, description is wrong |

## 5.4 Interaction Pitfalls (Plugin vs Plugin)

| ID | Pitfall | Prevention |
|---|---|---|
| **IP-01** | iDumb + DCP both modifying messages | Detect DCP. Register iDumb's protected tools with DCP |
| **IP-02** | iDumb + GSD/BMAD conflicting governance | Detect frameworks. Act as wrapper, not replacement |
| **IP-03** | iDumb tools polluting other agents | Use self-selecting descriptions. Document per-agent disable |
| **IP-04** | AGENTS.md conflicts with iDumb governance | iDumb's rules are ADDITIVE (ADD), never contradictory (REPLACE) |

---

# PART 6: NON-NEGOTIABLE DEVELOPMENT PRINCIPLES

## 6.1 The DOs

| # | Principle | Rationale | Enforcement |
|---|---|---|---|
| **DO-01** | Test before build | Every hypothesis gets a spike test. No building on assumptions | Spike test result file required before implementation |
| **DO-02** | One micro-milestone at a time | Complete → test → stress-test → THEN next | TODO task list enforced sequentially |
| **DO-03** | Disk persistence for ALL state | In-memory is ephemeral. Restart/compaction/subagents lose it | Every state mutation writes to `.idumb/` on disk |
| **DO-04** | Budget-cap ALL injections | Every context injection has a char budget. Exceed = truncate, never error | Constants at module top |
| **DO-05** | Hook factory pattern | Every hook = function returning hook function. Captured logger + config | Code review check |
| **DO-06** | Graceful degradation everywhere | Every hook wrapped in try/catch. Failure = log + continue, NEVER crash | No bare throws except intentional blocks |
| **DO-07** | Compatibility with DCP, GSD, BMAD | Detect other plugins. Don't conflict. Wrap when possible | Integration test with each |
| **DO-08** | Max 5 custom tools per plugin | LLM tool selection degrades beyond 5 | Enforced at registration |
| **DO-09** | Separate config (`.opencode/idumb.jsonc`) | Don't pollute `opencode.json` | Own config, own schema |
| **DO-10** | Atomic git commits with rationale | Every change = commit with description. Enables audit trail | Git discipline |
| **DO-11** | When creating/modifying schemas — STOP and review impact | Schemas chain. IDs, serials, metadata propagate. Change one → must check all consumers | Mandatory impact review before schema changes |
| **DO-12** | When creating tools/plugins — grep, glob, list first | Understand what exists. Know the group. Ask permission for folder hierarchy | Pre-write codebase scan |
| **DO-13** | Foresee LOC before writing | If module > 200 LOC, plan the split BEFORE writing | Design doc per module |

## 6.2 The DON'Ts

| # | Anti-Pattern | What To Do Instead |
|---|---|---|
| **DONT-01** | `console.log` anywhere | File-based logging via `createLogger()` |
| **DONT-02** | Document unimplemented features | Document AFTER tests pass |
| **DONT-03** | Create empty directories speculatively | Create when first file writes |
| **DONT-04** | Schema without consumer | Schema + read + write consumer in same PR |
| **DONT-05** | Force LLM to use tools via system prompt | Make tools naturally useful via description |
| **DONT-06** | Inject governance into every message | Inject at: session start, compaction, drift detection ONLY |
| **DONT-07** | Build features depending on subagent hooks | They don't fire. Use agent profiles + skills |
| **DONT-08** | Treat LLM compliance as guaranteed | Design for failure: validation loops, disk state, evidence |
| **DONT-09** | Build horizontal before vertical passes stress | Depth first: one mechanism bulletproof, then expand |
| **DONT-10** | Mix plugin code with project code | Plugin = `.opencode/plugins/`. Clear boundary |
| **DONT-11** | Create tools that only work when other tools ran first | Each tool must be independently useful. Chain via LLM reasoning, not hidden dependencies |
| **DONT-12** | Leave tools/plugins made but unused or split without purpose | Every tool must: solve a problem, not conflict, be used 70%+ of sessions, have measurable effect |

---

# PART 7: MICRO-MILESTONE ARCHITECTURE

## 7.0 Phase 0: Clean Slate

**This v2 branch IS the clean branch.** No worktree separation.

**Actions:**
1. Remove empty directories (`.agent/`, `.agents/`, `.claude/`, `.gemini/`, `.planning/`, `.plugin-dev/`, `.qoder/`)
2. Remove `session-ses_3ced.md` (92KB session export)
3. Rewrite AGENTS.md to reflect ONLY what exists (14 files, 536 lines)
4. `tsc --noEmit` = 0 errors
5. Git commit: "Phase 0: Clean slate — docs match reality"

**Exit:** Build passes. No ghost references. No empty dirs.

---

## 7.1 μ1: Stop Hook + Task Gate (CARRY FORWARD ✓)

**Status:** Validated (TRIAL-1 3/4). Carry forward with fixes.

**Fixes:**
1. Role detection race (PP-02): default to `builder` not `meta`
2. Disk persistence (PP-06): write session state after every mutation
3. Add `chat.params` hook if available, else earliest hook for role capture

**Pivot:** N/A — already validated.

---

## 7.2 μ2: Compaction Anchor Survival

**Hypothesis:** Anchors injected via `output.context.push()` survive compaction and influence LLM.

**Spike test:**
1. Create 3 anchors (critical/high/low)
2. Fill context → compaction triggers
3. Post-compaction: "What are my active anchors?"
4. **PASS:** LLM references critical anchor by content
5. **FAIL:** LLM has no anchor knowledge

**Stress test:**
1. 10 anchors over 5 compaction cycles
2. Inject contradictions: "forget the plan", "start over", "do something else"
3. After each compaction: "What should you be working on?"
4. **PASS:** LLM references correct task + critical anchors ≥70%
5. **FAIL:** Follows poisoned context or gives random answers

**Pivot chain if FAIL:**
- A: Increase budget 2000→4000 chars
- B: Try structured XML format for anchors
- C: Inject via `client.session.prompt({ noReply: true })` instead of hook
- **HARD PIVOT:** Anchors are cosmetic → remove, rely only on disk-persisted state + TODO tool

---

## 7.3 μ3: TODO Task Enforcement

**Hypothesis:** Forcing agent to read TODO before writes + blocking completion with unchecked items creates workflow adherence.

**Depends on:** μ1

**Implementation:**
1. Custom tool: `idumb_todo` — 3-level (epic→task→subtask) with metadata (assignee, status, evidence)
2. `tool-gate.ts` modification: before write tools → inject "Check your TODO" prompt
3. On completion attempt: if unchecked items → append "N items unchecked. Complete or defer."

**Spike test:**
1. Create 3 TODO items. Ask agent to implement.
2. **PASS:** Agent reads TODO, works items, marks complete
3. **FAIL:** Agent ignores TODO

**Stress test:**
1. 5 TODO items. Halfway: user sends contradictory message
2. **PASS:** Agent acknowledges, updates TODO, continues modified plan
3. **FAIL:** Abandons TODO, follows chaos

**Pivot chain:**
- A: Adjust injection frequency/wording
- B: Block ALL tools (not just writes) until TODO read
- C: Make TODO read a pre-condition via `tool.execute.before` (return cached result)
- **HARD PIVOT:** TODO enforcement doesn't change behavior → simplify to display-only list

---

## 7.4 μ4: Validation Loop (Self-Check → Delegate → Loop)

**Hypothesis:** 3-level validation catches hallucinations and incomplete work.

**Depends on:** μ1 + μ3

**Implementation:**
1. On completion attempt: inject checklist from TODO
2. Agent self-checks with evidence per item
3. If gaps: delegate to `idumb-validator` subagent (governed via `.md` profile, NOT hooks — PP-01)
4. Validator returns evidence-based gap report
5. Max 3 loops then surface to user

**Critical constraint:** Validator subagent governed via agent `.md` profile only. Hooks won't fire (PP-01).

**Spike test:**
1. Task with known edge case. Does agent catch it?
2. **PASS:** Catches edge case in validation
3. **FAIL:** Marks complete without catching

**Pivot chain:**
- A: More specific validator prompt
- B: Inject checklist via `client.session.prompt()` instead of system prompt
- C: Foreground subagent (blocks main) instead of background
- **HARD PIVOT:** Validation loops don't improve quality → single self-check + user confirmation

---

## 7.5 μ5: Context Drift Detection + Recovery

**Hypothesis:** Monitoring for drift signals (failure rate, topic change, contradictions) enables auto-recovery.

**Depends on:** μ2 + μ3

**Implementation:**
1. `tool.execute.after`: track failure rate per session
2. If >30% failures in last 10 calls: flag drift
3. Inject: "DRIFT DETECTED: X/10 recent tools failed. Review approach."
4. If continues: auto-trigger compaction with enriched anchors

**Pivot chain:**
- A: Adjust thresholds
- B: Add topic-change detection via message similarity
- **HARD PIVOT:** Auto-detection too noisy → manual `/idumb drift-check` command

---

## 7.6 μ6: Meta-Builder (Init + Agent Creation)

**Depends on:** ALL previous milestones proven stable.

**This is the entry point — only built when core mechanisms are proven.**

**Implementation:**
1. `idumb-init` command: codebase scan → `.idumb/config.json`
2. Detect frameworks (GSD, BMAD) → configure as wrapper
3. Create agent `.md` files in `.opencode/agents/`
4. Create commands in `.opencode/commands/`
5. Set up skills in `.opencode/skills/`
6. Greeting flow: detect → inform → suggest → ask permission → execute

**Why last:** Init creates configuration that all mechanisms consume. Building init first = building on unvalidated assumptions (DP-02).

---

## 7.7 Dependency Graph

```
μ1 (Stop Hook) ✓ ──┐
                    ├──→ μ3 (TODO) ──→ μ4 (Validation Loop)
μ2 (Compaction) ────┤                        │
                    ├──→ μ5 (Drift) ─────────┤
                    │                        ▼
                    └──────────────→ μ6 (Meta-Builder/Init)
```

## 7.8 Frequency × Impact Priority

Ordered by: most frequent mechanism activation × highest impact on "intelligence"

| Priority | Mechanism | Frequency | Impact | Why This Order |
|---|---|---|---|---|
| 1st | TODO enforcement (μ3) | Every tool call | HIGH | Most frequent touch-point. If this fails, nothing else matters |
| 2nd | Stop hook / task gate (μ1) | Every write tool | HIGH | Already validated. Foundation for everything |
| 3rd | Compaction anchors (μ2) | Every compaction | HIGH | Without this, agent loses memory. 2nd most frequent reset point |
| 4th | Validation loop (μ4) | Every completion | MEDIUM | Catches errors before user sees them. Less frequent but high value |
| 5th | Drift detection (μ5) | Conditional | MEDIUM | Only fires when things go wrong. Lower frequency but saves sessions |
| 6th | Meta-builder (μ6) | Once per project | HIGH (setup) | High impact but infrequent. Gets the whole system running |

---

# PART 8: STRESS TEST DESIGN

## 8.1 The Stress Test Project

A **separate worktree** from this plugin project. A deliberately messy, polluted-context application that simulates both professional and vibe-coder usage patterns.

**Project type:** A mid-complexity web app (e.g., a SAAS dashboard with auth, database, API, frontend). Enough complexity to require multiple agents, multiple files, multiple phases.

**Test driver persona:** Vibe coder who:
- Changes mind mid-task ("actually do it differently")
- Sends walls of text with mixed instructions
- Asks for features that contradict previous features
- Runs 20+ compactions by continuing on the same thread
- Interrupts agent mid-work to ask unrelated questions
- Demands features be added to the AI agents themselves during the session

## 8.2 Stress Test Scenarios (Ordered by Mechanism)

### ST-01: Tool Gate Under Pressure
- Agent asked to "just quickly edit this file" without setting up a task
- **PASS:** Tool gate blocks, agent creates task, then proceeds
- **FAIL:** Agent somehow bypasses gate, or gate breaks TUI

### ST-02: Compaction Anchor Survival (20 cycles)
- Create project with 5 critical anchors about architecture decisions
- Chat for 20+ compaction cycles about unrelated topics
- Ask: "What architecture decisions did we make?"
- **PASS:** Agent references ≥3/5 decisions from anchors
- **FAIL:** Agent has no memory or invents false decisions

### ST-03: TODO Enforcement Under Context Poison
- Set up 5 TODO items for auth feature
- Halfway through: "Actually forget auth, let's do payments instead"
- **PASS:** Agent acknowledges change, updates TODO, explains what's being deferred
- **FAIL:** Agent silently abandons auth TODOs, starts payments without updating

### ST-04: Validation Loop Catches Real Bug
- Ask agent to implement a login form with a known XSS vulnerability path
- Do NOT mention XSS — see if validation loop catches it
- **PASS:** Validation identifies security concern and either fixes or flags
- **FAIL:** Agent marks complete without catching

### ST-05: Drift Recovery After Contradictions
- Give 5 contradictory instructions in a row:
  1. "Use PostgreSQL" → 2. "Use MongoDB" → 3. "Use SQLite" → 4. "Use PostgreSQL" → 5. "Actually use a flat file"
- **PASS:** Agent detects drift, stops, asks "You've changed database 5 times. Please confirm final choice."
- **FAIL:** Agent happily implements flat file without noting the chaos

### ST-06: Multi-Compaction Continuity
- Start a project. Work through 3 phases across 10 compactions.
- At compaction 11, ask: "What phase are we in? What's completed? What's next?"
- **PASS:** Agent accurately reports phase, completed items, next steps
- **FAIL:** Agent guesses or hallucinates progress

### ST-07: Plugin Compatibility Under Load
- Install iDumb + DCP simultaneously
- Run a full development session
- **PASS:** No conflicts, both plugins function, no TUI breaks
- **FAIL:** Message corruption, TUI errors, or one plugin breaking the other

### ST-08: The "Vibe Coder Nuclear" Test
- In ONE session:
  1. Start: "Build me a todo app"
  2. 5 messages later: "Actually make it a social media app"
  3. 3 messages later: "Add blockchain"
  4. 2 messages later: "Remove blockchain, add AI"
  5. Compact. "What are we building?"
  6. 5 more messages of random feature requests
  7. Compact. "Is the code coherent?"
  8. "Actually let's go back to the todo app"
  9. Compact. "Show me the TODO list of what's done"
- **PASS:** Agent tracks changes through TODO, marks abandoned items, knows current state
- **FAIL:** Agent is completely lost, gives wrong project description

## 8.3 Measurement Criteria

| Metric | How to Measure | Target |
|---|---|---|
| Anchor retention rate | Post-compaction, how many injected anchors does LLM reference? | ≥70% of critical anchors |
| TODO compliance rate | Of N tool calls, how many were preceded by TODO check? | ≥80% of write calls |
| Drift detection accuracy | Of N drift scenarios, how many correctly flagged? | ≥60% (high bar for auto-detection) |
| Validation catch rate | Of N planted bugs, how many caught by validation loop? | ≥50% (realistic for LLM) |
| TUI stability | Sessions without TUI crash/corruption | 100% (non-negotiable) |
| Context coherence post-compact | Can agent correctly describe current project state? | ≥70% accuracy after each compaction |

---

# PART 9: SOURCE-OF-TRUTH ARCHITECTURE

## 9.1 Entity Definitions (Properties, Classes, Hierarchy)

### Entity: Anchor
```
Anchor {
  id: string (uuid)
  type: "decision" | "context" | "checkpoint" | "error" | "attention"
  priority: "critical" | "high" | "medium" | "low"
  content: string (max 2000 chars)
  createdAt: number (Date.now())
  modifiedAt: number
  sessionId: string
  parentId?: string (chains anchors to parent decisions)
}
```
- **Staleness:** >48h without modification → deprioritized (0.25× score)
- **Purging:** Stale non-critical anchors excluded from compaction injection
- **Consumers:** compaction hook (injection), anchor tool (CRUD), status tool (display)

### Entity: Task (3-Level TODO)
```
TaskEpic {
  id: string
  name: string
  status: "planned" | "active" | "completed" | "deferred" | "abandoned"
  createdAt: number
  modifiedAt: number
  tasks: Task[]
}

Task {
  id: string
  epicId: string
  name: string
  status: "planned" | "active" | "completed" | "blocked" | "deferred"
  assignee?: string (agent name)
  evidence?: string (proof of completion)
  subtasks: Subtask[]
}

Subtask {
  id: string
  taskId: string
  name: string
  status: "pending" | "done" | "skipped"
  toolUsed?: string (which tool completed this)
  timestamp?: number
}
```
- **Hierarchy:** Epic → Task → Subtask (3 levels max)
- **Metadata enforcement:** Every task MUST have assignee when active. Evidence when completed.
- **Staleness:** Tasks active >4h without subtask progress → flagged
- **Consumers:** TODO tool (CRUD), tool-gate (check before writes), validation loop (checklist source)

### Entity: Session State
```
SessionState {
  id: string (session ID from OpenCode)
  startedAt: number
  lastActivity: number
  activeTaskId?: string
  anchors: string[] (anchor IDs)
  toolCallCount: number
  toolFailureCount: number
  compactionCount: number
  driftFlags: number
  lastValidation?: { timestamp: number, gaps: number, passed: boolean }
}
```
- **Persistence:** Written to `.idumb/sessions/{id}.json` after every mutation
- **Read:** On every hook entry, read from disk (not in-memory cache)
- **Staleness:** Sessions >24h without activity → archived

### Entity: Config
```
Config {
  version: string
  governance: {
    mode: "strict" | "balanced" | "relaxed"
    maxValidationLoops: 3
    maxDelegationDepth: 3
    todoEnforcement: boolean
    anchorBudgetChars: 2000
    driftThreshold: 0.3
  }
  compatibility: {
    detectDCP: boolean
    detectGSD: boolean
    detectBMAD: boolean
    protectedTools: string[]
  }
  logging: {
    level: "debug" | "info" | "warn" | "error"
    directory: string
  }
}
```
- **Location:** `.opencode/idumb.jsonc` (project) or `~/.config/opencode/idumb.jsonc` (global)
- **Consumers:** Every hook reads config on entry. Config changes require OpenCode restart.

## 9.2 Hierarchy and Relationships

```
Config (singleton, read by all)
  │
  ├── SessionState (1 per OpenCode session)
  │     ├── has 0..N Anchors (context preservation)
  │     ├── has 0..1 active TaskEpic (current work)
  │     │     ├── has 1..N Tasks
  │     │     │     └── has 0..N Subtasks
  │     │     └── linked to Anchors (decisions about this epic)
  │     ├── tracks tool call metrics (for drift detection)
  │     └── tracks compaction count (for anchor management)
  │
  └── .idumb/ (disk persistence root)
        ├── config.json
        ├── sessions/{sessionId}.json
        └── logs/{date}.log
```

## 9.3 Chaining and Watch Properties

| Property | Watched By | Trigger |
|---|---|---|
| `anchor.modifiedAt` | Compaction hook | If stale → deprioritize in injection |
| `task.status` → "completed" | Validation loop | Requires `evidence` field populated |
| `task.status` → "active" | Tool gate | Allows write tools to proceed |
| `session.toolFailureCount / toolCallCount` | Drift detector | If ratio >0.3 → flag drift |
| `session.compactionCount` | Anchor manager | Prune low-priority anchors when >5 compactions |
| `session.lastActivity` | Staleness checker | If >24h → archive session |
| `subtask.timestamp` | Task staleness | If active task has no subtask progress >4h → flag |

## 9.4 Chain-Breaking Rules

When a chain breaks, the following forced actions occur:

| Break Condition | Forced Action |
|---|---|
| Task marked "completed" but has subtasks in "pending" | Block completion. Inject: "Subtasks X, Y still pending." |
| Epic has no active tasks but epic is "active" | Inject: "Epic has no active work. Create tasks or defer." |
| Anchor references a task ID that no longer exists | Purge anchor (orphan cleanup) |
| Session references task epic that was abandoned | Clear session's activeTaskId. Inject: "Previous work was abandoned." |
| Config version mismatch with session state version | Force re-init. Inject: "Config updated. Re-reading." |

## 9.5 The `.idumb/` Directory (Created On Demand — NEVER Speculative)

```
.idumb/                      # Created by first write operation
├── config.json              # Created by idumb-init or first tool use
├── sessions/                # Created when first session tracked
│   └── {sessionId}.json     # One per tracked session
└── logs/                    # Created by logger on first log
    └── {date}.log           # Daily rotation
```

**Rule:** NO directory created until first file needs to be written to it.
**Rule:** ALL paths derived from `directory` param in plugin context + `.idumb/`.

---

# PART 10: SOT MECHANISMS — HOW "INTELLIGENCE" IS MANUFACTURED

## 10.1 The Hierarchy of What Controls What

```
Level 0: Platform (OpenCode)
  ├── Manages: sessions, compaction, tool execution, agent switching, TUI
  ├── We CANNOT change: compaction algorithm, subagent hook behavior, tool execution order
  └── We CAN intercept: tool.execute.before/after, session.compacting, messages.transform

Level 1: iDumb Plugin (our code)
  ├── Hooks: intercept tool calls, inject compaction context, transform messages
  ├── Tools: idumb_todo, idumb_anchor, idumb_status (max 5)
  ├── State: .idumb/ on disk, read on every hook entry
  └── Config: .opencode/idumb.jsonc

Level 2: Agent Profiles (our configuration)
  ├── .opencode/agents/*.md — system prompts defining agent behavior
  ├── .opencode/commands/*.md — slash commands for workflows
  ├── .opencode/skills/SKILL.md — on-demand knowledge injection
  └── AGENTS.md — project-wide rules (additive to user's existing rules)

Level 3: User's Project
  ├── Their codebase, their AGENTS.md, their opencode.json
  ├── Other plugins (DCP, GSD, BMAD, oh-my-opencode)
  └── Their conversation behavior (professional vs vibe coder)
```

**The golden rule:** Level 1 (our hooks) enforces mechanics deterministically. Level 2 (our agents/prompts) guides behavior probabilistically. Level 3 (user) is uncontrollable — we design for worst case.

## 10.2 The 5 SOT Mechanisms (Ordered by Activation Frequency)

### SOT-1: Tool Gate (Every Tool Call)
- **What:** `tool.execute.before` intercepts every tool call
- **Activation:** Deterministic — fires on every tool invocation
- **Intelligence produced:** Agent CANNOT write without active task. Agent CANNOT complete without evidence
- **Why it works:** It's a hard block (throw Error). LLM has no choice but to comply
- **Pitfall guard:** PP-01 (subagents bypass), PP-02 (role detection race)

### SOT-2: TODO State (Every Task Transition)
- **What:** `idumb_todo` tool with 3-level hierarchy, persisted to disk
- **Activation:** Agent reads before writes (enforced by tool gate). Agent writes evidence on completion
- **Intelligence produced:** Agent always knows what to do next. Work is traceable. Abandonment is explicit
- **Why it works:** State persists to disk. Survives compaction. LLM can always re-read current state
- **Pitfall guard:** DP-02 (stacking), LP-03 (boilerplate injection)

### SOT-3: Compaction Anchors (Every Compaction)
- **What:** `session.compacting` hook injects budget-capped anchors into summary
- **Activation:** On every compaction (auto ~75% capacity or manual /compact)
- **Intelligence produced:** Critical decisions survive memory wipe. Agent "remembers" what matters
- **Why it works:** `output.context.push()` is the ONLY way to persist through compaction
- **Pitfall guard:** PP-03 (everything else lost), LP-06 (flat text, not hierarchy)

### SOT-4: Validation Loop (Every Completion Attempt)
- **What:** On stop, inject self-check checklist → optionally delegate to validator → loop max 3x
- **Activation:** Every time agent attempts to finish a task
- **Intelligence produced:** Agent's "expert judgment" is actually a forced re-examination against evidence
- **Why it works:** Even if first pass misses something, the loop catches it
- **Pitfall guard:** LP-04 (infinite loops → max 3), LP-05 (fake intelligence → stress tested)

### SOT-5: Drift Detection (Conditional)
- **What:** Track tool failure rate. Flag when anomalous. Inject warning
- **Activation:** Only when things go wrong (failure rate > threshold)
- **Intelligence produced:** Agent "notices" when something is off and pauses to reconsider
- **Why it works:** Quantitative signal (failure count) triggers qualitative response (reconsider)
- **Pitfall guard:** LP-02 (irrelevant injection → only fires when real signal detected)

## 10.3 How These Chain Together

```
User sends message
  │
  ├─[SOT-1: Tool Gate]─── Agent calls tool → Is there active task? → No → BLOCK
  │                                          → Yes → Allow
  │
  ├─[SOT-2: TODO State]── Agent reads TODO → knows current task
  │                        Agent completes subtask → writes evidence
  │                        Agent finishes epic → triggers validation
  │
  ├─[SOT-4: Validation]── Agent says "I'm done" → Inject checklist from TODO
  │                        Self-check finds gap → Loop (max 3)
  │                        No gaps → Complete
  │
  ├─[SOT-5: Drift]─────── Tool failures spike → Inject warning
  │                        Agent reconsiders approach
  │
  └─[SOT-3: Compaction]── Context fills up → Compaction triggers
                           Anchors injected → Active task + critical decisions survive
                           Agent resumes with: system prompt + summary + anchors + disk state
```

---

# PART 11: RATIONALE FOR PIVOTAL POINT 1 (Plugin Route)

## 11.1 Why Plugin (Not Standalone Tool, Not Fork)

| Route | Pros | Cons | Verdict |
|---|---|---|---|
| **OpenCode Plugin** | Full hook access. In-process. SDK client. Custom tools. No separate process | Subagent hooks don't fire. Tool limit. Must not break TUI | **CHOSEN** — maximum manipulation surface within the platform |
| **Standalone CLI** | Full control. No platform constraints | No hook access. Cannot intercept tool calls. Would need to wrap OpenCode entirely | Rejected — reinventing the wheel |
| **OpenCode Fork** | Total control over everything | Maintenance nightmare. Can't benefit from upstream updates | Rejected — unsustainable |
| **MCP Server** | Separate process. Full tool control | Cannot intercept tool calls. Cannot inject compaction context. No hook access | Rejected — insufficient manipulation surface |

## 11.2 What the Plugin CAN Do (Sufficient for SOT-1 through SOT-5)

- ✅ Block tool calls (SOT-1: tool gate)
- ✅ Register custom tools (SOT-2: TODO tool, anchor tool)
- ✅ Inject compaction context (SOT-3: anchors)
- ✅ Modify messages in-flight (context pruning, prompt enhancement)
- ✅ Read/write files (disk persistence for all state)
- ✅ Use SDK client (session management, TUI control, context injection)
- ✅ Observe session lifecycle events

## 11.3 What the Plugin CANNOT Do (Workarounds Documented)

| Limitation | Impact | Workaround | Risk Level |
|---|---|---|---|
| Cannot hook subagent tool calls | Subagent governance impossible via hooks | Govern via agent `.md` profiles + skills | MEDIUM — depends on LLM prompt compliance |
| Cannot modify the final LLM text output | Cannot post-process assistant messages | Use `tool.execute.after` to enrich tool results instead | LOW — indirect but effective |
| Cannot trigger slash commands programmatically | Cannot auto-run `/compact` from plugin code | Use `client.session.compact()` via SDK (if available) or inject suggestion | LOW — SDK may cover this |
| Cannot guarantee LLM reads injected context | Compaction injection may be ignored | Budget-cap to ensure prominence. Stress test to verify | MEDIUM — fundamental LLM limitation |

## 11.4 TUI Safety Assessment

| Scenario | Risk | Mitigation |
|---|---|---|
| Plugin throws in hook | TUI crash | Every hook wrapped in try/catch. Only intentional blocks throw |
| Plugin injects too much text | TUI slowdown/overflow | Budget caps on all injections (2000 chars max) |
| Plugin creates too many tools | TUI tool menu cluttered | Max 5 tools. Self-selecting descriptions |
| Plugin modifies messages incorrectly | Garbled chat display | Defensive type-checking on all message manipulation. Follow DCP patterns |
| Plugin writes to stdout/stderr | TUI corruption | **ZERO console.log. File-based logging ONLY** |

**SOT Rule #2 applies:** If TUI breaks for DISPLAY purposes → use local browser UI. If TUI breaks for AGENT FUNCTIONALITY (next turn can't follow) → THIS IS A REAL PROBLEM → workaround or pivot.

---

# PART 12: PROJECT-START PROPOSAL

## 12.1 Immediate Actions (This Session)

1. ✅ This document created and reviewed
2. Clean Phase 0 (remove ghost files, empty dirs, rewrite AGENTS.md)
3. Verify `tsc --noEmit` passes
4. Git commit: "Phase 0: Clean slate"

## 12.2 Next Session: μ1 Fixes + μ2 Spike Test

1. Fix role detection race (PP-02) — change default from `meta` to `builder`
2. Add disk persistence to tool-gate session state
3. **Spike test μ2:** Create 3 anchors → trigger compaction → verify survival
4. Document spike test results in `SPIKE-RESULTS.md` (ONLY after test runs)

## 12.3 Following Sessions (Sequential, Not Parallel)

| Session | Focus | Exit Criteria |
|---|---|---|
| 3 | μ2 stress test (5+ compaction cycles with poisoned context) | Anchor retention ≥70% OR pivot documented |
| 4 | μ3 TODO tool implementation + spike test | Agent reads TODO before writes ≥80% of the time |
| 5 | μ3 stress test (contradictory user messages) | TODO compliance under poison ≥60% OR pivot documented |
| 6 | μ4 validation loop spike test | Agent catches planted bug ≥50% of the time |
| 7 | μ5 drift detection spike | Drift correctly flagged ≥60% OR pivot documented |
| 8 | Integration stress test (ST-07, ST-08) | All mechanisms work together. TUI stable. 100% |
| 9+ | μ6 meta-builder (ONLY if all above pass) | Init creates working config for test project |

## 12.4 File Structure Target (Post Phase 0)

```
v2/
├── src/
│   ├── index.ts                # Plugin entry
│   ├── hooks/
│   │   ├── index.ts            # Barrel exports
│   │   ├── tool-gate.ts        # μ1: Stop hook
│   │   ├── compaction.ts       # μ2: Anchor injection
│   │   ├── message-transform.ts # Context pruning (DCP-pattern)
│   │   └── system.ts           # System prompt governance
│   ├── lib/
│   │   ├── index.ts
│   │   ├── logging.ts          # TUI-safe file logging
│   │   └── persistence.ts      # Disk I/O (to be created when needed)
│   ├── schemas/
│   │   ├── index.ts
│   │   └── anchor.ts           # Anchor types + scoring
│   └── tools/
│       ├── index.ts
│       ├── anchor.ts           # Anchor CRUD
│       ├── status.ts           # Read-only status
│       └── task.ts             # Active task management
├── tests/
│   └── (created per milestone, AFTER implementation)
├── STRATEGIC-PLANNING-PROMPT.md # THIS FILE (SOT for planning)
├── AGENTS.md                    # Rewritten to match reality
├── package.json
└── tsconfig.json
```

**Everything else removed.** No GAP-ANALYSIS.md (superseded by this doc). No TRIAL-TRACKER.md (superseded by milestones here). No CHANGELOG.md (use git log). No empty directories.

---

# PART 13: CHECKLIST FOR EVERY FUTURE AI AGENT SESSION

Before doing ANY work on iDumb, the agent MUST:

- [ ] Read this document (STRATEGIC-PLANNING-PROMPT.md)
- [ ] Check which micro-milestone is current (check TODO/task state)
- [ ] Verify `tsc --noEmit` passes before starting
- [ ] Understand which pitfalls apply to the current task (Part 5)
- [ ] Know the DO/DONT that applies (Part 6)
- [ ] Know the pivot criteria for the current milestone (Part 7)
- [ ] After ANY code change: verify `tsc --noEmit` still passes
- [ ] After ANY feature addition: run relevant stress test scenario (Part 8)
- [ ] NEVER document features that don't exist yet (DP-01)
- [ ] NEVER create empty directories (DP-04)
- [ ] NEVER add more than 5 custom tools (DO-08)
- [ ] When touching schemas: STOP and review all consumers (DO-11)
- [ ] When creating files: grep/glob first, understand the group, ask about folder hierarchy (DO-12)

---

*End of Strategic Planning Prompt. This document is the source of truth for all iDumb development.*
