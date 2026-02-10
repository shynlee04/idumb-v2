/**
 * IDE Type Contracts — shared between server functions and frontend.
 *
 * Phase 5: Engine, Session, Settings, WorkspaceConfig types.
 * Phase 6+: File, Terminal, Editor types will be added when consumers exist.
 * Rule: max 50 LOC per feature, must have consumer in same phase.
 */

// Re-export all existing engine types for backward compatibility
export type {
  ModelInfo,
  ProviderInfo,
  AgentInfo,
  AppInfo,
  Session,
  Message,
  Part,
  Event,
  SessionStatus,
  EngineStatus,
  DashboardConfig,
  PortConfig,
  SessionPromptRequest,
  SessionListResponse,
  SessionCreateResponse,
  SessionMessagesResponse,
  SessionStatusResponse,
  SessionChildrenResponse,
  EngineErrorResponse,
} from './engine-types'

// Phase 5 additions — consumed by Drizzle schema + settings server functions

/** A single key-value setting persisted in SQLite */
export interface SettingsEntry {
  key: string
  value: string
  updatedAt: Date | null
}

/** Workspace configuration per project directory */
export interface WorkspaceConfig {
  projectDir: string
  name: string | null
  lastOpened: Date | null
  config: Record<string, unknown> | null
}
