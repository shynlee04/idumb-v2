---
name: Notes Sync Strategy
description: Specialized workflow for implementing Notes workspace file synchronization with offline-first support, conflict resolution, and AI synthesis integration. Use this workflow when implementing sync for Notes workspace, creating note-specific conflict resolution, or integrating AI with note files.
---

# Notes Sync Strategy Workflow

This Workflow provides Claude Code with step-by-step guidance for implementing Notes workspace sync.

## When to use this workflow

- When implementing Notes workspace file system sync
- When creating offline-first note editing
- When implementing note-specific conflict resolution (text merge, versioning)
- When integrating AI synthesis with notes (per-note, batch)
- When creating sync status indicators for Notes workspace

## Workflow Steps

### Step 1: Notes File System Strategy (2-3 hours)
**Agent**: file-sync-specialist
**Input**: Notes workspace requirements
**Output**: File system strategy document

**Acceptance Criteria**:
- [ ] Desktop: FSA API with per-note file storage
- [ ] Mobile: IndexedDB with sync-to-FSA on desktop
- [ ] Note file format defined (Markdown, metadata, attachments)
- [ ] Folder structure defined (notebooks, tags, search index)
- [ ] Permission handling (read/write per notebook)

### Step 2: Sync Concurrency Handling (3-4 hours)
**Agent**: file-sync-specialist
**Input**: File system strategy
**Output**: Concurrent sync implementation

**Acceptance Criteria**:
- [ ] File locking per note (granular locking)
- [ ] Conflict resolution for text notes (git-style merge)
- [ ] Version history (undo/redo support)
- [ ] Conflict UI (side-by-side diff, user choice)
- [ ] Automatic save (debounce to avoid conflicts)

### Step 3: AI Synthesis Integration (4-6 hours)
**Agent**: workspace-architect
**Input**: Sync implementation
**Output**: AI integration with notes

**Acceptance Criteria**:
- [ ] Per-note AI synthesis (summarize, expand, rewrite)
- [ ] Batch AI synthesis (process entire notebook)
- [ ] AI-powered search (semantic search across notes)
- [ ] AI tool permissions (read, write with user consent)
- [ ] Progress indicators for AI operations

### Step 4: Sync Status UX/UI (2-3 hours)
**Agent**: component-splitter
**Input**: AI integration
**Output**: Sync status UI components

**Acceptance Criteria**:
- [ ] Sync status indicator (syncing, synced, conflict, offline)
- [ ] Conflict resolution UI (side-by-side diff, accept button)
- [ ] AI operation progress (progress bar, cancel button)
- [ ] Offline mode indicator (editing while offline)
- [ ] Error states (sync failed, retry button)

### Step 5: Validation & Testing (2-3 hours)
**Agent**: test-writer
**Input**: Complete Notes sync implementation
**Output**: Test suite + validation report

**Acceptance Criteria**:
- [ ] Unit tests for sync logic (CRUD, conflict resolution)
- [ ] Integration tests (sync + AI integration)
- [ ] E2E tests (critical user journeys)
- [ ] Test coverage ≥80%
- [ ] Zero data loss scenarios validated

## Example Usage

```
"Implement Notes sync strategy using the notes-sync-strategy workflow"
```

## Validation Commands

```bash
# TypeScript check
pnpm tsc --noEmit --incremental

# Test suite
pnpm test

# Notes-specific tests
pnpm test notes-*

# Sync validation
pnpm test sync-notes-*
```

## Success Criteria

- ✅ Notes file system sync working (read, write, sync)
- ✅ Conflict resolution implemented (text merge, user choice)
- ✅ AI integration working (per-note, batch, search)
- ✅ Sync status indicators visible
- ✅ Offline-first support (IndexedDB queue)
- ✅ Zero data loss scenarios
- ✅ Test coverage ≥80%
- ✅ E2E tests passing

## Artifacts

For detailed workflow documentation, refer to:
[Notes Sync Strategy Workflow](../../../../_bmad/modules/architecture-remediation/workflows/notes-sync-strategy.md)
