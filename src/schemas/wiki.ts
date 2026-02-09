/**
 * Wiki entry schema — code change documentation.
 *
 * Follows the legacy-repo knowledge model pattern:
 * - Entity per system, typed relationships
 * - Section sources with file:line citations
 *
 * When a task completes with code changes, a wiki entry is auto-queued.
 * The entry records WHAT changed, WHERE, WHY, and links back to
 * the task and session that produced it.
 *
 * Consumer: idumb_tasks complete (auto-creates), idumb_plans status (displays)
 * Persistence: `.idumb/brain/wiki.json`
 */

// ─── Wiki Types ─────────────────────────────────────────────────────

export type FileAction = "created" | "modified" | "deleted"

export interface WikiFileChange {
  path: string
  action: FileAction
  linesChanged: number           // approximate — from checkpoint data
}

export interface WikiEntry {
  id: string
  title: string                   // human-readable summary of the change
  taskId: string                  // which TaskNode produced this
  planId: string | null           // parent WorkPlan ID (null for standalone tasks)
  sessionId: string               // which session this happened in
  agent: string                   // which agent did the work
  files: WikiFileChange[]         // what files were touched
  content: string                 // markdown description with source citations
  createdAt: number
  completedAt: number | null      // when the task completed (null if still in progress)
}

export interface WikiStore {
  version: string
  entries: WikiEntry[]
}

// ─── Constants ──────────────────────────────────────────────────────

export const WIKI_STORE_VERSION = "1.0.0"

// ─── Factory Functions ──────────────────────────────────────────────

export function createWikiEntry(opts: {
  title: string
  taskId: string
  planId?: string | null
  sessionId: string
  agent: string
  files?: WikiFileChange[]
  content?: string
}): WikiEntry {
  const now = Date.now()
  return {
    id: `wiki-${now}-${Math.random().toString(36).slice(2, 8)}`,
    title: opts.title,
    taskId: opts.taskId,
    planId: opts.planId ?? null,
    sessionId: opts.sessionId,
    agent: opts.agent,
    files: opts.files ?? [],
    content: opts.content ?? "",
    createdAt: now,
    completedAt: null,
  }
}

export function createWikiStore(): WikiStore {
  return {
    version: WIKI_STORE_VERSION,
    entries: [],
  }
}

// ─── Query Helpers ──────────────────────────────────────────────────

/** Find wiki entries for a specific task */
export function findWikiEntriesByTask(store: WikiStore, taskId: string): WikiEntry[] {
  return store.entries.filter(e => e.taskId === taskId)
}

/** Find wiki entries for a specific plan */
export function findWikiEntriesByPlan(store: WikiStore, planId: string): WikiEntry[] {
  return store.entries.filter(e => e.planId === planId)
}

/** Find wiki entries for a specific session */
export function findWikiEntriesBySession(store: WikiStore, sessionId: string): WikiEntry[] {
  return store.entries.filter(e => e.sessionId === sessionId)
}

/** Count total files changed across all wiki entries */
export function countFilesChanged(store: WikiStore): number {
  const uniqueFiles = new Set<string>()
  for (const entry of store.entries) {
    for (const file of entry.files) {
      uniqueFiles.add(file.path)
    }
  }
  return uniqueFiles.size
}

// ─── Formatting ─────────────────────────────────────────────────────

/** Format a single wiki entry for agent-readable output */
export function formatWikiEntry(entry: WikiEntry): string {
  const lines: string[] = [
    `## ${entry.title}`,
    `Task: ${entry.taskId} | Session: ${entry.sessionId} | Agent: ${entry.agent}`,
  ]

  if (entry.planId) {
    lines.push(`Plan: ${entry.planId}`)
  }

  if (entry.files.length > 0) {
    lines.push("", "### Files Changed")
    for (const file of entry.files) {
      lines.push(`- \`${file.path}\` (${file.action}, ~${file.linesChanged} lines)`)
    }
  }

  if (entry.content) {
    lines.push("", entry.content)
  }

  const completedLabel = entry.completedAt
    ? new Date(entry.completedAt).toISOString()
    : "in progress"
  lines.push("", `Created: ${new Date(entry.createdAt).toISOString()} | Completed: ${completedLabel}`)

  return lines.join("\n")
}

/** Format wiki store summary for status output */
export function formatWikiSummary(store: WikiStore): string {
  if (store.entries.length === 0) return "No wiki entries yet."

  const completed = store.entries.filter(e => e.completedAt !== null).length
  const inProgress = store.entries.length - completed
  const filesChanged = countFilesChanged(store)

  return [
    `Wiki: ${store.entries.length} entries (${completed} complete, ${inProgress} in progress)`,
    `Files documented: ${filesChanged}`,
  ].join("\n")
}
