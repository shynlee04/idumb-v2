/**
 * Shared engine/session types used by the TanStack Start app.
 *
 * Ported from src/dashboard/shared/engine-types.ts.
 * SDK types (Session, Message, Part, Event, SessionStatus) are defined
 * as standalone interfaces since @opencode-ai/sdk is not installed.
 * When the SDK is available, these can be replaced with re-exports.
 */

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

// --- SDK-equivalent types (standalone definitions) ---
// TODO: Replace with re-exports from @opencode-ai/sdk when installed

export type SessionStatus = 'pending' | 'running' | 'completed' | 'error'

export interface Session {
  id: string
  title?: string
  createdAt: string
  updatedAt: string
  status: SessionStatus
  parentId?: string
}

export interface Part {
  type: string
  [key: string]: unknown
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  parts: Part[]
  createdAt: string
}

export interface Event {
  type: string
  [key: string]: unknown
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
