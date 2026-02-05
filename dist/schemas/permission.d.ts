/**
 * Permission Schema
 *
 * Permission definitions for TRIAL-1: Stop Hook Tool Manipulation
 * Defines which agents can use which tools.
 */
import { z } from "zod";
/**
 * Agent role classification for permission enforcement
 */
export declare const AgentRoleSchema: z.ZodEnum<["coordinator", "high-governance", "mid-coordinator", "validator", "builder", "researcher", "meta"]>;
export type AgentRole = z.infer<typeof AgentRoleSchema>;
/**
 * Tool category for grouping permissions
 */
export declare const ToolCategorySchema: z.ZodEnum<["read", "write", "execute", "delegate", "validate"]>;
export type ToolCategory = z.infer<typeof ToolCategorySchema>;
/**
 * Permission decision result
 */
export declare const PermissionDecisionSchema: z.ZodObject<{
    allowed: z.ZodBoolean;
    reason: z.ZodString;
    pivot: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    allowed: boolean;
    reason: string;
    pivot?: string | undefined;
}, {
    allowed: boolean;
    reason: string;
    pivot?: string | undefined;
}>;
export type PermissionDecision = z.infer<typeof PermissionDecisionSchema>;
/**
 * Tool to category mapping
 */
export declare const TOOL_CATEGORIES: Record<string, ToolCategory>;
/**
 * Permission matrix: Role -> Allowed categories
 */
export declare const ROLE_PERMISSIONS: Record<AgentRole, ToolCategory[]>;
/**
 * Detect agent role from agent name/identifier
 * Recognizes OpenCode innate agents (Build, Plan, General, Explore)
 * and iDumb custom agent naming conventions
 */
export declare function detectAgentRole(agentName: string): AgentRole;
/**
 * Get tool category
 */
export declare function getToolCategory(toolName: string): ToolCategory | null;
/**
 * Check if agent role is allowed to use tool
 * This is the core T1 permission check
 */
export declare function isToolAllowedForRole(role: AgentRole, toolName: string): PermissionDecision;
/**
 * Build denial message for TUI display
 * Critical: Must not expose internal details
 */
export declare function buildDenialMessage(role: AgentRole, toolName: string, decision: PermissionDecision): string;
/**
 * Schema for permission check request
 */
export declare const PermissionCheckRequestSchema: z.ZodObject<{
    sessionId: z.ZodString;
    tool: z.ZodString;
    agentName: z.ZodOptional<z.ZodString>;
    args: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    tool: string;
    sessionId: string;
    agentName?: string | undefined;
    args?: Record<string, unknown> | undefined;
}, {
    tool: string;
    sessionId: string;
    agentName?: string | undefined;
    args?: Record<string, unknown> | undefined;
}>;
export type PermissionCheckRequest = z.infer<typeof PermissionCheckRequestSchema>;
/**
 * Schema for permission check result
 */
export declare const PermissionCheckResultSchema: z.ZodObject<{
    request: z.ZodObject<{
        sessionId: z.ZodString;
        tool: z.ZodString;
        agentName: z.ZodOptional<z.ZodString>;
        args: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        tool: string;
        sessionId: string;
        agentName?: string | undefined;
        args?: Record<string, unknown> | undefined;
    }, {
        tool: string;
        sessionId: string;
        agentName?: string | undefined;
        args?: Record<string, unknown> | undefined;
    }>;
    decision: z.ZodObject<{
        allowed: z.ZodBoolean;
        reason: z.ZodString;
        pivot: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        allowed: boolean;
        reason: string;
        pivot?: string | undefined;
    }, {
        allowed: boolean;
        reason: string;
        pivot?: string | undefined;
    }>;
    role: z.ZodEnum<["coordinator", "high-governance", "mid-coordinator", "validator", "builder", "researcher", "meta"]>;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    decision: {
        allowed: boolean;
        reason: string;
        pivot?: string | undefined;
    };
    timestamp: string;
    request: {
        tool: string;
        sessionId: string;
        agentName?: string | undefined;
        args?: Record<string, unknown> | undefined;
    };
    role: "coordinator" | "validator" | "meta" | "high-governance" | "mid-coordinator" | "builder" | "researcher";
}, {
    decision: {
        allowed: boolean;
        reason: string;
        pivot?: string | undefined;
    };
    timestamp: string;
    request: {
        tool: string;
        sessionId: string;
        agentName?: string | undefined;
        args?: Record<string, unknown> | undefined;
    };
    role: "coordinator" | "validator" | "meta" | "high-governance" | "mid-coordinator" | "builder" | "researcher";
}>;
export type PermissionCheckResult = z.infer<typeof PermissionCheckResultSchema>;
//# sourceMappingURL=permission.d.ts.map