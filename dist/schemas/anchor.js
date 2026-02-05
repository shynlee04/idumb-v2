/**
 * Anchor Schema
 *
 * Anchors are context preservation units that survive compaction.
 * They carry priority weights and staleness tracking per the plan.
 */
import { z } from "zod";
/**
 * Timestamp schema - enforced on all entities per Time-to-Stale spec
 */
export const TimestampSchema = z.object({
    createdAt: z.string().datetime(),
    modifiedAt: z.string().datetime(),
    validatedAt: z.string().datetime().optional(),
    stalenessHours: z.number().default(0),
    isStale: z.boolean().default(false), // > 48 hours = stale
});
/**
 * Anchor priority levels
 * - critical: Must survive compaction, always injected
 * - high: Survives compaction if budget allows
 * - medium: May be pruned under pressure
 * - low: First to be pruned
 */
export const AnchorPrioritySchema = z.enum(["critical", "high", "medium", "low"]);
/**
 * Anchor type classification
 */
export const AnchorTypeSchema = z.enum([
    "decision", // Key decisions that must persist
    "context", // General context preservation
    "checkpoint", // Recovery points
    "error", // Error context for debugging
    "attention", // Focus directives
]);
/**
 * Full anchor schema with all metadata
 */
export const AnchorSchema = z.object({
    id: z.string().uuid(),
    type: AnchorTypeSchema,
    content: z.string().max(2000), // Limit content size
    priority: AnchorPrioritySchema,
    survives_compaction: z.boolean().default(true),
    timestamp: TimestampSchema,
    // For attention anchors
    focusTarget: z.string().optional(), // Turn number or file path
    focusReason: z.string().optional(), // Why this needs attention
    // For traversal
    traversalDepth: z.number().default(0), // 0 = direct, 1+ = related
    entityType: z.enum(["task", "decision", "file", "agent", "phase"]).optional(),
});
/**
 * Anchor collection schema
 */
export const AnchorCollectionSchema = z.array(AnchorSchema);
/**
 * Calculate staleness in hours from a timestamp
 */
export function calculateStaleness(timestamp) {
    const lastValid = timestamp.validatedAt || timestamp.modifiedAt;
    const now = new Date();
    const lastDate = new Date(lastValid);
    return (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);
}
/**
 * Enforce timestamp staleness calculation
 */
export function enforceTimestamp(timestamp) {
    const staleness = calculateStaleness(timestamp);
    return {
        ...timestamp,
        stalenessHours: staleness,
        isStale: staleness > 48,
    };
}
/**
 * Calculate anchor selection score (from micro-milestone spec)
 * Higher score = higher priority for selection
 */
export function calculateAnchorScore(anchor) {
    const priorityWeight = {
        critical: 100,
        high: 75,
        medium: 50,
        low: 25,
    };
    const freshnessBonus = Math.max(0, 48 - anchor.timestamp.stalenessHours);
    const depthPenalty = anchor.traversalDepth * 10;
    return priorityWeight[anchor.priority] + freshnessBonus - depthPenalty;
}
/**
 * Select anchors within budget, sorted by score
 */
export function selectAnchors(anchors, budget) {
    // 1. Filter stale anchors (staleness > 48 hours) unless critical
    const fresh = anchors.filter((a) => !a.timestamp.isStale || a.priority === "critical");
    // 2. Sort by composite score
    const scored = fresh
        .map((a) => ({
        ...a,
        score: calculateAnchorScore(a),
    }))
        .sort((a, b) => b.score - a.score);
    // 3. Take top N within budget
    return scored.slice(0, budget);
}
/**
 * Create a new anchor with proper timestamps
 */
export function createAnchor(type, content, priority, options) {
    const now = new Date().toISOString();
    return AnchorSchema.parse({
        id: crypto.randomUUID(),
        type,
        content,
        priority,
        survives_compaction: true,
        timestamp: {
            createdAt: now,
            modifiedAt: now,
            stalenessHours: 0,
            isStale: false,
        },
        traversalDepth: 0,
        ...options,
    });
}
//# sourceMappingURL=anchor.js.map