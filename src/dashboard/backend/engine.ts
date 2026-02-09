/**
 * OpenCode Engine — connect-or-start lifecycle manager + client singleton.
 *
 * Strategy:
 * 1. Try connecting to an EXISTING OpenCode server on the target port
 * 2. If no server found, start a new one
 *
 * This means `idumb-v2 dashboard` works whether the user already has
 * OpenCode running (e.g., from the CLI) or not.
 *
 * TUI-safe: logging goes through createLogger, never console.log.
 */

import { createOpencode, createOpencodeClient, type OpencodeClient } from "@opencode-ai/sdk"
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
let connectedToExisting = false

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

/**
 * Try connecting to an existing OpenCode server on the given port.
 * Returns the client if successful, null otherwise.
 */
async function tryConnectExisting(port: number, projectDir?: string): Promise<OpencodeClient | null> {
  try {
    const baseUrl = `http://127.0.0.1:${port}`
    const client = createOpencodeClient({ baseUrl })

    // Health check — verify it's actually an OpenCode server
    await client.config.get({
      query: projectDir ? { directory: projectDir } : undefined,
    })

    return client
  } catch {
    return null
  }
}

export async function startEngine(projectDir: string, port: number = 4096): Promise<{ url: string }> {
  log = createLogger(projectDir, "engine")

  if (engineClient) {
    const url = engineServer?.url ?? `http://127.0.0.1:${enginePort}`
    log.info("Engine already connected", { url, port: enginePort })
    return { url }
  }

  // Strategy 1: Connect to existing OpenCode server
  log.info("Checking for existing OpenCode server", { port })
  const existingClient = await tryConnectExisting(port, projectDir)

  if (existingClient) {
    const url = `http://127.0.0.1:${port}`
    engineClient = existingClient
    engineProjectDir = projectDir
    enginePort = port
    engineServer = null // no server handle — we didn't start it
    connectedToExisting = true

    log.info("Connected to existing OpenCode server", { url, port })
    return { url }
  }

  // Strategy 2: Start new OpenCode server
  try {
    log.info("No existing server found, starting new OpenCode engine", { projectDir, port })

    const { server, client } = await createOpencode({
      port,
      timeout: 30_000,
    })

    engineServer = server
    engineClient = client
    engineProjectDir = projectDir
    enginePort = parsePortFromUrl(server.url) ?? port
    connectedToExisting = false

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

  // Only close the server if WE started it (don't kill user's existing OpenCode)
  if (engineServer && !connectedToExisting) {
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
  connectedToExisting = false
  compactionCounts.clear()
  compactingState.clear()

  log.info("OpenCode engine stopped")
}

export function getEngineStatus(): EngineStatus {
  return {
    running: Boolean(engineClient),
    url: engineServer?.url ?? (enginePort ? `http://127.0.0.1:${enginePort}` : undefined),
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
