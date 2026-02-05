/**
 * Codebase Scanner
 * 
 * Deterministic filesystem scanner that produces a ScanResult JSON.
 * No LLM involvement — pure file analysis.
 * Output: .idumb/brain/context/scan-result.json
 */

import { existsSync, readdirSync, readFileSync, statSync } from "fs"
import { join, extname, basename } from "path"
import type {
  ScanResult,
  ProjectStage,
  Gap,
  DebtSignal,
  Concern,
  Conventions,
  DriftInfo,
} from "../schemas/scan.js"
import { createEmptyScanResult } from "../schemas/scan.js"
import { detectFramework } from "./framework-detector.js"

// ============================================================================
// FILE CLASSIFICATION
// ============================================================================

const SOURCE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".py", ".pyw",
  ".rs",
  ".go",
  ".java", ".kt", ".kts",
  ".swift",
  ".c", ".cpp", ".cc", ".h", ".hpp",
  ".rb",
  ".php",
  ".cs",
  ".vue", ".svelte",
])

const TEST_PATTERNS = [
  /\.test\.[tj]sx?$/,
  /\.spec\.[tj]sx?$/,
  /_test\.[tj]sx?$/,
  /_test\.go$/,
  /test_.*\.py$/,
  /.*_test\.py$/,
  /\.test\.py$/,
  /\.spec\.py$/,
]

const CONFIG_FILES = new Set([
  "package.json", "tsconfig.json", "jsconfig.json",
  ".eslintrc", ".eslintrc.js", ".eslintrc.json", ".eslintrc.yml",
  "eslint.config.js", "eslint.config.mjs", "eslint.config.ts",
  "biome.json", "biome.jsonc",
  ".prettierrc", ".prettierrc.js", ".prettierrc.json", ".prettierrc.yml",
  "prettier.config.js", "prettier.config.mjs",
  "vite.config.ts", "vite.config.js", "vite.config.mjs",
  "webpack.config.js", "webpack.config.ts",
  "rollup.config.js", "rollup.config.mjs",
  "esbuild.config.js",
  "next.config.js", "next.config.mjs", "next.config.ts",
  "nuxt.config.ts", "nuxt.config.js",
  "svelte.config.js",
  "astro.config.mjs", "astro.config.ts",
  "tailwind.config.js", "tailwind.config.ts",
  "postcss.config.js", "postcss.config.mjs",
  "vitest.config.ts", "vitest.config.js",
  "jest.config.js", "jest.config.ts",
  "Cargo.toml", "go.mod", "requirements.txt", "pyproject.toml",
  "Gemfile", "composer.json",
  "Dockerfile", "docker-compose.yml", "docker-compose.yaml",
  ".env", ".env.example", ".env.local",
])

const DOC_EXTENSIONS = new Set([".md", ".mdx", ".txt", ".rst"])

const IGNORE_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", ".nuxt",
  "__pycache__", ".pytest_cache", "target", "vendor",
  ".idumb", ".opencode", ".windsurf", ".vscode", ".idea",
  ".plugin-dev", "coverage", ".turbo", ".vercel",
])

// ============================================================================
// DIRECTORY WALKER
// ============================================================================

interface FileStats {
  sourceFiles: string[]
  testFiles: string[]
  configFiles: string[]
  docFiles: string[]
  allFiles: string[]
}

/**
 * Recursively walk a directory, classifying files.
 * Respects IGNORE_DIRS to avoid scanning node_modules etc.
 */
function walkDirectory(directory: string, maxDepth: number = 8): FileStats {
  const stats: FileStats = {
    sourceFiles: [],
    testFiles: [],
    configFiles: [],
    docFiles: [],
    allFiles: [],
  }

  function walk(dir: string, depth: number): void {
    if (depth > maxDepth) return

    let entries: string[]
    try {
      entries = readdirSync(dir)
    } catch {
      return
    }

    for (const entry of entries) {
      if (entry.startsWith(".") && !CONFIG_FILES.has(entry)) {
        if (IGNORE_DIRS.has(entry)) continue
      }
      if (IGNORE_DIRS.has(entry)) continue

      const fullPath = join(dir, entry)
      let stat
      try {
        stat = statSync(fullPath)
      } catch {
        continue
      }

      if (stat.isDirectory()) {
        walk(fullPath, depth + 1)
        continue
      }

      if (!stat.isFile()) continue

      const relativePath = fullPath.slice(directory.length + 1)
      const ext = extname(entry)
      const name = basename(entry)

      stats.allFiles.push(relativePath)

      // Test file check (before source, since tests are also source extensions)
      if (TEST_PATTERNS.some((p) => p.test(name))) {
        stats.testFiles.push(relativePath)
        continue
      }

      // Source file
      if (SOURCE_EXTENSIONS.has(ext)) {
        stats.sourceFiles.push(relativePath)
        continue
      }

      // Config file
      if (CONFIG_FILES.has(name)) {
        stats.configFiles.push(relativePath)
        continue
      }

      // Doc file
      if (DOC_EXTENSIONS.has(ext)) {
        stats.docFiles.push(relativePath)
      }
    }
  }

  walk(directory, 0)
  return stats
}

// ============================================================================
// LANGUAGE & STACK DETECTION
// ============================================================================

const LANGUAGE_MAP: Record<string, string> = {
  ".ts": "typescript", ".tsx": "typescript",
  ".js": "javascript", ".jsx": "javascript", ".mjs": "javascript", ".cjs": "javascript",
  ".py": "python", ".pyw": "python",
  ".rs": "rust",
  ".go": "go",
  ".java": "java", ".kt": "kotlin", ".kts": "kotlin",
  ".swift": "swift",
  ".c": "c", ".cpp": "c++", ".cc": "c++", ".h": "c", ".hpp": "c++",
  ".rb": "ruby",
  ".php": "php",
  ".cs": "c#",
  ".vue": "vue", ".svelte": "svelte",
}

function detectLanguages(sourceFiles: string[]): string[] {
  const counts = new Map<string, number>()

  for (const file of sourceFiles) {
    const ext = extname(file)
    const lang = LANGUAGE_MAP[ext]
    if (lang) {
      counts.set(lang, (counts.get(lang) ?? 0) + 1)
    }
  }

  // Sort by count descending
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([lang]) => lang)
}

interface PackageJson {
  name?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  scripts?: Record<string, string>
}

function readPackageJson(directory: string): PackageJson | null {
  const pkgPath = join(directory, "package.json")
  if (!existsSync(pkgPath)) return null

  try {
    return JSON.parse(readFileSync(pkgPath, "utf-8")) as PackageJson
  } catch {
    return null
  }
}

const STACK_DETECTORS: Array<{ name: string; test: (pkg: PackageJson) => boolean }> = [
  { name: "react", test: (p) => hasDep(p, "react") },
  { name: "next.js", test: (p) => hasDep(p, "next") },
  { name: "vue", test: (p) => hasDep(p, "vue") },
  { name: "nuxt", test: (p) => hasDep(p, "nuxt") },
  { name: "svelte", test: (p) => hasDep(p, "svelte") },
  { name: "sveltekit", test: (p) => hasDep(p, "@sveltejs/kit") },
  { name: "astro", test: (p) => hasDep(p, "astro") },
  { name: "express", test: (p) => hasDep(p, "express") },
  { name: "fastify", test: (p) => hasDep(p, "fastify") },
  { name: "hono", test: (p) => hasDep(p, "hono") },
  { name: "tailwind", test: (p) => hasDep(p, "tailwindcss") },
  { name: "prisma", test: (p) => hasDep(p, "prisma") || hasDep(p, "@prisma/client") },
  { name: "drizzle", test: (p) => hasDep(p, "drizzle-orm") },
  { name: "zod", test: (p) => hasDep(p, "zod") },
  { name: "trpc", test: (p) => hasDep(p, "@trpc/server") },
  { name: "electron", test: (p) => hasDep(p, "electron") },
  { name: "react-native", test: (p) => hasDep(p, "react-native") },
  { name: "expo", test: (p) => hasDep(p, "expo") },
  { name: "vite", test: (p) => hasDep(p, "vite") },
  { name: "webpack", test: (p) => hasDep(p, "webpack") },
  { name: "esbuild", test: (p) => hasDep(p, "esbuild") },
  { name: "typescript", test: (p) => hasDep(p, "typescript") },
]

function hasDep(pkg: PackageJson, name: string): boolean {
  return !!(pkg.dependencies?.[name] || pkg.devDependencies?.[name])
}

function detectStack(directory: string, pkg: PackageJson | null): string[] {
  const stack: string[] = []

  if (pkg) {
    for (const detector of STACK_DETECTORS) {
      if (detector.test(pkg)) {
        stack.push(detector.name)
      }
    }
  }

  // Non-JS stack detection
  if (existsSync(join(directory, "Cargo.toml"))) stack.push("rust-cargo")
  if (existsSync(join(directory, "go.mod"))) stack.push("go-modules")
  if (existsSync(join(directory, "requirements.txt"))) stack.push("pip")
  if (existsSync(join(directory, "pyproject.toml"))) stack.push("python-project")
  if (existsSync(join(directory, "Gemfile"))) stack.push("ruby-bundler")
  if (existsSync(join(directory, "composer.json"))) stack.push("php-composer")

  return stack
}

function detectPackageManager(directory: string): string | null {
  if (existsSync(join(directory, "bun.lockb")) || existsSync(join(directory, "bun.lock"))) return "bun"
  if (existsSync(join(directory, "pnpm-lock.yaml"))) return "pnpm"
  if (existsSync(join(directory, "yarn.lock"))) return "yarn"
  if (existsSync(join(directory, "package-lock.json"))) return "npm"
  if (existsSync(join(directory, "Cargo.lock"))) return "cargo"
  if (existsSync(join(directory, "go.sum"))) return "go"
  if (existsSync(join(directory, "requirements.txt"))) return "pip"
  if (existsSync(join(directory, "Gemfile.lock"))) return "bundler"
  if (existsSync(join(directory, "composer.lock"))) return "composer"
  return null
}

// ============================================================================
// STAGE CLASSIFICATION
// ============================================================================

function classifyStage(sourceCount: number, testCount: number, configCount: number): ProjectStage {
  if (sourceCount < 5) return "greenfield"
  if (sourceCount > 50 && testCount > 5 && configCount > 3) return "mature"
  return "brownfield"
}

// ============================================================================
// CONVENTIONS DETECTION
// ============================================================================

function detectConventions(directory: string, configFiles: string[]): Conventions {
  const conventions: Conventions = {
    linting: null,
    formatting: null,
    testing: null,
    naming: null,
    bundler: null,
  }

  const configSet = new Set(configFiles.map((f) => basename(f)))

  // Linting
  if (configSet.has("biome.json") || configSet.has("biome.jsonc")) {
    conventions.linting = "biome"
  } else if (
    configSet.has(".eslintrc") || configSet.has(".eslintrc.js") ||
    configSet.has(".eslintrc.json") || configSet.has(".eslintrc.yml") ||
    configSet.has("eslint.config.js") || configSet.has("eslint.config.mjs") ||
    configSet.has("eslint.config.ts")
  ) {
    conventions.linting = "eslint"
  }

  // Formatting
  if (conventions.linting === "biome") {
    conventions.formatting = "biome"
  } else if (
    configSet.has(".prettierrc") || configSet.has(".prettierrc.js") ||
    configSet.has(".prettierrc.json") || configSet.has(".prettierrc.yml") ||
    configSet.has("prettier.config.js") || configSet.has("prettier.config.mjs")
  ) {
    conventions.formatting = "prettier"
  }

  // Testing
  if (configSet.has("vitest.config.ts") || configSet.has("vitest.config.js")) {
    conventions.testing = "vitest"
  } else if (configSet.has("jest.config.js") || configSet.has("jest.config.ts")) {
    conventions.testing = "jest"
  } else {
    // Check package.json scripts
    const pkg = readPackageJson(directory)
    if (pkg?.scripts) {
      const scripts = Object.values(pkg.scripts).join(" ")
      if (scripts.includes("vitest")) conventions.testing = "vitest"
      else if (scripts.includes("jest")) conventions.testing = "jest"
      else if (scripts.includes("mocha")) conventions.testing = "mocha"
      else if (scripts.includes("pytest")) conventions.testing = "pytest"
    }
  }

  // Bundler
  if (configSet.has("vite.config.ts") || configSet.has("vite.config.js") || configSet.has("vite.config.mjs")) {
    conventions.bundler = "vite"
  } else if (configSet.has("webpack.config.js") || configSet.has("webpack.config.ts")) {
    conventions.bundler = "webpack"
  } else if (configSet.has("rollup.config.js") || configSet.has("rollup.config.mjs")) {
    conventions.bundler = "rollup"
  } else if (configSet.has("esbuild.config.js")) {
    conventions.bundler = "esbuild"
  }

  return conventions
}

// ============================================================================
// GAP ANALYSIS
// ============================================================================

function analyzeGaps(
  files: FileStats,
  conventions: Conventions,
  directory: string,
): Gap[] {
  const gaps: Gap[] = []
  let gapId = 0

  const nextId = (): string => `gap-${++gapId}`

  // No tests
  if (files.testFiles.length === 0 && files.sourceFiles.length > 0) {
    gaps.push({
      id: nextId(),
      category: "testing",
      description: "No test files detected",
      severity: "high",
    })
  }

  // No CI/CD
  const hasCI = existsSync(join(directory, ".github/workflows")) ||
    existsSync(join(directory, ".gitlab-ci.yml")) ||
    existsSync(join(directory, ".circleci"))
  if (!hasCI && files.sourceFiles.length > 5) {
    gaps.push({
      id: nextId(),
      category: "ci-cd",
      description: "No CI/CD configuration detected",
      severity: "medium",
    })
  }

  // No README
  const hasReadme = existsSync(join(directory, "README.md")) ||
    existsSync(join(directory, "readme.md"))
  if (!hasReadme) {
    gaps.push({
      id: nextId(),
      category: "documentation",
      description: "No README.md found",
      severity: "medium",
    })
  }

  // No linting
  if (!conventions.linting && files.sourceFiles.length > 5) {
    gaps.push({
      id: nextId(),
      category: "conventions",
      description: "No linter configuration detected",
      severity: "low",
    })
  }

  // No formatting
  if (!conventions.formatting && files.sourceFiles.length > 5) {
    gaps.push({
      id: nextId(),
      category: "conventions",
      description: "No formatter configuration detected",
      severity: "low",
    })
  }

  // No .gitignore
  if (!existsSync(join(directory, ".gitignore")) && files.sourceFiles.length > 0) {
    gaps.push({
      id: nextId(),
      category: "conventions",
      description: "No .gitignore file found",
      severity: "medium",
    })
  }

  // No agents (OpenCode specific)
  const hasAgents = existsSync(join(directory, ".opencode/agents"))
  if (!hasAgents) {
    gaps.push({
      id: nextId(),
      category: "intelligence",
      description: "No OpenCode agents configured",
      severity: "high",
    })
  }

  return gaps
}

// ============================================================================
// DEBT DETECTION
// ============================================================================

function detectDebt(files: FileStats, directory: string): DebtSignal[] {
  const debt: DebtSignal[] = []
  let debtId = 0

  const nextId = (): string => `debt-${++debtId}`

  // Large file count with no tests suggests debt
  if (files.sourceFiles.length > 20 && files.testFiles.length === 0) {
    debt.push({
      id: nextId(),
      signal: "Large codebase with zero test coverage",
      location: "project-wide",
    })
  }

  // Check for TODO/FIXME in source files (sample first 20)
  let todoCount = 0
  const sample = files.sourceFiles.slice(0, 20)
  for (const file of sample) {
    try {
      const content = readFileSync(join(directory, file), "utf-8")
      const matches = content.match(/(?:TODO|FIXME|HACK|XXX)[\s:]/g)
      if (matches) todoCount += matches.length
    } catch {
      // skip unreadable
    }
  }
  if (todoCount > 10) {
    debt.push({
      id: nextId(),
      signal: `${todoCount}+ TODO/FIXME markers in sampled files`,
      location: "source files (sampled first 20)",
    })
  }

  return debt
}

// ============================================================================
// CONCERN ANALYSIS
// ============================================================================

function analyzeConcerns(files: FileStats, _directory: string): Concern[] {
  const concerns: Concern[] = []
  let concernId = 0

  const nextId = (): string => `concern-${++concernId}`

  // Very deep nesting
  const deepFiles = files.sourceFiles.filter((f) => f.split("/").length > 6)
  if (deepFiles.length > 5) {
    concerns.push({
      id: nextId(),
      type: "structure",
      description: `${deepFiles.length} source files nested > 6 levels deep`,
    })
  }

  // Mixed languages without clear separation
  const langExts = new Set(files.sourceFiles.map((f) => extname(f)))
  if (langExts.size > 4) {
    concerns.push({
      id: nextId(),
      type: "complexity",
      description: `${langExts.size} different source file extensions detected — possible polyglot complexity`,
    })
  }

  return concerns
}

// ============================================================================
// DRIFT DETECTION
// ============================================================================

function detectDrift(directory: string): DriftInfo {
  const indicators: string[] = []

  // Check for stale .idumb state
  const statePath = join(directory, ".idumb/state.json")
  if (existsSync(statePath)) {
    try {
      const stat = statSync(statePath)
      const hoursOld = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60)
      if (hoursOld > 168) {
        indicators.push(`state.json is ${Math.round(hoursOld)}h old (>1 week)`)
      }
    } catch {
      // skip
    }
  }

  // Check for orphaned anchors (anchors dir exists but state has none)
  const anchorsDir = join(directory, ".idumb/anchors")
  if (existsSync(anchorsDir)) {
    try {
      const anchorFiles = readdirSync(anchorsDir).filter((f) => f.endsWith(".json"))
      if (anchorFiles.length > 20) {
        indicators.push(`${anchorFiles.length} anchor files — possible unbounded growth`)
      }
    } catch {
      // skip
    }
  }

  // Check if config doesn't match reality (e.g., config says "npm" but yarn.lock exists)
  const configPath = join(directory, ".idumb/brain/config.json")
  let configDrift = false
  if (existsSync(configPath)) {
    try {
      const config = JSON.parse(readFileSync(configPath, "utf-8"))
      if (config.status?.current?.phase === "execution" && !existsSync(join(directory, ".idumb/project-output/phases"))) {
        configDrift = true
        indicators.push("Config says phase=execution but no phase output exists")
      }
    } catch {
      // skip
    }
  }

  return {
    contextDrift: indicators.length > 0,
    configDrift,
    indicators,
  }
}

// ============================================================================
// MAIN SCAN FUNCTION
// ============================================================================

/**
 * Scan a codebase and produce a complete ScanResult.
 * Pure filesystem analysis — no LLM, no network.
 */
export function scanCodebase(directory: string): ScanResult {
  // Derive project name from directory
  const projectName = basename(directory)

  // Walk filesystem
  const files = walkDirectory(directory)

  // Read package.json if it exists
  const pkg = readPackageJson(directory)

  // Detect everything
  const languages = detectLanguages(files.sourceFiles)
  const stack = detectStack(directory, pkg)
  const packageManager = detectPackageManager(directory)
  const stage = classifyStage(files.sourceFiles.length, files.testFiles.length, files.configFiles.length)
  const framework = detectFramework(directory)
  const conventions = detectConventions(directory, files.configFiles)
  const gaps = analyzeGaps(files, conventions, directory)
  const debt = detectDebt(files, directory)
  const concerns = analyzeConcerns(files, directory)
  const drift = detectDrift(directory)

  const result = createEmptyScanResult(pkg?.name ?? projectName)

  result.project.stage = stage
  result.project.languages = languages
  result.project.stack = stack
  result.project.packageManager = packageManager
  result.project.structure = {
    sourceFiles: files.sourceFiles.length,
    testFiles: files.testFiles.length,
    configFiles: files.configFiles.length,
    docFiles: files.docFiles.length,
    totalFiles: files.allFiles.length,
  }

  result.framework = framework

  result.diagnosis = {
    gaps,
    debt,
    concerns,
    conventions,
    drift,
  }

  return result
}
