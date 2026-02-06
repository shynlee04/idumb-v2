/**
 * ⚠️ DEPRECATED: 2026-02-06
 * 
 * THIS FILE IS DEAD CODE — DO NOT USE
 * 
 * The `experimental.chat.messages.transform` hook this relies on is NOT
 * documented in official OpenCode plugin docs (Feb 5, 2026). The hook
 * likely does not exist.
 * 
 * This file will be removed in the next cleanup. All message injection
 * should use `experimental.session.compacting` instead.
 * 
 * See: TRIAL-TRACKER.md for details on T5/T6 pivot
 * 
 * --- ORIGINAL DOCS BELOW (FOR REFERENCE) ---
 * 
 * Message Transform Hook (T5/T6)
 * 
 * Intercepts messages BEFORE they reach the LLM context window via
 * `experimental.chat.messages.transform`. This hook:
 * 
 * 1. Reads last 4 turns from the messages array
 * 2. Extracts conversation trajectory (intent, drift, keywords)
 * 3. Builds an anchoring injection (clarified intent + role reminder)
 * 4. Appends after the last assistant message
 * 
 * The agent sees: [...previous messages, GOVERNANCE ANCHOR, user message]
 * This ensures the anchor is the freshest context before the LLM responds.
 * 
 * Intent classification is deterministic (keyword-based, no LLM).
 * Trajectory snapshots persist to .idumb/brain/sessions/ for compaction.
 */

import { createLogger } from "../lib/logging.js"
import { readState } from "../lib/persistence.js"
import {
  classifyIntent,
  detectDrift,
  extractKeywords,
  summarizeContent,
  synthesizeIntent,
  createTrajectory,
  type TurnSummary,
  type IntentClassification,
} from "../schemas/trajectory.js"

// ============================================================================
// TYPES (defensive — actual SDK shape may differ from docs)
// ============================================================================

/**
 * Content block — may be Anthropic format or SDK wrapper
 */
interface ContentBlock {
  type: string
  text?: string
  [key: string]: unknown
}

/**
 * Part in SDK message format
 */
interface Part {
  type?: string
  text?: string
  content?: string
  [key: string]: unknown
}

/**
 * SDK Message info object
 */
interface MessageInfo {
  role?: string
  [key: string]: unknown
}

/**
 * Message — handles both SDK format and Anthropic format:
 * SDK: { info: { role: string, ... }, parts: Part[] }
 * Anthropic: { role: string, content: string | ContentBlock[] }
 */
interface MessageWrapper {
  // SDK format
  info?: MessageInfo
  parts?: Part[]
  // Anthropic format
  role?: string
  content?: string | ContentBlock[]
  [key: string]: unknown
}

/**
 * Hook input/output types (defensive)
 */
interface TransformInput {
  sessionID?: string
  [key: string]: unknown
}

interface TransformOutput {
  messages?: MessageWrapper[]
  [key: string]: unknown
}

// ============================================================================
// TEXT EXTRACTION
// ============================================================================

/**
 * Get role from a message wrapper (handles both SDK and Anthropic format)
 */
function getMessageRole(msg: MessageWrapper): string {
  // SDK format: msg.info.role
  if (msg.info && typeof msg.info.role === "string") return msg.info.role
  // Anthropic format: msg.role
  if (typeof msg.role === "string") return msg.role
  return "unknown"
}

/**
 * Extract plain text from a message wrapper (handles both formats)
 */
function extractMessageText(msg: MessageWrapper): string {
  // SDK format: msg.parts[].text or msg.parts[].content
  if (msg.parts && Array.isArray(msg.parts)) {
    return msg.parts
      .map((p) => p.text ?? p.content ?? "")
      .filter(Boolean)
      .join(" ")
      .slice(0, 1000)
  }

  // Anthropic format: msg.content (string or ContentBlock[])
  if (typeof msg.content === "string") return msg.content.slice(0, 1000)

  if (Array.isArray(msg.content)) {
    return msg.content
      .filter((block): block is ContentBlock & { text: string } =>
        block.type === "text" && typeof block.text === "string"
      )
      .map((block) => block.text)
      .join(" ")
      .slice(0, 1000)
  }

  return ""
}

// ============================================================================
// TURN ANALYSIS
// ============================================================================

/**
 * Analyze the last N messages into TurnSummary objects
 */
function analyzeTurns(messages: MessageWrapper[], maxTurns: number = 4): TurnSummary[] {
  // Take last N messages
  const recent = messages.slice(-maxTurns)
  const turns: TurnSummary[] = []
  let previousIntent: IntentClassification | undefined

  for (let i = 0; i < recent.length; i++) {
    const msg = recent[i]
    const role = getMessageRole(msg)
    if (role !== "user" && role !== "assistant") continue

    const text = extractMessageText(msg)
    if (!text.trim()) continue

    const intent: IntentClassification = role === "user"
      ? classifyIntent(text)
      : "command" // Assistant messages default to "command" (they're executing)

    const drift = role === "user"
      ? detectDrift(intent, previousIntent)
      : false

    turns.push({
      index: -(recent.length - i),
      role: role as "user" | "assistant",
      intentClassification: intent,
      contentSummary: summarizeContent(text),
      topicKeywords: extractKeywords(text),
      driftSignal: drift,
    })

    if (role === "user") {
      previousIntent = intent
    }
  }

  return turns
}

// ============================================================================
// INJECTION BUILDER
// ============================================================================

/**
 * Build the governance anchor injection content
 */
function buildAnchorInjection(
  turns: TurnSummary[],
  synthesized: string,
  agentRole: string | undefined,
  phase: string | undefined,
  driftDetected: boolean
): string {
  const lines: string[] = []

  lines.push("## iDumb Governance — Conversation Anchor")
  lines.push("")

  // Trajectory summary
  if (turns.length > 0) {
    lines.push("### Trajectory (recent turns)")
    for (const turn of turns) {
      const roleTag = turn.role === "user" ? "USER" : "ASST"
      const driftMark = turn.driftSignal ? " ⚠️DRIFT" : ""
      lines.push(`- Turn ${turn.index} [${roleTag}] (${turn.intentClassification}${driftMark}): ${turn.contentSummary}`)
    }
    lines.push("")
  }

  // Synthesized intent
  lines.push("### Anchored User Intent")
  lines.push(`> ${synthesized}`)
  lines.push("")

  // Drift warning (if detected)
  if (driftDetected) {
    lines.push("### ⚠️ DRIFT DETECTED")
    lines.push("User has changed direction. CONFIRM new intent before proceeding.")
    lines.push("Do NOT continue previous task without explicit user confirmation.")
    lines.push("")
  }

  // Role reminder
  lines.push("### Role & Protocol")
  const roleLabel = agentRole ?? "unknown"
  const phaseLabel = phase ?? "unknown"
  lines.push(`You are acting as [${roleLabel}] in phase [${phaseLabel}].`)
  lines.push("")
  lines.push("Before executing:")
  lines.push("1. **ANCHOR** — Restate what the user wants in your own words")
  lines.push("2. **REASON** — Consider 2-3 approaches, pick the best")
  lines.push("3. **VALIDATE** — Ensure alignment with current phase/task")
  lines.push("4. **EXECUTE** — Only after steps 1-3")
  lines.push("")
  lines.push("Do NOT act immediately. Anchor first, reason second, execute third.")

  return lines.join("\n")
}

// ============================================================================
// HOOK FACTORY
// ============================================================================

/**
 * Create the message transform hook for a given project directory
 */
export function createMessageTransformHook(directory: string) {
  const logger = createLogger(directory, "message-transform")

  return async (
    input: TransformInput,
    output: TransformOutput
  ): Promise<void> => {
    try {
      // Defensive: check output has messages array
      if (!output.messages || !Array.isArray(output.messages)) {
        logger.debug("No messages array in output — skipping transform")
        return
      }

      const messages = output.messages as MessageWrapper[]
      if (messages.length < 2) {
        // Need at least 1 user + 1 assistant message to analyze
        return
      }

      const sessionId = input.sessionID ?? "unknown"

      // 1. Analyze recent turns
      const turns = analyzeTurns(messages, 4)
      if (turns.length === 0) return

      // 2. Read governance state for phase/role context
      let phase: string | undefined
      let agentRole: string | undefined
      try {
        const state = readState(directory)
        phase = state.phase
      } catch {
        // Graceful: state might not exist yet
      }

      // 3. Synthesize intent
      const synthesized = synthesizeIntent(turns)
      const driftDetected = turns.filter((t) => t.driftSignal).length >= 2

      // 4. Build injection content
      const injection = buildAnchorInjection(
        turns,
        synthesized,
        agentRole,
        phase,
        driftDetected
      )

      // 5. Find insertion point — after last assistant message, before last user message
      const lastUserIdx = findLastIndex(messages, (m) => getMessageRole(m) === "user")
      if (lastUserIdx < 0) return

      // Insert as a governance context message before the last user message.
      // Construct in both formats for compatibility — SDK will use whichever it understands.
      const governanceMessage: MessageWrapper = {
        role: "user",
        content: [{ type: "text", text: injection }],
        info: { role: "user" },
        parts: [{ type: "text", text: injection }],
      }

      // Splice in before the last user message
      output.messages.splice(lastUserIdx, 0, governanceMessage)

      // 6. Persist trajectory snapshot (non-blocking, best-effort)
      try {
        const trajectory = createTrajectory(sessionId, turns, { phase }, agentRole)
        logger.info(`Trajectory captured: ${turns.length} turns, intent="${trajectory.synthesizedIntent.slice(0, 80)}"`)
      } catch {
        // Non-critical — trajectory persistence failure shouldn't break the hook
      }

      logger.debug(`Injected governance anchor at position ${lastUserIdx}`, {
        sessionId,
        turnCount: turns.length,
        driftDetected,
      })
    } catch (error) {
      // Graceful degradation: never break message delivery
      logger.error(`Message transform error: ${error}`)
    }
  }
}

// ============================================================================
// UTILITY
// ============================================================================

/**
 * Find the last index matching a predicate (Array.findLastIndex polyfill)
 */
function findLastIndex<T>(arr: T[], predicate: (item: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i])) return i
  }
  return -1
}
