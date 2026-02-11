/**
 * GeneralTab — App info, engine controls, and settings export/import.
 *
 * Shows project directory, engine status, version info, and
 * provides settings backup via JSON export/import.
 */

import { useEngineStatus, useStartEngine, useStopEngine, useRestartEngine, useAppInfo } from "@/hooks/useEngine"
import { SettingsExport } from "./SettingsExport"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function GeneralTab() {
  const { data: engineStatus, isLoading: engineLoading } = useEngineStatus()
  const { data: appInfo } = useAppInfo()
  const startEngine = useStartEngine()
  const stopEngine = useStopEngine()
  const restartEngine = useRestartEngine()

  const isRunning = engineStatus?.running === true
  const isPending = startEngine.isPending || stopEngine.isPending || restartEngine.isPending

  return (
    <div className="space-y-8 max-w-2xl">
      {/* App Info */}
      <section>
        <h2 className="text-sm font-semibold mb-3 text-foreground">App Info</h2>
        <div className="rounded-lg border border-border bg-card p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Version</span>
            <span className="font-mono text-foreground">iDumb v2.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Project Directory</span>
            <span className="font-mono text-foreground truncate max-w-xs" title={appInfo?.path?.cwd ?? "—"}>
              {appInfo?.path?.cwd ?? "—"}
            </span>
          </div>
          {appInfo?.git && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Git Branch</span>
              <span className="font-mono text-foreground">
                {(appInfo.git as Record<string, string>).branch ?? "—"}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Engine Controls */}
      <section>
        <h2 className="text-sm font-semibold mb-3 text-foreground">Engine</h2>
        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
          {/* Status */}
          <div className="flex items-center gap-3">
            {engineLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : (
              <span
                className={cn(
                  "w-2.5 h-2.5 rounded-full",
                  isRunning ? "bg-green-500" : "bg-red-500"
                )}
              />
            )}
            <span className="text-sm font-medium">
              {engineLoading ? "Checking..." : isRunning ? "Running" : "Stopped"}
            </span>
            {engineStatus?.url && (
              <span className="text-xs text-muted-foreground font-mono ml-auto">
                {engineStatus.url}
              </span>
            )}
          </div>

          {/* Control buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isPending || isRunning}
              onClick={() => startEngine.mutate({})}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                "bg-green-600/20 text-green-400 hover:bg-green-600/30",
                "disabled:opacity-40 disabled:cursor-not-allowed"
              )}
            >
              Start
            </button>
            <button
              type="button"
              disabled={isPending || !isRunning}
              onClick={() => stopEngine.mutate()}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                "bg-red-600/20 text-red-400 hover:bg-red-600/30",
                "disabled:opacity-40 disabled:cursor-not-allowed"
              )}
            >
              Stop
            </button>
            <button
              type="button"
              disabled={isPending || !isRunning}
              onClick={() => restartEngine.mutate({})}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                "bg-blue-600/20 text-blue-400 hover:bg-blue-600/30",
                "disabled:opacity-40 disabled:cursor-not-allowed"
              )}
            >
              Restart
            </button>
          </div>
        </div>
      </section>

      {/* Settings Export/Import */}
      <SettingsExport />
    </div>
  )
}
