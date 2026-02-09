/**
 * Quick smoke test — run the code quality scanner against this project itself.
 * Usage: npx tsx tests/smoke-code-quality.ts
 */
import { scanCodeQuality, formatCodeQualityReport } from "../src/lib/code-quality.js"

const log = {
    info: () => { },
    warn: () => { },
    error: () => { },
    debug: () => { },
}

async function main() {
    console.log("Scanning iDumb v2 codebase for code quality...\n")

    const report = await scanCodeQuality(process.cwd(), log as any)

    console.log(`Grade: ${report.grade} (${report.score}/100)`)
    console.log(`Files: ${report.totalFiles}`)
    console.log(`Lines: ${report.totalLines}`)
    console.log(`Smells: ${report.smells.length}`)
    console.log(`\nStats:`)
    console.log(`  Avg file length: ${report.stats.avgFileLength} lines`)
    console.log(`  Max file: ${report.stats.maxFileName} (${report.stats.maxFileLength} lines)`)
    console.log(`  Files >300 lines: ${report.stats.filesOver300Lines}`)
    console.log(`  Files >500 lines: ${report.stats.filesOver500Lines}`)
    console.log(`  Long functions: ${report.stats.functionsOver50Lines}`)
    console.log(`  Deep nesting: ${report.stats.deepNesting}`)
    console.log(`  TODOs: ${report.stats.todoCount}`)
    console.log(`  Console.logs: ${report.stats.consoleLogCount}`)

    console.log(`\n${"─".repeat(60)}\n`)

    // Print formatted report (savage mode for fun)
    const lines = formatCodeQualityReport(report, true)
    for (const line of lines) {
        console.log(line)
    }

    console.log(`\n${"─".repeat(60)}\n`)

    // Print all smells
    if (report.smells.length > 0) {
        console.log("All smells:")
        for (const smell of report.smells) {
            console.log(`  [${smell.severity}] ${smell.file}${smell.line ? `:${smell.line}` : ""} — ${smell.message}`)
            console.log(`    🔥 ${smell.roast ?? "(no roast)"}`)
        }
    }
}

main().catch(console.error)
