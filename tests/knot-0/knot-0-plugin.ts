/**
 * Knot-0 Test Plugin
 * 
 * Minimal plugin to validate 6 core mechanisms before building real features.
 * Each test follows: Setup → Action → Expected → Anti-pattern → Measurement → Pivot
 * 
 * TESTS:
 * - 0A: Stop hook actually blocks (not just throws)
 * - 0B: Args modification persists to execution
 * - 0C: Message injection attended (BLOCKED - hook may not exist)
 * - 0D: Compaction context survives
 * - 0E: Custom tool selected by LLM
 * - 0F: Background spawn or sequential fallback
 * 
 * Created: 2026-02-06
 */

import type { Plugin } from "@opencode-ai/plugin"
import { writeFileSync, existsSync, mkdirSync, readFileSync } from "fs"
import { join } from "path"

// State file for cross-hook communication
interface Knot0State {
  tests: {
    "0A"?: { blocked: boolean; errorShown: boolean; fileCreated: boolean }
    "0B"?: { originalCommand: string; executedCommand: string; modified: boolean }
    "0C"?: { injected: boolean; attended: boolean } // BLOCKED: hook may not exist
    "0D"?: { anchorInjected: boolean; recalledAfterCompaction: boolean }
    "0E"?: { toolCalled: boolean; callCount: number }
    "0F"?: { spawnSuccess: boolean; fileWritten: boolean; resultRead: boolean }
  }
  lastUpdated: string
}

const STATE_FILE = "knot-0-state.json"

function getStateDir(directory: string): string {
  const dir = join(directory, ".idumb", "tests")
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

function readKnot0State(directory: string): Knot0State {
  const filePath = join(getStateDir(directory), STATE_FILE)
  if (existsSync(filePath)) {
    return JSON.parse(readFileSync(filePath, "utf-8"))
  }
  return { tests: {}, lastUpdated: new Date().toISOString() }
}

function writeKnot0State(directory: string, state: Knot0State): void {
  const filePath = join(getStateDir(directory), STATE_FILE)
  state.lastUpdated = new Date().toISOString()
  writeFileSync(filePath, JSON.stringify(state, null, 2))
}

function logKnot0(directory: string, message: string): void {
  const logPath = join(getStateDir(directory), "knot-0.log")
  const timestamp = new Date().toISOString()
  const entry = `[${timestamp}] ${message}\n`
  writeFileSync(logPath, entry, { flag: "a" })
}

/**
 * Knot-0 Test Plugin
 */
export const Knot0Plugin: Plugin = async ({ directory }) => {
  logKnot0(directory, "=".repeat(60))
  logKnot0(directory, "Knot-0 Test Plugin initializing...")
  logKnot0(directory, `Directory: ${directory}`)
  
  // Initialize state
  const initialState = readKnot0State(directory)
  if (Object.keys(initialState.tests).length === 0) {
    logKnot0(directory, "Creating fresh test state")
  }
  
  return {
    // ========================================================================
    // KNOT 0A: Stop Hook Actually Stops
    // ========================================================================
    
    "tool.execute.before": async (input, output) => {
      const tool = input.tool
      const args = output.args as Record<string, unknown>
      
      // 0A TEST: Attempt to write to .knot0a-test file
      if (tool === "write" && typeof args.filePath === "string" && args.filePath.includes(".knot0a-test")) {
        logKnot0(directory, `0A: Intercepted write to ${args.filePath} - BLOCKING`)
        
        const state = readKnot0State(directory)
        state.tests["0A"] = {
          blocked: true,
          errorShown: false, // Will be verified manually
          fileCreated: false  // Will check after
        }
        writeKnot0State(directory, state)
        
        // THROW to block - this is the test
        throw new Error("KNOT-0A: Write blocked. If you see this message, the stop hook is working correctly.")
      }
      
      // 0B TEST: Modify args for bash commands containing "knot0b"
      if (tool === "bash" && typeof args.command === "string" && args.command.includes("knot0b")) {
        const originalCommand = args.command
        const modifiedCommand = `${args.command} && echo "KNOT0B_MODIFIED"`
        
        logKnot0(directory, `0B: Modifying command from "${originalCommand}" to "${modifiedCommand}"`)
        
        const state = readKnot0State(directory)
        state.tests["0B"] = {
          originalCommand,
          executedCommand: modifiedCommand,
          modified: true
        }
        writeKnot0State(directory, state)
        
        // MODIFY args - this tests if modification persists
        output.args.command = modifiedCommand
      }
    },
    
    "tool.execute.after": async (input, output) => {
      const tool = input.tool
      const result = output.output // SDK uses 'output' not 'result'
      
      // 0B VERIFICATION: Check if modification persisted
      if (tool === "bash" && typeof result === "string" && result.includes("KNOT0B_MODIFIED")) {
        logKnot0(directory, "0B: PASS - Args modification persisted to execution")
        
        const state = readKnot0State(directory)
        if (state.tests["0B"]) {
          state.tests["0B"].modified = true
        }
        writeKnot0State(directory, state)
      }
      
      // 0A VERIFICATION: Check if file was created despite blocking
      // Note: We can't check input.args here (doesn't exist in after hook)
      // Instead, check the output.title for write operations
      if (tool === "write" && output.title && output.title.includes(".knot0a-test")) {
        // This should NOT execute if blocking worked
        logKnot0(directory, "0A: FAIL - Write executed despite throw")
        
        const state = readKnot0State(directory)
        if (state.tests["0A"]) {
          state.tests["0A"].blocked = false
        }
        writeKnot0State(directory, state)
      }
    },
    
    // ========================================================================
    // KNOT 0D: Compaction Context Survives
    // ========================================================================
    
    "experimental.session.compacting": async (_input, output) => {
      logKnot0(directory, "0D: Compaction hook fired - injecting test anchor")
      
      // Inject a specific, testable anchor
      const testAnchor = `
## KNOT-0D TEST ANCHOR
DECISION: The database chosen for this project is PostgreSQL, NOT MySQL.
This is a test anchor. If asked "what database", answer "PostgreSQL".
UNIQUE_ID: KNOT0D-${Date.now()}
`
      
      output.context.push(testAnchor)
      
      const state = readKnot0State(directory)
      state.tests["0D"] = {
        anchorInjected: true,
        recalledAfterCompaction: false // Will verify via conversation
      }
      writeKnot0State(directory, state)
      
      logKnot0(directory, "0D: Test anchor injected into compaction context")
    },
    
    // ========================================================================
    // KNOT 0E: Custom Tool Selected
    // ========================================================================
    
    tool: {
      /**
       * Test tool for 0E: Custom tool selection
       * If LLM calls this when asked about "governance state", test passes.
       */
      knot0e_status: {
        description: "Get the current Knot-0 test status and governance state. Use this tool when asked about governance, test status, or Knot-0 results.",
        args: {},
        async execute(_args: Record<string, unknown>, context: { directory: string }) {
          logKnot0(context.directory, "0E: PASS - Custom tool was selected by LLM")
          
          const state = readKnot0State(context.directory)
          if (!state.tests["0E"]) {
            state.tests["0E"] = { toolCalled: true, callCount: 1 }
          } else {
            state.tests["0E"].toolCalled = true
            state.tests["0E"].callCount++
          }
          writeKnot0State(context.directory, state)
          
          return `
## Knot-0 Test Status

### 0A: Stop Hook Blocks
- ${state.tests["0A"]?.blocked ? "PASS" : "NOT TESTED"}: Error thrown on forbidden write
- File created: ${state.tests["0A"]?.fileCreated ? "FAIL" : "N/A"}

### 0B: Args Modification
- ${state.tests["0B"]?.modified ? "PASS" : "NOT TESTED"}: Command modified and executed

### 0C: Message Injection (BLOCKED)
- Status: Hook may not exist in OpenCode

### 0D: Compaction Survival
- Anchor injected: ${state.tests["0D"]?.anchorInjected ? "YES" : "NO"}
- Recall verified: ${state.tests["0D"]?.recalledAfterCompaction ? "YES" : "PENDING"}

### 0E: Custom Tool Selection
- Tool called: YES (this message proves it)
- Call count: ${state.tests["0E"]?.callCount || 1}

### 0F: Background Spawn
- Status: ${state.tests["0F"]?.spawnSuccess ? "TESTED" : "NOT TESTED"}

**Last Updated:** ${state.lastUpdated}
`
        }
      },
      
      /**
       * Manual verification tool for 0D
       */
      knot0d_verify: {
        description: "Verify that the KNOT-0D test anchor survived compaction. Call this after compaction to record success.",
        args: {},
        async execute(_args: Record<string, unknown>, context: { directory: string }) {
          logKnot0(context.directory, "0D: VERIFY called - marking recall as successful")
          
          const state = readKnot0State(context.directory)
          if (state.tests["0D"]) {
            state.tests["0D"].recalledAfterCompaction = true
          }
          writeKnot0State(context.directory, state)
          
          return "KNOT-0D verification recorded. If you correctly remembered PostgreSQL as the chosen database, the test PASSED."
        }
      },
      
      /**
       * Run all knot-0 tests in sequence
       */
      knot0_run_tests: {
        description: "Run the Knot-0 validation test suite. This will guide you through testing each mechanism.",
        args: {},
        async execute(_args: Record<string, unknown>, context: { directory: string }) {
          logKnot0(context.directory, "Running Knot-0 test suite...")
          
          return `
## Knot-0 Test Suite

Run these tests IN ORDER:

### Test 0A: Stop Hook Blocks
1. Try to create a file: \`write .knot0a-test "test content"\`
2. **EXPECTED:** Error message appears, file NOT created
3. Verify: \`ls .knot0a-test\` should show "No such file"

### Test 0B: Args Modification
1. Run: \`bash echo "knot0b test"\`
2. **EXPECTED:** Output includes "KNOT0B_MODIFIED"
3. If you see it, modification persisted

### Test 0D: Compaction Survival
1. Fill context until compaction triggers (or wait)
2. After compaction, ask: "What database did we decide to use?"
3. **EXPECTED:** Answer is "PostgreSQL" (not MySQL)
4. Run: \`knot0d_verify\` to record success

### Test 0E: Custom Tool Selection
1. Ask: "What is the current governance state?"
2. **EXPECTED:** I call \`knot0e_status\` (not read files)
3. Already proven if you're reading this!

### Test 0F: Background Spawn (SKIP for now)
- Requires SDK client.session.create()
- Will test when T4 is implemented

After running tests, call \`knot0e_status\` for results.
`
        }
      }
    },
    
    // ========================================================================
    // SESSION EVENTS (for logging/debugging)
    // ========================================================================
    
    event: async ({ event }) => {
      const eventType = event.type
      logKnot0(directory, `Event: ${eventType}`)
      
      if (eventType === "session.compacted") {
        logKnot0(directory, "0D: Session compacted - anchor survival test begins")
      }
    }
  }
}

export default Knot0Plugin
