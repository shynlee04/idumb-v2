/**
 * Dashboard Layout — Main layout wrapper with header and grid
 */

import type { ReactNode } from "react"
import { Separator } from "@/components/ui/separator"

interface DashboardLayoutProps {
  children: ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex h-12 items-center px-4">
          <h1 className="text-sm font-bold tracking-tight">
            <span className="text-primary">iDumb</span>
            <span className="text-muted-foreground ml-1.5">Governance Dashboard</span>
          </h1>
          <Separator orientation="vertical" className="mx-3 h-5" />
          <span className="text-xs text-muted-foreground font-mono">v2.2.0</span>
        </div>
      </header>
      <main className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
        {children}
      </main>
    </div>
  )
}
