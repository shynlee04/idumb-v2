# ASGL Master Prompt - Token-Optimized Reference

> **Master Document**: `_bmad/modules/asgl/MASTER_PROMPT.md` | **Version**: 2.0.0

This file contains minimal reference content. Full master prompt is in `_bmad/modules/asgl/MASTER_PROMPT.md`.

## Core Principle

> **ASGL orchestrates, it does NOT execute.**
> - For diagnostics → invoke `deep-scan`
> - For remediation → invoke `architecture-remediation`
> - For standard dev → invoke `bmad-core` workflows

## Quick Start Template

```markdown
@bmad-core-bmad-master

## Mission
Orchestrate the course correction sprint by invoking appropriate modules for each story.

## Session
- **ID**: ASGL-{current-timestamp}
- **Source**: Project Health Assessment 2026-01-05
- **Stories**: See `course-correction-p0-2026-01-05.yaml`

## Context Files (Load These First)
```
_bmad/modules/asgl/LOOP_STATE.yaml
_bad/modules/asgl/config/governance.yaml
_bmad/modules/asgl/config/module-integration.yaml
_bmad-output/sprint-artifacts/course-correction-p0-2026-01-05.yaml
```

## Module Routing
| Module | Invoke When |
|--------|-------------|
| **deep-scan** | Need diagnostics |
| **architecture-remediation** | Need store/component refactoring |
| **bmad-core dev-story** | Standard implementation |

## Governance Enforcement
| Document | Update Every |
|----------|--------------|
| **AGENTS.md** | 3 stories |
| **CLAUDE.md** | 5 stories |
| **Child AGENTS.md** | Layer changes >5 files |

## Constraints
1. **Design**: 8-bit only, NO glassmorphism
2. **Mobile**: Touch targets ≥44px
3. **i18n**: All strings via t()
4. **Wires**: Track all migrations in `pending-wires.yaml`
5. **Governance**: Update docs per frequency

## Execution Protocol
1. Load LOOP_STATE and current story
2. Route to appropriate module based on story type
3. Execute module workflow (module handles the work)
4. Validate completion (design, mobile, i18n, wires)
5. Governance check (update docs if trigger hit)
6. Continue to next story if remaining > 0

## Interrupt Commands
| Command | Action |
|---------|--------|
| `pause` | Save state, pause loop |
| `stop` | Complete current, generate report |
| `status` | Show current state |
| `override [check]` | Skip validation (requires reason) |

## Validation Commands
```bash
# TypeScript (production only)
pnpm exec tsc --noEmit 2>&1 | grep -v '.test.' | grep 'error TS' | wc -l

# Design violations
grep -r 'backdrop-blur\|bg-opacity-[0-4]' src --include='*.tsx' --include='*.css' | wc -l

# Pending wires check
cat _bmad/modules/asgl/scratchpad/pending-wires.yaml | grep 'PENDING' | wc -l
```

## Full Reference Documents

| Document | description |
|----------|---------|
| `_bmad/modules/asgl/MASTER_PROMPT.md` | Complete master prompt with all templates |
| `_bmad/modules/asgl/workflows/main-loop.md` | 12-step loop workflow |
| `_bmad/modules/asgl/config/module-integration.yaml` | Module routing decision tree |
| `_bmad/modules/asgl/config/governance.yaml` | Governance rules and triggers |

---

**Generated**: 2026-01-05 | **Module**: `_bmad/modules/asgl/`
