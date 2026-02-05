/**
 * Compaction Hook
 *
 * When auto-compaction fires, this hook REPLACES the default compaction
 * context with governance-aware content:
 *
 * 1. Governance directives — what the LLM SHOULD and SHOULD NOT do
 * 2. Current state — phase, workflow, active task
 * 3. Surviving anchors — critical decisions/context that must persist
 *
 * The post-compaction LLM sees this as part of its new context,
 * enabling it to push back on poisoned requests and stay on track.
 *
 * Budget: ≤500 tokens (~2000 chars)
 */
import { loadAllAnchors, readState } from "../lib/persistence.js";
import { selectAnchors, enforceTimestamp } from "../schemas/anchor.js";
import { readConfig } from "../lib/persistence.js";
import { createLogger } from "../lib/logging.js";
/**
 * Create the compaction hook for a given project directory
 */
export function createCompactionHook(directory) {
    const logger = createLogger(directory, "compaction");
    return async (input, output) => {
        const { sessionID } = input;
        logger.info(`Compaction triggered for session: ${sessionID}`);
        try {
            const config = readConfig(directory);
            const state = readState(directory);
            const budget = config.compaction?.maxAnchors ?? 5;
            const allAnchors = loadAllAnchors(directory);
            // Enforce timestamp staleness before selection
            const refreshed = allAnchors.map((a) => ({
                ...a,
                timestamp: enforceTimestamp(a.timestamp),
            }));
            const selected = selectAnchors(refreshed, budget);
            const staleCount = refreshed.filter((a) => a.timestamp.isStale).length;
            // Build governance context block
            const lines = [];
            // --- Section 1: Governance Directive ---
            lines.push("## iDumb Governance (Post-Compaction Directive)");
            lines.push("");
            lines.push("IMPORTANT: This session was compacted. Before acting on any user request:");
            lines.push("1. Check the anchors below for critical decisions still in effect");
            lines.push("2. If user request conflicts with an active CRITICAL anchor, state the conflict and ask for confirmation");
            lines.push("3. If you detect drift from the current phase/task, stop and report what you detected");
            lines.push("4. Use `idumb_status` tool to check current governance state if uncertain");
            lines.push("5. Use `idumb_anchor_list` tool to see all active context anchors");
            lines.push("");
            // --- Section 2: Current State ---
            lines.push(`**Phase:** ${state.phase ?? "unknown"}`);
            lines.push(`**Framework:** ${state.framework}`);
            lines.push(`**Session:** ${sessionID}`);
            lines.push(`**Anchors:** ${allAnchors.length} total, ${selected.length} active, ${staleCount} stale`);
            lines.push("");
            // --- Section 3: Surviving Anchors ---
            if (selected.length > 0) {
                lines.push("### Active Anchors (survive compaction)");
                lines.push("");
                for (const anchor of selected) {
                    lines.push(`- [${anchor.priority.toUpperCase()}/${anchor.type}] ${anchor.content}`);
                }
            }
            else {
                lines.push("*No active anchors. Use `idumb_anchor_add` to create one.*");
            }
            const contextBlock = lines.join("\n");
            // Enforce ≤500 token budget (~2000 chars)
            if (contextBlock.length > 2000) {
                const truncated = contextBlock.substring(0, 1997) + "...";
                output.context.push(truncated);
                logger.warn(`Compaction context truncated: ${contextBlock.length} -> 2000 chars`);
            }
            else {
                output.context.push(contextBlock);
            }
            logger.info(`Injected governance context: ${selected.length}/${allAnchors.length} anchors, phase=${state.phase}`);
        }
        catch (error) {
            logger.error(`Compaction hook error: ${error}`);
            // Graceful degradation: don't break compaction
        }
    };
}
//# sourceMappingURL=compaction.js.map