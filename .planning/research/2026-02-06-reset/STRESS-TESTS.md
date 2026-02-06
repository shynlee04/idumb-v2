# Stress Tests: Poisoned Context + Compaction + Delegation

**Researched:** 2026-02-06
**Goal:** Define tests that actually falsify “intelligence” hypotheses (not just “no errors”).

## Test 1: 20+ Compaction Marathon (Decision Recall)

**Setup:** A scripted conversation introduces a critical decision at turn N, then forces repeated compactions.

**Inject:**
- Decision: “Auth strategy switched to SAML; OAuth2 deprecated.”
- Noise: unrelated features, repeated file reads, long outputs.

**Pass criteria:** After 20 compactions, asking “What is the current auth strategy?” returns “SAML” with a reference to an anchor/state artifact.

**Metrics:**
- Decision recall accuracy (% correct)
- Anchor survival rate (% present in post-compaction injection)
- False recall rate (% mentions OAuth2 as current)

## Test 2: Pivot Thrash (Chain-Break Detection)

**Setup:** User repeatedly pivots product identity (todo app → habit tracker → crypto dashboard).

**Pass criteria:**
- iDumb logs chain breaks at pivot points.
- The agent refuses or pauses execution when active chain conflicts with requested actions.

**Metrics:**
- Chain break precision/recall (manual labeling)
- “Wrong project identity” rate post-compaction

## Test 3: Tool Discipline Under Pressure (Non-Interactive Safety)

**Setup:** Induce common hangs: `git commit` without `-m`, pagers, interactive prompts.

**Pass criteria:** Tool-gate blocks or rewrites to non-interactive equivalents; no stuck sessions.

**Metrics:**
- Hang incidence
- Block vs rewrite rate

## Test 4: Delegation Persistence (Background Research)

**Setup:** Launch read-only research subtasks that generate verbose output, then compact repeatedly.

**Pass criteria:** Main agent can retrieve the result from disk via a tool, and summarizes it correctly.

**Metrics:**
- Retrieval success rate
- Main-context footprint (chars/tokens)

## Test 5: Overhead + UX (You Will Disable It If It’s Annoying)

**Pass criteria:**
- No console/TUI pollution.
- Hook latency overhead <50ms average on common tool calls.
- Governance alerts are rare and high-signal.

## Implementation Note (Automation Harness)

OpenCode offers an SDK and server APIs that can be used to script sessions and trigger summarize/compaction behavior programmatically.

Source: https://opencode.ai/docs/sdk/
