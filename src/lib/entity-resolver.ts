/**
 * Entity Resolver — maps file paths → entity type + hierarchy + governance rules.
 *
 * The brain of all Plugin B tools. Every tool asks:
 * "What IS this path in the entity hierarchy?"
 *
 * n4 Core Concept: Intelligence = awareness for context purification
 * and selective anchor points — traversing horizontally and vertically
 * across upstream and downstream of multiple related entities.
 *
 * This module answers:
 * 1. What TYPE is this entity? (planning-artifact, schema, agent-profile, etc.)
 * 2. Where is it in the HIERARCHY? (parent, children, related)
 * 3. What PROPERTIES does it have? (timestamps, staleness, confidence, chain integrity)
 * 4. What GOVERNANCE rules apply? (who can read/write, requires active task?, triggers upstream?)
 */

import { readFileSync, statSync, existsSync } from "fs"
import { join, relative, extname, dirname } from "path"

// ─── Entity Types ────────────────────────────────────────────────────

export type EntityType =
    | "planning-artifact"      // implementation plans, research docs, specs, walkthroughs
    | "agent-profile"          // .opencode/agents/*.md
    | "governance-config"      // .idumb/config.json, .idumb/brain/*.json
    | "schema"                 // src/schemas/*.ts
    | "source-code"            // src/**/*.ts (application code)
    | "brain-entry"            // .idumb/brain/knowledge/*.json
    | "task-store"             // .idumb/brain/tasks.json
    | "delegation-store"       // .idumb/brain/delegations.json
    | "project-map"            // .idumb/brain/project-map.json
    | "codemap"                // .idumb/brain/codemap.json
    | "hook-state"             // .idumb/brain/hook-state.json
    | "template"               // .idumb/idumb-modules/**
    | "test"                   // tests/**/*.ts
    | "documentation"          // *.md at root or docs/
    | "config-file"            // package.json, tsconfig.json, opencode.json
    | "unknown"                // unclassified (external files)

// ─── Hierarchy ───────────────────────────────────────────────────────

export interface EntityHierarchy {
    parent?: string              // parent entity path/ID
    children: string[]           // child entity paths/IDs
    relatedTo: string[]          // cross-references (horizontal links)
    depth: number                // 0 = root, 1 = epic-level, 2 = task-level, 3 = subtask
}

// ─── Properties ──────────────────────────────────────────────────────

export interface EntityProperties {
    createdAt?: number
    modifiedAt?: number
    staleAfter?: number          // TTL in ms — time-to-stale
    isStale: boolean             // computed: modifiedAt + staleAfter < now
    confidence?: number          // 0-100 for brain entries
    status?: string              // lifecycle status (active, superseded, abandoned, resolved)
    chainIntegrity: "intact" | "broken" | "unknown"
    fileSize?: number            // bytes
    lineCount?: number           // for text files
}

// ─── Governance Rules ────────────────────────────────────────────────

export interface EntityGovernance {
    canWrite: string[]            // which agent roles can write this
    canRead: string[]             // which agent roles can read (usually ["*"])
    requiresActiveTask: boolean
    requiresChainIntegrity: boolean  // must parent chain be intact to modify?
    triggersUpstreamUpdate: boolean  // does modifying this require upstream refresh?
    requiredSchema?: string       // schema name that validates this entity
    isReadOnly?: boolean          // true for innate read-only entities
}

// ─── Resolved Entity ─────────────────────────────────────────────────

export interface ResolvedEntity {
    path: string                  // absolute or relative path
    relativePath: string          // relative to project root
    entityType: EntityType
    hierarchy: EntityHierarchy
    properties: EntityProperties
    governance: EntityGovernance
}

// ─── Classification Rules ────────────────────────────────────────────

interface ClassificationRule {
    pattern: RegExp
    entityType: EntityType
    governance: Partial<EntityGovernance>
    staleAfterMs?: number         // default time-to-stale for this type
}

/**
 * Classification rules applied in order — first match wins.
 * More specific patterns MUST come before general ones.
 */
const CLASSIFICATION_RULES: ClassificationRule[] = [
    // ─── Brain State Files (most specific .idumb paths first) ────
    {
        pattern: /\.idumb\/brain\/tasks\.json$/,
        entityType: "task-store",
        governance: {
            canWrite: ["idumb-supreme-coordinator", "idumb-meta-builder", "idumb-builder"],
            requiresActiveTask: false,  // Tasks are managed by idumb_task tool
            requiresChainIntegrity: false,
            triggersUpstreamUpdate: false,
            isReadOnly: false,
        },
    },
    {
        pattern: /\.idumb\/brain\/delegations\.json$/,
        entityType: "delegation-store",
        governance: {
            canWrite: ["idumb-supreme-coordinator", "idumb-meta-builder"],
            requiresActiveTask: false,
            requiresChainIntegrity: false,
            triggersUpstreamUpdate: false,
        },
    },
    {
        pattern: /\.idumb\/brain\/project-map\.json$/,
        entityType: "project-map",
        governance: {
            canWrite: ["idumb-meta-builder", "idumb-supreme-coordinator"],
            requiresActiveTask: false,
            requiresChainIntegrity: false,
            triggersUpstreamUpdate: false,
        },
    },
    {
        pattern: /\.idumb\/brain\/codemap\.json$/,
        entityType: "codemap",
        governance: {
            canWrite: ["idumb-meta-builder", "idumb-builder"],
            requiresActiveTask: false,
            requiresChainIntegrity: false,
            triggersUpstreamUpdate: false,
        },
    },
    {
        pattern: /\.idumb\/brain\/hook-state\.json$/,
        entityType: "hook-state",
        governance: {
            canWrite: [],  // Only plugin hooks write this
            requiresActiveTask: false,
            requiresChainIntegrity: false,
            triggersUpstreamUpdate: false,
            isReadOnly: true,
        },
    },
    {
        pattern: /\.idumb\/brain\/knowledge/,
        entityType: "brain-entry",
        governance: {
            canWrite: ["idumb-supreme-coordinator", "idumb-meta-builder", "idumb-builder"],
            requiresActiveTask: false,
            requiresChainIntegrity: false,
            triggersUpstreamUpdate: false,
        },
        staleAfterMs: 7 * 24 * 60 * 60 * 1000, // 7 days
    },

    // ─── Governance Config ───────────────────────────────────────
    {
        pattern: /\.idumb\/config\.json$/,
        entityType: "governance-config",
        governance: {
            canWrite: ["idumb-meta-builder"],
            requiresActiveTask: false,
            requiresChainIntegrity: false,
            triggersUpstreamUpdate: false,
            requiredSchema: "IdumbConfig",
        },
    },
    {
        pattern: /\.idumb\/idumb-modules\//,
        entityType: "template",
        governance: {
            canWrite: ["idumb-meta-builder"],
            requiresActiveTask: true,
            requiresChainIntegrity: false,
            triggersUpstreamUpdate: false,
        },
    },

    // ─── Agent Profiles ──────────────────────────────────────────
    {
        pattern: /\.opencode\/agents\/.*\.md$/,
        entityType: "agent-profile",
        governance: {
            canWrite: ["idumb-meta-builder"],
            requiresActiveTask: true,
            requiresChainIntegrity: true,
            triggersUpstreamUpdate: false,
            requiredSchema: "AgentProfile",
        },
    },

    // ─── Planning Artifacts ──────────────────────────────────────
    {
        pattern: /planning\/|plans?\//i,
        entityType: "planning-artifact",
        governance: {
            canWrite: ["idumb-supreme-coordinator", "idumb-builder", "idumb-meta-builder"],
            requiresActiveTask: true,
            requiresChainIntegrity: true,
            triggersUpstreamUpdate: true,
        },
        staleAfterMs: 48 * 60 * 60 * 1000, // 48 hours
    },

    // ─── Source Code ─────────────────────────────────────────────
    {
        pattern: /src\/schemas\/.*\.ts$/,
        entityType: "schema",
        governance: {
            canWrite: ["idumb-builder"],
            requiresActiveTask: true,
            requiresChainIntegrity: true,
            triggersUpstreamUpdate: true,
        },
    },
    {
        pattern: /src\/.*\.ts$/,
        entityType: "source-code",
        governance: {
            canWrite: ["idumb-builder"],
            requiresActiveTask: true,
            requiresChainIntegrity: false,
            triggersUpstreamUpdate: false,
        },
    },
    {
        pattern: /tests?\/.*\.(ts|js)$/,
        entityType: "test",
        governance: {
            canWrite: ["idumb-builder", "idumb-validator"],
            requiresActiveTask: true,
            requiresChainIntegrity: false,
            triggersUpstreamUpdate: false,
        },
    },

    // ─── Config Files ────────────────────────────────────────────
    {
        pattern: /^(package\.json|tsconfig\.json|opencode\.json)$/,
        entityType: "config-file",
        governance: {
            canWrite: ["idumb-builder", "idumb-meta-builder"],
            requiresActiveTask: true,
            requiresChainIntegrity: false,
            triggersUpstreamUpdate: false,
        },
    },

    // ─── Documentation ──────────────────────────────────────────
    {
        pattern: /\.(md|mdx)$/,
        entityType: "documentation",
        governance: {
            canWrite: ["*"],
            requiresActiveTask: true,
            requiresChainIntegrity: false,
            triggersUpstreamUpdate: false,
        },
    },
]

// ─── Default Governance ──────────────────────────────────────────────

const DEFAULT_GOVERNANCE: EntityGovernance = {
    canWrite: ["*"],
    canRead: ["*"],
    requiresActiveTask: true,
    requiresChainIntegrity: false,
    triggersUpstreamUpdate: false,
}

// ─── Resolver ────────────────────────────────────────────────────────

/**
 * Resolve a file path into its entity classification.
 *
 * This is the core intelligence function. Every Plugin B tool calls this
 * to understand WHAT it is reading/writing/executing BEFORE doing anything.
 */
export function resolveEntity(filePath: string, projectDir: string): ResolvedEntity {
    const relPath = filePath.startsWith("/")
        ? relative(projectDir, filePath)
        : filePath
    const absPath = filePath.startsWith("/")
        ? filePath
        : join(projectDir, filePath)

    // Classify by pattern matching
    const classification = classifyPath(relPath)

    // Resolve properties from file system
    const properties = resolveProperties(absPath, classification)

    // Resolve hierarchy (lightweight — no disk traversal here, that's chain-validator)
    const hierarchy = resolveHierarchy(relPath, classification.entityType)

    // Build governance rules
    const governance: EntityGovernance = {
        ...DEFAULT_GOVERNANCE,
        ...classification.governance,
        canRead: classification.governance.canRead ?? ["*"],
    }

    return {
        path: absPath,
        relativePath: relPath,
        entityType: classification.entityType,
        hierarchy,
        properties,
        governance,
    }
}

// ─── Internal Helpers ────────────────────────────────────────────────

interface ClassificationResult {
    entityType: EntityType
    governance: Partial<EntityGovernance>
    staleAfterMs?: number
}

function classifyPath(relPath: string): ClassificationResult {
    // Normalize separators for matching
    const normalized = relPath.replace(/\\/g, "/")

    for (const rule of CLASSIFICATION_RULES) {
        if (rule.pattern.test(normalized)) {
            return {
                entityType: rule.entityType,
                governance: rule.governance,
                staleAfterMs: rule.staleAfterMs,
            }
        }
    }

    return {
        entityType: "unknown",
        governance: {},
    }
}

function resolveProperties(absPath: string, classification: ClassificationResult): EntityProperties {
    const properties: EntityProperties = {
        isStale: false,
        chainIntegrity: "unknown",
    }

    // Try to get file stat for timestamps
    try {
        if (existsSync(absPath)) {
            const stat = statSync(absPath)
            properties.modifiedAt = stat.mtimeMs
            properties.createdAt = stat.birthtimeMs
            properties.fileSize = stat.size

            // Count lines for text files
            const ext = extname(absPath).toLowerCase()
            if ([".ts", ".js", ".md", ".json", ".yaml", ".yml", ".txt"].includes(ext)) {
                try {
                    const content = readFileSync(absPath, "utf-8")
                    properties.lineCount = content.split("\n").length
                } catch {
                    // Can't read — skip line count
                }
            }

            // Time-to-stale calculation
            if (classification.staleAfterMs) {
                properties.staleAfter = classification.staleAfterMs
                const age = Date.now() - stat.mtimeMs
                properties.isStale = age > classification.staleAfterMs
            }
        }
    } catch {
        // File might not exist yet (create mode) — that's fine
    }

    return properties
}

function resolveHierarchy(relPath: string, entityType: EntityType): EntityHierarchy {
    const hierarchy: EntityHierarchy = {
        children: [],
        relatedTo: [],
        depth: 0,
    }

    switch (entityType) {
        case "planning-artifact":
            // Planning artifacts live in a hierarchy:
            // project root → planning/ → specific plan
            hierarchy.depth = 2
            hierarchy.parent = dirname(relPath)
            break

        case "agent-profile":
            // Agent profiles are children of the meta-builder's output
            hierarchy.depth = 2
            hierarchy.parent = ".opencode/agents"
            break

        case "schema":
            // Schemas are source-of-truth entities — many things depend on them
            hierarchy.depth = 1
            hierarchy.parent = "src/schemas"
            break

        case "source-code":
            // Source code depth varies by directory
            hierarchy.depth = relPath.split("/").length - 1
            hierarchy.parent = dirname(relPath)
            break

        case "task-store":
        case "delegation-store":
        case "project-map":
        case "codemap":
        case "hook-state":
            // Brain state files are root-level entities
            hierarchy.depth = 0
            break

        case "brain-entry":
            hierarchy.depth = 1
            hierarchy.parent = ".idumb/brain/knowledge"
            break

        case "template":
            hierarchy.depth = 2
            hierarchy.parent = ".idumb/idumb-modules"
            break

        default:
            hierarchy.depth = 0
    }

    return hierarchy
}

// ─── Scope Validation ────────────────────────────────────────────────

/**
 * Check if a path is within the project scope.
 * Prevents reads/writes outside the project directory.
 */
export function isInProjectScope(filePath: string, projectDir: string): boolean {
    const absPath = filePath.startsWith("/")
        ? filePath
        : join(projectDir, filePath)

    // Must be within project dir
    const rel = relative(projectDir, absPath)
    if (rel.startsWith("..") || rel.startsWith("/")) return false

    // Block sensitive paths
    const blocked = [
        /node_modules\//,
        /\.git\//,
        /\.env$/,
        /\.env\./,
    ]
    for (const pattern of blocked) {
        if (pattern.test(rel)) return false
    }

    return true
}

/**
 * Check if an agent role has write permission for this entity.
 */
export function canAgentWrite(entity: ResolvedEntity, agentRole: string): boolean {
    if (entity.governance.isReadOnly) return false
    if (entity.governance.canWrite.includes("*")) return true
    return entity.governance.canWrite.some(role =>
        agentRole.includes(role) || role.includes(agentRole)
    )
}

/**
 * Format entity metadata as a readable annotation block.
 * This is prepended to tool output so agents always know
 * WHAT they're looking at in the entity hierarchy.
 */
export function formatEntityAnnotation(entity: ResolvedEntity): string {
    const lines: string[] = [
        `─── Entity: ${entity.entityType} ──────────────────────────────────`,
    ]

    // Status + staleness
    if (entity.properties.status) {
        lines.push(`│ Status: ${entity.properties.status}`)
    }
    if (entity.properties.isStale) {
        const staleMs = entity.properties.staleAfter
            ? Date.now() - (entity.properties.modifiedAt ?? 0) - entity.properties.staleAfter
            : 0
        const staleHours = Math.round(staleMs / (60 * 60 * 1000))
        lines.push(`│ ⚠️ STALE: exceeded TTL by ${staleHours}h`)
    }

    // Hierarchy
    if (entity.hierarchy.parent) {
        lines.push(`│ Parent: ${entity.hierarchy.parent}`)
    }
    if (entity.hierarchy.relatedTo.length > 0) {
        lines.push(`│ Related: [${entity.hierarchy.relatedTo.join(", ")}]`)
    }
    if (entity.hierarchy.children.length > 0) {
        lines.push(`│ Children: ${entity.hierarchy.children.length} entities`)
    }

    // Chain integrity
    const chainIcon = entity.properties.chainIntegrity === "intact" ? "✅"
        : entity.properties.chainIntegrity === "broken" ? "❌"
            : "❓"
    lines.push(`│ Chain: ${chainIcon} ${entity.properties.chainIntegrity}`)

    // File info
    if (entity.properties.lineCount) {
        lines.push(`│ Size: ${entity.properties.lineCount} lines`)
    }

    // Governance
    if (entity.governance.requiresActiveTask) {
        lines.push(`│ Governance: requires active task`)
    }
    if (entity.governance.triggersUpstreamUpdate) {
        lines.push(`│ Governance: triggers upstream update on write`)
    }

    lines.push(`────────────────────────────────────────────────────────────────`)

    return lines.join("\n")
}
