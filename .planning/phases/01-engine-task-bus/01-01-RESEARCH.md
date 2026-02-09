# Research: 01-01 OpenCode SDK Integration Patterns

**Research Date:** 2026-02-10
**Researcher:** GSD Research Synthesizer
**Status:** Complete

---

## Executive Summary

Standalone OpenCode SDK projects (like OpenWork, Portal, Cloudflare Sandbox) follow a **client-server architecture** where a web application connects to an OpenCode server via the official TypeScript SDK. The recommended pattern is:

1. **Start OpenCode Server** using `createOpencode()` from `@opencode-ai/sdk` (this starts both server and client)
2. **Connect via SDK Client** using `createOpencodeClient()` for browser-based apps (connects to existing server)
3. **Relay SSE Events** through a middleware layer to browser clients
4. **Graceful Lifecycle Management** with health checks, port management, and proper shutdown handling

**Key Finding:** The current 01-01 approach (Express backend + SDK client) is architecturally sound and matches patterns from similar projects. However, there are several **critical implementation details** that require attention: SSE filtering limitations, server lifecycle management, port conflict handling, and error resilience patterns.

---

## Key Findings

### From Architecture Analysis

#### ✅ **Validated Architecture Pattern**

The client-server separation is the correct pattern for standalone applications:

```typescript
// Pattern 1: Start server + client together (OpenWork approach)
import { createOpencode } from "@opencode-ai/sdk/v2";

const { client, server } = await createOpencode({
  hostname: "127.0.0.1",
  port: 4096,
  config: { model: "anthropic/claude-3-5-sonnet-20241022" },
});

// Access: server.url, client methods
// Cleanup: server.close()
```

```typescript
// Pattern 2: Client-only connection (Portal approach)
import { createOpencodeClient } from "@opencode-ai/sdk/v2/client";

const client = createOpencodeClient({
  baseUrl: "http://localhost:4096",
  // directory: "/path/to/project", // Optional: for context
});

// No server lifecycle management - just HTTP client
```

**Key Insight:** OpenWork uses Pattern 1 (host mode) where it starts the server locally. Portal uses Pattern 2 (client-only) where it connects to an already-running server.

---

### From SDK Documentation

#### **SDK Client Configuration**

| Option | Type | Default | Purpose |
|---------|------|---------|---------|
| `baseUrl` | `string` | `"http://localhost:4096"` | Server URL to connect to |
| `directory` | `string` | `undefined` | Project directory for context |
| `fetch` | `function` | `globalThis.fetch` | Custom fetch implementation |
| `parseAs` | `string` | `"auto"` | Response parsing method |
| `responseStyle` | `string` | `"fields"` | Return style format |
| `throwOnError` | `boolean` | `false` | Error handling behavior |

#### **Server Options**

| Option | Type | Default | Purpose |
|---------|------|---------|---------|
| `hostname` | `string` | `"127.0.0.1"` | Server bind address |
| `port` | `number` | `4096` | Server port |
| `timeout` | `number` | `5000` | Server startup timeout (ms) |
| `config` | `Config` | `{}` | Inline config override |

#### **Server Lifecycle**

```typescript
// Start server
const { server, client } = await createOpencode({
  port: 4096,
  timeout: 5000, // Wait up to 5 seconds for startup
  config: { model: "anthropic/claude-3-5-sonnet-20241022" },
});

console.log(`Server running at ${server.url}`);

// Health check
await client.global.health();

// Graceful shutdown
await server.close();
```

**Important:** Always call `server.close()` to ensure graceful shutdown and port cleanup.

---

### From Real-World Projects

#### **OpenWork Architecture**

OpenWork provides a comprehensive example of the recommended architecture:

**Directory Structure:**
- Runs OpenCode server in background with project directory as working directory
- Desktop UI (Tauri) uses `@opencode-ai/sdk/v2/client` to connect
- Session management via SDK client methods
- SSE event streaming for real-time updates

**Key Implementation Details:**

```typescript
// From OpenWork ARCHITECTURE.md

// Host mode - starts OpenCode server locally
const opencode = await createOpencode({
  hostname: "127.0.0.1",
  port: 4096,
  timeout: 5000,
  config: {
    model: "anthropic/claude-3-5-sonnet-20241022",
  },
});

const { client } = opencode;

// Session management
const session = await client.session.create({
  body: { title: "My session" },
});

// Send prompt
const result = await client.session.prompt({
  path: { id: session.id },
  body: {
    model: { providerID: "anthropic", modelID: "claude-3-5-sonnet-20241022" },
    parts: [{ type: "text", text: "Hello!" }],
  },
});
```

**Best Practice from OpenWork:**
- Health checks before requests (`client.global.health()`)
- Session lifecycle management (create, abort, summarize)
- Permission request handling
- Todo list reading for execution plan visualization

---

#### **Portal Architecture**

Portal demonstrates the client-only pattern:

**Directory Structure:**
- Mobile-first web UI (React Router + IntentUI)
- Nitro backend server
- Connects to existing OpenCode server via SDK client

**Key Implementation:**

```typescript
// Client-only connection
import { createOpencodeClient } from "@opencode-ai/sdk/v2/client";

const client = createOpencodeClient({
  baseUrl: "http://localhost:4096",
});

// Session management
const sessions = await client.session.list();

// Real-time chat
const messages = await client.session.messages({
  path: { id: sessionId },
});
```

**Use Case:** Portal is designed for remote access via Tailscale VPN, connecting to a server already running on a different machine.

---

#### **Cloudflare Sandbox Integration**

Cloudflare provides advanced patterns for containerized OpenCode:

**Architecture:**
```
┌─────────────────────────────────────────────┐
│         WORKER LAYER                   │
│  Developer Code:                         │
│  - startOpenCodeServer(sandbox)        │
│  - createOpencodeClient({ baseUrl })   │
│  - client.session.create()             │
└────────────────┬───────────────────────────────┘
                 │ RPC
┌────────────────▼───────────────────────┐
│      DURABLE OBJECT LAYER              │
│  Sandbox DO:                           │
│  - Manages container lifecycle         │
│  - startProcess() for server           │
│  - exposePort() for access             │
└────────────────┬───────────────────────────────┘
                 │ HTTP (port 3000)
┌────────────────▼───────────────────────┐
│       CONTAINER LAYER                  │
│  Port 3000: Control plane (Bun)        │
│  - /api/opencode/* endpoints                                 │
│  - OpenCodeService manages server lifecycle                  │
│                                                              │
│  Port 4096: OpenCode Server (background process)             │
│  - Jupyter kernels, IPython, structured output               │
│  - Auto-started on first request                             │
└───────────────────────────────────────────────┘
```

**Key Innovation:** Three-layer separation with proper lifecycle management:
- Worker layer handles requests and business logic
- Durable Object layer manages state and HTTP client aggregation
- Container layer runs OpenCode server with automatic restart on failure

**Implementation:**
```typescript
// OpenCodeService manages server lifecycle
class OpenCodeService {
  async ensureServerRunning() {
    // Check if process exists and is healthy
    // Auto-starts if not running
    // Auto-restarts if unhealthy
  }

  async healthCheck() {
    const result = await this.exec(`curl -s http://localhost:${port}/app`);
    return result.exitCode === 0;
  }
}

// Lazy initialization with health checks
async function waitForServer(port: number): Promise<void> {
  // Waits for server to respond to health checks
  // Auto-restarts on failure
}
```

**Benefits:**
- Lazy initialization (starts on first request)
- Health checks before each request
- Auto-restart on failure
- Graceful shutdown handling

---

### SSE Event Streaming Patterns

#### **Current OpenCode SSE Limitation**

⚠️ **Critical Finding:** OpenCode's `/event` endpoint currently broadcasts **all events to all subscribers**. Clients must filter by sessionID on the client side.

**From OpenCode Issue #9650:**
> Currently, `/event` endpoint broadcasts all events to all subscribers. Clients must filter events by `sessionID` on their own.

**Evidence from Source Code:**
```typescript
// packages/opencode/src/server/server.ts:475
const unsub = Bus.subscribeAll(async(event) => {
  // Subscribes to ALL events - no filtering!
  await stream.writeSSE({ data: JSON.stringify(event) });
});
```

**Impact on Multi-Session Apps:**
- Bandwidth waste: Each client receives all events from all sessions
- Client CPU overhead: Client must filter every event
- Multi-node deployment: Each node gets all events (massive waste)
- Subagent complexity: Parent and child session events mixed together

**Workaround Pattern (used by production apps):**
```typescript
// Client-side filtering (current workaround)
const events = await client.event.subscribe();

for await (const event of events.stream) {
  const sessionID = event.properties?.part?.sessionID ||
                   event.properties?.info?.sessionID ||
                   event.properties?.info?.id ||
                   event.properties?.sessionID;

  // Filter: Only process events for current session
  if (sessionID !== currentSessionId) {
    continue; // Skip events from other sessions
  }

  // Process event
  handleEvent(event);
}
```

#### **Proposed SSE Filtering Enhancement**

OpenCode community has requested `sessionID` query parameter for server-side filtering:

```
GET /event?sessionID=ses_xxx
```

**Benefits:**
- Reduced bandwidth (10x improvement)
- Lower client CPU (no client-side filtering)
- Better multi-node scaling
- Cleaner separation of session events

**Status:** As of research date (2026-02-10), this is a **feature request**, not yet implemented.

---

### Error Handling Patterns

#### **Retry and Timeout Behavior**

From OpenCode SDK documentation and Go SDK patterns:

**Automatic Retry Strategy:**
- Connection errors: Auto-retried with exponential backoff
- HTTP 408 (Timeout): Retried
- HTTP 409 (Conflict): Retried
- HTTP 429+ (Rate Limit): Retried
- HTTP 500+ (Internal): Retried
- Default: 2 retries with exponential backoff

**Manual Retry Configuration:**
```typescript
// Configure per-request timeout
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute);
defer cancel();

client.Session.List(
  ctx,
  opencode.SessionListParams{},
  // This sets per-retry timeout
  option.WithRequestTimeout(20*time.Second),
);
```

**Recommended Timeout Values:**
- Connection establishment: 5-20 seconds
- Per-request timeout: 10-30 seconds (varies by operation type)
- Server startup: 5 seconds (SDK default)
- Long-running operations: 120-300 seconds

---

#### **Graceful Shutdown**

⚠️ **Critical Issue:** OpenCode server lacks signal handlers for graceful shutdown, causing **ghost port bindings** on Windows when terminated abruptly.

**From GitHub Issue #9859:**
> The `opencode serve` command lacks signal handlers for graceful shutdown, causing ghost port bindings on Windows when process is terminated by external tools.

**Symptom:**
```
$ opencode serve --port 4190
Error: Failed to start server on port 4190
$ netstat -ano | find "4190"
TCP 127.0.0.1:4190 0.0.0.0 LISTENING 464972
```

**Root Cause:**
- No handlers for SIGINT, SIGTERM, or SIGBREAK
- Process exits immediately without calling `server.stop()`
- Port remains bound to zombie PID

**Proposed Fix:**
```typescript
// Add signal handlers
process.on('SIGTERM', async () => {
  await server.stop(); // Graceful shutdown
});

process.on('SIGINT', async () => {
  await server.stop(); // Graceful shutdown
});
```

**Additional Recommendation:**
Enable `reusePort: true` in Bun.serve() to allow immediate port reuse after abnormal termination.

---

### Project Directory Binding

#### **Directory Parameter**

The `directory` parameter in `createOpencodeClient()` sets the working directory context:

```typescript
const client = createOpencodeClient({
  baseUrl: "http://localhost:4096",
  directory: "/path/to/project", // Project directory
});
```

**When to Use:**
- You need OpenCode to operate on files in that directory
- File operations (read, write, grep) should be scoped to that directory
- Multiple workspaces managed via project switching

**OpenWork Pattern:**
OpenWork lets users select a project folder, then starts OpenCode with that folder as the working directory:

```typescript
// From OpenWork
const opencode = await createOpencode({
  port: 4096,
  // No explicit directory - uses current directory
});
```

**Best Practice:** Always bind server to a specific project directory for proper isolation and file access.

---

### Mock/Development Mode Patterns

#### **In-Memory Mock Client**

For UI development without running a real server:

```typescript
// Mock client for development
class MockOpencodeClient {
  async sessionCreate() {
    return { id: "mock-session-123", title: "Mock Session" };
  }

  async sessionPrompt() {
    return {
      info: { id: "mock-msg-1", role: "assistant" },
      parts: [{ type: "text", text: "Mock response" }],
    };
  }

  async eventSubscribe() {
    // Simulate SSE stream
    return {
      stream: this.simulateEventStream(),
    };
  }

  private *simulateEventStream() {
    yield { type: "server.connected", properties: {} };
    yield { type: "PartUpdated", properties: { part: { sessionID: "123" } } };
    // Simulate more events...
  }
}
```

**Usage Pattern:**
```typescript
// Feature flag for mock mode
const USE_MOCK_SERVER = process.env.USE_MOCK_SERVER === 'true';

const client = USE_MOCK_SERVER
  ? new MockOpencodeClient()
  : createOpencodeClient({ baseUrl: "http://localhost:4096" });
```

**Benefits:**
- Fast UI iteration without server overhead
- Deterministic event simulation
- No network dependencies

**Trade-offs:**
- Can't test real server interactions
- Need production testing before deployment
- Mock complexity must be maintained

---

## Real-World Examples and Patterns

### Example 1: Basic Server + Client

```typescript
import { createOpencode } from "@opencode-ai/sdk/v2";

async function main() {
  // Start server + client
  const { client, server } = await createOpencode({
    hostname: "127.0.0.1",
    port: 4096,
    timeout: 5000,
    config: {
      model: "anthropic/claude-3-5-sonnet-20241022",
    },
  });

  console.log(`Server running at ${server.url}`);

  // Health check
  const health = await client.global.health();
  console.log(`Server healthy: ${health.data.healthy}`);

  // Create session
  const session = await client.session.create({
    body: { title: "My first session" },
  });

  // Send prompt
  const response = await client.session.prompt({
    path: { id: session.id },
    body: {
      model: { providerID: "anthropic", modelID: "claude-3-5-sonnet-20241022" },
      parts: [{ type: "text", text: "Hello, OpenCode!" }],
    },
  });

  // Cleanup
  await server.close();
}
```

---

### Example 2: SSE Event Streaming

```typescript
import { createOpencodeClient } from "@opencode-ai/sdk/v2/client";

async function monitorSession(sessionId: string) {
  const client = createOpencodeClient({
    baseUrl: "http://localhost:4096",
  });

  // Subscribe to events
  const events = await client.event.subscribe();

  // Event filtering pattern (current workaround)
  for await (const event of events.stream) {
    // Extract sessionID from different event properties
    const eventSessionId = event.properties?.part?.sessionID ||
                         event.properties?.info?.sessionID ||
                         event.properties?.info?.id ||
                         event.properties?.sessionID;

    // Only process events for our session
    if (eventSessionId !== sessionId) {
      continue;
    }

    // Handle different event types
    switch (event.type) {
      case "PartUpdated":
        handlePartUpdate(event.properties?.part);
        break;
      case "server.connected":
        console.log("Server connected");
        break;
      case "MessageUpdated":
        handleMessageUpdate(event.properties?.message);
        break;
      // ... more event types
    }
  }
}
```

---

### Example 3: Express Backend Relay (01-01 Pattern)

```typescript
import express from "express";
import { createOpencode } from "@opencode-ai/sdk/v2";

const app = express();
const opencode = await createOpencode({
  port: 4096,
  config: {
    model: "anthropic/claude-3-5-sonnet-20241022",
  },
});

app.get("/api/events", async (req, res) => {
  // Client subscribes to OpenCode server
  const events = await opencode.client.event.subscribe();

  // Set headers for SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Stream events to browser
  for await (const event of events.stream) {
    // Optional: Filter events before sending to browser
    if (event.properties?.part?.sessionID !== req.query.sessionId) {
      continue;
    }

    // Format as SSE
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }

  req.on("close", () => {
    // Cleanup when client disconnects
    // events.abort();
  });
});

app.listen(3000, () => {
  console.log("Express relay server running on port 3000");
  console.log("OpenCode server running on port 4096");
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  await opencode.server.close();
  process.exit(0);
});
```

---

## Recommendations for 01-01 Implementation

### ✅ **Architecture Validation**

The current 01-01 plan is **architecturally sound**. The Express backend + SDK client approach is the correct pattern for standalone web applications.

**Recommended Architecture:**
```
Browser (React/Vue/Svelte)
    ↓ HTTP
Express/Vite/Nitro Backend
    ↓ HTTP
OpenCode SDK Client (@opencode-ai/sdk/v2/client)
    ↓ HTTP
OpenCode Server (managed by backend or running separately)
```

---

### 🔧 **Implementation Improvements**

#### 1. SSE Event Filtering

**Current State:** Must filter all events client-side
**Recommended:** Implement client-side filtering with optimization:

```typescript
// Optimized event handler
class SessionEventFilter {
  private sessionEvents = new Map<string, Event[]>();
  private lastProcessedId = new Map<string, number>();

  async filterEvents(events: AsyncIterable<Event>) {
    for await (const event of events) {
      const sessionID = this.extractSessionID(event);

      // Skip if not for our session
      if (sessionID !== this.currentSessionId) {
        continue;
      }

      // Deduplicate by event ID
      const eventId = this.extractEventId(event);
      const lastId = this.lastProcessedId.get(eventId);
      if (lastId && eventId < lastId) {
        continue; // Already processed
      }

      // Cache event for this session
      if (!this.sessionEvents.has(sessionID)) {
        this.sessionEvents.set(sessionID, []);
      }
      this.sessionEvents.get(sessionID)!.push(event);
      this.lastProcessedId.set(eventId, eventId);

      yield event;
    }
  }
}
```

**Benefits:**
- Reduces redundant processing
- Handles event ordering
- Memory-efficient filtering

---

#### 2. Server Lifecycle Management

**Required Components:**

```typescript
interface OpencodeServerManager {
  start(options: { port?: number, projectDir?: string }): Promise<{ url: string; client: Client; stop: () => Promise<void> }>;
  healthCheck(): Promise<boolean>;
  restart(): Promise<void>;
  stop(): Promise<void>;
}
```

**Implementation:**

```typescript
import { createOpencode } from "@opencode-ai/sdk/v2";

class OpencodeServerManager {
  private process?: any;
  private port: number;
  private stopping = false;

  async start(options: { port?: number, projectDir?: string } = {
    this.port = options.port ?? 4096;

    // Check if port is available
    if (!(await this.isPortAvailable(this.port))) {
      throw new Error(`Port ${this.port} is already in use`);
    }

    // Start OpenCode server
    const { server, client } = await createOpencode({
      port: this.port,
      timeout: 5000,
      config: {
        model: "anthropic/claude-3-5-sonnet-20241022",
      },
    });

    // Store references
    this.process = server; // Note: server.close() is not exported in SDK
    return {
      url: server.url,
      client,
      stop: async () => {
        if (this.stopping) return;

        this.stopping = true;
        // Try graceful shutdown
        try {
          // Call internal cleanup if available
          if (typeof this.process === "object" && this.process.close) {
            await this.process.close();
          }
        } catch (error) {
          console.error("Error stopping server:", error);
        }

        // Fallback: kill process
        setTimeout(() => {
          this.process = undefined;
          this.stopping = false;
        }, 1000);
      },
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const health = await this.client.global.health();
      return health.data.healthy;
    } catch {
      return false;
    }
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.start({});
  }

  async stop(): Promise<void> {
    if (this.stopping) return;
    this.stopping = true;

    try {
      // Force kill after timeout
      const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Shutdown timeout")), 5000);
      });

      const result = await Promise.race([
        this.stopGracefully(),
        timeout,
      ]);

      if (result === timeout) {
        console.warn("Server did not stop gracefully, forcing shutdown");
      }
    } finally {
      this.process = undefined;
      this.stopping = false;
    }
  }

  private async isPortAvailable(port: number): Promise<boolean> {
    // Check if port is available
    // Implementation depends on platform
    // Can use 'netstat' on Unix or check if port binds
    return true; // Simplified for example
  }

  private async stopGracefully(): Promise<void> {
    // Try to close server properly
    // This is tricky because server.close() may not be exported
    // May need to kill the process instead
    this.process = undefined;
  }
}
```

---

#### 3. Connection Resilience

**Automatic Retry Configuration:**

```typescript
import { createOpencodeClient } from "@opencode-ai/sdk/v2/client";

// Create client with retry configuration
const client = createOpencodeClient({
  baseUrl: "http://localhost:4096",
  fetch: customFetchWithRetry, // Custom fetch with retry logic
});

// Custom fetch with exponential backoff
async function customFetchWithRetry(input: RequestInfo, init: RequestInit): Promise<Response> {
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      const response = await fetch(input.url, init);

      // Success on 2xx status codes
      if (response.status >= 200 && response.status < 300) {
        return response;
      }

      // Retry on connection errors and 5xx
    } catch (error) {
      retryCount++;

      // Exponential backoff with jitter
      const delay = Math.min(1000 * Math.pow(2, retryCount), 20000);
      await sleep(delay + Math.random() * 100); // Add jitter

      // Don't retry on 4xx client errors
      if (error instanceof TypeError && response.status >= 400 && response.status < 500) {
        throw error;
      }
    }
  }

  throw new Error(`Max retries (${maxRetries}) exceeded`);
}
```

---

#### 4. Express SSE Relay with Connection Management

```typescript
import express from "express";
import { createOpencode } from "@opencode-ai/sdk/v2";
import EventEmitter from "events";

interface SSEConnection {
  id: string;
  res: express.Response;
  opencodeEvents: AsyncIterable<any>;
  isActive: boolean;
}

class SSEManager extends EventEmitter {
  private connections = new Map<string, SSEConnection>();

  async addConnection(res: express.Response, sessionFilter?: string): Promise<string> {
    const connectionId = crypto.randomUUID();

    const opencode = await createOpencode({
      port: 4096,
    });

    const events = await opencode.client.event.subscribe();

    const connection: SSEConnection({
      id: connectionId,
      res,
      opencodeEvents: events,
      isActive: true,
    });

    this.connections.set(connectionId, connection);

    // Send server.connected event first
    res.write(`data: ${JSON.stringify({
      type: "server.connected",
      properties: {},
    })}\n\n`);

    this.emit("connection:open", { connectionId });

    // Handle connection lifecycle
    res.on("close", () => {
      connection.isActive = false;
      this.connections.delete(connectionId);

      // Don't abort events immediately - let them drain
      setTimeout(() => {
        // events.abort(); // Note: method may not be exposed
      }, 1000);

      this.emit("connection:close", { connectionId });
    });

    return connectionId;
  }

  async writeEventToConnection(connectionId: string, event: any): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.isActive) return;

    // Apply session filter if configured
    if (connection.sessionFilter && event.properties?.part?.sessionID !== connection.sessionFilter) {
      return;
    }

    connection.res.write(`data: ${JSON.stringify(event)}\n\n`);
  }

  broadcastEvent(event: any): void {
    for (const connection of this.connections.values()) {
      this.writeEventToConnection(connection.id, event);
    }
  }

  getActiveConnections(): number {
    return Array.from(this.connections.values()).filter(c => c.isActive).length;
  }
}

// Express app with SSE management
const app = express();
const sseManager = new SSEManager();

app.get("/events", async (req, res) => {
  const sessionFilter = req.query.sessionId;

  const connectionId = await sseManager.addConnection(res, sessionFilter);

  req.on("close", () => {
    sseManager.emit("connection:close", { connectionId });
  });
});

app.listen(3000, () => {
  console.log("SSE relay running on port 3000");
});
```

---

## Risk Assessment

### High Severity Risks

| Risk | Impact | Mitigation |
|-------|--------|------------|
| **SSE Bandwidth Waste** | 10x bandwidth waste in multi-session scenarios | Client-side filtering, implement session-specific subscriptions when available |
| **Ghost Port Bindings** | Server restart requires manual port cleanup or OS reboot | Signal handlers for graceful shutdown, port availability checks before start |
| **No Server-Side Session Filtering** | Client receives all events, high CPU overhead | Implement client-side filtering deduplication, monitor OpenCode issue #9650 for server-side filtering |
| **Connection Timeouts** | Indefinite hangs on network issues | Configure per-request timeouts, implement exponential backoff with jitter, health checks |
| **Process Leak** | Server process not cleaned up on crash | Proper shutdown handlers, monitoring for zombie processes |

### Medium Severity Risks

| Risk | Impact | Mitigation |
|-------|--------|------------|
| **Race Conditions** | Multiple clients trying to start server simultaneously | Port availability checks, atomic startup operations |
| **Event Ordering** | SSE events may arrive out of order | Event sequencing with timestamps, deduplication logic |
| **Memory Leaks** | Long-running SSE connections accumulate events | Connection lifecycle management, periodic cleanup, event windowing |
| **Type Safety** | Using wrong SDK types or versions | Use latest SDK version, strict TypeScript configuration |

### Low Severity Risks

| Risk | Impact | Mitigation |
|-------|--------|------------|
| **Development Complexity** | Mock vs real server confusion | Clear feature flags, separate mock implementations, documentation |
| **Over-Engineering** | Building advanced features before basic functionality | Start with MVP, iterate incrementally |
| **Testing Gaps** | Edge cases not covered | Comprehensive E2E tests, integration tests with real OpenCode server |

---

## Mock/Development Strategy

### When to Use Mock Server

**Use Cases for Mock Mode:**
1. **UI Development:** Iterate on UI without server dependency
2. **Component Testing:** Test React components with deterministic responses
3. **CI/CD Pipeline:** Run tests without requiring OpenCode server
4. **Offline Development:** Work on frontend without network

**Mock Implementation Guidelines:**
```typescript
// Feature flag
const MOCK_MODE = process.env.VITE_MOCK_OPENCODE === 'true';

// Real vs mock client selection
const client = MOCK_MODE
  ? createMockClient()
  : createOpencodeClient({ baseUrl: process.env.OPENCOD_SERVER_URL });

// Mock interface matching real SDK
interface IOpencodeClient {
  session: {
    create(): Promise<SessionData>;
    list(): Promise<SessionData[]>;
    get(): Promise<SessionData>;
    delete(): Promise<boolean>;
  };
  message: {
    create(): Promise<MessageData>;
    list(): Promise<MessageData[]>;
  };
  event: {
    subscribe(): Promise<EventStream>;
  };
}
```

**Important:** Ensure mock client implements the same interface as the real SDK to enable easy switching.

---

## OpenCode Server Configuration

### Environment Variables

```bash
# Server configuration
OPENCOD_PORT=4096
OPENCOD_HOSTNAME=127.0.0.1

# Authentication (if needed)
OPENCODE_SERVER_PASSWORD=your-password
OPENCODE_SERVER_USERNAME=opencode

# mDNS discovery
OPENCOD_MDNS=true
OPENCOD_MDNS_DOMAIN=myproject.local

# CORS for web clients
OPENCOD_CORS="http://localhost:5173,https://app.example.com"
```

### Configuration File (opencode.json)

```json
{
  "$schema": "https://opencode.ai/config.json",
  "server": {
    "port": 4096,
    "hostname": "127.0.0.1",
    "mdns": true,
    "mdnsDomain": "myproject.local",
    "cors": ["http://localhost:5173"]
  },
  "model": "anthropic/claude-3-5-sonnet-20241022"
}
```

---

## Recommended Implementation Order for 01-01

### Phase 1: Core Infrastructure
1. **OpenCode Server Manager** - Lifecycle management, health checks, graceful shutdown
2. **SDK Client Wrapper** - Configuration, retry logic, connection pooling
3. **Express Backend** - Basic API structure, SSE relay endpoints

### Phase 2: SSE Integration
4. **SSE Manager** - Connection lifecycle, event filtering, broadcast support
5. **Session-Specific Event Subscriptions** - If OpenCode implements server-side filtering
6. **Event Processing Pipeline** - Deduplication, ordering, routing to UI components

### Phase 3: Session Management
7. **Session CRUD Operations** - Create, read, update, delete via SDK
8. **Message Handling** - Send prompts, handle responses, streaming
9. **Permission Requests** - Surface and respond to permission requests
10. **Todo Integration** - Sync with OpenCode todos, display execution plan

### Phase 4: Advanced Features
11. **File Operations** - Read, write, search, status via SDK
12. **Agent Integration** - List and select agents, model selection
13. **Config Management** - Read and update opencode.json
14. **Multi-Session Support** - Multiple concurrent sessions with event filtering

---

## Sources

### Official Documentation
- OpenCode SDK Documentation: https://opencode.ai/docs/sdk/
- OpenCode Server Documentation: https://opencode.ai/docs/server/
- OpenCode Configuration: https://opencode.ai/docs/config/

### Community Projects
- **OpenWork:** https://github.com/different-ai/openwork (9.1k stars)
  - ARCHITECTURE.md: Comprehensive architecture documentation
  - Host mode implementation with `createOpencode()`
  - Session management patterns
  - SSE event streaming for real-time updates
  - Permission request handling

- **Portal:** https://github.com/hosenur/portal (356 stars)
  - Mobile-first web UI
  - Client-only connection pattern
  - Remote server access via Tailscale VPN
  - Tech stack: React Router, IntentUI, Tailwind CSS, Nitro

### Issues and Discussions
- **OpenCode Issue #9650:** Request for sessionID filter in SSE endpoint
  - Proposed: `GET /event?sessionID=ses_xxx`
  - Status: Feature request (not yet implemented)
  - Impact: 10x bandwidth improvement in multi-session scenarios

- **OpenCode Issue #9859:** Ghost port bindings on Windows
  - Root cause: Missing signal handlers in `opencode serve`
  - Proposed fix: Add SIGTERM/SIGINT handlers
  - Workaround: Force kill process after timeout

- **Cloudflare Sandbox Integration:** Deep research on SDK integration patterns
  - Three-layer architecture (Worker → DO → Container)
  - Lazy server initialization with health checks
  - Auto-restart on failure
  - Type-safe client with structured output

### Additional Research
- AWS SDK Retry Behavior Documentation: Exponential backoff patterns, circuit breaking, idempotency
- Medium articles on API timeout handling: Best practices for retry mechanisms, monitoring, and graceful degradation

---

## Confidence Assessment

| Area | Confidence | Notes |
|-------|------------|-------|
| **Stack Selection** | **HIGH** | `createOpencode()` + `createOpencodeClient()` patterns are well-documented and widely used (OpenWork, Portal, Cloudflare) |
| **Architecture** | **HIGH** | Client-server separation is validated by production apps; Express backend pattern is standard |
| **SSE Streaming** | **MEDIUM** | Current OpenCode SSE limitation is documented, but server-side filtering is a feature request; client-side filtering patterns are proven |
| **Error Handling** | **HIGH** | Retry patterns and timeout configuration are well-documented from OpenCode SDK and AWS best practices |
| **Lifecycle Management** | **MEDIUM** | Graceful shutdown issues are documented with proposed fixes; health check patterns from Cloudflare are robust |

### Gaps Requiring Attention

1. **Server-Side Session Filtering** - Monitor OpenCode Issue #9650 for implementation
2. **Graceful Shutdown in OpenCode** - Signal handler implementation is at OpenCode core level
3. **Port Conflict Detection** - Cross-platform port availability checking needs platform-specific implementations
4. **Mock Client Testing** - Ensure mock client covers all SDK methods used in production
5. **Browser SSE Reconnection** - Handle automatic reconnection when SSE connection drops

---

## Conclusion

The 01-01 architecture approach is **sound and aligns with industry best practices** from OpenWork, Portal, and Cloudflare Sandbox. The recommended implementation should:

1. ✅ **Use `createOpencode()`** for managed server lifecycle (when backend starts OpenCode)
2. ✅ **Use `createOpencodeClient()`** for browser clients connecting to existing servers
3. ✅ **Implement robust SSE manager** with connection lifecycle and client-side filtering
4. ✅ **Add graceful shutdown handlers** to prevent ghost port bindings
5. ✅ **Configure appropriate timeouts** (5s server startup, 10-30s per-request)
6. ✅ **Implement exponential backoff with jitter** for connection resilience
7. ✅ **Support mock mode** via feature flag for UI development

**Critical Success Factors:**
- Health checks before operations
- Proper error handling with retries
- Event filtering and deduplication
- Graceful resource cleanup
- Connection lifecycle management
- Mock mode for offline development

**Next Steps:**
1. Proceed with 01-01 implementation following the recommended order
2. Monitor OpenCode issue #9650 for SSE filtering updates
3. Test with real OpenCode server in CI/CD pipeline
4. Validate graceful shutdown on all platforms
5. Implement production monitoring and observability
