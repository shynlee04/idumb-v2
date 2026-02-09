import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"

export const taskKeys = {
  all: ["tasks"] as const,
  one: (id: string) => ["tasks", id] as const,
  governance: ["governance"] as const,
  history: ["tasks", "history"] as const,
}

export function useTasks() {
  return useQuery({
    queryKey: taskKeys.all,
    queryFn: api.getTasks,
    refetchInterval: 5_000,
  })
}

export function useTask(id?: string) {
  return useQuery({
    queryKey: taskKeys.one(id ?? ""),
    queryFn: () => api.getTask(id!),
    enabled: Boolean(id),
    refetchInterval: 5_000,
  })
}

export function useGovernance() {
  return useQuery({
    queryKey: taskKeys.governance,
    queryFn: api.getGovernance,
    refetchInterval: 5_000,
  })
}

export function useTaskHistory() {
  return useQuery({
    queryKey: taskKeys.history,
    queryFn: api.getTaskHistory,
    refetchInterval: 10_000,
  })
}
