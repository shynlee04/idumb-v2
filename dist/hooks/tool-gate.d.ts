/**
 * Tool Gate Hook
 *
 * TRIAL-1: Stop Hook Tool Manipulation
 *
 * Tests:
 * - P1.1: Can throwing error block tool execution?
 * - P1.2: Is error message visible in TUI (not background text)?
 * - P1.3: Does arg modification persist to actual execution?
 * - P1.4: Do other hooks continue running (no short-circuit)?
 *
 * PIVOT Strategy:
 * - If P1.1 fails: Use tool.execute.after output replacement
 * - If P1.2 fails: Use custom wrapper tool with pre-validation
 * - If P1.3 fails: Use idumb:validate tool requirement
 */
import { type AgentRole, type PermissionDecision, type PermissionCheckResult } from "../schemas/index.js";
/**
 * Session tracker for delegation depth and agent role detection
 */
interface SessionTracker {
    sessionId: string;
    agentRole: AgentRole | null;
    depth: number;
    firstTool: string | null;
    delegationChain: string[];
    permissionChecks: PermissionCheckResult[];
}
/**
 * Get or create session tracker
 */
export declare function getSessionTracker(sessionId: string): SessionTracker;
/**
 * Update session tracker with detected agent role
 */
export declare function setAgentRole(sessionId: string, agentName: string): void;
/**
 * Record first tool used (for context-first detection)
 */
export declare function recordFirstTool(sessionId: string, toolName: string): void;
/**
 * Record permission check result
 */
export declare function recordPermissionCheck(sessionId: string, request: {
    tool: string;
    agentName?: string;
}, decision: PermissionDecision, role: AgentRole): void;
/**
 * Tool gate error - thrown to block tool execution
 * This tests P1.1: Can throwing error block tool execution?
 */
export declare class ToolGateError extends Error {
    readonly role: AgentRole;
    readonly tool: string;
    readonly decision: PermissionDecision;
    constructor(role: AgentRole, tool: string, decision: PermissionDecision);
}
/**
 * Check if tool is allowed for current session
 * Returns decision without throwing - caller decides action
 */
export declare function checkToolPermission(sessionId: string, toolName: string, agentName?: string): {
    allowed: boolean;
    role: AgentRole;
    decision: PermissionDecision;
};
/**
 * Main tool gate hook implementation
 *
 * This is the core of TRIAL-1 - tests all 4 PASS criteria
 */
export declare function createToolGateHook(directory: string): (input: {
    tool: string;
    sessionID: string;
    callID: string;
}, output: {
    args: Record<string, unknown>;
}) => Promise<void>;
/**
 * After hook for fallback output replacement (PIVOT for P1.1)
 *
 * If throwing doesn't block, we modify the output instead
 */
export declare function createToolGateAfterHook(directory: string): (input: {
    tool: string;
    sessionID: string;
    callID: string;
}, output: {
    title: string;
    output: string;
    metadata: Record<string, unknown>;
}) => Promise<void>;
/**
 * Get permission check history for a session
 */
export declare function getPermissionHistory(sessionId: string): PermissionCheckResult[];
/**
 * Clear session tracker (for testing)
 */
export declare function clearSessionTracker(sessionId: string): void;
/**
 * Clear all session trackers (for testing)
 */
export declare function clearAllSessionTrackers(): void;
export {};
//# sourceMappingURL=tool-gate.d.ts.map