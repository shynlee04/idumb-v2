/**
 * OpenCode Plugin Type Definitions
 *
 * Local tool helper using zod v3 (SDK ships zod v4).
 * Plugin/Hooks types re-exported from SDK.
 */
import { z } from "zod";
/**
 * Local tool() helper — mirrors SDK's identity function but uses zod v3
 */
export function tool(input) {
    return input;
}
tool.schema = z;
//# sourceMappingURL=plugin.js.map