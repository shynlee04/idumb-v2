/**
 * FileTree — react-arborist wrapper for the file explorer.
 *
 * Manages hierarchical tree state with lazy-loaded subdirectories.
 * Root data is fetched via useDirectory hook; child folders are
 * loaded on-demand when the user toggles a folder open.
 *
 * The tree auto-sizes to fill its parent container using
 * react-arborist's built-in container measurement.
 */

import { useState, useCallback, useEffect } from "react"
import { Tree } from "react-arborist"
import { useDirectory } from "../../hooks/useFiles"
import { listDirectoryFn } from "../../server/files"
import { FileTreeNode } from "./FileTreeNode"
import type { FileNode } from "../../shared/ide-types"

/** Convert server FileNode to tree-ready FileNode (null children → empty array for folders). */
function toTreeNode(node: FileNode): FileNode {
  return {
    ...node,
    children: node.isFolder ? [] : undefined,
  }
}

/**
 * Recursively find a node by ID and update its children with fetched data.
 * Returns a new tree (immutable update) or the same reference if ID not found.
 */
function updateNodeChildren(
  nodes: FileNode[],
  targetId: string,
  children: FileNode[],
): FileNode[] {
  return nodes.map((node) => {
    if (node.id === targetId) {
      return { ...node, children }
    }
    if (node.children && node.children.length > 0) {
      const updated = updateNodeChildren(node.children, targetId, children)
      if (updated !== node.children) {
        return { ...node, children: updated }
      }
    }
    return node
  })
}

export function FileTree({ rootPath }: { rootPath: string }) {
  const { data: rootData, isLoading, error } = useDirectory(rootPath)
  const [treeData, setTreeData] = useState<FileNode[]>([])

  // Initialize tree data from root query (convert null children to empty arrays)
  useEffect(() => {
    if (rootData) {
      setTreeData(rootData.map(toTreeNode))
    }
  }, [rootData])

  // Lazy-load children when a folder is toggled open
  const handleToggle = useCallback(async (id: string) => {
    // Use functional setState to read current state
    setTreeData((prev) => {
      // Find the target node to check if children need loading
      const findNode = (nodes: FileNode[]): FileNode | undefined => {
        for (const node of nodes) {
          if (node.id === id) return node
          if (node.children) {
            const found = findNode(node.children)
            if (found) return found
          }
        }
        return undefined
      }

      const target = findNode(prev)
      if (!target || !target.isFolder) return prev

      // Only fetch if children are empty (not yet loaded)
      if (target.children && target.children.length > 0) return prev

      // Fetch children asynchronously, then update tree data
      listDirectoryFn({ data: { dirPath: id } })
        .then((children) => {
          setTreeData((current) =>
            updateNodeChildren(current, id, children.map(toTreeNode)),
          )
        })
        .catch(() => {
          // Silently ignore fetch errors — folder stays empty
        })

      return prev
    })
  }, [])

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

  if (!treeData.length && !rootData?.length) {
    return (
      <div className="p-3 text-xs text-muted-foreground">No files found</div>
    )
  }

  return (
    <div className="h-full w-full">
      <Tree<FileNode>
        data={treeData}
        indent={16}
        rowHeight={28}
        overscanCount={5}
        openByDefault={false}
        disableDrag
        disableDrop
        onToggle={handleToggle}
      >
        {FileTreeNode}
      </Tree>
    </div>
  )
}
