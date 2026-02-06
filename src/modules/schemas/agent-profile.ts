/**
 * Agent Profile Schema — defines the contract for all iDumb-created agents.
 * 
 * This is a REFERENCE schema used by the meta-builder when generating
 * agent profiles. It is NOT runtime-validated with Zod — it's a plain
 * TypeScript interface that documents the structure.
 * 
 * Consumers: meta-builder (reads this to know what to generate)
 */

/** Agent roles in the iDumb governance hierarchy */
export type AgentRole = 
  | "meta"           // Full access — creates the permission system
  | "coordinator"    // Delegates work, cannot write files
  | "builder"        // Writes code, executes tasks
  | "validator"      // Reads and validates, cannot modify
  | "researcher"     // Read-only exploration

/** Permission level granularity */
export type PermissionLevel = "full" | "write" | "read-validate" | "read-only"

/** Tool categories for permission mapping */
export type ToolCategory = "read" | "write" | "execute" | "delegate" | "validate"

/** An agent profile — what the meta-builder generates */
export interface AgentProfile {
  id: string
  name: string
  role: AgentRole
  permissionLevel: PermissionLevel
  module: string                    // which idumb module this belongs to

  persona: {
    description: string
    communicationStyle: string
    expertise: string[]
  }

  permissions: {
    tools: {
      allowed: ToolCategory[]
      blocked: ToolCategory[]
    }
    bash: {
      allowlist: string[]           // specific commands allowed
      blocklist: string[]           // specific commands blocked
    }
  }

  workflows: string[]               // workflow IDs this agent can trigger
  boundaries: string[]              // explicit list of what agent CANNOT do
}

/** Map roles to their default permission levels */
export const ROLE_PERMISSIONS: Record<AgentRole, {
  level: PermissionLevel
  allowedTools: ToolCategory[]
}> = {
  meta: {
    level: "full",
    allowedTools: ["read", "write", "execute", "delegate", "validate"],
  },
  coordinator: {
    level: "read-only",
    allowedTools: ["read", "delegate"],
  },
  builder: {
    level: "write",
    allowedTools: ["read", "write", "execute"],
  },
  validator: {
    level: "read-validate",
    allowedTools: ["read", "validate"],
  },
  researcher: {
    level: "read-only",
    allowedTools: ["read"],
  },
}

/** Tools that map to each category (for OpenCode) */
export const TOOL_CATEGORY_MAP: Record<ToolCategory, string[]> = {
  read: ["read", "list", "glob", "grep", "webfetch", "websearch", "codesearch", "todoread"],
  write: ["write", "edit", "todowrite", "multiedit"],
  execute: ["bash"],
  delegate: ["task"],
  validate: ["read", "list", "glob", "grep", "bash"],  // bash for running tests
}
