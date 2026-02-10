/**
 * Zod validators for server function inputs.
 *
 * Shared between session, engine, and config server functions.
 * TanStack Start's `.validator()` accepts Zod schemas directly.
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
