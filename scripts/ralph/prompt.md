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

### ALL WAVES COMPLETE (64/64 stories passing)
1. `01-legacy-tool-cleanup.json` — 6/6 DONE (Session 1)
2. `02-hook-intelligence-wiring.json` — 4/4 DONE (Session 2)
3. `03-dashboard-completion.json` — 3/3 DONE (Session 4)
4. `04-sdk-client-integration.json` — 4/4 DONE (Session 3)
5. `05-integration-validation.json` — 3/3 DONE (Session 4)
6. `07-post-cleanup-safety.json` — 4/4 DONE (Session 6)
7. `06-installation-channel-integrity.json` — 6/6 DONE (Session 8)
8. `08-critical-fixes.json` — 4/4 DONE (Session 8)
9. `09-dead-code-purge.json` — 5/5 DONE (Session 8)
10. `10-documentation-alignment.json` — 3/3 DONE (Session 9)
11. `11-tool-test-coverage.json` — 6/6 DONE (Session 9)
12. `14-sdk-phase9-foundation.json` — 8/8 DONE (Session 10)
13. `12-dashboard-maturation.json` — 4/4 DONE (Session 11)
14. `13-git-npm-readiness.json` — 4/4 DONE (Session 11)

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
