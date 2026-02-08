/**
 * StorageAdapter -- abstraction over persistence backends.
 *
 * Implementations: JsonAdapter (current StateManager), SqliteAdapter (new).
 * This interface allows gradual migration from JSON to SQLite
 * without changing any consumer code.
 */

/**
 * STATUS: Feature-flagged. Storage adapter interface for SQLite backend.
 * Not active by default. See sqlite-adapter.ts for implementation.
 */

import type { TaskStore, TaskEpic, Task } from "../schemas/task.js"
import type { DelegationStore } from "../schemas/delegation.js"
import type { Anchor } from "../schemas/anchor.js"

export interface SessionState {
  activeTask: { id: string; name: string } | null
  lastBlock: { tool: string; timestamp: number } | null
  capturedAgent: string | null
}

export interface StorageAdapter {
  // Lifecycle
  init(directory: string): Promise<void>
  close(): Promise<void>

  // Sessions
  getSession(sessionID: string): SessionState
  setActiveTask(sessionID: string, task: { id: string; name: string } | null): void
  getActiveTask(sessionID: string): { id: string; name: string } | null
  setCapturedAgent(sessionID: string, agent: string): void
  getCapturedAgent(sessionID: string): string | null
  setLastBlock(sessionID: string, block: { tool: string; timestamp: number } | null): void
  getLastBlock(sessionID: string): { tool: string; timestamp: number } | null

  // Anchors
  addAnchor(sessionID: string, anchor: Anchor): void
  getAnchors(sessionID: string): Anchor[]

  // Tasks
  getTaskStore(): TaskStore
  setTaskStore(store: TaskStore): void
  getActiveEpic(): TaskEpic | null
  getSmartActiveTask(): Task | null

  // Delegations
  getDelegationStore(): DelegationStore
  setDelegationStore(store: DelegationStore): void

  // Persistence
  forceSave(): Promise<void>
  isDegraded(): boolean
  clear(): void
}
