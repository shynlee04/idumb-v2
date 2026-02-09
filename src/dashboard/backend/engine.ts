/**
 * OpenCode Engine — server lifecycle manager + client singleton.
 *
 * Responsibilities:
 * - start/stop OpenCode server with configurable port
 * - expose shared client for backend routes
 * - track compaction counts per session from event stream data
 * - provide lightweight health check with retry
 *
 * TUI-safe: logging goes through createLogger, never console.log.
 */

import { createOpencode, type OpencodeClient } from "@opencode-ai/sdk"
import { createLogger, type Logger } from "../../lib/logging.js"
import type { EngineStatus } from "../shared/engine-types.js"

interface EngineHandle {
  url: string
  close(): void
}

let engineServer: EngineHandle | null = null
let engineClient: OpencodeClient | null = null
let engineProjectDir: string | null = null
let enginePort: number | null = null

let log: Logger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
}

const compactionCounts = new Map<string, number>()
const compactingState = new Map<string, boolean>()

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parsePortFromUrl(url?: string): number | null {
  if (!url) return null
  try {
    return new URL(url).port ? Number(new URL(url).port) : null
  } catch {
    return null
  }
}

export async function startEngine(projectDir: string, port: number = 4096): Promise<{ url: string }> {
  log = createLogger(projectDir, "engine")

  if (engineServer && engineClient) {
    log.info("Engine already running", {
      url: engineServer.url,
      port: enginePort,
    })
    return { url: engineServer.url }
  }

  try {
    log.info("Starting OpenCode engine", { projectDir, port })

    const { server, client } = await createOpencode({
      port,
      timeout: 30_000,
    })

    engineServer = server
    engineClient = client
    engineProjectDir = projectDir
    enginePort = parsePortFromUrl(server.url) ?? port

    log.info("OpenCode engine started", {
      url: server.url,
      port: enginePort,
    })

    return { url: server.url }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.error("Failed to start OpenCode engine", {
      projectDir,
      port,
      error: message,
    })
    throw new Error(`Engine start failed on port ${port}: ${message}`)
  }
}

export function getClient(): OpencodeClient {
  if (!engineClient) {
    throw new Error("Engine not started — call startEngine() first")
  }
  return engineClient
}

export async function stopEngine(): Promise<void> {
  if (!engineServer && !engineClient) return

  log.info("Stopping OpenCode engine")

  if (engineServer) {
    try {
      engineServer.close()
    } catch (err) {
      log.warn("Error closing OpenCode server", { error: String(err) })
    }
  }

  engineServer = null
  engineClient = null
  engineProjectDir = null
  enginePort = null
  compactionCounts.clear()
  compactingState.clear()

  log.info("OpenCode engine stopped")
}

export function getEngineStatus(): EngineStatus {
  return {
    running: Boolean(engineServer && engineClient),
    url: engineServer?.url,
    projectDir: engineProjectDir ?? undefined,
    port: enginePort ?? undefined,
  }
}

export function getActualPort(): number | null {
  return enginePort
}

export function getProjectDir(): string | null {
  return engineProjectDir
}

/**
 * Observe an SDK event and bump compaction count when session compaction
 * transitions from active -> inactive.
 */
export function observeCompactionEvent(event: unknown): void {
  const e = event as Record<string, unknown>

  const sessionId =
    (e.sessionID as string | undefined)
    ?? ((e.properties as Record<string, unknown> | undefined)?.sessionID as string | undefined)
    ?? (((e.properties as Record<string, unknown> | undefined)?.message as Record<string, unknown> | undefined)?.sessionID as string | undefined)

  if (!sessionId) return

  const time = (e as { time?: { compacting?: unknown } }).time
  const compacting = Boolean(time && time.compacting != null)
  const wasCompacting = compactingState.get(sessionId) ?? false

  if (wasCompacting && !compacting) {
    const next = (compactionCounts.get(sessionId) ?? 0) + 1
    compactionCounts.set(sessionId, next)
    log.debug("Compaction completed", { sessionId, count: next })
  }

  compactingState.set(sessionId, compacting)
}

export function getCompactionCount(sessionId: string): number {
  return compactionCounts.get(sessionId) ?? 0
}

export async function ensureHealthy(): Promise<boolean> {
  const client = getClient()
  const projectDir = engineProjectDir ?? undefined

  const delays = [150, 300, 600]

  for (let index = 0; index < delays.length; index += 1) {
    try {
      await client.config.get({
        query: projectDir ? { directory: projectDir } : undefined,
      })
      return true
    } catch (err) {
      const attempt = index + 1
      log.warn("Engine health check attempt failed", {
        attempt,
        total: delays.length,
        error: String(err),
      })
      if (attempt < delays.length) {
        await sleep(delays[index])
      }
    }
  }

  throw new Error("Engine unhealthy after 3 retries")
}
