/**
 * Layout Store — Zustand + persist + immer for IDE panel state.
 *
 * Manages panel sizes, collapse state, and active panel for the IDE Shell.
 * Persisted to localStorage so layout survives page reloads.
 *
 * react-resizable-panels v4 uses percentage-based sizing with Group/Panel/Separator.
 * This store provides the source of truth for panel sizes, synced via onLayoutChange.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { PanelId, PanelConfig } from '@/shared/ide-types'

// --- Panel configuration constants ---

/** Default panel configs: sidebar(20%), editor(70%), terminal(30%) */
export const IDE_PANELS: Record<PanelId, PanelConfig> = {
  sidebar: {
    id: 'sidebar',
    defaultSize: 20,
    minSize: 10,
    maxSize: 35,
    collapsible: true,
    position: 'left',
  },
  editor: {
    id: 'editor',
    defaultSize: 70,
    minSize: 30,
    maxSize: 85,
    collapsible: false,
    position: 'center',
  },
  terminal: {
    id: 'terminal',
    defaultSize: 30,
    minSize: 15,
    maxSize: 50,
    collapsible: true,
    position: 'bottom',
  },
} as const

/** Panel order for the horizontal Group (sidebar + editor area) */
export const PANEL_IDS: PanelId[] = ['sidebar', 'editor', 'terminal']

// --- Store types (flat — no extends, so immer's WritableDraft resolves correctly) ---

interface LayoutState {
  /** Panel sizes as { panelId: percentage } */
  panelSizes: Record<PanelId, number>
  /** Array of collapsed panel IDs */
  collapsed: PanelId[]
  /** Currently focused panel */
  activePanel: PanelId

  // Actions
  /** Update a single panel's size (percentage) */
  setPanelSize: (id: PanelId, size: number) => void
  /** Batch-update all panel sizes from onLayoutChange callback */
  setPanelSizes: (sizes: Record<PanelId, number>) => void
  /** Toggle a panel's collapsed state */
  togglePanel: (id: PanelId) => void
  /** Set the active (focused) panel */
  setActivePanel: (id: PanelId) => void
  /** Reset all panels to defaults */
  resetLayout: () => void
}

// --- Store creation ---

export const useLayoutStore = create<LayoutState>()(
  persist(
    immer((set) => ({
      // Initial state
      panelSizes: {
        sidebar: IDE_PANELS.sidebar.defaultSize,
        editor: IDE_PANELS.editor.defaultSize,
        terminal: IDE_PANELS.terminal.defaultSize,
      },
      collapsed: [] as PanelId[],
      activePanel: 'editor' as PanelId,

      setPanelSize: (id: PanelId, size: number) =>
        set((state) => {
          state.panelSizes[id] = size
        }),

      setPanelSizes: (sizes: Record<PanelId, number>) =>
        set((state) => {
          state.panelSizes = sizes
        }),

      togglePanel: (id: PanelId) =>
        set((state) => {
          const config = IDE_PANELS[id]
          if (!config.collapsible) return

          const idx = state.collapsed.indexOf(id)
          if (idx >= 0) {
            state.collapsed.splice(idx, 1)
          } else {
            state.collapsed.push(id)
          }
        }),

      setActivePanel: (id: PanelId) =>
        set((state) => {
          state.activePanel = id
        }),

      resetLayout: () =>
        set((state) => {
          state.panelSizes = {
            sidebar: IDE_PANELS.sidebar.defaultSize,
            editor: IDE_PANELS.editor.defaultSize,
            terminal: IDE_PANELS.terminal.defaultSize,
          }
          state.collapsed = []
          state.activePanel = 'editor'
        }),
    })),
    {
      name: 'idumb-ide-layout',
      // Only persist layout data, not action functions
      partialize: (state) => ({
        panelSizes: state.panelSizes,
        collapsed: state.collapsed,
        activePanel: state.activePanel,
      }),
    },
  ),
)
