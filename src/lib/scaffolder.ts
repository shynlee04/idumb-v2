/**
 * Scaffolder — creates the .idumb/ directory tree and config.json.
 * 
 * Responsible for:
 * 1. Creating directory structure from config.paths
 * 2. Writing config.json atomically
 * 3. Non-destructive: never overwrites existing files without force flag
 * 
 * Consumers: init tool
 */

import { mkdir, writeFile, stat } from "node:fs/promises"
import { join, dirname } from "node:path"
import type { IdumbConfig } from "../schemas/config.js"
import type { Logger } from "./logging.js"

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

/** All directories that must exist under .idumb/ */
const SCAFFOLD_DIRS = [
  "brain",
  "brain/index",
  "modules",
  "modules/agents",
  "modules/schemas",
  "modules/templates",
  "modules/skills",
]

export interface ScaffoldResult {
  success: boolean
  created: string[]
  skipped: string[]
  errors: string[]
  configPath: string
}

/**
 * Scaffold the .idumb/ directory and write config.json.
 * 
 * @param projectDir - root of the user's project
 * @param config - the IdumbConfig to write
 * @param force - if true, overwrite existing config.json
 * @param log - logger
 */
export async function scaffoldProject(
  projectDir: string,
  config: IdumbConfig,
  force: boolean,
  log: Logger,
): Promise<ScaffoldResult> {
  const result: ScaffoldResult = {
    success: false,
    created: [],
    skipped: [],
    errors: [],
    configPath: join(projectDir, config.paths.config),
  }

  const idumbRoot = join(projectDir, ".idumb")

  try {
    // 1. Create directories
    for (const dir of SCAFFOLD_DIRS) {
      const fullPath = join(idumbRoot, dir)
      if (await exists(fullPath)) {
        result.skipped.push(dir)
      } else {
        await mkdir(fullPath, { recursive: true })
        result.created.push(dir)
        log.info(`Created: .idumb/${dir}`)
      }
    }

    // 2. Write config.json
    const configPath = join(projectDir, config.paths.config)
    if (await exists(configPath) && !force) {
      result.skipped.push("config.json")
      log.info("config.json already exists, skipping (use force to overwrite)")
    } else {
      await mkdir(dirname(configPath), { recursive: true })
      await writeFile(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8")
      result.created.push("config.json")
      log.info("Wrote config.json")
    }

    result.success = true
    log.info("Scaffold complete", {
      created: result.created.length,
      skipped: result.skipped.length,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    result.errors.push(msg)
    log.error("Scaffold failed", { error: msg })
  }

  return result
}

/**
 * Format scaffold result as human-readable summary.
 */
export function formatScaffoldReport(result: ScaffoldResult, lang: "en" | "vi" = "en"): string {
  const lines: string[] = []

  if (lang === "vi") {
    if (result.success) {
      lines.push("## ✅ Cài Đặt Thành Công\n")
    } else {
      lines.push("## ❌ Cài Đặt Thất Bại\n")
    }

    if (result.created.length > 0) {
      lines.push(`**Đã tạo:** ${result.created.length} mục`)
      result.created.forEach(c => lines.push(`  + ${c}`))
    }

    if (result.skipped.length > 0) {
      lines.push(`\n**Đã bỏ qua:** ${result.skipped.length} mục (đã tồn tại)`)
    }

    if (result.errors.length > 0) {
      lines.push("\n**Lỗi:**")
      result.errors.forEach(e => lines.push(`  ✗ ${e}`))
    }

    lines.push(`\n**Config:** \`${result.configPath}\``)
  } else {
    if (result.success) {
      lines.push("## ✅ Installation Successful\n")
    } else {
      lines.push("## ❌ Installation Failed\n")
    }

    if (result.created.length > 0) {
      lines.push(`**Created:** ${result.created.length} items`)
      result.created.forEach(c => lines.push(`  + ${c}`))
    }

    if (result.skipped.length > 0) {
      lines.push(`\n**Skipped:** ${result.skipped.length} items (already exist)`)
    }

    if (result.errors.length > 0) {
      lines.push("\n**Errors:**")
      result.errors.forEach(e => lines.push(`  ✗ ${e}`))
    }

    lines.push(`\n**Config:** \`${result.configPath}\``)
  }

  return lines.join("\n")
}
