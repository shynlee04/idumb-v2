---
phase: 07-chat-terminal
plan: 01
subsystem: ui
tags: [react-markdown, highlight.js, code-blocks, chat, sdk-parts, tailwind]

# Dependency graph
requires:
  - phase: 11-sdk-type-realignment
    provides: SDK type re-exports (Part, ToolPart, ReasoningPart, FilePart) via engine-types.ts
  - phase: 05-framework-foundation
    provides: ChatMessage.tsx with basic Part rendering, react-markdown, app.css
provides:
  - CodeBlock component with syntax highlighting, line numbers, copy button, language badge
  - ToolCallAccordion with collapsed/expanded state and status indicators
  - ReasoningCollapse with native details element and duration display
  - FilePartRenderer with image preview and download card
  - Rewritten ChatMessage.tsx with balanced density (small role indicators)
affects: [07-02 (StepCluster), 07-03 (settings/theme), 08 (sessions/diffs)]

# Tech tracking
tech-stack:
  added: [highlight.js (direct import for code highlighting)]
  patterns: [CodeBlock handles highlighting internally instead of rehype-highlight upstream, splitHighlightedHtml for cross-line tag preservation]

key-files:
  created:
    - app/components/chat/parts/CodeBlock.tsx
    - app/components/chat/parts/ToolCallAccordion.tsx
    - app/components/chat/parts/ReasoningCollapse.tsx
    - app/components/chat/parts/FilePartRenderer.tsx
  modified:
    - app/components/chat/ChatMessage.tsx
    - app/styles/app.css

key-decisions:
  - "CodeBlock uses highlight.js directly instead of rehype-highlight — prevents line-number/highlighting conflict"
  - "Import paths use @/ alias instead of relative ../../ — parts/ is 3 levels deep from shared/"
  - "Small role indicators (dot + text) replace circular avatar badges for balanced density"
  - "highlight.js github-dark theme CSS imported in app.css for hljs class styles"

patterns-established:
  - "Part renderers in app/components/chat/parts/ — one component per SDK Part type"
  - "CodeBlock as react-markdown components.code — all markdown rendering uses shared config"
  - "splitHighlightedHtml helper for cross-line tag preservation in code blocks"

# Metrics
duration: 12min
completed: 2026-02-12
---

# Phase 7 Plan 01: Rich Chat Part Renderers Summary

**Syntax-highlighted code blocks with copy/line-numbers/language-badge, tool call accordions, collapsible reasoning, and file/image previews — all wired into ChatMessage.tsx with balanced density**

## Performance

- **Duration:** 12 min
- **Started:** 2026-02-11T20:54:34Z
- **Completed:** 2026-02-11T21:06:23Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Created 4 production-quality Part renderer components for SDK Part discriminated union
- Rewrote ChatMessage.tsx with balanced density (small role indicators, tighter padding)
- CodeBlock handles syntax highlighting internally with highlight.js for proper line-number support
- All Part types correctly routed: text/tool/reasoning/file rendered, meta parts (step/snapshot/patch/agent/retry/compaction/subtask) skipped

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Part renderer components** - `6547a2d` (feat)
2. **Task 2: Rewrite ChatMessage.tsx and add highlight.js CSS** - `49e0f25` (feat)

## Files Created/Modified
- `app/components/chat/parts/CodeBlock.tsx` - Custom code component with hljs highlighting, line numbers, copy button, language badge (234 LOC)
- `app/components/chat/parts/ToolCallAccordion.tsx` - Collapsed accordion for ToolPart with status dot, duration, expandable input/output (127 LOC)
- `app/components/chat/parts/ReasoningCollapse.tsx` - Native details element, collapsed by default, duration from ReasoningPart.time (39 LOC)
- `app/components/chat/parts/FilePartRenderer.tsx` - Image preview for image/* mime, download card with icon for other files (60 LOC)
- `app/components/chat/ChatMessage.tsx` - Rewritten with new Part renderers, small role indicators, shared markdownComponents config (156 LOC)
- `app/styles/app.css` - Added highlight.js github-dark theme CSS import

## Decisions Made
- **CodeBlock highlights internally**: rehype-highlight processes the AST before the code component receives children, turning text into React elements. Splitting React elements by newline for line numbers strips all highlighting. Solution: CodeBlock uses highlight.js directly, receives plain text, highlights, splits HTML by newlines with tag preservation.
- **@/ alias imports**: Parts directory is at `app/components/chat/parts/` (3 levels deep from `app/shared/`). Using `@/shared/engine-types` is cleaner than `../../../shared/engine-types`.
- **Small role indicators**: Replaced circular avatar badges (7x7 rounded-full with Bot/User icons) with minimal dot (1.5x1.5) + text ("You"/"AI") for balanced density per user's locked CHAT-01 decision.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed CodeBlock syntax highlighting + line numbers conflict**
- **Found during:** Task 1 (CodeBlock verification)
- **Issue:** Original CodeBlock used `extractText()` to get plain text from children for line splitting, but rehype-highlight upstream converts children to React elements with hljs spans. `extractText()` strips all spans, losing all syntax highlighting. The `dangerouslySetInnerHTML` then renders plain text without any highlighting.
- **Fix:** CodeBlock now imports highlight.js directly, receives plain text children (no rehype-highlight in react-markdown plugins), highlights with hljs.highlight(), and splits the highlighted HTML by newlines using `splitHighlightedHtml()` which properly closes and re-opens tags across line boundaries.
- **Files modified:** `app/components/chat/parts/CodeBlock.tsx`
- **Verification:** Typecheck passes, build succeeds. Code blocks render with both syntax highlighting AND line numbers.
- **Committed in:** `6547a2d` (Task 1 commit)

**2. [Rule 3 - Blocking] Fixed import paths for parts directory depth**
- **Found during:** Task 1 (typecheck verification)
- **Issue:** Part renderer files used `../../shared/engine-types` import path, but `app/components/chat/parts/` is 3 levels deep from `app/shared/`, not 2.
- **Fix:** Changed all imports to use `@/shared/engine-types` path alias (maps to `./app/*`).
- **Files modified:** `ToolCallAccordion.tsx`, `ReasoningCollapse.tsx`, `FilePartRenderer.tsx`
- **Verification:** `npm run typecheck:app` passes with zero errors (excluding pre-existing useTheme.ts issue).
- **Committed in:** `6547a2d` (Task 1 commit)

**3. [Rule 3 - Blocking] Installed missing highlight.js package**
- **Found during:** Task 1 (dependency check)
- **Issue:** highlight.js was a transitive dependency of rehype-highlight but not directly installed. node_modules/highlight.js/styles/ was empty.
- **Fix:** Ran `npm install highlight.js` to install it directly.
- **Files modified:** package.json (already had entry), node_modules resolved
- **Verification:** `highlight.js/styles/github-dark.css` exists and importable.
- **Committed in:** N/A (node_modules not tracked)

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** All auto-fixes necessary for correctness and compilation. No scope creep. The rehype-highlight decision is a better architecture — CodeBlock owns its highlighting pipeline end-to-end.

## Issues Encountered
- Pre-existing typecheck errors in `app/hooks/useTheme.ts` (React 19 `<Context value={}>` syntax not recognized by TypeScript). Not related to this plan — did not fix.
- Task 2 commit included 3 previously-staged files (`IDEShell.tsx`, `TerminalPanel.tsx`, `terminal.tsx`) from earlier work. These are part of phase 7 work and do not conflict.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Rich Part renderers are ready for use by Plan 02 (StepCluster) and Plan 03 (Settings/Theme)
- CodeBlock pattern established — future markdown rendering should use the shared `markdownComponents` config
- Pre-existing useTheme.ts typecheck error needs resolution (likely in Plan 03 or separate fix)

---
*Phase: 07-chat-terminal*
*Completed: 2026-02-12*

## Self-Check: PASSED

All files verified present. All commit hashes verified in git log. SUMMARY.md exists.
