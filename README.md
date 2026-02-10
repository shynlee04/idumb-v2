<p align="center">
  <h1 align="center">🧠 iDumb v2</h1>
  <p align="center"><strong>Intelligent Delegation Using Managed Boundaries</strong></p>
  <p align="center"><em>"Tao ngu nên tao cần quản trị" — The AI agents, probably</em></p>
</p>

<p align="center">
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.7-blue.svg" alt="TypeScript"></a>
  <a href="#tests"><img src="https://img.shields.io/badge/Tests-466%2F466-brightgreen.svg" alt="Tests"></a>
  <a href="#"><img src="https://img.shields.io/badge/OpenCode-SDK--Direct-orange.svg" alt="OpenCode SDK"></a>
  <a href="#"><img src="https://img.shields.io/badge/Platform-Standalone-brightgreen.svg" alt="Standalone Platform"></a>
  <a href="#"><img src="https://img.shields.io/badge/Agents-3-purple.svg" alt="3 Agents"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="MIT License"></a>
</p>

---

> **🇻🇳 Bạn nói tiếng Việt?** [Nhảy xuống phiên bản tiếng Việt ↓](#-idumb-v2--phiên-bản-tiếng-việt)

---

## 😤 The Problem

Your AI coding agent is brilliant. It can write a full-stack app from scratch. It can refactor 10,000 lines in one shot. It can—

**...also delete your database migration, overwrite your config, and confidently claim "Done!" while your CI burns.**

AI agents don't lack intelligence. They lack **boundaries.**

## 🧠 The Solution

**iDumb** = your AI agent's adult supervision. It doesn't make agents smarter — it makes them **accountable.**

```
Agent: *tries to write hello.txt*
iDumb:  ❌ GOVERNANCE BLOCK: write denied
        → No active task. Call idumb_task first.

Agent: *creates a task, then writes*
iDumb:  ✅ ALLOW: write (task: "Add hello world")
```

One rule. Zero negotiation. Your codebase stays alive.

---

## ✨ Features at a Glance

| Feature | What it does |
|---------|-------------|
| 🚫 **Tool Gate** | Blocks `write` and `edit` without an active task. No exceptions. |
| 🤖 **3 Specialized Agents** | Coordinator → Investigator + Executor — strict role separation |
| 🔍 **Brownfield Detection** | Scans your project: frameworks, tech stack, code smells, test gaps — before touching anything |
| 🧲 **Compaction Survival** | Critical context anchors persist when LLM context resets |
| ✂️ **Context Pruning** | Old tool outputs auto-truncated. Fresh context, always. |
| 💾 **Disk Persistence** | Tasks, anchors, delegations survive across sessions |
| 📊 **Dashboard** | Real-time governance UI — Express + WebSocket backend, React + Vite frontend |
| 🌏 **Bilingual** | Full English + Vietnamese support |
| 🎯 **Agent Scoping** | Each agent has specific tool permissions — investigators can't write code, executors can't create epics |

---

## 🚀 Quick Start

### 1. Clone and build

```bash
git clone https://github.com/shynlee04/idumb-v2.git
cd idumb-v2
npm install
npm run build
npm link
```

> **Why `npm link`?** The package isn't on npm yet. This creates a global `idumb-v2` command pointing to your local build. Use `sudo npm link` on permission errors. For pnpm: `pnpm link --global`.

### 2. Go to your project and init

```bash
cd /path/to/your-project
idumb-v2 init
```

Interactive prompts:

| Prompt | Options | Default |
|--------|---------|---------|
| **Scope** | project / global | project |
| **Language** | English / Tiếng Việt | English |
| **Doc language** | English / Tiếng Việt | same as above |
| **Experience** | beginner / guided / expert | guided |
| **Governance** | balanced / strict / autonomous | balanced |

Or skip prompts: `idumb-v2 init -y`

### 3. What gets deployed

```
your-project/
├── .opencode/
│   ├── agents/                           # 3 AI agents
│   │   ├── idumb-supreme-coordinator.md  # Orchestrator — delegates, never writes
│   │   ├── idumb-investigator.md         # Research, analysis, planning
│   │   └── idumb-executor.md             # Code writer — the only one that writes
│   └── commands/                         # 4 slash commands
│       ├── idumb-init.md                 # /idumb-init
│       ├── idumb-settings.md             # /idumb-settings
│       ├── idumb-status.md               # /idumb-status
│       └── idumb-delegate.md             # /idumb-delegate
├── .idumb/                               # Governance data
│   ├── config.json                       # Your settings
│   ├── brain/                            # Persistent state
│   │   ├── tasks.json                    # Task hierarchy (Epic → Task → Subtask)
│   │   ├── hook-state.json               # Session state
│   │   └── delegations.json              # Delegation chains
│   └── idumb-modules/                    # Templates & schemas
│       ├── agents/                       # Agent profile references
│       ├── schemas/                      # Contracts
│       ├── commands/                     # Command templates
│       ├── workflows/                    # Workflow templates
│       └── skills/                       # Governance protocols
```

### 4. Start OpenCode

```bash
opencode
```

Press **Tab** → pick `idumb-supreme-coordinator` → governance is live.

### 5. Governance in action

```
Agent: "Let me create that file for you"
→ ❌ GOVERNANCE BLOCK: write denied
→ CURRENT STATE: No active work plan or task.
→ USE INSTEAD: Call "govern_plan" with action "create"

Agent: govern_plan create "Feature: user auth"
Agent: govern_task start <task_id>
→ ✅ Now writes are allowed.
```

---

## 📊 Dashboard

iDumb includes a real-time governance dashboard for visualizing task state, delegation chains, and code quality.

### Start the dashboard

```bash
idumb-v2 dashboard
```

This starts **two servers**:

| Server | Default Port | Stack |
|--------|-------------|-------|
| **Backend** | `3001` | Express + WebSocket + chokidar file watcher |
| **Frontend** | `3000` | React 18 + Vite + Tailwind v4 + TanStack Query |

The frontend proxies `/api` and `/ws` requests to the backend automatically.

### Dashboard flags

```bash
idumb-v2 dashboard                     # Defaults: port 3000, auto-open browser
idumb-v2 dashboard --port 4000         # Custom frontend port
idumb-v2 dashboard --backend-port 5000 # Custom backend port
idumb-v2 dashboard --no-browser        # Don't auto-open browser
```

### Prerequisites

- `.idumb/` must exist — run `idumb-v2 init` first
- Frontend requires Vite (`npx vite` must work)
- Backend reads from `.idumb/brain/` for live governance state

---

## 🔍 Init Scan

When you run `idumb-v2 init`, the CLI performs a brownfield scan that measures your project's health across 7 dimensions:

### What gets scanned

| Dimension | What it detects |
|-----------|----------------|
| **Tech Stack** | Frameworks (React, Next.js, Express, etc.), languages, build tools |
| **File Health** | God files (>300 LOC), mega files (>500 LOC) |
| **Function Quality** | Spaghetti functions (>50 lines), deep nesting (5+ indent levels) |
| **Debt Markers** | `TODO`, `FIXME`, `HACK`, `XXX`, `WORKAROUND` counts |
| **Hygiene** | `console.log` in production code (test files excluded) |
| **Coupling** | Files with excessive imports (>15 import statements) |
| **Test Coverage** | Source files missing test companions (`*.test.ts` / `*.spec.ts`) |

### Additional detection

- **Package manager**: npm / pnpm / yarn / bun
- **Monorepo**: Workspace configuration detection
- **Governance**: Existing `.opencode/`, `.claude/`, `.cursor/` directories
- **Gaps & conflicts**: Missing configs, version mismatches, conflicting settings

### Health grade

The scan produces a letter grade (A–F) with a 0–100 score:

```
  ┌──────────────────────────────────────────────────────┐
  │  PROJECT HEALTH: B  ██████████░  score: 78/100       │
  └──────────────────────────────────────────────────────┘

  ▐ Tech Stack    typescript, react, next.js
  ▐ Governance    none
  ▐ Pkg Manager   npm
  ▐ Monorepo      No

  ▐ Mega files (>500L)          2
  ▐ God files (>300L)           4
  ▐ Spaghetti functions (>50L)  7
  ▐ TODO/FIXME/HACK markers     23
```

In `retard` governance mode (expert only), the scan adds roasts:

```
  "I've seen cleaner dumpster fires." — iDumb
```

---

## 🏗️ Architecture

### Standalone Platform Design

**⚠️ STRATEGIC PIVOT (2026-02-10):** iDumb is now a **standalone multi-agent workplace platform**, not a plugin. All governance flows through the OpenCode SDK called directly from the dashboard backend.

```
iDumb Platform
├── Dashboard Backend (Node.js + Express)
│   ├── SDK Client (OpenCode SDK direct calls)
│   ├── Governance Engine (task graph, delegation, anchors)
│   └── WebSocket Server (real-time updates to frontend)
│
├── Dashboard Frontend (React + Vite)
│   ├── Task Management UI (Smart TODO, WorkPlans)
│   ├── Agent Control Panel (3-agent delegation interface)
│   └── Planning Workspace (artifacts, traceability)
│
└── Governance System (Schema-driven)
    ├── Task Graph (WorkPlan → TaskNode → Checkpoint)
    ├── Delegation (3-agent hierarchy with category routing)
    ├── Anchors (context survival across sessions)
    └── Planning Registry (artifact chains, staleness tracking)
```

### SDK-Direct Governance (Previous Plugin Hooks Deprecated)

```
Plugin architecture (DEPRECATED) → SDK architecture (CURRENT)
├── tool.execute.before          → SDK: tool.execute.before hook via SDK client
├── experimental.chat.system.transform → SDK: governance directive injection
├── experimental.session.compacting → SDK: anchor injection
└── chat.params                   → SDK: agent identity capture
```

### 3-Agent Hierarchy

```
                🎯 Supreme Coordinator (depth 0)
                   "I delegate, I don't write"
                    ╱               ╲
        🔬 Investigator          🔨 Executor (depth 1)
        "I research & plan"      "I write code"
```

Each agent has **scoped permissions**:

| Agent | Role | Can Write Code | Can Create Epics | Can Delegate |
|-------|------|:-:|:-:|:-:|
| 🎯 **Coordinator** | Orchestrate, delegate, track | ❌ | ✅ | ✅ |
| 🔬 **Investigator** | Research, analysis, planning | Brain entries only | ❌ | ❌ |
| 🔨 **Executor** | Code, builds, tests | ✅ | ❌ | ❌ |

### Plugin Hooks (DEPRECATED — Historical Reference)

> **⚠️ ARCHIVED (2026-02-10):** Plugin architecture is deprecated. All governance now flows through OpenCode SDK calls from the dashboard backend. This section is for historical context only.

| Hook | Purpose (DEPRECATED) |
|------|---------|
| `event` | Session lifecycle logging |
| `tool.execute.before` | Blocks write/edit without task + agent-scoped tool gating |
| `tool.execute.after` | Defense-in-depth fallback |
| `experimental.session.compacting` | Injects anchors + active task post-compaction |
| `experimental.chat.system.transform` | Governance directive in system prompt |
| `experimental.chat.messages.transform` | Prunes stale tool outputs (DCP pattern) |
| `chat.params` | Captures agent identity for auto-assignment |

### Source Structure

```
src/
├── cli.ts                      # CLI entry (idumb-v2 init, idumb-v2 dashboard)
├── cli/
│   ├── deploy.ts               # Agent + command + module deployment
│   └── dashboard.ts            # Dashboard server launcher
├── templates.ts                # 3 agent templates + commands + modules
├── _archived-plugin/           # Archived plugin source (Phase 1A)
├── schemas/
│   ├── task.ts                 # Smart TODO (Epic -> Task -> Subtask)
│   ├── task-graph.ts           # v3 TaskNode + Checkpoint model
│   ├── work-plan.ts            # v3 WorkPlan lifecycle
│   ├── anchor.ts               # Anchor scoring & staleness
│   ├── config.ts               # IdumbConfig schema
│   ├── delegation.ts           # Delegation chain + agent hierarchy
│   ├── planning-registry.ts    # Artifact registry (tiers, chains, sections)
│   └── ...                     # brain, codemap, project-map, plan-state, wiki, etc.
├── lib/
│   ├── logging.ts              # TUI-safe file logger (zero console.log)
│   ├── persistence.ts          # StateManager — debounced disk I/O + brain stores
│   ├── paths.ts                # Shared BRAIN_PATHS constant
│   ├── brain-indexer.ts        # Code map + project map population
│   ├── state-reader.ts         # State reading utilities
│   ├── code-quality.ts         # Brownfield code smell scanner + grading
│   ├── framework-detector.ts   # Read-only project scanner
│   ├── scaffolder.ts           # .idumb/ directory creator
│   ├── sqlite-adapter.ts       # SQLite storage adapter (optional)
│   └── storage-adapter.ts      # Storage adapter interface
└── dashboard/
    ├── backend/server.ts       # Express + WebSocket + SSE + static serving
    ├── backend/engine.ts       # OpenCode SDK engine bridge
    ├── frontend/               # React 18 + Vite + Tailwind v4 + TanStack Query
    └── shared/                 # Shared types between backend/frontend
```

---

## ⚙️ Configuration

### Governance Modes

| Mode | Behavior |
|------|----------|
| **Balanced** | Agents get recommendations before stopping. Full task completion, governed at decision boundaries. |
| **Strict** | Validate at every node. Must pass gate before proceeding. |
| **Autonomous** | AI decides freely. Still logs everything. Maximum freedom. |
| **Retard** _(expert only)_ | Autonomous + zero-trust personality. Challenges everything. Roasts bad code. |

### `idumb_init` Parameters

| Parameter | Options | Default |
|-----------|---------|---------|
| `action` | `install`, `scan`, `status` | `install` |
| `language` | `en`, `vi` | `en` |
| `experience` | `beginner`, `guided`, `expert` | `guided` |
| `governance_mode` | `balanced`, `strict`, `autonomous` | `balanced` |
| `force` | `true`, `false` | `false` |

### Governance Tools (Archived)

> Plugin-based governance tools were archived in Phase 1A. SDK-direct equivalents planned.

---

## Tests

```bash
npm test    # 466/466 assertions across 10 suites
```

| Suite | Assertions | Coverage |
|-------|-----------|----------|
| `init.test.ts` | 65 | Config, detection, scaffold, bilingual reports |
| `persistence.test.ts` | 43 | Round-trip, debounce, degradation, brain stores |
| `task.test.ts` | 54 | Epic/task CRUD, WorkStream v2, migration |
| `delegation.test.ts` | 44 | Delegation chains, expiry, hierarchy |
| `planning-registry.test.ts` | 52 | Artifact tracking, lifecycle, queries |
| `work-plan.test.ts` | 56 | WorkPlan lifecycle, task planning |
| `task-graph.test.ts` | 112 | v3 TaskNode, Checkpoint, migration |
| `plan-state.test.ts` | 40 | Plan phase tracking, projections |
| `smoke-code-quality.ts` | -- | Smoke test against own codebase |
| `sqlite-adapter.test.ts` | conditional | SQLite storage (when native binding available) |

---

## 📐 Design Principles

| Principle | What it means |
|-----------|---------------|
| **No hallucination** | Code matches docs. Untested = unclaimed. |
| **TUI safety** | Zero `console.log`. File-based logging only. Never break the host. |
| **Graceful degradation** | Every hook wrapped in try/catch. Disk fails? In-memory continues. |
| **Schema-first** | Zod schemas define all data structures. Types derived with `z.infer<>`. |
| **Hook factory pattern** | Every hook = function returning async handler with captured state. |
| **Deterministic governance** | No LLM reasoning in enforcement. Rules are rules. |

---

## Known Limitations

- **Plugin archived** — Governance hooks and tools archived in Phase 1A; SDK-direct reimplementation planned
- **Not on npm** — Requires `npm link` for now (publish coming soon)
- **Dashboard** — Frontend built but not fully integrated with governance enforcement

---

## 🤝 Contributing

```bash
npm run typecheck    # tsc --noEmit — zero errors
npm test             # 466/466 — all must pass
npm run build        # tsc → dist/ — clean compile
```

PRs welcome. Community built. Ship it.

---

---

# 🧠 iDumb v2 — Phiên Bản Tiếng Việt

<p align="center">
  <strong>Ủy Thác Thông Minh Với Ranh Giới Được Quản Lý</strong><br>
  <em>Vì AI giỏi quá cũng cần ai đó kéo dây cương lại 🐴</em>
</p>

---

## 😤 Vấn Đề

Agent AI của bạn rất thông minh. Nó viết full-stack app trong nháy mắt. Refactor 10,000 dòng code? Dễ ợt.

**...Nhưng nó cũng xóa migration database, ghi đè config, rồi tự tin tuyên bố "Xong rồi!" trong khi CI cháy đỏ rực.** 🔥

Agent AI không thiếu trí thông minh. Chúng thiếu **ranh giới.**

Nói cách khác: **AI nó ngu nên nó cần quản trị.** Mà không phải ngu thiệt đâu — nó ngu kiểu _"biết quá nhiều nên quên mất cái nào không được đụng vô."_

## 🧠 Giải Pháp

**iDumb** = bảo mẫu cho AI agent. Không làm agent thông minh hơn — mà làm nó **có trách nhiệm hơn.**

```
Agent: *muốn viết file hello.txt*
iDumb:  ❌ CHẶN: write bị từ chối
        → Chưa có task. Gọi idumb_task trước đi.

Agent: *tạo task xong, viết lại*
iDumb:  ✅ CHO PHÉP: write (task: "Thêm file hello world")
```

Một luật. Không thương lượng. Codebase bạn sống sót. 💪

---

## ✨ Tính Năng

| Tính năng | Mô tả |
|-----------|-------|
| 🚫 **Cổng Công Cụ** | Chặn `write` và `edit` nếu chưa có task. Không ngoại lệ. |
| 🤖 **3 Agent Chuyên Biệt** | Coordinator → Investigator + Executor — phân vai rõ ràng |
| 🔍 **Quét Brownfield** | Tự nhận diện framework, tech stack, code smell, test gap — trước khi đụng vô bất cứ thứ gì |
| 🧲 **Sống Sót Compaction** | Context quan trọng không bị mất khi LLM reset cửa sổ |
| ✂️ **Dọn Dẹp Context** | Output cũ tự động bị cắt gọn. Context luôn tươi mới. |
| 💾 **Lưu Trữ** | Task, anchor, delegation sống qua các session |
| 📊 **Dashboard** | Giao diện quản trị real-time — Express + WebSocket + React + Vite |
| 🌏 **Song Ngữ** | Hỗ trợ đầy đủ Tiếng Việt + English |
| 🎯 **Phân Quyền Agent** | Mỗi agent có quyền riêng — investigator không được viết code, executor không được tạo epic |

---

## 🚀 Bắt Đầu Nhanh

### 1. Clone và build

```bash
git clone https://github.com/shynlee04/idumb-v2.git
cd idumb-v2
npm install
npm run build
npm link
```

> **Tại sao `npm link`?** Package chưa lên npm. Lệnh này tạo command `idumb-v2` toàn cục trỏ về bản build local. Dùng `sudo npm link` nếu bị lỗi quyền.

### 2. Vào project của bạn và init

```bash
cd /đường-dẫn/tới/project-của-bạn
idumb-v2 init
```

Chọn Tiếng Việt khi được hỏi → mọi output sẽ bằng tiếng Việt! 🇻🇳

Hoặc bỏ qua hỏi đáp: `idumb-v2 init -y`

### 3. Deploy những gì?

```
project-cua-ban/
├── .opencode/
│   ├── agents/                           # 3 agent AI
│   │   ├── idumb-supreme-coordinator.md  # Dieu phoi — chi delegate, khong viet code
│   │   ├── idumb-investigator.md         # Nghien cuu, phan tich, lap ke hoach
│   │   └── idumb-executor.md             # Viet code — agent duy nhat duoc viet
│   └── commands/                         # 4 lenh
│       ├── idumb-init.md                 # /idumb-init
│       ├── idumb-settings.md             # /idumb-settings
│       ├── idumb-status.md               # /idumb-status
│       └── idumb-delegate.md             # /idumb-delegate
├── .idumb/                               # Du lieu quan tri
│   ├── config.json                       # Cai dat cua ban
│   ├── brain/                            # Trang thai ben vung
│   └── idumb-modules/                    # Template & schema
```

### 4. Chạy OpenCode

```bash
opencode
```

Nhấn **Tab** → chọn `idumb-supreme-coordinator` → quản trị bắt đầu.

### 5. Quản trị hoạt động!

```
Agent: "Để tôi tạo file đó cho bạn"
→ ❌ CHẶN: write bị từ chối
→ TRẠNG THÁI: Chưa có work plan hoặc task nào
→ THAY VÀO ĐÓ: Gọi "govern_plan" với action "create"

Agent: govern_plan create "Feature: user auth"
Agent: govern_task start <task_id>
→ ✅ Bây giờ write được phép.
```

---

## 📊 Dashboard

iDumb có giao diện dashboard real-time để xem trạng thái task, delegation chain, và code quality.

### Chạy dashboard

```bash
idumb-v2 dashboard
```

Chạy **hai server**:

| Server | Port mặc định | Stack |
|--------|---------------|-------|
| **Backend** | `3001` | Express + WebSocket + chokidar |
| **Frontend** | `3000` | React 18 + Vite + Tailwind v4 + TanStack Query |

### Tùy chọn

```bash
idumb-v2 dashboard --port 4000         # Đổi port frontend
idumb-v2 dashboard --backend-port 5000 # Đổi port backend
idumb-v2 dashboard --no-browser        # Không mở browser tự động
```

### Yêu cầu

- `.idumb/` phải tồn tại — chạy `idumb-v2 init` trước
- Frontend cần Vite (`npx vite` phải hoạt động)

---

## 🔍 Quét Brownfield (Init Scan)

Khi chạy `idumb-v2 init`, CLI quét project của bạn qua 7 chiều:

| Chiều | Phát hiện gì |
|-------|-------------|
| **Tech Stack** | Framework, ngôn ngữ, build tool |
| **File Health** | God file (>300 dòng), mega file (>500 dòng) |
| **Function Quality** | Spaghetti function (>50 dòng), nesting sâu (5+ cấp) |
| **Debt Markers** | `TODO`, `FIXME`, `HACK`, `XXX`, `WORKAROUND` |
| **Hygiene** | `console.log` trong production code |
| **Coupling** | File có quá nhiều import (>15) |
| **Test Coverage** | File thiếu test companion (`*.test.ts`) |

Kết quả là điểm sức khỏe A–F (0–100):

```
  ┌──────────────────────────────────────────────────────┐
  │  PROJECT HEALTH: B  ██████████░  score: 78/100       │
  └──────────────────────────────────────────────────────┘
```

Ở chế độ `retard`, scan thêm roast:

```
  "Tao thấy bãi rác sạch hơn." — iDumb
```

---

## 🎯 Hệ Thống Agent

```
            🎯 Supreme Coordinator (depth 0)
               "Tao phân công, tao không viết"
                ╱               ╲
    🔬 Investigator          🔨 Executor (depth 1)
    "Tao nghiên cứu"        "Tao viết code"
```

### Phân Quyền

| Agent | Vai trò | Viết code | Tạo epic | Delegate |
|-------|---------|:-:|:-:|:-:|
| 🎯 **Coordinator** | Điều phối, phân công | ❌ | ✅ | ✅ |
| 🔬 **Investigator** | Nghiên cứu, phân tích | Brain only | ❌ | ❌ |
| 🔨 **Executor** | Code, build, test | ✅ | ❌ | ❌ |

---

## ⚙️ Chế Độ Quản Trị

| Chế độ | Mô tả |
|--------|-------|
| **Cân bằng** | Agent được gợi ý trước khi dừng. Quản trị tại ranh giới quyết định. |
| **Nghiêm ngặt** | Kiểm tra tại mọi nút. Phải vượt qua cổng mới được tiếp tục. |
| **Tự chủ** | Agent tự quyết. Tự do tối đa. Nhưng vẫn ghi log hết. |
| **Retard** _(expert only)_ | Tự chủ + zero-trust. Thách thức mọi thứ. Roast code dở. |

---

## 🧪 Tests

```bash
npm test    # 466/466 assertions — 10 suite
```

---

## 📐 Nguyên Tắc Thiết Kế

| Nguyên tắc | Ý nghĩa |
|------------|---------|
| **Không ảo** | Code khớp docs. Chưa test = chưa claim. |
| **An toàn TUI** | Không có `console.log`. Chỉ log ra file. Không bao giờ crash host. |
| **Suy giảm duyên dáng** | Mọi hook đều try/catch. Disk hỏng? In-memory vẫn chạy. |
| **Schema-first** | Zod schema định nghĩa mọi thứ. Type được derive, không viết tay. |
| **Deterministic** | Không dùng LLM để enforce. Luật là luật. |

---

## ⚠️ Hạn Chế

- **Subagent hook gap** — `tool.execute.before` không fire cho subagent trong OpenCode
- **Experimental hooks** — `system.transform` và `messages.transform` chưa verified
- **Chưa lên npm** — Cần `npm link` (publish sắp tới™)

---

## 📝 License

[MIT](https://opensource.org/licenses/MIT)

---

<p align="center">
  <strong>iDumb v2</strong> — Vì AI thông minh quá cũng cần ai đó nhắc: <em>"Ê, tạo task trước đi rồi hẵng viết."</em> 🧠
</p>
