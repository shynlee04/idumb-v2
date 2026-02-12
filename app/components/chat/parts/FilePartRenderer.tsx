/**
 * FilePartRenderer — renders SDK FilePart as image preview or download card.
 *
 * - Image files (mime starts with "image/"): inline <img> with max dimensions
 * - Other files: attachment card with icon, filename, mime type, download link
 */

import { FileText, File as FileIcon, Download } from "lucide-react"
import { cn } from "@/lib/utils"
import type { FilePart } from "@/shared/engine-types"

interface FilePartRendererProps {
  part: FilePart
}

export function FilePartRenderer({ part }: FilePartRendererProps) {
  const isImage = part.mime.startsWith("image/")
  const filename = part.filename || "Untitled"

  if (isImage) {
    return (
      <div className="my-2">
        <img
          src={part.url}
          alt={filename}
          className="max-w-md max-h-64 rounded-md border border-border object-contain"
          loading="lazy"
        />
        <div className="flex items-center gap-2 mt-1">
          <p className="text-xs text-muted-foreground">{filename}</p>
          <a
            href={part.url}
            download={filename}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label={`Download ${filename}`}
          >
            <Download className="w-3 h-3" />
          </a>
        </div>
      </div>
    )
  }

  // Non-image file: attachment card
  const isText = part.mime.startsWith("text/") || part.mime.includes("json") || part.mime.includes("xml")
  const IconComponent = isText ? FileText : FileIcon

  return (
    <div
      className={cn(
        "my-2 inline-flex items-center gap-2 px-3 py-2 rounded-md",
        "border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
      )}
    >
      <IconComponent className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-mono truncate">{filename}</p>
        <p className="text-xs text-muted-foreground">{part.mime}</p>
      </div>
      <a
        href={part.url}
        download={filename}
        className="ml-2 text-muted-foreground hover:text-foreground flex-shrink-0"
        aria-label={`Download ${filename}`}
      >
        <Download className="w-3.5 h-3.5" />
      </a>
    </div>
  )
}
