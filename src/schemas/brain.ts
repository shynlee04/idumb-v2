/**
 * Brain entity schemas — Knowledge graph entries.
 *
 * Part of Group 2: Brain / Knowledge Graph
 * Entities persist to `.idumb/brain/knowledge.json`
 *
 * Key properties:
 * - Hierarchical: entries have parent-child relationships
 * - Relational: entries link to tasks, anchors, other entries
 * - Temporal: confidence decays, staleness auto-detected
 * - Typed: entries are classified for intelligent retrieval
 */

// ─── Brain Entry Types ──────────────────────────────────────────────

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

// ─── Brain Entry ────────────────────────────────────────────────────

export interface BrainEntry {
    id: string
    type: BrainEntryType

    // Content
    title: string
    content: string                      // Natural-language summary
    evidence: string[]                   // File paths, line refs, git hashes

    // Hierarchy + Relationships
    parentId?: string                    // Part of a larger entry
    childIds: string[]                   // Sub-entries
    relatedTo: string[]                  // Cross-references (entry IDs, task IDs, anchor IDs)
    supersedes?: string                  // Which entry this replaces

    // Staleness + Lifecycle
    createdAt: number
    modifiedAt: number
    staleAfter: number                   // TTL in ms (default: 7 days)
    confidence: number                   // 0-100, decays over time
    source: BrainSource

    // Usage tracking
    accessCount: number                  // How often queried
    lastAccessedAt: number
}

// ─── Brain Store ────────────────────────────────────────────────────

export const BRAIN_STORE_VERSION = "1.0.0"

export interface BrainStore {
    version: string
    entries: BrainEntry[]
    lastSynthesisAt: number              // When last batch synthesis ran
    exportCount: number                  // Running count of last-message exports
}

// ─── Factory Functions ──────────────────────────────────────────────

/** Default TTL for brain entries: 7 days */
const DEFAULT_STALE_AFTER = 7 * 24 * 60 * 60 * 1000

export function createBrainEntry(opts: {
    type: BrainEntryType
    title: string
    content: string
    source: BrainSource
    evidence?: string[]
    parentId?: string
    relatedTo?: string[]
    confidence?: number
    staleAfter?: number
}): BrainEntry {
    const now = Date.now()
    return {
        id: `brain-${now}-${Math.random().toString(36).slice(2, 8)}`,
        type: opts.type,
        title: opts.title,
        content: opts.content,
        evidence: opts.evidence ?? [],
        parentId: opts.parentId,
        childIds: [],
        relatedTo: opts.relatedTo ?? [],
        createdAt: now,
        modifiedAt: now,
        staleAfter: opts.staleAfter ?? DEFAULT_STALE_AFTER,
        confidence: opts.confidence ?? 80,
        source: opts.source,
        accessCount: 0,
        lastAccessedAt: now,
    }
}

export function createBrainStore(): BrainStore {
    return {
        version: BRAIN_STORE_VERSION,
        entries: [],
        lastSynthesisAt: 0,
        exportCount: 0,
    }
}

// ─── Query Helpers ──────────────────────────────────────────────────

/** Compute effective confidence considering time decay */
export function effectiveConfidence(entry: BrainEntry): number {
    const age = Date.now() - entry.modifiedAt
    if (age < entry.staleAfter) return entry.confidence

    // Decay: lose 10 confidence per staleAfter period past expiry
    const periodsOverdue = Math.floor(age / entry.staleAfter)
    return Math.max(0, entry.confidence - periodsOverdue * 10)
}

/** Check if a brain entry is stale */
export function isBrainEntryStale(entry: BrainEntry): boolean {
    return Date.now() - entry.modifiedAt > entry.staleAfter
}

/** Find entries matching a topic (simple keyword match + relationship traversal) */
export function queryBrain(store: BrainStore, topic: string): BrainEntry[] {
    const lower = topic.toLowerCase()
    const direct = store.entries.filter(e =>
        e.title.toLowerCase().includes(lower) ||
        e.content.toLowerCase().includes(lower) ||
        e.type === lower
    )

    // Follow relatedTo links (1 level deep)
    const relatedIds = new Set<string>()
    for (const entry of direct) {
        for (const relId of entry.relatedTo) {
            relatedIds.add(relId)
        }
    }

    const related = store.entries.filter(e =>
        relatedIds.has(e.id) && !direct.includes(e)
    )

    // Sort by effective confidence descending
    return [...direct, ...related].sort(
        (a, b) => effectiveConfidence(b) - effectiveConfidence(a)
    )
}

/** Format brain entries for agent-readable output */
export function formatBrainEntries(entries: BrainEntry[]): string {
    if (entries.length === 0) return "No knowledge entries found."

    return entries.map(e => {
        const conf = effectiveConfidence(e)
        const staleTag = isBrainEntryStale(e) ? " [STALE]" : ""
        const lines = [
            `[${e.type.toUpperCase()}] ${e.title}${staleTag} (confidence: ${conf}/100)`,
            `  ${e.content}`,
        ]
        if (e.evidence.length > 0) {
            lines.push(`  Evidence: ${e.evidence.join(", ")}`)
        }
        if (e.relatedTo.length > 0) {
            lines.push(`  Related: ${e.relatedTo.join(", ")}`)
        }
        return lines.join("\n")
    }).join("\n\n")
}
