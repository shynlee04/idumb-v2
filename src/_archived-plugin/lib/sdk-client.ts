/**
 * SDK Client Module — shared access to the OpencodeClient instance.
 *
 * The OpencodeClient is provided by the PluginInput at plugin initialization.
 * This module stores the reference so that hooks and tools can access SDK
 * features (tui.showToast, app.log, session.children, etc.) without threading
 * the client through every function signature.
 *
 * P3: Graceful degradation — tryGetClient() returns null when unavailable.
 *     All consumers should use tryGetClient() + null checks.
 *
 * CRITICAL: NO console.log anywhere — breaks TUI rendering.
 */

import type { PluginInput } from "@opencode-ai/plugin"

/** Type extracted from PluginInput to avoid @opencode-ai/sdk direct dependency */
export type SdkClient = PluginInput["client"]

let _client: SdkClient | null = null

/**
 * Store the client reference during plugin initialization.
 * Called once from src/index.ts plugin factory.
 */
export function setClient(client: SdkClient): void {
  _client = client
}

/**
 * Get the client reference, or null if not initialized.
 * Use this in hooks/tools where SDK access is optional (P3 pattern).
 */
export function tryGetClient(): SdkClient | null {
  return _client
}
