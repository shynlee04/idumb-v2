# Ralph Loop — Agent Instructions

You are implementing features for the iDumb v2 OpenCode governance plugin. Work through user stories in `docs/user-stories/` until all pass.

## Your Loop (follow exactly)

1. **Read the log** — Check `scripts/ralph/log.md` for prior work and context
2. **Read AGENTS.md** — Ground truth for what exists
3. **Read the plan** — Check `docs/plans/ralph-loop/gaps-resolve-to-phase-9.md` for dependency order and wave strategy
4. **Scan stories** — Find features where `"passes": false` in `docs/user-stories/*.json`
5. **If no incomplete stories** — Output `<promise>FINISHED</promise>` and stop
6. **Select ONE feature** — Pick the highest-priority non-passing story respecting wave dependencies (see below)
7. **Implement** — Write tests first (TDD), then implement, then verify
8. **Verify** — Run: `npm run typecheck && npm test`
9. **Mark complete** — Flip `"passes": true` in the story JSON
10. **Log progress** — Append summary to `scripts/ralph/log.md`
11. **Commit** — Stage and commit with descriptive message
12. **End iteration** — The next session picks up from here

## Project Rules

- **Zero TypeScript errors** at all times: `npm run typecheck`
- **Zero test failures** at all times: `npm test`
- **NO console.log** — breaks TUI rendering. Use `createLogger()` from `lib/logging.ts`
- **Zod schemas define data structures** — schema first, derive types with `z.infer<>`
- **Tools import from lib/ and schemas/ only** — never from hooks or other tools
- **Hooks import from lib/ only** — never from tools
- **All disk reads use Zod safeParse** — never `JSON.parse() as Type` without validation

## Story Priority Order (Waves)

### COMPLETED (Sessions 1-6)
1. `01-legacy-tool-cleanup.json` — 6/6 DONE
2. `02-hook-intelligence-wiring.json` — 4/4 DONE
3. `03-dashboard-completion.json` — 3/3 DONE
4. `04-sdk-client-integration.json` — 4/4 DONE
5. `05-integration-validation.json` — 3/3 DONE
6. `07-post-cleanup-safety.json` — 4/4 DONE

### WAVE 1: Foundation (parallel — no cross-dependencies)
7. `06-installation-channel-integrity.json` — bin/cli.mjs, deploy fixes (6 stories, 0/6)
8. `08-critical-fixes.json` — Shell bug, backup, Zod validation (4 stories)
9. `09-dead-code-purge.json` — Orphans, dead exports, dupes (5 stories)

### WAVE 2: Truth (depends on Wave 1)
10. `10-documentation-alignment.json` — CLAUDE.md rewrite, v1 neutralization (3 stories)

### WAVE 3: Safety Net (depends on Wave 2)
11. `11-tool-test-coverage.json` — All 6 tool test suites + test script update (6 stories)

### WAVE 4: Phase 9 Core (depends on Wave 3)
12. `14-sdk-phase9-foundation.json` — SDK wiring, brain index population (8 stories)

### WAVE 5: Polish (depends on Wave 2, optional — not on Phase 9 critical path)
13. `12-dashboard-maturation.json` — Production mode, dynamic ports (4 stories)
14. `13-git-npm-readiness.json` — Branch strategy, publish readiness (4 stories)

**Wave Rule:** Do NOT start a story from Wave N+1 while Wave N has `"passes": false` stories.

## Key Architecture

- Single plugin entry: `src/index.ts` — 7 hooks + 6 tools
- 3 agents: coordinator (depth 0), investigator (depth 1), executor (depth 1)
- Current tools: `govern_plan`, `govern_task` (w/ quick_start), `govern_delegate`, `govern_shell`, `idumb_anchor`, `idumb_init`
- Schemas in `src/schemas/` — WorkPlan/TaskNode/Checkpoint model in `work-plan.ts` + `task-graph.ts`
- Tests use hand-rolled harness (assert function, no framework)
- `npm test` chains 12 suites with `&&`
- Test baseline: 637/637 assertions

## Verification Commands

```bash
npm run typecheck    # Must be zero errors
npm test             # Must be all green, >= 637 assertions
npx tsx scripts/verify-user-stories.ts  # Check story status
```
