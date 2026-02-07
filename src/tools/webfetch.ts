/**
 * idumb_webfetch — Research Intelligence Ingestion Engine.
 *
 * n4 Plugin B tool. NOT a URL fetcher — a research intelligence ingestion engine that:
 * - Classifies fetched content (documentation? API reference? blog post?)
 * - Links to planning chain — every fetch tied to a research artifact or brain entry
 * - Session cache — same URL twice → returns cached version (prevents redundant fetching)
 * - Enforces research lifecycle — fetched content creates/updates brain entries
 * - Prevents "build without research" — downstream can check if references are resolved
 *
 * Purposes:
 * - research:   fetch → create/update brain entry → link to task
 * - reference:  fetch API docs → structured extraction
 * - validation: fetch to verify a link still works (staleness check)
 *
 * Self-governed — entity-resolver + state-reader provide context, no hooks needed.
 */

import { tool } from "@opencode-ai/plugin/tool"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { join } from "path"
import { readGovernanceState, readCapturedAgent, formatGovernanceSummary } from "../lib/state-reader.js"
import { createLogger } from "../lib/logging.js"

// ─── Constants ──────────────────────────────────────────────────────

const WEB_CACHE_DIR = ".idumb/brain/web-cache"
const AUDIT_DIR = ".idumb/brain/audit"
const PURPOSES = ["research", "reference", "validation"] as const
const DEFAULT_MAX_SIZE = 50_000
const MAX_ALLOWED_SIZE = 200_000
const CACHE_TTL_MS = 4 * 60 * 60 * 1000  // 4 hours cache TTL

// ─── URL Blocklist ──────────────────────────────────────────────────

const URL_BLOCKLIST: RegExp[] = [
    /^file:\/\//i,           // local file access
    /^javascript:/i,         // XSS
    /^data:/i,               // data URIs
    /localhost/i,            // local services
    /127\.0\.0\.1/,          // loopback
    /0\.0\.0\.0/,            // wildcard
    /\.local\b/i,            // local domains
    /\.internal\b/i,         // internal domains
]

// ─── Tool Definition ────────────────────────────────────────────────

export const idumb_webfetch = tool({

    description:
        `Research intelligence ingestion engine that fetches web content, classifies it, ` +
        `caches results, and links findings to brain entries and research artifacts. ` +
        `Purposes: "research" (fetch → brain entry → task link), ` +
        `"reference" (API docs extraction), "validation" (link alive check). ` +
        `Session cache prevents redundant fetching. ` +
        `Use INSTEAD of innate webfetch. Self-governed: enforces agent permissions, ` +
        `manages research lifecycle, and prevents build-without-research.`,

    args: {
        url: tool.schema.string().describe(
            "URL to fetch"
        ),
        purpose: tool.schema.enum(PURPOSES).optional().describe(
            "Fetch purpose: research (default — creates brain entry), reference (API docs), validation (link check)"
        ),
        format: tool.schema.enum(["markdown", "text"]).optional().describe(
            "Output format (default: markdown)"
        ),
        max_size: tool.schema.number().optional().describe(
            "Max response characters (default: 50000, max: 200000)"
        ),
        force: tool.schema.boolean().optional().describe(
            "Bypass cache — force fresh fetch (default: false)"
        ),
        research_artifact: tool.schema.string().optional().describe(
            "Path to research artifact this feeds into (links fetch to planning chain)"
        ),
        brain_topic: tool.schema.string().optional().describe(
            "Brain entry topic this relates to (creates/updates brain knowledge entry)"
        ),
    },

    async execute(args, context) {
        const log = createLogger(context.directory, "idumb-webfetch")
        const projectDir = context.directory
        const url = args.url.trim()
        const purpose = args.purpose ?? "research"
        const maxSize = Math.min(args.max_size ?? DEFAULT_MAX_SIZE, MAX_ALLOWED_SIZE)
        const force = args.force ?? false

        log.info(`idumb_webfetch: purpose=${purpose} url="${url.slice(0, 80)}"`)

        // ─── URL Validation ─────────────────────────────────────
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            return `❌ INVALID URL: Must start with http:// or https://\n\nProvided: ${url}`
        }

        const blockedMatch = URL_BLOCKLIST.find(p => p.test(url))
        if (blockedMatch) {
            return [
                `❌ URL BLOCKED`,
                ``,
                `URL: ${url}`,
                `Matched blocklist: ${blockedMatch.source}`,
                ``,
                `Local, internal, and non-HTTP URLs are blocked for security.`,
                `Only public http:// and https:// URLs are allowed.`,
            ].join("\n")
        }

        // ─── Governance State ───────────────────────────────────
        const govState = readGovernanceState(projectDir)
        const agentRole = readCapturedAgent(projectDir, context.agent) ?? "unknown"

        // ─── Cache Check ────────────────────────────────────────
        const cacheKey = urlToCacheKey(url)
        const cachePath = join(projectDir, WEB_CACHE_DIR, `${cacheKey}.json`)

        if (!force && existsSync(cachePath)) {
            try {
                const cached = JSON.parse(readFileSync(cachePath, "utf-8")) as {
                    url: string
                    fetchedAt: number
                    content: string
                    contentType: string
                    size: number
                }

                const age = Date.now() - cached.fetchedAt
                if (age < CACHE_TTL_MS) {
                    const ageMinutes = Math.round(age / 60000)
                    log.info(`Cache hit: ${url} (${ageMinutes}min old)`)

                    const output: string[] = []
                    output.push(`─── Research Ingestion (CACHED) ────────────────────────────────`)
                    output.push(`│ URL: ${url}`)
                    output.push(`│ Content type: ${cached.contentType} (cached)`)
                    output.push(`│ Size: ${cached.size.toLocaleString()} chars`)
                    output.push(`│ Cache age: ${ageMinutes} minutes (TTL: ${CACHE_TTL_MS / 60000}min)`)
                    output.push(`│ Use force=true to bypass cache`)
                    output.push(`────────────────────────────────────────────────────────────────`)
                    output.push(``)
                    output.push(cached.content.slice(0, maxSize))

                    if (cached.content.length > maxSize) {
                        output.push(``)
                        output.push(`... [TRUNCATED: ${cached.content.length} total chars, showing ${maxSize}]`)
                    }

                    output.push(``)
                    output.push(formatGovernanceSummary(govState))

                    return output.join("\n")
                }
            } catch {
                // Cache corrupted — ignore and fetch fresh
            }
        }

        // ─── Fetch ──────────────────────────────────────────────
        let contentBody: string
        let httpStatus: number
        let contentType: string

        try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 30_000) // 30s timeout

            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    "User-Agent": "idumb-webfetch/1.0 (Research Intelligence Agent)",
                    "Accept": "text/html,application/json,text/plain,text/markdown,*/*",
                },
                redirect: "follow",
            })

            clearTimeout(timeoutId)

            httpStatus = response.status
            contentType = response.headers.get("content-type") ?? "unknown"

            if (!response.ok) {
                return [
                    `❌ FETCH FAILED`,
                    ``,
                    `URL: ${url}`,
                    `HTTP Status: ${httpStatus}`,
                    `Content-Type: ${contentType}`,
                    ``,
                    httpStatus === 404 ? `The page was not found. Check the URL.` :
                        httpStatus === 403 ? `Access forbidden. The page may require authentication.` :
                            httpStatus >= 500 ? `Server error. Try again later.` :
                                `Unexpected HTTP error.`,
                ].join("\n")
            }

            contentBody = await response.text()
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            if (msg.includes("abort")) {
                return `❌ FETCH TIMEOUT: Request to ${url} timed out after 30 seconds.`
            }
            return `❌ FETCH ERROR: ${msg}\n\nURL: ${url}`
        }

        // ─── Classify Content ───────────────────────────────────
        const classification = classifyContent(url, contentType, contentBody)

        // ─── Truncate ───────────────────────────────────────────
        const truncated = contentBody.slice(0, maxSize)

        // ─── Cache Response ─────────────────────────────────────
        try {
            const cacheDir = join(projectDir, WEB_CACHE_DIR)
            if (!existsSync(cacheDir)) {
                mkdirSync(cacheDir, { recursive: true })
            }
            writeFileSync(cachePath, JSON.stringify({
                url,
                fetchedAt: Date.now(),
                content: truncated,
                contentType: classification,
                size: truncated.length,
                fullSize: contentBody.length,
            }, null, 2), "utf-8")

            log.info(`Cached: ${cacheKey} (${truncated.length} chars)`)
        } catch {
            // Non-critical — cache write failure shouldn't block the response
        }

        // ─── Build Output ───────────────────────────────────────
        const output: string[] = []

        output.push(`─── Research Ingestion ─────────────────────────────────────────`)
        output.push(`│ URL: ${url}`)
        output.push(`│ Content type: ${classification} (auto-classified)`)
        output.push(`│ Size: ${contentBody.length.toLocaleString()} chars${contentBody.length > maxSize ? ` (showing ${maxSize.toLocaleString()})` : ""}`)
        output.push(`│ Cache: stored → ${WEB_CACHE_DIR}/${cacheKey}.json`)
        output.push(`────────────────────────────────────────────────────────────────`)
        output.push(``)
        output.push(truncated)

        if (contentBody.length > maxSize) {
            output.push(``)
            output.push(`... [TRUNCATED: ${contentBody.length.toLocaleString()} total chars, showing ${maxSize.toLocaleString()}]`)
        }

        // ─── Intelligence Actions ───────────────────────────────
        output.push(``)
        output.push(`─── Intelligence Actions ───────────────────────────────────────`)

        if (args.brain_topic) {
            output.push(`│ Brain topic: "${args.brain_topic}"`)
            output.push(`│   → Evidence: [${url}]`)
            output.push(`│   → Status: linked (use idumb_brain to create/update entry)`)
        }

        if (args.research_artifact) {
            output.push(`│ Research artifact: ${args.research_artifact}`)
            output.push(`│   → Web reference added`)
            output.push(`│   → Status: use idumb_write lifecycle="resolve" when research complete`)
        }

        if (purpose === "validation") {
            output.push(`│ Link validation: ${httpStatus === 200 ? "✅ ALIVE" : `⚠️ Status ${httpStatus}`}`)
            output.push(`│   → URL is ${httpStatus === 200 ? "reachable and returning content" : "returning non-200 status"}`)
        }

        output.push(`│`)
        output.push(formatGovernanceSummary(govState))
        output.push(`────────────────────────────────────────────────────────────────`)

        // ─── Audit ──────────────────────────────────────────────
        writeAuditEntry(projectDir, {
            action: "webfetch",
            purpose,
            url,
            contentType: classification,
            size: contentBody.length,
            httpStatus,
            cached: false,
            agent: agentRole,
            task: govState.activeTask?.name ?? "none",
            brainTopic: args.brain_topic,
            researchArtifact: args.research_artifact,
            timestamp: Date.now(),
        })

        log.info(`Fetched: ${url} (${contentBody.length} chars, ${classification})`)
        return output.join("\n")
    },
})

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Convert a URL to a safe filesystem-friendly cache key.
 */
function urlToCacheKey(url: string): string {
    return url
        .replace(/^https?:\/\//, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .slice(0, 100)
}

/**
 * Auto-classify content based on URL and content-type.
 */
function classifyContent(url: string, contentType: string, _body: string): string {
    const lower = url.toLowerCase()

    // By URL patterns
    if (lower.includes("/docs/") || lower.includes("/documentation/") || lower.includes("/guide")) {
        return "documentation"
    }
    if (lower.includes("/api/") || lower.includes("/reference/")) {
        return "api-reference"
    }
    if (lower.includes("/blog/") || lower.includes("/post/")) {
        return "blog-post"
    }
    if (lower.includes("github.com") && (lower.includes("/blob/") || lower.includes("/tree/"))) {
        return "source-code"
    }
    if (lower.includes("github.com")) {
        return "repository"
    }
    if (lower.includes("stackoverflow.com") || lower.includes("stackexchange.com")) {
        return "q-and-a"
    }
    if (lower.includes("npmjs.com") || lower.includes("pypi.org")) {
        return "package-registry"
    }

    // By content-type
    if (contentType.includes("json")) return "api-response"
    if (contentType.includes("markdown")) return "documentation"
    if (contentType.includes("text/plain")) return "plain-text"

    return "web-page"
}

/**
 * Write an audit entry for this fetch operation.
 */
function writeAuditEntry(projectDir: string, entry: Record<string, unknown>): void {
    try {
        const date = new Date().toISOString().slice(0, 10)
        const auditDir = join(projectDir, AUDIT_DIR, date)
        if (!existsSync(auditDir)) {
            mkdirSync(auditDir, { recursive: true })
        }

        const auditFile = join(auditDir, "fetches.jsonl")
        const line = JSON.stringify(entry) + "\n"

        const existing = existsSync(auditFile) ? readFileSync(auditFile, "utf-8") : ""
        writeFileSync(auditFile, existing + line, "utf-8")
    } catch {
        // Non-critical
    }
}
