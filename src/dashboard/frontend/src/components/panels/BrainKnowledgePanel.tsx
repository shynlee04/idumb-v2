/**
 * Brain Knowledge Panel — Displays knowledge entries with confidence
 */

import { useQuery } from "@tanstack/react-query"
import { Panel } from "../layout/Panel"
import { Brain, Lightbulb, GitBranch, BookOpen, Code, Settings, AlertTriangle } from "lucide-react"
import type { BrainStore, BrainEntry } from "@shared/types"

function getEntryIcon(type: BrainEntry["type"]) {
  switch (type) {
    case "architecture":
      return <GitBranch className="h-4 w-4 text-blue-500" />
    case "decision":
      return <Settings className="h-4 w-4 text-purple-500" />
    case "pattern":
      return <Code className="h-4 w-4 text-green-500" />
    case "tech-stack":
      return <BookOpen className="h-4 w-4 text-cyan-500" />
    case "research":
      return <Lightbulb className="h-4 w-4 text-yellow-500" />
    case "codebase-fact":
      return <Code className="h-4 w-4 text-orange-500" />
    case "convention":
      return <AlertTriangle className="h-4 w-4 text-pink-500" />
    case "gotcha":
      return <AlertTriangle className="h-4 w-4 text-red-500" />
    default:
      return <Brain className="h-4 w-4 text-gray-500" />
  }
}

function getConfidenceColor(confidence: number, isStale: boolean) {
  if (isStale) return "bg-gray-500"
  if (confidence >= 80) return "bg-green-500"
  if (confidence >= 60) return "bg-yellow-500"
  return "bg-red-500"
}

function isStale(entry: BrainEntry): boolean {
  return Date.now() - entry.modifiedAt > entry.staleAfter
}

function BrainEntryItem({ entry }: { entry: BrainEntry }) {
  const stale = isStale(entry)
  const effectiveConfidence = stale
    ? Math.max(0, entry.confidence - 10)
    : entry.confidence

  return (
    <div className="rounded-lg border bg-card p-3 text-sm">
      <div className="flex items-start gap-2">
        {getEntryIcon(entry.type)}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{entry.title}</span>
            <span
              className={`h-2 w-2 rounded-full ${getConfidenceColor(effectiveConfidence, stale)}`}
              title={`Confidence: ${effectiveConfidence}%`}
            />
            {stale && (
              <span className="text-xs text-muted-foreground">(stale)</span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
            {entry.content}
          </p>
          {entry.relatedTo.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              {entry.relatedTo.length} related
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export function BrainKnowledgePanel() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["brain"],
    queryFn: async (): Promise<BrainStore | null> => {
      const res = await fetch("/api/brain")
      if (!res.ok) throw new Error("Failed to fetch brain")
      const json = await res.json()
      return json.brain
    },
  })

  const entries = data?.entries || []
  const staleCount = entries.filter(e => isStale(e)).length

  return (
    <Panel
      title="Brain Knowledge"
      badge={entries.length > 0 ? `${entries.length}` : undefined}
      className="flex-1"
    >
      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading brain entries...</p>
      )}

      {error && (
        <p className="text-sm text-destructive">Failed to load brain entries</p>
      )}

      {!isLoading && !error && entries.length === 0 && (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">No knowledge entries yet</p>
        </div>
      )}

      {!isLoading && !error && entries.length > 0 && (
        <div className="space-y-2">
          {staleCount > 0 && (
            <p className="text-xs text-orange-500">
              ⚠️ {staleCount} stale {staleCount === 1 ? "entry" : "entries"}
            </p>
          )}
          <div className="space-y-2 max-h-60 overflow-auto scrollbar-thin">
            {entries.slice(0, 10).map((entry) => (
              <BrainEntryItem key={entry.id} entry={entry} />
            ))}
            {entries.length > 10 && (
              <p className="text-xs text-center text-muted-foreground">
                +{entries.length - 10} more entries
              </p>
            )}
          </div>
        </div>
      )}
    </Panel>
  )
}
