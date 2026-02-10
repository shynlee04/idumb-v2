/**
 * Engine lifecycle server functions.
 *
 * Replaces Express routes:
 * - GET  /api/engine/status  → getEngineStatusFn
 * - POST /api/engine/start   → startEngineFn
 * - POST /api/engine/stop    → stopEngineFn
 * - POST /api/engine/restart → restartEngineFn
 */

import { createServerFn } from "@tanstack/react-start"
import {
  getEngineStatus,
  startEngine,
  stopEngine,
  ensureHealthy,
  ensureEngine,
} from "./sdk-client.server"
import { EngineStartSchema } from "./validators"

// ─── Server Functions ─────────────────────────────────────────────────────

/** GET engine status — no input required. */
export const getEngineStatusFn = createServerFn({ method: "GET" })
  .handler(async () => {
    return getEngineStatus()
  })

/** POST start engine — accepts optional projectDir and port. */
export const startEngineFn = createServerFn({ method: "POST" })
  .inputValidator(EngineStartSchema)
  .handler(async ({ data }) => {
    try {
      const projectDir = data.projectDir || process.cwd()
      const port = data.port ?? Number(process.env.OPENCODE_PORT || 4096)

      await startEngine(projectDir, port)
      await ensureHealthy()
      return getEngineStatus()
    } catch (err) {
      throw new Error(`Failed to start engine: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

/** POST stop engine — no input required. */
export const stopEngineFn = createServerFn({ method: "POST" })
  .handler(async () => {
    try {
      await stopEngine()
      return { success: true as const }
    } catch (err) {
      throw new Error(`Failed to stop engine: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

/** POST restart engine — accepts optional projectDir and port. */
export const restartEngineFn = createServerFn({ method: "POST" })
  .inputValidator(EngineStartSchema)
  .handler(async ({ data }) => {
    try {
      await stopEngine()
      const projectDir = data.projectDir || process.cwd()
      const port = data.port ?? Number(process.env.OPENCODE_PORT || 4096)

      await startEngine(projectDir, port)
      await ensureHealthy()
      return getEngineStatus()
    } catch (err) {
      throw new Error(`Failed to restart engine: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

/** Idempotent engine start — used by __root.tsx beforeLoad. */
export const ensureEngineFn = createServerFn({ method: "POST" })
  .handler(async () => {
    try {
      return await ensureEngine()
    } catch (err) {
      throw new Error(`Failed to ensure engine: ${err instanceof Error ? err.message : String(err)}`)
    }
  })
