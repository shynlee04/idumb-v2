import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { useEventStream } from "@/hooks/useEventStream"
import { cn } from "@/lib/utils"

type Activity = "idle" | "running" | "compacting"

export function ActivityIndicator({ compact = false }: { compact?: boolean }) {
  const { subscribe } = useEventStream()
  const [activity, setActivity] = useState<Activity>("idle")
  const [agent, setAgent] = useState<string>("coordinator")

  useEffect(() => {
    const unsubStatus = subscribe("session.status", (payload) => {
      const parsed = payload as { event?: { properties?: { status?: { type?: string } } } }
      const type = parsed.event?.properties?.status?.type
      if (type === "busy") setActivity("running")
      if (type === "idle") setActivity("idle")
    })

    const unsubCompacted = subscribe("session.compacted", () => {
      setActivity("compacting")
      setTimeout(() => setActivity("idle"), 1000)
    })

    const unsubAgent = subscribe("message.part.updated", (payload) => {
      const parsed = payload as { event?: { properties?: { part?: { type?: string; name?: string } } } }
      const part = parsed.event?.properties?.part
      if (part?.type === "agent" && typeof part.name === "string") {
        setAgent(part.name)
      }
    })

    return () => {
      unsubStatus()
      unsubCompacted()
      unsubAgent()
    }
  }, [subscribe])

  return (
    <div className={cn("flex items-center gap-2 text-xs text-zinc-400", compact ? "text-[11px]" : "text-xs")}>
      {activity === "running" ? (
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-blue-400" />
      ) : null}
      {activity === "compacting" ? <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-300" /> : null}
      {activity === "idle" ? <span className="h-2.5 w-2.5 rounded-full bg-zinc-500" /> : null}
      <span>{activity}</span>
      <span className="rounded bg-zinc-800 px-1.5 py-0.5 uppercase tracking-wide">{agent}</span>
    </div>
  )
}
