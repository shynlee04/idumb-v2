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
  getMetaBuilderAgent,
  getInitCommand,
  getSettingsCommand,
  getStatusCommand,
  AGENT_CONTRACT_TEMPLATE,
  MODULES_README_TEMPLATE,
  COMMAND_TEMPLATE,
  WORKFLOW_TEMPLATE,
  SUPREME_COORDINATOR_PROFILE,
  BUILDER_PROFILE,
  VALIDATOR_PROFILE,
  SKILLS_CREATOR_PROFILE,
} from "../templates.js"
import { createBootstrapStore } from "../schemas/task.js"

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
  pluginPath: string
  opencodConfigUpdated: boolean
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

/**
 * Resolve the plugin path — where the idumb-v2 package lives.
 * This is what goes into opencode.json "plugin" array.
 */
function resolvePluginPath(projectDir: string): string {
  // Check if we're running from node_modules (npm install idumb-v2)
  const thisFile = new URL(import.meta.url).pathname

  if (thisFile.includes("node_modules/idumb-v2")) {
    // Installed as dependency — use relative path
    return "./node_modules/idumb-v2"
  }

  // Running from cloned repo or npx — use the package root
  // Go up from src/cli/deploy.js → package root
  const packageRoot = resolve(dirname(thisFile), "..", "..")

  // If package root is inside the project, use relative path
  if (packageRoot.startsWith(projectDir)) {
    return "./" + packageRoot.slice(projectDir.length + 1)
  }

  // Otherwise use absolute path
  return packageRoot
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
  const pluginPath = resolvePluginPath(projectDir)

  const result: DeployResult = {
    deployed: [],
    skipped: [],
    errors: [],
    pluginPath,
    opencodConfigUpdated: false,
  }

  const openCodeDir = getOpenCodeDir(projectDir, scope)
  const agentsDir = join(openCodeDir, "agents")
  const commandsDir = join(openCodeDir, "commands")
  const modulesDir = join(projectDir, ".idumb", "idumb-modules")

  try {
    // ─── Deploy Meta Builder Agent ──────────────────────────────
    const metaBuilderContent = getMetaBuilderAgent({
      language,
      governance,
      experience,
      pluginPath,
    })
    await writeIfNew(
      join(agentsDir, "idumb-meta-builder.md"),
      metaBuilderContent,
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

    // ─── Deploy Sub-Agent Profile Templates ──────────────────────
    await writeIfNew(
      join(modulesDir, "agents", "supreme-coordinator-profile.md"),
      SUPREME_COORDINATOR_PROFILE,
      force,
      result,
    )
    await writeIfNew(
      join(modulesDir, "agents", "builder-profile.md"),
      BUILDER_PROFILE,
      force,
      result,
    )
    await writeIfNew(
      join(modulesDir, "agents", "validator-profile.md"),
      VALIDATOR_PROFILE,
      force,
      result,
    )
    await writeIfNew(
      join(modulesDir, "agents", "skills-creator-profile.md"),
      SKILLS_CREATOR_PROFILE,
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

      // Add plugin if not already present
      const plugins = (config.plugin as string[] | undefined) ?? []
      if (!plugins.includes(pluginPath)) {
        plugins.push(pluginPath)
        config.plugin = plugins

        // Ensure schema is set
        if (!config["$schema"]) {
          config["$schema"] = "https://opencode.ai/config.json"
        }

        await writeFile(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8")
        result.opencodConfigUpdated = true
        result.deployed.push(configPath)
      } else {
        result.skipped.push(configPath + " (plugin already registered)")
      }
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
