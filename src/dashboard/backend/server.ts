/**
 * Dashboard Backend Server
 *
 * Express + WebSocket server that:
 * - Serves API routes for governance state (tasks, brain, delegations, etc.)
 * - Broadcasts JSON file changes via WebSocket
 * - Provides file watching for .idumb/brain/*.json
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

// ─── Types ───────────────────────────────────────────────────────────────

interface DashboardConfig {
  projectDir: string
  port: number
  backendPort: number
  open: boolean
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
  const planningDir = join(projectDir, "planning")
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

// ─── API Routes ───────────────────────────────────────────────────────────

// GET /api/tasks — TaskStore snapshot
app.get("/api/tasks", (req: Request, res: Response) => {
  const projectDir = req.header("X-Project-Dir") || process.cwd()

  // Use SQLite adapter when available and project dir matches
  if (adapter && configuredProjectDir === projectDir) {
    try {
      const state = getGovernanceState(projectDir) // still need capturedAgent from JSON
      res.json({
        tasks: adapter.getTaskStore(),
        activeTask: adapter.getSmartActiveTask(),
        activeEpic: adapter.getActiveEpic(),
        capturedAgent: state.capturedAgent,
      })
      return
    } catch (err) {
      log.warn("SQLite read failed for /api/tasks, falling back to JSON", { error: String(err) })
      // Fall through to JSON path
    }
  }

  // Fallback to JSON file reads
  const state = getGovernanceState(projectDir)
  res.json({
    tasks: state.taskStore,
    activeTask: state.activeTask,
    activeEpic: state.activeEpic,
    capturedAgent: state.capturedAgent,
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
  const projectDir = req.header("X-Project-Dir") || process.cwd()
  const state = getGovernanceState(projectDir)

  res.json({
    codemap: state.codeMapStore,
  })
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
  const planningDir = join(projectDir, "planning")

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

  // ─── Story 12-02: Serve pre-built frontend assets if available ──────
  const frontendDistPath = join(config.projectDir, "src/dashboard/frontend/dist")
  if (existsSync(join(frontendDistPath, "index.html"))) {
    app.use(express.static(frontendDistPath))
    // SPA catch-all: serve index.html for any non-API route
    // This MUST come after all /api/ routes are registered (they are module-level above)
    app.get("*", (req: Request, res: Response) => {
      // Skip API routes — they are already handled above
      if (req.path.startsWith("/api/")) return
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

      // Setup WebSocket
      setupWebSocket(server)

      server.listen(port, () => {
        log.info(`Backend listening on port ${port}`)

        // Setup file watcher
        watcher = setupFileWatcher(config.projectDir)
        log.info("Watching .idumb/brain/ and planning/")

        resolve()
      })

      server.on("error", (err) => {
        log.error("Server error", { error: String(err) })
        // Close the server on bind error so it's cleaned up for retry
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
