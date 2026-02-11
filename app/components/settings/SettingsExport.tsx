/**
 * SettingsExport — JSON export/import for settings backup and migration.
 *
 * Export: downloads all settings as a timestamped JSON file.
 * Import: reads a JSON file and upserts each setting.
 */

import { useRef, useState } from "react"
import { getAllSettingsFn, setSettingFn } from "@/server/settings"
import { cn } from "@/lib/utils"
import { Download, Upload, Check, AlertCircle } from "lucide-react"

interface ExportFormat {
  version: string
  exportedAt: string
  settings: Array<{ key: string; value: string }>
}

type StatusMessage = { type: "success" | "error"; text: string }

export function SettingsExport() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<StatusMessage | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    setStatus(null)
    try {
      const allSettings = await getAllSettingsFn()
      const exportData: ExportFormat = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        settings: allSettings.map((s) => ({ key: s.key, value: s.value })),
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const date = new Date().toISOString().slice(0, 10)

      const a = document.createElement("a")
      a.href = url
      a.download = `idumb-settings-${date}.json`
      a.click()
      URL.revokeObjectURL(url)

      setStatus({ type: "success", text: `Exported ${allSettings.length} settings` })
    } catch (err) {
      setStatus({ type: "error", text: `Export failed: ${err instanceof Error ? err.message : String(err)}` })
    } finally {
      setIsExporting(false)
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    setStatus(null)

    try {
      const text = await file.text()
      const data = JSON.parse(text) as Partial<ExportFormat>

      // Validate structure
      if (!data.version || !Array.isArray(data.settings)) {
        throw new Error("Invalid settings file format")
      }

      const entries = data.settings.filter(
        (s): s is { key: string; value: string } =>
          typeof s?.key === "string" && typeof s?.value === "string"
      )

      if (entries.length === 0) {
        throw new Error("No valid settings found in file")
      }

      // Confirm import
      const confirmed = window.confirm(
        `Import ${entries.length} settings? This will overwrite existing values.`
      )
      if (!confirmed) {
        setIsImporting(false)
        return
      }

      // Import each setting
      let imported = 0
      for (const entry of entries) {
        await setSettingFn({ data: { key: entry.key, value: entry.value } })
        imported++
      }

      setStatus({ type: "success", text: `Imported ${imported} settings successfully` })
    } catch (err) {
      setStatus({ type: "error", text: `Import failed: ${err instanceof Error ? err.message : String(err)}` })
    } finally {
      setIsImporting(false)
      // Reset file input so same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <section>
      <h2 className="text-sm font-semibold mb-3 text-foreground">Settings Backup</h2>
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
              "border border-border bg-card text-foreground",
              "hover:bg-accent/50 disabled:opacity-40"
            )}
          >
            <Download className="w-3.5 h-3.5" />
            {isExporting ? "Exporting..." : "Export JSON"}
          </button>
          <button
            type="button"
            onClick={handleImportClick}
            disabled={isImporting}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
              "border border-border bg-card text-foreground",
              "hover:bg-accent/50 disabled:opacity-40"
            )}
          >
            <Upload className="w-3.5 h-3.5" />
            {isImporting ? "Importing..." : "Import JSON"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {/* Status message */}
        {status && (
          <div
            className={cn(
              "flex items-center gap-2 text-xs px-3 py-2 rounded-md",
              status.type === "success"
                ? "bg-green-600/10 text-green-500"
                : "bg-destructive/10 text-destructive"
            )}
          >
            {status.type === "success" ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5" />
            )}
            {status.text}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Export all app settings as JSON for backup or migration between machines.
        </p>
      </div>
    </section>
  )
}
