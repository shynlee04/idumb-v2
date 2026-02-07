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

/**
 * Start the Vite dev server for the frontend
 */
function startFrontend(config: DashboardConfig): Promise<void> {
  return new Promise((resolve) => {
    const vitePath = join(__dirname, "../dashboard/frontend")
    const viteConfig = join(vitePath, "vite.config.ts")

    // Check if frontend exists
    if (!existsSync(viteConfig)) {
      print(`  ${C.yellow}⚠ Frontend not found. Run build first:${C.reset}`)
      print(`  ${C.dim}  npm run build:dashboard${C.reset}`)
      resolve()
      return
    }

    // Spawn Vite dev server
    const vite = spawn("npx", ["vite", "--port", String(config.port)], {
      cwd: vitePath,
      stdio: "inherit",
      shell: true,
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
  print(`  ${C.green}✅ Backend running on port ${config.backendPort}${C.reset}`)

  // Start frontend dev server
  print(`  ${C.yellow}⏳ Starting frontend dev server...${C.reset}`)
  await startFrontend(config)
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
