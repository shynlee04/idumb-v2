# Phase 05: Framework Foundation - Gap Closure Research (SPA Mode Fix)

**Researched:** 2026-02-11
**Domain:** TanStack Start SPA mode configuration and hydration
**Confidence:** HIGH
**Purpose:** Identify the root causes of the SPA black screen / eternal spinner and document the correct setup

---

## Summary

The SPA mode failure (eternal spinner, router stuck in pending state) stems from a combination of incorrect entry point configuration and a misunderstanding of how TanStack Start discovers and uses entry files. Detailed source code analysis of the TanStack Start plugin core (v1.159.5) reveals that:

1. The file `ssr.tsx` is a **dead file** -- TanStack Start resolves the server entry by looking for `server.ts`, NOT `ssr.tsx`. Adding it in commit 8f31b48 had no effect on server behavior.
2. The `client.tsx` is **missing `startTransition`** -- the framework's default client entry wraps `hydrateRoot` in `startTransition(() => { ... })`, which is critical for proper hydration timing with concurrent React features.
3. The `ssr: true` flag in `routeTree.gen.ts` is **hardcoded and expected** -- it appears in ALL TanStack Start projects including the official SPA example. It is NOT a conflict with SPA mode.

The immediate fix is to either delete the manual entry files (`client.tsx`, `ssr.tsx`, `start.ts`) and let TanStack Start use its built-in defaults, or fix `client.tsx` to include the missing `startTransition` wrapper.

**Primary recommendation:** Delete `ssr.tsx` (dead file), fix `client.tsx` to match the framework default (add `startTransition`), and simplify `start.ts` to export `undefined` unless middleware is needed.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Foundation + incremental migration across phases (not full parity in Phase 5)
- Phase 5 delivers: TanStack Start scaffold, server functions for core transport, SSE streaming, Drizzle ORM
- Phases 6-8 rebuild features (IDE shell, chat, sessions) on the new foundation
- Existing Phase 1 components are wrapped into TanStack Start file-based routing
- Clean cut -- old Express server.ts (1427 LOC) is split into server functions in Phase 5
- Express dependency is removed entirely
- Chat + SSE streaming + engine control + session management must all be functional
- Unified dev command -- one command starts TanStack Start dev server AND auto-starts the OpenCode engine
- Working chat with basic markdown rendering

### Claude's Discretion
- Settings persistence scope
- Task persistence approach (JSON files via StateManager vs migrate to Drizzle)
- Workspace config definition and scope
- SQLite database file location
- Hot-reload behavior
- Monaco worker plugin configuration

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

---

## 1. Root Cause Analysis

### Verified Diagnosis (Source Code Evidence)

#### Finding 1: `ssr.tsx` is a Dead File (HIGH confidence)

**Evidence:** TanStack Start plugin source code (`packages/start-plugin-core/src/resolve-entries.ts` + `plugin.ts` lines 175-182):

```typescript
// plugin.ts: how server entry is resolved
const serverEntryPath = resolveEntry({
  type: 'server entry',
  configuredEntry: startConfig.server.entry,
  defaultEntry: 'server',        // <-- looks for 'server', NOT 'ssr'
  resolvedSrcDirectory,
  required: false,
})
```

```typescript
// resolve-entries.ts: how the file is found
resolveModulePath(baseName, {
  from: opts.from,
  extensions: ['.ts', '.js', '.mts', '.mjs', '.tsx', '.jsx'],
  try: true,
})
```

The resolver looks for `server.ts`, `server.js`, `server.tsx`, etc. It does NOT look for `ssr.tsx`. Since `app/` has no `server.ts`, the default framework entry is used instead. The file `ssr.tsx` exists on disk but is never loaded by the framework.

**Impact:** The comment in `ssr.tsx` ("Required even in SPA mode for proper shell generation") is incorrect. The file was added in commit 8f31b48 as a fix attempt but had zero effect. The actual change that turned the black screen into a spinner was the addition of `DefaultPendingComponent` and `defaultPendingMs: 0` to the router configuration.

**Source:** [TanStack Router GitHub: packages/start-plugin-core/src/resolve-entries.ts](https://github.com/TanStack/router/blob/main/packages/start-plugin-core/src/resolve-entries.ts), [packages/start-plugin-core/src/plugin.ts](https://github.com/TanStack/router/blob/main/packages/start-plugin-core/src/plugin.ts)

---

#### Finding 2: `client.tsx` is Missing `startTransition` (HIGH confidence)

**Evidence:** TanStack Start default client entry (`packages/react-start/src/default-entry/client.tsx`):

```tsx
// CORRECT — TanStack Start default
import { StrictMode, startTransition } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { StartClient } from '@tanstack/react-start/client'

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>,
  )
})
```

The broken project's `app/client.tsx`:

```tsx
// BROKEN — missing startTransition
import { StrictMode } from "react"
import { hydrateRoot } from "react-dom/client"
import { StartClient } from "@tanstack/react-start/client"

hydrateRoot(
  document,
  <StrictMode>
    <StartClient />
  </StrictMode>,
)
```

**Why this matters:** `startTransition` wraps the hydration in a React concurrent transition. Without it, hydration happens synchronously. When the index route's `beforeLoad` throws `redirect()` during synchronous hydration, the router processes this redirect while React is still attaching to the DOM. The redirect triggers a client-side navigation that the router cannot complete because hydration is not finished, causing the router to lock in the pending state permanently.

**Source:** [TanStack Router GitHub: packages/react-start/src/default-entry/client.tsx](https://github.com/TanStack/router/blob/main/packages/react-start/src/default-entry/client.tsx)

---

#### Finding 3: `ssr: true` in routeTree.gen.ts is Normal (HIGH confidence)

**Evidence:** The route tree Register block is generated by `packages/start-plugin-core/src/start-router-plugin/plugin.ts`:

```typescript
// plugin.ts: the ssr flag is HARDCODED
result.push(
  `declare module '@tanstack/${corePluginOpts.framework}-start' {
  interface Register {
    ssr: true    // <-- always true, regardless of SPA mode
    router: Awaited<ReturnType<typeof getRouter>>`,
)
```

Verified in the official SPA example (`examples/react/start-basic-static/src/routeTree.gen.ts`):

```typescript
declare module '@tanstack/react-start' {
  interface Register {
    ssr: true    // <-- present even with spa: { enabled: true }
    router: Awaited<ReturnType<typeof getRouter>>
  }
}
```

**Impact:** The `ssr: true` flag is NOT a conflict with SPA mode. It indicates that TanStack Start's server infrastructure is available (for server functions, server routes, shell prerendering), NOT that every request is server-side rendered. SPA mode controls rendering behavior separately via the `TSS_SHELL` environment variable.

**Source:** [TanStack Router GitHub: packages/start-plugin-core/src/start-router-plugin/plugin.ts](https://github.com/TanStack/router/blob/main/packages/start-plugin-core/src/start-router-plugin/plugin.ts), [examples/react/start-basic-static](https://github.com/TanStack/router/tree/main/examples/react/start-basic-static)

---

#### Finding 4: `start.ts` is Unnecessary (MEDIUM confidence)

**Evidence:** The default start entry (`packages/react-start/src/default-entry/start.ts`):

```typescript
// TanStack Start default
export const startInstance = undefined
```

The broken project's `app/start.ts`:

```typescript
// Creates a real instance — triggers config line in routeTree.gen.ts
import { createStart } from "@tanstack/react-start"
export const startInstance = createStart(() => {
  return {
    // functionMiddleware: [],
  }
})
```

When `start.ts` exists and is found by the resolver, the route tree generator adds an extra line:

```typescript
config: Awaited<ReturnType<typeof startInstance.getOptions>>
```

This is not harmful but is unnecessary unless middleware is being configured. The empty `createStart(() => { return {} })` call does nothing functionally.

**Source:** [TanStack Router GitHub: packages/react-start/src/default-entry/start.ts](https://github.com/TanStack/router/blob/main/packages/react-start/src/default-entry/start.ts)

---

### Contributing Factors

#### Factor A: `throw redirect()` in `index.tsx` `beforeLoad`

The redirect pattern itself is valid -- the official SPA example uses it at `routes/redirect.tsx`:

```typescript
// Official example — redirect is a valid SPA pattern
export const Route = createFileRoute('/redirect')({
  beforeLoad: async () => {
    throw redirect({ to: '/posts' })
  },
})
```

However, combined with the missing `startTransition`, the redirect fires during synchronous hydration and causes the router to lock up. With `startTransition` present, the redirect is processed as a concurrent update, allowing React to handle it gracefully.

#### Factor B: `ensureEngineFn()` in `__root.tsx` `beforeLoad`

The root route's `beforeLoad` has a `typeof window !== "undefined"` guard, so the server function call only fires on the client. On the server (during shell prerendering), it's a no-op. The fire-and-forget pattern with `.catch()` should not block the router. This is NOT a contributing factor to the spinner issue.

#### Factor C: `defaultPendingMs: 0`

This makes the `DefaultPendingComponent` (spinner) show immediately during any route transition. The official SPA example does NOT set `defaultPendingMs` at all. The default value (which is likely a small positive number) would show a brief blank before the spinner, making the "stuck" state less visible. Setting it to 0 just makes the symptom more obvious.

---

## 2. Correct TanStack Start SPA Setup

### Reference: Official SPA Example

The official SPA example is `examples/react/start-basic-static` in the TanStack Router repository.

**Files present:**
```
src/
  router.tsx           # Router factory — getRouter()
  routeTree.gen.ts     # Auto-generated route tree
  routes/
    __root.tsx         # Root layout with <html>, <head>, <body>
    index.tsx          # Home page component (no redirect)
    redirect.tsx       # Redirect example (throw redirect in beforeLoad)
    posts.tsx          # etc.
  components/
  styles/
  utils/
vite.config.ts         # tanstackStart({ spa: { enabled: true } })
tsconfig.json
package.json
```

**Files NOT present (auto-generated by framework):**
- `client.tsx` -- auto-generated with `startTransition` + `hydrateRoot`
- `server.ts` / `ssr.tsx` -- auto-generated with `createServerEntry`
- `start.ts` -- auto-generated as `export const startInstance = undefined`

### Correct vite.config.ts

```typescript
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  server: { port: 5180 },
  plugins: [
    tailwindcss(),
    tanstackStart({
      spa: { enabled: true },
    }),
    viteReact(),
  ],
})
```

**Key differences from broken setup:**
- NO `srcDirectory: "."` -- use default `'src'` or restructure to match
- NO `root: resolve(__dirname)` -- not needed
- NO explicit build config -- let framework handle it

### Correct router.tsx

```typescript
import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const router = createRouter({
    routeTree,
    defaultPreload: 'intent',
    defaultErrorComponent: DefaultCatchBoundary,
    defaultNotFoundComponent: () => <NotFound />,
    scrollRestoration: true,
  })
  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
```

**Key differences from broken setup:**
- NO `defaultPendingMs: 0` -- let the framework use its default
- NO explicit `defaultPendingComponent` -- framework handles shell generation
- DOES have `defaultErrorComponent` and `defaultNotFoundComponent`

### Correct __root.tsx

```tsx
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  component: RootComponent,
  errorComponent: RootErrorComponent,
})

function RootComponent() {
  return (
    <html>
      <head><HeadContent /></head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  )
}
```

**Key differences from broken setup:**
- NO `beforeLoad` with server function calls
- The `<html>`, `<head>`, `<body>` structure is in the component (same as broken setup -- this part is correct)

---

## 3. SPA Mode Internals (How It Actually Works)

### Development Mode (`vite dev`)

During dev, TanStack Start sets `TSS_SHELL` environment variable based on SPA mode:

```typescript
// packages/start-plugin-core/src/plugin.ts line 302
...(command === 'serve'
  ? defineReplaceEnv('TSS_SHELL', startConfig.spa?.enabled ? 'true' : 'false')
  : {}),
```

When `TSS_SHELL=true`:
1. Server renders ONLY the root route's shell (pending fallback for matched routes)
2. `beforeLoad`/`loader` for the ROOT route still runs server-side
3. Child routes are NOT matched -- pending fallback renders in `<Outlet />`
4. Shell HTML is sent to browser
5. Client hydrates with `hydrateRoot` (wrapped in `startTransition`)
6. After hydration, client-side router takes over and navigates to matched route

### Production Build

1. Normal Vite build runs (client + server)
2. Additional prerendering step generates `/_shell.html`
3. Shell is prerendered from root route at path `/` (configurable via `maskPath`)
4. Pending fallback renders in place of matched route content
5. Default rewrites redirect all 404 requests to `/_shell.html`

### Server Functions in SPA Mode

Server functions work via RPC calls from client to server. They are NOT affected by SPA mode -- SPA mode only disables server-side rendering of page content, not server-side execution of functions.

From TanStack Start maintainer @schiller-manuel (GitHub issue #5059):
> "spa mode just means no SSR."

Server routes (for SSE) also work normally in SPA mode -- they return raw `Response` objects.

---

## 4. Comparison: Broken vs Correct

| Aspect | Official SPA Example | Broken Setup | Issue |
|--------|---------------------|-------------|-------|
| `client.tsx` | Not present (auto-generated with `startTransition`) | Present, missing `startTransition` | **ROOT CAUSE** -- causes hydration timing failure |
| `ssr.tsx` | Not present (auto-generated as `server.ts`) | Present but DEAD FILE (wrong name) | Red herring -- has no effect |
| `start.ts` | Not present (defaults to `undefined`) | Present with empty `createStart()` | Unnecessary but not harmful |
| `ssr: true` in routeTree | Yes | Yes | NOT a problem -- always true |
| `defaultPendingMs` | Not set (framework default) | `0` | Makes symptom visible, not root cause |
| `defaultPendingComponent` | Not set | Custom spinner | Makes symptom visible, not root cause |
| Root `beforeLoad` | Not present | `ensureEngineFn()` fire-and-forget | Not a cause but adds risk |
| Index `beforeLoad` | Simple component render | `throw redirect()` | Valid pattern but amplifies hydration issue |
| `@tanstack/start-static-server-functions` | In dependencies | Not in dependencies | Only needed for STATIC deployment |
| `srcDirectory` | Default `'src'` | `'.'` | Works but unconventional |

---

## 5. Fix Actions (Ordered by Impact)

### Fix 1: Add `startTransition` to client.tsx (or delete the file)

**Option A -- Delete `client.tsx`:**
Remove `app/client.tsx` entirely. TanStack Start auto-generates the correct default with `startTransition`.

**Option B -- Fix `client.tsx`:**
```tsx
import { StrictMode, startTransition } from "react"
import { hydrateRoot } from "react-dom/client"
import { StartClient } from "@tanstack/react-start/client"

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>,
  )
})
```

**Recommendation:** Option B (fix the file). Keeping a manual `client.tsx` provides a clear, visible entry point and avoids confusion about where the app bootstraps. The auto-generated default is invisible.

### Fix 2: Delete `ssr.tsx`

Remove `app/ssr.tsx`. It is never loaded by TanStack Start (the framework looks for `server.ts`, not `ssr.tsx`). Its presence causes confusion and implies the file is needed, when it is not.

### Fix 3: Simplify `start.ts`

**Option A -- Delete `start.ts`:**
Remove `app/start.ts`. The default exports `undefined`.

**Option B -- Keep for future middleware:**
Leave as-is if middleware will be added later. The empty `createStart()` is harmless.

**Recommendation:** Option A unless middleware is planned for Phase 5. Can always recreate it.

### Fix 4: Remove `defaultPendingMs: 0` from router

The SPA shell rendering and the pending component management should be handled by the framework defaults. Setting `defaultPendingMs: 0` forces the spinner to show for every navigation. Remove it and let the framework decide.

The `DefaultPendingComponent` and `DefaultNotFoundComponent` definitions in `router.tsx` are fine to keep -- they provide a consistent loading/404 experience.

### Fix 5: Move engine init from `beforeLoad` to `useEffect` (optional)

The current `ensureEngineFn()` in `__root.tsx` `beforeLoad` is fire-and-forget with proper guards. It is not causing the spinner issue. However, moving it to a `useEffect` in the root component would be cleaner:

```tsx
function RootComponent() {
  useEffect(() => {
    ensureEngineFn().catch(() => {
      // Engine init failure is non-fatal
    })
  }, [])

  return (
    <RootDocument>
      <QueryClientProvider client={queryClient}>
        <EventStreamProvider>
          <Outlet />
        </EventStreamProvider>
      </QueryClientProvider>
    </RootDocument>
  )
}
```

This separates routing concerns (beforeLoad) from application initialization (engine start).

### Fix 6: Keep `throw redirect()` in index.tsx (no change needed)

The redirect pattern is valid and used in the official SPA example. Once `startTransition` is fixed in `client.tsx`, redirects during hydration will be handled correctly as concurrent updates.

---

## 6. `@tanstack/start-static-server-functions` -- Not Needed

This package provides middleware that caches server function results as static JSON files during build. It is for STATIC deployments (CDN, GitHub Pages) where no server runs at runtime.

The broken project runs a server (for SSE, server functions, engine control). Server functions work via normal RPC calls. This package is NOT needed.

The official SPA example (`start-basic-static`) includes it because it demonstrates CDN deployment. Our architecture requires a running server.

---

## 7. Known TanStack Start SPA Issues (from GitHub)

| Issue | Status | Relevance |
|-------|--------|-----------|
| [#6455](https://github.com/TanStack/router/issues/6455): Hydration error on direct navigation to non-root routes in SPA mode | Open | MEDIUM -- affects production CDN deployments, not dev server |
| [#5059](https://github.com/TanStack/router/issues/5059): SPA mode server build contains unnecessary SSR code | Open (26 comments) | LOW -- cosmetic build size issue, not a runtime bug |
| [#5967](https://github.com/TanStack/router/issues/5967): nitro + spa mode breaks since v1.138.0 | Closed | LOW -- was fixed, only relevant if using nitro plugin |
| [#6481](https://github.com/TanStack/router/pull/6481): PR to fix hydration in SPA mode via shell marker | Open PR | MEDIUM -- would fix #6455 by injecting `window.__TSS_SPA_SHELL__` marker |

The #6455 issue (hydration errors on direct navigation to non-root routes) could affect our app when deployed to production with a CDN. During development, the Vite dev server handles routing correctly. The PR #6481 is pending merge.

---

## 8. `.inputValidator()` vs `.validator()` Deprecation

The existing `app/server/engine.ts` uses `.inputValidator()`:

```typescript
export const startEngineFn = createServerFn({ method: "POST" })
  .inputValidator(EngineStartSchema)    // <-- potentially stale API
  .handler(async ({ data }) => { ... })
```

The original Phase 5 research noted that `.inputValidator()` was replaced by `.validator()` in v1.159.5. This should be validated and fixed if needed to avoid runtime errors.

---

## Common Pitfalls

### Pitfall 1: Assuming `ssr: true` Conflicts with SPA Mode
**What goes wrong:** Developer sees `ssr: true` in routeTree.gen.ts and concludes SPA mode is broken.
**Why it happens:** The flag name is misleading. It means "server infrastructure is available", not "every request is SSR".
**How to avoid:** Never modify `routeTree.gen.ts` -- it's auto-generated. The `ssr` flag is hardcoded.

### Pitfall 2: Creating Manual Entry Files That Deviate from Defaults
**What goes wrong:** Manual `client.tsx`, `server.ts`, or `start.ts` files miss framework defaults (like `startTransition`), causing subtle runtime bugs.
**Why it happens:** Docs say these files are "optional" but don't emphasize that manual files must exactly match the default behavior plus any customizations.
**How to avoid:** If creating manual entry files, first check the default entry in `packages/react-start/src/default-entry/` and use it as the base.

### Pitfall 3: Naming Server Entry `ssr.tsx` Instead of `server.ts`
**What goes wrong:** File exists but is never loaded. Developer thinks it's being used when it's not.
**Why it happens:** Older TanStack Start versions may have used `ssr.tsx`. Current versions look for `server` as the base name.
**How to avoid:** Always use `server.ts` for the server entry. Check `resolve-entries.ts` in the source for the current default entry name.

### Pitfall 4: `throw redirect()` Without `startTransition` in Client Entry
**What goes wrong:** Router gets stuck in pending state after hydration.
**Why it happens:** `hydrateRoot` without `startTransition` processes `beforeLoad` redirects synchronously during hydration, preventing the router from completing the transition.
**How to avoid:** Always use `startTransition` around `hydrateRoot`, or delete the manual `client.tsx` to use the default.

---

## Sources

### Primary (HIGH confidence)
- TanStack Router GitHub: `packages/start-plugin-core/src/plugin.ts` -- entry resolution, SPA shell env var
- TanStack Router GitHub: `packages/start-plugin-core/src/resolve-entries.ts` -- file discovery logic
- TanStack Router GitHub: `packages/start-plugin-core/src/start-router-plugin/plugin.ts` -- routeTree.gen.ts generation, `ssr: true` hardcoding
- TanStack Router GitHub: `packages/react-start/src/default-entry/client.tsx` -- default client entry with `startTransition`
- TanStack Router GitHub: `packages/react-start/src/default-entry/server.ts` -- default server entry with `createServerEntry`
- TanStack Router GitHub: `packages/react-start/src/default-entry/start.ts` -- default start entry (`undefined`)
- TanStack Router GitHub: `packages/react-start/src/plugin/vite.ts` -- default entry paths
- TanStack Router GitHub: `packages/start-plugin-core/src/schema.ts` -- SPA config schema
- TanStack Router GitHub: `examples/react/start-basic-static/` -- official SPA example
- TanStack Router GitHub: `examples/react/start-basic/` -- official SSR example (for comparison)
- TanStack Start SPA mode docs: `docs/start/framework/react/guide/spa-mode.md` (raw GitHub)

### Secondary (MEDIUM confidence)
- GitHub Issue [#6455](https://github.com/TanStack/router/issues/6455): Hydration error on non-root SPA routes
- GitHub Issue [#5059](https://github.com/TanStack/router/issues/5059): SPA mode contains unnecessary SSR code (maintainer comment: "spa mode just means no SSR")
- GitHub Issue [#5967](https://github.com/TanStack/router/issues/5967): nitro + spa mode build failure (closed/fixed)
- TanStack Start client entry point docs (fetched via WebFetch)
- TanStack Start server entry point docs (fetched via WebFetch)

### Tertiary (LOW confidence)
- Hypothesis about `startTransition` being THE root cause of the permanent pending state -- this is the strongest explanation based on the evidence, but has not been validated by running the fix. Confidence increases to HIGH once the fix is tested.

---

## Metadata

**Confidence breakdown:**
- `ssr.tsx` is dead file: HIGH -- verified from source code (resolve-entries.ts)
- `client.tsx` missing `startTransition`: HIGH -- verified from source code (default-entry/client.tsx)
- `ssr: true` is normal: HIGH -- verified from source code (start-router-plugin/plugin.ts) + official example
- `start.ts` is unnecessary: MEDIUM -- default is `undefined`, but having it is not harmful
- `startTransition` is the root cause of spinner: MEDIUM -- strongest hypothesis but untested
- Server functions work in SPA mode: HIGH -- confirmed by maintainer + SPA mode docs

**Research date:** 2026-02-11
**Valid until:** ~2026-03-11 (TanStack Start is in active RC, API may change)
**TanStack Start version analyzed:** v1.159.5 (RC)
