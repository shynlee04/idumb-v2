# Phase δ2.5 — Tool Discoverability + Agent Scoping

## Changes Made

### 1. Tool Description Rewrite — [task.ts](file:///Users/apple/Documents/coding-projects/idumb/v2/src/tools/task.ts#L86-L108)

Replaced the dense single-line `idumb_task` description with a structured multi-line format:
- **Quick Start** section (3-step create_epic → create_task → start flow)
- **Action Reference Table** with required args per action
- All 13 actions documented inline

> Root cause: the meta-builder couldn't parse the old description and tried `action=create`, then `action=create_epic`, then re-read source code.

### 2. Agent-Scoped Plugin Tool Gating — [tool-gate.ts](file:///Users/apple/Documents/coding-projects/idumb/v2/src/hooks/tool-gate.ts#L23-L73)

Added runtime gating for plugin tools per agent:

| Agent | Blocked Tools | Blocked Actions |
|-------|--------------|----------------|
| `idumb-supreme-coordinator` | `idumb_init` | — |
| `idumb-validator` | `idumb_init` | `delegate`, `create_epic` |
| `idumb-builder` | `idumb_init` | `create_epic` |
| `idumb-skills-creator` | `idumb_init` | `delegate`, `create_epic` |

PP-01 workaround: OpenCode frontmatter can't scope plugin tools, so we enforce via `tool.execute.before` + `chat.params` agent capture.

### 3. Meta-Builder Delegation Awareness — [templates.ts](file:///Users/apple/Documents/coding-projects/idumb/v2/src/templates.ts#L155-L240)

- Phase 2 agent creation now reads delegation + governance skills
- Agent Creation Contract documents delegation rules & plugin tool boundaries
- Explicitly states `tools:` frontmatter only controls innate tools

## Verification

- **TypeScript:** 0 errors
- **Tests:** 242/242 passed across 7 suites
