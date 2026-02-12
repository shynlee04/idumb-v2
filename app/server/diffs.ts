/**
 * Diff server functions — wraps SDK session.diff() for file change viewing.
 */
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { getClient, getProjectDir, sdkQuery, unwrapSdkResult } from "./sdk-client.server"

/** Input schema for session diff — inline since only used here. */
const SessionDiffSchema = z.object({
  id: z.string().min(1, "Session ID is required"),
  messageID: z.string().optional(),
})

/** Get file diffs for a session, optionally scoped to a specific message. */
export const getSessionDiffFn = createServerFn({ method: "GET" })
  .inputValidator(SessionDiffSchema)
  .handler(async ({ data }) => {
    try {
      const projectDir = getProjectDir()
      const result = await getClient().session.diff({
        query: {
          ...sdkQuery(projectDir),
          ...(data.messageID ? { messageID: data.messageID } : {}),
        },
        path: { id: data.id },
      })
      // JSON roundtrip for serialization compat (same pattern as getSessionMessagesFn)
      return JSON.parse(JSON.stringify(unwrapSdkResult(result)))
    } catch (err) {
      throw new Error(`Failed to get session diff: ${err instanceof Error ? err.message : String(err)}`)
    }
  })
