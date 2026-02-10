/**
 * client.tsx — TanStack Start client entry point.
 *
 * SPA mode: hydrates the app using StartClient.
 * CRITICAL: startTransition wraps hydrateRoot to handle concurrent React features.
 * Without it, redirects in beforeLoad fire during synchronous hydration and
 * lock the router in pending state.
 *
 * Matches the framework default at packages/react-start/src/default-entry/client.tsx
 */

import { StrictMode, startTransition } from "react"
import { hydrateRoot } from "react-dom/client"
import { StartClient } from "@tanstack/react-start/client"

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>,
  )
})
