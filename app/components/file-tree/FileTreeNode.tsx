/**
 * FileTreeNode — Individual node renderer for react-arborist.
 *
 * Renders file/folder icons, handles click-to-open-tab,
 * and right-click-to-set-context-target.
 */

import type { NodeRendererProps } from "react-arborist"
import {
  FileIcon,
  FolderIcon,
  FolderOpen,
  ChevronRight,
  ChevronDown,
} from "lucide-react"
import { useIDEStore } from "../../stores/ide-store"
import type { FileNode } from "../../shared/ide-types"

export function FileTreeNode({
  node,
  style,
  dragHandle,
}: NodeRendererProps<FileNode>) {
  const isFolder = node.data.isFolder
  const isOpen = node.isOpen
  const isSelected = node.isSelected

  const handleClick = () => {
    if (isFolder) {
      node.toggle()
    } else {
      useIDEStore.getState().openFile(node.data.id, node.data.name)
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    useIDEStore.getState().setContextTarget({
      path: node.data.id,
      name: node.data.name,
      isFolder: node.data.isFolder,
    })
  }

  return (
    <div
      ref={dragHandle}
      style={style}
      className={`
        flex items-center gap-1 px-2 py-0.5 cursor-pointer select-none text-sm
        ${isSelected ? "bg-zinc-700/50" : "hover:bg-zinc-800"}
      `}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      {/* Folder chevron or file spacer */}
      {isFolder ? (
        isOpen ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )
      ) : (
        <span className="inline-block h-3.5 w-3.5 shrink-0" />
      )}

      {/* File/folder icon */}
      {isFolder ? (
        isOpen ? (
          <FolderOpen className="h-4 w-4 shrink-0 text-yellow-500/80" />
        ) : (
          <FolderIcon className="h-4 w-4 shrink-0 text-yellow-500/80" />
        )
      ) : (
        <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}

      {/* File/folder name */}
      <span className="truncate text-xs">{node.data.name}</span>
    </div>
  )
}
