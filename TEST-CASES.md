# iDumb v2 — Real-Life Test Cases

Phase 1 MVP: Init tool + framework detection + scaffolding.

Each test case is designed to be run **on your actual brownfield project** end-to-end.  
Format: **When I use** → **I expect** → **It proves**

---

## Test Case 1: First-Time Init on Brownfield Project

### Setup
- You have a complex brownfield project (e.g. Next.js + TypeScript + Express)
- iDumb plugin is installed (`npm run build` → copy `dist/` to OpenCode plugins)
- No `.idumb/` directory exists yet

### When I use
```
idumb_init language=en experience=guided governance_mode=balanced
```

### I expect
1. A **scan report** showing:
   - Detected governance frameworks (BMAD, GSD, etc. — or "None detected")
   - Detected tech stack (e.g. "nextjs, typescript, express")
   - Package manager (npm/yarn/pnpm/bun)
   - Existing agent directories (e.g. `.opencode/agents`)
   - Any conflicts (e.g. ".idumb/ already exists")
   - Any gaps (e.g. "No README.md", "node_modules missing")

2. A **scaffold report** showing:
   - Created directories: anchors, brain, governance, idumb-modules (with agents/schemas/templates/commands/workflows/prompts/scripts), modules, project-core, project-output, sessions
   - Created config.json at `.idumb/config.json`

3. A **greeting** with:
   - Governance mode explanation
   - Next steps (what to do now)
   - Available commands

### It proves
- The framework detector correctly identifies the tech stack via marker files + package.json deps
- The scaffolder creates the full `.idumb/` directory tree without errors
- The config.json is written with the user's choices (language, experience, governance)
- The greeting adapts to detected frameworks (different text if BMAD detected vs none)
- **The tool tells the truth about what your project actually is**

### Failure modes
- If detection misses a framework → add marker to `SIGNATURES` in `framework-detector.ts`
- If scaffolder fails → check permissions, check if `.idumb/` conflicts exist
- If greeting is wrong language → check `language` parameter passing

---

## Test Case 2: Vietnamese Language Init

### Setup
Same as Test Case 1, but user prefers Vietnamese.

### When I use
```
idumb_init language=vi documents_language=vi experience=beginner governance_mode=balanced
```

### I expect
1. Greeting in Vietnamese: "Xin chào! iDumb đã được cài đặt thành công."
2. Scan report headings in Vietnamese: "Kết Quả Quét Dự Án"
3. Next steps in Vietnamese
4. Config.json has `user.language.communication: "vi"` and `user.language.documents: "vi"`

### It proves
- Full i18n works end-to-end for Vietnamese users
- Config correctly stores language preferences
- All downstream components (meta-builder, greeting) will read Vietnamese from config

---

## Test Case 3: Scan-Only Mode (Read-Only)

### Setup
Any project. You want to see what iDumb detects without installing anything.

### When I use
```
idumb_init action=scan
```

### I expect
1. A detection report with frameworks, tech, gaps
2. **NO** `.idumb/` directory created
3. **NO** config.json written
4. **NO** files modified

### It proves
- The `action=scan` mode is truly read-only
- Users can preview what iDumb will detect before committing
- Safe to run on any project without side effects

---

## Test Case 4: Status Check on Configured Project

### Setup
`.idumb/config.json` already exists from a previous `idumb_init`.

### When I use
```
idumb_init action=status
```

### I expect
1. Output showing: version, install date, governance mode, experience level, language
2. Suggestion to run `idumb_init action=install force=true` to reconfigure

### It proves
- Status check reads existing config without modifying it
- Useful for resuming sessions — "am I configured?"

---

## Test Case 5: Re-Init with Force (Config Update)

### Setup
`.idumb/` already exists. User wants to change governance mode from balanced to strict.

### When I use
```
idumb_init governance_mode=strict force=true
```

### I expect
1. Config.json overwritten with `governance.mode: "strict"`
2. Existing directories preserved (skipped in scaffold report)
3. Detection re-run with fresh results
4. Greeting shows "Strict" governance explanation

### It proves
- Force mode overwrites config safely
- Directory structure is non-destructive (doesn't delete existing work)
- Users can change their mind about governance without losing state

---

## Test Case 6: Brownfield with BMAD Framework

### Setup
Project has `_bmad/` directory (BMAD Method installed).

### When I use
```
idumb_init
```

### I expect
1. Detection shows: "Governance frameworks: bmad"
2. Next steps say: "Detected framework(s): bmad — iDumb will integrate with existing structure"
3. Config.json `detection.governance` includes `"bmad"`

### It proves
- iDumb detects existing governance frameworks
- iDumb does NOT conflict with BMAD — it coordinates
- The meta-builder (Phase 2) will know BMAD exists and adapt

---

## Test Case 7: Brownfield with Multiple Agent Directories

### Setup
Project has `.opencode/agents/`, `.claude/agents/`, `.windsurf/skills/`.

### When I use
```
idumb_init action=scan
```

### I expect
1. Report shows all three agent directories detected
2. No conflicts flagged (iDumb uses `.idumb/`, not `.opencode/`)

### It proves
- iDumb is aware of the multi-tool landscape
- It traces existing agent infrastructure without conflicting
- Meta-builder (Phase 2) will coordinate with these, not overwrite

---

## Test Case 8: Empty Project (Greenfield)

### Setup
Brand new project with just `package.json` and `tsconfig.json`.

### When I use
```
idumb_init experience=expert governance_mode=autonomous
```

### I expect
1. Detection: no governance frameworks, tech = "typescript"
2. Next steps: "No governance framework detected — iDumb will set up fresh governance"
3. Full `.idumb/` tree created
4. Config shows `governance.mode: "autonomous"`, `user.experienceLevel: "expert"`

### It proves
- Greenfield detection works (no false positives)
- Expert + autonomous mode works for power users who want minimal hand-holding
- iDumb sets up from scratch without assuming anything

---

## Test Case 9: Monorepo Detection

### Setup
Project has `turbo.json` or `pnpm-workspace.yaml`.

### When I use
```
idumb_init action=scan
```

### I expect
1. Report shows: "Monorepo: Yes"
2. This information stored in `detection.hasMonorepo: true`

### It proves
- Monorepo flag is detected via marker files
- Future phases can use this to decide scope (root vs per-package governance)

---

## Test Case 10: Gap Detection — Missing Dependencies

### Setup
Project has `package.json` but no `node_modules/`.

### When I use
```
idumb_init action=scan
```

### I expect
1. Issues section shows: "package.json exists but node_modules/ missing — dependencies not installed"

### It proves
- iDumb catches real project health issues
- Not just framework detection — actual gap analysis
- Useful for brownfield projects that may have stale or incomplete setups

---

## Phase 1b Test Cases — Persistence + Live Hook Verification

---

## Test Case 11: Tool Gate Blocks Write Without Task (Live)

### Setup
Plugin is built and installed in OpenCode. Start a fresh session.

### When I use
Ask the agent: "Create a file called test.txt with hello world"

### I expect
1. The agent attempts to call the `write` tool
2. `tool.execute.before` hook fires and throws `GOVERNANCE BLOCK: write denied`
3. The block message includes: `USE INSTEAD: Call the "idumb_task" tool with action "create"`
4. The agent redirects and calls `idumb_task create "..."` first
5. After task creation, retry succeeds

### It proves
- `tool.execute.before` fires in live OpenCode
- The block+redirect pattern works — agent self-corrects
- Governance is enforced without crashing the TUI

### Verification
Check `.opencode/idumb/logs/hook-verification.log` for:
```
HOOK FIRED: tool.execute.before {"tool":"write"...}
```

---

## Test Case 12: Compaction Preserves Anchors (Live)

### Setup
Plugin installed. Start a session, add anchors, then trigger compaction (long session or manual).

### When I use
1. `idumb_task create "Test compaction"`
2. `idumb_anchor add type=decision priority=critical content="Always use PostgreSQL"`
3. Continue working until session compacts (or trigger manually)

### I expect
1. Post-compaction context includes: `## CURRENT TASK: Test compaction`
2. Post-compaction context includes: `[CRITICAL/decision] Always use PostgreSQL`
3. Agent retains awareness of the task and anchor after compaction

### It proves
- `experimental.session.compacting` fires in live OpenCode
- `output.context.push()` actually injects into post-compaction prompt
- Critical context survives the compaction boundary

### Verification
Check `.opencode/idumb/logs/hook-verification.log` for:
```
HOOK FIRED: experimental.session.compacting {"sessionID":"..."}
```

---

## Test Case 13: Experimental Hooks — System + Messages Transform (Live)

### Setup
Plugin installed. Start any session.

### When I use
1. Send any message to the agent
2. Let the agent respond and use tools

### I expect
**If hooks exist:**
1. `.opencode/idumb/logs/hook-verification.log` contains:
   - `HOOK FIRED: experimental.chat.system.transform`
   - `HOOK FIRED: experimental.chat.messages.transform`
2. System prompt includes governance directive
3. Old tool outputs get truncated after 10+ tool calls

**If hooks DON'T exist:**
1. No log entries for these hooks
2. Plugin still works normally (P3 graceful degradation)
3. Update AGENTS.md to mark these as CONFIRMED NON-EXISTENT

### It proves
- Whether `experimental.chat.system.transform` exists in OpenCode
- Whether `experimental.chat.messages.transform` exists in OpenCode
- This resolves the #1 uncertainty from Phase 0

### Verification
```bash
cat .opencode/idumb/logs/hook-verification.log | grep "system.transform"
cat .opencode/idumb/logs/hook-verification.log | grep "messages.transform"
```

---

## Test Case 14: Hook Verification Log Shows All Activity (Live)

### Setup
Plugin installed. Run a typical coding session.

### When I use
1. Start session
2. Try to write without task (should block)
3. Create task
4. Write a file
5. Add an anchor
6. Check status

### I expect
`.opencode/idumb/logs/hook-verification.log` contains chronological entries for:
- `HOOK FIRED: tool.execute.before` (multiple times)
- `HOOK FIRED: tool.execute.after` (multiple times)
- Optional: `HOOK FIRED: experimental.session.compacting`
- Optional: `HOOK FIRED: experimental.chat.system.transform`
- Optional: `HOOK FIRED: experimental.chat.messages.transform`

### It proves
- The verification harness works end-to-end
- Every registered hook is instrumented
- We can definitively answer which hooks fire and which don't

---

## Test Case 15: Persistence Survives Restart

### Setup
Plugin installed with disk persistence enabled.

### When I use
1. `idumb_task create "persistent task"`
2. Verify: `idumb_task status` → shows "persistent task"
3. **Restart OpenCode** (close and reopen)
4. `idumb_task status`

### I expect
1. Before restart: task shows as active
2. After restart: task STILL shows as active
3. `.idumb/brain/hook-state.json` contains the task data

### It proves
- StateManager writes hook state to `.idumb/brain/hook-state.json`
- StateManager loads state on plugin init (`stateManager.init(directory)`)
- Session continuity across OpenCode restarts
- **This is the core Phase 1b deliverable**

### Failure modes
- If task is lost → check if `.idumb/brain/hook-state.json` was written
- If file exists but task missing → check sessionID mismatch (new session = new ID)

---

## Test Case 16: Anchor Persistence Across Sessions

### Setup
Plugin installed. Two separate sessions.

### When I use
1. Session 1: `idumb_anchor add type=decision priority=critical content="API uses REST not GraphQL"`
2. Session 1: Close session
3. Session 2: Start new session
4. Session 2: `idumb_status`

### I expect
1. `.idumb/brain/hook-state.json` contains the anchor from Session 1
2. Status shows the anchor is loadable
3. If sessionID changed (new session), anchor is under old sessionID key

### It proves
- Anchors persist to disk
- Anchors survive session boundaries
- StateManager correctly serializes/deserializes Anchor objects (with timestamps, types, priorities)

### Important note
Anchors are keyed by sessionID. A new OpenCode session gets a new sessionID. The persistence proves the DATA survives, but the hook currently only reads anchors for the CURRENT sessionID. Phase 2 may need cross-session anchor migration.

---

## Test Case 17: Debounced Save — No I/O Storm

### Setup
Plugin installed. Rapid tool usage.

### When I use
1. Ask agent to make 10 rapid file edits in sequence (e.g., "add 10 functions to utils.ts")
2. Each edit triggers `tool.execute.before` → state mutation → save schedule

### I expect
1. `.opencode/idumb/logs/idumb-core.log` shows "State saved to disk" entries
2. Number of "State saved" entries is MUCH less than number of tool calls (debounced)
3. Plugin remains responsive — no lag between edits

### It proves
- Debounced save (500ms) coalesces rapid mutations
- No I/O storm under heavy tool usage
- Performance is acceptable for real-world sessions

---

## Test Case 18: Graceful Degradation — Read-Only Filesystem

### Setup
Plugin installed. `.idumb/brain/` is read-only (or `.idumb/` doesn't exist).

### When I use
1. Start OpenCode session with plugin
2. Try `idumb_task create "test"`

### I expect
1. Task creation works (in-memory)
2. `.opencode/idumb/logs/idumb-core.log` shows: "Failed to save state to disk — degrading to in-memory only"
3. Plugin continues to function normally
4. `stateManager.isDegraded() === true`

### It proves
- P3 principle: graceful degradation, never crash
- Hooks work even without disk persistence
- User gets warned but not blocked

---

## How to Run These Tests

### Unit tests (automated — run anytime)
```bash
npm test    # 150/150 assertions across 5 test files
```

### Live tests (manual — requires OpenCode)
1. Build: `npm run build`
2. Install in your project's OpenCode plugin config
3. Start OpenCode session
4. Run through TC-11 to TC-18 in order
5. Check logs: `cat .opencode/idumb/logs/hook-verification.log`
6. Check state: `cat .idumb/brain/hook-state.json`
7. Record results in TRIAL-TRACKER.md
