/**
 * Deploy module — deploys agents, commands, and module templates to the user's project.
 *
 * Called by the CLI after interactive setup.
 * Writes to .opencode/agents/, .opencode/commands/, and .idumb/modules/.
 *
 * Two write strategies:
 *   - Derived files (agents, commands, module templates): ALWAYS overwritten —
 *     they are regenerated from source templates.
 *   - State files (tasks.json, graph.json, registry.json, plan.json): created if missing,
 *     preserved if existing (writeIfNew). These contain user work and must not be clobbered.
 */

import { mkdir, writeFile, stat, rename } from "node:fs/promises"
import { join, dirname } from "node:path"
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
import { createDefaultPlanState } from "../schemas/plan-state.js"
import { createBootstrapTaskGraph } from "../schemas/work-plan.js"

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
 * Write a derived file — ALWAYS overwrites, regardless of force flag.
 *
 * Derived files (agents, commands, module templates) are regenerated from
 * source templates on every init. Unlike state files (tasks.json, config.json),
 * losing a derived file's previous content is harmless — it's just a template.
 */
async function writeDerived(path: string, content: string, result: DeployResult): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, content, "utf-8")
  result.deployed.push(path)
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

  const result: DeployResult = {
    deployed: [],
    skipped: [],
    errors: [],
    warnings: [],
  }

  const openCodeDir = getOpenCodeDir(projectDir, scope)
  const agentsDir = join(openCodeDir, "agents")
  const commandsDir = join(openCodeDir, "commands")
  const modulesDir = join(projectDir, ".idumb", "modules")

  try {
    // ─── Deploy 3-Agent Team (all auto-deployed on install) ──────
    const agentConfig = { language, governance, experience }

    // Coordinator — top-level orchestrator (Level 0)
    const coordinatorContent = getCoordinatorAgent(agentConfig)
    await writeDerived(
      join(agentsDir, "idumb-supreme-coordinator.md"),
      coordinatorContent,
      result,
    )

    // Investigator — research, analysis, planning (Level 1)
    await writeDerived(
      join(agentsDir, "idumb-investigator.md"),
      getInvestigatorAgent(agentConfig),
      result,
    )

    // Executor — code implementation, builds, tests (Level 1)
    await writeDerived(
      join(agentsDir, "idumb-executor.md"),
      getExecutorAgent(agentConfig),
      result,
    )

    // ─── Deploy Commands ────────────────────────────────────────
    await writeDerived(
      join(commandsDir, "idumb-init.md"),
      getInitCommand(language),
      result,
    )
    await writeDerived(
      join(commandsDir, "idumb-settings.md"),
      getSettingsCommand(language),
      result,
    )
    await writeDerived(
      join(commandsDir, "idumb-status.md"),
      getStatusCommand(language),
      result,
    )
    await writeDerived(
      join(commandsDir, "idumb-delegate.md"),
      getDelegateCommand(language),
      result,
    )

    // ─── Deploy Module Templates ────────────────────────────────
    await writeDerived(
      join(modulesDir, "README.md"),
      MODULES_README_TEMPLATE,
      result,
    )
    await writeDerived(
      join(modulesDir, "schemas", "agent-contract.md"),
      AGENT_CONTRACT_TEMPLATE,
      result,
    )
    await writeDerived(
      join(modulesDir, "templates", "command-template.md"),
      COMMAND_TEMPLATE,
      result,
    )
    await writeDerived(
      join(modulesDir, "templates", "workflow-template.md"),
      WORKFLOW_TEMPLATE,
      result,
    )

    // ─── Deploy Agent Profile Templates (reference docs) ─────────
    await writeDerived(
      join(modulesDir, "agents", "coordinator-profile.md"),
      COORDINATOR_PROFILE,
      result,
    )
    await writeDerived(
      join(modulesDir, "agents", "investigator-profile.md"),
      INVESTIGATOR_PROFILE,
      result,
    )
    await writeDerived(
      join(modulesDir, "agents", "executor-profile.md"),
      EXECUTOR_PROFILE,
      result,
    )

    // ─── Deploy Skill Protocol Templates ─────────────────────────
    await writeDerived(
      join(modulesDir, "skills", "delegation-protocol.md"),
      DELEGATION_SKILL_TEMPLATE,
      result,
    )
    await writeDerived(
      join(modulesDir, "skills", "governance-protocol.md"),
      GOVERNANCE_SKILL_TEMPLATE,
      result,
    )

    // ─── Bootstrap Task Provisioning ─────────────────────────────
    // Pre-create an active epic+task so agents can write
    // immediately without needing to call tasks_start first.
    const tasksPath = join(projectDir, ".idumb", "brain", "tasks.json")
    const bootstrapStore = createBootstrapStore()
    await writeIfNew(
      tasksPath,
      JSON.stringify(bootstrapStore, null, 2) + "\n",
      force,
      result,
    )

    // ─── Bootstrap Task Graph (v3) ──────────────────────────────
    const taskGraphPath = join(projectDir, ".idumb", "brain", "graph.json")
    const legacyTaskGraphPath = join(projectDir, ".idumb", "brain", "task-graph.json")

    // Migrate legacy task-graph.json → graph.json if it exists and graph.json does not
    if (!(await exists(taskGraphPath)) && await exists(legacyTaskGraphPath)) {
      await rename(legacyTaskGraphPath, taskGraphPath)
      result.deployed.push(taskGraphPath)
      result.warnings.push("Migrated legacy task-graph.json to graph.json")
    } else {
      const bootstrapGraph = createBootstrapTaskGraph()
      await writeIfNew(
          taskGraphPath,
          JSON.stringify(bootstrapGraph, null, 2) + "\n",
          force,
          result,
      )
    }

    const planningRegistryPath = join(projectDir, ".idumb", "brain", "registry.json")
    const emptyRegistry = createPlanningRegistry()
    await writeIfNew(
      planningRegistryPath,
      JSON.stringify(emptyRegistry, null, 2) + "\n",
      force,
      result,
    )

    const planStatePath = join(projectDir, ".idumb", "brain", "plan.json")
    const defaultPlanState = createDefaultPlanState()
    await writeIfNew(
      planStatePath,
      JSON.stringify(defaultPlanState, null, 2) + "\n",
      force,
      result,
    )

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    result.errors.push(`Deploy failed: ${msg}`)
  }

  return result
}
