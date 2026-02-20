import { mkdirSync, writeFileSync, rmSync } from "node:fs"
import { join, dirname } from "node:path"
import { tmpdir } from "node:os"
import {
    readGovernanceState,
    readTaskStore,
    readBrainStore,
    readCapturedAgent,
    formatGovernanceSummary,
} from "../src/lib/state-reader.js"
import { BRAIN_PATHS } from "../src/lib/paths.js"
import { createEmptyStore, createEpic, createTask } from "../src/schemas/task.js"

// ─── Test Harness ────────────────────────────────────────────────────

const testBase = join(tmpdir(), `idumb-state-reader-test-${Date.now()}`)
mkdirSync(testBase, { recursive: true })

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

function assertEqual<T>(name: string, actual: T, expected: T): void {
    if (actual === expected) {
        passed++
    } else {
        failed++
        const err = new Error(`FAIL: ${name}\n  Expected: ${JSON.stringify(expected)}\n  Actual:   ${JSON.stringify(actual)}`)
        process.stderr.write(`${err.message}\n${err.stack}\n`)
    }
}

function writeJSON(path: string, data: any): void {
    const absPath = join(testBase, path)
    mkdirSync(dirname(absPath), { recursive: true })
    writeFileSync(absPath, JSON.stringify(data))
}

// ─── Test Suite ──────────────────────────────────────────────────────

try {
    // ══════════════════════════════════════════════════════════════════════
    // GROUP 1: readGovernanceState - Happy Path
    // ══════════════════════════════════════════════════════════════════════

    {
        const store = createEmptyStore()
        const epic = createEpic("Test Epic")
        store.epics.push(epic)
        store.activeEpicId = epic.id
        const task = createTask(epic.id, "Test Task")
        task.status = "active"
        epic.tasks.push(task)

        writeJSON(BRAIN_PATHS.tasks, store)
        writeJSON(BRAIN_PATHS.state, {
            sessions: {
                "session-1": { capturedAgent: "test-agent" }
            }
        })
        writeJSON(BRAIN_PATHS.knowledge, { entries: [] })
        writeJSON(BRAIN_PATHS.delegations, { delegations: [] })
        writeJSON(BRAIN_PATHS.codemap, { files: {} })
        writeJSON(BRAIN_PATHS.projectMap, { framework: "none" })
        writeJSON(BRAIN_PATHS.taskGraph, { nodes: [] })
        writeJSON(BRAIN_PATHS.planState, { phase: "init" })
        writeJSON(BRAIN_PATHS.planningRegistry, { artifacts: [] })
        writeJSON(BRAIN_PATHS.config, { language: "en" })

        const state = readGovernanceState(testBase)

        assert("happy: taskStore is loaded", state.taskStore !== null)
        assertEqual("happy: activeEpic is correct", state.activeEpic?.id, epic.id)
        assertEqual("happy: activeTask is correct", state.activeTask?.id, task.id)
        assertEqual("happy: capturedAgent is correct", state.capturedAgent, "test-agent")
        assert("happy: brainStore is loaded", state.brainStore !== null)
        assert("happy: delegationStore is loaded", state.delegationStore !== null)
        assertEqual("happy: config is loaded", (state.config as any)?.language, "en")
    }

    // ══════════════════════════════════════════════════════════════════════
    // GROUP 2: readGovernanceState - Missing Files
    // ══════════════════════════════════════════════════════════════════════

    {
        const emptyDir = join(testBase, "missing-files")
        mkdirSync(emptyDir, { recursive: true })

        const state = readGovernanceState(emptyDir)

        assertEqual("missing: taskStore is null", state.taskStore, null)
        assertEqual("missing: activeEpic is null", state.activeEpic, null)
        assertEqual("missing: activeTask is null", state.activeTask, null)
        assertEqual("missing: capturedAgent is null", state.capturedAgent, null)
        assertEqual("missing: brainStore is null", state.brainStore, null)
    }

    // ══════════════════════════════════════════════════════════════════════
    // GROUP 3: readGovernanceState - Invalid JSON
    // ══════════════════════════════════════════════════════════════════════

    {
        const invalidDir = join(testBase, "invalid-json")
        const tasksPath = join(invalidDir, BRAIN_PATHS.tasks)
        mkdirSync(dirname(tasksPath), { recursive: true })
        writeFileSync(tasksPath, "invalid { json")

        const state = readGovernanceState(invalidDir)
        assertEqual("invalid: taskStore is null on parse error", state.taskStore, null)
    }

    // ══════════════════════════════════════════════════════════════════════
    // GROUP 4: Captured Agent - Legacy Path & Multiple Sessions
    // ══════════════════════════════════════════════════════════════════════

    {
        const legacyDir = join(testBase, "legacy-agent")
        mkdirSync(legacyDir, { recursive: true })

        // Test Legacy Path
        const legacyStatePath = join(legacyDir, BRAIN_PATHS.legacy.state)
        mkdirSync(dirname(legacyStatePath), { recursive: true })
        writeFileSync(legacyStatePath, JSON.stringify({
            sessions: {
                "old-session": { capturedAgent: "legacy-agent" }
            }
        }))

        const agent = readCapturedAgent(legacyDir)
        assertEqual("legacy: readCapturedAgent finds legacy agent", agent, "legacy-agent")

        // Test Multiple Sessions (last one wins)
        const multiDirName = "multi-session"
        const multiDir = join(testBase, multiDirName)
        mkdirSync(multiDir, { recursive: true })
        writeJSON(join(multiDirName, BRAIN_PATHS.state), {
            sessions: {
                "s1": { capturedAgent: "agent-1" },
                "s2": { capturedAgent: "agent-2" }
            }
        })
        const agent2 = readCapturedAgent(multiDir)
        // Implementation overwrites, so it's one of them.
        // We just check it's one of the valid ones.
        assert("multi: readCapturedAgent picks an agent from sessions", agent2 === "agent-1" || agent2 === "agent-2")
    }

    // ══════════════════════════════════════════════════════════════════════
    // GROUP 5: readCapturedAgent - Context Override
    // ══════════════════════════════════════════════════════════════════════

    {
        const agent = readCapturedAgent(testBase, "override-agent")
        assertEqual("override: readCapturedAgent respects contextAgent", agent, "override-agent")
    }

    // ══════════════════════════════════════════════════════════════════════
    // GROUP 6: Specialized Readers
    // ══════════════════════════════════════════════════════════════════════

    {
        assert("special: readTaskStore works", readTaskStore(testBase) !== null)
        assert("special: readBrainStore works", readBrainStore(testBase) !== null)
    }

    // ══════════════════════════════════════════════════════════════════════
    // GROUP 7: formatGovernanceSummary
    // ══════════════════════════════════════════════════════════════════════

    {
        const store = createEmptyStore()
        const epic = createEpic("Summary Epic")
        epic.category = "research"
        const task = createTask(epic.id, "Summary Task")
        task.status = "active"

        const snapshot = {
            taskStore: store,
            activeEpic: epic,
            activeTask: task,
            capturedAgent: "summary-agent",
            brainStore: null,
            delegationStore: null,
            codeMapStore: null,
            projectMap: null,
            taskGraph: null,
            planState: null,
            planningRegistry: null,
            config: null,
        }

        const summary = formatGovernanceSummary(snapshot)
        assert("summary: includes agent", summary.includes("summary-agent"))
        assert("summary: includes epic name", summary.includes("Summary Epic"))
        assert("summary: includes epic category", summary.includes("research"))
        assert("summary: includes task name", summary.includes("Summary Task"))

        const noTaskSnapshot = { ...snapshot, activeTask: null }
        const summary2 = formatGovernanceSummary(noTaskSnapshot)
        assert("summary: handles no active task", summary2.includes("Active task: none"))
    }
} finally {
    // ─── Cleanup ─────────────────────────────────────────────────────────
    try {
        rmSync(testBase, { recursive: true, force: true })
    } catch {
        // cleanup is best-effort
    }
}

process.stderr.write(`\nResults: ${passed}/${passed + failed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
