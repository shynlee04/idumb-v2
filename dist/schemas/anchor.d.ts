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
export declare const TimestampSchema: z.ZodObject<{
    createdAt: z.ZodString;
    modifiedAt: z.ZodString;
    validatedAt: z.ZodOptional<z.ZodString>;
    stalenessHours: z.ZodDefault<z.ZodNumber>;
    isStale: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    createdAt: string;
    modifiedAt: string;
    stalenessHours: number;
    isStale: boolean;
    validatedAt?: string | undefined;
}, {
    createdAt: string;
    modifiedAt: string;
    validatedAt?: string | undefined;
    stalenessHours?: number | undefined;
    isStale?: boolean | undefined;
}>;
export type Timestamp = z.infer<typeof TimestampSchema>;
/**
 * Anchor priority levels
 * - critical: Must survive compaction, always injected
 * - high: Survives compaction if budget allows
 * - medium: May be pruned under pressure
 * - low: First to be pruned
 */
export declare const AnchorPrioritySchema: z.ZodEnum<["critical", "high", "medium", "low"]>;
export type AnchorPriority = z.infer<typeof AnchorPrioritySchema>;
/**
 * Anchor type classification
 */
export declare const AnchorTypeSchema: z.ZodEnum<["decision", "context", "checkpoint", "error", "attention"]>;
export type AnchorType = z.infer<typeof AnchorTypeSchema>;
/**
 * Full anchor schema with all metadata
 */
export declare const AnchorSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["decision", "context", "checkpoint", "error", "attention"]>;
    content: z.ZodString;
    priority: z.ZodEnum<["critical", "high", "medium", "low"]>;
    survives_compaction: z.ZodDefault<z.ZodBoolean>;
    timestamp: z.ZodObject<{
        createdAt: z.ZodString;
        modifiedAt: z.ZodString;
        validatedAt: z.ZodOptional<z.ZodString>;
        stalenessHours: z.ZodDefault<z.ZodNumber>;
        isStale: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        createdAt: string;
        modifiedAt: string;
        stalenessHours: number;
        isStale: boolean;
        validatedAt?: string | undefined;
    }, {
        createdAt: string;
        modifiedAt: string;
        validatedAt?: string | undefined;
        stalenessHours?: number | undefined;
        isStale?: boolean | undefined;
    }>;
    focusTarget: z.ZodOptional<z.ZodString>;
    focusReason: z.ZodOptional<z.ZodString>;
    traversalDepth: z.ZodDefault<z.ZodNumber>;
    entityType: z.ZodOptional<z.ZodEnum<["task", "decision", "file", "agent", "phase"]>>;
}, "strip", z.ZodTypeAny, {
    type: "error" | "decision" | "context" | "checkpoint" | "attention";
    id: string;
    content: string;
    priority: "critical" | "high" | "medium" | "low";
    survives_compaction: boolean;
    timestamp: {
        createdAt: string;
        modifiedAt: string;
        stalenessHours: number;
        isStale: boolean;
        validatedAt?: string | undefined;
    };
    traversalDepth: number;
    focusTarget?: string | undefined;
    focusReason?: string | undefined;
    entityType?: "file" | "decision" | "task" | "agent" | "phase" | undefined;
}, {
    type: "error" | "decision" | "context" | "checkpoint" | "attention";
    id: string;
    content: string;
    priority: "critical" | "high" | "medium" | "low";
    timestamp: {
        createdAt: string;
        modifiedAt: string;
        validatedAt?: string | undefined;
        stalenessHours?: number | undefined;
        isStale?: boolean | undefined;
    };
    survives_compaction?: boolean | undefined;
    focusTarget?: string | undefined;
    focusReason?: string | undefined;
    traversalDepth?: number | undefined;
    entityType?: "file" | "decision" | "task" | "agent" | "phase" | undefined;
}>;
export type Anchor = z.infer<typeof AnchorSchema>;
/**
 * Anchor collection schema
 */
export declare const AnchorCollectionSchema: z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["decision", "context", "checkpoint", "error", "attention"]>;
    content: z.ZodString;
    priority: z.ZodEnum<["critical", "high", "medium", "low"]>;
    survives_compaction: z.ZodDefault<z.ZodBoolean>;
    timestamp: z.ZodObject<{
        createdAt: z.ZodString;
        modifiedAt: z.ZodString;
        validatedAt: z.ZodOptional<z.ZodString>;
        stalenessHours: z.ZodDefault<z.ZodNumber>;
        isStale: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        createdAt: string;
        modifiedAt: string;
        stalenessHours: number;
        isStale: boolean;
        validatedAt?: string | undefined;
    }, {
        createdAt: string;
        modifiedAt: string;
        validatedAt?: string | undefined;
        stalenessHours?: number | undefined;
        isStale?: boolean | undefined;
    }>;
    focusTarget: z.ZodOptional<z.ZodString>;
    focusReason: z.ZodOptional<z.ZodString>;
    traversalDepth: z.ZodDefault<z.ZodNumber>;
    entityType: z.ZodOptional<z.ZodEnum<["task", "decision", "file", "agent", "phase"]>>;
}, "strip", z.ZodTypeAny, {
    type: "error" | "decision" | "context" | "checkpoint" | "attention";
    id: string;
    content: string;
    priority: "critical" | "high" | "medium" | "low";
    survives_compaction: boolean;
    timestamp: {
        createdAt: string;
        modifiedAt: string;
        stalenessHours: number;
        isStale: boolean;
        validatedAt?: string | undefined;
    };
    traversalDepth: number;
    focusTarget?: string | undefined;
    focusReason?: string | undefined;
    entityType?: "file" | "decision" | "task" | "agent" | "phase" | undefined;
}, {
    type: "error" | "decision" | "context" | "checkpoint" | "attention";
    id: string;
    content: string;
    priority: "critical" | "high" | "medium" | "low";
    timestamp: {
        createdAt: string;
        modifiedAt: string;
        validatedAt?: string | undefined;
        stalenessHours?: number | undefined;
        isStale?: boolean | undefined;
    };
    survives_compaction?: boolean | undefined;
    focusTarget?: string | undefined;
    focusReason?: string | undefined;
    traversalDepth?: number | undefined;
    entityType?: "file" | "decision" | "task" | "agent" | "phase" | undefined;
}>, "many">;
export type AnchorCollection = z.infer<typeof AnchorCollectionSchema>;
/**
 * Calculate staleness in hours from a timestamp
 */
export declare function calculateStaleness(timestamp: Timestamp): number;
/**
 * Enforce timestamp staleness calculation
 */
export declare function enforceTimestamp(timestamp: Timestamp): Timestamp;
/**
 * Calculate anchor selection score (from micro-milestone spec)
 * Higher score = higher priority for selection
 */
export declare function calculateAnchorScore(anchor: Anchor): number;
/**
 * Select anchors within budget, sorted by score
 */
export declare function selectAnchors(anchors: Anchor[], budget: number): Anchor[];
/**
 * Create a new anchor with proper timestamps
 */
export declare function createAnchor(type: AnchorType, content: string, priority: AnchorPriority, options?: Partial<Anchor>): Anchor;
//# sourceMappingURL=anchor.d.ts.map