/**
 * FileTreeContextMenu — Radix UI context menu wrapping the file tree.
 *
 * Provides: New File, New Folder, (separator), Rename, Delete.
 * Reads the context target from IDE store to determine which node
 * was right-clicked.
 */

import type { ReactNode } from "react"
import { ContextMenu } from "radix-ui"
import {
  FilePlus,
  FolderPlus,
  Pencil,
  Trash2,
} from "lucide-react"
import { useIDEStore } from "../../stores/ide-store"
import {
  useCreateFileOrFolder,
  useDeleteFileOrFolder,
  useRenameFileOrFolder,
} from "../../hooks/useFiles"

export function FileTreeContextMenu({ children }: { children: ReactNode }) {
  const contextTarget = useIDEStore((s) => s.contextTarget)
  const setContextTarget = useIDEStore((s) => s.setContextTarget)

  const createMutation = useCreateFileOrFolder()
  const deleteMutation = useDeleteFileOrFolder()
  const renameMutation = useRenameFileOrFolder()

  const handleNewFile = () => {
    if (!contextTarget) return
    const parentPath = contextTarget.isFolder
      ? contextTarget.path
      : contextTarget.path.split("/").slice(0, -1).join("/") || "."

    const name = window.prompt("New file name:")
    if (!name) return
    createMutation.mutate({ parentPath, name, type: "file" })
  }

  const handleNewFolder = () => {
    if (!contextTarget) return
    const parentPath = contextTarget.isFolder
      ? contextTarget.path
      : contextTarget.path.split("/").slice(0, -1).join("/") || "."

    const name = window.prompt("New folder name:")
    if (!name) return
    createMutation.mutate({ parentPath, name, type: "folder" })
  }

  const handleRename = () => {
    if (!contextTarget) return
    const newName = window.prompt("Rename to:", contextTarget.name)
    if (!newName || newName === contextTarget.name) return
    renameMutation.mutate({ oldPath: contextTarget.path, newName })
  }

  const handleDelete = () => {
    if (!contextTarget) return
    const confirmed = window.confirm(
      `Delete "${contextTarget.name}"? This cannot be undone.`,
    )
    if (!confirmed) return
    deleteMutation.mutate({ targetPath: contextTarget.path })
  }

  const menuItemClassName = `
    flex items-center gap-2 rounded px-2 py-1.5 text-xs outline-none cursor-pointer
    data-[highlighted]:bg-zinc-700 data-[highlighted]:text-foreground
    text-muted-foreground
  `

  return (
    <ContextMenu.Root
      onOpenChange={(open) => {
        if (!open) setContextTarget(null)
      }}
    >
      <ContextMenu.Trigger asChild>
        <div className="h-full w-full">{children}</div>
      </ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content
          className="min-w-[180px] rounded-md border border-border bg-popover p-1 shadow-lg"
        >
          <ContextMenu.Item className={menuItemClassName} onSelect={handleNewFile}>
            <FilePlus className="h-3.5 w-3.5" />
            New File
          </ContextMenu.Item>

          <ContextMenu.Item className={menuItemClassName} onSelect={handleNewFolder}>
            <FolderPlus className="h-3.5 w-3.5" />
            New Folder
          </ContextMenu.Item>

          <ContextMenu.Separator className="my-1 h-px bg-border" />

          <ContextMenu.Item
            className={menuItemClassName}
            onSelect={handleRename}
            disabled={!contextTarget}
          >
            <Pencil className="h-3.5 w-3.5" />
            Rename
          </ContextMenu.Item>

          <ContextMenu.Item
            className={`${menuItemClassName} data-[highlighted]:text-red-400`}
            onSelect={handleDelete}
            disabled={!contextTarget}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}
