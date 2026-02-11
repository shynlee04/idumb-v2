/**
 * EditorArea — Tab bar + Monaco editor, or welcome screen when no tabs open.
 *
 * Replaces the EditorPlaceholder in IDEShell.
 * Layout: TabBar on top, MonacoEditor fills remaining vertical space.
 * When no file is open, shows a welcome/empty state instead.
 */

import { useIDEStore } from '../../stores/ide-store'
import { TabBar } from './TabBar'
import { LazyMonacoEditor } from './MonacoEditor.lazy'

function WelcomeScreen() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
      <div className="text-5xl opacity-20">{'{ }'}</div>
      <p className="text-sm">Open a file from the explorer to start editing</p>
      <p className="text-xs opacity-60">Double-click a file or use the file tree</p>
    </div>
  )
}

export function EditorArea() {
  const openTabs = useIDEStore(s => s.openTabs)
  const hasOpenTabs = openTabs.length > 0

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      {hasOpenTabs ? (
        <>
          <TabBar />
          <div className="flex-1 overflow-hidden">
            <LazyMonacoEditor />
          </div>
        </>
      ) : (
        <WelcomeScreen />
      )}
    </div>
  )
}
