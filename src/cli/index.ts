#!/usr/bin/env node

/**
 * iDumb CLI
 * 
 * Minimal CLI for testing iDumb operations without OpenCode running.
 * Zero external dependencies — uses process.argv directly.
 * 
 * Usage:
 *   npx idumb init [--global] [--path <dir>]
 *   npx idumb status [--path <dir>]
 *   npx idumb anchors [--path <dir>]
 *   npx idumb help
 * 
 * Console output is fine here (TUI-safety only applies in OpenCode plugin context).
 */

import { resolve } from "path"
import { runInit } from "./commands/init.js"
import { runStatus } from "./commands/status.js"
import { runAnchors } from "./commands/anchors.js"

// ============================================================================
// ARGUMENT PARSING
// ============================================================================

interface ParsedArgs {
  command: string
  flags: Record<string, string | boolean>
}

function parseArgs(argv: string[]): ParsedArgs {
  // Skip node + script path
  const args = argv.slice(2)
  const command = args[0] ?? "help"
  const flags: Record<string, string | boolean> = {}

  for (let i = 1; i < args.length; i++) {
    const arg = args[i]
    if (arg.startsWith("--")) {
      const key = arg.slice(2)
      const next = args[i + 1]
      if (next && !next.startsWith("--")) {
        flags[key] = next
        i++ // Skip the value
      } else {
        flags[key] = true
      }
    }
  }

  return { command, flags }
}

// ============================================================================
// HELP
// ============================================================================

function printHelp(): void {
  const help = `
iDumb v2 — Intelligent Delegation Using Managed Boundaries

USAGE:
  idumb <command> [options]

COMMANDS:
  init       Initialize .idumb/ directory and scan codebase
  status     Show current governance state
  anchors    List active context anchors
  help       Show this help message

OPTIONS:
  --path <dir>   Target directory (default: current directory)
  --global       Use global mode (~/.config/opencode/.idumb/)
  --force        Re-initialize even if .idumb/ already exists

EXAMPLES:
  idumb init                    # Initialize in current project
  idumb init --global           # Initialize globally
  idumb init --path /my/project # Initialize at specific path
  idumb status                  # Show governance state
  idumb anchors                 # List active anchors
`
  process.stdout.write(help.trim() + "\n")
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  const { command, flags } = parseArgs(process.argv)

  // Resolve target directory
  const targetDir = typeof flags.path === "string"
    ? resolve(flags.path)
    : process.cwd()

  const isGlobal = flags.global === true
  const isForce = flags.force === true

  try {
    switch (command) {
      case "init":
        await runInit(targetDir, { global: isGlobal, force: isForce })
        break
      case "status":
        await runStatus(targetDir, { global: isGlobal })
        break
      case "anchors":
        await runAnchors(targetDir, { global: isGlobal })
        break
      case "help":
      case "--help":
      case "-h":
        printHelp()
        break
      default:
        process.stderr.write(`Unknown command: ${command}\n\n`)
        printHelp()
        process.exitCode = 1
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`Error: ${message}\n`)
    process.exitCode = 1
  }
}

main()
