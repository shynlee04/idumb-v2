/**
 * Shared types for the OpenCode Engine API layer.
 *
 * Re-exports SDK types used by both frontend and backend,
 * plus dashboard-specific request/response shapes.
 */

// ─── Re-exported SDK types ───────────────────────────────────────────────────

export type {
  Session,
  Message,
  UserMessage,
  AssistantMessage,
  Part,
  TextPart,
  ToolPart,
  FilePart,
  AgentPart,
  StepStartPart,
  StepFinishPart,
  SnapshotPart,
  PatchPart,
  ReasoningPart,
  RetryPart,
  CompactionPart,
  Event,
  GlobalEvent,
  SessionStatus,
  FileDiff,
  TextPartInput,
} from "@opencode-ai/sdk"

// ─── Engine-specific types ───────────────────────────────────────────────────

/** Status of the OpenCode engine server */
export interface EngineStatus {
  running: boolean
  url?: string
  projectDir?: string
}

/** Request body for session prompt endpoint */
export interface SessionPromptRequest {
  parts: Array<{ type: "text"; text: string }>
}

/** Response for session list endpoint */
export interface SessionListResponse {
  sessions: Array<import("@opencode-ai/sdk").Session>
}

/** Response for session create endpoint */
export interface SessionCreateResponse {
  session: import("@opencode-ai/sdk").Session
}

/** Response for session messages endpoint */
export interface SessionMessagesResponse {
  messages: Array<{
    info: import("@opencode-ai/sdk").Message
    parts: Array<import("@opencode-ai/sdk").Part>
  }>
}

/** Response for session prompt endpoint (async fire-and-forget) */
export interface SessionPromptResponse {
  accepted: boolean
  sessionId: string
}

/** Response for session status endpoint */
export interface SessionStatusResponse {
  status: import("@opencode-ai/sdk").SessionStatus
}

/** Response for session children endpoint */
export interface SessionChildrenResponse {
  children: Array<import("@opencode-ai/sdk").Session>
}

/** Standard error response shape */
export interface EngineErrorResponse {
  error: string
}
