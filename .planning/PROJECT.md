# iDumb — AI Code IDE + Knowledge Work Platform

## What This Is

A self-hosted AI-powered Code IDE and knowledge work platform built on the OpenCode SDK. Users open a browser-based workspace with Monaco editor, file tree, integrated terminal, code diffs, and multi-agent AI chat — designed for Vietnamese developers and knowledge workers. The platform exposes all OpenCode SDK capabilities through a polished UI with strict type-safe schemas from day one.

## Core Value

Prove that OpenCode SDK can power a full-featured self-hosted Code IDE (like Cursor/Windsurf) with governed multi-agent workspace features — not just a chat wrapper, but a production-grade development environment where code editing, AI assistance, project planning, and team collaboration flow through one governed system.

## Current Milestone: v2.0 — AI Code IDE + Workspace Foundation

**Goal:** Build a rich Code IDE (Stage 1) then validate governed multi-agent workspace on top (Stage 2). If Stage 2 fails, pivot Stage 1 into advanced standalone code IDE.

**Strategy:** 2-stage validation
- **Stage 1 (MVP):** Code IDE — Monaco editor, file tree, terminal, diffs, proper rendering, i18n-ready. Self-hosted Cursor/Windsurf alternative.
- **Stage 2 (Validation):** Governed Workspace — planning registry, delegation, wiki, knowledge base rebuilt with SDK-direct patterns. Project planning & monitoring panel.
- **If Stage 2 fails:** Pivot to advanced standalone Code IDE. Abandon multi-agent workplace direction.

**Target features (Stage 1):**
- Monaco editor with syntax highlighting, multi-tab, auto-complete
- File tree navigation (read/write via OpenCode SDK)
- Integrated terminal
- Code diffs (inline and side-by-side)
- Proper markdown/code rendering in chat (not raw markdown)
- i18n architecture (English first, Vietnamese ready)
- All OpenCode SDK features exposed through UI
- Strict TypeScript schemas for all data models

**Target features (Stage 2):**
- Planning registry (REG-01 through REG-04) — rebuilt with SDK-direct patterns
- Smart delegation (DEL-01 through DEL-04) — migrated from plugin mindset
- Codebase wiki + knowledge base (WIKI/KB) — rebuilt with SDK advantages
- Project planning & monitoring panel (evolved from UI-01/02/03)
- Notion-like block editor (experimental)
- AI agent packages (experimental)

## Requirements

### Validated

- ✓ Chat streaming via OpenCode SDK — Phase 1 (ENG-03)
- ✓ Basic task hierarchy schema — Phase 1 (DEL-01 partial)
- ✓ Settings UI scaffold — Phase 1 (read-only)
- ✓ Plugin architecture archived — Phase 1A
- ✓ 3-agent system deployed via CLI — Phase n6-Iter1

### Active

- [ ] Code IDE with Monaco editor, file tree, terminal, code diffs
- [ ] Proper chat rendering (markdown, code blocks, tool results)
- [ ] i18n architecture (English first, Vietnamese ready)
- [ ] OpenCode SDK features fully exposed in UI
- [ ] Strict TypeScript schemas for all data models from day 1
- [ ] Planning registry rebuilt with SDK-direct patterns
- [ ] Smart delegation rebuilt with SDK approach
- [ ] Knowledge base rebuilt with SDK advantages
- [ ] Project planning & monitoring panel
- [ ] Notion-like block editor (experimental, Stage 2)
- [ ] AI agent packages (experimental, Stage 2)

### Out of Scope

- Graph database (Neo4j, ArangoDB) — JSON files + in-memory traversal sufficient at scale
- Mobile app — web-first, localhost for now
- Multi-tenant auth — single-user local tool initially
- Custom LLM backend — OpenCode is the sole engine
- Plugin architecture — deprecated, SDK-direct only
- Cloud deployment — self-hosted first, cloud pivot is future
- Full Vietnamese localization — i18n-ready but English-first for now

## Context

**What shipped (Phase 1 + 1A):**
- React + Express + Vite dashboard with chat streaming, task sidebar, settings UI
- ~13,500 LOC of governance tooling (schemas, agent templates, task graph)
- Plugin architecture archived; only `@opencode-ai/sdk` remains
- 466 test assertions across 10 suites

**Reference implementations:**
- **CodeNomad** (github.com/NeuralNomadsAI/CodeNomad) — AI code IDE with Monaco, file tree, terminal
- **Portal** (github.com/hosenur/portal) — similar code IDE patterns
- **OpenWork** (github.com/different-ai/openwork) — OpenCode SDK workplace features
- **project-alpha-master** — lessons on scope creep, WebContainer patterns, block editors

**What failed in v2:**
- Over-templated agent deployment (1463 LOC templates.ts)
- Plugin-era thinking for features that should use SDK directly
- No proper code rendering in chat (raw markdown)
- No code editing features (the core value prop was missing)
- Planning artifacts as flat markdown with no relational metadata

**Unresolved tech decisions (pending research):**
- TanStack Start vs current React + Express + Vite
- WebSocket necessity when SSE is available
- OpenCode SDK capabilities for Code IDE features
- Vercel AI SDK for client-side AI features
- Payload CMS for data management + auto type safety
- i18n framework selection
- Monaco vs alternative editor components

## Constraints

- **Engine**: OpenCode SDK — sole interface for all AI capabilities. No alternative AI backends.
- **Self-hosted**: Must run on user's machine. No cloud dependencies for core features.
- **i18n-ready**: Architecture must support localization from day 1, even though English ships first.
- **Schema-first**: All data models defined as strict TypeScript types before implementation. Learned from project-alpha-master.
- **Team-ready (Phase 4+)**: Architecture must support parallel worktrees and independent epics for team contribution.
- **LOC discipline**: Source files target 300-500 LOC. Files above 500 LOC flagged for splitting.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| OpenCode as engine, not custom LLM backend | Leverage existing tool execution, agent orchestration | ✓ Good |
| JSON files over graph database | ~1000 nodes max, in-memory traversal sufficient | ✓ Good |
| Aggressive cleanup over clean-room rewrite | Concepts right, implementations wrong | ✓ Good |
| Plugin architecture deprecated | SDK-direct is simpler, more powerful | ✓ Good |
| 2-stage MVP validation | Prove Code IDE first, then test governed workspace | — Pending |
| TanStack Start vs current stack | Research-dependent — needs 2026 best practices analysis | — Pending |
| WebSocket vs SSE-only | Research-dependent — is WebSocket needed alongside SSE? | — Pending |
| Payload CMS for data management | Research-dependent — type safety + automation fit? | — Pending |
| i18n-ready English-first | Vietnamese users are target but English ships first | — Pending |
| Schema-first development | Learned from project-alpha-master scope creep | — Pending |

---
*Last updated: 2026-02-10 after milestone v2.0 start — AI Code IDE + Workspace Foundation*
