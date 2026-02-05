/**
 * Codebase Scanner
 *
 * Deterministic filesystem scanner that produces a ScanResult JSON.
 * No LLM involvement — pure file analysis.
 * Output: .idumb/brain/context/scan-result.json
 */
import type { ScanResult } from "../schemas/scan.js";
/**
 * Scan a codebase and produce a complete ScanResult.
 * Pure filesystem analysis — no LLM, no network.
 */
export declare function scanCodebase(directory: string): ScanResult;
//# sourceMappingURL=scanner.d.ts.map