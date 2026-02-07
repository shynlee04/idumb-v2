---
name: Knowledge Sync Strategy
description: Specialized workflow for implementing Knowledge workspace file synchronization with RAG pipeline integration, source import handling, and AI synthesis. Use this workflow when implementing sync for Knowledge workspace, integrating RAG indexing with file sync, or handling source document imports.
---

# Knowledge Sync Strategy Workflow

This Workflow provides Claude Code with step-by-step guidance for implementing Knowledge workspace sync.

## When to use this workflow

- When implementing Knowledge workspace file system sync
- When integrating RAG pipeline with file synchronization
- When handling source document imports (PDF, URL, local files)
- When managing embeddings sync with document changes
- When creating sync status indicators for Knowledge workspace

## Workflow Steps

### Step 1: Knowledge File System Strategy (2-3 hours)
**Agent**: file-sync-specialist
**Input**: Knowledge workspace requirements
**Output**: File system strategy document

**Acceptance Criteria**:
- [ ] Desktop: FSA API with source document storage
- [ ] Mobile: IndexedDB with sync-to-FSA on desktop
- [ ] Document format support (PDF, Markdown, plain text)
- [ ] Folder structure defined (collections, sources, embeddings)
- [ ] Permission handling (read/write per collection)

### Step 2: RAG Pipeline Integration (4-6 hours)
**Agent**: workspace-architect
**Input**: File system strategy
**Output**: RAG sync implementation

**Acceptance Criteria**:
- [ ] Document indexing (chunking, embedding, storage)
- [ ] Incremental updates (only reindex changed documents)
- [ ] Embedding sync (Orama WASM with IndexedDB)
- [ ] Search integration (RAG query with file system)
- [ ] Source import handling (PDF parser, URL fetcher, local file reader)

### Step 3: AI Synthesis Integration (4-6 hours)
**Agent**: workspace-architect
**Input**: RAG sync implementation
**Output**: AI integration with Knowledge workspace

**Acceptance Criteria**:
- [ ] Per-document AI synthesis (summarize, extract key points)
- [ ] Batch AI synthesis (process entire collection)
- [ ] RAG-powered search (semantic search with citations)
- [ ] AI tool permissions (read documents, write summaries)
- [ ] Progress indicators for long-running operations

### Step 4: Sync Status UX/UI (2-3 hours)
**Agent**: component-splitter
**Input**: AI integration
**Output**: Sync status UI components

**Acceptance Criteria**:
- [ ] Sync status indicator (syncing, synced, indexing, offline)
- [ ] Import progress UI (source import with progress bar)
- [ ] Indexing progress UI (chunking, embedding, indexing stages)
- [ ] Search results UI (semantic search with citations)
- [ ] Error states (import failed, indexing failed, retry button)

### Step 5: Validation & Testing (2-3 hours)
**Agent**: test-writer
**Input**: Complete Knowledge sync implementation
**Output**: Test suite + validation report

**Acceptance Criteria**:
- [ ] Unit tests for sync logic (CRUD, RAG integration)
- [ ] Integration tests (sync + embeddings + search)
- [ ] E2E tests (critical user journeys: import, search, AI synthesis)
- [ ] Test coverage ≥80%
- [ ] Zero data loss scenarios validated

## Example Usage

```
"Implement Knowledge sync strategy using the knowledge-sync-strategy workflow"
```

## Validation Commands

```bash
# TypeScript check
pnpm tsc --noEmit --incremental

# Test suite
pnpm test

# Knowledge-specific tests
pnpm test knowledge-*

# RAG validation
pnpm test rag-*

# Sync validation
pnpm test sync-knowledge-*
```

## Success Criteria

- ✅ Knowledge file system sync working (read, write, sync)
- ✅ RAG pipeline integrated (indexing, search, retrieval)
- ✅ Source imports working (PDF, URL, local files)
- ✅ AI integration working (per-document, batch, RAG search)
- ✅ Sync status indicators visible (syncing, indexing, offline)
- ✅ Embeddings sync working (Orama WASM with IndexedDB)
- ✅ Zero data loss scenarios
- ✅ Test coverage ≥80%
- ✅ E2E tests passing

## Artifacts

For detailed workflow documentation, refer to:
[Knowledge Sync Strategy Workflow](../../../../_bmad/modules/architecture-remediation/workflows/knowledge-sync-strategy.md)
