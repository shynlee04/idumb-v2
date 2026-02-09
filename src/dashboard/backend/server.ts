/**
 * Dashboard Backend Server
 *
 * Express + WebSocket server that:
 * - Serves API routes for governance state (tasks, brain, delegations, etc.)
 * - Broadcasts JSON file changes via WebSocket
 * - Provides file watching for .idumb/brain/*.json
 * - Proxies OpenCode SSE events for streaming chat
 *
 * API Endpoints:
 * - GET /api/tasks          — TaskStore snapshot
 * - GET /api/brain          — BrainStore snapshot
 * - GET /api/delegations    — DelegationStore snapshot
 * - GET /api/scan           — Project scan results
 * - GET /api/codemap        — CodeMapStore snapshot
 * - GET /api/artifacts      — List planning artifacts
 * - GET /api/artifacts/:id  — Get artifact content
 * - GET /api/artifacts/metadata — Real file metadata for an artifact
 * - POST /api/sessions/:id/prompt — SSE stream for chat responses
 * - WS  /ws                — WebSocket for live updates
 */

import { createServer as createHttpServer } from "http"
import { join, resolve, relative, extname } from "path"
import express, { type Request, type Response } from "express"
import cors from "cors"
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, readdirSync } from "fs"
import { randomUUID } from "crypto"
import { SqliteAdapter } from "../../lib/sqlite-adapter.js"
import { createLogger, type Logger } from "../../lib/logging.js"
import {
  getClient,
  startEngine,
  stopEngine as stopRuntimeEngine,
  getEngineStatus as getRuntimeEngineStatus,
  ensureHealthy,
  observeCompactionEvent,
} from "./engine.js"
import type { DashboardConfig } from "../shared/engine-types.js"
import type { TaskGraph, TaskNode, WorkPlan } from "../../schemas/work-plan.js"

// ─── Security ─────────────────────────────────────────────────────────────

/**
 * Sanitize a user-supplied path to prevent directory traversal.
 * Resolves against projectDir and verifies the result stays within bounds.
 * Returns null if the path escapes the project directory.
 */
function sanitizePath(projectDir: string, userPath: string): string | null {
  const resolved = resolve(projectDir, userPath)
  const rel = relative(projectDir, resolved)
  // Escapes projectDir if relative path starts with ".." or is absolute
  if (rel.startsWith("..") || resolve(rel) === rel) {
    return null
  }
  return resolved
}

// ─── Module-level state (configured by startServer) ──────────────────────
let adapter: SqliteAdapter | null = null
let configuredProjectDir: string | null = null
let log: Logger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
}

// ─── Express App ─────────────────────────────────────────────────────────

const app = express()

app.use(cors())
app.use(express.json())

// Health check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: Date.now() })
})

// ─── State Reader Integration ─────────────────────────────────────────────

import { readGovernanceState } from "../../lib/state-reader.js"

/**
 * Get governance state snapshot from disk
 */
function getGovernanceState(projectDir: string) {
  return readGovernanceState(projectDir)
}

/**
 * Get planning artifacts list
 */
function getPlanningArtifacts(projectDir: string) {
  const planningDir = join(projectDir, ".planning")
  const artifacts: Array<{
    path: string
    name: string
    modifiedAt: number
    status?: string
  }> = []

  // Check known files in planning root
  const knownFiles = [
    "PROJECT.md",
    "GOVERNANCE.md",
    "PHASE-COMPLETION.md",
    "SUCCESS-CRITERIA.md",
  ]

  for (const file of knownFiles) {
    const filePath = join(planningDir, file)
    if (existsSync(filePath)) {
      const stats = statSync(filePath)
      artifacts.push({
        path: filePath,
        name: file,
        modifiedAt: stats.mtimeMs,
        status: "active",
      })
    }
  }

  // Check for implementation plans
  const implPlanDir = join(planningDir, "implamentation-plan-turn-based")
  if (existsSync(implPlanDir)) {
    const files = readdirSync(implPlanDir).filter((f: string) => f.endsWith(".md"))

    // Find the highest n-suffix to mark as active
    let highestN = 0
    for (const file of files) {
      const match = file.match(/n(\d+)/)
      if (match) {
        const n = parseInt(match[1], 10)
        if (n > highestN) highestN = n
      }
    }

    for (const file of files) {
      const filePath = join(implPlanDir, file)
      const stats = statSync(filePath)
      artifacts.push({
        path: filePath,
        name: `impl-plan/${file}`,
        modifiedAt: stats.mtimeMs,
        status: file.includes(`n${highestN}`) ? "active" : "superseded",
      })
    }
  }

  return artifacts
}

function resolveProjectDir(req?: Request): string {
  return req?.header("X-Project-Dir") || configuredProjectDir || process.cwd()
}

function sdkQuery(projectDir: string) {
  return { directory: projectDir }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function extractSdkErrorMessage(error: unknown): string {
  if (typeof error === "string") return error
  if (!isRecord(error)) return "Unknown SDK error"
  if (typeof error.message === "string" && error.message.length > 0) return error.message
  if (isRecord(error.error) && typeof error.error.message === "string") return error.error.message
  return JSON.stringify(error)
}

function unwrapSdkResult<T>(result: {
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

interface TaskSnapshot {
  workPlan: WorkPlan | null
  tasks: TaskNode[]
  activeTask: TaskNode | null
}

function getTaskSnapshot(projectDir: string): TaskSnapshot {
  const state = getGovernanceState(projectDir)
  const graph = state.taskGraph as TaskGraph | null

  if (!graph || !Array.isArray(graph.workPlans)) {
    return {
      workPlan: null,
      tasks: [],
      activeTask: null,
    }
  }

  const activeWorkPlan = graph.activeWorkPlanId
    ? graph.workPlans.find((candidate) => candidate.id === graph.activeWorkPlanId) ?? null
    : graph.workPlans[0] ?? null

  const tasks = activeWorkPlan
    ? [...activeWorkPlan.tasks, ...activeWorkPlan.planAhead]
    : graph.workPlans.flatMap((candidate) => [...candidate.tasks, ...candidate.planAhead])

  const activeTask = tasks.find((task) => task.status === "active") ?? null

  return {
    workPlan: activeWorkPlan,
    tasks,
    activeTask,
  }
}

function findTaskById(tasks: TaskNode[], taskId: string): TaskNode | null {
  return tasks.find((task) => task.id === taskId) ?? null
}

function extractSessionIdFromEvent(event: unknown): string | null {
  const e = event as Record<string, unknown>
  const properties = (e.properties as Record<string, unknown> | undefined) ?? {}
  const message = (properties.message as Record<string, unknown> | undefined) ?? {}
  const part = (properties.part as Record<string, unknown> | undefined) ?? {}
  const info = (properties.info as Record<string, unknown> | undefined) ?? {}

  return (
    (e.sessionID as string | undefined)
    ?? (properties.sessionID as string | undefined)
    ?? (part.sessionID as string | undefined)
    ?? (info.id as string | undefined)
    ?? (message.sessionID as string | undefined)
    ?? null
  )
}

function extractSessionStatusFromEvent(event: unknown): string | null {
  const e = event as Record<string, unknown>
  const type = e.type
  if (type === "session.idle") return "idle"
  if (type === "session.error") return "error"

  const properties = (e.properties as Record<string, unknown> | undefined) ?? {}
  const status = properties.status

  if (typeof status === "string") return status
  if (status && typeof status === "object" && typeof (status as { type?: unknown }).type === "string") {
    return (status as { type: string }).type
  }
  return null
}

function eventBelongsToSession(event: unknown, sessionId: string): boolean {
  return extractSessionIdFromEvent(event) === sessionId
}

function initSseResponse(res: Response): void {
  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Connection", "keep-alive")
  res.flushHeaders()
}

function writeSse(res: Response, payload: unknown): void {
  res.write(`data: ${JSON.stringify(payload)}\n\n`)
}

const sseConnections = new Map<string, { res: Response; sessionHint?: string }>()
let eventsAbortController: AbortController | null = null
let eventsStreamPromise: Promise<void> | null = null
let eventsStreamProjectDir: string | null = null
let eventsShutdownTimer: ReturnType<typeof setTimeout> | null = null

async function startEventsRelay(projectDir: string): Promise<void> {
  if (eventsStreamPromise && eventsStreamProjectDir === projectDir) {
    return
  }

  if (eventsAbortController) {
    eventsAbortController.abort()
    eventsAbortController = null
  }

  const controller = new AbortController()
  eventsAbortController = controller
  eventsStreamProjectDir = projectDir

  eventsStreamPromise = (async () => {
    try {
      const streamResult = await getClient().event.subscribe({
        query: sdkQuery(projectDir),
        signal: controller.signal,
      })

      for await (const event of streamResult.stream) {
        observeCompactionEvent(event)
        for (const { res, sessionHint } of sseConnections.values()) {
          if (sessionHint && !eventBelongsToSession(event, sessionHint)) {
            continue
          }
          writeSse(res, { type: "event", event })
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        log.warn("Global events relay stopped with error", { error: String(err) })
      }
    } finally {
      eventsAbortController = null
      eventsStreamPromise = null
      eventsStreamProjectDir = null
    }
  })()

  await Promise.resolve()
}

function scheduleEventsRelayShutdown(): void {
  if (eventsShutdownTimer) clearTimeout(eventsShutdownTimer)
  eventsShutdownTimer = setTimeout(() => {
    if (sseConnections.size === 0 && eventsAbortController) {
      eventsAbortController.abort()
    }
  }, 1500)
}

// ─── API Routes ───────────────────────────────────────────────────────────

// GET /api/tasks — WorkPlan/task snapshot for dashboard task surface
app.get("/api/tasks", (req: Request, res: Response) => {
  const projectDir = resolveProjectDir(req)

  if (!existsSync(join(projectDir, ".idumb"))) {
    res.json({ workPlan: null, tasks: [], activeTask: null })
    return
  }

  const snapshot = getTaskSnapshot(projectDir)
  res.json(snapshot)
})

// GET /api/tasks/history — completed/failed task history
app.get("/api/tasks/history", (req: Request, res: Response) => {
  const projectDir = resolveProjectDir(req)
  const snapshot = getTaskSnapshot(projectDir)
  const history = snapshot.tasks.filter((task) => task.status === "completed" || task.status === "failed")
  res.json({ tasks: history })
})

// GET /api/tasks/:id — single task detail
app.get("/api/tasks/:id", (req: Request, res: Response) => {
  const projectDir = resolveProjectDir(req)
  const snapshot = getTaskSnapshot(projectDir)
  const task = findTaskById(snapshot.tasks, req.params.id)
  if (!task) {
    res.status(404).json({ error: "Task not found" })
    return
  }
  res.json({ task })
})

// GET /api/governance — governance status snapshot
app.get("/api/governance", (req: Request, res: Response) => {
  const projectDir = resolveProjectDir(req)
  const snapshot = getTaskSnapshot(projectDir)
  const state = getGovernanceState(projectDir)

  const completed = snapshot.tasks.filter((task) => task.status === "completed").length
  const failed = snapshot.tasks.filter((task) => task.status === "failed").length
  const total = snapshot.tasks.length

  const governanceMode =
    typeof state.config?.governance === "object"
      ? String((state.config.governance as { mode?: string }).mode ?? "standard")
      : "standard"

  res.json({
    activeTask: snapshot.activeTask,
    workPlan: snapshot.workPlan,
    progress: {
      total,
      completed,
      failed,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    },
    governanceMode,
    writesBlocked: snapshot.activeTask == null,
    capturedAgent: state.capturedAgent,
  })
})

// GET /api/graph — TaskGraph snapshot (v3 WorkPlan→TaskNode)
app.get("/api/graph", (req: Request, res: Response) => {
  const projectDir = req.header("X-Project-Dir") || process.cwd()
  const state = getGovernanceState(projectDir)
  res.json({
    graph: state.taskGraph,
  })
})

// GET /api/brain — BrainStore snapshot
app.get("/api/brain", (req: Request, res: Response) => {
  const projectDir = req.header("X-Project-Dir") || process.cwd()
  const state = getGovernanceState(projectDir)

  res.json({
    brain: state.brainStore,
    query: req.query.q as string | undefined,
  })
})

// GET /api/delegations — DelegationStore snapshot
app.get("/api/delegations", (req: Request, res: Response) => {
  const projectDir = req.header("X-Project-Dir") || process.cwd()

  // Use SQLite adapter when available and project dir matches
  if (adapter && configuredProjectDir === projectDir) {
    try {
      res.json({
        delegations: adapter.getDelegationStore(),
      })
      return
    } catch (err) {
      log.warn("SQLite read failed for /api/delegations, falling back to JSON", { error: String(err) })
      // Fall through to JSON path
    }
  }

  // Fallback to JSON file reads
  const state = getGovernanceState(projectDir)
  res.json({
    delegations: state.delegationStore,
  })
})

// GET /api/scan — Project scan results
app.get("/api/scan", (req: Request, res: Response) => {
  const projectDir = req.header("X-Project-Dir") || process.cwd()
  const state = getGovernanceState(projectDir)

  res.json({
    projectMap: state.projectMap,
  })
})

// GET /api/codemap — CodeMapStore snapshot
app.get("/api/codemap", (req: Request, res: Response) => {
  const projectDir = resolveProjectDir(req)
  const state = getGovernanceState(projectDir)

  res.json({
    codemap: state.codeMapStore,
  })
})

// ─── Engine lifecycle routes ─────────────────────────────────────────────

app.get("/api/engine/status", (_req: Request, res: Response) => {
  res.json(getRuntimeEngineStatus())
})

app.post("/api/engine/start", async (req: Request, res: Response) => {
  const projectDir = req.body?.projectDir || resolveProjectDir(req)
  const port = Number(
    req.body?.port
    ?? process.env.OPENCOD_PORT
    ?? process.env.OPENCODE_PORT
    ?? getRuntimeEngineStatus().port
    ?? 4096,
  )

  try {
    await startEngine(projectDir, port)
    await ensureHealthy()
    res.json(getRuntimeEngineStatus())
  } catch (err) {
    res.status(500).json({ error: `Failed to start engine: ${String(err)}` })
  }
})

app.post("/api/engine/stop", async (_req: Request, res: Response) => {
  try {
    await stopRuntimeEngine()
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: `Failed to stop engine: ${String(err)}` })
  }
})

app.post("/api/engine/restart", async (req: Request, res: Response) => {
  const projectDir = req.body?.projectDir || resolveProjectDir(req)
  const port = Number(
    req.body?.port
    ?? process.env.OPENCOD_PORT
    ?? process.env.OPENCODE_PORT
    ?? getRuntimeEngineStatus().port
    ?? 4096,
  )

  try {
    await stopRuntimeEngine()
    await startEngine(projectDir, port)
    await ensureHealthy()
    res.json(getRuntimeEngineStatus())
  } catch (err) {
    res.status(500).json({ error: `Failed to restart engine: ${String(err)}` })
  }
})

// ─── Session proxy routes ────────────────────────────────────────────────

app.get("/api/sessions", async (req: Request, res: Response) => {
  const projectDir = resolveProjectDir(req)
  try {
    const result = await getClient().session.list({ query: sdkQuery(projectDir) })
    const sessions = unwrapSdkResult(result)
    res.json(sessions)
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500
    res.status(status).json({ error: `Failed to list sessions: ${String(err)}` })
  }
})

app.post("/api/sessions", async (req: Request, res: Response) => {
  const projectDir = resolveProjectDir(req)
  const title = typeof req.body?.title === "string" ? req.body.title : undefined

  try {
    const result = await getClient().session.create({
      query: sdkQuery(projectDir),
      body: title ? { title } : {},
    })
    const session = unwrapSdkResult(result)
    res.status(201).json(session)
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500
    res.status(status).json({ error: `Failed to create session: ${String(err)}` })
  }
})

app.get("/api/sessions/:id", async (req: Request, res: Response) => {
  const projectDir = resolveProjectDir(req)
  try {
    const result = await getClient().session.get({
      query: sdkQuery(projectDir),
      path: { id: req.params.id },
    })
    const session = unwrapSdkResult(result)
    res.json(session)
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500
    res.status(status === 404 ? 404 : 500).json({ error: `Failed to get session: ${String(err)}` })
  }
})

app.delete("/api/sessions/:id", async (req: Request, res: Response) => {
  const projectDir = resolveProjectDir(req)
  try {
    const result = await getClient().session.delete({
      query: sdkQuery(projectDir),
      path: { id: req.params.id },
    })
    unwrapSdkResult(result)
    res.json({ success: true })
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500
    res.status(status === 404 ? 404 : 500).json({ error: `Failed to delete session: ${String(err)}` })
  }
})

app.get("/api/sessions/:id/messages", async (req: Request, res: Response) => {
  const projectDir = resolveProjectDir(req)
  try {
    const result = await getClient().session.messages({
      query: sdkQuery(projectDir),
      path: { id: req.params.id },
    })
    const messages = unwrapSdkResult(result)
    res.json(messages)
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500
    res.status(status === 404 ? 404 : 500).json({ error: `Failed to get messages: ${String(err)}` })
  }
})

app.get("/api/sessions/:id/children", async (req: Request, res: Response) => {
  const projectDir = resolveProjectDir(req)
  try {
    const result = await getClient().session.children({
      query: sdkQuery(projectDir),
      path: { id: req.params.id },
    })
    const children = unwrapSdkResult(result)
    res.json(children)
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500
    res.status(status === 404 ? 404 : 500).json({ error: `Failed to get child sessions: ${String(err)}` })
  }
})

app.post("/api/sessions/:id/abort", async (req: Request, res: Response) => {
  const projectDir = resolveProjectDir(req)
  try {
    const result = await getClient().session.abort({
      query: sdkQuery(projectDir),
      path: { id: req.params.id },
    })
    unwrapSdkResult(result)
    res.json({ success: true })
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500
    res.status(status === 404 ? 404 : 500).json({ error: `Failed to abort session: ${String(err)}` })
  }
})

app.get("/api/sessions/:id/status", async (req: Request, res: Response) => {
  const projectDir = resolveProjectDir(req)
  try {
    const result = await getClient().session.status({
      query: sdkQuery(projectDir),
    })
    const statusMap = unwrapSdkResult(result) as Record<string, unknown>

    const status = statusMap[req.params.id]
    if (!status) {
      res.status(404).json({ error: "Session status not found" })
      return
    }

    res.json(status)
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500
    res.status(status).json({ error: `Failed to get session status: ${String(err)}` })
  }
})

// GET /api/events — global SSE relay (client-side session filtering)
app.get("/api/events", async (req: Request, res: Response) => {
  const projectDir = resolveProjectDir(req)
  const connectionId = randomUUID()
  const sessionHint = typeof req.query.sessionID === "string" ? req.query.sessionID : undefined

  initSseResponse(res)
  writeSse(res, {
    type: "connected",
    connectionId,
    note: "OpenCode events are broadcast; use sessionID query hint for client filtering.",
  })

  sseConnections.set(connectionId, { res, sessionHint })
  if (eventsShutdownTimer) {
    clearTimeout(eventsShutdownTimer)
    eventsShutdownTimer = null
  }

  try {
    await startEventsRelay(projectDir)
  } catch (err) {
    log.warn("Failed to start events relay", { error: String(err) })
  }

  req.on("close", () => {
    sseConnections.delete(connectionId)
    scheduleEventsRelayShutdown()
  })
})

// POST /api/sessions/:id/prompt — streaming prompt with event relay
app.post("/api/sessions/:id/prompt", async (req: Request, res: Response) => {
  const projectDir = resolveProjectDir(req)
  const { id } = req.params

  const inputText = typeof req.body?.text === "string" ? req.body.text : undefined
  const parts = Array.isArray(req.body?.parts)
    ? req.body.parts
    : inputText
      ? [{ type: "text", text: inputText }]
      : []

  if (parts.length === 0) {
    res.status(400).json({ error: "Missing prompt parts. Expected {parts:[{type:\"text\",text:\"...\"}]}" })
    return
  }

  initSseResponse(res)

  const abortController = new AbortController()
  const timeout = setTimeout(() => {
    abortController.abort()
  }, 45_000)

  req.on("close", () => {
    abortController.abort()
  })

  try {
    // Subscribe BEFORE prompt to avoid missing early events.
    const eventStream = await getClient().event.subscribe({
      query: sdkQuery(projectDir),
      signal: abortController.signal,
    })

    const promptResult = await getClient().session.prompt({
      query: sdkQuery(projectDir),
      path: { id },
      body: { parts },
    })
    if (isRecord(promptResult) && promptResult.error) {
      throw new Error(extractSdkErrorMessage(promptResult.error))
    }

    let seenSessionEvent = false

    for await (const event of eventStream.stream) {
      observeCompactionEvent(event)
      if (!eventBelongsToSession(event, id)) continue

      seenSessionEvent = true
      writeSse(res, { type: "event", event })

      const status = extractSessionStatusFromEvent(event)
      if (seenSessionEvent && (status === "idle" || status === "failed" || status === "error")) {
        break
      }
    }

    writeSse(res, { type: "done" })
    res.write("data: [DONE]\n\n")
  } catch (err) {
    if ((err as Error).name !== "AbortError") {
      const message = String(err)
      log.error("Prompt stream failed", { sessionId: id, error: message })
      writeSse(res, { type: "error", message })
    }
  } finally {
    abortController.abort()
    clearTimeout(timeout)
    res.end()
  }
})

// GET /api/artifacts — List planning artifacts
app.get("/api/artifacts", (req: Request, res: Response) => {
  const projectDir = req.header("X-Project-Dir") || process.cwd()
  const artifacts = getPlanningArtifacts(projectDir)

  res.json({ artifacts })
})

// GET /api/artifacts/:path — Get artifact content
app.get("/api/artifacts/content", (req: Request, res: Response): void => {
  const projectDir = req.header("X-Project-Dir") || process.cwd()
  const path = req.query.path as string

  if (!path) {
    res.status(400).json({ error: "Missing path parameter" })
    return
  }

  const fullPath = sanitizePath(projectDir, path)
  if (!fullPath) {
    log.warn("Path traversal attempt blocked", { path })
    res.status(403).json({ error: "Path traversal denied" })
    return
  }

  if (!existsSync(fullPath)) {
    res.status(404).json({ error: "Artifact not found" })
    return
  }

  try {
    const content = readFileSync(fullPath, "utf-8")
    res.json({ content, path })
  } catch {
    res.status(500).json({ error: "Failed to read artifact" })
  }
})

// PUT /api/artifacts/:path — Save artifact content with backup
app.put("/api/artifacts/content", (req: Request, res: Response): void => {
  const projectDir = req.header("X-Project-Dir") || process.cwd()
  const { path, content } = req.body

  if (!path || content === undefined) {
    res.status(400).json({ error: "Missing required fields: path, content" })
    return
  }

  // Validate file type (only allow md, json, yaml, xml)
  const ext = path.split(".").pop()?.toLowerCase()
  const allowedExtensions = ["md", "markdown", "json", "yaml", "yml", "xml"]
  if (!ext || !allowedExtensions.includes(ext)) {
    res.status(400).json({ error: `File type .${ext} is not editable. Allowed: ${allowedExtensions.join(", ")}` })
    return
  }

  const fullPath = sanitizePath(projectDir, path)
  if (!fullPath) {
    log.warn("Path traversal attempt blocked on write", { path })
    res.status(403).json({ error: "Path traversal denied" })
    return
  }

  if (!existsSync(fullPath)) {
    res.status(404).json({ error: "Artifact not found" })
    return
  }

  try {
    // Create backup before saving
    const backupDir = join(projectDir, ".idumb/backups")
    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const backupPath = join(backupDir, `${path.replace(/\//g, "-")}.${timestamp}.bak`)

    // Copy original to backup
    const originalContent = readFileSync(fullPath, "utf-8")
    writeFileSync(backupPath, originalContent, "utf-8")

    // Save new content
    writeFileSync(fullPath, content, "utf-8")

    // Broadcast update
    broadcastUpdate("artifact-saved", { path, backupPath })

    res.json({
      success: true,
      path,
      backupPath,
      message: "Artifact saved successfully",
    })
  } catch (err) {
    res.status(500).json({ error: `Failed to save artifact: ${err}` })
  }
})

// GET /api/artifacts/metadata — Real file metadata for an artifact (replaces mock)
app.get("/api/artifacts/metadata", (req: Request, res: Response): void => {
  const projectDir = req.header("X-Project-Dir") || process.cwd()
  const path = req.query.path as string

  if (!path) {
    res.status(400).json({ error: "Missing path query parameter" })
    return
  }

  const fullPath = sanitizePath(projectDir, path)
  if (!fullPath) {
    log.warn("Path traversal attempt blocked on metadata", { path })
    res.status(403).json({ error: "Path traversal denied" })
    return
  }

  if (!existsSync(fullPath)) {
    res.status(404).json({ error: "Artifact not found" })
    return
  }

  try {
    const stats = statSync(fullPath)
    const ext = extname(fullPath).replace(".", "").toLowerCase()
    const fileType = (["md", "json", "yaml", "yml", "xml"].includes(ext) ? (ext === "yml" ? "yaml" : ext) : "other") as
      "md" | "json" | "yaml" | "xml" | "other"

    // Determine status heuristics
    const lowerPath = path.toLowerCase()
    const isSuperseded = lowerPath.includes("archive") || lowerPath.includes("superseded")

    // Stale if older than 7 days
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
    const isStale = (Date.now() - stats.mtimeMs) > SEVEN_DAYS_MS

    res.json({
      status: isSuperseded ? "superseded" : "active",
      stale: isStale,
      lastModified: stats.mtimeMs,
      fileType,
      chainIntegrity: true,
      sizeBytes: stats.size,
    })
  } catch {
    res.status(500).json({ error: "Failed to read artifact metadata" })
  }
})

// ─── Comments API ─────────────────────────────────────────────────────────────

/**
 * Get comments store path
 */
function getCommentsStorePath(projectDir: string): string {
  return join(projectDir, ".idumb/brain/comments.json")
}

/**
 * Load comments from store
 */
function loadCommentsStore(projectDir: string) {
  const commentsPath = getCommentsStorePath(projectDir)
  if (!existsSync(commentsPath)) {
    return {
      version: "1.0.0",
      comments: [],
      lastModified: Date.now(),
    }
  }
  try {
    const content = readFileSync(commentsPath, "utf-8")
    return JSON.parse(content)
  } catch {
    return {
      version: "1.0.0",
      comments: [],
      lastModified: Date.now(),
    }
  }
}

/**
 * Save comments to store
 */
function saveCommentsStore(projectDir: string, store: unknown): void {
  const commentsPath = getCommentsStorePath(projectDir)
  const commentsDir = join(projectDir, ".idumb/brain")

  // Ensure directory exists
  if (!existsSync(commentsDir)) {
    mkdirSync(commentsDir, { recursive: true })
  }

  writeFileSync(commentsPath, JSON.stringify(store, null, 2), "utf-8")
}

// GET /api/comments — Get all comments or filter by artifact
app.get("/api/comments", (req: Request, res: Response): void => {
  const projectDir = req.header("X-Project-Dir") || process.cwd()
  const artifactPath = req.query.artifact as string | undefined

  const store = loadCommentsStore(projectDir)

  let comments = store.comments

  // Filter by artifact if specified
  if (artifactPath) {
    comments = comments.filter((c: { artifactPath: string }) => c.artifactPath === artifactPath)
  }

  res.json({
    comments,
    total: comments.length,
  })
})

// POST /api/comments — Create a new comment
app.post("/api/comments", (req: Request, res: Response): void => {
  const projectDir = req.header("X-Project-Dir") || process.cwd()
  const { artifactPath, line, content, author = "user", authorType = "user" } = req.body

  if (!artifactPath || !content) {
    res.status(400).json({ error: "Missing required fields: artifactPath, content" })
    return
  }

  const store = loadCommentsStore(projectDir)

  const newComment = {
    id: randomUUID(),
    artifactPath,
    line: line ? Number(line) : undefined,
    author,
    authorType,
    content,
    timestamp: Date.now(),
    resolved: false,
    replies: [],
  }

  store.comments.push(newComment)
  store.lastModified = Date.now()

  saveCommentsStore(projectDir, store)

  // Broadcast update
  broadcastUpdate("comment-added", { comment: newComment })

  res.status(201).json({ comment: newComment })
})

// PUT /api/comments/:id — Update a comment (resolve/unresolve)
app.put("/api/comments/:id", (req: Request, res: Response): void => {
  const projectDir = req.header("X-Project-Dir") || process.cwd()
  const commentId = req.params.id
  const { resolved, resolvedBy } = req.body

  const store = loadCommentsStore(projectDir)
  const commentIndex = store.comments.findIndex((c: { id: string }) => c.id === commentId)

  if (commentIndex === -1) {
    res.status(404).json({ error: "Comment not found" })
    return
  }

  const comment = store.comments[commentIndex]
  comment.resolved = resolved
  if (resolved && resolvedBy) {
    comment.resolvedBy = resolvedBy
    comment.resolvedAt = Date.now()
  } else {
    delete comment.resolvedBy
    delete comment.resolvedAt
  }

  store.lastModified = Date.now()
  saveCommentsStore(projectDir, store)

  // Broadcast update
  broadcastUpdate("comment-updated", { comment })

  res.json({ comment })
})

// DELETE /api/comments/:id — Delete a comment
app.delete("/api/comments/:id", (req: Request, res: Response): void => {
  const projectDir = req.header("X-Project-Dir") || process.cwd()
  const commentId = req.params.id

  const store = loadCommentsStore(projectDir)
  const commentIndex = store.comments.findIndex((c: { id: string }) => c.id === commentId)

  if (commentIndex === -1) {
    res.status(404).json({ error: "Comment not found" })
    return
  }

  const deletedComment = store.comments.splice(commentIndex, 1)[0]
  store.lastModified = Date.now()
  saveCommentsStore(projectDir, store)

  // Broadcast update
  broadcastUpdate("comment-deleted", { commentId })

  res.json({ deleted: true, comment: deletedComment })
})

// ─── WebSocket Server ─────────────────────────────────────────────────────

import { WebSocketServer, WebSocket } from "ws"

let wss: WebSocketServer | null = null

function setupWebSocket(server: ReturnType<typeof createHttpServer>) {
  wss = new WebSocketServer({ server, path: "/ws" })

  wss.on("connection", (ws: WebSocket) => {
    log.info("WebSocket client connected")

    ws.on("close", () => {
      log.info("WebSocket client disconnected")
    })

    // Send initial state
    ws.send(JSON.stringify({
      type: "connected",
      timestamp: Date.now(),
    }))
  })

  return wss
}

/**
 * Broadcast an update to all connected WebSocket clients
 */
export function broadcastUpdate(type: string, data: unknown) {
  if (!wss) return

  const message = JSON.stringify({ type, data, timestamp: Date.now() })

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message)
    }
  })
}

// ─── File Watcher ────────────────────────────────────────────────────────

import { watch } from "chokidar"

function setupFileWatcher(projectDir: string) {
  const brainDir = join(projectDir, ".idumb/brain")
  const planningDir = join(projectDir, ".planning")

  const watcher = watch([
    join(brainDir, "*.json"),
    join(planningDir, "**/*.md"),
  ], {
    persistent: true,
    ignoreInitial: true,
  })

  watcher.on("change", (path) => {
    log.info("File changed", { path })

    // Broadcast update to all clients
    const relativePath = path.replace(projectDir, "")
    broadcastUpdate("file-changed", { path: relativePath })
  })

  watcher.on("error", (error) => {
    log.error("File watcher error", { error: String(error) })
  })

  return watcher
}

// ─── Server Start ────────────────────────────────────────────────────────

let server: ReturnType<typeof createHttpServer> | null = null
let watcher: ReturnType<typeof watch> | null = null

/** Maximum number of port retry attempts on EADDRINUSE */
const MAX_PORT_RETRIES = 10

/** Tracks the actual port the backend is listening on (may differ from config if retried) */
let actualPort: number | null = null

/** Get the actual port the server is listening on */
export function getActualPort(): number | null {
  return actualPort
}

export async function startServer(config: DashboardConfig): Promise<void> {
  // Stop existing server if running
  if (server) {
    await stopServer()
  }

  // Initialize file-based logger (replaces console.log for TUI safety)
  configuredProjectDir = config.projectDir
  log = createLogger(config.projectDir, "dashboard")

  // Initialize SQLite adapter for task/delegation data
  adapter = new SqliteAdapter()
  try {
    await adapter.init(config.projectDir)
    log.info("SQLite adapter initialized")
  } catch (err) {
    log.warn("SQLite adapter failed to initialize, falling back to JSON reads", {
      error: String(err),
    })
    adapter = null
  }

  const resolvedOpencodePort = Number(
    config.opencodePort
    ?? process.env.OPENCOD_PORT
    ?? process.env.OPENCODE_PORT
    ?? 4096,
  )

  try {
    await startEngine(config.projectDir, resolvedOpencodePort)
    await ensureHealthy()
    const engineStatus = getRuntimeEngineStatus()
    log.info("OpenCode engine ready", {
      opencodePort: engineStatus.port ?? resolvedOpencodePort,
      url: engineStatus.url,
    })
  } catch (err) {
    log.error("Unable to start OpenCode engine", { error: String(err) })
    throw err
  }

  // ─── Story 12-02: Serve pre-built frontend assets if available ──────
  const frontendDistPath = join(config.projectDir, "src/dashboard/frontend/dist")
  if (existsSync(join(frontendDistPath, "index.html"))) {
    app.use(express.static(frontendDistPath))
    // SPA catch-all: serve index.html for any non-API route
    // This MUST come after all /api/ routes are registered (they are module-level above)
    app.get("*", (req: Request, res: Response, next) => {
      // Skip API routes — let Express default 404 handler respond
      if (req.path.startsWith("/api/")) return next()
      res.sendFile(join(frontendDistPath, "index.html"))
    })
    log.info("Serving pre-built frontend from Express", { path: frontendDistPath })
  }

    // Try binding to port with retry on EADDRINUSE
  let lastError: Error | null = null
  for (let attempt = 0; attempt <= MAX_PORT_RETRIES; attempt++) {
    const port = config.backendPort + attempt
    try {
      await tryListenOnPort(config, port)
      actualPort = port

      // Write actual port to disk for frontend discovery
      try {
        const portFile = join(config.projectDir, ".idumb", "brain", "dashboard-port.json")
        writeFileSync(portFile, JSON.stringify({ port, timestamp: Date.now() }))
      } catch {
        // Best-effort — frontend can fall back to default port
      }

      return // Success
    } catch (err) {
      const error = err as NodeJS.ErrnoException
      if (error.code === "EADDRINUSE") {
        log.warn(`Port ${port} in use, trying ${port + 1}...`)
        lastError = error
        continue
      }
      // Non-EADDRINUSE error — fail immediately
      throw error
    }
  }

  // All attempts exhausted
  const triedPorts = Array.from(
    { length: MAX_PORT_RETRIES + 1 },
    (_, i) => config.backendPort + i,
  )
  const message = `Dashboard backend failed to start: all ports in use (tried ${triedPorts.join(", ")})`
  log.error(message)
  throw lastError ?? new Error(message)
}

/** Attempt to listen on a specific port. Rejects on error. */
function tryListenOnPort(config: DashboardConfig, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      server = createHttpServer(app)

      server.listen(port, () => {
        log.info(`Backend listening on port ${port}`)

        // Setup WebSocket AFTER successful listen — avoids unhandled WSS error on EADDRINUSE
        setupWebSocket(server!)

        // Setup file watcher
        watcher = setupFileWatcher(config.projectDir)
        log.info("Watching .idumb/brain/ and planning/")

        resolve()
      })

      server.on("error", (err) => {
        log.error("Server error", { error: String(err) })
        server?.close()
        server = null
        reject(err)
      })
    } catch (err) {
      reject(err)
    }
  })
}

export async function stopServer(): Promise<void> {
  log.info("Stopping dashboard backend...")

  if (eventsShutdownTimer) {
    clearTimeout(eventsShutdownTimer)
    eventsShutdownTimer = null
  }
  if (eventsAbortController) {
    eventsAbortController.abort()
    eventsAbortController = null
  }
  sseConnections.clear()

  if (watcher) {
    await watcher.close()
    watcher = null
  }

  if (adapter) {
    await adapter.close()
    adapter = null
  }

  if (wss) {
    wss.close()
    wss = null
  }

  try {
    await stopRuntimeEngine()
  } catch (err) {
    log.warn("Failed to stop OpenCode engine during shutdown", { error: String(err) })
  }

  if (server) {
    return new Promise((resolve) => {
      server!.close(() => {
        server = null
        log.info("Backend stopped")
        resolve()
      })
    })
  }

  return Promise.resolve()
}

// ─── Graceful Shutdown ───────────────────────────────────────────────────

process.on("SIGINT", async () => {
  log.info("Received SIGINT, shutting down...")
  try { await stopServer() } catch { /* best-effort */ }
  process.exit(0)
})

process.on("SIGTERM", async () => {
  log.info("Received SIGTERM, shutting down...")
  try { await stopServer() } catch { /* best-effort */ }
  process.exit(0)
})
