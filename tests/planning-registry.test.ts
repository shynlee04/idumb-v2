/**
 * Planning Registry — Schema Tests
 *
 * Tests:
 * - Factory functions (artifact, section, chain, registry, outlier)
 * - Chain management (add, resolve head, history)
 * - Chain-position staleness (NOT time-based)
 * - Section lifecycle (supersede, stale, invalid, drift)
 * - Cross-entity linking (tasks, delegations, brain entries)
 * - Outlier detection + acceptance/rejection
 * - Markdown section parsing
 * - Iteration pattern detection
 * - Artifact type detection
 * - Formatting
 */

import {
    createPlanningRegistry,
    createPlanningArtifact,
    createArtifactSection,
    createArtifactChain,
    createOutlierEntry,
    computeContentHash,
    parseMarkdownSections,
    parseSectionsFromMarkdown,
    resolveChainHead,
    getChainHistory,
    addToChain,
    isArtifactStaleByChainPosition,
    findStaleArtifacts,
    findStaleSections,
    isArtifactHealthy,
    supersedSection,
    markSectionStale,
    markSectionInvalid,
    detectSectionDrift,
    linkTaskToArtifact,
    linkDelegationToSections,
    linkBrainEntryToArtifact,
    findPendingOutliers,
    acceptOutlier,
    rejectOutlier,
    findArtifactByPath,
    findArtifactById,
    findArtifactsByType,
    findArtifactsByChain,
    extractIterationPattern,
    detectArtifactType,
    formatRegistrySummary,
    formatArtifactDetail,
    PLANNING_REGISTRY_VERSION,
} from "../src/schemas/planning-registry.js"
import type { PlanningRegistry, PlanningArtifact } from "../src/schemas/planning-registry.js"

// ─── Minimal Test Harness (tsx-compatible) ─────────────────────────

type ObjectContainingMatcher = { __matcher: "objectContaining"; subset: Record<string, unknown> }

let passed = 0
let failed = 0

function deepEqual(a: unknown, b: unknown): boolean {
    return JSON.stringify(a) === JSON.stringify(b)
}

function objectContaining(subset: Record<string, unknown>): ObjectContainingMatcher {
    return { __matcher: "objectContaining", subset }
}

function matchObjectContaining(actual: unknown, matcher: ObjectContainingMatcher): boolean {
    if (!actual || typeof actual !== "object") return false
    const obj = actual as Record<string, unknown>
    return Object.entries(matcher.subset).every(([key, value]) => deepEqual(obj[key], value))
}

function expect(actual: unknown) {
    const assert = (condition: boolean, message: string): void => {
        if (!condition) {
            throw new Error(message)
        }
    }

    const api = {
        toBe(expected: unknown) {
            assert(Object.is(actual, expected), `Expected ${String(actual)} to be ${String(expected)}`)
        },
        toEqual(expected: unknown) {
            if (
                expected &&
                typeof expected === "object" &&
                "__matcher" in (expected as Record<string, unknown>) &&
                (expected as ObjectContainingMatcher).__matcher === "objectContaining"
            ) {
                assert(
                    matchObjectContaining(actual, expected as ObjectContainingMatcher),
                    `Expected object to contain ${JSON.stringify((expected as ObjectContainingMatcher).subset)}`,
                )
                return
            }
            assert(deepEqual(actual, expected), `Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`)
        },
        toHaveLength(expected: number) {
            const length = (actual as { length?: number } | null | undefined)?.length
            assert(length === expected, `Expected length ${String(length)} to be ${expected}`)
        },
        toContain(expected: unknown) {
            if (typeof actual === "string") {
                assert(actual.includes(String(expected)), `Expected "${actual}" to contain "${String(expected)}"`)
                return
            }
            if (Array.isArray(actual)) {
                assert(actual.includes(expected), `Expected array to contain ${JSON.stringify(expected)}`)
                return
            }
            throw new Error("toContain supports only strings and arrays")
        },
        toMatch(pattern: RegExp) {
            assert(typeof actual === "string" && pattern.test(actual), `Expected "${String(actual)}" to match ${String(pattern)}`)
        },
        toBeDefined() {
            assert(actual !== undefined, "Expected value to be defined")
        },
        toBeUndefined() {
            assert(actual === undefined, "Expected value to be undefined")
        },
        toBeTruthy() {
            assert(Boolean(actual), `Expected value to be truthy, got ${String(actual)}`)
        },
        toBeNull() {
            assert(actual === null, `Expected value to be null, got ${String(actual)}`)
        },
    }

    return {
        ...api,
        not: {
            toBe(expected: unknown) {
                assert(!Object.is(actual, expected), `Expected ${String(actual)} not to be ${String(expected)}`)
            },
            toContain(expected: unknown) {
                if (typeof actual === "string") {
                    assert(!actual.includes(String(expected)), `Expected "${actual}" not to contain "${String(expected)}"`)
                    return
                }
                if (Array.isArray(actual)) {
                    assert(!actual.includes(expected), `Expected array not to contain ${JSON.stringify(expected)}`)
                    return
                }
                throw new Error("not.toContain supports only strings and arrays")
            },
        },
    }
}

expect.objectContaining = objectContaining

function describe(name: string, fn: () => void): void {
    process.stderr.write(`\n${name}\n`)
    fn()
}

function it(name: string, fn: () => void): void {
    try {
        fn()
        passed++
    } catch (err) {
        failed++
        const msg = err instanceof Error ? err.message : String(err)
        process.stderr.write(`FAIL: ${name}\n${msg}\n`)
    }
}

// ─── Factory Function Tests ─────────────────────────────────────────

describe("Planning Registry — Factory Functions", () => {
    it("createPlanningRegistry returns empty registry with version", () => {
        const reg = createPlanningRegistry()
        expect(reg.version).toBe(PLANNING_REGISTRY_VERSION)
        expect(reg.artifacts).toEqual([])
        expect(reg.chains).toEqual([])
        expect(reg.outliers).toEqual([])
        expect(reg.lastScanAt).toBe(0)
    })

    it("createPlanningArtifact sets correct tier from type", () => {
        const govDoc = createPlanningArtifact({
            path: "governance/PROJECT.md",
            type: "governance-doc",
            chainId: "chain-1",
            createdBy: "idumb-supreme-coordinator",
        })
        expect(govDoc.tier).toBe(1)
        expect(govDoc.status).toBe("draft")
        expect(govDoc.sections).toEqual([])
        expect(govDoc.chainChildIds).toEqual([])
        expect(govDoc.id).toMatch(/^artifact-/)

        const implPlan = createPlanningArtifact({
            path: "planning/impl-plan-n1.md",
            type: "implementation-plan",
            chainId: "chain-2",
            createdBy: "idumb-executor",
            iteration: 1,
        })
        expect(implPlan.tier).toBe(2)
        expect(implPlan.iteration).toBe(1)

        const walkthrough = createPlanningArtifact({
            path: "planning/walkthrough-fe1.md",
            type: "walkthrough",
            chainId: "chain-3",
            createdBy: "idumb-investigator",
        })
        expect(walkthrough.tier).toBe(3)
    })

    it("createArtifactSection computes content hash and has NO staleAfter", () => {
        const section = createArtifactSection({
            heading: "Proposed Changes",
            depth: 2,
            content: "We will replace all 7 agents with 3.",
        })
        expect(section.status).toBe("active")
        expect(section.contentHash).toBeTruthy()
        expect(section.contentHash.length).toBe(16) // SHA-256 truncated to 16 chars
        expect(section.id).toMatch(/^section-/)
        // Verify NO staleAfter property exists
        expect("staleAfter" in section).toBe(false)
    })

    it("createArtifactChain initializes with root as active head", () => {
        const chain = createArtifactChain({
            name: "impl-plan-n-series",
            rootArtifactId: "artifact-001",
            tier: 2,
        })
        expect(chain.rootArtifactId).toBe("artifact-001")
        expect(chain.activeArtifactId).toBe("artifact-001")
        expect(chain.artifactIds).toEqual(["artifact-001"])
        expect(chain.id).toMatch(/^chain-/)
    })

    it("createOutlierEntry defaults to pending action", () => {
        const outlier = createOutlierEntry({
            path: ".idumb/planning/mystery-file.md",
            reason: "unregistered",
            detectedBy: "idumb_init",
            note: "File found during brownfield scan",
        })
        expect(outlier.userAction).toBe("pending")
        expect(outlier.reason).toBe("unregistered")
        expect(outlier.detectedBy).toBe("idumb_init")
    })
})

// ─── Content Hashing ────────────────────────────────────────────────

describe("Planning Registry — Content Hashing", () => {
    it("same content produces same hash", () => {
        const h1 = computeContentHash("Hello, world!")
        const h2 = computeContentHash("Hello, world!")
        expect(h1).toBe(h2)
    })

    it("different content produces different hash", () => {
        const h1 = computeContentHash("Hello, world!")
        const h2 = computeContentHash("Hello, world?")
        expect(h1).not.toBe(h2)
    })

    it("hash is 16 characters (truncated SHA-256)", () => {
        const h = computeContentHash("test content")
        expect(h.length).toBe(16)
        expect(h).toMatch(/^[a-f0-9]+$/)
    })
})

// ─── Markdown Section Parser ────────────────────────────────────────

describe("Planning Registry — Markdown Section Parser", () => {
    it("parses headings at different depths", () => {
        const md = `# Title
Some intro text

## Section A
Content for A

### Subsection A1
Deep content

## Section B
Content for B`

        const sections = parseMarkdownSections(md)
        expect(sections).toHaveLength(4)
        expect(sections[0]).toEqual(expect.objectContaining({
            heading: "Title", depth: 1,
        }))
        expect(sections[1]).toEqual(expect.objectContaining({
            heading: "Section A", depth: 2,
        }))
        expect(sections[2]).toEqual(expect.objectContaining({
            heading: "Subsection A1", depth: 3,
        }))
        expect(sections[3]).toEqual(expect.objectContaining({
            heading: "Section B", depth: 2,
        }))
    })

    it("parseSectionsFromMarkdown returns ArtifactSection[] with hashes", () => {
        const md = `# Plan
Implementation details

## Verification
Testing steps`

        const sections = parseSectionsFromMarkdown(md)
        expect(sections).toHaveLength(2)
        expect(sections[0].heading).toBe("Plan")
        expect(sections[0].status).toBe("active")
        expect(sections[0].contentHash).toBeTruthy()
        expect(sections[1].heading).toBe("Verification")
    })

    it("handles empty content between headings", () => {
        const md = `# A
# B
Content`
        const sections = parseMarkdownSections(md)
        expect(sections).toHaveLength(2)
        expect(sections[0].content).toBe("")
    })
})

// ─── Chain Management ───────────────────────────────────────────────

describe("Planning Registry — Chain Management", () => {
    function buildChainedRegistry(): PlanningRegistry {
        const reg = createPlanningRegistry()

        // Create n1 artifact
        const n1 = createPlanningArtifact({
            path: "planning/impl-plan-n1.md",
            type: "implementation-plan",
            chainId: "temp",
            createdBy: "idumb-executor",
            iteration: 1,
        })
        n1.id = "art-n1"
        n1.status = "active"
        reg.artifacts.push(n1)

        // Create chain with n1 as root
        const chain = createArtifactChain({
            name: "impl-plan-n-series",
            rootArtifactId: "art-n1",
            tier: 2,
        })
        chain.id = "chain-impl"
        n1.chainId = chain.id
        reg.chains.push(chain)

        return reg
    }

    it("resolveChainHead returns the active head", () => {
        const reg = buildChainedRegistry()
        const head = resolveChainHead(reg, "chain-impl")
        expect(head).toBeDefined()
        expect(head!.id).toBe("art-n1")
    })

    it("addToChain links new artifact to previous head", () => {
        const reg = buildChainedRegistry()

        const n2 = createPlanningArtifact({
            path: "planning/impl-plan-n2.md",
            type: "implementation-plan",
            chainId: "chain-impl",
            createdBy: "idumb-executor",
            iteration: 2,
        })
        n2.id = "art-n2"

        addToChain(reg, "chain-impl", n2)
        reg.artifacts.push(n2)

        // n2 should now be chain head
        const head = resolveChainHead(reg, "chain-impl")
        expect(head!.id).toBe("art-n2")

        // n2 should link back to n1
        expect(n2.chainParentId).toBe("art-n1")

        // n1 should link forward to n2
        const n1 = findArtifactById(reg, "art-n1")
        expect(n1!.chainChildIds).toContain("art-n2")
    })

    it("getChainHistory returns ordered artifacts", () => {
        const reg = buildChainedRegistry()

        const n2 = createPlanningArtifact({
            path: "planning/impl-plan-n2.md",
            type: "implementation-plan",
            chainId: "chain-impl",
            createdBy: "idumb-executor",
            iteration: 2,
        })
        n2.id = "art-n2"
        addToChain(reg, "chain-impl", n2)
        reg.artifacts.push(n2)

        const history = getChainHistory(reg, "chain-impl")
        expect(history).toHaveLength(2)
        expect(history[0].id).toBe("art-n1")
        expect(history[1].id).toBe("art-n2")
    })

    it("resolveChainHead returns undefined for nonexistent chain", () => {
        const reg = createPlanningRegistry()
        expect(resolveChainHead(reg, "nonexistent")).toBeUndefined()
    })
})

// ─── Chain-Position Staleness (NOT Time-Based) ──────────────────────

describe("Planning Registry — Chain-Position Staleness", () => {
    function buildThreeArtifactChain(): { reg: PlanningRegistry; n1: PlanningArtifact; n2: PlanningArtifact; n3: PlanningArtifact } {
        const reg = createPlanningRegistry()

        const n1 = createPlanningArtifact({
            path: "planning/impl-n1.md",
            type: "implementation-plan",
            chainId: "temp",
            createdBy: "idumb-executor",
            iteration: 1,
        })
        n1.id = "art-n1"
        n1.status = "active"

        const n2 = createPlanningArtifact({
            path: "planning/impl-n2.md",
            type: "implementation-plan",
            chainId: "temp",
            createdBy: "idumb-executor",
            iteration: 2,
        })
        n2.id = "art-n2"
        n2.status = "draft"

        const n3 = createPlanningArtifact({
            path: "planning/impl-n3.md",
            type: "implementation-plan",
            chainId: "temp",
            createdBy: "idumb-executor",
            iteration: 3,
        })
        n3.id = "art-n3"
        n3.status = "draft"

        // Create chain FIRST and push to registry BEFORE calling addToChain
        const chain = createArtifactChain({
            name: "impl-n-series",
            rootArtifactId: "art-n1",
            tier: 2,
        })
        chain.id = "chain-impl"
        reg.chains.push(chain)

        // Wire up chain IDs
        n1.chainId = chain.id
        n2.chainId = chain.id
        n3.chainId = chain.id

        // Add root first, then chain-link n2 and n3
        reg.artifacts.push(n1)
        addToChain(reg, "chain-impl", n2)
        reg.artifacts.push(n2)
        addToChain(reg, "chain-impl", n3)
        reg.artifacts.push(n3)

        return { reg, n1, n2, n3 }
    }

    it("chain head (frontier) is NEVER stale", () => {
        const { reg, n3 } = buildThreeArtifactChain()
        expect(isArtifactStaleByChainPosition(n3, reg)).toBe(false)
    })

    it("artifact is stale when its child is active", () => {
        const { reg, n1, n2 } = buildThreeArtifactChain()
        // n2 becomes active → n1 should be stale
        n2.status = "active"
        expect(isArtifactStaleByChainPosition(n1, reg)).toBe(true)
    })

    it("artifact is stale when its child is superseded (chain moved even further)", () => {
        const { reg, n1, n2, n3 } = buildThreeArtifactChain()
        n2.status = "superseded"
        n3.status = "active"
        expect(isArtifactStaleByChainPosition(n1, reg)).toBe(true)
    })

    it("already-superseded artifact is NOT stale (it's resolved)", () => {
        const { reg, n1, n2 } = buildThreeArtifactChain()
        n1.status = "superseded"
        n2.status = "active"
        expect(isArtifactStaleByChainPosition(n1, reg)).toBe(false)
    })

    it("already-abandoned artifact is NOT stale (it's resolved)", () => {
        const { reg, n1 } = buildThreeArtifactChain()
        n1.status = "abandoned"
        expect(isArtifactStaleByChainPosition(n1, reg)).toBe(false)
    })

    it("artifact with only draft children is NOT stale", () => {
        const { reg, n1 } = buildThreeArtifactChain()
        // n2 and n3 are both draft — chain hasn't moved forward yet
        expect(isArtifactStaleByChainPosition(n1, reg)).toBe(false)
    })

    it("findStaleArtifacts returns all chain-stale artifacts", () => {
        const { reg, n2, n3 } = buildThreeArtifactChain()
        // n2 becomes active, n3 becomes active
        n2.status = "active"
        n3.status = "active"
        // n1 is stale (child n2 is active), n2 is stale (child n3 is active)
        const stale = findStaleArtifacts(reg)
        expect(stale).toHaveLength(2)
        expect(stale.map(a => a.id)).toContain("art-n1")
        expect(stale.map(a => a.id)).toContain("art-n2")
    })

    it("findStaleSections returns active sections of chain-stale artifact", () => {
        const { reg, n1, n2 } = buildThreeArtifactChain()
        n1.sections = [
            createArtifactSection({ heading: "Overview", depth: 1, content: "..." }),
            createArtifactSection({ heading: "Plan", depth: 2, content: "..." }),
        ]
        n2.status = "active"

        const stale = findStaleSections(n1, reg)
        expect(stale).toHaveLength(2) // All active sections are stale
    })

    it("findStaleSections returns empty for healthy artifact", () => {
        const { reg, n3 } = buildThreeArtifactChain()
        n3.sections = [
            createArtifactSection({ heading: "Overview", depth: 1, content: "..." }),
        ]
        const stale = findStaleSections(n3, reg)
        expect(stale).toHaveLength(0)
    })

    it("isArtifactHealthy returns true for frontier artifact with active sections", () => {
        const { reg, n3 } = buildThreeArtifactChain()
        n3.sections = [
            createArtifactSection({ heading: "Plan", depth: 1, content: "content" }),
        ]
        expect(isArtifactHealthy(n3, reg)).toBe(true)
    })

    it("isArtifactHealthy returns false for chain-stale artifact", () => {
        const { reg, n1, n2 } = buildThreeArtifactChain()
        n1.sections = [
            createArtifactSection({ heading: "Plan", depth: 1, content: "content" }),
        ]
        n2.status = "active"
        expect(isArtifactHealthy(n1, reg)).toBe(false)
    })
})

// ─── Section Lifecycle ──────────────────────────────────────────────

describe("Planning Registry — Section Lifecycle", () => {
    it("supersedSection marks section and records replacement", () => {
        const section = createArtifactSection({
            heading: "Old Plan",
            depth: 1,
            content: "original content",
        })
        supersedSection(section, "new-section-id")
        expect(section.status).toBe("superseded")
        expect(section.supersededBy).toBe("new-section-id")
    })

    it("markSectionStale changes status to stale", () => {
        const section = createArtifactSection({
            heading: "Test",
            depth: 1,
            content: "content",
        })
        markSectionStale(section)
        expect(section.status).toBe("stale")
    })

    it("markSectionInvalid changes status to invalid", () => {
        const section = createArtifactSection({
            heading: "Test",
            depth: 1,
            content: "content",
        })
        markSectionInvalid(section)
        expect(section.status).toBe("invalid")
    })

    it("detectSectionDrift detects content changes", () => {
        const section = createArtifactSection({
            heading: "Plan",
            depth: 1,
            content: "original",
        })
        expect(detectSectionDrift(section, "original")).toBe(false)
        expect(detectSectionDrift(section, "modified")).toBe(true)
    })
})

// ─── Cross-Entity Linking ───────────────────────────────────────────

describe("Planning Registry — Cross-Entity Linking", () => {
    it("linkTaskToArtifact links at artifact and section level", () => {
        const artifact = createPlanningArtifact({
            path: "planning/plan.md",
            type: "implementation-plan",
            chainId: "chain-1",
            createdBy: "idumb-executor",
        })
        const section = createArtifactSection({
            heading: "Step 1",
            depth: 2,
            content: "do something",
        })
        artifact.sections.push(section)

        linkTaskToArtifact(artifact, "task-123", [section.id])
        expect(artifact.linkedTaskIds).toContain("task-123")
        expect(section.linkedTaskIds).toContain("task-123")
    })

    it("linkTaskToArtifact doesn't duplicate task IDs", () => {
        const artifact = createPlanningArtifact({
            path: "planning/plan.md",
            type: "implementation-plan",
            chainId: "chain-1",
            createdBy: "idumb-executor",
        })
        linkTaskToArtifact(artifact, "task-123")
        linkTaskToArtifact(artifact, "task-123")
        expect(artifact.linkedTaskIds.filter(id => id === "task-123")).toHaveLength(1)
    })

    it("linkDelegationToSections links specific sections", () => {
        const artifact = createPlanningArtifact({
            path: "planning/plan.md",
            type: "implementation-plan",
            chainId: "chain-1",
            createdBy: "idumb-executor",
        })
        const s1 = createArtifactSection({ heading: "A", depth: 1, content: "a" })
        const s2 = createArtifactSection({ heading: "B", depth: 1, content: "b" })
        artifact.sections.push(s1, s2)

        linkDelegationToSections(artifact, "deleg-1", [s1.id])
        expect(s1.linkedDelegationIds).toContain("deleg-1")
        expect(s2.linkedDelegationIds).not.toContain("deleg-1")
    })

    it("linkBrainEntryToArtifact links without duplicates", () => {
        const artifact = createPlanningArtifact({
            path: "planning/plan.md",
            type: "implementation-plan",
            chainId: "chain-1",
            createdBy: "idumb-executor",
        })
        linkBrainEntryToArtifact(artifact, "brain-001")
        linkBrainEntryToArtifact(artifact, "brain-001")
        expect(artifact.linkedBrainEntryIds).toEqual(["brain-001"])
    })
})

// ─── Outlier Management ─────────────────────────────────────────────

describe("Planning Registry — Outlier Management", () => {
    it("findPendingOutliers returns only pending entries", () => {
        const reg = createPlanningRegistry()
        reg.outliers.push(
            createOutlierEntry({ path: "a.md", reason: "unregistered" }),
            createOutlierEntry({ path: "b.md", reason: "no-chain" }),
        )
        // Accept one
        acceptOutlier(reg, "a.md")

        const pending = findPendingOutliers(reg)
        expect(pending).toHaveLength(1)
        expect(pending[0].path).toBe("b.md")
    })

    it("acceptOutlier changes action to accepted", () => {
        const reg = createPlanningRegistry()
        reg.outliers.push(createOutlierEntry({ path: "test.md", reason: "unregistered" }))
        const result = acceptOutlier(reg, "test.md")
        expect(result).toBe(true)
        expect(reg.outliers[0].userAction).toBe("accepted")
    })

    it("rejectOutlier changes action to rejected", () => {
        const reg = createPlanningRegistry()
        reg.outliers.push(createOutlierEntry({ path: "test.md", reason: "schema-mismatch" }))
        const result = rejectOutlier(reg, "test.md")
        expect(result).toBe(true)
        expect(reg.outliers[0].userAction).toBe("rejected")
    })

    it("accept/reject returns false for nonexistent path", () => {
        const reg = createPlanningRegistry()
        expect(acceptOutlier(reg, "nope.md")).toBe(false)
        expect(rejectOutlier(reg, "nope.md")).toBe(false)
    })
})

// ─── Registry Lookup ────────────────────────────────────────────────

describe("Planning Registry — Registry Lookup", () => {
    it("findArtifactByPath finds by relative path", () => {
        const reg = createPlanningRegistry()
        const artifact = createPlanningArtifact({
            path: "planning/impl-plan-n1.md",
            type: "implementation-plan",
            chainId: "chain-1",
            createdBy: "idumb-executor",
        })
        reg.artifacts.push(artifact)
        expect(findArtifactByPath(reg, "planning/impl-plan-n1.md")).toBe(artifact)
        expect(findArtifactByPath(reg, "nonexistent.md")).toBeUndefined()
    })

    it("findArtifactsByType excludes abandoned", () => {
        const reg = createPlanningRegistry()
        const a1 = createPlanningArtifact({
            path: "p1.md", type: "walkthrough", chainId: "c1", createdBy: "test",
        })
        const a2 = createPlanningArtifact({
            path: "p2.md", type: "walkthrough", chainId: "c2", createdBy: "test",
        })
        a2.status = "abandoned"
        reg.artifacts.push(a1, a2)

        const results = findArtifactsByType(reg, "walkthrough")
        expect(results).toHaveLength(1)
        expect(results[0].path).toBe("p1.md")
    })

    it("findArtifactsByChain returns all in chain", () => {
        const reg = createPlanningRegistry()
        const a1 = createPlanningArtifact({
            path: "p1.md", type: "implementation-plan", chainId: "chain-x", createdBy: "test",
        })
        const a2 = createPlanningArtifact({
            path: "p2.md", type: "implementation-plan", chainId: "chain-x", createdBy: "test",
        })
        const a3 = createPlanningArtifact({
            path: "p3.md", type: "walkthrough", chainId: "chain-y", createdBy: "test",
        })
        reg.artifacts.push(a1, a2, a3)

        expect(findArtifactsByChain(reg, "chain-x")).toHaveLength(2)
        expect(findArtifactsByChain(reg, "chain-y")).toHaveLength(1)
    })
})

// ─── Iteration Pattern Detection ────────────────────────────────────

describe("Planning Registry — Iteration Pattern Detection", () => {
    it("extracts iteration from -n1 pattern", () => {
        const result = extractIterationPattern("implementation_plan-n1.md")
        expect(result).toEqual({ prefix: "implementation_plan-n", iteration: 1 })
    })

    it("extracts iteration from -fe1 pattern", () => {
        const result = extractIterationPattern("walkthrough-fe1.md")
        expect(result).toEqual({ prefix: "walkthrough-fe", iteration: 1 })
    })

    it("extracts iteration from -n5 pattern", () => {
        const result = extractIterationPattern("implementation_plan-n5.md")
        expect(result).toEqual({ prefix: "implementation_plan-n", iteration: 5 })
    })

    it("returns null for non-iteration filenames", () => {
        expect(extractIterationPattern("README.md")).toBeNull()
        expect(extractIterationPattern("plain-file.md")).toBeNull()
    })
})

// ─── Artifact Type Detection ────────────────────────────────────────

describe("Planning Registry — Artifact Type Detection", () => {
    it("detects implementation plans", () => {
        expect(detectArtifactType("planning/implementation_plan-n1.md")).toBe("implementation-plan")
        expect(detectArtifactType("implementation-plan.md")).toBe("implementation-plan")
    })

    it("detects walkthroughs", () => {
        expect(detectArtifactType("planning/walkthrough-fe1.md")).toBe("walkthrough")
    })

    it("detects gap analyses", () => {
        expect(detectArtifactType("intelligence-gap-analysis.md")).toBe("gap-analysis")
    })

    it("detects governance docs", () => {
        expect(detectArtifactType("governance/governance-doc.md")).toBe("governance-doc")
    })

    it("returns null for unknown types", () => {
        expect(detectArtifactType("random-file.md")).toBeNull()
    })
})

// ─── Formatting ─────────────────────────────────────────────────────

describe("Planning Registry — Formatting", () => {
    it("formatRegistrySummary includes chains and outliers", () => {
        const reg = createPlanningRegistry()
        const art = createPlanningArtifact({
            path: "plan.md", type: "implementation-plan",
            chainId: "chain-1", createdBy: "test",
        })
        art.id = "art-1"
        art.status = "active"
        reg.artifacts.push(art)

        const chain = createArtifactChain({
            name: "test-chain", rootArtifactId: "art-1", tier: 2,
        })
        chain.id = "chain-1"
        reg.chains.push(chain)

        reg.outliers.push(createOutlierEntry({
            path: "mystery.md", reason: "unregistered",
        }))

        const summary = formatRegistrySummary(reg)
        expect(summary).toContain("=== Planning Registry ===")
        expect(summary).toContain("test-chain")
        expect(summary).toContain("PENDING OUTLIERS")
        expect(summary).toContain("mystery.md")
    })

    it("formatArtifactDetail shows chain position and sections", () => {
        const reg = createPlanningRegistry()
        const art = createPlanningArtifact({
            path: "plan-n2.md", type: "implementation-plan",
            chainId: "chain-1", createdBy: "idumb-executor",
        })
        art.id = "art-2"
        art.chainParentId = "art-1"
        art.sections = [
            createArtifactSection({ heading: "Overview", depth: 1, content: "text" }),
        ]
        reg.artifacts.push(art)

        const parentArt = createPlanningArtifact({
            path: "plan-n1.md", type: "implementation-plan",
            chainId: "chain-1", createdBy: "idumb-executor",
        })
        parentArt.id = "art-1"
        reg.artifacts.push(parentArt)

        const chain = createArtifactChain({
            name: "impl-series", rootArtifactId: "art-1", tier: 2,
        })
        chain.id = "chain-1"
        chain.artifactIds = ["art-1", "art-2"]
        reg.chains.push(chain)

        const detail = formatArtifactDetail(art, reg)
        expect(detail).toContain("plan-n2.md")
        expect(detail).toContain("impl-series [2/2]")
        expect(detail).toContain("Supersedes: plan-n1.md")
        expect(detail).toContain("Overview")
    })
})

process.stderr.write(`\nResults: ${passed}/${passed + failed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
