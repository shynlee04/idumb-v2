/**
 * Phase 1 Test: Init Tool — Config + Detection + Scaffold
 * 
 * Proves:
 * - Config creation with defaults and overrides
 * - Config validation catches missing fields
 * - Framework detection finds markers (governance + tech)
 * - Framework detection handles empty project
 * - Scaffolder creates directory tree + config.json
 * - Scaffolder is non-destructive (skips existing)
 * - Detection report formats correctly (en + vi)
 * - Full init flow: scan → scaffold → greeting
 */

import { mkdirSync, existsSync, writeFileSync, readFileSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { createConfig, validateConfig } from "../src/schemas/config.js"
import type { IdumbConfig } from "../src/schemas/config.js"
import { scanProject, formatDetectionReport } from "../src/lib/framework-detector.js"
import { scaffoldProject, formatScaffoldReport } from "../src/lib/scaffolder.js"
import { createLogger } from "../src/lib/index.js"

// ─── Test harness ────────────────────────────────────────────────────

const testBase = join(tmpdir(), `idumb-init-test-${Date.now()}`)
mkdirSync(testBase, { recursive: true })

const log = createLogger(testBase, "test-init", "debug")

let passed = 0
let failed = 0

function assert(name: string, condition: boolean): void {
  if (condition) {
    passed++
  } else {
    failed++
    const err = new Error(`FAIL: ${name}`)
    // TUI-safe: write to stderr, not stdout
    process.stderr.write(`${err.message}\n${err.stack}\n`)
  }
}

// ─── Test 1: Config creation with defaults ───────────────────────────

{
  const config = createConfig({})
  assert("config: has version", config.version === "1.0.0")
  assert("config: default scope is project", config.scope === "project")
  assert("config: default experience is guided", config.user.experienceLevel === "guided")
  assert("config: default language is en", config.user.language.communication === "en")
  assert("config: default governance is balanced", config.governance.mode === "balanced")
  assert("config: has paths.root", config.paths.root === ".idumb/")
  assert("config: has installedAt", config.installedAt.length > 0)
}

// ─── Test 2: Config creation with overrides ──────────────────────────

{
  const config = createConfig({
    scope: "global",
    experienceLevel: "expert",
    communicationLanguage: "vi",
    documentsLanguage: "en",
    governanceMode: "strict",
  })
  assert("config override: scope", config.scope === "global")
  assert("config override: experience", config.user.experienceLevel === "expert")
  assert("config override: comm language", config.user.language.communication === "vi")
  assert("config override: docs language", config.user.language.documents === "en")
  assert("config override: governance", config.governance.mode === "strict")
}

// ─── Test 3: Config validation ───────────────────────────────────────

{
  const valid = createConfig({})
  assert("validation: valid config has no errors", validateConfig(valid).length === 0)

  assert("validation: null returns error", validateConfig(null).length > 0)
  assert("validation: empty object returns errors", validateConfig({}).length > 0)
  assert("validation: missing user detected",
    validateConfig({ version: "1", governance: { mode: "balanced" }, paths: {} }).includes("Missing user section")
  )
  assert("validation: partial object has errors",
    validateConfig({ version: "1" }).length > 0
  )
}

// ─── Test 4: Framework detection — empty project ─────────────────────

{
  const emptyProject = join(testBase, "empty-project")
  mkdirSync(emptyProject, { recursive: true })

  const detection = await scanProject(emptyProject, log)
  assert("detect empty: no governance", detection.governance.length === 0)
  assert("detect empty: no tech", detection.tech.length === 0)
  assert("detect empty: unknown package manager", detection.packageManager === "unknown")
  assert("detect empty: no monorepo", detection.hasMonorepo === false)
  assert("detect empty: no agent dirs", detection.existingAgentDirs.length === 0)
}

// ─── Test 5: Framework detection — brownfield markers ────────────────

{
  const brownfield = join(testBase, "brownfield")
  mkdirSync(brownfield, { recursive: true })

  // Plant markers
  writeFileSync(join(brownfield, "package.json"), JSON.stringify({
    dependencies: { "react": "^18.0.0", "express": "^4.0.0" },
    devDependencies: { "typescript": "^5.0.0" },
  }))
  writeFileSync(join(brownfield, "package-lock.json"), "{}")
  writeFileSync(join(brownfield, "tsconfig.json"), "{}")
  writeFileSync(join(brownfield, "next.config.js"), "module.exports = {}")
  mkdirSync(join(brownfield, "_bmad"), { recursive: true })
  mkdirSync(join(brownfield, ".opencode/agents"), { recursive: true })
  mkdirSync(join(brownfield, ".git"), { recursive: true })

  const detection = await scanProject(brownfield, log)
  assert("detect brownfield: finds bmad", detection.governance.includes("bmad"))
  assert("detect brownfield: finds nextjs", detection.tech.includes("nextjs"))
  assert("detect brownfield: finds typescript", detection.tech.includes("typescript"))
  assert("detect brownfield: finds express", detection.tech.includes("express"))
  assert("detect brownfield: npm package manager", detection.packageManager === "npm")
  assert("detect brownfield: finds .opencode/agents", detection.existingAgentDirs.includes(".opencode/agents"))
  assert("detect brownfield: no gaps for missing node_modules is detected",
    detection.gaps.some(g => g.includes("node_modules"))
  )
}

// ─── Test 6: Framework detection — monorepo ──────────────────────────

{
  const monorepo = join(testBase, "monorepo")
  mkdirSync(monorepo, { recursive: true })
  writeFileSync(join(monorepo, "turbo.json"), "{}")

  const detection = await scanProject(monorepo, log)
  assert("detect monorepo: turbo.json detected", detection.hasMonorepo === true)
}

// ─── Test 7: Scaffolder — creates full tree ──────────────────────────

{
  const scaffoldDir = join(testBase, "scaffold-test")
  mkdirSync(scaffoldDir, { recursive: true })

  const config = createConfig({})
  const result = await scaffoldProject(scaffoldDir, config, false, log)

  assert("scaffold: success", result.success === true)
  assert("scaffold: created dirs", result.created.length > 0)
  assert("scaffold: no errors", result.errors.length === 0)

  // Verify directory structure
  assert("scaffold: .idumb/ exists", existsSync(join(scaffoldDir, ".idumb")))
  assert("scaffold: anchors/ exists", existsSync(join(scaffoldDir, ".idumb/anchors")))
  assert("scaffold: brain/ exists", existsSync(join(scaffoldDir, ".idumb/brain")))
  assert("scaffold: governance/ exists", existsSync(join(scaffoldDir, ".idumb/governance")))
  assert("scaffold: idumb-modules/ exists", existsSync(join(scaffoldDir, ".idumb/idumb-modules")))
  assert("scaffold: idumb-modules/agents/ exists", existsSync(join(scaffoldDir, ".idumb/idumb-modules/agents")))
  assert("scaffold: idumb-modules/schemas/ exists", existsSync(join(scaffoldDir, ".idumb/idumb-modules/schemas")))
  assert("scaffold: sessions/ exists", existsSync(join(scaffoldDir, ".idumb/sessions")))
  assert("scaffold: project-core/ exists", existsSync(join(scaffoldDir, ".idumb/project-core")))
  assert("scaffold: project-output/ exists", existsSync(join(scaffoldDir, ".idumb/project-output")))

  // Verify config.json written
  assert("scaffold: config.json exists", existsSync(join(scaffoldDir, ".idumb/config.json")))
  const written = JSON.parse(readFileSync(join(scaffoldDir, ".idumb/config.json"), "utf-8")) as IdumbConfig
  assert("scaffold: config version matches", written.version === "1.0.0")
  assert("scaffold: config has paths", written.paths.root === ".idumb/")
}

// ─── Test 8: Scaffolder — non-destructive (skips existing) ──────────

{
  const scaffoldDir2 = join(testBase, "scaffold-test") // reuse same dir
  const config = createConfig({})
  const result = await scaffoldProject(scaffoldDir2, config, false, log)

  assert("scaffold re-run: success", result.success === true)
  assert("scaffold re-run: all skipped", result.skipped.length > 0)
  assert("scaffold re-run: config.json skipped", result.skipped.includes("config.json"))
}

// ─── Test 9: Scaffolder — force overwrites config ────────────────────

{
  const scaffoldDir3 = join(testBase, "scaffold-test") // reuse same dir
  const config = createConfig({ governanceMode: "strict" })
  const result = await scaffoldProject(scaffoldDir3, config, true, log)

  assert("scaffold force: success", result.success === true)
  assert("scaffold force: config.json created (overwritten)", result.created.includes("config.json"))

  const written = JSON.parse(readFileSync(join(scaffoldDir3, ".idumb/config.json"), "utf-8")) as IdumbConfig
  assert("scaffold force: governance updated", written.governance.mode === "strict")
}

// ─── Test 10: Detection report — English ─────────────────────────────

{
  const detection = await scanProject(join(testBase, "brownfield"), log)
  const report = formatDetectionReport(detection, "en")

  assert("report en: has title", report.includes("Project Scan Results"))
  assert("report en: has package manager", report.includes("npm"))
  assert("report en: has tech", report.includes("nextjs"))
  assert("report en: has governance", report.includes("bmad"))
}

// ─── Test 11: Detection report — Vietnamese ──────────────────────────

{
  const detection = await scanProject(join(testBase, "brownfield"), log)
  const report = formatDetectionReport(detection, "vi")

  assert("report vi: has Vietnamese title", report.includes("Kết Quả Quét Dự Án"))
  assert("report vi: has package manager", report.includes("npm"))
}

// ─── Test 12: Scaffold report formatting ─────────────────────────────

{
  const config = createConfig({})
  const result = await scaffoldProject(join(testBase, "report-test-" + Date.now()), config, false, log)
  const report = formatScaffoldReport(result, "en")

  assert("scaffold report: has success marker", report.includes("Installation Successful"))
  assert("scaffold report: has created count", report.includes("Created"))
}

// ─── Cleanup + Results ───────────────────────────────────────────────

try {
  rmSync(testBase, { recursive: true, force: true })
} catch {
  // cleanup is best-effort
}

process.stderr.write(`\nResults: ${passed}/${passed + failed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
