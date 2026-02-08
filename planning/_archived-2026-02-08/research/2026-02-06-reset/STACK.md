# Technology Stack Recommendation (Pivot 1: OpenCode Plugin)

**Researched:** 2026-02-06

## Recommended Stack

### Core

| Component | Recommendation | Why |
|----------|----------------|-----|
| OpenCode extension mechanism | OpenCode plugins + custom tools | Highest-leverage hooks (`tool.execute.before`, `experimental.session.compacting`) + first-class tool registration. Source: https://opencode.ai/docs/plugins/ |
| Language | TypeScript (ESM) | Matches OpenCode plugin ecosystem; enables strict contracts and Zod schemas. |
| Plugin SDK | `@opencode-ai/plugin` | Official type-safe plugin/tool API. Source: https://opencode.ai/docs/plugins/ |
| Validation / contracts | Zod schemas | Runtime validation + type inference for persisted governance entities. Source (tool schemas): https://opencode.ai/docs/custom-tools/ |

### Persistence + Observability

| Component | Recommendation | Why |
|----------|----------------|-----|
| State storage | JSON files under a single runtime root (e.g., `.idumb/`) | Deterministic, debuggable, versionable. |
| Writes | Atomic writes + schema validation on read | Prevent silent corruption; ensure cross-version safety. |
| Logging | File-based logs + optional OpenCode `client.app.log()` | Avoid TUI pollution; structured logging is supported by OpenCode. Source: https://opencode.ai/docs/plugins/#logging |

### Testing + Measurement

| Component | Recommendation | Why |
|----------|----------------|-----|
| Trial tests | Scripted trials that assert hook behavior and persistence | iDumb is infrastructure; correctness is in boundaries, not UI. |
| Automation harness | OpenCode SDK (`@opencode-ai/sdk`) for scripted sessions | Enables baseline vs plugin measurement and repeated compaction scenarios. Source: https://opencode.ai/docs/sdk/ |

## Packaging Strategy (For “single install”)

Pivot-1 viability does not depend on packaging, but your spec does.

| Goal | Recommendation | Notes |
|------|----------------|------|
| One-command install | Publish plugin to npm + provide an `npx` bootstrapper that writes/patches `opencode.json` | OpenCode installs npm plugins automatically at startup via Bun cache. Source: https://opencode.ai/docs/plugins/#from-npm |
| Multi-plugin suite | One npm package per plugin OR a single package exporting multiple plugin entrypoints | Keeps optional features isolated (e.g., “worktree stress harness” separate from “core governance”). |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Extensibility | OpenCode plugin | Fork OpenCode | Only justified if hook surface is insufficient or breaks UX; keep as pivot boundary. |
| Context hygiene | Deterministic pruning + bounded injections | LLM-only “poison detection” | Heuristic text classification competes with the model and tends to add more noise than signal. |

## Sources

- OpenCode Plugins: https://opencode.ai/docs/plugins/
- OpenCode Custom Tools: https://opencode.ai/docs/custom-tools/
- OpenCode SDK: https://opencode.ai/docs/sdk/
