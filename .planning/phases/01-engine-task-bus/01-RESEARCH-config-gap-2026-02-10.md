# Phase 1 Configuration Gap — Research

**Researched:** 2026-02-10
**Domain:** OpenCode configuration UI — provider, model, agent management + settings
**Confidence:** HIGH
**Purpose:** Phase 1 has 6 passed plans (01-01 through 01-06) but is missing critical configuration features that every standalone OpenCode UI must have. This research identifies the exact gaps and prescribes patterns extracted from 3 reference projects' source code.

## Summary

Phase 1's 6 passed plans cover engine lifecycle (01-01), app shell (01-02), chat (01-03), tool blocks (01-04), governance UI (01-05), and UAT (01-06). **None of them address AI provider configuration, model selection, agent selection, or a settings page.** Without these, the app cannot function as a standalone product — a user who opens it has no way to connect to an AI provider, choose which model to use, or select which agent handles their session.

All 3 reference projects (Portal, OpenWork, CodeNomad) treat these as day-one features. They all use the OpenCode SDK's `client.provider.list()`, `client.agent.list()`, `client.config.get()`, and `client.session.create({ modelID, providerID })` APIs. The patterns are remarkably consistent across all 3 projects despite using different UI frameworks (React, SolidJS).

**Primary recommendation:** Add 2 new gap-closure plans to Phase 1:
1. **01-09: Configuration & Provider Management** — Backend proxy routes + model/agent selector components + settings page
2. **01-10: Connection & Health** — Engine connection status bar + health monitoring + reconnection UX

## Phase 1 Gap Analysis

### What's Covered (6 Plans ✅)

| Plan | Covers | Config? |
|------|--------|---------|
| 01-01 Backend Engine | OpenCode server lifecycle, session proxy, SSE relay | Engine connect-or-start only. **No provider/config proxy routes.** |
| 01-02 App Shell | Vite + React Router, sidebar, theme toggle | Theme toggle only. **No settings page.** |
| 01-03 Chat | Streaming messages, composer, session management | Session create/list. **No model/agent selection in composer.** |
| 01-04 Tool Blocks | Structured tool call rendering | N/A |
| 01-05 Governance UI | Task sidebar, detail panel, lifecycle controls | N/A |
| 01-06 UAT | Integration testing | N/A |

### What's Missing (Critical Gaps) 🚨

| Gap | Severity | What | Why Critical |
|-----|----------|------|-------------|
| **G1: Provider Management** | BLOCKER | No way to see configured AI providers, check status, or manage API keys | User can't verify their OpenCode instance has working providers |
| **G2: Model Selector** | BLOCKER | No way to choose which AI model to use for a session | All 3 reference projects have this as a primary UI element |
| **G3: Agent Selector** | HIGH | No way to choose which agent handles a session | iDumb's core value is multi-agent — agents must be selectable |
| **G4: Settings Page** | HIGH | No dedicated settings page (theme, model defaults, connection, governance mode) | Every reference project has a tabbed settings page |
| **G5: Connection Status** | HIGH | No visual indicator of OpenCode engine connection health | User has no feedback if backend is connected, disconnected, or erroring |
| **G6: Backend Config Routes** | BLOCKER | 01-01 has session proxy but **no routes for** `/api/providers`, `/api/config`, `/api/agents` | Frontend can't fetch provider/model/agent data without backend routes |

## Reference Project Deep-Dive

### Portal (hosenur/portal) — React + TanStack Router + Zustand
**Source: Repomix output ID 21da36c56b201470**

**Architecture Pattern — 3-layer config pipeline:**
```
Server Routes (Nitro)          →  Zustand Stores              →  React Components
server/opencode/[port]/         stores/instance-store.ts       components/model-select.tsx
  config.ts                     stores/model-store.ts          components/agent-select.tsx
  providers.ts                  stores/agent-store.ts          routes/_app/settings.tsx
  health.ts                     hooks/use-opencode.ts
```

**Key files extracted:**

1. **`server/lib/opencode-client.ts`** — SDK wrapper singleton per port:
```typescript
// Creates OpenCode SDK client for a specific instance (by port)
import Opencode from "@opencode-ai/sdk";
// Caches clients by port number, creates new one if missing
// Each instance runs on a different port
```

2. **`stores/model-store.ts`** — Model state management:
```typescript
// Zustand store pattern
export const useModelStore = create<ModelState>((set, get) => ({
  models: [],
  selectedModelId: null,
  loading: false,
  fetchModels: async (port: number) => {
    // Calls /api/opencode/{port}/providers → SDK client.provider.list()
    // Returns providers with nested models
    // Flattens into selectable model list
  },
  setSelectedModel: (modelId: string) => set({ selectedModelId: modelId }),
}));
```

3. **`stores/agent-store.ts`** — Agent state management:
```typescript
// Zustand store pattern
export const useAgentStore = create<AgentState>((set) => ({
  agents: [],
  selectedAgentId: null,
  fetchAgents: async (port: number) => {
    // Calls /api/opencode/{port}/agents → SDK client.agent.list()
  },
  setSelectedAgent: (agentId: string) => set({ selectedAgentId: agentId }),
}));
```

4. **`components/model-select.tsx`** — Model selector dropdown:
```tsx
// Uses shadcn-like Select component
// Groups models by provider (Anthropic, OpenAI, etc.)
// Shows model name + provider badge
// Persists selection to store
```

5. **`components/agent-select.tsx`** — Agent selector dropdown:
```tsx
// Uses shadcn-like Select component
// Lists all available agents from OpenCode
// Shows agent name + description
// Selected agent passed to session.create()
```

6. **`routes/_app/settings.tsx`** — Settings page with tabs:
```tsx
// Three tabs:
// - Appearance: AccentSelector (color picker), useTheme (light/dark/system)
// - Model: default model selection
// - Keys: API key management per provider
// Uses: @heroicons, shadcn-ui Tabs, Select, Input
```

7. **`routes/instances.tsx`** — Instance management:
```tsx
// Lists running OpenCode instances discovered on disk
// Each instance shows: name, directory, port, hostname, PID
// Click to select/connect to an instance
// Uses GridList with ServerIcon indicators
```

8. **`hooks/use-opencode.ts`** — React Query hooks:
```typescript
// useInstances() — fetches /api/instances
// useProviders(port) — fetches /api/opencode/{port}/providers
// useConfig(port) — fetches /api/opencode/{port}/config
// All use TanStack React Query with caching + refetch
```

### OpenWork (different-ai/openwork) — SolidJS + Tauri
**Source: Repomix output ID 0c304de549098d52**

**Architecture Pattern — Full lifecycle with onboarding:**
```
Onboarding Flow:
  1. Engine Doctor (detect OpenCode binary)
  2. Engine Install (if missing)
  3. Engine Start (spawn server)
  4. Health Check (wait for healthy)
  5. Workspace Selection
  6. Provider Auth (API keys)
  7. Session Ready

Settings: pages/settings.tsx → provider auth + model picker + theme
Config: pages/config.tsx → server connection, workspace reload
```

**Key patterns extracted:**

1. **`lib/opencode.ts`** — SDK client creation with auth:
```typescript
import Opencode from "@opencode-ai/sdk";
export function createClient(baseUrl: string, directory: string, auth?: OpencodeAuth) {
  // Creates SDK client with baseURL pointing to running OpenCode instance
  // Auth supports multiple modes for remote/local connections
}
export async function waitForHealthy(client: Client, timeoutMs: number): Promise<boolean> {
  // Polls health endpoint until ready or timeout
}
```

2. **`types.ts`** — Core type definitions:
```typescript
import type { ProviderListResponse } from "@opencode-ai/sdk/v2/client";
export type ProviderListItem = ProviderListResponse["all"][number]; // KEY TYPE
export type Client = ReturnType<typeof createClient>;
export type ComposerPart =
  | { type: "text"; text: string }
  | { type: "agent"; name: string }  // Agent mentions in composer
  | { type: "file"; path: string };
```

3. **`utils/providers.ts`** — Provider mapping:
```typescript
export function mapConfigProvidersToList(config: OpencodeConfigFile): ProviderListItem[] {
  // Maps OpenCode config providers to UI-ready list
  // Each item: { id, name, models: [{ id, name }] }
}
```

4. **`components/provider-auth-modal.tsx`** — API key entry:
```tsx
// Modal dialog for entering API keys per provider
// Shows provider name, key input field, save/cancel
// Validates key format, stores via SDK config API
```

5. **`components/model-picker-modal.tsx`** — Model picker combobox:
```tsx
// Modal with searchable combobox
// Groups models by provider
// Shows model ID, provider name
// Selected model used in session creation
```

6. **`pages/settings.tsx`** — Settings with provider auth + model picker:
```tsx
// Tabs: Theme, Provider Auth, Model Picker
// Theme: light/dark/system toggle
// Providers: list configured providers with auth status
// Model: default model selection combobox
```

7. **`context/workspace.ts`** — Connection lifecycle store:
```typescript
// Full workspace lifecycle management:
// - Engine discovery (is OpenCode installed?)
// - Engine start/stop
// - Health monitoring
// - Provider list fetching
// - Workspace selection
// Uses mapConfigProvidersToList() for provider UI
```

8. **`pages/onboarding.tsx`** — First-run flow:
```tsx
// Step-by-step onboarding:
// 1. Welcome screen
// 2. Engine Doctor (detect/install OpenCode)
// 3. Workspace selection (pick project directory)
// 4. Connection test
// Props include: engineDoctorFound, engineDoctorVersion, engineBaseUrl
```

### CodeNomad (NeuralNomadsAI/CodeNomad) — SolidJS
**Source: Repomix output ID aaf0d31b3b8f86b4**

**Architecture Pattern — SDK manager singleton:**
```
lib/sdk-manager.ts          →  lib/opencode-api.ts         →  Components
(singleton, manages          (typed API functions)           agent-selector.tsx
 connection lifecycle)                                       model-selector.tsx
                                                            advanced-settings-modal.tsx
stores/sessions.ts          ←  stores/session-api.ts
(reactive state)               (API integration)
```

**Key patterns extracted:**

1. **`lib/sdk-manager.ts`** — SDK singleton wrapper:
```typescript
import Opencode from "@opencode-ai/sdk";
class SDKManager {
  private client: Opencode | null = null;
  private baseURL: string;

  connect(baseURL: string): void {
    this.baseURL = baseURL;
    this.client = new Opencode({ baseURL });
  }

  getClient(): Opencode {
    if (!this.client) throw new Error("SDK not connected");
    return this.client;
  }

  disconnect(): void { this.client = null; }
}
export const sdkManager = new SDKManager(); // Singleton
```

2. **`lib/opencode-api.ts`** — Typed API functions:
```typescript
import { sdkManager } from "./sdk-manager";

export async function fetchProviders() {
  const client = sdkManager.getClient();
  const response = await client.provider.list(); // SDK API
  return response.all; // Array of { id, name, models: [...] }
}

export async function fetchAgents() {
  const client = sdkManager.getClient();
  const response = await client.agent.list(); // SDK API
  return Object.values(response);
}

export async function fetchSessions() {
  const client = sdkManager.getClient();
  return client.session.list();
}

export async function createSession(modelID: string, providerID: string) {
  const client = sdkManager.getClient();
  return client.session.create({ modelID, providerID });
}
```

3. **`components/model-selector.tsx`** — Model selector combobox:
```tsx
// Uses @kobalte/core Combobox component
// Fetches providers via opencode-api.fetchProviders()
// Groups models by provider in dropdown
// Each item shows: model name, provider ID
// Search/filter functionality built-in
// Selected model stored in session state
// OnChange triggers session recreation with new model
```

4. **`components/agent-selector.tsx`** — Agent selector:
```tsx
// Uses @kobalte/core Select component
// Fetches agents via opencode-api.fetchAgents()
// Shows agent name + description
// Selected agent stored in session state
```

5. **`components/advanced-settings-modal.tsx`** — Advanced settings:
```tsx
// Modal with:
// - System prompt override (textarea)
// - Max tokens (number input)
// - Temperature (slider 0-2)
// - Top-p (slider 0-1)
// Applied per-session, not globally
```

6. **`stores/session-models.ts`** — Model state:
```typescript
// Reactive store for model/provider selection
// currentModelId: signal
// currentProviderId: signal
// availableModels: derived from fetchProviders()
// setModel(modelId, providerId) — updates both and recreates session
```

## OpenCode SDK API Reference (Verified via Context7)

### Provider & Model APIs
```typescript
import Opencode from "@opencode-ai/sdk";
const client = new Opencode({ baseURL: "http://localhost:PORT" });

// List all providers with their models
const providers = await client.provider.list();
// Returns: { all: [{ id: "anthropic", name: "Anthropic", models: [{ id: "claude-sonnet-4-20250514", name: "..." }] }] }

// Get app info (CWD, git status, config paths)
const app = await client.app.get();
// Returns: { path: { cwd, config, data }, git: {...}, hostname: "..." }

// Get current config
const config = await client.config.get();

// Create session with specific model
const session = await client.session.create({
  modelID: "claude-sonnet-4-20250514",
  providerID: "anthropic",
});

// List agents
const agents = await client.agent.list();
// Returns: Record<string, { name, description, ... }>

// Send message with model override
const response = await client.session.chat(sessionId, {
  parts: [{ type: "text", text: "Hello" }],
  modelID: "claude-sonnet-4-20250514",
  providerID: "anthropic",
});
```

### Installation Status API
```typescript
const installation = await client.installation.get();
// Returns: { id, time: { initialized, updated, expired }, version, isDev }
```

## Standard Stack (Gap-Closure)

### No New Dependencies Required
The gap-closure uses only what's already in Phase 1's stack:
- Express (backend routes) — already in 01-01
- @opencode-ai/sdk (provider/config/agent APIs) — already in 01-01
- TanStack React Query (data fetching hooks) — already in 01-03
- shadcn/ui components (Select, Combobox, Tabs, Dialog) — already in 01-02
- React Router (settings page route) — already in 01-02

## Architecture Patterns (Gap-Closure)

### Pattern 1: Backend Config Proxy Routes
**What:** Extend 01-01's Express server with routes that proxy OpenCode SDK config/provider/agent calls
**Why:** Frontend needs these APIs but shouldn't talk to OpenCode SDK directly

```typescript
// Add to server.ts alongside existing session routes
// GET /api/providers → engine.getClient().provider.list()
// GET /api/config → engine.getClient().config.get()
// GET /api/agents → engine.getClient().agent.list()
// GET /api/app → engine.getClient().app.get()
// GET /api/health → engine health check result
```

### Pattern 2: Model Selector in Chat Composer
**What:** Combobox at the top of chat that lets user pick model before/during session
**Why:** All 3 reference projects have this prominently — it's how users control which AI they're talking to

```tsx
// In chat composer area (01-03's Composer component):
// 1. Fetch providers via /api/providers
// 2. Flatten to model list grouped by provider
// 3. Combobox with search, provider grouping
// 4. Selected model passed to session.create({ modelID, providerID })
// 5. Persist last-used model in localStorage
```

### Pattern 3: Agent Selector in Chat Composer
**What:** Dropdown next to model selector for choosing which agent handles the session
**Why:** iDumb's core is multi-agent orchestration — user must be able to select agents

```tsx
// In chat composer area:
// 1. Fetch agents via /api/agents
// 2. Dropdown showing agent name + description
// 3. Selected agent passed to session parameters
// 4. Default to "supreme-coordinator" or user preference
```

### Pattern 4: Settings Page with Tabs
**What:** Dedicated `/settings` route with tabbed interface
**Why:** Every reference project has this — users need a place to configure the app

```tsx
// Tabs:
// 1. Appearance — theme (light/dark/system), accent color
// 2. AI — default model, default agent, provider status list
// 3. Connection — OpenCode engine URL, health status, reconnect
// 4. Governance — governance mode selector (strict/standard/relaxed/retard)
```

### Pattern 5: Connection Status Indicator
**What:** Persistent status bar showing engine connection health
**Why:** User needs feedback on whether the backend is connected

```tsx
// In sidebar footer or top bar:
// 🟢 Connected (engine healthy)
// 🟡 Connecting... (engine starting)
// 🔴 Disconnected (engine unreachable)
// Click to see details / reconnect
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Model grouping by provider | Custom data transformation | `client.provider.list()` already returns grouped data | SDK does the grouping |
| Agent discovery | Manual file scanning | `client.agent.list()` | SDK handles AGENTS.md parsing |
| Health polling | Custom setInterval | React Query's `refetchInterval` | Built-in polling with cache invalidation |
| Provider status | Custom status checker | Provider list response includes status | SDK already reports configured vs unconfigured |

## Common Pitfalls

### Pitfall 1: Model ID vs Provider ID Confusion
**What goes wrong:** Selecting a model but not capturing its providerID
**Why it happens:** Models come nested under providers. UI flattens to model list but forgets provider context.
**How to avoid:** Always store `{ modelID, providerID }` as a pair. The SDK `session.create()` requires both.

### Pitfall 2: Stale Provider Data After Key Change
**What goes wrong:** User adds API key but provider list still shows "unconfigured"
**Why it happens:** Provider list cached by React Query, not refreshed after config change.
**How to avoid:** Invalidate provider query cache after any config mutation.

### Pitfall 3: No Model Defaults
**What goes wrong:** User opens app, starts typing, but no model is selected — message fails silently.
**Why it happens:** No default model selection logic.
**How to avoid:** On first load, auto-select first available model from first configured provider. Persist in localStorage.

### Pitfall 4: Agent List Empty When iDumb Not Installed
**What goes wrong:** Agent selector shows empty list.
**Why it happens:** Agents only exist after `idumb-v2 init`. If user hasn't installed iDumb on the project, no agents.
**How to avoid:** Show a "default" agent (OpenCode's built-in) even when no custom agents exist. Show install prompt.

## Open Questions

1. **API key entry UI — needed?**
   - OpenCode manages API keys via environment variables and config files
   - Reference projects (Portal, OpenWork) have key entry UIs
   - Recommendation: **Phase 1 shows provider status (configured/not). Key management is Phase 2+ scope.**

2. **Model selection persistence — where?**
   - localStorage (simple, per-browser)
   - Server-side preference (per-user if auth exists)
   - Recommendation: **localStorage for Phase 1. Simple, works immediately.**

3. **Agent selection in composer vs global?**
   - Portal: per-session agent selection
   - OpenWork: agent mentions in composer (`@agent-name`)
   - Recommendation: **Both. Dropdown for default agent, `@mention` for mid-conversation switches.**

## Sources

### Primary (HIGH confidence)
- Context7 `/sst/opencode-sdk-js` — Verified `provider.list()`, `agent.list()`, `config.get()`, `app.get()`, `session.create()` APIs
- Portal source (Repomix ID: 21da36c56b201470) — Full settings page, model/agent stores, server routes, instance management
- CodeNomad source (Repomix ID: aaf0d31b3b8f86b4) — SDK manager, opencode-api, model/agent selectors, advanced settings
- OpenWork source (Repomix ID: 0c304de549098d52) — Settings page, provider auth, model picker, workspace lifecycle, onboarding

### Secondary (MEDIUM confidence)
- Context7 `/sst/opencode` — Plugin hooks, custom tool definitions
- Phase 1 plan analysis (all 8 plans read and gap-mapped)

## Metadata

**Confidence breakdown:**
- Gap identification: HIGH — verified against all 8 plans + all 3 reference projects
- SDK APIs: HIGH — verified via Context7, cross-referenced with reference project source
- Architecture patterns: HIGH — extracted from actual source code of 3 working projects
- Component design: MEDIUM — patterns proven in reference projects but need adaptation to our React + shadcn stack

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (30 days — stable APIs, reference projects actively maintained)
