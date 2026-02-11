/**
 * TerminalPanel — Terminal panel component wrapping xterm.js with header bar.
 *
 * Renders an integrated terminal with:
 * - Header bar: terminal icon, title, connection status, reconnect button
 * - xterm.js container: fills remaining space
 * - Error overlay: shown when connection fails
 *
 * Must be lazy-loaded (React.lazy) to avoid SSR issues with xterm.js DOM APIs.
 */

import { useRef } from "react"
import { TerminalSquare, RotateCcw } from "lucide-react"
import { useTerminal } from "@/hooks/useTerminal"

export function TerminalPanel() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { isConnected, error, reconnect } = useTerminal(containerRef)

  return (
    <div className="flex h-full flex-col bg-terminal text-terminal-foreground">
      {/* Header bar */}
      <div className="flex h-8 shrink-0 items-center justify-between border-t border-border px-3">
        <div className="flex items-center gap-2">
          <TerminalSquare className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Terminal
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Connection status indicator */}
          <div className="flex items-center gap-1.5">
            <div
              className={`h-2 w-2 rounded-full ${
                isConnected
                  ? "bg-governance-allow"
                  : "bg-destructive"
              }`}
            />
            <span className="text-[10px] text-muted-foreground">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>

          {/* Reconnect button — only when disconnected */}
          {!isConnected && (
            <button
              type="button"
              onClick={reconnect}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              title="Reconnect terminal"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Terminal container */}
      <div className="relative flex-1 min-h-0">
        <div
          ref={containerRef}
          className="h-full w-full"
        />

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-terminal/90">
            <p className="text-sm text-destructive">{error}</p>
            <button
              type="button"
              onClick={reconnect}
              className="rounded-md bg-accent px-3 py-1.5 text-xs text-accent-foreground transition-colors hover:bg-accent/80"
            >
              Retry Connection
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
