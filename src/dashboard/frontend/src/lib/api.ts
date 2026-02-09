/**
 * API client — typed methods for all backend endpoints.
 *
 * Uses environment variable or defaults to localhost:3001.
 * Every method returns a typed promise for React Query consumption.
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001"

// ---------------------------------------------------------------------------
// Response helper — throws on non-OK responses so React Query marks as error
// ---------------------------------------------------------------------------
async function json<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText)
    throw new Error(`API ${response.status}: ${text}`)
  }
  return response.json() as Promise<T>
}

// ---------------------------------------------------------------------------
// Types — lightweight mirrors of backend shapes (no coupling to src/schemas)
// ---------------------------------------------------------------------------
export interface EngineStatus {
  running: boolean
  version?: string
  uptime?: number
  sessions?: number
}

export interface Session {
  id: string
  title?: string
  createdAt: string
  updatedAt?: string
  status?: "idle" | "running" | "compacting"
  agentId?: string
}

export interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: string
  toolCalls?: unknown[]
}

export interface SessionStatus {
  id: string
  status: "idle" | "running" | "compacting"
  lastActivity?: string
}

export interface TaskItem {
  id: string
  title: string
  status: string
  priority?: string
  createdAt?: string
}

export interface BrainEntry {
  type: string
  content: string
  priority?: string
  timestamp?: string
}

// ---------------------------------------------------------------------------
// API client singleton
// ---------------------------------------------------------------------------
export const api = {
  // Engine
  getEngineStatus: (): Promise<EngineStatus> =>
    fetch(`${API_BASE}/api/engine/status`).then(r => json<EngineStatus>(r)),

  // Sessions — list / CRUD
  listSessions: (): Promise<Session[]> =>
    fetch(`${API_BASE}/api/sessions`).then(r => json<Session[]>(r)),

  createSession: (): Promise<Session> =>
    fetch(`${API_BASE}/api/sessions`, { method: "POST" }).then(r =>
      json<Session>(r),
    ),

  getSession: (id: string): Promise<Session> =>
    fetch(`${API_BASE}/api/sessions/${id}`).then(r => json<Session>(r)),

  deleteSession: (id: string): Promise<void> =>
    fetch(`${API_BASE}/api/sessions/${id}`, { method: "DELETE" }).then(r => {
      if (!r.ok) throw new Error(`Delete failed: ${r.status}`)
    }),

  getMessages: (id: string): Promise<Message[]> =>
    fetch(`${API_BASE}/api/sessions/${id}/messages`).then(r =>
      json<Message[]>(r),
    ),

  getSessionStatus: (id: string): Promise<SessionStatus> =>
    fetch(`${API_BASE}/api/sessions/${id}/status`).then(r =>
      json<SessionStatus>(r),
    ),

  getSessionChildren: (id: string): Promise<Session[]> =>
    fetch(`${API_BASE}/api/sessions/${id}/children`).then(r =>
      json<Session[]>(r),
    ),

  /** Returns the SSE URL for streaming a prompt — caller opens EventSource */
  promptUrl: (id: string): string =>
    `${API_BASE}/api/sessions/${id}/prompt`,

  sendPrompt: (id: string, text: string): Promise<Response> =>
    fetch(`${API_BASE}/api/sessions/${id}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    }),

  abortSession: (id: string): Promise<void> =>
    fetch(`${API_BASE}/api/sessions/${id}/abort`, { method: "POST" }).then(
      r => {
        if (!r.ok) throw new Error(`Abort failed: ${r.status}`)
      },
    ),

  // Governance (existing endpoints)
  getTasks: (): Promise<TaskItem[]> =>
    fetch(`${API_BASE}/api/tasks`).then(r => json<TaskItem[]>(r)),

  getBrain: (): Promise<BrainEntry[]> =>
    fetch(`${API_BASE}/api/brain`).then(r => json<BrainEntry[]>(r)),

  getDelegations: (): Promise<unknown[]> =>
    fetch(`${API_BASE}/api/delegations`).then(r => json<unknown[]>(r)),

  // SSE events endpoint
  eventsUrl: `${API_BASE}/api/events`,
} as const
