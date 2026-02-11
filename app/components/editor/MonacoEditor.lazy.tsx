/**
 * LazyMonacoEditor — SSR-safe lazy wrapper for Monaco editor.
 *
 * Pitfall P1 (from research): Monaco uses `navigator`, `window`, and Web Workers
 * which crash during TanStack Start shell prerender. This wrapper:
 * 1. Returns null on the server (`typeof window === 'undefined'`)
 * 2. Uses React.lazy for code-splitting (Monaco is ~4MB)
 * 3. Shows a pulse animation while loading
 */

import { lazy, Suspense } from 'react';

const MonacoEditorInner = lazy(() =>
  import('./MonacoEditor').then(m => ({ default: m.MonacoEditor })),
);

export function LazyMonacoEditor() {
  if (typeof window === 'undefined') return null;
  return (
    <Suspense fallback={<div className="h-full bg-zinc-900 animate-pulse" />}>
      <MonacoEditorInner />
    </Suspense>
  );
}
