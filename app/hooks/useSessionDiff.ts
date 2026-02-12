/**
 * useSessionDiff — React Query hook for session file diffs.
 *
 * Fetches diff data from SDK session.diff() via server function.
 * Diffs are relatively stable so use 30s staleTime.
 */
import { useQuery } from "@tanstack/react-query"
import { getSessionDiffFn } from "../server/diffs"
import type { FileDiff } from "../shared/engine-types"

export const diffKeys = {
  all: ["session-diffs"] as const,
  session: (id: string) => [...diffKeys.all, id] as const,
  message: (id: string, messageID: string) => [...diffKeys.all, id, messageID] as const,
}

export function useSessionDiff(sessionId: string | undefined) {
  return useQuery<FileDiff[]>({
    queryKey: diffKeys.session(sessionId ?? ""),
    queryFn: () => getSessionDiffFn({ data: { id: sessionId! } }),
    enabled: Boolean(sessionId),
    staleTime: 30_000, // Diffs don't change frequently
  })
}
