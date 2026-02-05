/**
 * OpenCode Plugin Type Definitions
 *
 * Local type stubs for @opencode-ai/plugin
 * Based on OpenCode plugin architecture research
 */
/**
 * Plugin context provided during initialization
 */
export interface PluginContext {
    directory: string;
    client: PluginClient;
}
/**
 * Plugin client for SDK operations
 */
export interface PluginClient {
    app: {
        log: (entry: LogEntry) => Promise<void>;
    };
    session: {
        get: (id: string) => Promise<unknown>;
        list: () => Promise<unknown[]>;
    };
}
/**
 * Log entry structure
 */
export interface LogEntry {
    service: string;
    level: "debug" | "info" | "warn" | "error";
    message: string;
    extra?: Record<string, unknown>;
}
/**
 * Event structure
 */
export interface Event {
    type: string;
    properties: Record<string, unknown>;
}
/**
 * Message part
 */
export interface Part {
    type: string;
    text?: string;
    [key: string]: unknown;
}
/**
 * Message info
 */
export interface MessageInfo {
    id: string;
    role: "user" | "assistant" | "system";
    [key: string]: unknown;
}
/**
 * Session message structure
 */
export interface SessionMessage {
    info: MessageInfo;
    parts: Part[];
}
/**
 * Permission status
 */
export type PermissionStatus = "ask" | "deny" | "allow";
/**
 * Tool definition for custom tools
 */
export interface ToolDefinition {
    name: string;
    description: string;
    schema?: Record<string, unknown>;
    execute: (args: Record<string, unknown>, context: PluginContext) => Promise<unknown>;
}
/**
 * Plugin hooks interface
 */
export interface PluginHooks {
    event?: (input: {
        event: Event;
    }) => Promise<void>;
    "tool.execute.before"?: (input: {
        tool: string;
        sessionID: string;
        callID: string;
    }, output: {
        args: Record<string, unknown>;
    }) => Promise<void>;
    "tool.execute.after"?: (input: {
        tool: string;
        sessionID: string;
        callID: string;
    }, output: {
        title: string;
        output: string;
        metadata: Record<string, unknown>;
    }) => Promise<void>;
    "permission.ask"?: (input: unknown, output: {
        status: PermissionStatus;
    }) => Promise<void>;
    "command.execute.before"?: (input: {
        command: string;
        sessionID: string;
        arguments: string;
    }, output: {
        parts: Part[];
    }) => Promise<void>;
    "chat.message"?: (input: {
        sessionID: string;
        agent?: string;
        model?: unknown;
        messageID?: string;
    }, output: {
        message: unknown;
        parts: Part[];
    }) => Promise<void>;
    "chat.params"?: (input: {
        sessionID: string;
        agent: string;
        model: unknown;
    }, output: {
        temperature: number;
        topP: number;
        topK: number;
        options: Record<string, unknown>;
    }) => Promise<void>;
    "experimental.chat.messages.transform"?: (input: Record<string, never>, output: {
        messages: SessionMessage[];
    }) => Promise<void>;
    "experimental.chat.system.transform"?: (input: {
        sessionID?: string;
        model: unknown;
    }, output: {
        system: string[];
    }) => Promise<void>;
    "experimental.session.compacting"?: (input: {
        sessionID: string;
    }, output: {
        context: string[];
        prompt?: string;
    }) => Promise<void>;
    "experimental.text.complete"?: (input: {
        sessionID: string;
        messageID: string;
        partID: string;
    }, output: {
        text: string;
    }) => Promise<void>;
    tool?: Record<string, ToolDefinition>;
}
/**
 * Plugin type - function that returns hooks
 */
export type Plugin = (context: PluginContext) => Promise<PluginHooks>;
//# sourceMappingURL=plugin.d.ts.map