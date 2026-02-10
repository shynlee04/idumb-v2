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
 * - Budget-capped: ≤250 tokens (~1000 chars). ADD, not REPLACE.
 *
 * P3: try/catch — never break message delivery
 * P5: Config cached in closure — single disk read on first call
 */

import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { getAnchors } from "./compaction.js"
import { stateManager } from "../lib/persistence.js"
import { getActiveWorkChain, detectGraphBreaks } from "../schemas/task-graph.js"
import { formatPlanStateCompact } from "../schemas/plan-state.js"
import type { Logger } from "../lib/index.js"
import type { IdumbConfig, GovernanceFramework } from "../schemas/config.js"

/** Hard budget: ~250 tokens at ~4 chars/token.
 * Increased from 800 → 1000 after gap analysis showed worst-case
 * injection (plan + task + checkpoints + framework + mode + anchors)
 * could reach ~945 chars, causing critical anchors to be truncated. */
const BUDGET_CHARS = 1000

/** Default English "no active task" message — extracted to constant
 * so i18n replacement uses identity check instead of fragile indexOf. */
const NO_ACTIVE_TASK_MSG = "No active task. Use govern_task to start one before writing files."

/**
 * Translation map for governance strings.
 * Supports Vietnamese + English (the two configured languages).
 */
const TRANSLATIONS: Record<string, Record<string, string>> = {
  "vi": {
    "no_active_task": "Chưa có task. Dùng govern_task để bắt đầu trước khi viết file.",
    "balanced_mode": "Cân bằng: đề xuất trước khi dừng. Cho phép hoàn thành, kiểm soát ở quyết định.",
    "strict_mode": "Nghiêm ngặt: xác minh mỗi bước. Cần bằng chứng trước khi tiếp tục.",
    "autonomous_mode": "Tự trị: bạn quyết định. Ghi lại hành động để xem lại sau.",
    "retard_mode": "Tối đa: thách thức mọi giả định. Xác minh mọi tuyên bố.",
  },
  "en": {}, // English is the default — uses existing strings
}

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
 * Supports language-aware injection (Vietnamese + English).
 */
function getModeContext(mode: string, lang: string = "en"): string {
  const t = TRANSLATIONS[lang] ?? {}
  switch (mode) {
    case "strict":
      return t["strict_mode"] ?? "Strict governance: validate at every step. Evidence required before proceeding."
    case "autonomous":
      return t["autonomous_mode"] ?? "Autonomous governance: you decide freely. Log actions for post-session review."
    case "retard":
      return t["retard_mode"] ?? "Maximum autonomy. Challenge every assumption. Verify every claim. Trust nothing."
    default: // "balanced"
      return t["balanced_mode"] ?? "Balanced governance: recommend before stopping. Full completion allowed, governed at decisions."
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
      const task = stateManager.getActiveTask(sessionID)
      const anchors = getAnchors(sessionID)
      const criticalAnchors = anchors.filter(a => a.priority === "critical")

      const lines: string[] = []
      lines.push("<idumb-governance>")

      // ─── Active chain context (WorkPlan + TaskNode + checkpoints) ────
      const graph = stateManager.getTaskGraph()
      const chain = getActiveWorkChain(graph)

      if (chain.workPlan) {
        const completedTasks = chain.workPlan.tasks.filter(t => t.status === "completed").length
        const totalTasks = chain.workPlan.tasks.length
        lines.push(`Plan: "${chain.workPlan.name}" (${completedTasks}/${totalTasks} tasks)`)

        if (chain.taskNode) {
          lines.push(`Task: "${chain.taskNode.name}" [${chain.taskNode.assignedTo}]`)
          if (chain.taskNode.expectedOutput) {
            lines.push(`Expected: ${chain.taskNode.expectedOutput}`)
          }
          // Delegation context
          if (chain.taskNode.delegatedBy && chain.taskNode.delegatedBy !== chain.taskNode.assignedTo) {
            lines.push(`Delegated by: ${chain.taskNode.delegatedBy}`)
          }
          // Recent checkpoints (last 2 for budget)
          if (chain.recentCheckpoints.length > 0) {
            const recent = chain.recentCheckpoints.slice(-2)
            lines.push(`Checkpoints: ${chain.taskNode.checkpoints.length} (${recent.map(c => c.tool + ": " + c.summary.slice(0, 30)).join("; ")})`)
          }
        } else {
          lines.push(NO_ACTIVE_TASK_MSG)
        }

        // Plan-ahead visibility (next planned task)
        if (chain.nextPlanned && chain.nextPlanned.id !== chain.taskNode?.id) {
          lines.push(`Next: "${chain.nextPlanned.name}" -> ${chain.nextPlanned.assignedTo}`)
        }
      } else if (task) {
        // Fallback: legacy TaskStore-based task (no WorkPlan active)
        lines.push(`Active task: ${task.name}`)
      } else {
        lines.push(NO_ACTIVE_TASK_MSG)
      }

      // ─── Plan state awareness ─────────────────────────────────────
      const planState = stateManager.getPlanState()
      if (planState.phases.length > 0) {
        lines.push(formatPlanStateCompact(planState))
      }

      // ─── Graph warnings (first only, to stay in budget) ───────────
      const graphWarnings = detectGraphBreaks(graph)
      if (graphWarnings.length > 0) {
        lines.push(`⚠ ${graphWarnings[0].message}`)
      }

      // ─── Critical anchors (max 2, HIGH PRIORITY — injected before framework
      //     overlay so they survive budget truncation) ──────────────────────
      if (criticalAnchors.length > 0) {
        for (const a of criticalAnchors.slice(0, 2)) {
          lines.push(`Decision: ${a.content}`)
        }
      }

      // ─── Config-driven context ──────────────────────────────────────
      if (config) {
        const frameworks = config.detection?.governance ?? []
        const lang = config.user?.language?.communication ?? "en"
        lines.push(getFrameworkOverlay(frameworks))
        lines.push(getModeContext(config.governance?.mode ?? "balanced", lang))

        // Language-aware "no active task" (replace default if Vietnamese)
        if (lang !== "en" && !task && !chain.taskNode) {
          const t = TRANSLATIONS[lang]
          if (t?.["no_active_task"]) {
            // Use constant reference instead of fragile string matching
            const idx = lines.indexOf(NO_ACTIVE_TASK_MSG)
            if (idx !== -1) {
              lines[idx] = t["no_active_task"]
            }
          }
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
