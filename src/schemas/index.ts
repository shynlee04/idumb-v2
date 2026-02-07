export { createAnchor, scoreAnchor, selectAnchors, isStale, stalenessHours } from "./anchor.js"
export type { Anchor, AnchorType, AnchorPriority } from "./anchor.js"
export { createConfig, validateConfig, CONFIG_VERSION, DEFAULT_PATHS, DEFAULT_DETECTION } from "./config.js"
export type { IdumbConfig, Language, InstallScope, ExperienceLevel, GovernanceMode, GovernanceFramework, TechFramework, FrameworkDetection } from "./config.js"
export {
    createEpic, createTask, createSubtask, createEmptyStore, createBootstrapStore,
    findEpic, findTask, findSubtask, findParentTask, findParentEpic,
    getActiveChain, validateCompletion, findOrphanTasks, findStaleTasks,
    detectChainBreaks, formatTaskTree, buildGovernanceReminder,
    TASK_STORE_VERSION, SESSION_STALE_MS,
} from "./task.js"
export type {
    EpicStatus, TaskStatus, SubtaskStatus,
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

