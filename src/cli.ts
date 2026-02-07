/**
 * CLI entry point — `npx idumb-v2 init`
 * 
 * Interactive setup that bootstraps iDumb governance in the user's project.
 * Works standalone — does NOT require OpenCode to be running.
 * 
 * Flow:
 * 1. Interactive prompts (scope, language, experience, governance)
 * 2. Brownfield scan (detect frameworks, tech, gaps)
 * 3. Scaffold .idumb/ directory + config.json
 * 4. Deploy meta-builder agent to .opencode/agents/
 * 5. Deploy commands to .opencode/commands/
 * 6. Deploy module templates to .idumb/idumb-modules/
 * 7. Update opencode.json with plugin path
 * 8. Print greeting + next steps
 */

import { createInterface } from "node:readline/promises"
import { stdin, stdout } from "node:process"
import { resolve } from "node:path"
import type { Language, ExperienceLevel, GovernanceMode, InstallScope } from "./schemas/config.js"
import { createConfig } from "./schemas/config.js"
import { scanProject } from "./lib/framework-detector.js"
import { scaffoldProject } from "./lib/scaffolder.js"
import { createLogger } from "./lib/logging.js"
import { deployAll } from "./cli/deploy.js"

// ─── ANSI Colors (no dependencies) ──────────────────────────────────

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
  white: "\x1b[37m",
}

function print(msg: string): void {
  stdout.write(msg + "\n")
}

function banner(): void {
  print("")
  print(`${C.cyan}${C.bold}  🧠 iDumb v2${C.reset}`)
  print(`${C.dim}  Intelligent Delegation Using Managed Boundaries${C.reset}`)
  print(`${C.dim}  Governance substrate for AI coding agents${C.reset}`)
  print("")
}

function divider(): void {
  print(`${C.dim}  ${"─".repeat(50)}${C.reset}`)
}

// ─── Interactive Prompts ─────────────────────────────────────────────

interface PromptChoice<T extends string> {
  value: T
  label: string
  description: string
}

async function promptChoice<T extends string>(
  rl: ReturnType<typeof createInterface>,
  question: string,
  choices: PromptChoice<T>[],
  defaultValue: T,
): Promise<T> {
  print("")
  print(`  ${C.bold}${question}${C.reset}`)
  for (let i = 0; i < choices.length; i++) {
    const c = choices[i]
    const isDefault = c.value === defaultValue
    const marker = isDefault ? `${C.green}→${C.reset}` : " "
    const label = isDefault ? `${C.bold}${c.label}${C.reset}` : c.label
    print(`  ${marker} ${i + 1}. ${label} ${C.dim}— ${c.description}${C.reset}`)
  }

  const answer = await rl.question(`\n  ${C.cyan}Choose [1-${choices.length}]${C.reset} ${C.dim}(default: ${defaultValue})${C.reset}: `)
  const trimmed = answer.trim()

  if (trimmed === "") return defaultValue

  const index = parseInt(trimmed, 10) - 1
  if (index >= 0 && index < choices.length) {
    return choices[index].value
  }

  // Try matching by value
  const match = choices.find(c => c.value === trimmed)
  if (match) return match.value

  return defaultValue
}

async function runPrompts(rl: ReturnType<typeof createInterface>): Promise<{
  scope: InstallScope
  language: Language
  documentsLanguage: Language
  experience: ExperienceLevel
  governance: GovernanceMode
}> {
  const scope = await promptChoice(rl, "Installation scope:", [
    { value: "project" as InstallScope, label: "Project", description: "Install in this project only (.opencode/ + .idumb/)" },
    { value: "global" as InstallScope, label: "Global", description: "Install globally (~/.config/opencode/)" },
  ], "project" as InstallScope)

  const language = await promptChoice(rl, "Communication language:", [
    { value: "en" as Language, label: "English", description: "All output in English" },
    { value: "vi" as Language, label: "Tiếng Việt", description: "Giao tiếp bằng Tiếng Việt" },
  ], "en" as Language)

  const documentsLanguage = await promptChoice(rl, "Document language:", [
    { value: "en" as Language, label: "English", description: "Generated docs in English" },
    { value: "vi" as Language, label: "Tiếng Việt", description: "Tài liệu bằng Tiếng Việt" },
  ], language)

  const experience = await promptChoice(rl, "Experience level:", [
    { value: "beginner" as ExperienceLevel, label: "Beginner", description: "Verbose guidance, explain everything" },
    { value: "guided" as ExperienceLevel, label: "Guided", description: "Balanced — tips when needed (recommended)" },
    { value: "expert" as ExperienceLevel, label: "Expert", description: "Terse output, trust the developer" },
  ], "guided" as ExperienceLevel)

  const governance = await promptChoice(rl, "Governance mode:", [
    { value: "balanced" as GovernanceMode, label: "Balanced", description: "Recommend before stopping. Full completion, governed at decisions." },
    { value: "strict" as GovernanceMode, label: "Strict", description: "Validate at every node. Must pass gate before proceeding." },
    { value: "autonomous" as GovernanceMode, label: "Autonomous", description: "AI decides freely. Minimal intervention, max freedom." },
  ], "balanced" as GovernanceMode)

  return { scope, language, documentsLanguage, experience, governance }
}

// ─── Main ────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const command = args[0] || "init"
  const force = args.includes("--force") || args.includes("-f")
  const nonInteractive = args.includes("--yes") || args.includes("-y")

  if (command === "--help" || command === "-h") {
    banner()
    print(`  ${C.bold}Usage:${C.reset}`)
    print(`    idumb-v2 init       ${C.dim}Initialize iDumb in current project${C.reset}`)
    print(`    idumb-v2 init -f    ${C.dim}Force overwrite existing config${C.reset}`)
    print(`    idumb-v2 init -y    ${C.dim}Use defaults (non-interactive)${C.reset}`)
    print(`    idumb-v2 --help     ${C.dim}Show this help${C.reset}`)
    print("")
    process.exit(0)
  }

  if (command !== "init") {
    print(`${C.red}  Unknown command: ${command}${C.reset}`)
    print(`  Run ${C.cyan}idumb-v2 --help${C.reset} for usage.`)
    process.exit(1)
  }

  banner()

  const projectDir = resolve(process.cwd())
  print(`  ${C.dim}Project: ${projectDir}${C.reset}`)
  divider()

  // ─── Interactive prompts ──────────────────────────────────────
  let choices: {
    scope: InstallScope
    language: Language
    documentsLanguage: Language
    experience: ExperienceLevel
    governance: GovernanceMode
  }

  if (nonInteractive) {
    choices = {
      scope: "project",
      language: "en",
      documentsLanguage: "en",
      experience: "guided",
      governance: "balanced",
    }
    print(`\n  ${C.dim}Using defaults (non-interactive mode)${C.reset}`)
  } else {
    const rl = createInterface({ input: stdin, output: stdout })
    try {
      choices = await runPrompts(rl)
    } finally {
      rl.close()
    }
  }

  divider()
  print(`\n  ${C.yellow}⏳ Scanning project...${C.reset}`)

  // ─── Create logger (writes to .opencode/idumb/logs/) ──────────
  const log = createLogger(projectDir, "idumb-cli")

  // ─── Brownfield scan ──────────────────────────────────────────
  const detection = await scanProject(projectDir, log)

  print(`  ${C.green}✅ Scan complete${C.reset}`)
  if (detection.tech.length > 0) {
    print(`  ${C.dim}   Tech: ${detection.tech.join(", ")}${C.reset}`)
  }
  if (detection.governance.length > 0) {
    print(`  ${C.dim}   Governance: ${detection.governance.join(", ")}${C.reset}`)
  }
  print(`  ${C.dim}   Package manager: ${detection.packageManager}${C.reset}`)
  if (detection.gaps.length > 0) {
    print(`  ${C.yellow}   ⚠ ${detection.gaps.length} issue(s) detected${C.reset}`)
  }

  // ─── Create config ────────────────────────────────────────────
  const config = createConfig({
    scope: choices.scope,
    experienceLevel: choices.experience,
    communicationLanguage: choices.language,
    documentsLanguage: choices.documentsLanguage,
    governanceMode: choices.governance,
    detection,
  })

  // ─── Scaffold .idumb/ ─────────────────────────────────────────
  print(`\n  ${C.yellow}⏳ Creating .idumb/ structure...${C.reset}`)
  const scaffoldResult = await scaffoldProject(projectDir, config, force, log)

  if (!scaffoldResult.success) {
    print(`  ${C.red}❌ Scaffold failed${C.reset}`)
    scaffoldResult.errors.forEach(e => print(`  ${C.red}   ${e}${C.reset}`))
    process.exit(1)
  }
  print(`  ${C.green}✅ .idumb/ created (${scaffoldResult.created.length} items)${C.reset}`)

  // ─── Deploy agents + commands + modules ───────────────────────
  print(`\n  ${C.yellow}⏳ Deploying agents and commands...${C.reset}`)
  const deployResult = await deployAll({
    projectDir,
    language: choices.language,
    governance: choices.governance,
    experience: choices.experience,
    scope: choices.scope,
    force,
  })

  if (deployResult.deployed.length > 0) {
    print(`  ${C.green}✅ Deployed ${deployResult.deployed.length} files:${C.reset}`)
    for (const f of deployResult.deployed) {
      const rel = f.startsWith(projectDir) ? f.slice(projectDir.length + 1) : f
      print(`  ${C.dim}   + ${rel}${C.reset}`)
    }
  }
  if (deployResult.skipped.length > 0) {
    print(`  ${C.dim}   Skipped ${deployResult.skipped.length} (already exist)${C.reset}`)
  }
  if (deployResult.errors.length > 0) {
    print(`  ${C.red}   ❌ ${deployResult.errors.length} error(s):${C.reset}`)
    deployResult.errors.forEach(e => print(`  ${C.red}     ${e}${C.reset}`))
  }
  if (deployResult.warnings.length > 0) {
    print(`  ${C.yellow}   ⚠ ${deployResult.warnings.length} warning(s):${C.reset}`)
    deployResult.warnings.forEach(w => print(`  ${C.yellow}     ${w}${C.reset}`))
  }

  // ─── Success summary ──────────────────────────────────────────
  divider()
  print("")
  print(`  ${C.green}${C.bold}✅ iDumb is ready!${C.reset}`)
  print("")

  const methodLabel = deployResult.pluginMethod === "npm"
    ? `${C.green}npm (stable)${C.reset}`
    : deployResult.pluginMethod === "local-dev"
      ? `${C.cyan}local dev${C.reset}`
      : `${C.yellow}fallback (unstable)${C.reset}`

  if (choices.language === "vi") {
    print(`  ${C.bold}Bước tiếp theo:${C.reset}`)
    print(`  ${C.cyan}1.${C.reset} Khởi động OpenCode: ${C.bold}opencode${C.reset}`)
    print(`  ${C.cyan}2.${C.reset} Chuyển sang Meta Builder agent (nhấn ${C.bold}Tab${C.reset})`)
    print(`  ${C.cyan}3.${C.reset} Hoặc chạy: ${C.bold}/idumb-init${C.reset}`)
    print("")
    print(`  ${C.dim}Plugin path: ${deployResult.pluginPath}${C.reset}`)
    print(`  ${C.dim}Resolution:  ${methodLabel}${C.reset}`)
    if (deployResult.opencodConfigUpdated) {
      print(`  ${C.dim}Plugin đã được thêm vào opencode.json${C.reset}`)
    }
    if (deployResult.pluginMethod === "npx-fallback") {
      print(`  ${C.yellow}⚠ Để ổn định, hãy chạy: ${C.bold}npm install idumb-v2${C.reset}`)
    }
  } else {
    print(`  ${C.bold}Next steps:${C.reset}`)
    print(`  ${C.cyan}1.${C.reset} Start OpenCode: ${C.bold}opencode${C.reset}`)
    print(`  ${C.cyan}2.${C.reset} Switch to the Meta Builder agent (press ${C.bold}Tab${C.reset})`)
    print(`  ${C.cyan}3.${C.reset} Or run: ${C.bold}/idumb-init${C.reset}`)
    print("")
    print(`  ${C.dim}Plugin path: ${deployResult.pluginPath}${C.reset}`)
    print(`  ${C.dim}Resolution:  ${methodLabel}${C.reset}`)
    if (deployResult.opencodConfigUpdated) {
      print(`  ${C.dim}Plugin added to opencode.json automatically${C.reset}`)
    } else {
      print(`  ${C.dim}Add to opencode.json if not already there:${C.reset}`)
      print(`  ${C.dim}  "plugin": ["${deployResult.pluginPath}"]${C.reset}`)
    }
    if (deployResult.pluginMethod === "npx-fallback") {
      print(`  ${C.yellow}⚠ For a stable setup, run: ${C.bold}npm install idumb-v2${C.reset}`)
    }
  }

  print("")
}

main().catch((err) => {
  print(`\n  ${C.red}❌ Fatal error: ${err instanceof Error ? err.message : String(err)}${C.reset}`)
  process.exit(1)
})
