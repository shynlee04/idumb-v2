/**
 * Agent Create Tool
 * 
 * Generates OpenCode agent profile .md files in .opencode/agents/.
 * Profiles follow the OpenCode format: YAML frontmatter + markdown body.
 * 
 * v2 profiles are lean (~50-80 lines) — the message transform hook
 * handles behavioral scripting (role reminders, intent anchoring) automatically.
 */

import { z } from "zod"
import { existsSync, mkdirSync, writeFileSync } from "fs"
import { join } from "path"
import { tool } from "../types/plugin.js"
import { resolveAgentsDir } from "../lib/path-resolver.js"
import {
  AgentProfileInputSchema,
  generateAgentProfile,
  type AgentProfileRole,
  type AgentScope,
  type OutputStyle,
} from "../schemas/agent-profile.js"

export const idumb_agent_create = tool({
  description:
    "Generate an OpenCode agent profile .md file in .opencode/agents/. " +
    "Creates a governed agent with role-based permissions, delegation model, " +
    "and the iDumb acting protocol (Anchor → Reason → Validate → Execute).",
  args: {
    name: z.string().describe("Agent name in kebab-case (e.g., 'idumb-coordinator'). Becomes the filename."),
    description: z.string().describe("Short description of the agent's purpose (≤200 chars)"),
    role: z.enum(["coordinator", "builder", "validator", "researcher", "meta"])
      .describe("Agent role — determines permissions: coordinator (delegate-only), builder (write), validator (read-only), researcher (read+search), meta (all)"),
    scope: z.enum(["meta", "project", "bridge"]).optional()
      .describe("Agent scope: meta (.idumb/framework), project (user codebase), bridge (both). Default: project"),
    mode: z.enum(["primary", "subagent"]).optional()
      .describe("OpenCode agent mode. Default: subagent"),
    model: z.string().optional()
      .describe("Model override (e.g., 'anthropic/claude-sonnet-4-20250514'). Uses OpenCode default if omitted."),
    temperature: z.number().optional()
      .describe("Temperature override (0-1). Uses role default if omitted."),
    philosophy: z.string().optional()
      .describe("Extended instructions/philosophy for the agent (≤2000 chars). Uses role default if omitted."),
    delegatesTo: z.string().optional()
      .describe("Comma-separated agent names this agent can delegate to (e.g., 'idumb-builder,idumb-validator')"),
    outputStyle: z.enum(["governance-report", "research", "minimal", "execution"]).optional()
      .describe("Output format preference. Default: minimal"),
  },
  async execute(args, context) {
    const { directory, worktree } = context

    // Parse delegatesTo from comma-separated string
    const delegatesTo = args.delegatesTo
      ? args.delegatesTo.split(",").map((s: string) => s.trim()).filter(Boolean)
      : []

    // Validate input through schema
    const input = AgentProfileInputSchema.parse({
      name: args.name,
      description: args.description,
      role: args.role as AgentProfileRole,
      scope: (args.scope ?? "project") as AgentScope,
      mode: args.mode ?? "subagent",
      model: args.model,
      temperature: args.temperature,
      philosophy: args.philosophy,
      delegatesTo,
      outputStyle: (args.outputStyle ?? "minimal") as OutputStyle,
    })

    // Resolve agents directory
    const agentsDir = resolveAgentsDir(directory, worktree)

    // Ensure directory exists
    if (!existsSync(agentsDir)) {
      mkdirSync(agentsDir, { recursive: true })
    }

    // Generate profile content
    const profileContent = generateAgentProfile(input)

    // Write file
    const filePath = join(agentsDir, `${input.name}.md`)
    const existed = existsSync(filePath)
    writeFileSync(filePath, profileContent, "utf-8")

    // Build response
    const lines: string[] = []
    lines.push(`# Agent Profile ${existed ? "Updated" : "Created"}`)
    lines.push("")
    lines.push(`- **Name:** @${input.name}`)
    lines.push(`- **Role:** ${input.role}`)
    lines.push(`- **Scope:** ${input.scope}`)
    lines.push(`- **Mode:** ${input.mode}`)
    lines.push(`- **Path:** ${filePath}`)
    lines.push("")

    if (input.delegatesTo.length > 0) {
      lines.push(`**Delegates to:** ${input.delegatesTo.map((a) => `@${a}`).join(", ")}`)
      lines.push("")
    }

    lines.push(`The agent is now available in OpenCode. Use \`@${input.name}\` to invoke it.`)

    return lines.join("\n")
  },
})
