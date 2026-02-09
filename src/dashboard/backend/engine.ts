/**
 * OpenCode Engine — Server Lifecycle Manager
 *
 * Manages the OpenCode server process and provides a singleton SDK client
 * for all dashboard routes to use. Handles:
 * - Server start/stop lifecycle
 * - Client singleton access
 * - Compaction count tracking per session
 *
 * CRITICAL: No console.log — all logging via createLogger.
 */

import { createOpencodeServer } from "@opencode-ai/sdk/server"
import { createOpencodeClient, type OpencodeClient } from "@opencode-ai/sdk"
import { createLogger, type Logger } from "../../lib/logging.js"
import type { EngineStatus } from "../shared/engine-types.js"

// ─── Module-level singleton state ────────────────────────────────────────────

let opcodeServer: { url: string; close(): void } | null = null
let opcodeClient: OpencodeClient | null = null
let engineProjectDir: string | null = null
let log: Logger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
}

/** Compaction count tracker: sessionId -> number of compactions observed */
const compactionCounts = new Map<string, number>()

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Start the OpenCode server and create a client singleton.
 *
 * @param projectDir - Absolute path to the project directory
 * @returns The server URL
 * @throws If the server fails to start
 */
export async function startEngine(projectDir: string): Promise<{ url: string }> {
  log = createLogger(projectDir, "engine")

  if (opcodeServer) {
    log.info("Engine already running", { url: opcodeServer.url })
    return { url: opcodeServer.url }
  }

  log.info("Starting OpenCode server...", { projectDir })

  try {
    opcodeServer = await createOpencodeServer()
    log.info("OpenCode server started", { url: opcodeServer.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.error("Failed to start OpenCode server", { error: message, projectDir })
    throw new Error(`Engine start failed: ${message}`)
  }

  try {
    opcodeClient = createOpencodeClient({
      baseUrl: opcodeServer.url,
      directory: projectDir,
    })
    engineProjectDir = projectDir
    log.info("OpenCode client created", { baseUrl: opcodeServer.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.error("Failed to create OpenCode client", { error: message })
    // Clean up server if client creation fails
    opcodeServer.close()
    opcodeServer = null
    throw new Error(`Engine client creation failed: ${message}`)
  }

  return { url: opcodeServer.url }
}

/**
 * Get the OpenCode SDK client singleton.
 *
 * @throws If the engine has not been started
 */
export function getClient(): OpencodeClient {
  if (!opcodeClient) {
    throw new Error("Engine not started — call startEngine() first")
  }
  return opcodeClient
}

/**
 * Stop the OpenCode server and clear all references.
 */
export async function stopEngine(): Promise<void> {
  log.info("Stopping OpenCode engine...")

  if (opcodeServer) {
    try {
      opcodeServer.close()
    } catch (err) {
      log.warn("Error closing OpenCode server", { error: String(err) })
    }
    opcodeServer = null
  }

  opcodeClient = null
  engineProjectDir = null
  compactionCounts.clear()
  log.info("Engine stopped")
}

/**
 * Get current engine status.
 */
export function getEngineStatus(): EngineStatus {
  return {
    running: opcodeServer !== null,
    url: opcodeServer?.url,
    projectDir: engineProjectDir ?? undefined,
  }
}

/**
 * Get the project directory the engine was started with.
 */
export function getProjectDir(): string | null {
  return engineProjectDir
}

/**
 * Track a compaction event for a session.
 * Called when a `session.updated` event shows compaction completed.
 */
export function trackCompaction(sessionId: string): void {
  const current = compactionCounts.get(sessionId) ?? 0
  compactionCounts.set(sessionId, current + 1)
  log.info("Compaction tracked", { sessionId, count: current + 1 })
}

/**
 * Get the compaction count for a session.
 */
export function getCompactionCount(sessionId: string): number {
  return compactionCounts.get(sessionId) ?? 0
}
