/**
 * Planning Registry schema — governed lifecycle for planning artifacts.
 *
 * Part of Group 4: Planning / Artifact Governance
 * Entities persist to `.idumb/brain/planning-registry.json`
 *
 * Key properties:
 * - Hierarchical: artifacts belong to chains (n1→n2→n3), sections within artifacts
 * - Relational: sections link to tasks, delegations, brain entries
 * - Temporal: sections have staleness, supersession tracking, drift detection
 * - Tiered: T1 governance SOT, T2 planning chains, T3 evidence/walkthroughs
 * - Gated: unregistered files = outliers that init must escalate to user
 *
 * Consumers: govern_plan (registration), idumb_init (outlier detection),
 *            dashboard (chain visualization), chain-validator (integrity)
 */

import { createHash } from "crypto"

// ─── Document Tiers ─────────────────────────────────────────────────

/**
 * Tiers define what CAN exist in .idumb/ and at what governance level.
 * 
 * T1: Governance SOT — few, tightly controlled, rarely change.
 *     (PROJECT.md, SUCCESS-CRITERIA.md, GOVERNANCE.md)
 * T2: Planning — versioned chains, linked to tasks, drive execution.
 *     (implementation plans, gap analyses, specs)
 * T3: Evidence — append-mostly, prove work was done.
 *     (walkthroughs, research notes, execution logs, phase completion)
 *
 * Note on staleness: Time-based TTLs are meaningless in AI-paced development
 * where stories complete in ~1hr and epics in a few hours. Staleness is
 * determined by CHAIN POSITION — if your preceding and following chain
 * neighbors are validated/superseded, YOU are stale. Every action/execution
 * updates timestamps, so the real signal is chain integrity, not the clock.
 */
export type DocumentTier = 1 | 2 | 3

// ─── Artifact Types ─────────────────────────────────────────────────

export type ArtifactType =
    | "implementation-plan"
    | "walkthrough"
    | "gap-analysis"
    | "research"
    | "spec"
    | "governance-doc"
    | "phase-completion"
    | "success-criteria"

/** Map artifact types to their default tier */
const ARTIFACT_TIER_MAP: Record<ArtifactType, DocumentTier> = {
    "governance-doc": 1,
    "success-criteria": 1,
    "implementation-plan": 2,
    "gap-analysis": 2,
    "spec": 2,
    "research": 3,
    "walkthrough": 3,
    "phase-completion": 3,
}

// ─── Section-Level Lifecycle ────────────────────────────────────────

export type SectionStatus = "active" | "stale" | "superseded" | "invalid"

export interface ArtifactSection {
    id: string
    heading: string
    depth: number                        // H1=1, H2=2, H3=3 etc.
    status: SectionStatus
    supersededBy?: string                // section ID in replacement artifact
    linkedTaskIds: string[]              // task IDs this section addresses
    linkedDelegationIds: string[]        // delegations that produced this section
    contentHash: string                  // SHA-256 of section content for drift detection
    modifiedAt: number
    // NO staleAfter — staleness is chain-position-based, not time-based.
    // A section is stale when its chain neighbors are validated/superseded.
}

// ─── Planning Artifact ──────────────────────────────────────────────

export type ArtifactStatus = "draft" | "active" | "superseded" | "abandoned"

export interface PlanningArtifact {
    id: string
    path: string                         // Relative to project root
    tier: DocumentTier
    type: ArtifactType
    iteration?: number                   // n1=1, n2=2, fe1 has its own chain
    chainId: string                      // Groups n1→n2→n3 into one chain
    chainParentId?: string               // Previous iteration's artifact ID
    chainChildIds: string[]              // Next iterations
    sections: ArtifactSection[]          // Parsed heading structure
    status: ArtifactStatus
    createdBy: string                    // Agent name that wrote it
    createdAt: number
    modifiedAt: number
    sessionId?: string                   // OpenCode session that created it
    linkedTaskIds: string[]              // Tasks this artifact serves
    linkedBrainEntryIds: string[]        // Brain entries referenced
}

// ─── Artifact Chain ─────────────────────────────────────────────────

export interface ArtifactChain {
    id: string
    name: string                         // "impl-plan-n-series", "walkthrough-fe-series"
    rootArtifactId: string               // First artifact in chain
    activeArtifactId: string             // Current head (latest non-superseded)
    artifactIds: string[]                // Ordered: [oldest, ..., newest]
    tier: DocumentTier
}

// ─── Outlier — Unregistered Files ───────────────────────────────────

export type OutlierReason = "unregistered" | "no-chain" | "schema-mismatch" | "outside-hierarchy"
export type OutlierAction = "accepted" | "rejected" | "pending"

export interface OutlierEntry {
    path: string                         // Relative to project root
    detectedAt: number
    reason: OutlierReason
    userAction: OutlierAction
    detectedBy?: string                  // Agent or tool that found it
    note?: string                        // Why this was flagged
}

// ─── Planning Registry (Root Store) ─────────────────────────────────

export const PLANNING_REGISTRY_VERSION = "1.0.0"

// No TTL constants — staleness is chain-position-based, not time-based.

export interface PlanningRegistry {
    version: string
    artifacts: PlanningArtifact[]
    chains: ArtifactChain[]
    outliers: OutlierEntry[]
    lastScanAt: number
}

// ─── Chain-Position Staleness ∙ NOT Time-Based ──────────────────────
//
// Why no TTL? AI-driven development is too fast for clock-based staleness.
// A story completes in ~1 hour, an epic in a few hours. Every agent
// action stamps a timestamp, making time meaningless as a staleness signal.
//
// Instead: an artifact/section becomes stale when its chain neighbors
// (the validated artifact BEFORE it and the one AFTER it) have both moved
// forward. Chain position is the real governance signal.

// ─── Factory Functions ──────────────────────────────────────────────

export function createPlanningRegistry(): PlanningRegistry {
    return {
        version: PLANNING_REGISTRY_VERSION,
        artifacts: [],
        chains: [],
        outliers: [],
        lastScanAt: 0,
    }
}

export function createPlanningArtifact(opts: {
    path: string
    type: ArtifactType
    chainId: string
    createdBy: string
    iteration?: number
    chainParentId?: string
    sessionId?: string
    linkedTaskIds?: string[]
    linkedBrainEntryIds?: string[]
}): PlanningArtifact {
    const now = Date.now()
    const tier = ARTIFACT_TIER_MAP[opts.type]
    return {
        id: `artifact-${now}-${Math.random().toString(36).slice(2, 8)}`,
        path: opts.path,
        tier,
        type: opts.type,
        iteration: opts.iteration,
        chainId: opts.chainId,
        chainParentId: opts.chainParentId,
        chainChildIds: [],
        sections: [],
        status: "draft",
        createdBy: opts.createdBy,
        createdAt: now,
        modifiedAt: now,
        sessionId: opts.sessionId,
        linkedTaskIds: opts.linkedTaskIds ?? [],
        linkedBrainEntryIds: opts.linkedBrainEntryIds ?? [],
    }
}

export function createArtifactSection(opts: {
    heading: string
    depth: number
    content: string
    linkedTaskIds?: string[]
    linkedDelegationIds?: string[]
}): ArtifactSection {
    const now = Date.now()
    return {
        id: `section-${now}-${Math.random().toString(36).slice(2, 8)}`,
        heading: opts.heading,
        depth: opts.depth,
        status: "active",
        linkedTaskIds: opts.linkedTaskIds ?? [],
        linkedDelegationIds: opts.linkedDelegationIds ?? [],
        contentHash: computeContentHash(opts.content),
        modifiedAt: now,
    }
}

export function createArtifactChain(opts: {
    name: string
    rootArtifactId: string
    tier: DocumentTier
}): ArtifactChain {
    return {
        id: `chain-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: opts.name,
        rootArtifactId: opts.rootArtifactId,
        activeArtifactId: opts.rootArtifactId,
        artifactIds: [opts.rootArtifactId],
        tier: opts.tier,
    }
}

export function createOutlierEntry(opts: {
    path: string
    reason: OutlierReason
    detectedBy?: string
    note?: string
}): OutlierEntry {
    return {
        path: opts.path,
        detectedAt: Date.now(),
        reason: opts.reason,
        userAction: "pending",
        detectedBy: opts.detectedBy,
        note: opts.note,
    }
}

// ─── Content Hashing ────────────────────────────────────────────────

/** SHA-256 hash of content for drift detection */
export function computeContentHash(content: string): string {
    return createHash("sha256").update(content).digest("hex").slice(0, 16)
}

// ─── Markdown Section Parser ────────────────────────────────────────

/**
 * Parse a markdown file into sections by heading structure.
 * Returns an array of { heading, depth, content } tuples.
 *
 * This is the bridge between raw markdown and our governed section model.
 * Every heading becomes a trackable section with its own lifecycle.
 */
export function parseMarkdownSections(
    markdown: string,
): Array<{ heading: string; depth: number; content: string }> {
    const lines = markdown.split("\n")
    const sections: Array<{ heading: string; depth: number; content: string }> = []
    let currentHeading: string | null = null
    let currentDepth = 0
    let contentLines: string[] = []

    for (const line of lines) {
        const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
        if (headingMatch) {
            // Flush previous section
            if (currentHeading !== null) {
                sections.push({
                    heading: currentHeading,
                    depth: currentDepth,
                    content: contentLines.join("\n").trim(),
                })
            }
            currentDepth = headingMatch[1].length
            currentHeading = headingMatch[2].trim()
            contentLines = []
        } else {
            contentLines.push(line)
        }
    }

    // Flush final section
    if (currentHeading !== null) {
        sections.push({
            heading: currentHeading,
            depth: currentDepth,
            content: contentLines.join("\n").trim(),
        })
    }

    return sections
}

/**
 * Parse markdown content into ArtifactSection[] with proper IDs and hashes.
 */
export function parseSectionsFromMarkdown(
    markdown: string,
): ArtifactSection[] {
    const parsed = parseMarkdownSections(markdown)
    return parsed.map(s => createArtifactSection({
        heading: s.heading,
        depth: s.depth,
        content: s.content,
    }))
}

// ─── Chain Management ───────────────────────────────────────────────

/** Find the active head of a chain (latest non-superseded artifact) */
export function resolveChainHead(
    registry: PlanningRegistry,
    chainId: string,
): PlanningArtifact | undefined {
    const chain = registry.chains.find(c => c.id === chainId)
    if (!chain) return undefined
    return registry.artifacts.find(a => a.id === chain.activeArtifactId)
}

/** Get full ordered chain history */
export function getChainHistory(
    registry: PlanningRegistry,
    chainId: string,
): PlanningArtifact[] {
    const chain = registry.chains.find(c => c.id === chainId)
    if (!chain) return []
    return chain.artifactIds
        .map(id => registry.artifacts.find(a => a.id === id))
        .filter((a): a is PlanningArtifact => a !== undefined)
}

/** Add an artifact to an existing chain, linking it to the previous head */
export function addToChain(
    registry: PlanningRegistry,
    chainId: string,
    artifact: PlanningArtifact,
): void {
    const chain = registry.chains.find(c => c.id === chainId)
    if (!chain) return

    // Link new artifact to previous head
    const previousHead = registry.artifacts.find(a => a.id === chain.activeArtifactId)
    if (previousHead) {
        artifact.chainParentId = previousHead.id
        previousHead.chainChildIds.push(artifact.id)
    }

    // Update chain
    chain.artifactIds.push(artifact.id)
    chain.activeArtifactId = artifact.id
}

// ─── Chain-Position Staleness ────────────────────────────────────────
//
// An artifact is stale when BOTH its chain neighbors have moved past it:
//   - The preceding artifact in the chain is validated/superseded
//   - The following artifact in the chain is validated/superseded
// This means the artifact is sandwiched between completed work and is
// no longer the active frontier. Single-artifact chains are never stale
// by position — they need explicit supersession.

/**
 * Determine if an artifact is stale by its chain position.
 *
 * Rules:
 * 1. If artifact has status superseded/abandoned → it's already resolved, not "stale"
 * 2. If artifact is the chain head (no children) → NOT stale (it's the frontier)
 * 3. If artifact has a child AND that child is active/superseded → this one is stale
 *    (the chain has moved forward past this artifact)
 * 4. Draft artifacts with validated children → stale (never activated but chain moved on)
 */
export function isArtifactStaleByChainPosition(
    artifact: PlanningArtifact,
    registry: PlanningRegistry,
): boolean {
    // Already resolved — not "stale", it's done
    if (artifact.status === "superseded" || artifact.status === "abandoned") {
        return false
    }

    // No children → this is the chain head / frontier → not stale
    if (artifact.chainChildIds.length === 0) {
        return false
    }

    // Has children — check if any child has moved forward (active or superseded)
    // If a child exists and is active, this artifact should have been superseded
    for (const childId of artifact.chainChildIds) {
        const child = findArtifactById(registry, childId)
        if (child && (child.status === "active" || child.status === "superseded")) {
            return true  // Chain has moved past this artifact
        }
    }

    return false
}

/**
 * Find all artifacts in the registry that are stale by chain position.
 * These are artifacts the chain has moved past but weren't properly superseded.
 */
export function findStaleArtifacts(registry: PlanningRegistry): PlanningArtifact[] {
    return registry.artifacts.filter(a => isArtifactStaleByChainPosition(a, registry))
}

/**
 * Find sections that are stale because their parent artifact has a
 * superseding child. Sections in the child artifact with matching headings
 * are the replacements.
 */
export function findStaleSections(
    artifact: PlanningArtifact,
    registry: PlanningRegistry,
): ArtifactSection[] {
    if (!isArtifactStaleByChainPosition(artifact, registry)) {
        return []
    }
    // All active sections in a chain-stale artifact are stale
    return artifact.sections.filter(s => s.status === "active")
}

/**
 * Check if an artifact is healthy: not stale by chain position
 * and all sections are active.
 */
export function isArtifactHealthy(
    artifact: PlanningArtifact,
    registry: PlanningRegistry,
): boolean {
    if (isArtifactStaleByChainPosition(artifact, registry)) return false
    return artifact.sections.every(s => s.status === "active")
}

// ─── Section Lifecycle ──────────────────────────────────────────────

/** Mark a section as superseded by another section */
export function supersedSection(
    section: ArtifactSection,
    replacementSectionId: string,
): void {
    section.status = "superseded"
    section.supersededBy = replacementSectionId
    section.modifiedAt = Date.now()
}

/** Mark a section as stale */
export function markSectionStale(section: ArtifactSection): void {
    section.status = "stale"
    section.modifiedAt = Date.now()
}

/** Mark a section as invalid (schema mismatch, broken data) */
export function markSectionInvalid(section: ArtifactSection): void {
    section.status = "invalid"
    section.modifiedAt = Date.now()
}

/** Detect drift: has the content changed since last hash? */
export function detectSectionDrift(
    section: ArtifactSection,
    currentContent: string,
): boolean {
    return computeContentHash(currentContent) !== section.contentHash
}

// ─── Cross-Entity Linking ───────────────────────────────────────────

/** Link a task to an artifact's sections */
export function linkTaskToArtifact(
    artifact: PlanningArtifact,
    taskId: string,
    sectionIds?: string[],
): void {
    if (!artifact.linkedTaskIds.includes(taskId)) {
        artifact.linkedTaskIds.push(taskId)
    }
    if (sectionIds) {
        for (const section of artifact.sections) {
            if (sectionIds.includes(section.id) && !section.linkedTaskIds.includes(taskId)) {
                section.linkedTaskIds.push(taskId)
            }
        }
    }
    artifact.modifiedAt = Date.now()
}

/** Link a delegation to specific sections */
export function linkDelegationToSections(
    artifact: PlanningArtifact,
    delegationId: string,
    sectionIds: string[],
): void {
    for (const section of artifact.sections) {
        if (sectionIds.includes(section.id) && !section.linkedDelegationIds.includes(delegationId)) {
            section.linkedDelegationIds.push(delegationId)
        }
    }
    artifact.modifiedAt = Date.now()
}

/** Link a brain entry to an artifact */
export function linkBrainEntryToArtifact(
    artifact: PlanningArtifact,
    brainEntryId: string,
): void {
    if (!artifact.linkedBrainEntryIds.includes(brainEntryId)) {
        artifact.linkedBrainEntryIds.push(brainEntryId)
    }
    artifact.modifiedAt = Date.now()
}

// ─── Outlier Management ─────────────────────────────────────────────

/** Find all pending outliers (user hasn't decided yet) */
export function findPendingOutliers(registry: PlanningRegistry): OutlierEntry[] {
    return registry.outliers.filter(o => o.userAction === "pending")
}

/** Accept an outlier — it can now be registered as a proper artifact */
export function acceptOutlier(registry: PlanningRegistry, path: string): boolean {
    const outlier = registry.outliers.find(o => o.path === path)
    if (!outlier) return false
    outlier.userAction = "accepted"
    return true
}

/** Reject an outlier — it stays flagged, excluded from governance */
export function rejectOutlier(registry: PlanningRegistry, path: string): boolean {
    const outlier = registry.outliers.find(o => o.path === path)
    if (!outlier) return false
    outlier.userAction = "rejected"
    return true
}

// ─── Registry Lookup ────────────────────────────────────────────────

/** Find an artifact by path */
export function findArtifactByPath(
    registry: PlanningRegistry,
    path: string,
): PlanningArtifact | undefined {
    return registry.artifacts.find(a => a.path === path)
}

/** Find an artifact by ID */
export function findArtifactById(
    registry: PlanningRegistry,
    id: string,
): PlanningArtifact | undefined {
    return registry.artifacts.find(a => a.id === id)
}

/** Find all active artifacts of a given type */
export function findArtifactsByType(
    registry: PlanningRegistry,
    type: ArtifactType,
): PlanningArtifact[] {
    return registry.artifacts.filter(a => a.type === type && a.status !== "abandoned")
}

/** Find all artifacts in a chain */
export function findArtifactsByChain(
    registry: PlanningRegistry,
    chainId: string,
): PlanningArtifact[] {
    return registry.artifacts.filter(a => a.chainId === chainId)
}

// ─── Iteration Pattern Detection ────────────────────────────────────

/**
 * Extract iteration number from a filename pattern.
 * 
 * Patterns recognized:
 *   implementation_plan-n1.md → { prefix: "implementation_plan-n", iteration: 1 }
 *   walkthrough-fe1.md → { prefix: "walkthrough-fe", iteration: 1 }
 *   gap-analysis-n3.md → { prefix: "gap-analysis-n", iteration: 3 }
 */
export function extractIterationPattern(
    filename: string,
): { prefix: string; iteration: number } | null {
    // Match: anyprefix-<letter(s)><number>.ext
    const match = filename.match(/^(.+?-)([a-zA-Z]+)(\d+)(\.[^.]+)?$/)
    if (!match) return null
    return {
        prefix: match[1] + match[2],
        iteration: parseInt(match[3], 10),
    }
}

/**
 * Detect artifact type from file path.
 * Falls back to null if path doesn't match known patterns.
 */
export function detectArtifactType(path: string): ArtifactType | null {
    const lower = path.toLowerCase()
    if (lower.includes("implementation_plan") || lower.includes("implementation-plan")) {
        return "implementation-plan"
    }
    if (lower.includes("walkthrough")) return "walkthrough"
    if (lower.includes("gap-analysis") || lower.includes("intelligence-gap")) {
        return "gap-analysis"
    }
    if (lower.includes("research")) return "research"
    if (lower.includes("spec") || lower.includes("specification")) return "spec"
    if (lower.includes("governance") || lower.includes("project.md")) return "governance-doc"
    if (lower.includes("phase-completion") || lower.includes("phase_completion")) {
        return "phase-completion"
    }
    if (lower.includes("success-criteria") || lower.includes("success_criteria")) {
        return "success-criteria"
    }
    return null
}

// ─── Formatting ─────────────────────────────────────────────────────

/** Format registry summary for agent-readable output */
export function formatRegistrySummary(registry: PlanningRegistry): string {
    const lines: string[] = []
    lines.push("=== Planning Registry ===")
    lines.push(`Version: ${registry.version}`)
    lines.push(`Artifacts: ${registry.artifacts.length}`)
    lines.push(`Chains: ${registry.chains.length}`)
    lines.push(`Outliers: ${registry.outliers.length} (${findPendingOutliers(registry).length} pending)`)
    lines.push("")

    // Chains summary
    if (registry.chains.length > 0) {
        lines.push("CHAINS:")
        for (const chain of registry.chains) {
            const head = registry.artifacts.find(a => a.id === chain.activeArtifactId)
            const headLabel = head ? `→ ${head.path}` : "(no head)"
            lines.push(`  [T${chain.tier}] ${chain.name}: ${chain.artifactIds.length} artifacts ${headLabel}`)
        }
        lines.push("")
    }

    // Active artifacts
    const active = registry.artifacts.filter(a => a.status === "active")
    if (active.length > 0) {
        lines.push("ACTIVE ARTIFACTS:")
        for (const a of active) {
            const staleSections = findStaleSections(a, registry)
            const staleTag = staleSections.length > 0
                ? ` [${staleSections.length} chain-stale sections]`
                : ""
            lines.push(`  [T${a.tier}/${a.type}] ${a.path}${staleTag}`)
            lines.push(`    Sections: ${a.sections.length}, Tasks: ${a.linkedTaskIds.length}`)
        }
        lines.push("")
    }

    // Pending outliers
    const pending = findPendingOutliers(registry)
    if (pending.length > 0) {
        lines.push("⚠ PENDING OUTLIERS:")
        for (const o of pending) {
            lines.push(`  ${o.path} — ${o.reason}${o.note ? ` (${o.note})` : ""}`)
        }
        lines.push("")
    }

    return lines.join("\n")
}

/** Format a single artifact for detailed view */
export function formatArtifactDetail(
    artifact: PlanningArtifact,
    registry: PlanningRegistry,
): string {
    const lines: string[] = []
    lines.push(`=== ${artifact.path} ===`)
    lines.push(`ID: ${artifact.id}`)
    lines.push(`Type: ${artifact.type} | Tier: T${artifact.tier} | Status: ${artifact.status}`)
    lines.push(`Created: ${new Date(artifact.createdAt).toISOString()} by ${artifact.createdBy}`)

    // Chain info
    const chain = registry.chains.find(c => c.id === artifact.chainId)
    if (chain) {
        const idx = chain.artifactIds.indexOf(artifact.id)
        lines.push(`Chain: ${chain.name} [${idx + 1}/${chain.artifactIds.length}]`)
        if (artifact.chainParentId) {
            const parent = findArtifactById(registry, artifact.chainParentId)
            lines.push(`  ← Supersedes: ${parent?.path ?? artifact.chainParentId}`)
        }
        if (artifact.chainChildIds.length > 0) {
            lines.push(`  → Superseded by: ${artifact.chainChildIds.length} artifact(s)`)
        }
    }

    // Sections
    const artifactIsStale = isArtifactStaleByChainPosition(artifact, registry)
    if (artifact.sections.length > 0) {
        lines.push("")
        lines.push("SECTIONS:")
        for (const s of artifact.sections) {
            const indent = "  ".repeat(s.depth)
            const staleTag = artifactIsStale && s.status === "active" ? " ⏰CHAIN-STALE" : ""
            const statusTag = s.status !== "active" ? ` [${s.status.toUpperCase()}]` : ""
            lines.push(`  ${indent}${"#".repeat(s.depth)} ${s.heading}${statusTag}${staleTag}`)
            if (s.linkedTaskIds.length > 0) {
                lines.push(`  ${indent}  Tasks: ${s.linkedTaskIds.join(", ")}`)
            }
        }
    }

    // Cross-entity links
    if (artifact.linkedTaskIds.length > 0) {
        lines.push(`\nLinked Tasks: ${artifact.linkedTaskIds.join(", ")}`)
    }
    if (artifact.linkedBrainEntryIds.length > 0) {
        lines.push(`Linked Brain Entries: ${artifact.linkedBrainEntryIds.join(", ")}`)
    }

    return lines.join("\n")
}
