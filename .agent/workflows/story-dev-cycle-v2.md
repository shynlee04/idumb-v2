# STORY DEVELOPMENT CYCLE v2.0 - Regulated Development Workflow

**Version**: 2.0.0
**Status**: PRODUCTION
**Last Updated**: 2026-01-08
**Governance Tier**: Tier 1 (Constitution)

---

## description

This workflow defines a **strictly regulated, traceable, checklist-validated** development cycle that prevents:
- Implementation without proper planning/context
- Superficial validation
- Stale artifact usage
- Broken traceability chains
- AI agent coordination failures

---

## Workflow Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  STORY DEVELOPMENT CYCLE v2.0 - 14 STAGES WITH VALIDATION LOOPS            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. CREATE STORY                                                              │
│     ├─ Pre-Validation: Epic readiness, capacity, prerequisites              │
│     ├─ Enhanced Research: Min 2 MCP calls, pattern documentation            │
│     ├─ Create Story File                                                   │
│     └─ VALIDATE (100% required) → Loop on failure                          │
│                                                                              │
│  2. CREATE CONTEXT                                                           │
│     ├─ Pre-Validation: Story file valid, context < 24h old                  │
│     ├─ Enhanced Research: Min 3 MCP calls, timestamp validation              │
│     ├─ Create Context XML                                                   │
│     └─ VALIDATE (freshness + completeness) → Loop on failure                │
│                                                                              │
│  3. DEVELOP                                                                   │
│     ├─ Pre-Validation: Context fresh, research verified, tests ready        │
│     ├─ TDD: Red → Green → Refactor                                          │
│     ├─ Coverage ≥80% required                                               │
│     └─ Record: Files changed, tests created, decisions                     │
│                                                                              │
│  4. CODE REVIEW                                                               │
│     ├─ Multi-Dimensional: Technical + Functional + Security                  │
│     ├─ Automated: TypeScript, Tests, Audit, Accessibility                 │
│     └─ VALIDATE (all ACs + all tests) → Loop on failure                     │
│                                                                              │
│  5. STORY DONE                                                                │
│     ├─ Update: sprint-status.yaml, story file, governance files            │
│     ├─ VALIDATE (traceability chain) → Loop on failure                      │
│     └─ Sign-off: Reviewer approval timestamp                                │
│                                                                              │
│  6. SPRINT STATUS UPDATE                                                      │
│     ├─ Update sprint-status.yaml with story completion                      │
│     ├─ Update epic progress metrics                                          │
│     └─ VALIDATE (no stale data)                                             │
│                                                                              │
│  7. VALIDATE PHASE                                                            │
│     ├─ Check all validation gates passed                                     │
│     ├─ Verify traceability chain intact                                     │
│     ├─ Check artifact freshness                                             │
│     └─ Loop to any failed stage                                             │
│                                                                              │
│  8. REGULATE PHASE                                                            │
│     ├─ Check governance compliance                                          │
│     ├─ Verify coding standards                                              │
│     ├─ Check documentation completeness                                     │
│     └─ Flag any violations for correction                                   │
│                                                                              │
│  9. AUDIT PHASE                                                               │
│     ├─ Scan for stale artifacts                                             │
│     ├─ Check for broken links                                               │
│     ├─ Verify validation completeness                                       │
│     └─ Update audit trail                                                   │
│                                                                              │
│  10. CORRECT-COURSE CHECK                                                     │
│     ├─ If critical issues found → trigger correct-course                    │
│     ├─ Pause sprint if necessary                                            │
│     └─ Update all impacted artifacts                                        │
│                                                                              │
│  11. ALL STORIES COMPLETE CHECK                                               │
│     ├─ Verify all stories in epic complete                                  │
│     ├─ Check all acceptance criteria met                                    │
│     └─ Update epic status to COMPLETE                                       │
│                                                                              │
│  12. EPIC RETROSPECTIVE                                                       │
│     ├─ Quantitative: Velocity, quality, satisfaction metrics                │
│     ├─ Qualitative: Lessons learned, improvement recommendations            │
│     ├─ Update governance files based on findings                            │
│     └─ Archive artifacts per TTL policy                                     │
│                                                                              │
│  13. HANDOFF TO NEXT EPIC/SPRINT                                              │
│     ├─ Create handoff artifact                                              │
│     ├─ Update AGENT-STATE.yaml                                             │
│     └─ Transfer all context                                                 │
│                                                                              │
│  14. ARCHIVE                                                                  │
│     ├─ Archive completed story files                                        │
│     ├─ Clean up stale artifacts                                            │
│     └─ Update artifact registry                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Stage 1: CREATE STORY

### Pre-Entry Validation

| Check | Status | Block If |
|-------|--------|----------|
| Epic defined | ✅/❌ | Epic not in epics.md |
| Capacity available | ✅/❌ | Team at capacity |
| Architecture doc exists | ✅/❌ | architecture.md missing |
| Prerequisites met | ✅/❌ | Dependencies not complete |

### Research Mandate (REQUIRED)

```yaml
research_requirements:
  min_mcp_calls: 2
  required_sources:
    - context7  # Official docs for patterns
    - deepwiki  # GitHub repository patterns
  findings_count: >= 3
  timestamp_validation: true
  proof_required: false  # Optional for story creation
```

### Story File Template

```markdown
---
story_id: "XX-YY"
story_title: "Title"
epic_id: "EPIC-XX"
priority: "P0 | P1 | P2"
effort_hours: N
status: "draft"
created_at: "YYYY-MM-DDTHH:mm:ss+07:00"
updated_at: "YYYY-MM-DDTHH:mm:ss+07:00"
assigned_to: "@agent-slug"
dependencies: ["XX-YY-01", "XX-YY-02"]
research_artifacts:
  - source: "context7"
    query: "..."

---

# [STORY_ID] - [STORY_TITLE]

## Epic Context
[Brief epic context]

## User Story
As a [role], I want [feature], so that [benefit].

## Acceptance Criteria
1. [ ] AC 1 - Description
2. [ ] AC 2 - Description
3. [ ] AC N - Description

## Dependencies
- Story: XX-YY-01 (must complete first)
- Code: src/path/to/file.ts
- Doc: architecture.md Section N

## Implementation Plan
### Phase 1: [Description]
### Phase 2: [Description]
### Phase N: [Description]

## Validation Checklist
### Pre-Development
- [ ] Research completed (min 2 MCP calls)
- [ ] Architecture pattern documented
- [ ] Dependencies identified
- [ ] Test strategy defined

### Post-Development
- [ ] All ACs met
- [ ] Tests passing (≥80% coverage)
- [ ] Code reviewed
- [ ] Documentation updated

## Traceability
| PRD Req | AC | Test | Code | Review |
|---------|----|----|----|----|
| REQ-001 | AC1 | test.spec.ts | file.ts:line | Reviewer |

## Research Findings
### Source 1: context7 - [Query]
**Finding**: [Description]
**Impact**: [Implementation guidance]

### Source 2: deepwiki - [Repository]
**Finding**: [Pattern documentation]
**Impact**: [Architecture decision]

## Metadata
- Created by: @agent-slug
- Created at: [timestamp]
- Updated at: [timestamp]
- Status: draft | in-progress | review | done
- Blocked by: [story IDs or reasons]
```

### VALIDATE Stage 1 (100% Required)

```yaml
validation_gate_1:
  name: "Story File Validation"
  criteria:
    - story_id_exists: true
    - epic_id_valid: true
    - acceptance_criteria_defined: true
    - dependencies_listed: true
    - research_artifacts_present: true
    - metadata_complete: true
  pass_threshold: 100  # All must pass
  on_fail:
    action: "loop_to_stage_1"
    reason_required: true
    notify: "@bmad-bmm-pm"
```

---

## Stage 2: CREATE CONTEXT

### Pre-Entry Validation

| Check | Status | Block If |
|-------|--------|----------|
| Story file valid | ✅/❌ | Story not found or invalid |
| Previous context < 24h old | ✅/❌ | Context stale (>24h) |
| Files unchanged | ✅/❌ | Dependencies modified since story |
| Architecture sync | ✅/❌ | Patterns out of sync |

### Context Freshness Rules

```yaml
context_freshness:
  max_age_hours: 24
  file_dependencies:
    check_modified: true
    max_age_hours: 12
  architecture_patterns:
    check_sync: true
    version_match_required: true
  validation:
    timestamp_format: "YYYY-MM-DDTHH:mm:ss+07:00"
    timezone: "+07:00"
```

### Research Mandate (REQUIRED)

```yaml
research_requirements:
  min_mcp_calls: 3
  required_sources:
    - context7    # Official docs (mandatory)
    - deepwiki    # GitHub patterns (mandatory)
    - web-search  # Latest practices (optional)
  findings_count: >= 5
  timestamp_validation: true
  proof_required: true  # Must cite findings in implementation
```

### Context XML Template

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!--
Story Context for [STORY_ID]
Generated: [TIMESTAMP]
Valid Until: [TIMESTAMP + 24h]
-->
<context>
  <metadata>
    <story_id>XX-YY</story_id>
    <generated_at>YYYY-MM-DDTHH:mm:ss+07:00</generated_at>
    <expires_at>YYYY-MM-DDTHH:mm:ss+07:00</expires_at>
    <version>2.0</version>
  </metadata>

  <!-- File dependencies with modification checks -->
  <dependencies>
    <file path="src/path/to/file.ts" modified="TIMESTAMP" hash="HASH"/>
    <file path="src/another/file.ts" modified="TIMESTAMP" hash="HASH"/>
  </dependencies>

  <!-- Architecture patterns -->
  <architecture>
    <pattern name="clean-architecture" version="1.0" validated="true"/>
    <pattern name="zustand-slices" version="5.0" validated="true"/>
    <pattern name="repository-pattern" version="1.0" validated="false"/>
  </architecture>

  <!-- Research findings -->
  <research>
    <source type="context7" query="..." timestamp="..." findings="3">
      <finding id="1">...</finding>
      <finding id="2">...</finding>
      <finding id="3">...</finding>
    </source>
    <source type="deepwiki" repo="..." query="..." timestamp="..." findings="2">
      <finding id="1">...</finding>
      <finding id="2">...</finding>
    </source>
  </research>

  <!-- Code sections to modify -->
  <code_scope>
    <include path="src/path/to/file.ts" lines="1-100"/>
    <exclude path="src/path/to/test.ts"/>
  </code_scope>

  <!-- Test requirements -->
  <testing>
    <coverage_target>80</coverage_target>
    <test_types>
      <type>unit</type>
      <type>integration</type>
    </test_types>
  </testing>
</context>
```

### VALIDATE Stage 2 (Freshness + Completeness)

```yaml
validation_gate_2:
  name: "Context Validation"
  criteria:
    - timestamp_valid: true
    - context_age_hours: <= 24
    - file_dependencies_unchanged: true
    - architecture_sync: true
    - research_calls_minimum: 3
    - findings_count_minimum: 5
  pass_threshold: 100  # All must pass
  on_fail:
    action: "regenerate_context"
    stale_context_action: "block_development"
```

---

## Stage 3: DEVELOP

### Pre-Entry Validation

| Check | Status | Block If |
|-------|--------|----------|
| Context fresh (<24h) | ✅/❌ | Context stale |
| Research verified | ✅/❌ | Research not cited |
| Tests ready | ✅/❌ | Test framework not configured |
| Dependencies available | ✅/❌ | Required packages missing |

### TDD Cycle (REQUIRED)

```yaml
tdd_cycle:
  red:
    description: "Write failing test"
    requirement: "Test must fail before implementation"
    proof: "Test file timestamp < implementation timestamp"
  green:
    description: "Write minimal passing code"
    requirement: "Make test pass with simplest implementation"
    constraint: "no optimization yet"
  refactor:
    description: "Improve code quality"
    requirement: "Tests still pass after refactoring"
    standards: "CLAUDE.md coding style"
```

### Coverage Requirements

```yaml
coverage_requirements:
  minimum_percent: 80
  measured_on: "production code only"
  exclude_patterns:
    - "*.test.ts"
    - "*.test.tsx"
    - "__tests__/*"
  failure_action: "block_story_completion"
```

### Implementation Record

```yaml
implementation_record:
  files_changed:
    - path: "src/file.ts"
      lines_added: 10
      lines_removed: 5
      lines_modified: 3
    - path: "src/file.test.ts"
      lines_added: 25
      tests_added: 5
  decisions:
    - timestamp: "..."
      decision: "Used Zustand slice pattern"
      rationale: "Better than direct store for modularity"
      research_citation: "context7: zustand-patterns"
  dependencies_added:
    - package: "@package/name"
      version: "^1.0.0"
      reason: "Required for feature X"
```

---

## Stage 4: CODE REVIEW

### Multi-Dimensional Review

```yaml
review_dimensions:
  technical:
    - code_quality: "CLAUDE.md standards"
    - architecture_compliance: "Clean Architecture layers"
    - performance: "No regressions, <2x acceptable"
    - typescript: "Zero errors in production code"
  functional:
    - acceptance_criteria: "All ACs met and tested"
    - edge_cases: "Error handling, boundary conditions"
    - user_experience: "Meets UX specification"
  security:
    - input_validation: "All inputs validated"
    - error_handling: "No sensitive data in errors"
    - dependencies: "No vulnerable packages"
  accessibility:
    - keyboard_navigation: "All features accessible"
    - screen_reader: "ARIA labels present"
    - color_contrast: "WCAG 2.1 AA compliant"
```

### Automated Validation

```yaml
automated_checks:
  typescript:
    command: "pnpm typecheck"
    expected_result: "0 errors (test files excluded)"
    fail_action: "block_completion"
  tests:
    command: "pnpm test"
    expected_result: "All tests passing"
    coverage_command: "pnpm test:coverage"
    coverage_minimum: 80
  audit:
    command: "pnpm audit"
    fail_on: "high, critical vulnerabilities"
  lint:
    command: "pnpm lint"
    expected_result: "0 errors, 0 warnings"
  accessibility:
    command: "pa11y src/routes/**/*.tsx"
    fail_on: "WCAG violations"
```

### VALIDATE Stage 4 (All ACs + All Tests)

```yaml
validation_gate_4:
  name: "Code Review Validation"
  criteria:
    - all_acs_met: true
    - all_tests_passing: true
    - coverage_percent: ">= 80"
    - typescript_errors: 0
    - lint_errors: 0
    - accessibility_violations: 0
    - security_vulnerabilities: "none high/critical"
  pass_threshold: 100  # All must pass
  on_fail:
    action: "loop_to_stage_3"
    feedback_required: true
    reviewer: "@code-reviewer"
```

---

## Stage 5: STORY DONE

### Completion Checklist

```yaml
story_done_checklist:
  implementation:
    - all_acs_implemented: true
    - all_tests_passing: true
    - coverage_met: true
    - code_reviewed: true
    - typescript_clean: true
  documentation:
    - story_file_updated: true
    - agnets_md_updated: true
    - code_comments: "appropriate, not excessive"
    - api_docs_updated: "if applicable"
  traceability:
    - prd_links: true
    - ac_to_test_links: true
    - test_to_code_links: true
    - review_signoff: true
  governance:
    - coding_standards: true
    - architecture_compliance: true
    - size_limits: "stores ≤120 lines, components ≤300"
    - no_circular_deps: true
```

### Sign-off Requirements

```yaml
sign_off:
  reviewer: "@code-reviewer or @bmad-bmm-architect"
  timestamp_required: true
  approval_criteria:
    - all_checks_passed: true
    - no_blockers: true
    - documentation_complete: true
  output:
    file: "_bmad-output/handoffs/story-{ID}-complete.md"
    template: "story-completion-handoff"
```

### Traceability Chain Validation

```yaml
traceability_validation:
  required_links:
    - from: "PRD requirement"
      to: "Acceptance Criteria"
      type: "bidirectional"
    - from: "Acceptance Criteria"
      to: "Test"
      type: "bidirectional"
    - from: "Test"
      to: "Code"
      type: "file:line reference"
    - from: "Code"
      to: "Review"
      type: "reviewer signoff"
  validation_command: |
    grep -r "PRD-[0-9]" story-file.md
    grep -r "AC-[0-9]" test-file.spec.ts
    grep -r "story-[0-9]" code-file.ts
  failure_action: "block_completion"
```

---

## Stage 6: SPRINT STATUS UPDATE

### Update Sprint Status

```yaml
sprint_status_update:
  file: "_bmad-output/sprint-artifacts/sprint-status.yaml"
  updates:
    - path: "epics.{epic_id}.stories.{story_id}.status"
      value: "done"
    - path: "epics.{epic_id}.stories.{story_id}.completed_at"
      value: "[timestamp]"
    - path: "epics.{epic_id}.progress.stories_completed"
      value: "increment"
    - path: "epics.{epic_id}.progress.completion_percentage"
      value: "recalculate"
  validation:
    - "stories_completed + stories_remaining = total_stories"
    - "completion_percentage = (stories_completed / total) * 100"
```

### VALIDATE Sprint Status

```yaml
validation_gate_6:
  name: "Sprint Status Validation"
  criteria:
    - yaml_syntax_valid: true
    - all_required_fields_present: true
    - no_stale_data: true
    - timestamps_current: true
  pass_threshold: 100
```

---

## Stage 7: VALIDATE PHASE

### Comprehensive Validation

```yaml
phase_validation:
  check_all_gates:
    - gate_1_story: "passed"
    - gate_2_context: "passed"
    - gate_3_implementation: "passed"
    - gate_4_review: "passed"
    - gate_5_done: "passed"
    - gate_6_sprint_status: "passed"
  traceability_check:
    - all_artifacts_linked: true
    - all_timestamps_valid: true
    - all_references_resolved: true
  freshness_check:
    - no_stale_artifacts: true
    - context_within_24h: true
  failure_action: "identify_failed_gate_and_loop"
```

---

## Stage 8: REGULATE PHASE

### Governance Compliance Check

```yaml
governance_check:
  documents:
    - name: "AGENTS.md"
      updated: "required if paths changed"
      validation: "all paths exist and accurate"
    - name: "CLAUDE.md"
      updated: "if patterns changed"
      validation: "no contradictions with new code"
    - name: ".claude/AGENT-STATE.yaml"
      updated: "every story"
      validation: "state accurate"
  coding_standards:
    - file_size_limits: "enforced"
    - naming_conventions: "followed"
    - import_order: "correct"
    - no_forbidden_patterns: "true"
  architecture_compliance:
    - clean_architecture: "layers respected"
    - no_circular_deps: "verified"
    - facade_pattern: "used for compatibility"
```

---

## Stage 9: AUDIT PHASE

### Artifact Audit

```yaml
audit_scan:
  stale_artifacts:
    check: "find _bmad-output -name '*.md' -mtime +90"
    action: "archive to _bmad-output/archive/"
  broken_links:
    check: "grep -r '\\[.*\\](.*\\.md)' _bmad-output"
    validation: "all linked files exist"
  missing_validation:
    check: "grep -r 'validation_gate: pass' story-files"
    validation: "all gates have validation records"
  traceability_gaps:
    check: "find orphaned artifacts (no inbound/outbound links)"
    action: "document or link"
```

---

## Stage 10: CORRECT-COURSE CHECK

### Trigger Conditions

```yaml
correct_course_triggers:
  critical_issues:
    - architecture_violation: "Block all work, trigger ADR"
    - security_vulnerability: "Block all work, immediate fix"
    - test_coverage_below_60: "Block completion, add tests"
    - circular_dependency: "Block completion, refactor"
  detection:
    automated_scan: true
    manual_report: true
  action:
    pause_sprint: "if critical"
    update_architecture: "if needed"
    create_correct_course_plan: "always"
```

---

## Stage 11: ALL STORIES COMPLETE

### Epic Completion Check

```yaml
epic_completion:
  all_stories_done:
    check: "epics.{epic_id}.stories.*.status == 'done'"
    verification: "manual review required"
  all_acs_met:
    check: "traceability matrix complete"
    validation: "100% coverage required"
  retrospective_ready:
    check: "all stories >= done status"
    action: "trigger_epic_retrospective"
```

---

## Stage 12: EPIC RETROSPECTIVE

### Quantitative Metrics

```yaml
quantitative_metrics:
  velocity:
    planned_hours: "total estimated"
    actual_hours: "total actual"
    efficiency: "planned / actual"
  quality:
    bugs_found: "post-release"
    test_coverage_percent: "average across epic"
    typescript_errors: "start vs end"
  satisfaction:
    agent_feedback: "1-5 scale"
    user_feedback: "if applicable"
```

### Qualitative Review

```yaml
qualitative_review:
  lessons_learned:
    - what_worked: "document patterns to repeat"
    - what_failed: "document anti-patterns to avoid"
    - surprises: "document unknown unknowns"
  improvement_recommendations:
    - process_improvements: "workflow changes"
    - tool_improvements: "automation opportunities"
    - documentation_updates: "AGENTS.md, CLAUDE.md"
```

### Retrospective Template

```markdown
# Epic [EPIC-ID] Retrospective

## Dates
- Started: [DATE]
- Completed: [DATE]
- Duration: [DAYS]

## Quantitative Summary
| Metric | Planned | Actual | Variance |
|--------|---------|--------|----------|
| Hours | X | Y | ±Z% |
| Stories | N | N | 100% |
| Velocity | X pts | Y pts | ±Z% |

## What Worked
1. [Pattern that succeeded]
2. [Tool that helped]
3. [Process improvement]

## What Didn't Work
1. [Blocker encountered]
2. [Process failure]
3. [Technical debt discovered]

## Action Items
- [ ] [Improvement 1] - Assigned to: @agent - Due: [DATE]
- [ ] [Improvement 2] - Assigned to: @agent - Due: [DATE]

## Artifacts Archive
- Location: `_bmad-output/archive/epic-{EPIC-ID}/`
- Retention: 90 days (Tier 3)
```

---

## Stage 13: HANDOFF TO NEXT EPIC/SPRINT

### Handoff Artifact Template

```yaml
handoff_artifact:
  id: "HANDOFF-{TIMESTAMP}"
  from:
    epic: "{EPIC_ID}"
    status: "complete"
    agent: "@agent-completing"
  to:
    epic: "{NEXT_EPIC_ID}"
    agent: "@agent-starting"
  artifacts_created:
    - path: "_bmad-output/handoffs/epic-{ID}-complete.md"
    - path: "_bmad-output/retrospectives/epic-{ID}-retro.md"
    - path: "_bmad-output/sprint-artifacts/sprint-status.yaml"
  lessons_learned:
    - "document key takeaways"
    - "flag recurring issues"
  next_actions:
    - "specific action for next epic"
    - "any dependencies to resolve"
```

---

## Stage 14: ARCHIVE

### TTL-Based Archival

```yaml
artifact_lifecycle:
  tier_1_permanent:
    ttl: "permanent"
    location: ".claude/constitution/"
    examples: ["governance-rules.md", "CONSTITUTION.md"]
  tier_2_controlled:
    ttl: "permanent"
    location: "_bmad-output/planning-artifacts/"
    update_on_change: true
    examples: ["prd.md", "architecture.md", "epics.md"]
  tier_3_archival:
    ttl: "90 days"
    location: "_bmad-output/archive/"
    auto_archive: true
    examples: ["scans/", "research/", "retrospectives/"]
  tier_4_ephemeral:
    ttl: "24 hours"
    location: "_bmad-output/continuation-capsules/"
    auto_delete: true
    examples: ["context-*.xml", "temp-*"]
```

---

## Metadata Standards

### Required Metadata for All Artifacts

```yaml
required_metadata:
  title: "Descriptive artifact title"
  artifact_id: "UNIQUE-ID-YYYYMMDD"
  created_at: "YYYY-MM-DDTHH:mm:ss+07:00"
  updated_at: "YYYY-MM-DDTHH:mm:ss+07:00"
  created_by: "@agent-slug"
  version: "major.minor.patch"
  status: "draft | active | deprecated | archived"
  tier: "1 | 2 | 3 | 4"
  references:
    - "PRD requirements"
    - "Architecture decisions"
    - "Related stories"
  traceability:
    - requirement_id: "REQ-XXX"
    - acceptance_criteria: "AC-X"
    - test_files: "path/to/test.spec.ts"
    - implementation: "path/to/file.ts:line"
```

---

## Validation Commands Reference

### Pre-Flight Validation

```bash
# Check all story files for completeness
find _bmad-output/sprint-artifacts/stories -name "*.md" -exec \
  grep -L "required_metadata" {} \;

# Validate YAML syntax
find _bmad-output -name "*.yaml" -exec yamllint {} \;

# Check for stale context files
find _bmad-output -name "context-*.xml" -mtime +1

# Verify traceability links
grep -r "story-[0-9]" _bmad-output/sprint-artifacts/stories/*.md | \
  grep -v "AC-[0-9]" | cut -d: -f1 | sort -u

# TypeScript validation (production code only)
pnpm typecheck 2>&1 | grep -v '.test.' | wc -l

# Coverage check
pnpm test:coverage | grep "Lines" | awk '{print $4}' | sed 's/%//'
```

---

## Agent Coordination Rules

### Handoff Protocol

```yaml
handoff_protocol:
  pre_handoff:
    - create_handoff_artifact: true
    - update_agent_state: true
    - validate_artifacts: true
  during_handoff:
    - provide_context_links: true
    - specify_acceptance_criteria: true
    - set_timeout: "based on story complexity"
  post_handoff:
    - confirm_receipt: true
    - update_tracking: true
    - archive_handoff: true
```

### Conflict Resolution

```yaml
conflict_resolution:
  artifact_conflict:
    detection: "timestamp comparison"
    resolution: "latest timestamp wins"
    notification: "notify both agents"
  story_conflict:
    detection: "same story_id in progress"
    resolution: "first to complete wins"
    notification: "notify blocked agent"
  context_conflict:
    detection: "context age > 24h"
    resolution: "regenerate context"
    notification: "block until fresh"
```

---

## Audit Trail Requirements

### All Phase Transitions Must Log

```yaml
audit_log:
  phase_transition:
    timestamp: "YYYY-MM-DDTHH:mm:ss+07:00"
    from_phase: "stage_N"
    to_phase: "stage_N+1"
    agent: "@agent-slug"
    validation_result: "passed | failed | skipped"
    artifacts: ["list of artifact IDs"]
    decision_rationale: "why transition occurred"
    evidence: "links to supporting artifacts"
```

---

## Emergency Procedures

### When Validation Fails

```yaml
emergency_procedures:
  validation_failure:
    immediate_action: "stop current work"
    assessment: "determine severity (P0/P1/P2)"
    p0_critical:
      action: "pause sprint, notify human"
      examples: ["security vulnerability", "data loss risk"]
    p1_major:
      action: "block story, continue other stories"
      examples: ["typescript errors", "test failures"]
    p2_minor:
      action: "document, continue with mitigation"
      examples: ["documentation gaps", "style violations"]
```

### Correct-Course Trigger

```yaml
correct_course_trigger:
  conditions:
    - "3+ P0 issues in same epic"
    - "architecture violation discovered"
    - "fundamental pattern flaw"
  action:
    - pause_sprint: true
    - create_plan: true
    - update_artifacts: "all impacted"
    - notify: "@bmad-core-bmad-master, user"
```

---

## Quick Reference

### Stage Entry/Exit Summary

| Stage | Entry Check | Exit Criteria | Loop On |
|-------|-------------|---------------|---------|
| 1. Create Story | Epic ready, capacity | Story file valid | Validation <100% |
| 2. Create Context | Story valid, fresh | Context <24h old | Context stale |
| 3. Develop | Context fresh, research | All ACs implemented | Tests fail |
| 4. Code Review | Implementation done | All validations pass | Any check fails |
| 5. Story Done | Review passed | All checks complete | Traceability broken |
| 6. Update Status | Story done | Status updated | YAML invalid |
| 7. Validate | All stages done | All gates pass | Any gate fails |
| 8. Regulate | Phase validated | Governance compliant | Violations found |
| 9. Audit | Regulation done | Audit clean | Issues found |
| 10. Correct-Course | Audit complete | No critical issues | Critical found |
| 11. All Stories | Individual done | All complete | Missing stories |
| 12. Retrospective | Epic complete | Retro documented | Skip if minor |
| 13. Handoff | Retro complete | Handoff accepted | Reject |
| 14. Archive | Handoff complete | Archive complete | |

---

**Status**: ✅ PRODUCTION READY
**Next**: Apply to all stories going forward
**Maintainer**: @bmad-core-bmad-master
**Review Date**: 2026-02-08
