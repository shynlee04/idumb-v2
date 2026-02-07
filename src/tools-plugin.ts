/**
 * iDumb Tools Plugin — Plugin B Entry Point
 *
 * Entity-aware intelligence tools that replace innate read/write/bash/webfetch.
 *
 * Architecture: Same npm package (idumb-v2), separate plugin entry point.
 * - Plugin A (index.ts): Governance + intelligence tools (5 tools + all hooks)
 * - Plugin B (tools-plugin.ts): Entity-aware operations (4 tools, 0 hooks)
 *
 * opencode.json registers both:
 *   "plugin": ["idumb-v2", "idumb-v2/dist/tools-plugin.js"]
 *
 * These tools are SELF-GOVERNED — no hooks needed.
 * Governance is embedded via entity-resolver + chain-validator + state-reader.
 *
 * CRITICAL: NO console.log anywhere — breaks TUI rendering.
 */

import type { Plugin } from "@opencode-ai/plugin"
import { createLogger } from "./lib/index.js"
import { idumb_read } from "./tools/read.js"
import { idumb_write } from "./tools/write.js"
import { idumb_bash } from "./tools/bash.js"
import { idumb_webfetch } from "./tools/webfetch.js"

// ─── Version ─────────────────────────────────────────────────────────

const TOOLS_VERSION = "0.1.0"

// ─── Plugin Factory ──────────────────────────────────────────────────

/**
 * Plugin B: Entity-aware intelligence tools.
 *
 * Registers 0 hooks — all governance is embedded in the tools themselves
 * via entity-resolver, chain-validator, and state-reader.
 *
 * Phase n4-α: idumb_read ✅
 * Phase n4-β: + idumb_write ✅
 * Phase n4-γ: + idumb_bash ✅
 * Phase n4-δ: + idumb_webfetch ✅
 */
const idumbTools: Plugin = async ({ directory }) => {
    const log = createLogger(directory, "idumb-tools")
    log.info(`iDumb Tools v${TOOLS_VERSION} loaded (Plugin B)`, { directory })

    return {
        // ─── 0 Hooks — self-governed tools ────────────────────────
        // No event, tool.execute.before/after, compaction, system, or message hooks.
        // All governance happens inside the tools via:
        //   - entity-resolver: classifies paths → entity types + governance rules
        //   - chain-validator: validates hierarchy chains before operations
        //   - state-reader: reads Plugin A's persisted state (tasks, agent identity)

        // ─── Entity-Aware Intelligence Tools ─────────────────────
        tool: {
            idumb_read,
            idumb_write,
            idumb_bash,
            idumb_webfetch,
        },
    }
}

export default idumbTools
