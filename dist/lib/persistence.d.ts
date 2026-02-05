/**
 * Persistence Module
 *
 * Atomic file operations with staleness tracking and backup.
 * All state persistence goes through here for consistency.
 */
import { z } from "zod";
import { type State, type Config, type Anchor } from "../schemas/index.js";
/**
 * Default paths relative to project directory
 */
export declare const PATHS: {
    state: string;
    config: string;
    executionMetrics: string;
    brainContext: string;
    scanResult: string;
    drift: string;
    governance: string;
    validations: string;
    history: string;
    metadata: string;
    brainSessions: string;
    anchors: string;
    sessions: string;
    signals: string;
    modules: string;
    logs: string;
    backups: string;
    projectOutput: string;
    phases: string;
    research: string;
    roadmaps: string;
    validationReports: string;
};
/**
 * Ensure directory exists
 */
export declare function ensureDir(dirPath: string): void;
/**
 * Get absolute path from directory and relative path
 */
export declare function getPath(directory: string, relativePath: string): string;
/**
 * Initialize .idumb directory structure
 */
export declare function initializeIdumbDir(directory: string): void;
/**
 * Read and parse JSON file with schema validation
 */
export declare function readJson<T>(filePath: string, schema: z.ZodType<T>, defaultValue: T): T;
/**
 * Write JSON with atomic write and optional backup
 */
export declare function writeJson<T>(filePath: string, data: T, options?: {
    backup?: boolean;
}): void;
/**
 * Read governance state
 */
export declare function readState(directory: string): State;
/**
 * Write governance state with backup
 */
export declare function writeState(directory: string, state: State): void;
/**
 * Check if state exists
 */
export declare function stateExists(directory: string): boolean;
/**
 * Read plugin config
 */
export declare function readConfig(directory: string): Config;
/**
 * Write plugin config
 */
export declare function writeConfig(directory: string, config: Config): void;
/**
 * Save anchor to individual file
 */
export declare function saveAnchor(directory: string, anchor: Anchor): void;
/**
 * Load anchor by ID
 */
export declare function loadAnchor(directory: string, id: string): Anchor | null;
/**
 * Load all anchors
 */
export declare function loadAllAnchors(directory: string): Anchor[];
/**
 * Delete anchor
 */
export declare function deleteAnchor(directory: string, id: string): boolean;
/**
 * Session file schema
 */
declare const SessionFileSchema: z.ZodObject<{
    id: z.ZodString;
    parentId: z.ZodOptional<z.ZodString>;
    agentRole: z.ZodOptional<z.ZodString>;
    depth: z.ZodNumber;
    delegationChain: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    createdAt: z.ZodString;
    lastActivity: z.ZodString;
    status: z.ZodEnum<["active", "idle", "completed", "error"]>;
}, "strip", z.ZodTypeAny, {
    createdAt: string;
    status: "error" | "active" | "idle" | "completed";
    id: string;
    depth: number;
    lastActivity: string;
    delegationChain: string[];
    parentId?: string | undefined;
    agentRole?: string | undefined;
}, {
    createdAt: string;
    status: "error" | "active" | "idle" | "completed";
    id: string;
    depth: number;
    lastActivity: string;
    parentId?: string | undefined;
    agentRole?: string | undefined;
    delegationChain?: string[] | undefined;
}>;
type SessionFile = z.infer<typeof SessionFileSchema>;
/**
 * Save session tracking info
 */
export declare function saveSession(directory: string, session: SessionFile): void;
/**
 * Load session by ID
 */
export declare function loadSession(directory: string, id: string): SessionFile | null;
/**
 * List all sessions
 */
export declare function listSessions(directory: string): string[];
/**
 * Cleanup old sessions (older than 48 hours)
 */
export declare function cleanupOldSessions(directory: string): number;
export {};
//# sourceMappingURL=persistence.d.ts.map