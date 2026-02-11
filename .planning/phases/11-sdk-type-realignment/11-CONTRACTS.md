# SDK Type Contract Registry — @opencode-ai/sdk@1.1.54

**Source:** `node_modules/@opencode-ai/sdk/dist/gen/types.gen.d.ts` (3380 lines)
**Audited:** 2026-02-11
**Gateway:** `app/shared/engine-types.ts` — ALL app/ files import SDK types through here

---

## Table of Contents

1. [Core Types](#1-core-types) — Session, Message, Part, SessionStatus
2. [Message Subtypes](#2-message-subtypes) — UserMessage, AssistantMessage
3. [Part Subtypes](#3-part-subtypes) — 12-member discriminated union
4. [Tool State Types](#4-tool-state-types) — ToolState discriminated union
5. [Error Types](#5-error-types) — 5-member error union
6. [Event Types](#6-event-types) — SSE event payloads
7. [Config Types](#7-config-types) — Provider, Agent, Model
8. [Auxiliary Types](#8-auxiliary-types) — FileDiff, FilePartSource, etc.
9. [Consumer Map](#9-consumer-map) — SDK type → consumer file → access pattern
10. [Gap Analysis](#10-gap-analysis) — Missing re-exports
11. [Violation Scan](#11-violation-scan) — Direct SDK imports

---

## 1. Core Types

### `Session`

```typescript
type Session = {
  id: string
  projectID: string
  directory: string
  parentID?: string
  summary?: {
    additions: number
    deletions: number
    files: number
    diffs?: Array<FileDiff>
  }
  share?: { url: string }
  title: string
  version: string
  time: {
    created: number
    updated: number
    compacting?: number
  }
  revert?: {
    messageID: string
    partID?: string
    snapshot?: string
    diff?: string
  }
}
```

**Consumers:** `sessions.ts` (return type), `useSession.ts` (inferred), `chat.$sessionId.tsx` (explicit import), `engine-types.ts` (re-export)

### `Message`

```typescript
type Message = UserMessage | AssistantMessage
```

**Discriminant:** `role: "user" | "assistant"`
**Consumers:** `sessions.ts` (return type), `useStreaming.ts` (explicit import), `ChatMessage.tsx` (explicit import), `chat.$sessionId.tsx` (explicit import)

### `Part`

```typescript
type Part = TextPart
  | { id: string; sessionID: string; messageID: string; type: "subtask"; prompt: string; description: string; agent: string }
  | ReasoningPart | FilePart | ToolPart
  | StepStartPart | StepFinishPart
  | SnapshotPart | PatchPart
  | AgentPart | RetryPart | CompactionPart
```

**Discriminant:** `type: "text" | "subtask" | "reasoning" | "file" | "tool" | "step-start" | "step-finish" | "snapshot" | "patch" | "agent" | "retry" | "compaction"`
**Note:** The "subtask" member is an inline anonymous type — no named export.
**Consumers:** `useStreaming.ts` (explicit import), `ChatMessage.tsx` (explicit import, narrowed by `type`)

### `SessionStatus`

```typescript
type SessionStatus =
  | { type: "idle" }
  | { type: "retry"; attempt: number; message: string; next: number }
  | { type: "busy" }
```

**Discriminant:** `type: "idle" | "retry" | "busy"`
**Consumers:** `engine-types.ts` (re-export), `useStreaming.ts` (used to detect busy state)

---

## 2. Message Subtypes

### `UserMessage`

```typescript
type UserMessage = {
  id: string
  sessionID: string
  role: "user"
  time: {
    created: number
    completed?: number
  }
  parts: Array<Part>
  parentID?: string
}
```

**Re-exported:** NO
**Consumers:** Implicitly via `Message` union narrowing on `role === "user"` in `ChatMessage.tsx`

### `AssistantMessage`

```typescript
type AssistantMessage = {
  id: string
  sessionID: string
  role: "assistant"
  time: {
    created: number
    completed?: number
  }
  error?: ProviderAuthError | UnknownError | MessageOutputLengthError | MessageAbortedError | ApiError
  parentID: string
  modelID: string
  providerID: string
  mode: string
  path: { cwd: string; root: string }
  summary?: boolean
  cost: number
  tokens: {
    input: number
    output: number
    reasoning: number
    cache: { read: number; write: number }
  }
  finish?: string
}
```

**Re-exported:** NO
**Consumers:** Implicitly via `Message` union narrowing on `role === "assistant"` in `ChatMessage.tsx`. The `error`, `cost`, `tokens` fields are assistant-specific and can only be accessed after narrowing.

---

## 3. Part Subtypes

### `TextPart`

```typescript
type TextPart = {
  id: string; sessionID: string; messageID: string
  type: "text"
  text: string
  synthetic?: boolean
  ignored?: boolean
  time?: { start: number; end?: number }
  metadata?: { [key: string]: unknown }
}
```

**Narrowing:** `part.type === "text"` in `ChatMessage.tsx`, `useStreaming.ts`
**Key field access after narrowing:** `part.text`

### `ReasoningPart`

```typescript
type ReasoningPart = {
  id: string; sessionID: string; messageID: string
  type: "reasoning"
  text: string
  metadata?: { [key: string]: unknown }
  time: { start: number; end?: number }
}
```

**Narrowing:** `part.type === "reasoning"` in `ChatMessage.tsx`

### `FilePart`

```typescript
type FilePart = {
  id: string; sessionID: string; messageID: string
  type: "file"
  mime: string
  filename?: string
  url: string
  source?: FilePartSource
}
```

**Narrowing:** `part.type === "file"` in `ChatMessage.tsx`

### `ToolPart`

```typescript
type ToolPart = {
  id: string; sessionID: string; messageID: string
  type: "tool"
  callID: string
  tool: string
  state: ToolState
  metadata?: { [key: string]: unknown }
}
```

**Narrowing:** `part.type === "tool"` in `ChatMessage.tsx`
**Key field access after narrowing:** `part.tool`, `part.state`, `part.state.status`

### `StepStartPart`

```typescript
type StepStartPart = {
  id: string; sessionID: string; messageID: string
  type: "step-start"
  snapshot?: string
}
```

### `StepFinishPart`

```typescript
type StepFinishPart = {
  id: string; sessionID: string; messageID: string
  type: "step-finish"
  reason: string
  snapshot?: string
  cost: number
  tokens: {
    input: number; output: number; reasoning: number
    cache: { read: number; write: number }
  }
}
```

### `SnapshotPart`

```typescript
type SnapshotPart = {
  id: string; sessionID: string; messageID: string
  type: "snapshot"
  snapshot: string
}
```

### `PatchPart`

```typescript
type PatchPart = {
  id: string; sessionID: string; messageID: string
  type: "patch"
  hash: string
  files: Array<string>
}
```

### `AgentPart`

```typescript
type AgentPart = {
  id: string; sessionID: string; messageID: string
  type: "agent"
  name: string
  source?: { value: string; start: number; end: number }
}
```

### `RetryPart`

```typescript
type RetryPart = {
  id: string; sessionID: string; messageID: string
  type: "retry"
  attempt: number
  error: ApiError
  time: { created: number }
}
```

### `CompactionPart`

```typescript
type CompactionPart = {
  id: string; sessionID: string; messageID: string
  type: "compaction"
  auto: boolean
}
```

---

## 4. Tool State Types

### `ToolState`

```typescript
type ToolState = ToolStatePending | ToolStateRunning | ToolStateCompleted | ToolStateError
```

**Discriminant:** `status: "pending" | "running" | "completed" | "error"`

### `ToolStatePending`

```typescript
type ToolStatePending = {
  status: "pending"
  input: { [key: string]: unknown }
  raw: string
}
```

### `ToolStateRunning`

```typescript
type ToolStateRunning = {
  status: "running"
  input: { [key: string]: unknown }
  title?: string
  metadata?: { [key: string]: unknown }
  time: { start: number }
}
```

### `ToolStateCompleted`

```typescript
type ToolStateCompleted = {
  status: "completed"
  input: { [key: string]: unknown }
  output: string
  title: string
  metadata: { [key: string]: unknown }
  time: { start: number; end: number; compacted?: number }
  attachments?: Array<FilePart>
}
```

### `ToolStateError`

```typescript
type ToolStateError = {
  status: "error"
  input: { [key: string]: unknown }
  error: string
  metadata?: { [key: string]: unknown }
  time: { start: number; end: number }
}
```

---

## 5. Error Types

Used in `AssistantMessage.error` and `EventSessionError.properties.error`.

### `ProviderAuthError`

```typescript
type ProviderAuthError = {
  name: "ProviderAuthError"
  data: {
    providerID: string
    message: string
  }
}
```

### `UnknownError`

```typescript
type UnknownError = {
  name: "UnknownError"
  data: { message: string }
}
```

### `MessageOutputLengthError`

```typescript
type MessageOutputLengthError = {
  name: "MessageOutputLengthError"
  data: { message: string }
}
```

### `MessageAbortedError`

```typescript
type MessageAbortedError = {
  name: "MessageAbortedError"
  data: { message: string }
}
```

### `ApiError`

```typescript
type ApiError = {
  name: "APIError"
  data: {
    message: string
    statusCode?: number
    isRetryable: boolean
    responseHeaders?: { [key: string]: string }
    responseBody?: string
  }
}
```

---

## 6. Event Types

Used server-side in SSE routes. Currently narrowed by string literal `event.type` checks, NOT by imported event types.

### Session Events

| Type | `type` Discriminant | Properties | Used In |
|------|-------------------|------------|---------|
| `EventSessionCreated` | `"session.created"` | `{ info: Session }` | `api/events.ts` |
| `EventSessionUpdated` | `"session.updated"` | `{ info: Session }` | `api/events.ts` |
| `EventSessionDeleted` | `"session.deleted"` | `{ info: Session }` | `api/events.ts` |
| `EventSessionDiff` | `"session.diff"` | `{ sessionID: string; diff: Array<FileDiff> }` | `api/events.ts` |
| `EventSessionError` | `"session.error"` | `{ sessionID?: string; error?: ErrorUnion }` | `api/events.ts` |
| `EventSessionStatus` | `"session.status"` | `{ sessionID: string; status: SessionStatus }` | `api/events.ts` |
| `EventSessionIdle` | `"session.idle"` | `{ sessionID: string }` | Not consumed |
| `EventSessionCompacted` | `"session.compacted"` | `{ sessionID: string }` | Not consumed |

### Message Events

| Type | `type` Discriminant | Properties | Used In |
|------|-------------------|------------|---------|
| `EventMessageUpdated` | `"message.updated"` | `{ info: Message }` | `api/events.ts` |
| `EventMessageRemoved` | `"message.removed"` | `{ sessionID: string; messageID: string }` | `api/events.ts` |
| `EventMessagePartUpdated` | `"message.part.updated"` | `{ part: Part; delta?: string }` | `api/events.ts`, `api/sessions.$id.prompt.ts` |
| `EventMessagePartRemoved` | `"message.part.removed"` | `{ sessionID: string; messageID: string; partID: string }` | Not consumed |

### Other Events (Not Consumed by App)

| Type | `type` Discriminant |
|------|-------------------|
| `EventTodoUpdated` | `"todo.updated"` |
| `EventCommandExecuted` | `"command.executed"` |
| `EventFileWatcherUpdated` | `"file.watcher.updated"` |
| `EventFileEdited` | `"file.edited"` |
| `EventVcsBranchUpdated` | `"vcs.branch.updated"` |
| `EventTuiPromptAppend` | `"tui.prompt.append"` |
| `EventTuiCommandExecute` | `"tui.command.execute"` |

---

## 7. Config Types

Used by `app/server/config.ts` via SDK client methods. Return types are inferred, not imported.

### `Provider`

```typescript
type Provider = {
  id: string
  name: string
  source: "env" | "config" | "custom" | "api"
  env: Array<string>
  key?: string
  options: { [key: string]: unknown }
  models: { [key: string]: Model }
}
```

**Consumer:** `config.ts` → `getProvidersFn()` returns `Provider[]` (inferred)

### `Agent`

```typescript
type Agent = {
  name: string
  description?: string
  mode: "subagent" | "primary" | "all"
  builtIn: boolean
  topP?: number
  temperature?: number
  color?: string
  permission: {
    edit: "ask" | "allow" | "deny"
    bash: { [key: string]: "ask" | "allow" | "deny" }
    webfetch?: "ask" | "allow" | "deny"
    doom_loop?: "ask" | "allow" | "deny"
    external_directory?: "ask" | "allow" | "deny"
  }
  model?: { modelID: string; providerID: string }
  prompt?: string
  tools: { [key: string]: boolean }
  options: { [key: string]: unknown }
  maxSteps?: number
}
```

**Consumer:** `config.ts` → `getAgentsFn()` returns `Agent[]` (inferred)

### `Model`

```typescript
type Model = {
  id: string
  providerID: string
  api: { id: string; url: string; npm: string }
  name: string
  capabilities: {
    temperature: boolean; reasoning: boolean; attachment: boolean; toolcall: boolean
    input: { text: boolean; audio: boolean; image: boolean; video: boolean; pdf: boolean }
    output: { text: boolean; audio: boolean; image: boolean; video: boolean; pdf: boolean }
  }
  cost: {
    input: number; output: number
    cache: { read: number; write: number }
    experimentalOver200K?: { input: number; output: number; cache: { read: number; write: number } }
  }
  limit: { context: number; output: number }
  status: "alpha" | "beta" | "deprecated" | "active"
  options: { [key: string]: unknown }
  headers: { [key: string]: string }
}
```

**Consumer:** Nested inside `Provider.models`. Not directly consumed yet.

---

## 8. Auxiliary Types

### `FileDiff`

```typescript
type FileDiff = {
  file: string
  before: string
  after: string
  additions: number
  deletions: number
}
```

**Consumer:** Referenced by `Session.summary.diffs` and `EventSessionDiff.properties.diff`

### `FilePartSource`

```typescript
type FilePartSource = FileSource | SymbolSource

type FileSource = {
  text: FilePartSourceText
  type: "file"
  path: string
}

type SymbolSource = {
  text: FilePartSourceText
  type: "symbol"
  path: string
  range: Range
  name: string
  kind: number
}

type FilePartSourceText = {
  value: string
  start: number
  end: number
}
```

**Consumer:** Referenced by `FilePart.source`. Not directly consumed yet.

### `Path`

```typescript
type Path = {
  state: string
  config: string
  data: string
  log: string
  bin: string
}
```

**Consumer:** Not currently consumed by app.

---

## 9. Consumer Map — Detailed Cross-Reference

### Summary Table

| File | SDK Types Used | Properties Accessed | Issues |
|------|---------------|---------------------|--------|
| `engine-types.ts` | Session, Message, Part, SessionStatus, UserMessage, AssistantMessage, TextPart, ToolPart, FilePart, ReasoningPart, StepStartPart, StepFinishPart, SnapshotPart, PatchPart, AgentPart, RetryPart, CompactionPart | N/A (re-export gateway) | ToolState/Error types not re-exported |
| `sdk-client.server.ts` | OpenCodeClient, EventNotification | `client.session.*`, `client.event.subscribe()`, `result.data`, `result.error` | Direct SDK import (allowed — singleton) |
| `sessions.ts` | Session, Message, Part, SessionStatus | `session.id`, `session.title`, `session.time.updated`, `message.id`, `message.parts` | `JSON.parse(JSON.stringify())` workaround for TanStack Start serialization |
| `config.ts` | Provider, Agent | `provider.id`, `provider.name`, `provider.models`, `agent.name`, `agent.description` | Types inferred, not imported — if SDK changes shapes, no compile-time error |
| `useStreaming.ts` | Message, Part | `m.id`, `m.parts`, `part.messageID`, `part.id`, `data.message`, `data.part` | SSE `JSON.parse()` returns untyped data (`any`). Part/Message narrowing happens implicitly. |
| `useSession.ts` | Session, Message | Inferred from server function return types | No direct SDK type imports — safe |
| `useEngine.ts` | EngineStatus (app type only) | N/A | No SDK type dependency |
| `ChatMessage.tsx` | Message, Part | `message.role`, `message.id`, `part.type`, `part.text` (after narrowing) | Narrows Part by `type` discriminant in switch/if. Could benefit from ToolState narrowing for tool output rendering. |
| `chat.$sessionId.tsx` | Session, Message | `session.id`, `session.title`, `messages[].info.id`, `messages[].parts` | Explicit import from engine-types |
| `api/events.ts` | All session/message event types (inferred) | `event.type`, `event.properties.info`, `event.properties.sessionID`, `event.properties.status` | Event type narrowing via string literal — no imported event types |
| `api/sessions.$id.prompt.ts` | EventMessagePartUpdated (inferred) | `event.type`, `event.properties.part`, `event.properties.delta`, `event.properties.part.messageID` | Same SSE string narrowing pattern |

### Per-File Detail

#### 1. `app/server/sdk-client.server.ts` (259 LOC)

**SDK import:** `import { OpenCodeClient } from '@opencode-ai/sdk'` (ALLOWED — sole instantiation point)

**SDK methods called:**
| Method | Return Shape | Used Properties |
|--------|-------------|-----------------|
| `client.session.list()` | `{ data: Session[] }` | `.data` → Session array |
| `client.session.create()` | `{ data: Session }` | `.data` → single Session |
| `client.session.get()` | `{ data: Session }` | `.data.id`, `.data.title` |
| `client.session.delete()` | `{ data: void }` | success/error only |
| `client.session.chat()` | `{ data: Message[] }` | `.data` → Message array |
| `client.session.abort()` | `{ data: void }` | success/error only |
| `client.session.status()` | `{ data: SessionStatus }` | `.data.type` |
| `client.session.children()` | `{ data: Session[] }` | `.data` → Session array |
| `client.provider.list()` | `{ data: Record<string, Provider> }` | Provider values |
| `client.agent.list()` | `{ data: Record<string, Agent> }` | Agent values |
| `client.event.subscribe()` | `EventNotification` (SSE) | `.type`, `.properties` |

**Pattern:** `unwrapSdkResult<T>(result)` helper extracts `.data` and throws on `.error`. This generic function preserves SDK type fidelity.

**Violations:** None

#### 2. `app/server/sessions.ts` (~230 LOC)

**SDK types used:** Session, Message, Part, SessionStatus (all inferred from `unwrapSdkResult<T>` returns)

**Properties accessed:**
- `session.id`, `session.title`, `session.time`
- `message.id`, `message.parts`, `message.role`
- `status.type` (SessionStatus discriminant)

**Serialization workaround:** Uses `JSON.parse(JSON.stringify(data))` to satisfy TanStack Start server function return constraints (`JsonValue` type). This erases type information at the serialization boundary.

**Issues:**
- ⚠️ `JSON.parse(JSON.stringify())` bridge loses runtime type narrowing
- ⚠️ Return types from server functions are inferred as the JSON-serialized shape, not the SDK type directly

#### 3. `app/hooks/useStreaming.ts` (~163 LOC)

**SDK types imported:** `Message`, `Part` from `engine-types.ts`

**Properties accessed on SSE data (untyped `JSON.parse` result):**
- `data.message` → used as `Message` (no validation)
- `data.message.id` → string access
- `data.part` → used as `Part` (no validation)
- `data.part.messageID` → string for message matching
- `data.part.id` → string for part matching
- `m.parts` → `Part[]` array

**Type narrowing:** Message array state typed as `Message[]`. SSE data parsed via `JSON.parse()` without Zod validation — **untyped boundary**.

**Issues:**
- ⚠️ SSE JSON.parse returns `any` — SDK types assumed, not validated
- ⚠️ Part replacement logic (`m.parts.map(p => p.id === data.part.id ? data.part : p)`) assumes all Parts have `id` field (true per SDK types)

#### 4. `app/components/chat/ChatMessage.tsx` (~120 LOC)

**SDK types imported:** `Message`, `Part` from `engine-types.ts`

**Properties accessed:**
- `message.role` → discriminant for user/assistant styling
- `message.id` → key prop
- `message.parts` → iterated for rendering
- `part.type` → discriminant switch: `"text"`, `"tool"`, `"reasoning"`, `"file"`, `"step-start"`, `"step-finish"`, `"agent"`, `"compaction"`, `"retry"`
- `part.text` → after `part.type === "text"` narrowing
- `part.tool` → after `part.type === "tool"` narrowing
- `part.state.status` → nested ToolState discriminant
- `part.name` → after `part.type === "agent"` narrowing

**Type narrowing patterns:**
```typescript
// Part narrowing (correct pattern)
if (part.type === 'text') { /* part.text accessible */ }
if (part.type === 'tool') { /* part.tool, part.state accessible */ }
```

**Issues:**
- ⚠️ ToolState not narrowed beyond `part.state.status` check — `state.output` (only on ToolStateCompleted) accessed without status narrowing in some render paths
- ⚠️ No exhaustive Part handling — unknown part types silently ignored (acceptable but fragile)

#### 5. `app/routes/chat.$sessionId.tsx` (~190 LOC)

**SDK types imported:** `Session`, `Message` from `engine-types.ts`

**Properties accessed:**
- `session.id`, `session.title` (display)
- `messages` typed as `Array<{ info: Message; parts: Part[] }>` from `SessionMessagesResponse`

**Issues:** None — clean import pattern

#### 6. `app/routes/api/events.ts` (~100 LOC)

**SDK types used:** All event types (inferred from `sdk.client.event.subscribe()`)

**Event type narrowing:**
```typescript
// String literal checks on event.type:
event.type === 'session.created'  // → EventSessionCreated
event.type === 'session.updated'  // → EventSessionUpdated
event.type === 'session.deleted'  // → EventSessionDeleted
event.type === 'message.updated'  // → EventMessageUpdated
event.type === 'message.part.updated' // → EventMessagePartUpdated
// etc.
```

**Properties accessed after narrowing:**
- `event.properties` → forwarded as JSON to SSE stream
- No individual property access — entire `properties` object serialized

**Issues:**
- ⚠️ Event type narrowing uses string literals, not imported event types — no compile-time exhaustiveness checking
- ⚠️ `event.properties` typed as `any` after `JSON.stringify()` — consumer (client-side useStreaming) gets untyped data

#### 7. `app/server/config.ts` (~170 LOC)

**SDK types used:** Provider, Agent (inferred from SDK client returns)

**Properties accessed:**
- `providers` iterated → `provider.id`, `provider.name`, `provider.models`
- `agents` iterated → `agent.name`, `agent.description`
- Models extracted from `provider.models` → `model.id`, `model.name`

**Issues:**
- Types are inferred only — no explicit SDK type annotation on return values
- If SDK changes Provider/Agent shapes, compile error would only appear in sdk-client.server.ts, not in config.ts

### Issue Priority for Future Plans

| Priority | Issue | Affected Files | Planned Fix |
|----------|-------|---------------|-------------|
| **High** | SSE boundary untyped (`JSON.parse → any`) | useStreaming.ts, api/events.ts | Plan 11-03: Zod validators at parse boundary |
| **High** | ToolState not narrowed in render | ChatMessage.tsx | Plan 11-04: Type-safe Part rendering |
| **Medium** | Event types not imported for narrowing | api/events.ts, api/sessions.$id.prompt.ts | Plan 11-03: Event type re-exports |
| **Medium** | JSON.parse(JSON.stringify()) serialization | sessions.ts | Plan 11-02: Investigate TanStack Start constraints |
| **Low** | Config types inferred, not explicit | config.ts | Defer — compile errors still caught upstream |

---

## Gotchas & Drift Risks

Known SDK type behaviors that deviate from common assumptions:

1. **`time.created` is `number` (epoch ms), not `Date` or ISO string.** All time fields in Session, Message, and Part use numeric epoch timestamps. Client-side rendering must convert: `new Date(time.created)`. If SDK ever changes to ISO strings, all time formatting breaks silently.

2. **`Message.parts` is `Part[]` (required), but may be empty array at runtime.** The SDK type marks `parts` as non-optional, but a freshly created message may have `parts: []` before any content arrives. UI code should handle empty arrays gracefully.

3. **`Session.title` may be empty string `""`, not `null` or `undefined`.** The SDK type is `title: string` (required, non-optional). But newly created sessions have `title: ""` until the first message generates a summary. Falsy checks (`if (!session.title)`) work correctly but `session.title ?? 'Untitled'` does NOT (empty string is not nullish).

4. **`AssistantMessage.error` is a 5-member discriminated union on `name`.** NOT a simple `string`. The `name` field is a string literal union (`"ProviderAuthError" | "UnknownError" | "MessageOutputLengthError" | "MessageAbortedError" | "APIError"`). Direct `error.message` access without narrowing will fail — the message is inside `error.data.message`.

5. **`Part` union has an anonymous inline member for `type: "subtask"`.** Unlike all other Part subtypes which have named exports (TextPart, ToolPart, etc.), the subtask member is inline. There is no `SubtaskPart` export — you must use the full Part union and narrow by `type === "subtask"`.

6. **`ToolState.input` is `{ [key: string]: unknown }`, not typed per-tool.** Tool input shapes vary by tool (different tools have different parameters). The SDK cannot type them specifically — consumers must cast or validate at runtime.

7. **`ToolStateCompleted.metadata` is required, but `ToolStateRunning.metadata` is optional.** The `metadata` field changes nullability based on the ToolState discriminant — don't assume it's always present without narrowing `status`.

8. **`SessionStatus` only has 3 members: `"idle" | "retry" | "busy"`.** There is NO `"error"` or `"completed"` status. Session errors come through `AssistantMessage.error` or `EventSessionError`, not through SessionStatus.

9. **SSE events use `properties` not `data`.** The event payload is at `event.properties`, NOT `event.data`. This differs from standard SSE convention. The `EventNotification` wrapper type enforces this but if consuming raw SSE without the SDK client, this would be a silent bug.

10. **`Provider.models` is `{ [key: string]: Model }`, not `Model[]`.** Models are keyed by model ID string, not stored as an array. Consumer code must use `Object.values(provider.models)` to iterate.

---

## 10. Gap Analysis

### Currently Re-exported (17 types)

- `Session` ✅
- `SessionStatus` ✅
- `Message` ✅
- `UserMessage` ✅
- `AssistantMessage` ✅
- `Part` ✅
- `TextPart` ✅
- `ToolPart` ✅
- `FilePart` ✅
- `ReasoningPart` ✅
- `StepStartPart` ✅
- `StepFinishPart` ✅
- `SnapshotPart` ✅
- `PatchPart` ✅
- `AgentPart` ✅
- `RetryPart` ✅
- `CompactionPart` ✅

### Missing — Required for Type-Safe Narrowing

| Category | Types | Why Needed |
|----------|-------|------------|
| **Tool state** | ToolState, ToolStatePending, ToolStateRunning, ToolStateCompleted, ToolStateError | ToolPart.state is a discriminated union on `status`. Rendering tool output requires narrowing to ToolStateCompleted for `output`, ToolStateError for `error`. |
| **Error types** | ProviderAuthError, UnknownError, MessageOutputLengthError, MessageAbortedError, ApiError | AssistantMessage.error is a 5-member union on `name`. Error display requires narrowing. |

### Missing — Recommended for Future Phases

| Category | Types | Why Needed |
|----------|-------|------------|
| **Event types** | EventMessagePartUpdated, EventMessageUpdated, EventMessageRemoved, EventSessionCreated, EventSessionUpdated, EventSessionDeleted, EventSessionStatus, EventSessionError, EventSessionDiff | SSE routes parse events with `event.type` string checks. Event types would enable typed switch/case and compile-time exhaustiveness checking. **Defer to Phase 11-03/04.** |
| **Config types** | Provider, Agent, Model | Currently inferred from server function returns. Explicit re-exports would help if client-side components need to annotate these types. **Defer until client-side consumption is needed.** |
| **Auxiliary types** | FileDiff, FilePartSource, Path | Referenced indirectly through nested fields. Low priority. |

---

## 11. Violation Scan

### Direct SDK Imports

| File | Import | Status |
|------|--------|--------|
| `app/server/sdk-client.server.ts` | `import { OpenCodeClient } from '@opencode-ai/sdk'` | **ALLOWED** — SDK client singleton, sole point of SDK instantiation |
| `app/shared/engine-types.ts` | `export type { ... } from '@opencode-ai/sdk'` | **ALLOWED** — Type re-export gateway |

### Violations Found

**None.** All consumer files import SDK types through `engine-types.ts` or use inferred types from server function returns.

### `as any` Casts on SDK Types

**None found in current consumer files.**

### `@ts-ignore` Suppressions on SDK Types

**None found in current consumer files.**

---

## SDK Version Contract

- **Current:** `@opencode-ai/sdk@1.1.54`
- **Import path:** `@opencode-ai/sdk` (barrel export, resolves to `dist/gen/types.gen.d.ts`)
- **Total exported types:** ~80+ (types, events, config, API operations)
- **Types consumed by this app:** ~30 (4 re-exported, 26 via inference/narrowing)

### Upgrade Protocol

When upgrading `@opencode-ai/sdk`:
1. Read SDK changelog for type changes
2. Update this document (`11-CONTRACTS.md`) with new/changed shapes
3. Run `tsc --noEmit` — verify zero errors
4. Check `engine-types.ts` re-exports still resolve
5. Test Part/Message narrowing in ChatMessage.tsx still works

---

*Generated: 2026-02-11 | SDK: @opencode-ai/sdk@1.1.54*
