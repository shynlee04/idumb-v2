/**
 * idumb_codemap — Code structure intelligence scanner.
 *
 * Phase 1b-β showcase tool. New tool slot #5.
 *
 * Actions:
 * - scan: Full codebase scan (exports, imports, functions, classes, comments)
 * - todos: Extract TODO/FIXME/HACK comments only (fast)
 * - inconsistencies: Detect naming/pattern inconsistencies
 * - diff: Show what changed since last scan
 * - graph: Show dependency graph (who imports whom)
 *
 * Persists results to `.idumb/brain/codemap.json`
 *
 * P7: Single-purpose — code structure intelligence
 * DON'T #11: Tool description must make the AI select it naturally
 */

import { tool } from "@opencode-ai/plugin/tool"
import { readFile, readdir, stat, writeFile, mkdir } from "node:fs/promises"
import { join, extname, relative } from "node:path"
import { createLogger } from "../lib/logging.js"
import {
    createCodeMapStore, formatCodeMapSummary, formatTodoList,
} from "../schemas/codemap.js"
import type {
    CodeMapStore, FileMapEntry, CodeItem,
    CodeComment, CommentMarker, Inconsistency,
} from "../schemas/codemap.js"

// ─── Constants ──────────────────────────────────────────────────────

const CODEMAP_FILE = ".idumb/brain/codemap.json"

/** Max file size to analyze (500KB) */
const MAX_FILE_SIZE = 500 * 1024

/** Directories to skip */
const SKIP_DIRS = new Set([
    "node_modules", ".git", ".idumb", "dist", "build", "out", ".next",
    ".nuxt", ".turbo", ".cache", "__pycache__", ".venv", "venv",
    "vendor", "target", "coverage", ".nyc_output",
])

/** Source extensions we can parse */
const PARSEABLE_EXTENSIONS = new Set([
    ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
    ".py", ".rb", ".go", ".rs", ".java",
])

/** Comment markers to extract */
const COMMENT_MARKERS: CommentMarker[] = [
    "TODO", "FIXME", "HACK", "XXX", "NOTE", "WARN", "PERF",
]

// ─── Parsing Helpers ────────────────────────────────────────────────

/** Extract code items from TypeScript/JavaScript file content */
function extractCodeItems(content: string, ext: string): CodeItem[] {
    const items: CodeItem[] = []
    const lines = content.split("\n")

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const trimmed = line.trim()

        // Skip comments and empty lines
        if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed === "") continue

        const isExported = trimmed.startsWith("export ")
        const cleanLine = isExported ? trimmed.slice(7) : trimmed

        // Functions
        const funcMatch = cleanLine.match(/^(?:async\s+)?function\s+(\w+)/)
        if (funcMatch) {
            items.push({ name: funcMatch[1], type: "function", line: i + 1, exported: isExported, signature: trimmed.slice(0, 120) })
            continue
        }

        // Arrow functions / const functions
        const arrowMatch = cleanLine.match(/^(?:const|let)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[^=])\s*=>/)
        if (arrowMatch) {
            items.push({ name: arrowMatch[1], type: "function", line: i + 1, exported: isExported, signature: trimmed.slice(0, 120) })
            continue
        }

        // Classes
        const classMatch = cleanLine.match(/^(?:abstract\s+)?class\s+(\w+)/)
        if (classMatch) {
            items.push({ name: classMatch[1], type: "class", line: i + 1, exported: isExported, signature: trimmed.slice(0, 120) })
            continue
        }

        // Interfaces (TS)
        if (ext === ".ts" || ext === ".tsx") {
            const ifaceMatch = cleanLine.match(/^interface\s+(\w+)/)
            if (ifaceMatch) {
                items.push({ name: ifaceMatch[1], type: "interface", line: i + 1, exported: isExported, signature: trimmed.slice(0, 120) })
                continue
            }

            // Type aliases
            const typeMatch = cleanLine.match(/^type\s+(\w+)/)
            if (typeMatch) {
                items.push({ name: typeMatch[1], type: "type", line: i + 1, exported: isExported, signature: trimmed.slice(0, 120) })
                continue
            }
        }

        // Enums
        const enumMatch = cleanLine.match(/^enum\s+(\w+)/)
        if (enumMatch) {
            items.push({ name: enumMatch[1], type: "enum", line: i + 1, exported: isExported, signature: trimmed.slice(0, 120) })
            continue
        }

        // Constants (exported const)
        if (isExported) {
            const constMatch = cleanLine.match(/^const\s+(\w+)\s*[=:]/)
            if (constMatch && !arrowMatch) {
                items.push({ name: constMatch[1], type: "constant", line: i + 1, exported: true, signature: trimmed.slice(0, 120) })
            }
        }
    }

    return items
}

/** Extract import paths from file content */
function extractImports(content: string): string[] {
    const imports: string[] = []
    const regex = /(?:import|from)\s+['"]([^'"]+)['"]/g
    let match
    while ((match = regex.exec(content)) !== null) {
        imports.push(match[1])
    }
    return [...new Set(imports)]
}

/** Extract export names from file content */
function extractExportNames(content: string): string[] {
    const names: string[] = []
    const regex = /export\s+(?:const|function|class|interface|type|enum|default)\s+(\w+)/g
    let match
    while ((match = regex.exec(content)) !== null) {
        names.push(match[1])
    }
    return [...new Set(names)]
}

/** Extract comment markers (TODO, FIXME, etc.) */
function extractComments(content: string, filePath: string): CodeComment[] {
    const comments: CodeComment[] = []
    const lines = content.split("\n")

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        for (const marker of COMMENT_MARKERS) {
            const idx = line.indexOf(marker)
            if (idx === -1) continue

            // Verify it's in a comment context (preceded by // or * or #)
            const before = line.slice(0, idx).trim()
            if (!before.endsWith("//") && !before.endsWith("*") && !before.endsWith("#") && !before.startsWith("//") && !before.startsWith("*") && !before.startsWith("#")) continue

            const afterMarker = line.slice(idx + marker.length).replace(/^[:\s]+/, "").trim()
            comments.push({
                marker,
                content: afterMarker.slice(0, 200),
                file: filePath,
                line: i + 1,
            })
            break // Only one marker per line
        }
    }

    return comments
}

/** Detect inconsistencies in naming and patterns */
function detectInconsistencies(files: FileMapEntry[]): Inconsistency[] {
    const inconsistencies: Inconsistency[] = []

    // Check naming conventions
    const camelCaseFiles: string[] = []
    const kebabCaseFiles: string[] = []
    const snakeCaseFiles: string[] = []

    for (const file of files) {
        const name = file.path.split("/").pop()?.replace(extname(file.path), "") ?? ""
        if (name.includes("-")) kebabCaseFiles.push(file.path)
        else if (name.includes("_")) snakeCaseFiles.push(file.path)
        else if (/[A-Z]/.test(name) && name[0] === name[0].toLowerCase()) camelCaseFiles.push(file.path)
    }

    // If mixed, report
    const conventions = [
        { name: "kebab-case", files: kebabCaseFiles },
        { name: "camelCase", files: camelCaseFiles },
        { name: "snake_case", files: snakeCaseFiles },
    ].filter(c => c.files.length > 0)

    if (conventions.length > 1) {
        inconsistencies.push({
            type: "naming",
            message: `Mixed file naming: ${conventions.map(c => `${c.name} (${c.files.length})`).join(", ")}`,
            files: conventions.flatMap(c => c.files.slice(0, 3)),
            severity: "low",
        })
    }

    // Check for orphan files (exported but never imported)
    const allImports = new Set(files.flatMap(f => f.importPaths))
    const orphans = files.filter(f =>
        f.exportNames.length > 0 &&
        !allImports.has(f.path) &&
        !allImports.has(`./${f.path}`) &&
        !f.path.includes("index.")
    )

    if (orphans.length > 0) {
        inconsistencies.push({
            type: "orphan",
            message: `${orphans.length} file(s) export symbols but are never imported`,
            files: orphans.map(f => f.path).slice(0, 10),
            severity: "medium",
        })
    }

    return inconsistencies
}

// ─── Recursive File Scanner ─────────────────────────────────────────

async function scanSourceFiles(
    dir: string,
    projectRoot: string,
    maxDepth = 5,
    currentDepth = 0,
): Promise<FileMapEntry[]> {
    const entries: FileMapEntry[] = []
    if (currentDepth > maxDepth) return entries

    try {
        const dirEntries = await readdir(dir, { withFileTypes: true })

        for (const entry of dirEntries) {
            const fullPath = join(dir, entry.name)
            const relPath = relative(projectRoot, fullPath)

            if (entry.isDirectory()) {
                if (SKIP_DIRS.has(entry.name) || entry.name.startsWith(".")) continue
                const sub = await scanSourceFiles(fullPath, projectRoot, maxDepth, currentDepth + 1)
                entries.push(...sub)
            } else if (entry.isFile()) {
                const ext = extname(entry.name).toLowerCase()
                if (!PARSEABLE_EXTENSIONS.has(ext)) continue

                try {
                    const fileStat = await stat(fullPath)
                    if (fileStat.size > MAX_FILE_SIZE) continue

                    const content = await readFile(fullPath, "utf-8")
                    const lines = content.split("\n")

                    const items = extractCodeItems(content, ext)
                    const importPaths = extractImports(content)
                    const exportNames = extractExportNames(content)
                    const comments = extractComments(content, relPath)

                    entries.push({
                        path: relPath,
                        language: ext.slice(1),
                        sizeBytes: fileStat.size,
                        lastModified: fileStat.mtimeMs,
                        items,
                        importPaths,
                        exportNames,
                        comments,
                        lineCount: lines.length,
                        functionCount: items.filter(i => i.type === "function").length,
                        classCount: items.filter(i => i.type === "class").length,
                    })
                } catch { /* skip unreadable */ }
            }
        }
    } catch { /* skip unreadable dirs */ }

    return entries
}

// ─── Persistence ────────────────────────────────────────────────────

async function loadCodeMap(projectRoot: string): Promise<CodeMapStore | null> {
    try {
        const raw = await readFile(join(projectRoot, CODEMAP_FILE), "utf-8")
        return JSON.parse(raw) as CodeMapStore
    } catch {
        return null
    }
}

async function saveCodeMap(projectRoot: string, store: CodeMapStore): Promise<void> {
    const filePath = join(projectRoot, CODEMAP_FILE)
    await mkdir(join(projectRoot, ".idumb/brain"), { recursive: true })
    await writeFile(filePath, JSON.stringify(store, null, 2) + "\n")
}

// ─── Tool Definition ────────────────────────────────────────────────

export const idumb_codemap = tool({
    description: "Scan code structure — extracts functions, classes, imports/exports, TODO/FIXME/HACK comments, and detects naming inconsistencies. Actions: scan (full analysis), todos (action items only), inconsistencies (pattern deviations), diff (changes since last), graph (dependency map). Results persist to .idumb/brain/codemap.json.",
    args: {
        action: tool.schema.enum([
            "scan", "todos", "inconsistencies", "diff", "graph",
        ]).describe("Type of code analysis to perform"),
        path: tool.schema.string().optional().describe(
            "Optional: scan a specific subdirectory instead of the entire project"
        ),
    },
    async execute(args, context) {
        const { directory } = context
        const log = createLogger(directory, "idumb-codemap")
        const { action } = args
        const scanRoot = args.path ? join(directory, args.path) : directory
        const startTime = Date.now()

        log.info(`idumb_codemap: action=${action}`, { scanRoot })

        try {
            switch (action) {
                // ─── FULL SCAN ────────────────────────────────────────────
                case "scan": {
                    const store = createCodeMapStore(directory)
                    const files = await scanSourceFiles(scanRoot, directory)

                    store.files = files
                    store.comments = files.flatMap(f => f.comments)
                    store.inconsistencies = detectInconsistencies(files)

                    // Aggregate stats
                    const langCounts: Record<string, number> = {}
                    for (const f of files) {
                        langCounts[f.language] = (langCounts[f.language] ?? 0) + 1
                    }

                    store.stats = {
                        totalFiles: files.length,
                        totalLines: files.reduce((sum, f) => sum + f.lineCount, 0),
                        totalFunctions: files.reduce((sum, f) => sum + f.functionCount, 0),
                        totalClasses: files.reduce((sum, f) => sum + f.classCount, 0),
                        totalTodos: store.comments.filter(c => c.marker === "TODO").length,
                        totalFixmes: store.comments.filter(c => c.marker === "FIXME").length,
                        languages: langCounts,
                    }

                    store.scanDurationMs = Date.now() - startTime

                    await saveCodeMap(directory, store)

                    log.info("Code map complete", {
                        files: store.stats.totalFiles,
                        lines: store.stats.totalLines,
                        duration: store.scanDurationMs,
                    })

                    return formatCodeMapSummary(store)
                }

                // ─── TODOS ONLY ───────────────────────────────────────────
                case "todos": {
                    // Quick scan — only extract comments, skip structure
                    const files = await scanSourceFiles(scanRoot, directory, 5)
                    const store = createCodeMapStore(directory)
                    store.comments = files.flatMap(f => f.comments)
                    store.stats.totalTodos = store.comments.filter(c => c.marker === "TODO").length
                    store.stats.totalFixmes = store.comments.filter(c => c.marker === "FIXME").length

                    return formatTodoList(store)
                }

                // ─── INCONSISTENCIES ──────────────────────────────────────
                case "inconsistencies": {
                    const existing = await loadCodeMap(directory)

                    if (!existing) {
                        // Run a quick scan first
                        const files = await scanSourceFiles(scanRoot, directory)
                        const inconsistencies = detectInconsistencies(files)

                        if (inconsistencies.length === 0) {
                            return "No inconsistencies detected in the codebase. Code follows consistent patterns."
                        }

                        const lines = [`=== Code Inconsistencies (${inconsistencies.length}) ===`, ""]
                        for (const inc of inconsistencies) {
                            lines.push(`[${inc.severity.toUpperCase()}] ${inc.type}: ${inc.message}`)
                            lines.push(`  Files: ${inc.files.join(", ")}`)
                            lines.push("")
                        }
                        return lines.join("\n")
                    }

                    if (existing.inconsistencies.length === 0) {
                        return "No inconsistencies detected. Run `idumb_codemap action=scan` to refresh analysis."
                    }

                    const lines = [`=== Code Inconsistencies (${existing.inconsistencies.length}) ===`, ""]
                    for (const inc of existing.inconsistencies) {
                        lines.push(`[${inc.severity.toUpperCase()}] ${inc.type}: ${inc.message}`)
                        lines.push(`  Files: ${inc.files.join(", ")}`)
                        lines.push("")
                    }
                    return lines.join("\n")
                }

                // ─── DIFF ─────────────────────────────────────────────────
                case "diff": {
                    const existing = await loadCodeMap(directory)

                    if (!existing) {
                        return "No previous code map found. Run `idumb_codemap action=scan` first."
                    }

                    // Quick re-scan and compare
                    const currentFiles = await scanSourceFiles(scanRoot, directory, 3)
                    const existingPaths = new Set(existing.files.map(f => f.path))
                    const currentPaths = new Set(currentFiles.map(f => f.path))

                    const newFiles = currentFiles.filter(f => !existingPaths.has(f.path))
                    const removedPaths = Array.from(existingPaths).filter(p => !currentPaths.has(p))

                    // Check for structural changes in shared files
                    const structChanges: string[] = []
                    for (const curr of currentFiles) {
                        const prev = existing.files.find(f => f.path === curr.path)
                        if (!prev) continue

                        const newExports = curr.exportNames.filter(e => !prev.exportNames.includes(e))
                        const removedExports = prev.exportNames.filter(e => !curr.exportNames.includes(e))

                        if (newExports.length > 0 || removedExports.length > 0) {
                            const parts = [`${curr.path}:`]
                            if (newExports.length > 0) parts.push(`  + exports: ${newExports.join(", ")}`)
                            if (removedExports.length > 0) parts.push(`  - exports: ${removedExports.join(", ")}`)
                            structChanges.push(parts.join("\n"))
                        }
                    }

                    if (newFiles.length === 0 && removedPaths.length === 0 && structChanges.length === 0) {
                        return `No structural changes since last scan (${new Date(existing.scannedAt).toISOString()}).`
                    }

                    const lines = ["=== Code Structure Diff ===", ""]
                    if (newFiles.length > 0) {
                        lines.push(`NEW FILES (${newFiles.length}):`)
                        newFiles.forEach(f => lines.push(`  + ${f.path} (${f.functionCount} func, ${f.classCount} class)`))
                        lines.push("")
                    }
                    if (removedPaths.length > 0) {
                        lines.push(`REMOVED FILES (${removedPaths.length}):`)
                        removedPaths.forEach(p => lines.push(`  - ${p}`))
                        lines.push("")
                    }
                    if (structChanges.length > 0) {
                        lines.push(`STRUCTURAL CHANGES (${structChanges.length}):`)
                        structChanges.forEach(c => lines.push(c))
                        lines.push("")
                    }

                    return lines.join("\n")
                }

                // ─── DEPENDENCY GRAPH ─────────────────────────────────────
                case "graph": {
                    const existing = await loadCodeMap(directory)
                    const files = existing?.files ?? await scanSourceFiles(scanRoot, directory, 3)

                    if (files.length === 0) {
                        return "No source files found to build dependency graph."
                    }

                    // Build adjacency list: file -> imports
                    const lines = ["=== Dependency Graph ===", ""]

                    // Group by directory
                    const byDir = new Map<string, typeof files>()
                    for (const f of files) {
                        const dir = f.path.split("/").slice(0, -1).join("/") || "."
                        const existing = byDir.get(dir) ?? []
                        existing.push(f)
                        byDir.set(dir, existing)
                    }

                    for (const [dir, dirFiles] of byDir) {
                        lines.push(`${dir}/`)
                        for (const f of dirFiles) {
                            const localImports = f.importPaths.filter(p => p.startsWith("."))
                            const externalImports = f.importPaths.filter(p => !p.startsWith("."))
                            const exportCount = f.exportNames.length

                            lines.push(`  ${f.path.split("/").pop()} (${exportCount} exports)`)
                            if (localImports.length > 0) lines.push(`    ← imports: ${localImports.join(", ")}`)
                            if (externalImports.length > 0) lines.push(`    ← external: ${externalImports.slice(0, 5).join(", ")}${externalImports.length > 5 ? ` +${externalImports.length - 5} more` : ""}`)
                        }
                        lines.push("")
                    }

                    return lines.join("\n")
                }

                default:
                    return `Unknown action: "${action}". Valid actions: scan, todos, inconsistencies, diff, graph`
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            log.error("idumb_codemap error", { error: msg })
            return `## ❌ CodeMap Error\n\n${msg}`
        }
    },
})
