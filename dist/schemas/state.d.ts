/**
 * State Schema
 *
 * Single source of truth for governance state.
 * Persisted to .idumb/state.json
 */
import { z } from "zod";
import { type Anchor } from "./anchor.js";
/**
 * History entry - records governance actions
 */
export declare const HistoryEntrySchema: z.ZodObject<{
    timestamp: z.ZodString;
    action: z.ZodString;
    agent: z.ZodOptional<z.ZodString>;
    tool: z.ZodOptional<z.ZodString>;
    result: z.ZodEnum<["pass", "fail", "partial", "blocked", "skipped"]>;
    details: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    action: string;
    result: "pass" | "fail" | "partial" | "blocked" | "skipped";
    agent?: string | undefined;
    tool?: string | undefined;
    details?: string | undefined;
}, {
    timestamp: string;
    action: string;
    result: "pass" | "fail" | "partial" | "blocked" | "skipped";
    agent?: string | undefined;
    tool?: string | undefined;
    details?: string | undefined;
}>;
export type HistoryEntry = z.infer<typeof HistoryEntrySchema>;
/**
 * Session tracking for delegation depth
 */
export declare const SessionInfoSchema: z.ZodObject<{
    id: z.ZodString;
    parentId: z.ZodOptional<z.ZodString>;
    agentRole: z.ZodOptional<z.ZodString>;
    depth: z.ZodDefault<z.ZodNumber>;
    status: z.ZodDefault<z.ZodEnum<["active", "idle", "completed", "error"]>>;
    createdAt: z.ZodString;
    lastActivity: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    status: "error" | "active" | "idle" | "completed";
    depth: number;
    parentId?: string | undefined;
    agentRole?: string | undefined;
    lastActivity?: string | undefined;
}, {
    id: string;
    createdAt: string;
    status?: "error" | "active" | "idle" | "completed" | undefined;
    parentId?: string | undefined;
    agentRole?: string | undefined;
    depth?: number | undefined;
    lastActivity?: string | undefined;
}>;
export type SessionInfo = z.infer<typeof SessionInfoSchema>;
/**
 * Governance phase tracking
 */
export declare const PhaseSchema: z.ZodEnum<["init", "research", "planning", "execution", "validation", "completed"]>;
export type Phase = z.infer<typeof PhaseSchema>;
/**
 * Main governance state schema
 */
export declare const StateSchema: z.ZodObject<{
    version: z.ZodString;
    initialized: z.ZodString;
    phase: z.ZodOptional<z.ZodEnum<["init", "research", "planning", "execution", "validation", "completed"]>>;
    framework: z.ZodDefault<z.ZodEnum<["idumb", "planning", "bmad", "custom", "none"]>>;
    validationCount: z.ZodDefault<z.ZodNumber>;
    lastValidation: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    anchors: z.ZodDefault<z.ZodArray<z.ZodObject<{
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
    }>, "many">>;
    history: z.ZodDefault<z.ZodArray<z.ZodObject<{
        timestamp: z.ZodString;
        action: z.ZodString;
        agent: z.ZodOptional<z.ZodString>;
        tool: z.ZodOptional<z.ZodString>;
        result: z.ZodEnum<["pass", "fail", "partial", "blocked", "skipped"]>;
        details: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        timestamp: string;
        action: string;
        result: "pass" | "fail" | "partial" | "blocked" | "skipped";
        agent?: string | undefined;
        tool?: string | undefined;
        details?: string | undefined;
    }, {
        timestamp: string;
        action: string;
        result: "pass" | "fail" | "partial" | "blocked" | "skipped";
        agent?: string | undefined;
        tool?: string | undefined;
        details?: string | undefined;
    }>, "many">>;
    sessions: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodObject<{
        id: z.ZodString;
        parentId: z.ZodOptional<z.ZodString>;
        agentRole: z.ZodOptional<z.ZodString>;
        depth: z.ZodDefault<z.ZodNumber>;
        status: z.ZodDefault<z.ZodEnum<["active", "idle", "completed", "error"]>>;
        createdAt: z.ZodString;
        lastActivity: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        createdAt: string;
        status: "error" | "active" | "idle" | "completed";
        depth: number;
        parentId?: string | undefined;
        agentRole?: string | undefined;
        lastActivity?: string | undefined;
    }, {
        id: string;
        createdAt: string;
        status?: "error" | "active" | "idle" | "completed" | undefined;
        parentId?: string | undefined;
        agentRole?: string | undefined;
        depth?: number | undefined;
        lastActivity?: string | undefined;
    }>>>;
    timestamp: z.ZodOptional<z.ZodObject<{
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
    }>>;
}, "strip", z.ZodTypeAny, {
    version: string;
    initialized: string;
    framework: "custom" | "planning" | "idumb" | "bmad" | "none";
    validationCount: number;
    lastValidation: string | null;
    anchors: {
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
    }[];
    history: {
        timestamp: string;
        action: string;
        result: "pass" | "fail" | "partial" | "blocked" | "skipped";
        agent?: string | undefined;
        tool?: string | undefined;
        details?: string | undefined;
    }[];
    sessions: Record<string, {
        id: string;
        createdAt: string;
        status: "error" | "active" | "idle" | "completed";
        depth: number;
        parentId?: string | undefined;
        agentRole?: string | undefined;
        lastActivity?: string | undefined;
    }>;
    timestamp?: {
        createdAt: string;
        modifiedAt: string;
        stalenessHours: number;
        isStale: boolean;
        validatedAt?: string | undefined;
    } | undefined;
    phase?: "validation" | "completed" | "init" | "research" | "planning" | "execution" | undefined;
}, {
    version: string;
    initialized: string;
    timestamp?: {
        createdAt: string;
        modifiedAt: string;
        validatedAt?: string | undefined;
        stalenessHours?: number | undefined;
        isStale?: boolean | undefined;
    } | undefined;
    phase?: "validation" | "completed" | "init" | "research" | "planning" | "execution" | undefined;
    framework?: "custom" | "planning" | "idumb" | "bmad" | "none" | undefined;
    validationCount?: number | undefined;
    lastValidation?: string | null | undefined;
    anchors?: {
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
    }[] | undefined;
    history?: {
        timestamp: string;
        action: string;
        result: "pass" | "fail" | "partial" | "blocked" | "skipped";
        agent?: string | undefined;
        tool?: string | undefined;
        details?: string | undefined;
    }[] | undefined;
    sessions?: Record<string, {
        id: string;
        createdAt: string;
        status?: "error" | "active" | "idle" | "completed" | undefined;
        parentId?: string | undefined;
        agentRole?: string | undefined;
        depth?: number | undefined;
        lastActivity?: string | undefined;
    }> | undefined;
}>;
export type State = z.infer<typeof StateSchema>;
/**
 * Create default initial state
 */
export declare function createDefaultState(): State;
/**
 * Add a history entry to state
 */
export declare function addHistoryEntry(state: State, action: string, result: HistoryEntry["result"], options?: Partial<HistoryEntry>): State;
/**
 * Add an anchor to state
 */
export declare function addAnchor(state: State, anchor: Anchor): State;
/**
 * Update session info
 */
export declare function updateSession(state: State, sessionId: string, update: Partial<SessionInfo>): State;
/**
 * Get session delegation depth
 */
export declare function getSessionDepth(state: State, sessionId: string): number;
/**
 * Increment validation count
 */
export declare function incrementValidation(state: State): State;
//# sourceMappingURL=state.d.ts.map