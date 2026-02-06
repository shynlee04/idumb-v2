<p align="center">
  <h1 align="center">iDumb v2</h1>
  <p align="center"><strong>Intelligent Delegation Using Managed Boundaries</strong></p>
  <p align="center">An OpenCode plugin that makes AI agents think before they write.</p>
</p>

<p align="center">
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.7-blue.svg" alt="TypeScript"></a>
  <a href="#tests"><img src="https://img.shields.io/badge/Tests-150%2F150-brightgreen.svg" alt="Tests"></a>
  <a href="https://opencode.ai/docs/plugins/"><img src="https://img.shields.io/badge/OpenCode-Plugin-green.svg" alt="OpenCode Plugin"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="MIT License"></a>
</p>

---

## What is iDumb?

**iDumb** is a governance layer for AI coding agents. It sits between the LLM and your codebase, enforcing simple but powerful rules:

1. **No writing without a task** — The agent must declare what it's doing before modifying files
2. **Context survives compaction** — Critical decisions persist when the LLM's context window resets
3. **Stale outputs get pruned** — Old tool results are truncated to keep the context lean
4. **Your brownfield is understood** — On first run, iDumb scans your project and adapts

All governance is deterministic. No LLM reasoning involved in enforcement.

---

## Quick Start

### 1. Initialize in your project

```bash
cd your-project
npx idumb-v2 init
```

The interactive CLI will ask you:

| Prompt | Options | Default |
|--------|---------|---------|
| **Scope** | project / global | project |
| **Language** | English / Tiếng Việt | English |
| **Document language** | English / Tiếng Việt | same as above |
| **Experience** | beginner / guided / expert | guided |
| **Governance** | balanced / strict / autonomous | balanced |

Or use defaults without prompts:

```bash
npx idumb-v2 init -y
```

### What it deploys

```
your-project/
├── .idumb/                              # Governance data
│   ├── config.json                      # Your settings
│   ├── idumb-modules/                   # Templates the meta-builder reads
│   │   ├── schemas/agent-contract.md    # Agent creation contract
│   │   ├── commands/command-template.md # Command reference
│   │   └── workflows/workflow-template.md
│   ├── anchors/                         # Context anchors
│   ├── brain/                           # Hook state persistence
│   └── ...
├── .opencode/
│   ├── agents/
│   │   └── idumb-meta-builder.md        # Meta Builder agent (primary)
│   └── commands/
│       ├── idumb-init.md                # /idumb-init command
│       ├── idumb-settings.md            # /idumb-settings command
│       └── idumb-status.md              # /idumb-status command
└── opencode.json                        # Plugin path auto-configured
```

### 2. Start OpenCode

```bash
opencode
```

The Meta Builder agent is immediately available:
- Press **Tab** to switch to the `idumb-meta-builder` agent
- Or run `/idumb-init` to start the guided setup

### 3. The Meta Builder runs 3 phases

**Phase 1 — Greeting (read-only):** Scans your project, detects frameworks and tech stack, reports gaps and conflicts, asks permission to proceed.

**Phase 2 — Deep Scan:** Maps architecture, dependencies, and patterns. Produces a project intelligence report.

**Phase 3 — Setup (with permission):** Creates the agent team (`idumb-supreme-coordinator`, `idumb-builder`, `idumb-validator`, `idumb-skills-creator`), commands, and workflows under `.opencode/`.

### 4. Governance is active

Once the plugin loads, the tool gate enforces task-first writing:

```
Agent: "Create hello.txt"
→ GOVERNANCE BLOCK: write denied
→ USE INSTEAD: Call "idumb_task" with action "create"
```

Create a task first, then writes succeed:

```
idumb_task create "Add hello world file"
→ Task created. You may now proceed with file writes.
```

### Alternative: Clone and build from source

```bash
git clone https://github.com/shynlee04/idumb-v2.git
cd idumb-v2
npm install && npm run build    # or: pnpm install && pnpm build
```

Then run init in your target project:

```bash
cd /path/to/your-project
npx idumb-v2 init
```

---

## Features

### Tool Gate — Block writes without a task

Every `write` and `edit` tool call is intercepted. If there's no active task, the call is blocked with a redirect message that tells the agent exactly what to do instead.

### Framework Detection — Know your brownfield

On `idumb_init`, the plugin scans your project root for:

| Category | What it detects |
|----------|----------------|
| **Governance frameworks** | BMAD, GSD, Spec-kit, Open-spec |
| **Tech stack** | Next.js, React, Vue, Svelte, Angular, Express, NestJS, Django, Flask, Rails, Laravel, and more |
| **Package manager** | npm, yarn, pnpm, bun, pip, cargo, go |
| **Existing agent dirs** | `.opencode/agents`, `.claude/agents`, `.windsurf/skills`, etc. |
| **Monorepo** | turbo, nx, lerna, pnpm workspaces |
| **Gaps & conflicts** | Missing deps, no README, stale configs |

### Compaction Survival — Context that persists

When OpenCode compacts the session (context window reset), iDumb injects your critical context anchors and active task into the post-compaction prompt. The agent remembers what matters.

### Context Pruning — Stay lean

Old tool outputs are automatically truncated (DCP pattern). Keeps the last 10 tool results intact, truncates older ones to 150 chars. Exempt tools (like `idumb_task`) are never pruned.

### Disk Persistence — State survives restarts

Session state (active tasks, anchors) is persisted to `.idumb/brain/hook-state.json` with debounced writes (500ms). If disk fails, hooks gracefully degrade to in-memory operation.

### Bilingual — English & Vietnamese

All output (greeting, scan report, next steps) supports English (`en`) and Vietnamese (`vi`).

---

## Configuration

`idumb_init` accepts these parameters:

| Parameter | Options | Default | Description |
|-----------|---------|---------|-------------|
| `action` | `install`, `scan`, `status` | `install` | Full init, read-only scan, or check existing config |
| `language` | `en`, `vi` | `en` | Communication language |
| `documents_language` | `en`, `vi` | same as `language` | Language for generated documents |
| `experience` | `beginner`, `guided`, `expert` | `guided` | Verbosity level |
| `governance_mode` | `balanced`, `strict`, `autonomous` | `balanced` | How strictly the agent is governed |
| `scope` | `project`, `global` | `project` | Installation scope |
| `force` | `true`, `false` | `false` | Overwrite existing config |

### Governance Modes

- **Balanced** — Agent gets recommendations and correct choices before stopping. Full completion allowed, governed at decision boundaries.
- **Strict** — Incremental validation at every node. Agent must pass gate before proceeding to next task.
- **Autonomous** — Agent decides freely. Minimal intervention, maximum freedom. Still logs everything for review.

---

## Architecture

```
bin/
└── cli.mjs                     # Shebang wrapper for npx
src/
├── cli.ts                      # CLI entry point (npx idumb-v2 init)
├── cli/
│   └── deploy.ts               # Agent + command + module deployment
├── templates.ts                # All deployable templates (OpenCode format)
├── index.ts                    # Plugin entry — 5 hooks + 4 tools
├── hooks/
│   ├── tool-gate.ts            # Blocks write/edit without active task
│   ├── compaction.ts           # Injects anchors into post-compaction context
│   ├── message-transform.ts    # Prunes stale tool outputs (DCP pattern)
│   └── system.ts               # Governance directive in system prompt
├── lib/
│   ├── logging.ts              # TUI-safe file-based logger
│   ├── framework-detector.ts   # Read-only brownfield scanner
│   ├── scaffolder.ts           # Creates .idumb/ directory tree
│   └── persistence.ts          # StateManager — disk persistence
├── schemas/
│   ├── anchor.ts               # Anchor types, scoring, staleness
│   └── config.ts               # IdumbConfig schema
├── tools/
│   ├── init.ts                 # idumb_init — the plugin tool
│   ├── task.ts                 # idumb_task — task management
│   ├── anchor.ts               # idumb_anchor — context anchors
│   └── status.ts               # idumb_status — governance overview
└── modules/
    ├── agents/meta-builder.md  # Meta builder agent profile (reference)
    └── schemas/agent-profile.ts # Agent profile contract
```

### Plugin Hooks

| Hook | What it does |
|------|-------------|
| `tool.execute.before` | Blocks write/edit without active task (throws error with redirect) |
| `tool.execute.after` | Defense-in-depth fallback if before-hook didn't block |
| `experimental.session.compacting` | Injects anchors + task into post-compaction context |
| `experimental.chat.system.transform` | Injects governance directive into system prompt |
| `experimental.chat.messages.transform` | Prunes old tool outputs to save tokens |

### Custom Tools (4 of max 5)

| Tool | Description |
|------|-------------|
| `idumb_init` | Initialize — scans brownfield, creates `.idumb/` config and directory structure |
| `idumb_task` | Create/complete/check active task. Required before write/edit |
| `idumb_anchor` | Add/list context anchors that survive compaction |
| `idumb_status` | Read-only governance state overview |

---

## Tests

```bash
npm test               # 150/150 assertions across 5 test files
pnpm test              # same — works with any package manager
yarn test              # same
bun run test           # same
```

Individual suites:

```bash
npx tsx tests/tool-gate.test.ts         # 16/16 — block/allow/retry/fallback
npx tsx tests/compaction.test.ts        # 16/16 — injection/budget/stale/critical
npx tsx tests/message-transform.test.ts # 13/13 — pruning/exempt/invalid
npx tsx tests/init.test.ts              # 60/60 — config/detection/scaffold/report
npx tsx tests/persistence.test.ts       # 45/45 — round-trip/debounce/degradation
```

---

## Design Principles

| Principle | What it means |
|-----------|---------------|
| **No hallucination** | Code matches docs. If it's not tested, it's not claimed. |
| **TUI safety** | Zero `console.log`. File-based logging only. |
| **Graceful degradation** | Every hook wrapped in try/catch. Never crash the host. |
| **Schema-first** | Plain TypeScript interfaces. No runtime validation overhead. |
| **Hook factory pattern** | Every hook = function returning async handler with captured state. |

---

## Known Limitations

- **Subagent hook gap** — `tool.execute.before` does not fire for subagent tool calls
- **SessionID per restart** — OpenCode assigns a new sessionID each session. Task/anchor state persists on disk but keys may not match across sessions.
- **Experimental hooks unverified** — `system.transform` and `messages.transform` are not in official OpenCode docs. Verification harness is built but needs live testing.

---

## Contributing

This is a community build. PRs welcome.

```bash
# Verify before submitting (works with npm, pnpm, yarn, or bun)
npm run typecheck    # tsc --noEmit — zero errors required
npm test             # 150/150 assertions — all must pass
npm run build        # tsc → dist/ — clean compile
```

---

## License

[MIT](https://opensource.org/licenses/MIT)
