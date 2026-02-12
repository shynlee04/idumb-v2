# Phase 7 Research: Chat + Terminal

**Revised:** 2026-02-11 (post-investigation of SDK types + CodeNomad client)

## Standard Stack

### Chat Rendering — Use Existing react-markdown Stack

**Decision:** Use the already-installed `react-markdown` + `rehype-highlight` + `remark-gfm` + `rehype-raw` instead of the roadmap-suggested `marked + shiki + DOMPurify`.

**Why:**
- Zero new dependencies — all 4 packages are in package.json already
- react-markdown is React-native — renders to React elements, no `dangerouslySetInnerHTML`
- rehype-highlight provides syntax highlighting via highlight.js CSS classes
- No DOMPurify needed — React's virtual DOM handles XSS prevention
- `rehype-raw` allows embedded HTML in markdown if needed

### Message Part Types — Import from @opencode-ai/sdk

**CRITICAL: Do NOT define custom Part types. Import from SDK.**

The SDK (`@opencode-ai/sdk`) exports a complete `Part` discriminated union from `types.gen.d.ts`:

```typescript
import type {
  Part,
  TextPart,
  ToolPart,
  ReasoningPart,
  StepStartPart,
  StepFinishPart,
  FilePart,
  // Additional:
  // SnapshotPart, PatchPart, AgentPart, RetryPart, CompactionPart
} from '@opencode-ai/sdk'
```

**SDK Part shapes (from actual `types.gen.d.ts`):**

All parts share base fields: `id: string`, `sessionID: string`, `messageID: string`, `type: string`.

| Part | Key Fields |
|------|------------|
| `TextPart` | `type: 'text'`, `text: string`, `synthetic?: boolean` |
| `ToolPart` | `type: 'tool'`, `callID: string`, `tool: string`, `state: ToolState` |
| `ReasoningPart` | `type: 'reasoning'`, `text: string`, `time: { start, end? }` |
| `StepStartPart` | `type: 'step-start'`, `snapshot?: string` |
| `StepFinishPart` | `type: 'step-finish'`, `reason: string`, `cost: number`, `tokens: { input, output, reasoning, cache: { read, write } }` |
| `FilePart` | `type: 'file'`, `mime: string`, `url: string`, `filename?: string`, `source?: FilePartSource` |

**ToolState is a discriminated union by `status`:**
- `ToolStatePending` — `{ status: 'pending', input, raw }`
- `ToolStateRunning` — `{ status: 'running', input, title?, time: { start } }`
- `ToolStateCompleted` — `{ status: 'completed', input, output, title, time: { start, end }, attachments? }`
- `ToolStateError` — `{ status: 'error', input, error, time: { start, end } }`

**Note:** The SDK uses `ToolPart` (type `'tool'`), NOT `ToolInvocationPart` (type `'tool-invocation'`). 
The SDK uses `state.status` ('pending'|'running'|'completed'|'error'), NOT `state` ('call'|'partial-call'|'result').

**CodeNomad pattern (proven reference):**
```typescript
import type { Part as SDKPart } from "@opencode-ai/sdk"
// Then: switch(part.type) { case 'text': ... case 'tool': ... }
```

### Terminal — SDK Built-In PTY API (NOT node-pty)

**CRITICAL: OpenCode SDK has built-in PTY management. Do NOT use node-pty.**

The SDK provides a full `Pty` client class:

```typescript
// SDK PTY API (from sdk.gen.d.ts)
client.pty.create({ body: { command?, args?, cwd?, title?, env? } })  // → creates PTY
client.pty.connect({ path: { id } })                                   // → WebSocket to PTY
client.pty.update({ path: { id }, body: { size: { rows, cols } } })   // → resize
client.pty.list()                                                      // → list active PTYs
client.pty.remove({ path: { id } })                                   // → kill + cleanup
client.pty.get({ path: { id } })                                      // → get PTY info
```

**SDK `Pty` type:**
```typescript
type Pty = {
  id: string
  title: string
  command: string
  args: string[]
  cwd: string
  status: 'running' | 'exited'
  pid: number
}
```

**SDK PTY Events:**
- `pty.created` — new PTY session
- `pty.updated` — PTY info changed
- `pty.exited` — PTY process exited (includes `exitCode`)
- `pty.deleted` — PTY session removed

**Architecture:**
- **Frontend:** xterm.js Terminal + FitAddon connected to SDK PTY WebSocket
- **Backend:** SDK handles all PTY management — no custom WebSocket server needed
- **Connect flow:**
  1. `const pty = await client.pty.create({ body: { title: 'Terminal' } })` — creates PTY on OpenCode engine
  2. `client.pty.connect({ path: { id: pty.id } })` — returns WebSocket URL
  3. xterm.js connects to that WebSocket
  4. On resize: `client.pty.update({ path: { id }, body: { size: { rows, cols } } })`
  5. On close: `client.pty.remove({ path: { id } })`

**Packages needed (NEW):**
- `@xterm/xterm` — terminal emulator component (v5)
- `@xterm/addon-fit` — auto-resize terminal to container
- `@xterm/addon-attach` — attach terminal to WebSocket

**NOT needed:**
- ~~`node-pty`~~ — SDK manages PTY processes
- ~~custom WebSocket server~~ — SDK provides connect endpoint
- ~~`src/server/pty-server.ts`~~ — SDK is the server

### Settings — Server Functions Already Built

Settings CRUD is fully implemented in `app/server/settings.ts`:
- `getSettingFn` — read single setting
- `setSettingFn` — upsert setting
- `getAllSettingsFn` — list all settings
- `deleteSettingFn` — remove setting

Drizzle schema + SQLite backend ready. Only the UI stub needs fleshing out.

For provider/model management, use existing `getProvidersFn` and `getAgentsFn` from `app/server/config.ts`.

## Architecture Decisions

| Area | Decision | Rationale |
|------|----------|-----------|
| Chat parts | Import from `@opencode-ai/sdk` | SDK provides exact types; custom types will drift |
| Chat markdown | react-markdown (existing) | Already installed, React-native, no XSS risk |
| Terminal PTY | SDK `client.pty.*` API | Built-in, no native deps, handles lifecycle |
| Terminal emulator | @xterm/xterm v5 | Industry standard (VS Code uses it) |
| Settings storage | Drizzle + SQLite (existing) | Already built and working |
| Settings UI | Provider listing + model selection | SDK provides provider/model data |

## Don't Hand-Roll

- **Part types** — import from `@opencode-ai/sdk`, don't define custom types
- **PTY management** — use SDK PTY API, don't use node-pty
- Markdown rendering — use react-markdown (don't parse markdown manually)
- Syntax highlighting — use rehype-highlight (don't write a tokenizer)
- Terminal emulation — use xterm.js (don't build a VT100 parser)

## Common Pitfalls

1. **Part type mismatch** — SDK uses `ToolPart` (type `'tool'`), NOT `ToolInvocationPart` (type `'tool-invocation'`); don't confuse with AI SDK v4 types
2. **ToolState status** — SDK uses `'pending'|'running'|'completed'|'error'`, NOT `'call'|'partial-call'|'result'`
3. **StepFinishPart** — has `reason: string` (required), NOT `finishReason?: string` (optional)
4. **ReasoningPart** — text is in `.text` field, NOT `.reasoning` field
5. **xterm.js CSS import** — Must import `@xterm/xterm/css/xterm.css` or terminal renders without styling
6. **FitAddon timing** — Call `fitAddon.fit()` AFTER terminal is mounted and visible
7. **react-markdown code blocks** — Need custom code component for copy buttons and language badges
8. **PTY WebSocket URL** — SDK's `pty.connect()` returns a response you need to parse for the WS URL; check how sdk-client.server.ts constructs base URL

## SDK Client PTY Integration Notes

The existing `sdk-client.server.ts` creates the SDK client with `createOpencode()`. The PTY API is accessed via `client.pty.*`. The connect endpoint likely uses the same base URL + `/pty/{id}/connect` path. The frontend will need to construct the WebSocket URL from the SDK's HTTP base URL (replace `http://` with `ws://`).

From `sdk-client.server.ts`: the SDK runs on `http://localhost:${port}` where port defaults to `42069`. So PTY WebSocket URL would be `ws://localhost:42069/pty/{id}/connect`.
