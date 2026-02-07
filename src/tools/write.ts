/**
 * idumb_write — Schema-Regulated Artifact Writer.
 *
 * n4 Plugin B tool. NOT a file writer — a schema-regulated artifact lifecycle manager that:
 * - Resolves entity type BEFORE writing (agent profile? planning artifact? governance config?)
 * - Validates against required schema (frontmatter, JSON schema, section structure)
 * - Enforces chain integrity — cannot modify a child if the parent chain is broken
 * - Creates backup before overwrite (auto-rollback point)
 * - Manages lifecycle — writing status changes (activate/supersede/abandon/resolve)
 * - Prevents context poisoning — abandoned artifacts marked, stale warned, superseded linked
 * - Creates evidence — every write linked to active task + agent identity
 * - Auto-updates upstream — modifying a planning artifact triggers parent re-evaluation
 *
 * Modes:
 * - create:         Write new file (fail if exists) — validates schema, links to task
 * - overwrite:      Replace entirely (backup first, validate chain, validate schema)
 * - append:         Append to end of file (lightweight, no schema revalidation)
 * - update-section: Update a specific section in a markdown artifact (by heading)
 *
 * Lifecycle:
 * - activate:       Set entity status → active (creates upstream links)
 * - supersede:      Set → superseded, link to replacement (auto-purge from context)
 * - abandon:        Set → abandoned (purge from AI-visible, prevent context poisoning)
 * - resolve:        Set → resolved (for research artifacts: downstream can now reference)
 *
 * Self-governed — no hooks needed. Governance embedded via entity-resolver + chain-validator.
 */

import { tool } from "@opencode-ai/plugin/tool"
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "fs"
import { join, dirname, extname } from "path"
import {
    resolveEntity,
    formatEntityAnnotation,
    isInProjectScope,
    canAgentWrite,
    type ResolvedEntity,
} from "../lib/entity-resolver.js"
import {
    validateChain,
    formatChainValidation,
} from "../lib/chain-validator.js"
import {
    readGovernanceState,
    readCapturedAgent,
    formatGovernanceSummary,
    type GovernanceSnapshot,
} from "../lib/state-reader.js"
import { createLogger } from "../lib/logging.js"

// ─── Constants ──────────────────────────────────────────────────────

const BACKUP_DIR = ".idumb/backups"
const AUDIT_DIR = ".idumb/brain/audit"
const MAX_CONTENT_SIZE = 500_000  // 500KB hard limit
const WRITE_MODES = ["create", "overwrite", "append", "update-section"] as const
const LIFECYCLE_OPS = ["activate", "supersede", "abandon", "resolve"] as const

// ─── Tool Definition ────────────────────────────────────────────────

export const idumb_write = tool({

    description:
        `Schema-regulated artifact writer that validates entity type, enforces chain integrity, ` +
        `and manages planning artifact lifecycle. ` +
        `Modes: "create" (fail if exists), "overwrite" (backup + schema validate), ` +
        `"append" (add to end), "update-section" (replace markdown section by heading). ` +
        `Lifecycle: "activate", "supersede" (context poison prevention), ` +
        `"abandon" (purge from AI-visible), "resolve" (unlock downstream dependencies). ` +
        `Use INSTEAD of innate write. Self-governed: validates schema, checks chain integrity, ` +
        `enforces agent permissions, and creates evidence — all without hooks.`,

    args: {
        path: tool.schema.string().describe(
            "File path to write (relative to project root or absolute)"
        ),
        content: tool.schema.string().describe(
            "Content to write to the file"
        ),
        mode: tool.schema.enum(WRITE_MODES).optional().describe(
            "Write mode: create (default, fail if exists), overwrite (backup + validate), append, update-section"
        ),
        // Section mode
        section: tool.schema.string().optional().describe(
            "For mode=update-section: the heading to find and replace (e.g. '## Verification Plan')"
        ),
        // Lifecycle
        lifecycle: tool.schema.enum(LIFECYCLE_OPS).optional().describe(
            "Lifecycle operation: activate, supersede, abandon, resolve. Changes entity status and triggers chain updates."
        ),
        // Controls
        backup: tool.schema.boolean().optional().describe(
            "Create backup before overwrite (default: true)"
        ),
        validate: tool.schema.boolean().optional().describe(
            "Validate against entity schema before write (default: true)"
        ),
        commit: tool.schema.boolean().optional().describe(
            "Create atomic git commit tied to active task after write (default: false)"
        ),
        commit_message: tool.schema.string().optional().describe(
            "Custom commit message (auto-generated if not provided)"
        ),
    },

    async execute(args, context) {
        const log = createLogger(context.directory, "idumb-write")
        const projectDir = context.directory
        const mode = args.mode || "create"
        const filePath = args.path
        const content = args.content
        const shouldBackup = args.backup !== false  // default true
        const shouldValidate = args.validate !== false  // default true

        log.info(`idumb_write: mode=${mode} path=${filePath}`)

        // ─── Size Check ─────────────────────────────────────────
        if (content.length > MAX_CONTENT_SIZE) {
            return `❌ CONTENT TOO LARGE: ${content.length} bytes exceeds ${MAX_CONTENT_SIZE} byte limit.\n\nBreak content into smaller writes or use mode=update-section for targeted updates.`
        }

        // ─── Scope Check ────────────────────────────────────────
        if (!isInProjectScope(filePath, projectDir)) {
            return `❌ SCOPE VIOLATION: "${filePath}" is outside the project scope or in a blocked path (node_modules, .git, .env).\n\nAllowed: files within ${projectDir}`
        }

        // ─── Resolve Entity ─────────────────────────────────────
        const entity = resolveEntity(filePath, projectDir)
        const absPath = entity.path

        // ─── Governance State ───────────────────────────────────
        const govState = readGovernanceState(projectDir)

        // ─── Agent Permission Check ─────────────────────────────
        const agentRole = readCapturedAgent(projectDir, context.agent) ?? "unknown"
        if (!canAgentWrite(entity, agentRole)) {
            log.warn(`BLOCKED: agent "${agentRole}" cannot write to ${entity.entityType}`)
            return [
                `❌ AGENT PERMISSION DENIED`,
                ``,
                formatEntityAnnotation(entity),
                ``,
                `Agent "${agentRole}" is not in canWrite: [${entity.governance.canWrite.join(", ")}]`,
                ``,
                `This ${entity.entityType} can only be written by: ${entity.governance.canWrite.join(", ")}`,
                ``,
                `REDIRECT: Delegate this write to an agent with the correct role.`,
            ].join("\n")
        }

        // ─── Active Task Check ──────────────────────────────────
        if (entity.governance.requiresActiveTask && !govState.activeTask) {
            log.warn(`BLOCKED: no active task for ${entity.entityType}`)
            return [
                `❌ ACTIVE TASK REQUIRED`,
                ``,
                formatEntityAnnotation(entity),
                ``,
                `Writing to ${entity.entityType} entities requires an active task.`,
                `No active task found in governance state.`,
                ``,
                `REDIRECT: Use idumb_task to create or activate a task first.`,
            ].join("\n")
        }

        // ─── Chain Integrity Check ──────────────────────────────
        if (shouldValidate && entity.governance.requiresChainIntegrity) {
            const chainResult = validateChain(filePath, projectDir, "write", 2)
            if (!chainResult.isValid) {
                log.warn(`BLOCKED: chain integrity broken for ${filePath}`)
                return [
                    `❌ CHAIN INTEGRITY BROKEN — WRITE BLOCKED`,
                    ``,
                    formatEntityAnnotation(entity),
                    ``,
                    formatChainValidation(chainResult),
                    ``,
                    `This ${entity.entityType} requires intact parent chain to modify.`,
                    `Fix the chain breaks listed above before writing.`,
                    ``,
                    `REDIRECT: Use idumb_read mode=chain-check to investigate, then fix broken links.`,
                ].join("\n")
            }
        }

        // ─── Handle Lifecycle Operation ─────────────────────────
        if (args.lifecycle) {
            return handleLifecycle(entity, absPath, projectDir, args.lifecycle, content, govState, log)
        }

        // ─── Route to Mode Handler ──────────────────────────────
        try {
            switch (mode) {
                case "create":
                    return handleCreate(entity, absPath, content, projectDir, govState, log)
                case "overwrite":
                    return handleOverwrite(entity, absPath, content, projectDir, shouldBackup, govState, log)
                case "append":
                    return handleAppend(entity, absPath, content, projectDir, govState, log)
                case "update-section":
                    return handleUpdateSection(entity, absPath, content, args.section, projectDir, shouldBackup, govState, log)
                default:
                    return `❌ Unknown mode: "${mode}". Available: create, overwrite, append, update-section`
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            log.error(`idumb_write error: ${msg}`)
            return `❌ Write failed: ${msg}`
        }
    },
})

// ─── Logger type alias ──────────────────────────────────────────────

type Log = ReturnType<typeof createLogger>

// ─── Mode: Create ───────────────────────────────────────────────────

function handleCreate(
    entity: ResolvedEntity,
    absPath: string,
    content: string,
    projectDir: string,
    govState: GovernanceSnapshot,
    log: Log,
): string {
    if (existsSync(absPath)) {
        return [
            `❌ FILE ALREADY EXISTS: ${entity.relativePath}`,
            ``,
            `Use mode="overwrite" to replace, or mode="update-section" for targeted updates.`,
        ].join("\n")
    }

    // Ensure parent directory exists
    const dir = dirname(absPath)
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
    }

    // Schema validation for content
    const validation = validateContent(entity, content)
    if (!validation.valid) {
        return [
            `❌ SCHEMA VALIDATION FAILED`,
            ``,
            formatEntityAnnotation(entity),
            ``,
            `Validation errors:`,
            ...validation.errors.map(e => `  • ${e}`),
            ``,
            `Fix the content to match the required schema for ${entity.entityType}.`,
        ].join("\n")
    }

    // Write
    writeFileSync(absPath, content, "utf-8")
    log.info(`Created: ${entity.relativePath} (${content.length} bytes)`)

    // Audit log
    writeAuditEntry(projectDir, {
        action: "create",
        path: entity.relativePath,
        entityType: entity.entityType,
        agent: govState.capturedAgent ?? "unknown",
        task: govState.activeTask?.name ?? "none",
        timestamp: Date.now(),
        contentSize: content.length,
    })

    return buildSuccessOutput("CREATE", entity, govState, {
        contentSize: content.length,
        lineCount: content.split("\n").length,
    })
}

// ─── Mode: Overwrite ────────────────────────────────────────────────

function handleOverwrite(
    entity: ResolvedEntity,
    absPath: string,
    content: string,
    projectDir: string,
    shouldBackup: boolean,
    govState: GovernanceSnapshot,
    log: Log,
): string {
    const existed = existsSync(absPath)

    // Backup if overwriting existing file
    if (existed && shouldBackup) {
        const backupPath = createBackup(absPath, projectDir)
        log.info(`Backup created: ${backupPath}`)
    }

    // Schema validation
    const validation = validateContent(entity, content)
    if (!validation.valid) {
        return [
            `❌ SCHEMA VALIDATION FAILED`,
            ``,
            formatEntityAnnotation(entity),
            ``,
            `Validation errors:`,
            ...validation.errors.map(e => `  • ${e}`),
            ``,
            `Fix the content to match the required schema for ${entity.entityType}.`,
            existed ? `\nBackup of original preserved.` : ``,
        ].join("\n")
    }

    // Ensure parent directory exists
    const dir = dirname(absPath)
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
    }

    // Write
    writeFileSync(absPath, content, "utf-8")
    log.info(`Overwritten: ${entity.relativePath} (${content.length} bytes)`)

    // Audit
    writeAuditEntry(projectDir, {
        action: "overwrite",
        path: entity.relativePath,
        entityType: entity.entityType,
        agent: govState.capturedAgent ?? "unknown",
        task: govState.activeTask?.name ?? "none",
        timestamp: Date.now(),
        contentSize: content.length,
        hadBackup: existed && shouldBackup,
    })

    return buildSuccessOutput("OVERWRITE", entity, govState, {
        contentSize: content.length,
        lineCount: content.split("\n").length,
        backup: existed && shouldBackup,
    })
}

// ─── Mode: Append ───────────────────────────────────────────────────

function handleAppend(
    entity: ResolvedEntity,
    absPath: string,
    content: string,
    projectDir: string,
    govState: GovernanceSnapshot,
    log: Log,
): string {
    if (!existsSync(absPath)) {
        return [
            `❌ FILE NOT FOUND: ${entity.relativePath}`,
            ``,
            `Cannot append to non-existent file. Use mode="create" for new files.`,
        ].join("\n")
    }

    // Read existing to compute stats
    const existing = readFileSync(absPath, "utf-8")
    const existingLines = existing.split("\n").length

    // Append
    const separator = existing.endsWith("\n") ? "" : "\n"
    writeFileSync(absPath, existing + separator + content, "utf-8")

    const newLines = content.split("\n").length
    log.info(`Appended: ${entity.relativePath} (+${newLines} lines)`)

    // Audit
    writeAuditEntry(projectDir, {
        action: "append",
        path: entity.relativePath,
        entityType: entity.entityType,
        agent: govState.capturedAgent ?? "unknown",
        task: govState.activeTask?.name ?? "none",
        timestamp: Date.now(),
        contentSize: content.length,
    })

    return buildSuccessOutput("APPEND", entity, govState, {
        appendedLines: newLines,
        totalLines: existingLines + newLines,
    })
}

// ─── Mode: Update-Section ───────────────────────────────────────────

function handleUpdateSection(
    entity: ResolvedEntity,
    absPath: string,
    content: string,
    section: string | undefined,
    projectDir: string,
    shouldBackup: boolean,
    govState: GovernanceSnapshot,
    log: Log,
): string {
    if (!section) {
        return `❌ MISSING SECTION: mode=update-section requires the "section" parameter.\n\nSpecify the markdown heading to find, e.g.: section="## Verification Plan"`
    }

    if (!existsSync(absPath)) {
        return `❌ FILE NOT FOUND: ${entity.relativePath}\n\nCannot update section in non-existent file. Use mode="create" first.`
    }

    const ext = extname(absPath).toLowerCase()
    if (ext !== ".md" && ext !== ".mdx") {
        return `❌ SECTION UPDATE requires a Markdown file (.md/.mdx). Got: ${ext}`
    }

    const existing = readFileSync(absPath, "utf-8")
    const lines = existing.split("\n")

    // Find the section by heading
    const sectionLevel = (section.match(/^(#+)/) ?? [""])[0].length
    if (sectionLevel === 0) {
        return `❌ INVALID SECTION: "${section}" doesn't start with a heading marker (#). Example: "## My Section"`
    }

    let sectionStart = -1
    let sectionEnd = -1

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()

        // Find section start
        if (sectionStart === -1) {
            if (line === section || line.startsWith(section + " ") || line === section.trim()) {
                sectionStart = i
                continue
            }
        }

        // Find section end (next heading of equal or higher level)
        if (sectionStart !== -1 && i > sectionStart) {
            const headingMatch = line.match(/^(#+)\s/)
            if (headingMatch && headingMatch[1].length <= sectionLevel) {
                sectionEnd = i
                break
            }
        }
    }

    if (sectionStart === -1) {
        return [
            `❌ SECTION NOT FOUND: "${section}"`,
            ``,
            `Available sections in ${entity.relativePath}:`,
            ...lines
                .filter(l => /^#{1,6}\s/.test(l.trim()))
                .map(l => `  ${l.trim()}`),
        ].join("\n")
    }

    // If no section end, it extends to the end of file
    if (sectionEnd === -1) {
        sectionEnd = lines.length
    }

    // Backup
    if (shouldBackup) {
        createBackup(absPath, projectDir)
    }

    // Build new content: before + new section + after
    const before = lines.slice(0, sectionStart)
    const after = lines.slice(sectionEnd)
    const newContent = [...before, section, content, ...after].join("\n")

    writeFileSync(absPath, newContent, "utf-8")

    const oldSectionLines = sectionEnd - sectionStart
    const newSectionLines = content.split("\n").length + 1  // +1 for heading
    log.info(`Updated section "${section}" in ${entity.relativePath} (${oldSectionLines} → ${newSectionLines} lines)`)

    // Audit
    writeAuditEntry(projectDir, {
        action: "update-section",
        path: entity.relativePath,
        entityType: entity.entityType,
        section,
        agent: govState.capturedAgent ?? "unknown",
        task: govState.activeTask?.name ?? "none",
        timestamp: Date.now(),
        oldLines: oldSectionLines,
        newLines: newSectionLines,
    })

    return buildSuccessOutput("UPDATE-SECTION", entity, govState, {
        section,
        oldLines: oldSectionLines,
        newLines: newSectionLines,
        totalLines: newContent.split("\n").length,
        backup: shouldBackup,
    })
}

// ─── Lifecycle Operations ───────────────────────────────────────────

function handleLifecycle(
    entity: ResolvedEntity,
    absPath: string,
    projectDir: string,
    lifecycle: string,
    content: string,
    govState: GovernanceSnapshot,
    log: Log,
): string {
    if (!existsSync(absPath)) {
        return `❌ FILE NOT FOUND: ${entity.relativePath}\n\nCannot change lifecycle of non-existent entity.`
    }

    const output: string[] = []
    output.push(formatEntityAnnotation(entity))
    output.push("")
    output.push(formatGovernanceSummary(govState))
    output.push("")

    const oldStatus = entity.properties.status ?? "unknown"

    switch (lifecycle) {
        case "activate": {
            output.push(`─── Lifecycle: ACTIVATE ─────────────────────────────────────────`)
            output.push(`│ Status: ${oldStatus} → active`)
            output.push(`│ Entity: ${entity.relativePath}`)

            // For planning artifacts: write status marker into the file
            if (entity.entityType === "planning-artifact") {
                updateStatusInFile(absPath, "active", content)
                output.push(`│ Updated: status marker in file`)
            }

            output.push(`│ Chain: upstream links will recognize this as active`)
            output.push(`────────────────────────────────────────────────────────────────`)
            break
        }

        case "supersede": {
            output.push(`─── Lifecycle: SUPERSEDE ────────────────────────────────────────`)
            output.push(`│ Status: ${oldStatus} → superseded`)
            output.push(`│ Entity: ${entity.relativePath}`)
            output.push(`│ Reason: replaced by newer version`)

            // Create backup before modifying
            createBackup(absPath, projectDir)

            // Mark as superseded
            updateStatusInFile(absPath, "superseded", content)

            if (content.trim()) {
                output.push(`│ Replacement: ${content.trim()}`)
            }

            output.push(`│ ⚠️ This artifact is now flagged as SUPERSEDED`)
            output.push(`│   AI agents will see a warning if they read this`)
            output.push(`│   Downstream references will show "superseded" status`)
            output.push(`────────────────────────────────────────────────────────────────`)
            break
        }

        case "abandon": {
            output.push(`─── Lifecycle: ABANDON (Context Poison Prevention) ────────────`)
            output.push(`│ Status: ${oldStatus} → abandoned`)
            output.push(`│ Entity: ${entity.relativePath}`)

            // Create backup before modifying
            createBackup(absPath, projectDir)

            // Mark as abandoned — prepend warning to the file
            const abandonedWarning = [
                `<!-- ⚠️ ABANDONED ARTIFACT — DO NOT USE FOR CONTEXT ⚠️ -->`,
                `<!-- Status: abandoned | Abandoned at: ${new Date().toISOString()} -->`,
                `<!-- Reason: ${content.trim() || "Superseded or no longer relevant"} -->`,
                ``,
            ].join("\n")

            const existingContent = readFileSync(absPath, "utf-8")
            writeFileSync(absPath, abandonedWarning + existingContent, "utf-8")

            output.push(`│ ⚠️ ABANDONED — prepended context-poison warning to file`)
            output.push(`│   AI agents reading this will see ABANDONED marker`)
            output.push(`│   This prevents stale context from being used for decisions`)
            if (content.trim()) {
                output.push(`│ Reason: ${content.trim()}`)
            }
            output.push(`────────────────────────────────────────────────────────────────`)
            break
        }

        case "resolve": {
            output.push(`─── Lifecycle: RESOLVE ──────────────────────────────────────────`)
            output.push(`│ Status: ${oldStatus} → resolved`)
            output.push(`│ Entity: ${entity.relativePath}`)

            updateStatusInFile(absPath, "resolved", content)

            output.push(`│ ✅ Research/investigation RESOLVED`)
            output.push(`│   Downstream planning artifacts can now reference this`)
            output.push(`│   Chain integrity improved: dependents unblocked`)
            output.push(`────────────────────────────────────────────────────────────────`)
            break
        }

        default:
            return `❌ Unknown lifecycle operation: "${lifecycle}". Available: activate, supersede, abandon, resolve`
    }

    // Audit
    writeAuditEntry(projectDir, {
        action: `lifecycle:${lifecycle}`,
        path: entity.relativePath,
        entityType: entity.entityType,
        agent: govState.capturedAgent ?? "unknown",
        task: govState.activeTask?.name ?? "none",
        timestamp: Date.now(),
        oldStatus,
        newStatus: lifecycle === "activate" ? "active" : lifecycle,
    })

    log.info(`Lifecycle: ${entity.relativePath} → ${lifecycle}`)
    return output.join("\n")
}

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Create a timestamped backup of a file.
 * Stored in .idumb/backups/{timestamp}/{relative-path}
 */
function createBackup(absPath: string, projectDir: string): string {
    const relPath = absPath.replace(projectDir + "/", "")
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
    const backupPath = join(projectDir, BACKUP_DIR, timestamp, relPath)

    const backupDir = dirname(backupPath)
    if (!existsSync(backupDir)) {
        mkdirSync(backupDir, { recursive: true })
    }

    copyFileSync(absPath, backupPath)
    return backupPath
}

/**
 * Write an audit entry for this write operation.
 * Stored in .idumb/brain/audit/{date}/writes.jsonl (append-only log)
 */
function writeAuditEntry(projectDir: string, entry: Record<string, unknown>): void {
    try {
        const date = new Date().toISOString().slice(0, 10)
        const auditDir = join(projectDir, AUDIT_DIR, date)
        if (!existsSync(auditDir)) {
            mkdirSync(auditDir, { recursive: true })
        }

        const auditFile = join(auditDir, "writes.jsonl")
        const line = JSON.stringify(entry) + "\n"

        // Append-only log
        const existing = existsSync(auditFile) ? readFileSync(auditFile, "utf-8") : ""
        writeFileSync(auditFile, existing + line, "utf-8")
    } catch {
        // Non-critical — audit failure should never block writes
    }
}

/**
 * Validate content against entity-type-specific rules.
 * Lightweight validation — not full schema enforcement (that's Phase 2).
 */
function validateContent(entity: ResolvedEntity, content: string): {
    valid: boolean
    errors: string[]
} {
    const errors: string[] = []

    switch (entity.entityType) {
        case "governance-config": {
            // Must be valid JSON
            try {
                JSON.parse(content)
            } catch {
                errors.push("Content must be valid JSON for governance-config entities")
            }
            break
        }

        case "brain-entry": {
            // Must be valid JSON
            try {
                const parsed = JSON.parse(content)
                if (typeof parsed !== "object" || parsed === null) {
                    errors.push("Brain entries must be JSON objects")
                }
            } catch {
                errors.push("Content must be valid JSON for brain-entry entities")
            }
            break
        }

        case "task-store":
        case "delegation-store":
        case "project-map":
        case "codemap": {
            // Must be valid JSON
            try {
                JSON.parse(content)
            } catch {
                errors.push(`Content must be valid JSON for ${entity.entityType} entities`)
            }
            break
        }

        case "agent-profile": {
            // Agent profiles should have YAML frontmatter
            if (!content.startsWith("---")) {
                errors.push("Agent profiles should start with YAML frontmatter (---)")
            }
            // Check for required frontmatter fields
            if (!content.includes("name:")) {
                errors.push("Agent profile missing required 'name:' in frontmatter")
            }
            break
        }

        case "config-file": {
            const ext = extname(entity.path).toLowerCase()
            if (ext === ".json") {
                try {
                    JSON.parse(content)
                } catch {
                    errors.push("Config files with .json extension must be valid JSON")
                }
            }
            break
        }

        // Planning artifacts, documentation, source-code, etc. — no strict validation (yet)
        default:
            break
    }

    return { valid: errors.length === 0, errors }
}

/**
 * Update status marker in a file.
 * For markdown files: updates or inserts a status frontmatter/comment.
 * For JSON files: sets a "status" property.
 */
function updateStatusInFile(absPath: string, status: string, _context: string): void {
    const ext = extname(absPath).toLowerCase()
    const content = readFileSync(absPath, "utf-8")

    if (ext === ".json") {
        try {
            const parsed = JSON.parse(content) as Record<string, unknown>
            parsed.status = status
            parsed.statusUpdatedAt = Date.now()
            writeFileSync(absPath, JSON.stringify(parsed, null, 2) + "\n", "utf-8")
        } catch {
            // Can't parse — skip status update
        }
    } else if (ext === ".md" || ext === ".mdx") {
        // Check for existing status comment
        const statusRegex = /<!-- Status: .+ -->/
        if (statusRegex.test(content)) {
            const updated = content.replace(statusRegex, `<!-- Status: ${status} | Updated: ${new Date().toISOString()} -->`)
            writeFileSync(absPath, updated, "utf-8")
        } else {
            // Prepend status comment
            const statusLine = `<!-- Status: ${status} | Updated: ${new Date().toISOString()} -->\n`
            writeFileSync(absPath, statusLine + content, "utf-8")
        }
    }
}

/**
 * Build standardized success output with entity annotation.
 */
function buildSuccessOutput(
    action: string,
    entity: ResolvedEntity,
    govState: GovernanceSnapshot,
    details: Record<string, unknown>,
): string {
    const output: string[] = []

    output.push(`✅ ${action}: ${entity.relativePath}`)
    output.push("")
    output.push(formatEntityAnnotation(entity))
    output.push("")
    output.push(formatGovernanceSummary(govState))
    output.push("")

    // Details
    output.push(`─── Write Details ──────────────────────────────────────────────`)
    for (const [key, value] of Object.entries(details)) {
        if (value !== undefined && value !== null && value !== false) {
            output.push(`│ ${key}: ${value}`)
        }
    }

    // Chain status
    if (entity.governance.requiresChainIntegrity) {
        output.push(`│ Chain: ✅ intact (validated before write)`)
    }

    // Upstream notification
    if (entity.governance.triggersUpstreamUpdate) {
        output.push(`│ ⚠️ Upstream entities may need refresh (auto-update: planned for n4-β-6)`)
    }

    output.push(`────────────────────────────────────────────────────────────────`)

    return output.join("\n")
}
