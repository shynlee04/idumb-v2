/**
 * TUI-safe file-based logging.
 *
 * CRITICAL: NO console.log anywhere — breaks TUI rendering.
 * Uses writeFileSync to append logs to a file in the project directory.
 *
 * P3: Graceful degradation — if logging fails, silently continue.
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs"
import { join } from "node:path"

export type LogLevel = "debug" | "info" | "warn" | "error"

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

export interface Logger {
  debug(msg: string, meta?: Record<string, unknown>): void
  info(msg: string, meta?: Record<string, unknown>): void
  warn(msg: string, meta?: Record<string, unknown>): void
  error(msg: string, meta?: Record<string, unknown>): void
}

/**
 * Creates a file-based logger that writes to .idumb/logs/
 *
 * Logs live inside .idumb/ (the governance directory) — NOT .opencode/.
 * This prevents zombie .opencode/ resurrection if user deletes .opencode/
 * but the plugin is still registered in opencode.json.
 *
 * P3: Graceful degradation — all writes wrapped in try/catch
 */
export function createLogger(directory: string, service: string, minLevel: LogLevel = "info"): Logger {
  const logDir = join(directory, ".idumb", "logs")
  const logFile = join(logDir, `${service}.log`)
  const minLevelNum = LOG_LEVELS[minLevel]

  // Ensure log directory exists (once at creation)
  try {
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true })
    }
  } catch {
    // P3: If we can't create log dir, logging is a no-op
  }

  function log(level: LogLevel, msg: string, meta?: Record<string, unknown>): void {
    if (LOG_LEVELS[level] < minLevelNum) return
    // File-based logging (primary)
    try {
      const ts = new Date().toISOString()
      const metaStr = meta ? ` ${JSON.stringify(meta)}` : ""
      const line = `[${ts}] [${level.toUpperCase()}] [${service}] ${msg}${metaStr}\n`
      writeFileSync(logFile, line, { flag: "a" })
    } catch {
      // P3: Never crash on log failure
    }
  }

  return {
    debug: (msg, meta) => log("debug", msg, meta),
    info: (msg, meta) => log("info", msg, meta),
    warn: (msg, meta) => log("warn", msg, meta),
    error: (msg, meta) => log("error", msg, meta),
  }
}
