/**
 * Sidebar — Vertical navigation with page links and engine status indicator.
 *
 * Uses react-router-dom NavLink for active-state highlighting.
 * Bottom section shows engine status (green/red dot) via useEngineStatus() hook.
 */

import { NavLink } from "react-router-dom"
import { LayoutDashboard, MessageSquare, CheckSquare, Settings } from "lucide-react"
import { useEngineStatus } from "@/hooks/useEngine"
import { cn } from "@/lib/utils"

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { to: "/chat", label: "Chat", icon: <MessageSquare className="h-4 w-4" /> },
  { to: "/tasks", label: "Tasks", icon: <CheckSquare className="h-4 w-4" /> },
]

function EngineIndicator() {
  const { data, isError } = useEngineStatus()
  const isRunning = data?.running && !isError

  return (
    <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          isRunning ? "bg-governance-allow" : "bg-governance-block"
        )}
      />
      <span>{isRunning ? "Engine running" : "Engine offline"}</span>
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border bg-zinc-950 text-zinc-300">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <span className="text-base font-bold text-primary">iDumb</span>
        <span className="text-xs text-muted-foreground font-mono">v2</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-border p-3 space-y-1">
        <EngineIndicator />
        <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground">
          <Settings className="h-4 w-4" />
          Settings
        </button>
      </div>
    </aside>
  )
}
