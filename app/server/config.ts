/**
 * Config proxy server functions.
 *
 * Replaces Express routes:
 * - GET /api/health     → healthCheckFn
 * - GET /api/providers  → getProvidersFn
 * - GET /api/agents     → getAgentsFn
 * - GET /api/config     → getConfigFn
 * - GET /api/app        → getAppInfoFn
 */

import { createServerFn } from "@tanstack/react-start"
import { getClient, getProjectDir, unwrapSdkResult } from "./sdk-client.server"
import type { ProviderInfo, AgentInfo, AppInfo } from "../shared/engine-types"

// ─── Server Functions ─────────────────────────────────────────────────────

/** Basic health check — no SDK call required. */
export const healthCheckFn = createServerFn({ method: "GET" })
  .handler(async () => {
    return { status: "ok" as const, timestamp: Date.now() }
  })

/** List configured providers with their models. */
export const getProvidersFn = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const result = await getClient().config.providers()
      const providers = unwrapSdkResult(result)

      // Normalize into ProviderInfo[] shape
      const normalized: ProviderInfo[] = Array.isArray(providers)
        ? providers.map((p: Record<string, unknown>) => ({
            id: String(p.id ?? ""),
            name: String(p.name ?? p.id ?? ""),
            models: Array.isArray(p.models)
              ? (p.models as Record<string, unknown>[]).map((m) => ({
                  id: String(m.id ?? ""),
                  name: String(m.name ?? m.id ?? ""),
                }))
              : [],
          }))
        : []

      return normalized
    } catch (err) {
      throw new Error(`Failed to list providers: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

/** List available agents. */
export const getAgentsFn = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const result = await getClient().app.agents()
      const agents = unwrapSdkResult(result)

      const normalized: AgentInfo[] = Array.isArray(agents)
        ? agents.map((a: Record<string, unknown>) => ({
            id: String(a.id ?? ""),
            name: String(a.name ?? a.id ?? ""),
            ...(a.description ? { description: String(a.description) } : {}),
          }))
        : []

      return normalized
    } catch (err) {
      throw new Error(`Failed to list agents: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

/** Get OpenCode config (JSON-safe). */
export const getConfigFn = createServerFn({ method: "GET" })
  .handler(async (): Promise<Record<string, NonNullable<unknown>>> => {
    try {
      const result = await getClient().config.get()
      const config = unwrapSdkResult(result) ?? {}
      return JSON.parse(JSON.stringify(config))
    } catch (err) {
      throw new Error(`Failed to get config: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

/** Get app info (composed from path + vcs, JSON-safe). */
export const getAppInfoFn = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const pathResult = await getClient().path.get()
      const pathInfo = unwrapSdkResult(pathResult) as Record<string, NonNullable<unknown>> | undefined

      let gitInfo: Record<string, NonNullable<unknown>> | undefined
      try {
        const vcsResult = await getClient().vcs.get()
        const raw = unwrapSdkResult(vcsResult) as Record<string, unknown> | undefined
        if (raw) gitInfo = JSON.parse(JSON.stringify(raw))
      } catch {
        // vcs may not be available — graceful degradation
      }

      return {
        path: {
          cwd: String(pathInfo?.cwd ?? ""),
          config: String(pathInfo?.config ?? ""),
          data: String(pathInfo?.data ?? ""),
        },
        ...(gitInfo ? { git: gitInfo } : {}),
      }
    } catch (err) {
      throw new Error(`Failed to get app info: ${err instanceof Error ? err.message : String(err)}`)
    }
  })
