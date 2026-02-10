/**
 * SDK Client Singleton — server-only OpenCode client lifecycle.
 *
 * Extracted from src/dashboard/backend/engine.ts for TanStack Start.
 * The `.server.ts` suffix ensures tree-shaking excludes this from client bundles.
 *
 * Exports:
 * - startEngine(projectDir, port)   — connect or start OpenCode
 * - getClient()                     — get SDK client (throws if not started)
 * - getProjectDir()                 — get configured project directory
 * - getEngineStatus()               — current engine status snapshot
 * - stopEngine()                    — stop engine (only if we started it)
 * - ensureEngine(projectDir, port)  — idempotent start + health check
 * - ensureHealthy()                 — health check with retries
 */

import { createOpencode, createOpencodeClient, type OpencodeClient } from "@opencode-ai/sdk"
import { createLogger, type Logger } from "../../src/lib/logging"
import type { EngineStatus } from "../../src/dashboard/shared/engine-types"

// ─── Module State ─────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────

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

/** SDK results have { data, error, response } shape — unwrap or throw. */
export function unwrapSdkResult<T>(result: {
  data?: T
  error?: unknown
  response?: { status?: number }
}): T {
  if (result.error) {
    const err = new Error(extractSdkErrorMessage(result.error)) as Error & { status?: number }
    err.status = result.response?.status ?? 500
    throw err
  }
  if (result.data === undefined) {
    const err = new Error("Empty SDK response") as Error & { status?: number }
    err.status = result.response?.status ?? 500
    throw err
  }
  return result.data
}

function extractSdkErrorMessage(error: unknown): string {
  if (typeof error === "string") return error
  if (!isRecord(error)) return "Unknown SDK error"
  if (typeof error.message === "string" && error.message.length > 0) return error.message
  if (isRecord(error.error) && typeof error.error.message === "string") return error.error.message
  return JSON.stringify(error)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

/** Build the SDK query parameter with projectDir. */
export function sdkQuery(projectDir?: string) {
  const dir = projectDir ?? engineProjectDir ?? undefined
  return dir ? { directory: dir } : undefined
}

// ─── Connection ───────────────────────────────────────────────────────────

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

// ─── Public API ───────────────────────────────────────────────────────────

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
    engineServer = null
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
    throw new Error("Engine not started — call startEngine() or ensureEngine() first")
  }
  return engineClient
}

export function getProjectDir(): string {
  return engineProjectDir ?? process.cwd()
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

/**
 * Idempotent engine start — starts if not running, then health-checks.
 * Used by `__root.tsx` beforeLoad for engine auto-start.
 */
export async function ensureEngine(
  projectDir?: string,
  port?: number,
): Promise<EngineStatus> {
  const dir = projectDir ?? process.cwd()
  const p = port ?? Number(process.env.OPENCODE_PORT || 4096)

  if (!engineClient) {
    await startEngine(dir, p)
  }

  await ensureHealthy()
  return getEngineStatus()
}
