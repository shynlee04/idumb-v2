import { useEffect, useState } from "react"
import { AlertTriangle, CheckCircle2, Circle, XCircle } from "lucide-react"
import { useGovernance } from "@/hooks/useTasks"
import { useEventStream } from "@/hooks/useEventStream"

type Tone = "green" | "yellow" | "red" | "gray"

function resolveTone(args: {
  initialized: boolean
  hasActiveTask: boolean
  writesBlocked: boolean
  failed: boolean
}): Tone {
  if (!args.initialized) return "gray"
  if (args.failed) return "red"
  if (args.hasActiveTask && !args.writesBlocked) return "green"
  return "yellow"
}

function toneClasses(tone: Tone): string {
  switch (tone) {
    case "green":
      return "bg-emerald-500/10 text-emerald-200 border-emerald-500/20"
    case "yellow":
      return "bg-amber-500/10 text-amber-200 border-amber-500/20"
    case "red":
      return "bg-rose-500/10 text-rose-200 border-rose-500/20"
    default:
      return "bg-zinc-500/10 text-zinc-300 border-zinc-500/20"
  }
}

export function GovernanceBar() {
  const { data } = useGovernance()
  const { connected, subscribe } = useEventStream()
  const [lastEventAt, setLastEventAt] = useState<number | null>(null)
  const [_tick, setTick] = useState(0)

  useEffect(() => {
    return subscribe("event", () => {
      setLastEventAt(Date.now())
    })
  }, [subscribe])

  // Re-render every second to keep "Xs ago" timestamp fresh
  useEffect(() => {
    if (!lastEventAt) return
    const interval = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(interval)
  }, [lastEventAt])

  const initialized = Boolean(data?.workPlan)
  const hasActiveTask = Boolean(data?.activeTask)
  const failed = data?.activeTask?.status === "failed"
  const writesBlocked = data?.writesBlocked ?? true
  const tone = resolveTone({ initialized, hasActiveTask, writesBlocked, failed })

  const statusText = (() => {
    if (!initialized) return "Governance not active"
    if (failed) return `Task failed: ${data?.activeTask?.name ?? "unknown"}`
    if (hasActiveTask && !writesBlocked) return `Task: ${data?.activeTask?.name ?? "active"} — writes unlocked`
    return "No active task — writes blocked"
  })()

  const icon = (() => {
    if (tone === "green") return <CheckCircle2 className="h-3.5 w-3.5" />
    if (tone === "red") return <XCircle className="h-3.5 w-3.5" />
    if (tone === "yellow") return <AlertTriangle className="h-3.5 w-3.5" />
    return <Circle className="h-3.5 w-3.5" />
  })()

  const untrackedWrites = 0

  return (
    <div className={`border-b px-3 py-1.5 text-xs ${toneClasses(tone)}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {icon}
          <span className="truncate">{statusText}</span>
        </div>

        <div className="flex shrink-0 items-center gap-2 text-[11px]">
          <span className="rounded border border-current/20 px-1.5 py-0.5">
            mode: {data?.governanceMode ?? "standard"}
          </span>
          {untrackedWrites > 0 ? <span>{untrackedWrites} untracked writes</span> : null}
          <span className={connected ? "text-emerald-300" : "text-zinc-400"}>{connected ? "live" : "offline"}</span>
          {lastEventAt ? <span className="text-zinc-400">{Math.max(1, Math.round((Date.now() - lastEventAt) / 1000))}s</span> : null}
        </div>
      </div>
    </div>
  )
}
