/**
 * AppShell — Root layout wrapping Sidebar + routed content via <Outlet />.
 *
 * Provides the full-viewport shell that all pages render inside.
 * QueryClientProvider is lifted to App.tsx so hooks work in Sidebar too.
 */

import { Outlet } from "react-router-dom"
import { Sidebar } from "@/components/layout/Sidebar"

export function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
