/**
 * Code Quality Scanner — the actual machinery that reads code and finds bullshit.
 * 
 * This is NOT template prose. This RUNS. It walks the project tree, reads every
 * source file, and produces a graded quality report with specific file callouts.
 * 
 * Detects:
 * - God files (>300 lines, >500 lines)
 * - Spaghetti functions (>50 lines, >100 lines)  
 * - Deep nesting (5+ indent levels)
 * - TODO/FIXME/HACK debt accumulation
 * - console.log in production code
 * - Files with excessive imports (coupling smell)
 * - Missing test companions
 * 
 * Read-only. NEVER writes, modifies, or deletes anything.
 */

import { readFile, readdir, stat } from "node:fs/promises"
import { join, relative, extname, basename } from "node:path"
import type { CodeSmell, CodeQualityReport } from "../schemas/config.js"
import type { Logger } from "./logging.js"

// ─── Configuration ──────────────────────────────────────────────────

/** Source extensions we'll scan */
const SOURCE_EXTENSIONS = new Set([
    ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
    ".py", ".rb", ".go", ".rs", ".java", ".kt",
    ".vue", ".svelte", ".astro",
])

/**
 * Template/component extensions where deep nesting is structurally normal.
 * JSX/TSX: <Provider><Layout><Page><Section><Card><Content>...</Content></Card></Section></Page></Layout></Provider>
 * Vue/Svelte/Astro SFCs: <template> wrapping adds 1-2 levels inherently.
 *
 * These files get relaxed nesting thresholds to avoid false-positive "critical" on every React component.
 */
const TEMPLATE_EXTENSIONS = new Set([
    ".tsx", ".jsx", ".vue", ".svelte", ".astro",
])

/** Directories to skip — don't waste time in node_modules */
const SKIP_DIRS = new Set([
    "node_modules", ".git", ".idumb", ".opencode", ".claude", ".next",
    "dist", "build", "out", ".output", "coverage", ".nyc_output",
    "__pycache__", ".pytest_cache", "target", "vendor", ".turbo",
    ".vercel", ".netlify", ".cache",
])

/** Test file patterns */
const TEST_PATTERNS = [
    /\.test\.[jt]sx?$/,
    /\.spec\.[jt]sx?$/,
    /\.tests?\.[jt]sx?$/,
    /__tests__\//,
    /\/tests?\//,
]

// ─── Roast Library ──────────────────────────────────────────────────

const ROASTS = {
    godFile: [
        "This file has its own gravitational field.",
        "Is this a file or a novella? Pick one.",
        "One file to rule them all, one file to bind them.",
        "This file is older than some frameworks.",
        "I've seen shorter terms of service.",
    ],
    megaFile: [
        "This isn't a file, it's a whole application.",
        "Were you trying to break a world record?",
        "This file needs its own CI pipeline.",
        "I'm going to need a coffee break just to read this.",
    ],
    longFunction: [
        "This function has more lines than a DMV queue.",
        "Single responsibility? Never heard of her apparently.",
        "I've seen shorter short stories.",
        "This function is doing the work of 5 functions and none of them well.",
        "Bruh. This is a function, not a screenplay.",
    ],
    superLongFunction: [
        "100+ lines? This isn't a function, it's a lifestyle choice.",
        "I'm calling the police. This is function abuse.",
        "This function has more acts than a Shakespeare play.",
    ],
    deepNesting: [
        "The Mariana Trench called — it wants its depth back.",
        "5+ indent levels. Do you also enjoy mazes?",
        "I can hear the indentation screaming for help.",
        "This code has more layers than an onion and makes me cry just as much.",
    ],
    todoDebt: [
        "A 'TODO' is a promise you made to yourself and broke.",
        "TODO: actually finish this project.",
        "The number of TODOs here is itself a TODO.",
        "Your TODOs have TODOs.",
    ],
    consoleLog: [
        "console.log? In production? In 2026?",
        "Debug logging left behind like emotional baggage.",
        "console.log is not an observability strategy.",
        "Who needs proper logging when you have console.log? ...said no senior dev ever.",
    ],
    coupling: [
        "This file imports half the codebase. It knows too much.",
        "This file has attachment issues — it can't let go of its dependencies.",
        "Separation of concerns? More like separation anxiety.",
    ],
    noTests: [
        "No test file companion. How brave.",
        "Tests? Where we're going, we don't need tests. ...said everyone before the outage.",
        "Untested code is just a theory with delusions of grandeur.",
    ],
}

function randomRoast(category: keyof typeof ROASTS): string {
    const options = ROASTS[category]
    return options[Math.floor(Math.random() * options.length)]
}

// ─── File Walker ────────────────────────────────────────────────────

interface FileInfo {
    path: string       // absolute path
    relative: string   // relative to project root
    lines: string[]    // file content split by line
    lineCount: number
    extension: string
}

async function walkSourceFiles(
    dir: string,
    projectDir: string,
    maxFiles: number = 500,
): Promise<FileInfo[]> {
    const files: FileInfo[] = []

    async function walk(currentDir: string, depth: number): Promise<void> {
        if (depth > 10 || files.length >= maxFiles) return

        let entries
        try {
            entries = await readdir(currentDir, { withFileTypes: true })
        } catch {
            return
        }

        for (const entry of entries) {
            if (files.length >= maxFiles) break

            if (entry.isDirectory()) {
                if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith(".")) {
                    await walk(join(currentDir, entry.name), depth + 1)
                }
                continue
            }

            if (!entry.isFile()) continue

            const ext = extname(entry.name)
            if (!SOURCE_EXTENSIONS.has(ext)) continue

            const filePath = join(currentDir, entry.name)
            const relPath = relative(projectDir, filePath)

            try {
                // Safety: skip files > 1MB
                const fileStat = await stat(filePath)
                if (fileStat.size > 1_000_000) continue

                const content = await readFile(filePath, "utf-8")
                const lines = content.split("\n")

                files.push({
                    path: filePath,
                    relative: relPath,
                    lines,
                    lineCount: lines.length,
                    extension: ext,
                })
            } catch {
                // skip unreadable files
            }
        }
    }

    await walk(dir, 0)
    return files
}

// ─── Analysis Functions ─────────────────────────────────────────────

function isTestFile(relativePath: string): boolean {
    return TEST_PATTERNS.some(p => p.test(relativePath))
}

function detectLongFunctions(file: FileInfo): CodeSmell[] {
    const smells: CodeSmell[] = []
    const functionPatterns = [
        /^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)/,
        /^\s*(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(/,
        /^\s*(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*(?:=>|:\s*\w+\s*=>)/,
        /^\s*(?:public|private|protected|static|async)\s+(\w+)\s*\(/,
        /^\s*(\w+)\s*\([^)]*\)\s*{/,
    ]

    let functionStart: number | null = null
    let functionName: string = ""
    let braceDepth = 0
    let inFunction = false

    for (let i = 0; i < file.lines.length; i++) {
        const line = file.lines[i]

        if (!inFunction) {
            for (const pattern of functionPatterns) {
                const match = line.match(pattern)
                if (match) {
                    functionStart = i + 1 // 1-indexed
                    functionName = match[1] || "anonymous"
                    braceDepth = 0
                    inFunction = true
                    break
                }
            }
        }

        if (inFunction) {
            for (const ch of line) {
                if (ch === "{") braceDepth++
                if (ch === "}") braceDepth--
            }

            if (braceDepth <= 0 && functionStart !== null) {
                const length = (i + 1) - functionStart + 1

                if (length > 100) {
                    smells.push({
                        file: file.relative,
                        line: functionStart,
                        severity: "critical",
                        category: "spaghetti",
                        message: `Function '${functionName}' is ${length} lines long`,
                        roast: randomRoast("superLongFunction"),
                    })
                } else if (length > 50) {
                    smells.push({
                        file: file.relative,
                        line: functionStart,
                        severity: "warning",
                        category: "spaghetti",
                        message: `Function '${functionName}' is ${length} lines long`,
                        roast: randomRoast("longFunction"),
                    })
                }

                inFunction = false
                functionStart = null
            }
        }
    }

    return smells
}

function detectDeepNesting(file: FileInfo): CodeSmell[] {
    const smells: CodeSmell[] = []
    let maxIndent = 0
    let maxIndentLine = 0

    for (let i = 0; i < file.lines.length; i++) {
        const line = file.lines[i]
        if (line.trim() === "") continue

        // Count leading indent (spaces or tabs)
        const match = line.match(/^(\s+)/)
        if (match) {
            const indentChars = match[1]
            // Normalize: tab = 1 level, 2 spaces = 1 level
            const level = indentChars.includes("\t")
                ? indentChars.split("\t").length - 1
                : Math.floor(indentChars.length / 2)

            if (level > maxIndent) {
                maxIndent = level
                maxIndentLine = i + 1
            }
        }
    }

    // JSX/template files have structurally deep nesting:
    //   <Provider><Layout><Page><Card><Content>... = 5+ levels before any logic
    // Imperative files (ts, py, go) reaching 5+ levels is genuinely suspicious.
    const isTemplate = TEMPLATE_EXTENSIONS.has(file.extension)
    const criticalThreshold = isTemplate ? 11 : 7
    const warningThreshold = isTemplate ? 8 : 5

    if (maxIndent >= criticalThreshold) {
        smells.push({
            file: file.relative,
            line: maxIndentLine,
            severity: "critical",
            category: "spaghetti",
            message: `Nesting depth reaches ${maxIndent} levels${isTemplate ? " (template file — threshold raised)" : ""}`,
            roast: randomRoast("deepNesting"),
        })
    } else if (maxIndent >= warningThreshold) {
        smells.push({
            file: file.relative,
            line: maxIndentLine,
            severity: "warning",
            category: "spaghetti",
            message: `Nesting depth reaches ${maxIndent} levels${isTemplate ? " (template file — threshold raised)" : ""}`,
            roast: randomRoast("deepNesting"),
        })
    }

    return smells
}

function detectTodoDebt(file: FileInfo): { count: number; smells: CodeSmell[] } {
    const todoPattern = /\b(TODO|FIXME|HACK|XXX|WORKAROUND)\b/i
    let count = 0
    const smells: CodeSmell[] = []

    for (let i = 0; i < file.lines.length; i++) {
        if (todoPattern.test(file.lines[i])) {
            count++
        }
    }

    if (count >= 5) {
        smells.push({
            file: file.relative,
            severity: "warning",
            category: "todo-debt",
            message: `${count} TODO/FIXME/HACK markers — unresolved debt`,
            roast: randomRoast("todoDebt"),
        })
    }

    return { count, smells }
}

function detectConsoleLogs(file: FileInfo): { count: number; smells: CodeSmell[] } {
    if (isTestFile(file.relative)) return { count: 0, smells: [] }

    const pattern = /console\.(log|debug|info|warn|error)\s*\(/
    let count = 0
    let firstLine = 0

    for (let i = 0; i < file.lines.length; i++) {
        if (pattern.test(file.lines[i])) {
            count++
            if (firstLine === 0) firstLine = i + 1
        }
    }

    const smells: CodeSmell[] = []
    if (count >= 3) {
        smells.push({
            file: file.relative,
            line: firstLine,
            severity: "info",
            category: "dead-code",
            message: `${count} console.log/debug/warn calls in production file`,
            roast: randomRoast("consoleLog"),
        })
    }

    return { count, smells }
}

function detectCoupling(file: FileInfo): CodeSmell[] {
    const smells: CodeSmell[] = []
    const importPattern = /^\s*import\s+/
    let importCount = 0

    for (const line of file.lines) {
        if (importPattern.test(line)) importCount++
    }

    if (importCount >= 15) {
        smells.push({
            file: file.relative,
            line: 1,
            severity: "warning",
            category: "coupling",
            message: `${importCount} imports — high coupling, this file depends on everything`,
            roast: randomRoast("coupling"),
        })
    }

    return smells
}

function detectMissingTests(files: FileInfo[]): CodeSmell[] {
    const smells: CodeSmell[] = []
    const sourceFiles = files.filter(f => !isTestFile(f.relative) && f.lineCount > 50)
    const testFiles = files.filter(f => isTestFile(f.relative))

    // Build set of tested modules
    const testedModules = new Set<string>()
    for (const tf of testFiles) {
        const name = basename(tf.relative)
            .replace(/\.(test|spec|tests)\.[jt]sx?$/, "")
            .replace(/\.[jt]sx?$/, "")
        testedModules.add(name)
    }

    for (const sf of sourceFiles) {
        const name = basename(sf.relative).replace(/\.[jt]sx?$/, "")
        if (!testedModules.has(name) && sf.lineCount > 100) {
            smells.push({
                file: sf.relative,
                severity: "warning",
                category: "missing-tests",
                message: `${sf.lineCount}-line file with no test companion`,
                roast: randomRoast("noTests"),
            })
        }
    }

    return smells
}

// ─── Grade Calculator ───────────────────────────────────────────────

function calculateGrade(smells: CodeSmell[], totalFiles: number): { grade: CodeQualityReport["grade"]; score: number } {
    let score = 100

    for (const smell of smells) {
        switch (smell.severity) {
            case "critical": score -= 8; break
            case "warning": score -= 3; break
            case "info": score -= 1; break
        }
    }

    // Bonus/penalty based on density
    const smellDensity = smells.length / Math.max(totalFiles, 1)
    if (smellDensity > 0.5) score -= 10
    if (smellDensity > 1.0) score -= 15

    score = Math.max(0, Math.min(100, score))

    const grade: CodeQualityReport["grade"] =
        score >= 90 ? "A" :
            score >= 75 ? "B" :
                score >= 60 ? "C" :
                    score >= 40 ? "D" : "F"

    return { grade, score }
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Run a full code quality scan on the project.
 * Read-only. Never writes anything.
 * 
 * Walks all source files (up to 500), analyzes each for:
 * - File length (god files, mega files)
 * - Function length (spaghetti detection)
 * - Nesting depth
 * - TODO/FIXME debt
 * - console.log in production
 * - Import coupling
 * - Missing test companions
 * 
 * Returns a graded report with specific file callouts.
 */
export async function scanCodeQuality(
    projectDir: string,
    log: Logger,
): Promise<CodeQualityReport> {
    log.info("Starting code quality scan", { projectDir })

    const files = await walkSourceFiles(projectDir, projectDir)
    const smells: CodeSmell[] = []
    let totalLines = 0
    let maxFileLength = 0
    let maxFileName = ""
    let filesOver300 = 0
    let filesOver500 = 0
    let totalFunctionSmells = 0
    let totalTodos = 0
    let totalConsoleLogs = 0
    let deepNestingCount = 0

    for (const file of files) {
        totalLines += file.lineCount

        // Track max file
        if (file.lineCount > maxFileLength) {
            maxFileLength = file.lineCount
            maxFileName = file.relative
        }

        // God file detection
        if (file.lineCount > 500) {
            filesOver500++
            filesOver300++
            smells.push({
                file: file.relative,
                severity: "critical",
                category: "god-file",
                message: `${file.lineCount} lines — mega file, split this up`,
                roast: randomRoast("megaFile"),
            })
        } else if (file.lineCount > 300) {
            filesOver300++
            smells.push({
                file: file.relative,
                severity: "warning",
                category: "god-file",
                message: `${file.lineCount} lines — getting chunky, consider splitting`,
                roast: randomRoast("godFile"),
            })
        }

        // Long function detection
        const funcSmells = detectLongFunctions(file)
        totalFunctionSmells += funcSmells.length
        smells.push(...funcSmells)

        // Deep nesting
        const nestSmells = detectDeepNesting(file)
        deepNestingCount += nestSmells.length
        smells.push(...nestSmells)

        // TODO debt
        const { count: todoCount, smells: todoSmells } = detectTodoDebt(file)
        totalTodos += todoCount
        smells.push(...todoSmells)

        // Console.log
        const { count: logCount, smells: logSmells } = detectConsoleLogs(file)
        totalConsoleLogs += logCount
        smells.push(...logSmells)

        // Coupling
        smells.push(...detectCoupling(file))
    }

    // Missing tests (cross-file analysis)
    smells.push(...detectMissingTests(files))

    // Calculate grade
    const { grade, score } = calculateGrade(smells, files.length)
    const avgFileLength = files.length > 0 ? Math.round(totalLines / files.length) : 0

    const report: CodeQualityReport = {
        grade,
        score,
        totalFiles: files.length,
        totalLines,
        smells,
        stats: {
            avgFileLength,
            maxFileLength,
            maxFileName,
            filesOver300Lines: filesOver300,
            filesOver500Lines: filesOver500,
            functionsOver50Lines: totalFunctionSmells,
            todoCount: totalTodos,
            consoleLogCount: totalConsoleLogs,
            deepNesting: deepNestingCount,
        },
    }

    log.info("Code quality scan complete", {
        grade,
        score,
        files: files.length,
        lines: totalLines,
        smells: smells.length,
    })

    return report
}

/**
 * Format the code quality report for CLI display.
 * Returns ANSI-colored terminal output.
 */
export function formatCodeQualityReport(
    report: CodeQualityReport,
    isSavage: boolean = false,
): string[] {
    const C = {
        reset: "\x1b[0m",
        bold: "\x1b[1m",
        dim: "\x1b[2m",
        italic: "\x1b[3m",
        green: "\x1b[32m",
        yellow: "\x1b[33m",
        red: "\x1b[31m",
        cyan: "\x1b[36m",
        magenta: "\x1b[35m",
        bgRed: "\x1b[41m",
        bgGreen: "\x1b[42m",
        bgYellow: "\x1b[43m",
        bgMagenta: "\x1b[45m",
        white: "\x1b[37m",
    }

    const lines: string[] = []
    const gradeColor = report.grade === "A" ? C.green
        : report.grade === "B" ? C.cyan
            : report.grade === "C" ? C.yellow
                : C.red

    const bar10 = (value: number, max: number) => {
        const filled = Math.round((value / max) * 10)
        return "█".repeat(Math.min(filled, 10)) + "░".repeat(Math.max(10 - filled, 0))
    }

    // Header
    lines.push("")
    lines.push(`  ${C.bold}┌──────────────────────────────────────────────────────┐${C.reset}`)
    lines.push(`  ${C.bold}│${C.reset}  ${gradeColor}${C.bold}CODE QUALITY: ${report.grade}${C.reset}  ${gradeColor}${bar10(report.score, 100)}${C.reset}  score: ${report.score}/100  ${C.bold}│${C.reset}`)
    lines.push(`  ${C.bold}└──────────────────────────────────────────────────────┘${C.reset}`)

    if (isSavage && report.grade === "F") {
        lines.push(`  ${C.magenta}${C.italic}  "I've seen cleaner dumpster fires." — iDumb${C.reset}`)
    } else if (isSavage && report.grade === "D") {
        lines.push(`  ${C.magenta}${C.italic}  "Below average and proud of it, apparently." — iDumb${C.reset}`)
    } else if (isSavage && report.grade === "A") {
        lines.push(`  ${C.magenta}${C.italic}  "Clean code? Suspicious. What are you hiding?" — iDumb${C.reset}`)
    }

    // Stats dashboard
    lines.push("")
    lines.push(`  ${C.bold}📊 Stats${C.reset}`)
    lines.push(`  ${C.cyan}▐${C.reset} Files scanned      ${C.bold}${report.totalFiles}${C.reset}`)
    lines.push(`  ${C.cyan}▐${C.reset} Total lines        ${C.bold}${report.totalLines.toLocaleString()}${C.reset}`)
    lines.push(`  ${C.cyan}▐${C.reset} Avg file length    ${C.bold}${report.stats.avgFileLength}${C.reset} lines`)
    lines.push(`  ${C.cyan}▐${C.reset} Biggest file       ${C.bold}${report.stats.maxFileName}${C.reset} ${C.dim}(${report.stats.maxFileLength} lines)${C.reset}`)

    // Issue breakdown
    if (report.stats.filesOver300Lines > 0 || report.stats.filesOver500Lines > 0 ||
        report.stats.functionsOver50Lines > 0 || report.stats.todoCount > 0 ||
        report.stats.consoleLogCount > 0 || report.stats.deepNesting > 0) {
        lines.push("")
        lines.push(`  ${C.bold}🔎 Issue Breakdown${C.reset}`)

        if (report.stats.filesOver500Lines > 0) {
            const color = C.red
            lines.push(`  ${color}▐${C.reset} Mega files (>500L)          ${color}${C.bold}${report.stats.filesOver500Lines}${C.reset}`)
        }
        if (report.stats.filesOver300Lines > 0) {
            const color = report.stats.filesOver300Lines > 3 ? C.red : C.yellow
            lines.push(`  ${color}▐${C.reset} God files (>300L)           ${color}${C.bold}${report.stats.filesOver300Lines}${C.reset}`)
        }
        if (report.stats.functionsOver50Lines > 0) {
            const color = report.stats.functionsOver50Lines > 5 ? C.red : C.yellow
            lines.push(`  ${color}▐${C.reset} Spaghetti functions (>50L)  ${color}${C.bold}${report.stats.functionsOver50Lines}${C.reset}`)
        }
        if (report.stats.deepNesting > 0) {
            lines.push(`  ${C.yellow}▐${C.reset} Deep nesting (5+ levels)    ${C.yellow}${C.bold}${report.stats.deepNesting}${C.reset}`)
        }
        if (report.stats.todoCount > 0) {
            lines.push(`  ${C.yellow}▐${C.reset} TODO/FIXME/HACK markers     ${C.yellow}${C.bold}${report.stats.todoCount}${C.reset}`)
        }
        if (report.stats.consoleLogCount > 0) {
            lines.push(`  ${C.dim}▐${C.reset} console.log in production   ${C.dim}${C.bold}${report.stats.consoleLogCount}${C.reset}`)
        }
    }

    // Top smells with roasts
    const criticals = report.smells.filter(s => s.severity === "critical")
    const warnings = report.smells.filter(s => s.severity === "warning")
    const topSmells = [...criticals, ...warnings].slice(0, 8) // cap at 8

    if (topSmells.length > 0) {
        lines.push("")
        if (isSavage) {
            lines.push(`  ${C.red}${C.bold}🔥 Code Roast — Top ${topSmells.length} Callouts${C.reset}`)
        } else {
            lines.push(`  ${C.bold}⚠️  Top ${topSmells.length} Issues${C.reset}`)
        }

        for (const smell of topSmells) {
            const icon = smell.severity === "critical" ? `${C.red}✘${C.reset}` : `${C.yellow}●${C.reset}`
            const lineRef = smell.line ? `:${smell.line}` : ""
            lines.push(`    ${icon} ${C.dim}${smell.file}${lineRef}${C.reset}`)
            lines.push(`      ${smell.message}`)
            if (isSavage && smell.roast) {
                lines.push(`      ${C.magenta}${C.italic}${smell.roast}${C.reset}`)
            }
        }
    }

    // Summary
    const totalSmells = report.smells.length
    lines.push("")
    if (totalSmells === 0) {
        if (isSavage) {
            lines.push(`  ${C.green}${C.bold}✓ Zero code smells.${C.reset} ${C.magenta}${C.italic}"Either this is perfect or my scanner is broken. Placing bets." — iDumb${C.reset}`)
        } else {
            lines.push(`  ${C.green}${C.bold}✓ No code quality issues detected. Clean codebase.${C.reset}`)
        }
    } else {
        if (isSavage) {
            lines.push(`  ${C.magenta}${C.italic}  "${totalSmells} smell${totalSmells > 1 ? "s" : ""} found. ${totalSmells > 10 ? "This project needs therapy." :
                totalSmells > 5 ? "We have work to do." :
                    "Not terrible. I've seen worse. Barely."
                }" — iDumb${C.reset}`)
        } else {
            lines.push(`  ${C.dim}Total: ${totalSmells} issue(s) across ${report.totalFiles} files${C.reset}`)
        }
    }

    return lines
}
