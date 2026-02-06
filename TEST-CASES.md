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

## Phase 1b Test Cases (Next — requires live plugin installation)

These cannot be run until the plugin is built and installed in OpenCode:

- **TC-11:** Tool gate blocks `write` without `idumb_task create` first
- **TC-12:** Compaction hook fires and injects anchors into post-compaction context
- **TC-13:** Which experimental hooks (`system.transform`, `messages.transform`) actually fire
- **TC-14:** Log file at `.opencode/idumb/logs/` shows hook activity

---

## How to Run These Tests

1. Build the plugin: `npm run build`
2. Install in your project's OpenCode config
3. Start an OpenCode session
4. Call `idumb_init` with the parameters shown above
5. Verify the output matches expectations
6. Check `.idumb/config.json` for correct values
7. Check `.idumb/` directory tree for correct structure

All unit tests can be run independently: `npm test` (105/105 assertions)
