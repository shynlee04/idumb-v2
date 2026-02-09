/**
 * Coherent Knowledge — cross-session knowledge linking.
 *
 * When a task completes, a CoherentKnowledgeEntry is auto-created
 * by the tool-gate after hook. This links:
 * - WHAT was done (action, code changes)
 * - WHO did it (agent, delegation depth)
 * - WHERE it happened (session, workflow, phase)
 * - WHY (task context, plan artifact)
 * - WHEN (timestamps for staleness enforcement)
 *
 * This is the glue between tasks, plans, sessions, and wiki entries.
 * Unlike BrainEntry (which stores knowledge), CoherentKnowledgeEntry
 * stores ACTION RECORDS — what happened and how it connects.
 *
 * Consumer: idumb_hive_mind recall (cross-references), idumb_plans status (counts)
 * Persistence: `.idumb/brain/knowledge.json`
 */

// ─── Knowledge Entry ────────────────────────────────────────────────

export interface CodeChange {
  file: string
  action: "created" | "modified" | "deleted"
  linesChanged: number
}

export interface CoherentKnowledgeEntry {
  id: string

  // WHAT
  action: string                   // human-readable action summary
  taskId: string                   // which TaskNode this tracks
  planId: string | null            // parent WorkPlan ID

  // WHO
  agent: string                    // which agent performed the work
  delegatedBy: string | null       // who delegated this (null if self-started)
  delegationDepth: number          // 0 = coordinator, 1 = direct delegate

  // WHERE
  workflow: string                 // which workflow pattern was used
  phase: string                    // which phase this belongs to
  sessionId: string                // which session this happened in

  // WHY
  planningArtifact: string | null  // path to planning artifact (Type C only)
  tier: 1 | 2 | 3 | null          // artifact tier (null for Type B)

  // LINKS
  wikiEntries: string[]            // wiki entry IDs spawned by this action
  codeChanges: CodeChange[]        // files touched

  // WHEN
  createdAt: number
  completedAt: number | null       // null if still in progress
}

export interface CoherentKnowledgeStore {
  version: string
  entries: CoherentKnowledgeEntry[]
}

// ─── Constants ──────────────────────────────────────────────────────

export const KNOWLEDGE_STORE_VERSION = "1.0.0"

// ─── Factory Functions ──────────────────────────────────────────────

export function createKnowledgeEntry(opts: {
  action: string
  taskId: string
  planId?: string | null
  agent: string
  delegatedBy?: string | null
  delegationDepth?: number
  workflow?: string
  phase?: string
  sessionId: string
  planningArtifact?: string | null
  tier?: 1 | 2 | 3 | null
  codeChanges?: CodeChange[]
}): CoherentKnowledgeEntry {
  const now = Date.now()
  return {
    id: `ck-${now}-${Math.random().toString(36).slice(2, 8)}`,
    action: opts.action,
    taskId: opts.taskId,
    planId: opts.planId ?? null,
    agent: opts.agent,
    delegatedBy: opts.delegatedBy ?? null,
    delegationDepth: opts.delegationDepth ?? 0,
    workflow: opts.workflow ?? "default",
    phase: opts.phase ?? "unknown",
    sessionId: opts.sessionId,
    planningArtifact: opts.planningArtifact ?? null,
    tier: opts.tier ?? null,
    wikiEntries: [],
    codeChanges: opts.codeChanges ?? [],
    createdAt: now,
    completedAt: null,
  }
}

export function createKnowledgeStore(): CoherentKnowledgeStore {
  return {
    version: KNOWLEDGE_STORE_VERSION,
    entries: [],
  }
}

// ─── Query Helpers ──────────────────────────────────────────────────

/** Find knowledge entries for a specific task */
export function findKnowledgeByTask(
  store: CoherentKnowledgeStore,
  taskId: string,
): CoherentKnowledgeEntry[] {
  return store.entries.filter(e => e.taskId === taskId)
}

/** Find knowledge entries for a specific session */
export function findKnowledgeBySession(
  store: CoherentKnowledgeStore,
  sessionId: string,
): CoherentKnowledgeEntry[] {
  return store.entries.filter(e => e.sessionId === sessionId)
}

/** Find knowledge entries for a specific agent */
export function findKnowledgeByAgent(
  store: CoherentKnowledgeStore,
  agent: string,
): CoherentKnowledgeEntry[] {
  return store.entries.filter(e => e.agent === agent)
}

/** Find knowledge entries for a specific plan */
export function findKnowledgeByPlan(
  store: CoherentKnowledgeStore,
  planId: string,
): CoherentKnowledgeEntry[] {
  return store.entries.filter(e => e.planId === planId)
}

/** Get all unique files changed across knowledge entries */
export function getChangedFiles(store: CoherentKnowledgeStore): string[] {
  const files = new Set<string>()
  for (const entry of store.entries) {
    for (const change of entry.codeChanges) {
      files.add(change.file)
    }
  }
  return [...files].sort()
}

/** Count completed vs in-progress entries */
export function knowledgeStats(store: CoherentKnowledgeStore): {
  total: number
  completed: number
  inProgress: number
  byAgent: Record<string, number>
  byTier: Record<string, number>
} {
  const byAgent: Record<string, number> = {}
  const byTier: Record<string, number> = {}
  let completed = 0

  for (const entry of store.entries) {
    if (entry.completedAt !== null) completed++

    byAgent[entry.agent] = (byAgent[entry.agent] ?? 0) + 1

    const tierKey = entry.tier !== null ? `tier-${entry.tier}` : "no-tier"
    byTier[tierKey] = (byTier[tierKey] ?? 0) + 1
  }

  return {
    total: store.entries.length,
    completed,
    inProgress: store.entries.length - completed,
    byAgent,
    byTier,
  }
}

// ─── Formatting ─────────────────────────────────────────────────────

/** Format knowledge entry for agent-readable output */
export function formatKnowledgeEntry(entry: CoherentKnowledgeEntry): string {
  const lines: string[] = [
    `[${entry.agent}] ${entry.action}`,
    `  Task: ${entry.taskId} | Session: ${entry.sessionId}`,
  ]

  if (entry.planId) {
    lines.push(`  Plan: ${entry.planId}`)
  }

  if (entry.delegatedBy) {
    lines.push(`  Delegated by: ${entry.delegatedBy} (depth ${entry.delegationDepth})`)
  }

  if (entry.codeChanges.length > 0) {
    lines.push(`  Code: ${entry.codeChanges.length} file(s) changed`)
  }

  if (entry.wikiEntries.length > 0) {
    lines.push(`  Wiki: ${entry.wikiEntries.length} entry/entries`)
  }

  const status = entry.completedAt !== null ? "completed" : "in progress"
  lines.push(`  Status: ${status}`)

  return lines.join("\n")
}

/** Format knowledge store summary */
export function formatKnowledgeSummary(store: CoherentKnowledgeStore): string {
  if (store.entries.length === 0) return "No knowledge entries yet."

  const stats = knowledgeStats(store)
  const lines: string[] = [
    `Knowledge: ${stats.total} entries (${stats.completed} complete, ${stats.inProgress} in progress)`,
  ]

  const agentParts = Object.entries(stats.byAgent)
    .map(([agent, count]) => `${agent}: ${count}`)
    .join(", ")
  if (agentParts) {
    lines.push(`By agent: ${agentParts}`)
  }

  return lines.join("\n")
}
