/**
 * Scan Schema
 *
 * Defines the structure of codebase scan results.
 * Output goes to .idumb/brain/context/scan-result.json
 */
import { z } from "zod";
export declare const ProjectStageSchema: z.ZodEnum<["greenfield", "brownfield", "mature"]>;
export type ProjectStage = z.infer<typeof ProjectStageSchema>;
export declare const ProjectInfoSchema: z.ZodObject<{
    name: z.ZodString;
    stage: z.ZodEnum<["greenfield", "brownfield", "mature"]>;
    languages: z.ZodArray<z.ZodString, "many">;
    stack: z.ZodArray<z.ZodString, "many">;
    packageManager: z.ZodNullable<z.ZodString>;
    structure: z.ZodObject<{
        sourceFiles: z.ZodNumber;
        testFiles: z.ZodNumber;
        configFiles: z.ZodNumber;
        docFiles: z.ZodNumber;
        totalFiles: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        sourceFiles: number;
        testFiles: number;
        configFiles: number;
        docFiles: number;
        totalFiles: number;
    }, {
        sourceFiles: number;
        testFiles: number;
        configFiles: number;
        docFiles: number;
        totalFiles: number;
    }>;
}, "strip", z.ZodTypeAny, {
    name: string;
    stage: "greenfield" | "brownfield" | "mature";
    languages: string[];
    stack: string[];
    packageManager: string | null;
    structure: {
        sourceFiles: number;
        testFiles: number;
        configFiles: number;
        docFiles: number;
        totalFiles: number;
    };
}, {
    name: string;
    stage: "greenfield" | "brownfield" | "mature";
    languages: string[];
    stack: string[];
    packageManager: string | null;
    structure: {
        sourceFiles: number;
        testFiles: number;
        configFiles: number;
        docFiles: number;
        totalFiles: number;
    };
}>;
export type ProjectInfo = z.infer<typeof ProjectInfoSchema>;
export declare const DetectedFrameworkSchema: z.ZodObject<{
    detected: z.ZodBoolean;
    name: z.ZodNullable<z.ZodString>;
    configPath: z.ZodNullable<z.ZodString>;
    version: z.ZodNullable<z.ZodString>;
    indicators: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    version: string | null;
    name: string | null;
    detected: boolean;
    configPath: string | null;
    indicators: string[];
}, {
    version: string | null;
    name: string | null;
    detected: boolean;
    configPath: string | null;
    indicators: string[];
}>;
export type DetectedFramework = z.infer<typeof DetectedFrameworkSchema>;
export declare const GapSeveritySchema: z.ZodEnum<["high", "medium", "low"]>;
export type GapSeverity = z.infer<typeof GapSeveritySchema>;
export declare const GapSchema: z.ZodObject<{
    id: z.ZodString;
    category: z.ZodString;
    description: z.ZodString;
    severity: z.ZodEnum<["high", "medium", "low"]>;
}, "strip", z.ZodTypeAny, {
    id: string;
    category: string;
    description: string;
    severity: "high" | "medium" | "low";
}, {
    id: string;
    category: string;
    description: string;
    severity: "high" | "medium" | "low";
}>;
export type Gap = z.infer<typeof GapSchema>;
export declare const DebtSignalSchema: z.ZodObject<{
    id: z.ZodString;
    signal: z.ZodString;
    location: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    signal: string;
    location: string;
}, {
    id: string;
    signal: string;
    location: string;
}>;
export type DebtSignal = z.infer<typeof DebtSignalSchema>;
export declare const ConcernSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodString;
    description: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: string;
    id: string;
    description: string;
}, {
    type: string;
    id: string;
    description: string;
}>;
export type Concern = z.infer<typeof ConcernSchema>;
export declare const ConventionsSchema: z.ZodObject<{
    linting: z.ZodNullable<z.ZodString>;
    formatting: z.ZodNullable<z.ZodString>;
    testing: z.ZodNullable<z.ZodString>;
    naming: z.ZodNullable<z.ZodString>;
    bundler: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    linting: string | null;
    formatting: string | null;
    testing: string | null;
    naming: string | null;
    bundler: string | null;
}, {
    linting: string | null;
    formatting: string | null;
    testing: string | null;
    naming: string | null;
    bundler: string | null;
}>;
export type Conventions = z.infer<typeof ConventionsSchema>;
export declare const DriftInfoSchema: z.ZodObject<{
    contextDrift: z.ZodBoolean;
    configDrift: z.ZodBoolean;
    indicators: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    indicators: string[];
    contextDrift: boolean;
    configDrift: boolean;
}, {
    indicators: string[];
    contextDrift: boolean;
    configDrift: boolean;
}>;
export type DriftInfo = z.infer<typeof DriftInfoSchema>;
export declare const DiagnosisSchema: z.ZodObject<{
    gaps: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        category: z.ZodString;
        description: z.ZodString;
        severity: z.ZodEnum<["high", "medium", "low"]>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        category: string;
        description: string;
        severity: "high" | "medium" | "low";
    }, {
        id: string;
        category: string;
        description: string;
        severity: "high" | "medium" | "low";
    }>, "many">;
    debt: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        signal: z.ZodString;
        location: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        signal: string;
        location: string;
    }, {
        id: string;
        signal: string;
        location: string;
    }>, "many">;
    concerns: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodString;
        description: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: string;
        id: string;
        description: string;
    }, {
        type: string;
        id: string;
        description: string;
    }>, "many">;
    conventions: z.ZodObject<{
        linting: z.ZodNullable<z.ZodString>;
        formatting: z.ZodNullable<z.ZodString>;
        testing: z.ZodNullable<z.ZodString>;
        naming: z.ZodNullable<z.ZodString>;
        bundler: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        linting: string | null;
        formatting: string | null;
        testing: string | null;
        naming: string | null;
        bundler: string | null;
    }, {
        linting: string | null;
        formatting: string | null;
        testing: string | null;
        naming: string | null;
        bundler: string | null;
    }>;
    drift: z.ZodObject<{
        contextDrift: z.ZodBoolean;
        configDrift: z.ZodBoolean;
        indicators: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        indicators: string[];
        contextDrift: boolean;
        configDrift: boolean;
    }, {
        indicators: string[];
        contextDrift: boolean;
        configDrift: boolean;
    }>;
}, "strip", z.ZodTypeAny, {
    gaps: {
        id: string;
        category: string;
        description: string;
        severity: "high" | "medium" | "low";
    }[];
    debt: {
        id: string;
        signal: string;
        location: string;
    }[];
    concerns: {
        type: string;
        id: string;
        description: string;
    }[];
    conventions: {
        linting: string | null;
        formatting: string | null;
        testing: string | null;
        naming: string | null;
        bundler: string | null;
    };
    drift: {
        indicators: string[];
        contextDrift: boolean;
        configDrift: boolean;
    };
}, {
    gaps: {
        id: string;
        category: string;
        description: string;
        severity: "high" | "medium" | "low";
    }[];
    debt: {
        id: string;
        signal: string;
        location: string;
    }[];
    concerns: {
        type: string;
        id: string;
        description: string;
    }[];
    conventions: {
        linting: string | null;
        formatting: string | null;
        testing: string | null;
        naming: string | null;
        bundler: string | null;
    };
    drift: {
        indicators: string[];
        contextDrift: boolean;
        configDrift: boolean;
    };
}>;
export type Diagnosis = z.infer<typeof DiagnosisSchema>;
export declare const ScanResultSchema: z.ZodObject<{
    version: z.ZodString;
    timestamp: z.ZodString;
    project: z.ZodObject<{
        name: z.ZodString;
        stage: z.ZodEnum<["greenfield", "brownfield", "mature"]>;
        languages: z.ZodArray<z.ZodString, "many">;
        stack: z.ZodArray<z.ZodString, "many">;
        packageManager: z.ZodNullable<z.ZodString>;
        structure: z.ZodObject<{
            sourceFiles: z.ZodNumber;
            testFiles: z.ZodNumber;
            configFiles: z.ZodNumber;
            docFiles: z.ZodNumber;
            totalFiles: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            sourceFiles: number;
            testFiles: number;
            configFiles: number;
            docFiles: number;
            totalFiles: number;
        }, {
            sourceFiles: number;
            testFiles: number;
            configFiles: number;
            docFiles: number;
            totalFiles: number;
        }>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        stage: "greenfield" | "brownfield" | "mature";
        languages: string[];
        stack: string[];
        packageManager: string | null;
        structure: {
            sourceFiles: number;
            testFiles: number;
            configFiles: number;
            docFiles: number;
            totalFiles: number;
        };
    }, {
        name: string;
        stage: "greenfield" | "brownfield" | "mature";
        languages: string[];
        stack: string[];
        packageManager: string | null;
        structure: {
            sourceFiles: number;
            testFiles: number;
            configFiles: number;
            docFiles: number;
            totalFiles: number;
        };
    }>;
    framework: z.ZodObject<{
        detected: z.ZodBoolean;
        name: z.ZodNullable<z.ZodString>;
        configPath: z.ZodNullable<z.ZodString>;
        version: z.ZodNullable<z.ZodString>;
        indicators: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        version: string | null;
        name: string | null;
        detected: boolean;
        configPath: string | null;
        indicators: string[];
    }, {
        version: string | null;
        name: string | null;
        detected: boolean;
        configPath: string | null;
        indicators: string[];
    }>;
    diagnosis: z.ZodObject<{
        gaps: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            category: z.ZodString;
            description: z.ZodString;
            severity: z.ZodEnum<["high", "medium", "low"]>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            category: string;
            description: string;
            severity: "high" | "medium" | "low";
        }, {
            id: string;
            category: string;
            description: string;
            severity: "high" | "medium" | "low";
        }>, "many">;
        debt: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            signal: z.ZodString;
            location: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            signal: string;
            location: string;
        }, {
            id: string;
            signal: string;
            location: string;
        }>, "many">;
        concerns: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodString;
            description: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: string;
            id: string;
            description: string;
        }, {
            type: string;
            id: string;
            description: string;
        }>, "many">;
        conventions: z.ZodObject<{
            linting: z.ZodNullable<z.ZodString>;
            formatting: z.ZodNullable<z.ZodString>;
            testing: z.ZodNullable<z.ZodString>;
            naming: z.ZodNullable<z.ZodString>;
            bundler: z.ZodNullable<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            linting: string | null;
            formatting: string | null;
            testing: string | null;
            naming: string | null;
            bundler: string | null;
        }, {
            linting: string | null;
            formatting: string | null;
            testing: string | null;
            naming: string | null;
            bundler: string | null;
        }>;
        drift: z.ZodObject<{
            contextDrift: z.ZodBoolean;
            configDrift: z.ZodBoolean;
            indicators: z.ZodArray<z.ZodString, "many">;
        }, "strip", z.ZodTypeAny, {
            indicators: string[];
            contextDrift: boolean;
            configDrift: boolean;
        }, {
            indicators: string[];
            contextDrift: boolean;
            configDrift: boolean;
        }>;
    }, "strip", z.ZodTypeAny, {
        gaps: {
            id: string;
            category: string;
            description: string;
            severity: "high" | "medium" | "low";
        }[];
        debt: {
            id: string;
            signal: string;
            location: string;
        }[];
        concerns: {
            type: string;
            id: string;
            description: string;
        }[];
        conventions: {
            linting: string | null;
            formatting: string | null;
            testing: string | null;
            naming: string | null;
            bundler: string | null;
        };
        drift: {
            indicators: string[];
            contextDrift: boolean;
            configDrift: boolean;
        };
    }, {
        gaps: {
            id: string;
            category: string;
            description: string;
            severity: "high" | "medium" | "low";
        }[];
        debt: {
            id: string;
            signal: string;
            location: string;
        }[];
        concerns: {
            type: string;
            id: string;
            description: string;
        }[];
        conventions: {
            linting: string | null;
            formatting: string | null;
            testing: string | null;
            naming: string | null;
            bundler: string | null;
        };
        drift: {
            indicators: string[];
            contextDrift: boolean;
            configDrift: boolean;
        };
    }>;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    version: string;
    framework: {
        version: string | null;
        name: string | null;
        detected: boolean;
        configPath: string | null;
        indicators: string[];
    };
    project: {
        name: string;
        stage: "greenfield" | "brownfield" | "mature";
        languages: string[];
        stack: string[];
        packageManager: string | null;
        structure: {
            sourceFiles: number;
            testFiles: number;
            configFiles: number;
            docFiles: number;
            totalFiles: number;
        };
    };
    diagnosis: {
        gaps: {
            id: string;
            category: string;
            description: string;
            severity: "high" | "medium" | "low";
        }[];
        debt: {
            id: string;
            signal: string;
            location: string;
        }[];
        concerns: {
            type: string;
            id: string;
            description: string;
        }[];
        conventions: {
            linting: string | null;
            formatting: string | null;
            testing: string | null;
            naming: string | null;
            bundler: string | null;
        };
        drift: {
            indicators: string[];
            contextDrift: boolean;
            configDrift: boolean;
        };
    };
}, {
    timestamp: string;
    version: string;
    framework: {
        version: string | null;
        name: string | null;
        detected: boolean;
        configPath: string | null;
        indicators: string[];
    };
    project: {
        name: string;
        stage: "greenfield" | "brownfield" | "mature";
        languages: string[];
        stack: string[];
        packageManager: string | null;
        structure: {
            sourceFiles: number;
            testFiles: number;
            configFiles: number;
            docFiles: number;
            totalFiles: number;
        };
    };
    diagnosis: {
        gaps: {
            id: string;
            category: string;
            description: string;
            severity: "high" | "medium" | "low";
        }[];
        debt: {
            id: string;
            signal: string;
            location: string;
        }[];
        concerns: {
            type: string;
            id: string;
            description: string;
        }[];
        conventions: {
            linting: string | null;
            formatting: string | null;
            testing: string | null;
            naming: string | null;
            bundler: string | null;
        };
        drift: {
            indicators: string[];
            contextDrift: boolean;
            configDrift: boolean;
        };
    };
}>;
export type ScanResult = z.infer<typeof ScanResultSchema>;
/**
 * Create an empty scan result as a starting point
 */
export declare function createEmptyScanResult(projectName: string): ScanResult;
//# sourceMappingURL=scan.d.ts.map