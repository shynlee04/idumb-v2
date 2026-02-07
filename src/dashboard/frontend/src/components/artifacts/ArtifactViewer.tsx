/**
 * Artifact Viewer — Renders markdown with syntax highlighting, supports inline editing
 */

import { useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import rehypeRaw from "rehype-raw"
import { Edit2 } from "lucide-react"
import type { ArtifactMetadata } from "@shared/schema-types"
import { InlineEditor } from "./InlineEditor"

// Import highlight.js styles (will be loaded via CSS)
import "highlight.js/styles/github-dark.css"

interface ArtifactViewerProps {
  content: string
  filename: string
  metadata?: ArtifactMetadata
  onSave?: (content: string) => Promise<boolean>
}

// Determine if file is markdown
function isMarkdown(filename: string): boolean {
  return /\.(md|markdown|mdx)$/i.test(filename)
}

// Determine if file is editable (md, json, yaml, xml)
function isEditable(filename: string): boolean {
  return /\.(md|markdown|json|yaml|yml|xml)$/i.test(filename)
}

export function ArtifactViewer({ content, filename, metadata, onSave }: ArtifactViewerProps) {
  const [isEditing, setIsEditing] = useState(false)
  const isMd = isMarkdown(filename)
  const editable = isEditable(filename) && onSave !== undefined

  const handleSave = async (newContent: string): Promise<boolean> => {
    if (onSave) {
      const success = await onSave(newContent)
      if (success) {
        setIsEditing(false)
      }
      return success
    }
    return false
  }

  if (isEditing && editable) {
    return (
      <InlineEditor
        content={content}
        filename={filename}
        onSave={handleSave}
        onCancel={() => setIsEditing(false)}
      />
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header with metadata and edit button */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{filename}</span>
          {editable && (
            <span className="text-xs rounded bg-blue-500/10 px-1.5 py-0.5 text-blue-500">
              Editable
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {metadata && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {metadata.status && (
                <span className="capitalize">{metadata.status}</span>
              )}
              {metadata.stale && (
                <span className="text-orange-500">Stale</span>
              )}
            </div>
          )}
          {editable && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
              title="Edit this file"
            >
              <Edit2 className="h-3 w-3" />
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {isMd ? (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight, rehypeRaw]}
            >
              {content}
            </ReactMarkdown>
          </div>
        ) : (
          <pre className="text-xs">
            <code>{content}</code>
          </pre>
        )}
      </div>
    </div>
  )
}
