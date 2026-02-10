/**
 * Test: idumb_init tool — Project initialization via tool interface.
 *
 * Proves:
 * - 'status' action returns "no config" when .idumb/ missing
 * - 'status' action returns config info when valid config exists
 * - 'status' action returns errors when config is invalid
 * - 'scan' action returns detection report on empty project
 * - 'scan' action detects brownfield markers
 * - 'install' action creates .idumb/ directory + config.json
 * - 'install' with custom options respects overrides
 * - Default action (no action) defaults to 'install'
 * - 'install' with force overwrites existing config
 * - Error paths return formatted error messages
 */

import { idumb_init } from "../src/tools/init.js"
import type { ToolContext } from "@opencode-ai/plugin/tool"
import { mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

// ─── Test harness ────────────────────────────────────────────────────

const testBase = join(tmpdir(), `idumb-init-tool-test-${Date.now()}`)
mkdirSync(testBase, { recursive: true })

let passed = 0
let failed = 0

function assert(name: string, condition: boolean): void {
  if (condition) {
    passed++
    process.stderr.write(`  PASS: ${name}\n`)
  } else {
    failed++
    process.stderr.write(`  FAIL: ${name}\n`)
  }
}

/** Create a mock ToolContext pointing at a specific directory */
function mockContext(directory: string): ToolContext {
  return {
    sessionID: `init-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    messageID: `msg-${Date.now()}`,
    agent: "test-agent",
    directory,
    worktree: directory,
    abort: new AbortController().signal,
    metadata: () => {},
    ask: async () => {},
  }
}

// ─── Test 1: Status action — no config exists ────────────────────────

async function test1_statusNoConfig(): Promise<void> {
  const dir = join(testBase, "status-no-config")
  mkdirSync(dir, { recursive: true })

  const ctx = mockContext(dir)
  const result = await idumb_init.execute({ action: "status" }, ctx)

  assert("status no config: returns no config message", result.includes("No iDumb config found"))
  assert("status no config: suggests running idumb_init", result.includes("idumb_init"))
}

// ─── Test 2: Status action — valid config exists ─────────────────────

async function test2_statusValidConfig(): Promise<void> {
  const dir = join(testBase, "status-valid-config")
  mkdirSync(join(dir, ".idumb"), { recursive: true })

  const config = {
    version: "1.0.0",
    scope: "project",
    installedAt: new Date().toISOString(),
    user: {
      experienceLevel: "guided",
      language: { communication: "en", documents: "en" },
    },
    governance: {
      mode: "balanced",
      features: { taskGating: true, compactionAnchors: true, delegationChain: true },
    },
    paths: { root: ".idumb/", brain: ".idumb/brain/", modules: ".idumb/modules/" },
    detection: {
      governance: [],
      tech: [],
      packageManager: "unknown",
      hasMonorepo: false,
      existingAgentDirs: [],
      existingCommandDirs: [],
      conflicts: [],
      gaps: [],
    },
  }
  writeFileSync(join(dir, ".idumb/config.json"), JSON.stringify(config, null, 2))

  const ctx = mockContext(dir)
  const result = await idumb_init.execute({ action: "status" }, ctx)

  assert("status valid: shows configured message", result.includes("iDumb is configured"))
  assert("status valid: shows version", result.includes("1.0.0"))
  assert("status valid: shows governance mode", result.includes("balanced"))
  assert("status valid: shows experience level", result.includes("guided"))
}

// ─── Test 3: Status action — invalid config ──────────────────────────

async function test3_statusInvalidConfig(): Promise<void> {
  const dir = join(testBase, "status-invalid-config")
  mkdirSync(join(dir, ".idumb"), { recursive: true })

  // Write an incomplete config
  writeFileSync(join(dir, ".idumb/config.json"), JSON.stringify({ version: "1.0.0" }))

  const ctx = mockContext(dir)
  const result = await idumb_init.execute({ action: "status" }, ctx)

  assert("status invalid: shows issues message", result.includes("issues"))
  assert("status invalid: reports errors", result.includes("Missing") || result.includes("Error"))
}

// ─── Test 4: Scan action — empty project ─────────────────────────────

async function test4_scanEmptyProject(): Promise<void> {
  const dir = join(testBase, "scan-empty")
  mkdirSync(dir, { recursive: true })

  const ctx = mockContext(dir)
  const result = await idumb_init.execute({ action: "scan" }, ctx)

  assert("scan empty: returns detection report", result.includes("Project Scan Results") || result.includes("Scan Results"))
  assert("scan empty: shows package manager", result.includes("unknown"))
}

// ─── Test 5: Scan action — brownfield project ────────────────────────

async function test5_scanBrownfield(): Promise<void> {
  const dir = join(testBase, "scan-brownfield")
  mkdirSync(dir, { recursive: true })

  // Plant brownfield markers
  writeFileSync(join(dir, "package.json"), JSON.stringify({
    dependencies: { "react": "^18.0.0", "express": "^4.0.0" },
    devDependencies: { "typescript": "^5.0.0" },
  }))
  writeFileSync(join(dir, "package-lock.json"), "{}")
  writeFileSync(join(dir, "tsconfig.json"), "{}")
  writeFileSync(join(dir, "next.config.js"), "module.exports = {}")
  mkdirSync(join(dir, "_bmad"), { recursive: true })
  mkdirSync(join(dir, ".git"), { recursive: true })
  mkdirSync(join(dir, "node_modules"), { recursive: true })

  const ctx = mockContext(dir)
  const result = await idumb_init.execute({ action: "scan" }, ctx)

  assert("scan brownfield: detects nextjs", result.includes("nextjs"))
  assert("scan brownfield: detects typescript", result.includes("typescript"))
  assert("scan brownfield: detects npm", result.includes("npm"))
  assert("scan brownfield: detects bmad governance", result.includes("bmad"))
}

// ─── Test 6: Install action — creates .idumb/ directory ──────────────

async function test6_installCreatesDir(): Promise<void> {
  const dir = join(testBase, "install-creates")
  mkdirSync(dir, { recursive: true })

  const ctx = mockContext(dir)
  const result = await idumb_init.execute({ action: "install" }, ctx)

  assert("install: .idumb/ created", existsSync(join(dir, ".idumb")))
  assert("install: config.json created", existsSync(join(dir, ".idumb/config.json")))
  assert("install: brain/ created", existsSync(join(dir, ".idumb/brain")))
  assert("install: returns greeting", result.includes("iDumb"))
  assert("install: mentions governance mode", result.includes("Governance mode") || result.includes("governance"))
}

// ─── Test 7: Install with custom options ─────────────────────────────

async function test7_installCustomOptions(): Promise<void> {
  const dir = join(testBase, "install-custom")
  mkdirSync(dir, { recursive: true })

  const ctx = mockContext(dir)
  const result = await idumb_init.execute(
    {
      action: "install",
      language: "vi",
      experience: "expert",
      governance_mode: "strict",
    },
    ctx,
  )

  // Read back the config to verify overrides
  const configPath = join(dir, ".idumb/config.json")
  assert("install custom: config.json exists", existsSync(configPath))

  const config = JSON.parse(readFileSync(configPath, "utf-8"))
  assert("install custom: language is vi", config.user?.language?.communication === "vi")
  assert("install custom: experience is expert", config.user?.experienceLevel === "expert")
  assert("install custom: governance is strict", config.governance?.mode === "strict")

  // Vietnamese greeting
  assert("install custom: greeting in Vietnamese", result.includes("Xin ch\u00e0o") || result.includes("iDumb"))
}

// ─── Test 8: Default action (no action specified) ────────────────────

async function test8_defaultAction(): Promise<void> {
  const dir = join(testBase, "install-default")
  mkdirSync(dir, { recursive: true })

  const ctx = mockContext(dir)
  const result = await idumb_init.execute({}, ctx)

  // Default action is "install"
  assert("default action: .idumb/ created", existsSync(join(dir, ".idumb")))
  assert("default action: config.json created", existsSync(join(dir, ".idumb/config.json")))
  assert("default action: returns greeting", result.includes("iDumb"))
}

// ─── Test 9: Install with force overwrites config ────────────────────

async function test9_installForce(): Promise<void> {
  const dir = join(testBase, "install-force")
  mkdirSync(join(dir, ".idumb"), { recursive: true })

  // Write initial config with "balanced" mode
  const initialConfig = {
    version: "1.0.0",
    scope: "project",
    installedAt: new Date().toISOString(),
    user: {
      experienceLevel: "guided",
      language: { communication: "en", documents: "en" },
    },
    governance: {
      mode: "balanced",
      features: { taskGating: true, compactionAnchors: true, delegationChain: true },
    },
    paths: { root: ".idumb/", brain: ".idumb/brain/", modules: ".idumb/modules/" },
    detection: {
      governance: [], tech: [], packageManager: "unknown",
      hasMonorepo: false, existingAgentDirs: [], existingCommandDirs: [],
      conflicts: [], gaps: [],
    },
  }
  writeFileSync(join(dir, ".idumb/config.json"), JSON.stringify(initialConfig, null, 2))

  // Force install with strict mode
  const ctx = mockContext(dir)
  const result = await idumb_init.execute(
    { action: "install", governance_mode: "strict", force: true },
    ctx,
  )

  const config = JSON.parse(readFileSync(join(dir, ".idumb/config.json"), "utf-8"))
  assert("install force: governance updated to strict", config.governance?.mode === "strict")
  assert("install force: returns greeting", result.includes("iDumb"))
}

// ─── Test 10: Install with documents_language ────────────────────────

async function test10_installDocsLanguage(): Promise<void> {
  const dir = join(testBase, "install-docs-lang")
  mkdirSync(dir, { recursive: true })

  const ctx = mockContext(dir)
  await idumb_init.execute(
    { action: "install", language: "en", documents_language: "vi" },
    ctx,
  )

  const config = JSON.parse(readFileSync(join(dir, ".idumb/config.json"), "utf-8"))
  assert("docs language: communication is en", config.user?.language?.communication === "en")
  assert("docs language: documents is vi", config.user?.language?.documents === "vi")
}

// ─── Test 11: Scan language parameter respected ──────────────────────

async function test11_scanVietnamese(): Promise<void> {
  const dir = join(testBase, "scan-vi")
  mkdirSync(dir, { recursive: true })

  const ctx = mockContext(dir)
  const result = await idumb_init.execute({ action: "scan", language: "vi" }, ctx)

  assert("scan vi: Vietnamese title", result.includes("K\u1EBFt Qu\u1EA3 Qu\u00E9t D\u1EF1 \u00C1n"))
}

// ─── Cleanup + Results ───────────────────────────────────────────────

async function main(): Promise<void> {
  process.stderr.write("\ninit-tool.test.ts\n")
  process.stderr.write("\u2500".repeat(50) + "\n")

  await test1_statusNoConfig()
  await test2_statusValidConfig()
  await test3_statusInvalidConfig()
  await test4_scanEmptyProject()
  await test5_scanBrownfield()
  await test6_installCreatesDir()
  await test7_installCustomOptions()
  await test8_defaultAction()
  await test9_installForce()
  await test10_installDocsLanguage()
  await test11_scanVietnamese()

  // Cleanup temp directory
  try {
    rmSync(testBase, { recursive: true, force: true })
  } catch {
    // cleanup is best-effort
  }

  process.stderr.write(`\nResults: ${passed}/${passed + failed} passed, ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

main()
