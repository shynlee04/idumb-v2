/**
 * CLI: init command
 * 
 * Scaffolds .idumb/ directory and runs codebase scan.
 * Reuses existing engines/persistence — thin CLI wrapper.
 */

import { existsSync } from "fs"
import { join } from "path"
import { resolveIdumbRoot } from "../../lib/path-resolver.js"
import { initializeIdumbDir } from "../../lib/persistence.js"
import { scanCodebase } from "../../engines/scanner.js"
import { writeJson } from "../../lib/persistence.js"
import { ScanResultSchema } from "../../schemas/scan.js"

interface InitOptions {
  global: boolean
  force: boolean
}

export async function runInit(targetDir: string, options: InitOptions): Promise<void> {
  const resolved = resolveIdumbRoot(targetDir, undefined, options.global)

  process.stdout.write(`Resolving .idumb/ path...\n`)
  process.stdout.write(`  Strategy: ${resolved.strategy}\n`)
  process.stdout.write(`  Root: ${resolved.root}\n`)
  process.stdout.write(`  .opencode/ found: ${resolved.opencodeFound}\n`)
  process.stdout.write(`  .idumb/ path: ${resolved.idumbPath}\n\n`)

  // Check if already initialized
  const scanPath = join(resolved.idumbPath, "brain", "context", "scan-result.json")
  if (existsSync(scanPath) && !options.force) {
    process.stdout.write(`Already initialized at ${resolved.idumbPath}\n`)
    process.stdout.write(`Use --force to re-initialize.\n`)
    return
  }

  // 1. Scaffold directory tree
  process.stdout.write(`Scaffolding .idumb/ tree...\n`)
  initializeIdumbDir(resolved.root)
  process.stdout.write(`  Done.\n\n`)

  // 2. Run codebase scan
  process.stdout.write(`Scanning codebase at ${resolved.root}...\n`)
  const scanResult = scanCodebase(resolved.root)
  const validated = ScanResultSchema.parse(scanResult)
  writeJson(scanPath, validated)

  // 3. Print summary
  process.stdout.write(`\n`)
  process.stdout.write(`# iDumb Init Complete\n\n`)
  process.stdout.write(`## Project\n`)
  process.stdout.write(`  Name: ${validated.project.name}\n`)
  process.stdout.write(`  Stage: ${validated.project.stage}\n`)
  process.stdout.write(`  Languages: ${validated.project.languages.join(", ") || "none"}\n`)
  process.stdout.write(`  Stack: ${validated.project.stack.join(", ") || "none"}\n`)
  process.stdout.write(`  Files: ${validated.project.structure.totalFiles} total\n\n`)

  if (validated.framework.detected) {
    process.stdout.write(`## Framework\n`)
    process.stdout.write(`  Detected: ${validated.framework.name}\n`)
    process.stdout.write(`  Config: ${validated.framework.configPath}\n\n`)
  }

  if (validated.diagnosis.gaps.length > 0) {
    process.stdout.write(`## Gaps (${validated.diagnosis.gaps.length})\n`)
    for (const gap of validated.diagnosis.gaps) {
      process.stdout.write(`  [${gap.severity.toUpperCase()}] ${gap.category}: ${gap.description}\n`)
    }
    process.stdout.write(`\n`)
  }

  process.stdout.write(`Scan result saved to: ${scanPath}\n`)
}
