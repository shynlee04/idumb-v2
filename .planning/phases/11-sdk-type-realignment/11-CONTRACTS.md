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

## 9. Consumer Map

| Consumer File | SDK Types Used | Access Pattern |
|--------------|---------------|----------------|
| `app/shared/engine-types.ts` | Session, Message, Part, SessionStatus | **Re-export** (type-only) |
| `app/server/sdk-client.server.ts` | `OpenCodeClient`, `EventNotification` | **Direct SDK import** (allowed — singleton) |
| `app/server/sessions.ts` | Session, Message | **Inferred** from SDK client return types |
| `app/server/config.ts` | Provider, Agent | **Inferred** from SDK client return types |
| `app/hooks/useStreaming.ts` | Message, Part | **Explicit import** from `engine-types.ts` |
| `app/hooks/useSession.ts` | Session, Message | **Inferred** from server function return types |
| `app/hooks/useEngine.ts` | EngineStatus (app type) | No SDK types directly |
| `app/components/chat/ChatMessage.tsx` | Message, Part | **Explicit import** from `engine-types.ts`, narrows Part by `type` discriminant |
| `app/routes/chat.$sessionId.tsx` | Session, Message | **Explicit import** from `engine-types.ts` |
| `app/routes/api/events.ts` | Event types (all session/message events) | **Inferred** from `sdk.client.event.subscribe()` |
| `app/routes/api/sessions.$id.prompt.ts` | EventMessagePartUpdated | **Inferred** from `sdk.client.event.subscribe()` |

---

## 10. Gap Analysis

### Currently Re-exported (4 types)

- `Session` ✅
- `Message` ✅
- `Part` ✅
- `SessionStatus` ✅

### Missing — Required for Type-Safe Narrowing

| Category | Types | Why Needed |
|----------|-------|------------|
| **Part subtypes** | TextPart, ToolPart, FilePart, ReasoningPart, StepStartPart, StepFinishPart, SnapshotPart, PatchPart, AgentPart, RetryPart, CompactionPart | ChatMessage.tsx narrows Part by `type` discriminant. Without explicit subtypes, consumers can't annotate narrowed variables or create typed helpers. |
| **Message subtypes** | UserMessage, AssistantMessage | ChatMessage.tsx narrows by `role`. AssistantMessage has unique fields (error, cost, tokens) only accessible after narrowing. Explicit types enable typed guards. |
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
