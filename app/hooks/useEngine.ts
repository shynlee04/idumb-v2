/**
 * useEngine hooks — React Query wrappers for engine lifecycle + config.
 *
 * Migrated from src/dashboard/frontend/src/hooks/useEngine.ts
 * to use TanStack Start server functions instead of fetch().
 *
 * - useEngineStatus()   — engine status polling
 * - useStartEngine()    — start engine mutation
 * - useStopEngine()     — stop engine mutation
 * - useRestartEngine()  — restart engine mutation
 * - useProviders()      — list configured providers
 * - useAgents()         — list available agents
 * - useConfig()         — get OpenCode config
 * - useAppInfo()        — get app path/git info
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getEngineStatusFn, startEngineFn, stopEngineFn, restartEngineFn } from "../server/engine"
import { getProvidersFn, getAgentsFn, getConfigFn, getAppInfoFn, healthCheckFn } from "../server/config"

// ─── Query Keys ───────────────────────────────────────────────────────────

export const engineKeys = {
  all: ["engine"] as const,
  status: () => [...engineKeys.all, "status"] as const,
  health: () => [...engineKeys.all, "health"] as const,
}

export const configKeys = {
  all: ["config"] as const,
  providers: () => [...configKeys.all, "providers"] as const,
  agents: () => [...configKeys.all, "agents"] as const,
  config: () => [...configKeys.all, "settings"] as const,
  appInfo: () => [...configKeys.all, "app-info"] as const,
}

// ─── Engine Hooks ─────────────────────────────────────────────────────────

export function useEngineStatus(options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: engineKeys.status(),
    queryFn: () => getEngineStatusFn(),
    refetchInterval: options?.refetchInterval ?? 5000,
    retry: 1,
  })
}

export function useStartEngine() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params?: { projectDir?: string; port?: number }) =>
      startEngineFn({ data: params ?? {} }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: engineKeys.all })
    },
  })
}

export function useStopEngine() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => stopEngineFn(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: engineKeys.all })
    },
  })
}

export function useRestartEngine() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params?: { projectDir?: string; port?: number }) =>
      restartEngineFn({ data: params ?? {} }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: engineKeys.all })
    },
  })
}

// ─── Config Hooks ─────────────────────────────────────────────────────────

export function useHealthCheck() {
  return useQuery({
    queryKey: engineKeys.health(),
    queryFn: () => healthCheckFn(),
    refetchInterval: 10000,
    retry: 1,
  })
}

export function useProviders() {
  return useQuery({
    queryKey: configKeys.providers(),
    queryFn: () => getProvidersFn(),
    staleTime: 30_000,
  })
}

export function useAgents() {
  return useQuery({
    queryKey: configKeys.agents(),
    queryFn: () => getAgentsFn(),
    staleTime: 30_000,
  })
}

export function useConfig() {
  return useQuery({
    queryKey: configKeys.config(),
    queryFn: () => getConfigFn(),
    staleTime: 60_000,
  })
}

export function useAppInfo() {
  return useQuery({
    queryKey: configKeys.appInfo(),
    queryFn: () => getAppInfoFn(),
    staleTime: 60_000,
  })
}
