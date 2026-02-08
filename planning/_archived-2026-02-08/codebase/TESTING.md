# Testing Patterns

**Analysis Date:** 2026-02-06

## Test Framework

**Runner:**
- `ts-node` with ES module loader
- No Jest/Vitest - uses custom test scripts
- Config: None (uses `--loader ts-node/esm`)

**Assertion Library:**
- Native Node.js assertions (manual comparison)
- Console-based pass/fail reporting

**Run Commands:**
```bash
npm run test:t1       # Run TRIAL-1 validation tests
npm run test:t2       # Run TRIAL-2 validation tests (placeholder)
npx tsx tests/*.ts    # Run any test file directly
```

## Test File Organization

**Location:**
- All tests in `tests/` directory (excluded from TypeScript compilation)
- Pattern: `trial-*.ts` for micro-trial validation

**Naming:**
- `trial-{number}.ts` for numbered trial tests
- `trial-{name}.ts` for named feature tests

**Structure:**
```
tests/
├── trial-1.ts       # TRIAL-1: Stop Hook Tool Manipulation
└── trial-init.ts    # Scanner initialization validation
```

## Test Structure

**Suite Organization:**
```typescript
// From tests/trial-1.ts
// Test directory setup
const TEST_DIR = "/tmp/idumb-t1-test"

function setup() {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true })
  }
  mkdirSync(join(TEST_DIR, ".idumb/logs"), { recursive: true })
  clearAllSessionTrackers()
  console.log("Test setup complete")
}

function cleanup() {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true })
  }
  clearAllSessionTrackers()
}

// Individual test functions
function testRoleDetection() {
  console.log("\n=== Test: Role Detection ===")
  
  const testCases = [
    { name: "idumb-supreme-coordinator", expected: "coordinator" },
    // ... more cases
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

// Main runner
async function main() {
  setup()
  
  const results = {
    roleDetection: false,
    permissionChecks: false,
    // ...
  }
  
  try {
    results.roleDetection = testRoleDetection()
    results.permissionChecks = testPermissionChecks()
    // ...
  } catch (error) {
    console.error("\n!!! Test runner error:", error)
  }
  
  cleanup()
  
  // Summary
  const allPassed = Object.values(results).every(r => r)
  process.exit(allPassed ? 0 : 1)
}

main()
```

**Patterns:**
- Setup function creates temp directory structure
- Cleanup function removes test artifacts
- Each test function returns boolean (passed/failed)
- Main aggregates results and exits with code

## Mocking

**Framework:** Manual mocking via function injection

**Patterns:**
```typescript
// Direct function testing - no mocking needed
const toolGateHook = createToolGateHook(TEST_DIR)
const sessionId = "test-session-p11"

setAgentRole(sessionId, "idumb-coordinator")

const input = { tool: "write", sessionID: sessionId, callID: "call-1" }
const output = { args: { content: "test" } }

try {
  await toolGateHook(input, output)
  // Test assertions...
} catch (error) {
  // Error assertions...
}
```

**What to Mock:**
- Session IDs (use test-specific strings)
- Directories (use `/tmp/` for isolation)
- Agent names (use known patterns)

**What NOT to Mock:**
- Core logic functions (test directly)
- Zod schemas (use real validation)
- File system (use temp directories)

## Fixtures and Factories

**Test Data:**
```typescript
// Inline test cases array pattern
const testCases = [
  { name: "idumb-supreme-coordinator", expected: "coordinator" },
  { name: "idumb-high-governance", expected: "high-governance" },
  { name: "idumb-mid-coordinator", expected: "mid-coordinator" },
  { name: "idumb-validator", expected: "validator" },
  { name: "idumb-builder", expected: "builder" },
  { name: "idumb-researcher", expected: "researcher" },
  { name: "idumb-meta-builder", expected: "meta" },
  { name: "unknown-agent", expected: "researcher" },
] as const
```

**Location:**
- Test data defined inline in test files
- No separate fixtures directory

## Coverage

**Requirements:** None enforced (no coverage tooling configured)

**View Coverage:** Not available

## Test Types

**Unit Tests:**
- Direct function invocation
- Schema validation tests
- Permission matrix verification

**Integration Tests:**
- Hook chain testing (`tool.execute.before` -> `tool.execute.after`)
- State persistence round-trip

**E2E Tests:**
- Manual testing in OpenCode (documented in test output)
- P1.2 (TUI visibility) requires manual verification

## Trial Validation Approach

**PASS Criteria Pattern:**
Each trial defines explicit PASS criteria that must be validated:

```typescript
// From tests/trial-1.ts header
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
 */
```

**Test Function Naming:**
- `testP11_ThrowBlocks()` - Maps to P1.1 criterion
- `testP13_ArgModification()` - Maps to P1.3 criterion
- `testP14_PermissionHistory()` - Maps to P1.4 criterion

**PIVOT Testing:**
Tests include fallback mechanism validation:
```typescript
async function testPivot_AfterHook() {
  console.log("\n=== Test PIVOT: After Hook Output Replacement ===")
  // Tests that if throwing doesn't block, output replacement works
}
```

**Summary Output:**
```
╔════════════════════════════════════════════════════════════╗
║                      TEST SUMMARY                          ║
╚════════════════════════════════════════════════════════════╝

PASS Criteria Status:
  P1.1 (Throw blocks):     ✓ PASS
  P1.2 (TUI visible):      [REQUIRES MANUAL TEST IN OPENCODE]
  P1.3 (Arg modification): ✓ PASS
  P1.4 (Hooks continue):   ✓ PASS

Supporting Tests:
  Role Detection:          ✓ PASS
  Permission Checks:       ✓ PASS
  PIVOT (After Hook):      ✓ PASS
```

## Current Test Coverage

| Trial | Test File | Status | Notes |
|-------|-----------|--------|-------|
| T1 | `tests/trial-1.ts` | Implemented | 3/4 PASS criteria automated |
| T2 | `tests/trial-2.ts` | Placeholder | Script exists but no implementation |
| T-init | `tests/trial-init.ts` | Implemented | Scanner validation |
| T3-T8 | None | Not started | No test files |

## Common Patterns

**Async Testing:**
```typescript
async function testP11_ThrowBlocks() {
  const toolGateHook = createToolGateHook(TEST_DIR)
  
  try {
    await toolGateHook(input, output)
    console.log("  ✗ Hook did NOT throw - tool would execute")
    return false
  } catch (error) {
    if (error instanceof ToolGateError) {
      console.log(`  ✓ ToolGateError thrown`)
      return true
    } else {
      console.log(`  ✗ Wrong error type: ${error}`)
      return false
    }
  }
}
```

**Error Testing:**
```typescript
try {
  await hookFunction(input, output)
  // If we reach here, no error was thrown
  return false
} catch (error) {
  // Verify error type and properties
  if (error instanceof ExpectedError) {
    return true
  }
  return false
}
```

**Schema Validation Testing:**
```typescript
// From tests/trial-init.ts
const result = scanCodebase(directory)

// Validate against schema
const validated = ScanResultSchema.parse(result)

// Quick assertions
const checks = [
  ["project.name", validated.project.name === "idumb-plugin-v2"],
  ["project.stage", validated.project.stage === "brownfield"],
  ["has typescript", validated.project.languages.includes("typescript")],
] as const
```

## Adding New Tests

**For new trial (e.g., TRIAL-5):**

1. Create `tests/trial-5.ts`
2. Add npm script in `package.json`:
   ```json
   "test:t5": "node --loader ts-node/esm tests/trial-5.ts"
   ```
3. Follow structure:
   ```typescript
   /**
    * TRIAL-5 Validation Test
    * 
    * Tests [description]
    * 
    * PASS Criteria:
    * - P5.1: [criterion]
    * - P5.2: [criterion]
    */
   
   import { ... } from "../src/..."
   
   const TEST_DIR = "/tmp/idumb-t5-test"
   
   function setup() { ... }
   function cleanup() { ... }
   
   function testP51_Criterion() { ... }
   async function testP52_Criterion() { ... }
   
   async function main() {
     setup()
     // Run tests
     cleanup()
     process.exit(allPassed ? 0 : 1)
   }
   
   main()
   ```

---

*Testing analysis: 2026-02-06*
