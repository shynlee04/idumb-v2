# GSD (Get Shit Done) Framework Research

**Source:** `glittercowboy/get-shit-done` via repomix  
**Date:** 2026-02-06

## What It Is

Meta-prompting + context engineering + spec-driven development system for Claude Code, OpenCode, and Gemini CLI. Solves context rot.

## Key Concepts Adapted for iDumb

- **Brownfield detection:** Deterministic `find` for source files + package manager detection
- **`.planning/` structure:** `PROJECT.md`, `STATE.md`, `config.json`, `REQUIREMENTS.md`, `ROADMAP.md`
- **Phase-based workflow:** discuss → plan → execute → verify (NOT all-at-once)
- **Sub-agent orchestration:** Separate focused agents via `Task()` delegation
- **Context engineering:** XML prompt formatting, state management, checkpoint continuation
- **Discovery depth levels:** Quick Verify (2-5min), Standard (15-30min), Deep Dive (1h+)

## NOT Copied

- 25+ slash commands — too many
- 11 agents (planner, executor, debugger, verifier, researcher, roadmapper, codebase-mapper, etc.) — too heavy
- The assumption that GSD IS the framework — iDumb wraps it

## Architecture Notes

- Installed via `npx get-shit-done-cc`
- Agents defined as `.md` files in `agents/` directory
- Commands defined as `.md` files in `commands/gsd/` directory
- Workflows in `get-shit-done/workflows/`
- Templates in `get-shit-done/templates/`
- State tracking: `.planning/STATE.md` + `.planning/config.json`
- Framework detection: checks for `package.json`, source files, `.planning/codebase/`
- Phase numbering continues across milestones
- Subagent spawning via `Task()` with specific agent types
