/**
 * ModelPicker — Quick model selection dropdown for the chat header.
 *
 * Uses a custom dropdown (not native <select>) for better styling.
 * Reads provider/model data via useProviders hook.
 * Persists selection to SQLite via "default-model" settings key.
 */

import { useState, useRef, useEffect, useMemo } from "react"
import { ChevronDown } from "lucide-react"
import { useProviders, useSetting, useSetSetting } from "@/hooks/useSettings"
import { cn } from "@/lib/utils"

interface DefaultModel {
  providerID: string
  modelID: string
}

function parseDefaultModel(value: string | null | undefined): DefaultModel | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    if (parsed && typeof parsed.providerID === "string" && typeof parsed.modelID === "string") {
      return parsed as DefaultModel
    }
  } catch {
    // Invalid JSON
  }
  return null
}

function formatModelName(providerName: string, modelName: string): string {
  // Compact display: provider/model
  const shortProvider = providerName.toLowerCase()
  const shortModel = modelName.length > 30 ? modelName.slice(0, 27) + "..." : modelName
  return `${shortProvider}/${shortModel}`
}

export function ModelPicker() {
  const { data: providers, isLoading } = useProviders()
  const { data: defaultModelSetting } = useSetting("default-model")
  const setSetting = useSetSetting()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const defaultModel = useMemo(
    () => parseDefaultModel(defaultModelSetting?.value),
    [defaultModelSetting]
  )

  // Find the display name for current selection
  const displayName = useMemo(() => {
    if (!defaultModel || !providers) return null
    const provider = providers.find((p) => p.id === defaultModel.providerID)
    if (!provider) return null
    const model = provider.models.find((m) => m.id === defaultModel.modelID)
    if (!model) return null
    return formatModelName(provider.name, model.name || model.id)
  }, [defaultModel, providers])

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("mousedown", handleClick)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [isOpen])

  const handleSelect = (providerID: string, modelID: string) => {
    setSetting.mutate({
      key: "default-model",
      value: JSON.stringify({ providerID, modelID }),
    })
    setIsOpen(false)
  }

  if (isLoading || !providers || providers.length === 0) {
    return null
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors",
          "text-muted-foreground hover:text-foreground hover:bg-accent/50",
          isOpen && "bg-accent/50 text-foreground"
        )}
      >
        <span className="font-mono truncate max-w-[200px]">
          {displayName ?? "Select model"}
        </span>
        <ChevronDown className={cn("w-3 h-3 transition-transform", isOpen && "rotate-180")} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={cn(
            "absolute right-0 top-full mt-1 z-50",
            "w-72 max-h-80 overflow-y-auto",
            "rounded-md border border-border bg-popover shadow-lg"
          )}
        >
          {providers.map((provider) => (
            <div key={provider.id}>
              {/* Provider group header */}
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/50 sticky top-0">
                {provider.name}
              </div>
              {/* Models */}
              {provider.models.map((model) => {
                const isSelected =
                  defaultModel?.providerID === provider.id &&
                  defaultModel?.modelID === model.id
                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => handleSelect(provider.id, model.id)}
                    className={cn(
                      "w-full text-left px-3 py-1.5 text-xs transition-colors",
                      "hover:bg-accent/50",
                      isSelected
                        ? "text-primary font-medium"
                        : "text-foreground"
                    )}
                  >
                    <span className="font-mono truncate block" title={model.id}>
                      {model.name || model.id}
                    </span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
