# Phase 1: Engine + Task Bus — Research

**Researched:** 2026-02-09
**Phase:** 01-engine-task-bus
**Focus:** OpenCode SDK API surface, streaming patterns, existing codebase integration

## Standard Stack

### OpenCode SDK (`@opencode-ai/sdk` v1.1.53)

**Server:**
```typescript
import { createOpencodeServer } from "@opencode-ai/sdk/server"

const server = await createOpencodeServer({
  hostname?: string,    // default "127.0.0.1"
  port?: number,        // default auto
  signal?: AbortSignal,
  timeout?: number,
  config?: Config       // opencode.json config
})
// Returns: { url: string, close(): void }
```

**Client:**
```typescript
import { createOpencodeClient } from "@opencode-ai/sdk"

const client = createOpencodeClient({
  baseUrl: server.url,
  directory?: string    // project directory
})
```

**Session API:**
```typescript
client.session.list()    → Session[]
client.session.create({ body: { path: string } })  → Session
client.session.get({ path: { id } })   → Session
client.session.delete({ path: { id } })
client.session.prompt({ path: { id }, body: { parts: MessagePart[] } })
client.session.messages({ path: { id } })  → Message[]
client.session.abort({ path: { id } })
client.session.status({ path: { id } })  → "idle" | "running" | "compacting"
client.session.fork({ path: { id } })    → Session
client.session.children({ path: { id } }) → Session[]
```

**SSE Events (via `client.global.event()`):**
```typescript
const stream = await client.global.event()
for await (const event of stream) {
  // event.data is JSON-parsed Event union type
}
```

**Key Event Types:**
- `message.part.updated` — Delta streaming for message parts
- `session.created` / `session.updated` / `session.deleted`
- `session.error` — Auth errors, abort, output length
- `permission.updated` — Permission state changes (for tool approvals)

**Message Part Types (discriminated by `type` field):**
- `text` — TextPart: `{ type: "text", text: string }`
- `tool` — ToolPart: `{ type: "tool", id, name, state: "pending"|"running"|"completed"|"error", input, output }`
- `step-start` / `step-finish` — Step lifecycle markers
- `agent` — AgentPart: sub-agent delegation markers
- `compaction` — CompactionPart: session compaction events
- `file` — FilePart: file references with diff/content
- `snapshot` / `patch` — SnapshotPart/PatchPart: incremental updates
- `reasoning` — ReasoningPart: model thinking blocks
- `retry` — RetryPart: retry markers

**Session Type:**
```typescript
type Session = {
  id: string
  projectID: string
  directory: string
  parentID?: string        // for forked/child sessions
  title: string
  version: string
  time: { created: number, updated: number, compacting?: number }
  summary?: { additions, deletions, files, diffs }
  share?: { url: string }
  revert?: { messageID, partID, snapshot, diff }
}
```

### Existing Dashboard Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Backend | Express + WebSocket | `server.ts` (721 LOC), REST API at `/api/*`, WS at `/ws` |
| Frontend | React 18 + Vite | SPA with `@tanstack/react-query` |
| Styling | Tailwind v4 | `@tailwindcss/vite` plugin |
| UI Components | shadcn/ui subset | card, scroll-area, badge, separator, button |
| Markdown | react-markdown + rehype-highlight + remark-gfm | Already available |
| Icons | lucide-react | Already available |
| State | Tanstack Query | Server state management |
| Storage | SQLite via `sqlite-adapter.ts` | For persistence layer |

**Missing (needs install in frontend):**
- `react-router-dom` — Page routing (dashboard, chat, tasks)
- No additional deps needed — react-markdown, lucide-react, tanstack query all present

### Existing Schemas to Reuse

| Schema | File | Provides |
|--------|------|----------|
| Task hierarchy | `schemas/task.ts` | Epic → Task → Subtask (530 LOC) |
| Task graph | `schemas/task-graph.ts` | TaskNode, Checkpoint, TaskGraph (605 LOC) |
| Work plan | `schemas/work-plan.ts` | WorkPlan lifecycle (291 LOC) |
| Delegation | `schemas/delegation.ts` | 3-agent hierarchy, routing (363 LOC) |
| Anchor | `schemas/anchor.ts` | Context anchors for compaction |
| Config | `schemas/config.ts` | GovernanceMode, IdumbConfig |

### Existing Frontend Components

| Component | File | Reusable? |
|-----------|------|-----------|
| TaskHierarchyPanel | `panels/TaskHierarchyPanel.tsx` | Refactor for task sidebar |
| TaskGraphPanel | `panels/TaskGraphPanel.tsx` | Reference for task visualization |
| DelegationChainPanel | `panels/DelegationChainPanel.tsx` | Adapt for threaded delegation |
| DashboardLayout | `layout/DashboardLayout.tsx` | Rebuild with routing |
| Panel | `layout/Panel.tsx` | Reuse as container |

## Architecture Patterns

### SSE Relay Pattern (Backend → Browser)

The backend proxies OpenCode SSE events to the browser. NOT a direct connection.

```
Browser ←SSE→ Express Backend ←SDK→ OpenCode Server
```

Why: OpenCode server runs locally. The Express backend manages the lifecycle and adds governance metadata to events before forwarding.

```typescript
// Backend: SSE endpoint
app.get("/api/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Connection", "keep-alive")

  const stream = await client.global.event()
  for await (const event of stream) {
    res.write(`data: ${JSON.stringify(event.data)}\n\n`)
  }
})

// Frontend: EventSource hook
const useEventStream = (url: string) => {
  const [events, setEvents] = useState<Event[]>([])
  useEffect(() => {
    const source = new EventSource(url)
    source.onmessage = (e) => {
      const event = JSON.parse(e.data)
      setEvents(prev => [...prev, event])
    }
    return () => source.close()
  }, [url])
  return events
}
```

### Session Proxy Pattern

Backend wraps OpenCode SDK session calls, adding:
1. Governance state injection (active task, write-gate status)
2. Session metadata enrichment (compaction count tracking)
3. Error normalization

### Workspace-Bound Sessions

Per user decision: conversations are tied to a project/workspace. The backend detects the project directory from the OpenCode server config and binds all sessions to that directory.

## Common Pitfalls

### 1. SSE Connection Lifecycle
- Browser EventSource auto-reconnects on disconnect
- Must handle reconnection gracefully (re-subscribe, catch up on missed events)
- Set `retry:` field in SSE to control reconnect interval

### 2. Streaming Part Assembly
- `message.part.updated` events contain deltas, not full parts
- Need accumulator state per message to build complete parts
- Parts arrive out of order (tool calls interleave with text)

### 3. Compaction Detection
- Session `time.compacting` field is non-null during compaction
- After compaction, message history is rewritten
- Must re-fetch messages after compaction completes (listen for `session.updated` with `compacting: null`)

### 4. Agent Delegation Threading
- AgentPart in messages marks sub-agent boundaries
- `parentID` on Session links child sessions to parent
- `client.session.children({ path: { id } })` retrieves nested sessions

### 5. Governance State Coordination
- iDumb governance state lives in `.idumb/` JSON files
- Dashboard backend already reads via `readGovernanceState()`
- Must merge governance state with SDK session state for unified view

## Dont Hand-Roll

- **SSE parsing** — Use native `EventSource` in browser, `async for await` in Node
- **Markdown rendering** — `react-markdown` already in deps
- **State management** — Tanstack Query for server state, React state for streaming
- **Routing** — `react-router-dom` (not custom hash routing)
- **Part type handling** — Discriminated unions from SDK types, not manual parsing
