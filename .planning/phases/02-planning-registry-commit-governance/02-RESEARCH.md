# Phase 2: Planning Registry + Commit Governance - Research

**Researched:** 2026-02-10
**Domain:** JSON graph storage, Git integration, Codebase wiki/audit trail
**Confidence:** HIGH

## Summary

Phase 2 builds the governance data layer on top of Phase 1's running application. It has two tracks: (A) a traversable JSON graph for planning artifacts with staleness tracking, and (B) atomic commit enforcement that links every code change to its originating task with structured diff tracking and rationale.

The critical insight is that **most of the data models already exist** in the v2 plugin codebase. `planning-registry.ts` (729 LOC, 52 tests) has full Chain → Artifact → Section hierarchy with timestamps, staleness detection, and outlier scanning. `wiki.ts` (153 LOC) has WikiEntry with commitHash, taskId, filesChanged, and rationale fields. `work-plan.ts` (291 LOC, 56 tests) has TaskResult with filesModified and evidence. Phase 2's job is to **adapt these schemas for the dashboard backend**, build CRUD services, API routes, git integration, and frontend pages.

For git operations, **simple-git** is the standard choice — it wraps the native `git` binary, has full TypeScript types, and handles all operations needed (status, diff, add, commit, log). The OpenCode SDK provides `app.path.cwd` and `app.git` for CWD detection, which is essential for pointing simple-git at the correct project directory.

**Primary recommendation:** Adapt existing `planning-registry.ts` and `wiki.ts` schemas into dashboard backend services. Use `simple-git` for all git operations. Build 3 services (registry, git, wiki) following the existing engine.ts singleton pattern, with Express routes following server.ts conventions.

## User Constraints (from conversation)

### Key User Guidance
- Phase 2 can learn from reference projects (Portal, OpenWork, CodeNomad) for configuration patterns — but those are primarily Phase 1 concerns (provider setup, model selection, agent management)
- The user notes Phase 1 handles "connect to AI provider, model selector, agents selector" — Phase 2 assumes this is complete
- Phase 2 focuses on **planning artifacts** and **commit governance** — not on configuration/settings

### Reference Projects (User Provided)
| Name | Description | Key Learning |
|------|-------------|-------------|
| Portal | Mobile-first web UI for OpenCode | Uses OpenCode SDK `client.app.get()`, `client.app.providers()`, `client.config.get()` for config |
| OpenWork | Open-source alternative to Claude Cowork | React + Vite + TanStack Query + SSE streaming pattern |
| CodeNomad | Desktop, Web, Mobile client for OpenCode | Multi-platform approach, similar provider management |

### Phase 1 Dependencies (Assumed Complete)
- OpenCode engine manager (connect-or-start lifecycle)
- Session proxy with SSE streaming
- Chat interface with structured streaming blocks
- Task bus (Epic → Task → Subtask) with sidebar + detail views
- Governance hooks firing through Express middleware
- React Router app shell with sidebar navigation

## Standard Stack

### Core (New for Phase 2)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| simple-git | ^3.27.0 | Git operations (status, diff, add, commit, log) | Native git binary wrapper, full TypeScript types, serialized command queue, handles edge cases. Context7 verified. |

### Reuse from Phase 1
| Library | Version | Purpose | Already Installed |
|---------|---------|---------|------------------|
| express | ^4.18.2 | API routes for registry, git, wiki | Yes |
| ws | ^8.16.0 | WebSocket for real-time staleness/commit events | Yes |
| @opencode-ai/plugin | ^1.1.52 | OpenCode SDK for CWD/git detection | Yes |
| chokidar | ^4.0.1 | File watching for registry JSON changes | Yes |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| simple-git | isomorphic-git | isomorphic-git is pure JS (works in browser) but slower, more dependencies, weaker TypeScript types. Our use case is server-only — native git wrapper wins. |
| simple-git | child_process + git CLI | Manual parsing of git output. Fragile, no TypeScript types, no built-in error handling. simple-git handles this cleanly. |
| JSON file storage | SQLite (better-sqlite3) | SQLite already in deps. JSON files are simpler for graph data that's read/written as a whole. Planning registry is small enough for JSON. Could migrate to SQLite later if needed. |

**Installation:**
```bash
npm install simple-git
npm install -D @types/simple-git  # Note: types are built-in with simple-git 3.x, may not need this
```

## Architecture Patterns

### Recommended Project Structure (New Files)
```
src/dashboard/backend/
├── engine.ts              # ← EXISTS: OpenCode engine lifecycle
├── server.ts              # ← EXISTS: Express server with routes
├── services/
│   ├── git-service.ts     # NEW: simple-git wrapper singleton
│   ├── registry-service.ts # NEW: Planning registry CRUD + graph traversal
│   └── wiki-service.ts    # NEW: Codebase wiki auto-recording + queries
├── routes/
│   ├── registry-routes.ts # NEW: /api/registry/* endpoints
│   ├── git-routes.ts      # NEW: /api/git/* endpoints
│   └── wiki-routes.ts     # NEW: /api/wiki/* endpoints
└── types/
    └── registry-types.ts  # NEW: Dashboard-specific type adaptations

src/dashboard/frontend/src/
├── pages/
│   ├── PlanningPage.tsx   # NEW: Planning artifact graph view
│   └── WikiPage.tsx       # NEW: Commit history with task linkage
├── components/
│   ├── planning/
│   │   ├── ArtifactTree.tsx    # NEW: Hierarchical artifact browser
│   │   ├── ArtifactDetail.tsx  # NEW: Single artifact view with sections
│   │   ├── StalenessBar.tsx    # NEW: Visual staleness indicator
│   │   └── ChainTimeline.tsx   # NEW: Chain version history
│   ├── wiki/
│   │   ├── CommitList.tsx      # NEW: Commit history list
│   │   ├── CommitDetail.tsx    # NEW: Single commit detail with diff
│   │   └── TaskCommitBadge.tsx # NEW: Badge showing commit count per task
│   └── git/
│       ├── GitStatusBar.tsx    # NEW: Live git status indicator
│       └── DiffViewer.tsx      # NEW: Structured diff display
└── hooks/
    ├── useRegistry.ts     # NEW: TanStack Query hooks for registry API
    ├── useGit.ts          # NEW: TanStack Query hooks for git API
    └── useWiki.ts         # NEW: TanStack Query hooks for wiki API
```

### Pattern 1: Service Singleton (follows engine.ts)
**What:** Each service is a singleton initialized once, injected into Express routes
**When to use:** All new backend services
**Example:**
```typescript
// Source: Adapted from existing src/dashboard/backend/engine.ts pattern
import simpleGit, { SimpleGit, StatusResult, DiffResult } from 'simple-git';

let gitInstance: SimpleGit | null = null;

export function getGitService(cwd: string): SimpleGit {
  if (!gitInstance) {
    gitInstance = simpleGit(cwd);
  }
  return gitInstance;
}

export async function getGitStatus(cwd: string): Promise<StatusResult> {
  const git = getGitService(cwd);
  return git.status();
}

export async function hasUncommittedChanges(cwd: string): Promise<boolean> {
  const status = await getGitStatus(cwd);
  return status.modified.length > 0 
    || status.created.length > 0 
    || status.deleted.length > 0 
    || status.staged.length > 0
    || status.not_added.length > 0;
}

export async function forceTaskCommit(
  cwd: string, 
  taskId: string, 
  rationale: string
): Promise<string> {
  const git = getGitService(cwd);
  // Stage all changes
  await git.add('.');
  // Commit with machine-readable task reference
  const message = `feat(${taskId}): ${rationale}`;
  const result = await git.commit(message);
  return result.commit; // returns commit hash
}
```

### Pattern 2: JSON File Persistence (follows StateManager)
**What:** Planning registry stored as a single JSON file, read/written atomically
**When to use:** Registry data, wiki entries
**Example:**
```typescript
// Source: Adapted from existing src/lib/persistence.ts StateManager pattern
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface RegistryStore {
  artifacts: PlanningArtifact[];
  chains: ArtifactChain[];
  sections: ArtifactSection[];
  metadata: { lastModified: number; version: number };
}

export class RegistryService {
  private store: RegistryStore;
  private filePath: string;

  constructor(dataDir: string) {
    this.filePath = join(dataDir, 'registry.json');
    this.store = this.load();
  }

  private load(): RegistryStore {
    if (existsSync(this.filePath)) {
      return JSON.parse(readFileSync(this.filePath, 'utf-8'));
    }
    return { artifacts: [], chains: [], sections: [], metadata: { lastModified: Date.now(), version: 1 } };
  }

  private save(): void {
    this.store.metadata.lastModified = Date.now();
    const dir = join(this.filePath, '..');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(this.store, null, 2));
  }

  // CRUD operations...
  createArtifact(artifact: PlanningArtifact): PlanningArtifact { /*...*/ }
  getArtifactById(id: string): PlanningArtifact | undefined { /*...*/ }
  findStaleArtifacts(thresholdMs: number): PlanningArtifact[] { /*...*/ }
  traverseChain(chainId: string): PlanningArtifact[] { /*...*/ }
}
```

### Pattern 3: Express Route Module (follows server.ts)
**What:** Route handlers extracted into separate files, mounted on the Express app
**When to use:** All new API endpoints
**Example:**
```typescript
// Source: Following existing src/dashboard/backend/server.ts pattern
import { Router } from 'express';
import type { RegistryService } from '../services/registry-service';

export function createRegistryRoutes(registryService: RegistryService): Router {
  const router = Router();

  // GET /api/registry/artifacts
  router.get('/artifacts', async (req, res) => {
    try {
      const artifacts = registryService.getAllArtifacts();
      res.json({ artifacts });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch artifacts' });
    }
  });

  // GET /api/registry/artifacts/:id
  router.get('/artifacts/:id', async (req, res) => {
    const artifact = registryService.getArtifactById(req.params.id);
    if (!artifact) return res.status(404).json({ error: 'Not found' });
    res.json({ artifact });
  });

  // POST /api/registry/artifacts
  router.post('/artifacts', async (req, res) => {
    const artifact = registryService.createArtifact(req.body);
    res.status(201).json({ artifact });
  });

  // GET /api/registry/stale?threshold=86400000
  router.get('/stale', async (req, res) => {
    const threshold = parseInt(req.query.threshold as string) || 86400000; // 24h default
    const stale = registryService.findStaleArtifacts(threshold);
    res.json({ stale, threshold });
  });

  return router;
}
```

### Pattern 4: Commit Governance Hook
**What:** Task completion intercepted to enforce git commit before marking done
**When to use:** `tasks_done` lifecycle verb integration
**Example:**
```typescript
// Source: Adapted from existing src/tools/tasks.ts tasks_done pattern
// This hooks into the task completion flow
export async function enforceCommitOnCompletion(
  taskId: string,
  evidence: string,
  cwd: string
): Promise<{ allowed: boolean; commitHash?: string; reason?: string }> {
  const status = await getGitStatus(cwd);
  
  const hasChanges = status.modified.length > 0 
    || status.created.length > 0 
    || status.deleted.length > 0
    || status.not_added.length > 0;

  // DEL-03: No changes = blocked
  if (!hasChanges) {
    return { 
      allowed: false, 
      reason: 'No file changes detected. Task completion requires evidence of work (git diff must not be empty).' 
    };
  }

  // DEL-02: Force commit with task reference
  const commitHash = await forceTaskCommit(cwd, taskId, evidence);
  
  return { allowed: true, commitHash };
}
```

### Anti-Patterns to Avoid
- **Global git instance without CWD:** simple-git MUST be initialized with the project's CWD from `app.path.cwd`, not the dashboard's directory
- **Polling for git status:** Use event-driven approach (chokidar watching `.git/index`) instead of polling
- **Monolithic server.ts:** Route handlers MUST be in separate files under `routes/`. The existing server.ts is already 721 LOC
- **Direct schema import from plugin:** Dashboard backend should use adapted types, not directly import from `src/schemas/` (different compilation target)
- **Synchronous git operations:** All simple-git calls are async. Never use sync alternatives

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Git status/diff/commit | Custom child_process wrapper | `simple-git` | Handles edge cases (binary files, large diffs, encoding), has built-in command serialization, full TypeScript types |
| Diff parsing | Custom diff parser | `simple-git` `.diffSummary()` | Returns structured `DiffResult` with files changed, insertions, deletions per file |
| Commit message parsing | Regex on git log | `simple-git` `.log()` with `--format` | Returns structured `LogResult` with hash, date, message, author fields |
| JSON file locking | Custom lock file | `proper-lockfile` (if needed) | File-level locking for concurrent access. May not need if single-process Express server |
| Graph traversal | Custom BFS/DFS | Reuse `resolveChainHead`, `getChainHistory` from `planning-registry.ts` | Already implemented and tested (52 assertions) |
| Staleness detection | Custom timestamp checks | Reuse `findStaleSections`, `computeSectionHash` from `planning-registry.ts` | Already implemented with configurable thresholds |
| Wiki entry creation | Custom git hook parser | Build as service layer function called from route handler | Wiki entries are app-level structured data, not raw git hooks |

**Key insight:** The biggest risk in Phase 2 is building custom implementations when tested schemas already exist. The `planning-registry.ts` module has 729 LOC of battle-tested graph operations. Adapt, don't rewrite.

## Common Pitfalls

### Pitfall 1: Git CWD Confusion
**What goes wrong:** simple-git operates on the dashboard's directory instead of the user's project
**Why it happens:** The dashboard backend runs from `src/dashboard/backend/` but needs to operate on the project detected by OpenCode
**How to avoid:** Always get CWD from `app.path.cwd` via the engine manager. Pass CWD when initializing git service.
**Warning signs:** "Not a git repository" errors, wrong files appearing in status

### Pitfall 2: Staged vs Unstaged Diff Mismatch
**What goes wrong:** `git diff` shows nothing but files ARE changed (they're staged). Or vice versa.
**Why it happens:** `git diff` shows only unstaged changes. `git diff --staged` shows only staged. Need both for commit governance.
**How to avoid:** Use `git.status()` which returns both staged and unstaged in a unified `StatusResult` with `modified`, `staged`, `created`, `deleted`, `not_added` arrays.
**Warning signs:** DEL-03 incorrectly blocking when changes exist, or DEL-02 missing staged changes

### Pitfall 3: Research/Doc Tasks Have No Code Diff
**What goes wrong:** DEL-03 blocks completion of research tasks that legitimately produce no code changes
**Why it happens:** Not all tasks produce code. Investigation, analysis, and planning tasks create artifacts but don't modify source files.
**How to avoid:** Task types need a classification. Research/planning tasks should have a `requiresDiff: false` flag. Only `development`/`implementation` tasks enforce diff gating.
**Warning signs:** Users unable to complete research tasks, constant override needed

### Pitfall 4: Race Conditions on Git Operations
**What goes wrong:** Two concurrent sessions try to commit at the same time, causing merge conflicts or corrupted index
**Why it happens:** Multiple browser tabs or agents running in parallel, all trying to stage/commit
**How to avoid:** simple-git has a built-in command queue (sequential by default). Additionally, use a mutex/semaphore at the service level to serialize commit operations.
**Warning signs:** "index.lock" errors, partial commits, interleaved file staging

### Pitfall 5: Large Diff Output Crashes Frontend
**What goes wrong:** A task that modifies many files produces a massive diff that the frontend can't render
**Why it happens:** `git diff` output for large changes can be megabytes of text
**How to avoid:** Paginate diff output. Use `git.diffSummary()` for the overview (file list + stats), then lazy-load individual file diffs on demand. Set a max diff size limit.
**Warning signs:** Browser tab freezing, API timeouts, memory spikes

### Pitfall 6: Planning Registry Schema Migration
**What goes wrong:** Directly importing `src/schemas/planning-registry.ts` fails because the dashboard backend has a different TypeScript compilation target
**Why it happens:** The plugin schemas are compiled for ESM + Node, the dashboard might have different settings
**How to avoid:** Create a `registry-types.ts` in the dashboard's types directory that re-exports or adapts the interfaces. Use the schema interfaces as contracts, implement CRUD in the service layer.
**Warning signs:** TypeScript compilation errors, circular imports, module resolution failures

### Pitfall 7: Untracked Files Invisible to `git diff`
**What goes wrong:** New files created by the agent don't appear in `git diff` output
**Why it happens:** `git diff` only shows changes to tracked files. New files are "untracked" until staged.
**How to avoid:** Use `git.status()` which includes `not_added` (untracked files) and `created` (staged new files). For DEL-02/DEL-03, check status comprehensively.
**Warning signs:** DEL-03 says "no changes" when new files were clearly created

### Pitfall 8: Commit Message Format Conflicts
**What goes wrong:** Task ID format in commit messages conflicts with existing project conventions
**Why it happens:** Project might use conventional commits, Angular style, or custom format
**How to avoid:** Make commit message format configurable. Default to conventional commits: `feat(<taskId>): <rationale>`. Allow override in governance config.
**Warning signs:** CI/CD rejecting commits, git hooks failing on commit message validation

## Code Examples

### simple-git: Status and Diff (Verified)
```typescript
// Source: Context7 /steveukx/git-js — verified API
import simpleGit, { SimpleGit, StatusResult } from 'simple-git';

const git: SimpleGit = simpleGit('/path/to/project');

// Get comprehensive status
const status: StatusResult = await git.status();
console.log('Modified:', status.modified);      // ['src/foo.ts']
console.log('Created:', status.created);        // staged new files
console.log('Not added:', status.not_added);    // untracked files
console.log('Deleted:', status.deleted);        // deleted files
console.log('Staged:', status.staged);          // files in staging area
console.log('Is clean:', status.isClean());     // true if no changes

// Get diff summary (structured)
const diffSummary = await git.diffSummary();
console.log('Files changed:', diffSummary.changed);
console.log('Insertions:', diffSummary.insertions);
console.log('Deletions:', diffSummary.deletions);
diffSummary.files.forEach(f => {
  console.log(`  ${f.file}: +${f.insertions} -${f.deletions}`);
});

// Get raw diff for a specific file
const fileDiff = await git.diff(['--', 'src/foo.ts']);

// Get commit log
const log = await git.log({ maxCount: 20 });
log.all.forEach(entry => {
  console.log(`${entry.hash.slice(0,7)} ${entry.message} (${entry.date})`);
});
```

### simple-git: Atomic Commit (Verified)
```typescript
// Source: Context7 /steveukx/git-js — verified API
import simpleGit from 'simple-git';

const git = simpleGit('/path/to/project');

// Stage specific files
await git.add(['src/services/registry.ts', 'src/routes/registry-routes.ts']);

// Or stage all changes
await git.add('.');

// Commit with structured message
const result = await git.commit('feat(task-abc123): implement planning registry service\n\nAdded CRUD operations for planning artifacts with chain traversal.');
console.log('Commit hash:', result.commit);
console.log('Branch:', result.branch);
console.log('Summary:', result.summary);
```

### OpenCode SDK: App Info + Git Detection (Verified)
```typescript
// Source: Context7 /sst/opencode-sdk-js — verified API
import Opencode from '@opencode-ai/sdk';

const client = new Opencode();

// Get app info including CWD and git status
const app = await client.app.get();
console.log('CWD:', app.path.cwd);        // Project directory
console.log('Config:', app.path.config);   // OpenCode config path
console.log('Git:', app.git);             // Git repository info
console.log('Hostname:', app.hostname);

// Use CWD for simple-git initialization
const git = simpleGit(app.path.cwd);
```

### Existing Schema Reuse: Planning Registry (Already Tested)
```typescript
// Source: src/schemas/planning-registry.ts (729 LOC, 52/52 tests)
// These interfaces already exist and should be adapted:

interface PlanningArtifact {
  id: string;
  title: string;
  tier: 'T1' | 'T2' | 'T3';           // T1=master plan, T2=phase plan, T3=task spec
  chain: string;                        // which chain this belongs to
  sections: ArtifactSection[];
  status: ArtifactStatus;               // draft | active | stale | archived
  createdAt: number;
  modifiedAt: number;
  linkedTaskIds: string[];              // links to TaskNode IDs
}

interface ArtifactSection {
  id: string;
  artifactId: string;
  heading: string;
  contentHash: string;                  // for change detection
  lastVerified: number;                 // when last checked for staleness
  stale: boolean;
}

interface ArtifactChain {
  id: string;
  name: string;
  headArtifactId: string;              // current version
  history: string[];                    // previous artifact IDs (version chain)
  createdAt: number;
}

// Existing helpers to reuse:
// - createPlanningArtifact(partial) → PlanningArtifact
// - resolveChainHead(chain) → PlanningArtifact
// - getChainHistory(chainId, registry) → PlanningArtifact[]
// - findStaleSections(registry, thresholdMs) → ArtifactSection[]
// - computeSectionHash(content) → string
// - linkTaskToArtifact(taskId, artifactId, registry) → void
// - findOutliers(registry) → Outlier[]
```

### Existing Schema Reuse: Wiki (Already Exists)
```typescript
// Source: src/schemas/wiki.ts (153 LOC)
// These interfaces already exist:

interface WikiEntry {
  id: string;
  commitHash: string;                   // git commit SHA
  taskId: string;                       // which task this commit belongs to
  filesChanged: FileChange[];           // structured diff data
  rationale: string;                    // "why" field (WIKI-03)
  description: string;                  // human-readable summary
  timestamp: number;
}

interface FileChange {
  path: string;
  action: 'added' | 'modified' | 'deleted' | 'renamed';
  diffHash: string;                     // hash of the diff content
  insertions: number;
  deletions: number;
}

interface WikiStore {
  entries: WikiEntry[];
}

// Existing query helpers:
// - queryByTaskId(taskId, store) → WikiEntry[]
// - queryByFile(filePath, store) → WikiEntry[]
// - queryByDateRange(start, end, store) → WikiEntry[]
```

## API Design

### Registry API
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/registry/artifacts` | List all artifacts (with optional `?tier=T1&status=active` filters) |
| GET | `/api/registry/artifacts/:id` | Get single artifact with sections |
| POST | `/api/registry/artifacts` | Create new artifact |
| PUT | `/api/registry/artifacts/:id` | Update artifact |
| DELETE | `/api/registry/artifacts/:id` | Archive (soft-delete) artifact |
| GET | `/api/registry/chains` | List all chains |
| GET | `/api/registry/chains/:id/history` | Get chain version history |
| GET | `/api/registry/stale` | Get stale artifacts/sections |
| POST | `/api/registry/artifacts/:id/link-task` | Link a task to an artifact |

### Git API
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/git/status` | Current working tree status |
| GET | `/api/git/diff` | Diff summary (files + stats) |
| GET | `/api/git/diff/:path` | Diff for specific file |
| GET | `/api/git/log` | Recent commit log (paginated) |
| POST | `/api/git/commit` | Force commit (used by task completion) |

### Wiki API
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/wiki/entries` | List wiki entries (with filters) |
| GET | `/api/wiki/entries/task/:taskId` | Entries for a specific task |
| GET | `/api/wiki/entries/file/:path` | Entries touching a specific file |
| GET | `/api/wiki/entries/:id` | Single entry detail |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Flat markdown planning files | JSON graph with Chain → Artifact → Section hierarchy | Phase 2 design | Enables programmatic traversal, staleness detection, cross-referencing |
| Manual git commits | Atomic commit enforcement on task completion | Phase 2 design | Full traceability — every change linked to a task |
| Unstructured commit messages | Machine-readable task references in commit messages | Phase 2 design | Enables reverse lookup: commit → task → plan |
| No rationale tracking | "Why" field required on every code change | Phase 2 design | AI agents can reason about past decisions when traversing context |

**Key evolution from Phase 1:** Phase 1 established the task hierarchy and governance hooks. Phase 2 makes governance *auditable* — every action leaves a trace that can be queried, visualized, and traversed.

## Reference Project Insights

### From Portal (hosenur/portal)
- Uses Vite + React with TanStack Query for API state management
- Connects to OpenCode via SDK's `/app`, `/session`, `/config` endpoints
- Configuration UI: provider selection, model picker, API key management
- **Learning for Phase 2:** Their settings page pattern could inform registry configuration UI (staleness thresholds, commit message format)

### From OpenWork (different-ai/openwork)
- React + TanStack Router + Vite stack
- SSE streaming pattern for real-time updates
- Multi-provider support through OpenCode's provider API
- **Learning for Phase 2:** Their real-time update pattern via SSE applies to live git status updates and staleness notifications

### From CodeNomad (NeuralNomadsAI/CodeNomad)
- Multi-platform (Desktop, Web, Mobile) sharing code
- Provider management through a unified settings interface
- **Learning for Phase 2:** Their cross-platform data synchronization patterns could inform registry persistence strategy

**Key takeaway:** All reference projects confirm the pattern of using OpenCode SDK for provider/model/agent management (Phase 1 concern), while Phase 2's planning registry and commit governance are **unique differentiators** not present in any reference project. This is novel functionality.

## Open Questions

1. **Diff gating for non-code tasks**
   - What we know: DEL-03 blocks completion if no diff exists
   - What's unclear: How to classify tasks as "requires code changes" vs "research/planning"
   - Recommendation: Add a `requiresDiff: boolean` field to TaskNode. Default `true` for `development`/`implementation` categories, `false` for `research`/`governance`. Allow override at task creation.

2. **Commit message format configurability**
   - What we know: Need machine-readable task ID in commit messages (WIKI-01)
   - What's unclear: Should it be conventional commits? Angular? Custom?
   - Recommendation: Default to conventional commits (`feat(<taskId>): <rationale>`). Store format template in governance config. Parse with a simple regex.

3. **Registry storage location**
   - What we know: `.idumb/brain/` has existing JSON files for plan state
   - What's unclear: Should registry data live in `.idumb/` (governance data) or in the dashboard's data directory?
   - Recommendation: Store in `.idumb/registry/` (project-level, git-tracked). This makes the planning graph part of the project, not just the dashboard.

4. **Concurrent session safety**
   - What we know: simple-git serializes commands internally
   - What's unclear: What happens when two browser tabs try to complete tasks simultaneously?
   - Recommendation: Implement a service-level mutex for commit operations. simple-git's internal queue handles individual git commands but not multi-step atomic operations (status check → stage → commit).

5. **Frontend graph visualization library**
   - What we know: Need to visualize Chain → Artifact → Section hierarchy
   - What's unclear: Best React library for interactive hierarchical graphs
   - Recommendation: Start with a simple tree view (expandable/collapsible) using existing UI components. Evaluate `react-flow` or `@xyflow/react` if interactive graph editing is needed later. Don't over-engineer the first pass.

## Sources

### Primary (HIGH confidence)
- Context7 `/steveukx/git-js` — simple-git API (status, diff, commit, log operations verified)
- Context7 `/sst/opencode-sdk-js` — OpenCode SDK API (session, app, config, provider endpoints verified)
- Context7 `/sst/opencode` — OpenCode plugin hooks and custom tool definitions verified
- `src/schemas/planning-registry.ts` (729 LOC, 52/52 tests) — existing planning registry schema
- `src/schemas/wiki.ts` (153 LOC) — existing wiki entry schema
- `src/schemas/work-plan.ts` (291 LOC, 56/56 tests) — existing work plan schema with TaskResult

### Secondary (MEDIUM confidence)
- GitHub repos: Portal, OpenWork, CodeNomad — confirmed existence and tech stacks via web research
- `src/dashboard/backend/engine.ts` — existing engine singleton pattern (service architecture reference)
- `src/dashboard/backend/server.ts` — existing Express route patterns

### Tertiary (LOW confidence)
- `simple-git` latest version (^3.27.0) — confirmed via Context7, but exact latest patch version not verified
- Concurrent session safety approach — recommendation based on general patterns, not tested in this codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — simple-git verified via Context7, all other deps already in use
- Architecture: HIGH — follows existing engine.ts/server.ts patterns, schemas already exist
- Pitfalls: HIGH — git edge cases well-documented, schema migration path clear
- API design: MEDIUM — follows REST conventions, but exact response shapes may evolve
- Frontend: MEDIUM — component structure proposed but UI complexity depends on Phase 1 component library

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (30 days — stable domain, no fast-moving dependencies)
