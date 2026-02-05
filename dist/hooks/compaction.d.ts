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
/**
 * Create the compaction hook for a given project directory
 */
export declare function createCompactionHook(directory: string): (input: {
    sessionID: string;
}, output: {
    context: string[];
    prompt?: string;
}) => Promise<void>;
//# sourceMappingURL=compaction.d.ts.map