/**
 * TUI-safe file-based logging with optional SDK backend.
 *
 * CRITICAL: NO console.log anywhere — breaks TUI rendering.
 * Uses writeFileSync to append logs to a file in the project directory.
 * When the SDK client is available, also logs to client.app.log()
 * for centralized server-side logging.
 *
 * P3: Graceful degradation — if logging fails, silently continue.
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs"
import { join } from "node:path"
import { tryGetClient } from "./sdk-client.js"

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
 * When the SDK client is available (set via sdk-client.ts during plugin init),
 * also logs to client.app.log() for centralized server-side logging.
 * Falls back to file-only logging when client is unavailable (e.g. in tests).
 *
 * Logs live inside .idumb/ (the governance directory) — NOT .opencode/.
 * This prevents zombie .opencode/ resurrection if user deletes .opencode/
 * but the plugin is still registered in opencode.json.
 *
 * P2: Platform native — uses .idumb/ directory
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

    // SDK client logging (optional, fire-and-forget)
    try {
      const client = tryGetClient()
      if (client) {
        client.app.log({
          body: {
            service: `idumb:${service}`,
            level,
            message: msg,
            extra: meta,
          },
        }).catch(() => {})
      }
    } catch {
      // P3: Never crash on SDK log failure
    }
  }

  return {
    debug: (msg, meta) => log("debug", msg, meta),
    info: (msg, meta) => log("info", msg, meta),
    warn: (msg, meta) => log("warn", msg, meta),
    error: (msg, meta) => log("error", msg, meta),
  }
}
