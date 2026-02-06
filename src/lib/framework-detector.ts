/**
 * Framework detector — read-only brownfield scanner.
 * 
 * Uses ONLY: fs.stat, fs.readdir, fs.readFile (offset-limited).
 * NEVER writes, modifies, or deletes anything.
 * 
 * Detects:
 * 1. Governance frameworks (BMAD, GSD, Spec-kit, Open-spec)
 * 2. Tech stack (Next.js, React, Vue, etc.)
 * 3. Package manager
 * 4. Existing agent/command directories
 * 5. Potential conflicts with .idumb/
 * 6. Gaps and drift signals
 * 
 * Consumers: init tool (first run), meta-builder greeting
 */

import { readFile, stat } from "node:fs/promises"
import { join } from "node:path"
import type { FrameworkDetection, GovernanceFramework, TechFramework } from "../schemas/config.js"
import { DEFAULT_DETECTION } from "../schemas/config.js"
import type { Logger } from "./logging.js"

// ─── Detection Signatures ────────────────────────────────────────────

interface DetectionSignature {
  /** What we're looking for */
  name: string
  /** Files/dirs whose existence signals this framework */
  markers: string[]
  /** If found, what framework does it map to? */
  result: GovernanceFramework | TechFramework
  /** "governance" or "tech" */
  category: "governance" | "tech"
}

const SIGNATURES: DetectionSignature[] = [
  // Governance frameworks
  { name: "BMAD Method", markers: ["_bmad", ".bmad", "bmad.config.yaml"], result: "bmad", category: "governance" },
  { name: "GSD Framework", markers: [".gsd", "gsd.config.json", ".opencode/command/gsd"], result: "gsd", category: "governance" },
  { name: "Spec-kit", markers: [".spec-kit", "spec-kit.config.json"], result: "spec-kit", category: "governance" },
  { name: "Open-spec", markers: [".open-spec", "open-spec.yaml"], result: "open-spec", category: "governance" },

  // Tech stack — detected via config files
  { name: "Next.js", markers: ["next.config.js", "next.config.mjs", "next.config.ts"], result: "nextjs", category: "tech" },
  { name: "Nuxt", markers: ["nuxt.config.ts", "nuxt.config.js"], result: "nuxt", category: "tech" },
  { name: "SvelteKit", markers: ["svelte.config.js", "svelte.config.ts"], result: "sveltekit", category: "tech" },
  { name: "Astro", markers: ["astro.config.mjs", "astro.config.ts"], result: "astro", category: "tech" },
  { name: "Remix", markers: ["remix.config.js", "remix.config.ts"], result: "remix", category: "tech" },
  { name: "Angular", markers: ["angular.json", ".angular"], result: "angular", category: "tech" },
  { name: "Vue", markers: ["vue.config.js", "vite.config.ts", "vite.config.js"], result: "vue", category: "tech" },
  { name: "Express", markers: ["express"], result: "express", category: "tech" },  // checked via package.json deps
  { name: "NestJS", markers: ["nest-cli.json"], result: "nestjs", category: "tech" },
  { name: "Django", markers: ["manage.py", "django"], result: "django", category: "tech" },
  { name: "Flask", markers: ["flask"], result: "flask", category: "tech" },
  { name: "Rails", markers: ["Gemfile", "config/routes.rb"], result: "rails", category: "tech" },
  { name: "Laravel", markers: ["artisan", "composer.json"], result: "laravel", category: "tech" },
]

const PACKAGE_MANAGERS: { file: string; manager: FrameworkDetection["packageManager"] }[] = [
  { file: "bun.lockb", manager: "bun" },
  { file: "bun.lock", manager: "bun" },
  { file: "pnpm-lock.yaml", manager: "pnpm" },
  { file: "yarn.lock", manager: "yarn" },
  { file: "package-lock.json", manager: "npm" },
  { file: "Pipfile.lock", manager: "pip" },
  { file: "requirements.txt", manager: "pip" },
  { file: "Cargo.lock", manager: "cargo" },
  { file: "go.sum", manager: "go" },
]

const AGENT_DIRS = [
  ".opencode/agents",
  ".opencode/command",
  ".claude/agents",
  ".claude/commands",
  ".gemini/agents",
  ".cursor/agents",
  ".windsurf/skills",
]

const MONOREPO_MARKERS = [
  "lerna.json",
  "pnpm-workspace.yaml",
  "turbo.json",
  "nx.json",
  "rush.json",
]

// ─── Core Detection ──────────────────────────────────────────────────

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function readJsonSafe(path: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await readFile(path, "utf-8")
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return null
  }
}

/**
 * Detect frameworks by scanning marker files at project root.
 * Read-only. Never writes anything.
 */
async function detectFrameworks(projectDir: string): Promise<{
  governance: GovernanceFramework[]
  tech: TechFramework[]
}> {
  const governance: GovernanceFramework[] = []
  const tech: TechFramework[] = []

  for (const sig of SIGNATURES) {
    for (const marker of sig.markers) {
      if (await exists(join(projectDir, marker))) {
        if (sig.category === "governance" && !governance.includes(sig.result as GovernanceFramework)) {
          governance.push(sig.result as GovernanceFramework)
        } else if (sig.category === "tech" && !tech.includes(sig.result as TechFramework)) {
          tech.push(sig.result as TechFramework)
        }
        break // found one marker, move to next signature
      }
    }
  }

  // Also check package.json dependencies for tech detection
  const pkg = await readJsonSafe(join(projectDir, "package.json"))
  if (pkg) {
    const allDeps = {
      ...(pkg.dependencies as Record<string, string> ?? {}),
      ...(pkg.devDependencies as Record<string, string> ?? {}),
    }

    if (allDeps["react"] && !tech.includes("react") && !tech.includes("nextjs")) {
      tech.push("react")
    }
    if (allDeps["vue"] && !tech.includes("vue") && !tech.includes("nuxt")) {
      tech.push("vue")
    }
    if (allDeps["svelte"] && !tech.includes("svelte") && !tech.includes("sveltekit")) {
      tech.push("svelte")
    }
    if (allDeps["express"] && !tech.includes("express")) {
      tech.push("express")
    }
    if (allDeps["fastify"] && !tech.includes("fastify")) {
      tech.push("fastify" as TechFramework)
    }
    if (allDeps["typescript"]) {
      if (!tech.includes("typescript")) tech.push("typescript")
    }
  }

  // Check for TypeScript via tsconfig
  if (await exists(join(projectDir, "tsconfig.json"))) {
    if (!tech.includes("typescript")) tech.push("typescript")
  }

  // Detect primary language from file presence
  if (await exists(join(projectDir, "setup.py")) || await exists(join(projectDir, "pyproject.toml"))) {
    if (!tech.includes("python")) tech.push("python")
  }
  if (await exists(join(projectDir, "Cargo.toml"))) {
    if (!tech.includes("rust")) tech.push("rust")
  }
  if (await exists(join(projectDir, "go.mod"))) {
    if (!tech.includes("go")) tech.push("go")
  }

  return { governance, tech }
}

async function detectPackageManager(projectDir: string): Promise<FrameworkDetection["packageManager"]> {
  for (const pm of PACKAGE_MANAGERS) {
    if (await exists(join(projectDir, pm.file))) {
      return pm.manager
    }
  }
  return "unknown"
}

async function detectAgentDirs(projectDir: string): Promise<{ agents: string[]; commands: string[] }> {
  const agents: string[] = []
  const commands: string[] = []

  for (const dir of AGENT_DIRS) {
    if (await exists(join(projectDir, dir))) {
      if (dir.includes("command") || dir.includes("skill")) {
        commands.push(dir)
      } else {
        agents.push(dir)
      }
    }
  }

  return { agents, commands }
}

async function detectMonorepo(projectDir: string): Promise<boolean> {
  for (const marker of MONOREPO_MARKERS) {
    if (await exists(join(projectDir, marker))) return true
  }

  // Also check package.json workspaces
  const pkg = await readJsonSafe(join(projectDir, "package.json"))
  if (pkg?.workspaces) return true

  return false
}

async function detectConflicts(projectDir: string): Promise<string[]> {
  const conflicts: string[] = []

  if (await exists(join(projectDir, ".idumb"))) {
    conflicts.push(".idumb/ already exists — will need merge strategy")
  }

  // Check if .gitignore would hide .idumb
  try {
    const gitignore = await readFile(join(projectDir, ".gitignore"), "utf-8")
    if (gitignore.includes(".idumb")) {
      conflicts.push(".gitignore already references .idumb — may need adjustment")
    }
  } catch {
    // no .gitignore, fine
  }

  return conflicts
}

async function detectGaps(projectDir: string): Promise<string[]> {
  const gaps: string[] = []

  // Check for common issues
  const pkg = await readJsonSafe(join(projectDir, "package.json"))
  if (!pkg) {
    gaps.push("No package.json found — cannot determine JS/TS dependencies")
  }

  if (!(await exists(join(projectDir, ".git")))) {
    gaps.push("No .git/ directory — project is not version controlled")
  }

  // Check for stale lock files
  if (pkg) {
    if (!(await exists(join(projectDir, "node_modules")))) {
      gaps.push("package.json exists but node_modules/ missing — dependencies not installed")
    }
  }

  // Check for missing tsconfig in TypeScript projects
  if (pkg) {
    const deps = { ...(pkg.dependencies as Record<string, string> ?? {}), ...(pkg.devDependencies as Record<string, string> ?? {}) }
    if (deps["typescript"] && !(await exists(join(projectDir, "tsconfig.json")))) {
      gaps.push("TypeScript dependency found but no tsconfig.json")
    }
  }

  // Check for README
  const hasReadme = await exists(join(projectDir, "README.md")) || await exists(join(projectDir, "readme.md"))
  if (!hasReadme) {
    gaps.push("No README.md — project documentation missing")
  }

  return gaps
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Full brownfield scan — read-only, never writes.
 * Returns a complete FrameworkDetection snapshot.
 */
export async function scanProject(projectDir: string, log: Logger): Promise<FrameworkDetection> {
  log.info("Starting brownfield scan", { projectDir })

  try {
    const [frameworks, packageManager, agentDirs, hasMonorepo, conflicts, gaps] = await Promise.all([
      detectFrameworks(projectDir),
      detectPackageManager(projectDir),
      detectAgentDirs(projectDir),
      detectMonorepo(projectDir),
      detectConflicts(projectDir),
      detectGaps(projectDir),
    ])

    const result: FrameworkDetection = {
      governance: frameworks.governance,
      tech: frameworks.tech,
      packageManager,
      hasMonorepo,
      existingAgentDirs: agentDirs.agents,
      existingCommandDirs: agentDirs.commands,
      conflicts,
      gaps,
    }

    log.info("Brownfield scan complete", {
      governance: result.governance.join(", ") || "none",
      tech: result.tech.join(", ") || "none",
      packageManager: result.packageManager,
      monorepo: result.hasMonorepo,
      conflicts: result.conflicts.length,
      gaps: result.gaps.length,
    })

    return result
  } catch (err) {
    log.error("Brownfield scan failed", { error: String(err) })
    return { ...DEFAULT_DETECTION }
  }
}

/**
 * Format detection results as a human-readable report.
 * Used by the greeting flow.
 */
export function formatDetectionReport(detection: FrameworkDetection, lang: "en" | "vi" = "en"): string {
  const lines: string[] = []

  if (lang === "vi") {
    lines.push("## 🔍 Kết Quả Quét Dự Án\n")
    lines.push(`**Quản lý gói:** ${detection.packageManager}`)
    lines.push(`**Monorepo:** ${detection.hasMonorepo ? "Có" : "Không"}`)

    if (detection.governance.length > 0) {
      lines.push(`\n**Framework quản trị:** ${detection.governance.join(", ")}`)
    } else {
      lines.push("\n**Framework quản trị:** Không phát hiện")
    }

    if (detection.tech.length > 0) {
      lines.push(`**Stack công nghệ:** ${detection.tech.join(", ")}`)
    }

    if (detection.existingAgentDirs.length > 0) {
      lines.push(`\n**Thư mục agent hiện có:** ${detection.existingAgentDirs.join(", ")}`)
    }

    if (detection.conflicts.length > 0) {
      lines.push("\n### ⚠️ Xung Đột")
      detection.conflicts.forEach(c => lines.push(`- ${c}`))
    }

    if (detection.gaps.length > 0) {
      lines.push("\n### 📋 Vấn Đề Phát Hiện")
      detection.gaps.forEach(g => lines.push(`- ${g}`))
    }
  } else {
    lines.push("## 🔍 Project Scan Results\n")
    lines.push(`**Package manager:** ${detection.packageManager}`)
    lines.push(`**Monorepo:** ${detection.hasMonorepo ? "Yes" : "No"}`)

    if (detection.governance.length > 0) {
      lines.push(`\n**Governance frameworks:** ${detection.governance.join(", ")}`)
    } else {
      lines.push("\n**Governance frameworks:** None detected")
    }

    if (detection.tech.length > 0) {
      lines.push(`**Tech stack:** ${detection.tech.join(", ")}`)
    }

    if (detection.existingAgentDirs.length > 0) {
      lines.push(`\n**Existing agent directories:** ${detection.existingAgentDirs.join(", ")}`)
    }

    if (detection.existingCommandDirs.length > 0) {
      lines.push(`**Existing command directories:** ${detection.existingCommandDirs.join(", ")}`)
    }

    if (detection.conflicts.length > 0) {
      lines.push("\n### ⚠️ Conflicts")
      detection.conflicts.forEach(c => lines.push(`- ${c}`))
    }

    if (detection.gaps.length > 0) {
      lines.push("\n### 📋 Issues Detected")
      detection.gaps.forEach(g => lines.push(`- ${g}`))
    }
  }

  return lines.join("\n")
}
