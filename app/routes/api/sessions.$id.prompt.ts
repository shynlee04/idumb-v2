/**
 * SSE Server Route — Chat streaming via /api/sessions/$id/prompt
 *
 * Replaces Express POST /api/sessions/:id/prompt with a TanStack Start server route.
 * Uses createFileRoute with server.handlers.POST for raw HTTP response (SSE).
 *
 * SSE is done via server routes (NOT server functions) because TanStack Start
 * server functions use NDJSON internally which breaks SSE streaming (bug #6604).
 */

import { createFileRoute } from "@tanstack/react-router"
import { getClient, getProjectDir, sdkQuery } from "../../server/sdk-client.server"

// @ts-ignore — route path will be registered by Vite route tree generator at build time
export const Route = createFileRoute("/api/sessions/$id/prompt")({
  // Server handlers provide raw request/response for streaming
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...(({
    server: {
      handlers: {
        POST: async ({ request, params }: { request: Request; params: { id: string } }) => {
          const { id } = params

          // Parse prompt body
          let body: Record<string, unknown> = {}
          try {
            body = await request.json()
          } catch {
            return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            })
          }

          const projectDir = getProjectDir()
          const client = getClient()
          const abortController = new AbortController()

          // Handle client disconnect
          request.signal.addEventListener("abort", () => {
            abortController.abort()
          })

          // Build parts array — SDK requires it
          const parts = body.parts
            ? (body.parts as Array<Record<string, unknown>>)
            : body.text
              ? [{ type: "text" as const, text: String(body.text) }]
              : [{ type: "text" as const, text: "" }]

          // Create SSE readable stream
          const stream = new ReadableStream({
            async start(controller) {
              const encoder = new TextEncoder()

              const sendEvent = (event: string, data: unknown) => {
                controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
              }

              try {
                // Subscribe BEFORE prompt to avoid missing early events
                const eventResult = await client.event.subscribe({
                  query: sdkQuery(projectDir),
                  signal: abortController.signal,
                })

                // Send prompt
                const promptResult = await client.session.prompt({
                  query: sdkQuery(projectDir),
                  path: { id },
                  body: {
                    parts: parts as Array<{ type: "text"; text: string }>,
                    ...(body.modelID && body.providerID
                      ? { model: { providerID: String(body.providerID), modelID: String(body.modelID) } }
                      : {}),
                  },
                })

                if (promptResult.error) {
                  sendEvent("error", {
                    error: typeof (promptResult as Record<string, unknown>).error === "string"
                      ? (promptResult as Record<string, unknown>).error
                      : JSON.stringify((promptResult as Record<string, unknown>).error),
                  })
                  controller.close()
                  return
                }

                // Relay events filtered by session ID via AsyncGenerator stream
                for await (const event of eventResult.stream) {
                  if (abortController.signal.aborted) break

                  const eventData = event as Record<string, unknown>
                  const props = eventData.properties as Record<string, unknown> | undefined
                  const eventSessionId = props?.sessionID ?? props?.session_id

                  // Filter events to this session
                  if (eventSessionId && eventSessionId !== id) continue

                  sendEvent(String(eventData.type ?? "message"), eventData)

                  // Break on terminal status
                  const status = props?.status
                  if (status === "idle" || status === "failed" || status === "error") {
                    break
                  }
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
