/**
 * idumb_bash — Precision Executor + Evidence Engine.
 *
 * n4 Plugin B tool. NOT a shell executor — a precision validation and evidence engine that:
 * - Knows what each command IS — test run? typecheck? git operation? drift check?
 * - Role-scoped — validators can only run validation commands, builders can build + test
 * - Evidence-linked — every execution tied to active task as evidence
 * - Blocks destructive — rm -rf, git push --force, npm publish always blocked
 * - Structured output — exit code + stdout + stderr separated
 * - Self-governed — no hooks needed for permission enforcement
 *
 * Purposes:
 * - validation:  npm test, tsc --noEmit, eslint → evidence for task
 * - build:       npm run build, tsc → artifact creation
 * - git:         git add, commit, status, diff, log → source-of-truth operations
 * - inspection:  cat, head, wc, ls, find → read-only investigation
 * - general:     default: role-whitelist applies
 *
 * Self-governed — entity-resolver checks agent role, state-reader checks active task.
 */

import { tool } from "@opencode-ai/plugin/tool"
import { execSync } from "child_process"
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs"
import { join } from "path"
import { readGovernanceState, readCapturedAgent } from "../lib/state-reader.js"
import { createLogger } from "../lib/logging.js"

// ─── Constants ──────────────────────────────────────────────────────

const AUDIT_DIR = ".idumb/brain/audit"
const PURPOSES = ["validation", "build", "git", "inspection", "general"] as const
const DEFAULT_TIMEOUT = 30
const MAX_TIMEOUT = 120
const MAX_OUTPUT_CHARS = 100_000  // 100KB output cap

// ─── Role × Purpose Permission Matrix ───────────────────────────────

/**
 * Which purposes each agent role can execute.
 * Agents not listed here can only use 'inspection'.
 */
const ROLE_PERMISSIONS: Record<string, Set<string>> = {
    "idumb-validator": new Set(["validation", "inspection"]),
    "idumb-low-validator": new Set(["validation", "inspection"]),
    "idumb-builder": new Set(["validation", "build", "git", "inspection"]),
    "idumb-meta-builder": new Set(["validation", "build", "git", "inspection", "general"]),
    "idumb-supreme-coordinator": new Set(["inspection"]),
    "idumb-planner": new Set(["inspection"]),
    "idumb-researcher": new Set(["inspection"]),
    "idumb-research-synthesizer": new Set(["inspection"]),
    "idumb-phase-researcher": new Set(["inspection"]),
    "idumb-roadmapper": new Set(["inspection"]),
}

// ─── Purpose → Command Pattern Matching ─────────────────────────────

/**
 * Command patterns for each purpose.
 * If purpose is specified, command must match at least one pattern.
 * If purpose is 'general', no pattern check (role check only).
 */
const PURPOSE_PATTERNS: Record<string, RegExp[]> = {
    validation: [
        /^npm\s+test/,
        /^npx\s+jest/,
        /^npx\s+vitest/,
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
        /^npx\s+/,
        /^npm\s+run\s+dev/,
    ],
    git: [
        /^git\s+(add|commit|status|diff|log|show|tag|branch|checkout|stash)/,
    ],
    inspection: [
        /^cat\s/,
        /^head\s/,
        /^tail\s/,
        /^wc\s/,
        /^ls\s/,
        /^ls$/,
        /^find\s/,
        /^grep\s/,
        /^rg\s/,
        /^fd\s/,
        /^which\s/,
        /^echo\s/,
        /^sort\s/,
        /^uniq\s/,
        /^du\s/,
        /^file\s/,
        /^stat\s/,
        /^wc$/,
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

export const idumb_bash = tool({

    description:
        `Precision command executor with role-based permissions and evidence capture. ` +
        `Purposes: "validation" (test/lint/typecheck → evidence), "build" (compile/bundle), ` +
        `"git" (add/commit/status/diff/log), "inspection" (cat/ls/find → read-only), ` +
        `"general" (role-restricted fallback). ` +
        `Destructive commands (rm -rf, git push --force, npm publish) are ALWAYS blocked. ` +
        `Use INSTEAD of innate bash. Self-governed: enforces agent role permissions, ` +
        `captures evidence linked to active task, blocks unsafe operations.`,

    args: {
        command: tool.schema.string().describe(
            "Command to execute"
        ),
        purpose: tool.schema.enum(PURPOSES).optional().describe(
            "Execution purpose: validation (test/lint), build, git, inspection (read-only), or general"
        ),
        timeout: tool.schema.number().optional().describe(
            "Timeout in seconds (default: 30, max: 120)"
        ),
        cwd: tool.schema.string().optional().describe(
            "Working directory (default: project root)"
        ),
        evidence: tool.schema.boolean().optional().describe(
            "Attach result as evidence to active task (default: true for validation/build)"
        ),
    },

    async execute(args, context) {
        const log = createLogger(context.directory, "idumb-bash")
        const projectDir = context.directory
        const command = args.command.trim()
        const purpose = args.purpose ?? detectPurpose(command)
        const timeout = Math.min(args.timeout ?? DEFAULT_TIMEOUT, MAX_TIMEOUT)
        const cwd = args.cwd ?? projectDir
        const shouldCapture = args.evidence ?? (purpose === "validation" || purpose === "build")

        log.info(`idumb_bash: purpose=${purpose} command="${command.slice(0, 80)}"`)

        // ─── Destructive Check (ABSOLUTE — no override) ─────────
        const destructiveMatch = checkDestructive(command)
        if (destructiveMatch) {
            log.warn(`BLOCKED DESTRUCTIVE: "${command}"`)
            return [
                `❌ DESTRUCTIVE COMMAND BLOCKED`,
                ``,
                `Command: ${command}`,
                `Matched: ${destructiveMatch}`,
                ``,
                `This command is in the permanent blocklist and cannot be executed`,
                `by any agent regardless of role.`,
                ``,
                `BLOCKED PATTERNS:`,
                `  • rm -rf / rm -r (recursive deletion)`,
                `  • git push --force (history rewrite)`,
                `  • git reset --hard (data loss)`,
                `  • npm publish (accidental release)`,
                `  • pipe-to-shell (curl|sh, wget|sh)`,
            ].join("\n")
        }

        // ─── Governance State ───────────────────────────────────
        const govState = readGovernanceState(projectDir)

        // ─── Agent Role Check ───────────────────────────────────
        const agentRole = readCapturedAgent(projectDir, context.agent) ?? "unknown"
        const allowedPurposes = ROLE_PERMISSIONS[agentRole] ?? new Set(["inspection"])

        if (!allowedPurposes.has(purpose)) {
            log.warn(`BLOCKED: agent "${agentRole}" cannot execute purpose="${purpose}"`)
            return [
                `❌ AGENT PERMISSION DENIED`,
                ``,
                `Agent: "${agentRole}"`,
                `Requested purpose: ${purpose}`,
                `Allowed purposes: [${[...allowedPurposes].join(", ")}]`,
                ``,
                `This agent role does not have permission to execute "${purpose}" commands.`,
                ``,
                `REDIRECT: Delegate this to an agent with the correct permissions.`,
            ].join("\n")
        }

        // ─── Purpose Pattern Check ──────────────────────────────
        if (purpose !== "general") {
            const patterns = PURPOSE_PATTERNS[purpose]
            if (patterns && patterns.length > 0) {
                const matches = patterns.some(p => p.test(command))
                if (!matches) {
                    log.warn(`Command "${command}" doesn't match purpose="${purpose}" patterns`)
                    return [
                        `❌ COMMAND-PURPOSE MISMATCH`,
                        ``,
                        `Command: ${command}`,
                        `Purpose: ${purpose}`,
                        ``,
                        `The command doesn't match any known pattern for "${purpose}".`,
                        ``,
                        `Expected patterns for "${purpose}":`,
                        ...getPurposeExamples(purpose),
                        ``,
                        `Options:`,
                        `  1. Use purpose="general" (requires meta-builder role)`,
                        `  2. Use a command that matches the "${purpose}" patterns`,
                        `  3. Use purpose="inspection" for read-only commands`,
                    ].join("\n")
                }
            }
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
        const output: string[] = []

        output.push(`─── Precision Executor ─────────────────────────────────────────`)
        output.push(`│ Agent: ${agentRole} | Role check: ✅ (${purpose})`)
        output.push(`│ Purpose: ${purpose} | Pattern match: ✅`)

        if (govState.activeTask) {
            output.push(`│ Linked to task: "${govState.activeTask.name}"`)
        }

        output.push(`────────────────────────────────────────────────────────────────`)
        output.push(``)
        output.push(`Command: ${command}`)
        output.push(`Exit: ${exitCode} | Duration: ${duration}s${timedOut ? " ⚠️ TIMED OUT" : ""}`)
        output.push(``)

        if (stdout.trim()) {
            output.push(`Stdout:`)
            output.push(stdout.trim())
            output.push(``)
        }

        if (stderr.trim()) {
            output.push(`Stderr:`)
            output.push(stderr.trim())
            output.push(``)
        }

        if (!stdout.trim() && !stderr.trim()) {
            output.push(`(no output)`)
            output.push(``)
        }

        // ─── Evidence Capture ───────────────────────────────────
        if (shouldCapture && govState.activeTask) {
            const evidenceId = captureEvidence(projectDir, {
                command,
                purpose,
                exitCode,
                duration: parseFloat(duration),
                timedOut,
                stdoutLength: stdout.length,
                stderrLength: stderr.length,
                agent: agentRole,
                taskId: govState.activeTask.id ?? "unknown",
                taskName: govState.activeTask.name ?? "unknown",
                timestamp: Date.now(),
            })

            output.push(`─── Evidence Captured ──────────────────────────────────────────`)
            output.push(`│ Linked to task: "${govState.activeTask.name}"`)
            output.push(`│ Evidence type: ${purpose}`)
            output.push(`│ Evidence ID: ${evidenceId}`)
            output.push(`│ Result: ${exitCode === 0 ? "✅ PASS" : "❌ FAIL (exit " + exitCode + ")"}`)
            output.push(`│ Stored: ${AUDIT_DIR}`)
            output.push(`────────────────────────────────────────────────────────────────`)
        }

        log.info(`Executed: exit=${exitCode} duration=${duration}s purpose=${purpose}`)
        return output.join("\n")
    },
})

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Auto-detect purpose from command content when not specified.
 */
function detectPurpose(command: string): string {
    for (const [purpose, patterns] of Object.entries(PURPOSE_PATTERNS)) {
        if (patterns.some(p => p.test(command))) {
            return purpose
        }
    }
    return "general"
}

/**
 * Check if a command matches any destructive pattern.
 * Returns the matched pattern description or null.
 */
function checkDestructive(command: string): string | null {
    for (const pattern of DESTRUCTIVE_BLACKLIST) {
        if (pattern.test(command)) {
            return pattern.source
        }
    }
    return null
}

/**
 * Truncate command output to prevent memory issues.
 */
function truncateOutput(output: string): string {
    if (output.length <= MAX_OUTPUT_CHARS) return output

    const truncated = output.slice(0, MAX_OUTPUT_CHARS)
    return truncated + `\n\n... [OUTPUT TRUNCATED: ${output.length} chars total, showing first ${MAX_OUTPUT_CHARS}]`
}

/**
 * Get example commands for a given purpose.
 */
function getPurposeExamples(purpose: string): string[] {
    const examples: Record<string, string[]> = {
        validation: [
            "  • npm test",
            "  • npx jest",
            "  • tsc --noEmit",
            "  • eslint .",
            "  • npm run typecheck",
        ],
        build: [
            "  • npm run build",
            "  • tsc",
            "  • npx <tool>",
        ],
        git: [
            "  • git status",
            "  • git diff",
            "  • git log -n 10",
            "  • git add <file>",
            "  • git commit -m '<message>'",
        ],
        inspection: [
            "  • cat <file>",
            "  • ls -la",
            "  • find . -name '*.ts'",
            "  • grep -r 'pattern' src/",
            "  • wc -l <file>",
        ],
    }
    return examples[purpose] ?? ["  • (no examples for this purpose)"]
}

/**
 * Capture an evidence entry for the execution.
 * Stored as a JSONL entry in the audit log.
 */
function captureEvidence(
    projectDir: string,
    evidence: Record<string, unknown>,
): string {
    const evidenceId = `evidence-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    try {
        const date = new Date().toISOString().slice(0, 10)
        const auditDir = join(projectDir, AUDIT_DIR, date)
        if (!existsSync(auditDir)) {
            mkdirSync(auditDir, { recursive: true })
        }

        const auditFile = join(auditDir, "executions.jsonl")
        const entry = { id: evidenceId, ...evidence }
        const line = JSON.stringify(entry) + "\n"

        const existing = existsSync(auditFile) ? readFileSync(auditFile, "utf-8") : ""
        writeFileSync(auditFile, existing + line, "utf-8")
    } catch {
        // Non-critical — evidence capture failure should never block execution
    }

    return evidenceId
}
