/**
 * iDumb Plugin v2
 *
 * Main plugin entry point for OpenCode integration.
 *
 * This plugin provides intelligent governance through:
 * - Context purification at every decision boundary
 * - Permission enforcement via tool interception
 * - Anchor preservation across compaction
 *
 * CRITICAL: NO console.log - causes TUI background text exposure
 * Use file logging via lib/logging.ts instead
 *
 * Trial Status:
 * - T1: Stop Hook Tool Manipulation - IMPLEMENTED
 * - T2: Inner Cycle Delegation - PENDING
 * - T3: Compact Hook - PENDING
 * - T4: Sub-task Tracking - PENDING
 * - T5-T8: PENDING
 */
import type { Plugin } from "@opencode-ai/plugin";
/**
 * Plugin version
 */
export declare const VERSION = "2.0.0-alpha.1";
/**
 * Main iDumb Plugin export
 *
 * Implements OpenCode plugin interface with:
 * - Session lifecycle hooks
 * - Tool execution hooks (T1)
 * - Custom tools (planned)
 */
export declare const IdumbPlugin: Plugin;
/**
 * Default export for OpenCode plugin system
 */
export default IdumbPlugin;
//# sourceMappingURL=plugin.d.ts.map