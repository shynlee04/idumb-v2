/**
 * LazyDiffViewer — SSR-safe lazy wrapper for Monaco DiffEditor.
 *
 * Same pattern as MonacoEditor.lazy.tsx:
 * 1. Returns null on server (typeof window === 'undefined')
 * 2. Uses React.lazy for code-splitting
 * 3. Shows pulse animation while loading
 */
import { lazy, Suspense } from 'react'

const DiffViewerInner = lazy(() =>
  import('./DiffViewer').then(m => ({ default: m.DiffViewer }))
)

interface LazyDiffViewerProps {
  sessionId: string | undefined
}

export function LazyDiffViewer({ sessionId }: LazyDiffViewerProps) {
  if (typeof window === 'undefined') return null
  if (!sessionId) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p className="text-sm">Select a session to view changes</p>
      </div>
    )
  }
  return (
    <Suspense fallback={<div className="h-full bg-zinc-900 animate-pulse" />}>
      <DiffViewerInner sessionId={sessionId} />
    </Suspense>
  )
}
