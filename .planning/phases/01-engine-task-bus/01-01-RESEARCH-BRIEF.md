# Research Brief: 01-01 OpenCode SDK Integration Patterns

**Project Type:** Standalone web application using OpenCode SDK (similar to: kimaki, portal, OpenWork)

**Current Plan 01-01:**
- Starts OpenCode Server via `@opencode-ai/sdk/server`
- Creates SDK client via `@opencode-ai/sdk`
- Wraps session management in Express backend
- Relays SSE events to browser

**Research Questions:**

1. **Architecture Validation**
   - Is starting OpenCode Server from a standalone SDK app correct?
   - How do kimaki, portal, OpenWork handle server lifecycle?
   - What's the pattern for: server startup, graceful shutdown, project directory binding?

2. **SDK Client Configuration**
   - Does `createOpencodeClient({ baseUrl, directory })` work with a locally started server?
   - Are there alternative connection patterns?
   - How to handle server startup failures, timeouts, port conflicts?

3. **Event Streaming (SSE)**
   - Best practice for relaying `client.event.subscribe()` to browser SSE?
   - How to filter events by session/agent?
   - Connection resilience: what happens when SSE drops?

4. **Project Examples**
   - Code patterns from: kimaki, portal, OpenWork
   - Common pitfalls in OpenCode Server SDK usage
   - Error handling patterns for SDK operations

5. **Mock/Development Mode**
   - Best practice for developing without running full OpenCode Server?
   - Mock client patterns or in-memory store for UI development?

**Deliverable:**
- `.planning/phases/01-engine-task-bus/01-01-RESEARCH.md`
- Documented architecture patterns
- Code examples from similar projects
- Validated or corrected 01-01 requirements
- Risk assessment for current approach

**Constraints:**
- RESEARCH ONLY - no code implementation
- Validate architecture before touching code
- Reference real OpenCode SDK examples
