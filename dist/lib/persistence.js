/**
 * Persistence Module
 *
 * Atomic file operations with staleness tracking and backup.
 * All state persistence goes through here for consistency.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, readdirSync, statSync, } from "fs";
import { dirname, join, basename } from "path";
import { z } from "zod";
import { StateSchema, createDefaultState, ConfigSchema, createDefaultConfig, AnchorSchema, enforceTimestamp, } from "../schemas/index.js";
import { info } from "./logging.js";
/**
 * Default paths relative to project directory
 */
export const PATHS = {
    state: ".idumb/state.json",
    config: ".idumb/config.json",
    anchors: ".idumb/anchors",
    sessions: ".idumb/sessions",
    signals: ".idumb/signals",
    logs: ".idumb/logs",
    backups: ".idumb/backups",
};
/**
 * Ensure directory exists
 */
export function ensureDir(dirPath) {
    if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true });
    }
}
/**
 * Get absolute path from directory and relative path
 */
export function getPath(directory, relativePath) {
    return join(directory, relativePath);
}
/**
 * Initialize .idumb directory structure
 */
export function initializeIdumbDir(directory) {
    const dirs = [
        PATHS.anchors,
        PATHS.sessions,
        PATHS.signals,
        PATHS.logs,
        PATHS.backups,
    ];
    for (const dir of dirs) {
        ensureDir(getPath(directory, dir));
    }
}
/**
 * Create backup of a file before modification
 */
function createBackup(filePath) {
    if (!existsSync(filePath))
        return null;
    const dir = dirname(filePath);
    const name = basename(filePath, ".json");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = join(dir, "..", "backups", `${name}-${timestamp}.json`);
    try {
        ensureDir(dirname(backupPath));
        copyFileSync(filePath, backupPath);
        return backupPath;
    }
    catch {
        return null;
    }
}
/**
 * Atomic write - write to temp file then rename
 */
function atomicWrite(filePath, content) {
    const tempPath = `${filePath}.tmp`;
    ensureDir(dirname(filePath));
    writeFileSync(tempPath, content, "utf-8");
    // On POSIX, rename is atomic
    const { renameSync } = require("fs");
    renameSync(tempPath, filePath);
}
/**
 * Read and parse JSON file with schema validation
 */
export function readJson(filePath, schema, defaultValue) {
    if (!existsSync(filePath)) {
        return defaultValue;
    }
    try {
        const content = readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(content);
        return schema.parse(parsed);
    }
    catch {
        return defaultValue;
    }
}
/**
 * Write JSON with atomic write and optional backup
 */
export function writeJson(filePath, data, options) {
    if (options?.backup) {
        createBackup(filePath);
    }
    const content = JSON.stringify(data, null, 2);
    atomicWrite(filePath, content);
}
// ============================================================================
// STATE PERSISTENCE
// ============================================================================
/**
 * Read governance state
 */
export function readState(directory) {
    const statePath = getPath(directory, PATHS.state);
    const state = readJson(statePath, StateSchema, createDefaultState());
    // Enforce timestamp staleness on read
    if (state.timestamp) {
        state.timestamp = enforceTimestamp(state.timestamp);
    }
    return state;
}
/**
 * Write governance state with backup
 */
export function writeState(directory, state) {
    const statePath = getPath(directory, PATHS.state);
    // Update modification timestamp
    const now = new Date().toISOString();
    const updatedState = {
        ...state,
        timestamp: state.timestamp
            ? { ...state.timestamp, modifiedAt: now }
            : { createdAt: now, modifiedAt: now, stalenessHours: 0, isStale: false },
    };
    writeJson(statePath, updatedState, { backup: true });
    info(directory, "State written", { path: statePath });
}
/**
 * Check if state exists
 */
export function stateExists(directory) {
    return existsSync(getPath(directory, PATHS.state));
}
// ============================================================================
// CONFIG PERSISTENCE
// ============================================================================
/**
 * Read plugin config
 */
export function readConfig(directory) {
    const configPath = getPath(directory, PATHS.config);
    return readJson(configPath, ConfigSchema, createDefaultConfig());
}
/**
 * Write plugin config
 */
export function writeConfig(directory, config) {
    const configPath = getPath(directory, PATHS.config);
    writeJson(configPath, config);
    info(directory, "Config written", { path: configPath });
}
// ============================================================================
// ANCHOR PERSISTENCE
// ============================================================================
/**
 * Save anchor to individual file
 */
export function saveAnchor(directory, anchor) {
    const anchorPath = getPath(directory, join(PATHS.anchors, `${anchor.id}.json`));
    writeJson(anchorPath, anchor);
}
/**
 * Load anchor by ID
 */
export function loadAnchor(directory, id) {
    const anchorPath = getPath(directory, join(PATHS.anchors, `${id}.json`));
    if (!existsSync(anchorPath))
        return null;
    try {
        const content = readFileSync(anchorPath, "utf-8");
        const parsed = JSON.parse(content);
        const anchor = AnchorSchema.parse(parsed);
        // Enforce staleness
        anchor.timestamp = enforceTimestamp(anchor.timestamp);
        return anchor;
    }
    catch {
        return null;
    }
}
/**
 * Load all anchors
 */
export function loadAllAnchors(directory) {
    const anchorsDir = getPath(directory, PATHS.anchors);
    if (!existsSync(anchorsDir))
        return [];
    const files = readdirSync(anchorsDir).filter((f) => f.endsWith(".json"));
    const anchors = [];
    for (const file of files) {
        const id = file.replace(".json", "");
        const anchor = loadAnchor(directory, id);
        if (anchor) {
            anchors.push(anchor);
        }
    }
    return anchors;
}
/**
 * Delete anchor
 */
export function deleteAnchor(directory, id) {
    const anchorPath = getPath(directory, join(PATHS.anchors, `${id}.json`));
    if (!existsSync(anchorPath))
        return false;
    try {
        const { unlinkSync } = require("fs");
        unlinkSync(anchorPath);
        return true;
    }
    catch {
        return false;
    }
}
// ============================================================================
// SESSION PERSISTENCE
// ============================================================================
/**
 * Session file schema
 */
const SessionFileSchema = z.object({
    id: z.string(),
    parentId: z.string().optional(),
    agentRole: z.string().optional(),
    depth: z.number(),
    delegationChain: z.array(z.string()).default([]),
    createdAt: z.string().datetime(),
    lastActivity: z.string().datetime(),
    status: z.enum(["active", "idle", "completed", "error"]),
});
/**
 * Save session tracking info
 */
export function saveSession(directory, session) {
    const sessionPath = getPath(directory, join(PATHS.sessions, `${session.id}.json`));
    writeJson(sessionPath, session);
}
/**
 * Load session by ID
 */
export function loadSession(directory, id) {
    const sessionPath = getPath(directory, join(PATHS.sessions, `${id}.json`));
    if (!existsSync(sessionPath))
        return null;
    try {
        const content = readFileSync(sessionPath, "utf-8");
        return SessionFileSchema.parse(JSON.parse(content));
    }
    catch {
        return null;
    }
}
/**
 * List all sessions
 */
export function listSessions(directory) {
    const sessionsDir = getPath(directory, PATHS.sessions);
    if (!existsSync(sessionsDir))
        return [];
    return readdirSync(sessionsDir)
        .filter((f) => f.endsWith(".json"))
        .map((f) => f.replace(".json", ""));
}
/**
 * Cleanup old sessions (older than 48 hours)
 */
export function cleanupOldSessions(directory) {
    const sessionsDir = getPath(directory, PATHS.sessions);
    if (!existsSync(sessionsDir))
        return 0;
    const files = readdirSync(sessionsDir).filter((f) => f.endsWith(".json"));
    const now = Date.now();
    const threshold = 48 * 60 * 60 * 1000; // 48 hours in ms
    let cleaned = 0;
    for (const file of files) {
        const filePath = join(sessionsDir, file);
        const stats = statSync(filePath);
        if (now - stats.mtimeMs > threshold) {
            try {
                const { unlinkSync } = require("fs");
                unlinkSync(filePath);
                cleaned++;
            }
            catch {
                // Skip
            }
        }
    }
    if (cleaned > 0) {
        info(directory, `Cleaned up ${cleaned} old sessions`);
    }
    return cleaned;
}
// ============================================================================
// EXPORTS
// ============================================================================
export { createBackup, atomicWrite, };
//# sourceMappingURL=persistence.js.map