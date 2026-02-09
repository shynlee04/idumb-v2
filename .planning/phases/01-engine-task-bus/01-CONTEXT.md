# Phase 1: Engine + Task Bus - Context

**Gathered:** 2026-02-09
**Status:** Ready for planning

<domain>
## Phase Boundary

A runnable web application where users chat with OpenCode through the browser, tasks exist as a 3-level hierarchy (Epic → Task → Subtask), and governance hooks enforce write-gates. Multiple agent sessions are spawned and coordinated programmatically through OpenCode Server. This phase delivers the foundation — chat UI, task management, and governance enforcement.

</domain>

<decisions>
## Implementation Decisions

### Chat interface experience
- Workspace-based conversations — each conversation is tied to a project/workspace, not standalone
- Compaction-aware session lifecycle — after ~3 compactions, a sub-agent analyzes the conversation state and suggests purified context, prompting the user to start a fresh session carrying the synthesis forward
- Structured streaming blocks — responses render as progressive markdown with live-updating tool call blocks, code blocks, and status indicators (Cursor/Windsurf style, not raw token stream)
- Dashboard-first landing — user opens the app and sees an overview of active tasks, recent conversations, and project health before entering a chat
- Rich input bar — supports file attachment, @mentions for agents, slash commands, and a markdown toolbar

### Task hierarchy interaction
- Dual-surface — sidebar panel for quick task glance while chatting, plus a dedicated full-page task view for management
- Hybrid creation — agents create tasks naturally through conversation, but users can also manually create, edit, and rearrange tasks from the task view UI
- Rich task cards — each task card shows: title, status, assigned agent, elapsed time, expected output, last checkpoint, dependency links, and subtask progress
- Live activity indicator — when a task is active, a pulsing badge with a real-time one-liner of the current agent action (e.g., "Editing src/hooks/tool-gate.ts")

### Governance feedback
- Advisory governance, never blocking — governance informs and nudges but the user can always override. No hard blocks. User can tell the agent to proceed without a task
- Persistent governance bar with inline warnings — a status strip showing governance state (green/yellow/red) plus inline warnings in chat when an agent attempts an untracked write
- On-demand governance detail — governance state is hidden by default during normal work. User checks via button, command, or keyboard shortcut. Only violations surface proactively
- Acknowledged override mode — when the user overrides a governance warning, the write goes through but is tracked. An "X untracked writes" counter lets users retro-assign writes to tasks later
- Contextual governance modes — governance mode (strict/standard/relaxed/retard) is set per-workspace or per-session. Different projects can run at different governance levels

### Multi-agent visibility
- Threaded delegation — coordinator messages appear in the main chat thread. When the coordinator delegates, sub-agent work nests underneath in expandable/collapsible threads
- Parallel activity indicators — a status area shows the count of active agents and a brief label for each (e.g., "Investigating auth patterns" / "Editing tool-gate.ts"). Results flow into the thread as agents complete
- Observe + intervene with inline cueing — sub-agent threads are observable and the user can drop comments into them mid-execution. These comments are included when results return to the coordinator, so the coordinator sees both the agent's output and the user's annotations
- Collapsible delegation handoff — each delegation round-trip renders as a visual block showing: what was requested, which agent executed, what came back, and any user comments. Collapsed by default to keep the main thread clean

### Claude's Discretion
- Loading skeleton design and transition animations
- Exact spacing, typography, and color palette
- Error state handling and retry UX patterns
- Dashboard layout and widget arrangement
- Task card visual design (sizing, shadows, borders)
- Keyboard shortcuts and accessibility patterns
- Governance bar exact positioning and styling
- Agent status indicator animation style

</decisions>

<specifics>
## Specific Ideas

- Session lifecycle model: after ~3 compactions, a sub-agent runs to detect conversation state and suggests a purified context summary. User is reminded to start a fresh conversation. This is the "start fresh" signal, not automatic archival.
- Agent inline cueing: when a user comments on a sub-agent thread, the comment travels with the results back to the coordinator. The coordinator sees both the agent output and the user's running commentary — like annotating a live document.
- Governance is a guide, not a wall. The entire governance system must feel like a helpful teammate tracking your work, not a permissions system blocking you from your own project.
- "X untracked writes" counter — lets users work fast when needed, clean up later when they want.

</specifics>

<deferred>
## Deferred Ideas

- Synthesis sub-agent and archive system — automatic export/synthesis of compacted sessions into knowledge base. Belongs in Phase 3 (Knowledge Engine) where research agents and knowledge synthesis are scoped.
- Session history search/browsing — ability to search across archived sessions. Future phase.

</deferred>

---

*Phase: 01-engine-task-bus*
*Context gathered: 2026-02-09*
