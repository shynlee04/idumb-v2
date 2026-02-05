/**
 * Anchor Tools
 *
 * Custom tools for managing context anchors that survive compaction.
 * - idumb_anchor_add: Create a new anchor
 * - idumb_anchor_list: List all anchors with staleness info
 */
import { tool } from "../types/plugin.js";
import { createAnchor, calculateStaleness, enforceTimestamp, } from "../schemas/anchor.js";
import { saveAnchor, loadAllAnchors } from "../lib/persistence.js";
export const idumb_anchor_add = tool({
    description: "Add a context anchor that survives session compaction. Use this to preserve critical decisions, context, or checkpoints across long sessions.",
    args: {
        type: tool.schema
            .enum(["decision", "context", "checkpoint", "error", "attention"])
            .describe("Anchor type: decision, context, checkpoint, error, or attention"),
        content: tool.schema
            .string()
            .max(2000)
            .describe("The content to preserve (max 2000 chars)"),
        priority: tool.schema
            .enum(["critical", "high", "medium", "low"])
            .describe("Priority level. Critical anchors always survive compaction"),
    },
    async execute(args, context) {
        const anchor = createAnchor(args.type, args.content, args.priority);
        saveAnchor(context.directory, anchor);
        return [
            `Anchor created: ${anchor.id}`,
            `Type: ${anchor.type} | Priority: ${anchor.priority}`,
            `Content: ${anchor.content.substring(0, 100)}${anchor.content.length > 100 ? "..." : ""}`,
        ].join("\n");
    },
});
export const idumb_anchor_list = tool({
    description: "List all active context anchors with staleness info. Shows what context will survive the next compaction.",
    args: {},
    async execute(_args, context) {
        const anchors = loadAllAnchors(context.directory);
        if (anchors.length === 0) {
            return "No anchors found. Use idumb_anchor_add to create one.";
        }
        const lines = [`Anchors: ${anchors.length} total`, ""];
        for (const anchor of anchors) {
            const ts = enforceTimestamp(anchor.timestamp);
            const staleness = calculateStaleness(ts);
            const staleTag = ts.isStale ? " [STALE]" : "";
            const hours = Math.round(staleness * 10) / 10;
            lines.push(`[${anchor.priority.toUpperCase()}] ${anchor.type}: ${anchor.content.substring(0, 80)}${anchor.content.length > 80 ? "..." : ""}`, `  ID: ${anchor.id} | Age: ${hours}h${staleTag}`, "");
        }
        return lines.join("\n");
    },
});
//# sourceMappingURL=anchor.js.map