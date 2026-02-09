/**
 * Task classification — A/B/C decision gate.
 *
 * Classifies incoming work to determine:
 * - What kind of planning artifacts to spawn
 * - How much hierarchy idumb_tasks creates
 * - What the status output looks like
 *
 * Type A: Bug Fix / Patch → lightweight plan + 1 task + wiki entry
 * Type B: User Request / No Artifact → standalone task, session-only
 * Type C: Feature / Phase Work → full hierarchy, outer frame first
 *
 * Consumer: idumb_tasks quick_start (auto-classifies on creation)
 */

// ─── Classification Types ───────────────────────────────────────────

export type TaskClassificationType = "A" | "B" | "C"

export interface ClassificationResult {
  type: TaskClassificationType
  label: string
  confidence: number            // 0-100, how sure the classifier is
  signals: string[]             // which keywords/patterns matched
  artifactTier: 1 | 2 | 3 | null  // null for Type B (no artifact)
  planStyle: "standalone" | "lightweight" | "hierarchical"
}

// ─── Classification Rules ───────────────────────────────────────────

/**
 * Keyword sets for each classification type.
 * Matched case-insensitive against task name + description.
 */
const TYPE_A_KEYWORDS = [
  "fix", "bug", "patch", "hotfix", "typo", "broken",
  "crash", "error", "issue", "wrong", "incorrect",
  "regression", "revert",
]

const TYPE_B_KEYWORDS = [
  "install", "setup", "configure", "help", "explain",
  "how to", "what is", "show", "list", "check",
  "status", "info", "question", "assist",
]

const TYPE_C_KEYWORDS = [
  "implement", "add", "create", "feature", "build",
  "design", "architect", "refactor", "migrate", "overhaul",
  "integrate", "new", "system", "module", "component",
  "epic", "phase", "milestone",
]

// ─── Classifier ─────────────────────────────────────────────────────

/**
 * Classify a task based on name and optional description.
 *
 * Algorithm:
 * 1. Check keywords in name + description (case-insensitive)
 * 2. Count matches per type
 * 3. Highest match count wins
 * 4. Tie → defaults to Type A (prefer lightweight)
 * 5. No matches → Type B (session-only, safest default)
 *
 * The classifier is intentionally simple and keyword-based.
 * Agents can override by passing explicit classification to quick_start.
 */
export function classifyTask(
  name: string,
  description?: string,
): ClassificationResult {
  const text = `${name} ${description ?? ""}`.toLowerCase()
  const signals: string[] = []

  let aScore = 0
  let bScore = 0
  let cScore = 0

  for (const kw of TYPE_A_KEYWORDS) {
    if (text.includes(kw)) {
      aScore++
      signals.push(`A:${kw}`)
    }
  }

  for (const kw of TYPE_B_KEYWORDS) {
    if (text.includes(kw)) {
      bScore++
      signals.push(`B:${kw}`)
    }
  }

  for (const kw of TYPE_C_KEYWORDS) {
    if (text.includes(kw)) {
      cScore++
      signals.push(`C:${kw}`)
    }
  }

  // No signals at all → default to Type B (safest — no artifacts spawned)
  if (aScore === 0 && bScore === 0 && cScore === 0) {
    return {
      type: "B",
      label: "User Request / No Artifact",
      confidence: 30,
      signals: ["no-keywords-matched"],
      artifactTier: null,
      planStyle: "standalone",
    }
  }

  // Determine winner
  const max = Math.max(aScore, bScore, cScore)
  const total = aScore + bScore + cScore
  const confidence = Math.min(95, Math.round((max / total) * 100))

  if (cScore === max) {
    return {
      type: "C",
      label: "Feature / Phase Work",
      confidence,
      signals,
      artifactTier: 2,            // Tier 2 by default, coordinator can promote to Tier 1
      planStyle: "hierarchical",
    }
  }

  if (aScore >= bScore) {
    // A wins, or A ties with B → prefer A (lightweight plan)
    return {
      type: "A",
      label: "Bug Fix / Patch",
      confidence,
      signals,
      artifactTier: 3,            // Tier 3 — short-lived
      planStyle: "lightweight",
    }
  }

  return {
    type: "B",
    label: "User Request / No Artifact",
    confidence,
    signals,
    artifactTier: null,
    planStyle: "standalone",
  }
}

// ─── Formatting ─────────────────────────────────────────────────────

/**
 * Format classification for agent-readable output.
 * Used in quick_start response to show what was detected.
 */
export function formatClassification(result: ClassificationResult): string {
  const tierLabel = result.artifactTier
    ? `Tier ${result.artifactTier}`
    : "None"
  return [
    `Classification: ${result.type} — ${result.label}`,
    `  Confidence: ${result.confidence}%`,
    `  Plan style: ${result.planStyle}`,
    `  Artifact tier: ${tierLabel}`,
    `  Signals: ${result.signals.join(", ")}`,
  ].join("\n")
}
