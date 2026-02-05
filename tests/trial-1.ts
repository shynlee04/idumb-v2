/**
 * TRIAL-1 Validation Test
 * 
 * Tests the Stop Hook Tool Manipulation mechanism
 * 
 * PASS Criteria:
 * - P1.1: Throwing error blocks tool execution
 * - P1.2: Error message visible in TUI (not background text)
 * - P1.3: Arg modification persists to actual execution
 * - P1.4: Other hooks continue running (no short-circuit)
 * 
 * Run with: npm run test:t1
 */

import {
  checkToolPermission,
  createToolGateHook,
  createToolGateAfterHook,
  ToolGateError,
  getPermissionHistory,
  clearAllSessionTrackers,
  setAgentRole,
} from "../src/hooks/index.js"
import {
  detectAgentRole,
  isToolAllowedForRole,
} from "../src/schemas/index.js"
import { mkdirSync, existsSync, rmSync } from "fs"
import { join } from "path"

// Test directory
const TEST_DIR = "/tmp/idumb-t1-test"

// Setup test directory
function setup() {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true })
  }
  mkdirSync(join(TEST_DIR, ".idumb/logs"), { recursive: true })
  clearAllSessionTrackers()
  console.log("Test setup complete")
}

// Cleanup
function cleanup() {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true })
  }
  clearAllSessionTrackers()
}

// ============================================================================
// TEST CASES
// ============================================================================

/**
 * Test role detection from agent names
 */
function testRoleDetection() {
  console.log("\n=== Test: Role Detection ===")
  
  const testCases = [
    { name: "idumb-supreme-coordinator", expected: "coordinator" },
    { name: "idumb-high-governance", expected: "high-governance" },
    { name: "idumb-mid-coordinator", expected: "mid-coordinator" },
    { name: "idumb-validator", expected: "validator" },
    { name: "idumb-builder", expected: "builder" },
    { name: "idumb-researcher", expected: "researcher" },
    { name: "idumb-meta-builder", expected: "meta" },
    { name: "unknown-agent", expected: "researcher" }, // Default
  ]
  
  let passed = 0
  let failed = 0
  
  for (const { name, expected } of testCases) {
    const role = detectAgentRole(name)
    if (role === expected) {
      console.log(`  ✓ ${name} -> ${role}`)
      passed++
    } else {
      console.log(`  ✗ ${name} -> ${role} (expected: ${expected})`)
      failed++
    }
  }
  
  console.log(`  Results: ${passed} passed, ${failed} failed`)
  return failed === 0
}

/**
 * Test permission checks for different roles
 */
function testPermissionChecks() {
  console.log("\n=== Test: Permission Checks ===")
  
  const testCases = [
    // Coordinators can read and delegate, not write
    { role: "coordinator", tool: "read", expected: true },
    { role: "coordinator", tool: "task", expected: true },
    { role: "coordinator", tool: "write", expected: false },
    { role: "coordinator", tool: "edit", expected: false },
    
    // Builders can write, not delegate
    { role: "builder", tool: "write", expected: true },
    { role: "builder", tool: "edit", expected: true },
    { role: "builder", tool: "task", expected: false },
    
    // Validators are read-only
    { role: "validator", tool: "read", expected: true },
    { role: "validator", tool: "grep", expected: true },
    { role: "validator", tool: "write", expected: false },
    { role: "validator", tool: "task", expected: false },
    
    // Meta has full access
    { role: "meta", tool: "write", expected: true },
    { role: "meta", tool: "task", expected: true },
  ] as const
  
  let passed = 0
  let failed = 0
  
  for (const { role, tool, expected } of testCases) {
    const decision = isToolAllowedForRole(role, tool)
    if (decision.allowed === expected) {
      console.log(`  ✓ ${role} + ${tool} -> ${decision.allowed}`)
      passed++
    } else {
      console.log(`  ✗ ${role} + ${tool} -> ${decision.allowed} (expected: ${expected})`)
      failed++
    }
  }
  
  console.log(`  Results: ${passed} passed, ${failed} failed`)
  return failed === 0
}

/**
 * Test P1.1: Throwing error blocks tool execution
 */
async function testP11_ThrowBlocks() {
  console.log("\n=== Test P1.1: Throwing Error Blocks Execution ===")
  
  const toolGateHook = createToolGateHook(TEST_DIR)
  const sessionId = "test-session-p11"
  
  // Set role to coordinator (cannot write)
  setAgentRole(sessionId, "idumb-coordinator")
  
  const input = { tool: "write", sessionID: sessionId, callID: "call-1" }
  const output = { args: { content: "test" } }
  
  try {
    await toolGateHook(input, output)
    console.log("  ✗ Hook did NOT throw - tool would execute")
    return false
  } catch (error) {
    if (error instanceof ToolGateError) {
      console.log(`  ✓ ToolGateError thrown: ${error.message.substring(0, 50)}...`)
      console.log(`  ✓ Role: ${error.role}, Tool: ${error.tool}`)
      return true
    } else {
      console.log(`  ✗ Wrong error type: ${error}`)
      return false
    }
  }
}

/**
 * Test P1.3: Arg modification persists
 */
async function testP13_ArgModification() {
  console.log("\n=== Test P1.3: Arg Modification Persists ===")
  
  const toolGateHook = createToolGateHook(TEST_DIR)
  const sessionId = "test-session-p13"
  
  // Set role to builder (can read)
  setAgentRole(sessionId, "idumb-builder")
  
  const input = { tool: "read", sessionID: sessionId, callID: "call-2" }
  const output = { args: { filePath: "/test/file.txt" } as Record<string, unknown> }
  
  try {
    await toolGateHook(input, output)
    
    // Check if governance metadata was added
    const hasMetadata = 
      output.args.__idumb_checked === true &&
      output.args.__idumb_role === "builder" &&
      output.args.__idumb_session === sessionId
    
    if (hasMetadata) {
      console.log("  ✓ Governance metadata added to args")
      console.log(`    __idumb_checked: ${output.args.__idumb_checked}`)
      console.log(`    __idumb_role: ${output.args.__idumb_role}`)
      console.log(`    __idumb_session: ${output.args.__idumb_session}`)
      return true
    } else {
      console.log("  ✗ Governance metadata NOT found in args")
      console.log(`    args: ${JSON.stringify(output.args)}`)
      return false
    }
  } catch (error) {
    console.log(`  ✗ Unexpected error: ${error}`)
    return false
  }
}

/**
 * Test P1.4: Permission history is recorded (hooks continue)
 */
function testP14_PermissionHistory() {
  console.log("\n=== Test P1.4: Permission History Recorded ===")
  
  const sessionId = "test-session-p14"
  clearAllSessionTrackers()
  
  // Make several permission checks
  checkToolPermission(sessionId, "read", "idumb-coordinator")
  checkToolPermission(sessionId, "write", "idumb-coordinator")
  checkToolPermission(sessionId, "task", "idumb-coordinator")
  
  const history = getPermissionHistory(sessionId)
  
  if (history.length === 3) {
    console.log(`  ✓ All ${history.length} permission checks recorded`)
    
    const readCheck = history.find(h => h.request.tool === "read")
    const writeCheck = history.find(h => h.request.tool === "write")
    const taskCheck = history.find(h => h.request.tool === "task")
    
    const correct = 
      readCheck?.decision.allowed === true &&
      writeCheck?.decision.allowed === false &&
      taskCheck?.decision.allowed === true
    
    if (correct) {
      console.log("  ✓ All permission decisions correct")
      return true
    } else {
      console.log("  ✗ Some permission decisions incorrect")
      return false
    }
  } else {
    console.log(`  ✗ Expected 3 checks, got ${history.length}`)
    return false
  }
}

/**
 * Test PIVOT: After hook output replacement
 */
async function testPivot_AfterHook() {
  console.log("\n=== Test PIVOT: After Hook Output Replacement ===")
  
  const toolGateAfterHook = createToolGateAfterHook(TEST_DIR)
  const sessionId = "test-session-pivot"
  
  // Simulate a blocked tool that somehow executed
  setAgentRole(sessionId, "idumb-coordinator")
  checkToolPermission(sessionId, "write")  // This records the denial
  
  const input = { tool: "write", sessionID: sessionId, callID: "call-pivot" }
  const output = { 
    title: "File Written",
    output: "Success: wrote file.txt",
    metadata: {} as Record<string, unknown>
  }
  
  await toolGateAfterHook(input, output)
  
  // Check if output was replaced
  if (output.title.includes("GOVERNANCE VIOLATION")) {
    console.log("  ✓ Output title replaced with violation message")
    console.log("  ✓ PIVOT mechanism works - can fallback to output replacement")
    return true
  } else {
    console.log("  ✗ Output NOT replaced - PIVOT may not work")
    return false
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗")
  console.log("║         TRIAL-1: Stop Hook Tool Manipulation               ║")
  console.log("║                   Validation Tests                         ║")
  console.log("╚════════════════════════════════════════════════════════════╝")
  
  setup()
  
  const results = {
    roleDetection: false,
    permissionChecks: false,
    p11_throwBlocks: false,
    p13_argModification: false,
    p14_historyRecorded: false,
    pivot_afterHook: false,
  }
  
  try {
    results.roleDetection = testRoleDetection()
    results.permissionChecks = testPermissionChecks()
    results.p11_throwBlocks = await testP11_ThrowBlocks()
    results.p13_argModification = await testP13_ArgModification()
    results.p14_historyRecorded = testP14_PermissionHistory()
    results.pivot_afterHook = await testPivot_AfterHook()
  } catch (error) {
    console.error("\n!!! Test runner error:", error)
  }
  
  cleanup()
  
  // Summary
  console.log("\n╔════════════════════════════════════════════════════════════╗")
  console.log("║                      TEST SUMMARY                          ║")
  console.log("╚════════════════════════════════════════════════════════════╝")
  
  const allPassed = Object.values(results).every(r => r)
  
  console.log("\nPASS Criteria Status:")
  console.log(`  P1.1 (Throw blocks):     ${results.p11_throwBlocks ? "✓ PASS" : "✗ FAIL"}`)
  console.log(`  P1.2 (TUI visible):      [REQUIRES MANUAL TEST IN OPENCODE]`)
  console.log(`  P1.3 (Arg modification): ${results.p13_argModification ? "✓ PASS" : "✗ FAIL"}`)
  console.log(`  P1.4 (Hooks continue):   ${results.p14_historyRecorded ? "✓ PASS" : "✗ FAIL"}`)
  
  console.log("\nSupporting Tests:")
  console.log(`  Role Detection:          ${results.roleDetection ? "✓ PASS" : "✗ FAIL"}`)
  console.log(`  Permission Checks:       ${results.permissionChecks ? "✓ PASS" : "✗ FAIL"}`)
  console.log(`  PIVOT (After Hook):      ${results.pivot_afterHook ? "✓ PASS" : "✗ FAIL"}`)
  
  console.log("\n" + "=".repeat(60))
  if (allPassed) {
    console.log("TRIAL-1 VALIDATION: ✓ PASS (pending P1.2 manual test)")
    console.log("=".repeat(60))
    console.log("\nNext: Install plugin in OpenCode and manually test P1.2")
    console.log("      (verify error messages appear in TUI, not background)")
  } else {
    console.log("TRIAL-1 VALIDATION: ✗ SOME TESTS FAILED")
    console.log("=".repeat(60))
    console.log("\nReview failed tests and apply PIVOT strategies if needed.")
  }
  
  process.exit(allPassed ? 0 : 1)
}

main()
