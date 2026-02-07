/**
 * Comments Store Schema — Per-artifact and per-line comments
 */

export interface CommentsStore {
  version: string
  comments: CommentEntry[]
  lastModified: number
}

export interface CommentEntry {
  id: string // UUID
  artifactPath: string // Relative path from project root
  line?: number // undefined = artifact-level comment
  author: string // "user" or agent name
  authorType: "user" | "agent"
  content: string // Comment content (markdown supported)
  timestamp: number // ISO timestamp
  resolved: boolean
  resolvedBy?: string
  resolvedAt?: number
  replies: CommentReply[]
}

export interface CommentReply {
  id: string
  author: string
  authorType: "user" | "agent"
  content: string
  timestamp: number
}
