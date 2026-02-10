/**
 * Settings route — configuration interface.
 *
 * URL: /settings
 * Stub: will be fleshed out in Plan 05-02 (component migration).
 */

import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
})

function SettingsPage() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Configuration and preferences
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Stub — will be replaced with full SettingsPage in Plan 05-02
        </p>
      </div>
    </div>
  )
}
