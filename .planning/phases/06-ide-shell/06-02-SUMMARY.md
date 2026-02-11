---
phase: 06-ide-shell
plan: 02
subsystem: ui
tags: [react-arborist, radix-ui, zustand, tanstack-query, file-tree, context-menu, server-functions]

# Dependency graph
requires:
  - phase: 06-ide-shell
    plan: 01
    provides: Resizable 3-panel IDE shell layout, layout-store, IDEShell component
provides:
  - IDE store with tab/file management (openFile, closeTab, markDirty, markClean)
  - 6 file CRUD server functions with path traversal protection
  - React Query hooks for file operations (useDirectoryListing, useFileContent, mutations)
  - File tree component with expand/collapse, file/folder icons
  - Radix context menu with New File, New Folder, Rename, Delete
  - FileNode, Tab, ContextTarget type definitions

# Key files
key-files:
  created:
    - app/stores/ide-store.ts        # Zustand store — tab management, view states, context target (118 LOC)
    - app/server/files.ts            # TanStack Start server functions — listDirectory, readFile, writeFile, create, delete, rename (160 LOC)
    - app/hooks/useFiles.ts          # React Query hooks — query key factory, directory listing, file content, mutations (109 LOC)
    - app/shared/ide-types.ts        # Extended with FileNode, Tab, ContextTarget interfaces
    - app/components/file-tree/FileTree.tsx          # react-arborist tree wrapper with lazy-load (54 LOC)
    - app/components/file-tree/FileTreeNode.tsx       # Tree node renderer with icons, click/right-click (81 LOC)
    - app/components/file-tree/FileTreeContextMenu.tsx # Radix context menu — 4 CRUD actions (123 LOC)
  modified:
    - app/components/ide/IDEShell.tsx  # SidebarPlaceholder replaced with FileTree + FileTreeContextMenu

# Deviations
deviations:
  - description: "Used separate ide-store.ts instead of adding to layout-store.ts"
    rationale: "Separation of concerns — layout (panel sizes) vs IDE state (tabs, files) are independent domains"

# Decisions
decisions:
  - "Separate ide-store.ts for tab/file management, layout-store.ts for panel layout"
  - "window.prompt() for file name input in context menu (MVP — inline editing deferred)"
  - "Broad query invalidation on delete/rename (fileKeys.all) since parent dir unknown"

# Self-check
self-check:
  status: PASSED
  files-verified:
    - app/stores/ide-store.ts: exists, 118 LOC
    - app/server/files.ts: exists, 160 LOC
    - app/hooks/useFiles.ts: exists, 109 LOC
    - app/components/file-tree/FileTree.tsx: exists, 54 LOC
    - app/components/file-tree/FileTreeNode.tsx: exists, 81 LOC
    - app/components/file-tree/FileTreeContextMenu.tsx: exists, 123 LOC
  wiring-verified:
    - IDEShell imports FileTree and FileTreeContextMenu
    - SidebarPlaceholder fully removed
  commits: 2 (feat(06-02) x2)
---

## Summary

Built the file tree explorer infrastructure and UI: 6 file CRUD server functions with path traversal protection, a Zustand IDE store for tab/file management, React Query hooks with query key factory, and a react-arborist file tree with Radix context menu (New File, New Folder, Rename, Delete). Wired FileTree + context menu into IDEShell sidebar, replacing the placeholder. Creates the foundation 06-03 (Monaco editor) needs for opening, reading, and saving files.
