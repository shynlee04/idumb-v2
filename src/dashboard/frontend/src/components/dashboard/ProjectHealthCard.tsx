import { useQuery } from "@tanstack/react-query"
import { Activity } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useEngineStatus } from "@/hooks/useEngine"
import { useTasks } from "@/hooks/useTasks"

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001"

interface HealthPayload {
  status?: string
  grade?: "A" | "B" | "C" | "D" | "F"
  fileCount?: number
  loc?: number
  issues?: number
}

function gradeClass(grade: string): string {
  if (grade === "A") return "text-emerald-300"
  if (grade === "B") return "text-sky-300"
  if (grade === "C") return "text-amber-300"
  if (grade === "D") return "text-orange-300"
  if (grade === "F") return "text-rose-300"
  return "text-zinc-300"
}

export function ProjectHealthCard() {
  const { data: engine } = useEngineStatus()
  const { data: tasks } = useTasks()

  const { data: health } = useQuery({
    queryKey: ["health", "dashboard"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/health`)
      if (!response.ok) return {} as HealthPayload
      return response.json() as Promise<HealthPayload>
    },
    retry: 1,
    meta: { silent: true },
  })

  const fallbackGrade: "A" | "B" | "C" | "D" = engine?.running ? "B" : "D"
  const grade = health?.grade ?? fallbackGrade
  const issueCount = health?.issues ?? tasks?.tasks.filter((task) => task.status === "failed").length ?? 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="inline-flex items-center gap-2 text-sm">
          <Activity className="h-4 w-4" />
          Project Health
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-3">
          <span className={`text-4xl font-bold ${gradeClass(grade)}`}>{grade}</span>
          <span className="pb-1 text-xs text-muted-foreground">grade</span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
          <div>
            <p className="text-foreground">{health?.fileCount ?? "-"}</p>
            <p>Files</p>
          </div>
          <div>
            <p className="text-foreground">{health?.loc ?? "-"}</p>
            <p>LOC</p>
          </div>
          <div>
            <p className="text-foreground">{issueCount}</p>
            <p>Issues</p>
          </div>
        </div>

        <Button size="sm" variant="outline" className="mt-3 w-full" disabled>
          Run Scan
        </Button>
      </CardContent>
    </Card>
  )
}
