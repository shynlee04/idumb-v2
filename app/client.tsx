/**
 * client.tsx — TanStack Start client entry point.
 *
 * SPA mode: hydrates the app using StartClient.
 * The router is automatically wired via the router.tsx export.
 * This replaces the old React DOM createRoot in main.tsx.
 */

import { hydrateRoot } from "react-dom/client"
import { StartClient } from "@tanstack/react-start/client"

hydrateRoot(document.getElementById("root")!, <StartClient />)
