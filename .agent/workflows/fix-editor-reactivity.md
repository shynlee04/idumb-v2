---
description: Fix hot-reload reactivity when switching between notes in the editor
story_id: NR-02
priority: P0
effort_hours: 2
---

# Fix Editor Reactivity Workflow

## Objective

Fix the issue where switching between notes in the sidebar doesn't update the editor content until the page is refreshed.

## Root Cause Analysis

The `NoteEditor` component uses `useCreateBlockNote` hook which creates the editor instance with `initialContent`. However:

1. The `initialContent` is memoized on `note?.id`
2. When `noteId` changes, React re-renders the component
3. BUT `useCreateBlockNote` does NOT reinitialize the editor - it's a custom hook that creates the instance once
4. Result: Old content remains until page refresh

## Solution Options

### Option A: Force Remount with Key (Recommended)

Add a `key` prop to the wrapper div to force React to remount the entire component when `noteId` changes.

**Pros:** Simple, guaranteed to work, clean slate for each note
**Cons:** Loses editor state (cursor position, undo history) - acceptable for notes

### Option B: Use replaceBlocks

Call `editor.replaceBlocks()` in a useEffect when noteId changes.

**Pros:** Preserves editor instance, potentially faster
**Cons:** More complex, may have edge cases with BlockNote's internal state

## Implementation (Option A - Recommended)

### Step 1: Locate the Issue

**File:** `src/presentation/components/notes/NoteEditor.tsx`

**Current Code (around line 182):**
```typescript
return (
    <div className={cn('note-editor', className)}>
        ...
    </div>
);
```

### Step 2: Apply Fix

**Change to:**
```typescript
return (
    <div key={`note-editor-${noteId}`} className={cn('note-editor', className)}>
        ...
    </div>
);
```

**Complete diff:**
```diff
--- a/src/presentation/components/notes/NoteEditor.tsx
+++ b/src/presentation/components/notes/NoteEditor.tsx
@@ -180,7 +180,7 @@ export function NoteEditor({ noteId, className, readOnly = false }: NoteEditorPr
     }
 
     return (
-        <div className={cn('note-editor', className)}>
+        <div key={`note-editor-${noteId}`} className={cn('note-editor', className)}>
             {/* Status bar */}
             <div className="note-editor__status-bar">
                 {note.emoji && <span className="note-editor__emoji">{note.emoji}</span>}
```

### Step 3: Test

```bash
# TypeScript validation
pnpm exec tsc --noEmit
```

**Manual Testing:**
1. Open /notes
2. Create Note A with content "This is Note A"
3. Create Note B with content "This is Note B"
4. Click Note A in sidebar → Verify "This is Note A" shows
5. Click Note B in sidebar → Verify "This is Note B" shows immediately (no refresh)
6. Click Note A again → Verify "This is Note A" shows immediately

### Step 4: Update State

After successful implementation, update LOOP_STATE.yaml:

```yaml
stories:
  NR-02:
    status: "DONE"
    completed_at: "2025-12-31T..."
    files_changed:
      - "src/presentation/components/notes/NoteEditor.tsx"
```

## Alternative Implementation (Option B)

If Option A causes issues, use this instead:

```typescript
// Add after line 110 (after editor creation)
useEffect(() => {
    if (!editor || !note?.blocks || readOnly) return;
    
    // Only trigger on noteId change, not on every render
    const blocks = note.blocks as Block[];
    if (blocks.length > 0) {
        try {
            editor.replaceBlocks(editor.document, blocks);
        } catch (err) {
            console.warn('[NoteEditor] replaceBlocks failed:', err);
            // Fallback: reload page
        }
    }
}, [noteId]); // Intentionally only depend on noteId
```

## Acceptance Criteria Checklist

- [ ] Clicking different note in sidebar immediately shows that note's content
- [ ] No page refresh required
- [ ] Previous note's content doesn't flash before new content
- [ ] Editor still saves correctly after switching
- [ ] Slash commands still work after switching

## Edge Cases to Verify

1. **Empty note:** Switching to a note with no content should show empty editor
2. **Note with images/embeds:** Complex content should load correctly
3. **Rapid switching:** Click multiple notes quickly - should show final note's content
4. **Unsaved changes:** If debounce is pending, should still save before switching

## Rollback Plan

```bash
git checkout HEAD -- src/presentation/components/notes/NoteEditor.tsx
```
