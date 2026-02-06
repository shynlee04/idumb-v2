# Research Summary: iDumb Strategic Reset (Meta-Governance for Agentic CLIs)

**Researched:** 2026-02-06
**Validated:** 2026-02-06 (3 parallel agents + official docs verification)
**Scope:** OpenCode + Claude Code ecosystem concepts; plugin/tool/hook capabilities; community plugin patterns; pitfalls; stress tests; roadmap implications.
**Overall confidence:** HIGH for platform capabilities (11/11 claims verified); MEDIUM for inferred behavior interactions (9 claims need live testing).

## Canonical Hand-Off Prompt

Use `.planning/research/2026-02-06-reset/NEXT-CONTEXT-OPERATING-PROMPT.md` as the single source-of-truth for next-session planning and pivot decisions.

---

## Validation Status

| Area | Claims | Verified | Needs Testing |
|------|--------|----------|---------------|
| OpenCode Plugin API | 11 | 11 (100%) | 0 |
| Experimental Hooks | 3 | 1 | **2 CRITICAL** |
| Codebase Audit | 8 | 5 (70%) | 1 outdated |
| Internal Consistency | - | 5 critical issues | See VALIDATION-RESULTS.md |

**Key Finding:** `experimental.chat.messages.transform` and `experimental.chat.system.transform` are NOT in official OpenCode docs. Only `experimental.session.compacting` is documented. **Live verification required before T5/T6 implementation.**

---

## Executive Summary

iDumb should be re-scoped to one source-of-truth: a deterministic governance substrate that *injects the right context at the right time* and *persists the right state across compactions*, without pretending to replace LLM reasoning. OpenCode’s plugin model is strong for this because it provides first-class, typed hook points around tool execution and compaction, and can add custom tools that persist state to disk.

The most reliable leverage points (high-frequency, high-control) are **tool interception** and **compaction prompt injection**. These map cleanly to OpenCode’s `tool.execute.before`/`after` and `experimental.session.compacting` hooks (official docs). Claude Code offers similar leverage via `PreToolUse` + `PreCompact` hooks, but its extensibility is primarily JSON-configured hooks and file-based components (skills/agents/plugins) rather than a single in-process TypeScript plugin.

The major failure mode that caused v1-style bloat is building “hypothesis towers” without pivot gates. The strategic reset should enforce: (1) baseline measurement, (2) one mechanism per trial, (3) explicit pivot triggers when a mechanism does not change real agent behavior under poisoned context, and (4) lifecycle rules for every artifact that could become context poison.

## Key Findings

- OpenCode plugins can: subscribe to `tool.execute.before/after`, TUI events (including `tui.toast.show`), and inject/replace compaction prompts via `experimental.session.compacting`. Plugins can also add custom tools with Zod schemas. Source: https://opencode.ai/docs/plugins/
- OpenCode has explicit primary agents + subagents, permissions, commands, skills, and a hidden compaction agent; all are configurable. Sources: https://opencode.ai/docs/agents/ , https://opencode.ai/docs/permissions/ , https://opencode.ai/docs/commands/ , https://opencode.ai/docs/skills/
- Claude Code has: hooks for `PreToolUse`, `UserPromptSubmit`, `PreCompact`, subagents with isolated contexts, skills as slash commands, and a plugin packaging system that bundles these. Sources: https://code.claude.com/docs/en/hooks.md , https://code.claude.com/docs/en/sub-agents.md , https://code.claude.com/docs/en/skills.md , https://code.claude.com/docs/en/plugins.md
- Community plugin patterns relevant to iDumb (6 studied): dynamic context pruning, background delegation persistence, orchestration-enhanced commands, non-interactive shell strategy, PTY/background process management, and worktree automation.

## Implications for Roadmap (Up To Pivot 1 Acceptance)

**Terminology clarification:** 
- **Trial** = validation cycle with PASS/FAIL criteria (T1-T8)
- **Phase** = implementation stage grouping multiple trials (P0-P4)

Suggested micro-phase ordering (each phase ends with PASS/FAIL + pivot decision):

### P0: Baseline + Instrumentation
- Measure behavior without iDumb under a poisoned-context + compaction marathon
- Output: metrics + failure taxonomy (forgetting decisions, wrong task identity, drift)
- **Research flag:** Standard methodology, skip phase research

### P1: Tool-Gate Governance (T1: Stop Hook)
- Prove OpenCode plugin can intercept/annotate/block at `tool.execute.before` without TUI pollution and with <50ms overhead
- **Pivot trigger:** If tool gate can't reliably stop or annotate tool calls, plugin approach loses its strongest lever
- **Research flag:** Well-documented, standard patterns from ecosystem

### P2: Compaction Persistence (T3: Anchors → Compaction Context)
- Prove that a critical decision survives 20+ compactions *and is referenced correctly* after compaction
- **Pivot trigger:** If anchors survive disk but the post-compaction model does not attend to them, compaction injection needs redesign
- **Research flag:** Needs live testing to verify `experimental.session.compacting` behavior

### P3: Read-Order A/B Test (T5/T6: Message Transforms)
- **BLOCKED**: `experimental.chat.messages.transform` not in official docs
- First run live test to confirm hook exists and fires
- If exists: determine empirically whether "top-of-context" or "bottom-of-context" injections work better
- **Pivot trigger:** If hook doesn't exist or no measurable difference, skip message transforms
- **Research flag:** CRITICAL — needs hook existence verification first

### P4: Delegation + TODO (T2/T7: Minimal Tracking)
- Only after P1-P3 pass: add a governed delegation/TODO mechanism
- Consider using newly discovered `todo.updated` event for native integration
- **Pivot trigger:** If TODO/tool forcing increases confusion (tool selection errors), reduce surface area
- **Research flag:** Needs research on `session.children()` API for subagent tracking

---

## Research Flags (Updated Post-Validation)

### CRITICAL — Must Verify Before Implementation
- `experimental.chat.messages.transform` hook: NOT in official docs, may not exist
- `experimental.chat.system.transform` hook: NOT in official docs, may not exist
- `tool.execute.before` subagent blind spot (#5894): Sourced from GitHub, not official docs

### HIGH — Needs Live Testing
- SDK message format in hook outputs (`{info, parts}` vs `{role, content}`)
- Hook overhead <50ms performance requirement
- Agent permissions vs plugin blocks precedence

### STANDARD — Well-Documented Patterns
- `tool.execute.before` blocking via throw: Verified with exact example in docs
- `experimental.session.compacting` context injection: Verified with example
- Custom tools with Zod schemas: Verified with example
- `tui.toast.show` notifications: Listed in events
- `client.app.log()` logging: Verified with example

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | 11/11 API claims verified against Feb 5, 2026 official docs |
| Features | MEDIUM | Behavior-dependent; validated patterns from ecosystem plugins |
| Architecture | HIGH | Standard plugin/tool/hook layering; validated against community plugins |
| Pitfalls | HIGH | Repeated across docs + ecosystem plugins; matches observed failure modes |
| Experimental Hooks | **LOW** | `messages.transform`/`system.transform` NOT in official docs |

**Overall confidence:** HIGH for core approach (OpenCode plugin → tool gate → compaction); MEDIUM for advanced mechanisms (message transforms, delegation tracking).

### Gaps Identified During Validation

| Gap | Impact | Resolution |
|-----|--------|------------|
| Experimental hooks undocumented | T5/T6 may not work | Live test before implementation |
| Subagent hook blind spot (#5894) | T2 delegation tracking limited | Accept or use session events |
| Message format in transforms | May crash or silently fail | Codebase already handles both formats |
| Internal doc terminology | Roadmap confusion | Fix before proceeding |

---

## Newly Discovered Capabilities

The validation revealed 9 capabilities not mentioned in original research:

1. `shell.env` hook — inject environment variables into all shell execution
2. `permission.asked`/`permission.replied` events — track permission flow
3. `file.edited`/`file.watcher.updated` events — track file changes
4. `todo.updated` event — track TODO changes (native integration point)
5. `session.diff` event — track session diffs
6. SDK `session.children()` — list child sessions for subagent tracking
7. SDK `session.abort()` — abort sessions for governance enforcement
8. SDK `find.symbols()` — find workspace symbols for scanning
9. `lsp.client.diagnostics` event — access LSP diagnostics

**Relevance to iDumb:**
- `todo.updated` provides native TODO tracking without custom tools
- `session.children()` offers alternative to T2 delegation via hook
- `session.abort()` enables hard governance stops

---

## Sources (Primary)

### Verified Against Official Docs (Feb 5, 2026)
- OpenCode Plugins: https://opencode.ai/docs/plugins/ — **11/11 claims verified**
- OpenCode Custom Tools: https://opencode.ai/docs/custom-tools/
- OpenCode Agents: https://opencode.ai/docs/agents/
- OpenCode Permissions: https://opencode.ai/docs/permissions/
- OpenCode Commands (slash): https://opencode.ai/docs/commands/
- OpenCode Skills: https://opencode.ai/docs/skills/
- OpenCode SDK: https://opencode.ai/docs/sdk/

### Not Verified (Need Live Test)
- Claude Code Hooks: https://code.claude.com/docs/en/hooks.md
- Claude Code Subagents: https://code.claude.com/docs/en/sub-agents.md
- Claude Code Skills: https://code.claude.com/docs/en/skills.md
- Claude Code Plugins: https://code.claude.com/docs/en/plugins.md

### Ecosystem Evidence (Community Plugins)
- opencode-dynamic-context-pruning: Message transform + tool cache patterns
- opencode-background-agents: Delegation persistence patterns
- @openspoon/subtask2: Orchestration + return stack patterns
- opencode-shell-strategy: Non-interactive shell safety
- opencode-pty: PTY/background process management
- opencode-worktree: Worktree isolation for stress testing

---

## Internal Consistency Issues (Must Fix)

From VALIDATION-RESULTS.md:

### CRITICAL (5)
1. **Phase/Trial terminology inconsistent** — "Phase" and "Trial" used interchangeably
2. **Missing stress test for tool interception** — Primary mechanism untested
3. **Missing pitfalls for 4 principles** — P3 (Baseline), P4 (Infrastructure), P7 (Fail Open), P9 (Isolation)
4. **ARCHITECTURE.md missing delegation component** — Feature exists without architecture
5. **Roadmap phase count ambiguous** — Baseline unnumbered, P1-P4 numbered

### HIGH (6)
1. Missing stress test: Time-to-stale enforcement
2. Missing stress test: Context hygiene effectiveness
3. Ecosystem learning not surfaced: Generic summarization as pitfall
4. STACK.md missing injection composer
5. COMPARISON.md leverage points not in ARCHITECTURE.md
6. Test 2 missing false positive metrics

**Estimated fix effort:** 5-6 hours total

---

*Research validated: 2026-02-06*
*Ready for roadmap: YES (with caveats above)*
*See: VALIDATION-RESULTS.md for full validation report*
