/**
 * Delegation Chain Panel — Shows active and completed delegations
 */

import { useQuery } from "@tanstack/react-query"
import { Panel } from "../layout/Panel"
import { ArrowRight, CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react"
import type { DelegationStore, DelegationRecord } from "@shared/schema-types"

function getStatusIcon(status: DelegationRecord["status"]) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="h-3 w-3 text-green-500" />
    case "accepted":
      return <Clock className="h-3 w-3 text-blue-500" />
    case "rejected":
      return <XCircle className="h-3 w-3 text-red-500" />
    case "expired":
      return <AlertCircle className="h-3 w-3 text-gray-500" />
    default:
      return <Clock className="h-3 w-3 text-yellow-500" />
  }
}

function formatAge(timestamp: number): string {
  const minutes = Math.floor((Date.now() - timestamp) / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function DelegationItem({ record }: { record: DelegationRecord }) {
  return (
    <div className="rounded-lg border bg-card p-2 text-xs">
      <div className="flex items-center gap-2">
        {getStatusIcon(record.status)}
        <span className="font-medium">{record.fromAgent}</span>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <span className="font-medium">{record.toAgent}</span>
        <span className="ml-auto text-muted-foreground">{formatAge(record.createdAt)}</span>
      </div>
      <p className="mt-1 text-muted-foreground line-clamp-1">{record.context}</p>
    </div>
  )
}

export function DelegationChainPanel() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["delegations"],
    queryFn: async (): Promise<DelegationStore | null> => {
      const res = await fetch("/api/delegations")
      if (!res.ok) throw new Error("Failed to fetch delegations")
      const json = await res.json()
      return json.delegations
    },
  })

  const delegations = data?.delegations || []
  const activeDelegations = delegations.filter(
    (d) => d.status === "pending" || d.status === "accepted"
  )
  const completedDelegations = delegations.filter((d) => d.status === "completed")

  return (
    <Panel
      title="Delegations"
      badge={activeDelegations.length > 0 ? `${activeDelegations.length} active` : undefined}
      className="flex-1"
    >
      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading delegations...</p>
      )}

      {error && (
        <p className="text-sm text-destructive">Failed to load delegations</p>
      )}

      {!isLoading && !error && delegations.length === 0 && (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">No delegations yet</p>
        </div>
      )}

      {!isLoading && !error && delegations.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-auto scrollbar-thin">
          {activeDelegations.length > 0 && (
            <>
              <p className="text-xs font-medium text-muted-foreground">Active</p>
              {activeDelegations.map((record) => (
                <DelegationItem key={record.id} record={record} />
              ))}
            </>
          )}

          {completedDelegations.length > 0 && (
            <>
              <p className="text-xs font-medium text-muted-foreground mt-2">
                Completed
              </p>
              {completedDelegations.slice(0, 5).map((record) => (
                <DelegationItem key={record.id} record={record} />
              ))}
            </>
          )}
        </div>
      )}
    </Panel>
  )
}
