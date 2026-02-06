# Comparison: OpenCode vs Claude Code (Concepts, Terminology, Leverage Points)

**Researched:** 2026-02-06
**Goal:** Define a shared vocabulary and identify the highest-leverage interception points for iDumb-style governance.

## Core Objects and Mappings

| Concept | OpenCode | Claude Code | Notes / iDumb Mapping |
|--------|----------|-------------|------------------------|
| Primary agent | `build`, `plan` (switchable), hidden system agents (compaction/title/summary) | Main session agent (permission modes); optional agent teams | OpenCode agent configs live in `opencode.json` or `.opencode/agents/*.md`; Claude Code uses permission modes + optional subagents/teams |
| Subagents | Built-in `general`, `explore`; user-defined subagents in agent config | Built-in `Explore`, `Plan`, `general-purpose`; custom `.claude/agents/*.md` | Both support isolation to reduce context bloat; critical for “poison resistance” |
| Tools | Built-in tools + custom tools in `.opencode/tools/` | Built-in tools + MCP tools; skills can preprocess shell output | iDumb should prefer adding 1-3 governance tools over expanding LLM tool menu too early |
| Permissions | `permission` in `opencode.json` (granular by tool; bash patterns; task permissions) | `permissions` in settings.json + permission modes (default/plan/acceptEdits/delegate/etc) | Both allow pattern-based bash rules; iDumb must not fight the platform’s native permission UX |
| Rules / System instruction | `AGENTS.md` (or Claude compatibility `CLAUDE.md`); can also include `instructions` in config | `CLAUDE.md` + `.claude/rules/*.md` (scoped by paths) + managed policy | OpenCode explicitly supports Claude Code rule file conventions as fallback |
| Skills | `.opencode/skills/<name>/SKILL.md` + `skill` tool | `.claude/skills/<name>/SKILL.md`; skills double as slash commands | Both implement “skills as progressive disclosure” (description in context, full content on demand) |
| Commands (slash) | `.opencode/commands/*.md` or config; executed in TUI | Skills/commands (`/name`), built-in interactive commands | Your spec says “no MD commands/workflows”; this points iDumb to plugin + custom tools + hook-based TUI integration |
| Plugins | JS/TS module exporting hooks + optional tools; loaded local/npm; run with Bun | File-based plugin package bundling skills/agents/hooks/MCP/LSP; cached/copied to plugin cache | Both support plugin packaging, but OpenCode plugins are code-first and run inside OpenCode runtime |
| Hooks / Interception | Plugin hook events: `tool.execute.before/after`, `shell.env`, many session/message/tui events, `experimental.session.compacting` | Hooks in settings and plugins: `PreToolUse`, `UserPromptSubmit`, `PreCompact`, `Stop`, etc | Claude Code’s `UserPromptSubmit` is a direct “pre-user-prompt” lever; OpenCode’s nearest equivalent is unclear (needs validation) |
| Compaction | Hidden “compaction” agent; `/compact`; plugin can inject/replace compaction prompt | Auto compaction + `/compact`; `PreCompact` hook; “Compact Instructions” in CLAUDE.md | iDumb’s anchor survival is best tested at the compaction boundary |
| Session continuity | Sessions + child sessions for subagents; `/sessions` resume; SDK supports session APIs | Sessions stored locally; resume + fork session; subagent transcripts separate | Both allow worktrees for parallelism; iDumb should use this for stress isolation |
| Output style | Not a first-class concept (style mostly via agent prompt/rules) | First-class “output styles” that modify system prompt | In OpenCode, similar effect achieved via agent prompts + instructions + skills |

## What The Model Sees at Critical Moments

### New session
- OpenCode: agent prompt + rules (`AGENTS.md`/`CLAUDE.md`) + tool list + permissions; plugins loaded.
- Claude Code: system prompt + loaded memory files (`CLAUDE.md` and `.claude/rules/*.md`) + tool list + permission mode; hooks snapshot loaded.

### Before a tool executes
- OpenCode: plugin `tool.execute.before` can inspect/modify args and throw to block.
- Claude Code: `PreToolUse` hook can allow/deny/ask, modify input, and inject additional context.

### Compaction boundary
- OpenCode: `experimental.session.compacting` lets you push context or replace prompt used to generate the continuation summary.
- Claude Code: `PreCompact` hook + CLAUDE.md “Compact Instructions” influence what survives.

### User cancels / interrupts
- OpenCode: session/message events exist; exact “interrupt” semantics require local validation (not fully described in docs).
- Claude Code: the agentic loop explicitly supports interrupt; hooks can react at `Stop`/tool boundaries.

## Governance Leverage Points (Ranked)

1. Tool interception (`tool.execute.before` / `PreToolUse`) for enforcement + context injection.
2. Compaction boundary hooks (`experimental.session.compacting` / `PreCompact`) for persistence.
3. Persistent memory artifacts (OpenCode via plugin state + disk; Claude Code via CLAUDE.md / agent memory dirs).
4. Orchestration layer (subagents / tasks) to isolate high-volume operations.
5. UI signals (toasts, prompt append) to alert humans without polluting LLM context.

## Sources

- OpenCode Plugins: https://opencode.ai/docs/plugins/
- OpenCode Agents: https://opencode.ai/docs/agents/
- OpenCode Commands (TUI): https://opencode.ai/docs/tui/
- OpenCode Permissions: https://opencode.ai/docs/permissions/
- Claude Code Hooks: https://code.claude.com/docs/en/hooks.md
- Claude Code Subagents: https://code.claude.com/docs/en/sub-agents.md
- Claude Code Memory: https://code.claude.com/docs/en/memory.md
- Claude Code Plugins: https://code.claude.com/docs/en/plugins.md
- Claude Code Output Styles: https://code.claude.com/docs/en/output-styles.md
