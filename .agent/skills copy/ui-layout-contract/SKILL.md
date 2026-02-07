---
name: ui-layout-contract
description: Use when creating or modifying UI layouts, implementing responsive design, adding panels/split-views, styling components, or when agents jam multiple features into cramped interfaces. Covers 8-bit design compliance, transparency violations, rounded corner violations, and mobile UX.
---

# UI Layout Contract

## Overview

**Prevent "jammed UI," z-index conflicts, nested layout bugs, and 8-bit design violations through strict layout architecture rules.**

The core problems agents create:
1. **Layout**: Squeezing too many panels, creating nested splits, z-index wars, prop drilling
2. **8-bit Design**: Transparency/opacity on interactive elements, excessive rounded corners, blur effects
3. **Mobile**: Multi-pane layouts that don't work on small screens

This contract enforces **Flat Hierarchy** + **8-bit Aesthetic** with explicit pane caps, tokenized z-index scales, solid colors, and squared corners.

## When to Use

```
Is this UI/layout/styling work?
├── Yes → Follow this contract
└── No → Not applicable
```

**Symptoms that signal this skill applies:**

**Layout Issues:**
- Interface feels "cramped" or "jammed"
- Multiple panels competing for space
- Z-index values like `z-[100]`, `z-[9999]` appearing
- Layout props (`isOpen`, `width`) drilled through components
- `react-resizable-panels` causing flex height issues
- Mobile layout squeezing 2+ surfaces visible

**8-bit Design Violations:**
- Semi-transparent backgrounds (`/60`, `/80`, `/50` opacity modifiers)
- Rounded corners like `rounded-lg` (6px), `rounded-xl` (12px)
- Blur effects (`backdrop-blur`, `blur-[100px]`)
- Glassmorphism or gradient overlays with transparency
- Dropdowns showing underlying text bleeding through

## The Flat Hierarchy Rule

**HARD LIMIT: Maximum 3 parallel columns on desktop.**

```
CORRECT (3 columns max):
[ Sidebar (Left) ] -- [ Main Surface (Center) ] -- [ Assistant (Right) ]

FORBIDDEN (nested split):
[ Sidebar ] -- [ Main --split--> [Sub1][Sub2] ] -- [ Assistant ]
```

**Sub-features need space? Use Tabs, Drawers, or Modals. Never split the pane further.**

## Breakpoint Layout Contract

| Breakpoint | Width | Max Columns | Layout Pattern |
|------------|-------|-------------|----------------|
| **Mobile** | <640px | 1 column | Bottom Tab Bar switches contexts |
| **Tablet** | 640-1024px | 2 columns | Left sidebar → Icon Rail, Show Main + Assistant |
| **Desktop** | ≥1024px | 3 columns | `20% / Flex-1 / 30%` with min-widths |

**Zero feature loss:** Every desktop feature must map to a mobile affordance (tab/drawer/modal).

## Z-Index Stratification Scale

**Stop using arbitrary values.** Only this scale:

| Token | Value | Use For |
|-------|-------|---------|
| `z-0` | 0 | Base canvas (Editor, text, standard panels) |
| `z-10` | 10 | Sticky headers/footers within panels |
| `z-20` | 20 | Floating Action Buttons, Badges |
| `z-30` | 30 | Drawers, Slide-overs |
| `z-40` | 40 | Global Command Palette, Dialogs |
| `z-50` | 50 | Modals, Toasts, Critical Alerts |

**All overlays** (dropdowns, tooltips, popovers) **MUST render in a single `OverlayRoot` portal** to avoid clipping.

## 8-Bit Design Aesthetic (CRITICAL)

The project uses an 8-bit retro design system. **Violating this breaks the visual identity.**

### 1. SOLID COLORS ONLY (NO TRANSPARENCY)

**FORBIDDEN:** Opacity modifiers on interactive elements

```tsx
// ❌ WRONG - Transparency violations
className="bg-slate-800/60 hover:bg-slate-700/80"
className="bg-slate-900/50"
className="bg-slate-900/95"
className="bg-slate-800/40"

// ✅ CORRECT - Solid colors
className="bg-card hover:bg-secondary"
className="bg-background"
className="bg-[var(--card)]"
className="bg-[var(--secondary)]"
```

**Why:** Semi-transparent backgrounds cause text bleeding, contrast violations, and "horrible" layered UI. User feedback: "Those agent or configuration dropdowns with transparency and layers on top of another text... it is just horrible."

### 2. SQUARED CORNERS (8-BIT STYLE)

**FORBIDDEN:** Large rounded corners

```tsx
// ❌ WRONG - Too round
className="rounded-lg"      // 6px - TOclassName="rounded-xl"      // 12pxO ROUND
 - VERY TOO ROUND
className="rounded-2xl"     // 16px - WHY

// ✅ CORRECT - 8-bit style
className="rounded-none"    // Preferred for cards/panels
className="rounded-[4px]"   // Max allowed (radius-md)
className="rounded-sm"      // 2px (radius-sm)
```

**Design token limits:**
- `--radius: 0rem` - Default: Squared corners
- `--radius-sm: 0.125rem` - 2px
- `--radius-md: 0.25rem` - 4px - **MAX ALLOWED**

### 3. NO BLUR EFFECTS

**FORBIDDEN:** Blur on any element

```tsx
// ❌ WRONG - Blur violations
className="blur-[100px]"
className="backdrop-blur"
className="backdrop-blur-md"

// ✅ CORRECT - 8-bit alternatives
// Option 1: Solid gradient
className="bg-gradient-to-br from-primary/30 to-transparent"

// Option 2: Pixelated glow effect
className="shadow-[0_0_40px_20px_rgba(249,115,22,0.3)]"

// Option 3: Remove entirely
{/* Decorative element removed per 8-bit design */}
```

### 4. PIXEL SHADOWS (NOT SOFT)

```css
/* ✅ CORRECT - Hard drop shadows */
--shadow-pixel: 2px 2px 0px 0px rgba(0, 0, 0, 0.5);
--shadow-pixel-primary: 2px 2px 0px 0px #c2410c;
--shadow-pixel-sm: 1px 1px 0px 0px rgba(0, 0, 0, 0.5);

/* ❌ WRONG - Soft shadows */
box-shadow: 0 4px 12px rgba(0,0,0,0.15);
box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
```

### 5. SNAPPIER TRANSITIONS

```css
/* ✅ CORRECT - Snappy, 8-bit style */
transition: transform 150ms linear;

/* ❌ WRONG - Overly smooth */
transition: all 0.5s ease-in-out;
```

## Design Tokens Reference

### Colors (HSL format)

```css
/* Primary - Orange Accent */
--primary: 24.6 95% 53.1%;              /* #f97316 */
--primary-foreground: 0 0% 100%;        /* White */

/* Background Colors (SOLID, NO TRANSPARENCY) */
--background: 240 6% 4%;                /* #0f0f11 - Deep black */
--foreground: 0 0% 95%;                 /* Near white */

/* Surface Colors (SOLID) */
--card: 240 4% 10%;                     /* #18181b - Panels/cards */
--card-foreground: 0 0% 95%;
--secondary: 240 4% 16%;                /* #27272a */
--secondary-foreground: 0 0% 90%;

/* Borders */
--border: 240 4% 16%;                   /* #27272a */
--input: 240 4% 16%;
--ring: 24.6 95% 53.1%;                 /* Orange focus ring */

/* Semantic Colors */
--success: 142 71% 45%;                  /* #22c55e */
--warning: 38 92% 50%;                   /* #f59e0b */
--info: 217 91% 60%;                     /* #3b82f6 */
--destructive: 0 84% 60%;                /* Red */
```

### Spacing

```css
--spacing-mobile: 0.5rem;     /* 8px */
--spacing-tablet: 0.75rem;    /* 12px */
--spacing-desktop: 1rem;      /* 16px */
```

### Layout Tokens

```css
--panel-editor: 70%;
--panel-terminal: 30%;
--panel-chat: 25%;
--sidebar-activity-bar: 48px;
--sidebar-content-panel: 280px;
--status-bar-height: 24px;
```

### Touch Targets

```css
--touch-target-min: 44px;  /* WCAG 2.5.5 minimum */
--size-sm: 40px;
--size-md: 48px;
```

## State Management: No Prop Drilling

**FORBIDDEN:** Passing layout props down more than 1 level.

```typescript
// ❌ WRONG: Prop drilling
<Layout isChatOpen={true} leftPanelWidth={200}>
  <Pane isOpen={true} width={200}>
    <ChildComponent isOpen={true} />
  </Pane>
</Layout>

// ✅ RIGHT: Global store
const { isChatOpen, leftPanelWidth } = useLayoutStore();
```

**Layout state belongs in a single Zustand store.** Components self-manage via selectors.

## Focus Modes (Alternative to Manual Toggles)

Instead of toggling individual panels, implement **Layout Modes**:

| Mode | Left | Center | Right | Best For |
|------|------|--------|-------|----------|
| **Creator** | Icon Rail | Editor (Wide) | Hidden | Deep coding |
| **Study** | Notes List (250px) | Reading Canvas | Assistant (350px) | Research, RAG review |
| **Zen** | Hidden | Editor (100%) | Hidden | Distraction-free |

## Technical Constraints

| Constraint | Rule | Reference |
|------------|------|-----------|
| **No react-resizable-panels** | Use CSS Flexbox with `min-width`/`max-width` | `CC-RESIZABLE-001` |
| **Touch targets** | Minimum 44x44px on mobile/tablet | WCAG 2.5.5 |
| **No display:none on mobile** | Component should not render at all | Performance |
| **One layout owner** | Only top-level shell decides structure | Architectural |
| **Solid colors only** | NO `/60`, `/80`, `/50` opacity on interactive elements | 8-bit design |
| **Squared corners** | Max `rounded-[4px]`, prefer `rounded-none` | 8-bit design |
| **No blur effects** | NO `backdrop-blur`, `blur-[*]` | 8-bit design |

## Self-Validation Checklist

**Before generating code, verify against this checklist:**

**Layout Checks:**
1. **Nesting Check:** Does the layout create a split-inside-a-split? `[PASS/FAIL]`
2. **Mobile Check:** Is there only ONE primary surface visible on mobile? `[PASS/FAIL]`
3. **Feature Parity:** Is every desktop feature mapped to a mobile affordance? `[PASS/FAIL]`
4. **Z-Index Check:** Are all z-indexes from the allowed scale (0-50)? `[PASS/FAIL]`
5. **Overlay Check:** Are dropdowns/menus portaled to `OverlayRoot`? `[PASS/FAIL]`
6. **State Check:** Is layout state accessed via store (no prop drilling)? `[PASS/FAIL]`

**8-bit Design Checks:**
7. **Transparency Check:** Any `/60`, `/80`, `/50` opacity modifiers on interactive elements? `[PASS/FAIL]`
8. **Corner Check:** Any `rounded-lg` (6px), `rounded-xl` (12px), or larger? `[PASS/FAIL]`
9. **Blur Check:** Any `backdrop-blur` or `blur-[*]` classes? `[PASS/FAIL]`
10. **Shadow Check:** Using pixel shadows (`shadow-pixel`) not soft shadows? `[PASS/FAIL]`

**Accessibility Checks:**
11. **Touch Target Check:** All interactive elements ≥44x44px on mobile? `[PASS/FAIL]`
12. **Font Size Check:** Inputs use 16px+ font to prevent iOS zoom? `[PASS/FAIL]`
13. **Contrast Check:** Color contrast ≥4.5:1? `[PASS/FAIL]`

## Common Mistakes

| Mistake | Why It's Wrong | Fix |
|---------|----------------|-----|
| **Transparency on dropdowns** | Text bleeding through, contrast violations | Use `bg-card` (solid) |
| **`rounded-lg` on cards** | Violates 8-bit aesthetic, looks "modern" not retro | Use `rounded-none` or `rounded-[4px]` |
| **`backdrop-blur` effects** | Violates 8-bit aesthetic, performance cost | Use solid colors or remove |
| **Nested `<ResizablePanelGroup>`** | Creates "tiny/cramped panels," conflicts with flex | Use Tabs, Drawer, or Modal |
| **Arbitrary `z-[999]`** | Causes "z-index wars," unpredictable stacking | Use tokenized scale 0-50 |
| **`display: none` for mobile** | Leaves heavy DOM in memory | Don't render component at all |
| **Prop drilling `isOpen`** | Breaks when tree changes, hard to maintain | Use global store with selectors |
| **Bottom bar without space** | Overlaps content, covers chat input | Reserve layout space or use flex |

## Red Flags - STOP and Reconsider

**Layout:**
- About to add a 4th persistent column on desktop
- Thinking "I'll just add a small split pane here"
- Writing `z-[100]`, `z-[9999]`, or similar
- Passing `isOpen` or `width` props more than 1 level deep
- Using `react-resizable-panels` without explicit height constraints

**8-bit Design:**
- Writing `bg-slate-800/60` or any `/[number]` opacity
- Using `rounded-lg`, `rounded-xl`, or larger radius
- Adding `backdrop-blur` or `blur-[*]` classes
- Using soft shadows like `shadow-lg`, `shadow-xl`
- Creating gradient overlays with transparency

**Mobile:**
- Hiding elements with `display: none` instead of conditional rendering
- Making touch targets smaller than 44px
- A dropdown inside `overflow-hidden` container

**All of these mean: Stop. Re-read this skill. Revise the approach.**

## Deliverables Required

When implementing layout changes:

1. **List all files changed**
2. **Before/after screenshots** at 3 widths: 375px, 768px, 1280px
3. **Feature Parity Matrix** mapping desktop features to mobile/tablet affordances
4. **8-bit Compliance Verification:**
   - Zero transparency violations
   - Zero rounded corner violations
   - Zero blur effects
5. **Validation:** Run `pnpm tsc --noEmit && pnpm lint && pnpm build`

## Rationalization Counter-Arguments

| Excuse | Reality |
|--------|---------|
| "Just one small split pane" | Violates flat hierarchy, creates precedent for more nesting |
| "z-[999] is just temporary" | Temporary becomes permanent. Use the token scale. |
| "Prop drilling is easier here" | Easier now = technical debt later. Store is trivial to add. |
| "display:none is fine for mobile" | Wastes memory, breaks accessibility. Don't render. |
| "Transparency looks better" | User explicitly complained about it. Causes contrast violations. |
| "rounded-lg looks more modern" | Violates 8-bit design system. Brand inconsistency. |
| "blur adds depth" | Violates 8-bit aesthetic. Use pixel shadows instead. |
| "This is different, I need 4 columns" | No you don't. Use Tabs, Drawers, or Focus Modes. |
| "react-resizable-panels works for me" | Documented conflict in `CC-RESIZABLE-001`. Flex is safer. |

**Violating the letter of these rules is violating the spirit of these rules.**

---

**References:**
- `_bmad-output/planning-artifacts/ux-specification.md` - Full design system documentation
- `_bmad-output/planning-artifacts/epic-39-8bit-design-compliance-2026-01-09.md` - 8-bit compliance epic
- `.claude/rules/ux-ui-rules.md` - Project layout guardrails
