/**
 * Tool Gate Hook
 * 
 * TRIAL-1: Stop Hook Tool Manipulation
 * 
 * Tests:
 * - P1.1: Can throwing error block tool execution?
 * - P1.2: Is error message visible in TUI (not background text)?
 * - P1.3: Does arg modification persist to actual execution?
 * - P1.4: Do other hooks continue running (no short-circuit)?
 * 
 * PIVOT Strategy:
 * - If P1.1 fails: Use tool.execute.after output replacement
 * - If P1.2 fails: Use custom wrapper tool with pre-validation
 * - If P1.3 fails: Use idumb:validate tool requirement
 */

import {
  detectAgentRole,
  isToolAllowedForRole,
  buildDenialMessage,
  type AgentRole,
  type PermissionDecision,
  type PermissionCheckResult,
} from "../schemas/index.js"
import { createLogger } from "../lib/index.js"

/**
 * Session tracker for delegation depth and agent role detection
 */
interface SessionTracker {
  sessionId: string
  agentRole: AgentRole | null
  depth: number
  firstTool: string | null
  delegationChain: string[]
  permissionChecks: PermissionCheckResult[]
}

/**
 * In-memory session trackers (per plugin instance)
 */
const sessionTrackers = new Map<string, SessionTracker>()

/**
 * Get or create session tracker
 */
export function getSessionTracker(sessionId: string): SessionTracker {
  let tracker = sessionTrackers.get(sessionId)
  
  if (!tracker) {
    tracker = {
      sessionId,
      agentRole: null,
      depth: 0,
      firstTool: null,
      delegationChain: [],
      permissionChecks: [],
    }
    sessionTrackers.set(sessionId, tracker)
  }
  
  return tracker
}

/**
 * Update session tracker with detected agent role
 */
export function setAgentRole(sessionId: string, agentName: string): void {
  const tracker = getSessionTracker(sessionId)
  tracker.agentRole = detectAgentRole(agentName)
}

/**
 * Record first tool used (for context-first detection)
 */
export function recordFirstTool(sessionId: string, toolName: string): void {
  const tracker = getSessionTracker(sessionId)
  if (!tracker.firstTool) {
    tracker.firstTool = toolName
  }
}

/**
 * Record permission check result
 */
export function recordPermissionCheck(
  sessionId: string,
  request: { tool: string; agentName?: string },
  decision: PermissionDecision,
  role: AgentRole
): void {
  const tracker = getSessionTracker(sessionId)
  tracker.permissionChecks.push({
    request: {
      sessionId,
      tool: request.tool,
      agentName: request.agentName,
    },
    decision,
    role,
    timestamp: new Date().toISOString(),
  })
}

/**
 * Tool gate error - thrown to block tool execution
 * This tests P1.1: Can throwing error block tool execution?
 */
export class ToolGateError extends Error {
  public readonly role: AgentRole
  public readonly tool: string
  public readonly decision: PermissionDecision
  
  constructor(role: AgentRole, tool: string, decision: PermissionDecision) {
    super(buildDenialMessage(role, tool, decision))
    this.name = "ToolGateError"
    this.role = role
    this.tool = tool
    this.decision = decision
  }
}

/**
 * Check if tool is allowed for current session
 * Returns decision without throwing - caller decides action
 */
export function checkToolPermission(
  sessionId: string,
  toolName: string,
  agentName?: string
): { allowed: boolean; role: AgentRole; decision: PermissionDecision } {
  const tracker = getSessionTracker(sessionId)
  
  // Update role if agent name provided
  if (agentName) {
    setAgentRole(sessionId, agentName)
  }
  
  // Use detected role or default to meta (allow-all) since SDK tool.execute.before
  // input has no agent field — we can't detect role there. Never break innate agents.
  const role = tracker.agentRole || "meta"
  
  // Check permission
  const decision = isToolAllowedForRole(role, toolName)
  
  // Record check
  recordPermissionCheck(sessionId, { tool: toolName, agentName }, decision, role)
  
  return { allowed: decision.allowed, role, decision }
}

/**
 * Main tool gate hook implementation
 * 
 * This is the core of TRIAL-1 - tests all 4 PASS criteria
 */
export function createToolGateHook(directory: string) {
  const logger = createLogger(directory, "tool-gate")
  
  return async (
    input: { tool: string; sessionID: string; callID: string },
    output: { args: Record<string, unknown> }
  ): Promise<void> => {
    const { tool, sessionID, callID } = input
    
    // Record first tool usage
    recordFirstTool(sessionID, tool)
    
    logger.debug(`Tool gate check: ${tool}`, { sessionID, callID })
    
    // Check permission
    const { allowed, role, decision } = checkToolPermission(sessionID, tool)
    
    if (!allowed) {
      logger.info(`Tool blocked: ${tool}`, { role, reason: decision.reason })
      
      // P1.1 TEST: Throwing error to block tool execution
      // If this works, the tool should not execute
      throw new ToolGateError(role, tool, decision)
    }
    
    // P1.3 TEST: Arg modification
    // Add governance metadata to args for tracking
    if (output.args) {
      output.args.__idumb_checked = true
      output.args.__idumb_role = role
      output.args.__idumb_session = sessionID
    }
    
    logger.debug(`Tool allowed: ${tool}`, { role })
  }
}

/**
 * After hook for fallback output replacement (PIVOT for P1.1)
 * 
 * If throwing doesn't block, we modify the output instead
 */
export function createToolGateAfterHook(directory: string) {
  const logger = createLogger(directory, "tool-gate-after")
  
  // Track blocked tools that made it through
  const blockedButExecuted = new Set<string>()
  
  return async (
    input: { tool: string; sessionID: string; callID: string },
    output: { title: string; output: string; metadata: Record<string, unknown> }
  ): Promise<void> => {
    const { tool, sessionID, callID } = input
    
    // Check if this tool should have been blocked
    const tracker = getSessionTracker(sessionID)
    const lastCheck = tracker.permissionChecks.slice(-1)[0]
    
    if (lastCheck && !lastCheck.decision.allowed && lastCheck.request.tool === tool) {
      // Tool executed despite denial - PIVOT action
      logger.warn(`Tool executed despite denial: ${tool}`, {
        role: lastCheck.role,
        reason: lastCheck.decision.reason,
      })
      
      blockedButExecuted.add(callID)
      
      // PIVOT: Replace output with denial message
      output.title = `GOVERNANCE VIOLATION: ${tool}`
      output.output = `
${buildDenialMessage(lastCheck.role, tool, lastCheck.decision)}

---
ORIGINAL OUTPUT (executed despite governance):
${output.output}
---

This action was not permitted for the current agent role.
`.trim()
      
      output.metadata = {
        ...output.metadata,
        __idumb_violation: true,
        __idumb_role: lastCheck.role,
        __idumb_pivot: "output_replacement",
      }
    }
  }
}

/**
 * Get permission check history for a session
 */
export function getPermissionHistory(sessionId: string): PermissionCheckResult[] {
  const tracker = sessionTrackers.get(sessionId)
  return tracker?.permissionChecks || []
}

/**
 * Clear session tracker (for testing)
 */
export function clearSessionTracker(sessionId: string): void {
  sessionTrackers.delete(sessionId)
}

/**
 * Clear all session trackers (for testing)
 */
export function clearAllSessionTrackers(): void {
  sessionTrackers.clear()
}
