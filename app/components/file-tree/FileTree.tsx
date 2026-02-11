/**
 * FileTree — react-arborist wrapper for the file explorer.
 *
 * Fetches directory contents via useDirectory hook
 * and renders them with FileTreeNode.
 * 
 * The tree auto-sizes to fill its parent container using
 * react-arborist's built-in container measurement.
 */

import { Tree } from "react-arborist"
import { useDirectory } from "../../hooks/useFiles"
import { FileTreeNode } from "./FileTreeNode"
import type { FileNode } from "../../shared/ide-types"

export function FileTree({ rootPath }: { rootPath: string }) {
  const { data, isLoading, error } = useDirectory(rootPath)

  if (isLoading) {
    return (
      <div className="p-3 text-xs text-muted-foreground">Loading files...</div>
    )
  }

  if (error) {
    return (
      <div className="p-3 text-xs text-red-400">
        Error loading files: {error instanceof Error ? error.message : "Unknown error"}
      </div>
    )
  }

  if (!data?.length) {
    return (
      <div className="p-3 text-xs text-muted-foreground">No files found</div>
    )
  }

  return (
    <div className="h-full w-full">
      <Tree<FileNode>
        data={data}
        indent={16}
        rowHeight={28}
        overscanCount={5}
        openByDefault={false}
        disableDrag
        disableDrop
      >
        {FileTreeNode}
      </Tree>
    </div>
  )
}
