/**
 * Logging Module
 *
 * TUI-SAFE logging - NO console.log!
 * All output goes to file to prevent TUI background text pollution.
 */
/**
 * Log levels in order of severity
 */
export type LogLevel = "debug" | "info" | "warn" | "error";
/**
 * Logger configuration
 */
interface LoggerConfig {
    level: LogLevel;
    file: string;
    maxSize?: number;
}
/**
 * Configure the logger
 */
export declare function configureLogger(config: Partial<LoggerConfig>): void;
/**
 * Get log file path relative to directory
 */
export declare function getLogPath(directory: string): string;
/**
 * Main log function - NEVER uses console.log
 *
 * @param directory - Project directory for relative log path
 * @param level - Log level
 * @param message - Log message
 * @param data - Optional structured data
 */
export declare function log(directory: string, level: LogLevel, message: string, data?: Record<string, unknown>): void;
/**
 * Convenience methods for different log levels
 */
export declare function debug(directory: string, message: string, data?: Record<string, unknown>): void;
export declare function info(directory: string, message: string, data?: Record<string, unknown>): void;
export declare function warn(directory: string, message: string, data?: Record<string, unknown>): void;
export declare function error(directory: string, message: string, data?: Record<string, unknown>): void;
/**
 * Log with explicit path (for cases where directory context is unavailable)
 */
export declare function logToPath(logPath: string, level: LogLevel, message: string, data?: Record<string, unknown>): void;
/**
 * Create a scoped logger for a specific module
 */
export declare function createLogger(directory: string, module: string): {
    debug: (message: string, data?: Record<string, unknown>) => void;
    info: (message: string, data?: Record<string, unknown>) => void;
    warn: (message: string, data?: Record<string, unknown>) => void;
    error: (message: string, data?: Record<string, unknown>) => void;
};
/**
 * Clear log file (useful for testing)
 */
export declare function clearLog(directory: string): void;
export {};
//# sourceMappingURL=logging.d.ts.map