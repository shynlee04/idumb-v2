/**
 * Index route — redirects to /chat/new
 *
 * Dashboard-first landing: root "/" goes to Chat.
 */

import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/chat/$sessionId", params: { sessionId: "new" } })
  },
})
