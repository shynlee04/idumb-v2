---
description: Multi-phase deep diagnostic workflow for analyzing codebase architecture, routing, state management, and data flow with sub-agent delegation
---

# Codebase Architecture Diagnostic

Execute the comprehensive codebase diagnostic workflow with multi-phase deep scanning.

## Prerequisites

- Large codebase with suspected architectural issues
- Multiple sub-agent platforms available (Claude, Gemini, OpenCode)
- Time budget: 2-4 hours for full diagnostic

## Workflow Location

`_bmad/bmm/workflows/codebase-diagnostic/workflow.md`

## Phases Overview

| Phase | Name | Sub-Agents | Focus |
|-------|------|------------|-------|
| 0 | Structure Mapping | 2 | File inventory, dependency graph |
| 1 | User Journeys | 7 | Real user flows through code |
| 2 | Data Flow | 5 | Stores, DB, events, contexts |
| 3 | Performance | 3 | Load time, DB ops, re-renders |
| 4 | Features | 6 | Notes, IDE, Knowledge, Study, Hub, Agents |
| 5 | Integration | 2 | Cross-feature deps, shared infra |
| 6 | Synthesis | 1 | Root cause, remediation plan |

**Total: 26 sub-agent prompts across 7 steps**

## Execution

// turbo-all

1. Create output directory structure:
```bash
mkdir -p _bmad-output/diagnostics/codebase-diagnostic-$(date +%Y-%m-%d)/{phase-0,phase-1,phase-2,phase-3,phase-4,phase-5,phase-6}
```

2. Load workflow.md:
```
Load and execute: _bmad/bmm/workflows/codebase-diagnostic/workflow.md
```

3. Follow step-by-step execution, delegating to sub-agents as directed.

## Outputs

All outputs saved to:
```
_bmad-output/diagnostics/codebase-diagnostic-{date}/
├── phase-0/  (Structure Mapping)
├── phase-1/  (User Journeys)
├── phase-2/  (Data Flow)
├── phase-3/  (Performance)
├── phase-4/  (Features)
├── phase-5/  (Integration)
├── phase-6/  (Synthesis)
└── FINAL-REPORT.md
```

## Commands During Execution

- `STATUS` - Show current progress
- `PAUSE` - Pause and save state
- `RESUME` - Resume from saved state
- `SKIP [phase]` - Skip to specific phase
- `RERUN [prompt]` - Re-execute specific sub-agent prompt
- `SYNTHESIZE` - Force synthesis of current phase
- `ABORT` - Cancel workflow with partial results

## Exit

```
EXIT_CODEBASE_DIAGNOSTIC
```
