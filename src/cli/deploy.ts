/**
 * Deploy module — deploys agents, commands, and module templates to the user's project.
 * 
 * Called by the CLI after interactive setup.
 * Writes to .opencode/agents/, .opencode/commands/, and .idumb/idumb-modules/.
 * Non-destructive: skips existing files unless force=true.
 */

import { mkdir, writeFile, stat, readFile } from "node:fs/promises"
import { join, dirname, resolve } from "node:path"
import type { Language, GovernanceMode, ExperienceLevel } from "../schemas/config.js"
import {
  getCoordinatorAgent,
  getInvestigatorAgent,
  getExecutorAgent,
  getInitCommand,
  getSettingsCommand,
  getStatusCommand,
  getDelegateCommand,
  AGENT_CONTRACT_TEMPLATE,
  MODULES_README_TEMPLATE,
  COMMAND_TEMPLATE,
  WORKFLOW_TEMPLATE,
  COORDINATOR_PROFILE,
  INVESTIGATOR_PROFILE,
  EXECUTOR_PROFILE,
  DELEGATION_SKILL_TEMPLATE,
  GOVERNANCE_SKILL_TEMPLATE,
} from "../templates.js"
import { createBootstrapStore } from "../schemas/task.js"
import { createPlanningRegistry } from "../schemas/planning-registry.js"

export interface DeployOptions {
  projectDir: string
  language: Language
  governance: GovernanceMode
  experience: ExperienceLevel
  scope: "project" | "global"
  force: boolean
}

export interface DeployResult {
  deployed: string[]
  skipped: string[]
  errors: string[]
  warnings: string[]
  pluginPath: string
  pluginMethod: PluginResolutionMethod
  opencodConfigUpdated: boolean
}

type PluginResolutionMethod = "npm" | "local-dev" | "npx-fallback"

interface PluginResolution {
  path: string
  method: PluginResolutionMethod
  warning?: string
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function writeIfNew(path: string, content: string, force: boolean, result: DeployResult): Promise<void> {
  if (await exists(path) && !force) {
    result.skipped.push(path)
    return
  }
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, content, "utf-8")
  result.deployed.push(path)
}

// ─── Plugin name constant (single source of truth) ───────────────────
const PLUGIN_PACKAGE_NAME = "idumb-v2"

/**
 * Resolve the plugin path for opencode.json.
 * 
 * 4-strategy priority chain:
 *   S1: idumb-v2 exists in project's node_modules → "idumb-v2" (npm resolution)
 *   S2: CLI is running from project's node_modules → "idumb-v2"
 *   S3: Running from cloned repo (dev mode) → absolute path
 *   S4: npx cache / global install fallback → absolute path + warning
 * 
 * OpenCode supports: package names, file:// URLs, and relative/absolute paths.
 * Package name ("idumb-v2") is most portable — works with npm, pnpm, yarn, monorepos.
 */
async function resolvePluginPath(projectDir: string): Promise<PluginResolution> {
  const thisFile = new URL(import.meta.url).pathname

  // ── S1: Check if idumb-v2 is installed in the PROJECT's node_modules ──
  // This is the cleanest case — the user did `npm install idumb-v2`
  const localPkgJson = join(projectDir, "node_modules", PLUGIN_PACKAGE_NAME, "package.json")
  if (await exists(localPkgJson)) {
    return { path: PLUGIN_PACKAGE_NAME, method: "npm" }
  }

  // ── S2: Are we running from inside the project's own node_modules? ──
  // Handles edge case where S1 check failed but we ARE the local dep
  const projectNodeModules = join(projectDir, "node_modules") + "/"
  if (thisFile.startsWith(projectNodeModules)) {
    return { path: PLUGIN_PACKAGE_NAME, method: "npm" }
  }

  // ── S3: Local development (cloned repo) ──
  // Go up from dist/cli/deploy.js → package root
  const packageRoot = resolve(dirname(thisFile), "..", "..")
  const packageJsonPath = join(packageRoot, "package.json")

  if (await exists(packageJsonPath)) {
    try {
      const raw = await readFile(packageJsonPath, "utf-8")
      const pkg = JSON.parse(raw) as Record<string, unknown>
      if (pkg.name === PLUGIN_PACKAGE_NAME) {
        // Confirmed this is the idumb-v2 repo — dev mode
        return { path: packageRoot, method: "local-dev" }
      }
    } catch {
      // Ignore parse errors, fall through
    }
  }

  // ── S4: npx cache or global install fallback ──
  // The package is in a transient location (npx cache, global prefix).
  // Extract the package root and WARN the user — this path may not survive.
  if (thisFile.includes(`node_modules/${PLUGIN_PACKAGE_NAME}`)) {
    const marker = `node_modules/${PLUGIN_PACKAGE_NAME}`
    const idx = thisFile.indexOf(marker)
    const pkgRoot = thisFile.slice(0, idx + marker.length)

    return {
      path: pkgRoot,
      method: "npx-fallback",
      warning:
        `Plugin path points to a temporary location (npx cache or global install). ` +
        `This WILL break when the cache is cleared. ` +
        `For a stable setup, run: npm install ${PLUGIN_PACKAGE_NAME}`,
    }
  }

  // ── Final fallback ──
  return {
    path: packageRoot,
    method: "npx-fallback",
    warning: `Could not reliably locate ${PLUGIN_PACKAGE_NAME}. Run: npm install ${PLUGIN_PACKAGE_NAME}`,
  }
}

/**
 * Clean stale idumb-v2 entries from an existing plugin array.
 * Removes duplicates and paths that reference idumb-v2 in any form.
 * Non-idumb plugins are preserved untouched.
 */
function cleanStalePluginPaths(plugins: string[]): string[] {
  return plugins.filter(p => {
    // Keep non-idumb-v2 entries
    if (p === PLUGIN_PACKAGE_NAME) return false
    if (p.includes(`/${PLUGIN_PACKAGE_NAME}`)) return false
    if (p.includes(`\\${PLUGIN_PACKAGE_NAME}`)) return false // Windows
    return true
  })
}

/**
 * Get the base directory for agent/command deployment.
 * Project scope: .opencode/ in project root
 * Global scope: ~/.config/opencode/
 */
function getOpenCodeDir(projectDir: string, scope: "project" | "global"): string {
  if (scope === "global") {
    const home = process.env.HOME || process.env.USERPROFILE || "~"
    return join(home, ".config", "opencode")
  }
  return join(projectDir, ".opencode")
}

/**
 * Deploy all agents, commands, and modules to the user's project.
 */
export async function deployAll(options: DeployOptions): Promise<DeployResult> {
  const { projectDir, language, governance, experience, scope, force } = options
  const resolution = await resolvePluginPath(projectDir)

  const result: DeployResult = {
    deployed: [],
    skipped: [],
    errors: [],
    warnings: [],
    pluginPath: resolution.path,
    pluginMethod: resolution.method,
    opencodConfigUpdated: false,
  }

  // Surface resolution warnings
  if (resolution.warning) {
    result.warnings.push(resolution.warning)
  }

  const openCodeDir = getOpenCodeDir(projectDir, scope)
  const agentsDir = join(openCodeDir, "agents")
  const commandsDir = join(openCodeDir, "commands")
  const modulesDir = join(projectDir, ".idumb", "idumb-modules")

  try {
    // ─── Deploy 3-Agent Team (all auto-deployed on install) ──────
    const agentConfig = { language, governance, experience }

    // Coordinator — top-level orchestrator (Level 0)
    const coordinatorContent = getCoordinatorAgent({
      ...agentConfig,
      pluginPath: resolution.path,
    })
    await writeIfNew(
      join(agentsDir, "idumb-supreme-coordinator.md"),
      coordinatorContent,
      force,
      result,
    )

    // Investigator — research, analysis, planning (Level 1)
    await writeIfNew(
      join(agentsDir, "idumb-investigator.md"),
      getInvestigatorAgent(agentConfig),
      force,
      result,
    )

    // Executor — code implementation, builds, tests (Level 1)
    await writeIfNew(
      join(agentsDir, "idumb-executor.md"),
      getExecutorAgent(agentConfig),
      force,
      result,
    )

    // ─── Deploy Commands ────────────────────────────────────────
    await writeIfNew(
      join(commandsDir, "idumb-init.md"),
      getInitCommand(language),
      force,
      result,
    )
    await writeIfNew(
      join(commandsDir, "idumb-settings.md"),
      getSettingsCommand(language),
      force,
      result,
    )
    await writeIfNew(
      join(commandsDir, "idumb-status.md"),
      getStatusCommand(language),
      force,
      result,
    )
    await writeIfNew(
      join(commandsDir, "idumb-delegate.md"),
      getDelegateCommand(language),
      force,
      result,
    )

    // ─── Deploy Module Templates ────────────────────────────────
    await writeIfNew(
      join(modulesDir, "README.md"),
      MODULES_README_TEMPLATE,
      force,
      result,
    )
    await writeIfNew(
      join(modulesDir, "schemas", "agent-contract.md"),
      AGENT_CONTRACT_TEMPLATE,
      force,
      result,
    )
    await writeIfNew(
      join(modulesDir, "commands", "command-template.md"),
      COMMAND_TEMPLATE,
      force,
      result,
    )
    await writeIfNew(
      join(modulesDir, "workflows", "workflow-template.md"),
      WORKFLOW_TEMPLATE,
      force,
      result,
    )

    // ─── Deploy Agent Profile Templates (reference docs) ─────────
    await writeIfNew(
      join(modulesDir, "agents", "coordinator-profile.md"),
      COORDINATOR_PROFILE,
      force,
      result,
    )
    await writeIfNew(
      join(modulesDir, "agents", "investigator-profile.md"),
      INVESTIGATOR_PROFILE,
      force,
      result,
    )
    await writeIfNew(
      join(modulesDir, "agents", "executor-profile.md"),
      EXECUTOR_PROFILE,
      force,
      result,
    )

    // ─── Deploy Skill Protocol Templates ─────────────────────────
    await writeIfNew(
      join(modulesDir, "skills", "delegation-protocol.md"),
      DELEGATION_SKILL_TEMPLATE,
      force,
      result,
    )
    await writeIfNew(
      join(modulesDir, "skills", "governance-protocol.md"),
      GOVERNANCE_SKILL_TEMPLATE,
      force,
      result,
    )

    // ─── Bootstrap Task Provisioning ─────────────────────────────
    // Pre-create an active epic+task so the meta-builder can write
    // immediately without needing to call idumb_task first.
    // The tool-gate auto-inherits from the task store on first write.
    const tasksPath = join(projectDir, ".idumb", "brain", "tasks.json")
    const bootstrapStore = createBootstrapStore()
    await writeIfNew(
      tasksPath,
      JSON.stringify(bootstrapStore, null, 2) + "\n",
      force,
      result,
    )

    const planningRegistryPath = join(projectDir, ".idumb", "brain", "planning-registry.json")
    const emptyRegistry = createPlanningRegistry()
    await writeIfNew(
      planningRegistryPath,
      JSON.stringify(emptyRegistry, null, 2) + "\n",
      force,
      result,
    )

    // ─── Update opencode.json with plugin path ──────────────────
    try {
      const configPath = scope === "global"
        ? join(getOpenCodeDir(projectDir, "global"), "opencode.json")
        : join(projectDir, "opencode.json")

      let config: Record<string, unknown> = {}
      if (await exists(configPath)) {
        const raw = await readFile(configPath, "utf-8")
        config = JSON.parse(raw) as Record<string, unknown>
      }

      // Clean stale idumb-v2 entries, then add single plugin entry
      // All 9 tools + all hooks are registered via the main package entry
      const existingPlugins = (config.plugin as string[] | undefined) ?? []
      const cleanedPlugins = cleanStalePluginPaths(existingPlugins)
      cleanedPlugins.push(resolution.path)

      config.plugin = cleanedPlugins

      // Log stale entries that were removed
      const removedCount = existingPlugins.length - (cleanedPlugins.length - 1)
      if (removedCount > 0) {
        result.warnings.push(
          `Removed ${removedCount} stale idumb-v2 plugin path(s) from opencode.json`
        )
      }

      // Ensure schema is set
      if (!config["$schema"]) {
        config["$schema"] = "https://opencode.ai/config.json"
      }

      await writeFile(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8")
      result.opencodConfigUpdated = true
      result.deployed.push(configPath)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      result.errors.push(`opencode.json update failed: ${msg}`)
    }

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    result.errors.push(`Deploy failed: ${msg}`)
  }

  return result
}
