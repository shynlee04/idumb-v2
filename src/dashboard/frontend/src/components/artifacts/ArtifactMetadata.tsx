/**
 * Artifact Metadata — Displays status, staleness, chain integrity, related artifacts
 */

import { CheckCircle2, AlertTriangle, Link, FileText } from "lucide-react"
import type { ArtifactMetadata } from "@shared/types"

interface ArtifactMetadataProps {
  metadata: ArtifactMetadata
  artifactPath: string
}

function getStatusBadge(status?: string) {
  switch (status) {
    case "active":
      return (
        <span className="flex items-center gap-1 text-xs rounded bg-green-500/10 px-2 py-1 text-green-500">
          <CheckCircle2 className="h-3 w-3" />
          Active
        </span>
      )
    case "superseded":
      return (
        <span className="flex items-center gap-1 text-xs rounded bg-yellow-500/10 px-2 py-1 text-yellow-500">
          <AlertTriangle className="h-3 w-3" />
          Superseded
        </span>
      )
    case "abandoned":
      return (
        <span className="flex items-center gap-1 text-xs rounded bg-gray-500/10 px-2 py-1 text-gray-500">
          <AlertTriangle className="h-3 w-3" />
          Abandoned
        </span>
      )
    case "stale":
      return (
        <span className="flex items-center gap-1 text-xs rounded bg-orange-500/10 px-2 py-1 text-orange-500">
          <AlertTriangle className="h-3 w-3" />
          Stale
        </span>
      )
    default:
      return null
  }
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export function ArtifactMetadata({ metadata, artifactPath }: ArtifactMetadataProps) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3 text-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-medium">Artifact Details</span>
        {getStatusBadge(metadata.status)}
      </div>

      {/* Metadata grid */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        {/* File type */}
        <div className="flex flex-col">
          <span className="text-muted-foreground">Type</span>
          <span className="font-medium uppercase">{metadata.fileType}</span>
        </div>

        {/* Last modified */}
        <div className="flex flex-col">
          <span className="text-muted-foreground">Modified</span>
          <span className="font-medium">{formatTimestamp(metadata.lastModified)}</span>
        </div>

        {/* Staleness */}
        <div className="flex flex-col">
          <span className="text-muted-foreground">Freshness</span>
          <span className={metadata.stale ? "text-orange-500 font-medium" : "text-green-500 font-medium"}>
            {metadata.stale ? "Stale" : "Fresh"}
          </span>
        </div>

        {/* Chain integrity */}
        {metadata.chainIntegrity !== undefined && (
          <div className="flex flex-col">
            <span className="text-muted-foreground">Chain Integrity</span>
            <span className={metadata.chainIntegrity ? "text-green-500 font-medium" : "text-red-500 font-medium"}>
              {metadata.chainIntegrity ? "Valid" : "Broken"}
            </span>
          </div>
        )}
      </div>

      {/* Related artifacts */}
      {metadata.relatedArtifacts && metadata.relatedArtifacts.length > 0 && (
        <div className="mt-3 border-t pt-3">
          <span className="text-xs text-muted-foreground">Related Artifacts</span>
          <div className="mt-1 space-y-1">
            {metadata.relatedArtifacts.slice(0, 3).map((related) => (
              <div key={related} className="flex items-center gap-1 text-xs">
                <Link className="h-3 w-3 text-muted-foreground" />
                <span className="truncate">{related}</span>
              </div>
            ))}
            {metadata.relatedArtifacts.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{metadata.relatedArtifacts.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* File path */}
      <div className="mt-3 border-t pt-3">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <FileText className="h-3 w-3" />
          <span className="truncate">{artifactPath}</span>
        </div>
      </div>
    </div>
  )
}
