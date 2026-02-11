/**
 * /terminal — Standalone full-screen terminal page.
 *
 * Lazy-loads TerminalPanel to avoid SSR issues with xterm.js DOM APIs.
 * Provides a full-viewport terminal experience outside the IDE shell.
 */

import { createFileRoute } from "@tanstack/react-router"
import { lazy, Suspense } from "react"

const LazyTerminalPanel = lazy(() =>
  import("../components/terminal/TerminalPanel").then(m => ({ default: m.TerminalPanel }))
)

export const Route = createFileRoute("/terminal")({
  component: TerminalPage,
})

function TerminalPage() {
  return (
    <div className="h-screen w-screen bg-terminal">
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Loading terminal...
          </div>
        }
      >
        <LazyTerminalPanel />
      </Suspense>
    </div>
  )
}
