/**
 * Framework Detector
 *
 * Deterministic pattern-matching to detect known spec-driven frameworks.
 * No LLM involvement — pure filesystem checks.
 */
import type { DetectedFramework } from "../schemas/scan.js";
/**
 * Detect which spec-driven framework (if any) is present in the project.
 * ALL required markers must exist for a match. Optional markers are reported but not required.
 */
export declare function detectFramework(directory: string): DetectedFramework;
//# sourceMappingURL=framework-detector.d.ts.map