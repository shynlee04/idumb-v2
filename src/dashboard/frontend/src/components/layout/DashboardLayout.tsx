/**
 * Dashboard Layout — Resizable 3-column panel layout
 */

import { ReactNode, useRef, useState, useCallback } from "react"
import { Panel } from "./Panel"

interface DashboardLayoutProps {
  children: ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen w-screen flex-col bg-background">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🧠</span>
          <h1 className="font-semibold">iDumb Dashboard</h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Connected
          </span>
        </div>
      </header>

      {/* Main Content - 3 Panel Layout */}
      <main className="flex flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  )
}

interface ResizablePanelProps {
  children: ReactNode
  defaultWidth?: number
  minWidth?: number
  maxWidth?: number
  className?: string
}

export function ResizablePanel({
  children,
  defaultWidth = 320,
  minWidth = 200,
  maxWidth = 600,
  className = "",
}: ResizablePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(defaultWidth)
  const [isResizing, setIsResizing] = useState(false)

  const handleMouseDown = useCallback(() => {
    setIsResizing(true)
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !panelRef.current) return

    const newWidth = e.clientX
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setWidth(newWidth)
    }
  }, [isResizing, minWidth, maxWidth])

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
  }, [])

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [isResizing, handleMouseMove, handleMouseUp])

  return (
    <div
      ref={panelRef}
      className={`relative flex-shrink-0 ${className}`}
      style={{ width: `${width}px` }}
    >
      {children}
      {/* Resize Handle */}
      <div
        className={`
          absolute right-0 top-0 bottom-0 w-1 cursor-col-resize
          hover:bg-primary/20 active:bg-primary/40
          ${isResizing ? "bg-primary/40" : ""}
        `}
        onMouseDown={handleMouseDown}
      />
    </div>
  )
}
