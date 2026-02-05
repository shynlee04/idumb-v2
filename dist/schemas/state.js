/**
 * State Schema
 *
 * Single source of truth for governance state.
 * Persisted to .idumb/state.json
 */
import { z } from "zod";
import { AnchorSchema, TimestampSchema } from "./anchor.js";
/**
 * History entry - records governance actions
 */
export const HistoryEntrySchema = z.object({
    timestamp: z.string().datetime(),
    action: z.string(),
    agent: z.string().optional(),
    tool: z.string().optional(),
    result: z.enum(["pass", "fail", "partial", "blocked", "skipped"]),
    details: z.string().optional(),
});
/**
 * Session tracking for delegation depth
 */
export const SessionInfoSchema = z.object({
    id: z.string(),
    parentId: z.string().optional(),
    agentRole: z.string().optional(),
    depth: z.number().default(0),
    status: z.enum(["active", "idle", "completed", "error"]).default("active"),
    createdAt: z.string().datetime(),
    lastActivity: z.string().datetime().optional(),
});
/**
 * Governance phase tracking
 */
export const PhaseSchema = z.enum([
    "init",
    "research",
    "planning",
    "execution",
    "validation",
    "completed",
]);
/**
 * Main governance state schema
 */
export const StateSchema = z.object({
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    initialized: z.string().datetime(),
    phase: PhaseSchema.optional(),
    framework: z.enum(["idumb", "planning", "bmad", "custom", "none"]).default("idumb"),
    // Validation tracking
    validationCount: z.number().int().min(0).default(0),
    lastValidation: z.string().datetime().nullable().default(null),
    // Context preservation
    anchors: z.array(AnchorSchema).default([]),
    // History log
    history: z.array(HistoryEntrySchema).default([]),
    // Session tracking
    sessions: z.record(z.string(), SessionInfoSchema).default({}),
    // Metadata
    timestamp: TimestampSchema.optional(),
});
/**
 * Create default initial state
 */
export function createDefaultState() {
    const now = new Date().toISOString();
    return StateSchema.parse({
        version: "2.0.0",
        initialized: now,
        phase: "init",
        framework: "idumb",
        validationCount: 0,
        lastValidation: null,
        anchors: [],
        history: [],
        sessions: {},
        timestamp: {
            createdAt: now,
            modifiedAt: now,
            stalenessHours: 0,
            isStale: false,
        },
    });
}
/**
 * Add a history entry to state
 */
export function addHistoryEntry(state, action, result, options) {
    const entry = {
        timestamp: new Date().toISOString(),
        action,
        result,
        ...options,
    };
    const MAX_HISTORY = 100;
    const newHistory = [...state.history, entry].slice(-MAX_HISTORY);
    return {
        ...state,
        history: newHistory,
        timestamp: state.timestamp
            ? {
                ...state.timestamp,
                modifiedAt: new Date().toISOString(),
            }
            : undefined,
    };
}
/**
 * Add an anchor to state
 */
export function addAnchor(state, anchor) {
    return {
        ...state,
        anchors: [...state.anchors, anchor],
        timestamp: state.timestamp
            ? {
                ...state.timestamp,
                modifiedAt: new Date().toISOString(),
            }
            : undefined,
    };
}
/**
 * Update session info
 */
export function updateSession(state, sessionId, update) {
    const existing = state.sessions[sessionId] || {
        id: sessionId,
        depth: 0,
        status: "active",
        createdAt: new Date().toISOString(),
    };
    return {
        ...state,
        sessions: {
            ...state.sessions,
            [sessionId]: {
                ...existing,
                ...update,
                lastActivity: new Date().toISOString(),
            },
        },
    };
}
/**
 * Get session delegation depth
 */
export function getSessionDepth(state, sessionId) {
    return state.sessions[sessionId]?.depth ?? 0;
}
/**
 * Increment validation count
 */
export function incrementValidation(state) {
    return {
        ...state,
        validationCount: state.validationCount + 1,
        lastValidation: new Date().toISOString(),
        timestamp: state.timestamp
            ? {
                ...state.timestamp,
                modifiedAt: new Date().toISOString(),
                validatedAt: new Date().toISOString(),
            }
            : undefined,
    };
}
//# sourceMappingURL=state.js.map