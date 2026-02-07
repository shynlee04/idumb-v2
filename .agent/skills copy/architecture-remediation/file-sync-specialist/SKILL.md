---
name: File Sync Specialist
description: Specialized agent for sync strategy consolidation, conflict resolution, and cross-workspace file synchronization. Use this skill when consolidating duplicate sync implementations, implementing conflict resolution strategies, handling offline-first scenarios, or creating unified sync status indicators across IDE, Notes, and Knowledge workspaces.
---

# File Sync Specialist

This Skill provides Claude Code with specific guidance for implementing robust file sync strategies.

## When to use this skill

- When consolidating fragmented sync implementations (5 implementations → 1 unified)
- When implementing conflict resolution strategies (last-write-wins, merge, user-choice)
- When handling offline-first scenarios (IndexedDB queue, sync on reconnect)
- When creating unified sync status indicators across workspaces
- When optimizing sync performance (batching, throttling, debounce)
- When implementing sync error recovery (retry logic, rollback)

## Instructions

For detailed implementation guidance, refer to:
[File Sync Specialist Agent](../../../../_bmad/modules/architecture-remediation/agents/file-sync-specialist.md)

## Workflow Integration

This skill integrates with multiple workflows:
- **notes-sync-strategy**: Notes workspace sync implementation
- **knowledge-sync-strategy**: Knowledge workspace sync implementation
- **workspace-file-system-e2e**: General sync strategy validation

## Current State Analysis

### Sync Strategy Fragmentation
- **5 implementations** with partial duplication
- **2,858 total lines** → potential 47% reduction through consolidation
- **Implementations**:
  - `src/lib/filesync/notes-file-sync-service.ts` (659 lines)
  - `src/lib/filesync/knowledge-file-sync-service.ts` (TODO)
  - `src/lib/filesync/ide-file-sync-service.ts` (TODO)
  - Various sync utilities across workspaces

## Consolidation Strategy

### Phase 1: Unified Sync Service (Foundation)
- Create `src/lib/filesync/unified-sync-service.ts`
- Implement core sync logic (CRUD, batching, conflict resolution)
- Support multiple backends (FSA, IndexedDB, WebContainer)
- Unified status reporting across all workspaces

### Phase 2: Workspace-Specific Adapters
- `notes-sync-adapter.ts`: Notes workspace specific logic
- `knowledge-sync-adapter.ts`: Knowledge workspace + RAG integration
- `ide-sync-adapter.ts`: IDE workspace + WebContainer integration

### Phase 3: Conflict Resolution
- **Last-Write-Wins**: For non-conflicting changes
- **Merge Strategy**: For text files (git-style merge)
- **User Choice**: For conflicting changes (UI prompt)
- **Automatic Resolution**: For structured data (merge by field)

## Quality Standards

### Sync Reliability
- ✅ Zero data loss scenarios
- ✅ Offline-first support (IndexedDB queue)
- ✅ Automatic retry with exponential backoff
- ✅ Conflict resolution with user prompts

### Performance
- ✅ Batch operations (reduce network calls)
- ✅ Throttling (avoid overwhelming the system)
- ✅ Debouncing (coalesce rapid changes)
- ✅ Progress indicators (user feedback)

## Example Usage

```
"Consolidate sync strategies using the notes-sync-strategy workflow"
```

This will:
1. Analyze current sync implementations (identify duplication)
2. Create unified sync service (core logic)
3. Implement Notes workspace adapter (specific logic)
4. Add conflict resolution strategies (merge, user-choice)
5. Create sync status indicators (UI components)
6. Validate with E2E testing

## Validation Commands

```bash
# TypeScript check
pnpm tsc --noEmit --incremental

# Test suite
pnpm test

# Sync-specific tests
pnpm test sync-*

# Measure code reduction
wc -l src/lib/filesync/*.ts | tail -1
```

## Success Criteria

- ✅ Unified sync service created (47% code reduction)
- ✅ All workspace adapters working (Notes, Knowledge, IDE)
- ✅ Conflict resolution implemented (merge, user-choice)
- ✅ Zero data loss scenarios validated
- ✅ Sync status indicators visible
- ✅ Offline-first support working
- ✅ E2E tests passing
