/**
 * useEngine hooks — React Query wrappers for engine + session + config operations.
 *
 * - useEngineStatus()  — polls engine status every 10 s
 * - useSessions()      — session list, auto-refetch on create/delete
 * - useProviders()     — providers with models, 5 min stale time
 * - useAgents()        — agent list, 5 min stale time
 * - useConfig()        — opencode config, 5 min stale time
 * - useAppInfo()       — app paths/git info, 5 min stale time
 * - useCreateSession() — mutation → invalidates session list
 * - useDeleteSession() — mutation → invalidates session list
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { api } from "@/lib/api"

// ---------------------------------------------------------------------------
// Keys — colocated for easy invalidation
// ---------------------------------------------------------------------------
export const engineKeys = {
  status: ["engine", "status"] as const,
  sessions: ["sessions", "list"] as const,
  providers: ["config", "providers"] as const,
  agents: ["config", "agents"] as const,
  config: ["config", "config"] as const,
  appInfo: ["config", "app"] as const,
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Polls `/api/engine/status` every 10 s. */
export function useEngineStatus() {
  return useQuery({
    queryKey: engineKeys.status,
    queryFn: api.getEngineStatus,
    refetchInterval: 10_000,
    retry: 1,
    // Don't error-toast on first load when backend might not be up yet
    meta: { silent: true },
  })
}

/** Fetches session list. Invalidated by create / delete mutations. */
export function useSessions() {
  return useQuery({
    queryKey: engineKeys.sessions,
    queryFn: api.listSessions,
    refetchInterval: 30_000,
  })
}

/** Fetches available providers + models. Cached until explicit invalidation. */
export function useProviders() {
  return useQuery({
    queryKey: engineKeys.providers,
    queryFn: api.getProviders,
    staleTime: 5 * 60_000, // providers rarely change — 5 min stale time
    retry: 1,
    meta: { silent: true },
  })
}

/** Fetches available agents. Cached until explicit invalidation. */
export function useAgents() {
  return useQuery({
    queryKey: engineKeys.agents,
    queryFn: api.getAgents,
    staleTime: 5 * 60_000,
    retry: 1,
    meta: { silent: true },
  })
}

/** Fetches OpenCode config. Cached until explicit invalidation. */
export function useConfig() {
  return useQuery({
    queryKey: engineKeys.config,
    queryFn: api.getConfig,
    staleTime: 5 * 60_000,
    retry: 1,
    meta: { silent: true },
  })
}

/** Fetches app info (paths, git). Cached until explicit invalidation. */
export function useAppInfo() {
  return useQuery({
    queryKey: engineKeys.appInfo,
    queryFn: api.getAppInfo,
    staleTime: 5 * 60_000,
    retry: 1,
    meta: { silent: true },
  })
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Creates a new session and invalidates the session list cache. */
export function useCreateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (title?: string) => api.createSession(title),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: engineKeys.sessions })
    },
  })
}

/** Deletes a session by id and invalidates the session list cache. */
export function useDeleteSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteSession(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: engineKeys.sessions })
    },
  })
}
