# iDumb v2 - Gaps and Issues Analysis

**Version:** 2.2.0
**Analysis Date:** 2026-02-07
**Purpose:** Comprehensive gaps analysis with prioritized action items

---

## Executive Summary

iDumb v2 has **solid foundations** (294/294 tests passing, zero TypeScript errors) but faces **critical gaps** in live validation and several areas needing depth.

### Severity Distribution

| Severity | Count | Examples |
|----------|-------|----------|
| **CRITICAL** | 3 | Phase 2B not started, no baseline, anchor survival untested |
| **HIGH** | 5 | No regression suite, LLM read order unknown, 3 incomplete integrations |
| **MEDIUM** | 7 | Large files, shallow implementations, documentation gaps |
| **LOW** | 4 | Dashboard undocumented, module system not implemented |
| **TOTAL** | **19** | All identified gaps |

---

## Critical Gaps (Block Progress)

### Gap #1: Phase 2B - Live Validation NOT STARTED

**Severity:** CRITICAL
**Impact:** We don't know if the plugin works in OpenCode
**File:** `planning/PHASE-COMPLETION.md` (lines 89-108)

#### What's Missing

1. **Plugin not loaded in OpenCode**
   - Custom tools may not appear in tool list
   - Hooks may not fire (OpenCode version incompatibility)
   - Agent identity capture may fail

2. **No anchor survival validation**
   - Core feature (context persistence across compaction) untested
   - Compaction hook may not inject anchors correctly
   - Agent may not reference injected anchors

3. **No baseline measurement**
   - Can't claim "60% improvement" without baseline
   - Don't know current agent behavior without plugin
   - Success criteria undefined

#### Required Actions

```bash
# Step 1: Load plugin in OpenCode
1. Ensure plugin builds: npm run build
2. Load in OpenCode (check .opencode/plugins/)
3. Verify all 6 hooks fire (check .idumb/governance/hook-verification.log)
4. Verify all 5 tools appear (check /tools command)

# Step 2: Create baseline measurement
1. Create stress test scenario (20+ compactions)
2. Run WITHOUT plugin
3. Measure: phase awareness, chain integrity, stale detection
4. Document baseline metrics

# Step 3: Run live validation
1. Run same scenario WITH plugin
2. Measure same metrics
3. Compare to baseline
4. Target: 60% improvement
```

#### Success Criteria

- [ ] Plugin loads without errors in OpenCode
- [ ] All 6 hooks fire (verified in logs)
- [ ] All 5 tools appear in tool list
- [ ] Anchors survive compaction (agent references them)
- [ ] Baseline established (metrics documented)
- [ ] 60% improvement measured (or explain why not)

#### Estimated Effort

- **Setup:** 2-4 hours (load plugin, debug any issues)
- **Baseline:** 4-8 hours (create scenario, run tests, document)
- **Validation:** 4-8 hours (run with plugin, compare metrics)
- **Total:** 10-20 hours

---

### Gap #2: No Baseline Measurement

**Severity:** CRITICAL
**Impact:** Can't prove plugin effectiveness
**Reference:** `planning/GOVERNANCE.md` (Gap G1, line 210)

#### What's Missing

- **No metrics for agent behavior without plugin**
  - How often do agents lose track of current phase?
  - How often do agents reference stale context?
  - How often do chains break without detection?

- **No measurement methodology**
  - What to measure?
  - How to measure?
  - How to compare?

- **No control group**
  - Can't run A/B tests
  - Can't attribute improvements to plugin

#### Required Actions

```typescript
// Create baseline test suite: tests/baseline.test.ts

interface BaselineMetrics {
  // Phase awareness
  correctPhaseIdentifications: number
  incorrectPhaseIdentifications: number
  phaseAwarenessScore: number // correct / (correct + incorrect)

  // Chain integrity
  chainBreaksDetected: number
  chainBreaksMissed: number
  chainIntegrityScore: number

  // Stale detection
  staleContextCorrectlyDiscarded: number
  staleContextIncorrectlyUsed: number
  staleDetectionScore: number

  // Task completion
  tasksCompleted: number
  tasksAbandoned: number
  completionRate: number

  // Time metrics
  averageTaskCompletionTime: number
  averageSessionLength: number
}

async function runBaselineTest(scenario: StressTestScenario): Promise<BaselineMetrics> {
  // Run scenario WITHOUT plugin
  // Track all agent actions
  // Calculate metrics
  // Return baseline
}
```

#### Stress Test Scenario

```markdown
# Baseline Stress Test Scenario

## Setup
- 20+ compactions triggered
- Continuous feature requests
- Mid-stream requirement changes
- Mixed chains of thought

## Tasks
1. Create authentication system
2. Switch to payment processing (mid-stream)
3. Return to authentication (context switch)
4. Add 2FA (requirement change)
5. Implement user profile (new feature)
6. Refactor auth (context drift)
7. Add password reset (chain break)

## Measurements
- Did agent correctly identify current phase after each switch?
- Did agent detect stale context and discard it?
- Did agent reference correct planning artifacts despite noise?
- Did agent stop and report when chain broke?
- Did agent delegate correctly (coordinators didn't write)?

## Expected Baseline (Hypothesis)
- Phase awareness: ~40% (agents often confused after switches)
- Stale detection: ~20% (agents often use stale context)
- Chain integrity: ~30% (chains break, agents don't detect)
- Task completion: ~50% (many tasks abandoned)
```

#### Success Criteria

- [ ] Baseline test suite created
- [ ] Baseline metrics documented
- [ ] Scenario reproducible
- [ ] Metrics comparable (same scenario with/without plugin)

#### Estimated Effort

- **Test suite:** 4-6 hours
- **Scenario design:** 2-4 hours
- **Baseline runs:** 2-4 hours
- **Documentation:** 2-4 hours
- **Total:** 10-18 hours

---

### Gap #3: Anchor Survival Untested

**Severity:** CRITICAL
**Impact:** Core feature may not work
**Reference:** `planning/GOVERNANCE.md` (Gap G2, line 212)

#### What's Missing

- **No live validation of compaction hook**
  - Does `experimental.session.compacting` actually fire?
  - Are anchors selected correctly?
  - Is injection budget-capped?

- **No validation of agent behavior**
  - Does agent reference injected anchors?
  - Does anchor improve task completion?
  - Does agent detect context survived?

#### Required Actions

```typescript
// Create anchor survival test: tests/anchor-survival.test.ts

async function testAnchorSurvival() {
  // 1. Create anchor
  await idumb_anchor({
    action: "add",
    type: "decision",
    content: "Use OAuth2 for enterprise SSO",
    priority: "critical",
  })

  // 2. Fill context (trigger compaction threshold)
  for (let i = 0; i < 20; i++) {
    await read({ file_path: `large-file-${i}.md` })
  }

  // 3. Trigger compaction
  // OpenCode auto-compacts when token limit reached

  // 4. Ask agent about decision
  const agentResponse = await ask(
    "What authentication method did we decide for enterprise SSO?"
  )

  // 5. Verify agent referenced anchor
  assert(agentResponse.includes("OAuth2"), "Agent should reference anchor")
}
```

#### Test Cases

| Test | Purpose | Success |
|------|---------|---------|
| Create anchor → compact → reference | Basic survival | Agent mentions anchor content |
| Multiple anchors → compact → selective | Priority selection | Agent references critical > high > normal |
| Stale anchor → compact → discard | Freshness filtering | Agent doesn't reference 48h+ anchor |
| Budget cap → many anchors | Truncation | Only top N anchors injected (≤500 tokens) |

#### Success Criteria

- [ ] Compaction hook fires (verified in logs)
- [ ] Anchors selected correctly (priority × freshness)
- [ ] Agent references anchor after compaction
- [ ] Stale anchors discarded
- [ ] Budget cap enforced

#### Estimated Effort

- **Test suite:** 3-5 hours
- **Live validation:** 2-4 hours
- **Documentation:** 1-2 hours
- **Total:** 6-11 hours

---

## High-Severity Gaps (Important for Quality)

### Gap #4: No Automated Regression Suite

**Severity:** HIGH
**Impact:** Bugs can reappear undetected
**Reference:** `planning/GOVERNANCE.md` (Gap G10, line 219)

#### What's Missing

- **No regression test automation**
  - Tests exist but not run as suite
  - No CI/CD integration
  - No regression prevention

- **No test history**
  - Don't know which tests catch which bugs
  - Can't track flaky tests
  - Can't measure test effectiveness

#### Required Actions

```bash
# 1. Create regression suite script
# scripts/regression.sh

#!/bin/bash
echo "Running iDumb v2 Regression Suite"

# Run all tests
npm test

# Capture results
RESULTS=$?

# If tests fail, block commit
if [ $RESULTS -ne 0 ]; then
  echo "❌ Regression tests failed"
  exit 1
fi

echo "✅ All regression tests passed"
exit 0
```

```json
// 2. Add to package.json scripts
{
  "scripts": {
    "regression": "bash scripts/regression.sh",
    "pre-commit": "npm run regression",
    "pre-push": "npm run regression"
  }
}
```

```yaml
# 3. Add GitHub Actions workflow
# .github/workflows/regression.yml

name: Regression Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run regression
```

#### Test Suite Organization

```
tests/
├── regression/
│   ├── critical/          # Block release if fail
│   │   ├── tool-gate.test.ts
│   │   ├── compaction.test.ts
│   │   └── persistence.test.ts
│   ├── high/              # Warn if fail
│   │   ├── task.test.ts
│   │   ├── delegation.test.ts
│   │   └── planning-registry.test.ts
│   └── medium/            # Log if fail
│       ├── init.test.ts
│       └── message-transform.test.ts
└── integration/           # Future: live OpenCode tests
    └── live-validation.test.ts
```

#### Success Criteria

- [ ] Regression script created
- [ ] CI/CD integration working
- [ ] Tests run on every commit
- [ ] Failed tests block commits
- [ ] Test history tracked

#### Estimated Effort

- **Script creation:** 2-3 hours
- **CI/CD setup:** 2-4 hours
- **Test organization:** 3-5 hours
- **Documentation:** 1-2 hours
- **Total:** 8-14 hours

---

### Gap #5: LLM Read Order Unknown

**Severity:** HIGH
**Impact:** Building message transform on assumption
**Reference:** `planning/GOVERNANCE.md` (Gap G3, line 213)

#### What's Missing

- **No empirical data on LLM read order**
  - Does LLM read first message or last after compaction?
  - Does injection position matter?
  - Does message transform help or confuse?

- **Phase 5 blocked on A/B test**
  - Can't implement message transform without data
  - Can't optimize context injection
  - Risk of making things worse

#### Required Actions

```typescript
// Create A/B test: tests/read-order-ab.test.ts

interface ReadOrderTestResult {
  injectionPosition: "start" | "end"
  markerReferenced: boolean
  agentResponse: string
  timeToReference: number // turns until reference
}

async function runReadOrderABTest(): Promise<ReadOrderTestResult[]> {
  const results: ReadOrderTestResult[] = []

  // Test A: Inject marker at START
  results.push({
    injectionPosition: "start",
    markerReferenced: await testMarkerReference("start"),
    agentResponse: "", // captured during test
    timeToReference: 0, // measured during test
  })

  // Test B: Inject marker at END
  results.push({
    injectionPosition: "end",
    markerReferenced: await testMarkerReference("end"),
    agentResponse: "",
    timeToReference: 0,
  })

  return results
}

async function testMarkerReference(position: "start" | "end"): Promise<boolean> {
  // 1. Create unique marker
  const marker = `MARKER-${position}-${Date.now()}`

  // 2. Inject marker at position
  // (via compaction hook modification)

  // 3. Fill context → trigger compaction

  // 4. Ask agent to reference marker
  const response = await ask(`What is the marker I gave you?`)

  // 5. Check if agent referenced correct marker
  return response.includes(marker)
}
```

#### Test Design

| Variable | Test A | Test B | Test C |
|----------|--------|--------|--------|
| Marker position | Start | End | Middle |
| Context size | Large | Large | Large |
| Compaction | Yes | Yes | Yes |
| Expected | Agent references start marker | Agent references end marker | Agent references middle marker |

#### Success Criteria

- [ ] A/B test suite created
- [ ] Read order determined (start, end, or both)
- [ ] Results documented
- [ ] Message transform implemented based on data
- [ ] Phase 5 unblocked

#### Estimated Effort

- **Test suite:** 4-6 hours
- **A/B runs:** 4-8 hours (multiple runs for statistical significance)
- **Analysis:** 2-4 hours
- **Documentation:** 2-3 hours
- **Total:** 12-21 hours

---

### Gap #6: GSD Integration Incomplete

**Severity:** HIGH
**Impact:** Can't enforce GSD workflow
**Reference:** `CLAUDE-ARCHITECTURE.md` (Framework Integration section)

#### What's Missing

1. **No automatic phase detection**
   - Agent must manually declare phase
   - No enforcement based on task state
   - Risk of phase confusion

2. **No atomic commit tracking**
   - Commits not linked to plan items
   - No validation that commits match plan
   - Can't measure plan adherence

3. **No validation auto-run**
   - Validation checks not automatic
   - Agent must manually run validation
   - Risk of skipping validation

#### Required Actions

```typescript
// 1. Add phase detection to StateManager

interface PhaseDetection {
  currentPhase: "research" | "planning" | "execution" | "validation"
  phaseConfidence: number // 0-1
  phaseReason: string // Why we think we're in this phase
}

function detectPhase(store: TaskStore): PhaseDetection {
  const activeEpic = store.epics.find(e => e.id === store.activeEpicId)
  if (!activeEpic) {
    return { currentPhase: "planning", phaseConfidence: 0.5, phaseReason: "No active epic" }
  }

  const activeTask = activeEpic.tasks.find(t => t.status === "active")
  if (!activeTask) {
    return { currentPhase: "planning", phaseConfidence: 0.7, phaseReason: "No active task" }
  }

  // Check task category
  if (activeTask.category === "research") {
    return { currentPhase: "research", phaseConfidence: 0.9, phaseReason: "Research task active" }
  }

  // Check if task has evidence (completed)
  if (activeTask.status === "completed" && activeTask.evidence) {
    return { currentPhase: "validation", phaseConfidence: 0.8, phaseReason: "Task completed with evidence" }
  }

  // Default to execution
  return { currentPhase: "execution", phaseConfidence: 0.7, phaseReason: "Active task in progress" }
}

// 2. Add atomic commit tracking

interface CommitRecord {
  commitHash: string
  taskIds: string[] // Which tasks this commit fulfills
  planItemId: string | null // Which plan item this validates
  timestamp: number
  filesModified: string[]
}

function linkCommitToPlan(commitHash: string, taskIds: string[]): void {
  // Get active plan
  const plan = loadActivePlan()

  // Find plan items linked to tasks
  const relevantItems = plan.items.filter(item =>
    item.linkedTaskIds.some(id => taskIds.includes(id))
  )

  // Record commit
  const commit: CommitRecord = {
    commitHash,
    taskIds,
    planItemId: relevantItems[0]?.id || null,
    timestamp: Date.now(),
    filesModified: getModifiedFiles(commitHash),
  }

  // Persist
  saveCommitRecord(commit)

  // Update plan item status
  if (commit.planItemId) {
    plan.items.find(i => i.id === commit.planItemId)!.status = "completed"
    savePlan(plan)
  }
}

// 3. Add validation auto-run

async function autoRunValidation(toolName: string, toolOutput: string): Promise<void> {
  // Skip non-write tools
  if (!["write", "edit"].includes(toolName)) return

  // Get active task
  const activeTask = getActiveTask()
  if (!activeTask) return

  // Check if task has validation criteria
  if (!activeTask.validationCriteria) return

  // Run validation
  const validationResult = await runValidation(activeTask.validationCriteria)

  // Update task with result
  activeTask.validationResult = validationResult
  saveTask(activeTask)

  // Log result
  log.info(`Validation ${validationResult.passed ? "passed" : "failed"}`, {
    task: activeTask.id,
    criteria: activeTask.validationCriteria,
    result: validationResult,
  })
}
```

#### Success Criteria

- [ ] Phase detection implemented
- [ ] Atomic commit tracking working
- [ ] Validation auto-run on writes
- [ ] GSD workflow enforced
- [ ] Plan adherence measurable

#### Estimated Effort

- **Phase detection:** 4-6 hours
- **Commit tracking:** 6-8 hours
- **Validation auto-run:** 4-6 hours
- **Integration:** 3-5 hours
- **Total:** 17-25 hours

---

### Gap #7: Code Quality Not Enforced

**Severity:** HIGH
**Impact:** Large files accumulate, technical debt grows
**Reference:** `CLAUDE-ARCHITECTURE.md` (Files over 500 LOC)

#### What's Missing

1. **No file size enforcement**
   - 10 files above 500 LOC
   - No automated checks
   - Files continue growing

2. **No complexity monitoring**
   - Cyclomatic complexity not tracked
   - No refactoring triggers
   - Debt accumulates silently

3. **No duplication detection**
   - Code overlap not measured
   - Copy-paste not detected
   - Maintenance burden increases

#### Required Actions

```typescript
// 1. Add file size enforcement to pre-commit hook

// scripts/pre-commit-check.ts

interface FileSizeViolation {
  file: string
  loc: number
  maxLoc: number
  severity: "error" | "warning"
}

function checkFileSizes(): FileSizeViolation[] {
  const violations: FileSizeViolation[] = []

  // Check all TypeScript files
  const files = glob("src/**/*.ts")

  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8")
    const loc = content.split("\n").length

    if (loc > 500) {
      violations.push({
        file,
        loc,
        maxLoc: 500,
        severity: loc > 1000 ? "error" : "warning",
      })
    }
  }

  return violations
}

// 2. Add complexity monitoring

interface ComplexityReport {
  file: string
  function: string
  complexity: number
  maxComplexity: number
}

function measureComplexity(): ComplexityReport[] {
  // Use eslint-plugin-complexity or similar
  // Return functions with complexity > 10
}

// 3. Add duplication detection

interface DuplicationReport {
  file1: string
  file2: string
  lines: number
  similarity: number // 0-1
}

function detectDuplication(): DuplicationReport[] {
  // Use jsinspect or similar
  // Return code blocks with > 80% similarity
}
```

#### Enforcement Rules

| Rule | Threshold | Action |
|------|-----------|--------|
| File size | >500 LOC | Warning |
| File size | >1000 LOC | Error (block commit) |
| Cyclomatic complexity | >10 | Warning |
| Cyclomatic complexity | >20 | Error (block commit) |
| Code duplication | >80% similarity | Warning |
| Code duplication | >90% similarity | Error (block commit) |

#### Success Criteria

- [ ] Pre-commit hooks created
- [ ] File size enforced
- [ ] Complexity monitored
- [ ] Duplication detected
- [ ] Large files refactored (<500 LOC each)

#### Estimated Effort

- **Pre-commit hooks:** 3-5 hours
- **Complexity measurement:** 4-6 hours
- **Duplication detection:** 4-6 hours
- **Refactoring large files:** 20-30 hours (10 files × 2-3 hours each)
- **Total:** 31-47 hours

---

### Gap #8: Planning Artifact Lifecycle Not Enforced

**Severity:** MEDIUM (but impacts HIGH)
**Impact:** Stale artifacts may mislead agents
**Reference:** `schemas/planning-registry.ts` (729 LOC)

#### What's Missing

1. **No staleness enforcement in tool-gate**
   - Stale artifacts can be read
   - Agents may use outdated information
   - Risk of hallucination

2. **No automatic staleness detection**
   - Staleness based on chain position, not time
   - Detection logic exists but not enforced
   - Manual checks only

3. **No outlier resolution workflow**
   - Unregistered artifacts detected
   - No automated resolution
   - Manual user action required

#### Required Actions

```typescript
// 1. Add staleness check to tool-gate

async function checkArtifactStaleState(artifact: PlanningArtifact): Promise<void> {
  // Check if artifact is stale by chain position
  const isStale = isArtifactStaleByChainPosition(artifact)

  if (isStale) {
    // Warn agent
    log.warn(`Artifact ${artifact.path} is stale`, {
      artifactId: artifact.id,
      chainPosition: artifact.chainId,
      reason: "Chain neighbors have moved forward",
    })

    // Add staleness warning to context
    addStalenessWarning({
      path: artifact.path,
      reason: "Chain-position stale",
      action: "Review chain history before using",
    })
  }
}

// 2. Add automatic staleness detection

async function detectStaleArtifacts(): Promise<PlanningArtifact[]> {
  const registry = loadPlanningRegistry()
  const stale: PlanningArtifact[] = []

  for (const artifact of registry.artifacts) {
    if (isArtifactStaleByChainPosition(artifact)) {
      stale.push(artifact)
    }
  }

  return stale
}

// 3. Add outlier resolution suggestions

async function resolveOutliers(outliers: OutlierEntry[]): Promise<void> {
  for (const outlier of outliers) {
    // Detect artifact type
    const type = detectArtifactType(outlier.path)

    if (type) {
      // Suggest registration
      suggestRegistration({
        path: outlier.path,
        type,
        tier: ARTIFACT_TIER_MAP[type],
        chainId: suggestChainId(outlier.path),
      })
    } else {
      // Suggest deletion or move
      suggestCleanup({
        path: outlier.path,
        action: "delete or move to archive",
        reason: "Unrecognized artifact type",
      })
    }
  }
}
```

#### Success Criteria

- [ ] Staleness checked on every read
- [ ] Stale artifacts flagged to agents
- [ ] Outliers auto-resolved or suggested
- [ ] Planning registry kept clean

#### Estimated Effort

- **Staleness enforcement:** 4-6 hours
- **Auto-detection:** 3-5 hours
- **Outlier resolution:** 4-6 hours
- **Integration:** 2-3 hours
- **Total:** 13-20 hours

---

## Medium-Severity Gaps (Quality of Life)

### Gap #9: Large Files Need Splitting

**Severity:** MEDIUM
**Impact:** Maintenance burden, hard to understand
**Reference:** `CLAUDE-ARCHITECTURE.md` (10 files >500 LOC)

#### Files to Split

| File | Current LOC | Target | Priority |
|------|-------------|--------|----------|
| `templates.ts` | 1510 | 3-4 files × ~400 LOC | HIGH |
| `tools/write.ts` | 1174 | 2-3 files × ~400 LOC | HIGH |
| `tools/task.ts` | 826 | 2 files × ~400 LOC | MEDIUM |
| `schemas/planning-registry.ts` | 729 | 2 files × ~350 LOC | MEDIUM |
| `lib/code-quality.ts` | 701 | 2 files × ~350 LOC | MEDIUM |
| `tools/read.ts` | 568 | 2 files × ~280 LOC | LOW |
| `dashboard/backend/server.ts` | 563 | 2 files × ~280 LOC | LOW |
| `lib/entity-resolver.ts` | 545 | 2 files × ~270 LOC | LOW |
| `schemas/task.ts` | 530 | 2 files × ~260 LOC | LOW |
| `tools/codemap.ts` | 521 | 2 files × ~260 LOC | LOW |

#### Splitting Strategy

```typescript
// Example: Split templates.ts

// templates/agents/coordinator.ts
export function getCoordinatorAgent(): string { ... }

// templates/agents/investigator.ts
export function getInvestigatorAgent(): string { ... }

// templates/agents/executor.ts
export function getExecutorAgent(): string { ... }

// templates/commands/init.ts
export function getInitCommand(): string { ... }

// templates/index.ts
export { getCoordinatorAgent } from "./agents/coordinator.js"
export { getInvestigatorAgent } from "./agents/investigator.js"
export { getExecutorAgent } from "./agents/executor.js"
export { getInitCommand } from "./commands/init.js"
```

#### Success Criteria

- [ ] All files <500 LOC
- [ ] Exports preserved (no breaking changes)
- [ ] Tests still pass
- [ ] Documentation updated

#### Estimated Effort

- **HIGH priority (3 files):** 6-10 hours
- **MEDIUM priority (3 files):** 6-9 hours
- **LOW priority (4 files):** 8-12 hours
- **Total:** 20-31 hours

---

### Gap #10: Dashboard Undocumented

**Severity:** LOW
**Impact:** Can't use dashboard
**Reference:** `src/dashboard/` (563 LOC backend + React frontend)

#### What's Missing

1. **No API documentation**
   - Endpoints not documented
   - Request/response formats unclear
   - Authentication not explained

2. **No deployment guide**
   - How to run dashboard
   - How to configure
   - How to integrate with OpenCode

3. **No user manual**
   - How to use dashboard
   - What features are available
   - How to interpret data

#### Required Actions

```markdown
# Create: docs/dashboard/API.md

# iDumb Dashboard API

## Endpoints

### GET /api/status
Returns current governance state.

**Response:**
```json
{
  "version": "2.2.0",
  "activeTask": { "id": "...", "name": "..." },
  "anchors": [...],
  "delegations": [...]
}
```

### GET /api/tasks
Returns task hierarchy.

**Response:**
```json
{
  "epics": [...],
  "activeEpicId": "...",
  "totalTasks": 42
}
```

### POST /api/anchors
Create new anchor.

**Request:**
```json
{
  "type": "decision",
  "content": "Use OAuth2",
  "priority": "critical"
}
```
```

```markdown
# Create: docs/dashboard/DEPLOYMENT.md

# iDumb Dashboard Deployment

## Development

```bash
cd src/dashboard/frontend
npm install
npm run dev
```

Dashboard available at http://localhost:5173

## Production

```bash
npm run build
npm run start:dashboard
```

Dashboard available at http://localhost:3000

## Configuration

Environment variables:
- `DASHBOARD_PORT` - Port (default: 3000)
- `LOG_LEVEL` - Logging level (default: info)
```

#### Success Criteria

- [ ] API documentation created
- [ ] Deployment guide created
- [ ] User manual created
- [ ] Dashboard usable

#### Estimated Effort

- **API docs:** 3-4 hours
- **Deployment guide:** 2-3 hours
- **User manual:** 3-4 hours
- **Total:** 8-11 hours

---

## Summary and Prioritization

### Immediate Actions (This Week)

1. **Phase 2B - Live Validation** (CRITICAL)
   - Load plugin in OpenCode
   - Establish baseline
   - Validate anchor survival
   - **Effort:** 10-20 hours

2. **Baseline Measurement** (CRITICAL)
   - Create stress test scenario
   - Run without plugin
   - Document metrics
   - **Effort:** 10-18 hours

### Short-term Actions (Next 2 Weeks)

3. **Automated Regression Suite** (HIGH)
   - Create regression script
   - Integrate with CI/CD
   - **Effort:** 8-14 hours

4. **LLM Read Order A/B Test** (HIGH)
   - Create A/B test suite
   - Run experiments
   - Document results
   - **Effort:** 12-21 hours

5. **GSD Integration** (HIGH)
   - Phase detection
   - Atomic commit tracking
   - Validation auto-run
   - **Effort:** 17-25 hours

### Medium-term Actions (Next Month)

6. **Code Quality Enforcement** (HIGH)
   - Pre-commit hooks
   - File size limits
   - Complexity monitoring
   - **Effort:** 31-47 hours

7. **Planning Artifact Lifecycle** (MEDIUM)
   - Staleness enforcement
   - Auto-detection
   - Outlier resolution
   - **Effort:** 13-20 hours

8. **Split Large Files** (MEDIUM)
   - Refactor 10 files >500 LOC
   - **Effort:** 20-31 hours

### Long-term Actions (Next Quarter)

9. **Dashboard Documentation** (LOW)
   - API docs, deployment guide, user manual
   - **Effort:** 8-11 hours

10. **Module System** (LOW)
    - Design module marketplace
    - Installation mechanism
    - **Effort:** 40-60 hours

---

## Total Effort Estimate

| Priority | Gaps | Total Effort |
|----------|-------|--------------|
| **CRITICAL** | 3 | 26-49 hours |
| **HIGH** | 5 | 78-107 hours |
| **MEDIUM** | 7 | 61-98 hours |
| **LOW** | 4 | 48-71 hours |
| **TOTAL** | **19** | **213-325 hours** |

**Recommended Timeline:**
- **Week 1-2:** CRITICAL gaps (Phase 2B, baseline, anchor survival)
- **Week 3-4:** HIGH gaps (regression, A/B test, GSD integration)
- **Month 2:** MEDIUM gaps (code quality, planning lifecycle, file splitting)
- **Quarter 2:** LOW gaps (dashboard docs, module system)

---

## Conclusion

iDumb v2 has **solid technical foundations** but faces **critical validation gaps** that block progress. The highest priority is **Phase 2B (live validation)** to ensure the plugin works in OpenCode and establish baseline metrics.

Once live validation is complete, focus shifts to **quality improvements** (regression suite, code quality enforcement, GSD integration) and **feature completion** (planning lifecycle, dashboard docs, module system).

**Key Takeaway:** We have 294/294 tests passing and zero TypeScript errors, but without live validation, we don't know if the plugin actually works in OpenCode. That's the blocking issue.

---

*Gaps analysis created: 2026-02-07*
*Plugin version: 2.2.0*
*Test coverage: 294/294 assertions (100%)*
