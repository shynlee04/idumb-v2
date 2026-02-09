/**
 * useEngine hooks — React Query wrappers for engine + session operations.
 *
 * - useEngineStatus()  — polls engine status every 10 s
 * - useSessions()      — session list, auto-refetch on create/delete
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
