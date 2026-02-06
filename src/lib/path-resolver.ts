/**
 * Path Resolver
 * 
 * Smart resolution of .idumb/ directory placement.
 * Places .idumb/ at the same level as .opencode/ when found.
 * 
 * Resolution order:
 * 1. Walk up from `directory` looking for `.opencode/`
 * 2. If `.opencode/` found → place `.idumb/` at same level
 * 3. If `opencode.json` found (no `.opencode/`) → use that directory
 * 4. If nothing found → use `directory` as-is (safe fallback)
 * 5. For global mode: `~/.config/opencode/.idumb/`
 */

import { existsSync } from "fs"
import { join, dirname, resolve } from "path"
import { homedir } from "os"

/**
 * Global OpenCode config root
 */
const GLOBAL_OPENCODE_ROOT = join(homedir(), ".config", "opencode")

/**
 * Maximum directory depth to walk up when searching for .opencode/
 * Prevents infinite loops on deep nested paths
 */
const MAX_WALK_DEPTH = 20

/**
 * Result of path resolution with metadata about how it was resolved
 */
export interface ResolvedPath {
  /** Absolute path to the directory where .idumb/ should live */
  root: string
  /** How the path was resolved */
  strategy: "opencode-dir" | "opencode-json" | "worktree" | "directory-fallback" | "global"
  /** Whether .opencode/ was found at the resolved location */
  opencodeFound: boolean
  /** The absolute path to .idumb/ */
  idumbPath: string
}

/**
 * Resolve where .idumb/ should be placed.
 * 
 * Walks up from `directory` looking for `.opencode/` or `opencode.json`,
 * falls back to `directory` if nothing found, or uses global path.
 * 
 * @param directory - The current working directory from OpenCode context
 * @param worktree - Optional git worktree path from OpenCode context
 * @param global - Force global mode (~/.config/opencode/.idumb/)
 */
export function resolveIdumbRoot(
  directory: string,
  worktree?: string,
  global?: boolean
): ResolvedPath {
  // Global mode: always use ~/.config/opencode/
  if (global) {
    return {
      root: GLOBAL_OPENCODE_ROOT,
      strategy: "global",
      opencodeFound: existsSync(GLOBAL_OPENCODE_ROOT),
      idumbPath: join(GLOBAL_OPENCODE_ROOT, ".idumb"),
    }
  }

  // Walk up from directory looking for .opencode/ or opencode.json
  const fromDir = walkUpForMarker(directory)
  if (fromDir) return fromDir

  // Try worktree (git root) if provided and different from directory
  if (worktree && resolve(worktree) !== resolve(directory)) {
    const fromWorktree = walkUpForMarker(worktree)
    if (fromWorktree) {
      return { ...fromWorktree, strategy: "worktree" }
    }
  }

  // Fallback: use directory as-is (current behavior, always safe)
  return {
    root: directory,
    strategy: "directory-fallback",
    opencodeFound: false,
    idumbPath: join(directory, ".idumb"),
  }
}

/**
 * Walk up from a starting directory looking for .opencode/ or opencode.json.
 * Returns ResolvedPath if found, null if not.
 */
function walkUpForMarker(startDir: string): ResolvedPath | null {
  let current = resolve(startDir)
  let depth = 0

  while (depth < MAX_WALK_DEPTH) {
    // Check for .opencode/ directory (strongest signal)
    const opencodeDir = join(current, ".opencode")
    if (existsSync(opencodeDir)) {
      return {
        root: current,
        strategy: "opencode-dir",
        opencodeFound: true,
        idumbPath: join(current, ".idumb"),
      }
    }

    // Check for opencode.json (weaker signal, but still valid)
    const opencodeJson = join(current, "opencode.json")
    if (existsSync(opencodeJson)) {
      return {
        root: current,
        strategy: "opencode-json",
        opencodeFound: false,
        idumbPath: join(current, ".idumb"),
      }
    }

    // Move up one directory
    const parent = dirname(current)
    if (parent === current) break // Reached filesystem root
    current = parent
    depth++
  }

  return null
}

/**
 * Check if running in global mode.
 * 
 * Global mode is when:
 * - No project-level .opencode/ exists
 * - Plugin is loaded from ~/.config/opencode/plugins/
 * - directory is the user's home or a non-project path
 */
export function isGlobalMode(directory: string): boolean {
  const resolved = resolveIdumbRoot(directory)
  return resolved.strategy === "directory-fallback" && !resolved.opencodeFound
}

/**
 * Get the .opencode/ root for agent profile generation.
 * Creates .opencode/agents/ if it doesn't exist.
 */
export function resolveAgentsDir(directory: string, worktree?: string): string {
  const resolved = resolveIdumbRoot(directory, worktree)
  return join(resolved.root, ".opencode", "agents")
}

/**
 * Get the global .idumb/ path
 */
export function getGlobalIdumbPath(): string {
  return join(GLOBAL_OPENCODE_ROOT, ".idumb")
}
