/**
 * File CRUD server functions.
 *
 * Provides file system operations for the IDE file tree:
 * - listDirectory   — list directory contents as FileNode[]
 * - readFileFn      — read file content
 * - writeFileFn     — write file content
 * - createFileOrFolder — create new file or directory
 * - deleteFileOrFolder — delete file or directory
 * - renameFileOrFolder — rename file or directory
 *
 * All paths are relative to process.cwd() with path traversal protection.
 */

import { createServerFn } from "@tanstack/react-start"
import fs from "node:fs/promises"
import nodePath from "node:path"
import {
  DirPathSchema,
  FilePathSchema,
  WriteFileSchema,
  CreateFileSchema,
  DeleteFileSchema,
  RenameFileSchema,
} from "./validators"
import type { FileNode } from "../shared/ide-types"

// ─── Path Safety ───────────────────────────────────────────────────────────

/** Resolve a user path relative to cwd, rejecting traversal attempts. */
function safePath(userPath: string): string {
  const cwd = process.cwd()
  const resolved = nodePath.resolve(cwd, userPath)
  if (!resolved.startsWith(cwd)) {
    throw new Error("Path traversal detected")
  }
  return resolved
}

// ─── Server Functions ──────────────────────────────────────────────────────

/** List directory contents as FileNode[] (folders first, alphabetical). */
export const listDirectoryFn = createServerFn({ method: "GET" })
  .inputValidator(DirPathSchema)
  .handler(async ({ data }): Promise<FileNode[]> => {
    try {
      const dirAbsolute = safePath(data.dirPath)
      const entries = await fs.readdir(dirAbsolute, { withFileTypes: true })

      const nodes: FileNode[] = entries
        .filter((e) => !e.name.startsWith(".") && e.name !== "node_modules")
        .map((entry) => ({
          id: nodePath.join(data.dirPath, entry.name),
          name: entry.name,
          isFolder: entry.isDirectory(),
          children: entry.isDirectory() ? null : undefined,
        }))

      // Sort: folders first, then files, alphabetical within each group
      nodes.sort((a, b) => {
        if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1
        return a.name.localeCompare(b.name)
      })

      return nodes
    } catch (err) {
      throw new Error(
        `Failed to list directory: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  })

/** Read file content. */
export const readFileFn = createServerFn({ method: "GET" })
  .inputValidator(FilePathSchema)
  .handler(async ({ data }) => {
    try {
      const fileAbsolute = safePath(data.filePath)
      const content = await fs.readFile(fileAbsolute, "utf-8")
      const stat = await fs.stat(fileAbsolute)
      return { content, size: stat.size }
    } catch (err) {
      throw new Error(
        `Failed to read file: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  })

/** Write file content. */
export const writeFileFn = createServerFn({ method: "POST" })
  .inputValidator(WriteFileSchema)
  .handler(async ({ data }) => {
    try {
      const fileAbsolute = safePath(data.filePath)
      await fs.writeFile(fileAbsolute, data.content, "utf-8")
      return { success: true as const }
    } catch (err) {
      throw new Error(
        `Failed to write file: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  })

/** Create a new file or folder. */
export const createFileOrFolderFn = createServerFn({ method: "POST" })
  .inputValidator(CreateFileSchema)
  .handler(async ({ data }) => {
    try {
      const fullPath = nodePath.join(data.parentPath, data.name)
      const absolute = safePath(fullPath)

      if (data.type === "folder") {
        await fs.mkdir(absolute, { recursive: true })
      } else {
        // Ensure parent directory exists
        await fs.mkdir(nodePath.dirname(absolute), { recursive: true })
        await fs.writeFile(absolute, "", "utf-8")
      }

      return { path: fullPath }
    } catch (err) {
      throw new Error(
        `Failed to create ${data.type}: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  })

/** Delete a file or folder (recursive for folders). */
export const deleteFileOrFolderFn = createServerFn({ method: "POST" })
  .inputValidator(DeleteFileSchema)
  .handler(async ({ data }) => {
    try {
      const absolute = safePath(data.targetPath)
      await fs.rm(absolute, { recursive: true })
      return { success: true as const }
    } catch (err) {
      throw new Error(
        `Failed to delete: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  })

/** Rename a file or folder. */
export const renameFileOrFolderFn = createServerFn({ method: "POST" })
  .inputValidator(RenameFileSchema)
  .handler(async ({ data }) => {
    try {
      const oldAbsolute = safePath(data.oldPath)
      const parentDir = nodePath.dirname(data.oldPath)
      const newRelPath = nodePath.join(parentDir, data.newName)
      const newAbsolute = safePath(newRelPath)

      await fs.rename(oldAbsolute, newAbsolute)
      return { newPath: newRelPath }
    } catch (err) {
      throw new Error(
        `Failed to rename: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  })
