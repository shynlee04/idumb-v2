---
description: Start a Ralph Loop for ARC module course correction with autonomous iteration
---

# Ralph Loop for ARC Module

This workflow starts an autonomous iterative loop that executes the ARC module course correction until completion.

## Prerequisites

1. ARC module created at `_bmad-output/bmb-creations/arc-module/`
2. PROMPT.md and LOOP_STATE.yaml exist
3. Sprint Change Proposal approved

## Quick Start

// turbo-all

### 1. Initialize Loop State (if needed)

```bash
# Check current state
cat _bmad-output/bmb-creations/arc-module/LOOP_STATE.yaml | head -20
```

### 2. Start the Ralph Loop

```bash
# Option A: Using the workflow command 
/ralph-loop "_bmad-output/bmb-creations/arc-module/PROMPT.md" --max-iterations 100 --completion-promise "ARC MODULE COMPLETE"

# Option B: Manual bash loop
cd /Users/apple/Documents/coding-projects/project-alpha-master
while :; do
  cat _bmad-output/bmb-creations/arc-module/PROMPT.md | claude-code --continue
done
```

### 3. Monitor Progress

```bash
# Watch the loop state
watch -n 5 'cat _bmad-output/bmb-creations/arc-module/LOOP_STATE.yaml | grep -A 5 "iteration_count\|current_task\|status"'

# Check git log for changes
git log --oneline -10
```

### 4. Cancel if Needed

```bash
/cancel-ralph
# Or manually kill the loop process
```

## Completion Signals

The loop will output one of these promises when done:

| Signal | Meaning |
|--------|---------|
| `<promise>ARC MODULE COMPLETE</promise>` | ✅ All phases done, validation passed |
| `<promise>PHASE [N] COMPLETE</promise>` | ⏸️ Phase milestone reached |
| `<promise>BLOCKED: [reason]</promise>` | 🚨 Human intervention needed |

## Expected Duration

| Phase | Estimated Iterations | Est. Time |
|-------|---------------------|-----------|
| Phase 0 | 2-5 | 30 min |
| Phase 1 | 15-25 | 2-4 hours |
| Phase 2 | 10-20 | 2-3 hours |
| Phase 3 | 20-40 | 4-8 hours |
| Phase 4 | 10-20 | 2-4 hours |
| **Total** | **57-110** | **10-20 hours** |

## Troubleshooting

### Loop Stuck on Same Task
1. Check `LOOP_STATE.yaml → current_task_retries`
2. If > 3, manual intervention needed
3. Fix the blocking issue
4. Reset `current_task_retries: 0`
5. Resume loop

### Validation Failing
1. Check `LOOP_STATE.yaml → validation → levels_failed`
2. Run `validate-level` workflow manually
3. Fix issues identified
4. Resume loop

### Build Failing
1. Run `pnpm build` manually
2. Fix TypeScript errors
3. Update `LOOP_STATE.yaml → build → status: "PASS"`
4. Resume loop
