/**
 * Session CRUD server functions.
 *
 * Replaces Express routes:
 * - GET    /api/sessions             → getSessionsFn
 * - POST   /api/sessions             → createSessionFn
 * - GET    /api/sessions/:id         → getSessionFn
 * - DELETE /api/sessions/:id         → deleteSessionFn
 * - GET    /api/sessions/:id/messages → getSessionMessagesFn
 * - POST   /api/sessions/:id/abort   → abortSessionFn
 * - GET    /api/sessions/:id/status  → getSessionStatusFn
 * - GET    /api/sessions/:id/children → getSessionChildrenFn
 */

import { createServerFn } from "@tanstack/react-start"
import { getClient, getProjectDir, sdkQuery, unwrapSdkResult } from "./sdk-client.server"
import { SessionIdSchema, CreateSessionSchema } from "./validators"
import {
  validateSessionList,
  validateSession,
  validateMessages,
  validateSessionStatus,
} from "./sdk-validators"
import type { SessionStatus } from "../shared/engine-types"

// ─── Server Functions ─────────────────────────────────────────────────────

/** List all sessions. */
export const getSessionsFn = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const projectDir = getProjectDir()
      const result = await getClient().session.list({ query: sdkQuery(projectDir) })
      const sessions = unwrapSdkResult(result)
      return validateSessionList(sessions)
    } catch (err) {
      throw new Error(`Failed to list sessions: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

/** Create a new session with optional title. */
export const createSessionFn = createServerFn({ method: "POST" })
  .inputValidator(CreateSessionSchema)
  .handler(async ({ data }) => {
    try {
      const projectDir = getProjectDir()
      const result = await getClient().session.create({
        query: sdkQuery(projectDir),
        body: data.title ? { title: data.title } : {},
      })
      return validateSession(unwrapSdkResult(result))
    } catch (err) {
      throw new Error(`Failed to create session: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

/** Get a single session by ID. */
export const getSessionFn = createServerFn({ method: "GET" })
  .inputValidator(SessionIdSchema)
  .handler(async ({ data }) => {
    try {
      const projectDir = getProjectDir()
      const result = await getClient().session.get({
        query: sdkQuery(projectDir),
        path: { id: data.id },
      })
      return validateSession(unwrapSdkResult(result))
    } catch (err) {
      throw new Error(`Failed to get session: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

/** Delete a session by ID (uses POST for mutation semantics). */
export const deleteSessionFn = createServerFn({ method: "POST" })
  .inputValidator(SessionIdSchema)
  .handler(async ({ data }) => {
    try {
      const projectDir = getProjectDir()
      const result = await getClient().session.delete({
        query: sdkQuery(projectDir),
        path: { id: data.id },
      })
      unwrapSdkResult(result)
      return { success: true as const }
    } catch (err) {
      throw new Error(`Failed to delete session: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

/** Get messages for a session.
 * Note: SDK Message types use `unknown` in index signatures which doesn't
 * satisfy TanStack Start's serialization constraint (`{}`). We cast through
 * JSON to produce a plain serializable type. Return type left inferred so
 * TanStack can apply its own serialization-safe variant.
 * Semantic return: Message[] (from @opencode-ai/sdk)
 */
export const getSessionMessagesFn = createServerFn({ method: "GET" })
  .inputValidator(SessionIdSchema)
  .handler(async ({ data }) => {
    try {
      const projectDir = getProjectDir()
      const result = await getClient().session.messages({
        query: sdkQuery(projectDir),
        path: { id: data.id },
      })
      const messages = unwrapSdkResult(result)
      // Validate shape at boundary, then JSON roundtrip for serialization compat
      validateMessages(messages)
      return JSON.parse(JSON.stringify(messages))
    } catch (err) {
      throw new Error(`Failed to get messages: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

/** Abort a running session (POST mutation). */
export const abortSessionFn = createServerFn({ method: "POST" })
  .inputValidator(SessionIdSchema)
  .handler(async ({ data }) => {
    try {
      const projectDir = getProjectDir()
      const result = await getClient().session.abort({
        query: sdkQuery(projectDir),
        path: { id: data.id },
      })
      unwrapSdkResult(result)
      return { success: true as const }
    } catch (err) {
      throw new Error(`Failed to abort session: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

/** Get session status map, return status for specific session.
 * Semantic return: SessionStatus (from @opencode-ai/sdk)
 * — discriminated union: {type:"idle"} | {type:"busy"} | {type:"retry"; ...}
 */
export const getSessionStatusFn = createServerFn({ method: "GET" })
  .inputValidator(SessionIdSchema)
  .handler(async ({ data }) => {
    try {
      const projectDir = getProjectDir()
      const result = await getClient().session.status({
        query: sdkQuery(projectDir),
      })
      const statusMap = unwrapSdkResult(result) as Record<string, SessionStatus>
      const status = statusMap[data.id]
      if (!status) {
        throw new Error("Session status not found")
      }
      // Validate shape at boundary, then JSON roundtrip for serialization compat
      validateSessionStatus(status)
      return JSON.parse(JSON.stringify(status)) as SessionStatus
    } catch (err) {
      throw new Error(`Failed to get session status: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

/** Get child sessions for a parent session. */
export const getSessionChildrenFn = createServerFn({ method: "GET" })
  .inputValidator(SessionIdSchema)
  .handler(async ({ data }) => {
    try {
      const projectDir = getProjectDir()
      const result = await getClient().session.children({
        query: sdkQuery(projectDir),
        path: { id: data.id },
      })
      return validateSessionList(unwrapSdkResult(result))
    } catch (err) {
      throw new Error(`Failed to get child sessions: ${err instanceof Error ? err.message : String(err)}`)
    }
  })
