/**
 * IDE Store — Zustand + immer for file/tab management.
 *
 * SEPARATE from layout-store.ts (which handles panel sizes).
 * This store manages open tabs, active tab, dirty tracking,
 * Monaco view state caching, and context menu target.
 *
 * NOT persisted — tab state is ephemeral per session.
 */

import { create } from "zustand"
import { immer } from "zustand/middleware/immer"
import type { Tab, ContextTarget } from "../shared/ide-types"

// ─── State Interface ───────────────────────────────────────────────────────

interface IDEState {
  /** Currently open tabs */
  openTabs: Tab[]
  /** Active tab file path (null = no tab selected) */
  activeTabId: string | null

  /** Monaco cursor/scroll view state cache keyed by file URI */
  viewStates: Record<string, unknown>

  /** Current right-click context menu target */
  contextTarget: ContextTarget | null

  // Actions
  openFile: (path: string, name: string) => void
  closeTab: (path: string) => void
  setActiveTab: (path: string) => void
  markDirty: (uriString: string) => void
  markClean: (uriString: string) => void
  saveViewState: (uriString: string, state: unknown) => void
  setContextTarget: (target: ContextTarget | null) => void
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Extract relative path from a Monaco-style file URI (file:///path → path). */
function uriToPath(uri: string): string {
  return uri.replace(/^file:\/\//, "")
}

// ─── Store ─────────────────────────────────────────────────────────────────

export const useIDEStore = create<IDEState>()(
  immer((set) => ({
    openTabs: [],
    activeTabId: null,
    viewStates: {},
    contextTarget: null,

    openFile: (path: string, name: string) =>
      set((state) => {
        const existing = state.openTabs.find((t) => t.path === path)
        if (existing) {
          // Tab already open — just activate it
          state.activeTabId = path
          return
        }
        state.openTabs.push({ path, name, isDirty: false })
        state.activeTabId = path
      }),

    closeTab: (path: string) =>
      set((state) => {
        const idx = state.openTabs.findIndex((t) => t.path === path)
        if (idx < 0) return

        state.openTabs.splice(idx, 1)

        // If closing the active tab, activate an adjacent tab
        if (state.activeTabId === path) {
          if (state.openTabs.length === 0) {
            state.activeTabId = null
          } else {
            // Activate the previous tab, or the first if at index 0
            const newIdx = Math.min(idx, state.openTabs.length - 1)
            state.activeTabId = state.openTabs[newIdx].path
          }
        }

        // Clean up view state for closed tab
        delete state.viewStates[path]
      }),

    setActiveTab: (path: string) =>
      set((state) => {
        state.activeTabId = path
      }),

    markDirty: (uriString: string) =>
      set((state) => {
        const filePath = uriToPath(uriString)
        const tab = state.openTabs.find((t) => t.path === filePath)
        if (tab) tab.isDirty = true
      }),

    markClean: (uriString: string) =>
      set((state) => {
        const filePath = uriToPath(uriString)
        const tab = state.openTabs.find((t) => t.path === filePath)
        if (tab) tab.isDirty = false
      }),

    saveViewState: (uriString: string, viewState: unknown) =>
      set((state) => {
        state.viewStates[uriString] = viewState
      }),

    setContextTarget: (target: ContextTarget | null) =>
      set((state) => {
        state.contextTarget = target
      }),
  })),
)
