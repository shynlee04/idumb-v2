/**
 * SSE Server Route — Global event relay via /api/events
 *
 * Replaces Express GET /api/events with a TanStack Start server route.
 * Relays all OpenCode SDK events to the frontend as SSE.
 */

import { createFileRoute } from "@tanstack/react-router"
import { getClient, getProjectDir, ensureEngine, sdkQuery } from "../../server/sdk-client.server"

// @ts-ignore — route path will be registered by Vite route tree generator at build time
export const Route = createFileRoute("/api/events")({
  // Server handlers provide raw request/response for streaming
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...(({
    server: {
      handlers: {
        GET: async ({ request }: { request: Request }) => {
          const projectDir = getProjectDir()
          await ensureEngine()
          const client = getClient()
          const abortController = new AbortController()

          // Handle client disconnect
          request.signal.addEventListener("abort", () => {
            abortController.abort()
          })

          const stream = new ReadableStream({
            async start(controller) {
              const encoder = new TextEncoder()

              const sendEvent = (event: string, data: unknown) => {
                controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
              }

              try {
                const eventResult = await client.event.subscribe({
                  query: sdkQuery(projectDir),
                  signal: abortController.signal,
                })

                // Send initial connected event
                sendEvent("connected", { timestamp: Date.now() })

                // Relay events via AsyncGenerator stream
                // SDK stream yields typed Event objects (discriminated on `type`)
                for await (const event of eventResult.stream) {
                  if (abortController.signal.aborted) break

                  sendEvent(event.type, event)
                }
              } catch (err) {
                if (!abortController.signal.aborted) {
                  sendEvent("error", {
                    error: err instanceof Error ? err.message : String(err),
                  })
                }
              } finally {
                try {
                  controller.close()
                } catch {
                  // Already closed
                }
              }
            },
          })

          return new Response(stream, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
              "X-Accel-Buffering": "no",
            },
          })
        },
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any),
})
