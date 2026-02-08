/**
 * idumb_init — the entry point for everything.
 * 
 * Orchestrates: config creation → brownfield scan → scaffold → greeting.
 * 
 * This tool is the first thing a user runs. It:
 * 1. Accepts user preferences (language, experience, governance mode, scope)
 * 2. Scans the project read-only to detect frameworks, gaps, conflicts
 * 3. Creates .idumb/ directory tree + config.json
 * 4. Returns a greeting with detection results + next steps
 * 
 * Actions: "install" (full init), "scan" (read-only scan only), "status" (check existing config)
 */

import { tool } from "@opencode-ai/plugin/tool"
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises"
import { join, dirname } from "node:path"
import { createConfig, validateConfig } from "../schemas/config.js"
import type { Language, ExperienceLevel, GovernanceMode, InstallScope, IdumbConfig } from "../schemas/config.js"
import { scanProject, formatDetectionReport } from "../lib/framework-detector.js"
import { scaffoldProject, formatScaffoldReport } from "../lib/scaffolder.js"
import { createLogger } from "../lib/logging.js"
import {
  createOutlierEntry,
  createPlanningRegistry,
  detectArtifactType,
  type PlanningRegistry,
  type OutlierEntry,
} from "../schemas/planning-registry.js"

const PLANNING_REGISTRY_PATH = ".idumb/brain/registry.json"
const LEGACY_PLANNING_REGISTRY_PATH = ".idumb/brain/planning-registry.json"
const PLANNING_SCAN_ROOTS = [".idumb", "planning"]
const IGNORED_OUTLIER_PREFIXES = [
  ".idumb/backups/",
  ".idumb/brain/audit/",
  ".idumb/modules/",
]

interface PlanningOutlierScanResult {
  pendingOutliers: OutlierEntry[]
  newlyDetected: OutlierEntry[]
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "")
}

function shouldIgnoreOutlierPath(path: string): boolean {
  const normalized = normalizePath(path)
  if (normalized === PLANNING_REGISTRY_PATH || normalized === LEGACY_PLANNING_REGISTRY_PATH) return true
  return IGNORED_OUTLIER_PREFIXES.some(prefix => normalized.startsWith(prefix))
}

function normalizePlanningRegistry(parsed: Partial<PlanningRegistry>): PlanningRegistry {
  const empty = createPlanningRegistry()
  return {
    version: typeof parsed.version === "string" ? parsed.version : empty.version,
    artifacts: Array.isArray(parsed.artifacts) ? parsed.artifacts : [],
    chains: Array.isArray(parsed.chains) ? parsed.chains : [],
    outliers: Array.isArray(parsed.outliers) ? parsed.outliers : [],
    lastScanAt: typeof parsed.lastScanAt === "number" ? parsed.lastScanAt : 0,
  }
}

async function readPlanningRegistry(
  projectDir: string,
): Promise<{ registry: PlanningRegistry; migrated: boolean }> {
  const registryPath = join(projectDir, PLANNING_REGISTRY_PATH)
  const legacyRegistryPath = join(projectDir, LEGACY_PLANNING_REGISTRY_PATH)
  try {
    const raw = await readFile(registryPath, "utf-8")
    return { registry: normalizePlanningRegistry(JSON.parse(raw) as Partial<PlanningRegistry>), migrated: false }
  } catch {
    try {
      const raw = await readFile(legacyRegistryPath, "utf-8")
      return { registry: normalizePlanningRegistry(JSON.parse(raw) as Partial<PlanningRegistry>), migrated: true }
    } catch {
      return { registry: createPlanningRegistry(), migrated: false }
    }
  }
}

async function writePlanningRegistry(projectDir: string, registry: PlanningRegistry): Promise<void> {
  const registryPath = join(projectDir, PLANNING_REGISTRY_PATH)
  await mkdir(dirname(registryPath), { recursive: true })
  await writeFile(registryPath, JSON.stringify(registry, null, 2) + "\n", "utf-8")
}

async function listFilesRecursively(projectDir: string, root: string): Promise<string[]> {
  const absRoot = join(projectDir, root)
  const out: string[] = []

  async function walk(currentAbs: string): Promise<void> {
    let entries
    try {
      entries = await readdir(currentAbs, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      const name = String(entry.name)
      const entryAbs = join(currentAbs, name)
      const rel = normalizePath(entryAbs.slice(projectDir.length + 1))
      if (entry.isDirectory()) {
        await walk(entryAbs)
      } else if (entry.isFile()) {
        out.push(rel)
      }
    }
  }

  await walk(absRoot)
  return out
}

async function scanPlanningOutliers(
  projectDir: string,
  persist: boolean,
): Promise<PlanningOutlierScanResult> {
  const { registry } = await readPlanningRegistry(projectDir)
  const registeredPaths = new Set(registry.artifacts.map(a => normalizePath(a.path)))
  const candidateFiles: string[] = []

  for (const root of PLANNING_SCAN_ROOTS) {
    const files = await listFilesRecursively(projectDir, root)
    for (const file of files) {
      if (shouldIgnoreOutlierPath(file)) continue
      if (!detectArtifactType(file)) continue
      candidateFiles.push(file)
    }
  }

  const newlyDetected: OutlierEntry[] = []
  for (const candidate of candidateFiles) {
    const normalized = normalizePath(candidate)
    if (registeredPaths.has(normalized)) continue

    const existingOutlier = registry.outliers.find(o => normalizePath(o.path) === normalized)
    if (existingOutlier) continue

    const outlier = createOutlierEntry({
      path: normalized,
      reason: "unregistered",
      detectedBy: "idumb_init",
      note: "Detected during init scan: file exists but is missing from planning registry.",
    })
    registry.outliers.push(outlier)
    newlyDetected.push(outlier)
  }

  registry.lastScanAt = Date.now()
  if (persist) {
    await writePlanningRegistry(projectDir, registry)
  }

  return {
    pendingOutliers: registry.outliers.filter(o => o.userAction === "pending"),
    newlyDetected,
  }
}

function formatOutlierReport(outliers: PlanningOutlierScanResult, lang: Language): string {
  if (outliers.pendingOutliers.length === 0) {
    return ""
  }

  const lines: string[] = []
  if (lang === "vi") {
    lines.push("## ⚠️ Outliers Phát Hiện")
    lines.push(`- **Đang chờ xử lý:** ${outliers.pendingOutliers.length}`)
    if (outliers.newlyDetected.length > 0) {
      lines.push(`- **Mới phát hiện:** ${outliers.newlyDetected.length}`)
    }
    lines.push("- Các file chưa đăng ký (tối đa 10):")
  } else {
    lines.push("## ⚠️ Planning Outliers Detected")
    lines.push(`- **Pending:** ${outliers.pendingOutliers.length}`)
    if (outliers.newlyDetected.length > 0) {
      lines.push(`- **Newly detected:** ${outliers.newlyDetected.length}`)
    }
    lines.push("- Unregistered files (up to 10 shown):")
  }

  for (const outlier of outliers.pendingOutliers.slice(0, 10)) {
    lines.push(`- \`${outlier.path}\``)
  }

  return `\n${lines.join("\n")}`
}

// ─── Greeting Builder ────────────────────────────────────────────────

function buildGreeting(
  config: IdumbConfig,
  scaffoldReport: string,
  detectionReport: string,
): string {
  const lang = config.user.language.communication
  const sections: string[] = []

  if (lang === "vi") {
    sections.push("# 🧠 iDumb — Quản Trị Thông Minh Cho Agent AI\n")
    sections.push("Xin chào! iDumb đã được cài đặt thành công.\n")
    sections.push(`**Chế độ quản trị:** ${formatGovernanceMode(config.governance.mode, lang)}`)
    sections.push(`**Trình độ:** ${config.user.experienceLevel}`)
    sections.push(`**Ngôn ngữ giao tiếp:** Tiếng Việt`)
    sections.push(`**Ngôn ngữ tài liệu:** ${config.user.language.documents === "vi" ? "Tiếng Việt" : "English"}`)
    sections.push("")
    sections.push(detectionReport)
    sections.push("")
    // Code quality summary for agents
    const cq = config.detection.codeQuality
    if (cq) {
      sections.push(`## 📊 Chất Lượng Code — Điểm ${cq.grade} (${cq.score}/100)\n`)
      sections.push(`- **File đã quét:** ${cq.totalFiles}`)
      sections.push(`- **Tổng dòng:** ${cq.totalLines.toLocaleString()}`)
      sections.push(`- **Vấn đề phát hiện:** ${cq.smells.length}`)
      if (cq.smells.length > 0) {
        sections.push(`\n### Top Issues`)
        for (const smell of cq.smells.slice(0, 5)) {
          sections.push(`- \`${smell.file}\`: ${smell.message}`)
        }
      }
      sections.push("")
    }
    sections.push(scaffoldReport)
    sections.push("")
    sections.push(buildNextSteps(config, lang))
  } else {
    sections.push("# 🧠 iDumb — Intelligent Delegation Using Managed Boundaries\n")
    sections.push("Welcome! iDumb has been installed successfully.\n")
    sections.push(`**Governance mode:** ${formatGovernanceMode(config.governance.mode, lang)}`)
    sections.push(`**Experience level:** ${config.user.experienceLevel}`)
    sections.push(`**Communication language:** English`)
    sections.push(`**Document language:** ${config.user.language.documents === "vi" ? "Vietnamese" : "English"}`)
    sections.push("")
    sections.push(detectionReport)
    sections.push("")
    // Code quality summary for agents
    const cq = config.detection.codeQuality
    if (cq) {
      sections.push(`## 📊 Code Quality — Grade ${cq.grade} (${cq.score}/100)\n`)
      sections.push(`- **Files scanned:** ${cq.totalFiles}`)
      sections.push(`- **Total lines:** ${cq.totalLines.toLocaleString()}`)
      sections.push(`- **Issues detected:** ${cq.smells.length}`)
      if (cq.stats.filesOver500Lines > 0) sections.push(`- ⚠️ **${cq.stats.filesOver500Lines} mega file(s)** (>500 lines)`)
      if (cq.stats.functionsOver50Lines > 0) sections.push(`- ⚠️ **${cq.stats.functionsOver50Lines} long function(s)** (>50 lines)`)
      if (cq.stats.todoCount > 0) sections.push(`- 📌 **${cq.stats.todoCount} TODO/FIXME markers**`)
      if (cq.smells.length > 0) {
        sections.push(`\n### Top Issues`)
        for (const smell of cq.smells.slice(0, 5)) {
          sections.push(`- \`${smell.file}\`${smell.line ? `:${smell.line}` : ""}: ${smell.message}`)
        }
      }
      sections.push("")
    }
    sections.push(scaffoldReport)
    sections.push("")
    sections.push(buildNextSteps(config, lang))
  }

  return sections.join("\n")
}

function formatGovernanceMode(mode: GovernanceMode, lang: Language): string {
  const descriptions: Record<GovernanceMode, Record<Language, string>> = {
    balanced: {
      en: "**Balanced** — Agents get correct choices and recommendations before stopping. Full completion allowed, governed at decision boundaries.",
      vi: "**Cân bằng** — Agent được gợi ý lựa chọn đúng trước khi dừng. Cho phép hoàn thành toàn bộ, quản trị tại ranh giới quyết định.",
    },
    strict: {
      en: "**Strict** — Incremental validation at ALL nodes. Agent must pass gate before proceeding.",
      vi: "**Nghiêm ngặt** — Kiểm tra tại MỌI nút. Agent phải vượt qua cổng trước khi tiếp tục.",
    },
    autonomous: {
      en: "**Autonomous** — AI agent decides freely. Minimal intervention, maximum freedom. Still logs everything.",
      vi: "**Tự chủ** — Agent AI tự quyết định. Can thiệp tối thiểu, tự do tối đa. Vẫn ghi log tất cả.",
    },
    retard: {
      en: "🔥 **Retard Mode** — Autonomous + expert guardrails. iDumb is skeptical, bitchy, and will challenge every decision. Demands evidence. Roasts bad code. Trust issues included free.",
      vi: "🔥 **Chế Độ Retard** — Tự chủ + guardrail chuyên gia. iDumb sẽ nghi ngờ mọi thứ, thách thức mọi quyết định, và roast code tệ. Không tin ai cả.",
    },
  }
  return descriptions[mode][lang]
}

function buildNextSteps(config: IdumbConfig, lang: Language): string {
  const lines: string[] = []
  const detection = config.detection
  const hasGovernance = detection.governance.length > 0
  const hasAgentDirs = detection.existingAgentDirs.length > 0

  if (lang === "vi") {
    lines.push("## 🚀 Bước Tiếp Theo\n")

    if (hasGovernance) {
      lines.push(`1. **Framework đã phát hiện:** ${detection.governance.join(", ")} — iDumb sẽ tích hợp với cấu trúc hiện có`)
      lines.push("2. **Supreme Coordinator** sẽ phân tích sâu codebase để tạo agent profiles phù hợp")
    } else {
      lines.push("1. **Không phát hiện governance framework** — iDumb sẽ thiết lập từ đầu")
      lines.push("2. **Supreme Coordinator** sẽ quét codebase và đề xuất cấu trúc phù hợp")
    }

    if (detection.conflicts.length > 0) {
      lines.push(`\n⚠️ **Cần xử lý ${detection.conflicts.length} xung đột** trước khi tiếp tục`)
    }

    lines.push("\n**Lệnh tiếp theo:**")
    lines.push("- `govern_plan action=create` — Tạo kế hoạch trước khi viết file")
    lines.push("- `idumb_anchor add` — Lưu context quan trọng")
    lines.push("- `govern_task action=status` — Xem trạng thái quản trị")
  } else {
    lines.push("## 🚀 Next Steps\n")

    if (hasGovernance) {
      lines.push(`1. **Detected framework(s):** ${detection.governance.join(", ")} — iDumb will integrate with existing structure`)
      lines.push("2. **Supreme Coordinator** will deep-scan codebase to create matching agent profiles")
    } else {
      lines.push("1. **No governance framework detected** — iDumb will set up fresh governance")
      lines.push("2. **Supreme Coordinator** will scan codebase and propose matching structure")
    }

    if (hasAgentDirs) {
      lines.push(`3. **Existing agent dirs found:** ${detection.existingAgentDirs.join(", ")} — will coordinate, not conflict`)
    }

    if (detection.conflicts.length > 0) {
      lines.push(`\n⚠️ **${detection.conflicts.length} conflict(s) need resolution** before proceeding`)
    }

    if (detection.gaps.length > 0) {
      lines.push(`\n📋 **${detection.gaps.length} setup issue(s) detected** — see scan results above for details`)
    }

    const cq = detection.codeQuality
    if (cq && cq.smells.length > 0) {
      lines.push(`\n🔬 **Code quality: ${cq.grade} (${cq.score}/100)** — ${cq.smells.length} smell(s) detected across ${cq.totalFiles} files`)
      if (cq.stats.filesOver500Lines > 0) lines.push(`   ↳ Consider splitting ${cq.stats.filesOver500Lines} mega file(s) (>500 lines)`)
      if (cq.stats.functionsOver50Lines > 0) lines.push(`   ↳ Refactor ${cq.stats.functionsOver50Lines} long function(s) (>50 lines)`)
    }

    lines.push("\n**Available commands:**")
    lines.push("- `govern_plan action=create` — Create a plan before writing files")
    lines.push("- `idumb_anchor add` — Save important context that survives compaction")
    lines.push("- `govern_task action=status` — View governance state")
  }

  return lines.join("\n")
}

// ─── Tool Definition ─────────────────────────────────────────────────

export const idumb_init = tool({
  description: "Initialize iDumb governance — scans your brownfield project, detects frameworks, creates .idumb/ config and directory structure. The entry point for everything. Use action='scan' for read-only scan, action='status' to check existing config, or action='install' (default) for full setup.",
  args: {
    action: tool.schema.enum(["install", "scan", "status"]).optional().describe(
      "install = full init (scan + scaffold + config), scan = read-only scan only, status = check existing config. Default: install"
    ),
    language: tool.schema.enum(["en", "vi"]).optional().describe(
      "Communication language: en (English) or vi (Vietnamese). Default: en"
    ),
    documents_language: tool.schema.enum(["en", "vi"]).optional().describe(
      "Language for generated documents: en or vi. Default: same as language"
    ),
    experience: tool.schema.enum(["beginner", "guided", "expert"]).optional().describe(
      "User experience level. beginner = verbose guidance, guided = balanced, expert = terse. Default: guided"
    ),
    governance_mode: tool.schema.enum(["balanced", "strict", "autonomous", "retard"]).optional().describe(
      "balanced = recommend before stopping, strict = validate at every node, autonomous = AI decides freely, retard = autonomous + expert guardrails + savage personality. Default: balanced"
    ),
    scope: tool.schema.enum(["project", "global"]).optional().describe(
      "Installation scope: project-level or global. Default: project"
    ),
    force: tool.schema.boolean().optional().describe(
      "Force overwrite existing config.json if it exists"
    ),
  },
  async execute(args, context) {
    const { directory } = context
    const log = createLogger(directory, "idumb-init")
    const action = args.action ?? "install"

    log.info(`idumb_init: action=${action}`, { args })

    try {
      // ─── STATUS: just check existing config ──────────────
      if (action === "status") {
        const configPath = join(directory, ".idumb/config.json")
        try {
          const raw = await readFile(configPath, "utf-8")
          const config = JSON.parse(raw) as IdumbConfig
          const errors = validateConfig(config)

          if (errors.length > 0) {
            return `## ⚠️ Config found but has issues\n\n**Path:** \`${configPath}\`\n\n**Errors:**\n${errors.map(e => `- ${e}`).join("\n")}`
          }

          return `## ✅ iDumb is configured\n\n**Version:** ${config.version}\n**Installed:** ${config.installedAt}\n**Governance:** ${config.governance.mode}\n**Experience:** ${config.user.experienceLevel}\n**Language:** ${config.user.language.communication}\n\nRun \`idumb_init action=install force=true\` to reconfigure.`
        } catch {
          return "## ❌ No iDumb config found\n\nRun `idumb_init` to install."
        }
      }

      // ─── SCAN: read-only brownfield scan ─────────────────
      const detection = await scanProject(directory, log)
      const lang = (args.language ?? "en") as Language
      const outlierScan = await scanPlanningOutliers(directory, action === "install")
      const detectionReport = formatDetectionReport(detection, lang) + formatOutlierReport(outlierScan, lang)

      if (action === "scan") {
        return detectionReport
      }

      // ─── INSTALL: full init ──────────────────────────────
      const docsLang = (args.documents_language ?? args.language ?? "en") as Language

      const config = createConfig({
        scope: (args.scope ?? "project") as InstallScope,
        experienceLevel: (args.experience ?? "guided") as ExperienceLevel,
        communicationLanguage: lang,
        documentsLanguage: docsLang,
        governanceMode: (args.governance_mode ?? "balanced") as GovernanceMode,
        detection,
      })

      const force = args.force ?? false
      const scaffoldResult = await scaffoldProject(directory, config, force, log)
      const scaffoldReport = formatScaffoldReport(scaffoldResult, lang)

      if (!scaffoldResult.success) {
        return `## ❌ Installation failed\n\n${scaffoldReport}`
      }

      // Build the greeting
      const greeting = buildGreeting(config, scaffoldReport, detectionReport)

      log.info("idumb_init complete", {
        governance: detection.governance,
        tech: detection.tech,
        mode: config.governance.mode,
      })

      return greeting

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      log.error("idumb_init failed", { error: msg })
      return `## ❌ Init Error\n\n${msg}`
    }
  },
})
