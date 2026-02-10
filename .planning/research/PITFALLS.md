# Pitfalls Research

**Domain:** AI Code IDE + Workspace Foundation (Monaco, Terminal, i18n, Governed Workspace)
**Researched:** 2026-02-10
**Confidence:** HIGH (Monaco, Terminal, Scope Creep, i18n) | MEDIUM (TanStack, SDK Dependency, Schema-First) | HIGH (Vietnamese Localization — confirmed bugs)

---

## Critical Pitfalls

These cause rewrites, project death, or multi-week delays. Each has killed real projects.

### Pitfall 1: Monaco Editor Memory Leaks and Bundle Bloat

**What goes wrong:**
Monaco loads ~3-5MB of JavaScript including web workers for syntax highlighting, IntelliSense, and diff computation. Developers add it naively to a React app and get: (a) main bundle doubles in size, (b) editor instances leak memory on navigation, (c) web workers fail silently in Vite without explicit configuration. The diff editor specifically has a **confirmed open memory leak** (GitHub microsoft/monaco-editor#4659, Aug 2024 — still open) where disposing the DiffEditor does not release all memory, causing steady growth in long-running sessions.

**Why it happens:**
- Monaco uses AMD modules internally, conflicting with Vite's ESM-only bundling
- `@monaco-editor/react` handles lazy loading via `@monaco-editor/loader`, but developers still import languages/themes eagerly
- React component unmount doesn't automatically call `editor.dispose()` — must be explicit
- Web workers need special Vite configuration; without `vite-plugin-monaco-editor-esm` or manual worker URL setup, Monaco falls back to synchronous mode (no syntax highlighting, no autocomplete)

**How to avoid:**
1. **Use `@monaco-editor/react`** (not raw `monaco-editor`) — it handles async loading and CDN fallback
2. **Install `vite-plugin-monaco-editor-esm`** — required for web workers with Vite, bundles workers to `node_modules/.monaco` directory
3. **Lazy-load the entire editor page** via `React.lazy()` — Monaco should never be in the main bundle
4. **Explicit disposal in useEffect cleanup:**
   ```typescript
   useEffect(() => {
     return () => {
       editorRef.current?.dispose()
       // Dispose all models when leaving the page
       monaco.editor.getModels().forEach(m => m.dispose())
     }
   }, [])
   ```
5. **Import only needed languages** — `import 'monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution'` instead of everything
6. **Avoid DiffEditor for real-time use** until #4659 is fixed — use it for static diff display only, dispose aggressively
7. **Set `manualChunks` in Vite config** to isolate Monaco into its own chunk:
   ```typescript
   build: {
     rollupOptions: {
       output: {
         manualChunks: {
           monaco: ['monaco-editor'],
         }
       }
     }
   }
   ```

**Warning signs:**
- Bundle size warning: "Some chunks are larger than 500 kB after minification"
- Browser memory usage climbs steadily when navigating to/from editor pages
- Syntax highlighting doesn't work in production build (workers not loaded)
- Console errors about AMD/define conflicts

**Phase to address:** Stage 1 — Code IDE. Must be solved at integration time, not retroactively.

**Confidence:** HIGH — confirmed via GitHub issues, Context7 docs, multiple sources

---

### Pitfall 2: Scope Creep Kills Code IDEs (The project-alpha-master Pattern)

**What goes wrong:**
Building a Code IDE triggers an irresistible gravity toward "just one more feature." project-alpha-master died from exactly this: WebContainer patterns, block editors, agent packages — each individually reasonable, collectively fatal. The pattern is: Monaco works -> "let's add LSP" -> "we need a file tree" -> "the file tree needs git status" -> "git status needs a git integration" -> "git integration needs diff view" -> "diff view needs merge conflict resolution" -> project dies at 60% completion of everything, 100% completion of nothing.

**Why it happens:**
- Code editors create an **expectation cascade**: once you have an editor, users expect IDE features
- Each feature unlocks demand for two more features (LSP needs language servers, language servers need package management, etc.)
- Developers confuse "what VS Code has" with "MVP for our use case"
- The integration surface area between features is enormous — file tree + editor + terminal + git + LSP are all coupled

**How to avoid:**
1. **Define the NOT-MVP list before starting** and enforce it:
   - NOT MVP: LSP/IntelliSense, Git integration in UI, extensions/plugins, collaborative editing, debugger, minimap, breadcrumbs, command palette
   - IS MVP: File tree (read-only to start), single editor tab, basic terminal, syntax highlighting (built-in Monaco, no LSP)
2. **Time-box Stage 1 to 3 weeks maximum** — if it's not done in 3 weeks, cut scope, don't extend
3. **"One feature at a time" rule** — file tree is complete before terminal starts; terminal is complete before diff view starts
4. **No "while we're at it" features** — track them in a backlog, never add them to the current sprint
5. **Acceptance criteria before implementation** — each Code IDE feature gets 3-5 concrete acceptance criteria, not "build file tree"

**Warning signs:**
- Adding features to the current sprint before the previous feature is merged
- "This will only take a few hours" for features that touch Monaco, terminal, or file system
- PR descriptions that mention 2+ unrelated features
- File tree starting to include git status badges, file icons, or drag-drop before basic navigation works

**Phase to address:** Pre-Stage 1. Define MVP boundaries in PLAN.md before writing any Code IDE code.

**Confidence:** HIGH — direct evidence from project-alpha-master failure + v2 Phase 1A over-templating (1463 LOC templates.ts)

---

### Pitfall 3: Terminal PTY Security and Process Isolation

**What goes wrong:**
`node-pty` spawns a real shell process with the server's user permissions. Without isolation, any user with terminal access can: read/write any file the server can access, install malware, exfiltrate data, pivot to other services, or `rm -rf /`. This is not theoretical — it's the default behavior. Additionally, PTY processes that aren't cleaned up on WebSocket disconnect become zombie processes consuming resources indefinitely.

**Why it happens:**
- `node-pty` is a thin wrapper over `forkpty(3)` — it provides zero security by design
- WebSocket disconnects don't automatically kill PTY processes
- node-pty requires native compilation (`node-gyp`), which fails on many CI environments and Apple Silicon without Xcode CLI tools
- Developers test on localhost where security feels irrelevant, then deploy without adding isolation

**How to avoid:**
1. **For self-hosted/local use (iDumb's case):** PTY security is lower priority since the user IS the server admin. BUT still implement:
   - Process tracking: maintain a `Map<sessionId, pty.IPty>` and kill on disconnect
   - Max concurrent terminals per session (3-5)
   - Idle timeout (kill shells inactive >30 minutes)
   - `cwd` restriction to the project directory
2. **WebSocket auth on every connection** — not just the HTTP upgrade:
   ```typescript
   wss.on('connection', (ws, req) => {
     const token = new URL(req.url, 'http://localhost').searchParams.get('token')
     if (!validateToken(token)) { ws.close(1008, 'Unauthorized'); return }
   })
   ```
3. **Graceful cleanup on server shutdown:**
   ```typescript
   process.on('SIGTERM', () => {
     activePtys.forEach(pty => pty.kill())
     process.exit(0)
   })
   ```
4. **Use WebSocket for terminal data** (not SSE or polling) — xterm.js expects bidirectional binary data
5. **Handle node-pty native binding gracefully** — provide clear error if compilation fails, don't crash the entire dashboard

**Warning signs:**
- `lsof | grep pty` shows dozens of orphaned PTY processes after browser tabs close
- Server memory climbs over hours of terminal use
- `npm install` fails on CI because node-pty can't compile
- Terminal works in dev but fails in production Docker container

**Phase to address:** Stage 1 — Terminal integration. Process cleanup must ship with the terminal, not after.

**Confidence:** HIGH — node-pty docs, Noxterm architecture analysis, xterm.js integration patterns

---

### Pitfall 4: Schema-First Paralysis (The Unconsumed Schema Trap)

**What goes wrong:**
iDumb v2 already demonstrates this: `planning-registry.ts` (729 LOC), `task-graph.ts` (605 LOC), `coherent-knowledge.ts` (235 LOC), `wiki.ts` (153 LOC) — schemas that are unit-tested but have **zero runtime consumers**. The schemas are architecturally correct but practically useless until something reads/writes them. Adding Code IDE features with the same pattern means: design FileNode schema (300 LOC), design TerminalSession schema (200 LOC), design DiffResult schema (150 LOC)... all before writing a single React component. Two weeks pass with zero visible progress.

**Why it happens:**
- Schema-first feels productive — types are clean, tests pass, architecture looks solid
- It's a comfort zone for TypeScript developers — types are easy, UI is hard
- Previous iDumb patterns established this as "the way we do things"
- Analysis paralysis disguised as engineering discipline

**How to avoid:**
1. **"Schema follows implementation" for UI features** — build the simplest Monaco wrapper first, then extract types from what you actually needed
2. **Max 50 LOC of new schema per feature** — if a schema needs more, you're over-designing
3. **Every schema must have a consumer within the same PR** — no orphan schemas
4. **Time limit: 2 hours max on schema design** — if it's not done in 2 hours, implement with `any` and refine
5. **Schema-first is still correct for**: API contracts between backend/frontend, persistence formats, and SDK integration types. It is NOT correct for: internal UI state, transient display data, or features you haven't built yet.
6. **Quarterly "unconsumed schema audit"** — delete any schema that has no runtime consumer after 30 days

**Warning signs:**
- A PR that adds 500+ LOC of types with no React component or API route
- Test files that validate schema shapes but no integration tests
- `schemas/` directory growing faster than `components/` directory
- "We'll wire this up later" in PR descriptions (you won't)

**Phase to address:** Continuous — but especially dangerous in Stage 1 Code IDE. Define a "schema budget" per feature.

**Confidence:** HIGH — direct evidence from iDumb v2 codebase (2000+ LOC of unconsumed schemas)

---

### Pitfall 5: OpenCode SDK Single-Dependency Risk

**What goes wrong:**
iDumb's entire value proposition depends on OpenCode SDK. The project already experienced one major pivot: from `@opencode-ai/plugin` architecture to SDK-direct calls, causing the entire `_archived-plugin/` directory (7 hooks + 7 tools + hundreds of tests) to become dead code. If the SDK changes its API again, introduces breaking changes, gets deprecated, or pivots direction, iDumb faces another multi-week rewrite. The current abstraction layer (`engine.ts` at 235 LOC) is thin but good — the risk is that it's not thick enough.

**Why it happens:**
- Startups building on another startup's SDK inherit that startup's risk
- SDK APIs change fast in early stages — OpenCode is pre-1.0
- Tight coupling feels natural when you're building fast
- "We'll abstract later" never happens

**How to avoid:**
1. **Keep the `engine.ts` abstraction** — it's the right pattern. All OpenCode calls go through this wrapper
2. **Define YOUR interface, not OpenCode's** — `engine.ts` should export `startSession()`, `sendMessage()`, `getStatus()` with iDumb-specific types, not pass through OpenCode types
3. **Mock-first testing** — all tests mock the engine interface, never call OpenCode directly
4. **Document the exact SDK surface used** — iDumb probably uses <10% of the OpenCode SDK. Document which functions, which types. Smaller surface = easier migration
5. **Fallback strategy for critical paths:**
   - If SDK is unavailable: dashboard still loads, shows "Engine disconnected" state
   - If SDK removes a feature: the interface contract stays, implementation adapts
   - If SDK changes response format: only `engine.ts` needs updating
6. **Version-pin the SDK** in package.json, upgrade deliberately with a test cycle

**Warning signs:**
- Import of `@opencode-ai/*` anywhere outside `engine.ts` or `sdk-client.ts`
- OpenCode-specific types leaking into React components
- Tests that fail when OpenCode SDK isn't installed/running
- engine.ts growing beyond 500 LOC (means it's doing too much)

**Phase to address:** Stage 1 — establish the engine abstraction before adding Code IDE features that depend on it.

**Confidence:** MEDIUM — based on v2 Phase 1A pivot experience and general SDK dependency patterns. OpenCode SDK stability is unknown.

---

## Moderate Pitfalls

These cause 1-2 week delays but are recoverable with effort.

### Pitfall 6: i18n Retrofitting After Features Exist

**What goes wrong:**
Adding i18n to an existing React app with 34+ components means: finding every hardcoded string (hundreds), replacing each with `t('key')`, choosing key naming conventions, handling pluralization, managing text expansion (Vietnamese text is ~10-20% longer than English), and ensuring no string concatenation remains. The retrofitting cost grows superlinearly with the number of existing components.

**Why it happens:**
- "We'll add i18n later" — every project says this, and it always costs 3x more than doing it from the start
- Hardcoded strings are invisible until you search for them
- String concatenation patterns like `` `Hello ${name}` `` break when translated (word order differs)
- Developers don't realize that Vietnamese needs different date formats (DD/MM/YYYY), number formats (1.000,00), and currency (VND with ₫ suffix)

**How to avoid:**
1. **Add `react-i18next` infrastructure NOW, before any new components** — even if only English translations exist initially:
   ```typescript
   // i18n.ts — setup once, use everywhere
   import i18n from 'i18next'
   import { initReactI18next } from 'react-i18next'
   import LanguageDetector from 'i18next-browser-languagedetector'
   ```
2. **Namespace by feature, not by page:**
   ```
   /locales/en/common.json    — shared UI (buttons, labels, errors)
   /locales/en/editor.json    — Code IDE strings
   /locales/en/terminal.json  — terminal strings
   /locales/en/tasks.json     — task management strings
   /locales/vi/common.json    — Vietnamese equivalents
   ```
3. **Key naming convention** — `feature.context.element`:
   ```json
   {
     "editor.toolbar.save": "Save",
     "editor.toolbar.undo": "Undo", 
     "editor.status.modified": "Modified",
     "editor.status.saved": "Saved"
   }
   ```
   NOT flat keys like `"save"`, `"undo"` — these collide across features
4. **Never concatenate translated strings** — use interpolation:
   ```typescript
   // BAD: t('edited') + ' ' + t('by') + ' ' + name
   // GOOD: t('editor.editedBy', { name })
   // Vietnamese word order: "Đã chỉnh sửa bởi {{name}}"
   ```
5. **Retrofit existing 34 components in a single dedicated sprint** — don't sprinkle i18n across feature PRs
6. **Use `Trans` component for JSX interpolation**, not string concatenation

**Warning signs:**
- New components committed with hardcoded strings after i18n decision
- Translation files growing beyond 200 keys without namespace organization
- Tests breaking because translation keys don't match
- Vietnamese text overflowing UI containers (10-20% text expansion)

**Phase to address:** Stage 1 — add i18n infrastructure with the first Code IDE components. Retrofit existing components as a dedicated task.

**Confidence:** HIGH — react-i18next docs, multiple community guides, confirmed patterns

---

### Pitfall 7: Vietnamese Localization — IME, Encoding, and UX Gotchas

**What goes wrong:**
Vietnamese uses Telex/VNI/VIQR input methods that compose diacritical marks (ă, ơ, ư, ầ, ễ, ỏ, etc.) through multi-keystroke sequences. This causes specific, confirmed bugs in both Monaco and terminal:

1. **Monaco IME Bug (GitHub #4805, Jan 2025 — OPEN):** Decorations (inline highlights, error markers) do not update during IME composition. When a Vietnamese user types with Telex, decorations freeze until composition completes. This affects any Monaco decoration — error squiggles, search highlights, diff markers.
2. **Terminal IME Bug (GitHub anthropics/claude-code#10429, Oct 2025):** Vietnamese input doesn't work in CLI terminals built with Ink/React. Characters composed via IME get dropped or garbled. This is a known issue in CLI-based TUI applications.
3. **Unicode Normalization:** Vietnamese can be represented in NFC (precomposed: ầ as single codepoint) or NFD (decomposed: a + combining breve + combining grave). File searches, string comparisons, and sorting MUST normalize first, or "ầ" !== "ầ" depending on source.

**Why it happens:**
- Western developers don't test with IME input methods
- IME composition is a fundamentally different input model than direct keystroke
- Unicode normalization is invisible — two visually identical strings can be byte-different
- Vietnamese has one of the highest diacritic densities of any Latin script language

**How to avoid:**
1. **Test every input field with Telex input** — both Monaco editor and terminal input
2. **Apply Unicode NFC normalization** on all string comparisons:
   ```typescript
   const normalized = input.normalize('NFC')
   ```
3. **Font selection matters** — use fonts with complete Vietnamese diacritic support:
   - Monospace: JetBrains Mono, Fira Code, Source Code Pro (all have Vietnamese glyphs)
   - UI: Inter, Noto Sans (complete Vietnamese coverage)
   - AVOID: Courier New (incomplete diacritics), system default monospace on some Linux distros
4. **Date/Number/Currency formatting:**
   ```typescript
   // Dates: DD/MM/YYYY (not MM/DD/YYYY)
   new Intl.DateTimeFormat('vi-VN').format(date)  // "10/02/2026"
   
   // Numbers: 1.000,00 (period for thousands, comma for decimal)
   new Intl.NumberFormat('vi-VN').format(1000.5)  // "1.000,5"
   
   // Currency: ₫ suffix
   new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(50000)
   // "50.000 ₫"
   ```
5. **Monaco: disable decorations during composition** as a workaround for #4805:
   ```typescript
   editor.onDidCompositionStart(() => { /* defer decoration updates */ })
   editor.onDidCompositionEnd(() => { /* re-apply decorations */ })
   ```
6. **Terminal: test xterm.js with Telex** specifically — if IME input fails, it's a blocker for Vietnamese users
7. **UI text expansion budget** — design containers with 20% extra width/height for Vietnamese text

**Warning signs:**
- Vietnamese users report "garbled text" in editor or terminal
- Search in editor doesn't find Vietnamese text that's visually present
- Diacritical marks render as separate characters (combining marks not composed)
- Date picker shows MM/DD format to Vietnamese users

**Phase to address:** Stage 1 — must be validated when Monaco and terminal are first integrated, not after.

**Confidence:** HIGH — confirmed via GitHub issues microsoft/monaco-editor#4805, anthropics/claude-code#10429, Neovim Vietnamese docs

---

### Pitfall 8: TanStack Start — Fresh Build Risks (RC Framework Gotchas)

**What goes wrong:**
TanStack Start is the chosen framework for the fresh frontend build (SPA mode). While the API is stable and feature-complete, the framework is still RC. Risks: (a) `@tanstack/start` was renamed to `@tanstack/react-start` in v1.121.0, (b) server route errors surface at runtime not build time, (c) error messages are "vague and directionless" per LogRocket, (d) WebSocket protocol upgrade isn't natively supported in server routes (terminal needs a separate handler), (e) limited community resources for edge cases.

**Why it happens:**
- RC-stage framework — API stable but bugs exist in edge cases
- Limited Stack Overflow coverage compared to Next.js/Express
- Server routes handle standard HTTP but not WebSocket protocol upgrades
- SPA mode is well-documented but less battle-tested than SSR mode

**How to avoid:**
1. **Pin to a specific version** — don't float `@tanstack/react-start`. Use exact version lock.
2. **Keep terminal WebSocket separate** — TanStack Start server routes return `Response` objects. Use Nitro's `crossws` or a standalone WebSocket handler for terminal PTY only.
3. **Test SSE streaming early** — verify server routes handle SSE for OpenCode SDK events before building features on top.
4. **Budget 2-3 days for framework setup** — Vite plugin config, file-based routing, server function patterns.
5. **Use Context7 and official docs aggressively** — community answers are sparse.
6. **Have a rollback plan** — if Start fails, the same components work with React Router + Express. The UI code is portable.

**Warning signs:**
- Import errors mentioning `@tanstack/start` (old package name)
- Routes that work in dev but fail in production build
- Server function returning incorrect types (no compile-time error)
- WebSocket connections failing through server routes

**Phase to address:** Stage 1 — framework setup is the first task. Validate before building features on it.

**Confidence:** MEDIUM — TanStack Start is evolving rapidly; assessment based on v1.121.0+ docs and community reports

---

### Pitfall 9: 2-Stage Validation Trap (Stage 1 Bloat Delays Stage 2)

**What goes wrong:**
The plan is Stage 1 (Code IDE) then Stage 2 (Governed Workspace). Three failure modes:
1. **Stage 1 takes too long:** Code IDE scope creeps (see Pitfall 2), Stage 2 never starts. The project becomes "just another code editor" with no governance differentiator.
2. **Stage 1 and Stage 2 are too entangled:** Code IDE components are built without governance hooks, requiring rewrites when governance is added. Example: file save happens directly instead of through a governed task → must refactor all save paths later.
3. **Stage 1 is too thin:** Rushing Code IDE to get to governance means the editor is buggy/incomplete, users leave, governance features have no users.

**Why it happens:**
- Stage 1 is the "fun" part (visible UI, immediate feedback), Stage 2 is the "hard" part (governance, schemas, validation)
- No clear handoff criteria between stages
- Developers optimize for the stage they're in, not the one after

**How to avoid:**
1. **Define Stage 1 exit criteria upfront:**
   - Monaco editor opens/saves files: YES
   - File tree navigates project: YES
   - Terminal runs commands: YES
   - Diff view shows changes: YES
   - LSP integration: NO (Stage 3+)
   - Git UI integration: NO (Stage 3+)
   - Everything else: NO
2. **Build governance hooks into Stage 1 components** even if governance logic comes in Stage 2:
   ```typescript
   // Stage 1: hook exists but is passthrough
   const onFileSave = async (path: string, content: string) => {
     await governanceGate('file:save', { path }) // no-op in Stage 1
     await fs.writeFile(path, content)
   }
   // Stage 2: governanceGate checks active task
   ```
3. **Stage 1 time-box: 3 weeks maximum** — if it's not done, cut features, don't extend
4. **"Bridge interfaces"** — define the TypeScript interfaces that Stage 2 will consume, even if Stage 1 implements them as no-ops. This is schema-first done right: thin interfaces, not fat schemas.
5. **Milestone demo at Stage 1 completion** — if you can't demo the Code IDE in 5 minutes, it's not done

**Warning signs:**
- Stage 1 sprint extending beyond 3 weeks
- "We need to add X to the editor before we can start governance"
- No governance-related TypeScript interfaces in Stage 1 code
- Stage 2 planning hasn't started by the time Stage 1 is 50% complete

**Phase to address:** Pre-Stage 1 planning. Define exit criteria and bridge interfaces before writing code.

**Confidence:** HIGH — pattern analysis from iDumb v2 phases (Phase 0 through 1A) and project-alpha-master

---

## Minor Pitfalls

These cause friction and rework but don't threaten the project.

### Pitfall 10: Team Development Readiness (Solo Patterns That Break)

**What goes wrong:**
iDumb v2 was built by a solo developer. Patterns that work solo break with teams:
- `templates.ts` at 1463 LOC — one person can navigate it, two people will create merge conflicts on every PR
- No linting/formatting setup — code style is implicit in one person's head
- No CI pipeline — "npm test passes locally" doesn't guarantee it passes for others
- `.idumb/` and `.opencode/` directories created by `init` — team members may have different local state
- No branch protection, no PR templates, no CODEOWNERS

**Why it happens:**
- Solo developers don't need coordination overhead
- "I'll set up CI later" (you won't until it costs you a production bug)
- Templates and monolith files are easier to read when only one person reads them

**How to avoid:**
1. **Before teams join (Phase 4+):**
   - Split `templates.ts` into `templates/coordinator.ts`, `templates/investigator.ts`, `templates/executor.ts`
   - Add ESLint + Prettier with shared config
   - Add GitHub Actions CI: `typecheck` + `test` on every PR
   - Add `.editorconfig` for consistent formatting
2. **Establish code boundaries** — the `AGENTS.md` LOC discipline (300-500 LOC per file) is good, enforce it
3. **Create `CONTRIBUTING.md`** — document the dev setup, test commands, and commit conventions
4. **Monorepo considerations** (if splitting frontend/backend/cli):
   - Use workspace protocols (`workspace:*`) not relative paths
   - Shared config in root, not duplicated per package
   - Build order must be explicit (backend before frontend that imports shared types)

**Warning signs:**
- `npm test` passes on your machine but fails on a fresh clone
- Two features touching the same file in parallel
- New contributors asking "how do I run this?" more than once
- Files above 500 LOC (already tracked in AGENTS.md — 7 files flagged)

**Phase to address:** Phase 3 (before Phase 4 when teams join). Not urgent now but must be done before team expansion.

**Confidence:** HIGH — Graphite monorepo guide, general team scaling patterns, iDumb codebase analysis

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoded English strings | Faster development | Full codebase grep + replace for i18n | Never — add `t()` from day one |
| Monaco CDN loading (vs bundled) | Zero config, instant setup | No offline support, CDN dependency, version mismatch risk | Prototyping only, never production |
| Single WebSocket for all features | Simpler connection management | Terminal data blocks governance events, no backpressure | MVP only — split by Stage 2 |
| `any` types for SDK responses | Faster integration | Type errors at runtime, no autocomplete | Only if interface is defined within 1 week |
| Storing editor state in React state | Simple, works immediately | Re-renders on every keystroke, performance degrades | Never — use Monaco's internal model |
| Skip node-pty cleanup on disconnect | Faster terminal implementation | Zombie processes consume server memory/PIDs | Never |

## Integration Gotchas

Common mistakes when connecting new Code IDE features to the existing iDumb stack.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Monaco + existing WebSocket | Sharing the same WS connection as the chat/governance SSE | Separate WS connections: one for terminal PTY, keep SSE for governance events |
| File tree + Express backend | Building a custom file API from scratch | Use `chokidar` for file watching + Express static routes; don't re-invent `fs.readdir` |
| Terminal + server.ts (1427 LOC) | Adding PTY routes to the existing server.ts | Extract terminal routes into `routes/terminal.ts` — server.ts is already flagged for splitting |
| Monaco + React Router | Editor loses state on route navigation | Keep editor instances alive via React context or route-level state preservation |
| i18n + existing 34 components | Retrofitting one component at a time across many PRs | Single dedicated PR: grep for all strings, replace, add translation files |
| OpenCode SDK + Monaco | Piping AI responses directly into Monaco | Buffer through engine.ts → React state → Monaco model updates. Never write to Monaco from WebSocket directly |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Monaco model-per-file (no limit) | Memory usage grows linearly with open files | LRU cache of models: max 20 open, dispose oldest | >30 files opened |
| `refetchInterval: 5000` for all queries | Constant network chatter, server load | Use WebSocket/SSE push for real-time data, longer intervals for static data | >5 concurrent users |
| File tree reads full directory recursively | UI freezes on large projects | Lazy-load children on expand, limit depth to 3 initially | >1000 files in project |
| Terminal output stored in React state | DOM re-renders on every PTY data event | xterm.js manages its own DOM; React only handles container lifecycle | Any sustained terminal output |
| Polling for file changes | CPU usage spikes, delayed updates | `chokidar` filesystem watcher with debounce | >100 files watched |

## Security Mistakes

Domain-specific security issues for a self-hosted AI Code IDE.

| Mistake | Risk | Prevention |
|---------|------|------------|
| PTY shell without `cwd` restriction | Terminal navigates outside project directory | Set `cwd` to project root, don't allow `cd` above it (or accept the risk for self-hosted) |
| WebSocket terminal without auth | Any browser tab can connect to the terminal | Token-based auth on WS upgrade request, validate per-connection |
| AI agent writes to arbitrary paths | Agent modifies system files outside project | Governance gate on file:write operations (Stage 2), path whitelist |
| OpenCode SDK credentials in frontend bundle | API keys exposed in client-side JavaScript | Keep SDK calls server-side only (engine.ts), never import SDK in frontend |
| File API without path traversal check | `GET /api/files/../../../etc/passwd` | Resolve paths, verify they're within project root before serving |

## UX Pitfalls

Common user experience mistakes in Code IDE + i18n domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Editor tab bar overflow (too many tabs) | Tabs become unreadable, user can't find files | Limit visible tabs to 7, show overflow dropdown, LRU close policy |
| Terminal steals keyboard focus | User types in editor but terminal captures input | Clear focus management: click-to-focus, Escape returns to editor |
| Language switcher hidden in settings | Users can't find how to change language | Visible in header/sidebar, persisted in localStorage |
| Vietnamese text overflows buttons | UI breaks with longer Vietnamese text | Design with 20% width buffer, use `text-overflow: ellipsis` |
| File tree doesn't show current file | User opens file from search, tree doesn't highlight it | "Reveal in file tree" on editor focus, auto-expand path |
| Error messages not translated | Vietnamese users see English error messages | Error messages go through i18n from the start, including toast notifications |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Monaco editor:** Often missing `editor.dispose()` on unmount — verify memory stays flat after 10 open/close cycles
- [ ] **File tree:** Often missing dotfile handling (`.gitignore`, `.env`) — verify hidden files shown/hidden by toggle
- [ ] **Terminal:** Often missing resize handling — verify terminal re-renders when panel is resized (not just on initial load)
- [ ] **i18n:** Often missing pluralization rules — verify "1 file" vs "2 files" in both English and Vietnamese
- [ ] **i18n:** Often missing error boundary translations — verify error pages show translated text
- [ ] **WebSocket:** Often missing reconnection logic — verify terminal/chat reconnect after network hiccup (not just "connection lost" forever)
- [ ] **Diff view:** Often missing large file handling — verify diff doesn't crash on 10,000-line files
- [ ] **File save:** Often missing conflict detection — verify behavior when file is modified externally while open in editor
- [ ] **Vietnamese:** Often missing diacritic sorting — verify file list sorts Vietnamese names correctly (Unicode-aware sort)
- [ ] **Vietnamese:** Often missing IME composition in search — verify search box handles Telex input without dropping characters

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Monaco memory leaks | LOW | Add disposal in useEffect cleanup; profile with Chrome DevTools heap snapshots; usually 1-2 hours to fix |
| Scope creep (too many features) | MEDIUM | Cut scope ruthlessly — remove features, don't just defer them. Archive in backlog. 1-2 days of PR reverts |
| Schema-first paralysis | LOW | Stop writing schemas. Build the feature. Extract types after. Delete unused schemas. 1 day |
| i18n retrofit (hardcoded strings) | HIGH | Grep for all string literals, create translation files, replace one namespace at a time. 3-5 days for 34 components |
| Terminal zombie processes | LOW | Add process cleanup hook, restart server to kill existing zombies. 2-4 hours |
| Vietnamese IME issues in Monaco | MEDIUM | Implement composition event handlers, test with Telex. Workaround exists but requires Monaco event API knowledge. 1-2 days |
| TanStack Start RC issues | LOW-MEDIUM | Components are portable — same React code works with React Router. Server functions can fall back to Express routes. Framework is the wrapper, not the logic. 1-2 days to swap if needed. |
| OpenCode SDK breaking change | MEDIUM-HIGH | Update engine.ts abstraction. If API redesign: 2-5 days depending on surface area. If removal: weeks |
| Stage 1 bloat (Code IDE takes too long) | HIGH | Cut to absolute minimum: Monaco + file read-only + terminal. No diff, no save, no file tree editing. Ship what works |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Monaco memory leaks & bundle bloat | Stage 1 (Code IDE) | Chrome DevTools heap snapshot: flat after 10 editor mount/unmount cycles |
| Scope creep | Pre-Stage 1 (Planning) | NOT-MVP list exists in PLAN.md and is referenced in PR reviews |
| PTY security & process cleanup | Stage 1 (Terminal) | `lsof | grep pty` shows zero orphans after all browser tabs close |
| Schema-first paralysis | Continuous | No schema file >100 LOC without a runtime consumer in the same PR |
| OpenCode SDK dependency risk | Stage 1 (Engine abstraction) | `grep -r "@opencode" src/ --include="*.ts"` returns only engine.ts and sdk-client.ts |
| i18n retrofitting | Stage 1 (alongside first Code IDE components) | `grep -rn "\"[A-Z]" src/dashboard/frontend/src/components/` returns zero hardcoded strings |
| Vietnamese IME/encoding | Stage 1 (Editor + Terminal integration testing) | Manual test: type "Xin chào thế giới" in editor and terminal using Telex input |
| TanStack Start RC gotchas | Stage 1 (Framework setup — first task) | SSE streaming works, server functions return correct types, WebSocket handled separately |
| 2-stage validation trap | Pre-Stage 1 + Stage 1 exit criteria | Stage 1 completed within 3-week timebox; governance hook interfaces exist |
| Team development readiness | Phase 3 (before Phase 4 team expansion) | Fresh `git clone && npm install && npm test` passes on CI runner |

## Sources

### Confirmed (HIGH confidence)
- GitHub microsoft/monaco-editor#4659 — DiffEditor memory leak (open, Aug 2024)
- GitHub microsoft/monaco-editor#4805 — IME decoration update bug (open, Jan 2025)
- GitHub anthropics/claude-code#10429 — Vietnamese IME input broken in CLI (Oct 2025)
- Context7 @suren-atoyan/monaco-react — disposal patterns, lazy loading
- Context7 microsoft/monaco-editor — web worker ESM configuration for Vite
- npm: vite-plugin-monaco-editor-esm — Vite-specific Monaco worker bundling
- LogRocket: "Migrating TanStack Start from Vinxi to Vite" — breaking changes, vague errors
- TanStack Router Discussion #2863 — v1.121.0 migration guide, RC status
- Graphite: "Common pitfalls when adopting a monorepo"
- iDumb v2 AGENTS.md — 7 files above 500 LOC, 2000+ LOC unconsumed schemas

### Verified (MEDIUM confidence)
- Noxterm (Medium, Dec 2025) — terminal isolation architecture patterns
- react-i18next documentation (Locize, Lokalise guides) — namespace patterns, key naming
- Neovim Vietnamese docs — Telex/VNI/VIQR input method specification
- ByteIota: "TanStack Start: React Framework" — RC assessment, loader behavior

### Project-specific (direct evidence)
- project-alpha-master — scope creep failure (WebContainer, block editors, agent packages)
- iDumb v2 Phase 1A — plugin→SDK-direct pivot, 1463 LOC templates.ts, `_archived-plugin/` directory
- iDumb v2 schemas — planning-registry.ts (729 LOC), task-graph.ts (605 LOC) — unconsumed runtime schemas

---
*Pitfalls research for: AI Code IDE + Workspace Foundation*
*Researched: 2026-02-10*
