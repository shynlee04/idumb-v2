<p align="center">
  <h1 align="center">🧠 iDumb v2</h1>
  <p align="center"><strong>Intelligent Delegation Using Managed Boundaries</strong></p>
  <p align="center"><em>"Tao ngu nên tao cần quản trị" — The AI agents, probably</em></p>
</p>

<p align="center">
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.7-blue.svg" alt="TypeScript"></a>
  <a href="#tests"><img src="https://img.shields.io/badge/Tests-242%2F242-brightgreen.svg" alt="Tests"></a>
  <a href="https://opencode.ai/docs/plugins/"><img src="https://img.shields.io/badge/OpenCode-Plugin-green.svg" alt="OpenCode Plugin"></a>
  <a href="#"><img src="https://img.shields.io/badge/Agents-7-purple.svg" alt="7 Agents"></a>
  <a href="#"><img src="https://img.shields.io/badge/Hooks-6-orange.svg" alt="6 Hooks"></a>
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
| 🤖 **7 Specialized Agents** | Meta Builder → Supreme Coordinator → Builder, Validator, Planner, Researcher, Skills Creator |
| 🔍 **Brownfield Detection** | Scans your project: frameworks, tech stack, gaps, conflicts — before touching anything |
| 🧲 **Compaction Survival** | Critical context anchors persist when LLM context resets |
| ✂️ **Context Pruning** | Old tool outputs auto-truncated. Fresh context, always. |
| 💾 **Disk Persistence** | Tasks, anchors, delegations survive across sessions |
| 🌏 **Bilingual** | Full English + Vietnamese support |
| 🎯 **Agent Scoping** | Each agent has specific tool permissions — validators can't write, builders can't create epics |

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
│   ├── agents/                           # 7 AI agents
│   │   ├── idumb-meta-builder.md         # 👑 Top-level orchestrator
│   │   ├── idumb-supreme-coordinator.md  # 🎯 Delegation & tracking
│   │   ├── idumb-builder.md              # 🔨 Code writer
│   │   ├── idumb-validator.md            # ✅ Read-only validator
│   │   ├── idumb-planner.md              # 📋 Planning & research
│   │   ├── idumb-research-synthesizer.md # 🔬 Deep research
│   │   └── idumb-skills-creator.md       # ⚡ Skill & command creator
│   └── commands/
│       ├── idumb-init.md                 # /idumb-init
│       ├── idumb-settings.md             # /idumb-settings
│       ├── idumb-status.md               # /idumb-status
│       └── idumb-delegate.md             # /idumb-delegate
├── .idumb/                               # Governance data
│   ├── config.json                       # Your settings
│   ├── brain/                            # Persistent state
│   │   ├── tasks.json                    # Task hierarchy
│   │   ├── hook-state.json               # Session state
│   │   └── delegations.json              # Delegation chains
│   └── idumb-modules/                    # Templates & schemas
│       ├── agents/                       # Agent profile references
│       ├── schemas/                      # Contracts
│       ├── commands/                     # Command templates
│       ├── workflows/                    # Workflow templates
│       └── skills/                       # Governance protocols
└── opencode.json                         # Plugin auto-configured
```

### 4. Start OpenCode

```bash
opencode
```

Press **Tab** → pick `idumb-meta-builder` → the Meta Builder runs 3 phases:

1. **Phase 1 — Greeting** (read-only): Scans your project, detects everything, asks permission
2. **Phase 2 — Deep Scan**: Maps architecture, deps, patterns → project intelligence report
3. **Phase 3 — Setup**: Creates project-specific agent profiles, commands, workflows

### 5. Governance is live

From this moment, the tool gate enforces:

```
Agent: "Let me create that file for you"
→ ❌ GOVERNANCE BLOCK: write denied
→ CURRENT STATE: No active epic or task.
→ USE INSTEAD: Call "idumb_task" with action "create_epic"

Agent: idumb_task create_epic "Feature: user auth"
Agent: idumb_task create_task "Add login page"
Agent: idumb_task start <task_id>
→ ✅ Now writes are allowed.
```

---

## 🏗️ Architecture

### Dual Plugin Design

```
Plugin A (index.ts)          Plugin B (tools-plugin.ts)
├── 6 Hooks                  ├── 0 Hooks
│   ├── tool.execute.before  │   (self-governed)
│   ├── tool.execute.after   │
│   ├── session.compacting   └── 4 Entity-Aware Tools
│   ├── chat.system.transform    ├── idumb_read
│   ├── chat.messages.transform  ├── idumb_write
│   └── chat.params              ├── idumb_bash
│                                └── idumb_webfetch
└── 5 Intelligence Tools
    ├── idumb_task
    ├── idumb_anchor
    ├── idumb_init
    ├── idumb_scan
    └── idumb_codemap
```

### Source Structure

```
src/
├── index.ts                    # Plugin A — 6 hooks + 5 tools
├── tools-plugin.ts             # Plugin B — 4 entity-aware tools
├── cli.ts                      # CLI entry (idumb-v2 init)
├── cli/deploy.ts               # Agent + command deployment
├── templates.ts                # All 7 agent templates
├── hooks/
│   ├── tool-gate.ts            # Block write/edit + agent scoping
│   ├── compaction.ts           # Anchor injection post-compaction
│   ├── message-transform.ts    # Stale output pruning (DCP)
│   └── system.ts               # Governance system prompt
├── tools/
│   ├── task.ts                 # Task hierarchy (epic → task)
│   ├── anchor.ts               # Context anchors
│   ├── init.ts                 # Project initialization
│   ├── scan.ts                 # Brownfield scanner
│   ├── codemap.ts              # Code intelligence mapping
│   ├── read.ts                 # Entity-aware read
│   ├── write.ts                # Entity-aware write
│   ├── bash.ts                 # Entity-aware bash
│   └── webfetch.ts             # Entity-aware webfetch
├── schemas/
│   ├── task.ts                 # TaskStore v2 (WorkStream categories)
│   ├── anchor.ts               # Anchor scoring & staleness
│   ├── config.ts               # IdumbConfig schema
│   └── delegation.ts           # Delegation chain schema
└── lib/
    ├── logging.ts              # TUI-safe file logger (zero console.log)
    ├── persistence.ts          # StateManager — debounced disk I/O
    ├── framework-detector.ts   # Read-only project scanner
    └── scaffolder.ts           # .idumb/ directory creator
```

### Plugin Hooks

| Hook | Purpose |
|------|---------|
| `tool.execute.before` | Blocks write/edit without task + agent-scoped tool gating |
| `tool.execute.after` | Defense-in-depth fallback |
| `experimental.session.compacting` | Injects anchors + active task post-compaction |
| `experimental.chat.system.transform` | Governance directive in system prompt |
| `experimental.chat.messages.transform` | Prunes stale tool outputs (DCP pattern) |
| `chat.params` | Captures agent identity for auto-assignment |

### Agent Hierarchy

```
                    👑 Meta Builder
                         │
                    🎯 Supreme Coordinator
                    ╱    │    ╲
              🔨 Builder 📋 Planner ⚡ Skills Creator
                   │        │
              ✅ Validator 🔬 Researcher
```

Each agent has **scoped permissions**:
- **Meta Builder**: Full access — creates epics, delegates everything
- **Supreme Coordinator**: No init, no direct writes — coordinates only
- **Builder**: Writes code, delegates to validator — can't create epics
- **Validator**: Read-only — can't write, can't delegate (leaf node)
- **Planner**: Research + planning — delegates to researcher
- **Research Synthesizer**: Web research — leaf node, no bash
- **Skills Creator**: Creates skills/commands — leaf node

---

## ⚙️ Configuration

### Governance Modes

| Mode | Behavior |
|------|----------|
| **Balanced** | Agents get recommendations before stopping. Full task completion, governed at decision boundaries. |
| **Strict** | Validate at every node. Must pass gate before proceeding. |
| **Autonomous** | AI decides freely. Still logs everything. Maximum freedom. |

### `idumb_init` Parameters

| Parameter | Options | Default |
|-----------|---------|---------|
| `action` | `install`, `scan`, `status` | `install` |
| `language` | `en`, `vi` | `en` |
| `experience` | `beginner`, `guided`, `expert` | `guided` |
| `governance_mode` | `balanced`, `strict`, `autonomous` | `balanced` |
| `force` | `true`, `false` | `false` |

---

## 🧪 Tests

```bash
npm test    # 242/242 assertions — all green
```

| Suite | Tests | Coverage |
|-------|-------|----------|
| `tool-gate.test.ts` | 16/16 | Block, allow, retry, fallback, agent scoping |
| `compaction.test.ts` | 16/16 | Injection, budget caps, staleness, critical anchors |
| `message-transform.test.ts` | 13/13 | Pruning, exempt tools, edge cases |
| `init.test.ts` | 60/60 | Config, detection, scaffold, bilingual reports |
| `persistence.test.ts` | 45/45 | Round-trip, debounce, degradation |
| `task.test.ts` | 54/54 | Epic/task CRUD, WorkStream v2, migration |
| `delegation.test.ts` | 38/38 | Delegation chains, expiry, hierarchy |

---

## 📐 Design Principles

| Principle | What it means |
|-----------|---------------|
| **No hallucination** | Code matches docs. Untested = unclaimed. |
| **TUI safety** | Zero `console.log`. File-based logging only. Never break the host. |
| **Graceful degradation** | Every hook wrapped in try/catch. Disk fails? In-memory continues. |
| **Schema-first** | Plain TypeScript interfaces. No runtime validation overhead. |
| **Hook factory pattern** | Every hook = function returning async handler with captured state. |
| **Deterministic governance** | No LLM reasoning in enforcement. Rules are rules. |

---

## ⚠️ Known Limitations

- **Subagent hook gap** — `tool.execute.before` does not fire for subagent tool calls in OpenCode
- **Experimental hooks** — `system.transform` and `messages.transform` are not in official docs yet
- **Not on npm** — Requires `npm link` for now (publish coming soon™)

---

## 🤝 Contributing

```bash
npm run typecheck    # tsc --noEmit — zero errors
npm test             # 242/242 — all must pass
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
| 🤖 **7 Agent Chuyên Biệt** | Meta Builder → Supreme Coordinator → Builder, Validator, Planner, Researcher, Skills Creator |
| 🔍 **Quét Brownfield** | Tự nhận diện framework, tech stack, lỗ hổng — trước khi đụng vô bất cứ thứ gì |
| 🧲 **Sống Sót Compaction** | Context quan trọng không bị mất khi LLM reset cửa sổ |
| ✂️ **Dọn Dẹp Context** | Output cũ tự động bị cắt gọn. Context luôn tươi mới. |
| 💾 **Lưu Trữ** | Task, anchor, delegation sống qua các session |
| 🌏 **Song Ngữ** | Hỗ trợ đầy đủ Tiếng Việt + English |
| 🎯 **Phân Quyền Agent** | Mỗi agent có quyền riêng — validator không được viết, builder không được tạo epic |

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
project-của-bạn/
├── .opencode/
│   ├── agents/                           # 7 agent AI
│   │   ├── idumb-meta-builder.md         # 👑 Tổng chỉ huy
│   │   ├── idumb-supreme-coordinator.md  # 🎯 Điều phối cấp cao
│   │   ├── idumb-builder.md              # 🔨 Viết code
│   │   ├── idumb-validator.md            # ✅ Kiểm tra (chỉ đọc)
│   │   ├── idumb-planner.md              # 📋 Lập kế hoạch
│   │   ├── idumb-research-synthesizer.md # 🔬 Nghiên cứu chuyên sâu
│   │   └── idumb-skills-creator.md       # ⚡ Tạo skill & lệnh
│   └── commands/                         # 4 lệnh
├── .idumb/                               # Dữ liệu quản trị
│   ├── config.json                       # Cài đặt của bạn
│   ├── brain/                            # Trạng thái bền vững
│   └── idumb-modules/                    # Template & schema
└── opencode.json                         # Plugin tự cấu hình
```

### 4. Chạy OpenCode

```bash
opencode
```

Nhấn **Tab** → chọn `idumb-meta-builder` → Meta Builder chạy 3 giai đoạn:

1. **Giai đoạn 1 — Chào hỏi** (chỉ đọc): Quét project, nhận diện mọi thứ, xin phép
2. **Giai đoạn 2 — Quét sâu**: Map kiến trúc, dependency, pattern → báo cáo
3. **Giai đoạn 3 — Thiết lập**: Tạo agent profile, command, workflow riêng cho project

### 5. Quản trị hoạt động!

```
Agent: "Để tôi tạo file đó cho bạn"
→ ❌ CHẶN: write bị từ chối
→ TRẠNG THÁI: Chưa có epic hoặc task nào
→ THAY VÀO ĐÓ: Gọi "idumb_task" với action "create_epic"
```

---

## 🎯 Hệ Thống Agent

```
                    👑 Meta Builder
                    "Tao quản hết"
                         │
                    🎯 Supreme Coordinator
                    "Tao phân công"
                    ╱    │    ╲
          🔨 Builder 📋 Planner ⚡ Skills Creator
          "Tao code"  "Tao plan"  "Tao tạo skill"
               │          │
          ✅ Validator  🔬 Researcher
          "Tao check"   "Tao research"
```

### Phân Quyền

| Agent | Được làm | Không được |
|-------|----------|-----------|
| 👑 Meta Builder | Tạo epic, delegate tất cả | — |
| 🎯 Supreme Coordinator | Phân công, theo dõi | Viết file, tạo epic |
| 🔨 Builder | Viết code, delegate cho validator | Tạo epic |
| ✅ Validator | Đọc, kiểm tra, test | Viết file, delegate |
| 📋 Planner | Lập kế hoạch, delegate cho researcher | Tạo epic |
| 🔬 Researcher | Nghiên cứu web | Chạy bash, delegate |
| ⚡ Skills Creator | Tạo skill, command | Init, delegate |

---

## ⚙️ Chế Độ Quản Trị

| Chế độ | Mô tả |
|--------|-------|
| **Cân bằng** | Agent được gợi ý trước khi dừng. Hoàn thành toàn bộ, quản trị tại ranh giới quyết định. |
| **Nghiêm ngặt** | Kiểm tra tại mọi nút. Phải vượt qua cổng mới được tiếp tục. |
| **Tự chủ** | Agent tự quyết. Tự do tối đa. Nhưng vẫn ghi log hết. |

---

## 🧪 Tests

```bash
npm test    # 242/242 assertions — xanh lè hết 💚
```

---

## 📐 Nguyên Tắc Thiết Kế

| Nguyên tắc | Ý nghĩa |
|------------|---------|
| **Không ảo** | Code khớp docs. Chưa test = chưa claim. |
| **An toàn TUI** | Không có `console.log`. Chỉ log ra file. Không bao giờ crash host. |
| **Suy giảm duyên dáng** | Mọi hook đều try/catch. Disk hỏng? In-memory vẫn chạy. |
| **Deterministic** | Không dùng LLM để enforce. Luật là luật. |

---

## ⚠️ Hạn Chế

- **Subagent hook gap** — `tool.execute.before` không fire cho subagent trong OpenCode
- **Chưa lên npm** — Cần `npm link` (publish sắp tới™)

---

## 📝 License

[MIT](https://opensource.org/licenses/MIT)

---

<p align="center">
  <strong>iDumb v2</strong> — Vì AI thông minh quá cũng cần ai đó nhắc: <em>"Ê, tạo task trước đi rồi hẵng viết."</em> 🧠
</p>
