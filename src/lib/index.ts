export { createLogger } from "./logging.js"
export type { Logger, LogLevel } from "./logging.js"
export { scanProject, formatDetectionReport } from "./framework-detector.js"
export { scaffoldProject, formatScaffoldReport } from "./scaffolder.js"
export type { ScaffoldResult } from "./scaffolder.js"
export { StateManager, stateManager } from "./persistence.js"

// ─── n4 Entity-Aware Intelligence Libraries ─────────────────────────
export {
    resolveEntity, isInProjectScope, canAgentWrite, formatEntityAnnotation,
} from "./entity-resolver.js"
export type { EntityType, EntityHierarchy, EntityProperties, EntityGovernance, ResolvedEntity } from "./entity-resolver.js"

export {
    validateChain, formatChainValidation,
} from "./chain-validator.js"
export type { ChainBreak, ChainWarning, StaleEntity, ChainValidationResult } from "./chain-validator.js"

export {
    readGovernanceState, readTaskStore, readBrainStore, readCapturedAgent, formatGovernanceSummary,
} from "./state-reader.js"
export type { GovernanceSnapshot } from "./state-reader.js"

// ─── Storage Adapter (SQLite migration path) ────────────────────────
export type { StorageAdapter, SessionState } from "./storage-adapter.js"
export type { SqliteAdapter } from "./sqlite-adapter.js"
