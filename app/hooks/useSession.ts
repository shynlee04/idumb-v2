/**
 * useSession hooks — React Query wrappers for individual session state.
 *
 * Migrated from src/dashboard/frontend/src/hooks/useSession.ts
 * to use TanStack Start server functions instead of fetch().
 *
 * - useSession(id)            — session detail
 * - useSessionMessages(id)    — session messages
 * - useSessionChildren(id)    — child sessions
 * - useCreateSession()        — create session mutation
 * - useDeleteSession()        — delete session mutation
 * - useAbortSession()         — abort session mutation
 * - useSessions()             — list all sessions
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getSessionsFn,
  getSessionFn,
  createSessionFn,
  deleteSessionFn,
  getSessionMessagesFn,
  abortSessionFn,
  getSessionChildrenFn,
} from "../server/sessions"

// ─── Query Keys ───────────────────────────────────────────────────────────

export const sessionKeys = {
  all: ["sessions"] as const,
  lists: () => [...sessionKeys.all, "list"] as const,
  detail: (id: string) => [...sessionKeys.all, "detail", id] as const,
  messages: (id: string) => [...sessionKeys.all, "messages", id] as const,
  children: (id: string) => [...sessionKeys.all, "children", id] as const,
}

// ─── Session Hooks ────────────────────────────────────────────────────────

export function useSessions() {
  return useQuery({
    queryKey: sessionKeys.lists(),
    queryFn: () => getSessionsFn(),
    refetchInterval: 5000,
  })
}

export function useSession(id: string | undefined) {
  return useQuery({
    queryKey: sessionKeys.detail(id ?? ""),
    queryFn: () => getSessionFn({ data: { id: id! } }),
    enabled: Boolean(id),
  })
}

export function useSessionMessages(id: string | undefined) {
  return useQuery({
    queryKey: sessionKeys.messages(id ?? ""),
    queryFn: () => getSessionMessagesFn({ data: { id: id! } }),
    enabled: Boolean(id),
    refetchInterval: 3000,
  })
}

export function useSessionChildren(id: string | undefined) {
  return useQuery({
    queryKey: sessionKeys.children(id ?? ""),
    queryFn: () => getSessionChildrenFn({ data: { id: id! } }),
    enabled: Boolean(id),
  })
}

export function useCreateSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params?: { title?: string }) =>
      createSessionFn({ data: params ?? {} }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() })
    },
  })
}

export function useDeleteSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteSessionFn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() })
    },
  })
}

export function useAbortSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => abortSessionFn({ data: { id } }),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(id) })
    },
  })
}
