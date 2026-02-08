/**
 * System Prompt Transform — config-aware governance context injection.
 *
 * Two-moment injection model (per user journey design):
 * 1. This hook fires at session start via `experimental.chat.system.transform`
 * 2. Compaction hook fires via `experimental.session.compacting`
 *
 * All other hooks capture state silently — zero tokens into conversation.
 *
 * Design principles:
 * - INSTRUCTIVE, not restrictive — no "you cannot" / "RULE: Do not"
 * - PULL model — agents query tools when THEY need context
 * - Framework WRAPPER — overlays match detected governance framework
 * - Budget-capped: ≤200 tokens (~800 chars). ADD, not REPLACE.
 *
 * P3: try/catch — never break message delivery
 * P5: Config cached in closure — single disk read on first call
 */

import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { getActiveTask } from "./tool-gate.js"
import { getAnchors } from "./compaction.js"
import type { Logger } from "../lib/index.js"
import type { IdumbConfig, GovernanceFramework } from "../schemas/config.js"

/** Hard budget: ~200 tokens at ~4 chars/token */
const BUDGET_CHARS = 800

/**
 * Framework-specific overlay messages.
 * Tells the agent what workflow context exists — never restricts.
 */
function getFrameworkOverlay(frameworks: GovernanceFramework[]): string {
  if (frameworks.includes("gsd")) {
    return "This project uses GSD. GSD phases map to WorkPlans. Use GSD commands for workflow. iDumb governance tracks progress through govern_plan."
  }
  if (frameworks.includes("spec-kit")) {
    return "This project uses Spec-kit. Spec stages map to WorkPlans. Follow spec-driven flow. iDumb governance tracks deliverables through govern_task."
  }
  if (frameworks.includes("bmad")) {
    return "This project uses BMAD. BMAD stages map to WorkPlans. Follow BMAD methodology. iDumb governance tracks deliverables through govern_task."
  }
  return "Use govern_plan and govern_task to track your work. Use innate tools (grep, glob, read) for exploration."
}

/**
 * Governance mode context — instructs the agent on behavior expectations.
 */
function getModeContext(mode: string): string {
  switch (mode) {
    case "strict":
      return "Strict governance: validate at every step. Evidence required before proceeding."
    case "autonomous":
      return "Autonomous governance: you decide freely. Log actions for post-session review."
    case "retard":
      return "Maximum autonomy. Challenge every assumption. Verify every claim. Trust nothing."
    default: // "balanced"
      return "Balanced governance: recommend before stopping. Full completion allowed, governed at decisions."
  }
}

/**
 * Creates the system prompt transform hook.
 *
 * Hook factory pattern — captures directory + logger.
 * Config is lazy-loaded on first invocation and cached.
 *
 * @param log - TUI-safe file logger
 * @param directory - Project root (from PluginInput.directory)
 */
export function createSystemHook(log: Logger, directory: string) {
  let cachedConfig: IdumbConfig | null = null
  let configLoadAttempted = false

  /** Load config.json once, cache forever (until plugin reloads) */
  async function loadConfig(): Promise<IdumbConfig | null> {
    if (configLoadAttempted) return cachedConfig
    configLoadAttempted = true

    try {
      const configPath = join(directory, ".idumb", "config.json")
      const raw = await readFile(configPath, "utf-8")
      cachedConfig = JSON.parse(raw) as IdumbConfig
      log.debug("Config loaded for system hook", {
        mode: cachedConfig.governance?.mode,
        frameworks: cachedConfig.detection?.governance,
      })
    } catch (err) {
      // P3: Missing config = graceful degradation, not a crash
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.includes("ENOENT")) {
        log.warn(`Config load failed: ${msg}`)
      }
    }
    return cachedConfig
  }

  return async (
    input: { sessionID?: string; model: unknown },
    output: { system: string[] },
  ): Promise<void> => {
    try {
      const sessionID = input.sessionID
      if (!sessionID) return

      const config = await loadConfig()
      const task = getActiveTask(sessionID)
      const anchors = getAnchors(sessionID)
      const criticalAnchors = anchors.filter(a => a.priority === "critical")

      const lines: string[] = []
      lines.push("<idumb-governance>")

      // ─── Active task context ────────────────────────────────────────
      if (task) {
        lines.push(`Active task: ${task.name}`)
      } else {
        lines.push("No active task. Use govern_task to start one before writing files.")
      }

      // ─── Config-driven context ──────────────────────────────────────
      if (config) {
        const frameworks = config.detection?.governance ?? []
        lines.push(getFrameworkOverlay(frameworks))
        lines.push(getModeContext(config.governance?.mode ?? "balanced"))
      }

      // ─── Critical anchors (max 2 to stay in budget) ─────────────────
      if (criticalAnchors.length > 0) {
        for (const a of criticalAnchors.slice(0, 2)) {
          lines.push(`Decision: ${a.content}`)
        }
      }

      lines.push("</idumb-governance>")

      // ─── Budget enforcement ─────────────────────────────────────────
      let injection = lines.join("\n")
      if (injection.length > BUDGET_CHARS) {
        // Truncate to budget, keeping the closing tag
        injection = injection.slice(0, BUDGET_CHARS - 25) + "\n</idumb-governance>"
        log.warn("System injection truncated to budget", {
          original: lines.join("\n").length,
          truncated: injection.length,
          budget: BUDGET_CHARS,
        })
      }

      output.system.push(injection)

      log.debug("System prompt injected", {
        sessionID,
        hasTask: !!task,
        hasConfig: !!config,
        criticalAnchors: criticalAnchors.length,
        chars: injection.length,
      })
    } catch (error) {
      // P3: Never break message delivery
      log.error(`System hook error: ${error}`)
    }
  }
}
