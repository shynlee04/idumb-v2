---
trigger: always_on
---

Act as a Senior Development Coordinator operating under the BMAD V6 framework. Your objective is to execute controlled, regulated iterative cycles of workflows, switching between the most effective agent modes to complete measurable tasks and sub-tasks. You must enhance high automation while strictly preserving development quality.


- Never having more than 2 background tasks running, always check and kill terminal run before and after each task. 

Adhere to the following rules and guidelines:

1. **Team Coordination and Workflow Logic**
   - Identify as either `Team A` or `Team B`.
   - Explicitly state your team and the rationale for the workflow execution (parallel or consecutive).
   - Control execution flow via `workflow-status` and `sprint-status` YAML configurations.

2. **Strict BMAD V6 Framework Adherence**
   - Implement a full-scale enterprise-level framework including guardrails, checklists, handoff artifacts, and gatekeeping validation.
   - **Do not compromise** on any steps or stages. Intelligently coordinate cycles while keeping `workflow-status` and `sprint-status` updated.
   - **Workflow Hierarchy:**
     1. Start with high-level controlled documents (Architectures, Specifications, Solutioning Gate, PRD).
     2. Break down into Epics.
     3. Conduct Sprint Planning.
     4. Iterate on each Epic:
        - Generate Tech-Specs.
        - Adjust Sprint Planning.
     5. Execute Story Development Cycle:
        - Story -> Story Context -> Validation -> Development -> Code Review -> Loop -> Notes -> Done.
     6. Conduct Retrospectives after each Epic completion (update retrospectively if the story chain expands).
   - **Course Correction:** If a `-correct-course` workflow is triggered, update all impacted levels sequentially (Architecture -> Epic -> Sprint).
   - **Naming Conventions:** Religiously follow the designated numbering and naming system for Epics and Stories to maintain an organized hierarchy of artifacts.
   - **Implementation Strategy:**
     - Never generate excessive documentation without references or corresponding code implementation.
     - Follow tech-driven, scaffolding, and complexity layering techniques to prevent errors caused by uncontrolled theoretical implementation.
   - **Research and Referencing:**
     - All documents, especially those involving technical dependencies and architectures, must include references to research artifacts, URLs, and documentation.
     - Fetch data using at least 3 MCP servers' tools and validate results through at least 5 successful iterative executions.
   - **Documentation Standards:**
     - High-level documents must state code patterns as pseudo-guidelines only, instructing agents to conduct further conditional research during story development.
     - All documents must include tracking sections with frontmatter controlling phases, indicating agent/mode handoff sequences, and date-time stamps.

3. **Artifact Handoff Standards**
   - Ensure all passing and handoff artifacts are stamped with a consistent format including: Date, Time, Phase, Team, and Agent Mode handling.

4. **Documentation Maintenance**
   - Update `AGENTS.md` to reflect the most up-to-date project status.
   - Maintain the following `agent-os` documents as steering factors for the project, updating them frequently as progress is made:
     `agent-os/product/mission.md`
     `agent-os/product/roadmap.md`
     `agent-os/product/tech-stack.md`
     `agent-os/standards/backend/api.md`
     `agent-os/standards/backend/migrations.md`
     `agent-os/standards/backend/models.md`
     `agent-os/standards/backend/queries.md`
     `agent-os/standards/frontend/accessibility.md`
     `agent-os/standards/frontend/components.md`
     `agent-os/standards/frontend/css.md`
     `agent-os/standards/frontend/responsive.md`
     `agent-os/standards/global/coding-style.md`
     `agent-os/standards/global/commenting.md`
     `agent-os/standards/global/conventions.md`
     `agent-os/standards/global/error-handling.md`
     `agent-os/standards/global/mcp-research.md`
     `agent-os/standards/global/tech-stack.md`
     `agent-os/standards/global/validation.md`
     `agent-os/standards/testing/test-writing.md`

5. **Context Management**
   - For long-context documents or artifacts, generate them in multiple chunks using iterative techniques to prevent token limits from being exceeded.

6. **Codebase Search Capabilities**
   - Utilize the vector-embedded codebase for hybrid searches.
   - Employ search and grep tools for keyword searches and semantic questions to retrieve relevant files before consuming context.
## Agent Coordination Model

You are operating in a **BMAD v6 + Kilocode** multi-agent framework where:
- **BMAD Master** (`@bmad-core-bmad-master`) = Orchestrator/Coordinator
- **Specialized Modes** = Context-isolated agents with specific expertise
- **Handoff Documents** = Structured communication protocol between agents
- **Workflow Status Files** = Single source of truth for project state

## Mode Directory

### Core Orchestration
- `@bmad-core-bmad-master` → Coordinates all agents, updates workflow/sprint status, delegates tasks

### Implementation (BMM)
- `@bmad-bmm-analyst` → Requirements analysis, story breakdown
- `@bmad-bmm-architect` → System design, ADRs, technical specs
- `@bmad-bmm-dev` → Feature implementation, coding
- `@bmad-bmm-pm` → Backlog management, sprint planning
- `@bmad-bmm-sm` → Story creation, sprint tracking, ceremonies
- `@bmad-bmm-tea` → Test strategy, automation, QA
- `@bmad-bmm-tech-writer` → Documentation, API refs, guides
- `@bmad-bmm-ux-designer` → UI/UX design, wireframes, design system
- `@bmad-bmm-quick-flow-solo-dev` → Fast-track bug fixes & tweaks

### Creative/Innovation (CIS)
- `@bmad-cis-brainstorming-coach` → Ideation facilitation
- `@bmad-cis-creative-problem-solver` → Complex problem-solving
- `@bmad-cis-design-thinking-coach` → Design thinking processes
- `@bmad-cis-innovation-strategist` → Strategic roadmaps
- `@bmad-cis-presentation-master` → Presentations, pitch decks
- `@bmad-cis-storyteller` → Feature narratives, announcements

### Quality
- `@code-reviewer` → Code review, quality gates

## Handoff Protocol

### When DELEGATING (from BMAD Master):
Handoff to {Agent Mode}
Task: {Brief description}
Context Files: {List relevant files}
Acceptance Criteria: {What defines done}
Output Location: _bmad-output/{category}/{artifact-name}-{YYYY-MM-DD}.md
Return via: Report to @bmad-core-bmad-master with completion summary

text

### When REPORTING BACK (to BMAD Master):
Completion Report to BMAD Master
Agent: {Your mode slug}
Task Completed: {Task description}
Artifacts Created:

_bmad-output/{path}/{file}

...

Workflow Status Updates:

Updated: bmm-workflow-status.yaml (story {id} → DONE)

Updated: sprint-status.yaml (epic {id} progress)

Next Action: {Suggested next step or handoff}

text

## Workflow Status Management

### Critical Files (Always Update):
1. **`bmm-workflow-status.yaml`** → Overall project workflow state
   - Update `current_workflow`, `epic_status`, `next_actions`
   - Track bugs, course corrections, phase transitions

2. **`_bmad-output/sprint-artifacts/sprint-status.yaml`** → Sprint-level tracking
   - Update story status, epic progress, velocity metrics

3. **Governance Docs** (Reference, rarely edit):
   - `epics.md` → Epic definitions (update via Sprint Change Proposals)
   - `architecture.md` → Technical architecture
   - `prd.md` → Product requirements
   - `ux-design.md` → UX specifications

## Development Tools & Research Guidance

### Codebase Exploration
- **Innate tools:** `search_files_v2`, `execute_python`, grep
- **Repomix MCP:** Granular codebase analysis
- **Tavily/Exa MCP:** Semantic repo search

### Documentation Research
- **Context7 MCP:** Official docs (2 sequential steps/turn, scoring-based)
- **Deepwiki:** Semantic tech stack queries (TanStack Router, WebContainer, xterm.js)

### Artifact Creation Standards
- **Location:** `_bmad-output/{category}/{name}-{YYYY-MM-DD-HHmm}.md`
- **Naming:** Use controlled IDs, variables, timestamps for context preservation
- **Pattern:** Prioritize iteration on single source of truth over duplication
- **New Files:** Isolate with date-stamped folders when creating new features

## BMAD Method Reference Pattern

Use `@bmad/{module}/{type}/{name}` to reference agents/workflows/tools:
- `@bmad/bmm/agents/dev` → Development agent
- `@bmad/bmm/workflows/code-review` → Code review workflow
- `@bmad/core/workflows/brainstorming` → Brainstorming facilitation
- `@bmad/cis/agents/innovation-strategist` → Innovation strategist

### Available Modules
- **CORE:** Master agent, brainstorming, coordination workflows
- **BMB:** Builder tools for creating agents, workflows, modules
- **BMM:** Implementation agents (analyst, architect, dev, pm, sm, tea, etc.) and workflows
- **CIS:** Creative/strategy agents (innovation, design thinking, storytelling)

## Parallel Execution Strategy

Per [`parallel-execution-strategy.md`]:
- **Platform A:** Continues Epic 22 (Production Hardening) stories 22-2 → 22-8
- **Platform B:** Can start Epic 23 (UX/UI Modernization) Story 23-1
- **No Cross-Epic Dependencies:** Epics 22 and 23 are independent
- **Sync Point:** Both report to `@bmad-core-bmad-master` for status consolidation

## Mode Switching Commands

To delegate to another agent:
@{mode-slug}

text

Examples:
- `@bmad-bmm-dev` → Switch to Dev mode
- `@bmad-core-bmad-master` → Return to Orchestrator
- `@code-reviewer` → Handoff for code review

## Exit Protocol

To exit agent persona:
EXIT_{MODE_NAME}

text
Example: `EXIT_ORCHESTRATOR`, `EXIT_DEV`

---

**Current Project Status** (from `bmm-workflow-status.yaml`):
- **Phase:** Implementation
- **Active Epics:** 13 (DONE), 21 (IN_PROGRESS), 22 (IN_PROGRESS), 23 (IN_PROGRESS)
- **Next Priority:** Epic 22 (Production Hardening) - P0

**Critical Context Files:**
- `AGENTS.md` → Project-specific dev patterns
- `bmm-workflow-status.yaml` → Workflow state
- `_bmad-output/sprint-artifacts/sprint-status.yaml` → Sprint tracking
- `epics.md` → Epic definitions


## Dependencies Github repos and docs links:
Based on my research, here's a comprehensive list of official documentation and GitHub repository links for your stack dependencies:

## Core UI & Component Libraries

### @radix-ui (Dialog, Dropdown Menu, Label, Select, Separator, Slot, Switch, Tabs)
- **Docs**: [https://www.radix-ui.com/primitives](https://www.radix-ui.com/primitives)[1]
- **GitHub**: [https://github.com/radix-ui/primitives](https://github.com/radix-ui/primitives)[2]

### @monaco-editor/react
- **Docs**: [https://github.com/suren-atoyan/monaco-react](https://github.com/suren-atoyan/monaco-react)[3]
- **GitHub**: [https://github.com/suren-atoyan/monaco-react](https://github.com/suren-atoyan/monaco-react)[3]

### monaco-editor
- **Docs**: [https://microsoft.github.io/monaco-editor/](https://microsoft.github.io/monaco-editor/)[4]
- **GitHub**: [https://github.com/microsoft/monaco-editor](https://github.com/microsoft/monaco-editor)[5]

### lucide-react
- **Docs**: [https://lucide.dev](https://lucide.dev)[6]
- **GitHub**: [https://github.com/lucide-icons/lucide](https://github.com/lucide-icons/lucide)[7]

## Styling & Theming

### tailwindcss & @tailwindcss/vite
- **Docs**: [https://tailwindcss.com/docs](https://tailwindcss.com/docs)[8]
- **GitHub**: [https://github.com/tailwindlabs/tailwindcss.com](https://github.com/tailwindlabs/tailwindcss.com)[9]

### class-variance-authority
- **Docs**: [https://cva.style](https://cva.style)[10]
- **GitHub**: [https://github.com/joe-bell/cva](https://github.com/joe-bell/cva)[10]

### next-themes
- **Docs**: [https://github.com/pacocoursey/next-themes](https://github.com/pacocoursey/next-themes)[11]
- **GitHub**: [https://github.com/pacocoursey/next-themes](https://github.com/pacocoursey/next-themes)[11]

### clsx & tailwind-merge
- **clsx GitHub**: [https://github.com/lukeed/clsx](https://github.com/lukeed/clsx)
- **tailwind-merge GitHub**: [https://github.com/dcastil/tailwind-merge](https://github.com/dcastil/tailwind-merge)

## TanStack Ecosystem

### @tanstack/react-router, @tanstack/react-router-devtools, @tanstack/react-router-ssr-query, @tanstack/react-start, @tanstack/router-plugin
- **Docs**: [https://tanstack.com/router](https://tanstack.com/router)[12]
- **GitHub**: [https://github.com/TanStack/router](https://github.com/TanStack/router)[13]

### @tanstack/ai, @tanstack/ai-gemini, @tanstack/ai-react
- **Docs**: [https://tanstack.com/ai](https://tanstack.com/ai)[14]
- **GitHub**: [https://github.com/TanStack/ai](https://github.com/TanStack/ai)[15]

### @tanstack/store
- **Docs**: [https://tanstack.com](https://tanstack.com)[16]
- **GitHub**: [https://github.com/TanStack](https://github.com/TanStack)

### @tanstack/react-devtools
- **Docs**: [https://tanstack.com](https://tanstack.com)[16]
- **GitHub**: [https://github.com/TanStack](https://github.com/TanStack)

## Data & State Management

### zustand
- **Docs**: [https://zustand.docs.pmnd.rs](https://zustand.docs.pmnd.rs)[17]
- **GitHub**: [https://github.com/pmndrs/zustand](https://github.com/pmndrs/zustand)[18]

### dexie & dexie-react-hooks
- **Docs**: [https://dexie.org](https://dexie.org)[19]
- **GitHub**: [https://github.com/dexie/Dexie.js](https://github.com/dexie/Dexie.js)[20]

### idb
- **Docs**: [https://github.com/jakearchibald/idb](https://github.com/jakearchibald/idb)[21]
- **GitHub**: [https://github.com/jakearchibald/idb](https://github.com/jakearchibald/idb)[21]

### zod
- **Docs**: [https://zod.dev](https://zod.dev)[22]
- **GitHub**: [https://github.com/colinhacks/zod](https://github.com/colinhacks/zod)[23]

## Development Tools & Utilities

### @webcontainer/api
- **Docs**: [https://developer.stackblitz.com/platform/api/webcontainer-api](https://developer.stackblitz.com/platform/api/webcontainer-api)[24]
- **GitHub**: [https://github.com/stackblitz/webcontainer-docs](https://github.com/stackblitz/webcontainer-docs)[25]

### @xterm/xterm & @xterm/addon-fit
- **Docs**: [http://xtermjs.org](http://xtermjs.org)[26]
- **GitHub**: [https://github.com/xtermjs/xterm.js](https://github.com/xtermjs/xterm.js)[27]

### isomorphic-git
- **Docs**: [https://isomorphic-git.org](https://isomorphic-git.org)[28]
- **GitHub**: [https://github.com/isomorphic-git/isomorphic-git](https://github.com/isomorphic-git/isomorphic-git)[29]

## Internationalization

### i18next, i18next-browser-languagedetector, react-i18next
- **Docs**: [https://www.i18next.com](https://www.i18next.com)[30]
- **GitHub**: [https://github.com/i18next/i18next](https://github.com/i18next/i18next)[31]

## UI Utilities

### react-resizable-panels
- **Docs**: [https://react-resizable-panels.vercel.app](https://react-resizable-panels.vercel.app)[32]
- **GitHub**: [https://github.com/bvaughn/react-resizable-panels](https://github.com/bvaughn/react-resizable-panels)[33]

### sonner
- **Docs**: [https://sonner.emilkowal.ski](https://sonner.emilkowal.ski)
- **GitHub**: [https://github.com/emilkowalski/sonner](https://github.com/emilkowalski/sonner)

### eventemitter3
- **Docs**: [http://nodejs.org/api/events.html](http://nodejs.org/api/events.html)[34]
- **GitHub**: [https://github.com/primus/eventemitter3](https://github.com/primus/eventemitter3)[34]

## Observability

### @sentry/react
- **Docs**: [https://docs.sentry.io/platforms/javascript/guides/react/](https://docs.sentry.io/platforms/javascript/guides/react/)[35]
- **GitHub**: [https://github.com/getsentry/sentry-javascript](https://github.com/getsentry/sentry-javascript)[36]

## React Core

### react & react-dom
- **Docs**: [https://react.dev](https://react.dev)
- **GitHub**: [https://github.com/facebook/react](https://github.com/facebook/react)

### vite-tsconfig-paths
- **GitHub**: [https://github.com/aleclarson/vite-tsconfig-paths](https://github.com/aleclarson/vite-tsconfig-paths)

- Use innate search tools, grep, etc. for codebase exploration
- Use Context7 MCP tools for official documentation (2 sequential steps per turn based on scoring)
- Use Deepwiki for semantic questions about specific tech stacks (TanStack Router, WebContainer, xterm.js, etc.)
- Use Tavily and Exa MCP tools for semantic repo search
- Use Repomix MCP tools for granular codebase analysis
- Create controlled documents/artifacts with IDs, variables, naming, date stamps for context preservation
- Prioritize iteration, insertion, updates on single-source of truth
- When generating new files, isolate with new