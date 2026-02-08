export { createLogger } from "./logging.js"
export type { Logger, LogLevel } from "./logging.js"
export { setClient, getClient, tryGetClient } from "./sdk-client.js"
export type { SdkClient } from "./sdk-client.js"
export { scanProject, formatDetectionReport } from "./framework-detector.js"
export { scaffoldProject, formatScaffoldReport } from "./scaffolder.js"
export type { ScaffoldResult } from "./scaffolder.js"
export { StateManager, stateManager } from "./persistence.js"

// ─── n4 Entity-Aware Intelligence Libraries (ARCHIVED 2026-02-08) ───
// entity-resolver.ts + chain-validator.ts moved to _archived-2026-02-08/
// 845 LOC of dead code — resolveEntity, canAgentWrite, validateChain never
// called from hooks or tools. Restore when entity-level governance is wired.

export {
    readGovernanceState, readTaskStore, readBrainStore, readCapturedAgent, formatGovernanceSummary,
} from "./state-reader.js"
export type { GovernanceSnapshot } from "./state-reader.js"

// ─── Storage Adapter (SQLite migration path) ────────────────────────
export type { StorageAdapter, SessionState } from "./storage-adapter.js"
export type { SqliteAdapter } from "./sqlite-adapter.js"
