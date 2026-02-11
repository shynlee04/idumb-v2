/**
 * TabBar — Horizontal strip of open file tabs above the Monaco editor.
 *
 * Features:
 * - Click tab → setActiveTab (model swap happens in MonacoEditor)
 * - Middle-click or X button → closeTab
 * - Dirty dot indicator for unsaved changes
 * - Active tab visually distinguished from inactive
 * - Keyboard: ← / → to navigate, Delete/Backspace to close
 */

import { useCallback, useRef, type KeyboardEvent, type MouseEvent } from 'react'
import { X } from 'lucide-react'
import { useIDEStore } from '../../stores/ide-store'
import type { Tab } from '../../shared/ide-types'

export function TabBar() {
  const openTabs = useIDEStore(s => s.openTabs)
  const activeTabId = useIDEStore(s => s.activeTabId)
  const setActiveTab = useIDEStore(s => s.setActiveTab)
  const closeTab = useIDEStore(s => s.closeTab)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleClose = useCallback(
    (e: MouseEvent, path: string) => {
      e.stopPropagation()
      closeTab(path)
    },
    [closeTab],
  )

  const handleMiddleClick = useCallback(
    (e: MouseEvent, path: string) => {
      if (e.button === 1) {
        e.preventDefault()
        closeTab(path)
      }
    },
    [closeTab],
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!activeTabId || openTabs.length === 0) return
      const idx = openTabs.findIndex(t => t.path === activeTabId)
      if (idx === -1) return

      if (e.key === 'ArrowRight' && idx < openTabs.length - 1) {
        e.preventDefault()
        setActiveTab(openTabs[idx + 1].path)
      } else if (e.key === 'ArrowLeft' && idx > 0) {
        e.preventDefault()
        setActiveTab(openTabs[idx - 1].path)
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        closeTab(activeTabId)
      }
    },
    [activeTabId, openTabs, setActiveTab, closeTab],
  )

  if (openTabs.length === 0) return null

  return (
    <div
      ref={containerRef}
      role="tablist"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="flex h-9 shrink-0 items-stretch overflow-x-auto border-b border-border bg-sidebar scrollbar-thin"
    >
      {openTabs.map((tab: Tab) => {
        const isActive = tab.path === activeTabId
        return (
          <button
            key={tab.path}
            role="tab"
            aria-selected={isActive}
            onClick={() => setActiveTab(tab.path)}
            onMouseDown={e => handleMiddleClick(e, tab.path)}
            className={`
              group relative flex items-center gap-1.5 whitespace-nowrap border-r border-border px-3 text-xs
              transition-colors
              ${isActive
                ? 'bg-background text-foreground'
                : 'bg-sidebar text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
              }
            `}
          >
            {/* Active indicator top bar */}
            {isActive && (
              <div className="absolute inset-x-0 top-0 h-0.5 bg-primary" />
            )}

            {/* File name */}
            <span className="max-w-[160px] truncate">{tab.name}</span>

            {/* Dirty dot / close button */}
            {tab.isDirty ? (
              <span
                className="ml-0.5 inline-block h-2 w-2 shrink-0 rounded-full bg-amber-400"
                title="Unsaved changes"
              />
            ) : (
              <span
                role="button"
                tabIndex={-1}
                onClick={e => handleClose(e, tab.path)}
                className="ml-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
                title="Close"
              >
                <X className="h-3 w-3" />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
