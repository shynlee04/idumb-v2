# Architecture Decision: Plugin → SDK-Direct Standalone Platform

**Date:** 2026-02-10
**Status:** Approved
**Author:** Strategic pivot decision
**Impact:** High-level architecture change

## Context

### Previous Architecture (Plugin-Based)

iDumb v2 was originally designed as an **OpenCode plugin** that:
- Registered 7 hooks with OpenCode Server
- Provided 6 governance tools callable from agent sessions
- Intercepted tool execution and chat operations for governance
- Enforced task tracking, context preservation, and delegation workflows

### Architecture Diagram (Before)

```
OpenCode Server
└── Plugin: iDumb (index.ts)
    ├── 7 Hooks (tool.execute.before, chat.system.transform, etc.)
    └── 6 Tools (govern_plan, govern_task, govern_delegate, etc.)
```

### Problems Identified

1. **Limited Surface Area:** Plugin hooks cannot access full OpenCode Server capabilities
2. **Dependency on Host:** Plugin lifecycle bound to OpenCode Server process
3. **Frontend Isolation:** Dashboard frontend couldn't directly interact with governance logic
4. **Platform Constraint:** Plugin model assumes code is running as extension, not standalone platform
5. **UX/UI Limitation:** Plugin architecture designed for governance, not knowledge work UI innovation

## Decision

### New Architecture (SDK-Direct Standalone Platform)

iDumb is now a **standalone multi-agent workplace platform** that:
- Runs as independent application (Node.js backend + React frontend)
- Uses **OpenCode SDK** for all governance, AI capabilities, and agent orchestration
- Controls OpenCode Server programmatically via SDK client
- Plugin architecture is **deprecated and archived**
- Phase 1B focuses on bringing all SDK features to frontend UI

### Architecture Diagram (After)

```
iDumb Platform (Standalone)
├── Dashboard Backend (Node.js + Express)
│   ├── OpenCode SDK Client
│   │   ├── Hooks (tool.execute.before, chat.system.transform, etc.)
│   │   ├── Agent Management (start, stop, list agents)
│   │   ├── Tool Execution (execute tools with governance)
│   │   └── Session Management (create, control AI sessions)
│   ├── Governance Engine
│   │   ├── Task Graph (WorkPlan → TaskNode → Checkpoint)
│   │   ├── Delegation (3-agent hierarchy)
│   │   ├── Anchors (context survival)
│   │   └── Planning Registry (artifact chains)
│   └── WebSocket Server (real-time updates to frontend)
│
└── Dashboard Frontend (React + Vite)
    ├── Task Management UI (Smart TODO, WorkPlans)
    ├── Agent Control Panel (3-agent delegation)
    ├── Planning Workspace (artifacts, traceability)
    ├── Notion-like Block Editor (UX/UI innovation)
    └── AI Agent Packages (discoverable agent registry)

External Dependency:
└── OpenCode Server
    └── OpenCode SDK (programmatic access)
```

## Rationale

### 1. Full SDK Access

**Before:** Plugin hooks limited to predefined lifecycle events
**After:** SDK provides full API surface — agents, tools, sessions, hooks, governance

Example: Dashboard frontend can now:
- List available agents and their capabilities
- Start/stop specific agents on demand
- Execute tools with full context tracking
- Monitor agent sessions in real-time via WebSocket

### 2. Platform Independence

**Before:** Plugin lifecycle coupled to OpenCode Server
**After:** iDumb runs as standalone application that controls OpenCode Server

Benefits:
- Can run without OpenCode Server (graceful degradation)
- Can work with multiple OpenCode Server instances
- Easier testing and deployment
- Clear separation between governance layer and AI engine

### 3. Frontend-First UX/UI Innovation

**Before:** Plugin architecture designed for governance enforcement
**After:** Standalone platform designed for knowledge work UX/UI

New capabilities enabled:
- Notion-like block editor with AI content generation
- Discoverable AI agent packages (like npm for agents)
- NotebookLM-style source synthesis
- Rich visualization of delegation hierarchies
- Interactive planning artifact editing

### 4. Project Alignment (project-alpha-master)

Context from [project-alpha-master](https://github.com/shynlee04/project-alpha-master):
- WebContainer-based client-side IDE patterns
- Block editors and AI-assisted authoring
- Agent packages and discoverability

SDK-direct architecture enables these patterns, while plugin architecture constrained them.

## Migration Plan

### Phase 1A: Cleanup (Completed)

- Archive plugin code in `lib/_archived-2026-02-08/`
- Remove plugin registration from `index.ts`
- Clean dependency tree

### Phase 1B: SDK Integration (In Progress)

**Goal:** Bring all SDK features and configurations to frontend

Tasks:
1. SDK client setup (`lib/sdk-client.ts` — 47 LOC exists, verify functionality)
2. Dashboard backend routes for SDK operations (agent control, session management)
3. WebSocket integration for real-time updates to frontend
4. Frontend components for task management, agent control, planning workspace

**Deliverables:**
- All existing UI features functional (no more read-only stubs)
- SDK features exposed to frontend via REST/WebSocket API
- Governance enforcement works through SDK, not plugin hooks

### Phase 1C: Multi-Agent Engine (Future)

Multi-agent workspace engine powered by SDK:
- 3-agent hierarchy (coordinator, investigator, executor)
- Delegation routing via SDK
- Agent orchestration controlled from dashboard

### Future Phases (2-4): UX/UI Innovation

Phase 2: Planning Registry + Commit Governance
Phase 3: Knowledge Engine
Phase 4: UI Views + Source Synthesis (Notion-like block editor, AI agent packages)

## Impact Assessment

### Positive Impacts

| Area | Before | After | Benefit |
|-------|--------|-------|---------|
| **Governance** | Plugin hooks | SDK-direct calls | Full API access, better control |
| **Frontend** | Limited via plugin | Full SDK integration | Real-time updates, richer UI |
| **Architecture** | Coupled to host | Standalone platform | Independence, flexibility |
| **UX/UI** | Governance-focused | Knowledge work-focused | Notion-like editor, agent packages |
| **Testing** | Plugin runtime only | Independent testing | Easier unit/integration tests |

### Negative Impacts

| Area | Concern | Mitigation |
|-------|---------|------------|
| **Code Debt** | 13,500 LOC of plugin code | Archive, don't delete; salvage patterns |
| **Complexity** | SDK integration adds layers | Keep backend thin, SDK client simple |
| **Documentation** | Plugin docs now outdated | Mark as deprecated, preserve for history |

### Neutral Impacts

| Area | Before | After |
|-------|--------|-------|
| **Schemas** | Already schema-driven | No change — TaskGraph, WorkPlan, Delegation unchanged |
| **Testing** | 814 assertions passing | Still passing — new tests needed for SDK |
| **TypeScript** | Zero errors | Still zero — strict typing maintained |

## Implementation Details

### SDK Client (`lib/sdk-client.ts`)

Current state: 47 LOC, single function returning SDK client

```typescript
// Existing implementation
export function getOpenCodeSDK() {
  // Returns configured OpenCode SDK client
}
```

Required enhancements:
- Agent management methods (start, stop, list, status)
- Tool execution with governance checks
- Session lifecycle management
- Hook registration (tool.execute.before, chat.system.transform, etc.)

### Dashboard Backend (`dashboard/backend/server.ts`)

Current state: 721 LOC, Express server

Required enhancements:
- REST API routes for SDK operations
- WebSocket server for real-time updates
- Integration with governance engine (task graph, delegation)
- Agent orchestration coordination

### Frontend Integration (`dashboard/frontend/src/`)

Required enhancements:
- Real-time task list (subscribe to WebSocket updates)
- Agent control panel (start/stop, monitor status)
- Planning workspace (edit artifacts, visualize hierarchy)
- Notion-like block editor (future Phase 4)

## Risks and Mitigations

### Risk 1: SDK Not Production-Ready

**Description:** OpenCode SDK may be undocumented, unstable, or missing required features.

**Mitigation:**
- Document SDK calls as we discover them
- Write integration tests for all SDK operations
- Graceful degradation if SDK features unavailable
- Fallback to minimal governance if SDK fails

### Risk 2: SDK Latency

**Description:** SDK calls over HTTP/IPC may be slower than direct hook execution.

**Mitigation:**
- Cache SDK responses where appropriate
- Use WebSocket for real-time updates (reduce polling)
- Keep governance checks lightweight
- Batch SDK operations where possible

### Risk 3: SDK Version Incompatibility

**Description:** OpenCode SDK updates may break existing integration.

**Mitigation:**
- Pin SDK version in package.json
- Monitor OpenCode changelog for breaking changes
- Write abstraction layer for SDK calls (easier to adapt)
- Automated tests detect compatibility issues

## Alternatives Considered

### Alternative 1: Keep Plugin Architecture

**Reason:** Already implemented, 13,500 LOC of working code.

**Rejected:** Plugin architecture insufficient for UX/UI innovation (Notion-like editor, agent packages). SDK provides full API access.

### Alternative 2: Hybrid (Plugin + SDK)

**Reason:** Keep plugin for governance, use SDK for frontend features.

**Rejected:** Adds complexity, two governance paths, potential conflicts. SDK-direct is cleaner.

### Alternative 3: Rewrite from Scratch

**Reason:** Clean slate, no plugin baggage.

**Rejected:** 13,500 LOC of governance schemas and testing too valuable to discard. Better to migrate patterns than start over.

## Decision Checklist

- [x] Stakeholders agree (user strategic direction)
- [x] Technical feasibility validated (SDK exists, patterns known)
- [x] Migration plan defined (Phase 1A cleanup, 1B integration)
- [x] Impact assessment completed (positive/negative/neutral)
- [x] Risks identified and mitigated
- [x] Alternatives considered and rejected
- [x] Documentation updated (this ADR)

## References

- [OpenCode SDK Documentation](https://opencode.ai/docs/sdk/) (TBD — may need discovery)
- [project-alpha-master](https://github.com/shynlee04/project-alpha-master) — WebContainer patterns, block editors
- Phase 1B scope in `ROADMAP.md` — SDK features to frontend
- Plugin code archive in `lib/_archived-2026-02-08/`

## Approval

**Approved by:** User (strategic direction)
**Date:** 2026-02-10
**Next Review:** After Phase 1B completion (SDK integration validated)

---

*This ADR documents the strategic pivot decision. Future architecture changes should reference this document as the foundational direction for SDK-direct standalone platform architecture.*
