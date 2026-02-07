/**
 * idumb_read — Entity-Aware Traversal Engine.
 *
 * n4 Plugin B tool. NOT a file reader — an entity traversal engine that:
 * - Resolves what the path IS in the entity hierarchy
 * - Annotates every read with entity metadata (stale? chain-broken? dependencies?)
 * - Traverses — follows relatedTo, parentId, childIds links
 * - Extracts intelligence passively (comments, TODOs, stale refs, broken chains)
 * - Enforces scope — agents can only read what their role permits
 *
 * Modes:
 * - content:     Read file + entity metadata annotation (default)
 * - outline:     Return structure (functions, classes, sections) + entity context
 * - traverse:    Follow entity chain: read this → parent → related → children
 * - comments:    Extract comments + TODOs + FIXMEs with entity context
 * - chain-check: DON'T read content — just validate chain integrity
 *
 * Replaces innate `read` tool (disabled in agent frontmatter).
 * Every read tells the agent WHAT it's looking at, WHERE it sits in the
 * hierarchy, and WHETHER its chains are intact.
 */

import { tool } from "@opencode-ai/plugin/tool"
import { readFileSync, existsSync, readdirSync, statSync } from "fs"
import { join, extname } from "path"
import {
    resolveEntity,
    formatEntityAnnotation,
    isInProjectScope,
    type ResolvedEntity,
} from "../lib/entity-resolver.js"
import {
    validateChain,
    formatChainValidation,
} from "../lib/chain-validator.js"
import {
    readGovernanceState,
    formatGovernanceSummary,
    type GovernanceSnapshot,
} from "../lib/state-reader.js"
import { createLogger } from "../lib/logging.js"

// ─── Constants ──────────────────────────────────────────────────────

const DEFAULT_LIMIT = 200
const MAX_LIMIT = 800
const OUTLINE_PARSEABLE_EXTS = new Set([".ts", ".js", ".tsx", ".jsx", ".py", ".go", ".rs"])
const COMMENT_EXTRACTABLE_EXTS = new Set([".ts", ".js", ".tsx", ".jsx", ".py", ".go", ".rs"])

// ─── Modes ──────────────────────────────────────────────────────────

const MODES = ["content", "outline", "traverse", "comments", "chain-check"] as const
const DIRECTIONS = ["up", "down", "horizontal", "all"] as const

// ─── Tool Definition ────────────────────────────────────────────────

export const idumb_read = tool({

    description:
        `Entity-aware file reader that annotates every read with hierarchy metadata, ` +
        `chain integrity checks, and staleness detection. ` +
        `Modes: "content" (default, read with entity annotation), ` +
        `"outline" (structure + entity context), ` +
        `"traverse" (hop-read across entity chains — follows parent/children/related links), ` +
        `"comments" (extract TODOs/FIXMEs/JSDoc with entity context), ` +
        `"chain-check" (validate chain integrity without reading content). ` +
        `Use INSTEAD of innate read. Returns entity type, hierarchy position, staleness, and governance rules with every read.`,

    args: {
        path: tool.schema.string().describe(
            "File path to read (relative to project root or absolute)"
        ),
        mode: tool.schema.enum(MODES).optional().describe(
            "Intelligence mode: content (default), outline, traverse, comments, chain-check"
        ),
        // Traversal controls (mode=traverse)
        direction: tool.schema.enum(DIRECTIONS).optional().describe(
            "For traverse mode: which links to follow (default: all)"
        ),
        depth: tool.schema.number().optional().describe(
            "For traverse mode: how many hops (default: 1, max: 3)"
        ),
        // Pagination (mode=content)
        offset: tool.schema.number().optional().describe(
            "Line offset for content mode (0-indexed, default: 0)"
        ),
        limit: tool.schema.number().optional().describe(
            `Max lines to return for content mode (default: ${DEFAULT_LIMIT}, max: ${MAX_LIMIT})`
        ),
    },

    async execute(args, context) {
        const log = createLogger(context.directory, "idumb-read")
        const projectDir = context.directory
        const mode = args.mode || "content"
        const filePath = args.path

        log.info(`idumb_read: mode=${mode} path=${filePath}`)

        // ─── Scope Check ────────────────────────────────────────
        if (!isInProjectScope(filePath, projectDir)) {
            return `❌ SCOPE VIOLATION: "${filePath}" is outside the project scope or in a blocked path (node_modules, .git, .env).\n\nAllowed: files within ${projectDir}`
        }

        // ─── Resolve Entity ─────────────────────────────────────
        const entity = resolveEntity(filePath, projectDir)
        const absPath = entity.path

        // ─── Governance State (lightweight) ─────────────────────
        const govState = readGovernanceState(projectDir)

        // ─── Route to Mode Handler ──────────────────────────────
        try {
            switch (mode) {
                case "content":
                    return handleContent(entity, absPath, args, govState)
                case "outline":
                    return handleOutline(entity, absPath, govState)
                case "traverse":
                    return handleTraverse(entity, projectDir, args, govState)
                case "comments":
                    return handleComments(entity, absPath, govState)
                case "chain-check":
                    return handleChainCheck(entity, projectDir, govState)
                default:
                    return `❌ Unknown mode: "${mode}". Available: content, outline, traverse, comments, chain-check`
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            log.error(`idumb_read error: ${msg}`)
            return `❌ Read failed: ${msg}`
        }
    },
})

// ─── Mode: Content ──────────────────────────────────────────────────

function handleContent(
    entity: ResolvedEntity,
    absPath: string,
    args: { offset?: number; limit?: number },
    govState: GovernanceSnapshot,
): string {
    if (!existsSync(absPath)) {
        return `❌ File not found: ${entity.relativePath}`
    }

    const offset = Math.max(0, args.offset ?? 0)
    const limit = Math.min(MAX_LIMIT, Math.max(1, args.limit ?? DEFAULT_LIMIT))

    const content = readFileSync(absPath, "utf-8")
    const allLines = content.split("\n")
    const totalLines = allLines.length

    // Paginate
    const startLine = offset
    const endLine = Math.min(startLine + limit, totalLines)
    const pageLines = allLines.slice(startLine, endLine)

    // Build output with entity annotation
    const output: string[] = []

    // Entity annotation header
    output.push(formatEntityAnnotation(entity))
    output.push("")

    // Governance context
    output.push(formatGovernanceSummary(govState))
    output.push("")

    // File content with line numbers
    output.push(`File: ${entity.relativePath} (${totalLines} lines)`)
    if (startLine > 0 || endLine < totalLines) {
        output.push(`Showing lines ${startLine + 1}-${endLine} of ${totalLines}`)
    }
    output.push("")

    for (let i = 0; i < pageLines.length; i++) {
        const lineNum = startLine + i + 1
        output.push(`${lineNum}: ${pageLines[i]}`)
    }

    // More content indicator
    if (endLine < totalLines) {
        output.push("")
        output.push(`... ${totalLines - endLine} more lines. Use offset=${endLine} to continue.`)
    }

    // Intelligence extraction (lightweight: detect stale refs, todos inline)
    const intelligence = extractInlineIntelligence(pageLines, entity)
    if (intelligence.length > 0) {
        output.push("")
        output.push(`─── Intelligence Extracted ─────────────────────────────────────`)
        for (const item of intelligence) {
            output.push(`│ ${item}`)
        }
        output.push(`────────────────────────────────────────────────────────────────`)
    }

    return output.join("\n")
}

// ─── Mode: Outline ──────────────────────────────────────────────────

function handleOutline(
    entity: ResolvedEntity,
    absPath: string,
    govState: GovernanceSnapshot,
): string {
    if (!existsSync(absPath)) {
        return `❌ File not found: ${entity.relativePath}`
    }

    const content = readFileSync(absPath, "utf-8")
    const ext = extname(absPath).toLowerCase()
    const output: string[] = []

    // Entity annotation
    output.push(formatEntityAnnotation(entity))
    output.push("")
    output.push(formatGovernanceSummary(govState))
    output.push("")

    if (ext === ".md" || ext === ".mdx") {
        // Markdown: extract headings as outline
        output.push(`Outline: ${entity.relativePath} (Markdown)`)
        output.push("")
        const lines = content.split("\n")
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i]
            const headingMatch = line.match(/^(#{1,6})\s+(.+)/)
            if (headingMatch) {
                const level = headingMatch[1].length
                const indent = "  ".repeat(level - 1)
                output.push(`${indent}${headingMatch[0]} (line ${i + 1})`)
            }
        }
    } else if (ext === ".json") {
        // JSON: show top-level keys
        output.push(`Outline: ${entity.relativePath} (JSON)`)
        output.push("")
        try {
            const parsed = JSON.parse(content) as Record<string, unknown>
            if (typeof parsed === "object" && parsed !== null) {
                for (const key of Object.keys(parsed)) {
                    const val = parsed[key]
                    const type = Array.isArray(val) ? `array[${val.length}]`
                        : typeof val === "object" && val !== null ? `object{${Object.keys(val as Record<string, unknown>).length}}`
                            : typeof val
                    output.push(`  ${key}: ${type}`)
                }
            }
        } catch {
            output.push("  (invalid JSON)")
        }
    } else if (OUTLINE_PARSEABLE_EXTS.has(ext)) {
        // TypeScript/JavaScript: extract function/class/interface signatures
        output.push(`Outline: ${entity.relativePath} (${ext.slice(1).toUpperCase()})`)
        output.push("")

        const lines = content.split("\n")
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i]
            // Exports
            if (/^export\s+(type\s+|interface\s+|class\s+|function\s+|const\s+|enum\s+)/.test(line)) {
                const signature = line.replace(/\{.*$/, "").trim()
                output.push(`  [L${i + 1}] ${signature}`)
            }
            // Non-exported top-level functions/classes
            else if (/^(async\s+)?function\s+/.test(line) || /^class\s+/.test(line)) {
                const signature = line.replace(/\{.*$/, "").trim()
                output.push(`  [L${i + 1}] ${signature}`)
            }
            // Section separators (idumb convention: // ─── Section Name ───)
            else if (/^\/\/\s*─+\s+(.+?)\s*─+/.test(line)) {
                const match = line.match(/^\/\/\s*─+\s+(.+?)\s*─+/)
                if (match) {
                    output.push(``)
                    output.push(`  ── ${match[1]} ──`)
                }
            }
        }
    } else {
        output.push(`Outline not available for ${ext} files. Use mode="content" instead.`)
    }

    return output.join("\n")
}

// ─── Mode: Traverse ─────────────────────────────────────────────────

function handleTraverse(
    entity: ResolvedEntity,
    projectDir: string,
    args: { direction?: string; depth?: number },
    govState: GovernanceSnapshot,
): string {
    const direction = args.direction || "all"
    const depth = Math.min(3, Math.max(1, args.depth ?? 1))

    const output: string[] = []

    // Entity annotation
    output.push(formatEntityAnnotation(entity))
    output.push("")
    output.push(formatGovernanceSummary(govState))
    output.push("")
    output.push(`─── Traversal: ${entity.relativePath} → ${direction.toUpperCase()} (${depth} hops) ─────────`)
    output.push("")

    // HOP 0: Origin entity summary
    output.push(`HOP 0 (origin): ${entity.relativePath}`)
    output.push(`  Type: ${entity.entityType} | Stale: ${entity.properties.isStale ? "⚠️ YES" : "no"}`)
    if (entity.properties.lineCount) {
        output.push(`  Size: ${entity.properties.lineCount} lines`)
    }
    output.push("")

    // Traverse based on direction
    const visited = new Set<string>([entity.relativePath])

    if ((direction === "up" || direction === "all") && entity.hierarchy.parent) {
        traverseHop(entity.hierarchy.parent, projectDir, output, visited, 1, depth, "parent")
    }

    if (direction === "horizontal" || direction === "all") {
        for (const related of entity.hierarchy.relatedTo) {
            traverseHop(related, projectDir, output, visited, 1, depth, "related")
        }
    }

    if (direction === "down" || direction === "all") {
        for (const child of entity.hierarchy.children) {
            traverseHop(child, projectDir, output, visited, 1, depth, "child")
        }
    }

    // Chain integrity check
    output.push("")
    const chainResult = validateChain(entity.relativePath, projectDir, "read", depth)
    output.push(formatChainValidation(chainResult))

    return output.join("\n")
}

function traverseHop(
    path: string,
    projectDir: string,
    output: string[],
    visited: Set<string>,
    currentHop: number,
    maxHops: number,
    relationship: string,
): void {
    if (visited.has(path) || currentHop > maxHops) return
    visited.add(path)

    const absPath = join(projectDir, path)
    const exists = existsSync(absPath)

    output.push(`HOP ${currentHop} (${relationship}): ${path}`)

    if (!exists) {
        output.push(`  ❌ NOT FOUND — broken ${relationship} link`)
        output.push("")
        return
    }

    try {
        const hopEntity = resolveEntity(path, projectDir)
        output.push(`  Type: ${hopEntity.entityType} | Stale: ${hopEntity.properties.isStale ? "⚠️ YES" : "no"}`)

        if (hopEntity.properties.lineCount) {
            output.push(`  Size: ${hopEntity.properties.lineCount} lines`)
        }

        // For directories, list contents
        const stat = statSync(absPath)
        if (stat.isDirectory()) {
            try {
                const children = readdirSync(absPath).filter(f => !f.startsWith("."))
                output.push(`  Contents: [${children.slice(0, 10).join(", ")}${children.length > 10 ? ", ..." : ""}]`)
            } catch { /* skip */ }
        }

        output.push("")

        // Recurse if allowed
        if (currentHop < maxHops) {
            if (hopEntity.hierarchy.parent && !visited.has(hopEntity.hierarchy.parent)) {
                traverseHop(hopEntity.hierarchy.parent, projectDir, output, visited, currentHop + 1, maxHops, "parent")
            }
            for (const related of hopEntity.hierarchy.relatedTo) {
                if (!visited.has(related)) {
                    traverseHop(related, projectDir, output, visited, currentHop + 1, maxHops, "related")
                }
            }
        }
    } catch {
        output.push(`  (unable to resolve entity metadata)`)
        output.push("")
    }
}

// ─── Mode: Comments ─────────────────────────────────────────────────

function handleComments(
    entity: ResolvedEntity,
    absPath: string,
    govState: GovernanceSnapshot,
): string {
    if (!existsSync(absPath)) {
        return `❌ File not found: ${entity.relativePath}`
    }

    const ext = extname(absPath).toLowerCase()
    const content = readFileSync(absPath, "utf-8")
    const lines = content.split("\n")
    const output: string[] = []

    // Entity annotation
    output.push(formatEntityAnnotation(entity))
    output.push("")
    output.push(formatGovernanceSummary(govState))
    output.push("")
    output.push(`Comments extracted from ${entity.relativePath}:`)
    output.push("")

    let commentCount = 0

    if (COMMENT_EXTRACTABLE_EXTS.has(ext)) {
        // Extract JS/TS comments
        let inBlockComment = false
        let blockCommentLines: string[] = []
        let blockStartLine = 0

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim()

            // Block comment start
            if (line.startsWith("/**") || line.startsWith("/*")) {
                inBlockComment = true
                blockCommentLines = [line]
                blockStartLine = i + 1
                if (line.endsWith("*/")) {
                    inBlockComment = false
                    output.push(`[JSDoc] L${blockStartLine}: ${blockCommentLines.join(" ").replace(/\/\*\*?|\*\//g, "").trim()}`)
                    commentCount++
                }
                continue
            }

            if (inBlockComment) {
                blockCommentLines.push(line)
                if (line.endsWith("*/") || line === "*/") {
                    inBlockComment = false
                    const text = blockCommentLines.join(" ").replace(/\/\*\*?|\*\/|\* ?/g, "").trim()
                    output.push(`[JSDoc] L${blockStartLine}-${i + 1}: ${text.slice(0, 200)}`)
                    commentCount++
                }
                continue
            }

            // Single-line comments with markers
            const todoMatch = line.match(/\/\/\s*(TODO|FIXME|HACK|XXX|NOTE|BUG):?\s*(.*)/)
            if (todoMatch) {
                const marker = todoMatch[1]
                const text = todoMatch[2]
                output.push(`[${marker}] L${i + 1}: ${text}`)
                commentCount++
                continue
            }

            // Section separators (idumb convention)
            const sectionMatch = line.match(/^\/\/\s*─+\s+(.+?)\s*─+/)
            if (sectionMatch) {
                output.push(`[Section] L${i + 1}: ${sectionMatch[1]}`)
                commentCount++
            }
        }
    } else if (ext === ".md" || ext === ".mdx") {
        // Extract HTML comments from markdown
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim()
            const htmlComment = line.match(/<!--\s*(.+?)\s*-->/)
            if (htmlComment) {
                output.push(`[Comment] L${i + 1}: ${htmlComment[1]}`)
                commentCount++
            }
            // Also extract TODO patterns from markdown
            const todoMatch = line.match(/(TODO|FIXME|NOTE):?\s*(.*)/)
            if (todoMatch) {
                output.push(`[${todoMatch[1]}] L${i + 1}: ${todoMatch[2]}`)
                commentCount++
            }
        }
    }

    if (commentCount === 0) {
        output.push("  (no comments or markers found)")
    }

    output.push("")
    output.push(`Total: ${commentCount} comments/markers extracted`)

    return output.join("\n")
}

// ─── Mode: Chain-Check ──────────────────────────────────────────────

function handleChainCheck(
    entity: ResolvedEntity,
    projectDir: string,
    govState: GovernanceSnapshot,
): string {
    const output: string[] = []

    // Entity annotation
    output.push(formatEntityAnnotation(entity))
    output.push("")
    output.push(formatGovernanceSummary(govState))
    output.push("")

    // Full chain validation (up to 3 hops)
    const chainResult = validateChain(entity.relativePath, projectDir, "read", 3)
    output.push(formatChainValidation(chainResult))

    // Summary recommendation
    output.push("")
    if (chainResult.isValid && chainResult.breaks.length === 0 && chainResult.warnings.length === 0) {
        output.push("✅ All chains intact. Safe to proceed with modifications.")
    } else if (chainResult.breaks.length > 0) {
        output.push("⚠️ RECOMMENDATION: Fix chain breaks before modifying this entity.")
        output.push("   Broken links can cause context poisoning and stale references in downstream agents.")
    } else if (chainResult.staleEntities.length > 0) {
        output.push("⚠️ RECOMMENDATION: Refresh stale entities to ensure current context.")
    }

    return output.join("\n")
}

// ─── Intelligence Extraction ────────────────────────────────────────

function extractInlineIntelligence(
    lines: string[],
    entity: ResolvedEntity,
): string[] {
    const intelligence: string[] = []
    let todoCount = 0
    let fixmeCount = 0

    for (const line of lines) {
        if (/TODO/i.test(line)) todoCount++
        if (/FIXME/i.test(line)) fixmeCount++
    }

    if (todoCount > 0) {
        intelligence.push(`ℹ️ ${todoCount} TODO markers found in visible range`)
    }
    if (fixmeCount > 0) {
        intelligence.push(`⚠️ ${fixmeCount} FIXME markers found — potential bugs`)
    }
    if (entity.properties.isStale) {
        intelligence.push(`⚠️ This entity is STALE — consider refreshing before relying on its content`)
    }

    return intelligence
}
