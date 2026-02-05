/**
 * Trial: idumb_init scanner
 * 
 * Runs the scanner against THIS project directory
 * and prints the scan result to verify correctness.
 */

import { scanCodebase } from "../src/engines/scanner.js"
import { ScanResultSchema } from "../src/schemas/scan.js"

const directory = process.cwd()

console.log("=== Scanning:", directory, "===\n")

const result = scanCodebase(directory)

// Validate against schema
const validated = ScanResultSchema.parse(result)

console.log(JSON.stringify(validated, null, 2))

// Quick assertions
const checks = [
  ["project.name", validated.project.name === "idumb-plugin-v2"],
  ["project.stage", validated.project.stage === "brownfield"],
  ["has typescript", validated.project.languages.includes("typescript")],
  ["has zod in stack", validated.project.stack.includes("zod")],
  ["has typescript in stack", validated.project.stack.includes("typescript")],
  ["packageManager=npm", validated.project.packageManager === "npm"],
  ["framework.detected=false", validated.framework.detected === false],
  ["sourceFiles > 0", validated.project.structure.sourceFiles > 0],
  ["has gaps", validated.diagnosis.gaps.length > 0],
] as const

console.log("\n=== Assertions ===")
let passed = 0
let failed = 0
for (const [label, ok] of checks) {
  const status = ok ? "✓" : "✗"
  console.log(`${status} ${label}`)
  if (ok) passed++
  else failed++
}
console.log(`\n${passed}/${passed + failed} passed`)

if (failed > 0) {
  process.exit(1)
}
