/**
 * Dashboard CLI — `idumb-v2 dashboard`
 *
 * Spawns a local dev server with Express backend + Vite frontend.
 * Provides real-time visualization of iDumb governance state.
 *
 * Usage:
 *   idumb-v2 dashboard              # Start on default port 3000
 *   idumb-v2 dashboard --port 4000  # Custom port
 *   idumb-v2 dashboard --open       # Auto-open browser
 *   idumb-v2 dashboard --no-browser # Don't open browser
 */

import { resolve, join, dirname } from "node:path"
import { existsSync } from "node:fs"
import { spawn } from "node:child_process"
import { stdout } from "node:process"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ─── ANSI Colors ────────────────────────────────────────────────────────

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
}

function print(msg: string): void {
  stdout.write(msg + "\n")
}

// ─── Configuration ───────────────────────────────────────────────────────

interface DashboardConfig {
  projectDir: string
  port: number
  open: boolean
  backendPort: number
}

function parseArgs(args: string[]): DashboardConfig {
  const config: DashboardConfig = {
    projectDir: resolve(process.cwd()),
    port: 3000,
    backendPort: 3001,
    open: true,
  }

  for (let i = 1; i < args.length; i++) {
    const arg = args[i]
    if (arg === "--port" || arg === "-p") {
      config.port = parseInt(args[i + 1] || "3000", 10)
    } else if (arg === "--backend-port") {
      config.backendPort = parseInt(args[i + 1] || "3001", 10)
    } else if (arg === "--open") {
      config.open = true
    } else if (arg === "--no-browser" || arg === "--no-open") {
      config.open = false
    } else if (arg.startsWith("--port=")) {
      config.port = parseInt(arg.split("=")[1] || "3000", 10)
    } else if (arg.startsWith("--backend-port=")) {
      config.backendPort = parseInt(arg.split("=")[1] || "3001", 10)
    }
  }

  return config
}

// ─── Dashboard Server ────────────────────────────────────────────────────

/**
 * Start the dashboard backend server (Express + WebSocket)
 */
async function startBackend(config: DashboardConfig): Promise<void> {
  const { startServer } = await import("../dashboard/backend/server.js")
  await startServer(config)
}

// ─── Story 12-04: Frontend directory resolution ─────────────────────────

/**
 * Resolve the frontend directory using multiple strategies:
 *  1. Relative to source — when running via tsx (src/cli/dashboard.ts)
 *  2. Relative to dist — when running from compiled (dist/cli/dashboard.js)
 *  3. Package root fallback — search from import.meta.url up to package.json
 *
 * Returns { srcDir, distDir } where srcDir is the source frontend dir
 * and distDir is the built frontend assets dir. Either may be null.
 */
function resolveFrontendDirs(projectDir: string): { srcDir: string | null; distDir: string | null } {
  // Strategy 1: Relative to __dirname (works for both src/ and dist/)
  const candidates = [
    join(__dirname, "../dashboard/frontend"),           // from src/cli/ or dist/cli/
    join(__dirname, "../../src/dashboard/frontend"),     // from dist/cli/ → package root → src/
    join(projectDir, "src/dashboard/frontend"),          // absolute fallback via project dir
  ]

  let srcDir: string | null = null
  for (const candidate of candidates) {
    if (existsSync(join(candidate, "vite.config.ts")) || existsSync(join(candidate, "package.json"))) {
      srcDir = candidate
      break
    }
  }

  // Built frontend dist — check inside the resolved srcDir or known locations
  let distDir: string | null = null
  const distCandidates = [
    srcDir ? join(srcDir, "dist") : null,
    join(projectDir, "src/dashboard/frontend/dist"),
  ].filter(Boolean) as string[]

  for (const candidate of distCandidates) {
    if (existsSync(join(candidate, "index.html"))) {
      distDir = candidate
      break
    }
  }

  return { srcDir, distDir }
}

/**
 * Start the Vite dev server for the frontend.
 * Story 12-01: Passes VITE_BACKEND_PORT env so Vite proxy targets the actual backend port.
 * Story 12-02: Skips Vite entirely if pre-built frontend dist exists (production serve mode).
 * Story 12-04: Uses resolveFrontendDirs() for robust path resolution.
 */
function startFrontend(config: DashboardConfig, actualBackendPort: number): Promise<void> {
  return new Promise((resolve) => {
    const { srcDir, distDir } = resolveFrontendDirs(config.projectDir)

    // Story 12-02: If pre-built frontend exists, Express already serves it via static middleware.
    // Skip spawning Vite dev server entirely.
    if (distDir) {
      print(`  ${C.green}✅ Frontend served from pre-built assets${C.reset}`)
      print(`  ${C.dim}  ${distDir}${C.reset}`)
      resolve()
      return
    }

    // Need source dir to run Vite dev server
    if (!srcDir) {
      print(`  ${C.yellow}⚠ Frontend not found. Tried:${C.reset}`)
      print(`  ${C.dim}  - Relative to running file: ${join(__dirname, "../dashboard/frontend")}${C.reset}`)
      print(`  ${C.dim}  - Package root: ${join(config.projectDir, "src/dashboard/frontend")}${C.reset}`)
      print(`  ${C.dim}  Build the frontend first or run from the source tree.${C.reset}`)
      resolve()
      return
    }

    // Story 12-01: Pass actual backend port via env so vite.config.ts proxy targets it
    const env = {
      ...process.env,
      VITE_BACKEND_PORT: String(actualBackendPort),
    }

    // Spawn Vite dev server
    const vite = spawn("npx", ["vite", "--port", String(config.port)], {
      cwd: srcDir,
      stdio: "inherit",
      shell: true,
      env,
    }) as unknown as {
      on(event: string, handler: (...args: unknown[]) => void): void
      kill(): void
    }

    vite.on("error", (...args) => {
      const err = args[0] as Error | undefined
      print(`  ${C.red}❌ Failed to start Vite:${C.reset} ${err?.message || "unknown error"}`)
    })

    vite.on("exit", (...args) => {
      const code = args[0] as number | undefined
      if (code && code !== 0) {
        print(`  ${C.yellow}⚠ Vite exited with code ${code}${C.reset}`)
      }
      resolve()
    })

    // Store process for cleanup
    ;(globalThis as unknown as { __idumb_vite_process: unknown }).__idumb_vite_process = vite
  })
}

// ─── Main Entry Point ─────────────────────────────────────────────────────

export async function startDashboard(_projectDir: string, args: string[]): Promise<void> {
  const config = parseArgs(args)

  print("")
  print(`${C.cyan}${C.bold}  🧠 iDumb Dashboard${C.reset}`)
  print(`${C.dim}  Interactive governance UI${C.reset}`)
  print("")
  print(`  ${C.dim}Project: ${config.projectDir}${C.reset}`)
  print(`  ${C.dim}Backend: http://localhost:${config.backendPort}${C.reset}`)
  print(`  ${C.dim}Frontend: http://localhost:${config.port}${C.reset}`)
  print("")

  // Check if .idumb exists
  const idumbDir = join(config.projectDir, ".idumb")
  if (!existsSync(idumbDir)) {
    print(`  ${C.yellow}⚠ .idumb/ directory not found.${C.reset}`)
    print(`  ${C.dim}Run ${C.cyan}idumb-v2 init${C.dim} first.${C.reset}`)
    print("")
    return
  }

  // Start backend server
  print(`  ${C.yellow}⏳ Starting backend server...${C.reset}`)
  await startBackend(config)

  // Story 12-01: Get the actual backend port (may differ from config if port was retried)
  const { getActualPort } = await import("../dashboard/backend/server.js")
  const actualBackendPort = getActualPort() ?? config.backendPort
  print(`  ${C.green}✅ Backend running on port ${actualBackendPort}${C.reset}`)

  // Start frontend dev server (or skip if pre-built — Story 12-02)
  print(`  ${C.yellow}⏳ Starting frontend...${C.reset}`)
  await startFrontend(config, actualBackendPort)
  print(`  ${C.green}✅ Frontend running on port ${config.port}${C.reset}`)

  // Open browser if requested
  if (config.open) {
    try {
      const openMod = await import("open")
      await openMod.default(`http://localhost:${config.port}`)
      print(`  ${C.dim}🌐 Opening browser...${C.reset}`)
    } catch {
      print(`  ${C.dim}📎 Open http://localhost:${config.port} in your browser${C.reset}`)
    }
  } else {
    print(`  ${C.dim}📎 Open http://localhost:${config.port} in your browser${C.reset}`)
  }

  print("")
  print(`  ${C.green}${C.bold}✅ Dashboard is ready!${C.reset}`)
  print(`  ${C.dim}Press Ctrl+C to stop${C.reset}`)
  print("")

  // Keep process alive
  await new Promise(() => {})
}
