---
name: Workspace Architect
description: Specialized agent for workspace end-to-end (E2E) implementation, focusing on file system alignment, permission hardening, and AI integration across IDE, Notes, and Knowledge workspaces. Use this skill when implementing workspace file system strategies, auditing FSA permission models, creating agent tool permission matrices, or handling concurrent file access.
---

# Workspace Architect

This Skill provides Claude Code with specific guidance for implementing workspace E2E functionality.

## When to use this skill

- When implementing workspace file system E2E (IDE, Notes, Knowledge)
- When auditing FSA (File System Access API) permission models
- When creating agent tool permission matrices
- When handling concurrent file access and synchronization
- When integrating AI synthesis with workspace file systems
- When implementing sync status indicators and UX
- When addressing edge cases for desktop vs mobile workspaces

## Instructions

For detailed implementation guidance, refer to:
[Workspace Architect Agent](../../../../_bmad/modules/architecture-remediation/agents/workspace-architect.md)

## Workflow Integration

This skill is part of the **workspace-file-system-e2e** workflow:
1. **File System Strategy**: Define desktop vs mobile strategy, FSA vs IndexedDB
2. **Permission Model**: Audit FSA permissions, create agent tool matrix, handle concurrent access
3. **Sync Implementation**: Implement sync logic, conflict resolution, status indicators
4. **AI Integration**: Integrate AI synthesis (per-file, batch), handle RAG pipeline
5. **Validation**: E2E testing, permission hardening, sync reliability

## Workspace Priority Order

### Phase 1: IDE Workspace (Week 2)
- **Focus**: Harden existing brownfield IDE with proper permissions
- **Stories**:
  - ARC-2.1: Audit FSA permission model (4-6 hours)
  - ARC-2.2: Agent tool permission matrix (6-8 hours)
  - ARC-2.3: Concurrent file access handling (6-8 hours)
  - ARC-2.4: IDE sync status indicators (4-6 hours)

### Phase 2: Notes Workspace (Week 3)
- **Focus**: Full implementation on harnessed architecture
- **Stories**:
  - ARC-3.1: Notes file system strategy (6-8 hours)
  - ARC-3.2: Notes sync concurrency handling (8-10 hours)
  - ARC-3.3: Notes AI synthesis integration per-file (6-8 hours)
  - ARC-3.4: Notes AI synthesis integration batch (6-8 hours)
  - ARC-3.5: Notes UX/UI for sync status (4-6 hours)

### Phase 3: Knowledge Workspace (Week 4)
- **Focus**: Same rigor as Notes workspace
- **Stories**:
  - ARC-4.1: Knowledge file system strategy (6-8 hours)
  - ARC-4.2: Knowledge sync with RAG pipeline (8-10 hours)
  - ARC-4.3: Knowledge AI synthesis integration (8-10 hours)
  - ARC-4.4: Knowledge UX/UI for sync status (4-6 hours)

## Quality Standards

### File System Strategy
- ✅ Desktop: FSA API with bi-directional sync
- ✅ Mobile: IndexedDB with sync-to-FSA on desktop
- ✅ Concurrent access: File locking, conflict resolution
- ✅ Permission handling: Graceful degradation, user prompts

### AI Integration
- ✅ Per-file synthesis: Individual file AI processing
- ✅ Batch synthesis: Bulk operations with progress indicators
- ✅ RAG pipeline: Indexing, retrieval, embeddings
- ✅ Tool permissions: Agent can read/write with user consent

## Example Usage

```
"Implement Notes workspace file system E2E using the workspace-file-system-e2e workflow"
```

This will:
1. Define file system strategy (desktop FSA, mobile IndexedDB)
2. Implement sync logic (bi-directional, conflict resolution)
3. Integrate AI synthesis (per-file and batch)
4. Create sync status UI indicators
5. Handle concurrent file access (file locking)
6. Validate with E2E testing

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
