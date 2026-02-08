# Ralph Loop — Agent Instructions

You are implementing features for the iDumb v2 OpenCode governance plugin. Work through user stories in `docs/user-stories/` until all pass.

## Your Loop (follow exactly)

1. **Read the log** — Check `scripts/ralph/log.md` for prior work and context
2. **Read AGENTS.md** — Ground truth for what exists
3. **Scan stories** — Find features where `"passes": false` in `docs/user-stories/*.json`
4. **If no incomplete stories** — Output `<promise>FINISHED</promise>` and stop
5. **Select ONE feature** — Pick the highest-priority non-passing story (files are numbered by priority)
6. **Implement** — Write tests first (TDD), then implement, then verify
7. **Verify** — Run: `npm run typecheck && npm test`
8. **Mark complete** — Flip `"passes": true` in the story JSON
9. **Log progress** — Append summary to `scripts/ralph/log.md`
10. **Commit** — Stage and commit with descriptive message
11. **End iteration** — The next session picks up from here

## Project Rules

- **Zero TypeScript errors** at all times: `npm run typecheck`
- **Zero test failures** at all times: `npm test`
- **NO console.log** — breaks TUI rendering. Use `createLogger()` from `lib/logging.ts`
- **Zod schemas define data structures** — schema first, derive types with `z.infer<>`
- **Tools import from lib/ and schemas/ only** — never from hooks or other tools
- **Hooks import from lib/ only** — never from tools

## Story Priority Order

1. `01-legacy-tool-cleanup.json` — Remove dead tools (foundation for everything else)
2. `02-hook-intelligence-wiring.json` — Wire temporal gates, checkpoints, allowedTools
3. `03-dashboard-completion.json` — Backend SQLite, frontend shadcn rebuild
4. `04-sdk-client-integration.json` — Wire OpencodeClient APIs
5. `05-integration-validation.json` — AGENTS.md update, SOT validation, smoke test

## Key Architecture

- Single plugin entry: `src/index.ts` — hooks + tools
- 3 agents: coordinator (depth 0), investigator (depth 1), executor (depth 1)
- Current tools: `govern_plan`, `govern_task`, `govern_delegate`, `govern_shell`, `idumb_anchor`, `idumb_init`
- Legacy tools (to delete): `idumb_task`, `idumb_scan`, `idumb_codemap`, `idumb_read`, `idumb_write`, `idumb_bash`, `idumb_webfetch`
- Schemas in `src/schemas/` — WorkPlan/TaskNode/Checkpoint model in `work-plan.ts` + `task-graph.ts`
- Tests use hand-rolled harness (assert function, no framework)
- `npm test` chains 11 suites with `&&`

## Verification Commands

```bash
npm run typecheck    # Must be zero errors
npm test             # Must be all green
npx tsx scripts/verify-user-stories.ts  # Check story status
```
