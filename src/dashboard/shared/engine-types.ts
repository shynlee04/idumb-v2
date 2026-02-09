/**
 * Shared engine/session types used by dashboard frontend + backend.
 */

export type {
  Session,
  Message,
  Part,
  Event,
  SessionStatus,
} from "@opencode-ai/sdk"

export interface EngineStatus {
  running: boolean
  url?: string
  projectDir?: string
  port?: number
}

export interface DashboardConfig {
  projectDir: string
  port: number
  backendPort: number
  open: boolean
  opencodePort?: number
}

export interface PortConfig {
  detect: boolean
  autoPort: number
  userPort?: number
}

export interface SessionPromptRequest {
  parts: Array<{ type: "text"; text: string }>
}

export interface SessionListResponse {
  sessions: Array<import("@opencode-ai/sdk").Session>
}

export interface SessionCreateResponse {
  session: import("@opencode-ai/sdk").Session
}

export interface SessionMessagesResponse {
  messages: Array<{
    info: import("@opencode-ai/sdk").Message
    parts: Array<import("@opencode-ai/sdk").Part>
  }>
}

export interface SessionStatusResponse {
  status: import("@opencode-ai/sdk").SessionStatus
}

export interface SessionChildrenResponse {
  children: Array<import("@opencode-ai/sdk").Session>
}

export interface EngineErrorResponse {
  error: string
}
