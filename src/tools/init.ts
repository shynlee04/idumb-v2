/**
 * Init Tool
 * 
 * The `/idumb-init` entry point. Scans the codebase, scaffolds .idumb/,
 * writes scan results to .idumb/brain/context/scan-result.json.
 * 
 * Phase 1: SCAN (automatic, no questions)
 * Phase 2: ASK (handled by LLM after scan results are returned)
 */

import { z } from "zod"
import { existsSync, mkdirSync } from "fs"
import { join } from "path"
import { tool } from "../types/plugin.js"
import { scanCodebase } from "../engines/scanner.js"
import { writeJson } from "../lib/persistence.js"
import { ScanResultSchema } from "../schemas/scan.js"

// ============================================================================
// PATHS
// ============================================================================

const SCAN_RESULT_FILE = ".idumb/brain/context/scan-result.json"

// Full .idumb tree structure to scaffold
const IDUMB_DIRS = [
  ".idumb/anchors",
  ".idumb/brain/context",
  ".idumb/brain/drift",
  ".idumb/brain/governance/validations",
  ".idumb/brain/history",
  ".idumb/brain/metadata",
  ".idumb/brain/sessions",
  ".idumb/governance",
  ".idumb/modules",
  ".idumb/project-output/phases",
  ".idumb/project-output/research",
  ".idumb/project-output/roadmaps",
  ".idumb/project-output/validations",
  ".idumb/sessions",
  ".idumb/signals",
]

// ============================================================================
// SCAFFOLD
// ============================================================================

/**
 * Ensure the full .idumb/ directory tree exists
 */
function scaffoldIdumbTree(directory: string): string[] {
  const created: string[] = []

  for (const dir of IDUMB_DIRS) {
    const fullPath = join(directory, dir)
    if (!existsSync(fullPath)) {
      mkdirSync(fullPath, { recursive: true })
      created.push(dir)
    }
  }

  return created
}

// ============================================================================
// FORMAT OUTPUT
// ============================================================================

function formatScanOutput(result: z.infer<typeof ScanResultSchema>, createdDirs: string[]): string {
  const lines: string[] = []

  lines.push("# iDumb Init — Scan Complete")
  lines.push("")

  // Scaffold report
  if (createdDirs.length > 0) {
    lines.push(`Scaffolded ${createdDirs.length} directories in .idumb/`)
    lines.push("")
  }

  // Project summary
  lines.push("## Project")
  lines.push(`- **Name:** ${result.project.name}`)
  lines.push(`- **Stage:** ${result.project.stage}`)
  lines.push(`- **Languages:** ${result.project.languages.join(", ") || "none detected"}`)
  lines.push(`- **Stack:** ${result.project.stack.join(", ") || "none detected"}`)
  lines.push(`- **Package Manager:** ${result.project.packageManager ?? "none detected"}`)
  lines.push(`- **Files:** ${result.project.structure.sourceFiles} source, ${result.project.structure.testFiles} test, ${result.project.structure.configFiles} config, ${result.project.structure.docFiles} doc (${result.project.structure.totalFiles} total)`)
  lines.push("")

  // Framework
  lines.push("## Framework")
  if (result.framework.detected) {
    lines.push(`- **Detected:** ${result.framework.name}`)
    lines.push(`- **Config:** ${result.framework.configPath}`)
    if (result.framework.version) {
      lines.push(`- **Version:** ${result.framework.version}`)
    }
    lines.push(`- **Indicators:** ${result.framework.indicators.join(", ")}`)
  } else {
    lines.push("- No spec-driven framework detected (vanilla project)")
  }
  lines.push("")

  // Conventions
  lines.push("## Conventions")
  const conv = result.diagnosis.conventions
  lines.push(`- **Linting:** ${conv.linting ?? "none"}`)
  lines.push(`- **Formatting:** ${conv.formatting ?? "none"}`)
  lines.push(`- **Testing:** ${conv.testing ?? "none"}`)
  lines.push(`- **Bundler:** ${conv.bundler ?? "none"}`)
  lines.push("")

  // Gaps
  if (result.diagnosis.gaps.length > 0) {
    lines.push("## Gaps")
    for (const gap of result.diagnosis.gaps) {
      lines.push(`- [${gap.severity.toUpperCase()}] ${gap.category}: ${gap.description}`)
    }
    lines.push("")
  }

  // Debt
  if (result.diagnosis.debt.length > 0) {
    lines.push("## Tech Debt")
    for (const d of result.diagnosis.debt) {
      lines.push(`- ${d.signal} (${d.location})`)
    }
    lines.push("")
  }

  // Concerns
  if (result.diagnosis.concerns.length > 0) {
    lines.push("## Concerns")
    for (const c of result.diagnosis.concerns) {
      lines.push(`- [${c.type}] ${c.description}`)
    }
    lines.push("")
  }

  // Drift
  if (result.diagnosis.drift.contextDrift || result.diagnosis.drift.configDrift) {
    lines.push("## Drift")
    for (const indicator of result.diagnosis.drift.indicators) {
      lines.push(`- ${indicator}`)
    }
    lines.push("")
  }

  // Output location
  lines.push("---")
  lines.push(`Scan result saved to: ${SCAN_RESULT_FILE}`)
  lines.push("")
  lines.push("**Next:** Based on these results, I recommend configuring your governance preferences. What level of governance do you want?")
  lines.push("- **strict** — block on violations, require delegation chains")
  lines.push("- **balanced** — warn + proceed, soft enforcement")
  lines.push("- **minimal** — log only, no blocking")

  return lines.join("\n")
}

// ============================================================================
// TOOL DEFINITION
// ============================================================================

export const idumb_init = tool({
  description:
    "Initialize iDumb intelligence layer. Scaffolds the .idumb/ directory tree, scans the codebase exhaustively (files, deps, stack, framework, gaps, debt, drift), and writes results to .idumb/brain/context/scan-result.json. Run this first after installing the plugin.",
  args: {
    force: z.boolean().optional().describe("Re-scan even if scan-result.json already exists"),
  },
  async execute(args, context) {
    const { directory } = context

    // Check if already scanned
    const scanPath = join(directory, SCAN_RESULT_FILE)
    if (existsSync(scanPath) && !args.force) {
      return "Scan already exists at " + SCAN_RESULT_FILE + ". Use force=true to re-scan."
    }

    // 1. Scaffold .idumb/ tree
    const createdDirs = scaffoldIdumbTree(directory)

    // 2. Run codebase scan
    const scanResult = scanCodebase(directory)

    // 3. Validate and write
    const validated = ScanResultSchema.parse(scanResult)
    writeJson(scanPath, validated)

    // 4. Format human-readable output
    return formatScanOutput(validated, createdDirs)
  },
})
