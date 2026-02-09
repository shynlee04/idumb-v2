/**
 * Config schema — the first thing idumb-init creates, the first thing everything reads.
 * 
 * Plain TypeScript interfaces (DON'T #9: no Zod for internal state).
 * 
 * Responsibility: Define installation config structure, governance modes,
 * language preferences, and experience levels.
 * 
 * Consumers: init tool (creates), supreme coordinator (reads), all hooks (reference)
 */

// ─── Enums ───────────────────────────────────────────────────────────

/** Supported languages for communication and generated documents */
export type Language = "en" | "vi"

/** Installation scope — project-level or global */
export type InstallScope = "project" | "global"

/** User experience level — affects verbosity, hand-holding, and defaults */
export type ExperienceLevel = "beginner" | "guided" | "expert"

/**
 * Governance mode — how strict iDumb controls the agent.
 * 
 * balanced (default): Agents get recommendations + correct choices before stopping.
 *   Full completion of work allowed, but governed at decision boundaries.
 * 
 * strict: Incremental validation at ALL nodes. Tests and checks at every step.
 *   Agent must pass gate before proceeding to next task.
 * 
 * autonomous: "You take the wheel" — agent decides freely.
 *   Showcases raw AI intelligence. Minimal intervention, maximum freedom.
 *   Still logs everything for post-session review.
 * 
 * retard: 🔥 Easter egg mode. "I am retard" — full autonomous freedom WITH
 *   expert-level guardrails and explanatory advice. iDumb becomes bitchy, bossy,
 *   skeptical as fuck. Challenges every decision, roasts bad code, demands evidence.
 *   Think: autonomous intelligence + zero-trust personality + Gordon Ramsay attitude.
 *   Hidden behind expert level selection in CLI.
 */
export type GovernanceMode = "balanced" | "strict" | "autonomous" | "retard"

/** Dashboard service state — set at init (Q6), changeable via /idumb-settings */
export type DashboardMode = "enabled" | "disabled" | "deferred"

// ─── Detected Frameworks ─────────────────────────────────────────────

/** Known governance/methodology frameworks we detect */
export type GovernanceFramework = "bmad" | "gsd" | "spec-kit" | "open-spec" | "custom" | "none"

/** Known tech stack frameworks we detect */
export type TechFramework =
  | "nextjs" | "react" | "vue" | "nuxt" | "svelte" | "sveltekit"
  | "angular" | "express" | "fastify" | "nestjs" | "astro" | "remix"
  | "django" | "flask" | "rails" | "laravel" | "spring"
  | "typescript" | "javascript" | "python" | "rust" | "go"
  | "unknown"

/** Individual code smell — a specific issue found in a specific file */
export interface CodeSmell {
  file: string                   // relative path
  line?: number                  // approximate line number (0 = whole file)
  severity: "info" | "warning" | "critical"
  category: "spaghetti" | "god-file" | "dead-code" | "coupling" | "missing-tests" | "naming" | "security" | "todo-debt"
  message: string                // human-readable description
  roast?: string                 // savage mode commentary — present in CLI display, stripped from persistence
}

/** Aggregated code quality report — produced by the code scanner */
export interface CodeQualityReport {
  grade: "A" | "B" | "C" | "D" | "F"
  score: number                  // 0-100
  totalFiles: number
  totalLines: number
  smells: CodeSmell[]
  stats: {
    avgFileLength: number        // average lines per file
    maxFileLength: number        // biggest file
    maxFileName: string          // which file is the monster
    filesOver300Lines: number    // "god files"
    filesOver500Lines: number    // "mega files"
    functionsOver50Lines: number // long functions detected
    todoCount: number            // TODO/FIXME/HACK density
    consoleLogCount: number      // console.log in non-test files
    deepNesting: number          // files with 5+ indent levels
  }
}

/** Result of framework detection scan */
export interface FrameworkDetection {
  governance: GovernanceFramework[]
  tech: TechFramework[]
  packageManager: "npm" | "yarn" | "pnpm" | "bun" | "pip" | "cargo" | "go" | "unknown"
  hasMonorepo: boolean
  existingAgentDirs: string[]    // e.g. [".opencode/agents", ".claude/agents"]
  existingCommandDirs: string[]  // e.g. [".opencode/command"]
  conflicts: string[]            // things that may clash with .idumb/
  gaps: string[]                 // detected issues (stale files, missing configs, etc.)
  codeQuality?: CodeQualityReport  // code quality analysis (if scan ran deep enough)
}

// ─── Config Structure ────────────────────────────────────────────────

/** The .idumb/config.json structure — created by init, read by everything */
export interface IdumbConfig {
  version: string
  installedAt: string            // ISO-8601
  scope: InstallScope

  user: {
    experienceLevel: ExperienceLevel
    language: {
      communication: Language     // language for chat/greeting
      documents: Language         // language for generated .md files
    }
  }

  governance: {
    mode: GovernanceMode
    personality?: "professional" | "savage"  // savage = retard mode's bitchy personality
  }

  detection: FrameworkDetection   // snapshot of what init found

  services: {
    dashboard: DashboardMode      // "enabled" | "disabled" | "deferred" — set at init Q6
  }

  paths: {
    root: string                  // ".idumb/"
    config: string                // ".idumb/config.json"
    brain: string                 // ".idumb/brain/"
    index: string                 // ".idumb/brain/index/"
    modules: string               // ".idumb/modules/"
  }
}

// ─── Defaults ────────────────────────────────────────────────────────

export const CONFIG_VERSION = "1.0.0"

export const DEFAULT_PATHS: IdumbConfig["paths"] = {
  root: ".idumb/",
  config: ".idumb/config.json",
  brain: ".idumb/brain/",
  index: ".idumb/brain/index/",
  modules: ".idumb/modules/",
}

export const DEFAULT_DETECTION: FrameworkDetection = {
  governance: [],
  tech: [],
  packageManager: "unknown",
  hasMonorepo: false,
  existingAgentDirs: [],
  existingCommandDirs: [],
  conflicts: [],
  gaps: [],
}

/** Create a config with sensible defaults, overridden by user choices */
export function createConfig(overrides: {
  scope?: InstallScope
  experienceLevel?: ExperienceLevel
  communicationLanguage?: Language
  documentsLanguage?: Language
  governanceMode?: GovernanceMode
  dashboard?: DashboardMode
  detection?: FrameworkDetection
}): IdumbConfig {
  return {
    version: CONFIG_VERSION,
    installedAt: new Date().toISOString(),
    scope: overrides.scope ?? "project",
    user: {
      experienceLevel: overrides.experienceLevel ?? "guided",
      language: {
        communication: overrides.communicationLanguage ?? "en",
        documents: overrides.documentsLanguage ?? "en",
      },
    },
    governance: {
      mode: overrides.governanceMode ?? "balanced",
      personality: overrides.governanceMode === "retard" ? "savage" : "professional",
    },
    detection: overrides.detection ?? DEFAULT_DETECTION,
    services: {
      dashboard: overrides.dashboard ?? "disabled",
    },
    paths: { ...DEFAULT_PATHS },
  }
}

/**
 * Summarize a code quality report for config persistence.
 *
 * The full scanner can produce 300+ smells on a React project.
 * Storing all of them in config.json causes agents to loop for hours
 * because the coordinator template reads config.json every session.
 *
 * This function:
 * 1. Keeps grade, score, stats (all lightweight, all accurate)
 * 2. Caps smells to top N (criticals first, then warnings)
 * 3. Strips roasts from persisted smells (CLI-only display concern)
 */
export function summarizeCodeQuality(
  report: CodeQualityReport,
  maxSmells: number = 10,
): CodeQualityReport {
  const criticals = report.smells.filter(s => s.severity === "critical")
  const warnings = report.smells.filter(s => s.severity === "warning")
  const infos = report.smells.filter(s => s.severity === "info")
  const topSmells = [...criticals, ...warnings, ...infos].slice(0, maxSmells)

  // Strip roasts — they're for CLI entertainment, not persistence
  const cleanSmells: CodeSmell[] = topSmells.map(({ roast: _, ...rest }) => rest)

  return {
    ...report,
    smells: cleanSmells,
  }
}

/** Validate a parsed config has required fields — returns error messages or empty */
export function validateConfig(config: unknown): string[] {
  const errors: string[] = []
  if (!config || typeof config !== "object") {
    return ["Config is not an object"]
  }

  const c = config as Record<string, unknown>
  if (!c.version) errors.push("Missing version")
  if (!c.user) errors.push("Missing user section")
  if (!c.governance) errors.push("Missing governance section")
  if (!c.paths) errors.push("Missing paths section")

  if (c.user && typeof c.user === "object") {
    const u = c.user as Record<string, unknown>
    if (!u.experienceLevel) errors.push("Missing user.experienceLevel")
    if (!u.language) errors.push("Missing user.language")
  }

  if (c.governance && typeof c.governance === "object") {
    const g = c.governance as Record<string, unknown>
    if (!g.mode) errors.push("Missing governance.mode")
  }

  return errors
}
