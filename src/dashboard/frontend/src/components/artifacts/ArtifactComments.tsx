/**
 * Artifact Comments Sidebar — Displays and manages comments for an artifact
 */

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { MessageSquare, Send, Check, X, Trash2 } from "lucide-react"
import type { CommentEntry } from "@shared/comments-types"

interface ArtifactCommentsProps {
  artifactPath: string
  onLineClick?: (line: number) => void
  selectedLine?: number
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

function CommentItem({
  comment,
  onResolve,
  onDelete,
}: {
  comment: CommentEntry
  onResolve: (id: string) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className={`rounded-lg border p-3 text-sm ${comment.resolved ? "bg-muted/30 opacity-60" : "bg-card"}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium">{comment.author}</span>
          <span className="text-xs text-muted-foreground">
            {comment.authorType === "agent" && "🤖 "}
            {formatTimestamp(comment.timestamp)}
          </span>
          {comment.line && (
            <span className="text-xs rounded bg-blue-500/10 px-1.5 py-0.5 text-blue-500">
              L{comment.line}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onResolve(comment.id)}
            className={`rounded p-1 transition-colors ${
              comment.resolved
                ? "text-yellow-500 hover:text-yellow-600"
                : "text-muted-foreground hover:text-green-500"
            }`}
            title={comment.resolved ? "Mark as unresolved" : "Mark as resolved"}
          >
            {comment.resolved ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}
          </button>
          <button
            onClick={() => onDelete(comment.id)}
            className="rounded p-1 text-muted-foreground transition-colors hover:text-red-500"
            title="Delete comment"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Content */}
      <p className="mt-2 text-foreground whitespace-pre-wrap">{comment.content}</p>

      {/* Footer */}
      {comment.resolved && (
        <p className="mt-2 text-xs text-green-500">
          Resolved by {comment.resolvedBy}
          {comment.resolvedAt && ` · ${formatTimestamp(comment.resolvedAt)}`}
        </p>
      )}
    </div>
  )
}

export function ArtifactComments({ artifactPath, onLineClick, selectedLine }: ArtifactCommentsProps) {
  const queryClient = useQueryClient()
  const [newComment, setNewComment] = useState("")
  const [commentLine, setCommentLine] = useState<number | undefined>(selectedLine)

  // Fetch comments for this artifact
  const { data, isLoading, error } = useQuery({
    queryKey: ["comments", artifactPath],
    queryFn: async (): Promise<{ comments: CommentEntry[]; total: number }> => {
      const res = await fetch(`/api/comments?artifact=${encodeURIComponent(artifactPath)}`)
      if (!res.ok) throw new Error("Failed to fetch comments")
      return res.json()
    },
  })

  const comments = data?.comments || []
  const unresolvedCount = comments.filter((c) => !c.resolved).length

  // Create comment mutation
  const createMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artifactPath,
          line: commentLine,
          content,
          author: "user",
          authorType: "user",
        }),
      })
      if (!res.ok) throw new Error("Failed to create comment")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", artifactPath] })
      setNewComment("")
      setCommentLine(undefined)
    },
  })

  // Resolve/unresolve mutation
  const resolveMutation = useMutation({
    mutationFn: async ({ id, resolved }: { id: string; resolved: boolean }) => {
      const res = await fetch(`/api/comments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolved, resolvedBy: "user" }),
      })
      if (!res.ok) throw new Error("Failed to update comment")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", artifactPath] })
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/comments/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete comment")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", artifactPath] })
    },
  })

  const handleSubmit = () => {
    if (newComment.trim()) {
      createMutation.mutate(newComment)
    }
  }

  return (
    <div className="flex h-full flex-col border-l">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Comments</span>
          {unresolvedCount > 0 && (
            <span className="text-xs rounded bg-blue-500/10 px-1.5 py-0.5 text-blue-500">
              {unresolvedCount} unresolved
            </span>
          )}
        </div>
      </div>

      {/* Comments list */}
      <div className="flex-1 space-y-2 overflow-auto p-4">
        {isLoading && (
          <p className="text-sm text-muted-foreground">Loading comments...</p>
        )}

        {error && (
          <p className="text-sm text-destructive">Failed to load comments</p>
        )}

        {!isLoading && !error && comments.length === 0 && (
          <div className="text-center py-8">
            <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">No comments yet</p>
            <p className="text-xs text-muted-foreground">
              {onLineClick
                ? "Click a line number to add a comment"
                : "Add a comment to start the discussion"}
            </p>
          </div>
        )}

        {!isLoading && !error && comments.length > 0 && (
          <div className="space-y-3">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onResolve={(id) => resolveMutation.mutate({ id, resolved: !comments.find((c) => c.id === id)?.resolved })}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* New comment input */}
      <div className="border-t p-4">
        {commentLine !== undefined && (
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Commenting on line {commentLine}
            </span>
            <button
              onClick={() => setCommentLine(undefined)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={commentLine !== undefined ? "Add comment for this line..." : "Add a comment..."}
            className="flex-1 rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleSubmit()
              }
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!newComment.trim() || createMutation.isPending}
            className="self-end rounded-md bg-primary px-3 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Cmd/Ctrl + Enter to send
        </p>
      </div>
    </div>
  )
}
