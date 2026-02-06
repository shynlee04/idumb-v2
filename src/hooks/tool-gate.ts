/**
 * Tool Gate — Stop Hook (tool.execute.before + after)
 * 
 * Intercepts tool calls, enforces governance conditions, and BLOCKS
 * with redirect messages when conditions fail.
 * 
 * BLOCK pattern: STOP + REDIRECT + EVIDENCE (§7)
 * - WHAT: what was denied and why
 * - USE INSTEAD: specific alternative tool/action
 * - EVIDENCE: governance state that triggered the block
 * 
 * P3: Every path wrapped in try/catch — never break TUI
 * P5: In-memory Maps for session state — no file I/O in hot path
 * P6: SDK format defensive — type-check all inputs
 */

import type { Logger } from "../lib/index.js"

/** Write tools that require an active task */
const WRITE_TOOLS = new Set(["write", "edit"])

/** Session state — in-memory only (P5) */
interface SessionState {
  activeTask: { id: string; name: string } | null
  lastBlock: { tool: string; timestamp: number } | null
}

/** Per-session state Map (P5: in-memory, never persisted in hooks) */
const sessions = new Map<string, SessionState>()

/** Get or create session state */
function getSession(sessionID: string): SessionState {
  let s = sessions.get(sessionID)
  if (!s) {
    s = { activeTask: null, lastBlock: null }
    sessions.set(sessionID, s)
  }
  return s
}

/** Exported for task tool to update session state */
export function setActiveTask(sessionID: string, task: { id: string; name: string } | null): void {
  const s = getSession(sessionID)
  s.activeTask = task
}

/** Exported for status/debug */
export function getActiveTask(sessionID: string): { id: string; name: string } | null {
  return getSession(sessionID).activeTask
}

/** Build the BLOCK message with REDIRECT + EVIDENCE */
function buildBlockMessage(tool: string, isRetry: boolean): string {
  const retryNote = isRetry
    ? " (ALREADY BLOCKED — do NOT retry the same tool)"
    : ""

  return [
    `GOVERNANCE BLOCK: ${tool} denied${retryNote}`,
    "",
    `WHAT: You tried to use "${tool}" but no active task exists.`,
    `USE INSTEAD: Call the "idumb_task" tool with action "create" and a task name to create a task first, then retry your ${tool}.`,
    `EVIDENCE: Session has no active task. All file modifications require an active task for governance tracking.`,
  ].join("\n")
}

/**
 * Creates the tool.execute.before hook.
 * 
 * Hook factory pattern (DO #5): captured logger, returns async hook function.
 */
export function createToolGateBefore(log: Logger) {
  return async (
    input: { tool: string; sessionID: string; callID: string },
    _output: { args: unknown },
  ): Promise<void> => {
    try {
      const { tool, sessionID } = input

      // Only gate write tools (breadth: don't over-block, start minimal)
      if (!WRITE_TOOLS.has(tool)) return

      const session = getSession(sessionID)

      // If there's an active task, allow the write
      if (session.activeTask) {
        log.debug(`ALLOW: ${tool} (task: ${session.activeTask.name})`, { sessionID })
        return
      }

      // Check if this is a retry of a recently blocked tool
      const isRetry = session.lastBlock !== null
        && session.lastBlock.tool === tool
        && (Date.now() - session.lastBlock.timestamp) < 30_000

      // Record this block for retry detection
      session.lastBlock = { tool, timestamp: Date.now() }

      const message = buildBlockMessage(tool, isRetry)
      log.warn(`BLOCK: ${tool} (no active task)`, { sessionID, isRetry })

      // Throw to block tool execution — error message appears in chat
      throw new Error(message)
    } catch (error) {
      // Re-throw governance blocks (they're intentional)
      if (error instanceof Error && error.message.startsWith("GOVERNANCE BLOCK:")) {
        throw error
      }
      // P3: Log unexpected errors, don't block tool execution
      log.error(`tool-gate unexpected error: ${error}`)
    }
  }
}

/**
 * Creates the tool.execute.after hook (defense-in-depth fallback).
 * 
 * If tool.execute.before throw didn't block the tool (edge case),
 * this replaces the output with the governance message.
 */
export function createToolGateAfter(log: Logger) {
  return async (
    input: { tool: string; sessionID: string; callID: string },
    output: { title: string; output: string; metadata: unknown },
  ): Promise<void> => {
    try {
      const { tool, sessionID } = input

      if (!WRITE_TOOLS.has(tool)) return

      const session = getSession(sessionID)

      // If there's an active task, tool was legitimately allowed
      if (session.activeTask) return

      // Defense in depth: if we're here with no active task, the before-hook
      // should have blocked. Replace output with governance message.
      const message = buildBlockMessage(tool, true)
      output.output = message
      output.title = `GOVERNANCE BLOCK: ${tool} denied`
      log.warn(`FALLBACK BLOCK: ${tool} after-hook replacing output`, { sessionID })
    } catch (error) {
      // P3: Never crash in after-hook
      log.error(`tool-gate after unexpected error: ${error}`)
    }
  }
}
