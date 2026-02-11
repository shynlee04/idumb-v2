/**
 * Shared engine/session types used by the TanStack Start app.
 *
 * SDK types (Session, Message, Part, SessionStatus, etc.) are re-exported
 * from @opencode-ai/sdk as the single source of truth.
 * App-specific types (ProviderInfo, AgentInfo, EngineStatus, etc.) remain
 * as local definitions — no SDK equivalent exists for these.
 *
 * NOTE: Use `import type` for SDK types in client-side code to avoid
 * bundling the SDK runtime (server-only via vite.config.ts ssr.noExternal).
 */

// --- SDK type re-exports (source of truth) ---

import type {
  Session,
  SessionStatus,
  Message,
  UserMessage,
  AssistantMessage,
  Part,
  TextPart,
  ToolPart,
  FilePart,
  ReasoningPart,
  StepStartPart,
  StepFinishPart,
  SnapshotPart,
  PatchPart,
  AgentPart,
  RetryPart,
  CompactionPart,
  Event,
  Provider,
  Agent,
  Path,
  VcsInfo,
} from '@opencode-ai/sdk'

export type {
  Session,
  SessionStatus,
  Message,
  UserMessage,
  AssistantMessage,
  Part,
  TextPart,
  ToolPart,
  FilePart,
  ReasoningPart,
  StepStartPart,
  StepFinishPart,
  SnapshotPart,
  PatchPart,
  AgentPart,
  RetryPart,
  CompactionPart,
  Event,
  Provider,
  Agent,
  Path,
  VcsInfo,
}

// --- App-specific types (no SDK equivalent) ---

/** Provider model info from SDK provider.list() */
export interface ModelInfo {
  id: string
  name: string
}

/** Provider info from SDK provider.list() */
export interface ProviderInfo {
  id: string
  name: string
  models: ModelInfo[]
}

/** Agent info from SDK agent.list() */
export interface AgentInfo {
  id: string
  name: string
  description?: string
}

/** App info from SDK app.get() */
export interface AppInfo {
  path: { cwd: string; config: string; data: string }
  git?: Record<string, unknown>
  hostname?: string
}

// --- Engine/Dashboard types ---

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
  parts: Array<{ type: 'text'; text: string }>
}

// --- Response wrapper types ---
// These reference SDK Session/Message/Part/SessionStatus types.
// SDK Session shape differs from old hand-rolled one (e.g. number
// timestamps, discriminated SessionStatus union).

export interface SessionListResponse {
  sessions: Session[]
}

export interface SessionCreateResponse {
  session: Session
}

export interface SessionMessagesResponse {
  messages: Array<{
    info: Message
    parts: Part[]
  }>
}

export interface SessionStatusResponse {
  status: SessionStatus
}

export interface SessionChildrenResponse {
  children: Session[]
}

export interface EngineErrorResponse {
  error: string
}
