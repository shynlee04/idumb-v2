---
created: 2026-02-10T11:23:57.893Z
title: Support OpenCode ecosystem plugins and custom tools in SDK migration
area: planning
files:
  - src/_archived-plugin/index.ts
  - src/dashboard/backend/engine.ts
  - src/cli/deploy.ts
---

## Problem

When the archived plugin architecture gets reimplemented via SDK-direct calls from the dashboard backend, the migration must not create a closed system. OpenCode has a broader ecosystem where users install additional plugins (`@opencode-ai/plugin`) and custom tools. The current archived plugin (`src/_archived-plugin/index.ts`) wired 7 hooks + 7 tools as a single monolith. The SDK-direct replacement (`src/dashboard/backend/engine.ts`) must be designed so that:

1. User-installed OpenCode plugins continue to function alongside iDumb's governance
2. Custom tools from the OpenCode ecosystem are discoverable and usable within iDumb's multi-agent workspace
3. iDumb's governance hooks (write-blocking, context pruning, compaction survival) compose with — not override — third-party plugin hooks

Without this, iDumb becomes an isolated fork rather than an ecosystem participant. Users who rely on community plugins would be forced to choose between iDumb governance and their existing tooling.

## Solution

During SDK migration (likely Phase 1C — Multi-Agent Workspace Engine):

- Audit OpenCode SDK's plugin discovery and hook execution order to understand composition semantics
- Design iDumb's SDK-direct hooks to register as one participant in the hook chain, not as the sole owner
- Ensure `engine.ts` passes through plugin/tool registrations it doesn't own
- Add integration test: install a sample community plugin alongside iDumb, verify both function
- Document plugin compatibility guarantees in the deployment output of `cli/deploy.ts`
