# Technology Stack

**Analysis Date:** 2026-02-06

## Languages

**Primary:**
- TypeScript 5.3.3 - All plugin source code, CLI, hooks, schemas

**Secondary:**
- None detected - Pure TypeScript project

## Runtime

**Environment:**
- Node.js >= 18.0.0 (enforced via `engines` in `package.json`)
- ESM modules (`"type": "module"` in `package.json`)

**Package Manager:**
- npm (lockfile not committed, but default for project)
- No bun.lockb, pnpm-lock.yaml, or yarn.lock detected

## Frameworks

**Core:**
- `@opencode-ai/plugin` ^1.1.52 - OpenCode plugin SDK for AI governance hooks

**Testing:**
- ts-node ^10.9.2 - TypeScript execution for tests
- tsx ^4.21.0 - Alternative TS execution with better ESM support
- Test runner: Custom trial scripts (no jest/vitest config)

**Build/Dev:**
- TypeScript compiler (tsc) - Direct compilation, no bundler
- No vite/webpack/esbuild configured

## Key Dependencies

**Critical:**
- `@opencode-ai/plugin` ^1.1.52 - Entire plugin interface (hooks, tools, events)
- `zod` ^3.23.8 - Runtime schema validation for all state/config/anchor data

**Infrastructure:**
- Node.js `fs` module - File-based logging and state persistence
- Node.js `path` module - Cross-platform path resolution

## Development Dependencies

**Type Definitions:**
- `@types/node` ^20.11.0 - Node.js type definitions

**Execution:**
- `ts-node` ^10.9.2 - Trial test execution
- `tsx` ^4.21.0 - Fast TypeScript execution

**Compilation:**
- `typescript` ^5.3.3 - Strict TypeScript compilation

## Configuration

**TypeScript (`tsconfig.json`):**
- Target: ES2022
- Module: NodeNext (native ESM)
- Module Resolution: NodeNext
- Strict mode: All strict flags enabled
- Output: `./dist/`
- Source: `./src/`
- Declaration files: Enabled with source maps

**Strict Flags Enabled:**
- `strictNullChecks`
- `strictFunctionTypes`
- `strictBindCallApply`
- `strictPropertyInitialization`
- `noImplicitAny`
- `noImplicitReturns`
- `noImplicitThis`
- `noUnusedLocals`
- `noUnusedParameters`
- `noFallthroughCasesInSwitch`

**Environment:**
- No .env files required - Plugin receives directory from OpenCode
- Configuration stored in `.idumb/brain/config.json`

**Build:**
- `package.json` - Project manifest
- `tsconfig.json` - TypeScript config
- Main entry: `dist/plugin.js`
- Types entry: `dist/plugin.d.ts`

## Package Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `build` | `tsc` | Compile TypeScript to dist/ |
| `dev` | `tsc --watch` | Watch mode for development |
| `clean` | `rm -rf dist` | Remove build artifacts |
| `typecheck` | `tsc --noEmit` | Type check without emitting |
| `test:t1` | `node --loader ts-node/esm tests/trial-1.ts` | Run Trial-1 tests |
| `test:t2` | `node --loader ts-node/esm tests/trial-2.ts` | Run Trial-2 tests |
| `cli` | `node dist/cli/index.js` | Run CLI after build |

## CLI Binary

**Name:** `idumb`
**Entry:** `dist/cli/index.js`
**Implementation:** Zero-dependency arg parsing (no commander)

## Platform Requirements

**Development:**
- Node.js >= 18.0.0
- npm (or compatible package manager)
- TypeScript knowledge for contribution

**Production:**
- OpenCode editor with plugin support
- Plugin installed to `~/.config/opencode/plugins/idumb-v2/`

## Version Information

**Plugin Version:** 2.0.0-alpha.1
**Package Name:** idumb-plugin-v2
**License:** MIT

## SDK Compatibility Notes

**Zod Version Mismatch:**
The OpenCode SDK (`@opencode-ai/plugin`) ships with zod v4, but this plugin uses zod v3.23.8. A local `tool()` helper in `src/types/plugin.ts` provides compatibility by wrapping the SDK's tool interface with zod v3 schemas.

**ESM Requirement:**
The plugin MUST use ESM (`"type": "module"`) to be compatible with OpenCode's plugin system. All imports use `.js` extensions for compiled output compatibility.

---

*Stack analysis: 2026-02-06*
