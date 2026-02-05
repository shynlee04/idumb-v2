/**
 * Framework Detector
 *
 * Deterministic pattern-matching to detect known spec-driven frameworks.
 * No LLM involvement — pure filesystem checks.
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";
const FRAMEWORK_SIGNATURES = [
    {
        name: "GSD",
        required: [
            ".planning/STATE.md",
        ],
        optional: [
            ".planning/PROJECT.md",
            ".planning/config.json",
            ".planning/ROADMAP.md",
            ".planning/REQUIREMENTS.md",
        ],
        versionFile: ".planning/config.json",
        versionKey: "version",
    },
    {
        name: "BMAD",
        required: [
            "_bmad/",
        ],
    },
    {
        name: "SPEC-KIT",
        required: [
            ".spec/",
        ],
        optional: [
            "spec-kit.json",
        ],
        versionFile: "spec-kit.json",
        versionKey: "version",
    },
    {
        name: "Open-spec",
        required: [
            ".open-spec/",
        ],
        optional: [
            "open-spec.json",
        ],
        versionFile: "open-spec.json",
        versionKey: "version",
    },
];
// ============================================================================
// DETECTION LOGIC
// ============================================================================
/**
 * Check if a marker exists at the given directory
 */
function markerExists(directory, marker) {
    return existsSync(join(directory, marker));
}
/**
 * Try to read a version from a JSON file
 */
function readVersion(directory, filePath, key) {
    const fullPath = join(directory, filePath);
    if (!existsSync(fullPath))
        return null;
    try {
        const content = readFileSync(fullPath, "utf-8");
        const json = JSON.parse(content);
        // Support dot-separated keys like "meta.version"
        const parts = key.split(".");
        let value = json;
        for (const part of parts) {
            if (value && typeof value === "object" && part in value) {
                value = value[part];
            }
            else {
                return null;
            }
        }
        return typeof value === "string" ? value : null;
    }
    catch {
        return null;
    }
}
/**
 * Detect which spec-driven framework (if any) is present in the project.
 * ALL required markers must exist for a match. Optional markers are reported but not required.
 */
export function detectFramework(directory) {
    for (const sig of FRAMEWORK_SIGNATURES) {
        const allRequired = sig.required.every((m) => markerExists(directory, m));
        if (!allRequired)
            continue;
        const matchedOptional = (sig.optional ?? []).filter((m) => markerExists(directory, m));
        const allIndicators = [...sig.required, ...matchedOptional];
        const version = sig.versionFile && sig.versionKey
            ? readVersion(directory, sig.versionFile, sig.versionKey)
            : null;
        return {
            detected: true,
            name: sig.name,
            configPath: sig.required[0],
            version,
            indicators: allIndicators,
        };
    }
    return {
        detected: false,
        name: null,
        configPath: null,
        version: null,
        indicators: [],
    };
}
//# sourceMappingURL=framework-detector.js.map