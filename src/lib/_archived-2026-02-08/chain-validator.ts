/**
 * Chain Validator — validates entity chains and detects breaks.
 *
 * n4 Core Concept: Chain-Breaking
 * Entities are chained through guarded schema. If any metadata, property,
 * or child class breaks → force a hook. This module detects those breaks.
 *
 * Every Plugin B tool calls this before operating to answer:
 * 1. Is the parent chain intact?
 * 2. Are all relatedTo links valid (not missing, not abandoned)?
 * 3. Are any entities in the chain stale (time-to-stale exceeded)?
 * 4. For writes: should we BLOCK because chain integrity is required?
 *
 * n4 Core Concept: Time-to-Stale
 * Every entity has timestamps. Auto-decay confidence. Cron-like staleness
 * checks. Earlier events don't win over newer.
 */

import { existsSync } from "fs"
import { join } from "path"
import {
    resolveEntity,
    type ResolvedEntity,
    type EntityType,
} from "./entity-resolver.js"

// ─── Chain Validation Results ────────────────────────────────────────

export interface ChainBreak {
    type: "missing-parent" | "missing-child" | "broken-link" | "schema-invalid" | "abandoned-link"
    entityPath: string
    expectedLink: string
    description: string
}

export interface ChainWarning {
    type: "stale-link" | "unresolved-research" | "confidence-low"
    entityPath: string
    description: string
}

export interface StaleEntity {
    path: string
    modifiedAt: number
    staleAfter: number
    staleSince: number           // how long past TTL
    decayedConfidence?: number   // for brain entries
}

export interface ChainValidationResult {
    isValid: boolean              // true if no breaks
    breaks: ChainBreak[]
    warnings: ChainWarning[]
    staleEntities: StaleEntity[]
    checkedEntities: number       // how many entities were visited
}

// ─── Pre-built Validation Configs ────────────────────────────────────

/**
 * Which entity types require full chain validation before write.
 * Types NOT in this set allow writes without chain checks.
 */
const CHAIN_REQUIRED_TYPES = new Set<EntityType>([
    "planning-artifact",
    "agent-profile",
    "schema",
])

// ─── Main Validator ──────────────────────────────────────────────────

/**
 * Validate the chain integrity for an entity.
 *
 * For reads: returns validation result with breaks/warnings annotated.
 * For writes: if chain is broken and entity type requires integrity → isValid=false.
 *
 * @param entityPath - file path to validate
 * @param projectDir - project root directory
 * @param operation - 'read' (advisory) or 'write' (potentially blocking)
 * @param maxDepth - how many hops to validate (default: 2)
 */
export function validateChain(
    entityPath: string,
    projectDir: string,
    operation: "read" | "write" = "read",
    maxDepth: number = 2,
): ChainValidationResult {
    const result: ChainValidationResult = {
        isValid: true,
        breaks: [],
        warnings: [],
        staleEntities: [],
        checkedEntities: 0,
    }

    const visited = new Set<string>()

    try {
        const entity = resolveEntity(entityPath, projectDir)
        validateEntityChain(entity, projectDir, result, visited, 0, maxDepth)
    } catch (err) {
        // If we can't even resolve the entity, that's a break
        result.breaks.push({
            type: "schema-invalid",
            entityPath,
            expectedLink: "",
            description: `Failed to resolve entity: ${err instanceof Error ? err.message : String(err)}`,
        })
    }

    // Determine validity:
    // - Reads: breaks are advisory (warnings), not blocking
    // - Writes: breaks are blocking IF entity type requires chain integrity
    if (operation === "write" && result.breaks.length > 0) {
        const entity = resolveEntity(entityPath, projectDir)
        if (CHAIN_REQUIRED_TYPES.has(entity.entityType)) {
            result.isValid = false
        }
    }

    return result
}

// ─── Recursive Chain Walker ──────────────────────────────────────────

function validateEntityChain(
    entity: ResolvedEntity,
    projectDir: string,
    result: ChainValidationResult,
    visited: Set<string>,
    currentDepth: number,
    maxDepth: number,
): void {
    // Prevent cycles
    if (visited.has(entity.relativePath)) return
    visited.add(entity.relativePath)
    result.checkedEntities++

    // Check 1: Does the entity itself exist?
    if (!existsSync(entity.path)) {
        // Not necessarily a break — file might be being created
        // Only flag if this is a link target (not the root entity)
        if (currentDepth > 0) {
            result.breaks.push({
                type: "missing-child",
                entityPath: entity.relativePath,
                expectedLink: entity.relativePath,
                description: `Entity does not exist on disk`,
            })
        }
        return // Can't validate further
    }

    // Check 2: Staleness
    if (entity.properties.isStale && entity.properties.modifiedAt && entity.properties.staleAfter) {
        const staleSince = Date.now() - entity.properties.modifiedAt - entity.properties.staleAfter
        result.staleEntities.push({
            path: entity.relativePath,
            modifiedAt: entity.properties.modifiedAt,
            staleAfter: entity.properties.staleAfter,
            staleSince,
        })
        result.warnings.push({
            type: "stale-link",
            entityPath: entity.relativePath,
            description: `Entity is STALE (exceeded TTL by ${Math.round(staleSince / (60 * 60 * 1000))}h)`,
        })
    }

    // Don't recurse deeper
    if (currentDepth >= maxDepth) return

    // Check 3: Validate parent exists (upstream chain)
    if (entity.hierarchy.parent) {
        const parentPath = entity.hierarchy.parent
        const absParent = join(projectDir, parentPath)

        // Parent could be a directory or a file
        if (!existsSync(absParent)) {
            result.breaks.push({
                type: "missing-parent",
                entityPath: entity.relativePath,
                expectedLink: parentPath,
                description: `Parent entity "${parentPath}" does not exist`,
            })
        }
    }

    // Check 4: Validate relatedTo links (horizontal chain)
    for (const relatedPath of entity.hierarchy.relatedTo) {
        const absRelated = join(projectDir, relatedPath)

        if (!existsSync(absRelated)) {
            result.breaks.push({
                type: "broken-link",
                entityPath: entity.relativePath,
                expectedLink: relatedPath,
                description: `Related entity "${relatedPath}" does not exist (broken horizontal link)`,
            })
            continue
        }

        // Check if related entity is abandoned (context poison!)
        try {
            const relatedEntity = resolveEntity(relatedPath, projectDir)
            if (relatedEntity.properties.status === "abandoned") {
                result.breaks.push({
                    type: "abandoned-link",
                    entityPath: entity.relativePath,
                    expectedLink: relatedPath,
                    description: `Related entity "${relatedPath}" is ABANDONED (context poison risk)`,
                })
            }

            // Recurse into related entity
            validateEntityChain(relatedEntity, projectDir, result, visited, currentDepth + 1, maxDepth)
        } catch {
            // Non-critical — just skip this related entity
        }
    }

    // Check 5: Validate children exist (downstream chain)
    for (const childPath of entity.hierarchy.children) {
        const absChild = join(projectDir, childPath)

        if (!existsSync(absChild)) {
            result.breaks.push({
                type: "missing-child",
                entityPath: entity.relativePath,
                expectedLink: childPath,
                description: `Child entity "${childPath}" does not exist`,
            })
            continue
        }

        // Recurse into child
        try {
            const childEntity = resolveEntity(childPath, projectDir)
            validateEntityChain(childEntity, projectDir, result, visited, currentDepth + 1, maxDepth)
        } catch {
            // Non-critical
        }
    }
}

// ─── Formatting ──────────────────────────────────────────────────────

/**
 * Format chain validation result as a readable annotation block.
 */
export function formatChainValidation(result: ChainValidationResult): string {
    const lines: string[] = [
        `─── Chain Integrity Report ─────────────────────────────────────`,
    ]

    if (result.breaks.length === 0 && result.warnings.length === 0 && result.staleEntities.length === 0) {
        lines.push(`│ ✅ Chain intact (${result.checkedEntities} entities checked)`)
        lines.push(`────────────────────────────────────────────────────────────────`)
        return lines.join("\n")
    }

    // Breaks (critical)
    if (result.breaks.length > 0) {
        lines.push(`│`)
        lines.push(`│ ❌ BREAKS (${result.breaks.length}):`)
        for (const b of result.breaks) {
            lines.push(`│   [${b.type}] ${b.description}`)
            if (b.expectedLink) {
                lines.push(`│     → Expected: ${b.expectedLink}`)
            }
        }
    }

    // Stale entities
    if (result.staleEntities.length > 0) {
        lines.push(`│`)
        lines.push(`│ ⚠️ STALE ENTITIES (${result.staleEntities.length}):`)
        for (const s of result.staleEntities) {
            const hours = Math.round(s.staleSince / (60 * 60 * 1000))
            lines.push(`│   ${s.path} — stale by ${hours}h`)
        }
    }

    // Warnings
    if (result.warnings.length > 0) {
        lines.push(`│`)
        lines.push(`│ ⚠️ WARNINGS (${result.warnings.length}):`)
        for (const w of result.warnings) {
            lines.push(`│   [${w.type}] ${w.description}`)
        }
    }

    lines.push(`│`)
    lines.push(`│ Verdict: ${result.isValid ? "⚠️ PARTIAL (issues detected but non-blocking)" : "❌ BLOCKED (chain integrity required)"}`)
    lines.push(`│ Entities checked: ${result.checkedEntities}`)
    lines.push(`────────────────────────────────────────────────────────────────`)

    return lines.join("\n")
}
