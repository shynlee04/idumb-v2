/**
 * CLI: anchors command
 * 
 * Lists active context anchors with staleness info.
 * Reuses existing persistence — thin CLI wrapper.
 */

import { resolveIdumbRoot } from "../../lib/path-resolver.js"
import { loadAllAnchors, stateExists } from "../../lib/persistence.js"
import { enforceTimestamp, calculateAnchorScore } from "../../schemas/anchor.js"

interface AnchorsOptions {
  global: boolean
}

export async function runAnchors(targetDir: string, options: AnchorsOptions): Promise<void> {
  const resolved = resolveIdumbRoot(targetDir, undefined, options.global)

  if (!stateExists(resolved.root)) {
    process.stdout.write(`No .idumb/ found at ${resolved.idumbPath}\n`)
    process.stdout.write(`Run 'idumb init' first.\n`)
    return
  }

  const anchors = loadAllAnchors(resolved.root)

  if (anchors.length === 0) {
    process.stdout.write(`No anchors found.\n`)
    process.stdout.write(`Use idumb_anchor_add tool in OpenCode to create anchors.\n`)
    return
  }

  process.stdout.write(`# Active Anchors (${anchors.length})\n\n`)

  for (const anchor of anchors) {
    const ts = enforceTimestamp(anchor.timestamp)
    const score = calculateAnchorScore(anchor)

    process.stdout.write(`## [${anchor.priority.toUpperCase()}/${anchor.type}] ${anchor.id}\n`)
    process.stdout.write(`  Content: ${anchor.content}\n`)
    process.stdout.write(`  Score: ${score.toFixed(2)}\n`)
    process.stdout.write(`  Stale: ${ts.isStale ? "YES" : "no"} (${ts.stalenessHours.toFixed(1)}h)\n`)
    process.stdout.write(`  Created: ${ts.createdAt}\n`)
    if (anchor.focusTarget) {
      process.stdout.write(`  Focus: ${anchor.focusTarget}\n`)
    }
    process.stdout.write(`\n`)
  }
}
