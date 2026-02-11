/**
 * useFiles hooks — React Query wrappers for file server functions.
 *
 * Follows the same pattern as useSession.ts:
 * - Query key factory for invalidation
 * - Individual hooks per operation
 * - Mutations auto-invalidate parent directory listings
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  listDirectoryFn,
  readFileFn,
  writeFileFn,
  createFileOrFolderFn,
  deleteFileOrFolderFn,
  renameFileOrFolderFn,
} from "../server/files"

// ─── Query Keys ────────────────────────────────────────────────────────────

export const fileKeys = {
  all: ["files"] as const,
  dir: (dirPath: string) => [...fileKeys.all, "dir", dirPath] as const,
  content: (filePath: string) => [...fileKeys.all, "content", filePath] as const,
}

// ─── Query Hooks ───────────────────────────────────────────────────────────

/** List directory contents — returns FileNode[]. */
export function useDirectory(dirPath: string | undefined) {
  return useQuery({
    queryKey: fileKeys.dir(dirPath ?? ""),
    queryFn: () => listDirectoryFn({ data: { dirPath: dirPath! } }),
    enabled: Boolean(dirPath),
  })
}

/** Read file content. */
export function useFileContent(filePath: string | undefined) {
  return useQuery({
    queryKey: fileKeys.content(filePath ?? ""),
    queryFn: () => readFileFn({ data: { filePath: filePath! } }),
    enabled: Boolean(filePath),
    // Don't refetch on focus — file content is usually stable
    refetchOnWindowFocus: false,
  })
}

// ─── Mutation Hooks ────────────────────────────────────────────────────────

/** Write file content and invalidate its cache. */
export function useWriteFile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { filePath: string; content: string }) =>
      writeFileFn({ data: params }),
    onSuccess: (_data, variables) => {
      // Invalidate the file content cache
      queryClient.invalidateQueries({
        queryKey: fileKeys.content(variables.filePath),
      })
    },
  })
}

/** Create a new file or folder and invalidate parent directory. */
export function useCreateFileOrFolder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { parentPath: string; name: string; type: "file" | "folder" }) =>
      createFileOrFolderFn({ data: params }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: fileKeys.dir(variables.parentPath),
      })
    },
  })
}

/** Delete a file or folder and invalidate parent directory. */
export function useDeleteFileOrFolder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { targetPath: string }) =>
      deleteFileOrFolderFn({ data: params }),
    onSuccess: (_data, variables) => {
      const parentDir = variables.targetPath.split("/").slice(0, -1).join("/") || "."
      queryClient.invalidateQueries({
        queryKey: fileKeys.dir(parentDir),
      })
    },
  })
}

/** Rename a file or folder and invalidate parent directory. */
export function useRenameFileOrFolder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { oldPath: string; newName: string }) =>
      renameFileOrFolderFn({ data: params }),
    onSuccess: (_data, variables) => {
      const parentDir = variables.oldPath.split("/").slice(0, -1).join("/") || "."
      queryClient.invalidateQueries({
        queryKey: fileKeys.dir(parentDir),
      })
    },
  })
}
