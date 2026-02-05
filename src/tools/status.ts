/**
 * Status Tool
 * 
 * Custom tool for reading current plugin state summary.
 */

import { tool } from "../types/plugin.js"
import { readState, loadAllAnchors } from "../lib/persistence.js"
import { calculateStaleness, enforceTimestamp } from "../schemas/anchor.js"

export const idumb_status = tool({
  description:
    "Get the current iDumb governance plugin status: version, phase, anchor count, validation count, and staleness info.",
  args: {},
  async execute(_args, context) {
    const state = readState(context.directory)
    const anchors = loadAllAnchors(context.directory)

    const staleAnchors = anchors.filter((a) => {
      const ts = enforceTimestamp(a.timestamp)
      return ts.isStale
    }).length

    const freshAnchors = anchors.length - staleAnchors

    const lines = [
      `iDumb v${state.version}`,
      `Phase: ${state.phase ?? "none"}`,
      `Framework: ${state.framework}`,
      `Anchors: ${anchors.length} total (${freshAnchors} fresh, ${staleAnchors} stale)`,
      `Validations: ${state.validationCount}`,
      `History entries: ${state.history.length}`,
      `Sessions tracked: ${Object.keys(state.sessions).length}`,
    ]

    if (state.lastValidation) {
      lines.push(`Last validation: ${state.lastValidation}`)
    }

    if (state.timestamp) {
      const staleness = calculateStaleness(state.timestamp)
      lines.push(`State age: ${Math.round(staleness * 10) / 10}h`)
    }

    return lines.join("\n")
  },
})
