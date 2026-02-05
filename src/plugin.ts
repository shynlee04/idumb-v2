/**
 * iDumb Plugin v2
 * 
 * Main plugin entry point for OpenCode integration.
 * 
 * This plugin provides intelligent governance through:
 * - Context purification at every decision boundary
 * - Permission enforcement via tool interception
 * - Anchor preservation across compaction
 * 
 * CRITICAL: NO console.log - causes TUI background text exposure
 * Use file logging via lib/logging.ts instead
 * 
 * Trial Status:
 * - T1: Stop Hook Tool Manipulation - IMPLEMENTED
 * - T2: Inner Cycle Delegation - PENDING
 * - T3: Compact Hook - PENDING
 * - T4: Sub-task Tracking - PENDING
 * - T5-T8: PENDING
 */

import type { Plugin } from "./types/plugin.js"
import { createLogger, initializeIdumbDir, readState, writeState, stateExists } from "./lib/index.js"
import { createDefaultState, addHistoryEntry } from "./schemas/index.js"
import { createToolGateHook, createToolGateAfterHook, setAgentRole } from "./hooks/index.js"

/**
 * Plugin version
 */
export const VERSION = "2.0.0-alpha.1"

/**
 * Main iDumb Plugin export
 * 
 * Implements OpenCode plugin interface with:
 * - Session lifecycle hooks
 * - Tool execution hooks (T1)
 * - Custom tools (planned)
 */
export const IdumbPlugin: Plugin = async ({ directory, client }) => {
  const logger = createLogger(directory, "idumb-core")
  
  logger.info(`iDumb v${VERSION} initializing`, { directory })
  
  // Initialize .idumb directory structure
  initializeIdumbDir(directory)
  
  // Initialize or load state
  if (!stateExists(directory)) {
    const initialState = createDefaultState()
    writeState(directory, initialState)
    logger.info("Created initial governance state")
  }
  
  // Create T1 hooks
  const toolGateHook = createToolGateHook(directory)
  const toolGateAfterHook = createToolGateAfterHook(directory)
  
  return {
    // ========================================================================
    // SESSION LIFECYCLE EVENTS
    // ========================================================================
    
    /**
     * Handle session events
     */
    event: async ({ event }) => {
      const eventType = event.type
      const props = event.properties as Record<string, unknown>
      const sessionId = (props?.info as Record<string, unknown>)?.id || props?.sessionID
      
      logger.debug(`Event: ${eventType}`, { sessionId })
      
      switch (eventType) {
        case "session.created":
          // Record session creation in history
          const state = readState(directory)
          const updatedState = addHistoryEntry(
            state,
            "session.created",
            "pass",
            { details: `Session ${sessionId} created` }
          )
          writeState(directory, updatedState)
          logger.info(`Session created: ${sessionId}`)
          break
          
        case "session.idle":
          logger.info(`Session idle: ${sessionId}`)
          break
          
        case "session.compacted":
          logger.info(`Session compacted: ${sessionId}`)
          break
      }
    },
    
    // ========================================================================
    // TOOL EXECUTION HOOKS (TRIAL-1)
    // ========================================================================
    
    /**
     * T1: tool.execute.before hook
     * 
     * Tests:
     * - P1.1: Throwing error blocks tool execution
     * - P1.3: Arg modification persists
     * - P1.4: Other hooks continue running
     */
    "tool.execute.before": async (input, output) => {
      try {
        await toolGateHook(input, output)
      } catch (error) {
        // Re-throw to test P1.1 (blocking via error)
        // If this doesn't block, the after hook will catch it
        throw error
      }
    },
    
    /**
     * T1: tool.execute.after hook (PIVOT fallback)
     * 
     * Tests:
     * - P1.2: If blocking failed, modify output to show violation
     */
    "tool.execute.after": async (input, output) => {
      try {
        await toolGateAfterHook(input, output)
      } catch (error) {
        // Log but don't throw - graceful degradation
        logger.error(`tool.execute.after error: ${error}`)
      }
    },
    
    // ========================================================================
    // PERMISSION HOOK
    // ========================================================================
    
    /**
     * Permission enforcement hook
     * Can be used to auto-deny certain permissions
     */
    "permission.ask": async (input, output) => {
      // For now, just log permission requests
      logger.debug("Permission asked", { input })
      
      // Future: Implement auto-deny based on agent role
      // output.status = "deny"
    },
    
    // ========================================================================
    // COMPACTION HOOKS (TRIAL-3 - PLACEHOLDER)
    // ========================================================================
    
    /**
     * T3: Session compaction hook
     * 
     * Injects critical anchors into compaction context to survive
     */
    "experimental.session.compacting": async (input, output) => {
      const { sessionID } = input
      
      logger.info(`Compaction triggered for session: ${sessionID}`)
      
      // TODO (T3): Implement anchor injection
      // const anchors = loadAllAnchors(directory)
      // const selected = selectAnchors(anchors, config.compaction.maxAnchors)
      // output.context.push(formatAnchorsForCompaction(selected))
      
      // Placeholder: Add minimal context
      output.context.push(`
## iDumb Governance Context
- Session: ${sessionID}
- Plugin Version: ${VERSION}
- Status: Active
      `.trim())
    },
    
    // ========================================================================
    // MESSAGE TRANSFORM HOOKS (TRIAL-5/6 - PLACEHOLDER)
    // ========================================================================
    
    /**
     * T5/T6: Message transformation hook
     * 
     * Tests where LLM pays attention (start vs end vs middle)
     */
    "experimental.chat.messages.transform": async (input, output) => {
      // TODO (T5/T6): Implement message injection experiments
      // For now, no-op to avoid breaking anything
    },
    
    // ========================================================================
    // CUSTOM TOOLS (PLANNED)
    // ========================================================================
    
    /**
     * Custom tools registration
     * 
     * Planned tools:
     * - idumb:state - Read/write governance state
     * - idumb:anchor - Manage context anchors
     * - idumb:validate - Run validation checks
     * - idumb:todo - Hierarchical TODO management
     */
    tool: {
      // Placeholder for custom tools
      // Will be implemented in T7
    },
  }
}

/**
 * Default export for OpenCode plugin system
 */
export default IdumbPlugin
