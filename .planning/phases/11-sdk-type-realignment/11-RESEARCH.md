# Phase 11: SDK Type Realignment — Research (Integrity Audit 2026-02-11)

## SDK Type Audit (@opencode-ai/sdk@1.1.54)

Types exported from `node_modules/@opencode-ai/sdk/dist/gen/types.gen.d.ts` (3380 lines).
Client re-exports via `dist/client.d.ts`: `export * from "./gen/types.gen.js"`.
**Import path:** `import type { Session, Message, Part, SessionStatus, ... } from '@opencode-ai/sdk'`

---

## Critical Shape Differences (Hand-Rolled vs SDK)

### 1. SessionStatus — BREAKING CHANGE

**Hand-rolled (engine-types.ts:40):**
```ts
type SessionStatus = 'pending' | 'running' | 'completed' | 'error'
```

**SDK (types.gen.d.ts:396-405):**
```ts
type SessionStatus = { type: "idle" } | { type: "retry"; attempt: number } | { type: "answering" } | { type: "running" }
```

**Impact:** String comparison `status === 'running'` must become `status.type === 'running'`. Values differ too: SDK has `idle` / `answering` (no `pending` / `completed` / `error`). Frontend must handle object shape.

### 2. Session — Field Shape Changes

**Hand-rolled (engine-types.ts:42-49):**
```ts
interface Session {
  id: string; title?: string; createdAt: string; updatedAt: string;
  status: SessionStatus; parentId?: string;
}
```

**SDK (types.gen.d.ts:465-485):**
```ts
type Session = {
  id: string; projectID: string; directory: string; parentID?: string;
  title: string; description: string; createdAt: number; updatedAt: number;
  status: SessionStatus;  // the object union above
  modelID?: string; agentID?: string; providerID?: string;
  cost: { input: number; output: number; total: number };
  tokens: { input: number; output: number };
  share?: { id: string; url: string; version: number };
}
```

**Key differences:**
- `createdAt` / `updatedAt`: `string` → `number` (Unix timestamp seconds)
- `parentId` → `parentID` (casing)
- `status`: string union → object discriminated union
- Many new fields: `projectID`, `cost`, `tokens`, `modelID`, etc.

### 3. Message — Discriminated Union

**Hand-rolled (engine-types.ts:56-61):**
```ts
interface Message { id: string; role: 'user' | 'assistant' | 'system'; parts: Part[]; createdAt: string; }
```

**SDK (types.gen.d.ts:78-128):**
```ts
type UserMessage = {
  id: string; sessionID: string; role: "user";
  parts: Part[];
  time: { created: number; completed: number };
  system: boolean;
}
type AssistantMessage = {
  id: string; sessionID: string; role: "assistant";
  parts: Part[];
  time: { created: number; completed: number };
  cost: { input: number; output: number; total: number };
  tokens: { input: number; output: number };
  modelID: string; providerID: string;
}
type Message = UserMessage | AssistantMessage;
```

**Key differences:**
- No flat interface — discriminated union by `role` field
- No `createdAt` field — uses `time.created` (number, not string)
- No `system` role — UserMessage has `system: boolean` flag
- AssistantMessage has `cost`, `tokens`, `modelID`, `providerID`

### 4. Part — Rich Discriminated Union

**Hand-rolled (engine-types.ts:51-54):**
```ts
interface Part { type: string; [key: string]: unknown; }
```

**SDK (types.gen.d.ts:345-394):**
```ts
type Part = TextPart | { type: "subtask" } | ReasoningPart | FilePart | ToolPart
  | StepStartPart | StepFinishPart | SnapshotPart | PatchPart | AgentPart
  | RetryPart | CompactionPart
```

Where `TextPart` = `{ id, sessionID, messageID, type: "text", content: string }`, etc.

**Key differences:**
- Proper discriminated union instead of bag type
- Each part has `id`, `sessionID`, `messageID` fields
- TextPart has `content: string` (not arbitrary key)
- ToolPart has `name`, `input`, `output`, `state`, `duration`

### 5. Event — Similar Discriminated Pattern

**Hand-rolled:** `{ type: string; [key: string]: unknown }`
**SDK:** Named event types: `EventSessionUpdated`, `EventMessageUpdated`, `EventPartUpdated`, etc.

---

## Data Flow Analysis — Where Types Actually Matter

### Server Functions (app/server/)

| File | Imports engine-types? | What it returns |
|---|---|---|
| `sessions.ts` | **NO** | Raw SDK data via `unwrapSdkResult()` — SDK types flow through |
| `config.ts` | **YES** (ProviderInfo, AgentInfo) | Manually normalized app-specific shapes |
| `engine.ts` | **NO** | Imports from `sdk-client.server` directly |
| `validators.ts` | **NO** | Zod schemas only |

**Critical finding:** `sessions.ts` already returns SDK-shaped data at runtime. The hand-rolled types in `engine-types.ts` are NEVER used for mapping — they only exist as incorrect TypeScript annotations consumed by hooks/components.

### Hooks (app/hooks/)

| File | Imports engine-types? | What it consumes |
|---|---|---|
| `useSession.ts` | **NO** | Calls `getSessionsFn()` / `getSessionMessagesFn()` — receives SDK data |
| `useEngine.ts` | **NO** | Calls `getEngineStatusFn()` etc. |
| `useStreaming.ts` | **YES** (Message, Part) | SSE stream parsing — constructs local message objects |
| `useEventStream.tsx` | **NO** | Generic SSE event handling |

**Critical finding:** `useStreaming.ts` constructs Message objects locally from SSE events using the hand-rolled shape. This is the MOST impacted consumer — it builds fake Message objects that won't match SDK types.

### Components (app/components/)

| File | Imports engine-types? | What it uses |
|---|---|---|
| `chat/ChatMessage.tsx` | **YES** (Message, Part) | Renders messages — accesses `msg.role`, `msg.parts`, part types |
| `chat/ChatInput.tsx` | **NO** | Text input only |
| `layout/SessionSidebar.tsx` | **NO** | Session list rendering |

### Routes (app/routes/)

| File | Imports engine-types? | What it uses |
|---|---|---|
| `chat.$sessionId.tsx` | **YES** (Message) | Receives messages from hook, passes to ChatMessage |

---

## File Existence Verification

| Path | Exists? | Notes |
|---|---|---|
| `app/shared/engine-types.ts` | ✓ | 121 LOC, hand-rolled types |
| `app/shared/ide-types.ts` | ✓ | 107 LOC, re-exports + Phase 5/6 types |
| `app/server/sessions.ts` | ✓ | 156 LOC |
| `app/server/config.ts` | ✓ | 112 LOC |
| `app/server/engine.ts` | ✓ | 82 LOC |
| `app/server/validators.ts` | ✓ | 54 LOC |
| `app/hooks/useSession.ts` | ✓ | Uses getSessionsFn |
| `app/hooks/useStreaming.ts` | ✓ | Constructs Message/Part objects |
| `app/hooks/useEngine.ts` | ✓ | Engine lifecycle hooks |
| `app/hooks/useEventStream.tsx` | ✓ | SSE provider |
| `app/components/chat/ChatMessage.tsx` | ✓ | Renders messages |
| `app/components/chat/ChatInput.tsx` | ✓ | Text input |
| `app/components/layout/SessionSidebar.tsx` | ✓ | Session list |
| `app/routes/chat.$sessionId.tsx` | ✓ | Chat page |
| ~~`app/components/chat/SessionSidebar.tsx`~~ | ✗ | **DOES NOT EXIST** |
| ~~`app/components/layout/SidebarNav.tsx`~~ | ✗ | **DOES NOT EXIST** |

---

## Types to Keep as App-Specific (No SDK Equivalent)

These types have no SDK counterpart and should remain in `engine-types.ts`:

- `ProviderInfo`, `ModelInfo` — normalized provider shape (config.ts maps into these)
- `AgentInfo` — normalized agent shape
- `AppInfo` — composed from path + vcs SDK calls
- `EngineStatus` — engine lifecycle tracking
- `DashboardConfig`, `PortConfig` — dashboard configuration
- `SessionPromptRequest` — prompt input shape
- `SessionListResponse`, `SessionCreateResponse`, etc. — app response wrappers (may become obsolete if we use SDK types directly)

---

## Migration Strategy

### Plan 01 — Type Foundation (Wave 1)
1. Rewrite `engine-types.ts`: Replace hand-rolled Session, Message, Part, SessionStatus, Event with SDK re-exports. Keep app-specific types.
2. Update `ide-types.ts`: Adjust re-exports to include new SDK types (UserMessage, AssistantMessage, TextPart, etc.)
3. Add SDK type annotations to `sessions.ts` return types for type safety across server function boundary.

### Plan 02 — Consumer Migration (Wave 2)
1. Update `useStreaming.ts`: The most impacted file — must construct SDK-shaped Message objects from SSE events.
2. Update `ChatMessage.tsx`: Handle `Message` as union type, access `time.created` instead of `createdAt`, handle Part discriminated union.
3. Update `chat.$sessionId.tsx`: Adjust message handling for SDK types.
4. Remove or update response wrapper types that duplicate SDK types.

### Risk: TanStack Start Serialization
SDK types use `unknown` in index signatures which conflicts with TanStack Start's `JsonValue` constraint. `sessions.ts` already works around this with `JSON.parse(JSON.stringify())`. This workaround must be preserved.

---

## Typecheck Baseline

```
npm run typecheck → tsc --noEmit → CLEAN (zero errors)
npm test → 10 suites, 512 assertions → ALL PASS
```

Phase 11 must maintain this baseline.
