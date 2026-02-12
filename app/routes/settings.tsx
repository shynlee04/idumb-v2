/**
 * Settings route — tabbed configuration interface.
 *
 * URL: /settings
 * Tabs: General | Providers | Appearance
 */

import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { GeneralTab } from "../components/settings/GeneralTab"
import { ProvidersTab } from "../components/settings/ProvidersTab"
import { AppearanceTab } from "../components/settings/AppearanceTab"

const TABS = [
  { id: "general", label: "General" },
  { id: "providers", label: "Providers" },
  { id: "appearance", label: "Appearance" },
] as const

type TabId = (typeof TABS)[number]["id"]

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
})

function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("general")

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Header */}
      <header className="px-6 pt-6 pb-0">
        <h1 className="text-xl font-bold mb-4">Settings</h1>
        {/* Tab navigation */}
        <nav className="flex gap-1 border-b border-border">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-b-2 border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Tab content */}
      <main className="flex-1 overflow-y-auto px-6 py-6">
        {activeTab === "general" && <GeneralTab />}
        {activeTab === "providers" && <ProvidersTab />}
        {activeTab === "appearance" && <AppearanceTab />}
      </main>
    </div>
  )
}
