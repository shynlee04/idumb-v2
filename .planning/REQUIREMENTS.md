# Requirements: iDumb — AI Knowledge Work Platform

**Defined:** 2026-02-09
**Core Value:** OpenCode powers a multi-persona knowledge work UI where planning, research, delegation, and implementation flow through one governed system with full traceability.

## v1 Requirements

### Planning Registry

- [ ] **REG-01**: Planning artifacts stored as JSON nodes in a hierarchical graph (Chain → Artifact → Section → Task), not flat markdown files
- [ ] **REG-02**: Every artifact node carries a timestamp (created, modified) used for staleness detection and temporal ordering
- [ ] **REG-03**: Chain-break detection hook: when a parent-child link breaks (orphan, missing dependency, stale reference), the system auto-detects and triggers governance re-consumption of the affected subtree
- [ ] **REG-04**: Auto-decision hook: when a chain break is detected, the governance system automatically evaluates the break severity and either flags for human attention or auto-heals (e.g., re-links to nearest valid parent)

### Smart Delegation

- [ ] **DEL-01**: 3-level task hierarchy — Epic (Coordinator) → Task (Investigator/Executor) → Subtask (Executor) — replacing the innate TODO list
- [ ] **DEL-02**: Atomic commit enforcement — when a task moves to `completed`, the system checks `git diff`; if diff exists, forces a commit with task ID reference in the message
- [ ] **DEL-03**: Empty diff blocks completion — task cannot complete if `git diff` is empty (no changes = no evidence of work)
- [ ] **DEL-04**: Schema-regulated metadata — agents must emit structured delegation data: which agent delegated, to whom, doing what, expected output, and downstream agents must emit which tools executed, for which plan, and last assistant message

### Codebase Wiki

- [ ] **WIKI-01**: Every git commit is linked to its originating task ID — the commit message or metadata contains a machine-readable task reference
- [ ] **WIKI-02**: Diff tracking per commit — file changes with hashes and brief descriptions recorded as structured data, not just git log
- [ ] **WIKI-03**: Rationale embedded in actions — every code change action carries a "why" field that aids AI agent reasoning when traversing context

### Knowledge Base

- [ ] **KB-01**: TechStackNode with status lifecycle (proposed → approved → deprecated) — tech decisions are tracked as stateful entities, not static docs
- [ ] **KB-02**: Research-to-feature linking — implementation features are explicitly linked to research artifacts; the link is bidirectional and queryable
- [ ] **KB-03**: Knowledge synthesis — raw research notes compiled into single-source-of-truth entries that agents consume instead of re-reading scattered research docs

### UI & Interaction

- [ ] **UI-01**: Delegation task view — interactive task list showing the 3-level hierarchy, who delegated to whom, what they're doing, current status, and agent assignments
- [ ] **UI-02**: Trajectory visualization — only the active/winning planning path is shown; abandoned branches are hidden from default views (preventing context poisoning)
- [ ] **UI-03**: Interactive planning artifacts — planning documents rendered as markdown with metadata hierarchy, commentable by users, showing related upstream and cross-section artifacts

### OpenCode Engine

- [ ] **ENG-01**: Governance hooks wired through OpenCode SDK — tool-gate (blocks writes without active task), compaction (anchor injection), context injection (system.transform with active trajectory only)
- [ ] **ENG-02**: Agent orchestration through OpenCode Server — multiple AI sessions managed programmatically, agents spawned/coordinated for multi-step workflows
- [ ] **ENG-03**: Chat completion through the Web UI — user sends messages, OpenCode processes them, streaming responses rendered in the browser
- [ ] **ENG-04**: Research agents — AI agents that investigate topics, search the web, read documentation, and write structured findings to the knowledge base
- [ ] **ENG-05**: Source synthesis — user uploads documents/sources, AI synthesizes across them (NotebookLM-style cross-source reasoning and Q&A)

## v2 Requirements

### Planning Registry

- **REG-05**: Full lifecycle state machine (draft → review → active → implemented → archived → abandoned) with transition rules and guards
- **REG-06**: Context purging — abandoned artifacts actively filtered from LLM context injection hooks
- **REG-07**: Upstream propagation — child artifact changes recursively trigger parent artifact updates
- **REG-08**: Drift detection — content hashing to detect manual edits vs governed edits
- **REG-09**: Rationale tracking — every section carries a mandatory "why this exists" field

### Smart Delegation

- **DEL-05**: Write-gate enforcement — Executor blocked from `write_file` without a claimed Subtask (separate from the current tool-gate which checks for any active task)
- **DEL-06**: Property watching with temporal gates — timestamp-based rules enforcing "X cannot happen before Y" with stop hooks on downstream tools

### Codebase Wiki

- **WIKI-04**: Upstream auto-update — wiki auto-updates when downstream implementation artifacts change

### Knowledge Base

- **KB-04**: Gap Gate blocking — system blocks creation of implementation Epics when supporting research is unresolved

### UI & Interaction

- **UI-04**: Trace queries — input file path → output Plan → Task → Rationale chain
- **UI-05**: Registry graph visualization — Mermaid graph of current active trajectory
- **UI-06**: Prune suggestions — flag artifacts untouched for N turns

### OpenCode Engine

- **ENG-06**: Multi-agent RAG — multi-agent retrieval-augmented generation for office/non-coding workflows

## Out of Scope

| Feature | Reason |
|---------|--------|
| Graph database (Neo4j, ArangoDB) | JSON files + in-memory traversal sufficient at this scale (~1000 nodes) |
| Mobile app | Web-first, localhost for now |
| Multi-tenant auth | Single-user local tool initially |
| NLP graph queries | Structured traversal and search, not conversational |
| Bi-directional git sync | Read git state, don't manage git history |
| Full graph database with Cypher queries | Over-engineering for the data volume |
| Custom LLM backend | OpenCode is the engine — no competing AI integration |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| REG-01 | Phase 2 | Pending |
| REG-02 | Phase 2 | Pending |
| REG-03 | Phase 3 | Pending |
| REG-04 | Phase 3 | Pending |
| DEL-01 | Phase 1 | Pending |
| DEL-02 | Phase 2 | Pending |
| DEL-03 | Phase 2 | Pending |
| DEL-04 | Phase 1 | Pending |
| WIKI-01 | Phase 2 | Pending |
| WIKI-02 | Phase 2 | Pending |
| WIKI-03 | Phase 2 | Pending |
| KB-01 | Phase 3 | Pending |
| KB-02 | Phase 3 | Pending |
| KB-03 | Phase 3 | Pending |
| UI-01 | Phase 4 | Pending |
| UI-02 | Phase 4 | Pending |
| UI-03 | Phase 4 | Pending |
| ENG-01 | Phase 1 | Pending |
| ENG-02 | Phase 1 | Pending |
| ENG-03 | Phase 1 | Pending |
| ENG-04 | Phase 3 | Pending |
| ENG-05 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0

---
*Requirements defined: 2026-02-09*
*Last updated: 2026-02-09 — traceability table populated from ROADMAP.md phasing*
