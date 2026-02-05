/**
 * Lib Index
 * 
 * Re-exports all library modules
 */

// Logging
export {
  type LogLevel,
  configureLogger,
  getLogPath,
  log,
  debug,
  info,
  warn,
  error,
  logToPath,
  createLogger,
  clearLog,
} from "./logging.js"

// Persistence
export {
  PATHS,
  ensureDir,
  getPath,
  initializeIdumbDir,
  readJson,
  writeJson,
  readState,
  writeState,
  stateExists,
  readConfig,
  writeConfig,
  saveAnchor,
  loadAnchor,
  loadAllAnchors,
  deleteAnchor,
  saveSession,
  loadSession,
  listSessions,
  cleanupOldSessions,
} from "./persistence.js"
