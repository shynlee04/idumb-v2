/**
 * Delegation Schema — Phase δ2
 *
 * Tracks structured delegation handoffs between agents.
 * Delegation is NOT "assign task to agent" — it's a schema-regulated handoff with:
 * - Context transfer (what the delegate needs to know)
 * - Evidence requirements (what must be returned)
 * - Permission boundaries (what tools the delegate can use)
 * - Chain tracking (who delegated to whom, depth limit)
 *
 * PP-01 constraint: Subagent hooks don't fire, so delegation tracking
 * is persisted to disk and enforced via agent profiles + skills.
 */

import type { WorkStreamCategory } from "./task.js"

// ─── Constants ───────────────────────────────────────────────────────

export const DELEGATION_STORE_VERSION = "1.0.0"
export const MAX_DELEGATION_DEPTH = 3
export const DELEGATION_EXPIRY_MS = 30 * 60 * 1000  // 30 minutes

// ─── Types ───────────────────────────────────────────────────────────

export type DelegationStatus =
    | "pending"     // created, not yet accepted by delegate
    | "accepted"    // delegate acknowledged and is working
    | "completed"   // delegate returned results
    | "rejected"    // delegate refused (invalid permissions, etc.)
    | "expired"     // auto-expired after DELEGATION_EXPIRY_MS

export interface DelegationResult {
    evidence: string
    filesModified: string[]
    testsRun: string
    brainEntriesCreated: string[]
}

export interface DelegationRecord {
    id: string
    fromAgent: string           // who delegated (captured via chat.params)
    toAgent: string             // target agent

    // What
    taskId: string              // which task is being delegated
    context: string             // what the delegate needs to know
    expectedOutput: string      // what must be returned

    // Permissions (scoped to this delegation)
    allowedTools: string[]      // subset of tools delegate may use
    allowedActions: string[]    // subset of actions within tools
    maxDepth: number            // remaining delegation depth (counts down from MAX)

    // Lifecycle
    status: DelegationStatus
    createdAt: number
    completedAt?: number
    expiresAt: number           // auto-expire stale delegations

    // Result (filled by delegate when completing)
    result?: DelegationResult
}

export interface DelegationStore {
    version: string
    delegations: DelegationRecord[]
}

// ─── Agent Hierarchy (who can delegate to whom) ──────────────────────

/**
 * Hierarchy levels — lower number = higher authority.
 * Cannot delegate UP (executor cannot delegate to coordinator).
 *
 * 3-agent model:
 *   coordinator (0) — governance-only, delegates everything
 *   investigator (1) — context gathering, research, analysis
 *   executor (1) — precision writes, schema-validated implementation
 */
const AGENT_HIERARCHY: Record<string, number> = {
    "idumb-supreme-coordinator": 0,
    "idumb-investigator": 1,
    "idumb-executor": 1,
}

/**
 * Category → Agent routing matrix.
 * Which agents can handle which WorkStream categories.
 */
const CATEGORY_AGENT_MATRIX: Record<WorkStreamCategory, string[]> = {
    "development": ["idumb-executor"],
    "research": ["idumb-investigator"],
    "governance": ["idumb-supreme-coordinator"],
    "maintenance": ["idumb-executor", "idumb-investigator"],
    "spec-kit": ["idumb-investigator"],
    "ad-hoc": ["idumb-executor", "idumb-investigator"],
}

// ─── Factory Functions ───────────────────────────────────────────────

let delegationCounter = 0

export function createEmptyDelegationStore(): DelegationStore {
    return {
        version: DELEGATION_STORE_VERSION,
        delegations: [],
    }
}

export interface CreateDelegationOptions {
    fromAgent: string
    toAgent: string
    taskId: string
    context: string
    expectedOutput: string
    allowedTools?: string[]
    allowedActions?: string[]
    currentDepth?: number
}

export function createDelegation(opts: CreateDelegationOptions): DelegationRecord {
    const now = Date.now()
    delegationCounter++

    const remainingDepth = MAX_DELEGATION_DEPTH - (opts.currentDepth ?? 0)

    return {
        id: `deleg-${now}-${delegationCounter}`,
        fromAgent: opts.fromAgent,
        toAgent: opts.toAgent,
        taskId: opts.taskId,
        context: opts.context,
        expectedOutput: opts.expectedOutput,
        allowedTools: opts.allowedTools ?? ["idumb_task", "idumb_anchor"],
        allowedActions: opts.allowedActions ?? ["status", "add_subtask", "complete"],
        maxDepth: remainingDepth,
        status: "pending",
        createdAt: now,
        expiresAt: now + DELEGATION_EXPIRY_MS,
    }
}

// ─── Lookup Helpers ──────────────────────────────────────────────────

export function findDelegation(store: DelegationStore, id: string): DelegationRecord | undefined {
    return store.delegations.find(d => d.id === id)
}

export function findDelegationsForTask(store: DelegationStore, taskId: string): DelegationRecord[] {
    return store.delegations.filter(d => d.taskId === taskId)
}

export function findDelegationsFromAgent(store: DelegationStore, agent: string): DelegationRecord[] {
    return store.delegations.filter(d => d.fromAgent === agent)
}

export function findDelegationsToAgent(store: DelegationStore, agent: string): DelegationRecord[] {
    return store.delegations.filter(d => d.toAgent === agent)
}

export function findActiveDelegations(store: DelegationStore): DelegationRecord[] {
    return store.delegations.filter(d => d.status === "pending" || d.status === "accepted")
}

// ─── Validation ──────────────────────────────────────────────────────

export interface DelegationValidation {
    valid: boolean
    reason: string
}

/**
 * Validate that a delegation is allowed.
 * Checks:
 * 1. Cannot delegate to self
 * 2. Cannot delegate UP the hierarchy
 * 3. Delegation depth not exceeded
 * 4. Target agent exists in hierarchy
 * 5. Category routing (if epic category is known)
 */
export function validateDelegation(
    fromAgent: string,
    toAgent: string,
    currentDepth: number,
    epicCategory?: WorkStreamCategory,
): DelegationValidation {
    // Rule 1: No self-delegation
    if (fromAgent === toAgent) {
        return { valid: false, reason: `Cannot delegate to self (${fromAgent}).` }
    }

    // Rule 2: Check hierarchy — cannot delegate UP
    const fromLevel = AGENT_HIERARCHY[fromAgent]
    const toLevel = AGENT_HIERARCHY[toAgent]

    if (fromLevel === undefined) {
        return { valid: false, reason: `Unknown agent "${fromAgent}" — not in hierarchy.` }
    }
    if (toLevel === undefined) {
        return { valid: false, reason: `Unknown agent "${toAgent}" — not in hierarchy. Known agents: ${Object.keys(AGENT_HIERARCHY).join(", ")}` }
    }
    if (toLevel < fromLevel) {
        return {
            valid: false,
            reason: `Cannot delegate UP: "${fromAgent}" (level ${fromLevel}) → "${toAgent}" (level ${toLevel}). Delegation flows downward only.`,
        }
    }

    // Rule 3: Depth check
    if (currentDepth >= MAX_DELEGATION_DEPTH) {
        return {
            valid: false,
            reason: `Max delegation depth (${MAX_DELEGATION_DEPTH}) reached. Current depth: ${currentDepth}. Cannot delegate further.`,
        }
    }

    // Rule 4: Category routing (advisory, not blocking for ad-hoc)
    if (epicCategory && epicCategory !== "ad-hoc") {
        const allowedAgents = CATEGORY_AGENT_MATRIX[epicCategory]
        if (allowedAgents && !allowedAgents.includes(toAgent)) {
            return {
                valid: false,
                reason: `Agent "${toAgent}" is not in the routing matrix for category "${epicCategory}". Allowed agents: ${allowedAgents.join(", ")}.`,
            }
        }
    }

    return { valid: true, reason: "Delegation allowed." }
}

/**
 * Calculate the current delegation depth for a task by tracing the chain.
 */
export function getDelegationDepth(store: DelegationStore, taskId: string): number {
    const delegations = store.delegations.filter(
        d => d.taskId === taskId && (d.status === "pending" || d.status === "accepted" || d.status === "completed")
    )
    return delegations.length
}

// ─── Lifecycle ───────────────────────────────────────────────────────

export function acceptDelegation(record: DelegationRecord): void {
    record.status = "accepted"
}

export function completeDelegation(record: DelegationRecord, result: DelegationResult): void {
    record.status = "completed"
    record.completedAt = Date.now()
    record.result = result
}

export function rejectDelegation(record: DelegationRecord): void {
    record.status = "rejected"
    record.completedAt = Date.now()
}

/**
 * Expire stale delegations that have passed their expiresAt.
 * Returns the number of delegations expired.
 */
export function expireStaleDelegations(store: DelegationStore): number {
    const now = Date.now()
    let count = 0

    for (const d of store.delegations) {
        if (d.status === "pending" && now > d.expiresAt) {
            d.status = "expired"
            d.completedAt = now
            count++
        }
    }

    return count
}

// ─── Display ─────────────────────────────────────────────────────────

export function formatDelegationRecord(d: DelegationRecord): string {
    const elapsed = Math.round((Date.now() - d.createdAt) / (60 * 1000))
    const lines = [
        `  ${d.id}: ${d.fromAgent} → ${d.toAgent} [${d.status}] (${elapsed}m ago)`,
        `    Task: ${d.taskId}`,
        `    Context: ${d.context.substring(0, 80)}${d.context.length > 80 ? "..." : ""}`,
    ]

    if (d.result) {
        lines.push(`    Evidence: ${d.result.evidence.substring(0, 60)}${d.result.evidence.length > 60 ? "..." : ""}`)
        if (d.result.filesModified.length > 0) {
            lines.push(`    Files: ${d.result.filesModified.join(", ")}`)
        }
    }

    return lines.join("\n")
}

export function formatDelegationStore(store: DelegationStore): string {
    if (store.delegations.length === 0) {
        return "No delegations recorded."
    }

    const active = findActiveDelegations(store)
    const completed = store.delegations.filter(d => d.status === "completed")
    const expired = store.delegations.filter(d => d.status === "expired")

    const lines: string[] = ["=== Delegation Status ===", ""]

    if (active.length > 0) {
        lines.push(`📋 Active (${active.length}):`)
        for (const d of active) lines.push(formatDelegationRecord(d))
        lines.push("")
    }

    if (completed.length > 0) {
        lines.push(`✅ Completed (${completed.length}):`)
        for (const d of completed) lines.push(formatDelegationRecord(d))
        lines.push("")
    }

    if (expired.length > 0) {
        lines.push(`⏰ Expired (${expired.length}):`)
        for (const d of expired) lines.push(formatDelegationRecord(d))
    }

    return lines.join("\n")
}

// ─── Delegation Instruction Builder ──────────────────────────────────

/**
 * Build a structured delegation instruction that the caller can pass to @toAgent.
 * This is the "handoff message" that makes PP-01 work — since hooks don't fire
 * for subagents, we encode all governance context into the message itself.
 */
export function buildDelegationInstruction(record: DelegationRecord): string {
    return [
        `## 📋 DELEGATION — ${record.id}`,
        ``,
        `**From:** ${record.fromAgent}`,
        `**To:** ${record.toAgent}`,
        `**Task:** ${record.taskId}`,
        `**Created:** ${new Date(record.createdAt).toISOString()}`,
        `**Expires:** ${new Date(record.expiresAt).toISOString()}`,
        ``,
        `### Context`,
        record.context,
        ``,
        `### Expected Output`,
        record.expectedOutput,
        ``,
        `### Allowed Tools`,
        record.allowedTools.map(t => `- ${t}`).join("\n"),
        ``,
        `### Allowed Actions`,
        record.allowedActions.map(a => `- ${a}`).join("\n"),
        ``,
        `### Rules`,
        `- Max delegation depth remaining: ${record.maxDepth}`,
        `- Report back with: evidence, files modified, tests run`,
        `- Use \`idumb_task action=complete target_id=${record.taskId} evidence="..."\` when done`,
        `- Delegation expires in ${DELEGATION_EXPIRY_MS / 60000} minutes`,
    ].join("\n")
}
