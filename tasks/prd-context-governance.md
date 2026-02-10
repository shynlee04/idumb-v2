# PRD: Context Governance Plugin for OpenCode

## Overview
A lightweight OpenCode plugin that provides context-aware governance for AI agents through "shadow tracking" - silently monitoring activity without blocking workflow. The plugin offers structured planning tools when complexity is detected, with configurable thresholds and self-rating mechanisms for agent accountability.

## Goals
- Track agent activity silently without blocking any actions
- Provide optional structured planning via explicit mode
- Detect complexity creep and suggest (not enforce) planning
- Auto-archive session data for continuity
- Enable agent self-rating and negative signal detection
- Maintain TUI-friendly output (no chat interruptions)

## Quality Gates

These commands must pass for every user story:
- `npm run typecheck` - TypeScript type checking
- `npm test` - Test suite execution

For TUI/dashboard stories, also include:
- Manual verification in OpenCode TUI environment

## User Stories

### US-001: Plugin Bootstrap and Shadow Mode Initialization
**Description:** As an AI agent, I want the plugin to start tracking my activity automatically so that my work is recorded without any action on my part.

**Acceptance Criteria:**
- [ ] Plugin initializes on OpenCode startup
- [ ] Creates `.opencode/plugin/context-governance/` directory structure
- [ ] Initializes empty `brain.json` with default state
- [ ] Shadow mode activates automatically (no blocking)
- [ ] State includes: session_id, start_time, files_touched[], tool_count, mode="shadow"

### US-002: Tool Usage Tracking Hook
**Description:** As an AI agent, I want all my tool usage tracked silently so that my activity history is preserved.

**Acceptance Criteria:**
- [ ] Implement `tool.execute.after` hook
- [ ] Track: tool_name, timestamp, success/failure, file paths (if applicable)
- [ ] Update `files_touched[]` array in brain.json (unique entries only)
- [ ] Increment `tool_count` counter
- [ ] Log to console only (never chat): `[Shadow] {tool_name} executed`

### US-003: Complexity Detection and Soft Nudges
**Description:** As an AI agent, I want to be notified when my session complexity grows so that I can choose to organize my work better.

**Acceptance Criteria:**
- [ ] Check thresholds after each tool execution
- [ ] Default thresholds: 3 files OR 5 tool calls
- [ ] Configurable via `config.json` (thresholds.file_count, thresholds.tool_count)
- [ ] Console-only message: `[Suggestion] Complexity detected (X files, Y tools). Consider init_session for better tracking.`
- [ ] Message appears only once per session (deduplicated)

### US-004: init_session Tool (Explicit Mode)
**Description:** As an AI agent, I want to activate structured planning mode so that I can organize complex work hierarchically.

**Acceptance Criteria:**
- [ ] Tool accepts: session_name (string), work_type (enum: quick_fix/feature/refactor/exploration), depth (1 or 3)
- [ ] Switches mode from "shadow" to "explicit"
- [ ] Creates structured session record in `.idumb/sessions/explicit-{name}.json`
- [ ] Injects skill prompt based on work_type (console only)
- [ ] Skill prompts: quick_fix="Verify before patching", feature="Plan interfaces first", refactor="Preserve public APIs", exploration="Document findings"

### US-005: track_task Tool (Hierarchical Tasks)
**Description:** As an AI agent, I want to track my progress through hierarchical tasks so that my work structure is clear.

**Acceptance Criteria:**
- [ ] Tool accepts: action (add/complete/pivot), content (string), node_id (optional, e.g., "1.2")
- [ ] In explicit mode: Updates task hierarchy in session file
- [ ] In shadow mode: Auto-creates shadow task entry
- [ ] Supports depth=1 (flat) and depth=3 (trajectory/tactic/action)
- [ ] Auto-pruning: marking parent complete collapses children
- [ ] Console feedback: `[Task] {action}: {content}`

### US-006: save_checkpoint Tool (Manual Persistence)
**Description:** As an AI agent, I want to manually save important milestones so that critical progress is preserved.

**Acceptance Criteria:**
- [ ] Tool accepts: summary (optional string)
- [ ] Creates checkpoint entry in session file
- [ ] Includes timestamp, current tasks, files touched
- [ ] Console feedback: `[Checkpoint] Saved: {summary || timestamp}`

### US-007: Session Auto-Archive on Stop
**Description:** As an AI agent, I want my session data preserved when the session ends so that I can resume work later.

**Acceptance Criteria:**
- [ ] Implement `session.stop` hook
- [ ] Save brain.json to `.idumb/sessions/shadow-{timestamp}.json` (shadow mode)
- [ ] Save explicit session to `.idumb/sessions/explicit-{name}-{timestamp}.json` (explicit mode)
- [ ] Include: full state, metrics, task history, files touched
- [ ] Reset brain.json to empty state for next session

### US-008: Agent Self-Rating Mechanism
**Description:** As an AI agent, I want to rate my own performance each turn so that drift and frustration signals are captured.

**Acceptance Criteria:**
- [ ] Add `self_rate` tool with parameters: score (1-10), reason (optional)
- [ ] Store ratings in brain.json ratings[] array
- [ ] Include: score, timestamp, turn_number, reason
- [ ] Console feedback: `[Rating] Turn {N}: {score}/10`

### US-009: Negative Signal Detection
**Description:** As a system, I want to detect negative signals in user messages so that context drift can be flagged.

**Acceptance Criteria:**
- [ ] Monitor user messages for keywords: "stop", "wrong", "no", "bad", "incorrect"
- [ ] Detect agent responses indicating failure: "I apologize", "you are right", "I was wrong"
- [ ] Flag session with `negative_signals[]` entry
- [ ] Include: signal_type, message_snippet, timestamp
- [ ] Console log: `[Signal] Negative pattern detected: {type}`

### US-010: Cancel Mechanism Detection
**Description:** As a system, I want to detect when the user cancels or interrupts work so that incomplete tasks are flagged.

**Acceptance Criteria:**
- [ ] Detect cancellation patterns: Ctrl+C, "cancel", "abort", "nevermind"
- [ ] Flag session with `cancelled: true` and `cancel_reason` (if provided)
- [ ] Ensure session is archived with cancelled status
- [ ] Console log: `[Cancel] Session flagged as cancelled`

### US-011: TUI Dashboard Display
**Description:** As an AI agent, I want to see my current session status in the TUI so that I have situational awareness.

**Acceptance Criteria:**
- [ ] Display compact status bar in console
- [ ] Show: mode (shadow/explicit), files touched count, tool count, current task (if any)
- [ ] Format: `[ContextGov] Mode: {mode} | Files: {N} | Tools: {N} | Task: {task || "none"}`
- [ ] Update in real-time (after each tool call)
- [ ] Use ANSI colors: green=explicit, gray=shadow, yellow=complexity threshold reached

### US-012: Configuration System
**Description:** As a user, I want to configure plugin behavior so that it fits my workflow preferences.

**Acceptance Criteria:**
- [ ] Create `config.json` in plugin directory
- [ ] Configurable: thresholds.file_count (default 3), thresholds.tool_count (default 5)
- [ ] Configurable: enable_self_rating (default true), enable_sentiment_detection (default true)
- [ ] Configurable: auto_archive (default true)
- [ ] Load config on plugin initialization

## Functional Requirements

- FR-1: Plugin MUST NOT block any tool execution
- FR-2: Plugin MUST NOT inject messages into chat history
- FR-3: All user-facing output MUST be console-only (TUI-safe)
- FR-4: Shadow mode MUST activate automatically without agent action
- FR-5: Explicit mode MUST be opt-in via init_session tool
- FR-6: Session data MUST persist across OpenCode restarts
- FR-7: Complexity nudges MUST appear only once per session
- FR-8: All file operations MUST use Bun APIs ($.write, $.read)
- FR-9: Plugin MUST support both project and global installation
- FR-10: Code files MUST stay under 150 lines (modular architecture)

## Non-Goals

- NO blocking or gating of any tool calls
- NO mandatory tool usage requirements
- NO chat message interruptions
- NO browser-based dashboard (TUI only)
- NO complex sentiment analysis (keywords only)
- NO integration with existing iDumb v2 schemas
- NO migration from iDumb v1/v2
- NO multi-agent coordination features

## Technical Considerations

### File Structure
```
.opencode/plugin/context-governance/
├── index.ts              # Entry point (max 150 lines)
├── types.ts              # TypeScript interfaces
├── config.ts             # Configuration management
├── state.ts              # Brain state management
├── hooks/
│   ├── tool-execute.ts   # Tool tracking hook
│   └── session-stop.ts   # Session cleanup hook
├── tools/
│   ├── init-session.ts   # init_session tool
│   ├── track-task.ts     # track_task tool
│   └── save-checkpoint.ts # save_checkpoint tool
└── utils/
    ├── sentiment.ts      # Signal detection
    ├── complexity.ts     # Threshold checking
    └── display.ts        # TUI output formatting
```

### State Schema (brain.json)
```typescript
interface BrainState {
  session: {
    id: string;
    mode: "shadow" | "explicit";
    startTime: number;
    name?: string;           // for explicit mode
    workType?: string;       // for explicit mode
    depth?: number;          // 1 or 3
  };
  metrics: {
    filesTouched: string[];
    toolCount: number;
    nudgeShown: boolean;
  };
  tasks: {
    hierarchy: TaskNode[];   // for explicit mode
    current?: string;        // current task content
  };
  ratings: {
    score: number;
    turn: number;
    timestamp: number;
    reason?: string;
  }[];
  signals: {
    type: "negative" | "cancel";
    snippet: string;
    timestamp: number;
  }[];
}
```

### Dependencies
- `@opencode-ai/plugin` (peer dependency)
- Built-in Bun APIs only (no external deps)

## Success Metrics

- Plugin initializes without errors
- All tool calls tracked in shadow mode
- Complexity nudges appear at configured thresholds
- Session data persists and archives correctly
- Self-ratings and signals captured accurately
- TUI display updates in real-time
- Zero chat message interruptions
- All quality gates pass

## Open Questions

- Should we support session resume (loading previous shadow session)?
- Should explicit mode tasks sync with any external system?
- What additional skill prompts might be useful?
- Should we add a "pause" mechanism for shadow tracking?
