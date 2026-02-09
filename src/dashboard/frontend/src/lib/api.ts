const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001"

async function json<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText)
    throw new Error(`API ${response.status}: ${text}`)
  }
  return response.json() as Promise<T>
}

export interface EngineStatus {
  running: boolean
  url?: string
  projectDir?: string
  port?: number
}

export interface Session {
  id: string
  title: string
  parentID?: string
  time: {
    created: number
    updated: number
    compacting?: number
  }
}

export interface SessionStatus {
  type: "idle" | "busy" | "retry" | string
  attempt?: number
  message?: string
  next?: number
}

export interface MessageInfo {
  id: string
  role: "user" | "assistant" | "system"
  time: {
    created: number
    completed?: number
  }
}

export interface StreamPart {
  id: string
  type: string
  sessionID?: string
  messageID?: string
  text?: string
  delta?: string
  name?: string
  tool?: string
  callID?: string
  state?: {
    status?: string
    input?: Record<string, unknown>
    output?: string
    error?: string
  }
  metadata?: Record<string, unknown>
  [key: string]: unknown
}

export interface SessionMessageEntry {
  info: MessageInfo
  parts: StreamPart[]
}

export interface TaskNode {
  id: string
  workPlanId: string
  name: string
  expectedOutput: string
  status: "planned" | "blocked" | "active" | "review" | "completed" | "failed"
  assignedTo: string
  delegatedBy: string
  dependsOn: string[]
  checkpoints: Array<{ id: string; summary: string; timestamp: number; tool: string }>
  createdAt: number
  modifiedAt: number
  startedAt?: number
  completedAt?: number
  result?: {
    evidence: string
    filesModified: string[]
    testsRun: string
  }
}

export interface WorkPlan {
  id: string
  name: string
  status: "draft" | "active" | "completed" | "archived" | "abandoned"
  category: string
  tasks: TaskNode[]
  planAhead: TaskNode[]
  createdAt: number
  completedAt?: number
}

export interface TasksSnapshot {
  workPlan: WorkPlan | null
  tasks: TaskNode[]
  activeTask: TaskNode | null
}

export interface GovernanceStatus {
  activeTask: TaskNode | null
  workPlan: WorkPlan | null
  progress: {
    total: number
    completed: number
    failed: number
    percent: number
  }
  governanceMode: string
  writesBlocked: boolean
  capturedAgent?: unknown
}

export const api = {
  getEngineStatus: (): Promise<EngineStatus> =>
    fetch(`${API_BASE}/api/engine/status`).then(r => json<EngineStatus>(r)),

  startEngine: (payload: { projectDir?: string; port?: number }): Promise<EngineStatus> =>
    fetch(`${API_BASE}/api/engine/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(r => json<EngineStatus>(r)),

  stopEngine: (): Promise<{ success: boolean }> =>
    fetch(`${API_BASE}/api/engine/stop`, { method: "POST" }).then(r =>
      json<{ success: boolean }>(r),
    ),

  listSessions: (): Promise<Session[]> =>
    fetch(`${API_BASE}/api/sessions`).then(r => json<Session[]>(r)),

  createSession: (title?: string): Promise<Session> =>
    fetch(`${API_BASE}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(title ? { title } : {}),
    }).then(r => json<Session>(r)),

  getSession: (id: string): Promise<Session> =>
    fetch(`${API_BASE}/api/sessions/${id}`).then(r => json<Session>(r)),

  deleteSession: (id: string): Promise<{ success: boolean }> =>
    fetch(`${API_BASE}/api/sessions/${id}`, { method: "DELETE" }).then(r =>
      json<{ success: boolean }>(r),
    ),

  getMessages: (id: string): Promise<SessionMessageEntry[]> =>
    fetch(`${API_BASE}/api/sessions/${id}/messages`).then(r =>
      json<SessionMessageEntry[]>(r),
    ),

  getSessionStatus: (id: string): Promise<SessionStatus> =>
    fetch(`${API_BASE}/api/sessions/${id}/status`).then(r =>
      json<SessionStatus>(r),
    ),

  getSessionChildren: (id: string): Promise<Session[]> =>
    fetch(`${API_BASE}/api/sessions/${id}/children`).then(r =>
      json<Session[]>(r),
    ),

  sendPrompt: (id: string, text: string, signal?: AbortSignal): Promise<Response> =>
    fetch(`${API_BASE}/api/sessions/${id}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parts: [{ type: "text", text }],
      }),
      signal,
    }),

  abortSession: (id: string): Promise<{ success: boolean }> =>
    fetch(`${API_BASE}/api/sessions/${id}/abort`, { method: "POST" }).then(r =>
      json<{ success: boolean }>(r),
    ),

  getTasks: (): Promise<TasksSnapshot> =>
    fetch(`${API_BASE}/api/tasks`).then(r => json<TasksSnapshot>(r)),

  getTask: (id: string): Promise<{ task: TaskNode }> =>
    fetch(`${API_BASE}/api/tasks/${id}`).then(r => json<{ task: TaskNode }>(r)),

  getTaskHistory: (): Promise<{ tasks: TaskNode[] }> =>
    fetch(`${API_BASE}/api/tasks/history`).then(r =>
      json<{ tasks: TaskNode[] }>(r),
    ),

  getGovernance: (): Promise<GovernanceStatus> =>
    fetch(`${API_BASE}/api/governance`).then(r =>
      json<GovernanceStatus>(r),
    ),

  eventsUrl: (sessionID?: string): string =>
    `${API_BASE}/api/events${sessionID ? `?sessionID=${encodeURIComponent(sessionID)}` : ""}`,
} as const
