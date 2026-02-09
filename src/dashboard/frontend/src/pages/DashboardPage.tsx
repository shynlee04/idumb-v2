import { useNavigate } from "react-router-dom"
import { MessageSquare, Play, CheckSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ActiveTasksCard } from "@/components/dashboard/ActiveTasksCard"
import { RecentSessionsCard } from "@/components/dashboard/RecentSessionsCard"
import { ProjectHealthCard } from "@/components/dashboard/ProjectHealthCard"

export function DashboardPage() {
  const navigate = useNavigate()

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Welcome to iDumb</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Governed knowledge-work cockpit across chat, task execution, and planning visibility.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ActiveTasksCard />
        <RecentSessionsCard />
        <ProjectHealthCard />
      </div>

      <div className="mt-6 rounded-lg border border-border bg-zinc-950/40 p-4">
        <p className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">Quick Actions</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => navigate("/chat")}> 
            <MessageSquare className="mr-2 h-4 w-4" />
            New Chat
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate("/tasks")}> 
            <CheckSquare className="mr-2 h-4 w-4" />
            View Tasks
          </Button>
          <Button size="sm" variant="outline" disabled>
            <Play className="mr-2 h-4 w-4" />
            Run Scan
          </Button>
        </div>
      </div>
    </div>
  )
}
