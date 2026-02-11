/**
 * IDEShell — Main IDE layout using react-resizable-panels v4.
 *
 * Layout structure:
 *   Horizontal Group
 *     ├── Panel [sidebar]  — file tree / navigation
 *     ├── Separator
 *     └── Panel [editor-area]
 *         └── Vertical Group
 *             ├── Panel [editor]   — Monaco code editor
 *             ├── Separator
 *             └── Panel [terminal] — AI chat / terminal output
 *
 * Uses Zustand layout store for persistence.
 * Panels are collapsible via keyboard shortcuts or UI controls.
 */

import { useCallback, useEffect, useRef } from 'react'
import {
  Group,
  Panel,
  Separator,
  type PanelImperativeHandle,
  type PanelSize,
} from 'react-resizable-panels'
import { useLayoutStore, IDE_PANELS } from '@/stores/layout-store'
import type { PanelId } from '@/shared/ide-types'
import { FileTree } from '../file-tree/FileTree'
import { FileTreeContextMenu } from '../file-tree/FileTreeContextMenu'
import { EditorArea } from '../editor/EditorArea'

// --- Placeholder panels (replaced in Plan 02/03) ---

function SidebarPanel() {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-10 items-center border-b border-border px-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Explorer
        </span>
      </div>
      <div className="flex-1 overflow-hidden">
        <FileTreeContextMenu>
          <FileTree rootPath="." />
        </FileTreeContextMenu>
      </div>
    </div>
  )
}

// EditorPlaceholder removed — replaced by EditorArea (Plan 03)

function TerminalPlaceholder() {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-8 items-center border-t border-border px-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Terminal
        </span>
      </div>
      <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">
        Chat / Terminal (Plan 02)
      </div>
    </div>
  )
}

// --- Separator handle styling ---

function ResizeHandle({ orientation }: { orientation: 'horizontal' | 'vertical' }) {
  const isHorizontal = orientation === 'horizontal'
  return (
    <div
      className={`
        group relative flex items-center justify-center
        ${isHorizontal ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize'}
        bg-border transition-colors hover:bg-primary/50
        data-[resize-handle-active]:bg-primary
      `}
    >
      {/* Grip dots for visual affordance */}
      <div
        className={`
          absolute opacity-0 transition-opacity group-hover:opacity-100
          ${isHorizontal ? 'flex-col space-y-0.5' : 'flex-row space-x-0.5'}
          flex
        `}
      >
        <div className="h-1 w-1 rounded-full bg-muted-foreground/50" />
        <div className="h-1 w-1 rounded-full bg-muted-foreground/50" />
        <div className="h-1 w-1 rounded-full bg-muted-foreground/50" />
      </div>
    </div>
  )
}

// --- Main IDEShell ---

export function IDEShell() {
  const {
    panelSizes,
    collapsed,
    setPanelSizes,
    setActivePanel,
    togglePanel,
  } = useLayoutStore()

  // Refs for imperative collapse/expand/resize
  const sidebarRef = useRef<PanelImperativeHandle>(null)
  const editorRef = useRef<PanelImperativeHandle>(null)
  const terminalRef = useRef<PanelImperativeHandle>(null)

  // --- Hydration: restore persisted sizes + collapse state on mount ---
  useEffect(() => {
    const unsub = useLayoutStore.persist.onFinishHydration((state) => {
      // Restore sizes via imperative resize (percentage values)
      sidebarRef.current?.resize(state.panelSizes.sidebar)
      editorRef.current?.resize(state.panelSizes.editor)
      terminalRef.current?.resize(state.panelSizes.terminal)

      // Restore collapsed panels
      if (state.collapsed.includes('sidebar')) {
        sidebarRef.current?.collapse()
      }
      if (state.collapsed.includes('terminal')) {
        terminalRef.current?.collapse()
      }
    })

    // If hydration already completed (sync localStorage), apply immediately
    if (useLayoutStore.persist.hasHydrated()) {
      const state = useLayoutStore.getState()
      sidebarRef.current?.resize(state.panelSizes.sidebar)
      editorRef.current?.resize(state.panelSizes.editor)
      terminalRef.current?.resize(state.panelSizes.terminal)

      if (state.collapsed.includes('sidebar')) {
        sidebarRef.current?.collapse()
      }
      if (state.collapsed.includes('terminal')) {
        terminalRef.current?.collapse()
      }
    }

    return unsub
  }, [])

  // --- Keyboard shortcut: Cmd+B toggles sidebar ---
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        const panel = sidebarRef.current
        if (!panel) return
        if (panel.isCollapsed()) {
          panel.expand()
        } else {
          panel.collapse()
        }
        togglePanel('sidebar')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [togglePanel])

  // --- Collapse state sync: detect collapse/expand from drag interactions ---
  const handleSidebarResize = useCallback(
    (panelSize: PanelSize) => {
      setActivePanel('sidebar')
      const isNowCollapsed = panelSize.asPercentage <= 0.1
      const wasCollapsed = collapsed.includes('sidebar')
      if (isNowCollapsed !== wasCollapsed) {
        togglePanel('sidebar')
      }
    },
    [collapsed, togglePanel, setActivePanel],
  )

  const handleTerminalResize = useCallback(
    (panelSize: PanelSize) => {
      setActivePanel('terminal')
      const isNowCollapsed = panelSize.asPercentage <= 0.1
      const wasCollapsed = collapsed.includes('terminal')
      if (isNowCollapsed !== wasCollapsed) {
        togglePanel('terminal')
      }
    },
    [collapsed, togglePanel, setActivePanel],
  )

  // Sync horizontal group layout changes to store
  const handleHorizontalLayoutChange = useCallback(
    (layout: Record<string, number>) => {
      // layout is { sidebar: %, 'editor-area': % }
      const sidebarSize = layout['sidebar']
      if (sidebarSize !== undefined) {
        setPanelSizes({
          sidebar: sidebarSize,
          editor: panelSizes.editor,
          terminal: panelSizes.terminal,
        })
      }
    },
    [setPanelSizes, panelSizes.editor, panelSizes.terminal],
  )

  // Sync vertical group layout changes to store
  const handleVerticalLayoutChange = useCallback(
    (layout: Record<string, number>) => {
      // layout is { editor: %, terminal: % }
      const editorSize = layout['editor']
      const terminalSize = layout['terminal']
      if (editorSize !== undefined && terminalSize !== undefined) {
        setPanelSizes({
          sidebar: panelSizes.sidebar,
          editor: editorSize,
          terminal: terminalSize,
        })
      }
    },
    [setPanelSizes, panelSizes.sidebar],
  )

  const isSidebarCollapsed = collapsed.includes('sidebar')
  const isTerminalCollapsed = collapsed.includes('terminal')

  return (
    <div
      className="h-screen w-screen overflow-hidden bg-background text-foreground"
      data-testid="ide-shell"
    >
      {/* Outer horizontal group: sidebar + editor area */}
      <Group
        id="ide-horizontal"
        orientation="horizontal"
        onLayoutChange={handleHorizontalLayoutChange}
      >
        {/* Sidebar panel */}
        <Panel
          id="sidebar"
          panelRef={sidebarRef}
          defaultSize={IDE_PANELS.sidebar.defaultSize}
          minSize={IDE_PANELS.sidebar.minSize}
          maxSize={IDE_PANELS.sidebar.maxSize}
          collapsible={IDE_PANELS.sidebar.collapsible}
          collapsedSize={0}
          onResize={handleSidebarResize}
        >
          <SidebarPanel />
        </Panel>

        {/* Horizontal separator */}
        <Separator id="sidebar-separator">
          <ResizeHandle orientation="horizontal" />
        </Separator>

        {/* Editor area panel (contains vertical group) */}
        <Panel
          id="editor-area"
          minSize={40}
        >
          {/* Inner vertical group: editor + terminal */}
          <Group
            id="ide-vertical"
            orientation="vertical"
            onLayoutChange={handleVerticalLayoutChange}
          >
            {/* Editor panel */}
            <Panel
              id="editor"
              panelRef={editorRef}
              defaultSize={IDE_PANELS.editor.defaultSize}
              minSize={IDE_PANELS.editor.minSize}
              onResize={() => setActivePanel('editor')}
            >
              <EditorArea />
            </Panel>

            {/* Vertical separator */}
            <Separator id="terminal-separator">
              <ResizeHandle orientation="vertical" />
            </Separator>

            {/* Terminal panel */}
            <Panel
              id="terminal"
              panelRef={terminalRef}
              defaultSize={IDE_PANELS.terminal.defaultSize}
              minSize={IDE_PANELS.terminal.minSize}
              maxSize={IDE_PANELS.terminal.maxSize}
              collapsible={IDE_PANELS.terminal.collapsible}
              collapsedSize={0}
              onResize={handleTerminalResize}
            >
              <TerminalPlaceholder />
            </Panel>
          </Group>
        </Panel>
      </Group>
    </div>
  )
}
