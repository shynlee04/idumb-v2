/**
 * Zod validators for server function inputs.
 *
 * Shared between session, engine, and config server functions.
 * TanStack Start's `.inputValidator()` accepts Zod schemas directly.
 */

import { z } from "zod"

/** Validate a session ID path parameter. */
export const SessionIdSchema = z.object({
  id: z.string().min(1, "Session ID is required"),
})

/** Validate session creation body. */
export const CreateSessionSchema = z.object({
  title: z.string().optional(),
})

/** Validate engine start/restart input. */
export const EngineStartSchema = z.object({
  projectDir: z.string().optional(),
  port: z.number().int().positive().optional(),
})

/** Validate prompt request body. */
export const PromptRequestSchema = z.object({
  id: z.string().min(1, "Session ID is required"),
  text: z.string().optional(),
  parts: z.array(z.object({
    type: z.literal("text"),
    text: z.string(),
  })).optional(),
  modelID: z.string().optional(),
  providerID: z.string().optional(),
})

// ─── File Server Function Validators ───────────────────────────────────────

/** Validate directory listing input. */
export const DirPathSchema = z.object({
  dirPath: z.string().min(1, "Directory path is required"),
})

/** Validate file read input. */
export const FilePathSchema = z.object({
  filePath: z.string().min(1, "File path is required"),
})

/** Validate file write input. */
export const WriteFileSchema = z.object({
  filePath: z.string().min(1, "File path is required"),
  content: z.string(),
})

/** Validate file/folder creation input. */
export const CreateFileSchema = z.object({
  parentPath: z.string().min(1, "Parent path is required"),
  name: z.string().min(1, "Name is required"),
  type: z.enum(["file", "folder"]),
})

/** Validate file/folder deletion input. */
export const DeleteFileSchema = z.object({
  targetPath: z.string().min(1, "Target path is required"),
})

/** Validate file/folder rename input. */
export const RenameFileSchema = z.object({
  oldPath: z.string().min(1, "Old path is required"),
  newName: z.string().min(1, "New name is required"),
})

// ─── PTY Server Function Validators ─────────────────────────────────────────

/** Validate PTY creation input. */
export const PtyCreateSchema = z.object({
  command: z.string().optional(),
  cwd: z.string().optional(),
})

/** Validate PTY ID parameter. */
export const PtyIdSchema = z.object({
  id: z.string().min(1, "PTY ID is required"),
})

/** Validate PTY resize input. */
export const PtyResizeSchema = z.object({
  id: z.string().min(1, "PTY ID is required"),
  rows: z.number().int().positive(),
  cols: z.number().int().positive(),
})
