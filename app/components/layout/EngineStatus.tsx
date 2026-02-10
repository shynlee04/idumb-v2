/**
 * EngineStatus — compact engine status indicator for the header/sidebar.
 *
 * Shows engine running/stopped status with a colored dot.
 * Click to start/stop the engine.
 */

import { Loader2 } from "lucide-react"
import { useEngineStatus, useStartEngine, useStopEngine } from "@/hooks/useEngine"
import { cn } from "@/lib/utils"

export function EngineStatus() {
  const { data: status, isLoading } = useEngineStatus()
  const startEngine = useStartEngine()
  const stopEngine = useStopEngine()

  const isRunning = status?.running === true
  const isPending = startEngine.isPending || stopEngine.isPending

  const handleToggle = () => {
    if (isPending) return
    if (isRunning) {
      stopEngine.mutate()
    } else {
      startEngine.mutate({})
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Checking engine...</span>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className={cn(
        "flex items-center gap-2 text-xs px-2 py-1 rounded-md transition-colors",
        "hover:bg-accent/50 disabled:opacity-50"
      )}
      title={isRunning ? "Stop engine" : "Start engine"}
    >
      {isPending ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <span
          className={cn(
            "w-2 h-2 rounded-full",
            isRunning ? "bg-green-500" : "bg-red-500"
          )}
        />
      )}
      <span className={cn(
        "font-medium",
        isRunning ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
      )}>
        {isPending ? "..." : isRunning ? "Engine Running" : "Engine Stopped"}
      </span>
    </button>
  )
}
