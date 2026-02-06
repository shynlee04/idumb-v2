/**
 * Agent Profile Schema
 * 
 * Defines the structure for generating OpenCode agent profile .md files.
 * Profiles live in .opencode/agents/{name}.md and follow the OpenCode
 * agent format: YAML frontmatter + markdown body.
 * 
 * v2 profiles are lean (~50-80 lines) because the message transform hook
 * handles behavioral scripting (role reminders, intent anchoring) automatically.
 */

import { z } from "zod"

/**
 * Agent scope determines what the agent can affect
 */
export const AgentScopeSchema = z.enum([
  "meta",      // Affects .idumb/, framework, governance
  "project",   // Affects user's codebase
  "bridge",    // Crosses both (planning, research)
])

export type AgentScope = z.infer<typeof AgentScopeSchema>

/**
 * Agent role determines permissions and behavior
 */
export const AgentProfileRoleSchema = z.enum([
  "coordinator",  // Delegates, never writes
  "builder",      // Writes files, cannot delegate
  "validator",    // Read-only, validates
  "researcher",   // Read-only, gathers info
  "meta",         // Full access (framework development)
])

export type AgentProfileRole = z.infer<typeof AgentProfileRoleSchema>

/**
 * Output style for agent responses
 */
export const OutputStyleSchema = z.enum([
  "governance-report",  // Structured: status + evidence + recommendations
  "research",           // Findings + assumptions + gaps
  "minimal",            // Brief, focused output
  "execution",          // Action log + results + next steps
])

export type OutputStyle = z.infer<typeof OutputStyleSchema>

/**
 * Input schema for the idumb_agent_create tool
 */
export const AgentProfileInputSchema = z.object({
  /** Agent name (kebab-case, becomes filename) */
  name: z.string()
    .regex(/^[a-z][a-z0-9-]*$/, "Agent name must be kebab-case")
    .max(64),
  /** Human-readable description */
  description: z.string().max(200),
  /** Agent role — maps to permissions */
  role: AgentProfileRoleSchema,
  /** Agent scope — what it can affect */
  scope: AgentScopeSchema.default("project"),
  /** OpenCode agent mode */
  mode: z.enum(["primary", "subagent"]).default("subagent"),
  /** Model override (optional, uses OpenCode default if omitted) */
  model: z.string().optional(),
  /** Temperature (lower = more deterministic) */
  temperature: z.number().min(0).max(1).optional(),
  /** Extended philosophy/instructions for the agent */
  philosophy: z.string().max(2000).optional(),
  /** Agent names this agent can delegate to */
  delegatesTo: z.array(z.string()).default([]),
  /** Output format preference */
  outputStyle: OutputStyleSchema.default("minimal"),
})

export type AgentProfileInput = z.infer<typeof AgentProfileInputSchema>

// ============================================================================
// ROLE → PERMISSIONS MAPPING
// ============================================================================

/** Tool permissions per role */
const ROLE_TOOL_PERMISSIONS: Record<AgentProfileRole, Record<string, boolean>> = {
  coordinator: {
    read: true,
    glob: true,
    grep: true,
    task: true,
    todoread: true,
    todowrite: true,
    write: false,
    edit: false,
    bash: false,
  },
  builder: {
    read: true,
    glob: true,
    grep: true,
    write: true,
    edit: true,
    bash: true,
    task: false,
    todoread: true,
    todowrite: true,
  },
  validator: {
    read: true,
    glob: true,
    grep: true,
    write: false,
    edit: false,
    bash: false,
    task: false,
    todoread: true,
    todowrite: false,
  },
  researcher: {
    read: true,
    glob: true,
    grep: true,
    websearch: true,
    webfetch: true,
    write: false,
    edit: false,
    bash: false,
    task: false,
    todoread: true,
    todowrite: false,
  },
  meta: {
    read: true,
    glob: true,
    grep: true,
    write: true,
    edit: true,
    bash: true,
    task: true,
    todoread: true,
    todowrite: true,
  },
}

/** Default temperature per role */
const ROLE_TEMPERATURES: Record<AgentProfileRole, number> = {
  coordinator: 0.1,
  builder: 0.3,
  validator: 0.1,
  researcher: 0.4,
  meta: 0.2,
}

// ============================================================================
// PROFILE GENERATION
// ============================================================================

/**
 * Generate YAML frontmatter from profile input
 */
export function generateFrontmatter(input: AgentProfileInput): string {
  const tools = ROLE_TOOL_PERMISSIONS[input.role]
  const temperature = input.temperature ?? ROLE_TEMPERATURES[input.role]

  const lines: string[] = []
  lines.push("---")
  lines.push(`description: "${input.description}"`)
  lines.push(`mode: ${input.mode}`)

  if (input.model) {
    lines.push(`model: ${input.model}`)
  }

  lines.push(`temperature: ${temperature}`)
  lines.push("tools:")

  for (const [tool, allowed] of Object.entries(tools)) {
    lines.push(`  ${tool}: ${allowed}`)
  }

  lines.push("---")
  return lines.join("\n")
}

/**
 * Generate markdown body from profile input
 */
export function generateProfileBody(input: AgentProfileInput): string {
  const lines: string[] = []

  // Role section
  lines.push(`# @${input.name}`)
  lines.push("")
  lines.push("<role>")
  lines.push(`You are @${input.name}, a ${input.role} agent with ${input.scope} scope.`)
  lines.push("")

  if (input.philosophy) {
    lines.push(input.philosophy)
  } else {
    lines.push(generateDefaultPhilosophy(input.role))
  }

  lines.push("</role>")
  lines.push("")

  // Governance protocol (universal)
  lines.push("<governance>")
  lines.push("## Acting Protocol")
  lines.push("")
  lines.push("Before ANY action, follow this sequence:")
  lines.push("")
  lines.push("1. **ANCHOR** — Restate what you understand the task to be")
  lines.push("2. **REASON** — Consider 2-3 approaches before choosing")
  lines.push("3. **VALIDATE** — Check alignment with current phase/workflow")
  lines.push("4. **EXECUTE** — Only after steps 1-3 are complete")
  lines.push("5. **REPORT** — Structured output per format below")
  lines.push("")
  lines.push("Do NOT act immediately. Anchor first, reason second, execute third.")
  lines.push("")

  // Permission boundaries
  lines.push("## Permission Boundaries")
  lines.push("")
  const perms = ROLE_TOOL_PERMISSIONS[input.role]
  const allowed = Object.entries(perms).filter(([, v]) => v).map(([k]) => k)
  const denied = Object.entries(perms).filter(([, v]) => !v).map(([k]) => k)
  lines.push(`- **Allowed tools:** ${allowed.join(", ")}`)
  lines.push(`- **Denied tools:** ${denied.join(", ")}`)
  lines.push(`- **Scope:** ${input.scope}`)
  lines.push("</governance>")
  lines.push("")

  // Delegation model (for coordinators)
  if (input.delegatesTo.length > 0) {
    lines.push("<delegation>")
    lines.push("## Delegates To")
    lines.push("")
    for (const agent of input.delegatesTo) {
      lines.push(`- @${agent}`)
    }
    lines.push("")
    lines.push("Never skip levels. Route work through the proper chain of command.")
    lines.push("</delegation>")
    lines.push("")
  }

  // Output format
  lines.push("<output_format>")
  lines.push(generateOutputTemplate(input.outputStyle))
  lines.push("</output_format>")

  return lines.join("\n")
}

/**
 * Generate the full agent profile markdown file content
 */
export function generateAgentProfile(input: AgentProfileInput): string {
  const frontmatter = generateFrontmatter(input)
  const body = generateProfileBody(input)
  return `${frontmatter}\n\n${body}\n`
}

// ============================================================================
// HELPERS
// ============================================================================

function generateDefaultPhilosophy(role: AgentProfileRole): string {
  const philosophies: Record<AgentProfileRole, string> = {
    coordinator: [
      "I am a conductor, not a musician. I orchestrate through delegation.",
      "I NEVER write files, execute code, or make changes directly.",
      "I analyze requests, determine the appropriate specialist, delegate with context,",
      "and synthesize results for presentation.",
    ].join("\n"),
    builder: [
      "I am a specialist who executes with precision.",
      "I write files, modify code, and run commands — always within my assigned scope.",
      "I follow the plan given to me and report results with evidence.",
      "I do NOT delegate or make architectural decisions.",
    ].join("\n"),
    validator: [
      "I am a read-only inspector. I examine, analyze, and report — never modify.",
      "I check structure, consistency, correctness, and alignment with specifications.",
      "My output is always a validation report with pass/fail evidence.",
    ].join("\n"),
    researcher: [
      "I gather information, analyze patterns, and synthesize findings.",
      "I explore codebases, documentation, and external sources.",
      "I produce research reports with findings, confidence levels, and gaps.",
      "I do NOT make changes — I inform decisions.",
    ].join("\n"),
    meta: [
      "I have full access to all tools and can operate at any level.",
      "I am used for framework development, debugging, and emergency operations.",
      "I follow governance protocols but can override when necessary.",
    ].join("\n"),
  }
  return philosophies[role]
}

function generateOutputTemplate(style: OutputStyle): string {
  const templates: Record<OutputStyle, string> = {
    "governance-report": [
      "## Output Format: Governance Report",
      "",
      "```",
      "## STATUS: [COMPLETE | PARTIAL | FAILED | BLOCKED]",
      "",
      "### Summary",
      "[What was done]",
      "",
      "### Evidence",
      "| Item | Proof |",
      "|------|-------|",
      "| ... | ... |",
      "",
      "### Recommendations",
      "1. [Next action]",
      "```",
    ].join("\n"),
    research: [
      "## Output Format: Research Report",
      "",
      "```",
      "## RESEARCH COMPLETE — Confidence: [HIGH | MODERATE | LOW]",
      "",
      "### Key Findings",
      "1. [Finding with evidence]",
      "",
      "### Gaps Remaining",
      "- [What still needs investigation]",
      "```",
    ].join("\n"),
    minimal: [
      "## Output Format: Minimal",
      "",
      "Respond concisely. Lead with status, follow with evidence.",
    ].join("\n"),
    execution: [
      "## Output Format: Execution Log",
      "",
      "```",
      "## EXECUTION: [task name]",
      "",
      "### Actions Taken",
      "1. [Action + result]",
      "",
      "### Files Changed",
      "- [paths]",
      "",
      "### Next Steps",
      "1. [What follows]",
      "```",
    ].join("\n"),
  }
  return templates[style]
}
