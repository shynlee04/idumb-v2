# Phase 8: Sessions + Diffs + Agents - Research

**Researched:** 2026-02-12
**Domain:** Session management, code diff visualization, multi-agent attribution
**Confidence:** HIGH (all APIs verified against SDK types.gen.d.ts v1.1.54, Monaco DiffEditor verified via Context7 + GitHub issue tracker, existing codebase patterns confirmed by file reads)

## Summary

Phase 8 adds three interconnected capabilities to the iDumb v2 dashboard: (1) full session lifecycle management with search, rename, auto-title, and revert/unrevert, (2) a Monaco DiffEditor-based code diff viewer for reviewing AI-made changes, and (3) multi-agent operation visualization with agent attribution badges and sequential/parallel flow display.

All three plans build on existing infrastructure. Session CRUD hooks and server functions already exist (`useSession.ts`, `sessions.ts`). Monaco editor is already installed and working with model-swapping and SSR safety. The SDK provides all required APIs (`session.update`, `session.summarize`, `session.revert`, `session.unrevert`, `session.diff`, `session.children`). Agent attribution data is already present in SDK types (`AgentPart`, `SubtaskPart` in the Part union, `agent` field on `UserMessage`).

**Primary recommendation:** Build incrementally on the existing session hooks and chat rendering infrastructure. Use the `@monaco-editor/react` `DiffEditor` component (already installed) with aggressive disposal to mitigate the known memory leak. Leverage SDK's `AgentPart` and `SubtaskPart` types plus `session.children()` for multi-agent visualization rather than inventing custom attribution mechanisms.

## Standard Stack

### Core (Already Installed)

| Library | Version | Purpose | Phase 8 Role |
|---------|---------|---------|--------------|
| `@opencode-ai/sdk` | 1.1.54 | SDK client for all session/diff/agent APIs | session.update/summarize/revert/unrevert/diff/children |
| `@monaco-editor/react` | 4.7.0 | React DiffEditor component | Code diff visualization with inline/side-by-side modes |
| `monaco-editor` | 0.55.1 | DiffEditor engine (peer dep) | Diff computation and rendering |
| `@tanstack/react-query` | (installed) | Query/mutation hooks | Session operations caching and invalidation |
| `@tanstack/react-start` | (installed) | Server functions | New server functions for rename/summarize/revert/diff |
| `zustand` | (installed) | Client state | Diff viewer state (selected file, view mode) |
| `zod` | (installed) | Input validation | Server function input validators |
| `react-markdown` | (installed) | Markdown rendering | Agent attribution annotations |
| `lucide-react` | (installed) | Icons | Agent badges, diff status indicators |

### No New Dependencies Required

Phase 8 requires zero new npm packages. Everything needed is already installed. This is intentional -- the Phase 5-7 foundation was designed to support these features.

## Architecture Patterns

### 1. Server Function Layer -- New SDK Wrappers

Add new server functions in `app/server/sessions.ts` following the established pattern:

```typescript
// session.update() -> rename
export const renameSessionFn = createServerFn({ method: "POST" })
  .inputValidator(RenameSessionSchema)
  .handler(async ({ data }) => {
    const client = getClient()
    const result = await client.session.update({
      query: sdkQuery(getProjectDir()),
      path: { id: data.id },
      body: { title: data.title },
    })
    return validateSession(unwrapSdkResult(result))
  })

// session.summarize() -> auto-title
export const summarizeSessionFn = createServerFn({ method: "POST" })
  .inputValidator(SummarizeSessionSchema)
  .handler(async ({ data }) => {
    const client = getClient()
    const result = await client.session.summarize({
      query: sdkQuery(getProjectDir()),
      path: { id: data.id },
      body: data.model ? { providerID: data.model.providerID, modelID: data.model.modelID } : undefined,
    })
    return unwrapSdkResult(result) // returns boolean
  })

// session.revert() -> revert to message
export const revertSessionFn = createServerFn({ method: "POST" })
  .inputValidator(RevertSessionSchema)
  .handler(async ({ data }) => {
    const client = getClient()
    const result = await client.session.revert({
      query: sdkQuery(getProjectDir()),
      path: { id: data.id },
      body: { messageID: data.messageID, partID: data.partID },
    })
    return validateSession(unwrapSdkResult(result))
  })

// session.unrevert() -> restore reverted messages
export const unrevertSessionFn = createServerFn({ method: "POST" })
  .inputValidator(SessionIdSchema)
  .handler(async ({ data }) => {
    const client = getClient()
    const result = await client.session.unrevert({
      query: sdkQuery(getProjectDir()),
      path: { id: data.id },
    })
    return validateSession(unwrapSdkResult(result))
  })

// session.diff() -> get file diffs
export const getSessionDiffFn = createServerFn({ method: "GET" })
  .inputValidator(SessionDiffSchema)
  .handler(async ({ data }) => {
    const client = getClient()
    const result = await client.session.diff({
      query: {
        ...sdkQuery(getProjectDir()),
        ...(data.messageID ? { messageID: data.messageID } : {}),
      },
      path: { id: data.id },
    })
    return JSON.parse(JSON.stringify(unwrapSdkResult(result)))
  })
```

### 2. SDK API Surface for Phase 8

| SDK Method | Input | Output | Phase 8 Usage |
|------------|-------|--------|---------------|
| `session.update()` | `{ path: { id }, body: { title?: string } }` | `Session` | Rename session |
| `session.summarize()` | `{ path: { id }, body?: { providerID, modelID } }` | `boolean` | Auto-generate title |
| `session.revert()` | `{ path: { id }, body: { messageID, partID? } }` | `Session` | Revert to message |
| `session.unrevert()` | `{ path: { id } }` | `Session` | Restore reverted messages |
| `session.diff()` | `{ path: { id }, query?: { messageID? } }` | `Array<FileDiff>` | Get changed files |
| `session.children()` | `{ path: { id } }` | `Array<Session>` | Get child sessions (already implemented) |
| `file.status()` | `{}` (no params) | `Array<File>` | Get tracked file status |

### 3. Session Revert Model

The SDK's `Session` type includes a `revert` field:

```typescript
type Session = {
  // ...existing fields...
  revert?: {
    messageID: string    // The message ID this session is reverted to
    partID?: string      // Optional specific part reverted
    snapshot?: string    // Git snapshot reference
    diff?: string        // Diff from revert point
  }
}
```

When `session.revert` is non-null, the session has been reverted. Messages AFTER the revert point are "ghosted" but still exist -- `session.unrevert()` restores them. The UI should show:
- A visual checkpoint indicator at the revert message
- Ghosted/dimmed messages after the revert point
- An "Unrevert" action button when revert state is active
- The revert point synced with the Session query (refetch on revert/unrevert)

### 4. FileDiff Type for Diff Viewer

```typescript
type FileDiff = {
  file: string       // Relative file path (e.g., "src/main.ts")
  before: string     // Full file content before changes
  after: string      // Full file content after changes
  additions: number  // Lines added
  deletions: number  // Lines deleted
}
```

The `before` and `after` fields contain **full file content**, not unified diff patches. This maps directly to Monaco DiffEditor's `original` and `modified` model pattern:
- `before` -> DiffEditor `original` content
- `after` -> DiffEditor `modified` content
- Language detection reuses the existing `EXT_TO_LANG` map from `MonacoEditor.tsx`

### 5. DiffEditor Architecture

```
DiffViewer (route or panel)
├── FileChangeList         -- List of changed files with +/- counts
│   └── FileChangeItem     -- Single file: icon + name + additions/deletions badge
├── DiffEditorWrapper      -- Lazy-loaded Monaco DiffEditor
│   ├── original model     -- Content from FileDiff.before
│   ├── modified model     -- Content from FileDiff.after
│   └── mode toggle        -- inline vs side-by-side (renderSideBySide prop)
└── DiffToolbar            -- Mode toggle + file name + navigate diffs buttons
```

Use the `@monaco-editor/react` `DiffEditor` component directly:

```typescript
import { DiffEditor } from '@monaco-editor/react'

<DiffEditor
  original={selectedDiff.before}
  modified={selectedDiff.after}
  language={detectLanguage(selectedDiff.file)}
  theme="vs-dark"
  options={{
    renderSideBySide: viewMode === 'side-by-side',
    readOnly: true,
    automaticLayout: true,
    enableSplitViewResizing: true,
  }}
  onMount={(editor) => { diffEditorRef.current = editor }}
/>
```

### 6. Multi-Agent Attribution Model

The SDK provides agent information through multiple channels:

| Source | Type | Field | What It Tells You |
|--------|------|-------|-------------------|
| `UserMessage` | SDK type | `agent: string` | Which agent this message was sent from |
| `AgentPart` | Part union member | `type: "agent"`, `name: string` | Agent switch notification within a message |
| `SubtaskPart` | Part union member | `type: "subtask"`, `agent: string`, `prompt: string`, `description: string` | Agent delegation (parent delegating to child) |
| `Session.parentID` | SDK type | `parentID?: string` | Child session linked to parent (parallel agent runs) |
| `Session.children()` | SDK method | Returns `Session[]` | All child sessions of a parent |
| `AssistantMessage.modelID` | SDK type | `modelID: string`, `providerID: string` | Which model produced this response |

**Agent attribution rendering:**
- `AgentPart` (type: "agent") signals an agent switch -- render as a divider/badge between message groups
- `SubtaskPart` (type: "subtask") signals delegation -- render as a delegation card with agent name, description, and prompt
- The `agent` field on UserMessage tells which agent authored the message -- render as a badge next to the role indicator
- Child sessions (from `session.children()`) represent parallel agent runs -- render in side-by-side split view

### 7. Recommended Project Structure

```
app/
├── components/
│   ├── chat/
│   │   ├── ChatMessage.tsx              -- Extend with agent badge
│   │   ├── parts/
│   │   │   ├── AgentBadge.tsx           -- NEW: Agent attribution badge
│   │   │   ├── SubtaskCard.tsx          -- NEW: Delegation flow card
│   │   │   └── ...existing parts...
│   │   └── AgentFlowView.tsx            -- NEW: Sequential/parallel agent visualization
│   ├── diff/
│   │   ├── DiffViewer.tsx               -- NEW: Main diff viewer container
│   │   ├── DiffEditor.lazy.tsx          -- NEW: SSR-safe lazy DiffEditor wrapper
│   │   ├── FileChangeList.tsx           -- NEW: File change list sidebar
│   │   └── DiffToolbar.tsx              -- NEW: Mode toggle + navigation
│   └── layout/
│       └── SessionSidebar.tsx           -- EXTEND: search, rename, revert indicators
├── hooks/
│   ├── useSession.ts                    -- EXTEND: rename, summarize, revert, unrevert, diff
│   └── useSessionDiff.ts               -- NEW: Diff data fetching + file selection
├── server/
│   ├── sessions.ts                      -- EXTEND: renameFn, summarizeFn, revertFn, unrevertFn
│   ├── diffs.ts                         -- NEW: getSessionDiffFn
│   └── validators.ts                    -- EXTEND: new input schemas
├── shared/
│   └── engine-types.ts                  -- EXTEND: re-export FileDiff
└── stores/
    └── diff-store.ts                    -- NEW: selected file, view mode, diff panel state
```

## Don't Hand-Roll

| Problem | Do Not Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Diff computation | Custom text diffing algorithm | Monaco DiffEditor + SDK `session.diff()` | SDK returns full before/after content; Monaco handles diff computation internally with its battle-tested diff algorithm |
| Session rename | Custom title edit + save pattern | SDK `session.update({ body: { title } })` | SDK handles persistence, event emission, and state consistency |
| Auto-title generation | Custom summarization logic | SDK `session.summarize()` | SDK generates titles using the configured AI model -- no prompt engineering needed |
| Session revert/unrevert | Custom message rollback | SDK `session.revert()` + `session.unrevert()` | SDK handles git snapshot management, message state, and file restoration |
| File change detection | Custom git diff parsing | SDK `session.diff()` returning `FileDiff[]` | SDK provides structured diffs with full file content, not raw unified diff patches |
| Agent detection in messages | Custom message metadata parsing | SDK `AgentPart`, `SubtaskPart`, `UserMessage.agent` | Part discriminated union narrowing provides type-safe agent detection |
| Parallel agent run detection | Custom session tree traversal | SDK `session.children()` | Already implemented in `useSessionChildren` hook |

**Key insight:** The OpenCode SDK is the single source of truth for all session state, diff computation, and agent attribution. Every "smart" feature in Phase 8 is an SDK call wrapped in a server function, not custom logic.

## Common Pitfalls

### P1: Monaco DiffEditor Memory Leak (CRITICAL)

**What goes wrong:** The Monaco DiffEditor has an open, unresolved memory leak (GitHub issue [#4659](https://github.com/microsoft/monaco-editor/issues/4659)). Disposing a DiffEditor does not fully clean up `Emitter`, `InteractionEmitter`, and canvas elements. The fix was attempted (PR #271497) but failed verification and the issue was reopened.

**Why it happens:** `removeDiffEditor` was not implemented in `abstractCodeEditorService.js`, and event listeners from `accessibleDiffViewer` are not cleaned up on dispose. Detached canvas elements and emitters accumulate.

**How to avoid:**
1. Never mount/unmount DiffEditor frequently -- use model swapping (same pattern as regular editor)
2. When navigating between files, swap the `original` and `modified` props (DiffEditor re-diffs without remount)
3. Implement a manual cleanup effect that disposes models explicitly on unmount:
   ```typescript
   useEffect(() => {
     return () => {
       if (diffEditorRef.current) {
         const original = diffEditorRef.current.getOriginalEditor().getModel()
         const modified = diffEditorRef.current.getModifiedEditor().getModel()
         diffEditorRef.current.dispose()
         original?.dispose()
         modified?.dispose()
       }
     }
   }, [])
   ```
4. Use the DiffEditor in a dedicated route/panel that unmounts completely when user leaves diff view -- do NOT keep it mounted in background
5. Cap the number of diff models in memory (same LRU pattern as regular editor, but simpler since diffs are read-only)

**Warning signs:** Growing memory usage when switching between diff files, increasing DOM node count, arrow keys moving two characters after closing diff viewer.

### P2: DiffEditor SSR Safety (HIGH)

**What goes wrong:** Same as regular Monaco -- DiffEditor references `window`/`navigator` at import time, crashing during TanStack Start shell prerender.

**How to avoid:** Create `DiffEditor.lazy.tsx` following the exact same pattern as `MonacoEditor.lazy.tsx`:

```typescript
import { lazy, Suspense } from 'react'

const DiffEditorInner = lazy(() =>
  import('./DiffViewer').then(m => ({ default: m.DiffViewer }))
)

export function LazyDiffViewer(props: DiffViewerProps) {
  if (typeof window === 'undefined') return null
  return (
    <Suspense fallback={<div className="h-full bg-zinc-900 animate-pulse" />}>
      <DiffEditorInner {...props} />
    </Suspense>
  )
}
```

### P3: Session.summarize() Requires Model Selection (HIGH)

**What goes wrong:** `session.summarize()` accepts an optional `body` with `{ providerID, modelID }`. If not provided, it uses the default model configured in OpenCode. If no default is configured, it may fail.

**How to avoid:** Pass the user's selected model from the ModelPicker/settings:

```typescript
const result = await client.session.summarize({
  path: { id: sessionId },
  body: { providerID: 'anthropic', modelID: 'claude-sonnet-4-5' },
})
```

Use the `default-model` setting (already stored in Drizzle) to populate this. Fall back to calling without a body (SDK will use its default).

### P4: Session.revert() Invalidates Message List (HIGH)

**What goes wrong:** After `session.revert()`, the message list changes (messages after the revert point are effectively removed from the active conversation). If the UI does not refetch messages, it shows stale state.

**How to avoid:**
1. After `revertSessionFn` mutation succeeds, invalidate both session detail and messages queries:
   ```typescript
   onSuccess: (_, { id }) => {
     queryClient.invalidateQueries({ queryKey: sessionKeys.detail(id) })
     queryClient.invalidateQueries({ queryKey: sessionKeys.messages(id) })
   }
   ```
2. The returned `Session` object has `revert` field populated -- use this to render the revert indicator.
3. After `unrevertSessionFn`, invalidate the same queries to restore the full message list.

### P5: FileDiff.before/after Are Full File Content (MEDIUM)

**What goes wrong:** `session.diff()` returns `FileDiff[]` where `before` and `after` are **entire file contents**, not diff patches. For large files, this means significant data transfer.

**How to avoid:**
- Do NOT fetch all diffs eagerly. Fetch the diff list first (which includes file names and +/- counts), then fetch full content only when user clicks a specific file.
- Actually, the SDK returns all diffs in one call. So implement pagination or lazy rendering on the client side.
- Use React Query's `staleTime` to cache diff results (diffs are immutable for a given session state).

### P6: Agent Name Mapping (MEDIUM)

**What goes wrong:** The SDK's `AgentPart.name` and `UserMessage.agent` fields contain raw agent identifiers (e.g., "default", "coding-agent"). These need to be mapped to human-readable names and icons for the UI.

**How to avoid:** Create an agent display config mapping:
```typescript
const AGENT_DISPLAY: Record<string, { label: string; color: string; icon: string }> = {
  'default': { label: 'Coordinator', color: 'blue', icon: 'Crown' },
  'coding-agent': { label: 'Executor', color: 'green', icon: 'Code2' },
  // ... map all known agents
}
```

Fall back to displaying the raw agent name with a generic icon for unknown agents. Use the SDK's `agent.list()` (already implemented in `config.ts`) to get the full agent list for dynamic mapping.

### P7: Session Search is Client-Side (MEDIUM)

**What goes wrong:** The SDK `session.list()` does not support server-side search/filter. You get all sessions and must filter client-side.

**How to avoid:** Implement search as a client-side filter on the already-cached session list:
```typescript
const filteredSessions = useMemo(() => {
  if (!searchQuery) return sessions
  const q = searchQuery.toLowerCase()
  return sessions?.filter(s =>
    s.title.toLowerCase().includes(q) ||
    s.id.toLowerCase().includes(q)
  )
}, [sessions, searchQuery])
```

The session list is already cached via React Query with a 5-second refetch interval. No additional server calls needed.

### P8: Parallel vs Sequential Agent Detection (LOW)

**What goes wrong:** The SDK does not explicitly label agent runs as "parallel" or "sequential". You must infer this from the data structure.

**How to avoid:**
- **Sequential:** When `AgentPart` (type: "agent") appears in a message's parts array, it means agents ran one after another in the same session. Render vertically.
- **Parallel:** When `session.children()` returns multiple child sessions, those represent parallel agent runs (each child session is a separate agent). Render in side-by-side split.
- **SubtaskPart** indicates a delegation from parent to child -- render as a "delegation arrow" connecting parent message to child session.

## Code Examples

### Example 1: Session Rename with Inline Edit

```typescript
// app/hooks/useSession.ts (additions)
export function useRenameSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { id: string; title: string }) =>
      renameSessionFn({ data: params }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: sessionKeys.lists() })
    },
  })
}
```

### Example 2: Session Revert/Unrevert Hooks

```typescript
export function useRevertSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { id: string; messageID: string; partID?: string }) =>
      revertSessionFn({ data: params }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: sessionKeys.messages(id) })
    },
  })
}

export function useUnrevertSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => unrevertSessionFn({ data: { id } }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: sessionKeys.messages(id) })
    },
  })
}
```

### Example 3: Diff Data Hook

```typescript
// app/hooks/useSessionDiff.ts
export const diffKeys = {
  all: ["session-diffs"] as const,
  session: (id: string) => [...diffKeys.all, id] as const,
  message: (id: string, messageID: string) => [...diffKeys.all, id, messageID] as const,
}

export function useSessionDiff(sessionId: string | undefined) {
  return useQuery({
    queryKey: diffKeys.session(sessionId ?? ""),
    queryFn: () => getSessionDiffFn({ data: { id: sessionId! } }),
    enabled: Boolean(sessionId),
    staleTime: 30_000, // Diffs don't change frequently
  })
}
```

### Example 4: Lazy DiffEditor Wrapper

```typescript
// app/components/diff/DiffEditor.lazy.tsx
import { lazy, Suspense } from 'react'

const DiffViewerInner = lazy(() =>
  import('./DiffViewer').then(m => ({ default: m.DiffViewer }))
)

export function LazyDiffViewer(props: { sessionId: string }) {
  if (typeof window === 'undefined') return null
  return (
    <Suspense fallback={<div className="h-full bg-zinc-900 animate-pulse" />}>
      <DiffViewerInner {...props} />
    </Suspense>
  )
}
```

### Example 5: DiffViewer with File Selection

```typescript
// app/components/diff/DiffViewer.tsx
import { useState, useRef, useEffect, useCallback } from 'react'
import { DiffEditor } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { useSessionDiff } from '../../hooks/useSessionDiff'

// Reuse existing language detection from MonacoEditor.tsx
const EXT_TO_LANG: Record<string, string> = {
  ts: 'typescript', tsx: 'typescriptreact', js: 'javascript', jsx: 'javascriptreact',
  json: 'json', css: 'css', md: 'markdown', py: 'python',
  // ... same map as MonacoEditor.tsx
}

function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  return EXT_TO_LANG[ext] ?? 'plaintext'
}

interface DiffViewerProps {
  sessionId: string
}

export function DiffViewer({ sessionId }: DiffViewerProps) {
  const { data: diffs } = useSessionDiff(sessionId)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [sideBySide, setSideBySide] = useState(true)
  const diffEditorRef = useRef<editor.IStandaloneDiffEditor | null>(null)

  const selectedDiff = diffs?.find(d => d.file === selectedFile) ?? diffs?.[0]

  // Cleanup on unmount — mitigate DiffEditor memory leak
  useEffect(() => {
    return () => {
      if (diffEditorRef.current) {
        const orig = diffEditorRef.current.getOriginalEditor().getModel()
        const mod = diffEditorRef.current.getModifiedEditor().getModel()
        diffEditorRef.current.dispose()
        orig?.dispose()
        mod?.dispose()
      }
    }
  }, [])

  if (!diffs || diffs.length === 0) {
    return <div className="p-4 text-muted-foreground">No changes in this session</div>
  }

  return (
    <div className="flex h-full">
      {/* File change list */}
      <div className="w-64 border-r border-border overflow-y-auto">
        {diffs.map(diff => (
          <button
            key={diff.file}
            onClick={() => setSelectedFile(diff.file)}
            className={cn(
              "w-full text-left px-3 py-2 text-sm flex items-center gap-2",
              selectedFile === diff.file ? "bg-accent" : "hover:bg-accent/50"
            )}
          >
            <span className="truncate flex-1">{diff.file}</span>
            <span className="text-green-500 text-xs">+{diff.additions}</span>
            <span className="text-red-500 text-xs">-{diff.deletions}</span>
          </button>
        ))}
      </div>

      {/* Diff editor */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border">
          <span className="text-sm font-medium">{selectedDiff?.file ?? 'Select a file'}</span>
          <button onClick={() => setSideBySide(v => !v)} className="ml-auto text-xs">
            {sideBySide ? 'Inline' : 'Side by Side'}
          </button>
        </div>
        {selectedDiff && (
          <DiffEditor
            original={selectedDiff.before}
            modified={selectedDiff.after}
            language={detectLanguage(selectedDiff.file)}
            theme="vs-dark"
            onMount={(editor) => { diffEditorRef.current = editor }}
            options={{
              renderSideBySide: sideBySide,
              readOnly: true,
              automaticLayout: true,
              enableSplitViewResizing: true,
              minimap: { enabled: false },
            }}
          />
        )}
      </div>
    </div>
  )
}
```

### Example 6: Agent Attribution Badge

```typescript
// app/components/chat/parts/AgentBadge.tsx
import { Crown, Code2, Search, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const AGENT_CONFIG: Record<string, { label: string; icon: typeof Crown; color: string }> = {
  'default': { label: 'AI', icon: User, color: 'text-primary' },
  'supreme-coordinator': { label: 'Coordinator', icon: Crown, color: 'text-amber-500' },
  'investigator': { label: 'Investigator', icon: Search, color: 'text-blue-500' },
  'executor': { label: 'Executor', icon: Code2, color: 'text-green-500' },
}

export function AgentBadge({ agentName }: { agentName: string }) {
  const config = AGENT_CONFIG[agentName] ?? {
    label: agentName,
    icon: User,
    color: 'text-muted-foreground',
  }
  const Icon = config.icon

  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", config.color)}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  )
}
```

### Example 7: Revert Checkpoint Indicator

```typescript
// In ChatMessages.tsx — rendering a revert checkpoint
function RevertCheckpoint({ messageId, onUnrevert }: { messageId: string; onUnrevert: () => void }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 my-2 bg-amber-500/10 border border-amber-500/30 rounded-md">
      <RotateCcw className="w-4 h-4 text-amber-500" />
      <span className="text-xs text-amber-500 font-medium">
        Session reverted to this point
      </span>
      <button
        onClick={onUnrevert}
        className="ml-auto text-xs text-amber-500 hover:text-amber-400 underline"
      >
        Restore messages
      </button>
    </div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SDK session has no revert field | `Session.revert?: { messageID, partID?, snapshot?, diff? }` | SDK 1.1.x | Enables UI revert state detection |
| Parts delivered inline in messages | `session.messages()` returns `Array<{ info: Message; parts: Part[] }>` | SDK 1.1.x | Parts are separate from message metadata |
| No session diff API | `session.diff()` returns `Array<FileDiff>` with full before/after content | SDK 1.1.x | No need for custom git diff parsing |
| No auto-title | `session.summarize()` generates title from conversation content | SDK 1.1.x | AI-powered session naming |
| UserMessage has no agent info | `UserMessage.agent: string` field identifies which agent | SDK 1.1.x | Agent attribution at message level |
| No SubtaskPart in Part union | `type: "subtask"` part with `agent`, `prompt`, `description` | SDK 1.1.x | Delegation flow visualization |

**Deprecated/outdated patterns to avoid:**
- Do NOT use `Session.title` as a substitute for `session.summarize()` -- the title may be empty string for new sessions
- Do NOT parse unified diff patches manually -- SDK provides structured `FileDiff` with full content
- Do NOT build custom agent detection from message content -- use SDK `AgentPart` and `UserMessage.agent`

## Open Questions

1. **How does `session.diff()` interact with revert state?**
   - What we know: `session.diff()` accepts an optional `messageID` query parameter. When `revert` is active on a session, the diff should reflect the reverted state.
   - What's unclear: Does `session.diff()` return diffs relative to session start, or relative to the revert point? The `messageID` parameter suggests per-message diffs are possible.
   - Recommendation: Test empirically by calling `session.diff()` with and without `messageID` after a revert. If no `messageID`, assume full session diff. If with `messageID`, assume diff up to that message.

2. **How does `session.summarize()` behave when called without a body?**
   - What we know: The SDK types show `body?` as optional with `{ providerID: string; modelID: string }`. The return type is `boolean`.
   - What's unclear: Does omitting the body use the OpenCode default model? Does it fail if no default is configured?
   - Recommendation: Try calling without body first. If it fails, fall back to the user's selected model from the `default-model` setting.

3. **What agent identifiers does OpenCode use for default agents?**
   - What we know: The SDK uses `agent.list()` which returns agent IDs. The iDumb 3-agent system uses "supreme-coordinator", "investigator", "executor".
   - What's unclear: What does the default OpenCode agent identifier look like? Is it "default", "code", or something else?
   - Recommendation: Use `agent.list()` to dynamically discover agents and build the display mapping at runtime, with a hardcoded fallback for known agents.

4. **Can parallel agent runs be visually distinguished from sequential runs in the same session?**
   - What we know: Child sessions (from `session.children()`) represent parallel runs. `SubtaskPart` represents delegation. `AgentPart` represents agent switches.
   - What's unclear: Whether `AgentPart` appears at the start of each agent's contribution within a single message, or only at agent boundaries.
   - Recommendation: Start with sequential vertical flow (default), add side-by-side split for child sessions. Test with real multi-agent conversations to validate the rendering logic.

## Sources

### Primary (HIGH confidence)
- `@opencode-ai/sdk` v1.1.54 types.gen.d.ts — Direct type verification for Session, Message, Part, FileDiff, AgentPart, SubtaskPart, and all SDK method signatures
- `@opencode-ai/sdk` v1.1.54 sdk.gen.d.ts — Direct verification of client methods: session.update(), session.summarize(), session.revert(), session.unrevert(), session.diff(), session.children()
- Context7 `/anomalyco/opencode` — SDK documentation for session CRUD, revert/unrevert, diff, and summarize APIs
- Context7 `/microsoft/monaco-editor` — DiffEditor creation, model management, inline vs side-by-side options
- Context7 `/suren-atoyan/monaco-react` — DiffEditor React component props, onMount handler, original/modified prop pattern
- Phase 11 SDK Contracts (`11-CONTRACTS.md`) — Verified Session, Part, FileDiff type shapes

### Secondary (MEDIUM confidence)
- GitHub issue [microsoft/monaco-editor#4659](https://github.com/microsoft/monaco-editor/issues/4659) — DiffEditor memory leak status (open, reopened after failed verification)
- Phase 6 Research (`06-RESEARCH.md`) — Monaco worker config, SSR safety, LRU model cap patterns
- Phase 7 Research (`07-RESEARCH.md`) — Chat rendering, Part type narrowing, ToolState patterns

### Tertiary (LOW confidence)
- OpenCode SDK session.summarize body parameters — unclear if body can be omitted safely (needs runtime testing)
- Default agent identifiers for non-iDumb OpenCode installations (needs agent.list() runtime discovery)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and working; zero new dependencies
- Architecture: HIGH -- SDK API surface fully verified from types.gen.d.ts; all patterns extend existing code
- Pitfalls: HIGH -- DiffEditor memory leak confirmed via GitHub issue tracker; SSR patterns validated by Phase 6 implementation
- Multi-agent visualization: MEDIUM -- SDK types verified but rendering patterns for sequential/parallel agent flows need empirical testing with real multi-agent data

**Research date:** 2026-02-12
**Valid until:** 2026-03-12 (stable -- SDK v1.1.54 types are locked, Monaco v0.55.1 is stable)
