# iDumb Plugin Reboot v2 - Merged Plan

## Vision Statement (Preserved)

Provide true "intelligence" to AI agents with:
- **Self-governance**: Agents know when to stop, suggest, and escalate
- **Self-remediation**: Auto-clear poisoning context and bounce back to correction points
- **Context purification**: Always-aware anchor system with weighted priority

**Intelligence = Context Purification at Every Decision Boundary**

---

## Part 1: Concept to Mechanism Mapping (From Micro-Milestone)

| User Concept | OpenCode Mechanism | Hook/API | Trial |
|--------------|-------------------|----------|-------|
| Stop hook manipulation | Tool blocking + throw | `tool.execute.before` | T1 |
| Inner cycle delegation | Task tool interception | `tool.execute.before` on `task` | T2 |
| Compact hook | Session compaction | `experimental.session.compacting` | T3 |
| Last message transform | Post-generation modification | `experimental.text.complete` | T3 |
| Sub-task tracking | Background state registry | `tool.execute.after` + custom state | T4 |
| Message hierarchy | Message array transformation | `experimental.chat.messages.transform` | T5 |
| User prompt transform | Message modification | `experimental.chat.messages.transform` | T6 |
| Force delegation | Permission enforcement | `permission.ask` + `tool.execute.before` | T7 |
| 3-level TODO | Custom tool + LSP metadata | Custom `idumb:todo` tool | T7 |
| Auto-run tools | Event-triggered execution | `event` hook | T8 |
| Time-to-stale | Timestamp validation | `tool.execute.after` | All |
| Chain-breaking | Zod schema guards | `tool.execute.before` | All |

---

## Part 2: Micro-Trial Sequence (Ordered by Frequency Risk)

### TRIAL-1: Stop Hook Tool Manipulation (HIGHEST FREQUENCY)

**Mechanism**: `tool.execute.before` + throw Error

**Files to Create**:
- `src/hooks/tool-gate.ts` - Tool interception logic
- `src/schemas/permission.ts` - Permission Zod schemas

**Implementation**:
```typescript
"tool.execute.before": async (input, output) => {
  if (tool === 'edit' && !isAgentAllowed(sessionID, 'edit')) {
    throw new Error("GOVERNANCE: edit not permitted for this agent")
  }
}
```

**PASS Criteria**:
- [ ] P1.1: Throwing error blocks tool execution
- [ ] P1.2: Error message visible in TUI (not background text)
- [ ] P1.3: Arg modification persists to actual execution
- [ ] P1.4: Other hooks continue running (no short-circuit)

**PIVOT Strategy**:
```
IF P1.1 fails: PIVOT to tool.execute.after output replacement
IF P1.2 fails: PIVOT to custom wrapper tool with pre-validation
IF P1.3 fails: PIVOT to idumb:validate tool requirement
```

---

### TRIAL-2: Inner Cycle Delegation Manipulation (HIGH FREQUENCY)

**Mechanism**: `tool.execute.before` on `task` tool + session tracking

**Files to Create**:
- `src/hooks/delegation-tracker.ts` - Delegation depth + cycle detection
- `src/lib/delegation-stack.ts` - Stack management

**PASS Criteria**:
- [ ] P2.1: Task tool interception works
- [ ] P2.2: Delegation depth tracked across nested calls
- [ ] P2.3: Circular delegation detected and blocked
- [ ] P2.4: Delegation target modification accepted

**PIVOT Strategy**:
```
IF P2.1 fails: PIVOT to event-based tracking (session.created)
IF P2.2 fails: PIVOT to persistent storage (.idumb/sessions/{id}.json)
IF P2.3 fails: PIVOT to session metadata storage
IF P2.4 fails: PIVOT to guidance injection in tool output
```

---

### TRIAL-3: Compact Hook + Last Message Transform (HIGH FREQUENCY)

**Mechanism**: `experimental.session.compacting` + `experimental.text.complete`

**Files to Create**:
- `src/hooks/compaction.ts` - Anchor preservation
- `src/hooks/text-complete.ts` - Output normalization
- `src/lib/anchor-selector.ts` - Priority-weighted anchor selection

**PASS Criteria**:
- [ ] P3.1: Context injection appears in compacted summary
- [ ] P3.2: Custom prompt replacement works
- [ ] P3.3: Text completion modification visible
- [ ] P3.4: Modification doesn't break TUI rendering

**PIVOT Strategy**:
```
IF P3.1 fails: PIVOT to explicit anchor format (<PRESERVE>...</PRESERVE>)
IF P3.2 fails: PIVOT to context-only approach
IF P3.3 fails: PIVOT to message.transform hook
IF P3.4 fails: PIVOT to append-only (never replace)
```

---

### TRIAL-4: Sub-task Background Tracking (MEDIUM FREQUENCY)

**Mechanism**: `tool.execute.after` + custom state + `event` hooks

**Files to Create**:
- `src/lib/task-registry.ts` - Parallel task tracking
- `src/hooks/task-completion.ts` - Completion detection

**PASS Criteria**:
- [ ] P4.1: Task spawn captured in registry
- [ ] P4.2: Parent-child session linking works
- [ ] P4.3: Completion detection via session.idle
- [ ] P4.4: Results aggregation possible

**PIVOT Strategy**:
```
IF P4.1 fails: PIVOT to tool.execute.before intent capture
IF P4.2 fails: PIVOT to naming convention ({parent}-{child})
IF P4.3 fails: PIVOT to polling mechanism
IF P4.4 fails: PIVOT to file-based aggregation
```

---

### TRIAL-5: Compact Message Hierarchy (UNKNOWN BEHAVIOR)

**Mechanism**: `experimental.chat.messages.transform`

**Purpose**: Test where LLM pays attention (start vs end vs middle)

**PASS Criteria**:
- [ ] P5.1: START injection influences LLM response
- [ ] P5.2: END injection influences LLM response
- [ ] P5.3: MIDDLE injection has measurable effect
- [ ] P5.4: Order can be used for priority

**PIVOT Strategy**:
```
IF START doesn't work: PIVOT to system.transform
IF END doesn't work: PIVOT to text.complete
IF position doesn't matter: PIVOT to repetition strategy
IF all fail: PIVOT to tool-based context retrieval
```

---

### TRIAL-6: User Prompt Transform Mid-Session (UNKNOWN)

**PASS Criteria**:
- [ ] P6.1: User message modification accepted
- [ ] P6.2: Modified content visible to LLM
- [ ] P6.3: Modification doesn't duplicate across turns
- [ ] P6.4: Modification survives session reload

**PIVOT Strategy**:
```
IF P6.1 fails: PIVOT to assistant message injection
IF P6.2 fails: PIVOT to system prompt
IF P6.3 fails: PIVOT to idempotency markers
IF P6.4 fails: PIVOT to per-turn re-injection
```

---

### TRIAL-7: Force Delegation + 3-Level TODO (CONFIDENT)

**Mechanism**: Custom tools + enforcement hooks

**Files to Create**:
- `src/tools/todo.ts` - Hierarchical TODO tool
- `src/schemas/todo.ts` - L1-epic/L2-task/L3-subtask schema

**PASS Criteria**:
- [ ] P7.1: Custom tool registered and callable
- [ ] P7.2: Hierarchical structure persisted
- [ ] P7.3: LSP metadata format accepted
- [ ] P7.4: Enforcement blocks delegation without TODO

---

### TRIAL-8: Auto-run + Export + State Management (SAFE)

**Mechanism**: `event` hooks + custom tools + file persistence

**Files to Create**:
- `src/lib/auto-validation.ts` - Triggered validation
- `src/lib/session-export.ts` - Structured export
- `src/schemas/export.ts` - Export Zod schema

**PASS Criteria**:
- [ ] P8.1: Auto-validation runs on session.created
- [ ] P8.2: Auto-export runs on session.idle
- [ ] P8.3: Exported data passes schema validation
- [ ] P8.4: Staleness detection prevents hallucination

---

## Part 3: Foundation Files (Create First)

### Core Schemas (`src/schemas/`)

```
src/schemas/
├── state.ts          # Governance state schema
├── config.ts         # Plugin configuration
├── anchor.ts         # Anchor with priority + staleness
├── signal.ts         # Context signals (contradiction, drift, loop)
├── delegation.ts     # Delegation tracking
├── todo.ts           # 3-level TODO hierarchy
└── export.ts         # Session export format
```

### Plugin Entry (`src/plugin.ts`)

Minimal shell that loads hooks based on trial completion status.

### Persistence Layer (`src/lib/persistence.ts`)

Atomic file writes, staleness calculation, backup on write.

---

## Part 4: Time-to-Stale Implementation

### Schema (All entities have timestamps)
```typescript
const TimestampSchema = z.object({
  createdAt: z.string().datetime(),
  modifiedAt: z.string().datetime(),
  validatedAt: z.string().datetime().optional(),
  stalenessHours: z.number(),
  isStale: z.boolean(), // > 48 hours = stale
})
```

### Enforcement
- Calculate staleness on every read
- Reject stale data in validation tools
- Anchor selection prioritizes fresh data

---

## Part 5: TUI Safety Rules

**NEVER**:
- Use `console.log` (causes background text exposure)
- Block synchronously (causes TUI freeze)
- Throw unhandled errors (causes partial render)

**ALWAYS**:
- Use file-based logging (`src/lib/logging.ts`)
- Wrap hooks in try-catch with graceful degradation
- Test hooks in isolation before combining

---

## Part 6: Execution Order

| Week | Trials | Deliverables |
|------|--------|--------------|
| 1 | T1 + T2 | Stop hook + delegation tracking validated |
| 2 | T3 + T4 | Compaction survival + background tracking |
| 3 | T5 + T6 | Message position experiments documented |
| 4 | T7 + T8 | Custom tools + auto-run validated |
| 5-6 | Stress Tests | STRESS-001 through STRESS-005 executed |
| 7-8 | Engines (if trials pass) | Decision scorer, attention anchor (Phase B) |

---

## Part 7: Stress Tests (After Trials Pass)

### STRESS-001: Feature Request Bombardment
20+ contradictory feature requests, verify anchors survive

### STRESS-002: Massive Code Context Injection
50KB code dumps, verify pruning and recovery

### STRESS-003: Deep Delegation Chain
3-level delegation with compaction, verify persistence

### STRESS-004: Rapid Context Signal Cascade
20+ contradictory messages, verify scoring triggers intervention

### STRESS-005: Focus Directive Through 20+ Compactions
3 attention directives, verify survival across extreme compaction

---

## Part 8: Success Criteria (Final)

- [ ] All 8 trials pass (or have successful PIVOTs)
- [ ] Anchors survive 20+ compaction cycles
- [ ] Zero TUI pollution (no console.log)
- [ ] 100% TypeScript strict mode
- [ ] All 5 stress tests pass
- [ ] Decision scoring triggers correctly (if T5/T6 pass)
- [ ] Time-to-stale enforced on all entities

---

## Part 9: Directory Structure

```
idumb-clean/                 # Fresh worktree (archived current becomes reference)
├── package.json             # @opencode-ai/plugin, zod dependencies
├── tsconfig.json            # Strict TypeScript
├── src/
│   ├── plugin.ts            # Main entry (minimal, loads hooks)
│   ├── hooks/               # Hook implementations (per trial)
│   │   ├── tool-gate.ts     # T1
│   │   ├── delegation-tracker.ts  # T2
│   │   ├── compaction.ts    # T3
│   │   ├── text-complete.ts # T3
│   │   └── task-completion.ts # T4
│   ├── tools/               # Custom tools
│   │   ├── state.ts         # State read/write
│   │   ├── anchor.ts        # Anchor add/list
│   │   ├── todo.ts          # 3-level TODO (T7)
│   │   └── score.ts         # Context scoring
│   ├── lib/                 # Shared utilities
│   │   ├── persistence.ts   # File I/O with staleness
│   │   ├── logging.ts       # TUI-safe logging
│   │   ├── delegation-stack.ts  # T2
│   │   ├── task-registry.ts # T4
│   │   └── anchor-selector.ts # T3
│   └── schemas/             # Zod schemas
│       ├── state.ts
│       ├── anchor.ts
│       ├── signal.ts
│       ├── delegation.ts
│       ├── todo.ts
│       └── export.ts
├── .idumb/                  # Runtime directory
│   ├── state.json           # Governance state
│   ├── anchors/             # Preserved context
│   ├── sessions/            # Session tracking
│   └── signals/             # Context signal history
└── tests/                   # Trial validation scripts
    ├── trial-1.ts
    ├── trial-2.ts
    └── ...
```

---

## Appendix: Pivot Decision Tree

```
Start → T1 (Stop Hook)
         ├─ PASS → T2 (Delegation)
         └─ FAIL → Pivot to tool.execute.after
                   ├─ PASS → T2
                   └─ FAIL → Pivot to wrapper tool → T2

T2 → T3 (Compaction) → T4 (Background) → T5 (Message Order)
         └─ Each has its own pivot chain per micro-milestone doc

T5/T6 failures may require abandoning message injection approach
→ PIVOT to tool-based context retrieval pattern
```

---

## Next Immediate Steps

1. **Create worktree**: `git worktree add ../idumb-clean main --detach`
2. **Initialize package.json**: Minimal with `@opencode-ai/plugin`, `zod`
3. **Create base schemas**: `src/schemas/state.ts`, `src/schemas/anchor.ts`
4. **Implement T1**: Stop hook with PASS criteria validation
5. **Document T1 results**: Pass/fail/pivot taken