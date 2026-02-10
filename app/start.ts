/**
 * start.ts — TanStack Start instance configuration.
 *
 * SPA-only mode: target="client", no SSR middleware needed.
 */

import { createStart } from "@tanstack/react-start"

export const startInstance = createStart(() => {
  return {
    // functionMiddleware: [],  // Add server function middleware later if needed
  }
})
