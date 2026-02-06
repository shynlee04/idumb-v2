# iDumb v2 — Intelligent Delegation Using Managed Boundaries

> Governance substrate for agentic CLIs. Makes LLMs stop before breaking things.

**iDumb v2** is an [OpenCode](https://opencode.ai) plugin that enforces structured governance on AI agents via tool interception, context pruning, compaction survival, and system prompt injection.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-45%2F45-brightgreen.svg)]()
[![OpenCode Plugin](https://img.shields.io/badge/OpenCode-Plugin-green.svg)](https://opencode.ai/docs/plugins/)

---

## Architecture

```
src/
├── index.ts              # Plugin entry — 4 hooks + 3 tools
├── hooks/
│   ├── tool-gate.ts      # M1: Stop hook — blocks writes without active task
│   ├── compaction.ts     # M3: Compaction — injects anchors after compact
│   ├── system.ts         # M4: System prompt — always-on governance
│   ├── message-transform.ts  # M2: Context pruning (DCP pattern)
│   └── index.ts
├── tools/
│   ├── task.ts           # idumb_task — create/complete/status
│   ├── anchor.ts         # idumb_anchor — add/list context anchors
│   ├── status.ts         # idumb_status — governance overview
│   └── index.ts
├── schemas/
│   ├── anchor.ts         # Anchor data + scoring + staleness
│   └── index.ts
└── lib/
    ├── logging.ts        # TUI-safe file logging (zero console.log)
    └── index.ts
```

### Hooks

| Hook | Mechanism | What it does |
|------|-----------|-------------|
| `tool.execute.before` | **Stop hook** | Blocks write/edit tools without active task. Throws BLOCK+REDIRECT+EVIDENCE error. |
| `tool.execute.after` | **Defense-in-depth** | Fallback: replaces output if before-hook throw didn't block. |
| `experimental.session.compacting` | **Compaction survival** | Injects top anchors + active task into post-compaction context. Budget ≤500 tokens. |
| `experimental.chat.system.transform` | **System prompt** | Always-on governance directive: task + critical anchors + rules. Budget ≤200 tokens. |
| `experimental.chat.messages.transform` | **Context pruning** | Truncates stale tool outputs (DCP pattern). Keeps last 10, truncates older. |

### Tools

| Tool | Purpose |
|------|---------|
| `idumb_task` | Create/complete/status for active task. Required before file writes. |
| `idumb_anchor` | Add/list context anchors that survive compaction. |
| `idumb_status` | Read-only governance state overview (task + anchors + rules). |

## Quick Start

```bash
npm install && npm run build && npm test  # 45/45 tests pass
```

### Install in OpenCode

Add to `~/.config/opencode/opencode.json`:
```json
{
  "plugin": [
    "/path/to/idumb/v2"
  ]
}
```

Restart OpenCode. The plugin loads automatically.

### Verify

In OpenCode, try to write a file without creating a task first:
- **Expected**: `GOVERNANCE BLOCK` error with redirect to `idumb_task`
- Create a task: agent calls `idumb_task` with `action: "create"`
- Retry write: **succeeds**

## Design Principles

| # | Principle | What it means |
|---|-----------|---------------|
| P1 | ONE THING AT A TIME | Build, validate end-to-end, then next |
| P2 | PLATFORM NATIVE | Use `.opencode/` conventions, not custom dirs |
| P3 | GRACEFUL DEGRADATION | try/catch everywhere, never break TUI |
| P4 | EVIDENCE-BASED | Testable hypotheses, live validation |
| P5 | IN-MEMORY SESSION STATE | Maps for session state, no file I/O in hooks |
| P6 | SDK FORMAT DEFENSIVE | Check every field before access |
| P7 | COMPOSABLE | Hook factory pattern, isolated modules |
| P8 | TEST WITH MOCKS FIRST | 45 mock tests before live testing |

## Tests

```bash
npm test  # Runs all 3 test suites

# Individual suites:
npx tsx tests/tool-gate.test.ts       # 16/16 — block/allow/retry/fallback
npx tsx tests/compaction.test.ts      # 16/16 — injection/budget/stale/critical
npx tsx tests/message-transform.test.ts  # 13/13 — pruning/exempt/invalid
```

## Known Limitations

- **Subagent hook gap**: `tool.execute.before` does not fire for subagent tool calls ([sst/opencode#5894](https://github.com/sst/opencode/issues/5894))
- **In-memory only**: Session state lost on plugin restart (by design — P5)
- **No role-based permissions yet**: Stop hook blocks ALL writes without task, regardless of agent role

## License

[MIT](https://opensource.org/licenses/MIT)
