/**
 * idumb_scan — Project intelligence scanner.
 *
 * Phase 1b-β showcase tool. Replaces v2's `idumb_status` slot.
 *
 * Actions:
 * - full: Complete project scan (frameworks, documents, directories)
 * - incremental: Quick re-scan, detect drift since last full scan
 * - drift: Show only changes since last scan
 * - frameworks: Detect frameworks and tech stack only
 * - documents: Map project documents and their types
 *
 * Persists results to `.idumb/brain/project-map.json`
 *
 * P7: Single-purpose — project intelligence gathering
 * DON'T #11: Tool description must make the AI select it naturally
 */

import { tool } from "@opencode-ai/plugin/tool"
import { readdir, stat, readFile, writeFile, mkdir } from "node:fs/promises"
import { join, extname, relative } from "node:path"
import { scanProject } from "../lib/framework-detector.js"
import { createLogger } from "../lib/logging.js"
import {
    createProjectMap, formatProjectMap,
} from "../schemas/project-map.js"
import type {
    ProjectMap, DocumentEntry, DirectoryEntry,
    DocumentType, FrameworkCategory,
} from "../schemas/project-map.js"

// ─── Constants ──────────────────────────────────────────────────────

const PROJECT_MAP_FILE = ".idumb/brain/project-map.json"

/** Directories to always skip */
const SKIP_DIRS = new Set([
    "node_modules", ".git", ".idumb", "dist", "build", "out", ".next",
    ".nuxt", ".turbo", ".cache", "__pycache__", ".venv", "venv",
    "vendor", "target", "coverage", ".nyc_output",
])

/** Document file patterns */
const DOC_PATTERNS: Record<string, DocumentType> = {
    "readme": "readme",
    "changelog": "changelog",
    "license": "license",
    "contributing": "contributing",
    "todo": "todo",
    "agents": "agents",
    "api": "api",
}

/** Config file extensions/names */
const CONFIG_PATTERNS = new Set([
    ".json", ".yaml", ".yml", ".toml", ".ini", ".cfg",
    ".env", ".editorconfig", ".prettierrc", ".eslintrc",
])

/** Source code extensions */
const SOURCE_EXTENSIONS = new Set([
    ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
    ".py", ".rb", ".go", ".rs", ".java", ".kt",
    ".swift", ".c", ".cpp", ".h", ".hpp", ".cs",
    ".vue", ".svelte", ".astro",
])

/** Test file indicators */
const TEST_INDICATORS = [
    ".test.", ".spec.", "_test.", "_spec.",
    "__tests__", "test/", "tests/", "spec/",
]

// ─── Scan Helpers ───────────────────────────────────────────────────

/** Detect document type from filename */
function detectDocType(filename: string): DocumentType | null {
    const lower = filename.toLowerCase().replace(extname(filename), "")
    for (const [pattern, type] of Object.entries(DOC_PATTERNS)) {
        if (lower.includes(pattern)) return type
    }
    const ext = extname(filename).toLowerCase()
    if (ext === ".md" || ext === ".txt" || ext === ".rst") return "documentation"
    return null
}

/** Check if a path is a test file */
function isTestFile(relPath: string): boolean {
    const lower = relPath.toLowerCase()
    return TEST_INDICATORS.some(indicator => lower.includes(indicator))
}

/** Recursively scan directory tree */
async function walkDirectory(
    dir: string,
    projectRoot: string,
    maxDepth = 5,
    currentDepth = 0,
): Promise<{
    files: { path: string; sizeBytes: number; lastModified: number }[]
    dirs: DirectoryEntry[]
    docs: DocumentEntry[]
}> {
    const files: { path: string; sizeBytes: number; lastModified: number }[] = []
    const dirs: DirectoryEntry[] = []
    const docs: DocumentEntry[] = []

    if (currentDepth > maxDepth) return { files, dirs, docs }

    try {
        const entries = await readdir(dir, { withFileTypes: true })

        let dirFileCount = 0
        let dirTotalSize = 0
        const extensions = new Set<string>()
        let hasSource = false

        for (const entry of entries) {
            const fullPath = join(dir, entry.name)
            const relPath = relative(projectRoot, fullPath)

            if (entry.isDirectory()) {
                if (SKIP_DIRS.has(entry.name) || entry.name.startsWith(".")) continue

                const sub = await walkDirectory(fullPath, projectRoot, maxDepth, currentDepth + 1)
                files.push(...sub.files)
                dirs.push(...sub.dirs)
                docs.push(...sub.docs)
            } else if (entry.isFile()) {
                try {
                    const fileStat = await stat(fullPath)
                    const ext = extname(entry.name).toLowerCase()

                    files.push({
                        path: relPath,
                        sizeBytes: fileStat.size,
                        lastModified: fileStat.mtimeMs,
                    })

                    dirFileCount++
                    dirTotalSize += fileStat.size
                    if (ext) extensions.add(ext)
                    if (SOURCE_EXTENSIONS.has(ext)) hasSource = true

                    // Detect documents
                    const docType = detectDocType(entry.name)
                    if (docType) {
                        let firstLine = ""
                        try {
                            const content = await readFile(fullPath, "utf-8")
                            firstLine = content.split("\n").find(l => l.trim().length > 0)?.trim() ?? ""
                            if (firstLine.length > 100) firstLine = firstLine.slice(0, 100) + "..."
                        } catch { /* skip unreadable */ }

                        docs.push({
                            path: relPath,
                            type: docType,
                            sizeBytes: fileStat.size,
                            lastModified: fileStat.mtimeMs,
                            firstLine,
                        })
                    }
                } catch { /* skip unreadable files */ }
            }
        }

        // Record this directory
        if (currentDepth > 0 && dirFileCount > 0) {
            dirs.push({
                path: relative(projectRoot, dir),
                fileCount: dirFileCount,
                totalSizeBytes: dirTotalSize,
                isSource: hasSource,
                extensions: Array.from(extensions),
            })
        }
    } catch { /* skip unreadable directories */ }

    return { files, dirs, docs }
}

/** Load existing project map from disk */
async function loadProjectMap(projectRoot: string): Promise<ProjectMap | null> {
    try {
        const raw = await readFile(join(projectRoot, PROJECT_MAP_FILE), "utf-8")
        return JSON.parse(raw) as ProjectMap
    } catch {
        return null
    }
}

/** Save project map to disk */
async function saveProjectMap(projectRoot: string, map: ProjectMap): Promise<void> {
    const filePath = join(projectRoot, PROJECT_MAP_FILE)
    await mkdir(join(projectRoot, ".idumb/brain"), { recursive: true })
    await writeFile(filePath, JSON.stringify(map, null, 2) + "\n")
}

/** Map framework-detector results to ProjectMap framework format */
function mapToProjectFrameworks(
    detection: { governance: string[]; tech: string[] },
): Array<{ name: string; category: FrameworkCategory; confidence: number }> {
    const results: Array<{ name: string; category: FrameworkCategory; confidence: number }> = []

    for (const fw of detection.governance) {
        results.push({ name: fw, category: "governance", confidence: 90 })
    }
    for (const tech of detection.tech) {
        // Rough categorization
        const category: FrameworkCategory = tech.includes("test") || tech.includes("jest") || tech.includes("vitest")
            ? "testing"
            : tech.includes("next") || tech.includes("nuxt") || tech.includes("vite") || tech.includes("react") || tech.includes("vue") || tech.includes("svelte")
                ? "frontend"
                : tech.includes("express") || tech.includes("fastify") || tech.includes("nest")
                    ? "backend"
                    : "other"
        results.push({ name: tech, category, confidence: 80 })
    }

    return results
}

// ─── Tool Definition ────────────────────────────────────────────────

export const idumb_scan = tool({
    description: "Scan project for intelligence — detects frameworks, maps documents, analyzes directory structure, and tracks drift. Actions: full (complete scan), incremental (quick re-scan), drift (changes only), frameworks (tech stack only), documents (doc map only). Results persist to .idumb/brain/project-map.json.",
    args: {
        action: tool.schema.enum([
            "full", "incremental", "drift", "frameworks", "documents",
        ]).describe("Type of scan to perform"),
    },
    async execute(args, context) {
        const { directory } = context
        const log = createLogger(directory, "idumb-scan")
        const { action } = args
        const startTime = Date.now()

        log.info(`idumb_scan: action=${action}`, { directory })

        try {
            switch (action) {
                // ─── FULL SCAN ────────────────────────────────────────────
                case "full": {
                    const map = createProjectMap(directory)

                    // 1. Framework detection (reuse existing detector)
                    const detection = await scanProject(directory, log)
                    map.frameworks = mapToProjectFrameworks({
                        governance: detection.governance,
                        tech: detection.tech,
                    })

                    // 2. Language detection from extensions
                    const { files, dirs, docs } = await walkDirectory(directory, directory)

                    // Aggregate language stats
                    const langCounts = new Map<string, number>()
                    for (const f of files) {
                        const ext = extname(f.path).toLowerCase()
                        if (SOURCE_EXTENSIONS.has(ext)) {
                            const lang = ext.slice(1) // Remove leading dot
                            langCounts.set(lang, (langCounts.get(lang) ?? 0) + 1)
                        }
                    }
                    map.languages = Array.from(langCounts.entries()).map(([name, count]) => ({
                        name,
                        category: "language" as FrameworkCategory,
                        confidence: Math.min(95, 50 + count * 5),
                    }))

                    // 3. Map structure
                    map.directories = dirs
                    map.documents = docs

                    // 4. Compute stats
                    map.stats = {
                        totalFiles: files.length,
                        totalDirs: dirs.length,
                        totalSizeBytes: files.reduce((sum, f) => sum + f.sizeBytes, 0),
                        sourceFiles: files.filter(f => SOURCE_EXTENSIONS.has(extname(f.path).toLowerCase())).length,
                        testFiles: files.filter(f => isTestFile(f.path)).length,
                        configFiles: files.filter(f => CONFIG_PATTERNS.has(extname(f.path).toLowerCase())).length,
                        documentFiles: docs.length,
                    }

                    map.scanDurationMs = Date.now() - startTime
                    map.lastFullScanAt = Date.now()

                    // Save to disk
                    await saveProjectMap(directory, map)

                    log.info("Full scan complete", { files: map.stats.totalFiles, duration: map.scanDurationMs })

                    return formatProjectMap(map)
                }

                // ─── INCREMENTAL SCAN ─────────────────────────────────────
                case "incremental": {
                    const existing = await loadProjectMap(directory)

                    if (!existing) {
                        return "No previous scan found. Run `idumb_scan action=full` first for a complete project scan."
                    }

                    // Quick re-scan to detect drift
                    const { files } = await walkDirectory(directory, directory, 3) // Shallow for speed
                    const existingPaths = new Set(
                        existing.directories.map(d => d.path)
                            .concat(existing.documents.map(d => d.path))
                    )

                    const currentPaths = new Set(files.map(f => f.path))

                    // Detect new, deleted, and modified files
                    const newFiles = files
                        .filter(f => !existingPaths.has(f.path))
                        .map(f => f.path)
                        .slice(0, 50) // Cap output

                    const deletedFiles = Array.from(existingPaths)
                        .filter(p => !currentPaths.has(p))
                        .slice(0, 50)

                    // Check modification times for existing files
                    const modifiedFiles: string[] = []
                    for (const f of files) {
                        if (existingPaths.has(f.path) && f.lastModified > existing.scannedAt) {
                            modifiedFiles.push(f.path)
                        }
                    }

                    existing.driftSince = {
                        newFiles,
                        deletedFiles,
                        modifiedFiles: modifiedFiles.slice(0, 50),
                    }
                    existing.scannedAt = Date.now()
                    existing.scanDurationMs = Date.now() - startTime

                    await saveProjectMap(directory, existing)

                    const driftCount = newFiles.length + deletedFiles.length + modifiedFiles.length
                    if (driftCount === 0) {
                        return `No drift detected since last scan (${new Date(existing.lastFullScanAt).toISOString()}). Project is stable.`
                    }

                    return formatProjectMap(existing)
                }

                // ─── DRIFT ONLY ───────────────────────────────────────────
                case "drift": {
                    const existing = await loadProjectMap(directory)

                    if (!existing) {
                        return "No previous scan found. Run `idumb_scan action=full` first."
                    }

                    if (!existing.driftSince) {
                        return `No drift data available. Run \`idumb_scan action=incremental\` to detect changes since last full scan (${new Date(existing.lastFullScanAt).toISOString()}).`
                    }

                    const d = existing.driftSince
                    const lines: string[] = [
                        `=== Drift Since Last Scan ===`,
                        `Last full scan: ${new Date(existing.lastFullScanAt).toISOString()}`,
                        "",
                    ]

                    if (d.newFiles.length > 0) {
                        lines.push(`NEW FILES (${d.newFiles.length}):`)
                        d.newFiles.forEach(f => lines.push(`  + ${f}`))
                        lines.push("")
                    }
                    if (d.deletedFiles.length > 0) {
                        lines.push(`DELETED FILES (${d.deletedFiles.length}):`)
                        d.deletedFiles.forEach(f => lines.push(`  - ${f}`))
                        lines.push("")
                    }
                    if (d.modifiedFiles.length > 0) {
                        lines.push(`MODIFIED FILES (${d.modifiedFiles.length}):`)
                        d.modifiedFiles.forEach(f => lines.push(`  ~ ${f}`))
                        lines.push("")
                    }

                    return lines.join("\n")
                }

                // ─── FRAMEWORKS ONLY ──────────────────────────────────────
                case "frameworks": {
                    const detection = await scanProject(directory, log)
                    const frameworks = mapToProjectFrameworks({
                        governance: detection.governance,
                        tech: detection.tech,
                    })

                    if (frameworks.length === 0) {
                        return "No frameworks detected. This may be a vanilla project or the detection signatures need expanding."
                    }

                    const lines = ["=== Detected Frameworks ===", ""]
                    for (const fw of frameworks) {
                        lines.push(`  [${fw.category.toUpperCase()}] ${fw.name} (${fw.confidence}% confidence)`)
                    }

                    return lines.join("\n")
                }

                // ─── DOCUMENTS ONLY ───────────────────────────────────────
                case "documents": {
                    const { docs } = await walkDirectory(directory, directory, 3)

                    if (docs.length === 0) {
                        return "No project documents detected."
                    }

                    const lines = ["=== Project Documents ===", ""]
                    const byType = new Map<string, DocumentEntry[]>()
                    for (const doc of docs) {
                        const existing = byType.get(doc.type) ?? []
                        existing.push(doc)
                        byType.set(doc.type, existing)
                    }

                    for (const [type, entries] of byType) {
                        lines.push(`${type.toUpperCase()} (${entries.length}):`)
                        for (const doc of entries) {
                            lines.push(`  ${doc.path} (${(doc.sizeBytes / 1024).toFixed(1)}KB)`)
                            if (doc.firstLine) lines.push(`    → ${doc.firstLine}`)
                        }
                        lines.push("")
                    }

                    return lines.join("\n")
                }

                default:
                    return `Unknown action: "${action}". Valid actions: full, incremental, drift, frameworks, documents`
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            log.error("idumb_scan error", { error: msg })
            return `## ❌ Scan Error\n\n${msg}`
        }
    },
})
