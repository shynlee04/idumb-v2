/**
 * govern_shell — Governed shell command execution (Executor only).
 *
 * Single action: run. No action parameter needed.
 *
 * Keeps the destructive blacklist (core value) and role-based permissions.
 * Evidence capture is handled by the tool-gate after-hook (checkpoint auto-recording).
 *
 * Shadow: "Run shell commands with governance safety. Unlike innate bash, this
 * blocks destructive operations (rm -rf, git push --force, DROP TABLE) and
 * audits all commands to the active task's checkpoint trail."
 */

import { tool } from "@opencode-ai/plugin/tool"
import { execSync } from "child_process"
import { stateManager } from "../lib/persistence.js"

// ─── Constants ──────────────────────────────────────────────────────

const DEFAULT_TIMEOUT = 30
const MAX_TIMEOUT = 120
const MAX_OUTPUT_CHARS = 100_000  // 100KB output cap

// ─── Role Permissions ───────────────────────────────────────────────

/**
 * Which command categories each agent can execute.
 * 3-agent model — mirrors AGENT_HIERARCHY in schemas/delegation.ts
 */
const ROLE_PERMISSIONS: Record<string, Set<string>> = {
    "idumb-supreme-coordinator": new Set(["inspection"]),
    "idumb-investigator": new Set(["validation", "inspection"]),
    "idumb-executor": new Set(["validation", "build", "git", "inspection", "runtime", "filesystem", "general"]),
}

// ─── Command Classification ─────────────────────────────────────────

const CATEGORY_PATTERNS: Record<string, RegExp[]> = {
    validation: [
        /^npm\s+test/,
        /^npx\s+(jest|vitest)\b/,
        /^tsc\s+--noEmit/,
        /^npx\s+tsc\s+--noEmit/,
        /^eslint/,
        /^npx\s+eslint/,
        /^npm\s+run\s+(test|typecheck|lint|check)/,
    ],
    build: [
        /^npm\s+run\s+build/,
        /^tsc$/,
        /^npx\s+tsc$/,
        /^npx\s+(vite|esbuild|rollup|webpack|turbo|tsup)\b/,
        /^npm\s+run\s+dev/,
        /^npm\s+install/,
        /^npm\s+rebuild/,
    ],
    git: [
        /^git\s+(add|commit|status|diff|log|show|tag|branch|checkout|stash|merge|rebase)/,
    ],
    inspection: [
        /^cat\s/,
        /^head\s/,
        /^tail\s/,
        /^wc\b/,
        /^ls\b/,
        /^find\s/,
        /^grep\s/,
        /^rg\s/,
        /^which\s/,
        /^echo\s/,
        /^du\s/,
        /^file\s/,
        /^stat\s/,
    ],
    runtime: [
        /^node\b/,
        /^python3?\b/,
        /^docker\b/,
        /^bun\b/,
        /^deno\b/,
        /^tsx\b/,
        /^ts-node\b/,
        /^npx\s+tsx\b/,
    ],
    filesystem: [
        /^mv\s/,
        /^cp\s/,
        /^mkdir\b/,
        /^touch\s/,
        /^rmdir\b/,
        /^ln\s/,
        /^chmod\s/,
        /^chown\s/,
    ],
}

// ─── Destructive Command Blacklist (ALWAYS blocked) ─────────────────

const DESTRUCTIVE_BLACKLIST: RegExp[] = [
    /rm\s+(-rf|-r)\s/,
    /rm\s+-rf$/,
    /git\s+push\s+--force/,
    /git\s+push\s+-f\b/,
    /git\s+reset\s+--hard/,
    /git\s+clean\s+-fd/,
    /npm\s+publish/,
    /chmod\s+777/,
    />\s*\/dev\//,
    /mkfs/,
    /dd\s+if=/,
    /:(){ :|:& };:/,   // fork bomb
    /curl\s.*\|\s*sh/,  // pipe-to-shell
    /wget\s.*\|\s*sh/,
]

// ─── Tool Definition ────────────────────────────────────────────────

export const govern_shell = tool({
    description:
        "Run shell commands with governance safety. Unlike innate bash, this blocks " +
        "destructive operations (rm -rf, git push --force, npm publish) and records " +
        "significant commands (build/test/git) as checkpoints on the active task. " +
        "Use for builds, tests, and git operations.",
    args: {
        command: tool.schema.string().describe(
            "Command to execute"
        ),
        timeout: tool.schema.number().optional().describe(
            "Timeout in seconds (default: 30, max: 120)"
        ),
        cwd: tool.schema.string().optional().describe(
            "Working directory (default: project root)"
        ),
    },

    async execute(args, context) {
        const projectDir = context.directory
        const command = args.command.trim()
        const timeout = Math.min(args.timeout ?? DEFAULT_TIMEOUT, MAX_TIMEOUT)
        const cwd = args.cwd ?? projectDir

        // ─── Destructive Check (ABSOLUTE — no override) ─────────
        for (const pattern of DESTRUCTIVE_BLACKLIST) {
            if (pattern.test(command)) {
                return [
                    `GOVERNANCE BLOCK: Destructive command blocked`,
                    "",
                    `WHAT: "${command}" matches destructive pattern: ${pattern.source}`,
                    `WHY: Destructive commands are permanently blocked for all agents.`,
                    `USE INSTEAD: Ask a human to run destructive commands manually.`,
                    `EVIDENCE: Matched blacklist pattern.`,
                ].join("\n")
            }
        }

        // ─── Agent Role Check ───────────────────────────────────
        const agentRole = stateManager.getCapturedAgent(context.sessionID) ?? "unknown"
        const category = classifyCommand(command)
        const allowedCategories = ROLE_PERMISSIONS[agentRole] ?? new Set(["inspection"])

        if (!allowedCategories.has(category)) {
            return [
                `GOVERNANCE BLOCK: ${category} command denied for "${agentRole}"`,
                "",
                `WHAT: Command "${command}" classified as "${category}".`,
                `WHY: Agent "${agentRole}" can only run: [${[...allowedCategories].join(", ")}].`,
                `USE INSTEAD: Delegate to an agent with "${category}" permission.`,
                `EVIDENCE: ROLE_PERMISSIONS["${agentRole}"] = [${[...allowedCategories].join(", ")}]`,
            ].join("\n")
        }

        // ─── Execute ────────────────────────────────────────────
        const startTime = Date.now()
        let stdout = ""
        let stderr = ""
        let exitCode = 0
        let timedOut = false

        try {
            const result = execSync(command, {
                cwd,
                timeout: timeout * 1000,
                maxBuffer: MAX_OUTPUT_CHARS * 2,
                encoding: "utf-8",
                stdio: ["pipe", "pipe", "pipe"],
            })
            stdout = truncateOutput(result ?? "")
        } catch (err: unknown) {
            if (err && typeof err === "object") {
                const execErr = err as {
                    status?: number | null
                    stdout?: string | null
                    stderr?: string | null
                    killed?: boolean
                }
                exitCode = execErr.status ?? 1
                stdout = truncateOutput(execErr.stdout ?? "")
                stderr = truncateOutput(execErr.stderr ?? "")
                timedOut = execErr.killed === true
            } else {
                exitCode = 1
                stderr = String(err)
            }
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(1)

        // ─── Build Output ───────────────────────────────────────
        const lines: string[] = []

        lines.push(`[${category}] ${command}`)
        lines.push(`Exit: ${exitCode} | Duration: ${duration}s${timedOut ? " TIMED OUT" : ""}`)
        lines.push("")

        if (stdout.trim()) {
            lines.push(stdout.trim())
            lines.push("")
        }

        if (stderr.trim()) {
            lines.push(`Stderr:`)
            lines.push(stderr.trim())
            lines.push("")
        }

        if (!stdout.trim() && !stderr.trim()) {
            lines.push("(no output)")
        }

        return lines.join("\n")
    },
})

// ─── Helpers ────────────────────────────────────────────────────────

/** Classify a command into a category */
function classifyCommand(command: string): string {
    for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
        if (patterns.some(p => p.test(command))) {
            return category
        }
    }
    return "general"
}

/** Truncate output to prevent memory issues */
function truncateOutput(output: string): string {
    if (output.length <= MAX_OUTPUT_CHARS) return output
    return output.slice(0, MAX_OUTPUT_CHARS)
        + `\n\n... [TRUNCATED: ${output.length} chars total, showing first ${MAX_OUTPUT_CHARS}]`
}
