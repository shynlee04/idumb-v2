/**
 * __root.tsx — Root route for TanStack Router.
 *
 * Provides:
 * - CSS injection via route links
 * - QueryClientProvider (React Query)
 * - Global error boundary
 * - HTML document shell (SPA mode)
 * - Outlet for child routes
 */

import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"

// @ts-expect-error — Vite ?url import, resolved at build time
import appCss from "@/styles/app.css?url"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
      refetchOnWindowFocus: false,
    },
  },
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <HeadContent />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function RootComponent() {
  return (
    <RootDocument>
      <QueryClientProvider client={queryClient}>
        <Outlet />
      </QueryClientProvider>
    </RootDocument>
  )
}

function RootErrorComponent({ error }: { error: Error }) {
  return (
    <RootDocument>
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 max-w-lg">
          <h1 className="text-lg font-semibold text-destructive mb-2">
            Application Error
          </h1>
          <p className="text-sm text-muted-foreground mb-4">
            {error.message || "An unexpected error occurred"}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
          >
            Reload Page
          </button>
        </div>
      </div>
    </RootDocument>
  )
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { title: "iDumb Dashboard" },
      { name: "description", content: "Intelligent Delegation Using Managed Boundaries" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
    ],
  }),
  component: RootComponent,
  errorComponent: RootErrorComponent,
})
