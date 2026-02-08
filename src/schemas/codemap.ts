/**
 * CodeMap entity schemas — code structure intelligence.
 *
 * Part of Group 2: Brain / Knowledge Graph (sub-entity)
 * Entities persist to `.idumb/brain/codemap.json`
 *
 * Built by code scanning tools. Contains:
 * - File-level structure (exports, imports, classes, functions)
 * - TODO/FIXME/HACK comment extraction
 * - Inconsistency detection (naming, patterns)
 * - Dependency graph (who imports whom)
 */

// ─── Code Item Types ────────────────────────────────────────────────

export type CodeItemType =
    | "function"
    | "class"
    | "interface"
    | "type"
    | "enum"
    | "constant"
    | "variable"
    | "export"
    | "import"

export interface CodeItem {
    name: string
    type: CodeItemType
    line: number
    exported: boolean
    signature?: string
}

// ─── Code Comment Types ─────────────────────────────────────────────

export type CommentMarker =
    | "TODO"
    | "FIXME"
    | "HACK"
    | "XXX"
    | "NOTE"
    | "WARN"
    | "PERF"

export interface CodeComment {
    marker: CommentMarker
    content: string
    file: string                      // Relative path
    line: number
    author?: string                   // From git blame if available
}

// ─── File Map Entry ─────────────────────────────────────────────────

export interface FileMapEntry {
    path: string                      // Relative to project root
    language: string                  // ts, js, py, etc.
    sizeBytes: number
    lastModified: number

    // Structure
    items: CodeItem[]
    importPaths: string[]             // What this file imports
    exportNames: string[]             // What this file exports

    // Comments
    comments: CodeComment[]

    // Quick stats
    lineCount: number
    functionCount: number
    classCount: number
}

// ─── Inconsistency ──────────────────────────────────────────────────

export type InconsistencyType =
    | "naming"         // Mixed conventions (camelCase vs snake_case)
    | "unused-export"  // Exported but never imported
    | "circular"       // Circular dependency
    | "orphan"         // File not imported anywhere
    | "pattern"        // Pattern deviation (different error handling)

export interface Inconsistency {
    type: InconsistencyType
    message: string
    files: string[]
    severity: "low" | "medium" | "high"
}

// ─── CodeMap Store ──────────────────────────────────────────────────

export const CODEMAP_VERSION = "1.0.0"

export interface CodeMapStore {
    version: string
    scannedAt: number
    scanDurationMs: number
    projectRoot: string

    files: FileMapEntry[]
    comments: CodeComment[]           // Aggregated from all files
    inconsistencies: Inconsistency[]

    stats: {
        totalFiles: number
        totalLines: number
        totalFunctions: number
        totalClasses: number
        totalTodos: number
        totalFixmes: number
        languages: Record<string, number>  // language → file count
    }
}

// ─── Factory Functions ──────────────────────────────────────────────

export function createCodeMapStore(projectRoot: string): CodeMapStore {
    const now = Date.now()
    return {
        version: CODEMAP_VERSION,
        scannedAt: now,
        scanDurationMs: 0,
        projectRoot,
        files: [],
        comments: [],
        inconsistencies: [],
        stats: {
            totalFiles: 0,
            totalLines: 0,
            totalFunctions: 0,
            totalClasses: 0,
            totalTodos: 0,
            totalFixmes: 0,
            languages: {},
        },
    }
}

// ─── Formatting ─────────────────────────────────────────────────────

export function formatCodeMapSummary(store: CodeMapStore): string {
    const lines: string[] = []
    lines.push("=== Code Map ===")
    lines.push(`Scanned: ${new Date(store.scannedAt).toISOString()}`)
    lines.push(`Duration: ${store.scanDurationMs}ms`)
    lines.push("")

    // Stats
    lines.push("STATS:")
    lines.push(`  Files: ${store.stats.totalFiles}`)
    lines.push(`  Lines: ${store.stats.totalLines}`)
    lines.push(`  Functions: ${store.stats.totalFunctions}`)
    lines.push(`  Classes: ${store.stats.totalClasses}`)
    lines.push("")

    // Languages
    const langEntries = Object.entries(store.stats.languages).sort((a, b) => b[1] - a[1])
    if (langEntries.length > 0) {
        lines.push("LANGUAGES:")
        for (const [lang, count] of langEntries) {
            lines.push(`  ${lang}: ${count} files`)
        }
        lines.push("")
    }

    // TODOs + FIXMEs
    const todos = store.comments.filter(c => c.marker === "TODO")
    const fixmes = store.comments.filter(c => c.marker === "FIXME")
    const hacks = store.comments.filter(c => c.marker === "HACK")

    if (todos.length + fixmes.length + hacks.length > 0) {
        lines.push("ACTION ITEMS:")
        if (todos.length > 0) {
            lines.push(`  TODO (${todos.length}):`)
            for (const t of todos.slice(0, 10)) {
                lines.push(`    ${t.file}:${t.line} — ${t.content}`)
            }
            if (todos.length > 10) lines.push(`    ... and ${todos.length - 10} more`)
        }
        if (fixmes.length > 0) {
            lines.push(`  FIXME (${fixmes.length}):`)
            for (const f of fixmes.slice(0, 5)) {
                lines.push(`    ${f.file}:${f.line} — ${f.content}`)
            }
            if (fixmes.length > 5) lines.push(`    ... and ${fixmes.length - 5} more`)
        }
        if (hacks.length > 0) {
            lines.push(`  HACK (${hacks.length}):`)
            for (const h of hacks.slice(0, 5)) {
                lines.push(`    ${h.file}:${h.line} — ${h.content}`)
            }
        }
        lines.push("")
    }

    // Inconsistencies
    if (store.inconsistencies.length > 0) {
        lines.push(`INCONSISTENCIES (${store.inconsistencies.length}):`)
        for (const inc of store.inconsistencies) {
            lines.push(`  [${inc.severity.toUpperCase()}] ${inc.type}: ${inc.message}`)
            lines.push(`    Files: ${inc.files.join(", ")}`)
        }
        lines.push("")
    }

    return lines.join("\n")
}

/** Format TODO list for quick AI consumption */
export function formatTodoList(store: CodeMapStore): string {
    const actionItems = store.comments.filter(c =>
        c.marker === "TODO" || c.marker === "FIXME" || c.marker === "HACK"
    )

    if (actionItems.length === 0) return "No action items found in codebase."

    const grouped = new Map<string, CodeComment[]>()
    for (const item of actionItems) {
        const existing = grouped.get(item.file) ?? []
        existing.push(item)
        grouped.set(item.file, existing)
    }

    const lines: string[] = [`ACTION ITEMS: ${actionItems.length} total`, ""]
    for (const [file, items] of grouped) {
        lines.push(`${file}:`)
        for (const item of items) {
            lines.push(`  L${item.line} [${item.marker}] ${item.content}`)
        }
    }

    return lines.join("\n")
}
