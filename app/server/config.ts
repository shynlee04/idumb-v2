/**
 * Config proxy server functions.
 *
 * Replaces Express routes:
 * - GET /api/health     → healthCheckFn
 * - GET /api/providers  → getProvidersFn
 * - GET /api/agents     → getAgentsFn
 * - GET /api/config     → getConfigFn
 * - GET /api/app        → getAppInfoFn
 *
 * SDK types imported directly from @opencode-ai/sdk — no Record<string, unknown> casts.
 */

import { createServerFn } from "@tanstack/react-start"
import { getClient, getProjectDir, unwrapSdkResult } from "./sdk-client.server"
import type { ProviderInfo, AgentInfo, AppInfo } from "../shared/engine-types"
import type { Provider, Agent, Path, VcsInfo } from "@opencode-ai/sdk"

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
      // SDK returns { providers: Provider[], default: Record<string, string> }
      const response = unwrapSdkResult(result) as { providers: Provider[]; default: Record<string, string> }

      // Extract providers array from response object
      const providerList = response?.providers ?? []

      // Map SDK Provider to our ProviderInfo (models is a record, not array)
      const normalized: ProviderInfo[] = providerList.map((p: Provider) => ({
        id: p.id,
        name: p.name || p.id,
        models: Object.entries(p.models ?? {}).map(([modelId, model]) => ({
          id: model.id || modelId,
          name: model.name || model.id || modelId,
        })),
      }))

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
      // SDK returns Agent[] directly (Agent has name but no id field)
      const agents = unwrapSdkResult(result) as Agent[]

      const normalized: AgentInfo[] = Array.isArray(agents)
        ? agents.map((a: Agent) => ({
            id: a.name, // Agent has no id — name IS the identifier
            name: a.name,
            ...(a.description ? { description: a.description } : {}),
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
      // SDK returns Path = { state, config, worktree, directory }
      const pathInfo = unwrapSdkResult(pathResult) as Path | undefined

      let gitInfo: Record<string, NonNullable<unknown>> | undefined
      try {
        const vcsResult = await getClient().vcs.get()
        // SDK returns VcsInfo = { branch: string }
        const vcsData = unwrapSdkResult(vcsResult) as VcsInfo | undefined
        if (vcsData) gitInfo = JSON.parse(JSON.stringify(vcsData))
      } catch {
        // vcs may not be available — graceful degradation
      }

      // Map SDK Path to our AppInfo shape
      return {
        path: {
          cwd: pathInfo?.directory ?? "",     // SDK: directory, AppInfo: cwd
          config: pathInfo?.config ?? "",
          data: pathInfo?.state ?? "",        // SDK: state, AppInfo: data
        },
        ...(gitInfo ? { git: gitInfo } : {}),
      }
    } catch (err) {
      throw new Error(`Failed to get app info: ${err instanceof Error ? err.message : String(err)}`)
    }
  })
