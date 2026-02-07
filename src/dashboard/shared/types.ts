/**
 * Shared types for Dashboard (used by both frontend and backend)
 */

// ─── Task Types ───────────────────────────────────────────────────────────

export type EpicStatus = "planned" | "active" | "completed" | "deferred" | "abandoned"
export type TaskStatus = "planned" | "active" | "completed" | "blocked" | "deferred"
export type SubtaskStatus = "pending" | "done" | "skipped"

export type WorkStreamCategory =
  | "development"
  | "research"
  | "governance"
  | "maintenance"
  | "spec-kit"
  | "ad-hoc"

export type GovernanceLevel = "strict" | "balanced" | "minimal"

export interface Subtask {
  id: string
  taskId: string
  name: string
  status: SubtaskStatus
  toolUsed?: string
  timestamp?: number
}

export interface Task {
  id: string
  epicId: string
  name: string
  status: TaskStatus
  assignee?: string
  evidence?: string
  delegatedTo?: string
  delegationId?: string
  createdAt: number
  modifiedAt: number
  subtasks: Subtask[]
}

export interface TaskEpic {
  id: string
  name: string
  status: EpicStatus
  category: WorkStreamCategory
  governanceLevel: GovernanceLevel
  createdAt: number
  modifiedAt: number
  tasks: Task[]
}

export interface TaskStore {
  version: string
  activeEpicId: string | null
  epics: TaskEpic[]
}

// ─── Brain Types ──────────────────────────────────────────────────────────

export type BrainEntryType =
  | "architecture"
  | "decision"
  | "pattern"
  | "tech-stack"
  | "research"
  | "codebase-fact"
  | "convention"
  | "gotcha"

export type BrainSource =
  | "anchor"
  | "task-evidence"
  | "git-commit"
  | "scan"
  | "manual"
  | "research"
  | "synthesis"

export interface BrainEntry {
  id: string
  type: BrainEntryType
  title: string
  content: string
  evidence: string[]
  parentId?: string
  childIds: string[]
  relatedTo: string[]
  supersedes?: string
  createdAt: number
  modifiedAt: number
  staleAfter: number
  confidence: number
  source: BrainSource
  accessCount: number
  lastAccessedAt: number
}

export interface BrainStore {
  version: string
  entries: BrainEntry[]
  lastSynthesisAt: number
  exportCount: number
}

// ─── Delegation Types ─────────────────────────────────────────────────────

export type DelegationStatus =
  | "pending"
  | "accepted"
  | "completed"
  | "rejected"
  | "expired"

export interface DelegationResult {
  evidence: string
  filesModified: string[]
  testsRun: string
  brainEntriesCreated: string[]
}

export interface DelegationRecord {
  id: string
  fromAgent: string
  toAgent: string
  taskId: string
  context: string
  expectedOutput: string
  allowedTools: string[]
  allowedActions: string[]
  maxDepth: number
  status: DelegationStatus
  createdAt: number
  completedAt?: number
  expiresAt: number
  result?: DelegationResult
}

export interface DelegationStore {
  version: string
  delegations: DelegationRecord[]
}

// ─── API Response Types ───────────────────────────────────────────────────

export interface TasksResponse {
  tasks: TaskStore | null
  activeTask: Task | null
  activeEpic: TaskEpic | null
  capturedAgent: string | null
}

export interface BrainResponse {
  brain: BrainStore | null
  query?: string
}

export interface DelegationsResponse {
  delegations: DelegationStore | null
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

// ─── Artifact Types ────────────────────────────────────────────────────────

export interface ArtifactMetadata {
  status?: "active" | "superseded" | "abandoned" | "stale"
  stale: boolean
  chainIntegrity?: boolean
  relatedArtifacts?: string[]
  lastModified: number
  fileType: "md" | "json" | "yaml" | "xml" | "other"
}

// ─── Comment Types ─────────────────────────────────────────────────────────

export interface ArtifactComment {
  id: string
  artifactPath: string
  line?: number
  author: string
  content: string
  timestamp: number
  resolved: boolean
}

export interface CommentsResponse {
  comments: ArtifactComment[]
}

export interface CreateCommentRequest {
  artifactPath: string
  line?: number
  content: string
}

// ─── WebSocket Message Types ──────────────────────────────────────────────

export interface WebSocketMessage {
  type: "connected" | "file-changed" | "state-update"
  data?: unknown
  timestamp: number
}

export interface FileChangedData {
  path: string
}
