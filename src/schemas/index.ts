export { createAnchor, scoreAnchor, selectAnchors, isStale, stalenessHours } from "./anchor.js"
export type { Anchor, AnchorType, AnchorPriority } from "./anchor.js"
export { createConfig, validateConfig, CONFIG_VERSION, DEFAULT_PATHS, DEFAULT_DETECTION } from "./config.js"
export type { IdumbConfig, Language, InstallScope, ExperienceLevel, GovernanceMode, DashboardMode, GovernanceFramework, TechFramework, FrameworkDetection } from "./config.js"
export {
    createEpic, createTask, createSubtask, createEmptyStore, createBootstrapStore,
    findEpic, findTask, findSubtask, findParentTask, findParentEpic,
    getActiveChain, validateCompletion, findOrphanTasks, findStaleTasks,
    detectChainBreaks, formatTaskTree, buildGovernanceReminder,
    migrateTaskStore,
    TASK_STORE_VERSION, SESSION_STALE_MS,
    CATEGORY_DEFAULTS, CATEGORY_SKIP_SUBTASKS,
} from "./task.js"
export type {
    EpicStatus, TaskStatus, SubtaskStatus,
    WorkStreamCategory, GovernanceLevel, CreateEpicOptions,
    Subtask, Task, TaskEpic, TaskStore,
    ActiveChain, ValidationResult, ChainWarning,
} from "./task.js"

// ─── Phase 1b Entity Schemas ─────────────────────────────────────────
export {
    createBrainEntry, createBrainStore, effectiveConfidence,
    isBrainEntryStale, queryBrain, formatBrainEntries,
    BRAIN_STORE_VERSION,
} from "./brain.js"
export type {
    BrainEntry, BrainEntryType, BrainSource, BrainStore,
} from "./brain.js"

export {
    createProjectMap, formatProjectMap,
    PROJECT_MAP_VERSION,
} from "./project-map.js"
export type {
    ProjectMap, FrameworkCategory, DocumentType,
    DocumentEntry, DirectoryEntry,
    FrameworkDetection as ProjectFrameworkDetection,
} from "./project-map.js"

export {
    createCodeMapStore, formatCodeMapSummary, formatTodoList,
    CODEMAP_VERSION,
} from "./codemap.js"
export type {
    CodeMapStore, FileMapEntry, CodeItem, CodeItemType,
    CodeComment, CommentMarker, Inconsistency, InconsistencyType,
} from "./codemap.js"

// ─── Phase δ2 Delegation Schema ─────────────────────────────────────
export {
    createDelegation, createEmptyDelegationStore,
    findDelegation, findDelegationsForTask, findDelegationsFromAgent,
    findDelegationsToAgent, findActiveDelegations,
    validateDelegation, getDelegationDepth,
    acceptDelegation, completeDelegation, rejectDelegation, expireStaleDelegations,
    formatDelegationRecord, formatDelegationStore, buildDelegationInstruction,
    DELEGATION_STORE_VERSION, MAX_DELEGATION_DEPTH, DELEGATION_EXPIRY_MS,
} from "./delegation.js"
export type {
    DelegationStatus, DelegationResult, DelegationRecord,
    DelegationStore, DelegationValidation, CreateDelegationOptions,
} from "./delegation.js"

// ─── Task Graph (v3 — replaces Epic→Task→Subtask) ───────────────────
export {
    createWorkPlan, createTaskNode, createCheckpoint,
    createEmptyTaskGraph, createBootstrapTaskGraph,
    shouldCreateCheckpoint, isBashCheckpointWorthy,
    TASK_GRAPH_VERSION, CHECKPOINT_TOOLS, CHECKPOINT_BASH_PATTERNS, SESSION_STALE_MS as GRAPH_SESSION_STALE_MS,
} from "./work-plan.js"
export type {
    WorkPlanStatus, TaskNodeStatus,
    TemporalGate, Checkpoint, TaskResult, TaskNode, WorkPlan, TaskGraph,
    CreateWorkPlanOptions, CreateTaskNodeOptions,
} from "./work-plan.js"

export {
    findWorkPlan, findTaskNode, findTaskNodeInPlan, findParentPlan, findCheckpoint,
    getActiveWorkChain,
    checkTemporalGate, checkDependencies, validateTaskStart,
    validateTaskCompletion,
    detectGraphBreaks,
    purgeAbandonedPlans, archiveChainBreakers,
    formatTaskGraph, formatWorkPlanDetail, buildGraphReminder,
    migrateV2ToV3,
} from "./task-graph.js"
export type {
    ActiveWorkChain, GateCheckResult, CompletionCheckResult, GraphWarning,
} from "./task-graph.js"

// ─── Planning Registry Schema ────────────────────────────────────────
export {
    createPlanningRegistry, createPlanningArtifact, createArtifactSection,
    createArtifactChain, createOutlierEntry,
    computeContentHash, parseMarkdownSections, parseSectionsFromMarkdown,
    resolveChainHead, getChainHistory, addToChain,
    isArtifactStaleByChainPosition, findStaleArtifacts, findStaleSections, isArtifactHealthy,
    supersedSection, markSectionStale, markSectionInvalid, detectSectionDrift,
    linkTaskToArtifact, linkDelegationToSections, linkBrainEntryToArtifact,
    findPendingOutliers, acceptOutlier, rejectOutlier,
    findArtifactByPath, findArtifactById, findArtifactsByType, findArtifactsByChain,
    extractIterationPattern, detectArtifactType,
    formatRegistrySummary, formatArtifactDetail,
    PLANNING_REGISTRY_VERSION,
} from "./planning-registry.js"
export type {
    DocumentTier, ArtifactType, SectionStatus, ArtifactStatus,
    ArtifactSection, PlanningArtifact, ArtifactChain,
    OutlierReason, OutlierAction, OutlierEntry,
    PlanningRegistry,
} from "./planning-registry.js"

// ─── Plan State Schema (self-enforcement) ────────────────────────────
export {
    createPlanPhase, createPlanState, createDefaultPlanState,
    getCurrentPhase, getNextPhase, formatPlanStateCompact,
    PLAN_STATE_VERSION,
} from "./plan-state.js"
export type {
    PlanPhaseStatus, PlanPhase, PlanState,
} from "./plan-state.js"

