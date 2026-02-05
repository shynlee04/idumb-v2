/**
 * Logging Module
 * 
 * TUI-SAFE logging - NO console.log!
 * All output goes to file to prevent TUI background text pollution.
 */

import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "fs"
import { dirname, join } from "path"

/**
 * Log levels in order of severity
 */
export type LogLevel = "debug" | "info" | "warn" | "error"

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

/**
 * Logger configuration
 */
interface LoggerConfig {
  level: LogLevel
  file: string
  maxSize?: number // Max file size in bytes before rotation
}

/**
 * Default logger config
 */
const DEFAULT_CONFIG: LoggerConfig = {
  level: "info",
  file: ".idumb/logs/plugin.log",
  maxSize: 1024 * 1024, // 1MB
}

/**
 * Current logger configuration
 */
let currentConfig: LoggerConfig = { ...DEFAULT_CONFIG }

/**
 * Configure the logger
 */
export function configureLogger(config: Partial<LoggerConfig>): void {
  currentConfig = { ...currentConfig, ...config }
}

/**
 * Get log file path relative to directory
 */
export function getLogPath(directory: string): string {
  return join(directory, currentConfig.file)
}

/**
 * Ensure log directory exists
 */
function ensureLogDir(logPath: string): void {
  const dir = dirname(logPath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

/**
 * Format log entry
 */
function formatLogEntry(
  level: LogLevel,
  message: string,
  data?: Record<string, unknown>
): string {
  const timestamp = new Date().toISOString()
  const dataStr = data ? ` ${JSON.stringify(data)}` : ""
  return `[${timestamp}] [${level.toUpperCase().padEnd(5)}] ${message}${dataStr}\n`
}

/**
 * Check if level should be logged based on current config
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[currentConfig.level]
}

/**
 * Main log function - NEVER uses console.log
 * 
 * @param directory - Project directory for relative log path
 * @param level - Log level
 * @param message - Log message
 * @param data - Optional structured data
 */
export function log(
  directory: string,
  level: LogLevel,
  message: string,
  data?: Record<string, unknown>
): void {
  if (!shouldLog(level)) return

  try {
    const logPath = getLogPath(directory)
    ensureLogDir(logPath)
    
    const entry = formatLogEntry(level, message, data)
    appendFileSync(logPath, entry)
  } catch {
    // Silent fail - never pollute TUI
    // If logging fails, we have bigger problems
  }
}

/**
 * Convenience methods for different log levels
 */
export function debug(
  directory: string,
  message: string,
  data?: Record<string, unknown>
): void {
  log(directory, "debug", message, data)
}

export function info(
  directory: string,
  message: string,
  data?: Record<string, unknown>
): void {
  log(directory, "info", message, data)
}

export function warn(
  directory: string,
  message: string,
  data?: Record<string, unknown>
): void {
  log(directory, "warn", message, data)
}

export function error(
  directory: string,
  message: string,
  data?: Record<string, unknown>
): void {
  log(directory, "error", message, data)
}

/**
 * Log with explicit path (for cases where directory context is unavailable)
 */
export function logToPath(
  logPath: string,
  level: LogLevel,
  message: string,
  data?: Record<string, unknown>
): void {
  if (!shouldLog(level)) return

  try {
    ensureLogDir(logPath)
    const entry = formatLogEntry(level, message, data)
    appendFileSync(logPath, entry)
  } catch {
    // Silent fail
  }
}

/**
 * Create a scoped logger for a specific module
 */
export function createLogger(directory: string, module: string) {
  return {
    debug: (message: string, data?: Record<string, unknown>) =>
      debug(directory, `[${module}] ${message}`, data),
    info: (message: string, data?: Record<string, unknown>) =>
      info(directory, `[${module}] ${message}`, data),
    warn: (message: string, data?: Record<string, unknown>) =>
      warn(directory, `[${module}] ${message}`, data),
    error: (message: string, data?: Record<string, unknown>) =>
      error(directory, `[${module}] ${message}`, data),
  }
}

/**
 * Clear log file (useful for testing)
 */
export function clearLog(directory: string): void {
  try {
    const logPath = getLogPath(directory)
    if (existsSync(logPath)) {
      writeFileSync(logPath, "")
    }
  } catch {
    // Silent fail
  }
}
