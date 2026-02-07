---
name: Workspace File System E2E
description: End-to-end workflow for implementing workspace file system strategies with permission hardening, concurrent access handling, and AI integration. Use this workflow when implementing file system E2E for IDE, Notes, or Knowledge workspaces.
---

# Workspace File System E2E Workflow

This Workflow provides Claude Code with step-by-step guidance for implementing workspace file system E2E.

## When to use this workflow

- When implementing file system E2E for a workspace (IDE, Notes, Knowledge)
- When auditing FSA (File System Access API) permission models
- When creating agent tool permission matrices
- When handling concurrent file access and synchronization
- When integrating AI synthesis with workspace file systems

## Workflow Steps

### Step 1: File System Strategy Definition (2-3 hours)
**Agent**: workspace-architect
**Input**: Workspace type (IDE, Notes, Knowledge)
**Output**: File system strategy document

**Acceptance Criteria**:
- [ ] Desktop strategy defined (FSA API with bi-directional sync)
- [ ] Mobile strategy defined (IndexedDB with sync-to-FSA)
- [ ] Permission handling specified (FSA requests, graceful degradation)
- [ ] Concurrent access strategy defined (file locking, conflict resolution)
- [ ] AI integration approach defined (per-file, batch, RAG)

### Step 2: Permission Model Implementation (3-4 hours)
**Agent**: workspace-architect
**Input**: File system strategy
**Output**: Permission model + agent tool matrix

**Acceptance Criteria**:
- [ ] FSA permission audit completed
- [ ] Agent tool permission matrix created
- [ ] Permission request UI implemented (user prompts)
- [ ] Permission persistence handled (session vs permanent)
- [ ] Permission revocation support (user can revoke)

### Step 3: Concurrent Access Handling (3-4 hours)
**Agent**: workspace-architect
**Input**: Permission model
**Output**: File locking + conflict resolution

**Acceptance Criteria**:
- [ ] File locking mechanism implemented
- [ ] Conflict resolution strategies defined (last-write-wins, merge, user-choice)
- [ ] Concurrent operation queuing
- [ ] Optimistic locking with retry
- [ ] User prompts for conflicting changes

### Step 4: Sync Implementation (4-6 hours)
**Agent**: file-sync-specialist
**Input**: Concurrent access handler
**Output**: Sync service + status indicators

**Acceptance Criteria**:
- [ ] Sync service implemented (bi-directional, batch, throttle)
- [ ] Sync status indicators created (UI components)
- [ ] Conflict resolution UI (user choice prompts)
- [ ] Offline-first support (IndexedDB queue)
- [ ] Sync error recovery (retry logic, rollback)

### Step 5: AI Integration (3-5 hours)
**Agent**: workspace-architect
**Input**: Sync service
**Output**: AI synthesis integration

**Acceptance Criteria**:
- [ ] Per-file AI synthesis implemented
- [ ] Batch AI synthesis implemented
- [ ] RAG pipeline integration (Knowledge workspace)
- [ ] AI tool permissions (read, write with user consent)
- [ ] Progress indicators for AI operations

### Step 6: E2E Validation (2-3 hours)
**Agent**: workspace-architect
**Input**: Complete E2E implementation
**Output**: Validation report

**Acceptance Criteria**:
- [ ] E2E tests passing (critical user journeys)
- [ ] Permission model validated (all scenarios)
- [ ] Concurrent access tested (no data loss)
- [ ] Sync reliability validated (offline, online, conflicts)
- [ ] AI integration tested (per-file, batch)
- [ ] Zero data loss scenarios

## Example Usage

```
"Implement Notes workspace file system E2E using the workspace-file-system-e2e workflow"
```

## Validation Commands

```bash
# TypeScript check
pnpm tsc --noEmit --incremental

# Test suite
pnpm test

# E2E tests for workspace
pnpm test workspace-*

# File system sync validation
pnpm test sync-*
```

## Success Criteria

- ✅ File system E2E implemented (read, write, sync)
- ✅ Permission model hardened (FSA, agent tools)
- ✅ Concurrent access handled (file locking, conflicts)
- ✅ AI integration working (per-file, batch)
- ✅ Sync status indicators visible
- ✅ Zero data loss scenarios
- ✅ E2E tests passing

## Artifacts

For detailed workflow documentation, refer to:
[Workspace File System E2E Workflow](../../../../_bmad/modules/architecture-remediation/workflows/workspace-file-system-e2e.md)
