# Phase 11: SDK Type Realignment — Research

## SDK Type Audit (@opencode-ai/sdk@1.1.54)

Types exported from `node_modules/@opencode-ai/sdk/dist/gen/types.gen.d.ts`:

### Core Data Types
| SDK Type | Shape | Notes |
|----------|-------|-------|
| `Session` | `{id, projectID, directory, parentID?, title, version, time: {created: number, updated: number, compacting?}, summary?, share?, revert?}` | Rich — timestamps are numbers, not ISO strings |
| `Message` | `UserMessage \| AssistantMessage` | Discriminated union on `role` |
| `UserMessage` | `{id, sessionID, role:"user", time:{created}, summary?, agent, model:{providerID, modelID}, system?, tools?}` | No `parts` field — parts are separate entities |
| `AssistantMessage` | `{id, sessionID, role:"assistant", time:{created, completed?}, error?, parentID, modelID, providerID, mode, path, cost, tokens:{input,output,reasoning,cache:{read,write}}, finish?}` | Rich with cost/token data |
| `Part` | Union of 12 types: `TextPart \| SubtaskPart \| ReasoningPart \| FilePart \| ToolPart \| StepStartPart \| StepFinishPart \| SnapshotPart \| PatchPart \| AgentPart \| RetryPart \| CompactionPart` | Proper discriminated union on `type` field |
| `Event` | Union of 30+ event types | Discriminated union on `type` field (e.g. `"message.updated"`, `"message.part.updated"`) |
| `SessionStatus` | `{type:"idle"} \| {type:"retry", attempt, message, next} \| {type:"busy"}` | **BREAKING**: Not a string union |
| `Provider` | `{id, name, source, env, key?, options, models: Record<string, Model>}` | `models` is Record, not Array |
| `Model` | `{id, providerID, api, name, capabilities, cost, limit, status, options, headers}` | Very rich |
| `Agent` | `{name, description?, mode, builtIn, topP?, temperature?, color?, permission, model?, prompt?, tools, options, maxSteps?}` | Full config |
| `Pty` | `{id, title, command, args, cwd, status:"running"\|"exited", pid}` | Terminal session |
| `GlobalEvent` | `{directory: string, payload: Event}` | Wrapper for event bus |

### Key Part Types
| Part Type | Key Fields |
|-----------|------------|
| `TextPart` | `{id, sessionID, messageID, type:"text", text, synthetic?, ignored?, time?, metadata?}` |
| `ToolPart` | `{id, sessionID, messageID, type:"tool", callID, tool, state: ToolState, metadata?}` |
| `ReasoningPart` | `{id, sessionID, messageID, type:"reasoning", text, metadata?, time}` |
| `StepStartPart` | `{id, sessionID, messageID, type:"step-start", snapshot?}` |
| `StepFinishPart` | `{id, sessionID, messageID, type:"step-finish", reason, snapshot?, cost, tokens}` |
| `AgentPart` | `{id, sessionID, messageID, type:"agent", name, source?}` |
| `CompactionPart` | `{id, sessionID, messageID, type:"compaction", auto}` |

### Key Event Types
| Event Type | Properties |
|------------|------------|
| `EventMessageUpdated` | `{type:"message.updated", properties:{info: Message}}` |
| `EventMessagePartUpdated` | `{type:"message.part.updated", properties:{part: Part, delta?: string}}` |
| `EventSessionCreated` | `{type:"session.created", properties:{info: Session}}` |
| `EventSessionUpdated` | `{type:"session.updated", properties:{info: Session}}` |
| `EventSessionStatus` | `{type:"session.status", properties:{sessionID, status: SessionStatus}}` |
| `EventSessionError` | `{type:"session.error", properties:{sessionID?, error?}}` |
| `EventPtyCreated` | `{type:"pty.created", properties:{info: Pty}}` |

## Hand-Rolled Types (engine-types.ts) — 121 LOC

### Types That Map to SDK (must replace)
| Hand-Rolled | SDK Equivalent | Drift |
|-------------|---------------|-------|
| `Session` | `Session` | MAJOR — our: `{createdAt: string, updatedAt: string, status: SessionStatus}`, SDK: `{time: {created: number, updated: number}, no status}` |
| `SessionStatus` | `SessionStatus` | BREAKING — our: `'pending'\|'running'\|'completed'\|'error'`, SDK: `{type:"idle"}\|{type:"retry",...}\|{type:"busy"}` |
| `Message` | `Message` | MAJOR — our: `{role:'user'\|'assistant'\|'system', parts: Part[], createdAt: string}`, SDK: discriminated `UserMessage\|AssistantMessage`, parts are separate |
| `Part` | `Part` | MAJOR — our: `{type: string, [key]: unknown}`, SDK: rich discriminated union |
| `Event` | `Event` | MAJOR — our: `{type: string, [key]: unknown}`, SDK: rich discriminated union |
| `ProviderInfo` | Derived from `Provider` | SDK `Provider` is much richer, `models` is Record not Array |
| `AgentInfo` | Derived from `Agent` | SDK `Agent` is much richer |
| `ModelInfo` | Derived from `Model` | SDK `Model` is much richer |

### Types That Are App-Level (keep as-is)
| Type | Reason |
|------|--------|
| `EngineStatus` | App-level concept — tracks OpenCode server process lifecycle |
| `DashboardConfig` | App-level — dashboard launch config |
| `PortConfig` | App-level — port detection config |
| `EngineErrorResponse` | App-level error wrapper |

### Types That Are Response Wrappers (delete — SDK returns raw)
| Wrapper | SDK Returns |
|---------|-------------|
| `SessionListResponse` | `Session[]` directly |
| `SessionCreateResponse` | `Session` directly |
| `SessionMessagesResponse` | Messages + Parts in SDK methods |
| `SessionStatusResponse` | `Record<string, SessionStatus>` |
| `SessionChildrenResponse` | `Session[]` directly |
| `SessionPromptRequest` | SDK has `TextPartInput`, `FilePartInput` etc. |

## Consumer Map

### Direct importers of `engine-types.ts` (3 files)
1. **`app/shared/ide-types.ts`** (line 30) — re-exports ModelInfo, ProviderInfo, AgentInfo, AppInfo, SessionStatus, EngineStatus, SessionStatusResponse
2. **`app/server/config.ts`** (line 14) — uses ProviderInfo, AgentInfo, AppInfo
3. **`app/server/sdk-client.server.ts`** (line 19) — uses EngineStatus

### Importers of `ide-types.ts` (8 files)
1. `app/components/ide/IDEShell.tsx` — PanelId (IDE-specific, not SDK)
2. `app/hooks/useEngine.ts` — via config server functions
3. `app/routes/settings.tsx`
4. `app/routes/index.tsx`
5. `app/routes/tasks.tsx`
6. `app/components/layout/SidebarNav.tsx`
7. `app/server/settings.ts`
8. `app/components/chat/SessionSidebar.tsx`

### Local type definitions in components (NOT from engine-types)
1. **`ChatMessage.tsx`** — `MessagePart {type, text?, toolName?, args?, result?, [key]}` and `ChatMessageData {role, content?, parts?}` — should use SDK `Part` union
2. **`useStreaming.ts`** — `StreamEvent {type, data: Record<string, unknown>, timestamp}` — should use SDK `Event` union

## Gap Analysis

### BREAKING: SessionStatus semantics changed
- **Our code**: `'pending' | 'running' | 'completed' | 'error'` — used as string comparison
- **SDK**: `{type: "idle"} | {type: "retry", ...} | {type: "busy"}` — different semantics entirely
- **Impact**: `EngineStatus.running` boolean may be better indicator; SessionStatus used in session cards, session lists
- **Solution**: Keep app-level `AppSessionStatus` type for UI display, derive from SDK `SessionStatus` with mapper function

### BREAKING: Session timestamps and shape
- **Our code**: `createdAt: string`, `updatedAt: string` (ISO strings)
- **SDK**: `time: {created: number, updated: number}` (Unix timestamps)
- **Impact**: All date displays need `new Date(session.time.created)` instead of `new Date(session.createdAt)`
- **Solution**: Use SDK Session directly, update display code

### BREAKING: Message is discriminated union
- **Our code**: `{id, role: 'user'|'assistant'|'system', parts: Part[], createdAt}`
- **SDK**: `UserMessage | AssistantMessage` with different fields per role, parts are separate
- **Impact**: ChatMessage component iterates `message.parts` — SDK messages don't have inline parts
- **Solution**: Adapt chat rendering to fetch parts separately or compose from events

### SIGNIFICANT: Part discriminated union
- **Our code**: `{type: string, [key]: unknown}` — uses switch on `type`
- **SDK**: Rich union with specific fields per type (TextPart, ToolPart, etc.)
- **Impact**: ChatMessage.PartRenderer handles "text", "tool-call", "tool-result" — SDK has "text", "tool", "reasoning", etc.
- **Solution**: Update PartRenderer to handle all SDK Part types with proper type narrowing

## Migration Strategy

### Phase: engine-types.ts transformation
1. **Re-export SDK types directly**: `export type { Session, Part, Event, Pty } from '@opencode-ai/sdk'`
2. **Keep app-level types**: `EngineStatus`, `DashboardConfig`, `PortConfig`
3. **Create derived helper types**: `ProviderInfo` and `AgentInfo` as pick/mapped types from SDK
4. **Delete response wrappers**: `SessionListResponse`, `SessionCreateResponse`, etc.
5. **Add mapper utilities**: `toDisplayDate(timestamp: number)`, `sessionStatusLabel(status: SessionStatus)`

### Phase: Server function updates
1. Update `config.ts` to use SDK `Provider` and `Agent` types in normalization
2. Update `sessions.ts` return types to match SDK shapes
3. Remove JSON roundtrips that lose type safety

### Phase: Component updates
1. Update `ChatMessage.tsx` to use SDK `Part` union with proper type guards
2. Update `useStreaming.ts` to use SDK `Event` union
3. Update all date displays from ISO strings to Unix timestamps

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| SessionStatus semantic change breaks UI | High | Create mapper function, test session cards |
| Part type names differ (tool-call → tool) | Medium | Update switch cases in PartRenderer |
| Timestamp format change (string → number) | Low | Straightforward Date constructor change |
| Server functions return different shapes | Medium | Update return types, test with SDK client |
| `tsc --noEmit` cascade failures | Low | Fix bottom-up (types → server → components) |

## Recommended Plan Structure

1. **Plan 01** (Wave 1): Foundation — Transform engine-types.ts (re-exports + adapters + helpers), update server functions
2. **Plan 02** (Wave 2): Consumers — Update all chat components, hooks, and remaining consumers to use new types
3. Both plans verify with `tsc --noEmit` as gate
