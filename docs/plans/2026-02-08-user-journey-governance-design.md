# User Journey + Governance Design — iDumb v2

**Date:** 2026-02-08
**Status:** APPROVED (brainstorming complete)
**Scope:** End-to-end user journey from install to active governance
**Depends on:** Phase 1a code (committed 40bb05e), templates.ts v3 migration (pending)

---

## 1. Vision

iDumb v2 is a **governance wrapper** — it wraps whatever workflow system is present (GSD, Spec-kit, or bare OpenCode) and adds delegation-aware governance on top. The 3 universal agents (coordinator, investigator, executor) adapt to any project through hook-injected profiles, not separate template variants.

### Design Principles

| # | Principle | Implementation |
|---|-----------|---------------|
| 1 | **Pull, not push** | Hooks capture state silently. Agents query tools when THEY need context. |
| 2 | **Instructive, not restrictive** | Agent profiles say what TO do, never "you cannot." YAML frontmatter controls tool visibility. |
| 3 | **Two-moment injection** | system.ts injects at session start + compaction only. Zero injection after tool calls. |
| 4 | **Permission deny is last resort** | tool-gate blocks silently with clean errors. The primary mechanism is tool visibility + instructive guidance. |
| 5 | **Universal agents** | 3 agents work in any project. Profile switching via hook injection, not .md file circus. |
| 6 | **Framework wrapper** | iDumb wraps GSD / Spec-kit / OpenCode innate. Never replaces workflows. |
| 7 | **Scan depth** | Codebase scan is 5-phase, cross-domain. Not just code — wiki, architecture, API, data models, contracts. |
| 8 | **Skill discovery is conditional** | Agents find-skill ONLY under documented trigger cases (SKILL.md), not as blanket fallback. |

---

## 2. User Journey Flow

```
npm install idumb-v2       <- package lands in node_modules
        |
        v
npx idumb-v2 init          <- interactive CLI
        |
        +-- Q1: Scope (project / global)
        +-- Q2: Communication language
        +-- Q3: Document language
        +-- Q4: Experience level (beginner / guided / expert)
        +-- Q5: Governance mode (balanced / strict / autonomous / retard)
        +-- Q6: Dashboard? (yes / no / later)   <-- NEW
        |
        v
Deep Project Scan           <- framework-detector.ts (enhanced)
        |
        +-- Tech stack detection (existing)
        +-- Governance framework detection: GSD? Spec-kit? Custom? None?
        +-- MCP server availability check             <-- NEW
        +-- Architecture scan (API, data models, wiki) <-- NEW
        |
        v
Config Persists Forever     <- .idumb/config.json (immutable until /idumb-settings)
        |
        v
Deploy 3 Agents             <- clean baseline .md files (instructive, no deny language)
Deploy Commands             <- /idumb-init, /idumb-status, /idumb-settings, /idumb-delegate
Bootstrap Task Graph        <- .idumb/brain/task-graph.json
Wire opencode.json          <- plugin path registered
        |
        v
IF dashboard=yes:
        +-- Start Express backend (SQLite-backed)
        +-- Start Vite frontend
        +-- Both wired to .idumb/brain/ data
        |
        v
User opens OpenCode         <- plugin loads, hooks activate
        |
        +-- system.ts reads config.json (ONE TIME at session start)
        +-- Detects: framework, mode, experience, active phase
        +-- Injects behavioral profile into agent context (<=200 tokens)
        +-- Governance is LIVE
```

### Config Persistence

- Config values (language, level, mode) are set ONCE at init and persist forever
- `/idumb-settings` is the ONLY way to change them post-init
- Scope (project/global) and detected frameworks are immutable (re-run `init --force` to re-scan)

---

## 3. The 3 Universal Agents

### 3.1 Philosophy

The 3 agents are universal — they work across every project type. They are NOT specialized per framework. The YAML frontmatter controls which tools each agent sees. The base .md content is instructive ("do B instead of A"). The system.ts hook injects framework-specific overlays at runtime.

**No deny language.** No "you are NOT allowed." No "STAY AWAY." Permission deny in tool-gate is the silent last resort, not the primary mechanism.

### 3.2 Capability Matrix

| Capability | Coordinator | Investigator | Executor |
|---|---|---|---|
| **Read/Search** (grep, glob, read) | Yes | Yes | Yes |
| **Write code** (edit, write) | Governance files only | Brain entries only | Full access |
| **govern_plan** | create, status, archive, abandon | status (read-only) | plan_tasks |
| **govern_task** | start, review, status | status | complete, fail, status |
| **govern_delegate** | assign, recall, status | status | status |
| **govern_shell** | inspection, git | validation, inspection | all purposes |
| **idumb_anchor** | add, list | add, list | list |
| **idumb_init** | status, scan | -- | -- |
| **MCP servers** | orchestration-level | research-level (deep) | execution-level |
| **find-skill** | route to correct skill | load domain expertise | load execution skill |
| **Context management** | delegates context | collects, purges, synthesizes | consumes context |

### 3.3 Agent Profile Structure

Each agent .md follows this section layout (depth modeled after Agentic project's agent patterns — learn, not copy):

```
1. YAML Frontmatter
   - description, model, temperature
   - tools: { govern_plan: true, govern_task: true, ... } per agent

2. Role Identity
   - 2-3 sentences: what you ARE, what you excel at

3. Core Responsibilities (3-4 pillars per agent)
   - Coordinator: Plan creation, Task delegation, Progress tracking, Quality review
   - Investigator: Codebase scanning (5-phase), Context synthesis, Domain research, Artifact discovery
   - Executor: Implementation precision, Build/test execution, Documentation writing, Tool-governed workflow

4. Strategy (step-by-step HOW)
   - Exact tool call sequences with govern_plan, govern_task, govern_delegate
   - Decision points (when to escalate, when to find-skill)
   - Cross-agent handoff protocol

5. Output Format
   - Structured template for what each agent returns
   - File:line references for claims
   - Anchor format for context preservation

6. Scan Protocol (per agent's role in the 5-phase scan)

7. Skill Discovery Triggers (symlinked SKILL.md)

8. Framework Baseline (default workflow, overridden by system.ts)

9. Quality Guidelines (behavior quality, not deny-based)
```

**Implementation note:** Full profile content is written during implementation using `agent-architect` skill and other prepared skills. This design defines the contract/structure only.

---

## 4. Workflow — Tools as the Backbone

Every piece of work flows through the v3 governance tools. No "just write the file."

### 4.1 The Mandatory Flow

```
Coordinator                         Investigator / Executor
    |                                       |
    +-- govern_plan create                  |   <- WorkPlan with goal
    +-- govern_plan plan_tasks              |   <- Break into TaskNodes
    +-- govern_delegate assign -------------|   <- Route task to agent
    |                                       |
    |                                 govern_task start
    |                                 govern_shell (validation/build/git)
    |                                 govern_task complete -----------|
    |                                                                |
    +-- govern_task review <-------------------------------------+
    +-- govern_task status                  |   <- Check progress
    |                                       |
    +-- govern_plan archive                 |   <- When all tasks done
```

### 4.2 Per-Agent Workflow Instructions

**Coordinator:**
When you receive a user request, create a WorkPlan with `govern_plan create`. Break it into TaskNodes with `govern_plan plan_tasks`. Assign each task to the right agent with `govern_delegate assign`. Track progress with `govern_task status`. Review completed work with `govern_task review`. Archive the plan when done with `govern_plan archive`.

**Investigator:**
When assigned a task, start it with `govern_task start`. Use innate tools (grep, glob, read) and MCP servers for deep research. Record findings as anchors with `idumb_anchor add`. When research is complete, mark it with `govern_task complete`. Check plan status with `govern_plan status` to understand the bigger picture.

**Executor:**
When assigned a task, start it with `govern_task start`. Plan your implementation steps with `govern_plan plan_tasks` (sub-plan if needed). Use `govern_shell` for builds, tests, and git operations. Complete with `govern_task complete` when the deliverable is ready.

---

## 5. Multi-Phase Codebase Scan Protocol

Regardless of framework, the scanning of documents and artifacts is meticulously instructed across multiple phases. Each phase builds on the previous one's findings.

### 5.1 Scan Phases

```
Phase 1: Structure Discovery
+-- File tree mapping (directories, naming conventions)
+-- Package/dependency graph (package.json, imports)
+-- Monorepo detection (workspaces, nx, turborepo)
+-- Entry points (main, bin, exports)

Phase 2: Architecture Extraction
+-- Component boundaries (where does module A end, B begin?)
+-- Data flow patterns (request lifecycle, state mutations)
+-- API surface (REST endpoints, GraphQL schemas, RPC contracts)
+-- Database/data models (schemas, migrations, ORMs)
+-- State management (stores, context, signals, atoms)

Phase 3: Documentation & Artifacts
+-- README, CONTRIBUTING, CHANGELOG
+-- Wiki / docs/ directory
+-- ADRs (architecture decision records)
+-- OpenAPI specs, proto files, JSON schemas
+-- Existing planning artifacts (.planning/, .plan/, docs/plans/)
+-- Agent/command configs (.opencode/, .claude/, .cursor/)

Phase 4: Quality & Contracts
+-- Test coverage patterns (what's tested, what's not)
+-- CI/CD pipeline analysis
+-- Linting/formatting configuration
+-- Type safety assessment
+-- Security surface (env files, secrets patterns, auth flows)

Phase 5: Cross-Domain Synthesis
+-- API <-> Data model alignment (do contracts match schemas?)
+-- Test <-> Feature coverage (what features lack tests?)
+-- Docs <-> Code drift (does documentation match reality?)
+-- Architecture <-> Dependencies (does the dep graph match boundaries?)
+-- Gaps registry (what's missing, stale, or contradictory)
```

### 5.2 Agent Roles in Scanning

**Coordinator** orchestrates: creates a WorkPlan with phases 1-5 as TaskNodes, assigns to Investigator sequentially, reviews between phases, instructs skill discovery when unfamiliar domain is found.

**Investigator** executes: uses innate tools first (grep, glob, read). For stack-specific scanning, triggers skill discovery. For cross-architecture synthesis, uses MCP servers (context7, deepwiki, web-search). Records findings as anchors.

**Executor** consumes: after scan completes, reads synthesized findings from anchors and task graph. Implements respecting discovered patterns and conventions.

### 5.3 MCP Server Usage in Scanning

- `context7` — library documentation lookup (current versions, APIs)
- `deepwiki` — repository knowledge extraction
- `web-search` — ecosystem patterns, best practices
- `zread` — documentation file analysis

MCP servers are used by Investigator during scan phases 2-5 for cross-referencing and synthesis.

---

## 6. Skill Discovery Protocol

Agents do NOT blanket-search for skills. A defined set of trigger cases lives in `SKILL.md`, symlinked across all 3 agent profiles.

### 6.1 Trigger Cases

```markdown
## Skill Discovery Protocol

Use find-skill or find-command ONLY under these conditions:

### When: Unfamiliar Stack
- Project uses a framework not in your baseline knowledge
- Example: Prisma schema found -> find-skill "prisma"
- Example: tRPC router found -> find-skill "trpc"

### When: Architecture Pattern Required
- Scan reveals a pattern that needs domain-specific handling
- Example: CQRS pattern detected -> find-skill "cqrs"
- Example: Event sourcing found -> find-skill "event-sourcing"

### When: Integration Point
- Connecting to external service, database, or API provider
- Example: Stripe webhooks -> find-skill "stripe"
- Example: Supabase auth flow -> find-skill "supabase"

### When: Testing Strategy Needed
- Stack-specific testing approach required
- Example: E2E for Next.js -> find-skill "playwright" or "cypress"
- Example: Component testing -> find-skill "testing-library"

### When: Build/Deploy Pipeline
- CI/CD or deployment configuration work
- Example: Docker multi-stage -> find-skill "docker"
- Example: Vercel config -> find-skill "vercel"

### When: Workflow/Methodology
- Project follows a specific methodology
- Example: GSD phases detected -> find-command "gsd"
- Example: Spec-kit found -> find-command "spec-kit"
```

### 6.2 Symlink Structure

```
.idumb/idumb-modules/skills/discovery-triggers.md   <- source of truth
.opencode/agents/idumb-supreme-coordinator.md        <- references via <skill_discovery> section
.opencode/agents/idumb-investigator.md               <- references via <skill_discovery> section
.opencode/agents/idumb-executor.md                   <- references via <skill_discovery> section
```

---

## 7. Runtime Injection — system.ts Hook

### 7.1 Two-Moment Model

Context injection happens at exactly TWO moments. Never after tool calls. Never after errors.

| When | Hook | What's Injected | Budget |
|------|------|----------------|--------|
| **Session start** | `experimental.chat.system.transform` | Governance context + framework overlay + active task | <=200 tokens |
| **Compaction** | `experimental.session.compacting` | Refreshed context: anchors + active task + governance state | <=500 tokens |

### 7.2 Silent State Capture

All other hooks capture state silently — zero tokens emitted into the conversation:

- `chat.params` — captures agent name, auto-assigns to active task
- `tool.execute.before` — allows or blocks with clean single-line error
- `tool.execute.after` — checkpoint recording (silent)

### 7.3 Pull Model

Agents retrieve context when THEY need it by calling tools:

```
govern_task status       -> "what's my active task?"
govern_plan status       -> "what's the bigger picture?"
idumb_anchor list        -> "what context survived?"
govern_delegate status   -> "who's doing what?"
```

The system does NOT push context at agents. Verbose reminders are LAST RESORT only (e.g., 3+ consecutive blocked tool calls indicating the agent is off-rails).

### 7.4 Framework Overlay Content

**GSD detected** (session start injection):
> "This project uses GSD. GSD phases map to WorkPlans. Use GSD commands for workflow. iDumb governance tracks progress through govern_plan."

**Spec-kit detected:**
> "This project uses Spec-kit. Spec stages map to WorkPlans. Follow spec-driven flow. iDumb governance tracks deliverables through govern_task."

**No framework — OpenCode fallback:**
> "No external framework detected. Use OpenCode's innate tools for exploration. iDumb governance tracks your work through govern_plan and govern_task."

---

## 8. Init Flow Additions

### 8.1 Q6: Dashboard

Added after governance mode selection in `cli.ts`:

```
Launch governance dashboard?

  -> 1. Yes    -- Start Express + Vite dashboard alongside governance
     2. No     -- Headless mode, governance runs silently
     3. Later  -- Skip now, run `idumb-v2 dashboard` anytime
```

- **Yes**: cli.ts spawns dashboard process after deploy. Dashboard connects to .idumb/brain/ data.
- **Later**: Config records `dashboard: "deferred"`. User runs `idumb-v2 dashboard` standalone.

### 8.2 /idumb-settings Command

The ONLY way to change persisted config after init:

```
/idumb-settings                    -> show current config
/idumb-settings language vi        -> change communication language
/idumb-settings governance strict  -> change governance mode
/idumb-settings experience expert  -> change experience level
/idumb-settings dashboard on       -> enable/start dashboard
/idumb-settings dashboard off      -> disable/stop dashboard
```

Changes write to `.idumb/config.json`. Next session start picks up new config via system.ts hook.

### 8.3 Immutable Settings

- **Scope** (project/global) — set at init, immutable
- **Detected frameworks** — re-run `idumb-v2 init --force` to re-scan
- **Plugin path** — managed by opencode.json

---

## 9. Framework Wrapping

iDumb is a governance WRAPPER. It never replaces workflows.

### 9.1 Detection + Wrapping Chain

```
Framework detected?
+-- GSD found      -> wrap GSD workflows with governance
+-- Spec-kit found -> wrap Spec-kit workflows with governance
+-- Both found     -> wrap both, user picks primary via /idumb-settings
+-- None found     -> fallback to OpenCode innate capabilities
|                     + iDumb governance layer on top
+-- Custom found   -> detect and adapt
```

### 9.2 What "Wrapping" Means

| Layer | GSD Project | Spec-kit Project | No Framework (OpenCode) |
|-------|------------|-----------------|------------------------|
| **Task tracking** | govern_plan maps to GSD phases | govern_plan maps to spec stages | govern_plan IS the workflow |
| **Delegation** | govern_delegate routes to GSD agents | govern_delegate routes to spec agents | govern_delegate routes to innate OpenCode agents |
| **Scanning** | Investigator scans + feeds GSD research | Investigator scans + feeds spec discovery | Investigator scans + feeds anchors |
| **Enforcement** | tool-gate enforces GSD phase gates | tool-gate enforces spec stage gates | tool-gate enforces task-first rule |
| **Commands** | GSD commands available, governed | Spec-kit commands available, governed | OpenCode commands + iDumb commands only |

The wrapper is thin. It observes and governs existing workflows, never redefines them.

---

## 10. Implementation Path

This design is implemented using the prepared skills:

| Component | Primary Skill | Notes |
|-----------|--------------|-------|
| Agent .md profiles | `agent-architect` + prepared skills | Full content with 9-section structure |
| Commands | `command-creator` | /idumb-settings, updated /idumb-init |
| system.ts hook rewrite | Code scope (no skill needed) | Two-moment injection model |
| CLI Q6 (dashboard) | Code scope | Add promptChoice to cli.ts |
| Framework detector enhancement | Code scope | MCP availability check, architecture scan |
| Skill discovery SKILL.md | `skill-creator` | Trigger cases, symlink structure |
| Dashboard wiring | Code scope | SQLite-backed, connect to brain/ |

### Implementation Order

1. **system.ts rewrite** — two-moment injection, pull model, framework overlay (code scope)
2. **CLI Q6 + /idumb-settings** — dashboard question, settings command (code scope)
3. **Agent profiles** — full 9-section content using skills (skill-driven)
4. **Commands rewrite** — updated commands using command-creator (skill-driven)
5. **Skill discovery SKILL.md** — trigger cases document (skill-driven)
6. **Framework detector enhancement** — MCP check, architecture scan (code scope)
7. **Dashboard wiring** — connect frontend to governance data (code scope)

---

## Appendix A: What This Design Supersedes

- Agent profile draft from Phase 1a (templates.ts partial v3 migration) — incomplete, wrong action lists
- Slice 1 plan (enforcement + SQLite + dashboard) — dashboard portion absorbed here
- Tool-agent redesign plan Phase 1 — tool split is done, this covers the agent + journey layer

## Appendix B: Reference

- Agentic project (github.com/Cluster444/agentic) — learned agent profile depth: identity, core responsibilities, strategy, output format, guidelines, anti-patterns. Adapted for universal agent model with hook injection.
- GSD project researcher profile — learned scan protocol depth: multi-phase, cross-domain, MCP-integrated, skill-discovery-triggered.
