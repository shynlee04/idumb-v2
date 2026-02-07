---
description: Governance enforcement - auto-runs document/context updates after major workflows
version: 1.0.0
created: 2026-01-04
triggers: [after-god-store-split, after-component-normalize, after-workspace-e2e, after-migration]
---

# Governance Enforcement Workflow

// turbo-all

## description

Ensures CLAUDE.md, AGENTS.md, and project context are updated after any workflow that modifies file structure, exports, imports, or architecture.

## Trigger Conditions

Run this workflow AUTOMATICALLY after:
- `eliminate-god-stores` workflow completes
- `normalize-components` workflow completes
- `workspace-file-system-e2e` workflow completes
- Any store refactoring or migration
- Component splitting or consolidation
- Import/export path changes

## Step 1: Check What Changed

```bash
# List recently modified files (last 30 minutes)
find src -type f -name "*.ts" -o -name "*.tsx" -mmin -30 | head -50

# Check for new barrel exports
grep -rn "export \* from" src/ --include="index.ts" | head -20
```

## Step 2: Update AGENTS.md

Update the following sections in `AGENTS.md`:

### File Structure Changes
- New component locations
- Refactored store paths
- New hook locations
- Updated import paths

### Architecture Changes
- New slices created
- Facades added
- Consolidated stores

## Step 3: Run Document Project

Execute: `/bmad-bmm-workflows-document-project`

Focus on:
- API documentation updates
- Store documentation
- Component documentation

## Step 4: Run Generate Project Context

Execute: `/bmad-bmm-workflows-generate-project-context`

This creates/updates `project-context.md` with:
- Critical patterns
- Import conventions
- Store access patterns
- Component composition rules

## Step 5: Update Sprint Status

Update `_bmad-output/sprint-artifacts/arc-sprint-status.yaml`:
- Mark completed stories
- Update progress percentages
- Log artifacts created

## Step 6: Repomix Cleanup (If Used)

If repomix was used for analysis:

```bash
# Delete repomix output files (they are heavy)
find . -name "repomix-output*.xml" -delete
find . -name "repomix-output*.md" -delete
find . -name "repomix-output*.txt" -delete
find . -name "repomix-output*.json" -delete
```

## Repomix Configuration

When using repomix for codebase analysis, ALWAYS use these settings:

```bash
# Exclude patterns for repomix
--ignore "**/*.md,**/node_modules/**,**/.git/**,**/dist/**,**/build/**,**/*.txt,**/*.xml,**/cache/**,**/*.log,**/coverage/**,**/__tests__/**,**/*.test.*"
```

Or configure in `repomix.config.json`:
```json
{
  "ignore": [
    "**/*.md",
    "**/node_modules/**",
    "**/.git/**", 
    "**/dist/**",
    "**/build/**",
    "**/*.txt",
    "**/*.xml",
    "**/cache/**",
    "**/*.log",
    "**/coverage/**",
    "**/__tests__/**",
    "**/*.test.*",
    "**/.claude/**",
    "**/.opencode/**",
    "**/_bmad/**",
    "**/_bmad-output/**"
  ]
}
```

## Checklist

After any structural workflow:

- [ ] AGENTS.md updated with new paths
- [ ] CLAUDE.md updated if patterns changed
- [ ] project-context.md regenerated
- [ ] sprint-status.yaml updated
- [ ] Repomix files deleted
- [ ] Git commit with descriptive message

## Handoff

Report governance completion to BMad Master with:
- Files updated
- Documentation generated
- Sprint status changes
