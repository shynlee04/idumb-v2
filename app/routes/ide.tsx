/**
 * IDE Shell route — full-screen IDE layout with resizable panels.
 *
 * URL: /ide
 * Renders the 3-panel IDE shell (sidebar + editor + terminal).
 * Panel sizes persist to localStorage via Zustand store.
 */

import { createFileRoute } from "@tanstack/react-router"
import { IDEShell } from "../components/ide/IDEShell"

export const Route = createFileRoute("/ide")({
  component: IDERoute,
})

function IDERoute() {
  return <IDEShell />
}
