/**
 * useTerminal — Hook managing PTY lifecycle, WebSocket connection, and xterm.js instance.
 *
 * Handles the full terminal lifecycle:
 * 1. Dynamically imports xterm.js (SSR-safe)
 * 2. Creates PTY session via SDK server functions
 * 3. Connects xterm.js to PTY WebSocket
 * 4. Synchronizes resize events between container and PTY
 * 5. Cleans up on unmount (WebSocket, PTY, terminal instance)
 *
 * @param containerRef — ref to the div where xterm.js renders
 * @returns { isConnected, error, reconnect }
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { createPtyFn, removePtyFn, resizePtyFn } from "@/server/pty.server"

interface TerminalState {
  isConnected: boolean
  error: string | null
}

export function useTerminal(
  containerRef: React.RefObject<HTMLDivElement | null>,
) {
  const [state, setState] = useState<TerminalState>({
    isConnected: false,
    error: null,
  })

  // Refs for cleanup — these survive re-renders without triggering them
  const termRef = useRef<{ dispose(): void } | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const ptyIdRef = useRef<string | null>(null)
  const fitAddonRef = useRef<{ fit(): void } | null>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)
  const connectingRef = useRef(false)

  // ─── Core connect logic ──────────────────────────────────────────────────

  const connect = useCallback(async () => {
    // Guard: SSR, no container, or already connecting
    if (typeof window === "undefined") return
    if (!containerRef.current) return
    if (connectingRef.current) return

    connectingRef.current = true
    setState({ isConnected: false, error: null })

    try {
      // 1. Dynamic import xterm.js (DOM-dependent, not SSR-safe)
      const [{ Terminal }, { FitAddon }] = await Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-fit"),
      ])

      if (!mountedRef.current || !containerRef.current) return

      // 2. Create terminal instance with theme matching app
      const fitAddon = new FitAddon()
      const term = new Terminal({
        cursorBlink: true,
        fontSize: 13,
        fontFamily: "var(--font-mono)",
        theme: {
          background: "#1e1e2e",
          foreground: "#cdd6f4",
          cursor: "#f5e0dc",
          selectionBackground: "#45475a",
          selectionForeground: "#cdd6f4",
          black: "#45475a",
          red: "#f38ba8",
          green: "#a6e3a1",
          yellow: "#f9e2af",
          blue: "#89b4fa",
          magenta: "#f5c2e7",
          cyan: "#94e2d5",
          white: "#bac2de",
          brightBlack: "#585b70",
          brightRed: "#f38ba8",
          brightGreen: "#a6e3a1",
          brightYellow: "#f9e2af",
          brightBlue: "#89b4fa",
          brightMagenta: "#f5c2e7",
          brightCyan: "#94e2d5",
          brightWhite: "#a6adc8",
        },
      })

      term.loadAddon(fitAddon)
      term.open(containerRef.current)

      // Fit after mount — timing is critical (must be after DOM paint)
      requestAnimationFrame(() => {
        if (mountedRef.current) {
          fitAddon.fit()
        }
      })

      termRef.current = term
      fitAddonRef.current = fitAddon

      // 3. Create PTY session via server function
      const ptyResult = await createPtyFn({ data: {} })
      if (!mountedRef.current) {
        term.dispose()
        return
      }

      ptyIdRef.current = ptyResult.id

      // 4. Connect WebSocket to PTY
      const ws = new WebSocket(ptyResult.wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        if (mountedRef.current) {
          setState({ isConnected: true, error: null })
        }
      }

      ws.onmessage = (event) => {
        // WS → terminal display
        if (typeof event.data === "string") {
          term.write(event.data)
        } else if (event.data instanceof Blob) {
          event.data.text().then((text) => term.write(text))
        }
      }

      ws.onclose = () => {
        if (mountedRef.current) {
          setState({ isConnected: false, error: null })
        }
      }

      ws.onerror = () => {
        if (mountedRef.current) {
          setState({ isConnected: false, error: "WebSocket connection failed" })
        }
      }

      // Terminal input → WS
      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data)
        }
      })

      // 5. Handle resize with ResizeObserver + debounce
      const observer = new ResizeObserver(() => {
        if (resizeTimerRef.current) {
          clearTimeout(resizeTimerRef.current)
        }
        resizeTimerRef.current = setTimeout(() => {
          if (!mountedRef.current) return
          fitAddon.fit()
          const id = ptyIdRef.current
          if (id && term.rows > 0 && term.cols > 0) {
            resizePtyFn({ data: { id, rows: term.rows, cols: term.cols } }).catch(
              () => {
                // Resize failure is non-critical — ignore
              },
            )
          }
        }, 100)
      })

      observer.observe(containerRef.current)
      resizeObserverRef.current = observer
    } catch (err) {
      if (mountedRef.current) {
        setState({
          isConnected: false,
          error: err instanceof Error ? err.message : "Failed to create terminal",
        })
      }
    } finally {
      connectingRef.current = false
    }
  }, [containerRef])

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  const cleanup = useCallback(() => {
    // Clear resize timer
    if (resizeTimerRef.current) {
      clearTimeout(resizeTimerRef.current)
      resizeTimerRef.current = null
    }

    // Disconnect ResizeObserver
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect()
      resizeObserverRef.current = null
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    // Remove PTY session
    const id = ptyIdRef.current
    if (id) {
      removePtyFn({ data: { id } }).catch(() => {
        // Cleanup failure is non-critical
      })
      ptyIdRef.current = null
    }

    // Dispose terminal
    if (termRef.current) {
      termRef.current.dispose()
      termRef.current = null
    }

    fitAddonRef.current = null
  }, [])

  // ─── Reconnect ────────────────────────────────────────────────────────────

  const reconnect = useCallback(() => {
    cleanup()
    connect()
  }, [cleanup, connect])

  // ─── Effect: connect on mount, cleanup on unmount ─────────────────────────

  useEffect(() => {
    mountedRef.current = true
    connect()

    return () => {
      mountedRef.current = false
      cleanup()
    }
  }, [connect, cleanup])

  return {
    isConnected: state.isConnected,
    error: state.error,
    reconnect,
  }
}
