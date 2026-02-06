# iDumb Meta Framework — Strategic Reset Synthesis

**Date:** 2026-02-06
**Status:** RESEARCH COMPLETE → AWAITING USER REVIEW
**Scope:** Full reset — from concept clarification through micro-milestone design

---

## Table of Contents

1. [Platform Concept Matrix (OpenCode vs Claude Code)](#1-platform-concept-matrix)
2. [Community Plugin Deep Analysis (5 plugins)](#2-community-plugin-analysis)
3. [Current v2 Codebase Audit](#3-current-codebase-audit)
4. [DOs, DON'Ts, Principles, Pitfalls](#4-dos-donts-principles-pitfalls)
5. [Success Criteria for Plugin Development](#5-success-criteria)
6. [Micro-Milestones with Pivot Points](#6-micro-milestones)
7. [Stress Test Design](#7-stress-test-design)
8. [Project Restart Proposal](#8-project-restart-proposal)

---

## 1. Platform Concept Matrix

### 1.1 OpenCode vs Claude Code — Concept-by-Concept

| # | Concept | OpenCode | Claude Code | Notes |
|---|---------|----------|-------------|-------|
| 1 | **Agents (primary)** | `Build`, `Plan` — user-facing, Tab to switch. Defined in `opencode.json` or `.opencode/agents/*.md` | Primary agent (single) — the main Claude instance | OC has multiple primary agents; CC has one |
| 2 | **Agents (subagent)** | `General`, `Explore` — invoked via `@mention` or `Task` tool. Hidden option available. | Subagents via `task` tool — spawns child sessions | Both use Task tool for delegation |
| 3 | **Orchestrator** | No built-in orchestrator — user or primary agent decides. Plugin can intercept via `tool.execute.before` on Task tool | No built-in orchestrator — same pattern | Both rely on LLM reasoning for orchestration |
| 4 | **Modes/Roles** | Agent `mode`: `primary`, `subagent`, `all`. No "role" concept natively | No explicit modes — agent is always primary unless spawned as subagent | OC's mode is about invocation, not behavior |
| 5 | **Permissions** | Per-agent: `allow`/`ask`/`deny` for tools. Glob patterns. Per-bash-command. `permission.task` controls delegation | Per-tool: allow/deny. Simpler model | OC is more granular |
| 6 | **Rules/System Instructions** | `AGENTS.md` (project + global), `instructions` in config, Claude Code compat (`CLAUDE.md`) | `CLAUDE.md` (project + global `~/.claude/CLAUDE.md`) | Both support project + global rules |
| 7 | **System Prompts** | Built-in per agent + `prompt` config option pointing to file. `experimental.chat.system.transform` hook | Built-in. No hook equivalent | OC allows system prompt modification via plugin |
| 8 | **Output Style** | No native concept — controlled via agent prompt | No native concept — controlled via prompt | Must be injected via system prompt or rules |
| 9 | **Commands** | `.opencode/commands/*.md` — slash commands in TUI. Frontmatter config | `.claude/commands/*.md` — slash commands | Nearly identical format |
| 10 | **Prompts** | Agent `prompt` config → file reference | System prompt in `CLAUDE.md` + command prompts | Different mechanisms |
| 11 | **Workflows** | No native concept — commands can chain via plugins (subtask2 pattern) | No native concept — same limitation | Plugin opportunity |
| 12 | **Tools (built-in)** | read, write, edit, bash, glob, grep, task, todoread, todowrite, webfetch, websearch, codesearch | Read, Write, Edit, Bash, Task, TodoRead, TodoWrite, WebSearch, etc. | Very similar tool sets |
| 13 | **Tools (custom)** | `.opencode/tools/*.ts` — JS/TS functions with Zod args. Also via plugins | Not natively extensible — MCP servers only | **OC advantage**: first-class custom tools |
| 14 | **Skills** | `.opencode/skills/*/SKILL.md` — lazy-loaded prompt libraries | Not native — community added | OC has built-in skill system |
| 15 | **Hooks** | 15+ hook points (see §1.2). Plugin-based. All hooks run in sequence | JSON-configured hooks: PreToolUse, PostToolUse, UserPromptSubmit, PreCompact, Stop, TodoRead, TodoWrite | OC has more hooks, CC hooks are simpler |
| 16 | **Plugins** | `.opencode/plugins/*.ts` or npm packages. Full JS/TS with SDK access | Not native — community wrappers only | **OC advantage**: first-class plugin system |
| 17 | **Custom (advanced)** | Plugins can register tools + hooks + listen to events + modify messages + inject system prompts + show toasts | Limited to hook JSON config + MCP servers | OC is vastly more extensible |

### 1.2 OpenCode Hook Lifecycle — Complete Map

```
SESSION START
│
├─ Plugin load (factory function called with ctx)
│  ctx = { project, client, $, directory, worktree }
│
├─ event: session.created
│
├─ [User sends message]
│  │
│  ├─ chat.message (input, output)                    ← CAN BLOCK (throw Error)
│  │   input: { sessionID }
│  │   output: { parts: Part[] }
│  │
│  ├─ experimental.chat.system.transform (input, output) ← Modify system prompt
│  │   output: { system: string[] }
│  │
│  ├─ experimental.chat.messages.transform (input, output) ← Modify messages
│  │   output: { messages: { info: MessageInfo, parts: Part[] }[] }
│  │   ⚠️ CANNOT block. Messages have SDK format, NOT Anthropic format.
│  │
│  ├─ [LLM generates response, decides to use tool]
│  │  │
│  │  ├─ tool.execute.before (input, output)           ← CAN BLOCK (throw Error)
│  │  │   input: { tool, sessionID, callID }
│  │  │   output: { args: Record<string, any> }
│  │  │   ⚠️ Does NOT fire for subagent tool calls (GitHub #5894)
│  │  │
│  │  ├─ [Tool executes]
│  │  │
│  │  ├─ tool.execute.after (input, output)
│  │  │   input: { tool, sessionID, callID }
│  │  │   output: { title, output, metadata }
│  │  │
│  │  └─ [LLM decides: more tools or respond]
│  │
│  ├─ event: message.updated / message.part.updated
│  │
│  └─ event: session.idle                              ← Session finished responding
│
├─ [Compaction triggered (auto or manual)]
│  │
│  ├─ experimental.session.compacting (input, output)
│  │   input: { sessionID }
│  │   output: { context: string[], prompt?: string }
│  │   ⚠️ If output.prompt set, replaces ENTIRE compaction prompt
│  │   ⚠️ After compaction, LLM sees ONLY the summary + context
│  │
│  └─ event: session.compacted
│
├─ [TUI interactions]
│  ├─ tui.command.execute                              ← Intercept slash commands
│  ├─ tui.prompt.append                                ← Modify TUI prompt
│  └─ tui.toast.show                                   ← Show notifications
│
└─ event: session.deleted
```

### 1.3 What LLMs See — Message Window Anatomy

```
┌─────────────────────────────────────────────┐
│ SYSTEM PROMPT                                │
│ (built-in + AGENTS.md + skills + system.transform) │
├─────────────────────────────────────────────┤
│ MESSAGE HISTORY (after messages.transform)   │
│                                              │
│ [compaction summary — if compacted]          │
│ [user message 1]                             │
│ [assistant message 1 + tool calls/results]   │
│ [user message 2]                             │
│ [assistant message 2 + tool calls/results]   │
│ ...                                          │
│ [user message N] ← MOST RECENT              │
├─────────────────────────────────────────────┤
│ LLM responds here                            │
└─────────────────────────────────────────────┘

KEY INSIGHT: LLMs pay most attention to:
1. System prompt (always present, highest weight)
2. Last user message (recency bias)
3. First message after compaction summary (primacy after reset)
4. Tool results (structured, easy to parse)

LLMs pay LEAST attention to:
1. Middle of long conversations (lost in noise)
2. Old tool results (superseded by newer ones)
3. Verbose/unstructured text in middle turns
```

### 1.4 Compaction — What Survives and What Dies

```
BEFORE COMPACTION:
  System prompt + 50 messages + tool results + anchors

COMPACTION FIRES:
  1. experimental.session.compacting hook runs
     → Plugin injects context[] and/or replaces prompt
  2. LLM generates summary of conversation
  3. Summary becomes the FIRST message in new context

AFTER COMPACTION:
  System prompt + [compaction summary + injected context] + NEW messages

WHAT DIES:
  - All individual messages (replaced by summary)
  - All tool call/result details
  - All inline context (only summary survives)
  - Any message-transform injections (they were in old messages)

WHAT SURVIVES:
  - System prompt (always present)
  - AGENTS.md / rules (always injected)
  - Skills (re-injected if referenced)
  - Whatever plugin injected via compacting hook context[]
  - Whatever the LLM chose to include in its summary
```

---

## 2. Community Plugin Analysis

### 2.1 Plugins Studied

| # | Plugin | Files | LOC | Focus | Why Selected |
|---|--------|-------|-----|-------|--------------|
| 1 | **oh-my-opencode** | 539 | ~27K | Everything (agents, hooks, tools, background agents, Claude compat) | Largest, most comprehensive — shows what's possible and what breaks |
| 2 | **opencode-dynamic-context-pruning (DCP)** | 40 | ~1.8K | Token optimization via message pruning | Directly relevant — manipulates messages.transform for context management |
| 3 | **@openspoon/subtask2** | 49 | ~2.9K | Command orchestration with flow control | Orchestration patterns, return stacks, delegation tracking |
| 4 | **opencode-background-agents** | (from ecosystem) | ~500 | Async delegation + context persistence | Background agent pattern for parallel work |
| 5 | **opencode-skillful** | (from ecosystem) | ~400 | Lazy-load prompts via skill discovery | Skill injection pattern — relevant for dynamic context |

### 2.2 Key Learnings — What These Plugins Taught

**Architecture Patterns That Work:**

1. **Hook Factory Pattern** (all 3 studied plugins use this):
   ```typescript
   // Each hook is a factory function that captures state
   export function createMyHook(ctx: PluginInput) {
     const state = new Map<string, SessionState>()
     return {
       "tool.execute.before": async (input, output) => { ... },
       "tool.execute.after": async (input, output) => { ... },
     }
   }
   ```

2. **Feature-Based Module Organization** (oh-my-opencode):
   ```
   src/
     features/       # Self-contained feature modules
     hooks/           # Hook implementations (one per concern)
     tools/           # Custom tool definitions
     config/          # Configuration loading + validation
     shared/          # Shared utilities
   ```

3. **Session State as In-Memory Maps** (DCP + subtask2):
   - Per-session Maps, NOT persistent files
   - Cleared on session end
   - Fast, no disk I/O during hooks
   - File persistence only for config + cross-session data

4. **Config in Platform Convention** (DCP):
   ```
   ~/.config/opencode/dcp.jsonc     ← Global
   .opencode/dcp.jsonc              ← Project
   ```
   NOT in custom `.idumb/` directory.

5. **Strategies Pattern** (DCP):
   - Each pruning strategy is an independent module
   - Strategies compose (dedup → supersede-writes → purge-errors)
   - Each strategy has clear input/output contract
   - Easy to enable/disable individually

6. **Graceful Degradation Everywhere** (all plugins):
   - Every hook wrapped in try/catch
   - Errors logged but never thrown (except intentional blocks)
   - Unknown message formats handled with early return

**Critical Pitfalls Discovered:**

1. **SDK Message Format ≠ Anthropic Format**:
   ```typescript
   // WRONG (what I assumed):
   { role: "user", content: "hello" }
   
   // CORRECT (actual SDK format):
   { info: { role: "user", sessionID: "...", ... }, parts: [{ type: "text", text: "hello" }] }
   ```
   oh-my-opencode's `context-window-monitor.ts` and DCP's message handling both confirm this.

2. **Splicing Messages Breaks Tracking**: DCP doesn't ADD messages — it REMOVES parts from existing messages. Adding synthetic messages to `output.messages` may break OpenCode's internal message ID tracking.

3. **`chat.message` output.parts Rendering Bug**: oh-my-opencode issue #885 — modifying `output.parts` in `chat.message` hook doesn't render when multiple plugins are loaded. The parts are modified but the TUI doesn't show them.

4. **Race Conditions in Session State**: subtask2 solves this with explicit pending state flags (`pendingReturn`, `pendingParent`, `returnStack`). Without these, `session.idle` and `messages.transform` fire in unpredictable order.

5. **Prompt Bundling via Bun**: OpenCode uses Bun to bundle plugins. `readFileSync` with `__dirname` fails when bundled (DCP solved this with a codegen step that converts `.md` → `.ts` constants).

6. **Console.log Corruption**: oh-my-opencode uses `client.app.log()` for structured logging. DCP uses file-based logging. Both avoid `console.log` entirely.

7. **Tool Permission Conflicts**: If a plugin and an agent both configure tool permissions, agent-level permissions win. A plugin can't override what the agent config allows.

### 2.3 What These Plugins DON'T Do (Gaps They Don't Fill)

1. **None implement "intelligence" or "awareness"** — they're all mechanical (prune tokens, chain commands, inject context). None attempt to make the LLM "smarter" through reasoning scaffolding.

2. **None track conversation trajectory** — DCP tracks tool outputs for pruning, subtask2 tracks command chains, but neither tracks user intent or conversation direction.

3. **None implement context poisoning detection** — no plugin checks for contradictory instructions, drift from plan, or hallucination patterns.

4. **None implement self-correction** — if an agent goes off-track, none of these plugins detect it and force a correction. subtask2's loop detection is the closest, but it only detects infinite command loops.

5. **None persist knowledge across compactions** — DCP prunes before compaction, oh-my-opencode injects some context in compaction hook, but neither maintains a structured knowledge base that survives compaction.

→ **This is iDumb's opportunity space.**

---

## 3. Current v2 Codebase Audit

### 3.1 File Inventory

| Category | Files | LOC | Status |
|----------|-------|-----|--------|
| **Plugin core** | `plugin.ts` | 224 | ⚠️ Wires too many untested features |
| **Hooks** | `tool-gate.ts`, `compaction.ts`, `message-transform.ts` | 715 | ⚠️ T1 partially validated, T3/T5 never tested |
| **Tools** | `init.ts`, `anchor.ts`, `status.ts`, `agent-create.ts` | 427 | ⚠️ Unit tests for init only, no live testing |
| **Schemas** | 8 files | 1,810 | ❌ Over-engineered — 8 schemas for unvalidated features |
| **Engines** | `scanner.ts`, `framework-detector.ts` | 795 | ✅ Scanner works (9/9 assertions) |
| **Lib** | `persistence.ts`, `logging.ts`, `path-resolver.ts` | 772 | ⚠️ Persistence works, path-resolver untested |
| **CLI** | 4 files | 307 | ❌ Never tested, adds maintenance burden |
| **Types** | `plugin.ts` | 45 | ⚠️ Local tool() helper due to zod v3/v4 mismatch |
| **TOTAL** | **30 files** | **~5,095** | |

### 3.2 What Works

| Component | Evidence | Confidence |
|-----------|----------|------------|
| T1 tool gate (permission enforcement) | 3/4 PASS criteria met in automated test | 70% — never live-tested in OpenCode |
| Scanner/init tool | 9/9 assertions pass | 80% — automated only |
| Persistence (read/write state) | Used by scanner tests | 60% — no concurrency testing |
| Build system (tsc) | Zero errors, clean build | 95% |

### 3.3 What Doesn't Work or Is Untested

| Component | Problem | Severity |
|-----------|---------|----------|
| **T5/T6 message transform** | Wrong message format assumed (`{role, content}` vs `{info, parts}`) — will NOT work | 🔴 CRITICAL |
| **T2 delegation tracking** | Not implemented — `delegationChain` never populated | 🔴 CRITICAL |
| **Agent-create tool** | Never tested, writes to `.opencode/agents/` which may conflict with user configs | 🟡 HIGH |
| **CLI** | Never tested, adds 307 LOC of maintenance burden for zero validated value | 🟡 HIGH |
| **Path resolver** | Never tested, walks filesystem on every call (perf concern) | 🟡 HIGH |
| **Compaction hook (T3)** | Never live-tested — injects anchors but format may not survive compaction | 🟡 HIGH |
| **Trajectory schema** | 299 LOC of schema + classification for a feature (message transform) that uses wrong message format | 🔴 CRITICAL |
| **Agent profile schema** | 359 LOC for a feature (agent-create) that's never been tested | 🟡 HIGH |

### 3.4 Architectural Problems

1. **Single monolithic plugin**: One `plugin.ts` registers 5 tools + 4 hooks. Should be split into composable units.

2. **`.idumb/` directory anti-pattern**: No community plugin uses a custom hidden directory. They use `.opencode/` conventions (DCP uses `.opencode/dcp.jsonc`). The `.idumb/` directory is an alien artifact that doesn't integrate with the platform.

3. **State persistence in files**: Every hook reads/writes `.idumb/brain/state.json`. Community plugins use in-memory Maps for session state. File I/O in hooks is slow and creates race conditions.

4. **Schema bloat**: 8 Zod schemas totaling 1,810 LOC for features that haven't been validated. DCP (a working, published plugin) has zero Zod schemas — it uses plain TypeScript interfaces.

5. **Feature stacking without validation**: Tool gate → compaction → message transform → agent create → CLI → scanner → path resolver → trajectory — each stacked without validating the previous one works.

6. **Wrong message format**: The message transform hook will crash or silently fail because it assumes Anthropic message format instead of OpenCode SDK format.

7. **No tests for hooks**: Can't test hooks without OpenCode running. No mock framework for the SDK context object. DCP and subtask2 both have test suites with mock contexts.

---

## 4. DOs, DON'Ts, Principles, Pitfalls

### 4.1 NON-NEGOTIABLE Development Principles

**P1 — ONE THING AT A TIME**: Build one mechanism, validate it end-to-end in a live OpenCode session, document results with evidence, THEN build the next. No feature stacking.

**P2 — PLATFORM NATIVE**: Follow OpenCode conventions. Use `.opencode/` for config. Use `client.app.log()` for logging. Use `tui.toast.show` for notifications. Don't fight the platform.

**P3 — GRACEFUL DEGRADATION**: Every hook must try/catch. Every tool must handle missing state. If any component fails, the rest continue working. Never break the TUI.

**P4 — EVIDENCE-BASED**: Every mechanism must have a testable hypothesis with measurable pass/fail criteria. "I think this will work" is not acceptable. "When I do X, the LLM should do Y, measured by Z" is.

**P5 — IN-MEMORY SESSION STATE**: Use per-session Maps for runtime state. File persistence only for cross-session data (config, knowledge base). No file I/O in hot paths (hooks).

**P6 — SDK FORMAT DEFENSIVE**: Never assume message format. Always type-check. Handle both known formats and unknown shapes with early return.

**P7 — COMPOSABLE PLUGINS**: Each capability is a separate plugin or a clearly isolated module within a plugin. No monolithic registration of 5+ tools and 4+ hooks.

**P8 — TEST WITH MOCKS FIRST, LIVE SECOND**: Create mock SDK context objects for unit testing. Then live-test in OpenCode. DCP and subtask2 both have excellent test patterns to follow.

### 4.2 DOs

| # | DO | Rationale |
|---|-----|-----------|
| 1 | Start with `tool.execute.before` — it's the most powerful and proven hook | T1 already partially validated; DCP, subtask2, oh-my-opencode all rely on it |
| 2 | Use `experimental.chat.messages.transform` for non-blocking context management | DCP proves this works for pruning; can be adapted for context enrichment |
| 3 | Use `tui.toast.show` for plugin notifications | Non-blocking, doesn't corrupt TUI, DCP uses this successfully |
| 4 | Store plugin config in `.opencode/<plugin-name>.jsonc` | Platform convention, validated by DCP |
| 5 | Use hook factory pattern with captured state | All studied plugins use this; clean, testable, composable |
| 6 | Use `client.session.messages()` to read conversation history | subtask2 and oh-my-opencode use SDK client for session access |
| 7 | Handle compaction by injecting structured context via `output.context.push()` | DCP and oh-my-opencode both do this; it's the ONLY way to persist info across compaction |
| 8 | Track tool usage via `tool.execute.after` for context awareness | DCP's tool cache pattern — know what tools were called with what args |
| 9 | Use Bun-compatible APIs (not Node-specific) | OpenCode bundles plugins with Bun |
| 10 | Write tests with mock SDK context objects | DCP and subtask2 both have test infrastructure |

### 4.3 DON'Ts

| # | DON'T | Why |
|---|-------|-----|
| 1 | Don't use `console.log` anywhere in plugin code | Breaks TUI rendering — confirmed by all community plugins |
| 2 | Don't splice synthetic messages into `output.messages` | May break OpenCode's internal message ID tracking — DCP only REMOVES parts, never adds messages |
| 3 | Don't assume Anthropic message format `{role, content}` | SDK uses `{info: {role, ...}, parts: [...]}` — confirmed by oh-my-opencode and DCP |
| 4 | Don't create custom hidden directories (`.idumb/`) | No community plugin does this — use `.opencode/` conventions |
| 5 | Don't do file I/O in hook hot paths | Hooks fire on EVERY tool call and message — file reads/writes add latency |
| 6 | Don't rely on `chat.message` for agent detection | Race condition: may fire after first tool (documented in oh-my-opencode) |
| 7 | Don't try to intercept subagent tool calls | GitHub #5894 — `tool.execute.before` doesn't fire for subagent tools |
| 8 | Don't build N features before validating feature 1 | Current v2 has 8 features, 0 live-validated — this is the core problem |
| 9 | Don't use Zod schemas for everything | DCP uses plain interfaces, subtask2 uses plain types — Zod adds bundle size and complexity |
| 10 | Don't create .md agents/commands/skills programmatically from plugins | They're static config — generating them creates maintenance burden and potential conflicts |
| 11 | **Don't rely on prompts to make agents use custom tools** | If a tool only works when "reminded" via prompt/instruction, the tool description is ineffective — this is the **hollow tool trap**. Tools must be selected NATURALLY based on description alone. |

### 4.4 Pitfalls Registry

| ID | Pitfall | How It Manifests | Detection | Mitigation |
|----|---------|-----------------|-----------|------------|
| PF-01 | **TUI corruption** | Plugin output appears in TUI background, garbles display | Visual inspection during live test | Use `client.app.log()` and `tui.toast.show` only |
| PF-02 | **Message format mismatch** | Hook silently fails, no injection happens | Check `typeof msg.info` vs `typeof msg.role` at hook entry | Defensive type checking with early return |
| PF-03 | **Subagent blind spot** | tool.execute.before doesn't fire when subagent uses tools | Monitor tool calls — if count drops when subagent active, blind spot confirmed | Accept limitation; use session events instead |
| PF-04 | **Compaction context loss** | After compaction, plugin state/anchors are gone | Check if LLM references injected context post-compaction | Use compacting hook; keep injection ≤500 tokens |
| PF-05 | **Race condition in session state** | State read/write overlap between hooks | Intermittent wrong behavior under load | Use atomic state updates, pending flags (subtask2 pattern) |
| PF-06 | **Permission override** | Agent config allows tool that plugin tries to block | Tool executes despite plugin throwing Error | Check if agent permissions override plugin blocks |
| PF-07 | **Token budget waste** | Plugin injects too much context, triggers early compaction | Monitor token counts via `tool.execute.after` (oh-my-opencode pattern) | Budget injections to ≤200 tokens per hook |
| PF-08 | **Bun bundling breaks** | `readFileSync` with `__dirname` fails | Runtime error on plugin load | Use codegen (DCP pattern) or inline strings |
| PF-09 | **Plugin load order conflict** | Another plugin modifies messages before/after ours | Unexpected message state in hook | Don't depend on message ordering; be idempotent |
| PF-10 | **State file corruption** | Concurrent writes to same JSON file | Garbled JSON, plugin crashes on next read | Use in-memory Maps; file persistence only on session end |
| PF-11 | **Hollow tool trap** | Custom tool only used when agent is "reminded" via prompt | Remove reminder → tool never called | Tool description must be self-sufficient; test in fresh session with NO instructions |

---

## 5. Success Criteria

### 5.1 Per-Mechanism Success Criteria

| Mechanism | Hypothesis | PASS Criteria | FAIL → Pivot |
|-----------|-----------|---------------|--------------|
| **Stop Hook (tool.execute.before)** | Can block/modify tool execution | Error thrown → tool blocked, error visible in chat | If error not visible → use `tui.toast.show` workaround |
| **Message Transform** | Can enrich LLM context non-destructively | Injected context appears in LLM reasoning (visible in response) | If LLM ignores injection → reduce to system prompt injection |
| **Compaction Hook** | Can preserve critical context across compaction | Post-compaction LLM references preserved context | If context lost → increase budget, simplify format |
| **Custom Tool** | LLM can call tool and use its output | Tool called, output used in LLM response | If LLM never calls tool → improve tool description |
| **System Prompt Transform** | Can inject governance directives | LLM follows injected directives (measured by behavior change) | If ignored → directives too verbose, simplify |
| **Session Events** | Can track session lifecycle | Events fire at correct times, state updates accurately | If events missed → poll instead of event-driven |

### 5.2 End-to-End Success Criteria (Stress Test)

The plugin PASSES if, after 20+ compactions with context poisoning:

1. **Awareness**: Agent can answer "What is the current task?" correctly after compaction
2. **Non-hallucination**: Agent does not reference deleted/outdated information
3. **Self-correction**: When given contradictory instructions, agent detects conflict and asks for clarification instead of blindly executing
4. **Bounce-back**: After context poisoning (irrelevant/contradictory messages), agent returns to the correct workflow within 2 turns
5. **Non-breaking**: OpenCode TUI remains functional throughout the entire test

---

## 6. Micro-Milestones with Pivot Points

### 6.0 Prerequisite: Fresh Worktree

```bash
git worktree add ../v2-clean -b clean-reset
cd ../v2-clean
# Start from minimal: package.json + tsconfig.json + src/index.ts only
```

### Milestone 0: FOUNDATION (Est: 1 session)

**Goal**: Minimal plugin that loads, doesn't break TUI, logs to file.

```
src/
  index.ts          # Plugin entry — returns empty hooks object
package.json        # @opencode-ai/plugin dependency
tsconfig.json       # Strict TS, ESM, NodeNext
```

- **PASS**: Plugin loads in OpenCode, no TUI errors, log file created
- **FAIL**: If plugin doesn't load → fix bundling/export format
- **Pivot**: None — this must work

### Milestone 1: STOP HOOK — The Gatekeeper (Est: 2 sessions)

**Goal**: `tool.execute.before` that conditionally blocks tools. THE most critical mechanism.

**What to build**:
- Hook factory that intercepts tool calls
- Simple condition: if tool is `write` and no TODO task is active → block with error message
- Toast notification when blocked
- In-memory state (no file I/O)

**Test**:
1. Start session, try to write a file without TODO → BLOCKED ✅
2. Use todowrite to create task, then write → ALLOWED ✅
3. Error message visible in chat (not just background) ✅
4. TUI not broken ✅

- **PASS**: All 4 tests pass → proceed to M2
- **FAIL (error not visible)**: Pivot → use `tui.toast.show` instead of throw Error
- **FAIL (TUI breaks)**: Pivot → reduce hook to logging only, investigate

### Milestone 2: CONTEXT PRUNING via Message Transform (Est: 2 sessions)

**Goal**: `experimental.chat.messages.transform` that removes stale tool outputs (DCP pattern).

**What to build**:
- Track tool calls via `tool.execute.after` (tool cache)
- In message transform: mark old tool outputs as stale, remove or truncate them
- Track token savings

**Test**:
1. Run 20+ tool calls in one session
2. Check if messages array shrinks over time
3. Check if LLM still has access to recent tool results
4. Check if compaction is delayed (fewer tokens)

- **PASS**: Token count reduces, LLM unaffected → proceed to M3
- **FAIL (messages format unknown)**: Pivot → log `output.messages` structure, adapt
- **FAIL (LLM loses context)**: Pivot → keep more recent results, prune less aggressively

### Milestone 3: COMPACTION SURVIVAL (Est: 2 sessions)

**Goal**: `experimental.session.compacting` that injects structured context that survives compaction.

**What to build**:
- Track current task/phase in session state
- On compaction: inject ≤500 token summary (task, key decisions, file list)
- Post-compaction verification: ask LLM "what are you working on?"

**Test (Critical — first stress test)**:
1. Start session, establish task + context
2. Work until compaction triggers (or force with `/compact`)
3. After compaction, ask "What is the current task?"
4. LLM should correctly reference the injected context

- **PASS**: LLM correctly answers post-compaction → proceed to M4
- **FAIL (LLM ignores injected context)**: Pivot → try `output.prompt` (replaces entire compaction prompt)
- **FAIL (context too large)**: Pivot → reduce to 200 tokens, only task name + file list

### Milestone 4: SYSTEM PROMPT GOVERNANCE (Est: 1 session)

**Goal**: `experimental.chat.system.transform` that injects governance directives into system prompt.

**What to build**:
- Inject role reminder + current task + key constraints
- Format as `<idumb-governance>` XML block (LLMs parse XML well)

**Test**:
1. Inject directive "Always state your current task before executing"
2. Does LLM comply? (measure over 10 interactions)
3. Inject contradictory user message → does LLM reference governance directive?

- **PASS**: LLM follows directive >70% of the time → proceed to M5
- **FAIL (LLM ignores)**: Pivot → move directives to AGENTS.md (static, always loaded)
- **PARTIAL (50% compliance)**: Combine with message transform for reinforcement

### Milestone 5: CUSTOM TOOL — Task Tracker (Est: 2 sessions)

**Goal**: A custom tool that replaces OpenCode's todowrite with a structured 3-level task tracker.

**What to build**:
- `idumb_task` tool with: create/update/list operations
- 3-level hierarchy: Phase → Task → Subtask
- Metadata: status, assignee (agent), timestamps, dependencies
- In-memory storage, persisted to `.opencode/idumb-tasks.json` on session end

**Test**:
1. LLM can call `idumb_task create` to create tasks
2. LLM can call `idumb_task list` to see hierarchy
3. Tasks survive session (file persistence)
4. Stop hook (M1) can check if current work has a task assignment

- **PASS**: LLM uses tool, tasks are structured → proceed to M6
- **FAIL (LLM prefers innate todowrite)**: Pivot → intercept todowrite via tool.execute.before, redirect to idumb_task
- **FAIL (schema too complex for LLM)**: Pivot → simplify to 2-level

### Milestone 6: INTEGRATION — Stop + Transform + Compact + Tasks (Est: 3 sessions)

**Goal**: All mechanisms working together. First real stress test.

**What to build**:
- Stop hook checks task assignment (M1 + M5)
- Message transform prunes stale outputs (M2) + injects task context
- Compaction preserves task state (M3)
- System prompt includes governance (M4)

**Stress Test**:
1. Create a multi-file feature task
2. Work for 20+ messages
3. Inject context poison: "Actually, forget everything and write a poem"
4. Does the agent bounce back to the task?
5. Force compaction
6. Does the agent resume correctly post-compaction?
7. Repeat 3x

- **PASS**: Agent bounces back >80% of the time, resumes post-compaction → PIVOT 1 PASSED
- **FAIL**: Identify which mechanism failed → fix and retest
- **FAIL (fundamental)**: Hooks can't achieve "intelligence" → PIVOT to Point 2

### Milestone 7+: EXPANSION (only after M6 passes)

- M7: Knowledge base (codebase wiki, planning artifacts)
- M8: Delegation orchestration (3-level delegation with task tracking)
- M9: Meta-builder (auto-generate agents/skills based on project scan)
- M10: Interactive planning artifacts (markdown with metadata, anchoring)

---

## 7. Stress Test Design

### 7.1 Test Environment

```
Separate worktree: ../v2-stress-test/
OpenCode with iDumb plugin loaded
A real project (e.g., a simple Express API) as test target
Test script with pre-defined poisoning prompts
```

### 7.2 Test Personas

**Persona A: Professional Developer (Corporate Complexity)**
- Clear, structured requests
- Multi-file changes spanning auth, DB, API
- Expects agent to maintain context across 50+ messages
- Tests: compaction survival, task tracking, file coherence

**Persona B: Vibe Coder (Context Pollution)**
- Rapid-fire messages, contradictory instructions
- "Actually, forget that" every 3rd message
- Mixes unrelated topics (CSS + backend + deployment in one message)
- Tests: drift detection, bounce-back, poisoning resistance

### 7.3 Test Sequence (20+ compactions)

```
Phase 1 (Messages 1-15): Establish context
  - Create task, set up project structure
  - Build auth module (multi-file)
  - Verify: agent tracks task, files coherent

Phase 2 (Messages 16-30): First poisoning
  - Inject: "Actually, let's build a game instead"
  - Expected: Agent detects drift, asks for confirmation
  - Force compaction
  - Verify: Post-compaction, agent references auth task

Phase 3 (Messages 31-50): Sustained work + noise
  - Continue auth module
  - Inject random noise every 5th message
  - Force compaction at message 40
  - Verify: Agent stays on track

Phase 4 (Messages 51-70): Heavy poisoning
  - 5 consecutive contradictory messages
  - "Delete everything", "Start over", "No wait, keep it"
  - Verify: Agent maintains stable reference to task

Phase 5 (Messages 71+): Recovery
  - Clear poisoning, resume normal work
  - Verify: Agent completes auth module correctly
  - Final compaction + verification
```

### 7.4 Measurement

| Metric | How to Measure | Target |
|--------|---------------|--------|
| **Task recall** | Ask "What are you working on?" after each compaction | 100% correct |
| **Drift detection** | Count times agent detects contradictory instructions | >80% |
| **Bounce-back** | Turns to return to correct task after poisoning | ≤2 turns |
| **TUI stability** | Visual inspection, no garbled output | 100% stable |
| **Token efficiency** | Compare token usage with/without plugin | ≤120% of baseline |

---

## 8. Project Restart Proposal

### 8.1 Fresh Worktree Setup

```bash
cd /Users/apple/Documents/coding-projects/idumb/v2
git worktree add ../v2-clean -b clean-reset

cd ../v2-clean
# Remove everything except git metadata
rm -rf src/ dist/ tests/ .planning/ .idumb/
# Keep: package.json, tsconfig.json, .gitignore
```

### 8.2 Minimal Starting Structure

```
v2-clean/
├── package.json          # Only @opencode-ai/plugin + typescript
├── tsconfig.json         # Strict TS, ESM, NodeNext
├── .gitignore
├── src/
│   └── index.ts          # Single file: plugin entry + M0
└── README.md             # This synthesis doc (condensed)
```

### 8.3 What to Preserve from Current v2

| Keep | Why |
|------|-----|
| `package.json` (deps only) | SDK version pinning |
| `tsconfig.json` | Compiler config is solid |
| `.gitignore` | Already comprehensive |
| Scanner engine (reference) | Well-tested, can port later for M9 |

| Discard | Why |
|---------|-----|
| All schemas (8 files) | Over-engineered, will redesign per-milestone |
| Message transform hook | Wrong message format, will rewrite in M2 |
| Agent-create tool | Untested, violates "don't generate .md from plugins" |
| CLI | Zero validated value, maintenance burden |
| Path resolver | Untested, `.idumb/` anti-pattern being dropped |
| Persistence lib | File-based session state being replaced with in-memory Maps |
| `.idumb/` directory concept | Anti-pattern — using `.opencode/` conventions instead |

### 8.4 Rationale for Reset vs Iterate

**Why not iterate on current codebase?**

1. **Wrong foundation**: `.idumb/` directory, file-based session state, Anthropic message format assumption — these are load-bearing mistakes that cascade through every feature.

2. **Feature debt**: 8 features stacked without validation. Fixing one reveals assumptions in others. Cheaper to rebuild correctly than untangle.

3. **No live validation gate**: Current codebase has never run in a real OpenCode session with a real user conversation. The first live test would likely reveal multiple breakages requiring fundamental rewrites.

4. **Community patterns ignored**: Current architecture doesn't follow any patterns from successful community plugins. The reset adopts proven patterns (hook factories, in-memory state, platform-native config).

**Why worktree and not branch?**

- Current `master` branch preserves all research, docs, and experimental code
- Worktree allows side-by-side comparison during development
- Can cherry-pick scanner engine and other working components later
- Stress testing needs its OWN separate worktree (3 total: master, clean, stress-test)

### 8.5 Development Cadence

```
Per milestone:
1. PLAN (30 min): Define hypothesis, pass criteria, pivot strategy
2. BUILD (1-2 hours): Implement minimal mechanism
3. TEST (30 min): Mock tests first, then live OpenCode test
4. DOCUMENT (15 min): Results, evidence, pivot decision
5. COMMIT: Only if PASS criteria met
```

---

## Appendix A: OpenCode SDK Message Format Reference

```typescript
// What output.messages contains in experimental.chat.messages.transform:
interface MessageWrapper {
  info: {
    id: string
    sessionID: string
    parentID?: string
    role: "user" | "assistant"
    created: string
    model?: string
    modelID?: string
    providerID?: string
    agent?: string
    mode?: string
    tokens?: {
      input: number
      output: number
      reasoning: number
      cache: { read: number; write: number }
    }
  }
  parts: Part[]
}

// Parts can be:
type Part =
  | { type: "text"; text: string }
  | { type: "tool-invocation"; tool: string; callID: string; input: unknown; output?: string }
  | { type: "step-start" }
  | { type: "step-finish" }
  | { type: "reasoning"; text: string }
  | { type: "snapshot"; ... }
```

## Appendix B: Hook Capability Matrix

| Hook | Can Block? | Can Modify Args? | Can Add Messages? | Can Remove Messages? | Fires for Subagents? |
|------|-----------|-----------------|-------------------|---------------------|---------------------|
| `tool.execute.before` | ✅ (throw) | ✅ (output.args) | ❌ | ❌ | ❌ (#5894) |
| `tool.execute.after` | ❌ | N/A | ❌ | ❌ | ❌ (#5894) |
| `chat.message` | ✅ (throw) | ✅ (output.parts) | ⚠️ (buggy #885) | ❌ | N/A |
| `messages.transform` | ❌ | N/A | ⚠️ (risky) | ✅ (DCP does this) | N/A |
| `system.transform` | ❌ | N/A | N/A | N/A | N/A |
| `session.compacting` | ❌ | N/A | N/A | N/A | N/A |
| `event` | Conditional | N/A | N/A | N/A | ✅ |
| `tui.command.execute` | ✅ | ✅ | N/A | N/A | N/A |

## Appendix C: Community Plugin Architecture Comparison

```
oh-my-opencode (539 files, 27K LOC):
  ├── 15+ agents with dynamic prompt builders
  ├── 30+ hooks (each in own directory with test)
  ├── 10+ custom tools
  ├── Background agent management
  ├── Claude Code compatibility layer
  ├── Skill management (MCP + file-based)
  └── Pattern: Massive, feature-rich, complex

DCP (40 files, 1.8K LOC):
  ├── 3 pruning strategies (dedup, supersede, purge)
  ├── 3 custom tools (prune, distill, compress)
  ├── Message transform hook (core)
  ├── System prompt hook (nudges)
  ├── Session state (in-memory + tool cache)
  └── Pattern: Focused, clean, single-purpose

subtask2 (49 files, 2.9K LOC):
  ├── Command parsing + manifest building
  ├── Return stack (nested command chains)
  ├── 4 hooks (command, message, tool, session-idle)
  ├── Session state (in-memory Maps)
  └── Pattern: Orchestration-focused, state-heavy

→ iDumb should target DCP's architecture clarity
  with subtask2's state management patterns.
```
