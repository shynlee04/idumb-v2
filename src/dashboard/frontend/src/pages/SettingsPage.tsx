import { useState } from "react"
import { Settings, Palette, Cpu, Wifi, Shield } from "lucide-react"
import { useEngineStatus, useProviders, useAgents } from "@/hooks/useEngine"
import { cn } from "@/lib/utils"

type Tab = "appearance" | "ai" | "connection" | "governance"

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "ai", label: "AI", icon: Cpu },
  { id: "connection", label: "Connection", icon: Wifi },
  { id: "governance", label: "Governance", icon: Shield },
]

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("ai")

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Settings className="h-5 w-5 text-zinc-400" />
        <h1 className="text-lg font-semibold">Settings</h1>
      </div>

      {/* Tab bar */}
      <div className="mb-6 flex gap-1 border-b border-border">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-sm transition-colors",
              activeTab === id
                ? "border-b-2 border-blue-500 text-zinc-100"
                : "text-zinc-400 hover:text-zinc-200"
            )}
            onClick={() => setActiveTab(id)}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "appearance" && <AppearanceTab />}
      {activeTab === "ai" && <AITab />}
      {activeTab === "connection" && <ConnectionTab />}
      {activeTab === "governance" && <GovernanceTab />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Appearance Tab
// ---------------------------------------------------------------------------

function AppearanceTab() {
  const [theme, setTheme] = useState(() =>
    localStorage.getItem("idumb-theme") ?? "dark"
  )

  const applyTheme = (t: string) => {
    setTheme(t)
    localStorage.setItem("idumb-theme", t)
    // The app currently only supports dark mode (zinc-950 backgrounds).
    // Full theme switching is a future enhancement.
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium">Theme</h3>
        <p className="mt-1 text-xs text-zinc-500">Choose the application color scheme</p>
        <div className="mt-3 flex gap-2">
          {["light", "dark", "system"].map((t) => (
            <button
              key={t}
              type="button"
              className={cn(
                "rounded-md border px-4 py-2 text-xs capitalize transition-colors",
                theme === t
                  ? "border-blue-500 bg-blue-500/10 text-blue-300"
                  : "border-border text-zinc-400 hover:bg-zinc-800/60"
              )}
              onClick={() => applyTheme(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// AI Tab
// ---------------------------------------------------------------------------

function AITab() {
  const { data: providers = [], isLoading: providersLoading } = useProviders()
  const { data: agents = [], isLoading: agentsLoading } = useAgents()

  return (
    <div className="space-y-6">
      {/* Providers section */}
      <div>
        <h3 className="text-sm font-medium">Configured Providers</h3>
        <p className="mt-1 text-xs text-zinc-500">AI providers available via your OpenCode instance</p>
        <div className="mt-3 space-y-2">
          {providersLoading ? (
            <p className="text-xs text-zinc-500">Loading providers...</p>
          ) : providers.length === 0 ? (
            <p className="text-xs text-zinc-500">No providers configured. Check your OpenCode config.</p>
          ) : (
            providers.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <div>
                  <p className="text-sm text-zinc-200">{p.name || p.id}</p>
                  <p className="text-xs text-zinc-500">{p.id}</p>
                </div>
                <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                  {(p.models ?? []).length} model{(p.models ?? []).length !== 1 ? "s" : ""}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Agents section */}
      <div>
        <h3 className="text-sm font-medium">Available Agents</h3>
        <p className="mt-1 text-xs text-zinc-500">Agents registered with your OpenCode instance</p>
        <div className="mt-3 space-y-2">
          {agentsLoading ? (
            <p className="text-xs text-zinc-500">Loading agents...</p>
          ) : agents.length === 0 ? (
            <p className="text-xs text-zinc-500">No custom agents. Install iDumb to deploy agents.</p>
          ) : (
            agents.map((a) => (
              <div key={a.id} className="rounded-md border border-border px-3 py-2">
                <p className="text-sm text-zinc-200">{a.name || a.id}</p>
                {a.description ? (
                  <p className="mt-0.5 text-xs text-zinc-500">{a.description}</p>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Connection Tab
// ---------------------------------------------------------------------------

function ConnectionTab() {
  const { data: status, isLoading } = useEngineStatus()

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium">OpenCode Engine</h3>
        <p className="mt-1 text-xs text-zinc-500">Connection to the OpenCode server</p>

        {isLoading ? (
          <p className="mt-3 text-xs text-zinc-500">Checking connection...</p>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-2">
              <span className={cn(
                "h-2.5 w-2.5 rounded-full",
                status?.running ? "bg-green-500" : "bg-red-500"
              )} />
              <span className="text-sm text-zinc-200">
                {status?.running ? "Connected" : "Disconnected"}
              </span>
            </div>

            {status?.running && (
              <div className="space-y-2 rounded-md border border-border px-3 py-2 text-xs">
                {status.url ? (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">URL</span>
                    <span className="text-zinc-300 font-mono">{status.url}</span>
                  </div>
                ) : null}
                {status.port ? (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Port</span>
                    <span className="text-zinc-300 font-mono">{status.port}</span>
                  </div>
                ) : null}
                {status.projectDir ? (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Project</span>
                    <span className="text-zinc-300 font-mono truncate max-w-[300px]">{status.projectDir}</span>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Governance Tab
// ---------------------------------------------------------------------------

function GovernanceTab() {
  const mode = "standard" // TODO: Read from governance API when available

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium">Governance Mode</h3>
        <p className="mt-1 text-xs text-zinc-500">Controls how strictly the agent governance enforces write-gates</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[
            { id: "strict", label: "Strict", desc: "Task required before every write" },
            { id: "standard", label: "Standard", desc: "Balanced — task required, warnings for minor violations" },
            { id: "relaxed", label: "Relaxed", desc: "Light governance — tracking only" },
            { id: "retard", label: "Retard", desc: "Expert-only — maximum autonomy" },
          ].map((m) => (
            <div
              key={m.id}
              className={cn(
                "rounded-md border px-3 py-2",
                mode === m.id
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-border"
              )}
            >
              <p className={cn("text-sm", mode === m.id ? "text-blue-300" : "text-zinc-300")}>
                {m.label}
              </p>
              <p className="mt-0.5 text-[10px] text-zinc-500">{m.desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-zinc-500">
          Governance mode is configured per-project via <code className="text-zinc-400">.idumb/config.json</code>
        </p>
      </div>
    </div>
  )
}
