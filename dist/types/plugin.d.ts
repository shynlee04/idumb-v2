/**
 * OpenCode Plugin Type Definitions
 *
 * Local tool helper using zod v3 (SDK ships zod v4).
 * Plugin/Hooks types re-exported from SDK.
 */
import { z } from "zod";
export type { Plugin, PluginInput, Hooks } from "@opencode-ai/plugin";
/**
 * Tool execution context provided by OpenCode
 */
export interface ToolContext {
    sessionID: string;
    messageID: string;
    agent: string;
    directory: string;
    worktree: string;
    abort: AbortSignal;
    metadata(input: {
        title?: string;
        metadata?: Record<string, unknown>;
    }): void;
}
/**
 * Tool definition shape matching SDK runtime behavior
 */
export interface ToolDefinition {
    description: string;
    args: z.ZodRawShape;
    execute(args: Record<string, unknown>, context: ToolContext): Promise<string>;
}
/**
 * Local tool() helper — mirrors SDK's identity function but uses zod v3
 */
export declare function tool<Args extends z.ZodRawShape>(input: {
    description: string;
    args: Args;
    execute(args: z.infer<z.ZodObject<Args>>, context: ToolContext): Promise<string>;
}): ToolDefinition;
export declare namespace tool {
    var schema: typeof z;
}
//# sourceMappingURL=plugin.d.ts.map