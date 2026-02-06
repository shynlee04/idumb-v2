# Feature Landscape (Meta-Governance for Agentic CLIs)

**Researched:** 2026-02-06

## Table Stakes (If Missing, System Feels Fake)

| Feature | Why Expected | Complexity | Notes |
|--------|--------------|------------|------|
| Tool interception + enforcement | Only reliable lever to shape agent behavior | Med | OpenCode: `tool.execute.before`; Claude: `PreToolUse`. |
| Compaction boundary persistence | Long sessions are the default; compaction is unavoidable | Med | OpenCode: `experimental.session.compacting`; Claude: `PreCompact` + Compact Instructions. |
| Minimal, queryable state | “Intelligence” needs an external memory substrate | Med | Persisted anchors/state with budgets + staleness. |
| Non-interactive shell safety | Agentic CLIs hang without it | Low | Instruction-level + tool-gate rewriting/denylist. |
| Baseline + measurement | Otherwise “improvement” is vibes | Med | Scripted scenarios; compare recall/drift rates. |

## Differentiators (High Value, Not Required for MVP)

| Feature | Value Proposition | Complexity | Notes |
|--------|-------------------|------------|------|
| Chain-break detection | Teaches the agent when to stop and re-plan | High | Must avoid false alarms; evidence pointers required. |
| Time-to-stale enforcement | Prevents “old truth wins” hallucinations | Med | Only matters if tied to selection/alerts, not just timestamps. |
| Structured delegation/TODO substrate | Forces workflow discipline across multi-agent teams | High | Must be minimal first; avoid interactive UI until proven. |
| Deterministic context hygiene (pruning) | Reduces bloat and drift | Med | Learn from DCP: dedupe/supersede/errors + budgets. |

## Anti-Features (Explicitly Avoid)

| Anti-feature | Why Avoid | What To Do Instead |
|------------|-----------|--------------------|
| “Poison detection” text classifier | Competes with the model; high false positives | Use lifecycle + staleness + explicit pivot events driven by state changes |
| 12+ tools early | Tool selection degrades | Phase tools in (<=3 per trial), with strong naming/prefixes |
| Message transforms without evidence | Unknown attention ordering | A/B test read-order first; prefer tool-level boundaries |
| UI spam in chat | Users disable plugin | Use toasts + file logs; keep model-facing injections small |

## MVP Recommendation (Pivot 1)

1. Tool-gate enforcement + minimal injection
2. Anchors persisted to disk + compaction prompt injection
3. Baseline vs plugin measurement harness
4. Non-interactive shell safety policy

Defer:
- Interactive planning artifacts
- Deep delegation/TODO substrate
- Any “prompt/user message transformation” until validated
