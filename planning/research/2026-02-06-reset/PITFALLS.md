# Pitfalls for Meta-Governance Plugins (OpenCode / Claude Code)

**Researched:** 2026-02-06
**Purpose:** Identify failure modes that cause “plugin exists but adds no intelligence” or “plugin increases hallucination.”

## Critical Pitfalls

### Pitfall 1: No singular source-of-truth (SSOT)
**What goes wrong:** The system does many things; nothing is decisive; agents cannot tell what to trust.
**Prevention:** One SSOT state machine + a small set of persisted entities (state, anchors, tasks). Everything else is derived.

### Pitfall 2: “Hypothesis stacking” without pivot gates
**What goes wrong:** New mechanisms added before validating previous ones; each mechanism becomes new context poison.
**Prevention:** One mechanism per trial; PASS/FAIL + explicit pivot after each trial.

### Pitfall 3: Injecting context that is not actionable
**What goes wrong:** The model reads large injected blobs; behavior does not change.
**Prevention:** Every injection must answer: (1) what phase/task is active, (2) what decision anchors are critical, (3) what the next action is.

### Pitfall 4: Unknown LLM attention ordering at compaction boundaries
**What goes wrong:** You inject the “right” info but in the wrong place; model ignores it.
**Prevention:** A/B test injection positions for post-compaction recall; avoid message transforms until measured.

### Pitfall 5: Tool menu explosion
**What goes wrong:** Too many custom tools reduce correct tool selection.
**Prevention:** Add at most 1-3 new tools per phase; name them with strong prefixes (`idumb_*`) and tight descriptions.

### Pitfall 6: Permission UX mismatch (plugin cannot always prompt)
**What goes wrong:** Plugin-driven automation assumes interactive permission prompts are available; they are not.
**Prevention:** Design automation tools to require explicit allow rules; treat “ask” as unsafe for background/automation.
**Evidence:** `opencode-pty` documents treating `ask` as deny.

### Pitfall 7: Context pruning breaks provider prompt caching
**What goes wrong:** You save tokens but lose cache hit rate; costs/latency change unexpectedly.
**Prevention:** Measure cache/cost impact; prefer deterministic pruning that preserves stable prefixes when possible.
**Evidence:** `opencode-dynamic-context-pruning` explicitly calls this trade-off.

## Moderate Pitfalls

### Pitfall 8: Staleness metadata without enforcement
**What goes wrong:** Timestamps exist but do not affect decisions; stale artifacts still drive actions.
**Prevention:** Time-to-stale is enforced on read and on injection selection; stale items are demoted or excluded.

### Pitfall 9: False alarms from chain-break detection
**What goes wrong:** The system cries wolf; agents stop trusting it.
**Prevention:** Validate chain integrity before alerting; include “confidence” and “evidence pointer” for any alert.

### Pitfall 10: Mixing human-facing vs model-facing output
**What goes wrong:** Debug logs or verbose data leak into chat; TUI gets noisy; user disables plugin.
**Prevention:** File-based logging; toasts for user; minimal model-facing injections.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|------------|----------------|------------|
| Tool gate | Blocking too much and breaking innate agents | Default allow; restrict only for iDumb-managed roles/scopes |
| Compaction | Injecting too much context (hurts more than helps) | Budget cap + anchor scoring + A/B read-order validation |
| Delegation | Subtasks return verbose summaries that bloat main context | Structured returns, named results, strict budgets |
| Automation | Auto-run triggers on stale state | Require freshness + explicit conditions |

## Sources

- OpenCode Plugins: https://opencode.ai/docs/plugins/
- Claude Code Hooks: https://code.claude.com/docs/en/hooks.md
- DCP plugin: https://github.com/Opencode-DCP/opencode-dynamic-context-pruning
- PTY plugin: https://raw.githubusercontent.com/shekohex/opencode-pty/main/README.md
