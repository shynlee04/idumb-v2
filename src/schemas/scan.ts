/**
 * Scan Schema
 * 
 * Defines the structure of codebase scan results.
 * Output goes to .idumb/brain/context/scan-result.json
 */

import { z } from "zod"

// ============================================================================
// PROJECT INFO
// ============================================================================

export const ProjectStageSchema = z.enum([
  "greenfield",   // < 5 source files, minimal structure
  "brownfield",   // Existing codebase, active development
  "mature",       // Established codebase, stable patterns
])

export type ProjectStage = z.infer<typeof ProjectStageSchema>

export const ProjectInfoSchema = z.object({
  name: z.string(),
  stage: ProjectStageSchema,
  languages: z.array(z.string()),
  stack: z.array(z.string()),
  packageManager: z.string().nullable(),
  structure: z.object({
    sourceFiles: z.number().int().min(0),
    testFiles: z.number().int().min(0),
    configFiles: z.number().int().min(0),
    docFiles: z.number().int().min(0),
    totalFiles: z.number().int().min(0),
  }),
})

export type ProjectInfo = z.infer<typeof ProjectInfoSchema>

// ============================================================================
// FRAMEWORK DETECTION
// ============================================================================

export const DetectedFrameworkSchema = z.object({
  detected: z.boolean(),
  name: z.string().nullable(),
  configPath: z.string().nullable(),
  version: z.string().nullable(),
  indicators: z.array(z.string()),
})

export type DetectedFramework = z.infer<typeof DetectedFrameworkSchema>

// ============================================================================
// DIAGNOSIS
// ============================================================================

export const GapSeveritySchema = z.enum(["high", "medium", "low"])

export type GapSeverity = z.infer<typeof GapSeveritySchema>

export const GapSchema = z.object({
  id: z.string(),
  category: z.string(),
  description: z.string(),
  severity: GapSeveritySchema,
})

export type Gap = z.infer<typeof GapSchema>

export const DebtSignalSchema = z.object({
  id: z.string(),
  signal: z.string(),
  location: z.string(),
})

export type DebtSignal = z.infer<typeof DebtSignalSchema>

export const ConcernSchema = z.object({
  id: z.string(),
  type: z.string(),
  description: z.string(),
})

export type Concern = z.infer<typeof ConcernSchema>

export const ConventionsSchema = z.object({
  linting: z.string().nullable(),
  formatting: z.string().nullable(),
  testing: z.string().nullable(),
  naming: z.string().nullable(),
  bundler: z.string().nullable(),
})

export type Conventions = z.infer<typeof ConventionsSchema>

export const DriftInfoSchema = z.object({
  contextDrift: z.boolean(),
  configDrift: z.boolean(),
  indicators: z.array(z.string()),
})

export type DriftInfo = z.infer<typeof DriftInfoSchema>

export const DiagnosisSchema = z.object({
  gaps: z.array(GapSchema),
  debt: z.array(DebtSignalSchema),
  concerns: z.array(ConcernSchema),
  conventions: ConventionsSchema,
  drift: DriftInfoSchema,
})

export type Diagnosis = z.infer<typeof DiagnosisSchema>

// ============================================================================
// SCAN RESULT (top-level)
// ============================================================================

export const ScanResultSchema = z.object({
  version: z.string(),
  timestamp: z.string().datetime(),
  project: ProjectInfoSchema,
  framework: DetectedFrameworkSchema,
  diagnosis: DiagnosisSchema,
})

export type ScanResult = z.infer<typeof ScanResultSchema>

/**
 * Create an empty scan result as a starting point
 */
export function createEmptyScanResult(projectName: string): ScanResult {
  return ScanResultSchema.parse({
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    project: {
      name: projectName,
      stage: "greenfield",
      languages: [],
      stack: [],
      packageManager: null,
      structure: {
        sourceFiles: 0,
        testFiles: 0,
        configFiles: 0,
        docFiles: 0,
        totalFiles: 0,
      },
    },
    framework: {
      detected: false,
      name: null,
      configPath: null,
      version: null,
      indicators: [],
    },
    diagnosis: {
      gaps: [],
      debt: [],
      concerns: [],
      conventions: {
        linting: null,
        formatting: null,
        testing: null,
        naming: null,
        bundler: null,
      },
      drift: {
        contextDrift: false,
        configDrift: false,
        indicators: [],
      },
    },
  })
}
