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
export const AgentRoleSchema = z.enum([
    "coordinator", // Can delegate, cannot write/edit
    "high-governance", // Mid-level coordination
    "mid-coordinator", // Phase execution
    "validator", // Read-only validation
    "builder", // Can write/edit, cannot delegate
    "researcher", // Read-only analysis
    "meta", // Full access (framework development)
]);
/**
 * Tool category for grouping permissions
 */
export const ToolCategorySchema = z.enum([
    "read", // Read files, list dirs, search
    "write", // Write/edit files
    "execute", // Run commands/scripts
    "delegate", // Spawn sub-agents
    "validate", // Run tests, grep, verify
]);
/**
 * Permission decision result
 */
export const PermissionDecisionSchema = z.object({
    allowed: z.boolean(),
    reason: z.string(),
    pivot: z.string().optional(), // Suggested alternative if denied
});
/**
 * Tool to category mapping
 */
export const TOOL_CATEGORIES = {
    // Read tools
    read: "read",
    read_file: "read",
    list_dir: "read",
    search: "read",
    search_codebase: "read",
    grep: "read",
    glob: "read",
    // Write tools
    write: "write",
    edit: "write",
    create: "write",
    delete: "write",
    search_replace: "write",
    // Execute tools
    bash: "execute",
    run: "execute",
    terminal: "execute",
    // Delegate tools
    task: "delegate",
    spawn: "delegate",
    delegate: "delegate",
    // Validate tools
    test: "validate",
    verify: "validate",
    check: "validate",
};
/**
 * Permission matrix: Role -> Allowed categories
 */
export const ROLE_PERMISSIONS = {
    coordinator: ["read", "delegate"],
    "high-governance": ["read", "delegate"],
    "mid-coordinator": ["read", "delegate"],
    validator: ["read", "validate"],
    builder: ["read", "write", "execute"],
    researcher: ["read"],
    meta: ["read", "write", "execute", "delegate", "validate"],
};
/**
 * Detect agent role from agent name/identifier
 * Recognizes OpenCode innate agents (Build, Plan, General, Explore)
 * and iDumb custom agent naming conventions
 */
export function detectAgentRole(agentName) {
    const name = agentName.toLowerCase();
    // OpenCode innate agents
    if (name === "build")
        return "builder";
    if (name === "plan")
        return "researcher";
    if (name === "general")
        return "builder";
    if (name === "explore")
        return "researcher";
    // iDumb custom agent patterns
    if (name.includes("meta"))
        return "meta";
    if (name.includes("coordinator") || name.includes("supreme"))
        return "coordinator";
    if (name.includes("governance") || name.includes("high"))
        return "high-governance";
    if (name.includes("mid") || name.includes("executor"))
        return "mid-coordinator";
    if (name.includes("validator") || name.includes("checker"))
        return "validator";
    if (name.includes("builder") || name.includes("worker"))
        return "builder";
    if (name.includes("research") || name.includes("explorer"))
        return "researcher";
    // Default to meta (allow-all) for unknown agents to avoid breaking innate agents
    return "meta";
}
/**
 * Get tool category
 */
export function getToolCategory(toolName) {
    // Normalize tool name
    const normalized = toolName.toLowerCase().replace(/[_-]/g, "");
    // Check direct match
    if (TOOL_CATEGORIES[toolName]) {
        return TOOL_CATEGORIES[toolName];
    }
    // Check partial matches
    for (const [key, category] of Object.entries(TOOL_CATEGORIES)) {
        if (normalized.includes(key) || key.includes(normalized)) {
            return category;
        }
    }
    return null;
}
/**
 * Check if agent role is allowed to use tool
 * This is the core T1 permission check
 */
export function isToolAllowedForRole(role, toolName) {
    const category = getToolCategory(toolName);
    // Unknown tool category - allow by default with warning
    if (!category) {
        return {
            allowed: true,
            reason: `Tool "${toolName}" has unknown category, allowing by default`,
        };
    }
    const allowedCategories = ROLE_PERMISSIONS[role];
    const allowed = allowedCategories.includes(category);
    if (allowed) {
        return {
            allowed: true,
            reason: `Role "${role}" is permitted to use ${category} tools`,
        };
    }
    // Build pivot suggestion based on what was denied
    let pivot;
    if (category === "write" || category === "execute") {
        pivot = "Delegate to builder agent using task tool";
    }
    else if (category === "delegate") {
        pivot = "Request escalation to coordinator";
    }
    return {
        allowed: false,
        reason: `Role "${role}" is not permitted to use ${category} tools. Tool "${toolName}" requires ${category} permission.`,
        pivot,
    };
}
/**
 * Build denial message for TUI display
 * Critical: Must not expose internal details
 */
export function buildDenialMessage(role, toolName, decision) {
    const lines = [
        `GOVERNANCE: Permission denied`,
        `Tool: ${toolName}`,
        `Role: ${role}`,
        `Reason: ${decision.reason}`,
    ];
    if (decision.pivot) {
        lines.push(`Suggestion: ${decision.pivot}`);
    }
    return lines.join("\n");
}
/**
 * Schema for permission check request
 */
export const PermissionCheckRequestSchema = z.object({
    sessionId: z.string(),
    tool: z.string(),
    agentName: z.string().optional(),
    args: z.record(z.string(), z.unknown()).optional(),
});
/**
 * Schema for permission check result
 */
export const PermissionCheckResultSchema = z.object({
    request: PermissionCheckRequestSchema,
    decision: PermissionDecisionSchema,
    role: AgentRoleSchema,
    timestamp: z.string().datetime(),
});
//# sourceMappingURL=permission.js.map