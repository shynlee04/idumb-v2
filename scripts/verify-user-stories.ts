#!/usr/bin/env tsx
/**
 * User Stories Verification Script
 *
 * Recursively validates user story JSON files in docs/user-stories/
 * and reports pass/total counts per file.
 *
 * Usage: npx tsx scripts/verify-user-stories.ts
 */

import { readdirSync, readFileSync, statSync, existsSync } from "fs"
import { join, extname, dirname } from "path"
import { fileURLToPath } from "url"

interface Feature {
  description: string
  steps: string[]
  passes: boolean
}

function validateFeature(f: unknown, index: number): string | null {
  if (typeof f !== "object" || f === null) return `[${index}]: not an object`
  const obj = f as Record<string, unknown>
  if (typeof obj.description !== "string" || obj.description.length === 0)
    return `[${index}].description: must be non-empty string`
  if (!Array.isArray(obj.steps) || obj.steps.length === 0)
    return `[${index}].steps: must be non-empty array`
  for (let i = 0; i < obj.steps.length; i++) {
    if (typeof obj.steps[i] !== "string" || (obj.steps[i] as string).length === 0)
      return `[${index}].steps[${i}]: must be non-empty string`
  }
  if (typeof obj.passes !== "boolean")
    return `[${index}].passes: must be boolean`
  return null
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, "..")
const userStoriesDir = join(rootDir, "docs", "user-stories")

let hasErrors = false
let totalPassing = 0
let totalStories = 0

function error(msg: string) {
  console.error(`  FAIL: ${msg}`)
  hasErrors = true
}

function validateDirectory(dir: string, prefix = "") {
  const entries = readdirSync(dir).sort()

  for (const entry of entries) {
    const entryPath = join(dir, entry)
    const stat = statSync(entryPath)

    if (stat.isDirectory()) {
      console.log(`${prefix}${entry}/`)
      validateDirectory(entryPath, prefix + "  ")
      continue
    }

    if (extname(entry) !== ".json") {
      error(`${prefix}${entry} - not a .json file`)
      continue
    }

    try {
      const content = readFileSync(entryPath, "utf-8")
      const json = JSON.parse(content)

      if (!Array.isArray(json) || json.length === 0) {
        error(`${prefix}${entry} - must be non-empty array`)
        continue
      }

      let fileValid = true
      for (let i = 0; i < json.length; i++) {
        const err = validateFeature(json[i], i)
        if (err) {
          error(`${prefix}${entry} - ${err}`)
          fileValid = false
        }
      }

      if (fileValid) {
        const features = json as Feature[]
        const passing = features.filter((f) => f.passes).length
        const total = features.length
        totalPassing += passing
        totalStories += total

        const status = passing === total ? "DONE" : passing > 0 ? "WIP " : "TODO"
        console.log(`  [${status}] ${prefix}${entry} (${passing}/${total} passing)`)

        // Show non-passing stories
        for (const f of features) {
          if (!f.passes) {
            console.log(`         - ${f.description}`)
          }
        }
      }
    } catch (e) {
      if (e instanceof SyntaxError) {
        error(`${prefix}${entry} - invalid JSON: ${e.message}`)
      } else {
        error(`${prefix}${entry} - ${e}`)
      }
    }
  }
}

console.log(`\nUser Stories Status\n${"=".repeat(50)}\n`)

if (!existsSync(userStoriesDir)) {
  console.log("No docs/user-stories directory found\n")
  process.exit(0)
}

validateDirectory(userStoriesDir)
console.log(`\n${"─".repeat(50)}`)
console.log(`Total: ${totalPassing}/${totalStories} stories passing`)
console.log()

if (totalPassing === totalStories && totalStories > 0) {
  console.log("All stories complete!\n")
  process.exit(0)
} else if (hasErrors) {
  console.log("Verification failed\n")
  process.exit(1)
} else {
  console.log(`${totalStories - totalPassing} stories remaining\n`)
  process.exit(0)
}
