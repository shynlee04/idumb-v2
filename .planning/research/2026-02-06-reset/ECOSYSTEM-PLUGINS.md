# OpenCode Ecosystem Plugin Study (Selected 6)

**Researched:** 2026-02-06
**Selection principle:** Pick plugins that directly touch iDumb’s target failure modes: compaction loss, drift, unsafe tool usage, orchestration entropy, and environment isolation.

## Plugins Studied (Why These)

- `opencode-dynamic-context-pruning` (context bloat + tool-output redundancy)
- `opencode-background-agents` (delegation persistence across compaction)
- `@openspoon/subtask2` (deterministic orchestration and lower session entropy)
- `opencode-shell-strategy` (non-interactive shell gotchas; reduces hangs)
- `opencode-pty` (long-running/background processes + interactive IO)
- `opencode-worktree` (clean isolation via worktrees; safe stress harness)

These are the closest “adjacent solutions” to iDumb’s thesis: intelligence emerges from better infrastructure and lifecycle boundaries.

## What I Learned (Actionable Patterns)

### 1) Token/Context is a first-class subsystem (not a side effect)

From `opencode-dynamic-context-pruning`:
- Implements automatic strategies (dedupe, supersede writes, purge errors) and also exposes “LLM-driven prune tools” (`distill`, `compress`, `prune`).
- Explicitly calls out prompt caching trade-offs: pruning changes message prefixes, potentially reducing cache hits.
- Key pattern: do *deterministic, zero-LLM-cost* pruning first; reserve LLM-invoked pruning for heavy cases.

Relevance to iDumb:
- iDumb should treat “context hygiene” as *governance infrastructure* with strict budgets and lifecycle states.

Source: https://github.com/Opencode-DCP/opencode-dynamic-context-pruning

### 2) Persistence beats “remember harder”

From `opencode-background-agents`:
- Saves delegation results to disk as markdown and offers tools to list/read them later.
- Avoids write-capable background sessions because undo/branching cannot track those changes safely.

Relevance to iDumb:
- Anchor persistence should be file-based and queryable (JSON preferred for machine use; optional markdown for human inspection).
- Background delegation should default to read-only for safety.

Source: https://raw.githubusercontent.com/kdcokenny/opencode-background-agents/main/README.md

### 3) Orchestration entropy is real; “generic summarization prompts” are poison

From `@openspoon/subtask2`:
- Replaces OpenCode’s generic hidden “summarize task output” behavior with explicit, user-visible return prompts.
- Adds structured chaining, looping with explicit stop conditions, named results (`{as:name}` + `$RESULT[name]`), and turn injection (`$TURN[n]`).

Relevance to iDumb:
- iDumb should treat “post-subtask summarization” as a governance boundary and never accept generic, context-wasting summaries.
- Named result capture is a strong pattern for reducing hallucination: references become explicit and replayable.

Source: https://raw.githubusercontent.com/spoons-and-mirrors/subtask2/main/README.md

### 4) Non-interactive shell is a dominant failure mode in agentic CLIs

From `opencode-shell-strategy`:
- Most hangs come from TTY-dependent commands (editors, pagers, interactive flags).
- The fix is largely instruction-level: prefer non-interactive flags and native tools for file ops.

Relevance to iDumb:
- “Tool discipline” is a governance primitive. iDumb should enforce a non-interactive command allowlist or rewrite patterns at the hook layer.

Source: https://github.com/JRedeker/opencode-shell-strategy

### 5) Background processes require a PTY abstraction (otherwise you get fake async)

From `opencode-pty`:
- Adds tools for spawning, reading, writing, killing PTY sessions plus a web UI.
- Explicit limitation: OpenCode permission prompts (`ask`) can’t be shown by the plugin; it treats `ask` as effectively deny for PTY spawn.

Relevance to iDumb:
- iDumb should assume plugin code cannot always invoke the platform’s interactive permission UI. Prefer explicit allow/deny patterns for automation tools.

Source: https://raw.githubusercontent.com/shekohex/opencode-pty/main/README.md

### 6) Worktrees are the cleanest “stress test isolation” primitive

From `opencode-worktree`:
- Creates/destroys worktrees with automatic terminal spawning.
- Auto-commits on deletion to preserve work.

Relevance to iDumb:
- Your spec “test in separate worktree” has strong ecosystem precedent. Make this non-negotiable for stress tests.

Source: https://raw.githubusercontent.com/kdcokenny/opencode-worktree/main/README.md

## Immediate Recommendations for iDumb

- Adopt the DCP pattern: deterministic hygiene first; LLM-invoked hygiene only behind explicit triggers and budgets.
- Use background delegation only for read-only work until undo/story integrity is solved.
- Eliminate generic post-subtask summaries; require structured return prompts with explicit next actions.
- Bake “non-interactive shell strategy” into governance as either (a) injected instructions, or (b) tool-gate rewriting/deny rules.
- Keep the stress harness isolated via worktrees.
