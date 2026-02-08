/**
 * ProjectMap entity schemas — structured intelligence from project scans.
 *
 * Part of Group 3: Project Documents
 * Entities persist to `.idumb/brain/project-map.json`
 *
 * Built by project scanning tools. Contains:
 * - Framework/tech detection results
 * - Project structure map
 * - Document hierarchy
 * - Drift detection (changes since last scan)
 */

/**
 * STATUS: Schema-only. Not wired into runtime hooks or tools.
 * These schemas define ProjectMap for directory/file mapping.
 * Planned for future integration when project mapping is implemented.
 */

// ─── Framework & Tech Detection ─────────────────────────────────────

export type FrameworkCategory =
    | "frontend"
    | "backend"
    | "database"
    | "testing"
    | "build"
    | "ci"
    | "governance"
    | "package-manager"
    | "language"
    | "other"

export interface FrameworkDetection {
    name: string
    category: FrameworkCategory
    version?: string
    configFile?: string              // e.g., "tsconfig.json", "package.json"
    confidence: number               // 0-100
}

// ─── Document Entry ─────────────────────────────────────────────────

export type DocumentType =
    | "readme"
    | "changelog"
    | "license"
    | "config"
    | "documentation"
    | "agents"
    | "contributing"
    | "todo"
    | "api"
    | "other"

export interface DocumentEntry {
    path: string                     // Relative to project root
    type: DocumentType
    sizeBytes: number
    lastModified: number
    firstLine: string                // First non-empty line for quick identification
}

// ─── Directory Entry ────────────────────────────────────────────────

export interface DirectoryEntry {
    path: string                     // Relative to project root
    fileCount: number
    totalSizeBytes: number
    isSource: boolean                // Is this a source code directory?
    extensions: string[]             // File extensions found
}

// ─── Project Map ────────────────────────────────────────────────────

export const PROJECT_MAP_VERSION = "1.0.0"

export interface ProjectMap {
    version: string
    scannedAt: number
    scanDurationMs: number
    projectRoot: string

    // Detection results
    frameworks: FrameworkDetection[]
    languages: FrameworkDetection[]  // Reuse same shape

    // Structure
    directories: DirectoryEntry[]
    documents: DocumentEntry[]

    // Summary statistics
    stats: {
        totalFiles: number
        totalDirs: number
        totalSizeBytes: number
        sourceFiles: number
        testFiles: number
        configFiles: number
        documentFiles: number
    }

    // Drift detection
    lastFullScanAt: number
    driftSince?: {
        newFiles: string[]
        deletedFiles: string[]
        modifiedFiles: string[]
    }
}

// ─── Factory Functions ──────────────────────────────────────────────

export function createProjectMap(projectRoot: string): ProjectMap {
    const now = Date.now()
    return {
        version: PROJECT_MAP_VERSION,
        scannedAt: now,
        scanDurationMs: 0,
        projectRoot,
        frameworks: [],
        languages: [],
        directories: [],
        documents: [],
        stats: {
            totalFiles: 0,
            totalDirs: 0,
            totalSizeBytes: 0,
            sourceFiles: 0,
            testFiles: 0,
            configFiles: 0,
            documentFiles: 0,
        },
        lastFullScanAt: now,
    }
}

// ─── Formatting ─────────────────────────────────────────────────────

export function formatProjectMap(map: ProjectMap): string {
    const lines: string[] = []
    lines.push("=== Project Map ===")
    lines.push(`Scanned: ${new Date(map.scannedAt).toISOString()}`)
    lines.push(`Duration: ${map.scanDurationMs}ms`)
    lines.push("")

    // Frameworks
    if (map.frameworks.length > 0) {
        lines.push("FRAMEWORKS:")
        for (const fw of map.frameworks) {
            const ver = fw.version ? ` v${fw.version}` : ""
            lines.push(`  [${fw.category}] ${fw.name}${ver} (${fw.confidence}% confidence)`)
        }
        lines.push("")
    }

    // Languages
    if (map.languages.length > 0) {
        lines.push("LANGUAGES:")
        for (const lang of map.languages) {
            lines.push(`  ${lang.name}${lang.version ? ` v${lang.version}` : ""}`)
        }
        lines.push("")
    }

    // Stats
    lines.push("STATS:")
    lines.push(`  Files: ${map.stats.totalFiles} (${map.stats.sourceFiles} source, ${map.stats.testFiles} test, ${map.stats.configFiles} config, ${map.stats.documentFiles} docs)`)
    lines.push(`  Directories: ${map.stats.totalDirs}`)
    lines.push(`  Total size: ${(map.stats.totalSizeBytes / 1024).toFixed(1)}KB`)
    lines.push("")

    // Documents
    if (map.documents.length > 0) {
        lines.push("DOCUMENTS:")
        for (const doc of map.documents) {
            lines.push(`  [${doc.type.toUpperCase()}] ${doc.path} (${(doc.sizeBytes / 1024).toFixed(1)}KB)`)
        }
        lines.push("")
    }

    // Drift
    if (map.driftSince) {
        const d = map.driftSince
        lines.push("DRIFT SINCE LAST SCAN:")
        if (d.newFiles.length > 0) lines.push(`  + ${d.newFiles.length} new files`)
        if (d.deletedFiles.length > 0) lines.push(`  - ${d.deletedFiles.length} deleted files`)
        if (d.modifiedFiles.length > 0) lines.push(`  ~ ${d.modifiedFiles.length} modified files`)
        lines.push("")
    }

    return lines.join("\n")
}
