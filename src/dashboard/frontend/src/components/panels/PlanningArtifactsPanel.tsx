/**
 * Planning Artifacts Panel — Lists and displays planning artifacts with viewer and comments
 */

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Panel } from "../layout/Panel"
import { FileText, CheckCircle2, Clock, AlertTriangle, XCircle } from "lucide-react"
import { ArtifactViewer } from "../artifacts/ArtifactViewer"
import { ArtifactComments } from "../artifacts/ArtifactComments"
import { ArtifactMetadata } from "../artifacts/ArtifactMetadata"
import type { ArtifactsResponse, ArtifactMetadata as ArtifactMetadataType } from "@shared/schema-types"

function getStatusIcon(status?: string) {
  switch (status) {
    case "active":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />
    case "superseded":
      return <Clock className="h-4 w-4 text-yellow-500" />
    case "abandoned":
      return <XCircle className="h-4 w-4 text-gray-500" />
    case "stale":
      return <AlertTriangle className="h-4 w-4 text-orange-500" />
    default:
      return <FileText className="h-4 w-4 text-muted-foreground" />
  }
}

export function PlanningArtifactsPanel() {
  const [selectedArtifact, setSelectedArtifact] = useState<string | null>(null)
  const [selectedLine, setSelectedLine] = useState<number | undefined>(undefined)
  const [showComments, setShowComments] = useState(false)
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ["artifacts"],
    queryFn: async (): Promise<ArtifactsResponse> => {
      const res = await fetch("/api/artifacts")
      if (!res.ok) throw new Error("Failed to fetch artifacts")
      return res.json()
    },
  })

  // Fetch selected artifact content
  const { data: contentData, isLoading: contentLoading } = useQuery({
    queryKey: ["artifact-content", selectedArtifact],
    queryFn: async (): Promise<{ content: string; path: string } | null> => {
      if (!selectedArtifact) return null
      // Path from API is already relative to project root
      const res = await fetch(`/api/artifacts/content?path=${encodeURIComponent(selectedArtifact)}`)
      if (!res.ok) throw new Error("Failed to fetch artifact content")
      return res.json()
    },
    enabled: !!selectedArtifact,
  })

  // Story 12-03: Fetch real metadata from backend instead of mock
  const { data: metadata } = useQuery<ArtifactMetadataType>({
    queryKey: ["artifact-metadata", selectedArtifact],
    queryFn: async (): Promise<ArtifactMetadataType> => {
      const res = await fetch(
        `/api/artifacts/metadata?path=${encodeURIComponent(selectedArtifact!)}`
      )
      if (!res.ok) throw new Error("Failed to fetch artifact metadata")
      return res.json()
    },
    enabled: !!selectedArtifact,
  })

  const selectedArtifactData = data?.artifacts.find((a) => a.path === selectedArtifact)

  // Save handler for inline editing
  const handleSave = async (content: string): Promise<boolean> => {
    if (!selectedArtifact) return false

    try {
      const res = await fetch("/api/artifacts/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: selectedArtifact, content }),
      })

      if (!res.ok) {
        return false
      }

      // Invalidate queries to refresh content
      queryClient.invalidateQueries({ queryKey: ["artifact-content", selectedArtifact] })
      queryClient.invalidateQueries({ queryKey: ["artifact-metadata", selectedArtifact] })
      return true
    } catch {
      return false
    }
  }

  return (
    <Panel title="Planning Artifacts" badge={data ? `${data.artifacts.length}` : undefined} className="flex-1">
      {!selectedArtifact ? (
        // Artifact List View
        <div className="flex flex-col gap-1 p-2">
          {isLoading && (
            <p className="text-sm text-muted-foreground">Loading artifacts...</p>
          )}

          {error && (
            <p className="text-sm text-destructive">Failed to load artifacts</p>
          )}

          {!isLoading && !error && (!data || data.artifacts.length === 0) && (
            <p className="text-sm text-muted-foreground">No artifacts found</p>
          )}

          {!isLoading && !error && data && data.artifacts.map((artifact) => (
            <button
              key={artifact.path}
              onClick={() => setSelectedArtifact(artifact.path)}
              className={`
                flex items-center gap-2 rounded px-3 py-2 text-left text-sm
                hover:bg-muted/50 transition-colors w-full
              `}
            >
              {getStatusIcon(artifact.status)}
              <span className="flex-1 truncate">{artifact.name}</span>
              {artifact.status === "active" && (
                <span className="text-xs rounded bg-green-500/10 px-1.5 py-0.5 text-green-500">
                  Active
                </span>
              )}
            </button>
          ))}
        </div>
      ) : (
        // Artifact Detail View
        <div className="flex h-full">
          {/* Main Content */}
          <div className="flex-1 overflow-auto">
            {/* Back button */}
            <div className="border-b px-4 py-2">
              <button
                onClick={() => {
                  setSelectedArtifact(null)
                  setShowComments(false)
                }}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                &larr; Back to artifacts
              </button>
            </div>

            {/* Metadata */}
            {metadata && (
              <div className="p-4">
                <ArtifactMetadata metadata={metadata} artifactPath={selectedArtifact} />
              </div>
            )}

            {/* Content */}
            <div className="px-4 pb-4">
              {contentLoading ? (
                <p className="text-sm text-muted-foreground">Loading content...</p>
              ) : contentData ? (
                <ArtifactViewer
                  content={contentData.content}
                  filename={selectedArtifactData?.name || "artifact.md"}
                  metadata={metadata}
                  onSave={handleSave}
                />
              ) : null}
            </div>
          </div>

          {/* Comments Sidebar */}
          {showComments && selectedArtifact && (
            <ArtifactComments
              artifactPath={selectedArtifact}
              onLineClick={(line) => setSelectedLine(line)}
              selectedLine={selectedLine}
            />
          )}

          {/* Toggle Comments Button */}
          <button
            onClick={() => setShowComments(!showComments)}
            className={`
              fixed bottom-4 right-4 rounded-full p-3 shadow-lg transition-colors
              ${showComments ? "bg-muted hover:bg-muted/80" : "bg-primary hover:bg-primary/90"}
            `}
            title={showComments ? "Hide comments" : "Show comments"}
          >
            <FileText className="h-5 w-5" />
          </button>
        </div>
      )}
    </Panel>
  )
}
