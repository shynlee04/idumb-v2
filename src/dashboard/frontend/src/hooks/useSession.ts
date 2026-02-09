/**
 * useSession hooks — React Query wrappers for individual session state.
 *
 * - useSession(id)       — session details (metadata)
 * - useMessages(id)      — message history for a session
 * - useSessionStatus(id) — polls status every 2 s when session is running
 */

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------
export const sessionKeys = {
  detail: (id: string) => ["session", id] as const,
  messages: (id: string) => ["session", id, "messages"] as const,
  status: (id: string) => ["session", id, "status"] as const,
  children: (id: string) => ["session", id, "children"] as const,
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Fetches session details (metadata). */
export function useSession(id: string | undefined) {
  return useQuery({
    queryKey: sessionKeys.detail(id ?? ""),
    queryFn: () => api.getSession(id!),
    enabled: !!id,
  })
}

/** Fetches message history for a session. */
export function useMessages(id: string | undefined) {
  return useQuery({
    queryKey: sessionKeys.messages(id ?? ""),
    queryFn: () => api.getMessages(id!),
    enabled: !!id,
    // Re-fetch frequently while viewing a session
    refetchInterval: 5_000,
  })
}

/**
 * Polls session status every 2 s when the session is "running".
 * Falls back to 10 s for idle sessions.
 */
export function useSessionStatus(id: string | undefined) {
  return useQuery({
    queryKey: sessionKeys.status(id ?? ""),
    queryFn: () => api.getSessionStatus(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const statusType = query.state.data?.type
      return statusType === "busy" ? 2_000 : 10_000
    },
  })
}

/** Fetches child sessions (agent-spawned sub-conversations). */
export function useSessionChildren(id: string | undefined) {
  return useQuery({
    queryKey: sessionKeys.children(id ?? ""),
    queryFn: () => api.getSessionChildren(id!),
    enabled: !!id,
  })
}
