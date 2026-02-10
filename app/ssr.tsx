/**
 * ssr.tsx — TanStack Start SSR entry point.
 *
 * Required even in SPA mode for proper shell generation.
 * TanStack Start uses this to prerender the router's pending fallback
 * as the SPA shell HTML.
 *
 * Follows the exact pattern from TanStack Start's default server entry.
 * The router is resolved internally via #tanstack-router-entry virtual module.
 *
 * @see https://tanstack.com/start/latest/docs/framework/react/guide/server-entry-point
 */

import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server"

export default createStartHandler(defaultStreamHandler)
