/**
 * ModelSelector — dropdown for picking provider + model override.
 *
 * Uses useProviders() hook to fetch available providers/models,
 * renders a grouped dropdown, and calls onChange with selection.
 * When "default" is selected, no model override is sent to the backend.
 */
import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronDown, Cpu, Loader2 } from "lucide-react"
import { useProviders } from "@/hooks/useEngine"
import { cn } from "@/lib/utils"

export interface ModelSelection {
  providerID: string
  modelID: string
  label: string
}

interface ModelSelectorProps {
  value: ModelSelection | null
  onChange: (selection: ModelSelection | null) => void
  disabled?: boolean
}

export function ModelSelector({ value, onChange, disabled }: ModelSelectorProps) {
  const { data: providers, isLoading } = useProviders()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open])

  const handleSelect = useCallback(
    (providerID: string, modelID: string, modelName: string) => {
      onChange({ providerID, modelID, label: modelName })
      setOpen(false)
    },
    [onChange],
  )

  const handleDefault = useCallback(() => {
    onChange(null)
    setOpen(false)
  }, [onChange])

  const displayLabel = value ? value.label : "Default model"

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled || isLoading}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs transition-colors",
          "text-zinc-300 hover:bg-zinc-800/60 hover:text-zinc-100",
          "focus:outline-none focus:ring-2 focus:ring-blue-500/30",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        {isLoading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Cpu className="h-3 w-3" />
        )}
        <span className="max-w-[160px] truncate">{displayLabel}</span>
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-1 min-w-[220px] max-h-[300px] overflow-y-auto rounded-md border border-border bg-zinc-900 py-1 shadow-xl">
          {/* Default option */}
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors",
              !value
                ? "bg-blue-500/15 text-zinc-100"
                : "text-zinc-300 hover:bg-zinc-800/60",
            )}
            onClick={handleDefault}
          >
            <Cpu className="h-3 w-3 text-zinc-500" />
            Default model
          </button>

          {/* Divider */}
          <div className="my-1 border-t border-border" />

          {/* Providers + models */}
          {(!providers || providers.length === 0) && !isLoading && (
            <p className="px-3 py-2 text-xs text-zinc-500">No providers configured</p>
          )}

          {providers?.map((provider) => (
            <div key={provider.id}>
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {provider.name}
              </p>
              {provider.models.length === 0 ? (
                <p className="px-3 py-1 text-xs text-zinc-600 italic">No models</p>
              ) : (
                provider.models.map((model) => {
                  const isSelected =
                    value?.providerID === provider.id && value?.modelID === model.id
                  return (
                    <button
                      key={`${provider.id}:${model.id}`}
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors",
                        isSelected
                          ? "bg-blue-500/15 text-zinc-100"
                          : "text-zinc-300 hover:bg-zinc-800/60",
                      )}
                      onClick={() => handleSelect(provider.id, model.id, model.name)}
                    >
                      <span className="truncate">{model.name}</span>
                    </button>
                  )
                })
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
