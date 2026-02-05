/**
 * Config Schema
 *
 * Plugin configuration with global -> project -> plugin precedence
 */
import { z } from "zod";
/**
 * Permission level for agents
 */
export declare const PermissionLevelSchema: z.ZodEnum<["coordinator", "worker", "validator", "meta"]>;
export type PermissionLevel = z.infer<typeof PermissionLevelSchema>;
/**
 * Agent permission configuration
 */
export declare const AgentPermissionSchema: z.ZodObject<{
    level: z.ZodEnum<["coordinator", "worker", "validator", "meta"]>;
    allowedTools: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    deniedTools: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    canDelegate: z.ZodDefault<z.ZodBoolean>;
    canWrite: z.ZodDefault<z.ZodBoolean>;
    canEdit: z.ZodDefault<z.ZodBoolean>;
    canBash: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    level: "coordinator" | "worker" | "validator" | "meta";
    allowedTools: string[];
    deniedTools: string[];
    canDelegate: boolean;
    canWrite: boolean;
    canEdit: boolean;
    canBash: boolean;
}, {
    level: "coordinator" | "worker" | "validator" | "meta";
    allowedTools?: string[] | undefined;
    deniedTools?: string[] | undefined;
    canDelegate?: boolean | undefined;
    canWrite?: boolean | undefined;
    canEdit?: boolean | undefined;
    canBash?: boolean | undefined;
}>;
export type AgentPermission = z.infer<typeof AgentPermissionSchema>;
/**
 * Default permission matrix per agent type
 */
export declare const DEFAULT_PERMISSIONS: Record<PermissionLevel, Omit<AgentPermission, "level">>;
/**
 * Validation settings
 */
export declare const ValidationConfigSchema: z.ZodObject<{
    autoValidate: z.ZodDefault<z.ZodBoolean>;
    validationInterval: z.ZodDefault<z.ZodNumber>;
    strictMode: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    autoValidate: boolean;
    validationInterval: number;
    strictMode: boolean;
}, {
    autoValidate?: boolean | undefined;
    validationInterval?: number | undefined;
    strictMode?: boolean | undefined;
}>;
export type ValidationConfig = z.infer<typeof ValidationConfigSchema>;
/**
 * Compaction settings
 */
export declare const CompactionConfigSchema: z.ZodObject<{
    maxAnchors: z.ZodDefault<z.ZodNumber>;
    contextLimit: z.ZodDefault<z.ZodNumber>;
    preserveCritical: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    maxAnchors: number;
    contextLimit: number;
    preserveCritical: boolean;
}, {
    maxAnchors?: number | undefined;
    contextLimit?: number | undefined;
    preserveCritical?: boolean | undefined;
}>;
export type CompactionConfig = z.infer<typeof CompactionConfigSchema>;
/**
 * Full plugin configuration
 */
export declare const ConfigSchema: z.ZodObject<{
    enabled: z.ZodDefault<z.ZodBoolean>;
    protectedTools: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    agentPermissions: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodObject<{
        level: z.ZodEnum<["coordinator", "worker", "validator", "meta"]>;
        allowedTools: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        deniedTools: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        canDelegate: z.ZodDefault<z.ZodBoolean>;
        canWrite: z.ZodDefault<z.ZodBoolean>;
        canEdit: z.ZodDefault<z.ZodBoolean>;
        canBash: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        level: "coordinator" | "worker" | "validator" | "meta";
        allowedTools: string[];
        deniedTools: string[];
        canDelegate: boolean;
        canWrite: boolean;
        canEdit: boolean;
        canBash: boolean;
    }, {
        level: "coordinator" | "worker" | "validator" | "meta";
        allowedTools?: string[] | undefined;
        deniedTools?: string[] | undefined;
        canDelegate?: boolean | undefined;
        canWrite?: boolean | undefined;
        canEdit?: boolean | undefined;
        canBash?: boolean | undefined;
    }>>>;
    validation: z.ZodDefault<z.ZodOptional<z.ZodObject<{
        autoValidate: z.ZodDefault<z.ZodBoolean>;
        validationInterval: z.ZodDefault<z.ZodNumber>;
        strictMode: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        autoValidate: boolean;
        validationInterval: number;
        strictMode: boolean;
    }, {
        autoValidate?: boolean | undefined;
        validationInterval?: number | undefined;
        strictMode?: boolean | undefined;
    }>>>;
    compaction: z.ZodDefault<z.ZodOptional<z.ZodObject<{
        maxAnchors: z.ZodDefault<z.ZodNumber>;
        contextLimit: z.ZodDefault<z.ZodNumber>;
        preserveCritical: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        maxAnchors: number;
        contextLimit: number;
        preserveCritical: boolean;
    }, {
        maxAnchors?: number | undefined;
        contextLimit?: number | undefined;
        preserveCritical?: boolean | undefined;
    }>>>;
    tui: z.ZodDefault<z.ZodOptional<z.ZodObject<{
        showToasts: z.ZodDefault<z.ZodBoolean>;
        showStatus: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        showToasts: boolean;
        showStatus: boolean;
    }, {
        showToasts?: boolean | undefined;
        showStatus?: boolean | undefined;
    }>>>;
    logging: z.ZodDefault<z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        level: z.ZodDefault<z.ZodEnum<["debug", "info", "warn", "error"]>>;
        file: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        level: "debug" | "info" | "warn" | "error";
        file: string;
        enabled: boolean;
    }, {
        level?: "debug" | "info" | "warn" | "error" | undefined;
        file?: string | undefined;
        enabled?: boolean | undefined;
    }>>>;
}, "strip", z.ZodTypeAny, {
    validation: {
        autoValidate: boolean;
        validationInterval: number;
        strictMode: boolean;
    };
    enabled: boolean;
    protectedTools: string[];
    agentPermissions: Record<string, {
        level: "coordinator" | "worker" | "validator" | "meta";
        allowedTools: string[];
        deniedTools: string[];
        canDelegate: boolean;
        canWrite: boolean;
        canEdit: boolean;
        canBash: boolean;
    }>;
    compaction: {
        maxAnchors: number;
        contextLimit: number;
        preserveCritical: boolean;
    };
    tui: {
        showToasts: boolean;
        showStatus: boolean;
    };
    logging: {
        level: "debug" | "info" | "warn" | "error";
        file: string;
        enabled: boolean;
    };
}, {
    validation?: {
        autoValidate?: boolean | undefined;
        validationInterval?: number | undefined;
        strictMode?: boolean | undefined;
    } | undefined;
    enabled?: boolean | undefined;
    protectedTools?: string[] | undefined;
    agentPermissions?: Record<string, {
        level: "coordinator" | "worker" | "validator" | "meta";
        allowedTools?: string[] | undefined;
        deniedTools?: string[] | undefined;
        canDelegate?: boolean | undefined;
        canWrite?: boolean | undefined;
        canEdit?: boolean | undefined;
        canBash?: boolean | undefined;
    }> | undefined;
    compaction?: {
        maxAnchors?: number | undefined;
        contextLimit?: number | undefined;
        preserveCritical?: boolean | undefined;
    } | undefined;
    tui?: {
        showToasts?: boolean | undefined;
        showStatus?: boolean | undefined;
    } | undefined;
    logging?: {
        level?: "debug" | "info" | "warn" | "error" | undefined;
        file?: string | undefined;
        enabled?: boolean | undefined;
    } | undefined;
}>;
export type Config = z.infer<typeof ConfigSchema>;
/**
 * Create default configuration
 */
export declare function createDefaultConfig(): Config;
/**
 * Get permission for a specific agent
 */
export declare function getAgentPermission(config: Config, agentName: string): AgentPermission | null;
/**
 * Check if a tool is allowed for an agent
 */
export declare function isToolAllowed(permission: AgentPermission, toolName: string): boolean;
/**
 * Merge configs with precedence: plugin > project > global
 */
export declare function mergeConfigs(global: Partial<Config>, project: Partial<Config>, plugin: Partial<Config>): Config;
//# sourceMappingURL=config.d.ts.map