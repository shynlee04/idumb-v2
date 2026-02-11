# Technology Stack

**Analysis Date:** 2026-02-09

## Languages

**Primary:**
- TypeScript 5.7.3 - All source code (`src/`), tests (`tests/`), schemas, hooks, tools, CLI, and dashboard
- ESM only (`"type": "module"` in `package.json`), `.js` extensions in all imports (NodeNext resolution)

**Secondary:**
- JavaScript (ESM) - CLI entry shim (`bin/cli.mjs`): `#!/usr/bin/env node` + `import "../dist/cli.js"`

## Runtime

**Environment:**
- Node.js >= 18 (engines field in `package.json`); development machine runs v25.6.0
- No `.nvmrc` or `.node-version` file present

**Package Manager:**
- npm 11.8.0
- Lockfile: `package-lock.json` present (224KB)

## Frameworks

**Core:**
- `@opencode-ai/plugin` ^1.1.52 - OpenCode plugin SDK. Provides `Plugin` type, `PluginInput`, `tool()` builder, `ToolContext`, and re-exports `zod`. This is the host environment the plugin runs inside.

**Testing:**
- Custom hand-rolled test harness - No external test framework. Each test file (`tests/*.test.ts`) runs assertions on import via `tsx`, uses `process.exit(1)` on failure. Pattern: `assert(condition, name)` with pass/fail counters. Run via `npx tsx tests/example.test.ts`.

**Build/Dev:**
- TypeScript Compiler (`tsc`) - Primary build tool; `npm run build` compiles `src/` to `dist/`
- `tsx` ^4.21.0 - TypeScript execution for tests (dev dependency); also used as test runner
- `tsc --watch` - Dev mode via `npm run dev`

**Dashboard Frontend (sub-project at `src/dashboard/frontend/`):**
- React 18.2.0 - UI library
- Vite 5.1.0 - Frontend dev server and bundler
- Tailwind CSS 4.1.18 - Utility-first CSS (via `@tailwindcss/vite` plugin)
- TanStack React Query 5.17.19 - Server state management
- Lucide React 0.344.0 - Icon library

## TypeScript Configuration

**File:** `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

**Key settings:**
- Strict mode enabled with all strictness flags
- `NodeNext` module resolution - requires `.js` extensions in imports
- Emits declarations (`declaration: true`) for npm package consumers
- Source maps enabled for debugging
- Excludes: `node_modules`, `dist`, `tests`, `src/dashboard/frontend/**/*`, `src/lib/_archived-2026-02-08/**`

## Key Dependencies

**Critical (runtime):**
- `@opencode-ai/plugin` ^1.1.52 - The plugin SDK that provides the host contract (`Plugin` type, `tool()` builder, `zod` re-export). ALL tools use `tool()` from `@opencode-ai/plugin/tool`. ALL schemas use `zod` re-exported from this package. Do NOT install `zod` separately.
- `better-sqlite3` ^11.10.0 - SQLite3 bindings (native C++ addon). Feature-flagged alternative to JSON file persistence. Requires `npm rebuild` after Node version changes. Lazy-imported to avoid crashes when native binding unavailable.

**Dashboard (runtime, but only used by dashboard command):**
- `express` ^4.18.2 - HTTP server for dashboard backend API
- `ws` ^8.16.0 - WebSocket server for live dashboard updates
- `cors` ^2.8.5 - CORS middleware for dashboard backend
- `chokidar` ^4.0.1 - File watching (`.idumb/brain/*.json` changes broadcast via WebSocket)
- `open` ^10.1.0 - Opens dashboard URL in system browser

**Dev Dependencies:**
- `@types/better-sqlite3` ^7.6.13 - Type definitions for SQLite
- `@types/cors` ^2.8.17 - Type definitions for CORS
- `@types/express` ^4.17.21 - Type definitions for Express
- `@types/node` ^20.11.5 - Node.js type definitions
- `@types/ws` ^8.5.10 - Type definitions for WebSocket
- `tsx` ^4.21.0 - TypeScript execution engine (test runner)
- `typescript` ^5.7.3 - TypeScript compiler

**Dashboard Frontend Dependencies (separate `package.json` at `src/dashboard/frontend/`):**
- `react` ^18.2.0, `react-dom` ^18.2.0
- `@tanstack/react-query` ^5.17.19
- `clsx` ^2.1.0, `tailwind-merge` ^2.2.1
- `lucide-react` ^0.344.0
- `react-markdown` ^9.0.1, `rehype-highlight` ^7.0.0, `rehype-raw` ^7.0.0, `remark-gfm` ^4.0.0
- `@vitejs/plugin-react` ^4.2.1, `tailwindcss` ^4.1.18, `vite` ^5.1.0

## Zod Usage Pattern

Zod is re-exported from `@opencode-ai/plugin` and used as the canonical schema definition layer:

```typescript
// Import from plugin SDK — NOT from 'zod' directly
import { z } from "zod"
// OR via tool builder
import { tool } from "@opencode-ai/plugin/tool"
// tool.schema === z (re-exported)

// Schema definition pattern (src/schemas/*.ts)
export const SmartTaskSchema = z.object({ ... })
export type SmartTask = z.infer<typeof SmartTaskSchema>
```

All 15 schema files in `src/schemas/` follow this pattern. Types are always derived from schemas, never hand-written.

## Configuration

**Environment:**
- No `.env` files used by the plugin itself
- No environment variables required for core functionality
- `VITE_BACKEND_PORT` env var passed to Vite dev server by dashboard launcher for proxy targeting
- Runtime configuration stored in `.idumb/config.json` (created by `idumb-v2 init`)

**Build:**
- `tsconfig.json` - TypeScript compilation
- `package.json` scripts: `build`, `dev`, `typecheck`, `test`, `prepare`, `prepublishOnly`
- No bundler for the plugin itself (tsc only); Vite used for dashboard frontend

**Publish:**
- npm package with `"access": "public"`
- `files` field restricts published contents: `dist/`, `bin/`, `src/**/*.ts` (excluding dashboard frontend), `README.md`, `LICENSE`
- `prepare` script: `tsc || true` (allows install even if build fails)
- `prepublishOnly`: runs typecheck + test + build

## Platform Requirements

**Development:**
- Node.js >= 18 (tested on v25.6.0)
- npm (lockfile-based)
- `npm rebuild` required after Node version changes (for `better-sqlite3` native addon)
- macOS, Linux, or Windows (cross-platform via Node.js)

**Production/Runtime:**
- Runs inside OpenCode CLI as a plugin (loaded via `opencode.json` plugin config)
- Creates `.idumb/` directory in the target project for governance state
- Deploys agent markdown files to `.opencode/agents/` in the target project
- SQLite native bindings optional (gracefully degrades to JSON files)

**CLI:**
- `npx idumb-v2 init` - Interactive project setup
- `npx idumb-v2 dashboard` - Local Express+WebSocket+Vite dev server

---

*Stack analysis: 2026-02-09*
