/**
 * useSettings — React Query hooks for settings CRUD + provider/model data.
 *
 * Settings CRUD wraps server functions from settings.ts.
 * Provider/agent/config hooks re-exported from useEngine.ts for convenience.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getSettingFn, setSettingFn, getAllSettingsFn, deleteSettingFn } from "../server/settings"

// Re-export provider/agent/config hooks from useEngine for convenience
export { useProviders, useAgents, useConfig, useAppInfo, configKeys } from "./useEngine"

// ─── Query Key Factory ────────────────────────────────────────────────────

export const settingsKeys = {
  all: ["settings"] as const,
  single: (key: string) => ["settings", key] as const,
  providers: ["providers"] as const,
  agents: ["agents"] as const,
  config: ["config"] as const,
}

// ─── Settings CRUD Hooks ──────────────────────────────────────────────────

/** Read a single setting by key. Returns null if not found. */
export function useSetting(key: string) {
  return useQuery({
    queryKey: settingsKeys.single(key),
    queryFn: () => getSettingFn({ data: { key } }),
    staleTime: 5_000,
  })
}

/** Read all settings. */
export function useSettings() {
  return useQuery({
    queryKey: settingsKeys.all,
    queryFn: () => getAllSettingsFn(),
    staleTime: 5_000,
  })
}

/** Create or update a setting (upsert). Invalidates related queries. */
export function useSetSetting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { key: string; value: string }) =>
      setSettingFn({ data: params }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all })
      queryClient.invalidateQueries({ queryKey: settingsKeys.single(variables.key) })
    },
  })
}

/** Delete a setting by key. Invalidates related queries. */
export function useDeleteSetting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { key: string }) =>
      deleteSettingFn({ data: params }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all })
      queryClient.invalidateQueries({ queryKey: settingsKeys.single(variables.key) })
    },
  })
}
