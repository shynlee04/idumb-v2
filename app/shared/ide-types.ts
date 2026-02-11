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

// Phase 6 additions — IDE Shell layout types

/** Identifies one of the three main IDE panels */
export type PanelId = 'sidebar' | 'editor' | 'terminal'

/** Position of the panel within the IDE shell */
export type PanelPosition = 'left' | 'center' | 'bottom'

/** Configuration for a single panel's sizing constraints (percentages) */
export interface PanelConfig {
  id: PanelId
  defaultSize: number
  minSize: number
  maxSize: number
  collapsible: boolean
  position: PanelPosition
}

/** Full IDE layout state snapshot (panel sizes as percentages) */
export interface IDELayout {
  /** Panel sizes as { panelId: percentage } */
  panelSizes: Record<PanelId, number>
  /** Set of collapsed panel IDs */
  collapsed: PanelId[]
  /** Currently focused panel */
  activePanel: PanelId
}

// Phase 6 additions — File tree + tab types

/** A node in the file tree (file or directory) */
export interface FileNode {
  /** Unique ID — the full relative path (e.g., "src/lib/utils.ts") */
  id: string
  /** Display name (e.g., "utils.ts") */
  name: string
  /** True if directory */
  isFolder: boolean
  /** Children — null means not loaded yet (lazy), [] means empty dir */
  children?: FileNode[] | null
}

/** An open file tab in the editor */
export interface Tab {
  /** File path (unique key) */
  path: string
  /** Display name */
  name: string
  /** Has unsaved changes */
  isDirty: boolean
}

/** Context menu target info */
export interface ContextTarget {
  path: string
  name: string
  isFolder: boolean
}
