# Skill: Story Development Cycle v2.0 (OpenCode Integration)

> **Master Source**: `_bmad/bmb/workflows/story-cycle/` | **Version**: 2.0.0 | **Cross-Platform**: Claude Code + Open Code

---

## Description

Complete modular story development cycle with validation loops, pre-planning gates, research protocols, and cross-platform support. Replaces monolithic workflows with 9-step modular architecture.

---

## Workflow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  STORY DEVELOPMENT CYCLE v2.0 — Modular Architecture                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │ 01-create-  │ →  │ 02-validate-│ →  │ 03-create-  │ →  │ 04-validate-│  │
│  │   story     │    │   story     │    │   context   │    │   context   │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│        ↓ fail              ↺ loop             ↓                 ↺ loop     │
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │ 05-pre-     │ →  │ 06-dev-     │ →  │ 07-code-    │ →  │ 08-story-   │  │
│  │   planning  │    │   story     │    │   review    │    │   done      │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│        ↓ fail              ↺ loop             ↺ loop             ↓         │
│                                                                             │
│  ┌─────────────┐                                                            │
│  │ 09-retro-   │  ← [if last story of epic]                                │
│  │   spective  │                                                            │
│  └─────────────┘                                                            │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ CROSS-CUTTING: correct-course, audit-checkpoint, stale-check        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Triggers

```
story-cycle
story cycle
develop story
story dev cycle
/start story
/new story
```

---

## Usage

### Start New Story
```bash
story-cycle
```

Prompts for:
- Epic number
- Story number (optional, or finds next)
- Mode (create/continue)

### Continue Existing Story
```bash
story-cycle continue {story_key}
```

Resumes from current story state.

### Jump to Specific Step
```bash
story-cycle step={step_number} story={story_key}
```

Example: `story-cycle step=5 story=3-1-implement-feature`

---

## Master Workflow Reference

**Main Documentation**: `_bmad/bmb/workflows/story-cycle/README.md`

**Step Files** (linked from `steps/`):

| Step | File | description | Agent |
|------|------|---------|-------|
| 01 | `01-create-story.md` | Create story from epic | SM |
| 02 | `02-validate-story.md` | Validate story 100% | SM |
| 03 | `03-create-context.md` | Build context XML | SM |
| 04 | `04-validate-context.md` | Validate + stale check | SM |
| 05 | `05-pre-planning.md` | Research gate (NEW) | Dev |
| 06 | `06-dev-story.md` | TDD implementation | Dev |
| 07 | `07-code-review.md` | Multi-agent review | Dev/Reviewer |
| 08 | `08-story-done.md` | Complete story | SM |
| 09 | `09-retrospective.md` | Epic retrospective | SM |

---

## Sub-Skills (Individual Steps)

Each step can be invoked independently:

| Command | Description | Loads |
|---------|-------------|-------|
| `create-story` | Create a new story from epic | `steps/01-create-story.md` |
| `validate-story` | Validate story file | `steps/02-validate-story.md` |
| `create-context` | Build context XML | `steps/03-create-context.md` |
| `validate-context` | Validate context + stale check | `steps/04-validate-context.md` |
| `pre-planning` | Research and planning gate | `steps/05-pre-planning.md` |
| `dev-story` | Implement with TDD | `steps/06-dev-story.md` |
| `code-review` | Review implementation | `steps/07-code-review.md` |
| `story-done` | Mark story complete | `steps/08-story-done.md` |
| `retrospective` | Epic retrospective | `steps/09-retrospective.md` |

---

## Utility Commands

| Command | Description | Loads |
|---------|-------------|-------|
| `stale-check` | File freshness validation | `utils/_stale-check.md` |
| `correct-course` | Recovery handler | `utils/_correct-course.md` |
| `audit` | Quality audit | `utils/_audit-checkpoint.md` |

---

## Configuration

Expects these files to exist:

```yaml
# _bmad/bmb/config.yaml
user_name: {name}
communication_language: {language}
output_folder: "_bmad-output"

# _bmad-output/sprint-artifacts/sprint-status.yaml
# _bmad-output/epics.md
# _bmad-output/project-planning-artifacts/architecture.md
```

---

## Output Artifacts

```
_bmad-output/sprint-artifacts/
├── {epic}-{story}-{slug}.md           # Story file
├── {epic}-{story}-{slug}-context.xml   # Context XML
├── {epic}-{story}-{slug}-handoff.md    # Handoff artifact
├── sprint-status.yaml                  # Updated each step
└── epic-{N}-retrospective.md           # Epic completion (if applicable)
```

---

## Governance Rules

### Mandatory Research (Before Implementation)

Every story **MUST** include research using MCP tools:

| Tool | description | Query Pattern |
|------|---------|---------------|
| **Context7** | Official docs | `resolve-library-id` → `get-library-docs` |
| **DeepWiki** | GitHub patterns | `ask_question` with repo-specific query |
| **Tavily/Exa** | Community solutions | Semantic search for patterns |
| **Repomix** | Local analysis | Pack and grep existing code |

### Validation Gates (100% Pass Required)

- [x] Story file exists at correct path
- [x] User story format complete (As a/I want/So that)
- [x] At least 3 acceptance criteria defined
- [x] Context XML passes freshness check
- [x] Pre-planning gate passed
- [x] All tests passing
- [x] Code review approved

---

## Recovery Handlers

### Correct Course Workflow

**Triggered when:**
- Story stuck >2x timebox
- Validation unable to pass
- External blockers identified

**Actions:**
1. Pause current workflow
2. Assess situation
3. Propose options:
   - Split story
   - Defer to next sprint
   - Escalate to architect
4. Document decision
5. Resume or terminate

**Command**: `/correct-course {story_key}`

### Stale Check

**Triggered:**
- At context creation
- Before development
- After significant delays

**Command**: `/stale-check {context_file}`

---

## Examples

### Example 1: Start New Story
```
User: story-cycle

Agent: Welcome to Story Development Cycle v2.0!
      Loading configuration...

      Current Sprint: Sprint 5
      Available Epics:
      - Epic 21: Production Hardening (3 stories remaining)
      - Epic 22: UX Modernization (5 stories remaining)

      Which epic? [21/22]
```

### Example 2: Continue Story
```
User: story-cycle continue 21-2-fix-auth

Agent: Loading story 21-2-fix-auth...
      Current status: ready-for-implementation

      Resuming from Step 05: Pre-Planning
```

### Example 3: Jump to Step
```
User: story-cycle step=6 story=21-2-fix-auth

Agent: Jumping to Step 06: Develop Story
      Proceeding with TDD implementation...
```

---

## Error Handling

| Error | Action |
|-------|--------|
| Config not found | Prompt for user_name, language |
| Sprint status missing | Create new sprint-status.yaml |
| Epic not found | Show available epics from epics.md |
| Story not found | Offer to create new story |
| Validation fails | Loop back with specific fixes |
| Timebox exceeded | Trigger correct-course workflow |

---

## v2.0 Improvements Over v1.0

| Issue | v1.0 | v2.0 Solution |
|-------|------|---------------|
| **Monolithic file** | 552 lines, >15KB | 10 modular files, each <5KB |
| **No pre-planning gate** | Agents implement without context | Step 05: Pre-planning enforcement |
| **Stale context** | No freshness checks | `_stale-check.md` validator |
| **No standards check** | Inconsistent code quality | Constitution check in pre-planning |
| **Superficial validation** | Generic checklists | Project-specific validation |
| **No recovery path** | Stories get stuck | `_correct-course.md` handler |
| **No audit trail** | Context lost between agents | Formal handoff artifacts |
| **Platform-specific** | `.agent/workflows/` only | Cross-platform via BMAD |

---

## Token Optimization

This skill uses **minimal references**. Full workflow definitions are in `_bmad/bmb/workflows/story-cycle/`. This pattern:

- ✅ Ensures consistency (single source)
- ✅ Enables live updates
- ✅ Reduces token count by ~80%

---

## Related Skills

| Skill | description |
|-------|---------|
| `bmm-workflows` | BMM workflow integration |
| `bmad-core-integration` | Agent access and routing |
| `asgl` | Autonomous loop orchestration |
| `architecture-remediation` | God store/component fixes |

---

## Command Aliases

| Alias | Maps To |
|-------|---------|
| `@story-cycle` | Full story development cycle |
| `@create-story` | Create story step |
| `@dev-story` | Development step (TDD) |
| `@code-review` | Code review step |
| `@correct-course` | Correct course utility |
| `@retro` | Retrospective |

---

**Generated**: 2026-01-08 | **Master**: `_bmad/bmb/workflows/story-cycle/`
