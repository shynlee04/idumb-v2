/**
 * CLI: status command
 * 
 * Shows current governance state.
 * Reuses existing persistence — thin CLI wrapper.
 */

import { resolveIdumbRoot } from "../../lib/path-resolver.js"
import { readState, stateExists } from "../../lib/persistence.js"

interface StatusOptions {
  global: boolean
}

export async function runStatus(targetDir: string, options: StatusOptions): Promise<void> {
  const resolved = resolveIdumbRoot(targetDir, undefined, options.global)

  if (!stateExists(resolved.root)) {
    process.stdout.write(`No .idumb/ found at ${resolved.idumbPath}\n`)
    process.stdout.write(`Run 'idumb init' first.\n`)
    return
  }

  const state = readState(resolved.root)

  process.stdout.write(`# iDumb Status\n\n`)
  process.stdout.write(`  Path: ${resolved.idumbPath}\n`)
  process.stdout.write(`  Strategy: ${resolved.strategy}\n`)
  process.stdout.write(`  Version: ${state.version}\n`)
  process.stdout.write(`  Phase: ${state.phase ?? "none"}\n`)
  process.stdout.write(`  Framework: ${state.framework}\n`)
  process.stdout.write(`  Anchors: ${state.anchors.length}\n`)
  process.stdout.write(`  History: ${state.history.length} entries\n`)
  process.stdout.write(`  Sessions: ${Object.keys(state.sessions).length}\n`)
  process.stdout.write(`  Validations: ${state.validationCount}\n`)
  process.stdout.write(`  Last validation: ${state.lastValidation ?? "never"}\n`)

  if (state.timestamp) {
    process.stdout.write(`  Initialized: ${state.timestamp.createdAt}\n`)
    process.stdout.write(`  Modified: ${state.timestamp.modifiedAt}\n`)
    process.stdout.write(`  Stale: ${state.timestamp.isStale ? "YES" : "no"} (${state.timestamp.stalenessHours}h)\n`)
  }

  // Recent history
  if (state.history.length > 0) {
    process.stdout.write(`\n## Recent History (last 5)\n`)
    const recent = state.history.slice(-5)
    for (const entry of recent) {
      process.stdout.write(`  [${entry.result.toUpperCase()}] ${entry.action}`)
      if (entry.details) process.stdout.write(` — ${entry.details}`)
      process.stdout.write(`\n`)
    }
  }
}
