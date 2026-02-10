export { createLogger } from "./logging.js"
export type { Logger, LogLevel } from "./logging.js"
// ─── Archived: sdk-client.ts (2026-02-10 — Phase 1A plugin demotion) ──
// setClient, tryGetClient, SdkClient moved to _archived-plugin/lib/sdk-client.ts
export { scanProject, formatDetectionReport } from "./framework-detector.js"
export { scaffoldProject, formatScaffoldReport } from "./scaffolder.js"
export type { ScaffoldResult } from "./scaffolder.js"
export { StateManager, stateManager } from "./persistence.js"

// ─── Archived: entity-resolver.ts + chain-validator.ts (2026-02-08) ──
// 845 LOC moved to _archived-2026-02-08/ — excluded from build via tsconfig.
// Restore when entity-level governance is wired.

export {
    readGovernanceState, readTaskStore, readBrainStore, readCapturedAgent, formatGovernanceSummary,
} from "./state-reader.js"
export type { GovernanceSnapshot } from "./state-reader.js"

// ─── Code Quality Scanner ────────────────────────────────────────────
export { scanCodeQuality, formatCodeQualityReport } from "./code-quality.js"

// ─── Storage Adapter (SQLite migration path) ────────────────────────
export type { StorageAdapter, SessionState } from "./storage-adapter.js"
export type { SqliteAdapter } from "./sqlite-adapter.js"
