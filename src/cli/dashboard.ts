/**
 * Dashboard CLI — `idumb-v2 dashboard`
 *
 * Launches the TanStack Start dashboard app via Vite dev server.
 * No separate Express backend — server functions + server routes handle everything.
 *
 * Usage:
 *   idumb-v2 dashboard              # Start on default port 5180
 *   idumb-v2 dashboard --port 4000  # Custom port
 *   idumb-v2 dashboard --open       # Auto-open browser (default)
 *   idumb-v2 dashboard --no-browser # Don't open browser
 */

import { join, dirname } from "node:path"
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
}

function parseArgs(args: string[]): DashboardConfig {
  const config: DashboardConfig = {
    projectDir: process.cwd(),
    port: 5180,
    open: true,
  }

  for (let i = 1; i < args.length; i++) {
    const arg = args[i]
    if (arg === "--port" || arg === "-p") {
      config.port = parseInt(args[i + 1] || "5180", 10)
    } else if (arg === "--open") {
      config.open = true
    } else if (arg === "--no-browser" || arg === "--no-open") {
      config.open = false
    } else if (arg?.startsWith("--port=")) {
      config.port = parseInt(arg.split("=")[1] || "5180", 10)
    }
  }

  return config
}

// ─── Vite Config Resolution ──────────────────────────────────────────────

/**
 * Find the TanStack Start app's vite.config.ts.
 * Searches relative to this file (works from both src/ and dist/).
 */
function resolveViteConfig(projectDir: string): string | null {
  const candidates = [
    join(__dirname, "../../app/vite.config.ts"),         // from src/cli/ → project root/app/
    join(__dirname, "../../../app/vite.config.ts"),       // from dist/cli/ → project root/app/
    join(projectDir, "app/vite.config.ts"),               // absolute fallback
  ]

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate
    }
  }

  return null
}

// ─── Main Entry Point ─────────────────────────────────────────────────────

export async function startDashboard(_projectDir: string, args: string[]): Promise<void> {
  const config = parseArgs(args)

  print("")
  print(`${C.cyan}${C.bold}  🧠 iDumb Dashboard${C.reset}`)
  print(`${C.dim}  TanStack Start — server functions + SSE${C.reset}`)
  print("")
  print(`  ${C.dim}Project: ${config.projectDir}${C.reset}`)
  print(`  ${C.dim}URL: http://localhost:${config.port}${C.reset}`)
  print("")

  // Check if .idumb exists
  const idumbDir = join(config.projectDir, ".idumb")
  if (!existsSync(idumbDir)) {
    print(`  ${C.yellow}⚠ .idumb/ directory not found.${C.reset}`)
    print(`  ${C.dim}Run ${C.cyan}idumb-v2 init${C.dim} first.${C.reset}`)
    print("")
    return
  }

  // Find vite config
  const viteConfig = resolveViteConfig(config.projectDir)
  if (!viteConfig) {
    print(`  ${C.red}❌ app/vite.config.ts not found.${C.reset}`)
    print(`  ${C.dim}  Expected in: ${join(config.projectDir, "app/vite.config.ts")}${C.reset}`)
    print("")
    return
  }

  // Start TanStack Start dev server
  print(`  ${C.yellow}⏳ Starting dashboard...${C.reset}`)

  const vite = spawn("npx", ["vite", "--config", viteConfig, "--port", String(config.port)], {
    cwd: config.projectDir,
    stdio: "inherit",
    shell: true,
    env: { ...process.env },
  })

  vite.on("error", (err) => {
    print(`  ${C.red}❌ Failed to start: ${err.message}${C.reset}`)
    process.exit(1)
  })

  vite.on("exit", (code) => {
    if (code && code !== 0) {
      print(`  ${C.red}❌ Vite exited with code ${code}${C.reset}`)
      process.exit(code)
    }
  })

  // Open browser after short delay (let Vite bind port first)
  if (config.open) {
    setTimeout(async () => {
      try {
        const openMod = await import("open")
        await openMod.default(`http://localhost:${config.port}`)
      } catch {
        // silent — browser hint is in Vite output
      }
    }, 2000)
  }

  // Keep process alive
  await new Promise(() => {})
}
