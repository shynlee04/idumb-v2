/**
 * ⚠️ DEPRECATED: 2026-02-06
 * 
 * THIS FILE IS DEAD CODE — DO NOT USE
 * 
 * This schema supports the message-transform hook which relies on
 * `experimental.chat.messages.transform` — a hook that is NOT documented
 * in official OpenCode plugin docs.
 * 
 * Intent classification and trajectory tracking can be repurposed for
 * the compaction hook in the future.
 * 
 * See: TRIAL-TRACKER.md for details on T5/T6 pivot
 * 
 * --- ORIGINAL DOCS BELOW (FOR REFERENCE) ---
 * 
 * Trajectory Schema
 * 
 * Conversation trajectory tracking for the message transform hook (T5/T6).
 * Captures the flow of user ↔ assistant turns, classifies intent,
 * detects drift, and synthesizes current user intention.
 * 
 * This is a governance primitive: trajectories persist to
 * .idumb/brain/sessions/{id}/trajectory.json and survive compaction
 * via the compaction hook.
 */

import { z } from "zod"

/**
 * Intent classification for a single turn.
 * Deterministic — classified by keyword matching, not LLM.
 */
export const IntentClassificationSchema = z.enum([
  "command",        // Direct instruction: "do X", "create Y", "implement Z"
  "question",       // Asking for info: "what is X?", "how does Y work?"
  "feedback",       // Reacting to output: "this is wrong", "not what I meant"
  "continuation",   // Following up: "also do Y", "and then..."
  "pivot",          // Changing direction: "actually, let's do Z instead"
  "clarification",  // Providing detail: "I mean...", "specifically..."
  "approval",       // Confirming: "yes", "looks good", "proceed"
  "rejection",      // Rejecting: "no", "don't do that", "revert"
])

export type IntentClassification = z.infer<typeof IntentClassificationSchema>

/**
 * Summary of a single conversation turn
 */
export const TurnSummarySchema = z.object({
  /** Relative position from current turn (-4, -3, -2, -1) */
  index: z.number().int().min(-10).max(-1),
  /** Who spoke */
  role: z.enum(["user", "assistant"]),
  /** Classified intent (deterministic) */
  intentClassification: IntentClassificationSchema,
  /** Brief content summary (≤200 chars) */
  contentSummary: z.string().max(200),
  /** Key terms extracted from the turn */
  topicKeywords: z.array(z.string()).max(5),
  /** Does this turn signal a change in direction? */
  driftSignal: z.boolean(),
})

export type TurnSummary = z.infer<typeof TurnSummarySchema>

/**
 * Workflow state snapshot at trajectory capture time
 */
export const WorkflowStateSchema = z.object({
  /** Current governance phase */
  phase: z.string().optional(),
  /** Active task description if known */
  activeTask: z.string().optional(),
  /** Whether trajectory shows direction change */
  driftDetected: z.boolean().default(false),
  /** Number of consecutive pivots (≥2 = strong drift) */
  consecutivePivots: z.number().int().min(0).default(0),
})

export type WorkflowState = z.infer<typeof WorkflowStateSchema>

/**
 * Full conversation trajectory snapshot
 */
export const TrajectorySchema = z.object({
  /** Session this trajectory belongs to */
  sessionId: z.string(),
  /** Total turns in conversation so far */
  turnCount: z.number().int().min(0),
  /** Last N turns summarized (max 4) */
  recentTurns: z.array(TurnSummarySchema).max(4),
  /** Synthesized: what does the user actually want RIGHT NOW? */
  synthesizedIntent: z.string().max(500),
  /** Workflow context at capture time */
  workflowState: WorkflowStateSchema,
  /** Detected agent role */
  agentRole: z.string().optional(),
  /** When this trajectory was captured */
  timestamp: z.string().datetime(),
})

export type Trajectory = z.infer<typeof TrajectorySchema>

// ============================================================================
// INTENT CLASSIFICATION (deterministic, no LLM)
// ============================================================================

/** Keyword patterns for intent classification */
const INTENT_PATTERNS: Record<IntentClassification, RegExp[]> = {
  command: [
    /\b(do|create|implement|build|write|make|add|remove|delete|update|fix|refactor|deploy|install|run|execute|start|stop|init)\b/i,
  ],
  question: [
    /\b(what|how|why|when|where|which|can you|could you|is there|are there|does|do you)\b.*\?/i,
    /\?$/,
  ],
  feedback: [
    /\b(wrong|incorrect|not what|doesn't work|broken|bug|issue|problem|error|fail|bad|ugly)\b/i,
  ],
  continuation: [
    /\b(also|additionally|and also|and then|next|furthermore|moreover|plus|as well)\b/i,
  ],
  pivot: [
    /\b(actually|instead|forget|wait|hold on|scratch that|never mind|change|switch|pivot|rather)\b/i,
  ],
  clarification: [
    /\b(I mean|specifically|to clarify|what I meant|in other words|more precisely|i\.e\.|that is)\b/i,
  ],
  approval: [
    /\b(yes|yeah|correct|right|good|great|perfect|approved?|confirm|proceed|go ahead|looks good|lgtm)\b/i,
  ],
  rejection: [
    /\b(no|nope|don't|stop|cancel|abort|revert|undo|reject|disagree)\b/i,
  ],
}

/**
 * Classify user intent from message text.
 * Uses keyword matching — first match wins, ordered by specificity.
 */
export function classifyIntent(text: string): IntentClassification {
  // Check in specificity order (most specific first)
  const checkOrder: IntentClassification[] = [
    "pivot",
    "clarification",
    "feedback",
    "rejection",
    "approval",
    "continuation",
    "question",
    "command",
  ]

  for (const intent of checkOrder) {
    const patterns = INTENT_PATTERNS[intent]
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return intent
      }
    }
  }

  // Default: treat as command (most common in coding contexts)
  return "command"
}

/**
 * Detect if a turn signals a direction change (drift)
 */
export function detectDrift(
  currentIntent: IntentClassification,
  previousIntent?: IntentClassification
): boolean {
  // Explicit pivots are always drift
  if (currentIntent === "pivot") return true

  // Feedback after a command suggests correction (mild drift)
  if (currentIntent === "feedback" && previousIntent === "command") return true

  // Rejection is drift
  if (currentIntent === "rejection") return true

  return false
}

/**
 * Extract topic keywords from text (simple TF extraction)
 */
export function extractKeywords(text: string, maxKeywords: number = 5): string[] {
  // Remove common stop words and extract meaningful terms
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "need", "dare", "ought",
    "used", "to", "of", "in", "for", "on", "with", "at", "by", "from",
    "as", "into", "through", "during", "before", "after", "above", "below",
    "between", "out", "off", "over", "under", "again", "further", "then",
    "once", "here", "there", "when", "where", "why", "how", "all", "both",
    "each", "few", "more", "most", "other", "some", "such", "no", "nor",
    "not", "only", "own", "same", "so", "than", "too", "very", "just",
    "don", "should", "now", "i", "me", "my", "you", "your", "it", "its",
    "we", "they", "them", "this", "that", "these", "those", "what", "which",
    "who", "whom", "and", "but", "if", "or", "because", "while", "although",
    "please", "thanks", "thank",
  ])

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-_.]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w))

  // Count frequency
  const freq = new Map<string, number>()
  for (const word of words) {
    freq.set(word, (freq.get(word) ?? 0) + 1)
  }

  // Sort by frequency, take top N
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word)
}

/**
 * Summarize text content to a max length
 */
export function summarizeContent(text: string, maxLength: number = 200): string {
  const cleaned = text.replace(/\s+/g, " ").trim()
  if (cleaned.length <= maxLength) return cleaned
  return cleaned.slice(0, maxLength - 3) + "..."
}

/**
 * Synthesize the current user intent from recent turns.
 * Rule-based — no LLM involved.
 */
export function synthesizeIntent(turns: TurnSummary[]): string {
  if (turns.length === 0) return "No conversation context available."

  // Get the most recent user turn
  const userTurns = turns.filter((t) => t.role === "user")
  if (userTurns.length === 0) return "No user messages in recent context."

  const lastUser = userTurns[userTurns.length - 1]

  // Check for pivot — override with new direction
  if (lastUser.intentClassification === "pivot") {
    return `User PIVOTED direction: ${lastUser.contentSummary}`
  }

  // Check for feedback — corrective intent
  if (lastUser.intentClassification === "feedback") {
    return `User provided FEEDBACK (correction needed): ${lastUser.contentSummary}`
  }

  // Check for continuation — extend previous
  if (lastUser.intentClassification === "continuation" && userTurns.length >= 2) {
    const prev = userTurns[userTurns.length - 2]
    return `User CONTINUES from "${prev.contentSummary}" with: ${lastUser.contentSummary}`
  }

  // Check for clarification — refine previous
  if (lastUser.intentClassification === "clarification" && userTurns.length >= 2) {
    const prev = userTurns[userTurns.length - 2]
    return `User CLARIFIES "${prev.contentSummary}" — meaning: ${lastUser.contentSummary}`
  }

  // Default: use last user message directly
  return `User intent: ${lastUser.contentSummary}`
}

/**
 * Create a trajectory snapshot from conversation data
 */
export function createTrajectory(
  sessionId: string,
  turns: TurnSummary[],
  workflowState: Partial<WorkflowState>,
  agentRole?: string
): Trajectory {
  const consecutivePivots = countConsecutivePivots(turns)

  return TrajectorySchema.parse({
    sessionId,
    turnCount: turns.length,
    recentTurns: turns.slice(-4),
    synthesizedIntent: synthesizeIntent(turns),
    workflowState: {
      ...workflowState,
      driftDetected: consecutivePivots >= 2,
      consecutivePivots,
    },
    agentRole,
    timestamp: new Date().toISOString(),
  })
}

/**
 * Count consecutive pivot/drift signals from the end of turns
 */
function countConsecutivePivots(turns: TurnSummary[]): number {
  let count = 0
  for (let i = turns.length - 1; i >= 0; i--) {
    if (turns[i].driftSignal) {
      count++
    } else {
      break
    }
  }
  return count
}
