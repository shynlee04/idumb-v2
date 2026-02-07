/**
 * Panel component — Collapsible panel with header
 */

import { ReactNode, useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"

interface PanelProps {
  children: ReactNode
  title: string
  defaultCollapsed?: boolean
  badge?: string | number
  className?: string
}

export function Panel({
  children,
  title,
  defaultCollapsed = false,
  badge,
  className = "",
}: PanelProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  return (
    <div className={`flex flex-col border-r bg-card ${className}`}>
      {/* Panel Header */}
      <div className="flex h-10 items-center justify-between border-b px-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center text-muted-foreground hover:text-foreground"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          <span className="text-sm font-medium">{title}</span>
          {badge != null && (
            <span className="text-xs rounded-full bg-primary/10 px-2 py-0.5 text-primary">
              {badge}
            </span>
          )}
        </div>
      </div>

      {/* Panel Content */}
      {!collapsed && (
        <div className="flex-1 overflow-auto p-3 scrollbar-thin">
          {children}
        </div>
      )}
    </div>
  )
}
