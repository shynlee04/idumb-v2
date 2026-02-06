/**
 * Anchor schema — context preservation units that survive compaction.
 * 
 * Plain TypeScript interfaces (DON'T #9: no Zod for internal state).
 * 
 * Responsibility: Define anchor structure, timestamp enforcement,
 * priority scoring, and budget-aware selection.
 * 
 * Consumers: compaction hook (scoring/selection), anchor tool (CRUD)
 */

/** Anchor types — what kind of context this preserves */
export type AnchorType = "decision" | "context" | "checkpoint" | "error" | "attention"

/** Priority levels with numeric weights for scoring */
export type AnchorPriority = "critical" | "high" | "medium" | "low"

const PRIORITY_WEIGHTS: Record<AnchorPriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

/** Staleness threshold in hours — anchors older than this get deprioritized */
const STALE_HOURS = 48

/** An anchor — the core unit of context preservation */
export interface Anchor {
  id: string
  type: AnchorType
  priority: AnchorPriority
  content: string
  createdAt: number   // Date.now() timestamp
  modifiedAt: number
}

/** Create a new anchor with enforced timestamps */
export function createAnchor(
  type: AnchorType,
  priority: AnchorPriority,
  content: string,
): Anchor {
  const now = Date.now()
  return {
    id: `anchor-${now}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    priority,
    content,
    createdAt: now,
    modifiedAt: now,
  }
}

/** Calculate staleness in hours */
export function stalenessHours(anchor: Anchor): number {
  return (Date.now() - anchor.modifiedAt) / (1000 * 60 * 60)
}

/** Is this anchor stale? (>48h without update) */
export function isStale(anchor: Anchor): boolean {
  return stalenessHours(anchor) > STALE_HOURS
}

/**
 * Score an anchor for selection priority.
 * Higher = more important = selected first.
 * 
 * Score = priorityWeight × freshnessMultiplier
 * Stale anchors get 0.25× multiplier (still selected if critical, but demoted)
 */
export function scoreAnchor(anchor: Anchor): number {
  const weight = PRIORITY_WEIGHTS[anchor.priority]
  const freshness = isStale(anchor) ? 0.25 : 1.0
  return weight * freshness
}

/**
 * Select top anchors within a character budget.
 * Sorted by score descending. Stale anchors excluded unless critical.
 * 
 * Budget: enforced to prevent token waste (Pitfall 7).
 */
export function selectAnchors(anchors: Anchor[], budgetChars: number): Anchor[] {
  // Exclude stale non-critical anchors (§ST-STALE: stale entities EXCLUDED, not just flagged)
  const eligible = anchors.filter(a => !isStale(a) || a.priority === "critical")

  // Sort by score descending
  const sorted = [...eligible].sort((a, b) => scoreAnchor(b) - scoreAnchor(a))

  // Select within budget
  const selected: Anchor[] = []
  let used = 0
  for (const anchor of sorted) {
    const cost = anchor.content.length + 40 // ~40 chars for type/priority label
    if (used + cost > budgetChars) break
    selected.push(anchor)
    used += cost
  }

  return selected
}
