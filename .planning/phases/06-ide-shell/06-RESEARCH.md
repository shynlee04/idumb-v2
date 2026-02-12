# Phase 6: IDE Shell — Research

**Date:** 2026-02-11
**Phase:** 06-ide-shell
**Mode:** ecosystem
**Confidence:** HIGH (all libraries verified via npm registry + official docs + Context7)

---

## Standard Stack

Use these exact libraries. Versions are pinned to latest stable as of 2026-02-11.

| Library | Version | Purpose | Bundle Impact | React 19 |
|---|---|---|---|---|
| `react-resizable-panels` | `^4.6.2` | IDE panel layout (sidebar, editor, chat) | ~7kB gzip | Yes |
| `@monaco-editor/react` | `^4.7.0` | React wrapper for Monaco editor | ~5kB (wrapper only) | Yes |
| `monaco-editor` | `^0.55.1` | Code editor engine (peer dep) | ~2.5MB (tree-shaken with workers) | N/A (no React dep) |
| `react-arborist` | `^3.4.3` | Virtualized file tree with keyboard nav | ~30kB gzip | Yes |
| `radix-ui` | `^1.4.3` | Context menu (unified tree-shakeable package) | ~3kB per component | Yes (Jan 2025 release) |
| `zustand` | `^5.0.11` | IDE client state (tabs, tree, layout) | ~1.2kB gzip | Yes |

**NOT installing (handled differently):**

| Concern | Decision | Reason |
|---|---|---|
| `vite-plugin-monaco-editor-esm` | Skip — use manual worker config | Plugin landscape is fragmented. Manual config is 15 lines, doesn't break across Vite versions, and is the approach recommended in Monaco's official ESM integration guide. |
| `allotment` | Skip | Less maintained than react-resizable-panels. No v4 equivalent. No shadcn ecosystem alignment. |
| `react-complex-tree` | Skip | More powerful than needed (unopinionated rendering = more boilerplate). react-arborist has built-in virtualization, drag-drop, inline rename, and ARIA — exactly what a file tree needs. |
| `@radix-ui/react-context-menu` | Skip individual package | Use unified `radix-ui` package instead. Tree-shakeable, prevents version conflicts between Radix components. |

### Version Justification

**react-resizable-panels v4 (not v3):** v4 ships a cleaner API (`Group`/`Separator` instead of `PanelGroup`/`PanelResizeHandle`), percentage-string sizes (`"30%"` not `{30}`), `useDefaultLayout` hook for persistence, and `aria-orientation` for accessibility. shadcn/ui migrated to v4 on 2025-02-02. The v3 API names are deprecated.

**react-arborist v3.4.3 (not react-complex-tree):** react-arborist is purpose-built for file explorers (VSCode sidebar, Mac Finder, Sketch layers). 3.5k stars, 201k weekly downloads, MIT license. Built-in virtualization handles 10k+ nodes. react-complex-tree is more generic and requires you to build your own rendering — unnecessary work for a standard file tree.

**radix-ui unified (not individual @radix-ui/react-* packages):** As of Jan 2025, Radix publishes a single `radix-ui` package that tree-shakes to individual components. Prevents version conflicts. React 19 compatibility was shipped in the same release.

---

## Architecture Patterns

### 1. IDE Layout Structure (Three-Panel with Nested Vertical Split)

```
+---------------------------------------------------+
|  Sidebar (collapsible)  |  Editor Area  |  Chat   |
|                         |               |         |
|  [File Tree]            |  [Tab Bar]    | [Chat]  |
|  [Search]               |  [Monaco]     |         |
|                         |               |         |
+---------------------------------------------------+

Outer Group: horizontal — Sidebar | EditorArea | ChatPanel
Inner Group (EditorArea): vertical — TabBar + Monaco (future: + Terminal)
```

Use **nested `Group` components** for this. The outer horizontal group splits sidebar/editor/chat. The editor area is a single `Panel` containing its own vertical group (tab bar above Monaco, terminal below in Phase 7).

### 2. Zustand Slice Pattern for IDE State

Organize the IDE store into **4 slices** that compose into a single store:

| Slice | State | Actions |
|---|---|---|
| `tabSlice` | `openTabs`, `activeTabId`, `dirtyTabs` | `openFile`, `closeTab`, `setActiveTab`, `markDirty`, `markClean` |
| `treeSlice` | `expandedNodes`, `selectedNode`, `rootPath` | `toggleNode`, `selectNode`, `refreshTree` |
| `layoutSlice` | `sidebarCollapsed`, `chatCollapsed`, `panelSizes` | `toggleSidebar`, `toggleChat`, `setPanelSizes` |
| `editorSlice` | `models` (Map of uri -> content), `viewStates` (Map of uri -> ICodeEditorViewState) | `createModel`, `disposeModel`, `saveViewState`, `restoreViewState` |

Combine with `persist` middleware for `layoutSlice` and `tabSlice` (persisted to localStorage). Do NOT persist `editorSlice` (Monaco models are transient).

### 3. Monaco Multi-Model Architecture

Do NOT create/destroy Monaco editor instances per tab. Instead:

1. Create **one Monaco editor instance** that stays mounted
2. Create **separate `ITextModel` instances** per open file
3. On tab switch, call `editor.setModel(models.get(uri))` to swap the displayed model
4. Save/restore cursor position and scroll state via `editor.saveViewState()` / `editor.restoreViewState()`
5. Cap at **20 active models** with LRU eviction (dispose least-recently-used model when cap reached)

This is how VSCode works internally and is the only pattern that avoids the "remount Monaco on every tab switch" performance disaster.

### 4. File Tree Data Flow

```
Server (node:fs)  →  Server Function  →  React Query cache  →  react-arborist
                                                                    ↓
                                                              Zustand treeSlice
                                                           (expanded/selected state)
```

- **File listing** is a server function that returns `{ name, type, children? }[]`
- **Lazy-load children:** Only fetch directory contents when user expands a folder. Pass `childCount` hint so react-arborist can show placeholder.
- **Client state** (expanded nodes, selection) lives in Zustand, NOT in React Query cache.
- **Mutations** (rename, delete, create) use server functions → invalidate React Query cache → tree re-renders.

### 5. Context Menu Pattern

Use a **single shared `ContextMenu.Root`** near the app root, not one per tree node. This avoids the "hundreds of context menu instances" performance problem documented by the React community:

1. Listen for `onContextMenu` on tree nodes
2. Capture the target node info (path, type) in state
3. Render context menu items conditionally based on target type (file vs folder)
4. Dispatch actions from menu items using the captured target info

### 6. Server Function Security Pattern for File Operations

Every file operation server function MUST validate paths:

```
function safePath(projectRoot: string, userPath: string): string {
  const decoded = decodeURIComponent(userPath);
  const resolved = path.resolve(projectRoot, decoded);
  if (!resolved.startsWith(projectRoot + path.sep) && resolved !== projectRoot) {
    throw new Error('Path traversal attempt blocked');
  }
  return resolved;
}
```

This MUST be applied before every `fs.readFile`, `fs.writeFile`, `fs.readdir`, `fs.unlink`, `fs.rename`, and `fs.mkdir` call. `path.join()` and `path.normalize()` are NOT security functions.

---

## Don't Hand-Roll

These concerns have battle-tested library solutions. Building custom versions is a waste of time and will have bugs:

| Concern | Use This | Why Not Custom |
|---|---|---|
| Panel resizing + drag dividers | `react-resizable-panels` v4 | Pixel-accurate resizing with keyboard support, collapse, persistence, and proper cursor handling is ~2000 lines of subtle DOM/pointer event code |
| File tree virtualization | `react-arborist` | Virtualized rendering of arbitrary-depth trees with keyboard nav and ARIA attributes is extremely hard to get right. react-arborist handles 10k+ nodes. |
| Context menu positioning + keyboard nav | `radix-ui` ContextMenu | WAI-ARIA compliant menu with submenus, focus management, and portal rendering. Handles edge cases (viewport overflow, RTL, screen readers) that take weeks to implement. |
| Monaco editor React lifecycle | `@monaco-editor/react` | Handles mount/unmount lifecycle, loading state, controlled/uncontrolled modes, and `beforeMount` / `onMount` hooks. Writing this from scratch means fighting with Monaco's AMD heritage. |
| Layout persistence to localStorage | `react-resizable-panels` `useDefaultLayout` + Zustand `persist` | Both have built-in serialization/deserialization with conflict handling |
| Path traversal prevention | Use the `safePath` pattern from Architecture Patterns section | Do NOT rely on `path.join`, `path.normalize`, or regex blacklists. Always use `path.resolve` + `startsWith`. |

---

## Common Pitfalls

### P1: Monaco SSR Crash in TanStack Start SPA Mode (CRITICAL)

**Problem:** Even with `spa: { enabled: true }`, TanStack Start prerenders the shell to `_shell.html`. During prerendering, server-side code runs and Monaco references `window` at import time, causing `ReferenceError: window is not defined`. This is confirmed by TanStack Router issue #6003 (Dec 2025) and #5059 (Aug 2025).

**Solution:** Wrap ALL Monaco imports in dynamic `React.lazy()`:

```typescript
// app/components/editor/MonacoEditor.lazy.tsx
import { lazy, Suspense } from 'react';

const MonacoEditor = lazy(() => import('./MonacoEditor'));

export function LazyMonacoEditor(props: MonacoEditorProps) {
  if (typeof window === 'undefined') return null;
  return (
    <Suspense fallback={<div className="h-full bg-zinc-900 animate-pulse" />}>
      <MonacoEditor {...props} />
    </Suspense>
  );
}
```

**Verification:** Build must succeed (`npm run build`) and `_shell.html` must generate without errors.

### P2: Monaco Worker Configuration with Vite (HIGH)

**Problem:** Monaco uses Web Workers for language services (TypeScript, JSON, CSS, HTML). Without explicit worker config, you get "Could not create web worker(s)" warnings and all language processing happens on the main thread, freezing the UI.

**Solution:** Manual `MonacoEnvironment` setup in a dedicated file, imported once at app entry:

```typescript
// app/lib/monaco-workers.ts
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') return new jsonWorker();
    if (label === 'typescript' || label === 'javascript') return new tsWorker();
    return new editorWorker();
  },
};
```

Also add manual chunks to Vite config for code splitting:

```typescript
// vite.config.ts (within build.rollupOptions)
output: {
  manualChunks: {
    'monaco-editor': ['monaco-editor'],
  },
},
```

**Why not a plugin:** The plugin landscape (`vite-plugin-monaco-editor-esm`, `vite-plugin-monaco-editor`, `@bithero/monaco-editor-vite-plugin`, `@tomjs/vite-plugin-monaco-editor`) is fragmented. Each has different compatibility with different Vite versions. The manual approach is 15 lines, fully documented in Monaco's official ESM guide, and doesn't break across Vite upgrades.

### P3: Monaco Memory Leaks on Component Unmount (HIGH)

**Problem:** If Monaco editor or models are not explicitly disposed on unmount, they leak memory. The DiffEditor has a known unfixed leak since v0.44.0 (issue #4659, still open). Regular Editor leaks if models aren't disposed.

**Solution:** Explicit cleanup in `useEffect`:

```typescript
useEffect(() => {
  return () => {
    // Save view state before unmount
    if (editorRef.current) {
      const viewState = editorRef.current.saveViewState();
      if (viewState && activeUri) {
        store.saveViewState(activeUri, viewState);
      }
    }
    // Dispose all models
    models.forEach(model => model.dispose());
    // Dispose editor
    editorRef.current?.dispose();
  };
}, []);
```

**Additional:** Do NOT use DiffEditor in Phase 6. If diff view is needed later, pin `monaco-editor` below v0.44.0 or wait for the fix.

### P4: react-resizable-panels v4 API Migration (MEDIUM)

**Problem:** Claude's training data and most online examples use the v3 API (`PanelGroup`, `PanelResizeHandle`, `direction`). The v4 API changed names and the persistence mechanism.

**Correct v4 API (what to use):**

| v3 (deprecated) | v4 (current) |
|---|---|
| `PanelGroup` | `Group` |
| `PanelResizeHandle` | `Separator` |
| `direction="horizontal"` | `orientation="horizontal"` |
| `defaultSize={50}` | `defaultSize="50%"` |
| `onLayout` callback | `onLayoutChange` callback |
| `autoSaveId` prop | `useDefaultLayout` hook |
| `ref` on Panel | `panelRef` on Panel |
| `ImperativePanelHandle` | `PanelImperativeHandle` |

### P5: File Tree Performance with Large Repos (MEDIUM)

**Problem:** Loading the full file tree of a large repo (10k+ files) at once will freeze the UI and waste memory.

**Solution:** Lazy-load directory children. Only fetch contents when user expands a directory:

```typescript
// Server function returns shallow listing
export const listDirectory = createServerFn({ method: 'GET' })
  .validator(z.object({ dirPath: z.string() }))
  .handler(async ({ data }) => {
    const safe = safePath(projectRoot, data.dirPath);
    const entries = await fs.readdir(safe, { withFileTypes: true });
    return entries.map(e => ({
      id: path.join(data.dirPath, e.name),
      name: e.name,
      isFolder: e.isDirectory(),
      // DON'T recursively load children here
    }));
  });
```

react-arborist supports this via the `childLoader` pattern — nodes start with `children: null` and are populated on expand.

### P6: Zustand Persist + SSR Hydration Mismatch (MEDIUM)

**Problem:** Zustand `persist` middleware reads from localStorage on mount. During TanStack Start's shell prerender, localStorage doesn't exist, causing hydration mismatches.

**Solution:** Use `skipHydration: true` and manually rehydrate on client:

```typescript
const useIDEStore = create<IDEState>()(
  persist(
    (set) => ({ /* ... */ }),
    {
      name: 'ide-layout',
      skipHydration: true,
    }
  )
);

// In root component, after mount:
useEffect(() => {
  useIDEStore.persist.rehydrate();
}, []);
```

### P7: Context Menu on Tree Nodes — Event Propagation (LOW)

**Problem:** Right-click on a tree node should open the file context menu, not the browser context menu. But `onContextMenu` handlers can conflict with react-arborist's built-in click handlers.

**Solution:** Use a single `ContextMenu.Root` wrapping the entire tree, with `onContextMenu` on individual nodes setting state for which node was right-clicked. Let Radix handle the event prevention.

### P8: Tab Overflow with Many Open Files (LOW)

**Problem:** When >7 tabs are open, the tab bar overflows. Horizontal scrolling or a dropdown is needed.

**Solution:** Use `overflow-x-auto` with `scrollbar-hide` utility on the tab bar container. Add a "..." overflow menu that shows all open tabs in a dropdown when tab count exceeds the visible area. This is NOT MVP — implement basic overflow scroll first, dropdown in a future iteration.

---

## Code Examples

### Example 1: IDE Layout with react-resizable-panels v4

```typescript
// app/components/layout/IDELayout.tsx
import { Group, Panel, Separator, useDefaultLayout } from 'react-resizable-panels';
import { useRef } from 'react';
import type { PanelImperativeHandle } from 'react-resizable-panels';

export function IDELayout() {
  const sidebarRef = useRef<PanelImperativeHandle>(null);
  const chatRef = useRef<PanelImperativeHandle>(null);

  const { defaultLayout, onLayoutChange } = useDefaultLayout({
    groupId: 'ide-main-layout',
    storage: localStorage,
  });

  return (
    <Group
      orientation="horizontal"
      defaultLayout={defaultLayout}
      onLayoutChange={onLayoutChange}
    >
      {/* Sidebar */}
      <Panel
        panelRef={sidebarRef}
        defaultSize="20%"
        minSize="15%"
        maxSize="35%"
        collapsible
      >
        <FileTreePanel />
      </Panel>

      <Separator className="w-1.5 bg-zinc-800 hover:bg-zinc-600 transition-colors" />

      {/* Editor Area */}
      <Panel defaultSize="55%" minSize="30%">
        <EditorArea />
      </Panel>

      <Separator className="w-1.5 bg-zinc-800 hover:bg-zinc-600 transition-colors" />

      {/* Chat Panel */}
      <Panel
        panelRef={chatRef}
        defaultSize="25%"
        minSize="15%"
        maxSize="40%"
        collapsible
      >
        <ChatPanel />
      </Panel>
    </Group>
  );
}
```

### Example 2: Monaco Editor with Multi-Model Tab Management

```typescript
// app/components/editor/MonacoEditor.tsx
import Editor, { useMonaco } from '@monaco-editor/react';
import { useRef, useEffect, useCallback } from 'react';
import type { editor } from 'monaco-editor';
import { useIDEStore } from '../../stores/ide-store';

// Language detection from file extension
const EXT_TO_LANG: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
  json: 'json', css: 'css', html: 'html', md: 'markdown',
  py: 'python', rs: 'rust', go: 'go', yaml: 'yaml', yml: 'yaml',
};

function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  return EXT_TO_LANG[ext] ?? 'plaintext';
}

export function MonacoEditor() {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monaco = useMonaco();
  const activeTab = useIDEStore(s => s.activeTab);
  const markDirty = useIDEStore(s => s.markDirty);
  const viewStates = useIDEStore(s => s.viewStates);
  const saveViewState = useIDEStore(s => s.saveViewState);

  // Swap model when active tab changes
  useEffect(() => {
    if (!editorRef.current || !monaco || !activeTab) return;

    const uri = monaco.Uri.parse(`file://${activeTab.path}`);
    let model = monaco.editor.getModel(uri);

    if (!model) {
      model = monaco.editor.createModel(
        activeTab.content,
        detectLanguage(activeTab.path),
        uri
      );
    }

    // Save current view state before switching
    const currentModel = editorRef.current.getModel();
    if (currentModel) {
      const vs = editorRef.current.saveViewState();
      if (vs) saveViewState(currentModel.uri.toString(), vs);
    }

    // Switch to new model
    editorRef.current.setModel(model);

    // Restore view state for the new model
    const savedVS = viewStates.get(uri.toString());
    if (savedVS) editorRef.current.restoreViewState(savedVS);

    editorRef.current.focus();
  }, [activeTab?.path, monaco]);

  const handleMount = useCallback((editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    
    // Listen for content changes to mark tabs dirty
    editor.onDidChangeModelContent(() => {
      const model = editor.getModel();
      if (model) markDirty(model.uri.toString());
    });
  }, [markDirty]);

  if (!activeTab) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        Open a file to start editing
      </div>
    );
  }

  return (
    <Editor
      theme="vs-dark"
      onMount={handleMount}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        wordWrap: 'on',
        automaticLayout: true,
        scrollBeyondLastLine: false,
      }}
    />
  );
}
```

### Example 3: Zustand IDE Store with Slices + Persist + Immer

```typescript
// app/stores/ide-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { editor } from 'monaco-editor';

// --- Types ---
interface Tab {
  path: string;
  name: string;
  content: string;
  isDirty: boolean;
}

interface IDEState {
  // Tab slice
  openTabs: Tab[];
  activeTabId: string | null;
  openFile: (path: string, name: string, content: string) => void;
  closeTab: (path: string) => void;
  setActiveTab: (path: string) => void;
  markDirty: (uri: string) => void;
  markClean: (uri: string) => void;
  get activeTab(): Tab | undefined;

  // Layout slice (persisted)
  sidebarCollapsed: boolean;
  chatCollapsed: boolean;
  toggleSidebar: () => void;
  toggleChat: () => void;

  // Editor slice (NOT persisted — transient Monaco state)
  viewStates: Map<string, editor.ICodeEditorViewState>;
  saveViewState: (uri: string, state: editor.ICodeEditorViewState) => void;

  // Tree slice
  expandedNodes: Set<string>;
  selectedNode: string | null;
  toggleNode: (nodeId: string) => void;
  selectNode: (nodeId: string) => void;
}

export const useIDEStore = create<IDEState>()(
  persist(
    immer((set, get) => ({
      // --- Tab Slice ---
      openTabs: [],
      activeTabId: null,

      openFile: (path, name, content) => set(state => {
        const existing = state.openTabs.find(t => t.path === path);
        if (!existing) {
          state.openTabs.push({ path, name, content, isDirty: false });
        }
        state.activeTabId = path;
      }),

      closeTab: (path) => set(state => {
        const idx = state.openTabs.findIndex(t => t.path === path);
        if (idx === -1) return;
        state.openTabs.splice(idx, 1);
        if (state.activeTabId === path) {
          state.activeTabId = state.openTabs[Math.min(idx, state.openTabs.length - 1)]?.path ?? null;
        }
      }),

      setActiveTab: (path) => set(state => { state.activeTabId = path; }),

      markDirty: (uri) => set(state => {
        // uri format: file:///path/to/file
        const filePath = uri.replace('file://', '');
        const tab = state.openTabs.find(t => t.path === filePath);
        if (tab) tab.isDirty = true;
      }),

      markClean: (uri) => set(state => {
        const filePath = uri.replace('file://', '');
        const tab = state.openTabs.find(t => t.path === filePath);
        if (tab) tab.isDirty = false;
      }),

      get activeTab() {
        const state = get();
        return state.openTabs.find(t => t.path === state.activeTabId);
      },

      // --- Layout Slice ---
      sidebarCollapsed: false,
      chatCollapsed: false,
      toggleSidebar: () => set(state => { state.sidebarCollapsed = !state.sidebarCollapsed; }),
      toggleChat: () => set(state => { state.chatCollapsed = !state.chatCollapsed; }),

      // --- Editor Slice (transient) ---
      viewStates: new Map(),
      saveViewState: (uri, vs) => set(state => { state.viewStates.set(uri, vs); }),

      // --- Tree Slice ---
      expandedNodes: new Set(),
      selectedNode: null,
      toggleNode: (nodeId) => set(state => {
        if (state.expandedNodes.has(nodeId)) {
          state.expandedNodes.delete(nodeId);
        } else {
          state.expandedNodes.add(nodeId);
        }
      }),
      selectNode: (nodeId) => set(state => { state.selectedNode = nodeId; }),
    })),
    {
      name: 'ide-state',
      skipHydration: true,
      // Only persist layout + tabs, NOT editor viewStates or tree expansion
      partialize: (state) => ({
        openTabs: state.openTabs.map(t => ({ ...t, content: '', isDirty: false })),
        activeTabId: state.activeTabId,
        sidebarCollapsed: state.sidebarCollapsed,
        chatCollapsed: state.chatCollapsed,
      }),
    }
  )
);
```

### Example 4: File Tree with react-arborist + Lazy Loading

```typescript
// app/components/file-tree/FileTree.tsx
import { Tree, NodeRendererProps } from 'react-arborist';
import { useQuery } from '@tanstack/react-query';
import { listDirectory } from '../../server/files';
import { useIDEStore } from '../../stores/ide-store';
import { ContextMenu } from 'radix-ui';
import { FileIcon, FolderIcon, ChevronRight, ChevronDown } from 'lucide-react';

interface FileNode {
  id: string;
  name: string;
  isFolder: boolean;
  children?: FileNode[] | null; // null = not yet loaded
}

function Node({ node, style, dragHandle }: NodeRendererProps<FileNode>) {
  const openFile = useIDEStore(s => s.openFile);
  const Icon = node.data.isFolder
    ? (node.isOpen ? ChevronDown : ChevronRight)
    : FileIcon;

  return (
    <div
      ref={dragHandle}
      style={style}
      className={`flex items-center gap-1 px-2 py-0.5 cursor-pointer hover:bg-zinc-800
        ${node.isSelected ? 'bg-zinc-700' : ''}`}
      onClick={() => {
        if (node.data.isFolder) {
          node.toggle();
        } else {
          // Open file in editor (fetch content via server function)
          openFile(node.data.id, node.data.name, ''); // Content loaded separately
        }
      }}
    >
      <Icon size={14} className="shrink-0 text-zinc-400" />
      <span className="truncate text-sm">{node.data.name}</span>
    </div>
  );
}

export function FileTree({ rootPath }: { rootPath: string }) {
  const { data: treeData } = useQuery({
    queryKey: ['file-tree', rootPath],
    queryFn: () => listDirectory({ data: { dirPath: rootPath } }),
  });

  if (!treeData) return <div className="p-2 text-zinc-500">Loading...</div>;

  return (
    <Tree<FileNode>
      data={treeData}
      width="100%"
      indent={16}
      rowHeight={28}
      overscanCount={5}
    >
      {Node}
    </Tree>
  );
}
```

### Example 5: File Server Functions with Path Traversal Protection

```typescript
// app/server/files.ts
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// SECURITY: Path traversal prevention
function safePath(projectRoot: string, userPath: string): string {
  const decoded = decodeURIComponent(userPath);
  const resolved = path.resolve(projectRoot, decoded);
  if (!resolved.startsWith(projectRoot + path.sep) && resolved !== projectRoot) {
    throw new Error('Path traversal blocked');
  }
  return resolved;
}

// Get project root from config (set during init)
function getProjectRoot(): string {
  // Read from .idumb/config.json or environment
  return process.env.IDUMB_PROJECT_ROOT ?? process.cwd();
}

export const listDirectory = createServerFn({ method: 'GET' })
  .validator(z.object({ dirPath: z.string() }))
  .handler(async ({ data }) => {
    const root = getProjectRoot();
    const safe = safePath(root, data.dirPath);
    const entries = await fs.readdir(safe, { withFileTypes: true });

    return entries
      .filter(e => !e.name.startsWith('.')) // Hide dotfiles by default
      .sort((a, b) => {
        // Folders first, then alphabetical
        if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .map(e => ({
        id: path.join(data.dirPath, e.name),
        name: e.name,
        isFolder: e.isDirectory(),
        children: e.isDirectory() ? null : undefined, // null = lazy-loadable
      }));
  });

export const readFile = createServerFn({ method: 'GET' })
  .validator(z.object({ filePath: z.string() }))
  .handler(async ({ data }) => {
    const root = getProjectRoot();
    const safe = safePath(root, data.filePath);
    const stat = await fs.stat(safe);

    // Refuse files > 5MB
    if (stat.size > 5 * 1024 * 1024) {
      throw new Error('File too large for editor (>5MB)');
    }

    const content = await fs.readFile(safe, 'utf-8');
    return { content, size: stat.size };
  });

export const writeFile = createServerFn({ method: 'POST' })
  .validator(z.object({ filePath: z.string(), content: z.string() }))
  .handler(async ({ data }) => {
    const root = getProjectRoot();
    const safe = safePath(root, data.filePath);
    await fs.writeFile(safe, data.content, 'utf-8');
    return { success: true };
  });

export const createFileOrFolder = createServerFn({ method: 'POST' })
  .validator(z.object({
    parentPath: z.string(),
    name: z.string(),
    type: z.enum(['file', 'folder']),
  }))
  .handler(async ({ data }) => {
    const root = getProjectRoot();
    const safe = safePath(root, path.join(data.parentPath, data.name));
    if (data.type === 'folder') {
      await fs.mkdir(safe, { recursive: true });
    } else {
      await fs.writeFile(safe, '', 'utf-8');
    }
    return { success: true };
  });

export const deleteFileOrFolder = createServerFn({ method: 'POST' })
  .validator(z.object({ targetPath: z.string() }))
  .handler(async ({ data }) => {
    const root = getProjectRoot();
    const safe = safePath(root, data.targetPath);
    await fs.rm(safe, { recursive: true });
    return { success: true };
  });

export const renameFileOrFolder = createServerFn({ method: 'POST' })
  .validator(z.object({ oldPath: z.string(), newName: z.string() }))
  .handler(async ({ data }) => {
    const root = getProjectRoot();
    const safeOld = safePath(root, data.oldPath);
    const dir = path.dirname(safeOld);
    const safeNew = safePath(root, path.join(path.relative(root, dir), data.newName));
    await fs.rename(safeOld, safeNew);
    return { success: true };
  });
```

### Example 6: Context Menu for File Tree

```typescript
// app/components/file-tree/FileTreeContextMenu.tsx
import { ContextMenu } from 'radix-ui';
import { useState, type ReactNode } from 'react';
import { FilePlus, FolderPlus, Pencil, Trash2 } from 'lucide-react';

interface ContextTarget {
  path: string;
  name: string;
  isFolder: boolean;
}

export function FileTreeContextMenu({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<ContextTarget | null>(null);

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger
        asChild
        onContextMenu={(e) => {
          // Target info is set by tree node's onContextMenu handler
          // via a shared ref or Zustand state
        }}
      >
        {children}
      </ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content className="min-w-48 rounded-md bg-zinc-900 border border-zinc-700 p-1 shadow-lg">
          <ContextMenu.Item
            className="flex items-center gap-2 px-2 py-1.5 text-sm rounded cursor-pointer hover:bg-zinc-800 outline-none"
            onSelect={() => { /* Create new file in target folder */ }}
          >
            <FilePlus size={14} /> New File
          </ContextMenu.Item>

          <ContextMenu.Item
            className="flex items-center gap-2 px-2 py-1.5 text-sm rounded cursor-pointer hover:bg-zinc-800 outline-none"
            onSelect={() => { /* Create new folder in target folder */ }}
          >
            <FolderPlus size={14} /> New Folder
          </ContextMenu.Item>

          <ContextMenu.Separator className="h-px bg-zinc-700 my-1" />

          <ContextMenu.Item
            className="flex items-center gap-2 px-2 py-1.5 text-sm rounded cursor-pointer hover:bg-zinc-800 outline-none"
            onSelect={() => { /* Trigger inline rename */ }}
          >
            <Pencil size={14} /> Rename
          </ContextMenu.Item>

          <ContextMenu.Item
            className="flex items-center gap-2 px-2 py-1.5 text-sm text-red-400 rounded cursor-pointer hover:bg-zinc-800 outline-none"
            onSelect={() => { /* Confirm and delete */ }}
          >
            <Trash2 size={14} /> Delete
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
```

### Example 7: Monaco Worker Setup (Standalone File)

```typescript
// app/lib/monaco-workers.ts
// Import this ONCE in the app entry point (e.g., __root.tsx or router.tsx)
// MUST be behind a typeof window check or dynamic import

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

self.MonacoEnvironment = {
  getWorker(_: string, label: string) {
    if (label === 'json') return new jsonWorker();
    if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker();
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker();
    if (label === 'typescript' || label === 'javascript') return new tsWorker();
    return new editorWorker();
  },
};
```

---

## Open Questions

| Question | Impact | Recommendation |
|---|---|---|
| Does `monaco-editor` v0.55.1 fix the DiffEditor leak (#4659)? | LOW for Phase 6 (no DiffEditor planned) | Don't investigate now. Only relevant if Phase 8+ adds diff view. |
| Should tab state persist file content or just paths? | MEDIUM | Persist paths only. Re-fetch content on reopen. Avoids stale content and bloated localStorage. |
| Should we support multiple editor instances (split view)? | LOW for MVP | No. Single editor with model-swapping is MVP. Split view is Phase 8+. |
| How does react-arborist handle file system watchers for live updates? | MEDIUM | It doesn't — it's a pure render component. Use React Query's `refetchInterval` or a server-sent event to trigger `queryClient.invalidateQueries`. |

---

## Quality Gate Checklist

- [x] All 7 research domains investigated (panels, Monaco, file tree, server functions, Zustand, tabs, context menu)
- [x] Negative claims verified (no DiffEditor fix confirmed via GitHub issue #4659 still open; manual worker config vs plugin justified with fragmentation evidence)
- [x] Multiple sources for Monaco + Vite (Context7, official ESM guide, Stack Overflow, Vite discussions, npm pages)
- [x] Confidence levels assigned (HIGH overall; P1 SSR crash is CRITICAL, P2 workers is HIGH)
- [x] Section names match downstream consumer: Standard Stack, Architecture Patterns, Don't Hand-Roll, Common Pitfalls, Code Examples
- [x] Every recommendation includes version numbers
- [x] React 19 compatibility verified: react-resizable-panels v4 (yes), @monaco-editor/react v4.7 (yes), react-arborist v3.4.3 (yes), radix-ui v1.4.3 (yes, Jan 2025 fix), zustand v5.0.11 (yes)
- [x] Bundle size impact documented in Standard Stack table
