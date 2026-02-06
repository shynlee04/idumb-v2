/**
 * Hooks Index
 * 
 * Re-exports all hook implementations
 */

// Tool Gate (T1)
export {
  getSessionTracker,
  setAgentRole,
  recordFirstTool,
  recordPermissionCheck,
  ToolGateError,
  checkToolPermission,
  createToolGateHook,
  createToolGateAfterHook,
  getPermissionHistory,
  clearSessionTracker,
  clearAllSessionTrackers,
} from "./tool-gate.js"

// Compaction (T3)
export { createCompactionHook } from "./compaction.js"

// Message Transform (T5/T6)
export { createMessageTransformHook } from "./message-transform.js"
