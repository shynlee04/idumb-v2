/**
 * Brain Indexer — populates codemap.json and project-map.json.
 *
 * Two strategies per index:
 * 1. SDK-first: try client.find.symbols() / client.find.files()
 * 2. Fallback: regex-based parsing of .ts/.js files
 *
 * P3: Graceful degradation — SDK calls are experimental and may not
 * match the expected shape. Every SDK path is wrapped in try/catch
 * with automatic fallback to the fs-based implementation.
 *
 * CRITICAL: NO console.log — breaks TUI rendering.
 */

import { readFile, readdir, stat } from "node:fs/promises"
import { join, extname, relative } from "node:path"
import type { CodeMapStore, CodeItem, CodeItemType, CodeComment, CommentMarker, FileMapEntry } from "../schemas/codemap.js"
import { createCodeMapStore } from "../schemas/codemap.js"
import type { ProjectMap, DirectoryEntry, DocumentEntry, DocumentType } from "../schemas/project-map.js"
import { createProjectMap } from "../schemas/project-map.js"

// ─── Code Map Population ─────────────────────────────────────────────

/** Regex patterns for extracting code items from TypeScript/JavaScript files */
const EXPORT_PATTERNS: Array<{ pattern: RegExp; type: CodeItemType }> = [
  { pattern: /^export\s+(?:async\s+)?function\s+(\w+)/gm, type: "function" },
  { pattern: /^export\s+class\s+(\w+)/gm, type: "class" },
  { pattern: /^export\s+interface\s+(\w+)/gm, type: "interface" },
  { pattern: /^export\s+type\s+(\w+)/gm, type: "type" },
  { pattern: /^export\s+enum\s+(\w+)/gm, type: "enum" },
  { pattern: /^export\s+const\s+(\w+)/gm, type: "constant" },
  { pattern: /^export\s+(?:let|var)\s+(\w+)/gm, type: "variable" },
]

/** Regex for comment markers (TODO, FIXME, etc.) */
const COMMENT_MARKER_PATTERN = /\/\/\s*(TODO|FIXME|HACK|XXX|NOTE|WARN|PERF)[:\s]+(.+)/gi

/** Source file extensions to scan */
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"])

/** Directories to skip during scanning */
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".idumb", ".next", "coverage", ".turbo"])

/**
 * Walk a directory tree, calling a callback for each file.
 * Skips common non-source directories.
 */
async function walkDir(
  rootDir: string,
  callback: (absPath: string, relPath: string) => Promise<void>,
): Promise<void> {
  async function walk(currentDir: string): Promise<void> {
    let entries
    try {
      entries = await readdir(currentDir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      const name = String(entry.name)
      const absPath = join(currentDir, name)

      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(name)) {
          await walk(absPath)
        }
      } else if (entry.isFile()) {
        const relPath = relative(rootDir, absPath).replace(/\\/g, "/")
        await callback(absPath, relPath)
      }
    }
  }

  await walk(rootDir)
}

/**
 * Extract code items and comments from a source file using regex.
 * This is the fallback when SDK symbols API is unavailable.
 */
function parseSourceFile(content: string, filePath: string): {
  items: CodeItem[]
  comments: CodeComment[]
} {
  const items: CodeItem[] = []
  const comments: CodeComment[] = []
  const lines = content.split("\n")

  // Extract exports via regex
  for (const { pattern, type } of EXPORT_PATTERNS) {
    // Reset lastIndex for global regexes
    const regex = new RegExp(pattern.source, pattern.flags)
    let match
    while ((match = regex.exec(content)) !== null) {
      const name = match[1]
      // Find line number
      const beforeMatch = content.slice(0, match.index)
      const line = beforeMatch.split("\n").length

      items.push({
        name,
        type,
        line,
        exported: true,
        signature: match[0].trim(),
      })
    }
  }

  // Extract comment markers
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const commentRegex = new RegExp(COMMENT_MARKER_PATTERN.source, COMMENT_MARKER_PATTERN.flags)
    let match
    while ((match = commentRegex.exec(line)) !== null) {
      comments.push({
        marker: match[1].toUpperCase() as CommentMarker,
        content: match[2].trim(),
        file: filePath,
        line: i + 1,
      })
    }
  }

  return { items, comments }
}

/**
 * Populate a CodeMapStore by scanning the project directory.
 *
 * Strategy: try SDK symbols API first, fall back to regex parsing.
 */
export async function populateCodeMap(
  dir: string,
  client?: Record<string, unknown> | null,
): Promise<CodeMapStore> {
  const startTime = Date.now()
  const store = createCodeMapStore(dir)

  // Try SDK symbols API
  if (client) {
    try {
      const findApi = client.find as unknown as Record<string, unknown>
      if (typeof findApi.symbols === "function") {
        const result = await (findApi.symbols as (opts: { directory: string }) => Promise<unknown>)({ directory: dir })
        if (Array.isArray(result) && result.length > 0) {
          // SDK returned symbols — build store from them
          // Shape is unknown, so we parse defensively
          for (const sym of result) {
            const s = sym as Record<string, unknown>
            if (typeof s.name === "string" && typeof s.file === "string") {
              const relPath = typeof s.file === "string"
                ? (s.file.startsWith(dir) ? s.file.slice(dir.length + 1) : s.file).replace(/\\/g, "/")
                : ""
              const item: CodeItem = {
                name: s.name,
                type: (typeof s.kind === "string" ? s.kind : "function") as CodeItemType,
                line: typeof s.line === "number" ? s.line : 0,
                exported: true,
              }
              // Find or create file entry
              let fileEntry = store.files.find(f => f.path === relPath)
              if (!fileEntry) {
                fileEntry = {
                  path: relPath,
                  language: extname(relPath).slice(1) || "unknown",
                  sizeBytes: 0,
                  lastModified: Date.now(),
                  items: [],
                  importPaths: [],
                  exportNames: [],
                  comments: [],
                  lineCount: 0,
                  functionCount: 0,
                  classCount: 0,
                }
                store.files.push(fileEntry)
              }
              fileEntry.items.push(item)
              fileEntry.exportNames.push(item.name)
            }
          }

          // Compute stats
          store.stats.totalFiles = store.files.length
          store.stats.totalFunctions = store.files.reduce((sum, f) => sum + f.items.filter(i => i.type === "function").length, 0)
          store.stats.totalClasses = store.files.reduce((sum, f) => sum + f.items.filter(i => i.type === "class").length, 0)
          store.scanDurationMs = Date.now() - startTime
          return store
        }
      }
    } catch {
      // SDK call failed — fall through to fs-based scanning
    }
  }

  // Fallback: fs-based regex scanning
  const languages: Record<string, number> = {}

  await walkDir(dir, async (absPath, relPath) => {
    const ext = extname(relPath)
    if (!SOURCE_EXTENSIONS.has(ext)) return

    try {
      const content = await readFile(absPath, "utf-8")
      const fileStat = await stat(absPath)
      const lines = content.split("\n")
      const lang = ext.slice(1)
      languages[lang] = (languages[lang] ?? 0) + 1

      const { items, comments } = parseSourceFile(content, relPath)

      const fileEntry: FileMapEntry = {
        path: relPath,
        language: lang,
        sizeBytes: fileStat.size,
        lastModified: fileStat.mtimeMs,
        items,
        importPaths: [],
        exportNames: items.filter(i => i.exported).map(i => i.name),
        comments,
        lineCount: lines.length,
        functionCount: items.filter(i => i.type === "function").length,
        classCount: items.filter(i => i.type === "class").length,
      }

      store.files.push(fileEntry)
      store.comments.push(...comments)
      store.stats.totalLines += lines.length
      store.stats.totalFunctions += fileEntry.functionCount
      store.stats.totalClasses += fileEntry.classCount
    } catch {
      // Skip unreadable files
    }
  })

  store.stats.totalFiles = store.files.length
  store.stats.totalTodos = store.comments.filter(c => c.marker === "TODO").length
  store.stats.totalFixmes = store.comments.filter(c => c.marker === "FIXME").length
  store.stats.languages = languages
  store.scanDurationMs = Date.now() - startTime

  return store
}

// ─── Project Map Population ──────────────────────────────────────────

/** Detect document type from filename */
function detectDocumentType(filename: string): DocumentType | null {
  const lower = filename.toLowerCase()
  if (lower.startsWith("readme")) return "readme"
  if (lower.startsWith("changelog") || lower.startsWith("changes")) return "changelog"
  if (lower.startsWith("license") || lower.startsWith("licence")) return "license"
  if (lower.startsWith("contributing")) return "contributing"
  if (lower.startsWith("todo")) return "todo"
  if (lower.startsWith("api")) return "api"
  if (lower.includes("agents")) return "agents"
  if (lower.endsWith(".md") || lower.endsWith(".rst") || lower.endsWith(".txt")) return "documentation"
  return null
}

/** Check if a file extension indicates a config file */
function isConfigFile(filename: string): boolean {
  const lower = filename.toLowerCase()
  return lower.endsWith(".json") || lower.endsWith(".yaml") || lower.endsWith(".yml")
    || lower.endsWith(".toml") || lower.endsWith(".ini") || lower.endsWith(".env")
    || lower.startsWith(".") // dotfiles are usually config
}

/** Check if a path indicates a test file */
function isTestFile(relPath: string): boolean {
  const lower = relPath.toLowerCase()
  return lower.includes("test") || lower.includes("spec") || lower.includes("__tests__")
}

/** Check if a directory is a source directory */
function isSourceDir(dirName: string): boolean {
  const sourceNames = new Set(["src", "lib", "app", "pages", "components", "modules", "core", "utils", "helpers"])
  return sourceNames.has(dirName.toLowerCase())
}

/**
 * Populate a ProjectMap by scanning the project directory.
 *
 * Strategy: try SDK files API first, fall back to fs-based scanning.
 */
export async function populateProjectMap(
  dir: string,
  _client?: unknown,
): Promise<ProjectMap> {
  const startTime = Date.now()
  const map = createProjectMap(dir)

  const dirStats = new Map<string, { fileCount: number; totalSize: number; extensions: Set<string>; isSource: boolean }>()
  let totalFiles = 0
  let totalSize = 0
  let sourceFiles = 0
  let testFiles = 0
  let configFiles = 0
  let documentFiles = 0

  // Walk the project and collect stats
  await walkDir(dir, async (absPath, relPath) => {
    totalFiles++

    try {
      const fileStat = await stat(absPath)
      totalSize += fileStat.size
      const ext = extname(relPath)
      const dirPath = relPath.includes("/") ? relPath.slice(0, relPath.lastIndexOf("/")) : "."

      // Track directory stats
      let dirStat = dirStats.get(dirPath)
      if (!dirStat) {
        const dirName = dirPath.split("/").pop() ?? dirPath
        dirStat = { fileCount: 0, totalSize: 0, extensions: new Set(), isSource: isSourceDir(dirName) }
        dirStats.set(dirPath, dirStat)
      }
      dirStat.fileCount++
      dirStat.totalSize += fileStat.size
      if (ext) dirStat.extensions.add(ext)

      // Classify file
      if (SOURCE_EXTENSIONS.has(ext)) sourceFiles++
      if (isTestFile(relPath)) testFiles++

      const filename = relPath.split("/").pop() ?? relPath
      if (isConfigFile(filename)) configFiles++

      const docType = detectDocumentType(filename)
      if (docType) {
        documentFiles++
        // Read first line for document entries
        try {
          const content = await readFile(absPath, "utf-8")
          const firstLine = content.split("\n").find(l => l.trim().length > 0) ?? ""
          const docEntry: DocumentEntry = {
            path: relPath,
            type: docType,
            sizeBytes: fileStat.size,
            lastModified: fileStat.mtimeMs,
            firstLine: firstLine.slice(0, 200),
          }
          map.documents.push(docEntry)
        } catch {
          // Skip unreadable
        }
      }
    } catch {
      // Skip files we can't stat
    }
  })

  // Build directory entries
  for (const [dirPath, ds] of dirStats) {
    const entry: DirectoryEntry = {
      path: dirPath,
      fileCount: ds.fileCount,
      totalSizeBytes: ds.totalSize,
      isSource: ds.isSource,
      extensions: [...ds.extensions].sort(),
    }
    map.directories.push(entry)
  }

  // Sort directories by path
  map.directories.sort((a, b) => a.path.localeCompare(b.path))

  map.stats = {
    totalFiles,
    totalDirs: dirStats.size,
    totalSizeBytes: totalSize,
    sourceFiles,
    testFiles,
    configFiles,
    documentFiles,
  }

  map.scanDurationMs = Date.now() - startTime
  return map
}
