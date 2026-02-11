/**
 * PTY Server Functions — server-only wrappers for OpenCode SDK PTY API.
 *
 * The `.server.ts` suffix ensures Vite/TanStack Start tree-shakes this
 * from the client bundle. All PTY lifecycle operations go through the SDK.
 *
 * Exports:
 * - createPtyFn      — create a new PTY session
 * - listPtyFn        — list active PTY sessions
 * - removePtyFn      — remove (kill) a PTY session
 * - resizePtyFn      — resize a PTY session
 * - getPtyConnectionInfoFn — get WebSocket base URL for PTY connections
 */

import { createServerFn } from "@tanstack/react-start"
import { getClient, getEngineStatus, unwrapSdkResult, sdkQuery } from "./sdk-client.server"
import { PtyCreateSchema, PtyIdSchema, PtyResizeSchema } from "./validators"

// ─── Create PTY Session ──────────────────────────────────────────────────────

export const createPtyFn = createServerFn({ method: "POST" })
  .inputValidator(PtyCreateSchema)
  .handler(async ({ data }) => {
    const client = getClient()
    const result = await client.pty.create({
      body: {
        title: "Terminal",
        command: data.command,
        cwd: data.cwd,
      },
      query: sdkQuery(),
    })

    const pty = unwrapSdkResult(result)
    const status = getEngineStatus()
    const httpUrl = status.url ?? `http://127.0.0.1:${status.port ?? 4096}`
    const wsUrl = httpUrl.replace(/^http/, "ws") + `/pty/${pty.id}/connect`

    return { id: pty.id, wsUrl }
  })

// ─── List PTY Sessions ───────────────────────────────────────────────────────

export const listPtyFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const client = getClient()
    const result = await client.pty.list({
      query: sdkQuery(),
    })

    return unwrapSdkResult(result)
  })

// ─── Remove PTY Session ──────────────────────────────────────────────────────

export const removePtyFn = createServerFn({ method: "POST" })
  .inputValidator(PtyIdSchema)
  .handler(async ({ data }) => {
    const client = getClient()
    const result = await client.pty.remove({
      path: { id: data.id },
      query: sdkQuery(),
    })

    return unwrapSdkResult(result)
  })

// ─── Resize PTY Session ──────────────────────────────────────────────────────

export const resizePtyFn = createServerFn({ method: "POST" })
  .inputValidator(PtyResizeSchema)
  .handler(async ({ data }) => {
    const client = getClient()
    const result = await client.pty.update({
      path: { id: data.id },
      body: { size: { rows: data.rows, cols: data.cols } },
      query: sdkQuery(),
    })

    return unwrapSdkResult(result)
  })

// ─── Get PTY Connection Info ─────────────────────────────────────────────────

export const getPtyConnectionInfoFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const status = getEngineStatus()
    const httpUrl = status.url ?? `http://127.0.0.1:${status.port ?? 4096}`
    const baseUrl = httpUrl.replace(/^http/, "ws")

    return { baseUrl }
  })
