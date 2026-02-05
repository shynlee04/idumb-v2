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
