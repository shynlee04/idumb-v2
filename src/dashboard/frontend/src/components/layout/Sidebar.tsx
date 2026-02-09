import { NavLink, useNavigate } from "react-router-dom"
import { LayoutDashboard, MessageSquare, CheckSquare, Settings, Plus } from "lucide-react"
import { useCreateSession, useEngineStatus, useSessions } from "@/hooks/useEngine"
import { ActivityIndicator } from "@/components/governance/ActivityIndicator"
import { cn } from "@/lib/utils"

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
  badge?: React.ReactNode
}

function EngineIndicator() {
  const { data, isError } = useEngineStatus()
  const isRunning = Boolean(data?.running) && !isError

  return (
    <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
      <span className={cn("h-2 w-2 rounded-full", isRunning ? "bg-governance-allow" : "bg-governance-block")} />
      <span>{isRunning ? "Engine running" : "Engine offline"}</span>
    </div>
  )
}

export function Sidebar() {
  const navigate = useNavigate()
  const { data: sessions = [] } = useSessions()
  const createSession = useCreateSession()

  const navItems: NavItem[] = [
    { to: "/", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    {
      to: "/chat",
      label: "Chat",
      icon: <MessageSquare className="h-4 w-4" />,
      badge: (
        <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] text-sky-200">
          {sessions.length}
        </span>
      ),
    },
    { to: "/tasks", label: "Tasks", icon: <CheckSquare className="h-4 w-4" /> },
  ]

  const quickChat = () => {
    createSession.mutate(undefined, {
      onSuccess: (session) => navigate(`/chat/${session.id}`),
    })
  }

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border bg-zinc-950 text-zinc-300">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <span className="text-base font-bold text-primary">iDumb</span>
        <span className="font-mono text-xs text-muted-foreground">v2</span>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md border-l-2 px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-sky-500 bg-sky-500/10 text-sky-100"
                  : "border-transparent text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )
            }
          >
            {item.icon}
            <span className="flex-1">{item.label}</span>
            {item.badge}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-2 border-t border-border p-3">
        <button
          onClick={quickChat}
          className="flex w-full items-center gap-2 rounded-md border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-100 hover:bg-sky-500/20"
        >
          <Plus className="h-4 w-4" />
          Quick Chat
        </button>

        <EngineIndicator />
        <ActivityIndicator />

        <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground">
          <Settings className="h-4 w-4" />
          Settings
        </button>
      </div>
    </aside>
  )
}
