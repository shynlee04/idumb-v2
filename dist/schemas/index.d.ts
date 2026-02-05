/**
 * Schemas Index
 *
 * Re-exports all schema modules for convenient importing
 */
export { TimestampSchema, type Timestamp, AnchorPrioritySchema, type AnchorPriority, AnchorTypeSchema, type AnchorType, AnchorSchema, type Anchor, AnchorCollectionSchema, type AnchorCollection, calculateStaleness, enforceTimestamp, calculateAnchorScore, selectAnchors, createAnchor, } from "./anchor.js";
export { HistoryEntrySchema, type HistoryEntry, SessionInfoSchema, type SessionInfo, PhaseSchema, type Phase, StateSchema, type State, createDefaultState, addHistoryEntry, addAnchor, updateSession, getSessionDepth, incrementValidation, } from "./state.js";
export { PermissionLevelSchema, type PermissionLevel, AgentPermissionSchema, type AgentPermission, DEFAULT_PERMISSIONS, ValidationConfigSchema, type ValidationConfig, CompactionConfigSchema, type CompactionConfig, ConfigSchema, type Config, createDefaultConfig, getAgentPermission, isToolAllowed, mergeConfigs, } from "./config.js";
export { AgentRoleSchema, type AgentRole, ToolCategorySchema, type ToolCategory, PermissionDecisionSchema, type PermissionDecision, TOOL_CATEGORIES, ROLE_PERMISSIONS, detectAgentRole, getToolCategory, isToolAllowedForRole, buildDenialMessage, PermissionCheckRequestSchema, type PermissionCheckRequest, PermissionCheckResultSchema, type PermissionCheckResult, } from "./permission.js";
export { ProjectStageSchema, type ProjectStage, ProjectInfoSchema, type ProjectInfo, DetectedFrameworkSchema, type DetectedFramework, GapSeveritySchema, type GapSeverity, GapSchema, type Gap, DebtSignalSchema, type DebtSignal, ConcernSchema, type Concern, ConventionsSchema, type Conventions, DriftInfoSchema, type DriftInfo, DiagnosisSchema, type Diagnosis, ScanResultSchema, type ScanResult, createEmptyScanResult, } from "./scan.js";
//# sourceMappingURL=index.d.ts.map