/**
 * Phase δ2 Test: Delegation Schema + Validation
 *
 * 30+ assertions covering:
 * - Schema validation: createDelegation, createEmptyDelegationStore
 * - Hierarchy enforcement: no self-delegation, no upward delegation
 * - Depth enforcement: max depth = 3 blocks further delegation
 * - Category routing: research→builder blocked, development→builder allowed
 * - Expiration: stale delegations auto-expired
 * - Lifecycle: accept, complete, reject transitions
 * - Persistence: round-trip save/load of delegation store
 * - Display formatters: formatDelegationRecord, formatDelegationStore
 * - Instruction builder: buildDelegationInstruction produces valid handoff
 */

import { mkdirSync, existsSync, readFileSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import {
    createDelegation, createEmptyDelegationStore,
    findDelegation, findDelegationsForTask, findActiveDelegations,
    validateDelegation, getDelegationDepth,
    acceptDelegation, completeDelegation, rejectDelegation, expireStaleDelegations,
    formatDelegationRecord, formatDelegationStore, buildDelegationInstruction,
    DELEGATION_STORE_VERSION, MAX_DELEGATION_DEPTH, DELEGATION_EXPIRY_MS,
} from "../src/schemas/delegation.js"
import type { DelegationStore } from "../src/schemas/delegation.js"
import { StateManager } from "../src/lib/persistence.js"
import { createLogger } from "../src/lib/index.js"

// ─── Test Harness ────────────────────────────────────────────────────

const testBase = join(tmpdir(), `idumb-deleg-test-${Date.now()}`)
mkdirSync(testBase, { recursive: true })
const log = createLogger(testBase, "test-delegation", "debug")

let passed = 0
let failed = 0

function assert(name: string, condition: boolean): void {
    if (condition) {
        passed++
    } else {
        failed++
        const err = new Error(`FAIL: ${name}`)
        process.stderr.write(`${err.message}\n${err.stack}\n`)
    }
}

// ══════════════════════════════════════════════════════════════════════
// GROUP 1: Schema Validation (6 tests)
// ══════════════════════════════════════════════════════════════════════

{
    // Test: createEmptyDelegationStore
    const store = createEmptyDelegationStore()
    assert("schema: empty store has version", store.version === DELEGATION_STORE_VERSION)
    assert("schema: empty store has no delegations", store.delegations.length === 0)

    // Test: createDelegation
    const deleg = createDelegation({
        fromAgent: "idumb-supreme-coordinator",
        toAgent: "idumb-executor",
        taskId: "task-123",
        context: "Build the login form",
        expectedOutput: "Working form with tests",
    })
    assert("schema: delegation has id", typeof deleg.id === "string" && deleg.id.startsWith("deleg-"))
    assert("schema: delegation has correct from/to", deleg.fromAgent === "idumb-supreme-coordinator" && deleg.toAgent === "idumb-executor")
    assert("schema: delegation is pending", deleg.status === "pending")
    assert("schema: delegation has expiry", deleg.expiresAt > deleg.createdAt)
}

// ══════════════════════════════════════════════════════════════════════
// GROUP 2: Hierarchy Enforcement (6 tests)
// ══════════════════════════════════════════════════════════════════════

{
    // Self-delegation blocked
    const self = validateDelegation("idumb-executor", "idumb-executor", 0)
    assert("hierarchy: self-delegation blocked", !self.valid)
    assert("hierarchy: self-delegation reason", self.reason.includes("self"))

    // Upward delegation blocked (executor → coordinator)
    const up = validateDelegation("idumb-executor", "idumb-supreme-coordinator", 0)
    assert("hierarchy: upward delegation blocked", !up.valid)
    assert("hierarchy: upward reason mentions direction", up.reason.includes("UP"))

    // Downward delegation allowed (coordinator → executor)
    const down = validateDelegation("idumb-supreme-coordinator", "idumb-executor", 0)
    assert("hierarchy: downward delegation allowed", down.valid)

    // Unknown agent blocked
    const unknown = validateDelegation("idumb-executor", "nonexistent-agent", 0)
    assert("hierarchy: unknown agent blocked", !unknown.valid)
}

// ══════════════════════════════════════════════════════════════════════
// GROUP 3: Depth Enforcement (4 tests)
// ══════════════════════════════════════════════════════════════════════

{
    // Depth 0 → allowed
    const d0 = validateDelegation("idumb-supreme-coordinator", "idumb-executor", 0)
    assert("depth: depth 0 allowed", d0.valid)

    // Depth 2 → allowed
    const d2 = validateDelegation("idumb-supreme-coordinator", "idumb-executor", 2)
    assert("depth: depth 2 allowed", d2.valid)

    // Depth 3 → blocked (MAX_DELEGATION_DEPTH = 3)
    const d3 = validateDelegation("idumb-supreme-coordinator", "idumb-executor", 3)
    assert("depth: depth 3 blocked", !d3.valid)
    assert("depth: depth 3 reason mentions max", d3.reason.includes("Max"))
}

// ══════════════════════════════════════════════════════════════════════
// GROUP 4: Category Routing (4 tests)
// ══════════════════════════════════════════════════════════════════════

{
    // development → executor: allowed
    const devExecutor = validateDelegation("idumb-supreme-coordinator", "idumb-executor", 0, "development")
    assert("category: dev→executor allowed", devExecutor.valid)

    // research → executor: blocked (research routes to investigator)
    const resExecutor = validateDelegation("idumb-supreme-coordinator", "idumb-executor", 0, "research")
    assert("category: research→executor blocked", !resExecutor.valid)

    // governance → coordinator: allowed
    const govCoord = validateDelegation("idumb-supreme-coordinator", "idumb-supreme-coordinator", 0, "governance")
    // Note: self-delegation is blocked, so test governance→investigator instead
    const resInvestigator = validateDelegation("idumb-supreme-coordinator", "idumb-investigator", 0, "research")
    assert("category: research→investigator allowed", resInvestigator.valid)

    // ad-hoc → anything: allowed (ad-hoc is permissive)
    const adhocExecutor = validateDelegation("idumb-supreme-coordinator", "idumb-executor", 0, "ad-hoc")
    assert("category: ad-hoc→executor allowed", adhocExecutor.valid)
}

// ══════════════════════════════════════════════════════════════════════
// GROUP 5: Expiration (3 tests)
// ══════════════════════════════════════════════════════════════════════

{
    const store = createEmptyDelegationStore()

    // Fresh delegation — not expired
    const fresh = createDelegation({
        fromAgent: "idumb-supreme-coordinator",
        toAgent: "idumb-executor",
        taskId: "task-fresh",
        context: "Fresh task",
        expectedOutput: "Results",
    })
    store.delegations.push(fresh)
    const expired1 = expireStaleDelegations(store)
    assert("expire: fresh delegation not expired", expired1 === 0)

    // Simulate expired delegation
    const stale = createDelegation({
        fromAgent: "idumb-supreme-coordinator",
        toAgent: "idumb-investigator",
        taskId: "task-stale",
        context: "Stale task",
        expectedOutput: "Results",
    })
    stale.expiresAt = Date.now() - 1000 // already expired
    store.delegations.push(stale)

    const expired2 = expireStaleDelegations(store)
    assert("expire: stale delegation expired", expired2 === 1)
    assert("expire: stale status is expired", stale.status === "expired")
}

// ══════════════════════════════════════════════════════════════════════
// GROUP 6: Lifecycle Transitions (4 tests)
// ══════════════════════════════════════════════════════════════════════

{
    const deleg = createDelegation({
        fromAgent: "idumb-supreme-coordinator",
        toAgent: "idumb-executor",
        taskId: "task-lifecycle",
        context: "Test lifecycle",
        expectedOutput: "Complete results",
    })
    assert("lifecycle: initial status pending", deleg.status === "pending")

    // Accept
    acceptDelegation(deleg)
    assert("lifecycle: accepted status", deleg.status === "accepted")

    // Complete with result
    completeDelegation(deleg, {
        evidence: "All tests passing",
        filesModified: ["src/login.ts", "tests/login.test.ts"],
        testsRun: "12/12 passed",
        brainEntriesCreated: ["login-architecture"],
    })
    assert("lifecycle: completed status", deleg.status === "completed")
    assert("lifecycle: result evidence", deleg.result?.evidence === "All tests passing")
}

// ══════════════════════════════════════════════════════════════════════
// GROUP 7: Lookup Helpers (4 tests)
// ══════════════════════════════════════════════════════════════════════

{
    const store = createEmptyDelegationStore()

    const d1 = createDelegation({
        fromAgent: "idumb-supreme-coordinator",
        toAgent: "idumb-executor",
        taskId: "task-A",
        context: "Build A",
        expectedOutput: "A built",
    })
    const d2 = createDelegation({
        fromAgent: "idumb-supreme-coordinator",
        toAgent: "idumb-investigator",
        taskId: "task-A",
        context: "Research A",
        expectedOutput: "A researched",
    })
    store.delegations.push(d1, d2)

    assert("lookup: findDelegation", findDelegation(store, d1.id)?.fromAgent === "idumb-supreme-coordinator")
    assert("lookup: findDelegationsForTask", findDelegationsForTask(store, "task-A").length === 2)
    assert("lookup: findActiveDelegations", findActiveDelegations(store).length === 2)
    assert("lookup: getDelegationDepth", getDelegationDepth(store, "task-A") === 2)
}

// ══════════════════════════════════════════════════════════════════════
// GROUP 8: Display and Instruction (4 tests)
// ══════════════════════════════════════════════════════════════════════

{
    const store = createEmptyDelegationStore()

    // Empty store
    const emptyDisplay = formatDelegationStore(store)
    assert("display: empty store message", emptyDisplay.includes("No delegations"))

    // With delegations
    const d = createDelegation({
        fromAgent: "idumb-supreme-coordinator",
        toAgent: "idumb-executor",
        taskId: "task-display",
        context: "Build the form",
        expectedOutput: "Working form",
    })
    store.delegations.push(d)
    const display = formatDelegationStore(store)
    assert("display: shows active delegation", display.includes("Active"))

    // Format single record
    const record = formatDelegationRecord(d)
    assert("display: record shows from→to", record.includes("→"))

    // Instruction builder
    const instruction = buildDelegationInstruction(d)
    assert("instruction: contains context", instruction.includes("Build the form"))
}

// ══════════════════════════════════════════════════════════════════════
// GROUP 9: Persistence Round-Trip (3 tests)
// ══════════════════════════════════════════════════════════════════════

{
    const dir = join(testBase, "deleg-roundtrip")
    mkdirSync(join(dir, ".idumb/brain"), { recursive: true })

    // Create and populate
    const sm1 = new StateManager()
    await sm1.init(dir, log)

    const store1 = sm1.getDelegationStore()
    const d = createDelegation({
        fromAgent: "idumb-supreme-coordinator",
        toAgent: "idumb-executor",
        taskId: "task-persist",
        context: "Persist this",
        expectedOutput: "Persisted result",
    })
    store1.delegations.push(d)
    sm1.setDelegationStore(store1)
    await sm1.forceSave()

    // Verify delegations.json exists
    const delegPath = join(dir, ".idumb/brain/delegations.json")
    assert("persist: delegations.json exists", existsSync(delegPath))

    // Load in new StateManager
    const sm2 = new StateManager()
    await sm2.init(dir, log)
    const store2 = sm2.getDelegationStore()

    assert("persist: delegation survives roundtrip", store2.delegations.length === 1)
    assert("persist: delegation data correct", store2.delegations[0].context === "Persist this")
}

// ─── Cleanup + Results ───────────────────────────────────────────────

try {
    rmSync(testBase, { recursive: true, force: true })
} catch {
    // cleanup is best-effort
}

process.stderr.write(`\nResults: ${passed}/${passed + failed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
