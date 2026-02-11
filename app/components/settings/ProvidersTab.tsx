/**
 * ProvidersTab — Provider list + detail panel with model listing.
 *
 * Left side: provider list with model count badges.
 * Right side: selected provider's models with "Set as default" action.
 */

import { useState, useMemo } from "react"
import { useProviders } from "@/hooks/useSettings"
import { useSetting, useSetSetting } from "@/hooks/useSettings"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ProviderInfo } from "@/shared/engine-types"

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

export function ProvidersTab() {
  const { data: providers, isLoading, error } = useProviders()
  const { data: defaultModelSetting } = useSetting("default-model")
  const setSetting = useSetSetting()
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null)

  const defaultModel = useMemo(
    () => parseDefaultModel(defaultModelSetting?.value),
    [defaultModelSetting]
  )

  const selectedProvider = useMemo<ProviderInfo | null>(() => {
    if (!providers || !selectedProviderId) return null
    return providers.find((p) => p.id === selectedProviderId) ?? null
  }, [providers, selectedProviderId])

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-8">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading providers...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        Failed to load providers: {error instanceof Error ? error.message : "Unknown error"}
      </div>
    )
  }

  if (!providers || providers.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground mb-2">No providers configured</p>
        <p className="text-xs text-muted-foreground">
          Configure providers in your OpenCode config file to see them here.
        </p>
      </div>
    )
  }

  const handleSetDefault = (providerID: string, modelID: string) => {
    setSetting.mutate({
      key: "default-model",
      value: JSON.stringify({ providerID, modelID }),
    })
  }

  return (
    <div className="flex gap-6 max-w-4xl h-[calc(100vh-200px)]">
      {/* Left: Provider list */}
      <div className="w-56 shrink-0 space-y-1 overflow-y-auto">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Providers
        </h3>
        {providers.map((provider) => (
          <button
            key={provider.id}
            type="button"
            onClick={() => setSelectedProviderId(provider.id)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors text-left",
              selectedProviderId === provider.id
                ? "bg-primary/15 text-foreground border border-primary/30"
                : "hover:bg-accent/50 text-muted-foreground"
            )}
          >
            <span className="truncate font-medium">{provider.name}</span>
            <span
              className={cn(
                "text-xs px-1.5 py-0.5 rounded-full",
                selectedProviderId === provider.id
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {provider.models.length}
            </span>
          </button>
        ))}
      </div>

      {/* Right: Provider detail */}
      <div className="flex-1 overflow-y-auto">
        {selectedProvider ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{selectedProvider.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedProvider.models.length} model{selectedProvider.models.length !== 1 ? "s" : ""} available
              </p>
            </div>

            <div className="space-y-1">
              {selectedProvider.models.map((model) => {
                const isDefault =
                  defaultModel?.providerID === selectedProvider.id &&
                  defaultModel?.modelID === model.id
                return (
                  <div
                    key={model.id}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-md border text-sm",
                      isDefault
                        ? "border-primary/30 bg-primary/5"
                        : "border-border bg-card"
                    )}
                  >
                    <div className="min-w-0 mr-3">
                      <p className="font-mono text-xs truncate" title={model.id}>
                        {model.name || model.id}
                      </p>
                      {model.name && model.name !== model.id && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {model.id}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isDefault && (
                        <span className="text-xs text-primary font-medium">Default</span>
                      )}
                      {!isDefault && (
                        <button
                          type="button"
                          onClick={() => handleSetDefault(selectedProvider.id, model.id)}
                          disabled={setSetting.isPending}
                          className={cn(
                            "text-xs px-2 py-1 rounded-md transition-colors",
                            "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                            "disabled:opacity-40"
                          )}
                        >
                          Set default
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Select a provider to view its models
          </div>
        )}
      </div>
    </div>
  )
}
