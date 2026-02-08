/**
 * Dashboard types — derived from core schemas.
 * NO manual type duplication. Import from actual schemas.
 */

// Re-export types needed by both frontend and backend
// These come from the actual schema files in src/schemas/

export type {
  TaskStore,
  TaskEpic,
  Task,
  Subtask,
  EpicStatus,
  TaskStatus,
  SubtaskStatus,
  WorkStreamCategory,
  GovernanceLevel,
} from "../../schemas/task.js"

export type {
  DelegationStore,
  DelegationRecord,
  DelegationStatus,
  DelegationResult,
} from "../../schemas/delegation.js"

export type {
  BrainStore,
  BrainEntry,
  BrainEntryType,
  BrainSource,
} from "../../schemas/brain.js"

export type { Anchor } from "../../schemas/anchor.js"

// ─── Dashboard-specific types (not in core schemas) ─────────────────

export interface ArtifactMetadata {
  status?: "active" | "superseded" | "abandoned" | "stale"
  stale: boolean
  chainIntegrity?: boolean
  relatedArtifacts?: string[]
  lastModified: number
  fileType: "md" | "json" | "yaml" | "xml" | "other"
  sizeBytes?: number
}

// ─── API Response Types ─────────────────────────────────────────────

export interface TasksResponse {
  tasks: import("../../schemas/task.js").TaskStore | null
  activeTask: import("../../schemas/task.js").Task | null
  activeEpic: import("../../schemas/task.js").TaskEpic | null
  capturedAgent: string | null
}

export interface BrainResponse {
  brain: import("../../schemas/brain.js").BrainStore | null
  query?: string
}

export interface DelegationsResponse {
  delegations: import("../../schemas/delegation.js").DelegationStore | null
}

export interface ArtifactsResponse {
  artifacts: Array<{
    path: string
    name: string
    modifiedAt: number
    status?: string
  }>
}

export interface ArtifactContentResponse {
  content: string
  path: string
}

export interface WebSocketMessage {
  type: "connected" | "file-changed" | "state-update" | "artifact-saved" | "comment-added" | "comment-updated" | "comment-deleted"
  data?: unknown
  timestamp: number
}

export interface FileChangedData {
  path: string
}
