/**
 * SqliteAdapter -- StorageAdapter backed by better-sqlite3.
 *
 * WAL mode for concurrent reads (dashboard) + writes (hooks).
 * Synchronous reads for fast state lookups.
 * DB file: .idumb/brain/governance.db
 *
 * Tables: sessions, anchors, task_store (JSON blob), delegation_store (JSON blob), schema_version
 */

/**
 * STATUS: Feature-flagged. Activate via `{ sqlite: true }` in stateManager.init().
 * Not active by default. JSON file backend is the default persistence layer.
 */

import Database from "better-sqlite3"
import type { Database as DatabaseType } from "better-sqlite3"
import { join } from "node:path"
import { mkdirSync } from "node:fs"
import type { StorageAdapter, SessionState } from "./storage-adapter.js"
import type { Anchor, AnchorType, AnchorPriority } from "../schemas/anchor.js"
import type { TaskStore, TaskEpic, Task } from "../schemas/task.js"
import type { DelegationStore } from "../schemas/delegation.js"
import { createEmptyStore, getActiveChain, migrateTaskStore } from "../schemas/task.js"
import { createEmptyDelegationStore, expireStaleDelegations } from "../schemas/delegation.js"

const DB_FILE = ".idumb/brain/governance.db"
const SCHEMA_VERSION = 1

// ─── Row types for better-sqlite3 query results ─────────────────────

interface SessionRow {
  session_id: string
  active_task_id: string | null
  active_task_name: string | null
  last_block_tool: string | null
  last_block_timestamp: number | null
  captured_agent: string | null
  updated_at: number
}

interface AnchorRow {
  id: string
  session_id: string
  type: string
  content: string
  priority: string
  created_at: number
  modified_at: number
}

interface DataRow {
  data: string
}

interface VersionRow {
  version: number
}

// ─── SqliteAdapter ───────────────────────────────────────────────────

export class SqliteAdapter implements StorageAdapter {
  private db: DatabaseType | null = null
  private taskStoreCache: TaskStore = createEmptyStore()
  private delegationStoreCache: DelegationStore = createEmptyDelegationStore()

  async init(directory: string): Promise<void> {
    const dbDir = join(directory, ".idumb", "brain")
    mkdirSync(dbDir, { recursive: true })

    const dbPath = join(directory, DB_FILE)
    this.db = new Database(dbPath)

    this.db.pragma("journal_mode = WAL")
    this.db.pragma("foreign_keys = ON")

    this.createTables()
    this.loadStores()
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }

  private createTables(): void {
    const db = this.requireDb()
    db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        active_task_id TEXT,
        active_task_name TEXT,
        last_block_tool TEXT,
        last_block_timestamp INTEGER,
        captured_agent TEXT,
        updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      );
      CREATE TABLE IF NOT EXISTS anchors (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'medium',
        created_at INTEGER NOT NULL,
        modified_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS task_store (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        data TEXT NOT NULL DEFAULT '{}'
      );
      CREATE TABLE IF NOT EXISTS delegation_store (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        data TEXT NOT NULL DEFAULT '{}'
      );
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY
      );
    `)
    const existing = db.prepare("SELECT version FROM schema_version LIMIT 1").get() as VersionRow | undefined
    if (!existing) {
      db.prepare("INSERT INTO schema_version (version) VALUES (?)").run(SCHEMA_VERSION)
    }
  }

  private loadStores(): void {
    const db = this.requireDb()
    const taskRow = db.prepare("SELECT data FROM task_store WHERE id = 1").get() as DataRow | undefined
    if (taskRow) {
      try {
        this.taskStoreCache = migrateTaskStore(JSON.parse(taskRow.data) as TaskStore)
      } catch {
        /* start fresh */
      }
    }
    const delegRow = db.prepare("SELECT data FROM delegation_store WHERE id = 1").get() as DataRow | undefined
    if (delegRow) {
      try {
        this.delegationStoreCache = JSON.parse(delegRow.data) as DelegationStore
        expireStaleDelegations(this.delegationStoreCache)
      } catch {
        /* start fresh */
      }
    }
  }

  private requireDb(): DatabaseType {
    if (!this.db) throw new Error("SqliteAdapter not initialized -- call init() first")
    return this.db
  }

  // ─── Sessions ──────────────────────────────────────────────────────

  private upsertSession(sessionID: string): void {
    this.requireDb()
      .prepare("INSERT OR IGNORE INTO sessions (session_id) VALUES (?)")
      .run(sessionID)
  }

  getSession(sessionID: string): SessionState {
    const row = this.requireDb()
      .prepare("SELECT * FROM sessions WHERE session_id = ?")
      .get(sessionID) as SessionRow | undefined

    if (!row) return { activeTask: null, lastBlock: null, capturedAgent: null }

    return {
      activeTask: row.active_task_id
        ? { id: row.active_task_id, name: row.active_task_name! }
        : null,
      lastBlock: row.last_block_tool
        ? { tool: row.last_block_tool, timestamp: row.last_block_timestamp! }
        : null,
      capturedAgent: row.captured_agent,
    }
  }

  setActiveTask(sessionID: string, task: { id: string; name: string } | null): void {
    this.upsertSession(sessionID)
    this.requireDb()
      .prepare(
        "UPDATE sessions SET active_task_id = ?, active_task_name = ?, updated_at = ? WHERE session_id = ?"
      )
      .run(task?.id ?? null, task?.name ?? null, Date.now(), sessionID)
  }

  getActiveTask(sessionID: string): { id: string; name: string } | null {
    return this.getSession(sessionID).activeTask
  }

  setCapturedAgent(sessionID: string, agent: string): void {
    this.upsertSession(sessionID)
    this.requireDb()
      .prepare(
        "UPDATE sessions SET captured_agent = ?, updated_at = ? WHERE session_id = ?"
      )
      .run(agent, Date.now(), sessionID)
  }

  getCapturedAgent(sessionID: string): string | null {
    return this.getSession(sessionID).capturedAgent
  }

  setLastBlock(
    sessionID: string,
    block: { tool: string; timestamp: number } | null
  ): void {
    this.upsertSession(sessionID)
    this.requireDb()
      .prepare(
        "UPDATE sessions SET last_block_tool = ?, last_block_timestamp = ?, updated_at = ? WHERE session_id = ?"
      )
      .run(
        block?.tool ?? null,
        block?.timestamp ?? null,
        Date.now(),
        sessionID
      )
  }

  getLastBlock(
    sessionID: string
  ): { tool: string; timestamp: number } | null {
    return this.getSession(sessionID).lastBlock
  }

  // ─── Anchors ───────────────────────────────────────────────────────

  addAnchor(sessionID: string, anchor: Anchor): void {
    this.upsertSession(sessionID)
    this.requireDb()
      .prepare(
        "INSERT OR REPLACE INTO anchors (id, session_id, type, content, priority, created_at, modified_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        anchor.id,
        sessionID,
        anchor.type,
        anchor.content,
        anchor.priority,
        anchor.createdAt,
        anchor.modifiedAt
      )
  }

  getAnchors(sessionID: string): Anchor[] {
    const rows = this.requireDb()
      .prepare(
        "SELECT id, type, content, priority, created_at, modified_at FROM anchors WHERE session_id = ? ORDER BY created_at ASC"
      )
      .all(sessionID) as AnchorRow[]

    return rows.map((r) => ({
      id: r.id,
      type: r.type as AnchorType,
      content: r.content,
      priority: r.priority as AnchorPriority,
      createdAt: r.created_at,
      modifiedAt: r.modified_at,
    }))
  }

  // ─── Tasks ─────────────────────────────────────────────────────────

  getTaskStore(): TaskStore {
    return this.taskStoreCache
  }

  setTaskStore(store: TaskStore): void {
    this.taskStoreCache = store
    this.requireDb()
      .prepare("INSERT OR REPLACE INTO task_store (id, data) VALUES (1, ?)")
      .run(JSON.stringify(store))
  }

  getActiveEpic(): TaskEpic | null {
    if (!this.taskStoreCache.activeEpicId) return null
    return (
      this.taskStoreCache.epics.find(
        (e) => e.id === this.taskStoreCache.activeEpicId
      ) ?? null
    )
  }

  getSmartActiveTask(): Task | null {
    return getActiveChain(this.taskStoreCache).task
  }

  // ─── Delegations ──────────────────────────────────────────────────

  getDelegationStore(): DelegationStore {
    return this.delegationStoreCache
  }

  setDelegationStore(store: DelegationStore): void {
    this.delegationStoreCache = store
    this.requireDb()
      .prepare(
        "INSERT OR REPLACE INTO delegation_store (id, data) VALUES (1, ?)"
      )
      .run(JSON.stringify(store))
  }

  // ─── Persistence ──────────────────────────────────────────────────

  async forceSave(): Promise<void> {
    this.db?.pragma("wal_checkpoint(TRUNCATE)")
  }

  isDegraded(): boolean {
    return this.db === null
  }

  clear(): void {
    if (!this.db) return
    this.db.exec(
      "DELETE FROM sessions; DELETE FROM anchors; DELETE FROM task_store; DELETE FROM delegation_store;"
    )
    this.taskStoreCache = createEmptyStore()
    this.delegationStoreCache = createEmptyDelegationStore()
  }
}
