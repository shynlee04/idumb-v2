/**
 * Config Schema
 * 
 * Plugin configuration with global -> project -> plugin precedence
 */

import { z } from "zod"

/**
 * Permission level for agents
 */
export const PermissionLevelSchema = z.enum([
  "coordinator",  // Can delegate, cannot write
  "worker",       // Can write, cannot delegate
  "validator",    // Read-only + test/grep
  "meta",         // Full access (meta-governance)
])

export type PermissionLevel = z.infer<typeof PermissionLevelSchema>

/**
 * Agent permission configuration
 */
export const AgentPermissionSchema = z.object({
  level: PermissionLevelSchema,
  allowedTools: z.array(z.string()).default([]),
  deniedTools: z.array(z.string()).default([]),
  canDelegate: z.boolean().default(false),
  canWrite: z.boolean().default(false),
  canEdit: z.boolean().default(false),
  canBash: z.boolean().default(false),
})

export type AgentPermission = z.infer<typeof AgentPermissionSchema>

/**
 * Default permission matrix per agent type
 */
export const DEFAULT_PERMISSIONS: Record<PermissionLevel, Omit<AgentPermission, "level">> = {
  coordinator: {
    allowedTools: ["task", "read", "list", "search"],
    deniedTools: ["write", "edit", "bash"],
    canDelegate: true,
    canWrite: false,
    canEdit: false,
    canBash: false,
  },
  worker: {
    allowedTools: ["write", "edit", "bash", "read", "list", "search"],
    deniedTools: ["task"],
    canDelegate: false,
    canWrite: true,
    canEdit: true,
    canBash: true,
  },
  validator: {
    allowedTools: ["read", "list", "search", "grep", "glob", "test"],
    deniedTools: ["write", "edit", "task"],
    canDelegate: false,
    canWrite: false,
    canEdit: false,
    canBash: false, // read-only bash like grep
  },
  meta: {
    allowedTools: ["*"],
    deniedTools: [],
    canDelegate: true,
    canWrite: true,
    canEdit: true,
    canBash: true,
  },
}

/**
 * Validation settings
 */
export const ValidationConfigSchema = z.object({
  autoValidate: z.boolean().default(false),
  validationInterval: z.number().int().min(1).default(5),
  strictMode: z.boolean().default(true),
})

export type ValidationConfig = z.infer<typeof ValidationConfigSchema>

/**
 * Compaction settings
 */
export const CompactionConfigSchema = z.object({
  maxAnchors: z.number().int().min(1).max(100).default(20),
  contextLimit: z.number().int().min(500).max(5000).default(2000),
  preserveCritical: z.boolean().default(true),
})

export type CompactionConfig = z.infer<typeof CompactionConfigSchema>

/**
 * Full plugin configuration
 */
export const ConfigSchema = z.object({
  enabled: z.boolean().default(true),
  
  // Protected tools that require permission
  protectedTools: z.array(z.string()).default(["write", "edit", "bash", "task"]),
  
  // Agent permissions (by agent name pattern)
  agentPermissions: z.record(z.string(), AgentPermissionSchema).default({}),
  
  // Validation settings
  validation: ValidationConfigSchema.optional().default({
    autoValidate: false,
    validationInterval: 5,
    strictMode: true,
  }),
  
  // Compaction settings
  compaction: CompactionConfigSchema.optional().default({
    maxAnchors: 20,
    contextLimit: 2000,
    preserveCritical: true,
  }),
  
  // TUI settings
  tui: z.object({
    showToasts: z.boolean().default(true),
    showStatus: z.boolean().default(true),
  }).optional().default({
    showToasts: true,
    showStatus: true,
  }),
  
  // Logging
  logging: z.object({
    enabled: z.boolean().default(true),
    level: z.enum(["debug", "info", "warn", "error"]).default("info"),
    file: z.string().default(".idumb/logs/plugin.log"),
  }).optional().default({
    enabled: true,
    level: "info",
    file: ".idumb/logs/plugin.log",
  }),
})

export type Config = z.infer<typeof ConfigSchema>

/**
 * Create default configuration
 */
export function createDefaultConfig(): Config {
  return ConfigSchema.parse({
    enabled: true,
    protectedTools: ["write", "edit", "bash", "task"],
    agentPermissions: {},
    validation: {},
    compaction: {},
    tui: {},
    logging: {},
  })
}

/**
 * Get permission for a specific agent
 */
export function getAgentPermission(
  config: Config,
  agentName: string
): AgentPermission | null {
  // Check exact match first
  if (config.agentPermissions[agentName]) {
    return config.agentPermissions[agentName]
  }
  
  // Check pattern matches
  for (const [pattern, permission] of Object.entries(config.agentPermissions)) {
    if (pattern.includes("*")) {
      const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$")
      if (regex.test(agentName)) {
        return permission
      }
    }
  }
  
  return null
}

/**
 * Check if a tool is allowed for an agent
 */
export function isToolAllowed(
  permission: AgentPermission,
  toolName: string
): boolean {
  // If explicitly denied, reject
  if (permission.deniedTools.includes(toolName)) {
    return false
  }
  
  // If wildcard allowed, accept
  if (permission.allowedTools.includes("*")) {
    return true
  }
  
  // Check if explicitly allowed
  return permission.allowedTools.includes(toolName)
}

/**
 * Merge configs with precedence: plugin > project > global
 */
export function mergeConfigs(
  global: Partial<Config>,
  project: Partial<Config>,
  plugin: Partial<Config>
): Config {
  return ConfigSchema.parse({
    ...global,
    ...project,
    ...plugin,
    // Deep merge for nested objects
    validation: {
      ...global.validation,
      ...project.validation,
      ...plugin.validation,
    },
    compaction: {
      ...global.compaction,
      ...project.compaction,
      ...plugin.compaction,
    },
    tui: {
      ...global.tui,
      ...project.tui,
      ...plugin.tui,
    },
    logging: {
      ...global.logging,
      ...project.logging,
      ...plugin.logging,
    },
  })
}
