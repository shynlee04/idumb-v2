---
name: Architecture Remediation
description: Comprehensive architecture remediation module for systematic elimination of technical debt. Use this skill when addressing god stores (>300 lines), oversized components, TypeScript errors, test coverage gaps, workspace file system E2E issues, or sync strategy fragmentation. This module provides structured agents and workflows for foundation stabilization, workspace E2E implementation, and quality assurance.
---

# Architecture Remediation

This Skill provides Claude Code with specific guidance for executing systematic architecture remediation using the BMAD framework.

## When to use this skill

- When eliminating god stores (>300 lines) by splitting into modular slices
- When refactoring oversized React components (>300 lines)
- When fixing TypeScript errors systematically (batch fixing, pattern identification)
- When improving test coverage to ≥80%
- When implementing workspace file system E2E (IDE, Notes, Knowledge)
- When consolidating sync strategies across workspaces
- When executing Epic ARC-1 through ARC-4 stories
- When applying facade patterns for backward compatibility
- When validating architecture changes with incremental TypeScript checking

## Module Structure

The architecture remediation module consists of:

### Agents (Specialists)
- **store-refactorer**: God store elimination and modularization
- **component-splitter**: Component size normalization and hook extraction
- **typescript-fixer**: Batch TypeScript error remediation
- **test-writer**: Test coverage improvement and quality assurance
- **workspace-architect**: Workspace E2E implementation specialist
- **file-sync-specialist**: Sync strategies and conflict resolution

### Workflows (Structured Processes)
- **eliminate-god-stores**: Systematic store refactoring workflow
- **normalize-components**: Component splitting workflow
- **workspace-file-system-e2e**: Workspace end-to-end validation
- **notes-sync-strategy**: Notes workspace sync implementation
- **knowledge-sync-strategy**: Knowledge workspace sync implementation

### Epics (Structured Work)
- **ARC-1**: Foundation Stabilization (P0 - Week 1)
- **ARC-2**: IDE Workspace E2E (P0 - Week 2)
- **ARC-3**: Notes Workspace E2E (P0 - Week 3)
- **ARC-4**: Knowledge Workspace E2E (P0 - Week 4)

## Instructions

This skill loads all architecture remediation sub-skills. Use individual agent or workflow skills for specific tasks:

- For store refactoring: Use [store-refactorer](./store-refactorer/SKILL.md) skill
- For component splitting: Use [component-splitter](./component-splitter/SKILL.md) skill
- For TypeScript fixes: Use [typescript-fixer](./typescript-fixer/SKILL.md) skill
- For test writing: Use [test-writer](./test-writer/SKILL.md) skill
- For workspace E2E: Use [workspace-architect](./workspace-architect/SKILL.md) skill
- For sync strategies: Use [file-sync-specialist](./file-sync-specialist/SKILL.md) skill

## Governance Rules

Always follow these governance rules when executing architecture remediation:

1. **Post-Workflow Documentation**: Update AGENTS.md, CLAUDE.md, sprint-status.yaml
2. **Repomix Cleanup**: Delete repomix output files after analysis
3. **TypeScript Strategy**: Ignore test file errors, use incremental checking
4. **File Size Limits**: Stores ≤120 lines, components ≤300 lines
5. **Backward Compatibility**: Use facade patterns, zero breaking changes

## Quick Reference

**Next Action**: ARC-1.1 - Split dexie-db.ts (1,267 lines)

```bash
# Start with store refactoring
"Split dexie-db.ts using eliminate-god-stores workflow"
```

**Sprint Status**: `_bmad-output/sprint-artifacts/arc-sprint-status.yaml`
**Epic Tracking**: `_bmad/modules/architecture-remediation/artifacts/epic-tracking.md`

For detailed implementation guidance, refer to:
[Architecture Remediation Module](../../../../_bmad/modules/architecture-remediation/README.md)
