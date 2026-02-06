# Research Validation Results

**Validated:** 2026-02-06
**Validators:** 3 parallel agents + official docs fetch
**Status:** VALIDATED WITH CAVEATS

---

## 1. OpenCode Plugin Documentation Validation

### ACCURATE Claims (11/11)

| Claim | Evidence |
|-------|----------|
| `tool.execute.before` can block tool execution by throwing an error | Official docs `.env protection` example shows exact pattern |
| `tool.execute.after` fires after tool execution | Listed under "Tool Events" in official docs |
| `experimental.session.compacting` allows context injection | Official docs "Compaction hooks" section shows `output.context.push()` |
| Plugin can register custom tools with Zod schemas | Official docs "Custom tools" example uses `tool.schema.string()` |
| `tui.toast.show` for notifications | Listed under "TUI Events" in docs |
| `client.app.log()` for logging | Official docs "Logging" section shows exact pattern |
| Hooks fire for all plugins in sequence | Official docs "Load order" section states this |
| Compaction hook can replace entire prompt via `output.prompt` | Explicitly documented in compaction example |
| Plugin context includes `project`, `client`, `$`, `directory`, `worktree` | Exact signature in docs |
| Custom tools use `tool()` helper from `@opencode-ai/plugin` | Exact import shown in docs |
| Tool execute hooks receive `input.tool`, `input.sessionID` | Pattern shown in examples |

### OUTDATED Claims (0)

None identified - research is current (2026-02-06).

### UNVERIFIABLE Claims (9) - NEED LIVE TESTING

| Claim | Concern | Action |
|-------|---------|--------|
| `tool.execute.before` does NOT fire for subagent tool calls (#5894) | Sourced from GitHub issue, not official docs | **LIVE TEST REQUIRED** |
| SDK message format uses `{info: {...}, parts: [...]}` | SDK docs confirm for API, not for hook output | **LIVE TEST REQUIRED** |
| `chat.message` hook rendering buggy (#885) | Sourced from GitHub issue | **LIVE TEST REQUIRED** |
| Splicing messages may break tracking | Inferred from DCP behavior | **LIVE TEST REQUIRED** |
| `experimental.chat.system.transform` exists | **NOT IN OFFICIAL DOCS** | **CRITICAL - VERIFY** |
| `experimental.chat.messages.transform` exists | **NOT IN OFFICIAL DOCS** | **CRITICAL - VERIFY** |
| `chat.message` can block via throw | Not explicitly shown | **LIVE TEST REQUIRED** |
| Agent permissions override plugin blocks | Not documented | **LIVE TEST REQUIRED** |
| Hook overhead <50ms requirement | Not documented | **BENCHMARK REQUIRED** |

### NEW Capabilities Discovered (9)

| Capability | Relevance to iDumb |
|------------|-------------------|
| `shell.env` hook | Inject environment variables into shell execution |
| `permission.asked` / `permission.replied` events | Track permission flow |
| `file.edited` / `file.watcher.updated` events | Track file changes |
| `todo.updated` event | Track TODO changes |
| `lsp.client.diagnostics` event | Access LSP diagnostics |
| `session.diff` event | Track session diffs |
| SDK `session.children()` API | List child sessions for subagent tracking |
| SDK `session.abort()` API | Abort sessions for governance enforcement |
| SDK `find.symbols()` API | Find workspace symbols for scanning |

---

## 2. Codebase Audit Validation

| Claim | Status | Actual |
|-------|--------|--------|
| File count: 30 files | **INCORRECT** | 32 .ts files |
| plugin.ts: 224 LOC | **CORRECT** | 225 lines |
| Schema files: 8 files, 1,810 LOC | **CORRECT** | Exact match |
| CLI: 307 LOC | **INCORRECT** | 437 LOC |
| T5/T6 wrong message format | **OUTDATED** | Code now handles BOTH formats |
| T2 delegation tracking not implemented | **CORRECT** | `delegationChain` never populated |
| CLI never tested | **CORRECT** | No CLI tests found |
| `.idumb/` anti-pattern | **CORRECT** | 89 matches in src/ |

**Overall Accuracy:** 70%

**Key Update:** The message-transform.ts code was updated after the audit. It now defensively handles BOTH SDK format (`{info, parts}`) and Anthropic format (`{role, content}`). The RESET-SYNTHESIS.md claim is outdated.

---

## 3. Internal Consistency Audit

### CRITICAL Issues (5)

1. **Phase/Trial terminology inconsistent** - Different docs use "phase" and "trial" interchangeably
2. **Missing stress test for tool interception** - Primary mechanism untested
3. **Missing pitfalls for 4 principles** - P3 (Baseline), P4 (Infrastructure), P7 (Fail Open), P9 (Isolation)
4. **ARCHITECTURE.md missing delegation component** - Feature and stress test exist without architecture
5. **Roadmap phase count ambiguous** - Baseline unnumbered, P1-P4 numbered = confusion

### HIGH Issues (6)

1. Missing stress test: Time-to-stale enforcement
2. Missing stress test: Context hygiene/pruning effectiveness
3. Ecosystem learning not surfaced as pitfall: Generic summarization
4. STACK.md missing injection composer
5. COMPARISON.md leverage points not in ARCHITECTURE.md
6. Test 2 missing false positive metrics

### LOW Issues (6)

1. Redundant hook descriptions (5 locations)
2. Redundant "One Mechanism per Trial" (3 locations)
3. PITFALLS.md should cite ecosystem sources
4. ECOSYSTEM-PLUGINS.md should reference PITFALLS.md
5. Permission UX mismatch details split across docs
6. STRESS-TESTS.md should map to features

---

## 4. Validation Summary

| Category | Result |
|----------|--------|
| OpenCode docs accuracy | HIGH (11/11 verified, 9 need live test) |
| Codebase audit accuracy | MEDIUM (70%, 1 major outdated claim) |
| Internal consistency | MEDIUM (5 critical, 6 high issues) |

### CRITICAL FINDING: Experimental Hooks Not in Official Docs

The research relies heavily on these hooks:
- `experimental.chat.system.transform`
- `experimental.chat.messages.transform`

**These are NOT listed in official docs.** Only `experimental.session.compacting` is documented.

**Recommendation:** Before proceeding with T5/T6 implementation, run a minimal live test to confirm these hooks exist and fire as expected.

### Overall Assessment

**TRUSTWORTHY WITH CAVEATS**

The research is well-sourced and current. The main risks are:
1. Experimental message hooks may not exist
2. Internal consistency needs cleanup before roadmap
3. Some stress tests are missing for table-stakes features

### Recommended Actions Before Roadmap

| Priority | Action | Effort |
|----------|--------|--------|
| **IMMEDIATE** | Confirm experimental hooks exist via live test | 30 min |
| **HIGH** | Fix phase/trial terminology in all docs | 30 min |
| **HIGH** | Add 4 missing pitfalls | 1 hr |
| **HIGH** | Add tool interception stress test | 1 hr |
| **MEDIUM** | Update RESET-SYNTHESIS.md T5/T6 claim | 10 min |
| **MEDIUM** | Add delegation to ARCHITECTURE.md | 15 min |

---

*Validation completed: 2026-02-06*
*Ready for synthesis: YES (with above caveats)*
